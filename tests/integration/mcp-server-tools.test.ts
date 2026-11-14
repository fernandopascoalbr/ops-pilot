import assert from 'node:assert/strict';
import test from 'node:test';

import { closeMcpTestClient, createMcpTestClient } from './mcp-test-client.js';

type ToolTextContent = { type: 'text'; text: string };
type ToolResult = { isError?: boolean; content?: ToolTextContent[] };

test('mcp server lists required tools and handles open/resolve incident flow', async () => {
  const { client, transport } = await createMcpTestClient();

  try {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, ['forget_preference', 'list_alerts', 'open_incident', 'resolve_incident']);

    const openResult = await client.callTool({
      name: 'open_incident',
      arguments: {
        title: 'Checkout outage',
        service: 'checkout',
        severity: 'high',
        summary: 'Latency spike',
      },
    });

    const openToolResult = openResult as ToolResult;
    assert.notEqual(openToolResult.isError, true);
    const openText = openToolResult.content?.find((item) => item.type === 'text');
    assert.ok(openText);

    const incident = JSON.parse(openText.text) as { id: string; status: string };
    assert.ok(incident.id);
    assert.equal(incident.status, 'open');

    const resolveResult = await client.callTool({
      name: 'resolve_incident',
      arguments: { id: incident.id },
    });

    const resolveToolResult = resolveResult as ToolResult;
    assert.notEqual(resolveToolResult.isError, true);
    const resolveText = resolveToolResult.content?.find((item) => item.type === 'text');
    assert.ok(resolveText);
    const resolvedIncident = JSON.parse(resolveText.text) as { status: string };
    assert.equal(resolvedIncident.status, 'resolved');
  } finally {
    await closeMcpTestClient(client, transport);
  }
});
