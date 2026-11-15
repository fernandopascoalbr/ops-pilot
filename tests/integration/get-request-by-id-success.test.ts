import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat, requestJson } from '../fixtures/http-client.js';
import { SqliteRequestTraceStore } from '../../src/store/sqlite-request-trace-store.js';

const fakeRegistry = {
  react: createDeterministicStrategy('react', 'default strategy answer'),
};

test('GET /requests/:id returns persisted request and sorted trace', async () => {
  const requestTraceStore = new SqliteRequestTraceStore(':memory:');
  const created = await postChat(
    { message: 'Resuma os alertas ativos' },
    { registry: fakeRegistry, timeoutMs: 1000, requestTraceStore },
  );

  assert.equal(created.status, 200);
  const requestId = created.body.requestId as string;

  const response = await requestJson(`/requests/${requestId}`, 'GET', undefined, {
    registry: fakeRegistry,
    timeoutMs: 1000,
    requestTraceStore,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.request.requestId, requestId);
  assert.ok(Array.isArray(response.body.trace));
  assert.ok(response.body.trace.length > 0);

  for (let index = 1; index < response.body.trace.length; index += 1) {
    const previous = response.body.trace[index - 1];
    const current = response.body.trace[index];
    const ordered = previous.occurredAt < current.occurredAt
      || (previous.occurredAt === current.occurredAt && previous.seq <= current.seq);
    assert.equal(ordered, true);
  }
});
