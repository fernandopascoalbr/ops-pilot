import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: {
    name: 'react',
    async run(input: string) {
      return {
        answer: `default strategy answer: ${input}`,
        trace: [],
        metrics: {
          llmCalls: 1,
          latencyMs: 1,
          promptTokens: 21,
        },
      };
    },
  },
  deterministic: createDeterministicStrategy('deterministic', 'explicit strategy answer'),
};

test('POST /chat returns 200 with answer, trace, metrics using default strategy', async () => {
  const response = await postChat(
    { message: 'Analise os alertas ativos' },
    { registry: fakeRegistry, timeoutMs: 1000 },
  );

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.conversationId, 'string');
  assert.equal(typeof response.body.answer, 'string');
  assert.equal(response.body.route, 'react');
  assert.equal(typeof response.body.reason, 'string');
  assert.equal(response.body.metrics.route, 'react');
  assert.equal(typeof response.body.metrics.routeReason, 'string');
  assert.ok(Array.isArray(response.body.trace));
  assert.equal(typeof response.body.metrics, 'object');
  assert.equal(typeof response.body.metrics.historyMessages, 'number');
  assert.equal(response.body.metrics.promptTokens, 21);
  assert.equal(response.body.trace[0].node, 'roteador');
  assert.equal(response.body.trace[0].route, 'react');
});

test('POST /chat returns 200 when explicit known strategy is provided', async () => {
  const response = await postChat(
    { message: 'Investigue pagamentos', strategy: 'deterministic' },
    { registry: fakeRegistry, timeoutMs: 1000 },
  );

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.conversationId, 'string');
  assert.match(response.body.answer, /explicit strategy answer/);
  assert.equal(typeof response.body.metrics.historyMessages, 'number');
  assert.equal(response.body.metrics.promptTokens, null);
});
