import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function Settings({ token }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (new TextEncoder().encode(newPassword).length > 72) {
      setMessage({ type: 'error', text: 'New password must be no more than 72 UTF-8 bytes.' });
      return;
    }

    if (newPassword === currentPassword) {
      setMessage({ type: 'error', text: 'New password must be different from your current password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to change your password.');
      }

      form.reset();
      setMessage({ type: 'success', text: result.message });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to reach the password service.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="user-management">
      <div className="user-management-intro">
        <p className="user-management-kicker">ACCOUNT SETTINGS</p>
        <h2>Change your password</h2>
        <p>Enter your current password, then choose a new password to secure your account.</p>
      </div>

      <form className="user-form" onSubmit={handleSubmit}>
        <div className="user-form-field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            name="currentPassword"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="user-form-field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="newPassword"
            type={showPasswords ? 'text' : 'password'}
            minLength="6"
            autoComplete="new-password"
            required
          />
          <span className="user-field-hint">Use 6–72 UTF-8 bytes.</span>
        </div>

        <div className="user-form-field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type={showPasswords ? 'text' : 'password'}
            minLength="6"
            autoComplete="new-password"
            required
          />
        </div>

        <label className="settings-reveal-password">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(event) => setShowPasswords(event.target.checked)}
          />
          Show passwords
        </label>

        {message && (
          <p className={`user-form-message ${message.type}`} role="status">
            {message.text}
          </p>
        )}

        <button className="user-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Changing password...' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

export default Settings;
