import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUMMARY_MAX_TOKENS,
  clampSummaryToTokenLimit,
  countTokens,
  selectDisplacedBatch,
  summarizeDisplacedMessages,
} from '../../../src/chat/conversation-summary.js';
import { buildPruningFixtureTurns } from '../../fixtures/conversation-summary-fixtures.js';

test('summarizeDisplacedMessages preserves decision/fact/pending signals from displaced chunk', () => {
  const turns = buildPruningFixtureTurns();
  const displaced = turns.slice(0, 8).map((turn, index) => ({
    role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: turn.message,
    createdAt: new Date().toISOString(),
  }));

  const summary = summarizeDisplacedMessages(displaced);

  assert.match(summary, /Decisão/i);
  assert.match(summary, /Fato/i);
  assert.match(summary, /Pendência/i);
  assert.ok(countTokens(summary) <= SUMMARY_MAX_TOKENS);
});

test('summarizeDisplacedMessages merges previous summary before clipping', () => {
  const previousSummary = '- Incidente INC-A aberto\n- Pendência antiga de runbook';
  const displaced = [
    { role: 'user' as const, content: 'Incidente INC-B aberto para investigação.', createdAt: new Date().toISOString() },
  ];

  const merged = summarizeDisplacedMessages(displaced, previousSummary);

  assert.match(merged, /INC-A/);
  assert.match(merged, /INC-B/);
});

test('selectDisplacedBatch only emits full batches of 8 displaced messages', () => {
  const messages = Array.from({ length: 18 }, (_, index) => ({
    role: 'user' as const,
    content: `msg-${index + 1}`,
    createdAt: new Date().toISOString(),
  }));

  const first = selectDisplacedBatch(messages, 0);
  assert.equal(first.batchSize, 8);
  assert.equal(first.messages.length, 8);
  assert.equal(first.summarizedMessageCount, 8);

  const second = selectDisplacedBatch(messages, 8);
  assert.equal(second.batchSize, 0);
  assert.equal(second.messages.length, 0);
  assert.equal(second.summarizedMessageCount, 8);
});

test('clampSummaryToTokenLimit truncates text to max token budget', () => {
  const overLimit = Array.from({ length: 180 }, (_, index) => `t${index + 1}`).join(' ');
  const clamped = clampSummaryToTokenLimit(overLimit, 150);
  assert.equal(countTokens(clamped), 150);
});
