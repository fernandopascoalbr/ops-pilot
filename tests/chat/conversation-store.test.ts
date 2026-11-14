import assert from 'node:assert/strict';
import test from 'node:test';
import { ConversationNotFoundError } from '../../src/chat/conversation-store.js';
import { SqliteConversationStore } from '../../src/chat/sqlite-conversation-store.js';

test('SqliteConversationStore creates and appends messages', () => {
  const store = new SqliteConversationStore(':memory:');
  const conversationId = store.create();

  store.append(conversationId, 'user', 'primeira');
  store.append(conversationId, 'assistant', 'resposta');

  const history = store.lastMessages(conversationId, 12);
  assert.equal(history.length, 2);
  assert.equal(history[0]?.role, 'user');
  assert.equal(history[1]?.role, 'assistant');
});

test('SqliteConversationStore lastMessages respects max size and chronological order', () => {
  const store = new SqliteConversationStore(':memory:');
  const conversationId = store.create();

  for (let index = 1; index <= 14; index += 1) {
    store.append(conversationId, 'user', `msg-${index}`);
  }

  const history = store.lastMessages(conversationId, 12);
  assert.equal(history.length, 12);
  assert.equal(history[0]?.content, 'msg-3');
  assert.equal(history[11]?.content, 'msg-14');
});

test('SqliteConversationStore throws ConversationNotFoundError for unknown id', () => {
  const store = new SqliteConversationStore(':memory:');

  assert.throws(() => store.lastMessages('missing-id', 12), ConversationNotFoundError);
  assert.throws(() => store.append('missing-id', 'user', 'conteudo'), ConversationNotFoundError);
});
