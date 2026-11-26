import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { socket } from '../services/socket';
import { getData, getDevices, getFaultLogs, resolveFaultLog } from '../services/api';
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
} from 'lucide-react';

const History = ({ onNavigate, currentUser, onOpenAuth, onLogout, onOpenProfile }) => {
  const isUserAdmin = currentUser && String(currentUser.role).toUpperCase() === 'ADMIN';

  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' or 'faults'
  const [records, setRecords] = useState([]);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [devicesList, setDevicesList] = useState([]);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [motorFilter, setMotorFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(socket.connected);
  const [hasPendingDevices, setHasPendingDevices] = useState(false);
  const [pendingDeviceList, setPendingDeviceList] = useState([]);

  // Load available devices list for filter dropdown
  useEffect(() => {
    async function loadDevs() {
      try {
        const res = await getDevices();
        let devs = [];
        if (res.data?.success && Array.isArray(res.data.data)) {
          devs = res.data.data;
        }

        // For Admin: query all distinct device IDs from SensorData & MotorHistory
        // so that ALL devices that ever existed or logged telemetry appear in the filter!
        if (isUserAdmin) {
          try {
            const distinctRes = await getData({ devicesOnly: 'true' });
            if (distinctRes.data?.success && Array.isArray(distinctRes.data.data)) {
              const knownSet = new Set(devs.map((d) => d.deviceId));
              distinctRes.data.data.forEach((id) => {
                if (!knownSet.has(id)) {
                  devs.push({ deviceId: id, name: 'Historical Telemetry' });
                }
              });
            }
          } catch (e) {
            console.warn('Failed to load distinct device IDs for admin history filter:', e);
          }
        } else {
          try {
            const pRes = await getDevices({ includePending: 'true' });
            if (pRes.data?.success && Array.isArray(pRes.data.data)) {
              const pendingOnly = pRes.data.data.filter((d) => d.approvalStatus === 'PENDING');
              setHasPendingDevices(pendingOnly.length > 0);
              setPendingDeviceList(pendingOnly);
            }
          } catch {}
        }

        setDevicesList(devs);
      } catch (err) {
        console.error('Failed to load devices for history filter:', err);
      }
    }
    loadDevs();
  }, [isUserAdmin]);

  // Fetch telemetry records from backend API
  const fetchRecords = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit,
      };
      if (motorFilter) params.motorStatus = motorFilter;
      if (deviceFilter) params.deviceId = deviceFilter;

      const res = await getData(params);
      if (res.data?.success) {
        setRecords(res.data.data || []);
        setTotalCount(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.page || 1);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch history records:', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, motorFilter, deviceFilter]);

  // Initial load & filter change
  useEffect(() => {
    fetchRecords(1);
  }, [limit, motorFilter, deviceFilter]);

  // Fetch fault logs for the Fault Logs tab
  const fetchFaults = useCallback(async () => {
    try {
      const res = await getFaultLogs({ deviceId: deviceFilter || undefined, limit: 100 });
      if (res.data?.success) {
        setFaults(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load fault logs in History:', err);
    }
  }, [deviceFilter]);

  useEffect(() => {
    fetchFaults();
  }, [fetchFaults]);

  // Live fault socket listeners
  useEffect(() => {
    function onNewFault(f) {
      if (!f) return;
      if (deviceFilter && f.deviceId && f.deviceId !== deviceFilter) return;
      setFaults((prev) => [f, ...prev.filter((item) => item._id !== f._id)]);
    }
    function onFaultResolved(f) {
      if (!f) return;
      setFaults((prev) =>
        prev.map((item) => (item._id === f._id ? { ...item, faultStatus: 'Resolved' } : item))
      );
    }

    socket.on('new_fault', onNewFault);
    socket.on('fault_resolved', onFaultResolved);

    return () => {
      socket.off('new_fault', onNewFault);
      socket.off('fault_resolved', onFaultResolved);
    };
  }, [deviceFilter]);

  // Socket.IO live listener for new incoming records
  useEffect(() => {
    function onConnect() {
      setIsLiveConnected(true);
    }
    function onDisconnect() {
      setIsLiveConnected(false);
    }
    function onSensorUpdate(newReading) {
      if (deviceFilter && newReading.deviceId && newReading.deviceId !== deviceFilter) return;
      if (motorFilter && newReading.motorStatus && newReading.motorStatus !== motorFilter) return;

      // Prepend newest live reading if on page 1 and no specific filters blocking it
      setRecords((prev) => {
        if (page !== 1) return prev;
        const formatted = {
          _id: newReading._id || `live-${Date.now()}`,
          deviceId: newReading.deviceId || 'WT-DEV-001',
          voltage: newReading.voltage,
          current: newReading.current,
          power: newReading.power,
          powerFactor: newReading.powerFactor,
          tankCapacity: newReading.tankCapacity,
          waterConsumption: newReading.waterConsumption,
          waterLevel: newReading.waterLevel,
          motorStatus: newReading.motorStatus,
          energyConsumption: newReading.energyConsumption,
          timestamp: new Date().toISOString(),
        };
        // Keep list bounded to current limit
        return [formatted, ...prev.slice(0, limit - 1)];
      });
      setTotalCount((c) => c + 1);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sensor_update', onSensorUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sensor_update', onSensorUpdate);
    };
  }, [page, limit, deviceFilter, motorFilter]);

  // Download Table in CSV / Spreadsheet Format
  const handleDownloadTable = async () => {
    try {
      // Fetch up to 1000 latest records for a comprehensive export
      const res = await getData({ limit: 1000, motorStatus: motorFilter, deviceId: deviceFilter });
      const itemsToExport = res.data?.data || records;

      if (!itemsToExport || itemsToExport.length === 0) {
        alert('No data available to download.');
        return;
      }

      const headers = [
        'ID',
        'Device ID',
        'Date',
        'Time',
        'Voltage (V)',
        'Current (A)',
        'Active Power (W)',
        'Power Factor (PF)',
        'Tank Capacity (L)',
        'Water Consumption (L)',
        'Water Level (%)',
        'Motor Status',
        'Energy (kWh)',
      ];

      const csvRows = [
        headers.join(','),
        ...itemsToExport.map((row) => {
          const d = new Date(row.timestamp);
          const dateStr = d.toLocaleDateString('en-US');
          const timeStr = d.toLocaleTimeString('en-US');
          const cap = row.tankCapacity || 1000;
          const con = row.waterConsumption !== undefined ? row.waterConsumption : 0;
          const lvl = row.waterLevel !== undefined ? row.waterLevel : (cap > 0 ? Math.round((con / cap) * 100) : 0);
          return [
            `"${row._id || ''}"`,
            `"${row.deviceId || 'WT-DEV-001'}"`,
            `"${dateStr}"`,
            `"${timeStr}"`,
            row.voltage ?? '',
            row.current ?? '',
            row.power ?? '',
            row.powerFactor ?? '',
            row.tankCapacity ?? '',
            row.waterConsumption ?? '',
            lvl,
            `"${row.motorStatus || ''}"`,
            row.energyConsumption ?? '',
          ].join(',');
        }),
      ];

      const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `watertank_history_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download table: ' + err.message);
    }
  };

  // Filter local search on current page
  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(r.timestamp).toLocaleString().toLowerCase();
    return (
      dateStr.includes(term) ||
      (r.deviceId && r.deviceId.toLowerCase().includes(term)) ||
      (r.motorStatus && r.motorStatus.toLowerCase().includes(term)) ||
      String(r.voltage).includes(term) ||
      String(r.power).includes(term)
    );
  });

  return (
    <div className="dashboard-wrapper">
      {/* 1. Left Sidebar Navigation with active History */}
      <Sidebar currentPage="history" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      {/* 2. Main History Content Area */}
      <main className="main-content">
        <Navbar
          currentPage="history"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
          onRefresh={() => fetchRecords(page)}
        />

        {/* Top Header Card */}
        <div className="dash-card history-header-card">
          <div className="history-header-left">
            <div className="history-badge-icon">
              <Database size={22} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>
                Telemetry History & Data Records
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
                View, filter and download full-stack sensor readings, power metrics and pump events
              </p>
            </div>
          </div>

          <div className="history-header-actions">
            <button
              className="refresh-btn"
              onClick={() => fetchRecords(page)}
              disabled={loading}
              title="Refresh Records"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="pill-action-btn"
              onClick={handleDownloadTable}
              title="Download table data in CSV / Excel format"
            >
              <Download size={15} />
              <span>Download Table (CSV)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Telemetry Records vs Fault Logs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeTab === 'telemetry' ? '1px solid #00A896' : '1px solid #CBD5E1',
              background: activeTab === 'telemetry' ? '#00A896' : '#FFFFFF',
              color: activeTab === 'telemetry' ? '#FFFFFF' : '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Database size={15} />
            <span>Telemetry Records ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faults')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeTab === 'faults' ? '1px solid #EF4444' : '1px solid #CBD5E1',
              background: activeTab === 'faults' ? '#EF4444' : '#FFFFFF',
              color: activeTab === 'faults' ? '#FFFFFF' : '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <AlertTriangle size={15} />
            <span>Fault Logs ({faults.length})</span>
          </button>
        </div>

        {activeTab === 'telemetry' ? (
          <>
            {/* Filter Toolbar Card */}
            <div className="dash-card history-toolbar-card">
          <div className="history-search-wrap">
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search by date, status, voltage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="history-filters-wrap">
            <div className="filter-select-group">
              <Cpu size={13} color="#64748B" />
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                title="Filter records by Device ID"
              >
                {!isUserAdmin ? (
                  devicesList.length === 0 ? (
                    hasPendingDevices ? (
                      <option value="">Pending approval by admin ({pendingDeviceList.length})</option>
                    ) : (
                      <option value="">No Approved Devices</option>
                    )
                  ) : (
                    <option value="">My Registered Devices ({devicesList.length})</option>
                  )
                ) : (
                  <option value="">All Devices (Show All History)</option>
                )}
                {devicesList.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceId} {d.name ? `(${d.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-group">
              <Filter size={13} color="#64748B" />
              <select
                value={motorFilter}
                onChange={(e) => setMotorFilter(e.target.value)}
              >
                <option value="">All Motor States</option>
                <option value="ON">Motor ON</option>
                <option value="OFF">Motor OFF</option>
              </select>
            </div>

            <div className="filter-select-group">
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Rows:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Data Table Card */}
        <div className="dash-card history-table-card">
          <div className="table-responsive-container">
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th>Device ID</th>
                  <th>Timestamp</th>
                  <th>Line Voltage</th>
                  <th>Load Current</th>
                  <th>Active Power</th>
                  <th>Power Factor</th>
                  <th>Water Level</th>
                  <th>Motor Status</th>
                  <th>Energy</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#00A896' }} />
                      <div>Loading telemetry historical records...</div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '44px 16px', color: '#94A3B8' }}>
                      {!isUserAdmin && hasPendingDevices ? (
                        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                          <Clock size={32} style={{ color: '#D97706', margin: '0 auto 10px' }} />
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#B45309' }}>
                            Pending approval by admin
                          </div>
                          <div style={{ fontSize: '13px', color: '#78350F', marginTop: '6px' }}>
                            Device <strong>{pendingDeviceList.map((d) => d.deviceId).join(', ')}</strong> is pending approval by admin. Telemetry data and historical records will automatically show after approval is granted by the admin.
                          </div>
                        </div>
                      ) : !isUserAdmin && devicesList.length === 0 ? (
                        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                          <AlertTriangle size={30} style={{ margin: '0 auto 10px', color: '#F59E0B' }} />
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                            No Registered Devices Found
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                            You currently have no registered devices. Register your admin-provided hardware ID on the Devices tab to view telemetry history.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <AlertTriangle size={24} style={{ margin: '0 auto 10px', color: '#F59E0B' }} />
                          <div>No telemetry records match your search or filters.</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => {
                    const isMotorOn = item.motorStatus === 'ON';
                    const d = new Date(item.timestamp);
                    const formattedDate = d.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = d.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={item._id || idx}>
                        <td style={{ color: '#94A3B8', fontWeight: 600 }}>
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td>
                          <span className="table-device-id-badge">
                            {item.deviceId || 'WT-DEV-001'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{formattedDate}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{formattedTime}</div>
                        </td>
                        <td>
                          {item.vol1 !== undefined && item.vol1 !== null ? (
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E69500', lineHeight: 1.3 }}>
                              <div>V1: {item.vol1}V</div>
                              <div>V2: {item.vol2}V</div>
                              <div>V3: {item.vol3}V</div>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700, color: '#E69500' }}>
                                {item.voltage !== undefined && item.voltage !== null ? Number(item.voltage).toFixed(1) : '-'}
                              </span>
                              {item.voltage !== undefined && item.voltage !== null && (
                                <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>V</span>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {item.cu1 !== undefined && item.cu1 !== null ? (
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D2671', lineHeight: 1.3 }}>
                              <div>I1: {item.cu1}A</div>
                              <div>I2: {item.cu2}A</div>
                              <div>I3: {item.cu3}A</div>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700, color: '#1D2671' }}>
                                {item.current !== undefined && item.current !== null ? Number(item.current).toFixed(2) : '-'}
                              </span>
                              {item.current !== undefined && item.current !== null && (
                                <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>A</span>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0284C7' }}>
                            {item.power !== undefined && item.power !== null ? Math.round(item.power).toLocaleString() : '-'}
                          </span>
                          {item.power !== undefined && item.power !== null && (
                            <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>W</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#059669' }}>
                            {item.powerFactor !== undefined && item.powerFactor !== null ? Number(item.powerFactor).toFixed(2) : '-'}
                          </span>
                          {item.frequency !== undefined && item.frequency !== null && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{item.frequency} Hz</div>
                          )}
                        </td>
                        <td>
                          {(() => {
                            const cap = item.tankCapacity || null;
                            const con = item.waterConsumption !== undefined ? item.waterConsumption : null;
                            const lvl = item.waterLevel !== undefined ? item.waterLevel : (cap && con !== null && cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : null);
                            const wlStatus = item.waterLevelStatus || (lvl !== null ? (lvl < 25 ? 'Low' : lvl > 75 ? 'High' : 'Medium') : null);
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className="table-water-bar-bg">
                                    <div
                                      className="table-water-bar-fill"
                                      style={{ width: `${lvl !== null ? Math.min(100, Math.max(0, lvl)) : 0}%` }}
                                    ></div>
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#0284C7' }}>
                                    {lvl !== null ? `${lvl}%` : '-'}
                                  </span>
                                  {wlStatus && (
                                    <span className={`water-level-status-pill wl-status-${wlStatus.toLowerCase()}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                      <span className="wl-dot" style={{ width: '5px', height: '5px' }}></span>
                                      <span>{wlStatus}</span>
                                    </span>
                                  )}
                                </div>
                                {con !== null && cap !== null && (
                                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                                    {con} / {cap} L
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <span className={`table-status-badge ${isMotorOn ? 'status-on' : 'status-off'}`}>
                            <span className="badge-dot"></span>
                            {isMotorOn ? 'RUNNING' : 'STOPPED'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E293B' }}>
                            {Number(item.energyConsumption || 0).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>kWh</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="table-pagination-bar">
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Showing {filteredRecords.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, totalCount)} of {totalCount} records
            </div>

            <div className="pagination-buttons-wrap">
              <button
                className="page-nav-btn"
                disabled={page <= 1 || loading}
                onClick={() => fetchRecords(page - 1)}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span className="page-indicator">
                Page {page} of {totalPages || 1}
              </span>

              <button
                className="page-nav-btn"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRecords(page + 1)}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
          </>
        ) : (
          /* FAULT LOGS TAB CONTENT */
          <div className="dash-card history-table-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Hardware & System Fault History
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Showing all recorded fault occurrences, active alarms, and recovery timestamps
                </p>
              </div>
              <button
                type="button"
                onClick={fetchFaults}
                className="refresh-btn"
                title="Refresh Fault Records"
              >
                <RefreshCw size={13} />
                <span>Refresh Faults</span>
              </button>
            </div>

            {faults.length === 0 ? (
              <div className="fault-empty-state" style={{ margin: '30px 20px' }}>
                <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
                <h4>No Fault Records Recorded</h4>
                <p>All hardware controllers and motor relays are operating within nominal parameters.</p>
              </div>
            ) : (
              <div className="table-responsive-container">
                <table className="telemetry-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>#</th>
                      <th>Device ID / Name</th>
                      <th>Fault Description</th>
                      <th style={{ width: '130px' }}>Fault Status</th>
                      <th style={{ width: '140px' }}>Date</th>
                      <th style={{ width: '120px' }}>Time</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faults.map((f, idx) => {
                      const isActive = f.faultStatus === 'Active';
                      const formattedDate = f.date || new Date(f.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                      const formattedTime = f.time || new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return (
                        <tr key={f._id || idx}>
                          <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                          <td>
                            <span className="table-device-id-badge">{f.deviceId}</span>
                            {f.deviceName && <span style={{ marginLeft: '6px', fontSize: '12px', color: '#64748B' }}>({f.deviceName})</span>}
                          </td>
                          <td style={{ fontWeight: 600, color: isActive ? '#B91C1C' : '#334155' }}>
                            {f.faultDescription}
                          </td>
                          <td>
                            <span className={isActive ? 'fault-status-active' : 'fault-status-resolved'}>
                              {isActive ? 'Fault' : 'Resolved'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>{formattedDate}</td>
                          <td style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>{formattedTime}</td>
                          <td style={{ textAlign: 'right' }}>
                            {isActive && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await resolveFaultLog(f._id);
                                    fetchFaults();
                                  } catch (err) {
                                    console.error('Failed to resolve fault:', err);
                                  }
                                }}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#0284C7',
                                  cursor: 'pointer',
                                }}
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
