import { createTraceEvent } from '../../src/agents/trace.js';
import { ModelUnavailableError, type ModelAttempt } from '../../src/agents/model.js';
import type { ReasoningStrategy } from '../../src/domain/strategy.js';

export function createFallbackSuccessStrategy(): ReasoningStrategy {
  return {
    name: 'react',
    async run(input: string) {
      return {
        answer: `fallback answer: ${input}`,
        trace: [
          createTraceEvent('fallback', 'Fallback acionado de openai/gpt-primary para openai/gpt-backup.', {
            node: 'model-factory',
            args: { fromModel: 'openai/gpt-primary', toModel: 'openai/gpt-backup' },
          }),
          createTraceEvent('answer', `fallback answer: ${input}`),
        ],
        metrics: {
          llmCalls: 2,
          latencyMs: 4,
          modelUsed: 'openai/gpt-backup',
        },
      };
    },
  };
}

export function createAllModelsFailStrategy(): ReasoningStrategy {
  return {
    name: 'react',
    async run() {
      const attempts: ModelAttempt[] = [
        {
          model: 'openai/gpt-primary',
          role: 'primary',
          attemptIndex: 1,
          outcome: 'failure',
          errorMessage: 'timeout',
        },
        {
          model: 'openai/gpt-backup',
          role: 'fallback',
          attemptIndex: 2,
          outcome: 'failure',
          errorMessage: 'provider unavailable',
        },
      ];

      throw new ModelUnavailableError(attempts);
    },
  };
}
