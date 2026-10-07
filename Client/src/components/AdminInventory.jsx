import { useEffect, useState } from 'react';

const RESOURCE_API = 'http://localhost:5000/api/resources';

function AdminInventory() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'labs',
    isAvailable: true,
  });

  const fetchResources = async () => {
    try {
      const response = await fetch(RESOURCE_API);
      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${RESOURCE_API}/${editingId}` : RESOURCE_API;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Failed to save resource');
      }

      setForm({ name: '', category: 'labs', isAvailable: true });
      setEditingId(null);
      fetchResources();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleEdit = (resource) => {
    setEditingId(resource.id);
    setForm({
      name: resource.name,
      category: resource.category,
      isAvailable: resource.isAvailable,
    });
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${RESOURCE_API}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete resource');
      }

      fetchResources();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Admin Inventory</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
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

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            name="isAvailable"
            checked={form.isAvailable}
            onChange={handleChange}
          />
          Available
        </label>

        <button type="submit" style={styles.primaryButton}>
          {editingId ? 'Update Resource' : 'Add Resource'}
        </button>
      </form>

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Category</th>
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
                    {resource.isAvailable ? 'Available' : 'Unavailable'}
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => handleEdit(resource)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(resource.id)}
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
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
    padding: '24px',
  },
  heading: {
    margin: '0 0 16px',
    fontSize: '2rem',
    color: '#111827',
  },
  form: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr auto auto',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    fontSize: '0.95rem',
    color: '#111827',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#111827',
    fontWeight: 600,
  },
  primaryButton: {
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 18px',
    fontWeight: 700,
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
    color: '#374151',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#111827',
  },
  editButton: {
    background: '#e0e7ff',
    color: '#312e81',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    fontWeight: 700,
    cursor: 'pointer',
    marginRight: '8px',
  },
  deleteButton: {
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default AdminInventory;
