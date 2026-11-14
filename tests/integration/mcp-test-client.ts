import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function createMcpTestClient(options: { dbPath?: string } = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'src/mcp/server.ts'],
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      OPSPILOT_DB: options.dbPath ?? ':memory:',
    },
    stderr: 'pipe',
  });

  const client = new Client({
    name: 'incidentarena-test-client',
    version: '1.0.0',
  });

  await client.connect(transport);

  return { client, transport };
}

export async function closeMcpTestClient(client: Client, transport: StdioClientTransport) {
  await client.close();
  await transport.close();
}
