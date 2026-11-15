export type RequestStatus = 'success' | 'error';

export type RequestRecord = {
  requestId: string;
  status: RequestStatus;
  route: string;
  routeReason: string;
  llmCalls: number;
  latencyMs: number;
  promptTokens: number | null;
  modelUsed: string | null;
  createdAt: string;
  finishedAt: string;
};

export type TraceEventRecord = {
  eventId: string;
  requestId: string;
  seq: number;
  node: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type RequestTraceView = {
  request: RequestRecord;
  trace: TraceEventRecord[];
};

export interface RequestTraceStore {
  saveRequest(record: RequestRecord): void;
  saveTraceEvents(events: TraceEventRecord[]): void;
  getRequestTrace(requestId: string): RequestTraceView | null;
}
