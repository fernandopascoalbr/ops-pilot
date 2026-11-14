import { ChatOpenAI } from '@langchain/openai';
import { getOpenRouterConfig } from '../config/env.js';

export function createModel() {
  const config = getOpenRouterConfig();

  if (!config.isConfigured) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Export it in the current shell before running the arena or strategy.',
    );
  }

  return new ChatOpenAI({
    model: config.model,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL,
    },
    temperature: config.temperature,
  });
}
