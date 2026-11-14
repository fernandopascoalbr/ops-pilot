import assert from 'node:assert/strict';
import test from 'node:test';

import { closeMcpTestClient, createMcpTestClient } from './mcp-test-client.js';

test('mcp server exposes tool input schemas matching contract constraints', async () => {
  const { client, transport } = await createMcpTestClient();

  try {
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    const listAlertsSchema = byName.get('list_alerts')?.inputSchema as any;
    assert.deepEqual(listAlertsSchema?.properties?.status?.enum, ['firing', 'resolved', 'all']);
    assert.equal(listAlertsSchema?.properties?.status?.default, 'firing');

    const openIncidentSchema = byName.get('open_incident')?.inputSchema as any;
    assert.deepEqual(openIncidentSchema?.required, ['title', 'service', 'severity']);
    assert.equal(openIncidentSchema?.properties?.title?.minLength, 1);
    assert.equal(openIncidentSchema?.properties?.service?.minLength, 1);
    assert.deepEqual(openIncidentSchema?.properties?.severity?.enum, ['low', 'medium', 'high', 'critical']);
    assert.equal(openIncidentSchema?.properties?.summary?.minLength, 1);

    const resolveIncidentSchema = byName.get('resolve_incident')?.inputSchema as any;
    assert.deepEqual(resolveIncidentSchema?.required, ['id']);
    assert.equal(resolveIncidentSchema?.properties?.id?.minLength, 1);

    const forgetPreferenceSchema = byName.get('forget_preference')?.inputSchema as any;
    assert.deepEqual(forgetPreferenceSchema?.required, ['userId', 'target']);
    assert.equal(forgetPreferenceSchema?.properties?.userId?.minLength, 1);
    assert.equal(forgetPreferenceSchema?.properties?.target?.minLength, 1);
  } finally {
    await closeMcpTestClient(client, transport);
  }
});
