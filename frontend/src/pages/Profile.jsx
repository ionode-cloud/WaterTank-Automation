import React, { useState, useEffect, useCallback } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  Cpu,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Save,
  Smartphone,
  Key,
  Globe,
  RefreshCw,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getCurrentUser, updateUserProfile, getDevices } from '../services/api';

const Profile = ({
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState(currentUser || {});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Form Fields for Editing
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // User's Devices
  const [userDevices, setUserDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Fetch fresh profile & devices
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCurrentUser();
      if (res.data?.success && res.data.user) {
        const u = res.data.user;
        setProfile(u);
        setName(u.name || '');
        setPhone(u.phone || u.mobileNumber || '');
        setLocation(u.location || '');
      } else if (currentUser) {
        setProfile(currentUser);
        setName(currentUser.name || '');
        setPhone(currentUser.phone || currentUser.mobileNumber || '');
        setLocation(currentUser.location || '');
      }

      // Fetch user's devices
      setLoadingDevices(true);
      try {
        const devRes = await getDevices({ includePending: 'true' });
        if (devRes.data?.success && Array.isArray(devRes.data.data)) {
          setUserDevices(devRes.data.data);
        }
      } catch (devErr) {
        console.warn('Failed to load user devices on profile page:', devErr);
      } finally {
        setLoadingDevices(false);
      }
    } catch (err) {
      if (currentUser) {
        setProfile(currentUser);
        setName(currentUser.name || '');
        setPhone(currentUser.phone || currentUser.mobileNumber || '');
        setLocation(currentUser.location || '');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  const handleStartEditing = () => {
    setName(profile.name || '');
    setPhone(profile.phone || profile.mobileNumber || '');
    setLocation(profile.location || '');
    setIsEditing(true);
    setAlert(null);
  };

  const handleCancelEditing = () => {
    setName(profile.name || '');
    setPhone(profile.phone || profile.mobileNumber || '');
    setLocation(profile.location || '');
    setIsEditing(false);
    setAlert(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setAlert({ type: 'error', message: 'Full Name cannot be empty' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const res = await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
      });

      if (res.data?.success) {
        const updatedUser = res.data.user;
        const merged = { ...profile, ...updatedUser };
        setProfile(merged);
        setIsEditing(false);

        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('wt_user') || '{}');
        const updatedStorage = { ...stored, ...updatedUser };
        localStorage.setItem('wt_user', JSON.stringify(updatedStorage));

        if (onProfileUpdated) {
          onProfileUpdated(updatedStorage);
        }

        setAlert({
          type: 'success',
          message: 'Profile details updated successfully!',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const roleUpper = String(profile.role || 'USER').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN';
  const isGoogleUser = Boolean(profile.googleId);
  const initialLetter = (profile.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* 1. Sidebar with Profile active */}
      <Sidebar
        currentPage="profile"
        onNavigate={onNavigate}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      {/* 2. Main Content Area */}
      <div className="main-content">
        <Navbar
          currentPage="profile"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={handleGlobalRefresh}
        />

        <div className="profile-page-content">
          {/* Hero Banner Card */}
          <div className="dash-card profile-hero-card">
            <div className="profile-hero-left">
              <div className="profile-hero-avatar-wrap">
                {profile.picture ? (
                  <img
                    src={profile.picture}
                    alt={profile.name}
                    className="profile-hero-avatar-img"
                  />
                ) : (
                  <div className={`profile-hero-avatar-initial ${isAdmin ? 'admin-theme' : 'user-theme'}`}>
                    {initialLetter}
                  </div>
                )}
                <div className="profile-status-indicator active" title="Account Active" />
              </div>

              <div className="profile-hero-text">
                <div className="profile-title-row">
                  <h2>{profile.name || 'User Profile'}</h2>
                  <span className={`profile-badge-role ${isAdmin ? 'badge-admin' : 'badge-user'}`}>
                    {isAdmin ? <Shield size={12} /> : <UserIcon size={12} />}
                    <span>{isAdmin ? 'Administrator' : 'Standard User'}</span>
                  </span>
                  {isGoogleUser && (
                    <span className="profile-badge-google">
                      <Globe size={12} />
                      <span>Google Account</span>
                    </span>
                  )}
                </div>

                <div className="profile-sub-meta">
                  <span className="meta-username">@{profile.username || 'user'}</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-email">{profile.email}</span>
                  {profile.location && (
                    <>
                      <span className="meta-dot">•</span>
                      <span className="meta-location">
                        <MapPin size={12} />
                        <span>{profile.location}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-hero-actions">
              {!isEditing ? (
                <button
                  type="button"
                  className="btn-profile-hero-edit"
                  onClick={handleStartEditing}
                >
                  <Edit2 size={15} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-profile-hero-cancel"
                  onClick={handleCancelEditing}
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
              )}

              <button
                type="button"
                className={`btn-profile-refresh ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh Profile"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Alert Notification */}
          {alert && (
            <div className={`admin-notification-bar ${alert.type}`}>
              {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{alert.message}</span>
              <button type="button" className="close-alert-btn" onClick={() => setAlert(null)}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* Quick Metrics KPI Cards */}
          <div className="profile-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', width: '100%' }}>
            <div className="dash-card profile-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 22px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div className="kpi-icon-wrap purple" style={{ flexShrink: 0 }}>
                <ShieldCheck size={22} />
              </div>
              <div className="profile-kpi-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                <span className="profile-kpi-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: 1.2, margin: 0 }}>Account Privilege</span>
                <span className="profile-kpi-val" style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, margin: 0, marginTop: '2px' }}>{isAdmin ? 'Administrator' : 'Standard User'}</span>
              </div>
            </div>

            <div className="dash-card profile-kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 22px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div className="kpi-icon-wrap cyan" style={{ flexShrink: 0 }}>
                <Smartphone size={22} />
              </div>
              <div className="profile-kpi-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                <span className="profile-kpi-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: 1.2, margin: 0 }}>Assigned Devices</span>
                <span className="profile-kpi-val" style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, margin: 0, marginTop: '2px' }}>{userDevices.length}</span>
              </div>
            </div>
          </div>

          {/* Two-Column Main Content Layout */}
          <div className="profile-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '20px', alignItems: 'stretch' }}>
            {/* Left Column: Personal & Contact Details */}
            <div className="dash-card profile-details-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
              <div className="profile-section-title">
                <UserIcon size={18} className="text-teal" />
                <h3>Personal & Contact Information</h3>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="profile-full-form">
                  <div className="auth-input-group">
                    <label>Full Name</label>
                    <div className="auth-input-wrapper">
                      <UserIcon size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Email Address (Read-only)</label>
                    <div className="auth-input-wrapper input-disabled">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={profile.email || ''}
                        disabled
                        readOnly
                      />
                    </div>
                    <span className="form-hint">Email address cannot be modified directly</span>
                  </div>

                  <div className="auth-input-group">
                    <label>Phone / Mobile Number</label>
                    <div className="auth-input-wrapper">
                      <Phone size={16} className="auth-input-icon" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Location / Site / Facility</label>
                    <div className="auth-input-wrapper">
                      <MapPin size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Building C, Rooftop Tank, Mumbai"
                      />
                    </div>
                  </div>

                  <div className="profile-form-buttons-row">
                    <button
                      type="button"
                      className="btn-profile-cancel"
                      onClick={handleCancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-profile-save"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info-display-list">
                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <UserIcon size={14} /> Full Name
                    </span>
                    <span className="info-row-value">{profile.name || 'Unnamed User'}</span>
                  </div>

                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <Mail size={14} /> Email Address
                    </span>
                    <span className="info-row-value email-val">{profile.email}</span>
                  </div>

                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <Phone size={14} /> Mobile Number
                    </span>
                    <span className="info-row-value">
                      {profile.phone || profile.mobileNumber ? (
                        profile.phone || profile.mobileNumber
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </span>
                  </div>

                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <MapPin size={14} /> Location / Site
                    </span>
                    <span className="info-row-value">
                      {profile.location ? (
                        profile.location
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </span>
                  </div>

                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <Calendar size={14} /> Member Since
                    </span>
                    <span className="info-row-value">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="profile-info-row">
                    <span className="info-row-label">
                      <Key size={14} /> User ID Code
                    </span>
                    <span className="info-row-value code-val">{profile._id || profile.id || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Linked Hardware */}
            <div className="dash-card profile-devices-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
              <div className="profile-section-title between" style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} className="text-teal" />
                  <h3>My Registered Devices</h3>
                </div>
                <button
                  type="button"
                  className="btn-link-devices"
                  onClick={() => onNavigate && onNavigate('devices')}
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {loadingDevices ? (
                <div className="devices-loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '260px', padding: '36px 20px', gap: '12px', margin: 'auto 0' }}>
                  <Loader2 size={20} className="animate-spin text-teal" />
                  <span>Loading linked devices...</span>
                </div>
              ) : userDevices.length > 0 ? (
                <div className="profile-devices-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {userDevices.map((dev) => {
                    const isPending = dev.approvalStatus === 'PENDING';
                    return (
                      <div
                        key={dev.deviceId || dev._id}
                        className="profile-device-item"
                        onClick={() => {
                          if (!isPending && onNavigate) onNavigate('dashboard');
                        }}
                        title={isPending ? 'Pending approval by admin' : 'Click to view live telemetry on Dashboard'}
                        style={{ cursor: isPending ? 'default' : 'pointer' }}
                      >
                        <div className="p-dev-info-left">
                          <span className="p-dev-chip">{dev.deviceId}</span>
                          <span className="p-dev-title">{dev.name || 'Water Controller'}</span>
                        </div>
                        <div className="p-dev-info-right">
                          {dev.modelNumber && (
                            <span className="p-dev-model-chip">{dev.modelNumber}</span>
                          )}
                          {isPending ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              ⏳ Pending approval by admin
                            </span>
                          ) : (
                            <span className={`p-dev-status-pill status-${(dev.status || 'active').toLowerCase()}`}>
                              {dev.status || 'Active'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="profile-no-devices" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '260px', padding: '36px 20px', textAlign: 'center', gap: '14px', color: '#64748B', margin: 'auto 0' }}>
                  <Smartphone size={32} className="no-dev-icon" />
                  <p>No IoT devices registered yet.</p>
                  <button
                    type="button"
                    className="btn-register-device-link"
                    onClick={() => onNavigate && onNavigate('devices')}
                  >
                    <Smartphone size={14} />
                    <span>Register a Device ID</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
