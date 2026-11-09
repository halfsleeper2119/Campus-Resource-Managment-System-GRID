const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBookingNotifier } = require('../lib/bookingNotifications');

const user = { name: 'Test Student', email: 'student@example.edu' };
const booking = {
  startsAt: new Date('2030-01-02T04:00:00.000Z'),
  endsAt: new Date('2030-01-02T05:00:00.000Z'),
  resource: { name: 'Computer Lab' },
};
const configuredEnv = {
  SMTP_HOST: 'smtp.example.edu',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_FROM: 'Campus Resource Hub <bookings@example.edu>',
};

test('sends a confirmation email with the booking details in campus time', async () => {
  let message;
  const notify = createBookingNotifier({
    env: configuredEnv,
    createTransport: () => ({
      sendMail: async (outgoing) => { message = outgoing; },
    }),
  });

  assert.deepEqual(await notify(user, booking, 'confirmed'), { sent: true });
  assert.equal(message.to, user.email);
  assert.equal(message.subject, 'Booking confirmed');
  assert.match(message.text, /Your booking is confirmed\./);
  assert.match(message.text, /Date: Wednesday, 2 January 2030/);
  assert.match(message.text, /Time: 09:00 to 10:00 \(Pakistan time\)/);
});

test('sends a cancellation email', async () => {
  let message;
  const notify = createBookingNotifier({
    env: configuredEnv,
    createTransport: () => ({
      sendMail: async (outgoing) => { message = outgoing; },
    }),
  });

  assert.deepEqual(await notify(user, booking, 'cancelled'), { sent: true });
  assert.equal(message.subject, 'Booking cancelled');
  assert.match(message.text, /Your booking has been cancelled\./);
});

test('reports missing email and SMTP configuration without attempting delivery', async () => {
  let attempted = false;
  const notify = createBookingNotifier({
    env: {},
    createTransport: () => {
      attempted = true;
      throw new Error('Should not create a transport.');
    },
  });

  assert.deepEqual(await notify({ name: 'No email' }, booking, 'confirmed'), {
    sent: false, reason: 'missing_email',
  });
  assert.deepEqual(await notify(user, booking, 'confirmed'), {
    sent: false, reason: 'not_configured',
  });
  assert.equal(attempted, false);
});

test('reports SMTP delivery errors and logs the error', async () => {
  const error = new Error('SMTP unavailable');
  let loggedError;
  const notify = createBookingNotifier({
    env: configuredEnv,
    createTransport: () => ({ sendMail: async () => { throw error; } }),
    logger: { error: (...args) => { loggedError = args; } },
  });

  assert.deepEqual(await notify(user, booking, 'confirmed'), {
    sent: false, reason: 'send_failed',
  });
  assert.equal(loggedError[1], error);
});
