import assert from 'node:assert/strict';
import test from 'node:test';

import { buildContext, DEFAULT_CONTEXT_BUDGETS, resolveContextBudgets } from '../../../src/context/context-builder.js';

test('buildContext keeps protected sections intact and trims summary, window and memory within their budgets', { concurrency: false }, () => {
  const context = buildContext({
    message: 'Mensagem atual do usuário',
    summary: 'Resumo muito longo '.repeat(30),
    history: [
      { role: 'user', content: 'Primeira mensagem antiga' },
      { role: 'assistant', content: 'Resposta antiga' },
      { role: 'user', content: 'Mensagem recente' },
    ],
    memories: [
      { fact: 'Memória baixa', score: 0.1 },
      { fact: 'Memória alta', score: 0.9 },
      { fact: 'Memória média', score: 0.5 },
    ],
    budgets: {
      summary: 40,
      window: 45,
      memory: 30,
    },
  });

  assert.match(context.input, /Mensagem atual do usuário/);
  assert.ok(context.input.includes('Memória alta'));
  assert.ok(!context.input.includes('Memória baixa'));
  assert.ok(context.contextBreakdown.items.some((item) => item.source === 'currentMessage'));
  assert.ok(context.contextBreakdown.totalEstimatedTokens > 0);
  assert.ok(context.sections.some((section) => section.name === 'summary' && section.text.length <= 180));
  assert.ok(context.sections.some((section) => section.name === 'window' && section.finalCount <= 3));
  assert.ok(context.sections.some((section) => section.name === 'memory' && section.finalCount <= 3));
});

test('buildContext trims summary, then window, then memory in the required low-budget order', { concurrency: false }, () => {
  const context = buildContext({
    message: 'Mensagem atual',
    summary: 'Resumo '.repeat(100),
    history: [
      { role: 'user', content: 'H1' },
      { role: 'assistant', content: 'H2' },
      { role: 'user', content: 'H3' },
      { role: 'assistant', content: 'H4' },
      { role: 'user', content: 'H5' },
    ],
    memories: [
      { fact: 'M1', score: 0.2 },
      { fact: 'M2', score: 0.4 },
      { fact: 'M3', score: 0.6 },
    ],
    budgets: {
      summary: 12,
      window: 10,
      memory: 8,
    },
  });

  const summarySection = context.sections.find((section) => section.name === 'summary');
  const windowSection = context.sections.find((section) => section.name === 'window');
  const memorySection = context.sections.find((section) => section.name === 'memory');

  assert.ok(summarySection);
  assert.ok(windowSection);
  assert.ok(memorySection);
  assert.equal(summarySection.cut, 'oldest-first');
  assert.equal(windowSection.cut, 'oldest-first');
  assert.equal(memorySection.cut, 'lowest-score-first');
  assert.ok(estimateTokens(summarySection.text) <= 12);
  assert.ok(estimateTokens(windowSection.text) <= 10);
  assert.ok(estimateTokens(memorySection.text) <= 8);
});

test('resolveContextBudgets reads environment overrides and falls back to defaults', { concurrency: false }, () => {
  const previous = {
    summary: process.env.CONTEXT_BUDGET_SUMMARY,
    window: process.env.CONTEXT_BUDGET_WINDOW,
    memory: process.env.CONTEXT_BUDGET_MEMORY,
    system: process.env.CONTEXT_BUDGET_SYSTEM,
  };

  try {
    process.env.CONTEXT_BUDGET_SUMMARY = '50';
    process.env.CONTEXT_BUDGET_WINDOW = '120';
    process.env.CONTEXT_BUDGET_MEMORY = '80';
    process.env.CONTEXT_BUDGET_SYSTEM = '999';

    const budgets = resolveContextBudgets();
    assert.equal(budgets.summary, 50);
    assert.equal(budgets.window, 120);
    assert.equal(budgets.memory, 80);
    assert.equal(budgets.system, 999);
    assert.equal(DEFAULT_CONTEXT_BUDGETS.summary, 200);
  } finally {
    if (previous.summary === undefined) delete process.env.CONTEXT_BUDGET_SUMMARY; else process.env.CONTEXT_BUDGET_SUMMARY = previous.summary;
    if (previous.window === undefined) delete process.env.CONTEXT_BUDGET_WINDOW; else process.env.CONTEXT_BUDGET_WINDOW = previous.window;
    if (previous.memory === undefined) delete process.env.CONTEXT_BUDGET_MEMORY; else process.env.CONTEXT_BUDGET_MEMORY = previous.memory;
    if (previous.system === undefined) delete process.env.CONTEXT_BUDGET_SYSTEM; else process.env.CONTEXT_BUDGET_SYSTEM = previous.system;
  }
});

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}
