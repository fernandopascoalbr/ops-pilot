import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildContextBreakdown,
  createPromptTokensCollector,
  estimateTokens,
  extractPromptTokensFromMessages,
  extractPromptTokensFromUsage,
} from '../../../src/context/token.js';

test('estimateTokens uses chars/4 and keeps empty text at zero', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
});

test('buildContextBreakdown keeps all sources and computes total sum', () => {
  const breakdown = buildContextBreakdown([
    { source: 'currentMessage', text: 'abcd' },
    { source: 'conversationHistory', text: '' },
    { source: 'memoryRecall', text: 'abcdefgh' },
  ]);

  assert.deepEqual(
    breakdown.items.map((item) => item.source),
    ['currentMessage', 'conversationHistory', 'memoryRecall'],
  );
  assert.equal(breakdown.items[1].chars, 0);
  assert.equal(
    breakdown.totalEstimatedTokens,
    breakdown.items.reduce((total, item) => total + item.estimatedTokens, 0),
  );
});

test('extractPromptTokensFromUsage supports normalized usage paths', () => {
  assert.equal(
    extractPromptTokensFromUsage({
      usage_metadata: {
        input_tokens: 12,
      },
    }),
    12,
  );

  assert.equal(
    extractPromptTokensFromUsage({
      response_metadata: {
        tokenUsage: {
          promptTokens: 8,
        },
      },
    }),
    8,
  );

  assert.equal(extractPromptTokensFromUsage({}), null);
});

test('extractPromptTokensFromMessages sums prompt usage from message metadata', () => {
  const promptTokens = extractPromptTokensFromMessages([
    { usage_metadata: { input_tokens: 7 } },
    { response_metadata: { tokenUsage: { promptTokens: 5 } } },
  ]);

  assert.equal(promptTokens, 12);
  assert.equal(extractPromptTokensFromMessages([{ content: 'no usage' }]), null);
});

test('createPromptTokensCollector accumulates prompt usage from callbacks', () => {
  const collector = createPromptTokensCollector();
  collector.callback.handleLLMEnd({ llmOutput: { tokenUsage: { promptTokens: 4 } } });
  collector.callback.handleLLMEnd({ usage_metadata: { input_tokens: 6 } });
  assert.equal(collector.getPromptTokens(), 10);
});
