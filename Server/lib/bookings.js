const ROOM_CATEGORIES = ['labs', 'meeting rooms'];
const CAMPUS_OFFSET = '+05:00';
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseBookingTimes(body, now = new Date()) {
  const { date, startTime, endTime } = body || {};
  if (
    typeof date !== 'string' || !DATE_PATTERN.test(date)
    || typeof startTime !== 'string' || !TIME_PATTERN.test(startTime)
    || typeof endTime !== 'string' || !TIME_PATTERN.test(endTime)
  ) {
    throw new BookingError(400, 'Enter a valid date, start time, and end time.');
  }

  // Check the calendar date too: JavaScript otherwise rolls February 30 into March.
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) {
    throw new BookingError(400, 'Enter a valid calendar date.');
  }
  if (endTime <= startTime) {
    throw new BookingError(400, 'End time must be after start time on the same day.');
  }

  const startsAt = new Date(`${date}T${startTime}:00${CAMPUS_OFFSET}`);
  const endsAt = new Date(`${date}T${endTime}:00${CAMPUS_OFFSET}`);
  if (startsAt <= now) {
    throw new BookingError(400, 'Choose a start time in the future.');
  }
  return { startsAt, endsAt, startTime, endTime };
}

function validateResourceWindow(resource, times) {
  if (!resource.isAvailable) {
    throw new BookingError(409, 'This resource is unavailable.');
  }
  if (ROOM_CATEGORIES.includes(resource.category) && !resource.timeSlots.some((slot) => {
    const [start, end] = slot.split('-');
    return times.startTime >= start && times.endTime <= end;
  })) {
    throw new BookingError(400, 'Choose times inside one of the resource\'s booking windows.');
  }
}

function hasCapacity(resource, times, bookings) {
  const capacity = ROOM_CATEGORIES.includes(resource.category) ? 1 : resource.quantity ?? 0;
  // Count peak usage, so separate equipment bookings do not use capacity twice.
  const events = bookings.flatMap((booking) => [
    [Math.max(booking.startsAt.getTime(), times.startsAt.getTime()), 1],
    [Math.min(booking.endsAt.getTime(), times.endsAt.getTime()), -1],
  ]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let usage = 1; // The booking being requested reserves one unit.
  if (usage > capacity) return false;
  for (const [, change] of events) {
    usage += change;
    if (usage > capacity) return false;
  }
  return true;
}

function createBookingService(prisma, now = () => new Date()) {
  const include = { resource: true };

  async function save(userId, body, bookingId) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existing = bookingId
            ? await tx.booking.findFirst({ where: { id: bookingId, userId } })
            : null;
          if (bookingId && !existing) {
            throw new BookingError(404, 'Booking not found.');
          }
          const currentTime = now();
          if (existing && existing.startsAt <= currentTime) {
            throw new BookingError(400, 'Only bookings that have not started can be changed.');
          }

          const times = parseBookingTimes(body, currentTime);
          const resourceId = existing ? existing.resourceId : body?.resourceId;
          if (typeof resourceId !== 'string' || !resourceId.trim()) {
            throw new BookingError(400, 'Choose a resource.');
          }
          const resource = await tx.resource.findUnique({ where: { id: resourceId } });
          if (!resource) throw new BookingError(404, 'Resource not found.');
          validateResourceWindow(resource, times);

          const overlaps = await tx.booking.findMany({
            where: {
              resourceId,
              ...(existing ? { id: { not: existing.id } } : {}),
              startsAt: { lt: times.endsAt },
              endsAt: { gt: times.startsAt },
            },
            select: { startsAt: true, endsAt: true },
          });
          if (!hasCapacity(resource, times, overlaps)) {
            throw new BookingError(409, 'This time is fully booked. Choose another date or time.');
          }

          const data = { startsAt: times.startsAt, endsAt: times.endsAt };
          return existing
            ? tx.booking.update({ where: { id: existing.id }, data, include })
            : tx.booking.create({ data: { ...data, userId, resourceId }, include });
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        // The pg adapter can report a commit conflict directly instead of P2034.
        const isConflict = error.code === 'P2034'
          || error.cause?.kind === 'TransactionWriteConflict'
          || ['40001', '40P01'].includes(error.cause?.originalCode);
        if (!isConflict) throw error;
        if (attempt === 2) {
          throw new BookingError(409, 'Availability changed while saving. Please try again.');
        }
      }
    }
  }

  return {
    list: (userId) => prisma.booking.findMany({
      where: { userId }, include, orderBy: { startsAt: 'asc' },
    }),
    create: (userId, body) => save(userId, body),
    reschedule: (userId, bookingId, body) => save(userId, body, bookingId),
  };
}

module.exports = { BookingError, parseBookingTimes, validateResourceWindow, hasCapacity, createBookingService };
