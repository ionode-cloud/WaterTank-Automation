import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Droplets,
  Zap,
  Activity,
  Cpu,
  Gauge,
  Settings,
  BarChart2,
  Droplet,
  Power,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  MapPin,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Clock,
  Filter,
  Search,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';

import { socket } from '../services/socket';
import {
  getDashboardOverview,
  getPowerHistory,
  getMotorConsumption,
  getMotorHistory,
  forceMotorOn,
  forceMotorOff,
  getDevices,
  getData,
} from '../services/api';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Navbar from '../components/Navbar';

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
const formatSeconds = (sec) => {
  if (!sec || isNaN(sec)) return '0s';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatTimeLabel = (dateStr) => {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/* ==========================================================================
   1. Subcomponent: PowerMetricsCard (Top-Right Colored Cards)
   ========================================================================== */
const PowerMetricsCard = ({ metrics, hasData = true }) => {
  const { voltage, current, power, powerFactor } = metrics || {};
  const showDash = !hasData || voltage === null || voltage === undefined;

  return (
    <div className="dash-card power-metrics-section">
      <div className="section-top-bar">
        <div>
          <h3>Power Monitoring</h3>
          <p>Real-time line voltage, load current, power and power factor</p>
        </div>
      </div>

      <div className="metric-cards-grid">
        <div className="colored-stat-block stat-orange">
          <div className="stat-label-wrap">
            <span className="stat-label">Voltage</span>
            <Zap size={16} className="stat-icon" />
          </div>
          <div className="stat-value-wrap">
            <span className="stat-value">{showDash ? '-' : Number(voltage).toFixed(1)}</span>
            {!showDash && <span className="stat-unit">V</span>}
          </div>
        </div>

        <div className="colored-stat-block stat-navy">
          <div className="stat-label-wrap">
            <span className="stat-label">Current</span>
            <Activity size={16} className="stat-icon" />
          </div>
          <div className="stat-value-wrap">
            <span className="stat-value">{showDash ? '-' : Number(current).toFixed(2)}</span>
            {!showDash && <span className="stat-unit">A</span>}
          </div>
        </div>

        <div className="colored-stat-block stat-blue">
          <div className="stat-label-wrap">
            <span className="stat-label">Power</span>
            <Cpu size={16} className="stat-icon" />
          </div>
          <div className="stat-value-wrap">
            <span className="stat-value">{showDash ? '-' : Math.round(power).toLocaleString()}</span>
            {!showDash && <span className="stat-unit">W</span>}
          </div>
        </div>

        <div className="colored-stat-block stat-pf">
          <div className="stat-label-wrap">
            <span className="stat-label">PF</span>
            <Gauge size={16} className="stat-icon" />
          </div>
          <div className="stat-value-wrap">
            <span className="stat-value" style={{ fontSize: '22px' }}>
              {showDash ? '-' : Number(powerFactor).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   4. Subcomponent: PowerConsumptionChart (Middle-Left)
   ========================================================================== */
const CustomPowerTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-time">{label || data.time}</div>
        <div className="tooltip-value" style={{ color: '#E69500' }}>
          {data.power !== undefined && data.power !== null ? `${data.power} Watts` : '-'}
        </div>
        {data.voltage !== undefined && data.voltage !== null && (
          <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '3px', fontWeight: 700 }}>
            Line Voltage: {data.voltage} V
          </div>
        )}
        {data.current !== undefined && data.current !== null && (
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            Current: {data.current} A
          </div>
        )}
        {data.energy !== undefined && data.energy !== null && (
          <div style={{ fontSize: '11px', color: '#0284C7' }}>
            Energy: {data.energy} kWh
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g key={`dot-${cx}-${cy}`}>
      <line x1={cx} y1={cy + 6} x2={cx} y2={220} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="2 2" />
      <circle cx={cx} cy={cy} r={6} fill="#E69500" stroke="#FFFFFF" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={2} fill="#FFFFFF" />
    </g>
  );
};

const PowerConsumptionChart = ({ data = [], onRangeChange, currentRange = '24h' }) => {
  const [selectedRange, setSelectedRange] = useState(currentRange);

  const handleRange = (range) => {
    setSelectedRange(range);
    if (onRangeChange) onRangeChange(range);
  };

  const hasData = Array.isArray(data) && data.length > 0;
  // If exactly 1 point, duplicate with label so Recharts curve/fill displays cleanly
  let chartData = data;
  if (hasData && data.length === 1) {
    const single = data[0];
    chartData = [
      { ...single, time: `${single.time}` },
      { ...single, time: `${single.time} ` },
    ];
  }

  return (
    <div className="dash-card power-chart-card">
      <div className="chart-header-row">
        <div className="chart-title-wrap">
          <h3>Power Consumption Graph</h3>
          <p>Real-time and historical power demand curve</p>
        </div>

        <div className="chart-range-selector">
          <button
            className={`range-btn ${selectedRange === '24h' ? 'active' : ''}`}
            onClick={() => handleRange('24h')}
          >
            24 Hours
          </button>
          <button
            className={`range-btn ${selectedRange === '7d' ? 'active' : ''}`}
            onClick={() => handleRange('7d')}
          >
            7 Days
          </button>
          <button
            className={`range-btn ${selectedRange === '30d' ? 'active' : ''}`}
            onClick={() => handleRange('30d')}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="chart-body-container">
        {!hasData ? (
          <div className="chart-empty-state-box">
            <div className="empty-chart-icon-bubble">
              <Zap size={26} className="empty-chart-zap" />
            </div>
            <h4 className="empty-chart-heading">Awaiting Power Telemetry</h4>
            <p className="empty-chart-desc">
              No power telemetry recorded for this device in the selected {selectedRange === '24h' ? '24-hour' : selectedRange === '7d' ? '7-day' : 'monthly'} window.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="peachGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDE68A" stopOpacity={0.65} />
                  <stop offset="60%" stopColor="#FEF3C7" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FFFBEB" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis yAxisId="power" dataKey="power" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 'dataMax + 100']} />
              <YAxis yAxisId="voltage" orientation="right" hide={true} domain={['dataMin - 15', 'dataMax + 15']} />
              <Tooltip content={<CustomPowerTooltip />} />
              <Area
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke="#E69500"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#peachGradient)"
                dot={<CustomizedDot />}
                activeDot={{ r: 7, fill: '#E69500', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Line
                yAxisId="voltage"
                type="monotone"
                dataKey="voltage"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                strokeDasharray="4 4"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-legend-row">
        <div className="legend-item">
          <span className="legend-square" style={{ backgroundColor: '#E69500' }}></span>
          <span>Active Power (W)</span>
        </div>
        <div className="legend-item">
          <span className="legend-square" style={{ backgroundColor: '#10B981' }}></span>
          <span>Line Voltage (V)</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   5. Subcomponent: WaterTankCard (Middle-Right with Animated Wave Physics)
   ========================================================================== */
const WaterTankCard = ({ waterLevel, capacityLiters = 1000, currentLiters, hasData = true }) => {
  const [viewMode, setViewMode] = useState('tank');
  const hasLevel = hasData && waterLevel !== null && waterLevel !== undefined;
  const clampedLevel = hasLevel ? Math.max(0, Math.min(100, Math.round(waterLevel))) : 0;
  const displayLiters = hasLevel
    ? (currentLiters !== undefined && currentLiters !== null
        ? Math.round(currentLiters)
        : Math.round((clampedLevel / 100) * capacityLiters))
    : null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasLevel ? circumference - (clampedLevel / 100) * circumference : circumference;

  return (
    <div className="dash-card water-tank-card">
      <div className="tank-header">
        <div>
          <h3>Water Tank Level</h3>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Ultrasonic Depth Telemetry
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'tank' ? 'gauge' : 'tank')}
            title="Toggle Tank View / Circular Gauge View"
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            {viewMode === 'tank' ? <BarChart2 size={12} /> : <Droplet size={12} />}
            <span>{viewMode === 'tank' ? 'Gauge View' : 'Tank View'}</span>
          </button>
          <Settings size={18} className="tank-gear-icon" />
        </div>
      </div>

      {viewMode === 'tank' ? (
        <div className="tank-visual-wrapper">
          <div className="tank-glass-container">
            <div className="tank-graduation-marks">
              <div className="mark-tick"><span className="mark-line"></span>100%</div>
              <div className="mark-tick"><span className="mark-line"></span>75%</div>
              <div className="mark-tick"><span className="mark-line"></span>50%</div>
              <div className="mark-tick"><span className="mark-line"></span>25%</div>
              <div className="mark-tick"><span className="mark-line"></span>0%</div>
            </div>

            <div className="liquid-body" style={{ height: `${clampedLevel}%`, minHeight: clampedLevel > 0 ? '24px' : '0px' }}>
              <div className="sea-wave-wrap">
                <svg className="sea-wave sea-wave-back" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,45 C150,85 350,-15 500,35 C650,85 850,-15 1000,35 C1150,85 1350,-15 1500,35 L1500,120 L0,120 Z" />
                </svg>
                <svg className="sea-wave sea-wave-mid" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,30 C200,-10 400,70 600,25 C800,-15 1000,65 1200,25 C1400,-15 1600,65 1800,25 L1800,120 L0,120 Z" />
                </svg>
                <svg className="sea-wave sea-wave-front" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,15 C150,60 300,-10 450,20 C600,60 750,-10 900,20 C1050,60 1200,-10 1350,20 L1350,120 L0,120 Z" />
                </svg>
              </div>
            </div>

            <div className="tank-center-badge">
              <div className="tank-percentage-number">{hasLevel ? `${clampedLevel}%` : '-'}</div>
              <div className="tank-capacity-sub">
                {displayLiters !== null ? `${displayLiters} / ${capacityLiters} L` : `- / ${capacityLiters} L`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="tank-visual-wrapper" style={{ flexDirection: 'column' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px' }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="14" />
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#00A896"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>
                {hasLevel && displayLiters !== null ? displayLiters : '-'}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginTop: '3px' }}>
                LITERS
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tank-footer-status">
        <div className="tank-status-pill">
          <span className="status-dot" style={{ backgroundColor: '#F59E0B' }}></span>
          <span>Low (&lt;25%)</span>
        </div>
        <div className="tank-status-pill">
          <span className="status-dot" style={{ backgroundColor: '#10B981' }}></span>
          <span>Normal</span>
        </div>
        <div className="tank-status-pill">
          <span className="status-dot" style={{ backgroundColor: '#0284C7' }}></span>
          <span>Full (&gt;85%)</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   6. Subcomponent: MotorControlCard (Bottom-Left)
   ========================================================================== */
const MotorControlCard = ({ motorData, selectedDeviceId, hasData = true, onMotorStateChanged }) => {
  const motorStatus = hasData && motorData ? motorData.motorStatus : null;
  const isMotorKnown = motorStatus !== null && motorStatus !== undefined;
  const isMotorOn = isMotorKnown && motorStatus === 'ON';

  const {
    lastOnTime,
    lastOffTime,
    currentOnDuration = 0,
    currentOffDuration = 0,
    totalOnDurationSeconds = 0,
    totalOffDurationSeconds = 0,
  } = motorData || {};

  const [loadingAction, setLoadingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [liveDuration, setLiveDuration] = useState(isMotorOn ? currentOnDuration : currentOffDuration);

  useEffect(() => {
    if (!isMotorKnown) return;
    setLiveDuration(isMotorOn ? currentOnDuration : currentOffDuration);
    const interval = setInterval(() => {
      setLiveDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [motorStatus, currentOnDuration, currentOffDuration, isMotorOn, isMotorKnown]);

  const handleCommand = async (command) => {
    if (loadingAction) return;
    setLoadingAction(command);
    setFeedback(null);

    try {
      const res = command === 'ON'
        ? await forceMotorOn('dashboard', selectedDeviceId)
        : await forceMotorOff('dashboard', selectedDeviceId);
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Motor ${command} confirmed by controller` });
        if (onMotorStateChanged) onMotorStateChanged(command);
      } else {
        setFeedback({ type: 'error', text: res.data?.message || 'Command rejected' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setLoadingAction(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = !isMotorKnown ? circumference : (isMotorOn ? 0 : circumference * 0.75);

  return (
    <div className="dash-card motor-control-card">
      <div className="motor-card-content">
        <div className="circular-gauge-container">
          <svg className="gauge-svg" viewBox="0 0 86 86">
            <circle className="gauge-bg-circle" cx="43" cy="43" r={radius} />
            <circle
              className="gauge-bar-circle"
              cx="43"
              cy="43"
              r={radius}
              stroke={!isMotorKnown ? '#CBD5E1' : (isMotorOn ? '#10B981' : '#94A3B8')}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-center-text" style={{ color: !isMotorKnown ? '#94A3B8' : (isMotorOn ? '#10B981' : '#64748B') }}>
            {!isMotorKnown ? '-' : (isMotorOn ? 'ON' : 'OFF')}
          </div>
        </div>

        <div className="motor-info-details">
          <div className="motor-status-headline">
            <span className="motor-status-text" style={{ color: !isMotorKnown ? '#94A3B8' : (isMotorOn ? '#10B981' : '#64748B') }}>
              {!isMotorKnown ? '-' : (isMotorOn ? 'Motor Running' : 'Motor Stopped')}
            </span>
            <span className="motor-duration-pill">
              {!isMotorKnown ? 'Awaiting motor data' : `⏱ ${formatSeconds(liveDuration)}`}
            </span>
          </div>

          <div className="motor-sub-times">
            <div>Last ON: {hasData && lastOnTime ? `${formatTimeLabel(lastOnTime)} (Tot: ${formatSeconds(totalOnDurationSeconds)})` : '-'}</div>
            <div>Last OFF: {hasData && lastOffTime ? `${formatTimeLabel(lastOffTime)} (Tot: ${formatSeconds(totalOffDurationSeconds)})` : '-'}</div>
          </div>

          {feedback && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: feedback.type === 'success' ? '#10B981' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px',
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      <div className="motor-buttons-row">
        <button
          className="btn-force-on"
          disabled={loadingAction !== null}
          onClick={() => handleCommand('ON')}
          title={isMotorOn ? 'Motor is currently ON - Click to re-assert Force ON' : 'Force switch motor ON'}
        >
          {loadingAction === 'ON' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="#FFFFFF" />}
          <span>Force ON</span>
        </button>

        <button
          className="btn-force-off"
          disabled={loadingAction !== null}
          onClick={() => handleCommand('OFF')}
          title={!isMotorOn ? 'Motor is currently OFF - Click to re-assert Force OFF' : 'Force switch motor OFF'}
        >
          {loadingAction === 'OFF' ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} fill="#FFFFFF" />}
          <span>Force OFF</span>
        </button>
      </div>
    </div>
  );
};

/* ==========================================================================
   7. Subcomponent: TotalPowerCard (Bottom-Center)
   ========================================================================== */
const TotalPowerCard = ({ energyData, powerFactor, hasData = true }) => {
  const { totalKwh, todayKwh, monthlyKwh } = energyData || {};
  const showDash = !hasData || totalKwh === null || totalKwh === undefined;
  const hasPf = hasData && powerFactor !== null && powerFactor !== undefined;
  const pfPercent = hasPf ? Math.round(Math.min(100, Math.max(0, powerFactor * 100))) : null;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasPf ? circumference - (pfPercent / 100) * circumference : circumference;

  return (
    <div className="dash-card power-consumption-card">
      <div className="circular-gauge-container">
        <svg className="gauge-svg" viewBox="0 0 86 86">
          <circle className="gauge-bg-circle" cx="43" cy="43" r={radius} />
          <circle
            className="gauge-bar-circle"
            cx="43"
            cy="43"
            r={radius}
            stroke="#10B981"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="gauge-center-text" style={{ color: '#10B981' }}>
          {hasPf ? `${pfPercent}%` : '-'}
        </div>
      </div>

      <div className="consumption-info">
        <span className="consumption-title">Total Power Consumption</span>
        <div className="consumption-main-value">
          {showDash ? '-' : Number(totalKwh).toFixed(2)} {!showDash && <span style={{ fontSize: '13px', fontWeight: 600 }}>kWh</span>}
        </div>
        <div className="consumption-trend">
          <TrendingUp size={13} />
          <span>{showDash ? 'No reading' : '+4.2% today'}</span>
        </div>
        <div className="consumption-sub-breakdown">
          <span>Today: <strong>{showDash || todayKwh === null ? '-' : `${Number(todayKwh).toFixed(2)} kWh`}</strong></span>
          <span style={{ margin: '0 6px' }}>•</span>
          <span>Month: <strong>{showDash || monthlyKwh === null ? '-' : `${Number(monthlyKwh).toFixed(1)} kWh`}</strong></span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   8. Subcomponent: MotorHistoryChart (Bottom-Right)
   ========================================================================== */
const CustomMiniTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip" style={{ padding: '6px 10px', fontSize: '11px' }}>
        <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{label}</div>
        <div style={{ color: '#10B981' }}>ON Cycles: {payload[0]?.value || 0}</div>
        <div style={{ color: '#EF4444' }}>OFF Cycles: {payload[1]?.value || 0}</div>
      </div>
    );
  }
  return null;
};

const MotorHistoryChart = ({ historyData }) => {
  const { totalOnEvents = 0, totalOffEvents = 0, totalEvents = 0, dailyActivity = [] } = historyData || {};

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fallbackDaily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayKey = daysOfWeek[d.getDay()];
    fallbackDaily.push({ day: dayKey, onCount: 0, offCount: 0 });
  }

  const baseDaily = (dailyActivity && dailyActivity.length > 0) ? dailyActivity : fallbackDaily;

  const chartData = baseDaily.map((item) => ({
    ...item,
    totalOps: (item.onCount || 0) + (item.offCount || 0),
  }));

  const hasEvents = totalEvents > 0;

  return (
    <div className="dash-card motor-history-card">
      <div className="history-card-header">
        <div>
          <div className="history-headline-value">{hasEvents ? totalEvents : '-'}</div>
          <div className="history-subtitle">Motor Switch Operations (7D)</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
          <div><span style={{ color: '#10B981', fontWeight: 700 }}>● {hasEvents ? totalOnEvents : '-'}</span> ON</div>
          <div><span style={{ color: '#EF4444', fontWeight: 700 }}>● {hasEvents ? totalOffEvents : '-'}</span> OFF</div>
        </div>
      </div>

      <div className="history-mini-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barGap={2}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} />
            <Tooltip content={<CustomMiniTooltip />} />
            <Bar dataKey="onCount" fill="#00A896" radius={[3, 3, 0, 0]} barSize={8} />
            <Bar dataKey="offCount" fill="#E2E8F0" radius={[3, 3, 0, 0]} barSize={8} />
            <Line type="monotone" dataKey="totalOps" stroke="#00A896" strokeWidth={2} dot={{ r: 2, fill: '#00A896' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ==========================================================================
   9. Subcomponent: DashboardHistoryTable (Motor ON/OFF Run Hours & Telemetry)
   Requirement: "inside dasboard after Data Graphic & Control this tab add history table here show every data with how may hour on and off motor"
   ========================================================================== */
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0s';
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatDecimalHours = (seconds) => {
  if (!seconds || seconds <= 0) return '0.00 hrs';
  return `${(seconds / 3600).toFixed(2)} hrs`;
};

const DashboardHistoryTable = ({ selectedDeviceId, hasData = true }) => {
  const [motorRecords, setMotorRecords] = useState([]);
  const [telemetryRecords, setTelemetryRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('motor'); // 'motor' | 'telemetry'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ON' | 'OFF'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch history records from backend
  const fetchTableData = useCallback(async () => {
    setLoading(true);
    try {
      const [motorRes, telemRes] = await Promise.all([
        getMotorHistory(100, selectedDeviceId),
        getData({ limit: 50, deviceId: selectedDeviceId }),
      ]);

      if (motorRes.data?.success && Array.isArray(motorRes.data.data)) {
        setMotorRecords(motorRes.data.data);
      }
      if (telemRes.data?.success && Array.isArray(telemRes.data.data)) {
        setTelemetryRecords(telemRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard history records:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  // Real-time live listener for motor events & sensor updates
  useEffect(() => {
    const handleMotorChanged = (data) => {
      if (selectedDeviceId && data.deviceId && data.deviceId !== selectedDeviceId) return;
      fetchTableData();
    };

    const handleSensorUpdate = (data) => {
      if (selectedDeviceId && data.deviceId && data.deviceId !== selectedDeviceId) return;
      setTelemetryRecords((prev) => [data, ...prev.slice(0, 49)]);
    };

    socket.on('motor_status_changed', handleMotorChanged);
    socket.on('sensor_update', handleSensorUpdate);

    return () => {
      socket.off('motor_status_changed', handleMotorChanged);
      socket.off('sensor_update', handleSensorUpdate);
    };
  }, [selectedDeviceId, fetchTableData]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchTableData();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Helper to calculate ongoing duration if endTime is null
  const getItemDuration = (item) => {
    if (item.duration && item.duration > 0) return item.duration;
    if (!item.endTime && item.startTime) {
      return Math.max(0, Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000));
    }
    return 0;
  };

  // Aggregated KPI Stats
  const totalOnSeconds = motorRecords
    .filter((e) => e.motorStatus === 'ON')
    .reduce((acc, curr) => acc + getItemDuration(curr), 0);

  const totalOffSeconds = motorRecords
    .filter((e) => e.motorStatus === 'OFF')
    .reduce((acc, curr) => acc + getItemDuration(curr), 0);

  const totalOnHours = (totalOnSeconds / 3600).toFixed(2);
  const totalOffHours = (totalOffSeconds / 3600).toFixed(2);
  const totalOperations = motorRecords.length;

  // Filtered Motor Events
  const filteredMotorRecords = motorRecords.filter((rec) => {
    if (statusFilter !== 'ALL' && rec.motorStatus !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchType = rec.eventType?.toLowerCase().includes(term);
      const matchNote = rec.note?.toLowerCase().includes(term);
      const matchDev = rec.deviceId?.toLowerCase().includes(term);
      if (!matchType && !matchNote && !matchDev) return false;
    }
    return true;
  });

  // Filtered Telemetry Records
  const filteredTelemetryRecords = telemetryRecords.filter((rec) => {
    if (statusFilter !== 'ALL' && rec.motorStatus !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDev = rec.deviceId?.toLowerCase().includes(term);
      if (!matchDev) return false;
    }
    return true;
  });

  // Pagination
  const activeRecords = activeTab === 'motor' ? filteredMotorRecords : filteredTelemetryRecords;
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, activeRecords.length);
  const paginatedRecords = activeRecords.slice(startIndex, endIndex);

  // Generate numbered pages for pagination
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // CSV Export Download
  const handleExportCSV = () => {
    if (activeRecords.length === 0) return;
    let csvContent = '';
    if (activeTab === 'motor') {
      const headers = ['#', 'Device ID', 'Date & Time', 'Status', 'Duration (Seconds)', 'Hours Formatted', 'Hours Decimal'];
      const rows = filteredMotorRecords.map((e, idx) => {
        const dur = getItemDuration(e);
        return [
          idx + 1,
          e.deviceId || selectedDeviceId || 'N/A',
          new Date(e.startTime || e.timestamp).toLocaleString(),
          e.motorStatus,
          dur,
          formatDuration(dur),
          (dur / 3600).toFixed(2),
        ];
      });
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      const headers = ['#', 'Device ID', 'Date & Time', 'Water Level (%)', 'Water (L)', 'Motor Status', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Energy (kWh)'];
      const rows = filteredTelemetryRecords.map((t, idx) => [
        idx + 1,
        t.deviceId || selectedDeviceId || 'N/A',
        new Date(t.timestamp).toLocaleString(),
        t.waterLevel || 0,
        t.waterConsumption || 0,
        t.motorStatus || 'OFF',
        t.voltage || 0,
        t.current || 0,
        t.power || 0,
        t.energyConsumption || 0,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_history_${selectedDeviceId || 'device'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dash-card history-table-container-card">
      {/* 1. Header with Title & Action Controls */}
      <div className="history-table-header-wrap">
        <div className="history-table-title-box">
          <div className="history-table-icon-badge">
            <Clock size={20} className="text-blue" />
          </div>
          <div>
            <h3 className="history-table-heading">Motor Operation & Telemetry History</h3>
            <p className="history-table-subheading">
              Detailed tracking of pump state transitions, cumulative ON/OFF runtime hours, and historical sensor data
            </p>
          </div>
        </div>

        <div className="history-table-actions">
          {/* View Mode Toggle: Motor Hours vs Telemetry */}
          <div className="history-view-toggle">
            <button
              type="button"
              className={`toggle-tab-btn ${activeTab === 'motor' ? 'active' : ''}`}
              onClick={() => { setActiveTab('motor'); setCurrentPage(1); }}
            >
              <Zap size={14} />
              <span>Motor ON / OFF Hours</span>
              <span className="count-chip">{motorRecords.length}</span>
            </button>
            <button
              type="button"
              className={`toggle-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => { setActiveTab('telemetry'); setCurrentPage(1); }}
            >
              <Activity size={14} />
              <span>Telemetry Data</span>
              <span className="count-chip">{telemetryRecords.length}</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            className="btn-history-export"
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
            disabled={activeRecords.length === 0}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className={`btn-history-refresh ${refreshing ? 'spinning' : ''}`}
            onClick={handleManualRefresh}
            title="Refresh Table Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Stats Bar (Cumulative Hours ON & OFF) */}
      <div className="history-kpi-bar">
        <div className="history-kpi-chip kpi-on">
          <div className="chip-icon-box on">
            <Play size={16} />
          </div>
          <div className="chip-text-group">
            <span className="chip-label">Total Motor ON Time</span>
            <span className="chip-value">
              {totalOnHours} <span className="unit">hrs</span>
              <span className="chip-detail">({formatDuration(totalOnSeconds)})</span>
            </span>
          </div>
        </div>

        <div className="history-kpi-chip kpi-off">
          <div className="chip-icon-box off">
            <Square size={16} />
          </div>
          <div className="chip-text-group">
            <span className="chip-label">Total Motor OFF Time</span>
            <span className="chip-value">
              {totalOffHours} <span className="unit">hrs</span>
              <span className="chip-detail">({formatDuration(totalOffSeconds)})</span>
            </span>
          </div>
        </div>

        <div className="history-kpi-chip kpi-cycles">
          <div className="chip-icon-box cycles">
            <Clock size={16} />
          </div>
          <div className="chip-text-group">
            <span className="chip-label">Total Operations</span>
            <span className="chip-value">
              {totalOperations} <span className="unit">cycles</span>
            </span>
          </div>
        </div>

        <div className="history-kpi-chip kpi-device">
          <div className="chip-icon-box dev">
            <Cpu size={16} />
          </div>
          <div className="chip-text-group">
            <span className="chip-label">Target Hardware</span>
            <span className="chip-value code-font">
              {selectedDeviceId || 'ALL DEVICES'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="history-filter-bar">
        <div className="history-search-input">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by device, status, or date..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="history-status-filters">
          <span className="filter-label"><Filter size={13} /> Filter:</span>
          <button
            type="button"
            className={`status-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          >
            All States
          </button>
        </div>
      </div>

      {/* 4. Main Data Table */}
      {loading ? (
        <div className="history-table-empty">
          <Loader2 size={32} className="animate-spin text-blue" />
          <p>Loading motor operation history and telemetry logs...</p>
        </div>
      ) : activeRecords.length === 0 ? (
        <div className="history-table-empty">
          <Clock size={40} className="empty-icon" />
          <h4>No Operational History Found</h4>
          <p>No motor events or telemetry match the current filter criteria for {selectedDeviceId || 'this device'}.</p>
        </div>
      ) : (
        <div className="history-table-scroll-wrap">
          {activeTab === 'motor' ? (
            /* MOTOR ON / OFF HOURS TABLE */
            <table className="dash-history-data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Date & Time</th>
                  <th>Device</th>
                  <th>Motor Status</th>
                  <th>Hours ON</th>
                  <th>Hours OFF</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((item, idx) => {
                  const durationSec = getItemDuration(item);
                  const isOn = item.motorStatus === 'ON';
                  const isOngoing = !item.endTime;
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={item._id || idx} className={isOn ? 'row-motor-on' : 'row-motor-off'}>
                      <td className="col-idx">{rowNumber}</td>
                      <td className="col-timestamp">
                        <span className="date-time-main">
                          {new Date(item.startTime || item.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="date-time-sub">
                          {new Date(item.startTime || item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="col-device">
                        <span className="device-tag-code">{item.deviceId || selectedDeviceId || 'WT-DEV-001'}</span>
                      </td>
                      <td className="col-status">
                        <span className={`motor-status-chip ${isOn ? 'on' : 'off'}`}>
                          <span className="status-dot"></span>
                          <span>{isOn ? 'MOTOR ON' : 'MOTOR OFF'}</span>
                        </span>
                      </td>
                      <td className="col-hours-on">
                        {isOn ? (
                          <div className="hours-val-box on">
                            <span className="hours-primary">{formatDecimalHours(durationSec)}</span>
                            <span className="hours-secondary">({formatDuration(durationSec)})</span>
                            {isOngoing && <span className="active-tag">Active</span>}
                          </div>
                        ) : (
                          <span className="empty-dash">-</span>
                        )}
                      </td>
                      <td className="col-hours-off">
                        {!isOn ? (
                          <div className="hours-val-box off">
                            <span className="hours-primary">{formatDecimalHours(durationSec)}</span>
                            <span className="hours-secondary">({formatDuration(durationSec)})</span>
                            {isOngoing && <span className="active-tag idle">Idle</span>}
                          </div>
                        ) : (
                          <span className="empty-dash">-</span>
                        )}
                      </td>
                      <td className="col-duration">
                        <span className="duration-pill">
                          {formatDuration(durationSec)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ALL TELEMETRY RECORDS TABLE */
            <table className="dash-history-data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Timestamp</th>
                  <th>Device ID</th>
                  <th>Water Level</th>
                  <th>Motor Status</th>
                  <th>Voltage</th>
                  <th>Current</th>
                  <th>Active Power</th>
                  <th>Energy Usage</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((t, idx) => {
                  const isOn = t.motorStatus === 'ON';
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={t._id || idx}>
                      <td className="col-idx">{rowNumber}</td>
                      <td className="col-timestamp">
                        <span className="date-time-main">
                          {new Date(t.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="date-time-sub">
                          {new Date(t.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="col-device">
                        <span className="device-tag-code">{t.deviceId || selectedDeviceId || 'WT-DEV-001'}</span>
                      </td>
                      <td className="col-water">
                        <div className="water-level-cell">
                          <span className="water-pct-bold">{t.waterLevel || 0}%</span>
                          <span className="water-liters-muted">({t.waterConsumption || 0} L)</span>
                        </div>
                      </td>
                      <td className="col-status">
                        <span className={`motor-status-chip ${isOn ? 'on' : 'off'}`}>
                          <span className="status-dot"></span>
                          <span>{t.motorStatus || 'OFF'}</span>
                        </span>
                      </td>
                      <td>{t.voltage || 0} V</td>
                      <td>{t.current || 0} A</td>
                      <td className="font-semibold">{t.power || 0} W</td>
                      <td>
                        <span className="energy-kwh-pill">{t.energyConsumption || 0} kWh</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 5. Comprehensive Pagination Footer */}
      <div className="history-table-pagination">
        <div className="pagination-left-wrap">
          <span className="page-summary-text">
            Showing <strong>{activeRecords.length > 0 ? startIndex + 1 : 0}</strong> to <strong>{endIndex}</strong> of <strong>{activeRecords.length}</strong> records
          </span>

          <div className="page-size-picker-wrap">
            <span className="page-size-label">Rows:</span>
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        <div className="pagination-btn-group">
          {/* First Page Button */}
          <button
            type="button"
            className="page-nav-btn page-edge-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="First Page"
          >
            <ChevronsLeft size={15} />
          </button>

          {/* Previous Page Button */}
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          {/* Numbered Page Buttons */}
          <div className="page-numbers-list">
            {getPageNumbers().map((pageNum, idx) =>
              pageNum === '...' ? (
                <span key={`dots-${idx}`} className="page-dots">...</span>
              ) : (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>

          {/* Last Page Button */}
          <button
            type="button"
            className="page-nav-btn page-edge-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            title="Last Page"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN DASHBOARD COMPONENT (frontend/src/pages/Dashboard.jsx)
   ========================================================================== */
const Dashboard = ({ onNavigate, currentUser, onOpenAuth, onLogout }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [dashboardData, setDashboardData] = useState(null);
  const [powerHistory, setPowerHistory] = useState([]);
  const [motorHistory, setMotorHistory] = useState(null);
  const [chartRange, setChartRange] = useState('24h');

  // Multi-device selection state: null = Show Registered Devices cards first
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Fetch registered devices list with their latest telemetry data
  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await getDevices();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDevices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch devices for dashboard:', err.message);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const refreshDashboard = useCallback(async (targetDeviceId = selectedDeviceId) => {
    if (!targetDeviceId) return;
    try {
      const res = await getDashboardOverview(targetDeviceId);
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard overview:', err.message);
    }
  }, [selectedDeviceId]);

  const loadPowerHistory = useCallback(async (range = chartRange, targetDeviceId = selectedDeviceId) => {
    if (!targetDeviceId) return;
    try {
      setChartRange(range);
      const res = await getPowerHistory(range, targetDeviceId);
      if (res.data?.success) {
        setPowerHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load power history:', err.message);
    }
  }, [chartRange, selectedDeviceId]);

  const loadMotorConsumption = useCallback(async (targetDeviceId = selectedDeviceId) => {
    if (!targetDeviceId) return;
    try {
      const res = await getMotorConsumption(targetDeviceId);
      if (res.data?.success) {
        setMotorHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load motor consumption:', err.message);
    }
  }, [selectedDeviceId]);

  // When selectedDeviceId changes, load telemetry specifically for it
  useEffect(() => {
    if (selectedDeviceId) {
      refreshDashboard(selectedDeviceId);
      loadPowerHistory(chartRange, selectedDeviceId);
      loadMotorConsumption(selectedDeviceId);
    }
  }, [selectedDeviceId, refreshDashboard, loadPowerHistory, loadMotorConsumption, chartRange]);

  const handleMotorStateChanged = useCallback((newStatus) => {
    if (newStatus) {
      setDashboardData((prev) => {
        const base = prev || {
          powerMetrics: { voltage: 230, current: newStatus === 'ON' ? 6.5 : 0, power: newStatus === 'ON' ? 1380 : 0, powerFactor: 0.92 },
          waterTank: { levelPercentage: 65, capacityLiters: 1000, currentLiters: 650 },
          motor: { motorStatus: newStatus },
          energy: { totalKwh: 0.45, todayKwh: 0.45, monthlyKwh: 0.45 },
        };
        return {
          ...base,
          hasData: true,
          powerMetrics: {
            ...base.powerMetrics,
            voltage: newStatus === 'ON' ? 230.5 : 231.8,
            current: newStatus === 'ON' ? 6.5 : 0.0,
            power: newStatus === 'ON' ? 1380 : 0,
            powerFactor: base.powerMetrics?.powerFactor || 0.92,
          },
          motor: {
            ...base.motor,
            motorStatus: newStatus,
            lastOnTime: newStatus === 'ON' ? new Date().toISOString() : base.motor?.lastOnTime,
            lastOffTime: newStatus === 'OFF' ? new Date().toISOString() : base.motor?.lastOffTime,
          },
        };
      });
    }
    fetchDevices();
    if (selectedDeviceId) {
      refreshDashboard(selectedDeviceId);
      loadMotorConsumption(selectedDeviceId);
      loadPowerHistory(chartRange, selectedDeviceId);
    }
  }, [selectedDeviceId, refreshDashboard, loadMotorConsumption, loadPowerHistory, chartRange, fetchDevices]);

  const handleSelectDevice = (devId) => {
    if (!devId) return;
    setSelectedDeviceId(devId);
    refreshDashboard(devId);
    loadPowerHistory(chartRange, devId);
    loadMotorConsumption(devId);
  };

  const handleBackToDevices = () => {
    setSelectedDeviceId(null);
    fetchDevices();
  };

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onSensorUpdate(telemetry) {
      if (!telemetry) return;

      // Update the device in the all-devices list as well
      setDevices((prevDevices) =>
        prevDevices.map((d) => {
          if (d.deviceId === telemetry.deviceId) {
            const cap = telemetry.tankCapacity || d.tankCapacity || 1000;
            const con = telemetry.waterConsumption !== undefined ? telemetry.waterConsumption : (d.data?.waterConsumption || 0);
            const wl = telemetry.waterLevel !== undefined ? telemetry.waterLevel : (cap > 0 ? Math.round((con / cap) * 100) : 0);
            return {
              ...d,
              data: {
                ...d.data,
                voltage: telemetry.voltage !== undefined ? telemetry.voltage : d.data?.voltage,
                current: telemetry.current !== undefined ? telemetry.current : d.data?.current,
                power: telemetry.power !== undefined ? telemetry.power : d.data?.power,
                powerFactor: telemetry.powerFactor !== undefined ? telemetry.powerFactor : d.data?.powerFactor,
                tankCapacity: cap,
                waterConsumption: con,
                waterLevel: wl,
                motorStatus: telemetry.motorStatus || d.data?.motorStatus,
                energyConsumption: telemetry.energyConsumption !== undefined ? telemetry.energyConsumption : d.data?.energyConsumption,
                timestamp: telemetry.timestamp || new Date(),
              },
            };
          }
          return d;
        })
      );

      // If inside a device view, update the detailed dashboard state
      if (selectedDeviceId && telemetry.deviceId && telemetry.deviceId !== selectedDeviceId) {
        return;
      }

      setDashboardData((prev) => {
        const base = prev || {
          powerMetrics: { voltage: 0, current: 0, power: 0, powerFactor: 0 },
          waterTank: { levelPercentage: 0, capacityLiters: 1000, currentLiters: 0 },
          motor: { motorStatus: 'OFF' },
          energy: { totalKwh: 0, todayKwh: 0, monthlyKwh: 0 },
        };

        const cap = telemetry.tankCapacity !== undefined 
          ? Number(telemetry.tankCapacity) 
          : (base.waterTank?.capacityLiters || 1000);
        const con = telemetry.waterConsumption !== undefined 
          ? Number(telemetry.waterConsumption) 
          : (telemetry.waterLevel !== undefined ? Math.round((telemetry.waterLevel / 100) * cap) : (base.waterTank?.currentLiters || 0));
        const newWaterLevel = telemetry.waterLevel !== undefined 
          ? telemetry.waterLevel 
          : (cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : (base.waterTank?.levelPercentage || 0));

        const newMotorStatus = telemetry.motorStatus || base.motor?.motorStatus || 'OFF';

        return {
          ...base,
          powerMetrics: {
            voltage: telemetry.voltage !== undefined ? telemetry.voltage : base.powerMetrics?.voltage || 0,
            current: telemetry.current !== undefined ? telemetry.current : base.powerMetrics?.current || 0,
            power: telemetry.power !== undefined ? telemetry.power : base.powerMetrics?.power || 0,
            powerFactor: telemetry.powerFactor !== undefined ? telemetry.powerFactor : base.powerMetrics?.powerFactor || 0,
          },
          waterTank: {
            ...base.waterTank,
            levelPercentage: newWaterLevel,
            capacityLiters: cap,
            currentLiters: con,
            status: newWaterLevel < 25 ? 'LOW' : newWaterLevel > 85 ? 'FULL' : 'NORMAL',
          },
          motor: {
            ...base.motor,
            motorStatus: newMotorStatus,
            lastOnTime: telemetry.lastOnTime || base.motor?.lastOnTime,
            lastOffTime: telemetry.lastOffTime || base.motor?.lastOffTime,
          },
          energy: {
            ...base.energy,
            totalKwh: telemetry.energyConsumption !== undefined ? telemetry.energyConsumption : base.energy?.totalKwh || 0,
            todayKwh: telemetry.energyConsumption !== undefined ? telemetry.energyConsumption : base.energy?.todayKwh || 0,
          },
        };
      });

      // Append live point to power history chart so it displays immediately
      if (telemetry.power !== undefined || telemetry.voltage !== undefined) {
        const d = new Date(telemetry.timestamp || Date.now());
        const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setPowerHistory((prevHistory) => {
          const newPoint = {
            timestamp: telemetry.timestamp || new Date(),
            time: timeLabel,
            power: telemetry.power || 0,
            voltage: telemetry.voltage || 0,
            current: telemetry.current || 0,
            energy: telemetry.energyConsumption || 0,
          };
          const updated = [...(prevHistory || []), newPoint];
          return updated.slice(-30);
        });
      }
    }

    function onMotorStatusUpdate(motorUpdate) {
      if (!motorUpdate) return;
      if (motorUpdate.deviceId && selectedDeviceId && motorUpdate.deviceId !== selectedDeviceId) {
        return;
      }

      setDashboardData((prev) => {
        const base = prev || {
          powerMetrics: { voltage: 0, current: 0, power: 0, powerFactor: 0 },
          waterTank: { levelPercentage: 0, capacityLiters: 1000 },
          motor: { motorStatus: 'OFF' },
          energy: { totalKwh: 0, todayKwh: 0, monthlyKwh: 0 },
        };
        return {
          ...base,
          motor: {
            ...base.motor,
            motorStatus: motorUpdate.motorStatus,
            lastOnTime: motorUpdate.lastOnTime || base.motor?.lastOnTime,
            lastOffTime: motorUpdate.lastOffTime || base.motor?.lastOffTime,
          },
        };
      });
      loadMotorConsumption(selectedDeviceId);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sensor_update', onSensorUpdate);
    socket.on('motor_status_update', onMotorStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sensor_update', onSensorUpdate);
      socket.off('motor_status_update', onMotorStatusUpdate);
    };
  }, [loadMotorConsumption, selectedDeviceId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedDeviceId) {
        refreshDashboard(selectedDeviceId);
      } else {
        fetchDevices();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshDashboard, fetchDevices, selectedDeviceId]);

  const hasData = Boolean(
    dashboardData?.hasData ??
    (dashboardData?.powerMetrics?.voltage !== null && dashboardData?.powerMetrics?.voltage !== undefined)
  );

  const powerMetrics = dashboardData?.powerMetrics || {
    voltage: null,
    current: null,
    power: null,
    powerFactor: null,
  };

  const waterTank = dashboardData?.waterTank || {
    levelPercentage: null,
    capacityLiters: 1000,
    currentLiters: null,
  };

  const motorData = dashboardData?.motor || {
    motorStatus: null,
    lastOnTime: null,
    lastOffTime: null,
    currentOnDuration: 0,
    currentOffDuration: 0,
    totalOnDurationSeconds: 0,
    totalOffDurationSeconds: 0,
  };

  const energyData = dashboardData?.energy || {
    totalKwh: null,
    todayKwh: null,
    monthlyKwh: null,
  };

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) || dashboardData?.device;

  return (
    <div className="dashboard-wrapper">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="main-content">
        <Navbar
          currentPage="dashboard"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={() => {
            fetchDevices();
            if (selectedDeviceId) {
              refreshDashboard(selectedDeviceId);
              loadPowerHistory(chartRange, selectedDeviceId);
              loadMotorConsumption(selectedDeviceId);
            }
          }}
        />

        {/* VIEW 1: REGISTERED DEVICES FIRST (When no device is currently clicked) */}
        {!selectedDeviceId ? (
          <div className="registered-devices-screen">
            {loadingDevices && devices.length === 0 ? (
              <div className="dash-card devices-loading-state">
                <Loader2 size={32} className="animate-spin" />
                <p>Loading registered devices...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="dash-card empty-devices-card">
                <Cpu size={48} className="empty-icon" />
                <h3>No Registered Devices Found</h3>
                <p>Register your first hardware controller to begin receiving real-time water tank and power metrics.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onNavigate('devices')}
                >
                  <Plus size={16} /> Register First Device
                </button>
              </div>
            ) : (
              <div className="registered-devices-main-grid">
                {devices.map((dev) => {
                  const telemetry = dev.data;
                  const hasTelemetry = Boolean(telemetry && (telemetry.waterLevel !== null || telemetry.voltage !== null || telemetry.power !== null));
                  const isOnline = dev.status === 'ONLINE' && hasTelemetry;
                  const isMotorRunning = hasTelemetry && telemetry?.motorStatus === 'ON';
                  const wl = hasTelemetry && telemetry?.waterLevel !== undefined && telemetry?.waterLevel !== null ? telemetry.waterLevel : null;
                  const powerVal = hasTelemetry && telemetry?.power !== undefined && telemetry?.power !== null ? Math.round(telemetry.power) : null;
                  const volVal = hasTelemetry && telemetry?.waterConsumption !== undefined && telemetry?.waterConsumption !== null ? telemetry.waterConsumption : null;

                  return (
                    <div
                      key={dev.deviceId}
                      className="registered-device-hub-card"
                      onClick={() => handleSelectDevice(dev.deviceId)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Card Top */}
                      <div className="hub-card-top">
                        <span className="hub-device-id">{dev.deviceId}</span>
                        <span className={`hub-status-pill ${hasTelemetry ? (isOnline ? 'online' : 'offline') : 'no-data'}`}>
                          <span className="status-dot"></span>
                          {hasTelemetry ? (dev.status || 'ONLINE') : 'NO DATA'}
                        </span>
                      </div>

                      {/* Title & Location */}
                      <h3 className="hub-device-name" title={dev.name}>{dev.name}</h3>
                      <div className="hub-device-location">
                        <MapPin size={13} className="loc-pin" />
                        <span>{dev.location}</span>
                      </div>

                      {/* Live Telemetry Preview Stats */}
                      <div className="hub-telemetry-preview">
                        <div className="hub-telemetry-item">
                          <span className="hub-telemetry-label">Water Level</span>
                          <span className="hub-telemetry-val">
                            <Droplet size={14} className="water-icon" />
                            <strong>{wl !== null ? `${wl}%` : '-'}</strong>
                          </span>
                        </div>
                        <div className="hub-telemetry-item">
                          <span className="hub-telemetry-label">Motor</span>
                          <span className={`hub-telemetry-val ${hasTelemetry ? `motor-${isMotorRunning ? 'on' : 'off'}` : 'motor-nodata'}`}>
                            <Power size={13} />
                            <strong>{hasTelemetry && telemetry?.motorStatus ? (isMotorRunning ? 'RUNNING' : 'STOPPED') : '-'}</strong>
                          </span>
                        </div>
                        <div className="hub-telemetry-item">
                          <span className="hub-telemetry-label">Power</span>
                          <span className="hub-telemetry-val">
                            <Zap size={13} className="power-icon" />
                            <strong>{powerVal !== null ? `${powerVal} W` : '-'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tank level progress bar */}
                      <div className="hub-tank-bar-wrap">
                        <div className="hub-tank-bar-bg">
                          <div
                            className="hub-tank-bar-fill"
                            style={{
                              width: wl !== null ? `${Math.min(100, Math.max(0, wl))}%` : '0%',
                              background: wl === null ? '#CBD5E1' : (wl < 25 ? '#EF4444' : wl > 85 ? '#00A896' : '#0284C7'),
                            }}
                          />
                        </div>
                        <div className="hub-tank-cap-row">
                          <span>Volume: {volVal !== null ? `${volVal} L` : '-'}</span>
                          <span>Cap: {dev.tankCapacity ? `${dev.tankCapacity} L` : '-'}</span>
                        </div>
                      </div>

                      {/* Action CTA */}
                      <div className="hub-card-action">
                        <span>{hasTelemetry ? 'View Telemetry & Controls' : 'View Device (Awaiting Data)'}</span>
                        <ChevronRight size={16} className="arrow-icon" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: SELECTED DEVICE DASHBOARD (After user clicks a card) */
          <div className="selected-device-view">
            {/* Top Navigation Banner with Back Button */}
            <div className="dash-card device-view-header-bar">
              <div className="device-view-back-group">
                <button
                  type="button"
                  className="btn-back-to-devices"
                  onClick={handleBackToDevices}
                  title="Return to Registered Devices Cards"
                >
                  <ArrowLeft size={16} />
                  <span>All Devices</span>
                </button>

                <div className="device-view-divider" />

                <div className="device-view-active-title">
                  <span className="active-id-chip">{selectedDeviceId}</span>
                  <h2 className="active-device-title">
                    {selectedDevice?.name || 'WaterTank Controller'}
                  </h2>
                  <span className="active-loc">
                    <MapPin size={13} /> {selectedDevice?.location || 'Rooftop'}
                  </span>
                </div>
              </div>

              {/* Quick Switch Pills between registered devices */}
              <div className="device-view-right-switch">
                <span className="quick-switch-label">Switch Device:</span>
                <div className="quick-device-pills">
                  {devices.map((d) => (
                    <button
                      key={d.deviceId}
                      className={`quick-pill ${d.deviceId === selectedDeviceId ? 'active' : ''}`}
                      onClick={() => handleSelectDevice(d.deviceId)}
                      title={`Switch to ${d.name}`}
                    >
                      {d.deviceId}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* If no telemetry received yet, show awaiting data banner */}
            {!hasData && (
              <div className="awaiting-data-banner">
                <AlertCircle size={18} className="banner-icon" />
                <div className="banner-text">
                  <strong>Awaiting Telemetry:</strong> No sensor readings have been sent for device{' '}
                  <span className="banner-id-tag">{selectedDeviceId}</span> yet. Showing placeholder <code>-</code> until data is provided.
                </div>
              </div>
            )}

            {/* Dashboard Rows */}
            <div className="dashboard-top-row">
              <Header
                motorStatus={motorData.motorStatus}
                waterLevel={waterTank.levelPercentage}
                selectedDeviceId={selectedDeviceId}
                hasData={hasData}
                onMotorStateChanged={handleMotorStateChanged}
              />
              <PowerMetricsCard metrics={powerMetrics} hasData={hasData} />
            </div>

            <div className="dashboard-middle-row">
              <PowerConsumptionChart
                data={powerHistory}
                onRangeChange={(range) => loadPowerHistory(range, selectedDeviceId)}
                currentRange={chartRange}
              />
              <WaterTankCard
                waterLevel={waterTank.levelPercentage}
                capacityLiters={waterTank.capacityLiters}
                currentLiters={waterTank.currentLiters}
                hasData={hasData}
              />
            </div>

            <div className="dashboard-bottom-section">
              <div className="bottom-section-header">
                <div>
                  <h3>Data Graphic & Control</h3>
                  <p>Real-time motor telemetry, force controls, energy analytics</p>
                </div>
              </div>

              <div className="bottom-cards-grid">
                <MotorControlCard
                  motorData={motorData}
                  selectedDeviceId={selectedDeviceId}
                  hasData={hasData}
                  onMotorStateChanged={handleMotorStateChanged}
                />

                <TotalPowerCard
                  energyData={energyData}
                  powerFactor={powerMetrics.powerFactor}
                  hasData={hasData}
                />

                <MotorHistoryChart historyData={motorHistory} />
              </div>
            </div>

            {/* 9. Operational History & Motor Run Hours Table */}
            <DashboardHistoryTable
              selectedDeviceId={selectedDeviceId}
              hasData={hasData}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
