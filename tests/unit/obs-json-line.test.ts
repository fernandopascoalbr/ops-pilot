import test from 'node:test';
import assert from 'node:assert/strict';
import { formatObsJsonLine } from '../../src/obs/logger.js';

test('formatObsJsonLine produces one valid JSON line per event', () => {
  const line = formatObsJsonLine({
    requestId: 'req-1',
    node: 'answer',
    eventType: 'done',
    route: 'react',
    metadata: { seq: 1, llmCalls: 2 },
  });

  assert.equal(line.includes('\n'), false);
  const parsed = JSON.parse(line);
  assert.equal(parsed.requestId, 'req-1');
  assert.equal(parsed.node, 'answer');
  assert.equal(parsed.eventType, 'done');
  assert.equal(parsed.route, 'react');
  assert.equal(parsed.metadata.seq, 1);
});
