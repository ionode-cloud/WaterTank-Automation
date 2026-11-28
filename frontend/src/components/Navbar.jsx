import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Cpu,
  History,
  Droplets,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Layers,
  Users,
  Smartphone,
  Menu,
} from 'lucide-react';

const Navbar = ({
  currentPage = 'dashboard',
  onNavigate,
  onRefresh,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = String(currentUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';

  const canShowTab = (tabId) => {
    if (isAdmin) {
      return tabId !== 'profile';
    }
    if (isOperator) {
      const allowed = Array.isArray(currentUser?.allowedTabs)
        ? currentUser.allowedTabs
        : ['dashboard', 'devices', 'history'];
      return allowed.includes(tabId);
    }
    return tabId === 'profile' || tabId === 'dashboard' || tabId === 'devices' || tabId === 'history';
  };

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setRefreshing(false), 800;
    });
  };

  const getPageInfo = () => {
    switch (currentPage) {
      case 'dashboard':
        return {
          title: 'System Dashboard',
          subtitle: 'Live Telemetry & Water Automation Hub',
          icon: <LayoutDashboard size={19} className="page-icon-svg" />,
        };
      case 'devices':
        return {
          title: 'Device Management',
          subtitle: 'Hardware Nodes & Pump Controllers',
          icon: <Cpu size={19} className="page-icon-svg" />,
        };
      case 'history':
        return {
          title: 'Data & Telemetry Records',
          subtitle: 'Sensor History, Events & Analytics Log',
          icon: <History size={19} className="page-icon-svg" />,
        };
      case 'admin':
        return {
          title: 'Admin Console',
          subtitle: 'JWT Credentials & Security Management',
          icon: <ShieldCheck size={19} className="page-icon-svg" />,
        };
      default:
        return {
          title: 'WaterTank IoT',
          subtitle: 'Real-time Automation',
          icon: <Droplets size={19} className="page-icon-svg" />,
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="top-navbar-container">
      {/* 1. Left: Mobile Toggle & Active Tab Title */}
      <div className="navbar-left-brand">
        <button
          type="button"
          className="navbar-mobile-toggle"
          onClick={() => document.body.classList.toggle('sidebar-mobile-open')}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="navbar-page-icon-badge">
          {pageInfo.icon}
        </div>
        <div className="navbar-page-titles">
          <h1 className="navbar-title">{pageInfo.title}</h1>
          <span className="navbar-subtitle">{pageInfo.subtitle}</span>
        </div>
      </div>

      {/* Right: Clock, Refresh & Admin Profile */}
      <div className="navbar-right-controls">
        {/* Live Digital Clock */}
        <div className="navbar-clock-chip" title="Current Local Time">
          <Clock size={13} className="clock-icon" />
          <span className="clock-time">{timeStr}</span>
          <span className="clock-divider">•</span>
          <span className="clock-date">{dateStr}</span>
        </div>

        {/* Manual Refresh Button with rotation animation */}
        <button
          type="button"
          className={`navbar-action-btn ${refreshing ? 'is-spinning' : ''}`}
          onClick={handleManualRefresh}
          title="Refresh All System Data"
        >
          <RefreshCw size={15} />
        </button>

        {/* User / Admin Profile Chip */}
        {currentUser ? (
          <div className="navbar-user-dropdown-wrap" ref={dropdownRef}>
            <button
              type="button"
              className="navbar-user-chip"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-label="User account menu"
            >
              <div className="user-chip-avatar">
                {currentUser.picture ? (
                  <img
                    src={currentUser.picture}
                    alt={currentUser.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                  />
                ) : (
                  currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div className="user-info-text">
                <span className="user-name">{currentUser.name || 'User'}</span>
                {isAdmin ? (
                  <span className="user-role-badge">Admin</span>
                ) : isOperator ? (
                  <span className="user-role-badge" style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #5EEAD4' }}>
                    Operator
                  </span>
                ) : null}
              </div>
              <ChevronDown size={14} className="dropdown-caret" />
            </button>

            {userDropdownOpen && (
              <div className="navbar-user-menu animate-pop-in">
                <div className="user-menu-header">
                  <strong>{currentUser.name}</strong>
                  <span className="user-menu-email">{currentUser.email}</span>
                  <span className={`user-menu-role-tag ${isAdmin ? 'admin-tag' : isOperator ? 'operator-tag' : 'user-tag'}`}>
                    {isAdmin ? 'Administrator' : isOperator ? 'Operator' : 'Standard User'}
                  </span>
                </div>

                <div className="user-menu-divider"></div>
                <div className="user-menu-section-label">NAVIGATION</div>

                {canShowTab('dashboard') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'dashboard' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('dashboard');
                    }}
                  >
                    <LayoutDashboard size={15} />
                    <span>Dashboard</span>
                  </button>
                )}

                {canShowTab('devices') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'devices' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('devices');
                    }}
                  >
                    <Cpu size={15} />
                    <span>Devices</span>
                  </button>
                )}

                {canShowTab('user-devices') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'user-devices' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('user-devices');
                    }}
                  >
                    <Smartphone size={15} />
                    <span>User Registered Devices</span>
                  </button>
                )}

                {canShowTab('history') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'history' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('history');
                    }}
                  >
                    <History size={15} />
                    <span>History</span>
                  </button>
                )}

                {canShowTab('models') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'models' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('models');
                    }}
                  >
                    <Layers size={15} />
                    <span>Models</span>
                  </button>
                )}

                {canShowTab('registered-users') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'registered-users' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('registered-users');
                    }}
                  >
                    <Users size={15} />
                    <span>Registered Users</span>
                  </button>
                )}

                {canShowTab('admin') && (
                  <button
                    type="button"
                    className={`user-menu-item admin-menu-item ${currentPage === 'admin' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('admin');
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Admin Console</span>
                  </button>
                )}

                {canShowTab('profile') && (
                  <button
                    type="button"
                    className={`user-menu-item ${currentPage === 'profile' ? 'active-item' : ''}`}
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onNavigate) onNavigate('profile');
                    }}
                  >
                    <User size={15} />
                    <span>My Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onNavigate) onNavigate('landing');
                  }}
                >
                  <Droplets size={15} />
                  <span>Landing Page</span>
                </button>

                <div className="user-menu-divider"></div>

                <button
                  type="button"
                  className="user-menu-item text-danger"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Navbar;
