import { createTraceEvent } from '../../src/agents/trace.js';
import type { ReasoningStrategy, StrategyRunResult } from '../../src/domain/strategy.js';

export function createDeterministicStrategy(name: string, answer: string): ReasoningStrategy {
  return {
    name,
    async run(input: string): Promise<StrategyRunResult> {
      return {
        answer: `${answer}: ${input}`,
        trace: [
          createTraceEvent('thought', `processing ${name}`),
          createTraceEvent('answer', `${answer}: ${input}`),
        ],
        metrics: {
          llmCalls: 0,
          latencyMs: 1,
          interactionLimit: 8,
          stepsUsed: 1,
        },
      };
    },
  };
}

export function createSlowStrategy(name: string, delayMs: number): ReasoningStrategy {
  return {
    name,
    async run(input: string): Promise<StrategyRunResult> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        answer: `slow ${name}: ${input}`,
        trace: [createTraceEvent('answer', `slow ${name}: ${input}`)],
        metrics: {
          llmCalls: 0,
          latencyMs: delayMs,
          interactionLimit: 8,
          stepsUsed: 1,
        },
      };
    },
  };
}

