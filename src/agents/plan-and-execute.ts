import { z } from 'zod';
import { createModel } from './model.js';
import { listAlerts, openIncident, resolveIncident, store } from './ops-store.js';
import { createTraceEvent } from './trace.js';
import type { ReasoningStrategy, StrategyRunResult } from '../domain/strategy.js';

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

async function planner(input: string): Promise<string[]> {
  try {
    const model = createModel().withStructuredOutput(planSchema);
    const result = await model.invoke([
      ['system', PLANNER_PROMPT],
      ['user', JSON.stringify({ input, services: store.services, alerts: listAlerts('all') })],
    ]);

    if (Array.isArray(result.steps) && result.steps.length > 0) {
      return result.steps.slice(0, 8);
    }
  } catch (error) {
    console.warn('[plan-and-execute] planner fallback: OpenRouter unavailable or not configured.', error instanceof Error ? error.message : error);
  }

  return fallbackPlan(input);
}

async function replanner(input: string, remaining: string[], done: string[]): Promise<{ decision: 'adjust' | 'continue' | 'end'; reasoning: string; updatedSteps?: string[] }> {
  try {
    const model = createModel().withStructuredOutput(replannerSchema);
    const result = await model.invoke([
      ['system', REPLANNER_PROMPT],
      ['user', JSON.stringify({ input, remaining, done })],
    ]);

    if (result.decision) {
      return {
        decision: result.decision,
        reasoning: result.reasoning,
        updatedSteps: result.updatedSteps ?? remaining,
      };
    }
  } catch (error) {
    console.warn('[plan-and-execute] replanner fallback: OpenRouter unavailable or not configured.', error instanceof Error ? error.message : error);
  }

  if (remaining.length === 0) {
    return { decision: 'end', reasoning: 'Nenhum passo restante; encerrando a execução.' };
  }

  if (done.length >= 4 && remaining.length > 1) {
    return { decision: 'continue', reasoning: 'Continuação adequada porque ainda há passos relevantes.', updatedSteps: remaining };
  }

  return { decision: 'continue', reasoning: 'Seguindo com o plano atual.', updatedSteps: remaining };
}

async function executor(step: string): Promise<{ tool?: string; args?: Record<string, unknown>; summary: string }> {
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
    const firing = listAlerts('firing')[0];
    if (!firing) {
      return { summary: 'Nenhum alerta disparado para abrir incidente.', tool: 'open_incident', args: { title: 'Sem alerta', service: 'unknown', severity: 'low' } };
    }

    const created = openIncident({ title: `Incidente para ${firing.service}`, service: firing.service, severity: firing.severity });
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

    let steps = await planner(input);
    let remaining = steps.slice(0, limit);
    const done: string[] = [];
    let stepsUsed = 0;

    while (remaining.length > 0 && stepsUsed < limit) {
      const step = remaining.shift();
      if (!step) {
        continue;
      }

      stepsUsed += 1;
      trace.push(createTraceEvent('plan', `Executando passo ${stepsUsed}/${limit}: ${step}`));

      const execution = await executor(step);
      const summary = `${step} -> ${execution.summary}`;
      done.push(summary);
      trace.push(createTraceEvent('action', `Ação executada para o passo`, { tool: execution.tool, args: execution.args }));
      trace.push(createTraceEvent('observation', execution.summary));

      const decision = await replanner(input, remaining, done);
      trace.push(createTraceEvent('critique', `${decision.decision.toUpperCase()}: ${decision.reasoning}`));

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
        interactionLimit: limit,
        stepsUsed,
      },
    };
  },
};

export default planAndExecuteStrategy;
