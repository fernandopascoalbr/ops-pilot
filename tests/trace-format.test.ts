import test from 'node:test';
import assert from 'node:assert/strict';

import { createTraceEvent, formatTrace } from '../src/agents/trace.js';
import { reflectPlanAndExecuteStrategy } from '../src/agents/reflect-plan-and-execute.js';

test('trace formatter keeps event order and types deterministic', () => {
  const trace = [
    createTraceEvent('thought', 'Beginning review', { tool: 'list_alerts', args: { status: 'firing' } }),
    createTraceEvent('observation', 'Found 3 firing alerts'),
    createTraceEvent('answer', 'Finish triage and escalate if needed'),
  ];

  const output = formatTrace(trace);
  assert.match(output, /\[thought\] Beginning review/);
  assert.match(output, /\[observation\] Found 3 firing alerts/);
  assert.match(output, /\[answer\] Finish triage and escalate if needed/);
});

test('trace formatter includes fallback events', () => {
  const trace = [
    createTraceEvent('fallback', 'Fallback acionado de primary para backup', {
      node: 'model-factory',
      args: { fromModel: 'primary', toModel: 'backup' },
    }),
  ];

  const output = formatTrace(trace);
  assert.match(output, /\[fallback\] Fallback acionado de primary para backup/);
});

test('reflect strategy returns contract-shaped result', async () => {
  const result = await reflectPlanAndExecuteStrategy.run('Valide o contrato de saída', 3);
  assert.equal(typeof result.answer, 'string');
  assert.ok(Array.isArray(result.trace));
  assert.equal(typeof result.metrics.llmCalls, 'number');
  assert.equal(typeof result.metrics.latencyMs, 'number');
});
