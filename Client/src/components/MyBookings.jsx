import { useEffect, useState } from 'react';
import BookingForm from './BookingForm';
import { campusFields, formatBookingDate } from '../utils/bookingTime';

const BOOKING_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`;

function MyBookings({ token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBookings() {
      try {
        const response = await fetch(BOOKING_API, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load your bookings.');
        setBookings(result);
        setError('');
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message || 'Unable to load your bookings.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadBookings();
    return () => controller.abort();
  }, [token]);

  function handleSaved(updated) {
    setBookings((current) => current.map((booking) => booking.id === updated.id ? updated : booking)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    setEditing(null);
    setMessage('Booking updated. Your new date and time are saved.');
  }

  return (
    <section className="bookings-panel" aria-label="My bookings">
      <p className="booking-time-note">All times are campus time (Pakistan, UTC+5).</p>
      {message && <p className="user-form-message success" role="status">{message}</p>}
      {error ? <p className="user-form-message error" role="alert">{error}</p>
        : loading ? <p role="status">Loading bookings...</p>
          : bookings.length === 0 ? <p className="account-directory-empty">No bookings yet. Choose a resource from the catalog to make one.</p>
            : <ul className="booking-list">
              {bookings.map((booking) => {
                const canChange = new Date(booking.startsAt) > new Date();
                return (
                  <li className="booking-card" key={booking.id}>
                    <div className="booking-summary">
                      <div>
                        <p className="user-management-kicker">{booking.resource.category}</p>
                        <h2>{booking.resource.name}</h2>
                        <p>{formatBookingDate(booking.startsAt)}</p>
                        <p className="booking-time">{campusFields(booking.startsAt).time} to {campusFields(booking.endsAt).time}</p>
                      </div>
                      {canChange ? <button
                        type="button"
                        className="account-cancel"
                        disabled={Boolean(editing)}
                        onClick={() => { setEditing(booking.id); setMessage(''); }}
                      >Change date or time</button>
                        : <p className="user-field-hint">This booking has started and cannot be changed.</p>}
                    </div>
                    {editing === booking.id && <BookingForm
                      key={booking.id}
                      token={token}
                      resource={booking.resource}
                      booking={booking}
                      onSaved={handleSaved}
                      onCancel={() => setEditing(null)}
                    />}
                  </li>
                );
              })}
            </ul>}
    </section>
  );
}

export default MyBookings;
