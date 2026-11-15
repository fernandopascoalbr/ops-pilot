import test from 'node:test';
import assert from 'node:assert/strict';
import { postChat } from '../fixtures/http-client.js';
import { createAllModelsFailStrategy, createFallbackSuccessStrategy } from '../fixtures/openrouter-resilience.js';

test('POST /chat returns fallback trace event and metrics.modelUsed when backup model succeeds', async () => {
  const response = await postChat(
    { message: 'Analise os alertas ativos' },
    {
      registry: {
        react: createFallbackSuccessStrategy(),
      },
      timeoutMs: 1000,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.metrics.modelUsed, 'openai/gpt-backup');
  assert.equal(response.body.trace.some((event: { type?: string }) => event.type === 'fallback'), true);
});

test('POST /chat returns 503 when all model attempts fail', async () => {
  const response = await postChat(
    { message: 'Analise os alertas ativos' },
    {
      registry: {
        react: createAllModelsFailStrategy(),
      },
      timeoutMs: 1000,
    },
  );

  assert.equal(response.status, 503);
  assert.equal(typeof response.body.error, 'string');
  assert.equal('answer' in response.body, false);
  assert.equal('metrics' in response.body, false);
});
