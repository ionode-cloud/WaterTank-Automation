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
  UserCheck,
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
  Copy,
  Check,
  Layers,
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../services/api';

export const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Live telemetry & overview' },
  { id: 'devices', label: 'Devices', desc: 'Manage hardware & nodes' },
  { id: 'user-devices', label: 'User Registered Devices', desc: 'View & approve user devices' },
  { id: 'history', label: 'History', desc: 'Sensor logs & records' },
  { id: 'models', label: 'Models', desc: 'Motor model specifications' },
  { id: 'registered-users', label: 'Registered Users', desc: 'User management & credentials' },
  { id: 'admin', label: 'Admin Console', desc: 'System security & admin keys' },
  { id: 'profile', label: 'Profile', desc: 'User profile & account details' },
];

const AdminConsole = ({
  onNavigate,
  onOpenAuth,
  currentUser,
  onLogout,
  onOpenProfile,
  currentPage = 'admin',
}) => {
  // Shared Alert & Loading State
  const [alert, setAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Credentials State
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('all');
  const [adminPage, setAdminPage] = useState(1);
  const adminPageSize = 10;
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modals State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [adminModalLoading, setAdminModalLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    allowedTabs: ['dashboard', 'devices', 'history'],
  });

  // JWT Secret Display State
  const [isRevealedJwt, setIsRevealedJwt] = useState(false);
  const [copiedJwt, setCopiedJwt] = useState(false);
  const jwtSecretMasked = 'watertank_jwt_super_secret_key_2026';

  // Fetch Admin Credentials
  const fetchAdminCredentialsList = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await getAdminUsers({
        search: adminSearchTerm || undefined,
        role: adminRoleFilter !== 'all' ? adminRoleFilter : undefined,
      });
      if (res.data?.success) {
        setAdminUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin credentials:', err);
    } finally {
      setLoadingAdmins(false);
    }
  }, [adminSearchTerm, adminRoleFilter]);

  useEffect(() => {
    fetchAdminCredentialsList();
  }, [fetchAdminCredentialsList]);

  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    await fetchAdminCredentialsList();
    setRefreshing(false);
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Admin Modal Handlers
  const openAddAdminModal = () => {
    setAdminFormData({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      phone: '',
      allowedTabs: ['dashboard', 'devices', 'history'],
    });
    setShowAdminPassword(false);
    setShowAddAdminModal(true);
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminModalLoading(true);
    try {
      const res = await createAdminUser(adminFormData);
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message: `Admin credential for ${adminFormData.email} created successfully.`,
        });
        setShowAddAdminModal(false);
        fetchAdminCredentialsList();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create admin credential',
      });
    } finally {
      setAdminModalLoading(false);
    }
  };

  const openEditAdminModal = (admin) => {
    setSelectedAdminUser(admin);
    setAdminFormData({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'admin',
      phone: admin.phone || admin.mobileNumber || '',
      allowedTabs: Array.isArray(admin.allowedTabs) ? admin.allowedTabs : ['dashboard', 'devices', 'history'],
    });
    setShowAdminPassword(false);
    setShowEditAdminModal(true);
  };

  const handleUpdateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminUser) return;
    setAdminModalLoading(true);
    try {
      const payload = { ...adminFormData };
      if (!payload.password) delete payload.password;

      const res = await updateAdminUser(selectedAdminUser._id || selectedAdminUser.id, payload);
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message: `Admin credential for ${adminFormData.email} updated successfully.`,
        });
        setShowEditAdminModal(false);
        fetchAdminCredentialsList();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update admin credential',
      });
    } finally {
      setAdminModalLoading(false);
    }
  };

  const openDeleteAdminModal = (admin) => {
    setSelectedAdminUser(admin);
    setShowDeleteAdminModal(true);
  };

  const handleDeleteAdminConfirm = async () => {
    if (!selectedAdminUser) return;
    setAdminModalLoading(true);
    try {
      const res = await deleteAdminUser(selectedAdminUser._id || selectedAdminUser.id);
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message: `Admin credential for ${selectedAdminUser.email} deleted successfully.`,
        });
        setShowDeleteAdminModal(false);
        fetchAdminCredentialsList();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete admin credential',
      });
    } finally {
      setAdminModalLoading(false);
    }
  };

  const handleCopyJwt = () => {
    navigator.clipboard.writeText(jwtSecretMasked);
    setCopiedJwt(true);
    setTimeout(() => setCopiedJwt(false), 2000);
  };

  // Only allow Administrator and Operator roles; strictly exclude standard users
  const adminAndOperatorsOnly = adminUsers.filter((u) => {
    const r = String(u.role || '').toLowerCase();
    return r === 'admin' || r === 'operator';
  });

  // Filtered Admin List
  const filteredAdmins = adminAndOperatorsOnly.filter((u) => {
    const term = adminSearchTerm.toLowerCase();
    const matchSearch =
      !term ||
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.mobileNumber?.toLowerCase().includes(term);

    const r = String(u.role || '').toLowerCase();
    const matchRole =
      adminRoleFilter === 'all' ||
      (adminRoleFilter === 'admin' && r === 'admin') ||
      (adminRoleFilter === 'operator' && r === 'operator');

    return matchSearch && matchRole;
  });

  const totalAdminPages = Math.max(1, Math.ceil(filteredAdmins.length / adminPageSize));
  const adminStartIndex = (adminPage - 1) * adminPageSize;
  const paginatedAdmins = filteredAdmins.slice(adminStartIndex, adminStartIndex + adminPageSize);

  return (
    <div className="app-container">
      {/* Sidebar with Admin Console active */}
      <Sidebar currentPage="admin" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          currentPage="admin"
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
                <ShieldCheck size={28} className="shield-icon" />
              </div>
              <div>
                <h2>Admin Credentials & System Security</h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                  Manage administrator and operator accounts, authentication credentials, passwords, and JWT session security
                </p>
              </div>
            </div>

            <div className="admin-hero-actions">
              <button
                type="button"
                className="btn-create-admin"
                onClick={openAddAdminModal}
              >
                <UserPlus size={16} />
                <span>Add Admin Credential</span>
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
              <div className="kpi-icon-wrap cyan">
                <ShieldCheck size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Admin Accounts</span>
                <span className="kpi-val">{adminAndOperatorsOnly.length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap emerald">
                <CheckCircle2 size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Active Credentials</span>
                <span className="kpi-val">
                  {adminAndOperatorsOnly.filter((u) => u.isActive !== false).length}
                </span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap purple">
                <Shield size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Administrators</span>
                <span className="kpi-val">
                  {adminAndOperatorsOnly.filter((u) => String(u.role || '').toLowerCase() === 'admin').length}
                </span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap orange">
                <UserCheck size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Operators</span>
                <span className="kpi-val">
                  {adminAndOperatorsOnly.filter((u) => String(u.role || '').toLowerCase() === 'operator').length}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Credentials Table Card */}
          <div className="dash-card admin-table-card">
            {/* Search & Filter Toolbar */}
            <div className="admin-table-controls">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search administrators & operators by name, email, or role..."
                  value={adminSearchTerm}
                  onChange={(e) => {
                    setAdminSearchTerm(e.target.value);
                    setAdminPage(1);
                  }}
                />
              </div>

              <div className="role-filter-wrap">
                <Filter size={15} className="filter-icon" />
                <select
                  value={adminRoleFilter}
                  onChange={(e) => {
                    setAdminRoleFilter(e.target.value);
                    setAdminPage(1);
                  }}
                >
                  <option value="all">All Roles (Admin & Operator)</option>
                  <option value="admin">Administrator Only</option>
                  <option value="operator">Operator Only</option>
                </select>
              </div>

              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh admin credentials"
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingAdmins ? (
              <div className="admin-loading-box">
                <Loader2 size={32} className="animate-spin text-teal" />
                <p>Loading administrator credentials...</p>
              </div>
            ) : paginatedAdmins.length === 0 ? (
              <div className="admin-empty-box">
                <Key size={40} className="empty-shield" />
                <h4>No Administrator or Operator Credentials Found</h4>
                <p>Click "Add Admin Credential" above to register a new administrator or operator account.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-credentials-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Email Address</th>
                      <th>Contact Phone</th>
                      <th>System Role</th>
                      <th>Password</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAdmins.map((u) => {
                      const isSuper = String(u.role).toLowerCase() === 'admin';

                      return (
                        <tr key={u._id || u.id}>
                          <td>
                            <div className="user-profile-cell">
                              <div className={`user-avatar-bubble ${isSuper ? 'admin' : 'operator'}`}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div className="user-name-info">
                                <span className="user-fullname">{u.name || 'Admin User'}</span>
                                <span className="user-id-code">{u._id || u.id}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="email-cell">
                              <Mail size={13} color="#64748B" />
                              <span>{u.email}</span>
                            </div>
                          </td>

                          <td>
                            <div className="email-cell">
                              <Phone size={13} color="#64748B" />
                              <span>{u.phone || u.mobileNumber || '—'}</span>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`admin-role-badge ${isSuper ? 'badge-admin' : 'badge-operator'}`}>
                                <Shield size={12} />
                                <span>{isSuper ? 'Administrator' : 'Operator'}</span>
                              </span>
                              {isSuper ? (
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                  Full Access (All Tabs)
                                </span>
                              ) : (
                                <div className="operator-tabs-assigned-chips">
                                  {Array.isArray(u.allowedTabs) && u.allowedTabs.length > 0 ? (
                                    u.allowedTabs.map((tid) => {
                                      const tabDef = AVAILABLE_TABS.find((t) => t.id === tid);
                                      return (
                                        <span key={tid} className="operator-tab-chip">
                                          {tabDef ? tabDef.label : tid}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span style={{ fontSize: '10.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                                      No tabs assigned
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="password-display-cell">
                              <span className="password-text-value">
                                {visiblePasswords[u._id || u.id]
                                  ? (u.displayPassword || '••••••••')
                                  : '••••••••'}
                              </span>
                              <button
                                type="button"
                                className="btn-toggle-eye"
                                onClick={() => togglePasswordVisibility(u._id || u.id)}
                                title={visiblePasswords[u._id || u.id] ? 'Hide password' : 'Show password'}
                              >
                                {visiblePasswords[u._id || u.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button
                                type="button"
                                className="btn-quick-set-pwd"
                                onClick={() => openEditAdminModal(u)}
                                title="Set / Change Password"
                              >
                                <Key size={12} />
                                <span>Set</span>
                              </button>
                            </div>
                          </td>

                          <td>
                            <div className="date-cell">
                              <Clock size={13} color="#94A3B8" />
                              <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </td>

                          <td>
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="action-btn-edit"
                                onClick={() => openEditAdminModal(u)}
                                title="Edit Credential"
                              >
                                <Edit2 size={15} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-delete"
                                onClick={() => openDeleteAdminModal(u)}
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
              </div>
            )}

            {/* Pagination */}
            {filteredAdmins.length > adminPageSize && (
              <div className="table-pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Showing {adminStartIndex + 1}–{Math.min(adminStartIndex + adminPageSize, filteredAdmins.length)} of {filteredAdmins.length} credentials
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={adminPage === 1}
                    onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                    className="page-nav-btn"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="page-indicator">Page {adminPage} of {totalAdminPages}</span>
                  <button
                    type="button"
                    disabled={adminPage >= totalAdminPages}
                    onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
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

      {/* MODAL: ADD ADMIN CREDENTIAL */}
      {showAddAdminModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAddAdminModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-header-title">
                <UserPlus size={20} className="auth-title-icon" />
                <h3>Add Administrator Credential</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowAddAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label>Administrator Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
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
                    placeholder="admin@watertank.com"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Access Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    tabIndex={-1}
                  >
                    {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role Authorization</label>
                <div className="auth-role-selector">
                  <label className={`role-pill ${adminFormData.role === 'admin' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="adminRole"
                      value="admin"
                      checked={adminFormData.role === 'admin'}
                      onChange={() => setAdminFormData({ ...adminFormData, role: 'admin' })}
                    />
                    <span>Administrator</span>
                  </label>
                  <label className={`role-pill ${adminFormData.role === 'operator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="adminRole"
                      value="operator"
                      checked={adminFormData.role === 'operator'}
                      onChange={() => setAdminFormData({ ...adminFormData, role: 'operator' })}
                    />
                    <span>Operator</span>
                  </label>
                </div>
              </div>

              {/* OPERATOR ACCESSIBLE TABS CHECKBOXES */}
              {adminFormData.role === 'operator' && (
                <div className="operator-tabs-container">
                  <div className="operator-tabs-topbar">
                    <div>
                      <label className="operator-tabs-heading">
                        <Layers size={14} />
                        <span>Accessible Tabs for Operator</span>
                      </label>
                      <span className="operator-tabs-subtext">
                        Select which tabs this operator account can view and access upon login
                      </span>
                    </div>
                    <div className="operator-tabs-quick-actions">
                      <button
                        type="button"
                        className="btn-tab-toggle"
                        onClick={() =>
                          setAdminFormData((prev) => ({
                            ...prev,
                            allowedTabs: AVAILABLE_TABS.map((t) => t.id),
                          }))
                        }
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn-tab-toggle"
                        onClick={() =>
                          setAdminFormData((prev) => ({
                            ...prev,
                            allowedTabs: [],
                          }))
                        }
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="operator-tabs-grid">
                    {AVAILABLE_TABS.map((tab) => {
                      const isChecked = Boolean(adminFormData.allowedTabs?.includes(tab.id));
                      return (
                        <div
                          key={tab.id}
                          className={`operator-tab-card ${isChecked ? 'active' : ''}`}
                          onClick={() => {
                            const current = adminFormData.allowedTabs || [];
                            const nextTabs = isChecked
                              ? current.filter((t) => t !== tab.id)
                              : [...current, tab.id];
                            setAdminFormData((prev) => ({ ...prev, allowedTabs: nextTabs }));
                          }}
                        >
                          <div className={`tab-checkbox-box ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="operator-tab-text">
                            <span className="tab-name">{tab.label}</span>
                            <span className="tab-desc">{tab.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label>Phone Number (Optional)</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={adminFormData.phone}
                    onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={adminModalLoading}>
                {adminModalLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{adminFormData.role === 'operator' ? 'Create Operator' : 'Create Administrator'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ADMIN CREDENTIAL */}
      {showEditAdminModal && selectedAdminUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowEditAdminModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-header-title">
                <Edit2 size={20} className="auth-title-icon" />
                <h3>Edit Administrator Credential</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowEditAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label>Administrator Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
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
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Set / Change Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="Set new password (leave blank to keep current)"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    tabIndex={-1}
                  >
                    {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role Authorization</label>
                <div className="auth-role-selector">
                  <label className={`role-pill ${adminFormData.role === 'admin' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="adminEditRole"
                      value="admin"
                      checked={adminFormData.role === 'admin'}
                      onChange={() => setAdminFormData({ ...adminFormData, role: 'admin' })}
                    />
                    <span>Administrator</span>
                  </label>
                  <label className={`role-pill ${adminFormData.role === 'operator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="adminEditRole"
                      value="operator"
                      checked={adminFormData.role === 'operator'}
                      onChange={() => setAdminFormData({ ...adminFormData, role: 'operator' })}
                    />
                    <span>Operator</span>
                  </label>
                </div>
              </div>

              {/* OPERATOR ACCESSIBLE TABS CHECKBOXES (EDIT) */}
              {adminFormData.role === 'operator' && (
                <div className="operator-tabs-container">
                  <div className="operator-tabs-topbar">
                    <div>
                      <label className="operator-tabs-heading">
                        <Layers size={14} />
                        <span>Accessible Tabs for Operator</span>
                      </label>
                      <span className="operator-tabs-subtext">
                        Select which tabs this operator account can view and access upon login
                      </span>
                    </div>
                    <div className="operator-tabs-quick-actions">
                      <button
                        type="button"
                        className="btn-tab-toggle"
                        onClick={() =>
                          setAdminFormData((prev) => ({
                            ...prev,
                            allowedTabs: AVAILABLE_TABS.map((t) => t.id),
                          }))
                        }
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn-tab-toggle"
                        onClick={() =>
                          setAdminFormData((prev) => ({
                            ...prev,
                            allowedTabs: [],
                          }))
                        }
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="operator-tabs-grid">
                    {AVAILABLE_TABS.map((tab) => {
                      const isChecked = Boolean(adminFormData.allowedTabs?.includes(tab.id));
                      return (
                        <div
                          key={tab.id}
                          className={`operator-tab-card ${isChecked ? 'active' : ''}`}
                          onClick={() => {
                            const current = adminFormData.allowedTabs || [];
                            const nextTabs = isChecked
                              ? current.filter((t) => t !== tab.id)
                              : [...current, tab.id];
                            setAdminFormData((prev) => ({ ...prev, allowedTabs: nextTabs }));
                          }}
                        >
                          <div className={`tab-checkbox-box ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="operator-tab-text">
                            <span className="tab-name">{tab.label}</span>
                            <span className="tab-desc">{tab.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label>Phone Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    value={adminFormData.phone}
                    onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={adminModalLoading}>
                {adminModalLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Update Credential</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ADMIN CONFIRMATION */}
      {showDeleteAdminModal && selectedAdminUser && (
        <div className="auth-modal-backdrop" onClick={() => setShowDeleteAdminModal(false)}>
          <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-box">
              <div className="delete-icon-bubble">
                <Trash2 size={28} className="trash-icon" />
              </div>
              <h3>Delete Administrator Credential?</h3>
              <p>
                Are you sure you want to permanently delete credentials for{' '}
                <strong>{selectedAdminUser.name}</strong> (<code>{selectedAdminUser.email}</code>)?
              </p>
              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowDeleteAdminModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-delete"
                  onClick={handleDeleteAdminConfirm}
                  disabled={adminModalLoading}
                >
                  {adminModalLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
