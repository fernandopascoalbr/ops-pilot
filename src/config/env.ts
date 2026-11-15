function parseFallbackModels(raw: string | undefined, primaryModel: string): string[] {
  if (!raw) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of raw.split(',')) {
    const normalized = entry.trim();
    if (!normalized || normalized === primaryModel || unique.has(normalized)) {
      continue;
    }
    unique.add(normalized);
  }

  return Array.from(unique);
}

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
  return {
    apiKey: apiKey || '',
    model,
    fallbackModels: parseFallbackModels(process.env.OPENROUTER_MODEL_FALLBACK, model),
    baseURL: 'https://openrouter.ai/api/v1',
    temperature: 0,
    isConfigured: Boolean(apiKey),
  };
}
