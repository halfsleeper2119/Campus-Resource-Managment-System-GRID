import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RESOURCE_API = `${API_BASE_URL}/api/resources`;

async function loadInventory(token) {
  const response = await fetch(RESOURCE_API, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.message || 'Failed to load inventory.');
  }

  return response.json();
}

function AdminInventory({ token }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [form, setForm] = useState({
    name: '',
    category: 'labs',
    isAvailable: true,
    timeSlots: [],
    quantity: '',
  });
  const isRoom = ['labs', 'meeting rooms'].includes(form.category);

  const fetchResources = useCallback(async () => {
    try {
      setResources(await loadInventory(token));
    } catch (error) {
      console.error('Error loading inventory:', error);
      setMessage(error.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isActive = true;

    loadInventory(token)
      .then((data) => {
        if (isActive) setResources(data);
      })
      .catch((error) => {
        console.error('Error loading inventory:', error);
        if (isActive) setMessage(error.message || 'Could not load inventory.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'category' ? { timeSlots: [], quantity: '' } : {}),
    }));
  };

  const addTimeSlot = () => {
    setMessage('');

    if (!startTime || !endTime || endTime <= startTime) {
      setMessage('Choose an end time later than the start time.');
      return;
    }

    const overlaps = form.timeSlots.some((slot) => {
      const [existingStart, existingEnd] = slot.split('-');
      return startTime < existingEnd && endTime > existingStart;
    });

    if (overlaps) {
      setMessage('That time overlaps an existing slot.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, `${startTime}-${endTime}`].sort(),
    }));
  };

  const removeTimeSlot = (slotToRemove) => {
    setForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((slot) => slot !== slotToRemove),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${RESOURCE_API}/${editingId}` : RESOURCE_API;
      const payload = {
        ...form,
        name: form.name.trim(),
        timeSlots: isRoom ? form.timeSlots : [],
        quantity: isRoom ? null : Number(form.quantity),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to save resource.');
      }

      setForm({ name: '', category: 'labs', isAvailable: true, timeSlots: [], quantity: '' });
      setEditingId(null);
      setMessage('Resource saved.');
      await fetchResources();
    } catch (error) {
      console.error('Save failed:', error);
      setMessage(error.message || 'Could not save the resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (resource) => {
    setEditingId(resource.id);
    setForm({
      name: resource.name,
      category: resource.category,
      isAvailable: resource.isAvailable,
      timeSlots: resource.timeSlots || [],
      quantity: resource.quantity ?? '',
    });
    setMessage('');
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${RESOURCE_API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete resource.');
      }

      fetchResources();
    } catch (error) {
      console.error('Delete failed:', error);
      setMessage(error.message || 'Could not delete the resource.');
    }
  };

  return (
    <section className="inventory-panel" style={styles.section}>
      <h2 style={styles.heading}>Admin Inventory</h2>

      <form className="inventory-form" onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          name="name"
          placeholder="Resource name"
          value={form.name}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="labs">Labs</option>
          <option value="meeting rooms">Meeting Rooms</option>
          <option value="hardware">Hardware</option>
          <option value="sports equipment">Sports Equipment</option>
        </select>

        {isRoom ? (
          <div className="slot-editor">
            <div className="slot-entry">
              <label>
                Start time
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </label>
              <label>
                End time
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </label>
              <button type="button" className="add-slot" onClick={addTimeSlot}>Add slot</button>
            </div>
            <div className="time-slot-list" aria-live="polite">
              {form.timeSlots.length === 0 ? (
                <span className="slot-hint">Add the daily booking windows for this resource.</span>
              ) : form.timeSlots.map((slot) => (
                <span className="time-slot-chip" key={slot}>
                  {slot.replace('-', ' to ')}
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(slot)}
                    aria-label={`Remove ${slot.replace('-', ' to ')} slot`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <label className="quantity-field">
            Quantity
            <input
              type="number"
              name="quantity"
              min="1"
              step="1"
              value={form.quantity}
              onChange={handleChange}
              placeholder="Available units"
              required
            />
          </label>
        )}

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            name="isAvailable"
            checked={form.isAvailable}
            onChange={handleChange}
          />
          Available
        </label>

        <button type="submit" style={styles.primaryButton} disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Update Resource' : 'Add Resource'}
        </button>
      </form>

      {message && <p className="inventory-message" role="status">{message}</p>}

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div style={styles.tableWrap}>
          <table className="inventory-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Booking details</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td style={styles.td}>{resource.name}</td>
                  <td style={styles.td}>{resource.category}</td>
                  <td style={styles.td}>
                    {['labs', 'meeting rooms'].includes(resource.category)
                      ? (resource.timeSlots?.map((slot) => slot.replace('-', ' to ')).join(', ') || 'No slots set')
                      : `${resource.quantity ?? 0} units`}
                  </td>
                  <td style={styles.td}>
                    {resource.isAvailable ? 'Available' : 'Unavailable'}
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => handleEdit(resource)}
                      className="edit-action"
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(resource.id)}
                      className="delete-action"
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    background: 'transparent',
    borderRadius: '0',
    boxShadow: 'none',
    padding: '0',
  },
  heading: {
    margin: '0 0 20px',
    fontSize: '1.45rem',
    color: '#26352e',
    fontWeight: 500,
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'minmax(200px, 2fr) minmax(165px, 1.5fr) auto auto',
    gap: '10px',
    marginBottom: '22px',
    alignItems: 'center',
  },
  input: {
    padding: '9px 11px',
    borderRadius: '2px',
    border: '1px solid #cbd3cd',
    fontSize: '0.88rem',
    color: '#26352e',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#426b56',
    fontWeight: 600,
    fontSize: '0.84rem',
  },
  primaryButton: {
    background: '#203c32',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    padding: '10px 15px',
    fontWeight: 600,
    fontSize: '0.84rem',
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#69766f',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#26352e',
  },
  editButton: {
    background: '#e9f0e8',
    color: '#203c32',
    border: 'none',
    borderRadius: '2px',
    padding: '7px 9px',
    fontWeight: 700,
    cursor: 'pointer',
    marginRight: '8px',
  },
  deleteButton: {
    background: '#f7ebe6',
    color: '#9b452e',
    border: 'none',
    borderRadius: '2px',
    padding: '7px 9px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default AdminInventory;
