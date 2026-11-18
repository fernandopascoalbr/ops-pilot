import { createTraceEvent } from '../agents/trace.js';

export type HandoffEvent = {
  type: 'handoff';
  from: string;
  to: string;
  summary: string;
  context: string;
  timestamp: string;
};

export function createHandoffEvent(from: string, to: string, summary: string, context: string): HandoffEvent {
  return {
    type: 'handoff',
    from,
    to,
    summary,
    context,
    timestamp: new Date().toISOString(),
  };
}

export function createHandoffTrace(from: string, to: string, brief: string): ReturnType<typeof createTraceEvent>[] {
  return [createTraceEvent('handoff', `Handoff: ${from} -> ${to}.`, {
    node: 'team-supervisor',
    route: 'team',
    reason: brief,
    args: { from, to, brief },
  })];
}
