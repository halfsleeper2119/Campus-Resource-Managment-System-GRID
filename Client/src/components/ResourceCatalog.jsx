import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RESOURCE_API = `${API_BASE_URL}/api/resources`;

function ResourceCatalog({ token }) {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch resources when the page loads or the category changes.
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);

        const url = category === 'all'
          ? RESOURCE_API
          : `${RESOURCE_API}?category=${encodeURIComponent(category)}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || 'Failed to load resources.');
        }

        const data = await response.json();
        setResources(data);
        setError('');
      } catch (fetchError) {
        console.error('Error loading resources:', fetchError);
        setError(fetchError.message || 'Could not load resources.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [category, token]);

  const categories = ['all', 'labs', 'meeting rooms', 'hardware', 'sports equipment'];

  return (
    <section className="catalog-panel" style={styles.card}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Available Resources</h2>

        <select
          className="catalog-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.select}
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All Categories' : option}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p>Loading resources...</p>
      ) : resources.length === 0 ? (
        <p>No resources found for this category.</p>
      ) : (
        <div className="resource-grid" style={styles.grid}>
          {resources.map((resource) => (
            <div key={resource.id} className="resource-tile" style={styles.resourceCard}>
              <div className="resource-category" style={styles.badge}>{resource.category}</div>
              <h3 style={styles.resourceName}>{resource.name}</h3>
              <p className="resource-details">
                {['labs', 'meeting rooms'].includes(resource.category)
                  ? `Booking windows: ${resource.timeSlots?.map((slot) => slot.replace('-', ' to ')).join(', ') || 'Not set'}`
                  : `Quantity: ${resource.quantity ?? 0} units`}
              </p>
              <p className="resource-status" style={styles.status}>
                {resource.isAvailable ? 'Available' : 'Unavailable'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  card: {
    background: 'transparent',
    borderRadius: '0',
    boxShadow: 'none',
    padding: '0',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '1.45rem',
    color: '#26352e',
    fontWeight: 500,
  },
  select: {
    padding: '8px 34px 8px 11px',
    borderRadius: '2px',
    border: '1px solid #cbd3cd',
    backgroundColor: '#ffffff',
    color: '#26352e',
    fontSize: '0.85rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  resourceCard: {
    background: '#ffffff',
    border: '1px solid #dce2dc',
    borderRadius: '3px',
    padding: '18px 20px',
    minHeight: '164px',
  },
  badge: {
    display: 'inline-block',
    background: '#edf2ed',
    color: '#203c32',
    borderRadius: '2px',
    padding: '4px 7px',
    fontSize: '0.68rem',
    fontWeight: 700,
    marginBottom: '12px',
    textTransform: 'capitalize',
  },
  resourceName: {
    margin: '0 0 12px',
    color: '#26352e',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '1.35rem',
    fontWeight: 400,
  },
  status: {
    margin: 0,
    fontWeight: 600,
    color: '#426b56',
    fontSize: '0.82rem',
  },
};

export default ResourceCatalog;
