import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import test from 'node:test';

import { SqliteOpsStore } from '../../src/store/sqlite-ops-store.js';
import { closeMcpTestClient, createMcpTestClient } from './mcp-test-client.js';

type ToolTextContent = { type: 'text'; text: string };
type ToolResult = { content?: ToolTextContent[] };

test('mcp operations persist in the same OpsStore backing database', async () => {
  const dbPath = `/tmp/opspilot-mcp-${randomUUID()}.db`;
  const { client, transport } = await createMcpTestClient({ dbPath });

  try {
    const openResult = await client.callTool({
      name: 'open_incident',
      arguments: {
        title: 'payments incident',
        service: 'payments',
        severity: 'critical',
      },
    });

    const openToolResult = openResult as ToolResult;
    const openText = openToolResult.content?.find((item) => item.type === 'text');
    assert.ok(openText);
    const incident = JSON.parse(openText.text) as { id: string };

    const store = new SqliteOpsStore(dbPath);
    const created = store.listIncidents('all').find((item) => item.id === incident.id);
    assert.ok(created);

    await client.callTool({
      name: 'resolve_incident',
      arguments: { id: incident.id },
    });

    const updated = store.listIncidents('all').find((item) => item.id === incident.id);
    assert.equal(updated?.status, 'resolved');
  } finally {
    await closeMcpTestClient(client, transport);
    rmSync(dbPath, { force: true });
  }
});
