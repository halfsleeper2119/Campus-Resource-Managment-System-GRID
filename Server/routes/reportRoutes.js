const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { buildUtilizationReport, getMonthRange } = require('../lib/utilizationReport');

const router = express.Router();
router.use(authenticateToken, requireRole('ADMIN'));

router.get('/monthly-utilization', async (req, res) => {
  const { month } = req.query;
  const range = getMonthRange(month);
  if (!range) {
    return res.status(400).json({ message: 'Choose a valid report month in YYYY-MM format.' });
  }

  try {
    const [resources, bookings] = await Promise.all([
      prisma.resource.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          category: true,
          timeSlots: true,
          quantity: true,
        },
      }),
      prisma.booking.findMany({
        where: {
          startsAt: { lt: range.endsAt },
          endsAt: { gt: range.startsAt },
        },
        select: { resourceId: true, startsAt: true, endsAt: true },
      }),
    ]);

    return res.json(buildUtilizationReport(month, resources, bookings));
  } catch (error) {
    console.error('Monthly utilization report failed:', error);
    return res.status(500).json({ message: 'Unable to load the monthly utilization report.' });
  }
});

module.exports = router;
