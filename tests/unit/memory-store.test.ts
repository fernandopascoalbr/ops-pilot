import assert from 'node:assert/strict';
import test from 'node:test';

import { MemoryStore, MEMORY_DEDUP_THRESHOLD, MEMORY_RECALL_THRESHOLD } from '../../src/memory/memory-store.js';

const deterministicEmbedder = async (text: string): Promise<number[]> => {
  const normalized = text.toLowerCase();

  if (normalized.includes('atraso') || normalized.includes('cobrança') || normalized.includes('pagamento')) {
    return [1, 0, 0, 0];
  }

  if (normalized.includes('checkout') || normalized.includes('latência')) {
    return [0, 1, 0, 0];
  }

  if (normalized.includes('português') || normalized.includes('atendimento')) {
    return [0, 0, 1, 0];
  }

  return [0, 0, 0, 1];
};

test('MemoryStore remembers unique facts per user and deduplicates semantically redundant records', async () => {
  const store = new MemoryStore(':memory:', deterministicEmbedder);

  const first = await store.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  assert.ok(first);
  assert.equal(first?.userId, 'user-1');

  const duplicate = await store.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  assert.equal(duplicate, null);

  const similarDuplicate = await store.remember('user-1', 'Há cobrança em atraso da conta do cliente e o caso exige revisão manual.');
  assert.equal(similarDuplicate, null);

  const stored = store.listByUser('user-1');
  assert.equal(stored.length, 1);
  assert.match(stored[0].fact, /conta do cliente está em atraso/i);
});

test('MemoryStore recalls the top three relevant memories above the minimum similarity threshold', async () => {
  const store = new MemoryStore(':memory:', deterministicEmbedder);

  await store.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  await store.remember('user-1', 'O checkout tem latência elevada durante a compra.');
  await store.remember('user-1', 'O atendimento deve ser em português para o cliente.');

  const results = await store.recall('user-1', 'Qual é o estado da cobrança do cliente?', 3, MEMORY_RECALL_THRESHOLD);

  assert.equal(results.length, 1);
  assert.match(results[0].fact, /atraso/i);
  assert.ok(results[0].score !== undefined);
  assert.ok(results[0].score! >= MEMORY_RECALL_THRESHOLD);
});

test('MemoryStore forget removes a single fact without touching unrelated memories', async () => {
  const store = new MemoryStore(':memory:', deterministicEmbedder);

  const first = await store.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  const second = await store.remember('user-1', 'O checkout tem latência elevada durante a compra.');

  assert.ok(first);
  assert.ok(second);

  const removed = store.forget(first!.id);
  assert.equal(removed, true);

  const remaining = store.listByUser('user-1');
  assert.equal(remaining.length, 1);
  assert.match(remaining[0].fact, /checkout/i);
});

test('MemoryStore uses the configured deduplication threshold constant', () => {
  assert.ok(MEMORY_DEDUP_THRESHOLD > 0.9);
  assert.ok(MEMORY_RECALL_THRESHOLD < 0.5);
});
