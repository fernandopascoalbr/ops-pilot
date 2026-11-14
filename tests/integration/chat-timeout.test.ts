import test from 'node:test';
import assert from 'node:assert/strict';
import { createSlowStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: createSlowStrategy('react', 50),
};

test('POST /chat returns 504 when processing exceeds timeout', async () => {
  const response = await postChat(
    { message: 'Analise o incidente critico' },
    { registry: fakeRegistry, timeoutMs: 10 },
  );

  assert.equal(response.status, 504);
  assert.equal(typeof response.body.error, 'string');
});
