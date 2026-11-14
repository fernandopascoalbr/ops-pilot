import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  listAlertsInputSchema,
  openIncidentInputSchema,
  resolveIncidentInputSchema,
} from '../agents/tools.js';
import { handleListAlerts, handleOpenIncident, handleResolveIncident } from './handlers.js';
import { logErrorToStderr, logToStderr } from './logger.js';

function createServer() {
  const server = new McpServer({
    name: 'opspilot',
    version: '1.0.0',
  });

  server.registerTool(
    'list_alerts',
    {
      description:
        'Lista alertas operacionais por estado para suportar triagem de incidentes.',
      inputSchema: listAlertsInputSchema.shape,
    },
    async ({ status }) => ({
      content: [{ type: 'text', text: JSON.stringify(handleListAlerts({ status })) }],
    }),
  );

  server.registerTool(
    'open_incident',
    {
      description:
        'Abre um novo incidente operacional para um serviço impactado.',
      inputSchema: openIncidentInputSchema.shape,
    },
    async ({ title, service, severity, summary }) => ({
      content: [{ type: 'text', text: JSON.stringify(handleOpenIncident({ title, service, severity, summary })) }],
    }),
  );

  server.registerTool(
    'resolve_incident',
    {
      description:
        'Resolve um incidente operacional existente quando o impacto foi mitigado.',
      inputSchema: resolveIncidentInputSchema.shape,
    },
    async ({ id }) => ({
      content: [{ type: 'text', text: JSON.stringify(handleResolveIncident({ id })) }],
    }),
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToStderr('opspilot MCP server pronto (stdio)');
}

main().catch((error: unknown) => {
  logErrorToStderr('falha ao iniciar MCP server', error);
  process.exit(1);
});
