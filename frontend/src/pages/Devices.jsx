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
  Droplet,
  Droplets,
  Zap,
  Info,
  Key,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { getDevices, createDevice, updateDevice, deleteDevice, getModels, claimDeviceById, forceDeviceOn, forceDeviceOff } from '../services/api';
import { socket } from '../services/socket';
import { getAllModels, getModelConfig, MOTOR_MODELS } from '../config/motorModels';

const Devices = ({ onNavigate, currentUser, onOpenAuth, onLogout, onOpenProfile }) => {
  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.isAdmin
  );

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Available Motor Models & Selected Model for Registration
  const [availableModels, setAvailableModels] = useState(getAllModels());
  const [selectedModel, setSelectedModel] = useState('SG-1PS-1.5');

  // Registration Form State & Mode: 'create' for Admin | 'claim' for User
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState(isAdmin ? 'create' : 'claim');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormMode(isAdmin ? 'create' : 'claim');
  }, [isAdmin]);

  // Inline Table Row Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Copied chip state
  const [copiedId, setCopiedId] = useState(null);

  // Force Control state
  const [forcingId, setForcingId] = useState(null);

  const handleForceOnDevice = async (deviceId) => {
    try {
      setForcingId(deviceId);
      setFormError('');
      const res = await forceDeviceOn(deviceId);
      if (res.data?.success) {
        setDevices((prev) =>
          prev.map((d) =>
            d.deviceId === deviceId
              ? {
                  ...d,
                  forceOn: true,
                  forceOff: false,
                  motorStatus: 'ON',
                  data: { ...(d.data || {}), motorStatus: 'ON', forceOn: true, forceOff: false },
                }
              : d
          )
        );
        setFormSuccess(`Force ON active for ${deviceId} — Motor status is ON.`);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to execute Force ON');
    } finally {
      setForcingId(null);
    }
  };

  const handleForceOffDevice = async (deviceId) => {
    try {
      setForcingId(deviceId);
      setFormError('');
      const res = await forceDeviceOff(deviceId);
      if (res.data?.success) {
        setDevices((prev) =>
          prev.map((d) =>
            d.deviceId === deviceId
              ? {
                  ...d,
                  forceOff: true,
                  forceOn: false,
                  motorStatus: 'OFF',
                  data: { ...(d.data || {}), motorStatus: 'OFF', forceOff: true, forceOn: false },
                }
              : d
          )
        );
        setFormSuccess(`Force OFF active for ${deviceId} — Motor status is OFF.`);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to execute Force OFF');
    } finally {
      setForcingId(null);
    }
  };

  // Fetch Devices
  const fetchDevicesList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDevices({ includePending: 'true' });
      if (res.data?.success) {
        setDevices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dynamic models list from backend
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await getModels();
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setAvailableModels(res.data.data);
        }
      } catch (err) {
        // Fallback to static models already initialized
      }
    }
    loadModels();
  }, []);

  useEffect(() => {
    fetchDevicesList();
  }, [fetchDevicesList]);

  // Real-time device status update listener (Active vs Fault)
  useEffect(() => {
    function onDeviceStatusUpdate(update) {
      if (!update?.deviceId) return;
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === update.deviceId
            ? {
                ...d,
                status: update.status || d.status,
                deviceStatus: update.deviceStatus || update.status || d.deviceStatus,
                faultDescription: update.faultDescription !== undefined ? update.faultDescription : d.faultDescription,
              }
            : d
        )
      );
    }

    socket.on('device_status_update', onDeviceStatusUpdate);
    return () => socket.off('device_status_update', onDeviceStatusUpdate);
  }, []);

  // Handle Create Device from Top Row Form
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanId = newDeviceId.trim().toUpperCase();
    const cleanName = newName.trim();
    const cleanLocation = newLocation.trim();

    if (!selectedModel) {
      setFormError('Please select a Motor Model for this device');
      return;
    }
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

    const modelCfg = getModelConfig(selectedModel) || availableModels.find((m) => m.modelNumber === selectedModel);

    setSubmitting(true);
    try {
      const res = await createDevice({
        deviceId: cleanId,
        name: cleanName,
        location: cleanLocation,
        modelNumber: selectedModel,
        modelName: modelCfg?.modelName || modelCfg?.motorType || selectedModel,
        motorType: modelCfg?.motorType || null,
        motorCapacity: modelCfg?.hpRating?.label || modelCfg?.hpLabel || null,
        phase: modelCfg?.phase || null,
      });

      if (res.data?.success) {
        setFormSuccess(`Device '${cleanId}' created successfully with Model '${selectedModel}'! Opening Dashboard...`);
        setNewDeviceId('');
        setNewName('');
        setNewLocation('');
        setIsFormOpen(false);
        try {
          localStorage.setItem('wt_selected_device_id', cleanId);
        } catch {}
        fetchDevicesList();
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('dashboard');
          }
        }, 800);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create device';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Register by Device ID (Claim Admin-Provided Hardware ID)
  const handleClaimDevice = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanId = newDeviceId.trim().toUpperCase();
    const cleanName = newName.trim();
    const cleanLocation = newLocation.trim();

    if (!cleanId) {
      setFormError('Please enter the Device ID provided by your administrator (e.g. WT-DEV-001)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await claimDeviceById({
        deviceId: cleanId,
        name: cleanName || undefined,
        location: cleanLocation || undefined,
      });

      if (res.data?.success) {
        setFormSuccess(
          res.data.message ||
          `Registration request for Device '${cleanId}' submitted! Status: Pending approval by admin. It will appear on your dashboard and history once approved by admin.`
        );
        setNewDeviceId('');
        setNewName('');
        setNewLocation('');
        setIsFormOpen(false);
        fetchDevicesList();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to register device by ID';
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
      <Sidebar currentPage="devices" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      <main className="main-content">
        <Navbar
          currentPage="devices"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={fetchDevicesList}
          onOpenProfile={onOpenProfile}
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
                <h2 className="device-register-title">
                  {isAdmin ? 'Device Provisioning & Creation' : 'Device Registration'}
                </h2>
                <p className="device-register-subtitle">
                  {isAdmin
                    ? 'Provision and initialize IoT hardware controllers across 4 standardized motor models'
                    : 'Register the unique Device ID provided by your Administrator to link hardware'}
                </p>
              </div>
            </div>

            <div className="device-action-buttons-group" style={{ display: 'flex', gap: '10px' }}>
              {isAdmin ? (
                <button
                  type="button"
                  className={`register-toggle-btn ${isFormOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsFormOpen(!isFormOpen);
                    setFormMode('create');
                    setFormError('');
                  }}
                >
                  <Plus size={16} />
                  <span>Create Device (4 Models)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`register-toggle-btn btn-claim-mode ${isFormOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsFormOpen(!isFormOpen);
                    setFormMode('claim');
                    setFormError('');
                  }}
                >
                  <Key size={16} />
                  <span>Register by Device ID</span>
                </button>
              )}
            </div>
          </div>

          {/* Form opens when clicking the action button */}
          {isFormOpen && (
            <div className="device-register-full-form animate-slide-down">
              {isAdmin ? (
                /* Mode 1: Create Device with 4 Models (Admin only) */
                <form onSubmit={handleRegisterDevice}>
                  <div className="register-fields-grid" style={{ marginTop: '0', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="input-field-group">
                      <label>Motor Model *</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={submitting}
                        className="row-form-input"
                        style={{ cursor: 'pointer', fontWeight: 600, background: '#FFFFFF' }}
                        required
                      >
                        {availableModels.map((m) => {
                          const phaseTag = m.phase ? `(${m.phase})` : '';
                          const hpTag = m.hpLabel || (m.hpRating?.label) || '';
                          return (
                            <option key={m.modelNumber} value={m.modelNumber}>
                              {m.modelNumber} – {m.modelName || m.motorType} {hpTag ? `[${hpTag}]` : ''} {phaseTag}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="input-field-group">
                      <label>Device ID *</label>
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

                    <div className="input-field-group">
                      <label>Device Name *</label>
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

                    <div className="input-field-group">
                      <label>Location *</label>
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
                  </div>

                  <div className="form-submit-row" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      disabled={submitting || !selectedModel}
                      className="register-submit-btn"
                    >
                      {submitting ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      <span>Create Device</span>
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
              ) : (
                /* Mode 2: Register by Device ID (Claim Admin-Provided Hardware ID) */
                <form onSubmit={handleClaimDevice}>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Key size={18} style={{ flexShrink: 0, color: '#2563EB' }} />
                    <div>
                      <strong>Hardware Activation:</strong> Enter the unique Device ID provided by your System Administrator to bind and activate this tank controller for your account.
                    </div>
                  </div>

                  <div className="register-fields-grid" style={{ marginTop: '0', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="input-field-group">
                      <label>Device ID (Provided by Admin) *</label>
                      <input
                        type="text"
                        placeholder="e.g. WT-001 or WT-DEV-102"
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
                        disabled={submitting}
                        className="row-form-input monospace"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="input-field-group">
                      <label>Friendly Device Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. My Rooftop Water Tank"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={submitting}
                        className="row-form-input"
                      />
                    </div>

                    <div className="input-field-group">
                      <label>Location (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Building A - 2nd Floor"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        disabled={submitting}
                        className="row-form-input"
                      />
                    </div>
                  </div>

                  <div className="form-submit-row" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      disabled={submitting || !newDeviceId.trim()}
                      className="register-submit-btn"
                      style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
                    >
                      {submitting ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>Register & Activate Device</span>
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
            </div>
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
                  <th style={{ width: '50px' }}>#</th>
                  <th style={{ width: '140px' }}>Device ID</th>
                  <th>Device Name</th>
                  <th style={{ width: '120px' }}>Model</th>
                  <th>Location</th>
                  <th style={{ width: '175px' }}>Motor & Override</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '130px' }}>Registered On</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px 0', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#00A896' }} />
                      <div>Loading registered devices...</div>
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px 0', color: '#94A3B8' }}>
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
                            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                              {dev.modelNumber || 'Standard'}
                            </span>
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
                          <td>
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>-</span>
                          </td>
                          <td>
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>-</span>
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
                          {dev.modelNumber ? (
                            <span
                              className="table-model-badge"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: '#EFF6FF',
                                color: '#0284C7',
                                border: '1px solid #BFDBFE',
                              }}
                              title={`Model: ${dev.modelNumber} (${dev.modelName || dev.motorType || ''})`}
                            >
                              <Layers size={11} />
                              <span>{dev.modelNumber}</span>
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '11.5px' }}>Standard</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
                            <MapPin size={14} color="#00A896" />
                            <span>{dev.location}</span>
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const isPending = dev.approvalStatus === 'PENDING';
                            const isMotorOn = dev.forceOn ? true : (dev.forceOff ? false : (dev.motorStatus === 'ON' || dev.data?.motorStatus === 'ON'));
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      background: isMotorOn ? '#DCFCE7' : '#F1F5F9',
                                      color: isMotorOn ? '#16A34A' : '#64748B',
                                      border: `1px solid ${isMotorOn ? '#86EFAC' : '#E2E8F0'}`,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: isMotorOn ? '#16A34A' : '#94A3B8',
                                      }}
                                    />
                                    <span>Motor {isMotorOn ? 'ON' : 'OFF'}</span>
                                  </span>
                                  {dev.forceOn && (
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                      FORCE ON
                                    </span>
                                  )}
                                  {dev.forceOff && (
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '1px 5px', borderRadius: '4px', border: '1px solid #FECACA' }}>
                                      FORCE OFF
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    disabled={isPending || forcingId === dev.deviceId}
                                    onClick={() => handleForceOnDevice(dev.deviceId)}
                                    style={{
                                      padding: '2px 7px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      border: '1px solid #86EFAC',
                                      background: dev.forceOn ? '#16A34A' : '#F0FDF4',
                                      color: dev.forceOn ? '#FFFFFF' : '#15803D',
                                      cursor: isPending ? 'not-allowed' : 'pointer',
                                    }}
                                    title={isPending ? 'Pending approval' : 'Force motor ON (if it was OFF, also turns ON)'}
                                  >
                                    Force ON
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isPending || forcingId === dev.deviceId}
                                    onClick={() => handleForceOffDevice(dev.deviceId)}
                                    style={{
                                      padding: '2px 7px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      border: '1px solid #FECACA',
                                      background: dev.forceOff ? '#DC2626' : '#FEF2F2',
                                      color: dev.forceOff ? '#FFFFFF' : '#B91C1C',
                                      cursor: isPending ? 'not-allowed' : 'pointer',
                                    }}
                                    title={isPending ? 'Pending approval' : 'Force motor OFF (if it was ON, turns OFF)'}
                                  >
                                    Force OFF
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          {dev.approvalStatus === 'PENDING' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                              }}
                              title="Device registered by user. Pending approval by admin before activating."
                            >
                              ⏳ Pending approval by admin
                            </span>
                          ) : dev.approvalStatus === 'REJECTED' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                              }}
                              title={dev.rejectionReason || 'Registration Rejected by Administrator'}
                            >
                              ✕ Rejected
                            </span>
                          ) : dev.status === 'Fault' || dev.deviceStatus === 'Fault' ? (
                            <span className="badge-status-fault" title={dev.faultDescription || 'Fault condition reported'}>
                              <AlertCircle size={12} /> Fault
                            </span>
                          ) : (
                            <span className="badge-status-active">
                              <CheckCircle2 size={12} /> Active / Approved
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#1E293B', fontSize: '12px' }}>{formattedDate}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{formattedTime}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {dev.approvalStatus === 'PENDING' ? (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  color: '#B45309',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  background: '#FEF3C7',
                                  borderRadius: '6px',
                                  border: '1px solid #FDE68A',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Device registered by you. Waiting for Administrator approval."
                              >
                                ⏳ Pending approval by admin
                              </span>
                            ) : dev.approvalStatus === 'REJECTED' ? (
                              <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, padding: '3px 6px', background: '#FEE2E2', borderRadius: '4px' }}>
                                Rejected
                              </span>
                            ) : (
                              <button
                                className="device-action-btn view-dash"
                                onClick={() => {
                                  try {
                                    localStorage.setItem('wt_selected_device_id', dev.deviceId);
                                  } catch {}
                                  if (onNavigate) onNavigate('dashboard');
                                }}
                                title="Open Device in Dashboard"
                                style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #CCFBF1' }}
                              >
                                <ExternalLink size={13} />
                              </button>
                            )}
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
