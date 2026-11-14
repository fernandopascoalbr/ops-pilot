import type { TraceEvent, TraceEventType } from '../domain/strategy.js';

export function createTraceEvent(
  type: TraceEventType,
  message: string,
  options: { tool?: string; args?: Record<string, unknown> } = {},
): TraceEvent {
  return {
    type,
    message,
    tool: options.tool,
    args: options.args,
    timestamp: new Date().toISOString(),
  };
}

export function formatTrace(trace: TraceEvent[]): string {
  return trace
    .map((event) => {
      const toolSuffix = event.tool ? ` :: ${event.tool}` : '';
      const argsSuffix = event.args && Object.keys(event.args).length > 0 ? ` :: ${JSON.stringify(event.args)}` : '';
      return `[${event.type}] ${event.message}${toolSuffix}${argsSuffix}`;
    })
    .join('\n');
}

export function countAiMessages(messages: Array<{ type?: string; role?: string; content?: unknown }>): number {
  return messages.filter((msg) => msg.type === 'ai' || msg.role === 'assistant').length;
}

export function lastText(messages: Array<{ type?: string; role?: string; content?: unknown }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.content && typeof message.content === 'string') {
      return message.content;
    }
  }

  return 'No answer available.';
}

export function toTrace(messages: Array<{ type?: string; role?: string; content?: unknown }>): TraceEvent[] {
  return messages.map((message, index) => {
    const role = message.role ?? message.type ?? 'system';
    const normalized = typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? {});
    return createTraceEvent(index % 2 === 0 ? 'thought' : 'observation', `${role}: ${normalized}`);
  });
}

export function clampIterationLimit(maxIterations: number | undefined, defaultLimit = 8, hardLimit = 8): number {
  const source = Number.isFinite(maxIterations) ? Number(maxIterations) : defaultLimit;
  return Math.min(Math.max(1, source), hardLimit);
}

export function shouldStopByPolicy(options: {
  stepsUsed: number;
  maxIterations: number;
  stopOnResolved: boolean;
  stopOnCriticalRisk: boolean;
  resolved: boolean;
  criticalRisk: boolean;
}): { stop: boolean; reason: string } {
  const { stepsUsed, maxIterations, stopOnResolved, stopOnCriticalRisk, resolved, criticalRisk } = options;

  if (stepsUsed >= maxIterations) {
    return { stop: true, reason: 'Limite máximo de iterações atingido.' };
  }

  if (stopOnResolved && resolved) {
    return { stop: true, reason: 'Condição de resolução confirmada.' };
  }

  if (stopOnCriticalRisk && criticalRisk) {
    return { stop: true, reason: 'Risco crítico identificado durante reflexão.' };
  }

  return { stop: false, reason: '' };
}
