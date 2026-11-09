const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildUtilizationReport, getMonthRange } = require('../lib/utilizationReport');

test('report month range uses campus midnight and handles December rollover', () => {
  const range = getMonthRange('2030-12');
  assert.equal(range.startsAt.toISOString(), '2030-11-30T19:00:00.000Z');
  assert.equal(range.endsAt.toISOString(), '2030-12-31T19:00:00.000Z');
  assert.equal(range.daysInMonth, 31);
});

test('rejects invalid monthly report ranges', () => {
  for (const month of [undefined, '2030-00', '2030-13', '2030-1', '1899-12', '9999-12']) {
    assert.equal(getMonthRange(month), null);
  }
});

test('aggregates booking count and reserved hours by resource', () => {
  const resources = [
    { id: 'room', name: 'Lab', category: 'labs', timeSlots: ['09:00-11:00'], quantity: null },
    { id: 'gear', name: 'Camera', category: 'hardware', timeSlots: [], quantity: 2 },
    { id: 'empty', name: 'Empty room', category: 'meeting rooms', timeSlots: ['10:00-12:00'], quantity: null },
  ];
  const bookings = [
    {
      resourceId: 'room',
      startsAt: new Date('2030-01-02T04:00:00Z'),
      endsAt: new Date('2030-01-02T05:30:00Z'),
    },
    {
      resourceId: 'gear',
      startsAt: new Date('2030-01-03T08:00:00Z'),
      endsAt: new Date('2030-01-03T10:00:00Z'),
    },
  ];

  const report = buildUtilizationReport('2030-01', resources, bookings);
  assert.equal(report.month, '2030-01');
  assert.deepEqual(report.totals, {
    bookingCount: 2,
    bookedHours: 3.5,
    capacityHours: (2 * 31) + (2 * 24 * 31) + (2 * 31),
    utilizationPercent: (3.5 / ((2 * 31) + (2 * 24 * 31) + (2 * 31))) * 100,
  });
  assert.deepEqual(report.resources.map(({ id }) => id), ['gear', 'room', 'empty']);
  assert.equal(report.resources.find(({ id }) => id === 'room').utilizationPercent, (1.5 / (2 * 31)) * 100);
  assert.equal(report.resources.find(({ id }) => id === 'empty').bookingCount, 0);
});

test('clips booked hours to the selected month and returns N/A when capacity is zero', () => {
  const report = buildUtilizationReport('2030-02', [
    { id: 'limited', name: 'Limited', category: 'hardware', timeSlots: [], quantity: 0 },
  ], [{
    resourceId: 'limited',
    startsAt: new Date('2030-01-31T18:00:00Z'),
    endsAt: new Date('2030-01-31T20:00:00Z'),
  }]);

  assert.equal(report.resources[0].bookedHours, 1);
  assert.equal(report.resources[0].capacityHours, 0);
  assert.equal(report.resources[0].utilizationPercent, null);
  assert.equal(report.totals.utilizationPercent, null);
});
