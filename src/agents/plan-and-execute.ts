import { z } from 'zod';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import { invokeStructuredWithModelFallbacks, ModelUnavailableError, type FallbackTransition } from './model.js';
import { listAlerts, openIncident, resolveIncident, store } from './ops-store.js';
import { createTraceEvent } from './trace.js';
import type { ReasoningStrategy, StrategyRunResult } from '../domain/strategy.js';
import { createPromptTokensCollector } from '../context/token.js';

const planSchema = z.object({
  steps: z.array(z.string()).describe('passos curtos, ordenados e executáveis com as ferramentas disponíveis'),
});

const replannerSchema = z.object({
  decision: z.enum(['adjust', 'continue', 'end']),
  reasoning: z.string(),
  updatedSteps: z.array(z.string()).optional(),
});

const PLANNER_PROMPT = `Você é um planner operacional. Gere até 8 passos curtos, executáveis e priorizados para responder a um incidente ou alerta.`;
const REPLANNER_PROMPT = `Decida se o plano deve continuar, ser ajustado ou encerrado. Responda apenas com decisão, motivo e lista opcional de passos ajustados.`;
const severityOptions = ['low', 'medium', 'high', 'critical'] as const;

function findMentionedService(text: string): string | undefined {
  const normalized = text.toLowerCase();
  const knownServices = Array.from(new Set(store.services.map((service) => service.name.toLowerCase())));
  const matches = knownServices
    .map((serviceName) => ({ serviceName, index: normalized.indexOf(serviceName) }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index);

  return matches[0]?.serviceName;
}

function findMentionedSeverity(text: string): (typeof severityOptions)[number] | undefined {
  const normalized = text.toLowerCase();
  return severityOptions.find((severity) => normalized.includes(severity));
}

function fallbackPlan(input: string): string[] {
  const firingAlerts = listAlerts('firing');
  const steps = [
    'Listar os alertas ativos e validar o estado atual dos serviços.',
    'Revisar o serviço com maior severidade e impacto.',
  ];

  if (firingAlerts.length > 0) {
    steps.push(`Abrir incidente para ${firingAlerts[0].service} com severidade ${firingAlerts[0].severity}.`);
  }

  steps.push('Resolver o incidente quando houver evidência suficiente.');
  steps.push('Concluir com a recomendação final e o resumo de evidência.');

  if (input.toLowerCase().includes('resolver') || input.toLowerCase().includes('fechar')) {
    steps.splice(2, 0, 'Checar incidentes abertos e selecionar o mais relevante para fechamento.');
  }

  return steps.slice(0, 8);
}

async function planner(
  input: string,
  llmCalls: { planner: number; replanner: number },
  callbacks: Callbacks,
): Promise<{ steps: string[]; modelUsed: string; fallbackTransitions: FallbackTransition[] }> {
  try {
    const execution = await invokeStructuredWithModelFallbacks(
      (model, modelCallbacks) => model.withStructuredOutput(planSchema).invoke([
        ['system', PLANNER_PROMPT],
        ['user', JSON.stringify({ input, services: store.services, alerts: listAlerts('all') })],
      ], { callbacks: modelCallbacks }),
      callbacks,
    );
    llmCalls.planner += execution.attempts.length;

    if (Array.isArray(execution.value.steps) && execution.value.steps.length > 0) {
      return {
        steps: execution.value.steps.slice(0, 8),
        modelUsed: execution.modelUsed,
        fallbackTransitions: execution.fallbackTransitions,
      };
    }
  } catch (error) {
    if (error instanceof ModelUnavailableError) {
      throw error;
    }
    console.warn('[plan-and-execute] planner fallback: OpenRouter unavailable or not configured.', error instanceof Error ? error.message : error);
  }

  return { steps: fallbackPlan(input), modelUsed: 'local-fallback', fallbackTransitions: [] };
}

async function replanner(
  input: string,
  remaining: string[],
  done: string[],
  llmCalls: { planner: number; replanner: number },
  callbacks: Callbacks,
): Promise<{
  decision: 'adjust' | 'continue' | 'end';
  reasoning: string;
  updatedSteps?: string[];
  modelUsed: string;
  fallbackTransitions: FallbackTransition[];
}> {
  try {
    const execution = await invokeStructuredWithModelFallbacks(
      (model, modelCallbacks) => model.withStructuredOutput(replannerSchema).invoke([
        ['system', REPLANNER_PROMPT],
        ['user', JSON.stringify({ input, remaining, done })],
      ], { callbacks: modelCallbacks }),
      callbacks,
    );
    llmCalls.replanner += execution.attempts.length;
    const result = execution.value;

    if (result.decision) {
      return {
        decision: result.decision,
        reasoning: result.reasoning,
        updatedSteps: result.updatedSteps ?? remaining,
        modelUsed: execution.modelUsed,
        fallbackTransitions: execution.fallbackTransitions,
      };
    }
  } catch (error) {
    console.warn('[plan-and-execute] replanner fallback: OpenRouter unavailable or not configured.', error instanceof Error ? error.message : error);
  }

  if (remaining.length === 0) {
    return {
      decision: 'end',
      reasoning: 'Nenhum passo restante; encerrando a execução.',
      modelUsed: 'local-fallback',
      fallbackTransitions: [],
    };
  }

  if (done.length >= 4 && remaining.length > 1) {
    return {
      decision: 'continue',
      reasoning: 'Continuação adequada porque ainda há passos relevantes.',
      updatedSteps: remaining,
      modelUsed: 'local-fallback',
      fallbackTransitions: [],
    };
  }

  return {
    decision: 'continue',
    reasoning: 'Seguindo com o plano atual.',
    updatedSteps: remaining,
    modelUsed: 'local-fallback',
    fallbackTransitions: [],
  };
}

async function executor(step: string, input: string): Promise<{ tool?: string; args?: Record<string, unknown>; summary: string }> {
  const normalized = step.toLowerCase();

  if (normalized.includes('alert') && normalized.includes('listar')) {
    const alerts = listAlerts('firing');
    return {
      tool: 'list_alerts',
      args: { status: 'firing' },
      summary: `Alertas ativos: ${alerts.length}. ${alerts.map((alert) => `${alert.service}:${alert.severity}`).join(', ') || 'nenhum'}.`,
    };
  }

  if (normalized.includes('incidente') && normalized.includes('abrir')) {
    const context = `${input} ${step}`;
    const firingAlerts = listAlerts('firing');
    const mentionedService = findMentionedService(context);
    const targetService = mentionedService ?? firingAlerts[0]?.service;

    if (!targetService) {
      return { summary: 'Nenhum alerta disparado para abrir incidente.', tool: 'open_incident', args: { title: 'Sem alerta', service: 'unknown', severity: 'low' } };
    }

    const alertForService = firingAlerts.find((alert) => alert.service.toLowerCase() === targetService.toLowerCase());
    const mentionedSeverity = findMentionedSeverity(context);
    const targetSeverity = mentionedSeverity ?? alertForService?.severity ?? firingAlerts[0]?.severity ?? 'medium';
    const created = openIncident({ title: `Incidente para ${targetService}`, service: targetService, severity: targetSeverity });
    return {
      tool: 'open_incident',
      args: { title: created.title, service: created.service, severity: created.severity },
      summary: `Incidente ${created.id} aberto para ${created.service} com severidade ${created.severity}.`,
    };
  }

  if (normalized.includes('resolver') || normalized.includes('fechar')) {
    const incidents = store.incidents.filter((incident) => incident.status === 'open');
    if (incidents.length === 0) {
      return { summary: 'Não há incidentes abertos para resolver.', tool: 'resolve_incident', args: { id: 'none' } };
    }

    const target = incidents[0];
    const resolved = resolveIncident(target.id);
    return {
      tool: 'resolve_incident',
      args: { id: target.id },
      summary: resolved ? `Incidente ${resolved.id} encerrado em ${resolved.service}.` : 'Falha ao encerrar incidente.',
    };
  }

  if (normalized.includes('serviço') || normalized.includes('review') || normalized.includes('revisar')) {
    const services = store.services.map((service) => service.name).join(', ');
    return {
      tool: 'list_alerts',
      args: { status: 'all' },
      summary: `Serviços em contexto: ${services}.`,
    };
  }

  return {
    tool: 'list_alerts',
    args: { status: 'all' },
    summary: `Passo concluído sem ação especial: ${step}`,
  };
}

export const planAndExecuteStrategy: ReasoningStrategy = {
  name: 'plan-and-execute',
  async run(input: string, maxIterations = 8): Promise<StrategyRunResult> {
    const started = Date.now();
      const trace = [createTraceEvent('thought', `Planejando resposta para: ${input}`)];
    const limit = Math.min(Math.max(1, maxIterations), 8);
    const llmCalls = { planner: 0, replanner: 0 };
    const promptTokensCollector = createPromptTokensCollector();

    const planning = await planner(input, llmCalls, [promptTokensCollector.callback]);
    let steps = planning.steps;
    let remaining = steps.slice(0, limit);
    const done: string[] = [];
    let stepsUsed = 0;
    let modelUsed = planning.modelUsed;

    for (const transition of planning.fallbackTransitions) {
      trace.push(createTraceEvent('fallback', `Fallback acionado de ${transition.fromModel} para ${transition.toModel}.`, {
        node: 'model-factory',
        reason: transition.reason,
        args: {
          fromModel: transition.fromModel,
          toModel: transition.toModel,
          timestamp: transition.timestamp,
        },
      }));
    }

    while (remaining.length > 0 && stepsUsed < limit) {
      const step = remaining.shift();
      if (!step) {
        continue;
      }

      stepsUsed += 1;
      trace.push(createTraceEvent('plan', `Executando passo ${stepsUsed}/${limit}: ${step}`));

      const execution = await executor(step, input);
      const summary = `${step} -> ${execution.summary}`;
      done.push(summary);
      trace.push(createTraceEvent('action', `Ação executada para o passo`, { tool: execution.tool, args: execution.args }));
      trace.push(createTraceEvent('observation', execution.summary));

      const decision = await replanner(input, remaining, done, llmCalls, [promptTokensCollector.callback]);
      trace.push(createTraceEvent('critique', `${decision.decision.toUpperCase()}: ${decision.reasoning}`));
      modelUsed = decision.modelUsed;
      for (const transition of decision.fallbackTransitions) {
        trace.push(createTraceEvent('fallback', `Fallback acionado de ${transition.fromModel} para ${transition.toModel}.`, {
          node: 'model-factory',
          reason: transition.reason,
          args: {
            fromModel: transition.fromModel,
            toModel: transition.toModel,
            timestamp: transition.timestamp,
          },
        }));
      }

      if (decision.decision === 'adjust') {
        remaining = (decision.updatedSteps && decision.updatedSteps.length > 0 ? decision.updatedSteps : remaining).slice(0, limit - stepsUsed);
      } else if (decision.decision === 'end') {
        break;
      }

      if (remaining.length === 0) {
        break;
      }
    }

    const finalSummary = done.length > 0 ? done.join(' | ') : 'Nenhuma ação executada.';
    const answer = `Plan-and-Execute finalizou com ${stepsUsed} passos. Evidência: ${finalSummary}`;
    trace.push(createTraceEvent('answer', answer));

    return {
      answer,
      trace,
      metrics: {
        llmCalls: llmCalls.planner + llmCalls.replanner,
        latencyMs: Date.now() - started,
        modelUsed,
        interactionLimit: limit,
        stepsUsed,
        promptTokens: promptTokensCollector.getPromptTokens(),
      },
    };
  },
};

export default planAndExecuteStrategy;
