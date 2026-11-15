export type TraceEventType =
  | 'thought'
  | 'action'
  | 'observation'
  | 'plan'
  | 'critique'
  | 'answer'
  | 'summarize'
  | 'route'
  | 'fallback';

export type TraceEvent = {
  type: TraceEventType;
  message: string;
  node?: string;
  route?: string;
  reason?: string;
  tool?: string;
  args?: Record<string, unknown>;
  timestamp?: string;
};

export type StrategyMetrics = {
  llmCalls: number;
  latencyMs: number;
  modelUsed?: string;
  interactionLimit?: number;
  stepsUsed?: number;
  promptTokens?: number | null;
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
