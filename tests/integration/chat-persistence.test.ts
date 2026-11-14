import assert from 'node:assert/strict';
import test from 'node:test';
import { SqliteConversationStore } from '../../src/chat/sqlite-conversation-store.js';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const fakeRegistry = {
  react: createDeterministicStrategy('react', 'default strategy answer'),
};

test('POST /chat creates a conversation when conversationId is omitted and returns it', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const response = await postChat(
    { message: 'primeira mensagem' },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.conversationId, 'string');
  assert.ok(response.body.conversationId.length > 0);
  assert.equal(response.body.metrics.historyMessages, 0);
});

test('POST /chat keeps same conversationId and reuses history on follow-up', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const first = await postChat(
    { message: 'mensagem inicial' },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );

  assert.equal(first.status, 200);
  const conversationId = first.body.conversationId as string;

  const second = await postChat(
    { message: 'mensagem de continuidade', conversationId },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );

  assert.equal(second.status, 200);
  assert.equal(second.body.conversationId, conversationId);
  assert.equal(second.body.metrics.historyMessages, 2);
});

test('POST /chat returns 404 when conversationId does not exist', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const response = await postChat(
    { message: 'mensagem', conversationId: 'conv-missing' },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );

  assert.equal(response.status, 404);
  assert.match(response.body.error, /Conversation not found/);
});

test('POST /chat caps historyMessages at 12', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');

  const first = await postChat(
    { message: 'seed' },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );
  assert.equal(first.status, 200);

  const conversationId = first.body.conversationId as string;

  for (let index = 0; index < 8; index += 1) {
    const response = await postChat(
      { message: `iteracao-${index}`, conversationId },
      { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
    );
    assert.equal(response.status, 200);
  }

  const capped = await postChat(
    { message: 'verificar limite', conversationId },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );

  assert.equal(capped.status, 200);
  assert.equal(capped.body.metrics.historyMessages, 12);
});
