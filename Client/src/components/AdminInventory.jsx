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
          <table className="inventory-table" style={styles.table}>
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
