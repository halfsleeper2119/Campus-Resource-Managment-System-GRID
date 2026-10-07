import { useState } from 'react';
import RollNumberInput from './RollNumberInput';
import { ROLL_NUMBER_PATTERN } from '../utils/rollNumber';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function AdminUsers({ token }) {
  const [role, setRole] = useState('STUDENT');
  const [rollNumber, setRollNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = formData.get('password');
    if (new TextEncoder().encode(password).length > 72) {
      setMessage({
        type: 'error',
        text: 'Password must be no more than 72 UTF-8 bytes.',
      });
      return;
    }

    const payload = {
      name: formData.get('name').trim(),
      role,
      password,
      ...(role === 'STUDENT'
        ? { rollNumber: rollNumber.trim().toUpperCase() }
        : { email: formData.get('email').trim().toLowerCase() }),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not create the account.');
      }

      const identifier = role === 'STUDENT' ? payload.rollNumber : payload.email;
      setMessage({
        type: 'success',
        text: `Account created for ${result.user.name} (${identifier}). Share the temporary password securely.`,
      });
      form.reset();
      setRollNumber('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Could not reach the account service.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="user-management">
      <div className="user-management-intro">
        <p className="user-management-kicker">ACCOUNT ADMINISTRATION</p>
        <h2>Create a campus account</h2>
        <p>
          Set up student and faculty access. Accounts are created by an
          administrator; there is no public sign-up.
        </p>
      </div>

      <form className="user-form" onSubmit={handleSubmit}>
        <div className="user-form-field user-role-field">
          <label htmlFor="user-role">Account type</label>
          <select
            id="user-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setMessage(null);
              setRollNumber('');
            }}
          >
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </div>

        <div className="user-form-field">
          <label htmlFor="user-name">Full name</label>
          <input
            id="user-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength="120"
            placeholder="Enter their full name"
            required
          />
        </div>

        {role === 'STUDENT' ? (
          <div className="user-form-field">
            <label htmlFor="user-roll-number">Student roll number</label>
            <RollNumberInput
              id="user-roll-number"
              name="rollNumber"
              value={rollNumber}
              onChange={setRollNumber}
              pattern={ROLL_NUMBER_PATTERN}
              title="Enter two digits, one letter, a dash, and four digits (XXY-XXXX)."
              placeholder="e.g. 22L-1234"
              required
            />
            <span className="user-field-hint">Format: XXY-XXXX (e.g. 22L-1234)</span>
          </div>
        ) : (
          <div className="user-form-field">
            <label htmlFor="user-email">Faculty email address</label>
            <input
              id="user-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@university.edu"
              required
            />
          </div>
        )}

        <div className="user-form-field">
          <label htmlFor="user-password">Temporary password</label>
          <div className="password-input-wrap">
            <input
              id="user-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              minLength="6"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.5 9.8 6.2a1.4 1.4 0 0 1 0 1.6 15.3 15.3 0 0 1-3.2 3.5M6.2 6.2a16 16 0 0 0-4 5 1.4 1.4 0 0 0 0 1.6C3.3 14.5 6.8 19 12 19c1.1 0 2.1-.2 3.1-.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M2.2 12s3.5-7 9.8-7 9.8 7 9.8 7-3.5 7-9.8 7-9.8-7-9.8-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <span className="user-field-hint">
            Use 6–72 UTF-8 bytes. Share it with the user securely.
          </span>
        </div>

        {message && (
          <p className={`user-form-message ${message.type}`} role="status">
            {message.text}
          </p>
        )}

        <button className="user-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="user-management-footnote">
        Passwords are hashed before storage and are never returned by the server.
      </p>
    </section>
  );
}

export default AdminUsers;
