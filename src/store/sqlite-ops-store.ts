import { DatabaseSync } from 'node:sqlite';

import type {
  Alert,
  Incident,
  IncidentFilter,
  OpsStore,
  Runbook,
  Service,
  ServiceTier,
  Severity,
} from './ops-store.js';

const DEFAULT_DB_PATH = './data/incidentarena.db';
const MERCADINHO_SERVICES: Service[] = [
  { id: 'svc-checkout', name: 'checkout', status: 'healthy', tier: 'core' },
  { id: 'svc-payments', name: 'payments', status: 'degraded', tier: 'core' },
  { id: 'svc-auth', name: 'auth', status: 'healthy', tier: 'core' },
  { id: 'svc-inventory', name: 'inventory', status: 'healthy', tier: 'standard' },
  { id: 'svc-notify', name: 'notify', status: 'healthy', tier: 'standard' },
];

const MERCADINHO_ALERTS: Alert[] = [
  { id: 'alert-1', title: 'Checkout queue latency spike', service: 'checkout', severity: 'high', status: 'firing', createdAt: '2026-11-03T08:00:00.000Z' },
  { id: 'alert-2', title: 'Payment retries above threshold', service: 'payments', severity: 'critical', status: 'firing', createdAt: '2026-11-03T08:03:00.000Z' },
  { id: 'alert-3', title: 'Auth error volume elevated', service: 'auth', severity: 'medium', status: 'firing', createdAt: '2026-11-03T08:07:00.000Z' },
  { id: 'alert-4', title: 'Inventory sync completed', service: 'inventory', severity: 'low', status: 'resolved', createdAt: '2026-11-03T07:15:00.000Z', resolvedAt: '2026-11-03T07:35:00.000Z' },
  { id: 'alert-5', title: 'Notification gateway recovered', service: 'notify', severity: 'medium', status: 'resolved', createdAt: '2026-11-03T07:22:00.000Z', resolvedAt: '2026-11-03T07:40:00.000Z' },
  { id: 'alert-6', title: 'Auth batch job cleared', service: 'auth', severity: 'low', status: 'resolved', createdAt: '2026-11-03T06:50:00.000Z', resolvedAt: '2026-11-03T07:10:00.000Z' },
];

const MERCADINHO_RUNBOOKS: Runbook[] = [
  { id: 'rb-checkout', service: 'checkout', title: 'Checkout recovery', summary: 'Rever fila e liberar retries', steps: ['Verificar fila de checkout', 'Revalidar limite de pagamento', 'Confirmar retry queue'], tier: 'core' },
  { id: 'rb-payments', service: 'payments', title: 'Payments runbook', summary: 'Mitigar processamento de pagamentos', steps: ['Avaliar retries', 'Confirmar status do gateway', 'Escalar equipe de plataforma'], tier: 'core' },
  { id: 'rb-auth', service: 'auth', title: 'Auth rollback', summary: 'Restabelecer autenticação', steps: ['Verificar latência do provider', 'Reverter deploy problemático', 'Confirmar tokens válidos'], tier: 'core' },
];

function resolveDbPath(path?: string): string {
  if (path && path.length > 0) {
    return path;
  }

  if (process.env.OPSPILOT_DB) {
    return process.env.OPSPILOT_DB;
  }

  const argv = [...(process.execArgv ?? []), ...(process.argv ?? [])];
  const isProduction = process.env.NODE_ENV === 'production';
  const isTestRuntime = process.env.NODE_ENV === 'test' || argv.some((arg) => arg.includes('--test') || arg.includes('node:test')) || !process.env.NODE_ENV;

  if (isProduction) {
    return DEFAULT_DB_PATH;
  }

  if (isTestRuntime) {
    return ':memory:';
  }

  return DEFAULT_DB_PATH;
}

function toService(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    tier: row.tier,
  };
}

