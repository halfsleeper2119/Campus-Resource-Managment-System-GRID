import { useEffect, useMemo, useState } from 'react';
import BookingForm from './BookingForm';
import { campusFields, formatBookingDate } from '../utils/bookingTime';
import './AvailabilityCalendar.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const AVAILABILITY_API = `${API_BASE_URL}/api/bookings/availability`;
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;

function addDays(date, days) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function createTimeSlot(index) {
  const minutes = index * SLOT_MINUTES;
  const startTime = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const endMinutes = minutes + SLOT_MINUTES;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  return { startTime, endTime };
}

function isWithinResourceHours(resource, startTime, endTime) {
  if (['labs', 'meeting rooms'].includes(resource.category)) {
    return resource.timeSlots.some((timeSlot) => {
      const [start, end] = timeSlot.split('-');
      return startTime >= start && endTime <= end;
    });
  }
  return true;
}

function cellAvailability(resource, bookings, date, startTime, endTime, now) {
  const startsAt = new Date(`${date}T${startTime}:00+05:00`);
  const endsAt = new Date(`${date}T${endTime}:00+05:00`);
  if (startsAt <= now) return 'past';
  if (!resource.isAvailable || !isWithinResourceHours(resource, startTime, endTime)) {
    return 'closed';
  }

  const concurrentBookings = bookings.filter((booking) => (
    new Date(booking.startsAt) < endsAt && new Date(booking.endsAt) > startsAt
  )).length;
  const capacity = ['labs', 'meeting rooms'].includes(resource.category) ? 1 : resource.quantity ?? 0;
  return concurrentBookings < capacity ? 'available' : 'booked';
}

function AvailabilityCalendar({ token, onBooked }) {
  const [view, setView] = useState('week');
  const [date, setDate] = useState(() => campusFields().date);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const days = view === 'day' ? 1 : 7;
  const dates = useMemo(
    () => Array.from({ length: days }, (_, index) => addDays(date, index)),
    [date, days],
  );
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId);
  const resourceBookings = bookings.filter((booking) => booking.resourceId === selectedResourceId);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAvailability() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ date, days: String(days) });
        const response = await fetch(`${AVAILABILITY_API}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load resource availability.');
        setResources(result.resources);
        setBookings(result.bookings);
        setSelectedResourceId((current) => (
          result.resources.some((resource) => resource.id === current)
            ? current
            : result.resources[0]?.id || ''
        ));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Unable to load resource availability.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAvailability();
    return () => controller.abort();
  }, [date, days, token]);

  function moveDate(direction) {
    setDate((current) => addDays(current, direction * days));
  }

  const slots = Array.from({ length: SLOTS_PER_DAY - 1 }, (_, index) => createTimeSlot(index));

  return (
    <section className="availability-calendar" aria-label="Resource availability calendar">
      <div className="availability-controls">
        <label className="user-form-field">
          Resource
          <select
            value={selectedResourceId}
            onChange={(event) => {
              setSelectedResourceId(event.target.value);
              setSelectedSlot(null);
            }}
            disabled={loading || resources.length === 0}
          >
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.name}</option>
            ))}
          </select>
        </label>

        <div className="availability-date-controls">
          <button type="button" className="account-cancel" onClick={() => moveDate(-1)} aria-label="Previous dates">
            Previous
          </button>
          <label className="user-form-field">
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="button" className="account-cancel" onClick={() => moveDate(1)} aria-label="Next dates">
            Next
          </button>
          <div className="availability-view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={view === 'day' ? 'is-selected' : ''}
              aria-pressed={view === 'day'}
              onClick={() => setView('day')}
            >Day</button>
            <button
              type="button"
              className={view === 'week' ? 'is-selected' : ''}
              aria-pressed={view === 'week'}
              onClick={() => setView('week')}
            >Week</button>
          </div>
        </div>
      </div>

      <div className="availability-legend" aria-label="Availability key">
        <span><i className="available-key" /> Available</span>
        <span><i className="booked-key" /> Booked</span>
        <span><i className="closed-key" /> Closed or unavailable</span>
      </div>

      {selectedSlot && selectedResource && (
        <BookingForm
          key={`${selectedResource.id}-${selectedSlot.date}-${selectedSlot.startTime}`}
          token={token}
          resource={selectedResource}
          initialSlot={selectedSlot}
          onSaved={onBooked}
          onCancel={() => setSelectedSlot(null)}
        />
      )}

      {error ? <p className="user-form-message error" role="alert">{error}</p>
        : loading ? <p role="status">Loading availability...</p>
          : resources.length === 0 ? <p className="account-directory-empty">No resources are available to display.</p>
            : <>
              <p className="availability-resource-name">
                {selectedResource.name}
                {!selectedResource.isAvailable && <span>Currently unavailable</span>}
              </p>
              <div className="availability-grid-scroll">
                <table className="availability-grid">
                  <thead>
                    <tr>
                      <th scope="col">Campus time</th>
                      {dates.map((day) => (
                        <th scope="col" key={day}>
                          <span>{formatBookingDate(`${day}T12:00:00+05:00`)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(({ startTime, endTime }) => (
                      <tr key={startTime}>
                        <th scope="row">{startTime}</th>
                        {dates.map((day) => {
                          const status = cellAvailability(
                            selectedResource,
                            resourceBookings,
                            day,
                            startTime,
                            endTime,
                            now,
                          );
                          return (
                            <td key={day}>
                              {status === 'available' ? (
                                <button
                                  type="button"
                                  className="availability-slot available"
                                  aria-label={`Book ${selectedResource.name} on ${formatBookingDate(`${day}T12:00:00+05:00`)} from ${startTime} to ${endTime}`}
                                  onClick={() => setSelectedSlot({ date: day, startTime, endTime })}
                                >Available</button>
                              ) : (
                                <span className={`availability-slot ${status}`} aria-label={status}>
                                  {status === 'booked' ? 'Booked' : status === 'past' ? 'Past' : 'Closed'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>}
    </section>
  );
}

export default AvailabilityCalendar;
