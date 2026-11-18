import { createTraceEvent } from '../agents/trace.js';
import { normalizeRoleName, type TeamRole } from './roles.js';

export type BlackboardDecision = {
  next: string;
  brief: string;
  createdAt: string;
  actor: TeamRole;
};

export type BlackboardState = {
  objective: string;
  summary: string;
  incidentId: string | null;
  openItems: string[];
  decisionHistory: BlackboardDecision[];
  lastUpdatedBy: string;
  updatedAt: string;
};

export type TeamParticipant = {
  id: string;
  name: string;
  role: string;
  canWrite: boolean;
  canUseTools: boolean;
  status: 'active' | 'inactive';
};

export function createBlackboard(partial: Partial<BlackboardState> = {}): BlackboardState {
  const now = new Date().toISOString();
  const decisionHistory = (partial.decisionHistory ?? []).map((decision) => ({
    next: decision.next,
    brief: decision.brief,
    createdAt: decision.createdAt ?? now,
    actor: normalizeRoleName(decision.actor ?? 'supervisor'),
  }));

  return {
    objective: partial.objective ?? 'Manter o status operacional da equipe sob supervisão.',
    summary: partial.summary ?? 'A equipe está pronta para analisar e agir com base no estado compartilhado.',
    incidentId: partial.incidentId ?? null,
    openItems: partial.openItems ?? [],
    decisionHistory,
    lastUpdatedBy: partial.lastUpdatedBy ?? 'supervisor',
    updatedAt: partial.updatedAt ?? now,
  };
}

export function addDecisionToBlackboard(state: BlackboardState, next: string, brief: string, actor: string): BlackboardState {
  const decision: BlackboardDecision = {
    next,
    brief,
    createdAt: new Date().toISOString(),
    actor: normalizeRoleName(actor),
  };

  return {
    ...state,
    decisionHistory: [decision, ...state.decisionHistory],
    lastUpdatedBy: actor,
    updatedAt: decision.createdAt,
  };
}

export function blackboardAsText(state: BlackboardState): string {
  return [
    `objetivo: ${state.objective}`,
    `resumo: ${state.summary}`,
    `incidente: ${state.incidentId ?? 'nenhum'}`,
    `itens abertos: ${state.openItems.length > 0 ? state.openItems.join('; ') : 'nenhum'}`,
    `histórico: ${state.decisionHistory.length > 0
      ? state.decisionHistory.map((decision) => `${decision.actor}:${decision.next}:${decision.brief}`).join(' | ')
      : 'sem decisões registradas'}`,
    `última atualização: ${state.lastUpdatedBy} em ${state.updatedAt}`,
  ].join('\n');
}

export function createParticipant(partial: Partial<TeamParticipant>): TeamParticipant {
  const role = partial.role ?? 'supervisor';
  return {
    id: partial.id ?? `participant-${Math.random().toString(16).slice(2, 10)}`,
    name: partial.name ?? 'Equipe',
    role,
    canWrite: partial.canWrite ?? (role === 'supervisor'),
    canUseTools: partial.canUseTools ?? (role === 'supervisor'),
    status: partial.status ?? 'active',
  };
}

export function appendTraceHandoff(from: string, to: string, brief: string): ReturnType<typeof createTraceEvent>[] {
  return [createTraceEvent('handoff', `Transferência de ${from} para ${to}.`, {
    node: 'team-supervisor',
    route: 'team',
    reason: brief,
    args: { from, to, brief },
  })];
}
