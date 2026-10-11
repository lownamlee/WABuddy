import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periods, periodSummary } from '../src/dashboard-data.ts';

test('sample chart totals and dashboard summaries agree for every date range', () => {
  for (const [period, data] of Object.entries(periods)) {
    const summary = periodSummary(period);
    assert.equal(data.values.reduce((a, b) => a + b, 0), summary.total);
    assert.equal(data.ai.reduce((a, b) => a + b, 0), summary.handled);
    assert.equal(summary.human + summary.handled, summary.total);
    assert.equal(summary.hoursSaved, (summary.handled / 60).toFixed(1));
    assert.ok(data.ai.every((value, index) => value <= data.values[index]));
  }
});
