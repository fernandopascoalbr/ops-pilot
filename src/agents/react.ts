import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { listAlerts, store } from './ops-store.js';
import { invokeWithModelFallbacks, ModelUnavailableError } from './model.js';
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

    try {
      const execution = await invokeWithModelFallbacks(async (candidate) => {
        const promptTokensCollector = createPromptTokensCollector();
        const agent = createReactAgent({
          llm: candidate.model,
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

        return {
          messages: result?.messages ?? [],
          promptTokens: promptTokensCollector.getPromptTokens(),
        };
      });

      const trace = [
        ...execution.fallbackTransitions.map((transition) => createTraceEvent(
          'fallback',
          `Fallback acionado de ${transition.fromModel} para ${transition.toModel}.`,
          {
            node: 'model-factory',
            reason: transition.reason,
            args: {
              fromModel: transition.fromModel,
              toModel: transition.toModel,
              timestamp: transition.timestamp,
            },
          },
        )),
        ...createReactTrace(execution.value.messages),
      ];
      const answer = lastText(execution.value.messages);
      const promptTokens = execution.value.promptTokens ?? extractPromptTokensFromMessages(execution.value.messages);

      return {
        answer,
        trace,
        metrics: {
          llmCalls: countAiMessages(execution.value.messages),
          latencyMs: Date.now() - started,
          modelUsed: execution.modelUsed,
          interactionLimit: maxIterations,
          promptTokens,
        },
      };
    } catch (error) {
      if (error instanceof ModelUnavailableError) {
        throw error;
      }

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
