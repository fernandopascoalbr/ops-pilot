export type { TraceEvent, TraceEventType, StrategyMetrics, StrategyRunResult, ReasoningStrategy } from '../domain/strategy.js';

export type ReflectionDecision = 'continue' | 'adjust' | 'end';
export type FallbackMode = 'safe-close' | 'human-escalation';

export type StoppingPolicy = {
  maxIterations: number;
  stopOnCriticalRisk: boolean;
  stopOnResolved: boolean;
  fallbackMode: FallbackMode;
};
