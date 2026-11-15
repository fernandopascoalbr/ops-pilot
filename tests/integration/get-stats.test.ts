import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../fixtures/http-client.js';
import { SqliteRequestTraceStore } from '../../src/store/sqlite-request-trace-store.js';

type StatsBucket = {
  route?: string;
  model?: string;
  total: number;
  errors: number;
  tokens: number;
  costUsd: number;
  latencyMs: { p50: number | null; p95: number | null };
};

test('GET /stats returns totals, percentiles and grouping by route/model', async () => {
  const requestTraceStore = new SqliteRequestTraceStore(':memory:');
  const now = Date.now();

  requestTraceStore.saveRequest({
    requestId: 'req-1',
    status: 'success',
    route: 'chat',
    routeReason: 'ok',
    llmCalls: 1,
    latencyMs: 100,
    promptTokens: 100,
    modelUsed: 'openai/gpt-4o-mini:free',
    createdAt: new Date(now - (2 * 60 * 60 * 1000)).toISOString(),
    finishedAt: new Date(now - (2 * 60 * 60 * 1000) + 100).toISOString(),
  });

  requestTraceStore.saveRequest({
    requestId: 'req-2',
    status: 'error',
    route: 'chat',
    routeReason: 'failed',
    llmCalls: 0,
    latencyMs: 300,
    promptTokens: null,
    modelUsed: 'openai/gpt-4o-mini:free',
    createdAt: new Date(now - (1 * 60 * 60 * 1000)).toISOString(),
    finishedAt: new Date(now - (1 * 60 * 60 * 1000) + 300).toISOString(),
  });

  requestTraceStore.saveRequest({
    requestId: 'req-3',
    status: 'success',
    route: 'validation',
    routeReason: 'bad request',
    llmCalls: 0,
    latencyMs: 50,
    promptTokens: 20,
    modelUsed: null,
    createdAt: new Date(now - (30 * 60 * 1000)).toISOString(),
    finishedAt: new Date(now - (30 * 60 * 1000) + 50).toISOString(),
  });

  requestTraceStore.saveRequest({
    requestId: 'req-old',
    status: 'success',
    route: 'chat',
    routeReason: 'old',
    llmCalls: 1,
    latencyMs: 900,
    promptTokens: 999,
    modelUsed: 'openai/gpt-4o-mini:free',
    createdAt: new Date(now - (30 * 60 * 60 * 1000)).toISOString(),
    finishedAt: new Date(now - (30 * 60 * 60 * 1000) + 900).toISOString(),
  });

  const response = await requestJson('/stats?since=24h', 'GET', undefined, { requestTraceStore });

  assert.equal(response.status, 200);
  assert.equal(response.body.since, '24h');
  assert.equal(response.body.total, 3);
  assert.equal(response.body.errors, 1);
  assert.equal(response.body.tokens, 120);
  assert.equal(response.body.costUsd, 0);
  assert.equal(response.body.latencyMs.p50, 100);
  assert.equal(response.body.latencyMs.p95, 300);

  const byRoute = response.body.byRoute as StatsBucket[];
  const chatRoute = byRoute.find((item) => item.route === 'chat');
  assert.ok(chatRoute);
  assert.equal(chatRoute.total, 2);
  assert.equal(chatRoute.errors, 1);
  assert.equal(chatRoute.tokens, 100);
  assert.equal(chatRoute.latencyMs.p50, 100);
  assert.equal(chatRoute.latencyMs.p95, 300);

  const byModel = response.body.byModel as StatsBucket[];
  const freeModel = byModel.find((item) => item.model === 'openai/gpt-4o-mini:free');
  assert.ok(freeModel);
  assert.equal(freeModel.total, 2);
  assert.equal(freeModel.errors, 1);
  assert.equal(freeModel.tokens, 100);
  assert.equal(freeModel.costUsd, 0);
});

test('GET /stats returns 400 when since is invalid', async () => {
  const response = await requestJson('/stats?since=yesterday', 'GET', undefined, {});

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(response.body.issues));
});
