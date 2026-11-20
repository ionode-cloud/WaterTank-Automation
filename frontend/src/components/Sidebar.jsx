import React from 'react';
import {
  LayoutDashboard,
  History,
  Droplets,
  Cpu,
  ShieldCheck,
  Globe,
  LogOut,
} from 'lucide-react';

const Sidebar = ({ currentPage = 'dashboard', onNavigate, onLogout }) => {
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

      {/* Main Navigation: Dashboard, Devices, History, Admin Console */}
      <nav className="sidebar-nav">
        <div
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('dashboard')}
          title="Overview & Live Controls"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div
          className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('devices')}
          title="Manage Hardware Devices"
        >
          <Cpu size={18} />
          <span>Devices</span>
        </div>

        <div
          className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('history')}
          title="Telemetry Data & Historical Records"
        >
          <History size={18} />
          <span>History</span>
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