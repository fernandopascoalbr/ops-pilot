import { DatabaseSync } from 'node:sqlite';
import { resolveOpsDbPath } from './sqlite-ops-store.js';
import type { RequestRecord, RequestTraceStore, RequestTraceView, TraceEventRecord } from './request-trace-store.js';

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
}
