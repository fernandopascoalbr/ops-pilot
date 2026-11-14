import assert from 'node:assert/strict';
import test from 'node:test';

import { SqliteConversationStore } from '../../src/chat/sqlite-conversation-store.js';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { postChat } from '../fixtures/http-client.js';

const embeddingProvider = async (text: string): Promise<number[]> => {
  const normalized = text.toLowerCase();

  if (normalized.includes('atraso') || normalized.includes('cobrança') || normalized.includes('cliente')) {
    return [1, 0, 0];
  }

  if (normalized.includes('checkout') || normalized.includes('latência')) {
    return [0, 1, 0];
  }

  return [0, 0, 1];
};

test('POST /chat injects user-scoped memory recall into the strategy input', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const memoryStore = new MemoryStore(':memory:', embeddingProvider);

  await memoryStore.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');

  const registry = {
    memoryAware: {
      name: 'memoryAware',
      async run(input: string) {
        assert.match(input, /Memórias relevantes do usuário:/);
        assert.match(input, /em atraso/);
        return {
          answer: `memory-aware: ${input}`,
          trace: [],
          metrics: {
            llmCalls: 0,
            latencyMs: 1,
            interactionLimit: 8,
            stepsUsed: 1,
          },
        };
      },
    },
  };

  const response = await postChat(
    {
      message: 'Qual é o estado da cobrança do cliente?',
      strategy: 'memoryAware',
      userId: 'user-1',
    },
    {
      timeoutMs: 1000,
      conversationStore,
      memoryStore,
      registry,
    },
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.answer.includes('memory-aware'));
  assert.equal(response.body.metrics.memoryRecallCount, 1);
});

test('POST /chat keeps memory isolated by user and does not leak cross-user context', async () => {
  const conversationStore = new SqliteConversationStore(':memory:');
  const memoryStore = new MemoryStore(':memory:', embeddingProvider);

  await memoryStore.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  await memoryStore.remember('user-2', 'O checkout tem latência elevada durante a compra.');

  const registry = {
    memoryAware: {
      name: 'memoryAware',
      async run(input: string) {
        assert.doesNotMatch(input, /latência elevada/i);
        return {
          answer: input,
          trace: [],
          metrics: {
            llmCalls: 0,
            latencyMs: 1,
            interactionLimit: 8,
            stepsUsed: 1,
          },
        };
      },
    },
  };

  const response = await postChat(
    {
      message: 'Qual é o estado da cobrança do cliente?',
      strategy: 'memoryAware',
      userId: 'user-1',
    },
    {
      timeoutMs: 1000,
      conversationStore,
      memoryStore,
      registry,
    },
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.answer.includes('em atraso'));
  assert.doesNotMatch(response.body.answer, /latência elevada/i);
});
