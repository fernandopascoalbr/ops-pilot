import test from 'node:test';
import assert from 'node:assert/strict';

import { planAndExecuteStrategy } from '../src/agents/plan-and-execute.js';
import { reflectPlanAndExecuteStrategy } from '../src/agents/reflect-plan-and-execute.js';
import { reactStrategy } from '../src/agents/react.js';

test('plan-and-execute runs with bounded steps and metrics', async () => {
  const result = await planAndExecuteStrategy.run('Investigue os alertas da fila de pagamentos', 3);
  assert.ok(result.answer.length > 0);
  assert.ok(result.trace.length > 0);
  assert.ok(result.metrics.latencyMs >= 0);
  assert.ok(result.metrics.stepsUsed !== undefined);
});

test('plan-and-execute opens incident for service mentioned in input', async () => {
  const previousApiKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    const result = await planAndExecuteStrategy.run('o p99 do checkout passou de 2 segundos, abra um incidente medium', 8);
    const openIncidentEvent = result.trace.find((event) => event.type === 'action' && event.tool === 'open_incident');

    assert.ok(openIncidentEvent);
    assert.equal(openIncidentEvent.args?.service, 'checkout');
    assert.equal(openIncidentEvent.args?.severity, 'medium');
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = previousApiKey;
    }
  }
});

test('react strategy returns a result and audit trail', async () => {
  const result = await reactStrategy.run('Mostre o estado do plantão', 6);
  assert.ok(result.answer.length > 0);
  assert.ok(result.trace.length > 0);
  assert.ok(result.metrics.llmCalls >= 0);
});

test('reflect strategy plans before first action', async () => {
  const result = await reflectPlanAndExecuteStrategy.run('Analise os alertas do plantão e responda', 4);
  const planIndex = result.trace.findIndex((event) => event.type === 'plan');
  const actionIndex = result.trace.findIndex((event) => event.type === 'action');
  assert.ok(planIndex >= 0, 'should emit plan events');
  assert.ok(actionIndex >= 0, 'should emit action events');
  assert.ok(planIndex < actionIndex, 'first plan event must appear before first action event');
});

test('reflect strategy supports continue and adjust decision paths', async () => {
  const continueResult = await reflectPlanAndExecuteStrategy.run('Analise e continue com a execução normal', 4);
  assert.ok(continueResult.trace.some((event) => event.type === 'critique' && event.message.includes('CONTINUE')));

  const adjustResult = await reflectPlanAndExecuteStrategy.run('Use ajuste porque há evidência contraditória', 4);
  assert.ok(adjustResult.trace.some((event) => event.type === 'critique' && event.message.includes('ADJUST')));
});

test('reflect strategy enforces bounded iterations and safe fallback', async () => {
  const bounded = await reflectPlanAndExecuteStrategy.run('Contexto incompleto com incerteza operacional', 2);
  assert.ok((bounded.metrics.stepsUsed ?? 0) <= 2);
  assert.ok(bounded.answer.toLowerCase().includes('fallback seguro'));
  assert.ok(bounded.trace.some((event) => event.type === 'critique' && event.message.includes('END')));
});
