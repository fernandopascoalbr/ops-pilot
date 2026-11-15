import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: createDeterministicStrategy('react', 'default strategy answer'),
};

test('POST /chat returns the same requestId in body and X-Request-Id header on success', async () => {
  const response = await postChat(
    { message: 'Analise os alertas ativos' },
    { registry: fakeRegistry, timeoutMs: 1000 },
  );

  assert.equal(response.status, 200);
  const headerRequestId = response.headers.get('x-request-id');
  assert.equal(typeof response.body.requestId, 'string');
  assert.ok(response.body.requestId.length > 0);
  assert.equal(response.body.requestId, headerRequestId);
});
