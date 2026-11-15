import assert from 'node:assert/strict';
import test from 'node:test';
import { countTokens, SUMMARY_MAX_TOKENS } from '../../src/chat/conversation-summary.js';
import { SqliteConversationStore } from '../../src/chat/sqlite-conversation-store.js';
import { buildPruningFixtureTurns } from '../fixtures/conversation-summary-fixtures.js';
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
  const historySource = response.body.metrics.contextBreakdown.items.find(
    (item: { source: string }) => item.source === 'conversationHistory',
  );
  assert.equal(historySource?.chars, 0);
  const memorySource = response.body.metrics.contextBreakdown.items.find(
    (item: { source: string }) => item.source === 'memoryRecall',
  );
  assert.equal(memorySource?.chars, 0);
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

test('POST /chat caps historyMessages at 8', async () => {
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
  assert.equal(capped.body.metrics.historyMessages, 8);
  assert.equal(
    capped.body.metrics.contextBreakdown.totalEstimatedTokens,
    capped.body.metrics.contextBreakdown.items.reduce(
      (total: number, item: { estimatedTokens: number }) => total + item.estimatedTokens,
      0,
    ),
  );
});

test('POST /chat creates initial persisted summary when first displaced batch reaches 8 messages', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const turns = buildPruningFixtureTurns();
  let conversationId = '';
  let response: { status: number; body: any } | undefined;

  for (let index = 0; index < 9; index += 1) {
    response = await postChat(
      {
        message: turns[index]?.message ?? `turn-${index + 1}`,
        conversationId: conversationId || undefined,
      },
      { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
    );
    assert.equal(response.status, 200);
    conversationId = response.body.conversationId;
  }

  assert.ok(response);
  const summary = conversationStore.readSummary(conversationId);
  assert.ok(summary);
  assert.equal(summary?.summarizedMessageCount, 8);
  assert.ok(summary?.summaryText.length);
  assert.ok(countTokens(summary?.summaryText ?? '') <= SUMMARY_MAX_TOKENS);
  assert.match(response?.body.answer as string, /Resumo consolidado da conversa:/);
});

test('POST /chat merges previous persisted summary only when a new displaced batch of 8 is complete', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const turns = buildPruningFixtureTurns();
  let conversationId = '';
  let firstBatchSummary = '';

  for (let index = 0; index < 9; index += 1) {
    const response = await postChat(
      {
        message: turns[index]?.message ?? `turn-${index + 1}`,
        conversationId: conversationId || undefined,
      },
      { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
    );
    assert.equal(response.status, 200);
    conversationId = response.body.conversationId;
  }

  const summaryAfterFirstBatch = conversationStore.readSummary(conversationId);
  assert.ok(summaryAfterFirstBatch);
  firstBatchSummary = summaryAfterFirstBatch?.summaryText ?? '';
  assert.match(firstBatchSummary, /INC-A/i);

  for (let index = 9; index < 12; index += 1) {
    const response = await postChat(
      { message: turns[index]?.message ?? `turn-${index + 1}`, conversationId },
      { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
    );
    assert.equal(response.status, 200);
    const stableSummary = conversationStore.readSummary(conversationId);
    assert.equal(stableSummary?.summarizedMessageCount, 8);
    assert.equal(stableSummary?.summaryText, firstBatchSummary);
    assert.doesNotMatch(JSON.stringify(response.body.trace), /"type":"summarize"/);
  }

  const secondBatchResponse = await postChat(
    { message: turns[12]?.message ?? 'turn-13', conversationId },
    { registry: fakeRegistry, timeoutMs: 1000, conversationStore },
  );
  assert.equal(secondBatchResponse.status, 200);
  assert.match(JSON.stringify(secondBatchResponse.body.trace), /"type":"summarize"/);

  const summaryAfterSecondBatch = conversationStore.readSummary(conversationId);
  assert.ok(summaryAfterSecondBatch);
  assert.equal(summaryAfterSecondBatch?.summarizedMessageCount, 16);
  assert.notEqual(summaryAfterSecondBatch?.summaryText, firstBatchSummary);
  assert.match(summaryAfterSecondBatch?.summaryText ?? '', /INC-A/i);
  assert.match(summaryAfterSecondBatch?.summaryText ?? '', /INC-B/i);
});
