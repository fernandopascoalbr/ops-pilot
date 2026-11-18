import test from 'node:test';
import assert from 'node:assert/strict';

import { addParticipant, createTeamSession, MAX_TEAM_PARTICIPANTS } from '../../../src/team/session.js';
import { canRolePerform } from '../../../src/team/roles.js';
import { processTeamRequest } from '../../../src/http/server.js';
import { createParticipant } from '../../../src/team/blackboard.js';

test('team session caps participants at eight and ensures role guardrails stay valid', () => {
  const session = createTeamSession({
    participants: [
      createParticipant({ id: 's1', name: 'Supervisor', role: 'supervisor', canWrite: true, canUseTools: true }),
      createParticipant({ id: 'a1', name: 'Analista', role: 'analista', canWrite: false, canUseTools: false }),
      createParticipant({ id: 'p1', name: 'Planejador', role: 'planejador', canWrite: false, canUseTools: false }),
      createParticipant({ id: 'e1', name: 'Executor', role: 'executor', canWrite: false, canUseTools: false }),
    ],
  });

  assert.equal(session.maxParticipants, MAX_TEAM_PARTICIPANTS);
  assert.equal(canRolePerform('analista', 'read'), true);
  assert.equal(canRolePerform('analista', 'write'), false);
  assert.equal(canRolePerform('planejador', 'tool'), false);
  assert.equal(canRolePerform('executor', 'incident'), true);

  let nextSession = session;
  for (let index = 0; index < MAX_TEAM_PARTICIPANTS - session.participants.length; index += 1) {
    nextSession = addParticipant(nextSession, createParticipant({
      id: `extra-${index}`,
      name: `Member ${index}`,
      role: 'analista',
      canWrite: false,
      canUseTools: false,
    }));
  }

  assert.equal(nextSession.participants.length, MAX_TEAM_PARTICIPANTS);

  assert.throws(() => addParticipant(nextSession, createParticipant({
    id: 'over-limit',
    name: 'Overflow',
    role: 'analista',
    canWrite: false,
    canUseTools: false,
  })), /limite máximo de 8 participantes/i);
});

test('processTeamRequest returns a structured supervisor decision and handoff trace', async () => {
  const result = await processTeamRequest({
    sessionId: 'team-123',
    userId: 'ops-user',
    role: 'supervisor',
    blackboard: {
      objective: 'Acompanhar incidente de autenticação',
      summary: 'Há evidências de falha no cliente autenticado.',
      incidentId: 'inc-42',
      openItems: ['revisar logs', 'confirmar status do provedor'],
      decisionHistory: [],
      lastUpdatedBy: 'supervisor',
      updatedAt: new Date().toISOString(),
    },
    message: 'Precisamos decidir o próximo papel da operação.',
    participants: [
      { name: 'Supervisor', role: 'supervisor' },
      { name: 'Analista', role: 'analista' },
      { name: 'Planejador', role: 'planejador' },
      { name: 'Executor', role: 'executor' },
    ],
  });

  assert.equal(result.status, 200);
  assert.ok(['analista', 'planejador', 'executor', 'done'].includes(result.body.decision.next));
  assert.ok(Array.isArray(result.body.trace));
  assert.equal(result.body.trace.length > 0, true);
  assert.equal((result.body.trace[0] as { type: string }).type, 'handoff');
  assert.ok('brief' in result.body.decision);
});
