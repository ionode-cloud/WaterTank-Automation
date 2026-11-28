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
  const isAdmin = currentUser && String(currentUser.role).toUpperCase() === 'ADMIN';

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
        {/* 1. Profile (Normal tab at top of Sidebar, only for Standard User, not Admin) */}
        {!isAdmin && (
          <div
            className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('profile')}
            title="My Profile & Account Details"
          >
            <User size={18} />
            <span>Profile</span>
          </div>
        )}

        {/* 2. Dashboard (Standard & Admin) */}
        <div
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('dashboard')}
          title="Overview & Live Controls"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        {/* 3. Devices (Standard & Admin) */}
        <div
          className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('devices')}
          title="Manage Hardware Devices"
        >
          <Cpu size={18} />
          <span>Devices</span>
        </div>

        {/* 4. User Registered Devices (Admin Only - Show right after Devices tab) */}
        {isAdmin && (
          <div
            className={`nav-item ${currentPage === 'user-devices' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('user-devices')}
            title="View & Approve User Registered Devices"
          >
            <Smartphone size={18} />
            <span>User Registered Devices</span>
          </div>
        )}

        {/* 5. History (Standard & Admin) */}
        <div
          className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('history')}
          title="Telemetry Data & Historical Records"
        >
          <History size={18} />
          <span>History</span>
        </div>

        {/* 6, 7, 8: OTHER ADMIN ONLY NAVIGATION ITEMS */}
        {isAdmin && (
          <>
            {/* Motor Models (Admin Only) */}
            <div
              className={`nav-item ${currentPage === 'models' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('models')}
              title="Motor Models & Category Specifications (Admin Only)"
            >
              <Layers size={18} />
              <span>Models</span>
            </div>

            {/* Registered Users */}
            <div
              className={`nav-item ${currentPage === 'registered-users' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('registered-users')}
              title="View & Manage Registered Users"
            >
              <Users size={18} />
              <span>Registered Users</span>
            </div>

            {/* Admin Console (JWT Credentials Management) */}
            <div
              className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('admin')}
              title="Admin Security & JWT Credentials"
            >
              <ShieldCheck size={18} />
              <span>Admin Console</span>
            </div>
          </>
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
