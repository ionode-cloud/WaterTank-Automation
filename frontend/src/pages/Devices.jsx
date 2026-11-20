import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  Cpu,
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../services/api';

const Devices = ({ onNavigate, currentUser, onOpenAuth, onLogout }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Top Row Inline Registration Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline Table Row Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Copied chip state
  const [copiedId, setCopiedId] = useState(null);

  // Fetch Devices
  const fetchDevicesList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDevices();
      if (res.data?.success) {
        setDevices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevicesList();
  }, [fetchDevicesList]);

  // Handle Create Device from Top Row Form
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanId = newDeviceId.trim().toUpperCase();
    const cleanName = newName.trim();
    const cleanLocation = newLocation.trim();

    if (!cleanId) {
      setFormError('Please enter a Device ID (e.g. WT-001)');
      return;
    }
    if (!cleanName) {
      setFormError('Please enter a Device Name (e.g. Overhead Tank Motor)');
      return;
    }
    if (!cleanLocation) {
      setFormError('Please enter a Location (e.g. Tower A - Rooftop)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createDevice({
        deviceId: cleanId,
        name: cleanName,
        location: cleanLocation,
      });

      if (res.data?.success) {
        setFormSuccess(`Device '${cleanId}' registered successfully!`);
        setNewDeviceId('');
        setNewName('');
        setNewLocation('');
        setIsFormOpen(false);
        fetchDevicesList();
        setTimeout(() => setFormSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to register device';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Start Editing Row
  const startEdit = (dev) => {
    setEditingId(dev._id || dev.deviceId);
    setEditName(dev.name || '');
    setEditLocation(dev.location || '');
  };

  // Cancel Editing Row
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLocation('');
  };

  // Save Inline Edit
  const handleSaveEdit = async (id) => {
    if (!editName.trim()) {
      alert('Device Name cannot be empty');
      return;
    }
    if (!editLocation.trim()) {
      alert('Location cannot be empty');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateDevice(id, {
        name: editName.trim(),
        location: editLocation.trim(),
      });
      if (res.data?.success) {
        cancelEdit();
        fetchDevicesList();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update device');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Device
  const handleDeleteDevice = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete device "${name}" (${id})?`);
    if (!confirmDelete) return;

    try {
      await deleteDevice(id);
      fetchDevicesList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete device');
    }
  };

  // Copy Device ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered devices by search
  const filteredDevices = devices.filter((dev) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      dev.deviceId?.toLowerCase().includes(term) ||
      dev.name?.toLowerCase().includes(term) ||
      dev.location?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredDevices.length);
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  return (
    <div className="dashboard-wrapper">
      <Sidebar currentPage="devices" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="main-content">
        <Navbar
          currentPage="devices"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={fetchDevicesList}
        />

        {/* 1. Top Section: Register New Device Card with Open Form Button */}
        <div className="dash-card device-register-card">
          <div
            className="device-register-card-header"
            style={{ marginBottom: isFormOpen ? '18px' : '0' }}
          >
            <div className="card-header-left-wrap">
              <div className="card-header-icon-wrap">
                <Cpu size={20} color="#00A896" />
              </div>
              <div>
                <h2 className="device-register-title">Register New Device</h2>
                <p className="device-register-subtitle">
                  Configure and connect hardware telemetry nodes and pump controllers
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`register-toggle-btn ${isFormOpen ? 'active' : ''}`}
              onClick={() => {
                setIsFormOpen(!isFormOpen);
                setFormError('');
              }}
            >
              {isFormOpen ? <X size={15} /> : <Plus size={16} />}
              <span>{isFormOpen ? 'Close Form' : 'Register Device'}</span>
            </button>
          </div>

          {/* Form opens when clicking "Register Device" */}
          {isFormOpen && (
            <form onSubmit={handleRegisterDevice} className="device-register-row-form animate-slide-down">
              <div className="input-field-group field-device-id">
                <label>Device ID</label>
                <input
                  type="text"
                  placeholder="e.g. WT-DEV-001"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
                  disabled={submitting}
                  className="row-form-input monospace"
                  autoFocus
                  required
                />
              </div>

              <div className="input-field-group field-device-name">
                <label>Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. Overhead Tank Motor Pump"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={submitting}
                  className="row-form-input"
                  required
                />
              </div>

              <div className="input-field-group field-location">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Tower A - Rooftop Tank"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  disabled={submitting}
                  className="row-form-input"
                  required
                />
              </div>

              <div className="form-submit-group" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="register-submit-btn"
                >
                  {submitting ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>Save Device</span>
                </button>

                <button
                  type="button"
                  className="row-form-cancel-btn"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Feedback Alerts */}
          {formError && (
            <div className="device-form-alert alert-error">
              <AlertCircle size={15} />
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError('')} className="alert-close-btn">
                <X size={13} />
              </button>
            </div>
          )}

          {formSuccess && (
            <div className="device-form-alert alert-success">
              <CheckCircle2 size={15} />
              <span>{formSuccess}</span>
              <button type="button" onClick={() => setFormSuccess('')} className="alert-close-btn">
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* 2. Devices Table Section */}
        <div className="dash-card history-table-card" style={{ marginTop: '20px' }}>
          {/* Table Header & Search Toolbar */}
          <div className="device-table-toolbar">
            <div className="toolbar-title-wrap">
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Registered Devices</span>
                <span className="count-badge">{devices.length}</span>
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                All registered hardware controllers and telemetry nodes
              </p>
            </div>

            <div className="toolbar-actions-wrap">
              <div className="history-search-wrap" style={{ minWidth: '260px' }}>
                <Search size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Search by ID, name, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                className="refresh-btn"
                onClick={fetchDevicesList}
                disabled={loading}
                title="Refresh Table"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="table-responsive-container">
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th style={{ width: '180px' }}>Device ID</th>
                  <th>Device Name</th>
                  <th>Location</th>
                  <th style={{ width: '180px' }}>Registered On</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '50px 0', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#00A896' }} />
                      <div>Loading registered devices...</div>
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '50px 0', color: '#94A3B8' }}>
                      <AlertCircle size={28} style={{ margin: '0 auto 10px', color: '#F59E0B' }} />
                      <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                        {searchTerm ? 'No matching devices found' : 'No Devices Registered Yet'}
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        {searchTerm
                          ? 'Try adjusting your search query above.'
                          : 'Use the form at the top to register your first device.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDevices.map((dev, idx) => {
                    const isEditing = editingId === (dev._id || dev.deviceId);
                    const formattedDate = new Date(dev.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = new Date(dev.createdAt || Date.now()).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    if (isEditing) {
                      /* Inline Edit Mode */
                      return (
                        <tr key={dev._id || dev.deviceId} style={{ background: '#F8FAFC' }}>
                          <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#64748B', fontFamily: 'monospace', fontSize: '13px' }}>
                              {dev.deviceId}
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Device Name"
                              className="inline-edit-input"
                              autoFocus
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              placeholder="Location"
                              className="inline-edit-input"
                            />
                          </td>
                          <td style={{ fontSize: '12px', color: '#94A3B8' }}>
                            <div>{formattedDate}</div>
                            <div style={{ fontSize: '11px' }}>{formattedTime}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                className="inline-save-btn"
                                onClick={() => handleSaveEdit(dev._id || dev.deviceId)}
                                disabled={savingEdit}
                                title="Save Changes"
                              >
                                {savingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                                <span>Save</span>
                              </button>
                              <button
                                className="inline-cancel-btn"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    /* Normal View Mode */
                    return (
                      <tr key={dev._id || dev.deviceId}>
                        <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="table-device-id-chip">
                              {dev.deviceId}
                            </span>
                            <button
                              onClick={() => handleCopyId(dev.deviceId)}
                              className="copy-btn-ghost"
                              title="Copy Device ID"
                            >
                              {copiedId === dev.deviceId ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                            {dev.name}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
                            <MapPin size={14} color="#00A896" />
                            <span>{dev.location}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#1E293B', fontSize: '12px' }}>{formattedDate}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{formattedTime}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="device-action-btn edit"
                              onClick={() => startEdit(dev)}
                              title="Edit Name & Location"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              className="device-action-btn delete"
                              onClick={() => handleDeleteDevice(dev._id || dev.deviceId, dev.name)}
                              title="Delete Device"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table Pagination Bar */}
            <div className="table-pagination-bar" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Showing {filteredDevices.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredDevices.length} devices
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
        </div>
      </main>
    </div>
  );
};

export default Devices;
