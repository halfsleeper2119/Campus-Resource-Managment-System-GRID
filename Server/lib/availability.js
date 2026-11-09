const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function getAvailabilityRange(date, days) {
  if (
    typeof date !== 'string'
    || !DATE_PATTERN.test(date)
    || !Number.isInteger(days)
    || ![1, 7].includes(days)
  ) {
    return null;
  }

  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (calendarDate.toISOString().slice(0, 10) !== date) {
    return null;
  }

  const startOfDay = new Date(`${date}T00:00:00+05:00`);
  return {
    startsAt: startOfDay,
    endsAt: new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

module.exports = { getAvailabilityRange };
