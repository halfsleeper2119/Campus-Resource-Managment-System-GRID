function App() {
  const menuItems = [
    'Dashboard',
    'Resources',
    'Bookings',
    'Inventory',
    'Reports',
    'Settings',
  ];

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
          {menuItems.map((item, index) => (
            <button
              key={item}
              type="button"
              style={{
                ...styles.navButton,
                ...(index === 0 ? styles.activeNavButton : {}),
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button type="button" style={styles.loginButton}>
            Login
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

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>Available Resources</h2>
            <button type="button" style={styles.smallButton}>
              View All
            </button>
          </div>

          <div style={styles.resourceGrid}>
            <div style={styles.resourceItem}>Lab Room</div>
            <div style={styles.resourceItem}>Equipment</div>
            <div style={styles.resourceItem}>Study Space</div>
            <div style={styles.resourceItem}>Event Venue</div>
          </div>
        </section>
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
    position: 'relative',
    left: 0,
    animation: 'slideInLeft 0.5s ease-out',
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
    transition: 'all 0.2s ease',
  },
  activeNavButton: {
    background: '#1f2937',
    color: '#ffffff',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
  },
  sidebarFooter: {
    marginTop: '24px',
  },
  loginButton: {
    width: '100%',
    background: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 18px',
    fontSize: '1rem',
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
  card: {
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.9rem',
    color: '#111827',
  },
  smallButton: {
    background: '#e0e7ff',
    color: '#1f2a44',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  resourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '18px',
  },
  resourceItem: {
    background: '#eef2ff',
    border: '1px solid #dfe6ff',
    borderRadius: '12px',
    padding: '24px 18px',
    fontWeight: 700,
    color: '#1e1b4b',
    textAlign: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.04)',
  },
};

export default App;
