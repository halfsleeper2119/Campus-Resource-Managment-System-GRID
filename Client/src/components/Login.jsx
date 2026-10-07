import { useState } from 'react';
import './Login.css';
import RollNumberInput from './RollNumberInput';
import { ROLL_NUMBER_PATTERN } from '../utils/rollNumber';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function Login({ onLogin }) {
  const [accountType, setAccountType] = useState('student');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const credentials = {
      accountType,
      password: formData.get('password'),
      ...(accountType === 'student'
        ? { rollNumber }
        : { email: formData.get('email') }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to sign in.');
      }

      onLogin(result);
    } catch (error) {
      setNotice(error.message || 'Unable to reach the sign-in service.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAccountTypeChange(type) {
    setAccountType(type);
    setNotice('');
  }

  return (
    <main className="login-page">
      <section className="welcome-panel" aria-label="Campus Resource Hub">
        <a className="login-brand" href="/" aria-label="Campus Resource Hub home">
          <span className="login-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <path d="M4 14.5 18 7l14 7.5L18 22 4 14.5Z" />
              <path d="M9 18v7.5c5.4 4.1 12.6 4.1 18 0V18" />
              <path d="M32 15v9" />
            </svg>
          </span>
          <span>Campus<span className="brand-light">Hub</span></span>
        </a>

        <div className="welcome-copy">
          <p className="welcome-eyebrow">CAMPUS RESOURCE MANAGEMENT</p>
          <h1>Everything you need to make campus life work.</h1>
          <p className="welcome-description">
            One place to access the resources, spaces, and services that keep
            our campus moving.
          </p>
        </div>

        <div className="campus-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-building">
            <div className="building-roof" />
            <div className="building-front">
              <div className="building-window" />
              <div className="building-window" />
              <div className="building-door" />
              <div className="building-window" />
              <div className="building-window" />
            </div>
          </div>
          <div className="art-ground" />
          <div className="art-tree tree-left"><i /><i /><i /></div>
          <div className="art-tree tree-right"><i /><i /><i /></div>
        </div>

        <p className="welcome-footer">A better campus, together.</p>
      </section>

      <section className="form-panel" aria-labelledby="login-heading">
        <div className="login-card">
          <div className="mobile-brand login-brand" aria-label="Campus Resource Hub">
            <span className="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none">
                <path d="M4 14.5 18 7l14 7.5L18 22 4 14.5Z" />
                <path d="M9 18v7.5c5.4 4.1 12.6 4.1 18 0V18" />
                <path d="M32 15v9" />
              </svg>
            </span>
            <span>Campus<span className="brand-light">Hub</span></span>
          </div>
          <p className="form-eyebrow">WELCOME BACK</p>
          <h2 id="login-heading">Sign in to your account</h2>
          <p className="form-description">Use your campus credentials to continue.</p>

          <div className="account-switch" role="group" aria-label="Choose account type">
            <button
              type="button"
              className={accountType === 'student' ? 'account-option active' : 'account-option'}
              aria-pressed={accountType === 'student'}
              onClick={() => handleAccountTypeChange('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={accountType === 'faculty' ? 'account-option active' : 'account-option'}
              aria-pressed={accountType === 'faculty'}
              onClick={() => handleAccountTypeChange('faculty')}
            >
              Faculty &amp; staff
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {accountType === 'student' ? (
              <div className="form-field">
                <label htmlFor="roll-number">Student roll number</label>
                <RollNumberInput
                  id="roll-number"
                  name="rollNumber"
                  value={rollNumber}
                  onChange={setRollNumber}
                  placeholder="e.g. 22L-1234"
                  pattern={ROLL_NUMBER_PATTERN}
                  title="Enter two digits, one letter, a dash, and four digits (XXY-XXXX)."
                  autoComplete="username"
                  required
                />
                <span className="field-hint">Format: XXY-XXXX (e.g. 22L-1234)</span>
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="faculty-email">Email address</label>
                <input
                  id="faculty-email"
                  name="email"
                  type="email"
                  placeholder="name@university.edu"
                  autoComplete="username"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            {notice && <p className="form-notice" role="alert">{notice}</p>}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              {!isSubmitting && (
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h12M10 4l6 6-6 6" />
                </svg>
              )}
            </button>
          </form>

          <p className="admin-note">
            Need access? <span>Contact your campus administrator.</span>
          </p>
          <p className="security-note">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4.5" y="8.5" width="11" height="8" rx="1.5" />
              <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
            </svg>
            Authorized campus users only
          </p>
        </div>
        <footer className="page-footer">© 2026 Campus Resource Hub</footer>
      </section>
    </main>
  );
}

export default Login;
