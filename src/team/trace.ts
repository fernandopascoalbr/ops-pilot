import { type TraceEvent } from '../domain/strategy.js';

export function renderReasoningTrace(trace: TraceEvent[]): string {
  return trace
    .map((event) => `[${event.type}] ${event.message}${event.reason ? ` :: ${event.reason}` : ''}`)
    .join('\n');
}

export function serializeTeamTrace(trace: Array<{ type: string; message: string; from?: string; to?: string; brief?: string; timestamp?: string }>): Record<string, unknown>[] {
  return trace.map((event) => ({
    type: event.type,
    from: event.from ?? 'supervisor',
    to: event.to ?? 'done',
    summary: event.message,
    context: event.brief ?? '',
    timestamp: event.timestamp ?? new Date().toISOString(),
  }));
}
