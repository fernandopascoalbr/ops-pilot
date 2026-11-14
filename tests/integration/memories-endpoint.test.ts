import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryStore } from '../../src/memory/memory-store.js';
import { requestJson } from '../fixtures/http-client.js';

const embeddingProvider = async (text: string): Promise<number[]> => {
  const normalized = text.toLowerCase();

  if (normalized.includes('atraso') || normalized.includes('cobrança') || normalized.includes('cliente')) {
    return [1, 0, 0, 0];
  }

  if (normalized.includes('checkout') || normalized.includes('latência')) {
    return [0, 1, 0, 0];
  }

  if (normalized.includes('português') || normalized.includes('idioma')) {
    return [0, 0, 1, 0];
  }

  return [0, 0, 0, 1];
};

test('POST /memories stores new memory and deduplicates semantic duplicates', async () => {
  const memoryStore = new MemoryStore(':memory:', embeddingProvider);

  const first = await requestJson('/memories', 'POST', {
    userId: 'user-1',
    fact: 'A conta do cliente está em atraso e precisa de revisão manual.',
  }, { memoryStore });
  assert.equal(first.status, 201);
  assert.equal(first.body.stored, true);
  assert.equal(first.body.memory.userId, 'user-1');

  const duplicate = await requestJson('/memories', 'POST', {
    userId: 'user-1',
    fact: 'Há cobrança em atraso da conta do cliente e o caso exige revisão manual.',
  }, { memoryStore });

  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.stored, false);
  assert.equal(duplicate.body.reason, 'duplicate');
});

test('GET /memories returns recalled memories above score threshold without embeddings', async () => {
  const memoryStore = new MemoryStore(':memory:', embeddingProvider);
  await memoryStore.remember('user-1', 'A conta do cliente está em atraso e precisa de revisão manual.');
  await memoryStore.remember('user-1', 'O checkout está com latência elevada.');
  await memoryStore.remember('user-1', 'Atendimento preferido no idioma português.');

  const response = await requestJson(
    '/memories?userId=user-1&query=Qual%20%C3%A9%20o%20estado%20da%20cobran%C3%A7a%20do%20cliente%3F&k=3&minScore=0.3',
    'GET',
    undefined,
    { memoryStore },
  );

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.memories));
  assert.equal(response.body.memories.length, 1);
  assert.match(response.body.memories[0].fact, /atraso/i);
  assert.equal('embedding' in response.body.memories[0], false);
});

test('DELETE /memories forgets preference by target only for the same user', async () => {
  const memoryStore = new MemoryStore(':memory:', embeddingProvider);
  await memoryStore.remember('user-1', 'O usuário prefere respostas objetivas em português.');
  await memoryStore.remember('user-1', 'O usuário prefere mensagens curtas.');
  await memoryStore.remember('user-2', 'O usuário prefere respostas objetivas em português.');

  const response = await requestJson('/memories', 'DELETE', {
    userId: 'user-1',
    target: 'objetivas',
  }, { memoryStore });

  assert.equal(response.status, 200);
  assert.equal(response.body.removed, 1);

  const user1Facts = memoryStore.listByUser('user-1').map((entry) => entry.fact);
  const user2Facts = memoryStore.listByUser('user-2').map((entry) => entry.fact);

  assert.equal(user1Facts.length, 1);
  assert.match(user1Facts[0], /mensagens curtas/i);
  assert.equal(user2Facts.length, 1);
  assert.match(user2Facts[0], /objetivas/i);
});
