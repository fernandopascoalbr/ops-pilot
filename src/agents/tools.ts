import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { store, listAlerts, openIncident, resolveIncident } from './ops-store.js';

export const listAlertsTool = tool(
  async ({ status }) => JSON.stringify(listAlerts(status)),
  {
    name: 'list_alerts',
    description:
      'Lista os alertas de monitoramento. Use quando o plantonista perguntar o que está disparando, o estado dos serviços ou "como está o plantão". status: firing | resolved | all',
    schema: z.object({
      status: z.enum(['firing', 'resolved', 'all']).default('firing'),
    }),
  },
);

export const openIncidentTool = tool(
  async ({ title, service, severity }) => JSON.stringify(openIncident({ title, service, severity })),
  {
    name: 'open_incident',
    description: 'Abre um novo incidente operacional para um serviço e severidade determinados.',
    schema: z.object({
      title: z.string().min(1),
      service: z.string().min(1),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
    }),
  },
);

export const resolveIncidentTool = tool(
  async ({ id }) => JSON.stringify(resolveIncident(id)),
  {
    name: 'resolve_incident',
    description: 'Resolve um incidente existente usando o identificador do incidente.',
    schema: z.object({
      id: z.string().min(1),
    }),
  },
);

export const opsTools = [listAlertsTool, openIncidentTool, resolveIncidentTool];
export { store };
