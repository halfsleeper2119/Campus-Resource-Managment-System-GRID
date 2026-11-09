const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getAvailabilityRange } = require('../lib/availability');

test('availability range covers one selected campus day', () => {
  const range = getAvailabilityRange('2030-01-02', 1);
  assert.equal(range.startsAt.toISOString(), '2030-01-01T19:00:00.000Z');
  assert.equal(range.endsAt.toISOString(), '2030-01-02T19:00:00.000Z');
});

test('availability range covers exactly seven campus days', () => {
  const range = getAvailabilityRange('2030-01-02', 7);
  assert.equal(range.startsAt.toISOString(), '2030-01-01T19:00:00.000Z');
  assert.equal(range.endsAt.toISOString(), '2030-01-08T19:00:00.000Z');
});

test('availability range rejects invalid dates and unsupported view lengths', () => {
  for (const [date, days] of [
    ['2030-02-30', 1],
    ['2030-13-01', 1],
    ['2030-01-01', 2],
    [undefined, 7],
  ]) {
    assert.equal(getAvailabilityRange(date, days), null);
  }
});
