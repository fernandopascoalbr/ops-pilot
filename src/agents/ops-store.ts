import { SqliteOpsStore } from '../store/sqlite-ops-store.js';

const defaultStore = new SqliteOpsStore();

export const store = defaultStore;

export function seedStore() {
  return defaultStore.seed();
}

export function listAlerts(status: 'firing' | 'resolved' | 'all' = 'firing') {
  return defaultStore.listAlerts(status);
}

export function listIncidents(filter: 'open' | 'resolved' | 'all' = 'open') {
  return defaultStore.listIncidents(filter);
}

export function openIncident(input: { title: string; service: string; severity: 'low' | 'medium' | 'high' | 'critical'; summary?: string | null }) {
  return defaultStore.openIncident(input);
}

export function resolveIncident(id: string) {
  return defaultStore.resolveIncident(id);
}

export function consultarRunbook(service: string) {
  return defaultStore.consultarRunbook(service);
}
