import assert from 'node:assert/strict';
import test from 'node:test';

import { closeMcpTestClient, createMcpTestClient } from './mcp-test-client.js';
import { forgetPreferenceInputSchema, openIncidentInputSchema, resolveIncidentInputSchema } from '../../src/agents/tools.js';

test('mcp and shared zod schemas reject invalid incident input consistently', async () => {
  const invalidOpenInput = {
    title: 'invalid incident',
    service: 'checkout',
    severity: 'hight',
  };

  const schemaValidation = openIncidentInputSchema.safeParse(invalidOpenInput);
  assert.equal(schemaValidation.success, false);

  const { client, transport } = await createMcpTestClient();

  try {
    const result = await client.callTool({ name: 'open_incident', arguments: invalidOpenInput as any });
    assert.equal(result.isError, true);
  } finally {
    await closeMcpTestClient(client, transport);
  }
});

test('mcp and shared zod schemas reject resolve with empty id', async () => {
  const invalidResolveInput = { id: '' };
  const schemaValidation = resolveIncidentInputSchema.safeParse(invalidResolveInput);
  assert.equal(schemaValidation.success, false);

  const { client, transport } = await createMcpTestClient();

  try {
    const result = await client.callTool({ name: 'resolve_incident', arguments: invalidResolveInput as any });
    assert.equal(result.isError, true);
  } finally {
    await closeMcpTestClient(client, transport);
  }
});

test('mcp and shared zod schemas reject forget_preference with empty target', async () => {
  const invalidForgetInput = { userId: 'user-1', target: '' };
  const schemaValidation = forgetPreferenceInputSchema.safeParse(invalidForgetInput);
  assert.equal(schemaValidation.success, false);

  const { client, transport } = await createMcpTestClient();

  try {
    const result = await client.callTool({ name: 'forget_preference', arguments: invalidForgetInput as any });
    assert.equal(result.isError, true);
  } finally {
    await closeMcpTestClient(client, transport);
  }
});
