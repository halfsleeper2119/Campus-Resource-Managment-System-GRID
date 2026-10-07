import { useEffect, useState } from 'react';

const RESOURCE_API = 'http://localhost:5000/api/resources';

function ResourceCatalog() {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch resources when the page loads or the category changes.
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);

        const url = category === 'all'
          ? RESOURCE_API
          : `${RESOURCE_API}?category=${encodeURIComponent(category)}`;

        const response = await fetch(url);
        const data = await response.json();
        setResources(data);
      } catch (error) {
        console.error('Error loading resources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [category]);

  const categories = ['all', 'labs', 'meeting rooms', 'hardware', 'sports equipment'];

  return (
    <section style={styles.card}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Available Resources</h2>

        <select
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

      {loading ? (
        <p>Loading resources...</p>
      ) : resources.length === 0 ? (
        <p>No resources found for this category.</p>
      ) : (
        <div style={styles.grid}>
          {resources.map((resource) => (
            <div key={resource.id} style={styles.resourceCard}>
              <div style={styles.badge}>{resource.category}</div>
              <h3 style={styles.resourceName}>{resource.name}</h3>
              <p style={styles.status}>
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
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
    padding: '24px',
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
    fontSize: '1.9rem',
    color: '#111827',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  resourceCard: {
    background: '#eef2ff',
    border: '1px solid #dfe6ff',
    borderRadius: '12px',
    padding: '18px',
    minHeight: '140px',
  },
  badge: {
    display: 'inline-block',
    background: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: '12px',
    textTransform: 'capitalize',
  },
  resourceName: {
    margin: '0 0 12px',
    color: '#111827',
    fontSize: '1.2rem',
  },
  status: {
    margin: 0,
    fontWeight: 700,
    color: '#0f766e',
  },
};

export default ResourceCatalog;
