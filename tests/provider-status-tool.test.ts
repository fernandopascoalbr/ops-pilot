import assert from 'node:assert/strict';
import test from 'node:test';

import { checkProviderStatusTool, fetchProviderStatus, STATUS_URL } from '../src/agents/tools.js';

test('provider status tool resolves default github status in one compact line', async () => {
  const result = await checkProviderStatusTool.invoke({});

  assert.match(String(result), /^github está /);
  assert.doesNotMatch(String(result), /\n/);
});

test('fetchProviderStatus returns a compact status string for cloudflare', async () => {
  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    assert.equal(String(input), STATUS_URL.cloudflare);
    assert.ok(init?.signal);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: {
          indicator: 'minor',
          description: 'Cloudflare is experiencing a minor incident',
        },
      }),
    } as Response;
  };

  const result = await fetchProviderStatus('cloudflare', fakeFetch as typeof fetch);

  assert.equal(result, 'cloudflare está minor - Cloudflare is experiencing a minor incident');
});

test('fetchProviderStatus retries once and then returns a readable final error after network failure', async () => {
  let attempts = 0;
  const fakeFetch = async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error('fetch failed');
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: {
          indicator: 'operational',
          description: 'All systems operational',
        },
      }),
    } as Response;
  };

  const result = await fetchProviderStatus('github', fakeFetch as typeof fetch);

  assert.equal(attempts, 2);
  assert.equal(result, 'github está operational - All systems operational');
});

test('fetchProviderStatus returns a readable observation for invalid schema responses', async () => {
  const fakeFetch = async (): Promise<Response> => ({
    ok: true,
    status: 200,
    json: async () => ({ status: { indicator: 123 } }),
  }) as Response;

  const result = await fetchProviderStatus('github', fakeFetch as typeof fetch);

  assert.match(result, /Não consegui consultar o status de github/);
  assert.doesNotMatch(result, /throw|Exception/);
});

test('fetchProviderStatus respects the 5s abort timeout boundary for a final timeout', async () => {
  const fakeFetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal as AbortSignal | undefined;
    if (!signal) {
      throw new Error('missing signal');
    }

    signal.addEventListener('abort', () => {
      throw new Error('timeout');
    });

    throw new Error('timed out');
  };

  const result = await fetchProviderStatus('github', fakeFetch as typeof fetch);

  assert.match(result, /Não consegui consultar o status de github/);
  assert.match(result, /timed out|timeout/i);
});
