import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

import { startTestServer } from '../fixtures/http-client.js';

const execFileAsync = promisify(execFile);
const scriptPath = new URL('../../scripts/conversa-longa.sh', import.meta.url).pathname;

test('conversa-longa.sh prints promptTokens for each successful turn', async () => {
  const registry = {
    scripted: {
      name: 'scripted',
      async run(input: string) {
        return {
          answer: `ok: ${input}`,
          trace: [],
          metrics: {
            llmCalls: 0,
            latencyMs: 1,
            promptTokens: 17,
          },
        };
      },
    },
  };

  const server = await startTestServer({ registry, timeoutMs: 1000 });
  try {
    const { stdout } = await execFileAsync('bash', [scriptPath, 'm1', 'm2', 'm3'], {
      env: {
        ...process.env,
        CHAT_URL: `${server.baseUrl}/chat`,
        STRATEGY: 'scripted',
      },
    });

    assert.match(stdout, /Turno 1: promptTokens=17/);
    assert.match(stdout, /Turno 2: promptTokens=17/);
    assert.match(stdout, /Turno 3: promptTokens=17/);
  } finally {
    await server.close();
  }
});

test('conversa-longa.sh preserves prior turn output when a later turn fails', async () => {
  let calls = 0;
  const registry = {
    flaky: {
      name: 'flaky',
      async run(input: string) {
        calls += 1;
        if (calls === 2) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        return {
          answer: `ok: ${input}`,
          trace: [],
          metrics: {
            llmCalls: 0,
            latencyMs: 1,
            promptTokens: calls,
          },
        };
      },
    },
  };

  const server = await startTestServer({ registry, timeoutMs: 20 });
  try {
    await assert.rejects(
      execFileAsync('bash', [scriptPath, 'm1', 'm2', 'm3'], {
        env: {
          ...process.env,
          CHAT_URL: `${server.baseUrl}/chat`,
          STRATEGY: 'flaky',
        },
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        const failed = error as Error & { stdout?: string; stderr?: string };
        assert.match(failed.stdout ?? '', /Turno 1: promptTokens=1/);
        assert.match(failed.stderr ?? '', /Turno 2: erro HTTP 504/);
        return true;
      },
    );
  } finally {
    await server.close();
  }
});
