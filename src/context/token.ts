export type ContextSource = 'currentMessage' | 'conversationHistory' | 'memoryRecall';

export type ContextSourceSegment = {
  source: ContextSource;
  chars: number;
  estimatedTokens: number;
};

export type ContextBreakdown = {
  items: ContextSourceSegment[];
  totalEstimatedTokens: number;
};

type ContextSourceInput = {
  source: ContextSource;
  text: string;
};

const PROMPT_TOKEN_PATHS: ReadonlyArray<ReadonlyArray<string>> = [
  ['usage_metadata', 'input_tokens'],
  ['usage_metadata', 'prompt_tokens'],
  ['response_metadata', 'tokenUsage', 'promptTokens'],
  ['response_metadata', 'tokenUsage', 'prompt_tokens'],
  ['response_metadata', 'usage', 'prompt_tokens'],
  ['llmOutput', 'tokenUsage', 'promptTokens'],
  ['llmOutput', 'tokenUsage', 'prompt_tokens'],
  ['llmOutput', 'usage', 'prompt_tokens'],
  ['tokenUsage', 'promptTokens'],
  ['tokenUsage', 'prompt_tokens'],
];

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}

function getPathValue(source: unknown, path: ReadonlyArray<string>): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return Math.ceil(text.length / 4);
}

export function buildContextBreakdown(sources: ContextSourceInput[]): ContextBreakdown {
  const items = sources.map((entry) => {
    const chars = entry.text.length;
    return {
      source: entry.source,
      chars,
      estimatedTokens: estimateTokens(entry.text),
    };
  });

  return {
    items,
    totalEstimatedTokens: items.reduce((total, item) => total + item.estimatedTokens, 0),
  };
}

export function extractPromptTokensFromUsage(payload: unknown): number | null {
  for (const path of PROMPT_TOKEN_PATHS) {
    const value = getPathValue(payload, path);
    const parsed = toNonNegativeInteger(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function extractPromptTokensFromMessages(messages: unknown[]): number | null {
  let total = 0;
  let found = false;

  for (const message of messages) {
    const promptTokens = extractPromptTokensFromUsage(message);
    if (promptTokens !== null) {
      total += promptTokens;
      found = true;
    }
  }

  return found ? total : null;
}

export function createPromptTokensCollector() {
  let total = 0;
  let found = false;

  class PromptTokensCallbackHandler extends BaseCallbackHandler {
    name = 'prompt_tokens_collector';

    handleLLMEnd(output: unknown) {
      const promptTokens = extractPromptTokensFromUsage(output);
      if (promptTokens !== null) {
        total += promptTokens;
        found = true;
      }
    }
  }

  return {
    callback: new PromptTokensCallbackHandler(),
    getPromptTokens(): number | null {
      return found ? total : null;
    },
  };
}
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

