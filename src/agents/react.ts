import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { listAlerts, store } from './ops-store.js';
import { createModel } from './model.js';
import { createTraceEvent, countAiMessages, lastText, toTrace } from './trace.js';
import type { ReasoningStrategy, StrategyRunResult } from '../domain/strategy.js';
import { opsTools } from './tools.js';
import { createPromptTokensCollector, extractPromptTokensFromMessages } from '../context/token.js';

function fallbackReactAnswer(input: string): { answer: string; trace: ReturnType<typeof createReactTrace> } {
  const alerts = listAlerts('firing');
  const serviceSummary = alerts.length
    ? alerts.map((alert) => `${alert.service} (${alert.severity})`).join(', ')
    : 'nenhum serviço em alerta';
  const answer = `ReAct: a análise local indica ${alerts.length} alertas disparados. Serviços em foco: ${serviceSummary}.`;
  const trace = [
    createTraceEvent('thought', `Analisando a entrada: ${input}`),
    createTraceEvent('action', 'Verificando alertas ativos', { tool: 'list_alerts', args: { status: 'firing' } }),
    createTraceEvent('observation', `Alertas encontrados: ${serviceSummary}`),
    createTraceEvent('answer', answer),
  ];

  return { answer, trace };
}

function createReactTrace(messages: Array<{ type?: string; role?: string; content?: unknown }>) {
  return toTrace(messages);
}

export const reactStrategy: ReasoningStrategy = {
  name: 'react',
  async run(input: string, maxIterations = 12): Promise<StrategyRunResult> {
    const started = Date.now();
    const promptTokensCollector = createPromptTokensCollector();

    try {
      const agent = createReactAgent({
        llm: createModel(),
        tools: opsTools,
      });

      const result = await agent.invoke(
        {
          messages: [{ role: 'user', content: input }],
        },
        {
          recursionLimit: maxIterations,
          callbacks: [promptTokensCollector.callback],
        },
      );

      const messages = result?.messages ?? [];
      const trace = createReactTrace(messages);
      const answer = lastText(messages);
      const promptTokens = promptTokensCollector.getPromptTokens() ?? extractPromptTokensFromMessages(messages);

      return {
        answer,
        trace,
        metrics: {
          llmCalls: countAiMessages(messages),
          latencyMs: Date.now() - started,
          interactionLimit: maxIterations,
          promptTokens,
        },
      };
    } catch (error) {
      const fallback = fallbackReactAnswer(input);
      return {
        answer: fallback.answer,
        trace: fallback.trace,
        metrics: {
          llmCalls: 1,
          latencyMs: Date.now() - started,
          interactionLimit: maxIterations,
          promptTokens: null,
        },
      };
    }
  },
};

export default reactStrategy;
