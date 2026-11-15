import { DatabaseSync } from 'node:sqlite';
import { resolveOpsDbPath } from './sqlite-ops-store.js';
import type {
  RequestRecord,
  RequestStatsByModel,
  RequestStatsByRoute,
  RequestStatsSummary,
  RequestStatsView,
  RequestTraceStore,
  RequestTraceView,
  TraceEventRecord,
} from './request-trace-store.js';

function toRequestRecord(row: any): RequestRecord {
  return {
    requestId: row.request_id,
    status: row.status,
    route: row.route,
    routeReason: row.route_reason,
    llmCalls: row.llm_calls,
    latencyMs: row.latency_ms,
    promptTokens: row.prompt_tokens,
    modelUsed: row.model_used,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function toTraceEventRecord(row: any): TraceEventRecord {
  return {
    eventId: row.event_id,
    requestId: row.request_id,
    seq: row.seq,
    node: row.node,
    type: row.type,
    payload: row.payload ? JSON.parse(row.payload) : {},
    occurredAt: row.occurred_at,
  };
}

type StatsSourceRow = {
  status: string;
  route: string;
  prompt_tokens: number | null;
  model_used: string | null;
  latency_ms: number;
};

type StatsAccumulator = {
  total: number;
  errors: number;
  tokens: number;
  costUsd: number;
  latencies: number[];
};

function createAccumulator(): StatsAccumulator {
  return {
    total: 0,
    errors: 0,
    tokens: 0,
    costUsd: 0,
    latencies: [],
  };
}

function percentile(values: number[], target: 0.5 | 0.95): number | null {
  if (values.length === 0) {
    return null;
  }

  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.ceil(target * ordered.length) - 1;
  const normalizedIndex = Math.max(0, Math.min(index, ordered.length - 1));
  return ordered[normalizedIndex];
}

function toSummary(acc: StatsAccumulator): RequestStatsSummary {
  return {
    total: acc.total,
    errors: acc.errors,
    tokens: acc.tokens,
    costUsd: Number(acc.costUsd.toFixed(6)),
    latencyMs: {
      p50: percentile(acc.latencies, 0.5),
      p95: percentile(acc.latencies, 0.95),
    },
  };
}

function computeRequestCostUsd(model: string | null): number {
  if (!model) {
    return 0;
  }

  if (model.endsWith(':free')) {
    return 0;
  }

  return 0;
}

function pushRow(acc: StatsAccumulator, row: StatsSourceRow): void {
  acc.total += 1;
  if (row.status === 'error') {
    acc.errors += 1;
  }
  acc.tokens += row.prompt_tokens ?? 0;
  acc.costUsd += computeRequestCostUsd(row.model_used);
  acc.latencies.push(row.latency_ms);
}

export class SqliteRequestTraceStore implements RequestTraceStore {
  readonly db: DatabaseSync;

  constructor(path?: string) {
    this.db = new DatabaseSync(resolveOpsDbPath(path));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        request_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('success', 'error')),
        route TEXT NOT NULL,
        route_reason TEXT NOT NULL,
        llm_calls INTEGER NOT NULL CHECK (llm_calls >= 0),
        latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
        prompt_tokens INTEGER,
        model_used TEXT,
        created_at TEXT NOT NULL,
        finished_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trace_events (
        event_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        seq INTEGER NOT NULL CHECK (seq >= 1),
        node TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_trace_events_request_id_time
      ON trace_events (request_id, occurred_at, seq);
    `);
  }

  saveRequest(record: RequestRecord): void {
    this.db.prepare(`
      INSERT INTO requests (
        request_id, status, route, route_reason, llm_calls, latency_ms,
        prompt_tokens, model_used, created_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(request_id) DO UPDATE SET
        status = excluded.status,
        route = excluded.route,
        route_reason = excluded.route_reason,
        llm_calls = excluded.llm_calls,
        latency_ms = excluded.latency_ms,
        prompt_tokens = excluded.prompt_tokens,
        model_used = excluded.model_used,
        created_at = excluded.created_at,
        finished_at = excluded.finished_at
    `).run(
      record.requestId,
      record.status,
      record.route,
      record.routeReason,
      record.llmCalls,
      record.latencyMs,
      record.promptTokens,
      record.modelUsed,
      record.createdAt,
      record.finishedAt,
    );
  }

  saveTraceEvents(events: TraceEventRecord[]): void {
    if (events.length === 0) {
      return;
    }

    const statement = this.db.prepare(`
      INSERT INTO trace_events (event_id, request_id, seq, node, type, payload, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        request_id = excluded.request_id,
        seq = excluded.seq,
        node = excluded.node,
        type = excluded.type,
        payload = excluded.payload,
        occurred_at = excluded.occurred_at
    `);

    for (const event of events) {
      statement.run(
        event.eventId,
        event.requestId,
        event.seq,
        event.node,
        event.type,
        JSON.stringify(event.payload ?? {}),
        event.occurredAt,
      );
    }
  }

  getRequestTrace(requestId: string): RequestTraceView | null {
    const requestRow = this.db.prepare(`
      SELECT request_id, status, route, route_reason, llm_calls, latency_ms, prompt_tokens, model_used, created_at, finished_at
      FROM requests
      WHERE request_id = ?
    `).get(requestId);

    if (!requestRow) {
      return null;
    }

    const traceRows = this.db.prepare(`
      SELECT event_id, request_id, seq, node, type, payload, occurred_at
      FROM trace_events
      WHERE request_id = ?
      ORDER BY occurred_at ASC, seq ASC
    `).all(requestId);

    return {
      request: toRequestRecord(requestRow),
      trace: traceRows.map(toTraceEventRecord),
    };
  }

  getRequestStats(from: string, to: string): RequestStatsView {
    const rows = this.db.prepare(`
      SELECT status, route, prompt_tokens, model_used, latency_ms
      FROM requests
      WHERE created_at >= ? AND created_at <= ?
    `).all(from, to) as StatsSourceRow[];

    const total = createAccumulator();
    const byRoute = new Map<string, StatsAccumulator>();
    const byModel = new Map<string, StatsAccumulator>();

    for (const row of rows) {
      pushRow(total, row);

      const routeBucket = byRoute.get(row.route) ?? createAccumulator();
      pushRow(routeBucket, row);
      byRoute.set(row.route, routeBucket);

      const modelKey = row.model_used && row.model_used.length > 0 ? row.model_used : 'unknown';
      const modelBucket = byModel.get(modelKey) ?? createAccumulator();
      pushRow(modelBucket, row);
      byModel.set(modelKey, modelBucket);
    }

    const routeStats: RequestStatsByRoute[] = Array.from(byRoute.entries())
      .map(([route, acc]) => ({
        route,
        ...toSummary(acc),
      }))
      .sort((left, right) => right.total - left.total || left.route.localeCompare(right.route));

    const modelStats: RequestStatsByModel[] = Array.from(byModel.entries())
      .map(([model, acc]) => ({
        model,
        ...toSummary(acc),
      }))
      .sort((left, right) => right.total - left.total || left.model.localeCompare(right.model));

    return {
      from,
      to,
      ...toSummary(total),
      byRoute: routeStats,
      byModel: modelStats,
    };
  }
}
