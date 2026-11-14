import test from 'node:test';
import assert from 'node:assert/strict';

import { seedStore, store } from '../src/infra/store.js';

test('store seeds 5 services and 6 alerts', () => {
  const snapshot = seedStore();
  assert.equal(snapshot.services.length, 5);
  assert.equal(snapshot.alerts.length, 6);
  assert.equal(snapshot.alerts.filter((alert) => alert.status === 'firing').length, 3);
  assert.equal(snapshot.alerts.filter((alert) => alert.status === 'resolved').length, 3);
});

test('open incident and resolve incident update the store', () => {
  seedStore();
  const incident = store.incidents.find((item) => item.id === 'inc-test');
  assert.equal(incident, undefined);

  const opened = store.incidents.push({
    id: 'inc-test',
    title: 'Payments API latency spike',
    service: 'payments-api',
    severity: 'critical',
    status: 'open',
    openedAt: new Date().toISOString(),
    resolvedAt: null,
  });

  assert.equal(opened, 1);
  const found = store.incidents.find((item) => item.id === 'inc-test');
  assert.ok(found);

  const alert = store.alerts.find((item) => item.service === 'payments-api' && item.status === 'firing');
  assert.ok(alert);
  assert.equal(found?.status, 'open');
  store.incidents[0].status = 'resolved';
  store.incidents[0].resolvedAt = new Date().toISOString();
  assert.equal(store.incidents[0].status, 'resolved');
});
