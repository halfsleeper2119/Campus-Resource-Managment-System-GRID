const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { BookingError, createBookingService } = require('../lib/bookings');
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
