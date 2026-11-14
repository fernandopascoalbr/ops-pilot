export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  return {
    apiKey: apiKey || '',
    model: process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini',
    baseURL: 'https://openrouter.ai/api/v1',
    temperature: 0,
    isConfigured: Boolean(apiKey),
  };
}
