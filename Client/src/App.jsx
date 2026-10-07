import { useState } from 'react';
import ResourceCatalog from './components/ResourceCatalog';
import AdminInventory from './components/AdminInventory';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brandWrap}>
          <div style={styles.brandBadge}>CR</div>
          <div>
            <p style={styles.brandLabel}>Campus</p>
            <h2 style={styles.brandTitle}>Resource Hub</h2>
          </div>
        </div>

        <nav style={styles.nav}>
          <button type="button" style={{ ...styles.navButton, ...styles.activeNavButton }}>
            Dashboard
          </button>
          <button type="button" style={styles.navButton}>
            Resources
          </button>
          <button type="button" style={styles.navButton}>
            Bookings
          </button>
          <button type="button" style={styles.navButton}>
            Inventory
          </button>
          <button type="button" style={styles.navButton}>
            Reports
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button type="button" style={styles.switchButton} onClick={() => setIsAdmin((prev) => !prev)}>
            {isAdmin ? 'Switch to Student View' : 'Switch to Admin View'}
          </button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Campus Portal</p>
            <h1 style={styles.title}>Campus Resource Management</h1>
          </div>
        </header>

        {isAdmin ? <AdminInventory /> : <ResourceCatalog />}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#eef2f7',
    color: '#1f2937',
    fontFamily: 'Arial, sans-serif',
  },
  sidebar: {
    width: '260px',
    background: '#111827',
    color: '#f9fafb',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '10px 0 25px rgba(17, 24, 39, 0.18)',
  },
  brandWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  brandBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
  },
  brandLabel: {
    margin: 0,
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#cbd5e1',
  },
  brandTitle: {
    margin: '4px 0 0',
    fontSize: '1.2rem',
    color: '#ffffff',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  navButton: {
    background: 'transparent',
    border: 'none',
    color: '#dbe3f0',
    textAlign: 'left',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  activeNavButton: {
    background: '#1f2937',
    color: '#ffffff',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
  },
  sidebarFooter: {
    marginTop: '24px',
  },
  switchButton: {
    width: '100%',
    background: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 18px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    padding: '30px',
  },
  header: {
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
    padding: '24px 28px',
    marginBottom: '28px',
  },
  eyebrow: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#312e81',
    fontWeight: 800,
  },
  title: {
    margin: '8px 0 0',
    fontSize: '2.2rem',
    color: '#111827',
    fontWeight: 800,
  },
};

export default App;
