import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: createDeterministicStrategy('react', 'default strategy answer'),
};

test('POST /chat returns 422 for unknown strategy', async () => {
  const response = await postChat(
    { message: 'Analise o plantao', strategy: 'missing-strategy' },
    { registry: fakeRegistry, timeoutMs: 1000 },
  );

  assert.equal(response.status, 422);
  assert.equal(typeof response.body.error, 'string');
  assert.match(response.body.error, /Estratégia desconhecida/);
});
