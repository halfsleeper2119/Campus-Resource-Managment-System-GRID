import { useState } from 'react';
import { campusFields } from '../utils/bookingTime';

const BOOKING_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`;

function BookingForm({ token, resource, booking, onSaved, onCancel }) {
  const [date, setDate] = useState(() => booking
    ? campusFields(booking.startsAt).date
    : campusFields(new Date(Date.now() + 86_400_000)).date);
  const [startTime, setStartTime] = useState(() => booking
    ? campusFields(booking.startsAt).time
    : resource.timeSlots?.[0]?.split('-')[0] || '09:00');
  const [endTime, setEndTime] = useState(() => booking
    ? campusFields(booking.endsAt).time
    : resource.timeSlots?.[0]?.split('-')[1] || '10:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isRoom = ['labs', 'meeting rooms'].includes(resource.category);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (endTime <= startTime) {
      setError('End time must be after start time on the same day.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(booking ? `${BOOKING_API}/${booking.id}` : BOOKING_API, {
        method: booking ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, startTime, endTime, ...(!booking ? { resourceId: resource.id } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save your booking.');
      onSaved(result);
    } catch (saveError) {
      setError(saveError.message || 'Unable to reach the booking service. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} aria-label={booking ? 'Change booking' : 'New booking'}>
      <div className="user-management-intro">
        <p className="user-management-kicker">{booking ? 'CHANGE BOOKING' : 'NEW BOOKING'}</p>
        <h2>{resource.name}</h2>
        <p>All times are campus time (Pakistan, UTC+5).</p>
        {isRoom
          ? <p>Booking windows: {resource.timeSlots.map((slot) => slot.replace('-', ' to ')).join(', ') || 'None available'}</p>
          : <p>This booking reserves one unit.</p>}
      </div>

      <fieldset className="booking-fields" disabled={saving}>
        <label className="user-form-field">
          Date
          <input type="date" value={date} min={campusFields().date} onChange={(event) => setDate(event.target.value)} required autoFocus />
        </label>
        <label className="user-form-field">
          Start time
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
        </label>
        <label className="user-form-field">
          End time
          <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
        </label>
      </fieldset>

      {error && <p className="user-form-message error" role="alert">{error}</p>}
      <div className="account-edit-actions">
        <button type="submit" className="user-submit" disabled={saving}>
          {saving ? 'Saving...' : booking ? 'Save changes' : 'Book resource'}
        </button>
        <button type="button" className="account-cancel" onClick={onCancel} disabled={saving}>
          {booking ? 'Keep current booking' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}

export default BookingForm;
