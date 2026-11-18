import { addDecisionToBlackboard, createBlackboard, type BlackboardState, type TeamParticipant } from './blackboard.js';
import { normalizeRoleName, type SupervisorNextValue } from './roles.js';

export const MAX_TEAM_PARTICIPANTS = 8;

export type TeamSession = {
  id: string;
  route: 'team';
  status: 'active' | 'paused' | 'resolved';
  maxParticipants: number;
  participants: TeamParticipant[];
  blackboard: BlackboardState;
  trace: Array<{ type: string; message: string; from?: string; to?: string; brief?: string; timestamp?: string; }>;
  createdAt: string;
  updatedAt: string;
};

export function createTeamSession(partial: Partial<TeamSession> = {}): TeamSession {
  const now = new Date().toISOString();
  const participants = partial.participants ?? [];

  return {
    id: partial.id ?? `team-${Math.random().toString(16).slice(2, 10)}`,
    route: partial.route ?? 'team',
    status: partial.status ?? 'active',
    maxParticipants: partial.maxParticipants ?? MAX_TEAM_PARTICIPANTS,
    participants,
    blackboard: partial.blackboard ?? createBlackboard(),
    trace: partial.trace ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function addParticipant(session: TeamSession, participant: TeamParticipant): TeamSession {
  if (session.participants.length >= session.maxParticipants) {
    throw new Error('Equipe atingiu o limite máximo de 8 participantes.');
  }

  return {
    ...session,
    participants: [...session.participants, participant],
    updatedAt: new Date().toISOString(),
  };
}

export function ensureValidSession(session: TeamSession): void {
  if (session.participants.length > MAX_TEAM_PARTICIPANTS) {
    throw new Error('A sessão de equipe excedeu o limite de 8 participantes.');
  }

  if (session.participants.some((participant) => participant.role === 'supervisor') === false) {
    throw new Error('A sessão de equipe exige um supervisor ativo.');
  }
}

export function applySupervisorDecision(
  session: TeamSession,
  next: string,
  brief: string,
): TeamSession {
  const normalized = normalizeRoleName(next);
  const allowed: SupervisorNextValue[] = ['analista', 'planejador', 'executor', 'done'];

  if (!allowed.includes(normalized as SupervisorNextValue)) {
    throw new Error(`Decisão de supervisor inválida: ${next}`);
  }

  const updatedBlackboard = addDecisionToBlackboard(session.blackboard, normalized, brief, 'supervisor');
  const handoffTrace = {
    type: 'handoff',
    message: `Transferência de responsabilidade para ${normalized}.`,
    from: 'supervisor',
    to: normalized,
    brief,
    timestamp: new Date().toISOString(),
  };

  return {
    ...session,
    blackboard: updatedBlackboard,
    trace: [handoffTrace, ...session.trace],
    updatedAt: new Date().toISOString(),
  };
}
