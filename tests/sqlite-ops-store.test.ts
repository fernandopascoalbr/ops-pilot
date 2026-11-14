import test from 'node:test';
import assert from 'node:assert/strict';

import { SqliteOpsStore } from '../src/store/sqlite-ops-store.js';

test('SqliteOpsStore seeds the Mercadinho scenario', () => {
  const store = new SqliteOpsStore(':memory:');

  assert.equal(store.services.length, 5);
  assert.equal(store.alerts.length, 6);
  assert.equal(store.runbooks.length, 3);
  assert.equal(store.alerts.filter((alert) => alert.status === 'firing').length, 3);
  assert.equal(store.alerts.filter((alert) => alert.status === 'resolved').length, 3);
  assert.ok(store.runbooks.some((runbook) => runbook.service === 'checkout'));
});

test('SqliteOpsStore opens and resolves incidents with filtering', () => {
  const store = new SqliteOpsStore(':memory:');

  const opened = store.openIncident({ title: 'Fila de checkout lenta', service: 'checkout', severity: 'high' });
  assert.equal(opened.status, 'open');
  assert.equal(store.listIncidents('open').length, 1);
  assert.equal(store.listIncidents('resolved').length, 0);

  const resolved = store.resolveIncident(opened.id);
  assert.ok(resolved);
  assert.equal(resolved?.status, 'resolved');
  assert.ok(resolved?.resolvedAt);
  assert.equal(store.listIncidents('resolved').length, 1);
  assert.equal(store.listIncidents('all').length, 1);
});

test('SqliteOpsStore rejects invalid domain checks', () => {
  const store = new SqliteOpsStore(':memory:');

  assert.throws(() => {
    store.db.prepare(
      'INSERT INTO alerts (id, title, service, severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('bad-alert', 'bad title', 'checkout', 'urgent', 'firing', new Date().toISOString());
  });

  assert.throws(() => {
    store.db.prepare(
      'INSERT INTO incidents (id, title, service, severity, status, opened_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('bad-incident', 'bad title', 'checkout', 'high', 'blocked', new Date().toISOString());
  });
});

