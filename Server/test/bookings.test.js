const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseBookingTimes, validateResourceWindow, hasCapacity, createBookingService } = require('../lib/bookings');

const now = new Date('2030-01-01T00:00:00Z');
const body = { date: '2030-01-02', startTime: '09:00', endTime: '10:00' };
const room = { category: 'labs', isAvailable: true, timeSlots: ['09:00-11:00'] };
const times = parseBookingTimes(body, now);

test('campus time is stored as the same instant in UTC', () => {
  assert.equal(times.startsAt.toISOString(), '2030-01-02T04:00:00.000Z');
  assert.equal(times.endsAt.toISOString(), '2030-01-02T05:00:00.000Z');
  const midnight = parseBookingTimes({ ...body, startTime: '00:15', endTime: '01:00' }, now);
  assert.equal(midnight.startsAt.toISOString(), '2030-01-01T19:15:00.000Z');
});

for (const [name, input] of [
  ['missing fields', {}],
  ['missing body', undefined],
  ['invalid date type', { ...body, date: 20300102 }],
  ['impossible calendar date', { ...body, date: '2030-02-30' }],
  ['invalid leap day', { ...body, date: '2030-02-29' }],
  ['invalid month', { ...body, date: '2030-13-02' }],
  ['short date', { ...body, date: '2030-1-2' }],
  ['invalid hour', { ...body, startTime: '24:00' }],
  ['invalid minute', { ...body, startTime: '09:60' }],
  ['time with seconds', { ...body, startTime: '09:00:00' }],
  ['equal times', { ...body, endTime: '09:00' }],
  ['reversed times', { ...body, endTime: '08:00' }],
  ['past date', { ...body, date: '2029-01-02' }],
  ['start at the current time', { date: '2030-01-01', startTime: '05:00', endTime: '06:00' }],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => parseBookingTimes(input, now), { status: 400 });
  });
}

test('accepts a real leap day', () => {
  assert.doesNotThrow(() => parseBookingTimes({ ...body, date: '2032-02-29' }, now));
});

test('room bookings must fit inside one configured window', () => {
  assert.doesNotThrow(() => validateResourceWindow(room, times));
  assert.throws(() => validateResourceWindow(room, { ...times, endTime: '12:00' }), { status: 400 });
  assert.throws(() => validateResourceWindow({ ...room, timeSlots: ['09:00-09:30', '09:30-10:00'] }, times), { status: 400 });
  assert.throws(() => validateResourceWindow({ ...room, timeSlots: [] }, times), { status: 400 });
});

test('unavailable resources cannot be booked', () => {
  assert.throws(() => validateResourceWindow({ ...room, isAvailable: false }, times), { status: 409 });
});

test('equipment does not require room windows', () => {
  assert.doesNotThrow(() => validateResourceWindow({ category: 'hardware', isAvailable: true }, times));
});

test('one overlapping booking fills a room', () => {
  assert.equal(hasCapacity(room, times, []), true);
  assert.equal(hasCapacity(room, times, [times]), false);
});

test('equipment capacity uses peak usage and allows adjacent bookings', () => {
  const equipment = { category: 'hardware', quantity: 2 };
  const first = parseBookingTimes({ ...body, endTime: '09:30' }, now);
  const second = parseBookingTimes({ ...body, startTime: '09:30' }, now);
  assert.equal(hasCapacity(equipment, times, [first, second]), true);
  assert.equal(hasCapacity(equipment, times, [first, times]), false);
  assert.equal(hasCapacity({ ...equipment, quantity: 0 }, times, []), false);
});

for (const [name, conflict] of [
  ['Prisma conflict', Object.assign(new Error('Write conflict'), { code: 'P2034' })],
  ['pg adapter commit conflict', Object.assign(new Error('Write conflict'), {
    cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
  })],
]) {
  test(`${name} retries are limited and return a clear error`, async () => {
    let attempts = 0;
    const service = createBookingService({ $transaction: async () => {
      attempts += 1;
      throw conflict;
    } });
    await assert.rejects(service.create('user', body), {
      status: 409, message: 'Availability changed while saving. Please try again.',
    });
    assert.equal(attempts, 3);
  });
}

test('unexpected database errors are not retried or hidden as availability errors', async () => {
  let attempts = 0;
  const failure = new Error('Database connection failed');
  const service = createBookingService({ $transaction: async () => {
    attempts += 1;
    throw failure;
  } });
  await assert.rejects(service.create('user', body), failure);
  assert.equal(attempts, 1);
});
