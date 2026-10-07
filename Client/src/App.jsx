import { useState } from 'react';
import ResourceCatalog from './components/ResourceCatalog';
import AdminInventory from './components/AdminInventory';
import AdminUsers from './components/AdminUsers';
import ManageUsers from './components/ManageUsers';
import Login from './components/Login';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [activeView, setActiveView] = useState('catalog');

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  const isAdmin = session.user.role === 'ADMIN';
  const visibleView = isAdmin
    ? activeView
    : activeView === 'settings' ? 'settings' : 'catalog';
  const pageDetails = {
    catalog: {
      section: 'Browse',
      title: 'Resource catalog',
      description: 'Find the spaces and equipment available to your campus community.',
    },
    inventory: {
      section: 'Administration',
      title: 'Inventory management',
      description: 'Maintain the spaces and equipment available across campus.',
    },
    users: {
      section: 'Administration',
      title: 'Create user',
      description: 'Create sign-in accounts for students and faculty.',
    },
    manageUsers: {
      section: 'Administration',
      title: 'Manage accounts',
      description: 'Search, update, or remove student and faculty accounts.',
    },
    settings: {
      section: 'Account',
      title: 'Settings',
      description: 'Manage your account security.',
    },
  }[visibleView];

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
              className={`nav-item ${visibleView === 'catalog' ? 'is-active' : ''}`}
              onClick={() => setActiveView('catalog')}
              aria-current={visibleView === 'catalog' ? 'page' : undefined}
            >
              <span className="nav-index">01</span>
              <span>Resource catalog</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`nav-item ${visibleView === 'inventory' ? 'is-active' : ''}`}
                onClick={() => setActiveView('inventory')}
                aria-current={visibleView === 'inventory' ? 'page' : undefined}
              >
                <span className="nav-index">02</span>
                <span>Inventory</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className={`nav-item ${visibleView === 'users' ? 'is-active' : ''}`}
                onClick={() => setActiveView('users')}
                aria-current={visibleView === 'users' ? 'page' : undefined}
              >
                <span className="nav-index">03</span>
                <span>Users</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className={`nav-item ${visibleView === 'manageUsers' ? 'is-active' : ''}`}
                onClick={() => setActiveView('manageUsers')}
                aria-current={visibleView === 'manageUsers' ? 'page' : undefined}
              >
                <span className="nav-index">04</span>
                <span>Manage accounts</span>
              </button>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-indicator" aria-hidden="true" />
            <span>
              <strong>{session.user.name}</strong>
              <small>{session.user.role.toLowerCase()}</small>
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="view-switch"
              onClick={() => setActiveView(visibleView === 'catalog' ? 'inventory' : 'catalog')}
            >
              {visibleView === 'catalog' ? 'Open admin view' : 'Return to catalog'}
            </button>
          )}
          {!isAdmin && (
            <button
              type="button"
              className={`view-switch ${visibleView === 'settings' ? 'is-active' : ''}`}
              aria-current={visibleView === 'settings' ? 'page' : undefined}
              onClick={() => setActiveView('settings')}
            >
              Settings
            </button>
          )}
          <button
            type="button"
            className="view-switch"
            onClick={() => {
              setActiveView('catalog');
              setSession(null);
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content" id="main">
        <header className="page-header">
          <div className="page-heading">
            <p className="eyebrow">
              Resource services <span>/</span> {pageDetails.section}
            </p>
            <h1>{pageDetails.title}</h1>
            <p className="page-description">{pageDetails.description}</p>
          </div>
          <div className="workspace-status"><span />Workspace active</div>
        </header>

        <div className="content-area">
          {visibleView === 'inventory' && isAdmin
            ? <AdminInventory token={session.token} />
            : visibleView === 'users' && isAdmin
              ? <AdminUsers token={session.token} />
              : visibleView === 'manageUsers' && isAdmin
                ? <ManageUsers token={session.token} />
                : visibleView === 'settings' && !isAdmin
                  ? <Settings token={session.token} />
                  : <ResourceCatalog token={session.token} />}
        </div>
      </main>
    </div>
  );
}

export default App;
