import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Cpu,
  Layers,
  Copy,
  Check,
  Users,
  RotateCcw,
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  getUserRegisteredDevices,
  approveUserRegisteredDevice,
  rejectUserRegisteredDevice,
} from '../services/api';

const UserRegisteredDevices = ({
  onNavigate,
  onOpenAuth,
  currentUser,
  onLogout,
  onOpenProfile,
}) => {
  // Alert & Loading State
  const [alert, setAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Devices State
  const [userDevices, setUserDevices] = useState([]);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all');
  const [devicePage, setDevicePage] = useState(1);
  const devicePageSize = 10;
  const [copiedDevId, setCopiedDevId] = useState(null);

  // Fetch User-Registered Devices
  const fetchUserDevicesList = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await getUserRegisteredDevices();
      if (res.data?.success) {
        setUserDevices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load user registered devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchUserDevicesList();
  }, [fetchUserDevicesList]);

  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    await fetchUserDevicesList();
    setRefreshing(false);
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedDevId(id);
    setTimeout(() => setCopiedDevId(null), 1800);
  };

  // Handle Admin Accepting a User Device Registration
  const handleAcceptDevice = async (id, devId) => {
    const key = id || devId;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    setAlert(null);
    try {
      const res = await approveUserRegisteredDevice(key);
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message:
            res.data.message ||
            `Device '${devId || key}' registration ACCEPTED! User can now access live telemetry on their dashboard.`,
        });
        // Optimistically update device in state
        setUserDevices((prev) =>
          prev.map((d) =>
            d._id === key || d.deviceId === key
              ? {
                  ...d,
                  approvalStatus: 'APPROVED',
                  isApproved: true,
                  status: 'Active',
                  approvedAt: new Date(),
                }
              : d
          )
        );
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to approve device registration',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle Admin Rejecting a User Device Registration
  const handleRejectDevice = async (id, devId) => {
    const key = id || devId;
    if (
      !window.confirm(
        `Are you sure you want to REJECT the registration request for device '${devId || key}'?`
      )
    ) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    setAlert(null);
    try {
      const res = await rejectUserRegisteredDevice(key);
      if (res.data?.success) {
        setAlert({
          type: 'success',
          message:
            res.data.message ||
            `Device '${devId || key}' registration request has been REJECTED.`,
        });
        // Optimistically update device in state
        setUserDevices((prev) =>
          prev.map((d) =>
            d._id === key || d.deviceId === key
              ? {
                  ...d,
                  approvalStatus: 'REJECTED',
                  isApproved: false,
                  status: 'INACTIVE',
                }
              : d
          )
        );
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to reject device registration',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // KPI Calculations
  const pendingCount = userDevices.filter(
    (d) => (d.approvalStatus || (d.isApproved ? 'APPROVED' : 'PENDING')) === 'PENDING'
  ).length;
  const approvedCount = userDevices.filter(
    (d) => (d.approvalStatus || (d.isApproved ? 'APPROVED' : 'PENDING')) === 'APPROVED'
  ).length;
  const rejectedCount = userDevices.filter(
    (d) => d.approvalStatus === 'REJECTED'
  ).length;

  // Filtered Devices
  const filteredDevices = userDevices.filter((d) => {
    const term = deviceSearchTerm.toLowerCase();
    const owner = d.assignedUser || d.assignedUserId || {};
    const ownerName = owner.name || '';
    const ownerEmail = owner.email || '';
    const matchSearch =
      !term ||
      d.deviceId?.toLowerCase().includes(term) ||
      d.name?.toLowerCase().includes(term) ||
      d.location?.toLowerCase().includes(term) ||
      d.modelNumber?.toLowerCase().includes(term) ||
      ownerName.toLowerCase().includes(term) ||
      ownerEmail.toLowerCase().includes(term);

    const st = (d.approvalStatus || (d.isApproved ? 'APPROVED' : 'PENDING')).toUpperCase();
    const matchStatus =
      deviceStatusFilter === 'all' ||
      (deviceStatusFilter === 'pending' && st === 'PENDING') ||
      (deviceStatusFilter === 'approved' && st === 'APPROVED') ||
      (deviceStatusFilter === 'rejected' && st === 'REJECTED');

    return matchSearch && matchStatus;
  });

  const totalDevicePages = Math.max(1, Math.ceil(filteredDevices.length / devicePageSize));
  const deviceStartIndex = (devicePage - 1) * devicePageSize;
  const paginatedDevices = filteredDevices.slice(
    deviceStartIndex,
    deviceStartIndex + devicePageSize
  );

  return (
    <div className="app-container">
      {/* Sidebar with User Registered Devices active */}
      <Sidebar
        currentPage="user-devices"
        onNavigate={onNavigate}
        onLogout={onLogout}
        currentUser={currentUser}
        onOpenProfile={onOpenProfile}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          currentPage="user-devices"
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
                <Smartphone size={28} className="shield-icon" />
              </div>
              <div>
                <h2>User Registered Devices</h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                  Review and accept IoT hardware devices registered by users. Once accepted, devices activate on user dashboards.
                </p>
              </div>
            </div>

            <div className="admin-hero-actions">
              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh devices list"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
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
              <div className="kpi-icon-wrap cyan">
                <Smartphone size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total User Requests</span>
                <span className="kpi-val">{userDevices.length}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap amber" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Clock size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Pending Approval</span>
                <span className="kpi-val" style={{ color: '#D97706' }}>{pendingCount}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap emerald">
                <CheckCircle2 size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Accepted & Active</span>
                <span className="kpi-val" style={{ color: '#059669' }}>{approvedCount}</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon-wrap purple" style={{ background: '#F1F5F9', color: '#64748B' }}>
                <AlertCircle size={20} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Rejected Requests</span>
                <span className="kpi-val">{rejectedCount}</span>
              </div>
            </div>
          </div>

          {/* Devices Table Card */}
          <div className="dash-card admin-table-card">
            {/* Search & Filter Toolbar */}
            <div className="admin-table-controls">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Device ID, Name, Model, Location, or User..."
                  value={deviceSearchTerm}
                  onChange={(e) => {
                    setDeviceSearchTerm(e.target.value);
                    setDevicePage(1);
                  }}
                />
              </div>

              <div className="role-filter-wrap">
                <Filter size={15} className="filter-icon" />
                <select
                  value={deviceStatusFilter}
                  onChange={(e) => {
                    setDeviceStatusFilter(e.target.value);
                    setDevicePage(1);
                  }}
                >
                  <option value="all">All Requests ({userDevices.length})</option>
                  <option value="pending">⏳ Pending Approval ({pendingCount})</option>
                  <option value="approved">✓ Accepted & Active ({approvedCount})</option>
                  <option value="rejected">✕ Rejected ({rejectedCount})</option>
                </select>
              </div>

              <button
                type="button"
                className={`btn-refresh-table ${refreshing ? 'spinning' : ''}`}
                onClick={handleGlobalRefresh}
                title="Refresh Devices"
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingDevices ? (
              <div className="admin-loading-box">
                <Loader2 size={32} className="animate-spin text-emerald" />
                <p>Loading user registration requests...</p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="admin-empty-box">
                <Smartphone size={40} className="empty-shield" />
                <h4>No User Registered Devices Found</h4>
                <p>No device registration requests match the selected filter criteria.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-credentials-table">
                  <thead>
                    <tr>
                      <th>Device ID</th>
                      <th>Device Name</th>
                      <th>Motor Model</th>
                      <th>Registered User</th>
                      <th>Location</th>
                      <th>Requested Date</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDevices.map((d) => {
                      const owner = d.assignedUser || d.assignedUserId || {};
                      const isAssigned = Boolean(owner && (owner.name || owner.email));
                      const approvalSt = (d.approvalStatus || (d.isApproved ? 'APPROVED' : 'PENDING')).toUpperCase();
                      const isPending = approvalSt === 'PENDING';
                      const isApproved = approvalSt === 'APPROVED';
                      const isRejected = approvalSt === 'REJECTED';
                      const rowKey = d._id || d.deviceId;
                      const isBusy = Boolean(actionLoading[rowKey] || actionLoading[d.deviceId]);

                      return (
                        <tr key={rowKey}>
                          {/* Device ID */}
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="register-model-code" style={{ fontSize: '12px' }}>
                                {d.deviceId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(d.deviceId)}
                                className="btn-toggle-eye"
                                title="Copy Device ID"
                              >
                                {copiedDevId === d.deviceId ? (
                                  <Check size={12} color="#16A34A" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Device Name */}
                          <td>
                            <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                              {d.name || 'Water Controller'}
                            </strong>
                          </td>

                          {/* Motor Model */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  color: '#0284C7',
                                }}
                              >
                                {d.modelNumber || 'SG-1PS-1.5'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                {d.modelName || 'Standard Controller'}
                              </span>
                            </div>
                          </td>

                          {/* Owner */}
                          <td>
                            {isAssigned ? (
                              <div className="user-profile-cell">
                                <div
                                  className="user-avatar-bubble operator"
                                  style={{ width: '28px', height: '28px', fontSize: '11px' }}
                                >
                                  {owner.name ? owner.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="user-name-info">
                                  <span className="user-fullname" style={{ fontSize: '12.5px' }}>
                                    {owner.name}
                                  </span>
                                  <span className="user-email-text" style={{ fontSize: '11px' }}>
                                    {owner.email}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                User Request
                              </span>
                            )}
                          </td>

                          {/* Location */}
                          <td>
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <MapPin size={12} color="#94A3B8" />
                              {d.location || 'Site Location'}
                            </span>
                          </td>

                          {/* Requested Date */}
                          <td>
                            <div className="date-cell">
                              <Clock size={13} color="#94A3B8" />
                              <span>
                                {d.requestedAt || d.createdAt
                                  ? new Date(d.requestedAt || d.createdAt).toLocaleDateString()
                                  : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Approval Status */}
                          <td>
                            {isPending ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '9999px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  background: '#FEF3C7',
                                  color: '#B45309',
                                  border: '1px solid #FDE68A',
                                }}
                              >
                                <Clock size={12} /> Pending Approval
                              </span>
                            ) : isApproved ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '9999px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  background: '#ECFDF5',
                                  color: '#059669',
                                  border: '1px solid #A7F3D0',
                                }}
                              >
                                <CheckCircle2 size={12} /> Accepted
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '9999px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                }}
                                title={d.rejectionReason || 'Registration Rejected'}
                              >
                                <AlertCircle size={12} /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '8px',
                              }}
                            >
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptDevice(rowKey, d.deviceId)}
                                    disabled={isBusy}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 14px',
                                      borderRadius: '8px',
                                      background:
                                        'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                                    }}
                                    title="Accept and approve this device registration"
                                  >
                                    {isBusy ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                    <span>Accept</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRejectDevice(rowKey, d.deviceId)}
                                    disabled={isBusy}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      background: '#FFFFFF',
                                      color: '#DC2626',
                                      border: '1px solid #FECACA',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Reject this device registration request"
                                  >
                                    <X size={13} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : isApproved ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#059669',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <CheckCircle2 size={13} /> Accepted
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectDevice(rowKey, d.deviceId)}
                                    disabled={isBusy}
                                    title="Revoke / Reject"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#94A3B8',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      padding: '2px 4px',
                                    }}
                                  >
                                    Revoke
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptDevice(rowKey, d.deviceId)}
                                    disabled={isBusy}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      background: '#F0FDF4',
                                      color: '#16A34A',
                                      border: '1px solid #BBF7D0',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Re-accept this device registration"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Accept</span>
                                  </button>
                                </div>
                              )}
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
            {filteredDevices.length > devicePageSize && (
              <div
                className="table-pagination-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Showing {deviceStartIndex + 1}–
                  {Math.min(deviceStartIndex + devicePageSize, filteredDevices.length)} of{' '}
                  {filteredDevices.length} devices
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={devicePage === 1}
                    onClick={() => setDevicePage((p) => Math.max(1, p - 1))}
                    className="page-nav-btn"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="page-indicator">
                    Page {devicePage} of {totalDevicePages}
                  </span>
                  <button
                    type="button"
                    disabled={devicePage >= totalDevicePages}
                    onClick={() => setDevicePage((p) => Math.min(totalDevicePages, p + 1))}
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
    </div>
  );
};

export default UserRegisteredDevices;
