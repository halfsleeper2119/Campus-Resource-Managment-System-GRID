import { useEffect, useState } from 'react';
import BookingForm from './BookingForm';
import { campusFields, formatBookingDate } from '../utils/bookingTime';

const BOOKING_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`;

function notificationFailureMessage(notification, action) {
  if (notification?.reason === 'missing_email') {
    return `Booking ${action}, but no email address is saved for your account.`;
  }
  if (notification?.reason === 'not_configured') {
    return `Booking ${action}, but email notifications are not configured on the server.`;
  }
  return `Booking ${action}, but the notification email could not be sent.`;
}

function MyBookings({ token, notification, onDismissNotification }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const upcomingBookings = bookings.filter((booking) => new Date(booking.startsAt).getTime() > now);
  const pastBookings = bookings.filter((booking) => new Date(booking.startsAt).getTime() <= now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
    setMessage({ type: 'success', text: 'Booking updated. Your new date and time are saved.' });
  }

  async function handleCancel(booking) {
    if (!window.confirm(`Cancel your booking for ${booking.resource.name}?`)) return;

    onDismissNotification();
    setCancelling(booking.id);
    setMessage(null);
    try {
      const response = await fetch(`${BOOKING_API}/${booking.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to cancel your booking.');

      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setMessage({
        type: result.notification?.sent ? 'success' : 'error',
        text: result.notification?.sent
          ? 'Booking cancelled. A cancellation email was sent to your saved address.'
          : notificationFailureMessage(result.notification, 'cancelled'),
      });
    } catch (cancelError) {
      setMessage({ type: 'error', text: cancelError.message || 'Unable to cancel your booking.' });
    } finally {
      setCancelling(null);
    }
  }

  return (
    <section className="bookings-panel" aria-label="My bookings">
      <p className="booking-time-note">All times are campus time (Pakistan, UTC+5).</p>
      {notification && (
        <p className={`user-form-message ${notification.sent ? 'success' : 'error'}`} role="status">
          {notification.sent
            ? 'Booking confirmed. A confirmation email was sent to your saved address.'
            : notificationFailureMessage(notification, 'confirmed')}
          <button type="button" className="account-cancel" onClick={onDismissNotification}>Dismiss</button>
        </p>
      )}
      {message && <p className={`user-form-message ${message.type}`} role="status">{message.text}</p>}
      {error ? <p className="user-form-message error" role="alert">{error}</p>
        : loading ? <p role="status">Loading bookings...</p>
          : bookings.length === 0 ? <p className="account-directory-empty">No bookings yet. Choose a resource from the catalog to make one.</p>
            : <>
              <section className="booking-group" aria-labelledby="upcoming-bookings-heading">
                <h2 className="booking-group-heading" id="upcoming-bookings-heading">Upcoming bookings</h2>
                {upcomingBookings.length === 0
                  ? <p className="account-directory-empty">You have no upcoming bookings.</p>
                  : <ul className="booking-list">
                    {upcomingBookings.map((booking) => (
                      <li className="booking-card" key={booking.id}>
                        <div className="booking-summary">
                          <div>
                            <p className="user-management-kicker">{booking.resource.category}</p>
                            <h3>{booking.resource.name}</h3>
                            <p>{formatBookingDate(booking.startsAt)}</p>
                            <p className="booking-time">{campusFields(booking.startsAt).time} to {campusFields(booking.endsAt).time}</p>
                          </div>
                          <div className="booking-actions">
                            <button
                              type="button"
                              className="account-cancel"
                              disabled={Boolean(editing) || Boolean(cancelling)}
                              onClick={() => { setEditing(booking.id); setMessage(null); }}
                            >Change date or time</button>
                            <button
                              type="button"
                              className="account-delete"
                              disabled={Boolean(editing) || Boolean(cancelling)}
                              onClick={() => handleCancel(booking)}
                            >{cancelling === booking.id ? 'Cancelling...' : 'Cancel booking'}</button>
                          </div>
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
                    ))}
                  </ul>}
              </section>
              {pastBookings.length > 0 && (
                <section className="booking-group" aria-labelledby="past-bookings-heading">
                  <h2 className="booking-group-heading" id="past-bookings-heading">Past bookings</h2>
                  <ul className="booking-list">
                    {pastBookings.map((booking) => (
                      <li className="booking-card" key={booking.id}>
                        <div className="booking-summary">
                          <div>
                            <p className="user-management-kicker">{booking.resource.category}</p>
                            <h3>{booking.resource.name}</h3>
                            <p>{formatBookingDate(booking.startsAt)}</p>
                            <p className="booking-time">{campusFields(booking.startsAt).time} to {campusFields(booking.endsAt).time}</p>
                          </div>
                          <p className="user-field-hint">This booking has started and can no longer be changed or cancelled.</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>}
    </section>
  );
}

export default MyBookings;
