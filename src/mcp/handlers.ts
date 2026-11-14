import type { z } from 'zod';
import {
  forgetPreferenceInputSchema,
  listAlertsInputSchema,
  openIncidentInputSchema,
  resolveIncidentInputSchema,
} from '../agents/tools.js';
import { listAlerts, openIncident, resolveIncident } from '../agents/ops-store.js';
import { MemoryStore } from '../memory/index.js';

type ListAlertsInput = z.infer<typeof listAlertsInputSchema>;
type OpenIncidentInput = z.infer<typeof openIncidentInputSchema>;
type ResolveIncidentInput = z.infer<typeof resolveIncidentInputSchema>;
type ForgetPreferenceInput = z.infer<typeof forgetPreferenceInputSchema>;

const memoryStore = new MemoryStore();

export function handleListAlerts(input: ListAlertsInput) {
  const parsed = listAlertsInputSchema.parse(input);
  return listAlerts(parsed.status);
}

export function handleOpenIncident(input: OpenIncidentInput) {
  const parsed = openIncidentInputSchema.parse(input);
  return openIncident(parsed);
}

export function handleResolveIncident(input: ResolveIncidentInput) {
  const parsed = resolveIncidentInputSchema.parse(input);
  const incident = resolveIncident(parsed.id);

  if (!incident) {
    throw new Error(`Incidente não encontrado para id=${parsed.id}`);
  }

  return incident;
}

export function handleForgetPreference(input: ForgetPreferenceInput, customStore: MemoryStore = memoryStore) {
  const parsed = forgetPreferenceInputSchema.parse(input);
  const removed = customStore.forgetPreference(parsed.userId, parsed.target);
  return {
    removed,
    userId: parsed.userId,
    target: parsed.target,
  };
}
