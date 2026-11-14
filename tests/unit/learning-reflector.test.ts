import assert from 'node:assert/strict';
import test from 'node:test';
import { LearningReflector } from '../../src/memory/learning-reflector.js';

const fakeMemoryStore = {
  async remember() {
    return null;
  },
} as any;

test('LearningReflector marks durable preference as learning and keeps non-empty fact', async () => {
  const reflector = new LearningReflector({
    memoryStore: fakeMemoryStore,
    decideWithModel: async () => ({
      hasLearning: true,
      fact: 'Usuário prefere respostas objetivas em português.',
    }),
  });

  const decision = await reflector.analyzeLastUserMessage('Prefiro respostas objetivas em português.');
  assert.equal(decision.hasLearning, true);
  assert.match(decision.fact, /objetivas/i);
  assert.equal(decision.reason, 'durable');
});

test('LearningReflector blocks secret content even when model suggests learning', async () => {
  const reflector = new LearningReflector({
    memoryStore: fakeMemoryStore,
    decideWithModel: async () => ({
      hasLearning: true,
      fact: 'Minha senha do sistema é 123456.',
    }),
  });

  const decision = await reflector.analyzeLastUserMessage('Minha senha do sistema é 123456.');
  assert.equal(decision.hasLearning, false);
  assert.equal(decision.fact, '');
  assert.equal(decision.reason, 'blocked-secret');
});

test('LearningReflector blocks punctual task instructions from durable memory', async () => {
  const reflector = new LearningReflector({
    memoryStore: fakeMemoryStore,
    decideWithModel: async () => ({
      hasLearning: true,
      fact: 'Agora abra um incidente crítico para checkout.',
    }),
  });

  const decision = await reflector.analyzeLastUserMessage('Agora abra um incidente crítico para checkout.');
  assert.equal(decision.hasLearning, false);
  assert.equal(decision.fact, '');
  assert.equal(decision.reason, 'blocked-punctual');
});
