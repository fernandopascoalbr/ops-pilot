import { z } from 'zod';
import { createModel } from './model.js';
import { listAlerts, openIncident, resolveIncident, store } from './ops-store.js';
import { clampIterationLimit, createTraceEvent, shouldStopByPolicy } from './trace.js';
import type { ReasoningStrategy, StrategyRunResult } from '../domain/strategy.js';
import type { ReflectionDecision, StoppingPolicy } from './types.js';

const planSchema = z.object({
  steps: z.array(z.string()).min(1).max(8),
});

const reflectionSchema = z.object({
  decision: z.enum(['continue', 'adjust', 'end']),
  reasoning: z.string().min(1),
  updatedSteps: z.array(z.string()).optional(),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  risk: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
});

const PLANNER_PROMPT = 'Gere até 8 passos operacionais curtos para tratar o incidente com segurança.';
const REFLECT_PROMPT = 'Avalie o passo executado e responda com decision, reasoning, confidence, risk e updatedSteps opcional.';

type ReflectionResult = {
  decision: ReflectionDecision;
  reasoning: string;
  updatedSteps?: string[];
  confidence: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high' | 'critical';
};

const DEFAULT_POLICY: StoppingPolicy = {
  maxIterations: 8,
  stopOnCriticalRisk: true,
  stopOnResolved: true,
  fallbackMode: 'safe-close',
};

function fallbackPlan(input: string): string[] {
  const steps = [
    'Listar alertas ativos e identificar serviço com maior severidade.',
    'Revisar contexto operacional do serviço priorizado.',
    'Abrir incidente para o serviço mais crítico.',
    'Executar ação de mitigação e revisar efeito.',
    'Consolidar evidências e concluir resposta.',
  ];

  if (input.toLowerCase().includes('fechar') || input.toLowerCase().includes('resolver')) {
    steps.splice(3, 0, 'Checar incidentes abertos e selecionar o mais relevante para encerramento.');
  }

  return steps.slice(0, 8);
}

async function planner(input: string, llmCalls: { value: number }): Promise<string[]> {
  try {
    const model = createModel().withStructuredOutput(planSchema);
    llmCalls.value += 1;
    const result = await model.invoke([
      ['system', PLANNER_PROMPT],
      ['user', JSON.stringify({ input, alerts: listAlerts('all'), services: store.services })],
    ]);
    return result.steps.slice(0, 8);
  } catch {
    return fallbackPlan(input);
  }
}

function heuristicReflect(input: string, remaining: string[], summary: string, stepsUsed: number): ReflectionResult {
  const normalizedInput = input.toLowerCase();
  const normalizedSummary = summary.toLowerCase();

  if (normalizedInput.includes('incerteza') || normalizedInput.includes('conflito') || normalizedInput.includes('arriscad')) {
    return {
      decision: 'end',
      reasoning: 'Baixa confiança operacional detectada; encerrando com fallback seguro.',
      confidence: 'low',
      risk: 'high',
    };
  }

  if (normalizedInput.includes('ajuste') || normalizedInput.includes('contradit')) {
    return {
      decision: 'adjust',
      reasoning: 'Nova evidência pede replanejamento das etapas restantes.',
      updatedSteps: ['Revalidar evidências críticas antes de continuar.', ...remaining],
      confidence: 'medium',
      risk: 'medium',
    };
  }

  if (normalizedSummary.includes('encerrado')) {
    return {
      decision: 'end',
      reasoning: 'Incidente resolvido com evidência suficiente.',
      confidence: 'high',
      risk: 'low',
    };
  }

  if (stepsUsed >= 4 && remaining.length > 0) {
    return {
      decision: 'continue',
      reasoning: 'Fluxo estável; seguir plano atual.',
      confidence: 'medium',
      risk: 'low',
    };
  }

  return {
    decision: 'continue',
    reasoning: 'Sem desvio detectado; continuar execução.',
    confidence: 'medium',
    risk: 'low',
  };
}

async function reflect(
  input: string,
  remaining: string[],
  summary: string,
  stepsUsed: number,
  llmCalls: { value: number },
): Promise<ReflectionResult> {
  try {
    const model = createModel().withStructuredOutput(reflectionSchema);
    llmCalls.value += 1;
    const result = await model.invoke([
      ['system', REFLECT_PROMPT],
      ['user', JSON.stringify({ input, remaining, summary, stepsUsed })],
    ]);
    return result;
  } catch {
    return heuristicReflect(input, remaining, summary, stepsUsed);
  }
}

