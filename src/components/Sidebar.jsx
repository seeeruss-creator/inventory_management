import React from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard'    },
  { id: 'inventory', label: 'Inventory'    },
  { id: 'logs',      label: 'Transactions' },
  { id: 'accounts',  label: 'Accounts'     },
];

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  // Staff sees: Dashboard, Inventory, Transactions
  // Admin sees: Dashboard, Inventory, Transactions, Accounts
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin 
    ? NAV_ITEMS 
    : NAV_ITEMS.filter(item => item.id !== 'accounts');

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <span className="logo-letter">J</span>
        </div>
        <div className="brand">
          <h2>Joaquin's</h2>
          <p>Restaurant Inventory</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="btn-logout" style={{ width: '100%', marginTop: '8px' }} onClick={logout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