function toAlert(row: any): Alert {
  return {
    id: row.id,
    title: row.title,
    service: row.service,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

function toIncident(row: any): Incident {
  return {
    id: row.id,
    title: row.title,
    service: row.service,
    severity: row.severity,
    status: row.status,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at ?? null,
    summary: row.summary ?? null,
  };
}

function toRunbook(row: any): Runbook {
  return {
    id: row.id,
    service: row.service,
    title: row.title,
    summary: row.summary,
    steps: Array.isArray(row.steps) ? row.steps : JSON.parse(row.steps),
    tier: row.tier,
  };
}

export class SqliteOpsStore implements OpsStore {
  readonly db: DatabaseSync;

  get _db(): DatabaseSync {
    return this.db;
  }

  constructor(path?: string) {
    this.db = new DatabaseSync(resolveDbPath(path));
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded')),
        tier TEXT NOT NULL CHECK (tier IN ('core', 'standard', 'edge'))
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        status TEXT NOT NULL CHECK (status IN ('firing', 'resolved')),
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
        opened_at TEXT NOT NULL,
        resolved_at TEXT,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS runbooks (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        steps TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('core', 'standard', 'edge'))
      );
    `);

    this.seed();
  }

  get services(): Service[] {
    const rows = this.db.prepare('SELECT id, name, status, tier FROM services ORDER BY name ASC').all();
    return rows.map(toService);
  }

  get alerts(): Alert[] {
    const rows = this.db.prepare('SELECT id, title, service, severity, status, created_at, resolved_at FROM alerts ORDER BY created_at DESC').all();
    return rows.map(toAlert);
  }

  get incidents(): Incident[] {
    const rows = this.db.prepare('SELECT id, title, service, severity, status, opened_at, resolved_at, summary FROM incidents ORDER BY opened_at DESC').all();
    return rows.map(toIncident);
  }

  get runbooks(): Runbook[] {
    const rows = this.db.prepare('SELECT id, service, title, summary, steps, tier FROM runbooks ORDER BY service ASC').all();
    return rows.map(toRunbook);
  }

  seed() {
    const serviceInsert = this.db.prepare(
      'INSERT OR IGNORE INTO services (id, name, status, tier) VALUES (?, ?, ?, ?)',
    );
    for (const service of MERCADINHO_SERVICES) {
      serviceInsert.run(service.id, service.name, service.status, service.tier);
    }

    const alertInsert = this.db.prepare(
      'INSERT OR IGNORE INTO alerts (id, title, service, severity, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    for (const alert of MERCADINHO_ALERTS) {
      alertInsert.run(alert.id, alert.title, alert.service, alert.severity, alert.status, alert.createdAt, alert.resolvedAt ?? null);
    }

    const runbookInsert = this.db.prepare(
      'INSERT OR IGNORE INTO runbooks (id, service, title, summary, steps, tier) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const runbook of MERCADINHO_RUNBOOKS) {
      runbookInsert.run(runbook.id, runbook.service, runbook.title, runbook.summary, JSON.stringify(runbook.steps), runbook.tier);
    }

    return {
      services: this.services,
      alerts: this.alerts,
      incidents: this.incidents,
      runbooks: this.runbooks,
    };
  }

  listAlerts(status: 'firing' | 'resolved' | 'all' = 'firing'): Alert[] {
    const sql = status === 'all'
      ? 'SELECT id, title, service, severity, status, created_at, resolved_at FROM alerts ORDER BY created_at DESC'
      : 'SELECT id, title, service, severity, status, created_at, resolved_at FROM alerts WHERE status = ? ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    const rows = status === 'all' ? stmt.all() : stmt.all(status);
    return rows.map(toAlert);
  }

  listIncidents(filter: IncidentFilter = 'open'): Incident[] {
    const sql = filter === 'all'
      ? 'SELECT id, title, service, severity, status, opened_at, resolved_at, summary FROM incidents ORDER BY opened_at DESC'
      : 'SELECT id, title, service, severity, status, opened_at, resolved_at, summary FROM incidents WHERE status = ? ORDER BY opened_at DESC';
    const stmt = this.db.prepare(sql);
    const rows = filter === 'all' ? stmt.all() : stmt.all(filter);
    return rows.map(toIncident);
  }

  openIncident(input: { title: string; service: string; severity: Severity; summary?: string | null }): Incident {
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const openedAt = new Date().toISOString();
    const stmt = this.db.prepare(
      'INSERT INTO incidents (id, title, service, severity, status, opened_at, resolved_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    stmt.run(id, input.title, input.service, input.severity, 'open', openedAt, null, input.summary ?? null);

    return {
      id,
      title: input.title,
      service: input.service,
      severity: input.severity,
      status: 'open',
      openedAt,
      resolvedAt: null,
      summary: input.summary ?? null,
    };
  }

  resolveIncident(id: string): Incident | null {
    const incidentRow = this.db.prepare(
      'SELECT id, title, service, severity, status, opened_at, resolved_at, summary FROM incidents WHERE id = ?',
    ).get(id);

    if (!incidentRow) {
      return null;
    }

    const resolvedAt = new Date().toISOString();
    this.db.prepare('UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?').run('resolved', resolvedAt, id);

    const alertRow = this.db.prepare(
      'SELECT id, title, service, severity, status, created_at, resolved_at FROM alerts WHERE service = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
    ).get(incidentRow.service, 'firing');

    if (alertRow) {
      this.db.prepare('UPDATE alerts SET status = ?, resolved_at = ? WHERE id = ?').run('resolved', resolvedAt, alertRow.id);
    }

    return {
      ...toIncident(incidentRow),
      status: 'resolved',
      resolvedAt,
    };
  }

  consultarRunbook(service: string): Runbook | null {
    const row = this.db.prepare('SELECT id, service, title, summary, steps, tier FROM runbooks WHERE service = ?').get(service);
    return row ? toRunbook(row) : null;
  }
}

export const resolveOpsDbPath = resolveDbPath;
export const mercadinhoServices = MERCADINHO_SERVICES;
export const mercadinhoAlerts = MERCADINHO_ALERTS;
export const mercadinhoRunbooks = MERCADINHO_RUNBOOKS;
export type { ServiceTier };
