import { useEffect, useState } from 'react';
import RollNumberInput from './RollNumberInput';
import { ROLL_NUMBER_PATTERN } from '../utils/rollNumber';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

async function getUsers(token, search, role) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (role) params.set('role', role);

  const response = await fetch(`${API_BASE_URL}/api/auth/users?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Unable to find accounts.');
  }

  return result;
}

function ManageUsers({ token }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [rollNumber, setRollNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [resultLimitReached, setResultLimitReached] = useState(false);

  useEffect(() => {
    let isActive = true;

    getUsers(token, '', '')
      .then((result) => {
        if (!isActive) return;
        setUsers(result.users);
        setResultLimitReached(result.users.length === result.limit);
      })
      .catch((error) => {
        if (isActive) setMessage({ type: 'error', text: error.message });
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  async function handleSearch(event) {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await getUsers(token, search, roleFilter);
      setUsers(result.users);
      setResultLimitReached(result.users.length === result.limit);
      setEditingUser(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to find accounts.' });
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(user) {
    setEditingUser({ ...user, name: user.name });
    setRollNumber(user.rollNumber || '');
    setShowPassword(false);
    setMessage(null);
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    if (password && new TextEncoder().encode(password).length > 72) {
      setMessage({ type: 'error', text: 'Password must be no more than 72 UTF-8 bytes.' });
      return;
    }

    const payload = {
      name: formData.get('name').trim(),
      ...(editingUser.role === 'STUDENT'
        ? { rollNumber: rollNumber.trim().toUpperCase() }
        : { email: formData.get('email').trim().toLowerCase() }),
      ...(password ? { password } : {}),
    };

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to update the account.');
      }

      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === result.user.id ? result.user : user
      )));
      setEditingUser(null);
      setMessage({ type: 'success', text: `Updated ${result.user.name}'s account.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to update the account.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Permanently delete ${user.name}'s ${user.role.toLowerCase()} account?`)) {
      return;
    }

    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to delete the account.');
      }

      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
      if (editingUser?.id === user.id) setEditingUser(null);
      setMessage({ type: 'success', text: `Deleted ${user.name}'s account.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete the account.' });
    }
  }

  return (
    <section className="account-directory">
      <div className="account-directory-heading">
        <div>
          <p className="user-management-kicker">ACCOUNT ADMINISTRATION</p>
          <h2>Search and manage accounts</h2>
          <p>Find students or faculty by name, roll number, or email address.</p>
        </div>
      </div>

      <form className="account-search" onSubmit={handleSearch}>
        <label className="account-search-query">
          <span>Search accounts</span>
          <input
            type="search"
            value={search}
            maxLength="120"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, roll number, or email"
          />
        </label>
        <label className="account-search-role">
          <span>Account type</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">Students and faculty</option>
            <option value="STUDENT">Students</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </label>
        <button className="user-submit" type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {message && (
        <p className={`user-form-message ${message.type}`} role="status">
          {message.text}
        </p>
      )}

      {isLoading ? (
        <p className="account-directory-empty">Loading accounts...</p>
      ) : users.length === 0 ? (
        <p className="account-directory-empty">No matching student or faculty accounts.</p>
      ) : (
        <>
          <div className="account-table-wrap">
            <table className="account-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Login ID</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.role === 'STUDENT' ? 'Student' : 'Faculty'}</td>
                    <td>{user.rollNumber || user.email}</td>
                    <td className="account-actions">
                      <button type="button" onClick={() => startEditing(user)}>Edit</button>
                      <button
                        type="button"
                        className="account-delete"
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultLimitReached && (
            <p className="user-field-hint">
              Showing the first 100 matches. Add a search term to narrow the results.
            </p>
          )}
        </>
      )}

      {editingUser && (
        <form key={editingUser.id} className="account-edit-form" onSubmit={handleUpdate}>
          <div className="account-edit-heading">
            <div>
              <p className="user-management-kicker">EDIT ACCOUNT</p>
              <h3>{editingUser.name}</h3>
            </div>
            <button type="button" className="account-cancel" onClick={() => setEditingUser(null)}>
              Cancel
            </button>
          </div>

          <label className="user-form-field">
            <span>Full name</span>
            <input name="name" defaultValue={editingUser.name} maxLength="120" required />
          </label>

          {editingUser.role === 'STUDENT' ? (
            <label className="user-form-field">
              <span>Student roll number</span>
              <RollNumberInput
                name="rollNumber"
                value={rollNumber}
                onChange={setRollNumber}
                pattern={ROLL_NUMBER_PATTERN}
                title="Enter two digits, one letter, a dash, and four digits (XXY-XXXX)."
                required
              />
              <span className="user-field-hint">Format: XXY-XXXX</span>
            </label>
          ) : (
            <label className="user-form-field">
              <span>Faculty email address</span>
              <input
                name="email"
                type="email"
                defaultValue={editingUser.email}
                autoComplete="email"
                required
              />
            </label>
          )}

          <label className="user-form-field">
            <span>New password <span className="optional-label">(optional)</span></span>
            <div className="account-edit-password">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                minLength="6"
                autoComplete="new-password"
                placeholder="Leave blank to keep the current password"
              />
              <button
                type="button"
                className="account-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="user-field-hint">If provided, use 6–72 UTF-8 bytes.</span>
          </label>

          <div className="account-edit-actions">
            <button className="user-submit" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              className="account-delete"
              type="button"
              onClick={() => handleDelete(editingUser)}
            >
              Delete account
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default ManageUsers;
