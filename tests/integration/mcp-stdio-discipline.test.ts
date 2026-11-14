import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { closeMcpTestClient, createMcpTestClient } from './mcp-test-client.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('mcp server keeps diagnostics out of protocol stdout path', async () => {
  const source = readFileSync(resolve(repoRoot, 'src/mcp/server.ts'), 'utf8');
  assert.doesNotMatch(source, /console\.log\(/);

  const { client, transport } = await createMcpTestClient();

  try {
    const stderrStream = transport.stderr;
    assert.ok(stderrStream);

    let stderr = '';
    stderrStream.on('data', (chunk: Buffer | string) => {
      stderr += String(chunk);
    });

    await client.listTools();
    await new Promise((resolveReady) => setTimeout(resolveReady, 100));
    assert.match(stderr, /opspilot MCP server pronto \(stdio\)/);
  } finally {
    await closeMcpTestClient(client, transport);
  }
});
