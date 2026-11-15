import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMetadata } from '../../src/obs/logger.js';

test('sanitizeMetadata removes forbidden payload keys', () => {
  const sanitized = sanitizeMetadata({
    payload: { secret: 'value' },
    input: 'raw-input',
    output: 'raw-output',
    message: 'raw-message',
    answer: 'raw-answer',
    route: 'react',
    latencyMs: 10,
  });

  assert.equal('payload' in sanitized, false);
  assert.equal('input' in sanitized, false);
  assert.equal('output' in sanitized, false);
  assert.equal('message' in sanitized, false);
  assert.equal('answer' in sanitized, false);
  assert.equal(sanitized.route, 'react');
  assert.equal(sanitized.latencyMs, 10);
});
