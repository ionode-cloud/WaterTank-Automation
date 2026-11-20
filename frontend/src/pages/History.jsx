import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { socket } from '../services/socket';
import { getData, getDevices } from '../services/api';
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
} from 'lucide-react';

const History = ({ onNavigate, currentUser, onOpenAuth, onLogout }) => {
  const [records, setRecords] = useState([]);
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

  // Load available devices list for filter dropdown
  useEffect(() => {
    async function loadDevs() {
      try {
        const res = await getDevices();
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDevicesList(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load devices for history filter:', err);
      }
    }
    loadDevs();
  }, []);

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
      <Sidebar currentPage="history" onNavigate={onNavigate} onLogout={onLogout} />

      {/* 2. Main History Content Area */}
      <main className="main-content">
        <Navbar
          currentPage="history"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
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
                <option value="">All Devices</option>
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
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                      <AlertTriangle size={24} style={{ margin: '0 auto 10px', color: '#F59E0B' }} />
                      <div>No telemetry records match your search or filters.</div>
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
                          <span style={{ fontWeight: 700, color: '#E69500' }}>
                            {Number(item.voltage).toFixed(1)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>V</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1D2671' }}>
                            {Number(item.current).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>A</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0284C7' }}>
                            {Math.round(item.power).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px' }}>W</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#059669' }}>
                            {Number(item.powerFactor).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const cap = item.tankCapacity || 1000;
                            const con = item.waterConsumption !== undefined ? item.waterConsumption : 0;
                            const lvl = item.waterLevel !== undefined ? item.waterLevel : (cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0);
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="table-water-bar-bg">
                                  <div
                                    className="table-water-bar-fill"
                                    style={{ width: `${lvl}%` }}
                                  ></div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '12px', color: '#0284C7' }}>
                                  {lvl}%
                                </span>
                                {item.waterConsumption !== undefined && item.tankCapacity ? (
                                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                    ({item.waterConsumption}/{item.tankCapacity}L)
                                  </span>
                                ) : null}
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
      </main>
    </div>
  );
};

export default History;
