import React from 'react';
import {
  User,
  LayoutDashboard,
  Layers,
  History,
  Droplets,
  Cpu,
  ShieldCheck,
  Globe,
  LogOut,
  Users,
  Smartphone,
} from 'lucide-react';

const Sidebar = ({
  currentPage = 'dashboard',
  onNavigate,
  onLogout,
  currentUser = null,
}) => {
  const role = String(currentUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';

  // Role-based Tab Visibility Helper
  const canShowTab = (tabId) => {
    if (isAdmin) {
      // Admins see all tabs except Profile
      return tabId !== 'profile';
    }
    if (isOperator) {
      // Operators see strictly the tabs checked by the Administrator for their registered ID/account
      const allowed = Array.isArray(currentUser?.allowedTabs)
        ? currentUser.allowedTabs
        : ['dashboard', 'devices', 'history'];
      return allowed.includes(tabId);
    }
    // Standard User: Profile, Dashboard, Devices, History
    return tabId === 'profile' || tabId === 'dashboard' || tabId === 'devices' || tabId === 'history';
  };

  return (
    <aside className="sidebar">
      {/* Brand Logo & Name */}
      <div
        className="sidebar-brand"
        onClick={() => onNavigate && onNavigate('landing')}
        style={{ cursor: 'pointer' }}
        title="Go to Landing Page"
      >
        <div className="sidebar-logo-icon">
          <Droplets size={22} color="#FFFFFF" />
        </div>
        <span className="sidebar-title">WaterTank</span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {/* 1. Profile (Normal tab at top of Sidebar, only for Standard User or Operator granted profile) */}
        {canShowTab('profile') && (
          <div
            className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('profile')}
            title="My Profile & Account Details"
          >
            <User size={18} />
            <span>Profile</span>
          </div>
        )}

        {/* 2. Dashboard */}
        {canShowTab('dashboard') && (
          <div
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('dashboard')}
            title="Overview & Live Controls"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
        )}

        {/* 3. Devices */}
        {canShowTab('devices') && (
          <div
            className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('devices')}
            title="Manage Hardware Devices"
          >
            <Cpu size={18} />
            <span>Devices</span>
          </div>
        )}

        {/* 4. User Registered Devices */}
        {canShowTab('user-devices') && (
          <div
            className={`nav-item ${currentPage === 'user-devices' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('user-devices')}
            title="View & Approve User Registered Devices"
          >
            <Smartphone size={18} />
            <span>User Registered Devices</span>
          </div>
        )}

        {/* 5. History */}
        {canShowTab('history') && (
          <div
            className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('history')}
            title="Telemetry Data & Historical Records"
          >
            <History size={18} />
            <span>History</span>
          </div>
        )}

        {/* 6. Motor Models */}
        {canShowTab('models') && (
          <div
            className={`nav-item ${currentPage === 'models' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('models')}
            title="Motor Models & Category Specifications"
          >
            <Layers size={18} />
            <span>Models</span>
          </div>
        )}

        {/* 7. Registered Users */}
        {canShowTab('registered-users') && (
          <div
            className={`nav-item ${currentPage === 'registered-users' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('registered-users')}
            title="View & Manage Registered Users"
          >
            <Users size={18} />
            <span>Registered Users</span>
          </div>
        )}

        {/* 8. Admin Console (JWT Credentials Management) */}
        {canShowTab('admin') && (
          <div
            className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('admin')}
            title="Admin Security & JWT Credentials"
          >
            <ShieldCheck size={18} />
            <span>Admin Console</span>
          </div>
        )}
      </nav>

      {/* Bottom Section (Pinned to the end bottom of the sidebar) */}
      <div className="sidebar-footer">
        {/* Back to Landing Page shortcut */}
        <div
          className={`nav-item ${currentPage === 'landing' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('landing')}
          title="Public Landing Page"
        >
          <Globe size={18} />
          <span>Landing Page</span>
        </div>

        {/* Logout Button pinned at the end bottom */}
        <div
          className="nav-item nav-item-logout"
          onClick={() => onLogout && onLogout()}
          title="Sign Out of Session"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
