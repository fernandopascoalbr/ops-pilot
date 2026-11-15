import { ChatOpenAI } from '@langchain/openai';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import { getOpenRouterConfig } from '../config/env.js';

export type ModelRole = 'primary' | 'fallback';

export type ModelAttempt = {
  model: string;
  role: ModelRole;
  attemptIndex: number;
  outcome: 'success' | 'failure';
  errorMessage: string | null;
};

export type FallbackTransition = {
  fromModel: string;
  toModel: string;
  reason: string;
  timestamp: string;
};

export type ModelExecutionResult<T> = {
  value: T;
  modelUsed: string;
  attempts: ModelAttempt[];
  fallbackTransitions: FallbackTransition[];
};

export class ModelUnavailableError extends Error {
  readonly attempts: ModelAttempt[];

  constructor(attempts: ModelAttempt[], cause?: unknown) {
    super('No model could produce a successful response.', cause === undefined ? undefined : { cause });
    this.name = 'ModelUnavailableError';
    this.attempts = attempts;
  }
}

export type ModelCandidate = {
  modelName: string;
  role: ModelRole;
  model: ChatOpenAI;
};

function createChatModel(modelName: string): ChatOpenAI {
  const config = getOpenRouterConfig();
  return new ChatOpenAI({
    model: modelName,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL,
    },
    temperature: config.temperature,
  });
}

const MAX_ATTEMPTS_PER_MODEL = 2;

export function createModelCandidates(): ModelCandidate[] {
  const config = getOpenRouterConfig();

  if (!config.isConfigured) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Export it in the current shell before running the arena or strategy.',
    );
  }

  const primary: ModelCandidate = {
    modelName: config.model,
    role: 'primary',
    model: createChatModel(config.model),
  };

  const fallbacks: ModelCandidate[] = config.fallbackModels.map((modelName) => ({
    modelName,
    role: 'fallback',
    model: createChatModel(modelName),
  }));

  return [primary, ...fallbacks];
}

export function createModel() {
  return createModelCandidates()[0].model;
}

export async function invokeWithModelFallbacks<T>(
  operation: (candidate: ModelCandidate) => Promise<T>,
): Promise<ModelExecutionResult<T>> {
  const candidates = createModelCandidates();
  const attempts: ModelAttempt[] = [];
  const fallbackTransitions: FallbackTransition[] = [];
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    for (let retryAttempt = 0; retryAttempt < MAX_ATTEMPTS_PER_MODEL; retryAttempt += 1) {
      const attemptIndex = attempts.length + 1;

      try {
        const value = await operation(candidate);
        attempts.push({
          model: candidate.modelName,
          role: candidate.role,
          attemptIndex,
          outcome: 'success',
          errorMessage: null,
        });

        return {
          value,
          modelUsed: candidate.modelName,
          attempts,
          fallbackTransitions,
        };
      } catch (error) {
        lastError = error;
        attempts.push({
          model: candidate.modelName,
          role: candidate.role,
          attemptIndex,
          outcome: 'failure',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const next = candidates[index + 1];
    if (next) {
      fallbackTransitions.push({
        fromModel: candidate.modelName,
        toModel: next.modelName,
        reason: 'Model request failed after retries; switching to the next fallback model.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  throw new ModelUnavailableError(attempts, lastError);
}

export async function invokeStructuredWithModelFallbacks<T>(
  operation: (model: ChatOpenAI, callbacks: Callbacks) => Promise<T>,
  callbacks: Callbacks = [],
): Promise<ModelExecutionResult<T>> {
  return invokeWithModelFallbacks(async (candidate) => operation(candidate.model, callbacks));
}
