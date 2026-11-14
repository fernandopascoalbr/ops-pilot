export type TraceEventType = 'thought' | 'action' | 'observation' | 'plan' | 'critique' | 'answer';

export type TraceEvent = {
  type: TraceEventType;
  message: string;
  tool?: string;
  args?: Record<string, unknown>;
  timestamp?: string;
};

export type StrategyMetrics = {
  llmCalls: number;
  latencyMs: number;
  interactionLimit?: number;
  stepsUsed?: number;
};

export type StrategyRunResult = {
  answer: string;
  trace: TraceEvent[];
  metrics: StrategyMetrics;
};

export type ReasoningStrategy = {
  name: string;
  run: (input: string, maxIterations?: number) => Promise<StrategyRunResult>;
};
