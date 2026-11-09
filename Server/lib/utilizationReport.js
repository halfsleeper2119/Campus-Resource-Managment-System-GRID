const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function getMonthRange(month) {
  const match = typeof month === 'string' ? month.match(MONTH_PATTERN) : null;
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year < 1900 || year > 9998) return null;

  const startsAt = new Date(Date.UTC(year, monthNumber - 1, 1, -5));
  const endsAt = new Date(Date.UTC(year, monthNumber, 1, -5));

  return {
    startsAt,
    endsAt,
    daysInMonth: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
  };
}

function resourceCapacityHours(resource, daysInMonth) {
  if (['labs', 'meeting rooms'].includes(resource.category)) {
    const dailyHours = resource.timeSlots.reduce((total, slot) => {
      const [start, end] = slot.split('-');
      const toMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      return total + (toMinutes(end) - toMinutes(start)) / 60;
    }, 0);
    return dailyHours * daysInMonth;
  }

  return (resource.quantity ?? 0) * 24 * daysInMonth;
}

function buildUtilizationReport(month, resources, bookings) {
  const range = getMonthRange(month);
  if (!range) return null;

  const reportResources = resources.map((resource) => {
    const resourceBookings = bookings.filter((booking) => booking.resourceId === resource.id);
    const bookedHours = resourceBookings.reduce((total, booking) => {
      const start = Math.max(booking.startsAt.getTime(), range.startsAt.getTime());
      const end = Math.min(booking.endsAt.getTime(), range.endsAt.getTime());
      return total + Math.max(0, end - start) / (60 * 60 * 1000);
    }, 0);
    const capacityHours = resourceCapacityHours(resource, range.daysInMonth);

    return {
      id: resource.id,
      name: resource.name,
      category: resource.category,
      bookingCount: resourceBookings.length,
      bookedHours,
      capacityHours,
      utilizationPercent: capacityHours > 0 ? (bookedHours / capacityHours) * 100 : null,
    };
  }).sort((left, right) => (
    right.bookingCount - left.bookingCount
    || right.bookedHours - left.bookedHours
    || left.name.localeCompare(right.name)
  ));

  const totals = reportResources.reduce((summary, resource) => ({
    bookingCount: summary.bookingCount + resource.bookingCount,
    bookedHours: summary.bookedHours + resource.bookedHours,
    capacityHours: summary.capacityHours + resource.capacityHours,
  }), { bookingCount: 0, bookedHours: 0, capacityHours: 0 });

  return {
    month,
    resources: reportResources,
    totals: {
      ...totals,
      utilizationPercent: totals.capacityHours > 0
        ? (totals.bookedHours / totals.capacityHours) * 100
        : null,
    },
  };
}

module.exports = { getMonthRange, buildUtilizationReport };
