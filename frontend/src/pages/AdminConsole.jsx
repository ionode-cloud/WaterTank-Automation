import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Key,
  Mail,
  User as UserIcon,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Clock,
  Shield,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../services/api';

const AdminConsole = ({ onNavigate, onOpenAuth, currentUser, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Alert State
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Data for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers({
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin credentials:', err.message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAlert({
          type: 'error',
          message: 'Authentication required. Please sign in as an Administrator to manage credentials.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setTimeout(() => setRefreshing(false), 500);
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      phone: '',
      isActive: true,
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: user.displayPassword || '',
      role: user.role || 'admin',
      phone: user.phone || '',
      isActive: user.isActive !== false,
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setAlert({ type: 'error', message: 'Name, email, and password are required' });
      return;
    }
    if (formData.password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setModalLoading(true);
      const res = await createAdminUser(formData);
      if (res.data?.success) {
        setAlert({ type: 'success', message: `Credential '${formData.name}' created successfully` });
        setShowAddModal(false);
        fetchUsers();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to create user' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setModalLoading(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
        isActive: formData.isActive,
      };
      if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      const res = await updateAdminUser(selectedUser._id, payload);
      if (res.data?.success) {
        setAlert({ type: 'success', message: `Credential '${formData.name}' updated successfully` });
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to update user' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      setModalLoading(true);
      const res = await deleteAdminUser(selectedUser._id);
      if (res.data?.success) {
        setAlert({ type: 'success', message: res.data.message || 'Credential deleted successfully' });
        setShowDeleteModal(false);
        fetchUsers();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to delete user' });
    } finally {
      setModalLoading(false);
    }
  };

  // Stats calculation
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalOperators = users.filter((u) => u.role === 'operator').length;

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, users.length);
  const paginatedUsers = users.slice(startIndex, endIndex);

  return (
    <div className="app-container">
      {/* Sidebar with Admin Console active */}
      <Sidebar currentPage="admin" onNavigate={onNavigate} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar currentPage="admin" onNavigate={onNavigate} onRefresh={handleRefresh} />

        <div className="admin-console-page">
          {/* Header Banner */}
          <div className="admin-hero-card">
            <div className="admin-hero-content">
              <div className="admin-shield-bubble">
                <ShieldCheck size={28} className="shield-icon" />
              </div>
              <div>
                <h2>Admin Security & Credential Console</h2>
              </div>
            </div>
            <div className="admin-hero-actions">
              <button
                type="button"
                className="btn-create-admin"
                onClick={openAddModal}
              >
                <UserPlus size={16} />
                <span>Add New Credential</span>
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
                <Shield size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Credentials</span>
                <span className="kpi-val">{users.length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap emerald">
                <ShieldCheck size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Administrators</span>
                <span className="kpi-val">{totalAdmins}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap cyan">
                <UserIcon size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Operators</span>
                <span className="kpi-val">{totalOperators}</span>
              </div>
            </div>
          </div>

          {/* Credentials Table Card */}
          <div className="dash-card admin-table-card">
            {/* Table Controls Row */}
            <div className="admin-table-controls">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="role-filter-wrap">
                <Filter size={15} className="filter-icon" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="operator">Operators</option>
                </select>
              </div>

              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh Table"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="admin-loading-box">
                <Loader2 size={32} className="animate-spin text-emerald" />
                <p>Loading authorized credentials from MongoDB...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="admin-empty-box">
                <ShieldCheck size={40} className="empty-shield" />
                <h4>No Credentials Found</h4>
                <p>No user credentials match your current search or role filter.</p>
                <button type="button" className="btn-primary" onClick={openAddModal}>
                  <UserPlus size={15} /> Add First Credential
                </button>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-credentials-table">
                  <thead>
                    <tr>
                      <th>User / Administrator</th>
                      <th>Email Address</th>
                      <th>Role Privilege</th>
                      <th>Status</th>
                      <th>Password</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => {
                      const isCurrentUser = currentUser && (currentUser.id === u._id || currentUser.email === u.email);
                      return (
                        <tr key={u._id} className={isCurrentUser ? 'current-user-row' : ''}>
                          {/* Name & Avatar */}
                          <td>
                            <div className="user-profile-cell">
                              <div className={`user-avatar-bubble ${u.role}`}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="user-name-info">
                                <span className="user-fullname">
                                  {u.name}
                                </span>
                                {u.phone && <span className="user-phone-sub">{u.phone}</span>}
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td>
                            <span className="user-email-text">{u.email}</span>
                          </td>

                          {/* Role */}
                          <td>
                            <span className={`role-badge ${u.role}`}>
                              {u.role === 'admin' ? 'ADMINISTRATOR' : u.role.toUpperCase()}
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`status-pill ${u.isActive !== false ? 'active' : 'inactive'}`}>
                              <span className="dot"></span>
                              {u.isActive !== false ? 'Active' : 'Deactivated'}
                            </span>
                          </td>

                          {/* Password (Visible on Toggle / Editable) */}
                          <td>
                            <div className="password-display-cell">
                              <span className="password-text-value">
                                {visiblePasswords[u._id]
                                  ? (u.displayPassword || '••••••••')
                                  : '••••••••'}
                              </span>
                              <button
                                type="button"
                                className="btn-toggle-eye"
                                onClick={() => togglePasswordVisibility(u._id)}
                                title={visiblePasswords[u._id] ? 'Hide password' : 'Show password'}
                              >
                                {visiblePasswords[u._id] ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button
                                type="button"
                                className="btn-quick-set-pwd"
                                onClick={() => openEditModal(u)}
                                title="Set / Change Password"
                              >
                                <Key size={12} />
                                <span>Set</span>
                              </button>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td>
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="action-btn-edit"
                                onClick={() => openEditModal(u)}
                                title="Edit Credential"
                              >
                                <Edit2 size={15} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-delete"
                                onClick={() => openDeleteModal(u)}
                                title="Delete Credential"
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

                {/* Admin Table Pagination Bar */}
                <div className="table-pagination-bar" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    Showing {users.length > 0 ? startIndex + 1 : 0} to {endIndex} of {users.length} credentials
                  </div>

                  <div className="pagination-buttons-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="page-nav-btn"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>

                    <span className="page-indicator" style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="page-nav-btn"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD NEW CREDENTIAL */}
      {showAddModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth-close-btn"
              onClick={() => setShowAddModal(false)}
            >
              <X size={18} />
            </button>

            <div className="auth-modal-header">
              <div className="auth-brand-badge">
                <UserPlus size={22} className="auth-shield-icon" />
              </div>
              <h2 className="auth-modal-title">Add Admin Credential</h2>
              <p className="auth-modal-subtitle">
                Create new authorized credentials with full JWT access to telemetry & actuators.
              </p>
            </div>

            <form onSubmit={handleAddSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. System Engineer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="engineer@hydropulse.io"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Password (Min 6 Characters)</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role Authorization</label>
                <div className="auth-role-selector">
                  <label className={`role-pill ${formData.role === 'admin' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={() => setFormData({ ...formData, role: 'admin' })}
                    />
                    <span>Administrator (Full Access)</span>
                  </label>
                  <label className={`role-pill ${formData.role === 'operator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="operator"
                      checked={formData.role === 'operator'}
                      onChange={() => setFormData({ ...formData, role: 'operator' })}
                    />
                    <span>Operator (Live Monitor & Pump)</span>
                  </label>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Phone Number (Optional)</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={modalLoading}>
                {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>Save Credential</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CREDENTIAL */}
      {showEditModal && selectedUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth-close-btn"
              onClick={() => setShowEditModal(false)}
            >
              <X size={18} />
            </button>

            <div className="auth-modal-header">
              <div className="auth-brand-badge">
                <Edit2 size={22} className="auth-shield-icon" />
              </div>
              <h2 className="auth-modal-title">Edit Credential</h2>
              <p className="auth-modal-subtitle">
                Updating authorization for <strong>{selectedUser.name}</strong> ({selectedUser.email}).
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Set / Change Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set new password (min. 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role Authorization</label>
                <div className="auth-role-selector">
                  <label className={`role-pill ${formData.role === 'admin' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={() => setFormData({ ...formData, role: 'admin' })}
                    />
                    <span>Administrator</span>
                  </label>
                  <label className={`role-pill ${formData.role === 'operator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="operator"
                      checked={formData.role === 'operator'}
                      onChange={() => setFormData({ ...formData, role: 'operator' })}
                    />
                    <span>Operator</span>
                  </label>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Phone Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={modalLoading}>
                {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Update Credential</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {showDeleteModal && selectedUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-box">
              <div className="delete-icon-bubble">
                <Trash2 size={28} className="trash-icon" />
              </div>
              <h3>Delete Administrator Credential?</h3>
              <p>
                Are you sure you want to permanently delete credentials for{' '}
                <strong>{selectedUser.name}</strong> (<code>{selectedUser.email}</code>)? This user will immediately lose all JWT access to the IoT controls.
              </p>
              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-delete"
                  onClick={handleDeleteConfirm}
                  disabled={modalLoading}
                >
                  {modalLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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

export default AdminConsole;