async function executeStep(step: string): Promise<{ tool: string; args: Record<string, unknown>; summary: string }> {
  const normalized = step.toLowerCase();

  if (normalized.includes('alert')) {
    const alerts = listAlerts('firing');
    return {
      tool: 'list_alerts',
      args: { status: 'firing' },
      summary: `Alertas ativos: ${alerts.length}. ${alerts.map((entry) => `${entry.service}:${entry.severity}`).join(', ') || 'nenhum'}.`,
    };
  }

  if (normalized.includes('abrir incidente')) {
    const firing = listAlerts('firing')[0];
    if (!firing) {
      return { tool: 'open_incident', args: { title: 'Sem alerta', service: 'unknown', severity: 'low' }, summary: 'Nenhum alerta ativo para abrir incidente.' };
    }
    const created = openIncident({ title: `Incidente para ${firing.service}`, service: firing.service, severity: firing.severity });
    return {
      tool: 'open_incident',
      args: { id: created.id, service: created.service, severity: created.severity },
      summary: `Incidente ${created.id} aberto para ${created.service}.`,
    };
  }

  if (normalized.includes('encerramento') || normalized.includes('resolver') || normalized.includes('encerrar')) {
    const target = store.incidents.find((incident) => incident.status === 'open');
    if (!target) {
      return { tool: 'resolve_incident', args: { id: 'none' }, summary: 'Não há incidentes abertos para encerramento.' };
    }
    const resolved = resolveIncident(target.id);
    return {
      tool: 'resolve_incident',
      args: { id: target.id },
      summary: resolved ? `Incidente ${resolved.id} encerrado em ${resolved.service}.` : 'Falha ao encerrar incidente.',
    };
  }

  return {
    tool: 'list_alerts',
    args: { status: 'all' },
    summary: `Passo concluído: ${step}`,
  };
}

export const reflectPlanAndExecuteStrategy: ReasoningStrategy = {
  name: 'reflect-plan-and-execute',
  async run(input: string, maxIterations = DEFAULT_POLICY.maxIterations): Promise<StrategyRunResult> {
    const started = Date.now();
    const llmCalls = { value: 0 };
    const effectiveLimit = clampIterationLimit(maxIterations, DEFAULT_POLICY.maxIterations, 8);
    const trace = [createTraceEvent('thought', `Iniciando reflect plan-and-execute para: ${input}`)];

    let remaining = await planner(input, llmCalls);
    if (remaining.length === 0) {
      remaining = fallbackPlan(input);
    }
    remaining = remaining.slice(0, effectiveLimit);

    const done: string[] = [];
    let stepsUsed = 0;
    let usedFallback = false;
    let finalReason = 'Execução concluída com sucesso.';

    while (remaining.length > 0) {
      const stopCheck = shouldStopByPolicy({
        stepsUsed,
        maxIterations: effectiveLimit,
        stopOnResolved: DEFAULT_POLICY.stopOnResolved,
        stopOnCriticalRisk: DEFAULT_POLICY.stopOnCriticalRisk,
        resolved: done.some((entry) => entry.includes('encerrado')),
        criticalRisk: false,
      });
      if (stopCheck.stop) {
        usedFallback = true;
        finalReason = stopCheck.reason;
        break;
      }

      const step = remaining.shift();
      if (!step) break;
      stepsUsed += 1;
      trace.push(createTraceEvent('plan', `Executando passo ${stepsUsed}/${effectiveLimit}: ${step}`));

      const execution = await executeStep(step);
      const summary = `${step} -> ${execution.summary}`;
      done.push(summary);
      trace.push(createTraceEvent('action', 'Executando passo do plano', { tool: execution.tool, args: execution.args }));
      trace.push(createTraceEvent('observation', execution.summary));

      const reflection = await reflect(input, remaining, summary, stepsUsed, llmCalls);
      trace.push(createTraceEvent('critique', `${reflection.decision.toUpperCase()}: ${reflection.reasoning}`));

      const policyCheck = shouldStopByPolicy({
        stepsUsed,
        maxIterations: effectiveLimit,
        stopOnResolved: DEFAULT_POLICY.stopOnResolved,
        stopOnCriticalRisk: DEFAULT_POLICY.stopOnCriticalRisk,
        resolved: reflection.decision === 'end' && reflection.risk === 'low',
        criticalRisk: reflection.risk === 'critical',
      });

      if (reflection.decision === 'adjust' && reflection.updatedSteps && reflection.updatedSteps.length > 0) {
        remaining = reflection.updatedSteps.slice(0, effectiveLimit - stepsUsed);
      }

      if (reflection.decision === 'end') {
        if (reflection.confidence === 'low' || reflection.risk !== 'low') {
          usedFallback = true;
          finalReason = `Encerramento por baixa confiança. ${reflection.reasoning}`;
        } else {
          finalReason = reflection.reasoning;
        }
        break;
      }

      if (policyCheck.stop) {
        usedFallback = true;
        finalReason = policyCheck.reason;
        break;
      }
    }

    const evidence = done.length > 0 ? done.join(' | ') : 'Nenhuma ação executada.';
    const answer = usedFallback
      ? `Reflect Plan-and-Execute finalizou com fallback seguro (${DEFAULT_POLICY.fallbackMode}). Motivo: ${finalReason}. Evidência: ${evidence}`
      : `Reflect Plan-and-Execute finalizou em ${stepsUsed} passos. Motivo: ${finalReason}. Evidência: ${evidence}`;
    trace.push(createTraceEvent('answer', answer));

    return {
      answer,
      trace,
      metrics: {
        llmCalls: llmCalls.value,
        latencyMs: Date.now() - started,
        interactionLimit: effectiveLimit,
        stepsUsed,
      },
    };
  },
};

export default reflectPlanAndExecuteStrategy;
