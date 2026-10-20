const CAMPUS_TIME_ZONE = 'Asia/Karachi';

export function campusFields(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function formatBookingDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}
