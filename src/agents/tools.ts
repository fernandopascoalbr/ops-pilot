import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { store, listAlerts, listIncidents, openIncident, resolveIncident, consultarRunbook } from './ops-store.js';

const statusSchema = z.object({
  status: z.object({
    indicator: z.string(),
    description: z.string(),
  }),
});

export const STATUS_URL = {
  github: 'https://www.githubstatus.com/api/v2/status.json',
  cloudflare: 'https://www.cloudflarestatus.com/api/v2/status.json',
} as const;

export type ProviderStatusKey = keyof typeof STATUS_URL;

export async function fetchProviderStatus(
  provider: ProviderStatusKey,
  doFetch: typeof fetch = fetch,
): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await doFetch(STATUS_URL[provider], { signal: AbortSignal.timeout(5000) });

      if (response.status >= 500) {
        throw new Error(`upstream ${response.status}`);
      }

      if (!response.ok) {
        return `status page de ${provider} respondeu HTTP ${response.status}`;
      }

      const payload = await response.json();
      const { status } = statusSchema.parse(payload);
      return `${provider} está ${status.indicator} - ${status.description}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (attempt === 2) {
        return `Não consegui consultar o status de ${provider} (${message}). Responda com base nos alertas internos e avise o plantonista da limitação.`;
      }
    }
  }

  return 'unreachable';
}

export const listAlertsInputSchema = z.object({
  status: z.enum(['firing', 'resolved', 'all']).default('firing').describe('Estado do alerta a consultar: firing = ativos, resolved = resolvidos, all = todos.'),
});

export const openIncidentInputSchema = z.object({
  title: z.string().min(1).describe('Título curto e específico do incidente, sem ambiguidades.'),
  service: z.string().min(1).describe('Nome do serviço impactado, como checkout, payments ou auth.'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Severidade do incidente, seguindo a escala low, medium, high, critical.'),
  summary: z.string().min(1).optional().describe('Resumo opcional com a causa percebida ou contexto operacional do incidente.'),
});

export const resolveIncidentInputSchema = z.object({
  id: z.string().min(1).describe('Identificador do incidente que deve ser encerrado.'),
});

export const forgetPreferenceInputSchema = z.object({
  userId: z.string().min(1).describe('Identificador do usuário dono da preferência aprendida.'),
  target: z.string().min(1).describe('Trecho ou preferência alvo para remoção segura.'),
});

export const listAlertsTool = tool(
  async ({ status }) => JSON.stringify(listAlerts(status)),
  {
    name: 'list_alerts',
    description:
      'Lista alertas operacionais por estado para responder perguntas sobre o que está disparando ou já foi resolvido. Use esta ferramenta quando o operador perguntar "qual está ativo", "como está o plantão" ou "quais alertas já foram resolvidos".',
    schema: listAlertsInputSchema,
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
    schema: openIncidentInputSchema,
  },
);

export const resolveIncidentTool = tool(
  async ({ id }) => JSON.stringify(resolveIncident(id)),
  {
    name: 'resolve_incident',
    description:
      'Resolve um incidente existente quando a causa foi mitigada e o impacto foi controlado. Use esta ferramenta após a ação corretiva ou confirmação de restabelecimento do serviço.',
    schema: resolveIncidentInputSchema,
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

export const checkProviderStatusTool = tool(
  async ({ provider = 'github' }) => fetchProviderStatus(provider),
  {
    name: 'check_provider_status',
    description:
      'Consulta o status público de um provedor externo para distinguir falhas internas de indisponibilidade do provedor durante triagem operacional. Use esta ferramenta quando houver suspeita de problema externo ou quando for necessário confirmar se a dependência fora do ar está impactando o ambiente.',
    schema: z.object({
      provider: z.enum(['github', 'cloudflare']).default('github').describe('Provedor externo cujo status será consultado: github para GitHub e cloudflare para Cloudflare. Use esta ferramenta quando houver suspeita de problema externo, como indisponibilidade do provedor, para separar falhas internas da dependência fora do ar.'),
    }),
  },
);

export const opsTools = [listAlertsTool, listIncidentsTool, openIncidentTool, resolveIncidentTool, consultarRunbookTool, checkProviderStatusTool];
export { store };
