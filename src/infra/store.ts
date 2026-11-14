import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { alertStatusSchema, incidentStatusSchema, severitySchema } from '../domain/alerts.js';

export type Service = {
  id: string;
  name: string;
  status: 'healthy' | 'degraded';
};

export type Alert = {
  id: string;
  title: string;
  service: string;
  severity: z.infer<typeof severitySchema>;
  status: z.infer<typeof alertStatusSchema>;
  createdAt: string;
  resolvedAt?: string | null;
};

export type Incident = {
  id: string;
  title: string;
  service: string;
  severity: z.infer<typeof severitySchema>;
  status: z.infer<typeof incidentStatusSchema>;
  openedAt: string;
  resolvedAt?: string | null;
};

export type StoreSnapshot = {
  services: Service[];
  alerts: Alert[];
  incidents: Incident[];
};

const filePath = fileURLToPath(new URL('../../data/seed.json', import.meta.url));
const defaultSeedData: StoreSnapshot = {
  services: [
    { id: 'svc-auth', name: 'auth-api', status: 'healthy' },
    { id: 'svc-payments', name: 'payments-api', status: 'degraded' },
    { id: 'svc-search', name: 'search-index', status: 'healthy' },
    { id: 'svc-billing', name: 'billing-worker', status: 'healthy' },
    { id: 'svc-notify', name: 'notification-gateway', status: 'degraded' },
  ],
  alerts: [
    { id: 'alert-1', title: 'Latency spike in auth-api', service: 'auth-api', severity: 'high', status: 'firing', createdAt: '2026-11-03T08:00:00.000Z' },
    { id: 'alert-2', title: 'Payment retries above threshold', service: 'payments-api', severity: 'critical', status: 'firing', createdAt: '2026-11-03T08:03:00.000Z' },
    { id: 'alert-3', title: 'Search queue backlog', service: 'search-index', severity: 'medium', status: 'firing', createdAt: '2026-11-03T08:07:00.000Z' },
    { id: 'alert-4', title: 'Billing sync completed', service: 'billing-worker', severity: 'low', status: 'resolved', createdAt: '2026-11-03T07:15:00.000Z', resolvedAt: '2026-11-03T07:35:00.000Z' },
    { id: 'alert-5', title: 'Notification gateway recovered', service: 'notification-gateway', severity: 'medium', status: 'resolved', createdAt: '2026-11-03T07:22:00.000Z', resolvedAt: '2026-11-03T07:40:00.000Z' },
    { id: 'alert-6', title: 'Auth batch job cleared', service: 'auth-api', severity: 'low', status: 'resolved', createdAt: '2026-11-03T06:50:00.000Z', resolvedAt: '2026-11-03T07:10:00.000Z' },
  ],
  incidents: [],
};

export const seedServices: Service[] = [...defaultSeedData.services];
export const seedAlerts: Alert[] = [...defaultSeedData.alerts];

function ensureSeedFile() {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultSeedData, null, 2), 'utf-8');
  }
}

function readSeedData(): StoreSnapshot {
  ensureSeedFile();
  const content = readFileSync(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(content) as StoreSnapshot;
    return {
      services: parsed.services ?? [...defaultSeedData.services],
      alerts: parsed.alerts ?? [...defaultSeedData.alerts],
      incidents: parsed.incidents ?? [],
    };
  } catch {
    return { ...defaultSeedData, incidents: [] };
  }
}

export function persistStore() {
  writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export const store: StoreSnapshot = readSeedData();

export function seedStore(): StoreSnapshot {
  const snapshot: StoreSnapshot = {
    services: [...defaultSeedData.services],
    alerts: [...defaultSeedData.alerts],
    incidents: [],
  };

  store.services = snapshot.services;
  store.alerts = snapshot.alerts;
  store.incidents = snapshot.incidents;
  persistStore();
  return { ...snapshot };
}

export function listAlerts(status: 'firing' | 'resolved' | 'all' = 'firing'): Alert[] {
  if (status === 'all') {
    return [...store.alerts];
  }
  return store.alerts.filter((alert) => alert.status === status);
}

export function openIncident(input: { title: string; service: string; severity: z.infer<typeof severitySchema> }): Incident {
  const incidentId = `inc-${Date.now()}`;
  const incident: Incident = {
    id: incidentId,
    title: input.title,
    service: input.service,
    severity: input.severity,
    status: 'open',
    openedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  store.incidents.push(incident);
  persistStore();
  return incident;
}

export function resolveIncident(id: string): Incident | null {
  const incident = store.incidents.find((item) => item.id === id);
  if (!incident) {
    return null;
  }

  incident.status = 'resolved';
  incident.resolvedAt = new Date().toISOString();

  const matchedAlert = store.alerts.find((alert) => alert.service === incident.service && alert.status === 'firing');
  if (matchedAlert) {
    matchedAlert.status = 'resolved';
    matchedAlert.resolvedAt = incident.resolvedAt;
  }

  persistStore();
  return incident;
}
