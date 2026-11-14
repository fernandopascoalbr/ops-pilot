import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { store, listAlerts, listIncidents, openIncident, resolveIncident, consultarRunbook } from './ops-store.js';

export const listAlertsTool = tool(
  async ({ status }) => JSON.stringify(listAlerts(status)),
  {
    name: 'list_alerts',
    description:
      'Lista alertas operacionais por estado para responder perguntas sobre o que está disparando ou já foi resolvido. Use esta ferramenta quando o operador perguntar "qual está ativo", "como está o plantão" ou "quais alertas já foram resolvidos".',
    schema: z.object({
      status: z.enum(['firing', 'resolved', 'all']).default('firing').describe('Estado do alerta a consultar: firing = ativos, resolved = resolvidos, all = todos.'),
    }),
  },
);

export const listIncidentsTool = tool(
  async ({ status }) => JSON.stringify(listIncidents(status)),
  {
    name: 'list_incidents',
    description:
      'Lista incidentes operacionais por status. Use esta ferramenta quando o operador precisar revisar o backlog de incidentes abertos, verificar resolução anterior ou resumir a situação atual.',
    schema: z.object({
      status: z.enum(['open', 'resolved', 'all']).default('open').describe('Filtro de incidentes: open = abertos, resolved = resolvidos, all = todos.'),
    }),
  },
);

export const openIncidentTool = tool(
  async ({ title, service, severity, summary }) => JSON.stringify(openIncident({ title, service, severity, summary })),
  {
    name: 'open_incident',
    description:
      'Abre um novo incidente operacional para um serviço quando há confirmação de impacto ou de uma condição que exige investigação e coordenação. Use esta ferramenta apenas depois de confirmar o problema, quando houver alerta ou falha evidente para um serviço específico.',
    schema: z.object({
      title: z.string().min(1).describe('Título curto e específico do incidente, sem ambiguidades.'),
      service: z.string().min(1).describe('Nome do serviço impactado, como checkout, payments ou auth.'),
      severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Severidade do incidente, seguindo a escala low, medium, high, critical.'),
      summary: z.string().min(1).optional().describe('Resumo opcional com a causa percebida ou contexto operacional do incidente.'),
    }),
  },
);

export const resolveIncidentTool = tool(
  async ({ id }) => JSON.stringify(resolveIncident(id)),
  {
    name: 'resolve_incident',
    description:
      'Resolve um incidente existente quando a causa foi mitigada e o impacto foi controlado. Use esta ferramenta após a ação corretiva ou confirmação de restabelecimento do serviço.',
    schema: z.object({
      id: z.string().min(1).describe('Identificador do incidente que deve ser encerrado.'),
    }),
  },
);

export const consultarRunbookTool = tool(
  async ({ service }) => JSON.stringify(consultarRunbook(service)),
  {
    name: 'consultar_runbook',
    description:
      'Consulta o runbook operacional do serviço para obter passos de mitigação, investigação e recuperação. Use esta ferramenta antes de agir em um incidente de serviço específico ou para entender a sequência correta de resposta.',
    schema: z.object({
      service: z.string().min(1).describe('Nome do serviço cujo runbook deve ser consultado, por exemplo checkout, payments ou auth.'),
    }),
  },
);

export const opsTools = [listAlertsTool, listIncidentsTool, openIncidentTool, resolveIncidentTool, consultarRunbookTool];
export { store };
