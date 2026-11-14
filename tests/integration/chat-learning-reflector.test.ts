import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { handleForgetPreference } from '../../src/mcp/handlers.js';
import { createDeterministicStrategy } from '../fixtures/fake-strategies.js';
import { postChat } from '../fixtures/http-client.js';

const deterministicEmbedding = async (text: string): Promise<number[]> => {
  const normalized = text.toLowerCase();
  if (normalized.includes('português') || normalized.includes('objetivas')) {
    return [1, 0, 0];
  }
  return [0, 1, 0];
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('POST /chat keeps response path non-blocking while scheduling async learning persistence', async () => {
  const memoryStore = new MemoryStore(':memory:', deterministicEmbedding);
  const registry = {
    react: createDeterministicStrategy('react', 'ok'),
  };

  const learningReflector = {
    reflectAndRememberAsync({ userId }: { userId: string; lastUserMessage: string }) {
      void (async () => {
        await wait(120);
        await memoryStore.remember(userId, 'Usuário prefere respostas objetivas em português.');
      })();
    },
  };

  const startedAt = Date.now();
  const response = await postChat(
    {
      message: 'Prefiro respostas objetivas em português.',
      userId: 'user-reflect',
    },
    { timeoutMs: 1000, registry, memoryStore, learningReflector },
  );

  assert.equal(response.status, 200);
  assert.ok(Date.now() - startedAt < 120);
  assert.equal(memoryStore.listByUser('user-reflect').length, 0);

  await wait(180);
  const persisted = memoryStore.listByUser('user-reflect');
  assert.equal(persisted.length, 1);
});

test('forget_preference removes learned preference for the same user', async () => {
  const memoryStore = new MemoryStore(':memory:', deterministicEmbedding);
  await memoryStore.remember('user-1', 'Usuário prefere respostas objetivas em português.');
  await memoryStore.remember('user-1', 'Usuário prefere mensagens curtas.');

  const result = handleForgetPreference(
    { userId: 'user-1', target: 'respostas objetivas' },
    memoryStore,
  );

  assert.equal(result.removed, 1);
  const remaining = memoryStore.listByUser('user-1').map((entry) => entry.fact);
  assert.equal(remaining.length, 1);
  assert.match(remaining[0], /mensagens curtas/i);
});

test('forget_preference is a safe no-op when target does not exist', async () => {
  const memoryStore = new MemoryStore(':memory:', deterministicEmbedding);
  await memoryStore.remember('user-1', 'Usuário prefere respostas objetivas em português.');

  const result = handleForgetPreference(
    { userId: 'user-1', target: 'preferência inexistente' },
    memoryStore,
  );

  assert.equal(result.removed, 0);
  const remaining = memoryStore.listByUser('user-1');
  assert.equal(remaining.length, 1);
});
