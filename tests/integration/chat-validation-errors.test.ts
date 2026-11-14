import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: createDeterministicStrategy('react', 'default strategy answer'),
};

test('POST /chat returns 400 with zod issues for missing required fields', async () => {
  const response = await postChat({}, { registry: fakeRegistry, timeoutMs: 1000 });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.issues));
  assert.ok(response.body.issues.length > 0);
});

test('POST /chat returns 400 when message is empty or whitespace', async () => {
  const response = await postChat(
    { message: '   ', strategy: 'react' },
    { registry: fakeRegistry, timeoutMs: 1000 },
  );

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.issues));
  assert.ok(response.body.issues.some((issue: any) => issue.path.includes('message')));
});
