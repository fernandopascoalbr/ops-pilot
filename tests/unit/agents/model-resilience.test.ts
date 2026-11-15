import test from 'node:test';
import assert from 'node:assert/strict';
import { getOpenRouterConfig } from '../../../src/config/env.js';
import { invokeWithModelFallbacks, ModelUnavailableError } from '../../../src/agents/model.js';

test('getOpenRouterConfig parses OPENROUTER_MODEL_FALLBACK as ordered unique list', () => {
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousFallback = process.env.OPENROUTER_MODEL_FALLBACK;
  const previousApiKey = process.env.OPENROUTER_API_KEY;

  try {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-primary';
    process.env.OPENROUTER_MODEL_FALLBACK = 'openai/gpt-backup-a, openai/gpt-backup-b,openai/gpt-backup-a, openai/gpt-primary';

    const config = getOpenRouterConfig();

    assert.deepEqual(config.fallbackModels, ['openai/gpt-backup-a', 'openai/gpt-backup-b']);
  } finally {
    process.env.OPENROUTER_MODEL = previousModel;
    process.env.OPENROUTER_MODEL_FALLBACK = previousFallback;
    process.env.OPENROUTER_API_KEY = previousApiKey;
  }
});

test('invokeWithModelFallbacks switches to fallback and reports modelUsed', async () => {
  const previousApiKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousFallback = process.env.OPENROUTER_MODEL_FALLBACK;

  try {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-primary';
    process.env.OPENROUTER_MODEL_FALLBACK = 'openai/gpt-backup';

    let attempts = 0;
    const execution = await invokeWithModelFallbacks(async (candidate) => {
      attempts += 1;
      if (candidate.role === 'primary') {
        throw new Error('primary failed');
      }
      return `ok:${candidate.modelName}`;
    });

    assert.equal(attempts, 3);
    assert.equal(execution.value, 'ok:openai/gpt-backup');
    assert.equal(execution.modelUsed, 'openai/gpt-backup');
    assert.equal(execution.fallbackTransitions.length, 1);
    assert.equal(execution.fallbackTransitions[0]?.fromModel, 'openai/gpt-primary');
    assert.equal(execution.fallbackTransitions[0]?.toModel, 'openai/gpt-backup');
  } finally {
    process.env.OPENROUTER_API_KEY = previousApiKey;
    process.env.OPENROUTER_MODEL = previousModel;
    process.env.OPENROUTER_MODEL_FALLBACK = previousFallback;
  }
});

test('invokeWithModelFallbacks throws ModelUnavailableError when all candidates fail', async () => {
  const previousApiKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousFallback = process.env.OPENROUTER_MODEL_FALLBACK;

  try {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-primary';
    process.env.OPENROUTER_MODEL_FALLBACK = 'openai/gpt-backup';

    await assert.rejects(
      invokeWithModelFallbacks(async () => {
        throw new Error('all failed');
      }),
      (error: unknown) => error instanceof ModelUnavailableError && error.attempts.length === 4,
    );
  } finally {
    process.env.OPENROUTER_API_KEY = previousApiKey;
    process.env.OPENROUTER_MODEL = previousModel;
    process.env.OPENROUTER_MODEL_FALLBACK = previousFallback;
  }
});
