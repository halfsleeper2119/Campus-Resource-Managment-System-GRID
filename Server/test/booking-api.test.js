const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

describe('Booking API with PostgreSQL', { skip: !process.env.TEST_DATABASE_URL }, () => {
  let prisma;
  let server;
  let baseUrl;
  let alice;
  let bob;
  let aliceToken;
  let bobToken;
  const resourceIds = [];
  const initial = { date: '2099-01-10', startTime: '09:00', endTime: '10:00' };

  before(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'local-booking-test-signing-secret-only';
    prisma = require('../lib/prisma');
    const jwt = require('jsonwebtoken');
    const app = require('../index');
    alice = await prisma.user.create({ data: {
      id: randomUUID(), name: 'Booking test student', role: 'STUDENT', passwordHash: 'test-only',
    } });
    bob = await prisma.user.create({ data: {
      id: randomUUID(), name: 'Booking test faculty', role: 'FACULTY', passwordHash: 'test-only',
    } });
    const token = (user) => jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
      subject: user.id, expiresIn: '10m', algorithm: 'HS256',
    });
    aliceToken = token(alice);
    bobToken = token(bob);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/bookings`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (prisma) {
      await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } });
      await prisma.user.deleteMany({ where: { id: { in: [alice?.id, bob?.id].filter(Boolean) } } });
      await prisma.$disconnect();
    }
  });

  async function resource(overrides = {}) {
    const item = await prisma.resource.create({ data: {
      name: 'Booking test resource', category: 'labs', timeSlots: ['09:00-12:00'], ...overrides,
    } });
    resourceIds.push(item.id);
    return item;
  }

  async function request(method, path = '', body, token = aliceToken) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }

  async function book(item, body = initial, token = aliceToken) {
    const response = await request('POST', '', { resourceId: item.id, ...body }, token);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body;
  }

  test('all booking routes require sign-in', async () => {
    for (const method of ['GET', 'POST', 'PATCH']) {
      const response = await request(method, method === 'PATCH' ? '/missing' : '', method === 'GET' ? undefined : initial, null);
      assert.equal(response.status, 401);
    }
  });

  test('a date-only change keeps the booking identity and survives a reload', async () => {
    const item = await resource();
    const original = await book(item);
    const updated = await request('PATCH', `/${original.id}`, { ...initial, date: '2099-01-11' });
    assert.equal(updated.status, 200);
    for (const key of ['id', 'userId', 'resourceId', 'createdAt']) {
      assert.equal(updated.body[key], original[key]);
    }
    assert.equal(updated.body.startsAt, '2099-01-11T04:00:00.000Z');
    const reloaded = await request('GET');
    assert.equal(reloaded.body.find((entry) => entry.id === original.id).startsAt, updated.body.startsAt);
    assert.equal(await prisma.booking.count({ where: { resourceId: item.id } }), 1);
  });

  test('supports a time-only change, a date and time change, and keeping the same slot', async () => {
    const item = await resource();
    const original = await book(item);
    for (const body of [
      initial,
      { ...initial, startTime: '09:30', endTime: '10:30' },
      { ...initial, date: '2099-01-12', startTime: '10:00', endTime: '11:00' },
    ]) {
      const result = await request('PATCH', `/${original.id}`, body);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.id, original.id);
    }
  });

  test('lists only the signed-in user\'s bookings and rejects another owner\'s update', async () => {
    const item = await resource();
    const original = await book(item);
    const other = await book(item, { ...initial, startTime: '10:00', endTime: '11:00' }, bobToken);
    const result = await request('GET', '', undefined, bobToken);
    assert.ok(result.body.some((entry) => entry.id === other.id));
    assert.ok(result.body.every((entry) => entry.userId === bob.id));
    const denied = await request('PATCH', `/${original.id}`, { ...initial, date: '2099-01-11' }, bobToken);
    assert.equal(denied.status, 404);
    assert.equal((await prisma.booking.findUnique({ where: { id: original.id } })).startsAt.toISOString(), original.startsAt);
  });

  test('a conflicting update keeps the original booking and permits back-to-back times', async () => {
    const item = await resource();
    const original = await book(item);
    await book(item, { ...initial, startTime: '10:00', endTime: '11:00' }, bobToken);
    const result = await request('PATCH', `/${original.id}`, { ...initial, startTime: '09:30', endTime: '10:30' });
    assert.equal(result.status, 409);
    const unchanged = await prisma.booking.findUnique({ where: { id: original.id } });
    assert.equal(unchanged.startsAt.toISOString(), original.startsAt);
    assert.equal(unchanged.endsAt.toISOString(), original.endsAt);
    assert.equal(unchanged.updatedAt.toISOString(), original.updatedAt);
  });

  test('rejects invalid changes and unavailable resources without changing the booking', async () => {
    const item = await resource();
    const original = await book(item);
    for (const body of [
      {}, { ...initial, date: '2099-02-30' }, { ...initial, date: '2000-01-01' },
      { ...initial, endTime: '08:00' }, { ...initial, startTime: '08:00' },
    ]) {
      const result = await request('PATCH', `/${original.id}`, body);
      assert.equal(result.status, 400, JSON.stringify(result.body));
    }
    await prisma.resource.update({ where: { id: item.id }, data: { isAvailable: false } });
    assert.equal((await request('PATCH', `/${original.id}`, initial)).status, 409);
    assert.equal((await prisma.booking.findUnique({ where: { id: original.id } })).updatedAt.toISOString(), original.updatedAt);
  });

  test('rejects bookings that have already started', async () => {
    const item = await resource();
    const started = await prisma.booking.create({ data: {
      resourceId: item.id, userId: alice.id,
      startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000),
    } });
    const result = await request('PATCH', `/${started.id}`, initial);
    assert.equal(result.status, 400);
    assert.equal((await prisma.booking.findUnique({ where: { id: started.id } })).startsAt.getTime(), started.startsAt.getTime());
  });

  test('cannot change the booking owner or resource through the update payload', async () => {
    const item = await resource();
    const original = await book(item);
    const result = await request('PATCH', `/${original.id}`, { ...initial, userId: bob.id, resourceId: 'different-resource' });
    assert.equal(result.status, 200);
    assert.equal(result.body.userId, alice.id);
    assert.equal(result.body.resourceId, item.id);
  });

  test('equipment reserves one unit and counts peak usage across adjacent bookings', async () => {
    const item = await resource({ category: 'hardware', quantity: 2, timeSlots: [] });
    await book(item, { ...initial, endTime: '09:30' });
    await book(item, { ...initial, startTime: '09:30' });
    const original = await book(item, initial, bobToken);
    assert.equal((await request('PATCH', `/${original.id}`, initial, bobToken)).status, 200);
    assert.equal((await request('POST', '', { ...initial, resourceId: item.id })).status, 409);
  });

  test('competing creates cannot double-book a room', async () => {
    const item = await resource();
    const results = await Promise.all([
      request('POST', '', { ...initial, resourceId: item.id }),
      request('POST', '', { ...initial, resourceId: item.id }, bobToken),
    ]);
    assert.deepEqual(results.map((entry) => entry.status).sort(), [201, 409]);
    assert.equal(await prisma.booking.count({ where: { resourceId: item.id } }), 1);
  });

  test('competing updates keep the losing booking at its original time', async () => {
    const item = await resource();
    const first = await book(item);
    const second = await book(item, { ...initial, startTime: '10:00', endTime: '11:00' }, bobToken);
    const target = { ...initial, startTime: '11:00', endTime: '12:00' };
    const results = await Promise.all([
      request('PATCH', `/${first.id}`, target),
      request('PATCH', `/${second.id}`, target, bobToken),
    ]);
    assert.deepEqual(results.map((entry) => entry.status).sort(), [200, 409]);
    const loser = results[0].status === 409 ? first : second;
    assert.equal((await prisma.booking.findUnique({ where: { id: loser.id } })).startsAt.toISOString(), loser.startsAt);
    assert.equal(await prisma.booking.count({ where: { resourceId: item.id } }), 2);
  });
});
