import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

const Navbar = ({
  currentPage = 'dashboard',
  onNavigate,
  onRefresh,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
      {/* 1. Left: Active Tab Title & Breadcrumb */}
      <div className="navbar-left-brand">
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
          <div className="navbar-user-dropdown-wrap">
            <button
              type="button"
              className="navbar-user-chip"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            >
              <div className="user-chip-avatar">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="user-info-text">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role-badge">{currentUser.role || 'Admin'}</span>
              </div>
              <ChevronDown size={14} className="dropdown-caret" />
            </button>

            {userDropdownOpen && (
              <div className="navbar-user-menu animate-pop-in">
                <div className="user-menu-header">
                  <strong>{currentUser.name}</strong>
                  <span className="user-menu-email">{currentUser.email}</span>
                </div>
                <div className="user-menu-divider"></div>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onNavigate) onNavigate('admin');
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Console</span>
                </button>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onNavigate) onNavigate('landing');
                  }}
                >
                  <Droplets size={16} />
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
                  <LogOut size={16} />
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
