import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../fixtures/http-client.js';

test('GET /requests/:id returns 404 for missing request id', async () => {
  const response = await requestJson('/requests/req-does-not-exist', 'GET', undefined, {});

  assert.equal(response.status, 404);
  assert.equal(typeof response.body.error, 'string');
});
