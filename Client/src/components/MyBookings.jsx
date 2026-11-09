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
                      {canChange ? <div className="booking-actions">
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
