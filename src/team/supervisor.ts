import { z } from 'zod';
import { createModel } from '../agents/model.js';
import { createTraceEvent } from '../agents/trace.js';
import { blackboardAsText, type BlackboardState } from './blackboard.js';
import { normalizeRoleName, supervisorNextSchema, type SupervisorNextValue } from './roles.js';

export const SUPERVISOR_PROMPT = `Você é o supervisor de plantão. Seu papel é decidir o próximo nó da operação com base no blackboard compartilhado.

Papéis disponíveis: analista, planejador, executor, done.
Critérios:
- Se falta diagnóstico factual do estado, passe para analista.
- Se a equipe precisa de organização e sequência antes de agir, passe para planejador.
- Se há incidente claro para executar ou concluir um passo de resposta, passe para executor.
- Se a operação já foi concluída ou não há trabalho pendente, passe para done.
Responda no formato estruturado com next e brief.`;

export type SupervisorDecision = {
  next: SupervisorNextValue;
  brief: string;
  trace: ReturnType<typeof createTraceEvent>[];
};

function fallbackSupervisorDecision(state: BlackboardState): SupervisorDecision {
  const openItems = state.openItems.length;
  const hasOpenIncident = state.incidentId !== null || state.openItems.some((item) => item.toLowerCase().includes('incidente'));

  const next: SupervisorNextValue = hasOpenIncident ? 'executor' : openItems > 0 ? 'analista' : 'done';
  const brief = hasOpenIncident
    ? 'O estado indica um incidente em execução. Encaminhar para o executor para agir dentro do fluxo permitido.'
    : openItems > 0
      ? 'O blackboard precisa de diagnóstico factual antes de decidir o próximo passo.'
      : 'A operação já está concluída ou sem pendências ativas.';

  return {
    next,
    brief,
    trace: [createTraceEvent('handoff', `Transferência de supervisão para ${next}.`, {
      node: 'team-supervisor',
      route: 'team',
      reason: brief,
      args: { from: 'supervisor', to: next },
    })],
  };
}

export async function decideNextRole(state: BlackboardState): Promise<SupervisorDecision> {
  const fallback = fallbackSupervisorDecision(state);

  try {
    const model = createModel();
    const verdict = await model.withStructuredOutput(supervisorNextSchema).invoke([
      ['system', SUPERVISOR_PROMPT],
      ['user', blackboardAsText(state)],
    ]);

    const next = normalizeRoleName(verdict.next) as SupervisorNextValue;
    const brief = verdict.brief?.trim() || fallback.brief;

    return {
      next,
      brief,
      trace: [createTraceEvent('handoff', `Transferência de supervisão para ${next}.`, {
        node: 'team-supervisor',
        route: 'team',
        reason: brief,
        args: { from: 'supervisor', to: next },
      })],
    };
  } catch {
    return fallback;
  }
}

export const nextSchema = z.object({
  next: z.enum(['analista', 'planejador', 'executor', 'done']),
  brief: z.string().describe('instrução de trabalho para o próximo papel (nó) ou resumo final se done'),
});

export async function supervisor(state: BlackboardState): Promise<{ next: SupervisorNextValue; brief: string; trace: ReturnType<typeof createTraceEvent>[] }> {
  const decision = await decideNextRole(state);

  return {
    next: decision.next,
    brief: decision.brief,
    trace: decision.trace,
  };
}
