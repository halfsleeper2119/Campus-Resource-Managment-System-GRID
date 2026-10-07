import { useState } from 'react';
import ResourceCatalog from './components/ResourceCatalog';
import AdminInventory from './components/AdminInventory';
import './App.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const activeView = isAdmin ? 'inventory' : 'catalog';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="Campus Resource Hub home">
          <span className="brand-mark" aria-hidden="true">CR</span>
          <span className="brand-copy">
            <span className="brand-label">Campus operations</span>
            <span className="brand-title">Resource Hub</span>
          </span>
        </a>

        <div className="sidebar-section">
          <p className="sidebar-heading">Workspace</p>
          <nav className="side-nav" aria-label="Workspace">
            <button
              type="button"
              className={`nav-item ${activeView === 'catalog' ? 'is-active' : ''}`}
              onClick={() => setIsAdmin(false)}
              aria-current={activeView === 'catalog' ? 'page' : undefined}
            >
              <span className="nav-index">01</span>
              <span>Resource catalog</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === 'inventory' ? 'is-active' : ''}`}
              onClick={() => setIsAdmin(true)}
              aria-current={activeView === 'inventory' ? 'page' : undefined}
            >
              <span className="nav-index">02</span>
              <span>Inventory</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-indicator" aria-hidden="true" />
            <span>
              <strong>Campus services</strong>
              <small>Resource coordination</small>
            </span>
          </div>
          <button
            type="button"
            className="view-switch"
            onClick={() => setIsAdmin((prev) => !prev)}
          >
            {isAdmin ? 'Return to catalog' : 'Open admin view'}
          </button>
        </div>
      </aside>

      <main className="main-content" id="main">
        <header className="page-header">
          <div className="page-heading">
            <p className="eyebrow">Resource services <span>/</span> {isAdmin ? 'Administration' : 'Browse'}</p>
            <h1>{isAdmin ? 'Inventory management' : 'Resource catalog'}</h1>
            <p className="page-description">
              {isAdmin
                ? 'Maintain the spaces and equipment available across campus.'
                : 'Find the spaces and equipment available to your campus community.'}
            </p>
          </div>
          <div className="workspace-status"><span />Workspace active</div>
        </header>

        <div className="content-area">
          {isAdmin ? <AdminInventory /> : <ResourceCatalog />}
        </div>
      </main>
    </div>
  );
}

export default App;
