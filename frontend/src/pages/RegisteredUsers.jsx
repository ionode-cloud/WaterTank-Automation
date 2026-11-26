import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Edit2,
  Trash2,
  Key,
  Mail,
  User as UserIcon,
  Smartphone,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Lock,
  Globe,
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  getAllRegisteredUsers,
  updateRegisteredUser,
  resetUserPassword,
  deleteRegisteredUser,
} from '../services/api';

const RegisteredUsers = ({
  onNavigate,
  onOpenAuth,
  currentUser,
  onLogout,
  onOpenProfile,
}) => {
  // Alert State
  const [alert, setAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Users State
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;

  // Modals State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedRegUser, setSelectedRegUser] = useState(null);
  const [userModalLoading, setUserModalLoading] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    mobileNumber: '',
    location: '',
    role: 'USER',
    isActive: true,
  });

  const [resetPwdInput, setResetPwdInput] = useState('');

  // Fetch Users
  const fetchRegisteredUsersList = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await getAllRegisteredUsers();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRegisteredUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load registered users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchRegisteredUsersList();
  }, [fetchRegisteredUsersList]);

  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    await fetchRegisteredUsersList();
    setRefreshing(false);
  };

  // Handlers
  const openEditUserModal = (u) => {
    setSelectedRegUser(u);
    setUserFormData({
      name: u.name || '',
      username: u.username || '',
      mobileNumber: u.mobileNumber || u.phone || '',
      location: u.location || '',
      role: String(u.role || 'USER').toUpperCase(),
      isActive: u.isActive !== false,
    });
    setShowEditUserModal(true);
  };

  const handleUpdateRegUser = async (e) => {
    e.preventDefault();
    if (!selectedRegUser) return;
    setUserModalLoading(true);
    try {
      const res = await updateRegisteredUser(selectedRegUser._id, userFormData);
      if (res.data?.success) {
        setAlert({ type: 'success', message: `User ${userFormData.name} updated successfully.` });
        setShowEditUserModal(false);
        fetchRegisteredUsersList();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update user',
      });
    } finally {
      setUserModalLoading(false);
    }
  };

  const openResetPwdModal = (u) => {
    setSelectedRegUser(u);
    setResetPwdInput('');
    setShowResetPwdModal(true);
  };

  const handleResetUserPassword = async (e) => {
    e.preventDefault();
    if (!selectedRegUser || !resetPwdInput) return;
    setUserModalLoading(true);
    try {
      const res = await resetUserPassword(selectedRegUser._id, { newPassword: resetPwdInput });
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message: `Password reset successfully for ${selectedRegUser.email}.`,
        });
        setShowResetPwdModal(false);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setUserModalLoading(false);
    }
  };

  const openDeleteUserModal = (u) => {
    setSelectedRegUser(u);
    setShowDeleteUserModal(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedRegUser) return;
    setUserModalLoading(true);
    try {
      const res = await deleteRegisteredUser(selectedRegUser._id);
      if (res.data?.success) {
        setAlert({ type: 'success', message: `User ${selectedRegUser.name} deleted successfully.` });
        setShowDeleteUserModal(false);
        fetchRegisteredUsersList();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete user',
      });
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleToggleUserActive = async (u) => {
    try {
      const newStatus = !u.isActive;
      await updateRegisteredUser(u._id, { isActive: newStatus });
      setAlert({
        type: 'success',
        message: `User ${u.name} is now ${newStatus ? 'Active' : 'Disabled'}.`,
      });
      fetchRegisteredUsersList();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change user status',
      });
    }
  };

  // Filtered Users (Strictly show regular registered users; exclude Admin Console administrators)
  const regularUsersOnly = registeredUsers.filter((u) => String(u.role).toUpperCase() !== 'ADMIN');

  const filteredUsers = regularUsersOnly.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.mobileNumber && u.mobileNumber.toLowerCase().includes(term)) ||
      (u.location && u.location.toLowerCase().includes(term));

    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && u.isActive !== false) ||
      (userStatusFilter === 'disabled' && u.isActive === false) ||
      (userStatusFilter === 'google' && Boolean(u.googleId));

    return matchesSearch && matchesStatus;
  });

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const userStartIndex = (userPage - 1) * userPageSize;
  const paginatedUsers = filteredUsers.slice(userStartIndex, userStartIndex + userPageSize);

  return (
    <div className="app-container">
      {/* Sidebar with Registered Users active */}
      <Sidebar currentPage="registered-users" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          currentPage="registered-users"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={handleGlobalRefresh}
          onOpenProfile={onOpenProfile}
        />

        <div className="admin-console-page">
          {/* Header Hero Card */}
          <div className="admin-hero-card">
            <div className="admin-hero-content">
              <div className="admin-shield-bubble">
                <Users size={28} className="shield-icon" />
              </div>
              <div>
                <h2>Registered Users Management</h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                  View, filter, and manage all registered user accounts and their account status
                </p>
              </div>
            </div>

            <div className="admin-hero-actions">
              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh registered users list"
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
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

          {/* Stats KPI Row */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap purple">
                <Users size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Registered Users</span>
                <span className="kpi-val">{regularUsersOnly.length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap emerald">
                <CheckCircle2 size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Active Users</span>
                <span className="kpi-val">{regularUsersOnly.filter((u) => u.isActive !== false).length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap cyan">
                <Globe size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Google Accounts</span>
                <span className="kpi-val">{regularUsersOnly.filter((u) => Boolean(u.googleId)).length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap orange">
                <Smartphone size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Assigned Devices</span>
                <span className="kpi-val">
                  {regularUsersOnly.reduce((sum, u) => sum + (u.assignedDeviceCount || (Array.isArray(u.assignedDevices) ? u.assignedDevices.length : 0)), 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Users Table Card */}
          <div className="dash-card admin-table-card">
            {/* Search & Filter Toolbar */}
            <div className="admin-table-controls">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search users by name, username, email, phone, location..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setUserPage(1);
                  }}
                />
              </div>

              <div className="role-filter-wrap">
                <Filter size={15} className="filter-icon" />
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                >
                  <option value="all">All Registered Users</option>
                  <option value="active">Active Accounts</option>
                  <option value="disabled">Disabled Accounts</option>
                  <option value="google">Google Accounts</option>
                </select>
              </div>

              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh table data"
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingUsers ? (
              <div className="admin-table-loading">
                <Loader2 size={32} className="animate-spin text-teal-600" />
                <p>Loading registered user accounts...</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="admin-table-empty">
                <Users size={44} className="empty-icon" />
                <h3>No Registered Users Found</h3>
                <p>No user accounts matched the filter criteria.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-credentials-table admin-users-table">
                  <thead>
                    <tr>
                      <th>User Profile</th>
                      <th>Contact Details</th>
                      <th>Location / Site</th>
                      <th>Auth Method</th>
                      <th>Devices</th>
                      <th>Account Status</th>
                      <th>Registered</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => {
                      const deviceCount = u.assignedDeviceCount || (Array.isArray(u.assignedDevices) ? u.assignedDevices.length : 0);
                      const isGoogleUser = Boolean(u.googleId);

                      return (
                        <tr key={u._id}>
                          <td>
                            <div className="user-profile-cell">
                              <div className="user-avatar-circle">
                                {u.picture ? (
                                  <img src={u.picture} alt={u.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                  (u.name ? u.name.charAt(0).toUpperCase() : 'U')
                                )}
                              </div>
                              <div className="user-name-box">
                                <span className="user-primary-name">{u.name || 'Unnamed User'}</span>
                                <span className="user-username-tag">@{u.username || 'user'}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="contact-details-cell">
                              <span className="contact-item">
                                <Mail size={13} className="text-slate-400" />
                                <span>{u.email}</span>
                              </span>
                              {(u.mobileNumber || u.phone) && (
                                <span className="contact-item">
                                  <Phone size={13} className="text-slate-400" />
                                  <span>{u.mobileNumber || u.phone}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="location-cell">
                              <MapPin size={13} className="text-slate-400" />
                              <span>{u.location || 'Not Specified'}</span>
                            </div>
                          </td>

                          <td>
                            {isGoogleUser ? (
                              <span className="role-badge role-user" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                <Globe size={12} />
                                <span>Google Auth</span>
                              </span>
                            ) : (
                              <span className="role-badge role-user">
                                <Mail size={12} />
                                <span>Email & Password</span>
                              </span>
                            )}
                          </td>

                          <td>
                            <span className="device-count-pill" title={`${deviceCount} devices assigned`}>
                              <Smartphone size={13} />
                              <span>{deviceCount}</span>
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className={`status-pill-toggle ${u.isActive !== false ? 'status-active' : 'status-disabled'}`}
                              onClick={() => handleToggleUserActive(u)}
                              title="Click to toggle user status"
                            >
                              <span className="status-indicator-dot"></span>
                              <span>{u.isActive !== false ? 'Active' : 'Disabled'}</span>
                            </button>
                          </td>

                          <td>
                            <div className="created-at-cell">
                              <Clock size={13} className="text-slate-400" />
                              <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </td>

                          <td>
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="action-btn-edit"
                                onClick={() => openEditUserModal(u)}
                                title="Edit User Details & Role"
                              >
                                <Edit2 size={15} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-reset-pwd"
                                onClick={() => openResetPwdModal(u)}
                                title="Reset User Password"
                              >
                                <Key size={14} />
                              </button>
                              <button
                                type="button"
                                className="action-btn-delete"
                                onClick={() => openDeleteUserModal(u)}
                                title="Delete User Account"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredUsers.length > userPageSize && (
              <div className="table-pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Showing {userStartIndex + 1}–{Math.min(userStartIndex + userPageSize, filteredUsers.length)} of {filteredUsers.length} users
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={userPage === 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="page-nav-btn"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="page-indicator">Page {userPage} of {totalUserPages}</span>
                  <button
                    type="button"
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    className="page-nav-btn"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: EDIT REGISTERED USER */}
      {showEditUserModal && selectedRegUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowEditUserModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-header-title">
                <Users size={20} className="auth-title-icon" />
                <h3>Edit Registered User</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowEditUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRegUser} className="auth-form-body">
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Username</label>
                <div className="auth-input-wrapper">
                  <span style={{ padding: '0 8px', color: '#94A3B8', fontWeight: 700 }}>@</span>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Mobile Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    value={userFormData.mobileNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, mobileNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Location / Site</label>
                <div className="auth-input-wrapper">
                  <MapPin size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    value={userFormData.location}
                    onChange={(e) => setUserFormData({ ...userFormData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 600, color: '#334155' }}>Account Active and Enabled</span>
                </label>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={userModalLoading}>
                {userModalLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Save User Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET USER PASSWORD */}
      {showResetPwdModal && selectedRegUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowResetPwdModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-header-title">
                <Key size={20} className="auth-title-icon" />
                <h3>Reset User Password</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowResetPwdModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetUserPassword} className="auth-form-body">
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                Set a new password for <strong>{selectedRegUser.name}</strong> (<code>{selectedRegUser.email}</code>).
              </p>

              <div className="auth-input-group">
                <label>New Password (min. 6 characters)</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={resetPwdInput}
                    onChange={(e) => setResetPwdInput(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={userModalLoading || resetPwdInput.length < 6}>
                {userModalLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE REGISTERED USER CONFIRMATION */}
      {showDeleteUserModal && selectedRegUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowDeleteUserModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-box">
              <div className="delete-icon-bubble">
                <Trash2 size={28} className="trash-icon" />
              </div>
              <h3>Delete User Account?</h3>
              <p>
                Are you sure you want to permanently delete user{' '}
                <strong>{selectedRegUser.name}</strong> (<code>{selectedRegUser.email}</code>)? All owned device assignments will be unlinked.
              </p>
              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowDeleteUserModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-delete"
                  onClick={handleDeleteUserConfirm}
                  disabled={userModalLoading}
                >
                  {userModalLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredUsers;
