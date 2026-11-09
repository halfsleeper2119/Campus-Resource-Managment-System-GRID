const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { BookingError, createBookingService } = require('../lib/bookings');
const { getAvailabilityRange } = require('../lib/availability');
const { notifyBookingStatus } = require('../lib/bookingNotifications');

const router = express.Router();
const bookings = createBookingService(prisma);
router.use(authenticateToken);

async function addNotification(userId, booking, status) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    return {
      ...booking,
      notification: await notifyBookingStatus(user, booking, status),
    };
  } catch (error) {
    console.error('Booking notification could not be sent:', error);
    return {
      ...booking,
      notification: { sent: false, reason: 'send_failed' },
    };
  }
}

function handleError(res, error) {
  if (error instanceof BookingError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('Booking request failed:', error);
  return res.status(500).json({ message: 'Unable to save or load bookings. Please try again.' });
}

router.get('/', async (req, res) => {
  try {
    return res.json(await bookings.list(req.user.id));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/availability', async (req, res) => {
  const days = Number(req.query.days);
  const range = getAvailabilityRange(req.query.date, days);
  if (!range) {
    return res.status(400).json({ message: 'Choose a valid date and a day or week view.' });
  }

  try {
    const resources = await prisma.resource.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        isAvailable: true,
        timeSlots: true,
        quantity: true,
      },
    });
    const bookings = resources.length
      ? await prisma.booking.findMany({
        where: {
          resourceId: { in: resources.map((resource) => resource.id) },
          startsAt: { lt: range.endsAt },
          endsAt: { gt: range.startsAt },
        },
        select: { resourceId: true, startsAt: true, endsAt: true },
      })
      : [];

    return res.json({ resources, bookings });
  } catch (error) {
    console.error('Resource availability lookup failed:', error);
    return res.status(500).json({ message: 'Unable to load resource availability.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const booking = await bookings.create(req.user.id, req.body);
    return res.status(201).json(await addNotification(req.user.id, booking, 'confirmed'));
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    return res.json(await bookings.reschedule(req.user.id, req.params.id, req.body));
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const booking = await bookings.cancel(req.user.id, req.params.id);
    return res.json(await addNotification(req.user.id, booking, 'cancelled'));
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
