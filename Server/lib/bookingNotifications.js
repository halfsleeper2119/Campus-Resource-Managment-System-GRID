const nodemailer = require('nodemailer');

const CAMPUS_TIME_ZONE = 'Asia/Karachi';

function formatBookingTime(date) {
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

function formatBookingDate(date) {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'full',
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

function createBookingNotifier({
  env = process.env,
  createTransport = nodemailer.createTransport,
  logger = console,
} = {}) {
  return async function notifyBookingStatus(user, booking, status) {
    if (!user?.email) {
      return { sent: false, reason: 'missing_email' };
    }

    const port = Number(env.SMTP_PORT || 587);
    if (
      !env.SMTP_HOST
      || !env.SMTP_FROM
      || !Number.isInteger(port)
      || port < 1
      || port > 65_535
      || Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)
    ) {
      return { sent: false, reason: 'not_configured' };
    }

    const isCancelled = status === 'cancelled';
    const date = formatBookingDate(booking.startsAt);
    const startTime = formatBookingTime(booking.startsAt);
    const endTime = formatBookingTime(booking.endsAt);
    const subject = isCancelled ? 'Booking cancelled' : 'Booking confirmed';
    const actionText = isCancelled ? 'has been cancelled' : 'is confirmed';

    try {
      const transport = createTransport({
        host: env.SMTP_HOST,
        port,
        secure: env.SMTP_SECURE === 'true',
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        ...(env.SMTP_USER ? {
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
        } : {}),
      });

      await transport.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject,
        text: [
          `Hello ${user.name},`,
          '',
          `Your booking ${actionText}.`,
          `Resource: ${booking.resource.name}`,
          `Date: ${date}`,
          `Time: ${startTime} to ${endTime} (Pakistan time)`,
          '',
          'Campus Resource Hub',
        ].join('\n'),
      });

      return { sent: true };
    } catch (error) {
      logger.error('Booking notification email failed:', error);
      return { sent: false, reason: 'send_failed' };
    }
  };
}

const notifyBookingStatus = createBookingNotifier();

module.exports = { createBookingNotifier, notifyBookingStatus };
