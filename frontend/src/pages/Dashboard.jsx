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
  AlertTriangle,
  ShieldAlert,
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
  getFaultLogs,
  resolveFaultLog,
} from '../services/api';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import Models from './Models';
import { getModelConfig } from '../config/motorModels';

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
   Dynamic Single-Phase (Voltage, Current) vs 3-Phase (Vol 1-3, Cu 1-3), Frequency, PF
   ========================================================================== */
const PowerMetricsCard = ({ metrics, modelNumber, hasData = true }) => {
  const {
    voltage,
    current,
    vol1,
    vol2,
    vol3,
    cu1,
    cu2,
    cu3,
    power,
    powerFactor,
    frequency,
    energy,
  } = metrics || {};

  const modelConfig = getModelConfig(modelNumber);
  const isExplicitThreePhase = modelConfig?.electrical?.phaseType === 'three' || modelNumber === 'SG-3PD-7.5' || modelNumber === 'SG-3PSD-15';
  const isExplicitSinglePhase = modelConfig?.electrical?.phaseType === 'single' || modelNumber === 'SG-1PS-1.5' || modelNumber === 'SG-1PD-1.5';
  const hasStarDelta = Boolean(modelConfig?.specialDisplay?.hasStarDeltaStages || modelNumber === 'SG-3PSD-15');
  const starDeltaStage = metrics?.starDeltaStage || metrics?.motorStage || (hasStarDelta ? 'DELTA' : null);

  // 1. Detect Voltage mode: Three-phase vs Single-phase
  const hasThreePhaseVoltages =
    !isExplicitSinglePhase && (
      isExplicitThreePhase || (
        vol1 !== undefined && vol1 !== null &&
        vol2 !== undefined && vol2 !== null &&
        vol3 !== undefined && vol3 !== null
      )
    );
  const hasSingleVoltage = voltage !== undefined && voltage !== null;

  // 2. Detect Current mode: Three-phase vs Single-phase
  const hasThreePhaseCurrents =
    !isExplicitSinglePhase && (
      isExplicitThreePhase || (
        cu1 !== undefined && cu1 !== null &&
        cu2 !== undefined && cu2 !== null &&
        cu3 !== undefined && cu3 !== null
      )
    );
  const hasSingleCurrent = current !== undefined && current !== null;

  // Common electrical fields
  const hasPower = power !== undefined && power !== null;
  const hasPowerFactor = powerFactor !== undefined && powerFactor !== null;
  const hasFrequency = frequency !== undefined && frequency !== null;
  const resolvedEnergy = energy !== undefined && energy !== null
    ? energy
    : (metrics?.energyConsumption !== undefined && metrics?.energyConsumption !== null ? metrics.energyConsumption : null);
  const hasEnergy = resolvedEnergy !== undefined && resolvedEnergy !== null;
  const isThreePhase = Boolean(hasThreePhaseVoltages || hasThreePhaseCurrents);

  return (
    <div className="dash-card power-metrics-section">
      <div className="section-top-bar">
        <div>
          <h3>Electrical Parameters</h3>
          <p>
            {isThreePhase ? 'Three-Phase Line Monitoring' : 'Single-Phase Line Monitoring'} & Power Metrics
          </p>
        </div>
        {hasStarDelta && (
          <div className="star-delta-badge-wrap">
            <span className="stage-chip-label">Starter:</span>
            <span className={`star-delta-stage-chip stage-${(starDeltaStage || 'DELTA').toLowerCase()}`}>
              {starDeltaStage || 'DELTA'}
            </span>
          </div>
        )}
      </div>

      <div className={`metric-cards-grid ${isThreePhase ? 'grid-5-col' : 'grid-3-col'}`}>
        {isThreePhase ? (
          <>
            {/* 10 CARDS - 5/5 LAYOUT */}
            {/* Top Row (5 cards): Voltage 1, Voltage 2, Voltage 3, Power, Frequency */}
            <div className="colored-stat-block stat-orange">
              <div className="stat-label-wrap">
                <span className="stat-label">Voltage 1</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{vol1 !== undefined && vol1 !== null ? Number(vol1).toFixed(1) : '-'}</span>
                {vol1 !== undefined && vol1 !== null && <span className="stat-unit">V</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-orange">
              <div className="stat-label-wrap">
                <span className="stat-label">Voltage 2</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{vol2 !== undefined && vol2 !== null ? Number(vol2).toFixed(1) : '-'}</span>
                {vol2 !== undefined && vol2 !== null && <span className="stat-unit">V</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-orange">
              <div className="stat-label-wrap">
                <span className="stat-label">Voltage 3</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{vol3 !== undefined && vol3 !== null ? Number(vol3).toFixed(1) : '-'}</span>
                {vol3 !== undefined && vol3 !== null && <span className="stat-unit">V</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-blue">
              <div className="stat-label-wrap">
                <span className="stat-label">Power</span>
                <Cpu size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{hasPower ? Math.round(power).toLocaleString() : '-'}</span>
                {hasPower && <span className="stat-unit">W</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-frequency">
              <div className="stat-label-wrap">
                <span className="stat-label">Frequency</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasFrequency ? Number(frequency).toFixed(1) : (hasData ? '50.0' : '-')}
                </span>
                <span className="stat-unit">Hz</span>
              </div>
            </div>

            {/* Bottom Row (5 cards): Current 1, Current 2, Current 3, Energy, Power Factor */}
            <div className="colored-stat-block stat-navy">
              <div className="stat-label-wrap">
                <span className="stat-label">Current 1</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{cu1 !== undefined && cu1 !== null ? Number(cu1).toFixed(2) : '-'}</span>
                {cu1 !== undefined && cu1 !== null && <span className="stat-unit">A</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-navy">
              <div className="stat-label-wrap">
                <span className="stat-label">Current 2</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{cu2 !== undefined && cu2 !== null ? Number(cu2).toFixed(2) : '-'}</span>
                {cu2 !== undefined && cu2 !== null && <span className="stat-unit">A</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-navy">
              <div className="stat-label-wrap">
                <span className="stat-label">Current 3</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{cu3 !== undefined && cu3 !== null ? Number(cu3).toFixed(2) : '-'}</span>
                {cu3 !== undefined && cu3 !== null && <span className="stat-unit">A</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-energy">
              <div className="stat-label-wrap">
                <span className="stat-label">Energy</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasEnergy ? Number(resolvedEnergy).toFixed(2) : (hasData ? '0.00' : '-')}
                </span>
                <span className="stat-unit">kWh</span>
              </div>
            </div>

            <div className="colored-stat-block stat-pf">
              <div className="stat-label-wrap">
                <span className="stat-label">Power Factor</span>
                <Gauge size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasPowerFactor ? Number(powerFactor).toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 6 CARDS - 3/3 LAYOUT */}
            {/* Top Row (3 cards): Voltage, Current, Power */}
            <div className="colored-stat-block stat-orange">
              <div className="stat-label-wrap">
                <span className="stat-label">Voltage</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{hasSingleVoltage ? Number(voltage).toFixed(1) : '-'}</span>
                {hasSingleVoltage && <span className="stat-unit">V</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-navy">
              <div className="stat-label-wrap">
                <span className="stat-label">Current</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{hasSingleCurrent ? Number(current).toFixed(2) : '-'}</span>
                {hasSingleCurrent && <span className="stat-unit">A</span>}
              </div>
            </div>

            <div className="colored-stat-block stat-blue">
              <div className="stat-label-wrap">
                <span className="stat-label">Power</span>
                <Cpu size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">{hasPower ? Math.round(power).toLocaleString() : '-'}</span>
                {hasPower && <span className="stat-unit">W</span>}
              </div>
            </div>

            {/* Bottom Row (3 cards): Frequency, Energy, Power Factor */}
            <div className="colored-stat-block stat-frequency">
              <div className="stat-label-wrap">
                <span className="stat-label">Frequency</span>
                <Activity size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasFrequency ? Number(frequency).toFixed(1) : (hasData ? '50.0' : '-')}
                </span>
                <span className="stat-unit">Hz</span>
              </div>
            </div>

            <div className="colored-stat-block stat-energy">
              <div className="stat-label-wrap">
                <span className="stat-label">Energy</span>
                <Zap size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasEnergy ? Number(resolvedEnergy).toFixed(2) : (hasData ? '0.00' : '-')}
                </span>
                <span className="stat-unit">kWh</span>
              </div>
            </div>

            <div className="colored-stat-block stat-pf">
              <div className="stat-label-wrap">
                <span className="stat-label">Power Factor</span>
                <Gauge size={15} className="stat-icon" />
              </div>
              <div className="stat-value-wrap">
                <span className="stat-value">
                  {hasPowerFactor ? Number(powerFactor).toFixed(2) : '-'}
                </span>
              </div>
            </div>
          </>
        )}
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
   4b. Subcomponent: SingleAnimatedTank (Glass Vessel with Sea Wave Water Animation)
   ========================================================================== */
const SingleAnimatedTank = ({
  title,
  tag,
  tagBg,
  tagColor,
  icon: Icon,
  status,
  level,
  capacity,
  currentLiters,
  renderStatusBadge,
}) => {
  const hasLevel = level !== undefined && level !== null;
  const clampedLevel = hasLevel ? Math.max(0, Math.min(100, Math.round(level))) : 0;
  const displayLiters = hasLevel
    ? (currentLiters !== undefined && currentLiters !== null
      ? Math.round(currentLiters)
      : (capacity ? Math.round((clampedLevel / 100) * capacity) : null))
    : null;

  // Resolve 3-state label: Low (Red), Med (Orange), High (Green) - No 0% to 100% numbers
  const displayStatus = (() => {
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'low') return 'Low';
      if (s === 'high') return 'High';
      return 'Med';
    }
    if (hasLevel) {
      if (clampedLevel < 25) return 'Low';
      if (clampedLevel > 75) return 'High';
      return 'Med';
    }
    return '-';
  })();

  const getLevelColor = (label) => {
    switch (String(label).toLowerCase()) {
      case 'high':
        return '#10B981'; // Green
      case 'med':
      case 'medium':
        return '#F59E0B'; // Orange
      case 'low':
        return '#EF4444'; // Red
      default:
        return '#94A3B8';
    }
  };

  const statusColor = getLevelColor(displayStatus);

  // Visual water height percentage (either sensor percentage or probe status position)
  const waterHeight = hasLevel && clampedLevel > 0
    ? clampedLevel
    : (displayStatus === 'High' ? 85 : displayStatus === 'Med' ? 50 : displayStatus === 'Low' ? 22 : 0);

  // Water is oceanic blue with flowing wave engine as requested: "inside tank water color blue and flow like wave"
  const liquidGradient = 'linear-gradient(180deg, #0EA5E9 0%, #0284C7 25%, #0369A1 60%, #075985 100%)';
  const waveFills = { back: '#0369A1', mid: '#0284C7', front: '#38BDF8' };

  return (
    <div className="single-tank-box">
      {/* Tank Box Header */}
      <div className="tank-box-header">
        <div className="tank-box-title">
          <Icon size={16} color={tagColor || '#0284C7'} />
          <span>{title}</span>
        </div>
        <span className="tank-tag-badge" style={{ background: tagBg || '#E0F2FE', color: tagColor || '#0369A1' }}>
          {tag}
        </span>
      </div>

      {/* Water Level Status Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Water Level Status:</span>
        {renderStatusBadge(status)}
      </div>

      {/* Old Animated Flowing Water Tank */}
      <div className="tank-visual-wrapper">
        <div className="tank-glass-container">
          {/* Graduation Markers (Left Ruler) - Low (Red), Med (Orange), High (Green) - No 0% to 100% Numbers */}
          <div className="tank-graduation-marks">
            <div className="mark-tick mark-high">
              <span className="mark-line" style={{ background: '#10B981', boxShadow: '0 0 5px rgba(16, 185, 129, 0.9)' }}></span>
              <span style={{ color: '#10B981', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(16, 185, 129, 0.4)' }}>High</span>
            </div>
            <div className="mark-tick mark-med">
              <span className="mark-line" style={{ background: '#F59E0B', boxShadow: '0 0 5px rgba(245, 158, 11, 0.9)' }}></span>
              <span style={{ color: '#F59E0B', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(245, 158, 11, 0.4)' }}>Med</span>
            </div>
            <div className="mark-tick mark-low">
              <span className="mark-line" style={{ background: '#EF4444', boxShadow: '0 0 5px rgba(239, 68, 68, 0.9)' }}></span>
              <span style={{ color: '#EF4444', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(239, 68, 68, 0.4)' }}>Low</span>
            </div>
          </div>

          {/* Liquid Body with Oceanic Sea Wave Engine (Colored by status) */}
          <div
            className="liquid-body"
            style={{
              height: `${waterHeight}%`,
              minHeight: waterHeight > 0 ? '24px' : '0px',
              background: liquidGradient,
            }}
          >
            <div className="sea-wave-wrap">
              <svg className="sea-wave sea-wave-back" style={{ fill: waveFills.back }} viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,45 C150,85 350,-15 500,35 C650,85 850,-15 1000,35 C1150,85 1350,-15 1500,35 L1500,120 L0,120 Z" />
              </svg>
              <svg className="sea-wave sea-wave-mid" style={{ fill: waveFills.mid }} viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,30 C200,-10 400,70 600,25 C800,-15 1000,65 1200,25 C1400,-15 1600,65 1800,25 L1800,120 L0,120 Z" />
              </svg>
              <svg className="sea-wave sea-wave-front" style={{ fill: waveFills.front }} viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,15 C150,60 300,-10 450,20 C600,60 750,-10 900,20 C1050,60 1200,-10 1350,20 L1350,120 L0,120 Z" />
              </svg>
            </div>
          </div>

          {/* Centered Digital Floating Badge - Shows Colored Label (High / Med / Low) */}
          <div
            className="tank-center-badge"
            style={{
              borderColor: statusColor !== '#94A3B8' ? statusColor : 'rgba(255, 255, 255, 0.3)',
              boxShadow: statusColor !== '#94A3B8'
                ? `0 4px 16px rgba(0, 0, 0, 0.35), 0 0 12px ${statusColor}40`
                : '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              className="tank-percentage-number"
              style={{
                fontSize: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: statusColor,
                textShadow: `0 2px 6px rgba(0, 0, 0, 0.8), 0 0 8px ${statusColor}55`,
              }}
            >
              {displayStatus}
            </div>
            {displayLiters !== null && capacity !== null && (
              <div className="tank-capacity-sub">
                {displayLiters} / {capacity} L
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Metrics Details */}
      <div className="tank-box-metrics">
        <div className="tank-metric-stat">
          <span className="tank-metric-label">Current Level</span>
          <span className="tank-metric-value" style={{ color: statusColor, fontSize: '17px', fontWeight: 800 }}>
            {displayStatus}
          </span>
        </div>

        <div className="tank-metric-stat" style={{ textAlign: 'right' }}>
          <span className="tank-metric-label">Available Capacity</span>
          <span className="tank-metric-value" style={{ fontSize: '14px' }}>
            {displayLiters !== null && capacity !== null
              ? `${displayLiters} / ${capacity} L`
              : (capacity !== null ? `${capacity} L` : '-')}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   5. Subcomponent: WaterTankCard (Dual Tank Capacity: Sump Tank & Overhead Tank)
   3-State Water Level Status: Low (Red), Medium (Orange), High (Green)
   ========================================================================== */
const WaterTankCard = ({
  waterLevel,
  capacityLiters,
  currentLiters,
  waterLevelStatus,
  sumpTank,
  overheadTank,
  modelNumber,
  hasData = true,
}) => {
  const modelConfig = getModelConfig(modelNumber);
  const showSumpTank = modelConfig ? modelConfig.specialDisplay.showSumpTank : (modelNumber === 'SG-1PS-1.5' ? false : true);

  // Overhead Tank data resolution (do not assume 1000L if not provided)
  const overheadCap = overheadTank?.capacity !== undefined && overheadTank?.capacity !== null
    ? Number(overheadTank.capacity)
    : (capacityLiters !== undefined && capacityLiters !== null ? Number(capacityLiters) : null);

  const overheadLvl = overheadTank?.waterLevel !== undefined && overheadTank?.waterLevel !== null
    ? Number(overheadTank.waterLevel)
    : (waterLevel !== undefined && waterLevel !== null ? Number(waterLevel) : null);

  const overheadStatus = overheadTank?.waterLevelStatus || waterLevelStatus || (overheadLvl !== null ? (overheadLvl < 25 ? 'Low' : overheadLvl > 75 ? 'High' : 'Medium') : null);

  const overheadCurrentL = overheadTank?.currentLiters !== undefined && overheadTank?.currentLiters !== null
    ? Math.round(overheadTank.currentLiters)
    : (currentLiters !== undefined && currentLiters !== null
      ? Math.round(currentLiters)
      : (overheadLvl !== null && overheadCap ? Math.round((overheadLvl / 100) * overheadCap) : null));

  // Sump Tank data resolution
  const sumpCap = sumpTank?.capacity !== undefined && sumpTank?.capacity !== null ? Number(sumpTank.capacity) : null;
  const sumpLvl = sumpTank?.waterLevel !== undefined && sumpTank?.waterLevel !== null ? Number(sumpTank.waterLevel) : null;
  const sumpStatus = sumpTank?.waterLevelStatus || (sumpLvl !== null ? (sumpLvl < 25 ? 'Low' : sumpLvl > 75 ? 'High' : 'Medium') : null);
  const sumpCurrentL = sumpTank?.currentLiters !== undefined && sumpTank?.currentLiters !== null
    ? Math.round(sumpTank.currentLiters)
    : (sumpLvl !== null && sumpCap ? Math.round((sumpLvl / 100) * sumpCap) : null);

  // Status badge helper
  const renderStatusBadge = (status) => {
    if (!status) return <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Unavailable</span>;
    const lower = String(status).toLowerCase();
    const clean = lower === 'low' ? 'Low' : lower === 'high' ? 'High' : 'Medium';
    return (
      <span className={`water-level-status-pill wl-status-${clean.toLowerCase()}`}>
        <span className="wl-dot"></span>
        <span>{clean}</span>
      </span>
    );
  };

  // Get bar color based on status or level
  const getFillColor = (lvl, status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'low' || (lvl !== null && lvl < 25)) return '#EF4444';
    if (s === 'medium' || (lvl !== null && lvl <= 75)) return '#F59E0B';
    if (s === '' || (lvl !== null && lvl > 75)) return '#10B981';
    return '#CBD5E1';
  };

  return (
    <div className="dash-card water-tank-card dual-tanks-card">
      <div className="tank-header">
        <div>
          <h3>{showSumpTank ? 'Tank Capacity & Water Level' : 'Overhead Tank Capacity & Water Level'}</h3>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            {showSumpTank
              ? 'Dual-tank monitoring with 3-state level visualizers'
              : 'Single overhead tank monitoring (Model SG-1PS-1.5 Submersible)'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} className="tank-gear-icon" />
        </div>
      </div>

      {/* Tank Capacity Section */}
      <div className={showSumpTank ? "dual-tanks-grid" : "single-tank-grid"}>
        {/* 1. Sump Tank with Old Animated Water Inside Tank (Hidden on Model 1) */}
        {showSumpTank && (
          <SingleAnimatedTank
            title="Sump Tank"
            tag="Sump"
            tagBg="#E0F2FE"
            tagColor="#0284C7"
            icon={Droplet}
            status={sumpStatus}
            level={sumpLvl}
            capacity={sumpCap}
            currentLiters={sumpCurrentL}
            renderStatusBadge={renderStatusBadge}
          />
        )}

        {/* 2. Overhead Tank with Old Animated Water Inside Tank */}
        <SingleAnimatedTank
          title="Overhead Tank"
          tag="Overhead"
          tagBg="#CCFBF1"
          tagColor="#00A896"
          icon={Droplets}
          status={overheadStatus}
          level={overheadLvl}
          capacity={overheadCap}
          currentLiters={overheadCurrentL}
          renderStatusBadge={renderStatusBadge}
        />
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
      const headers = ['#', 'Device ID', 'Date & Time', 'Status', 'Motor State', 'Duration (Seconds)', 'Hours Formatted', 'Hours Decimal'];
      const rows = filteredMotorRecords.map((e, idx) => {
        const dur = getItemDuration(e);
        return [
          idx + 1,
          e.deviceId || selectedDeviceId || 'N/A',
          new Date(e.startTime || e.timestamp).toLocaleString(),
          'Active',
          e.motorStatus,
          dur,
          formatDuration(dur),
          (dur / 3600).toFixed(2),
        ];
      });
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      const headers = ['#', 'Device ID', 'Date & Time', 'Status', 'Water Level (%)', 'Water (L)', 'Motor Status', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Energy (kWh)'];
      const rows = filteredTelemetryRecords.map((t, idx) => [
        idx + 1,
        t.deviceId || selectedDeviceId || 'N/A',
        new Date(t.timestamp).toLocaleString(),
        (t.deviceStatus === 'Fault' || t.status === 'Fault' ? 'Fault' : 'Active'),
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
          {/* Live 1-Second Heartbeat & Telemetry Acknowledgement Badge */}
          <div className="table-live-ack-chip" title="Live 1-second telemetry heartbeat and status acknowledgement active">
            <span className="live-pulse-dot"></span>
            <span>Live ACK</span>
          </div>

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
                  <th>Status</th>
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
                      <td className="col-op-status">
                        <span className="badge-status-active">
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </span>
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
                  <th>Status</th>
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
                  const isFault = t.deviceStatus === 'Fault' || t.status === 'Fault';
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
                      <td className="col-op-status">
                        {isFault ? (
                          <span className="badge-status-fault">
                            <AlertTriangle size={12} />
                            <span>Fault</span>
                          </span>
                        ) : (
                          <span className="badge-status-active">
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        )}
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
   10. Subcomponent: LiveAcknowledgementSection (Requirement 6: 1-second refresh)
   ========================================================================== */
const LiveAcknowledgementSection = ({ selectedDeviceId, isConnected }) => {
  const [ackData, setAckData] = useState({
    status: 'Active',
    acknowledgedAt: new Date().toISOString(),
    serverTime: Date.now(),
  });
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    // 1. Listen for live 1-second heartbeat from Socket.IO
    function onDeviceAck(data) {
      if (data) {
        setAckData(data);
        setSecondsAgo(0);
      }
    }

    socket.on('device_ack', onDeviceAck);

    // 2. 1-second interval ticker with cleanup on unmount
    const ticker = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      socket.off('device_ack', onDeviceAck);
      clearInterval(ticker);
    };
  }, []);

  const isAckFresh = isConnected && secondsAgo <= 3;
  const isAckWarning = isConnected && secondsAgo > 3 && secondsAgo <= 10;
  const isAckOffline = !isConnected || secondsAgo > 10;

  const statusLabel = isAckOffline
    ? 'Offline'
    : (isAckWarning ? 'Waiting for ACK' : 'Active');

  const statusClass = isAckOffline
    ? 'offline'
    : (isAckWarning ? 'waiting' : 'active');

  const formattedTime = ackData.acknowledgedAt
    ? new Date(ackData.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className="ack-card">
      <div className="ack-left">
        <div className="ack-beacon-pulse">
          <span
            className="ack-beacon-dot"
            style={{
              background: isAckOffline ? '#EF4444' : (isAckWarning ? '#F59E0B' : '#10B981'),
            }}
          />
          {isAckFresh && <span className="ack-beacon-ring" />}
        </div>
        <div className="ack-title-wrap">
          <h4>Live Acknowledgement Status</h4>
          <p>Continuous 1-second controller heartbeat & telemetry handshake</p>
        </div>
      </div>

      <div className="ack-right">
        <div className="ack-time-chip">
          Last ACK: {formattedTime} ({secondsAgo}s ago)
        </div>
        <span className={`ack-status-badge ${statusClass}`}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isAckOffline ? '#DC2626' : (isAckWarning ? '#D97706' : '#059669'),
            }}
          />
          <span>{statusLabel}</span>
        </span>
      </div>
    </div>
  );
};

/* ==========================================================================
   11. Subcomponent: FaultLogsSection (Requirement 8: Dedicated Fault Records)
   ========================================================================== */
const FaultLogsSection = ({ selectedDeviceId }) => {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFaults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFaultLogs({ deviceId: selectedDeviceId || undefined, limit: 20 });
      if (res.data?.success) {
        setFaults(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load fault logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    fetchFaults();
  }, [fetchFaults]);

  // Live Socket.IO listeners for real-time faults
  useEffect(() => {
    function onNewFault(newFault) {
      if (!newFault) return;
      if (selectedDeviceId && newFault.deviceId && newFault.deviceId !== selectedDeviceId) return;
      setFaults((prev) => [newFault, ...prev.filter((f) => f._id !== newFault._id)]);
    }

    function onFaultResolved(resolvedFault) {
      if (!resolvedFault) return;
      setFaults((prev) =>
        prev.map((f) => (f._id === resolvedFault._id ? { ...f, faultStatus: 'Resolved' } : f))
      );
    }

    socket.on('new_fault', onNewFault);
    socket.on('fault_resolved', onFaultResolved);

    return () => {
      socket.off('new_fault', onNewFault);
      socket.off('fault_resolved', onFaultResolved);
    };
  }, [selectedDeviceId]);

  const handleResolve = async (id) => {
    try {
      await resolveFaultLog(id);
      fetchFaults();
    } catch (err) {
      console.error('Failed to resolve fault:', err);
    }
  };

  return (
    <div className="dash-card fault-logs-card">
      <div className="fault-logs-header">
        <div className="fault-logs-title-wrap">
          <div className="fault-icon-badge">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Fault Logs & System Diagnostics
            </h3>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
              Historical and active hardware fault records with timestamps
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchFaults}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          title="Refresh fault logs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {faults.length === 0 ? (
        <div className="fault-empty-state">
          <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
          <h4>No Fault Records Found</h4>
          <p>All hardware controllers, motor drivers, and telemetry lines are operating normally.</p>
        </div>
      ) : (
        <div className="dash-history-table-container">
          <table className="dash-history-data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Device ID / Name</th>
                <th>Fault Description</th>
                <th style={{ width: '120px' }}>Fault Status</th>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '110px' }}>Time</th>
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
                    <td className="col-idx">{idx + 1}</td>
                    <td>
                      <span className="device-tag-code">{f.deviceId}</span>
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
                          onClick={() => handleResolve(f._id)}
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
  );
};

/* ==========================================================================
   MAIN DASHBOARD COMPONENT (frontend/src/pages/Dashboard.jsx)
   ========================================================================== */
const Dashboard = ({ onNavigate, currentUser, onOpenAuth, onOpenProfile, onLogout }) => {
  const isUserAdmin = currentUser && String(currentUser.role).toUpperCase() === 'ADMIN';
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [dashboardData, setDashboardData] = useState(null);
  const [powerHistory, setPowerHistory] = useState([]);
  const [motorHistory, setMotorHistory] = useState(null);
  const [chartRange, setChartRange] = useState('24h');

  // Multi-device selection state: Persist in localStorage & URL params so refresh/reload stays inside the dashboard
  const [devices, setDevices] = useState([]);
  const [dashboardTab, setDashboardTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'models') return 'models';
      return 'devices';
    } catch {
      return 'devices';
    }
  });
  const [activeModelFilter, setActiveModelFilter] = useState('ALL');
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('deviceId') || params.get('device');
      if (urlId) return urlId;
      return localStorage.getItem('wt_selected_device_id') || null;
    } catch {
      return null;
    }
  });
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [hasPendingDevices, setHasPendingDevices] = useState(false);
  const [pendingDeviceList, setPendingDeviceList] = useState([]);

  // Synchronize dashboard tab with URL params
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (dashboardTab === 'models') {
        url.searchParams.set('tab', 'models');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL sync error
    }
  }, [dashboardTab]);

  // Handle model chosen from Models tab
  const handleModelSelectedFromDashboard = (model) => {
    const matchingDevice = devices.find((d) => d.modelNumber === model.modelNumber);
    if (matchingDevice) {
      handleSelectDevice(matchingDevice.deviceId);
      setDashboardTab('devices');
    } else {
      setActiveModelFilter(model.modelNumber);
      setSelectedDeviceId(null);
      setDashboardTab('devices');
    }
  };

  // Synchronize selectedDeviceId with localStorage and URL search params
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedDeviceId) {
        localStorage.setItem('wt_selected_device_id', selectedDeviceId);
        if (url.searchParams.get('deviceId') !== selectedDeviceId) {
          url.searchParams.set('deviceId', selectedDeviceId);
          window.history.replaceState({ deviceId: selectedDeviceId }, '', url.toString());
        }
      } else {
        localStorage.removeItem('wt_selected_device_id');
        if (url.searchParams.has('deviceId') || url.searchParams.has('device')) {
          url.searchParams.delete('deviceId');
          url.searchParams.delete('device');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (err) {
      console.error('Error synchronizing selectedDeviceId:', err);
    }
  }, [selectedDeviceId]);

  // Fetch registered devices list with their latest telemetry data
  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await getDevices();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedList = res.data.data;
        setDevices(fetchedList);

        // For standard users, auto-select their first assigned device so they land straight on their live dashboard
        if (!isUserAdmin) {
          if (fetchedList.length === 0) {
            setSelectedDeviceId(null);
            try {
              localStorage.removeItem('wt_selected_device_id');
            } catch {}
            // Check if user has registered devices pending approval by admin
            try {
              const pendingRes = await getDevices({ includePending: 'true' });
              if (pendingRes.data?.success && Array.isArray(pendingRes.data.data)) {
                const pendingOnly = pendingRes.data.data.filter((d) => d.approvalStatus === 'PENDING');
                setHasPendingDevices(pendingOnly.length > 0);
                setPendingDeviceList(pendingOnly);
              }
            } catch (pErr) {
              console.warn('Could not check pending devices for dashboard:', pErr.message);
            }
          } else if (!selectedDeviceId || !fetchedList.some((d) => d.deviceId === selectedDeviceId)) {
            setSelectedDeviceId(fetchedList[0].deviceId);
            setHasPendingDevices(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices for dashboard:', err.message);
    } finally {
      setLoadingDevices(false);
    }
  }, [isUserAdmin, selectedDeviceId]);

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
    try {
      localStorage.setItem('wt_selected_device_id', devId);
      const url = new URL(window.location.href);
      url.searchParams.set('deviceId', devId);
      window.history.replaceState({ deviceId: devId }, '', url.toString());
    } catch (e) {
      console.error('Failed to save selected device:', e);
    }
    refreshDashboard(devId);
    loadPowerHistory(chartRange, devId);
    loadMotorConsumption(devId);
  };

  const handleBackToDevices = () => {
    setSelectedDeviceId(null);
    try {
      localStorage.removeItem('wt_selected_device_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('deviceId');
      url.searchParams.delete('device');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('Failed to clear selected device:', e);
    }
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
          powerMetrics: { voltage: null, current: null, power: null, powerFactor: null },
          waterTank: { levelPercentage: null, capacityLiters: null, currentLiters: null },
          motor: { motorStatus: 'OFF' },
          energy: { totalKwh: 0, todayKwh: 0, monthlyKwh: 0 },
        };

        const cap = telemetry.tankCapacity !== undefined
          ? (telemetry.tankCapacity !== null ? Number(telemetry.tankCapacity) : null)
          : (base.waterTank?.capacityLiters ?? null);
        const con = telemetry.waterConsumption !== undefined
          ? (telemetry.waterConsumption !== null ? Number(telemetry.waterConsumption) : null)
          : (telemetry.waterLevel !== undefined && cap ? Math.round((telemetry.waterLevel / 100) * cap) : (base.waterTank?.currentLiters ?? null));
        let newWaterLevel = telemetry.waterLevel !== undefined
          ? (telemetry.waterLevel !== null ? Number(telemetry.waterLevel) : null)
          : (cap && con !== null && cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : (base.waterTank?.levelPercentage ?? null));

        const wlStatus = telemetry.waterLevelStatus || (newWaterLevel !== null ? (newWaterLevel < 25 ? 'Low' : newWaterLevel > 75 ? 'High' : 'Medium') : null);
        const newMotorStatus = telemetry.motorStatus || base.motor?.motorStatus || 'OFF';

        return {
          ...base,
          hasData: true,
          powerMetrics: {
            voltage: telemetry.voltage !== undefined ? telemetry.voltage : base.powerMetrics?.voltage,
            current: telemetry.current !== undefined ? telemetry.current : base.powerMetrics?.current,
            vol1: telemetry.vol1 !== undefined ? telemetry.vol1 : base.powerMetrics?.vol1,
            vol2: telemetry.vol2 !== undefined ? telemetry.vol2 : base.powerMetrics?.vol2,
            vol3: telemetry.vol3 !== undefined ? telemetry.vol3 : base.powerMetrics?.vol3,
            cu1: telemetry.cu1 !== undefined ? telemetry.cu1 : base.powerMetrics?.cu1,
            cu2: telemetry.cu2 !== undefined ? telemetry.cu2 : base.powerMetrics?.cu2,
            cu3: telemetry.cu3 !== undefined ? telemetry.cu3 : base.powerMetrics?.cu3,
            power: telemetry.power !== undefined ? telemetry.power : base.powerMetrics?.power,
            powerFactor: telemetry.powerFactor !== undefined ? telemetry.powerFactor : base.powerMetrics?.powerFactor,
            frequency: telemetry.frequency !== undefined ? telemetry.frequency : base.powerMetrics?.frequency,
            energy: (telemetry.energyConsumption !== undefined ? telemetry.energyConsumption : telemetry.energy) !== undefined
              ? (telemetry.energyConsumption !== undefined ? telemetry.energyConsumption : telemetry.energy)
              : base.powerMetrics?.energy,
          },
          waterTank: {
            ...base.waterTank,
            levelPercentage: newWaterLevel,
            capacityLiters: cap,
            currentLiters: con,
            waterLevelStatus: wlStatus,
            sumpTank: telemetry.sumpTank !== undefined ? telemetry.sumpTank : base.waterTank?.sumpTank,
            overheadTank: telemetry.overheadTank !== undefined ? telemetry.overheadTank : base.waterTank?.overheadTank,
            status: newWaterLevel !== null ? (newWaterLevel < 25 ? 'LOW' : newWaterLevel > 85 ? 'FULL' : 'NORMAL') : null,
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
    vol1: null,
    vol2: null,
    vol3: null,
    cu1: null,
    cu2: null,
    cu3: null,
    power: null,
    powerFactor: null,
    frequency: null,
    energy: null,
  };

  const waterTank = dashboardData?.waterTank || {
    levelPercentage: null,
    capacityLiters: null,
    currentLiters: null,
    waterLevelStatus: null,
    sumpTank: null,
    overheadTank: null,
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

  const isApprovedDevice = devices.some((d) => d.deviceId === selectedDeviceId);
  const activeSelectedDeviceId = (!isUserAdmin && !isApprovedDevice) ? null : selectedDeviceId;
  const selectedDevice = devices.find((d) => d.deviceId === activeSelectedDeviceId) || (isUserAdmin ? dashboardData?.device : null);

  return (
    <div className="dashboard-wrapper">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      <main className="main-content">
        <Navbar
          currentPage="dashboard"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenProfile={onOpenProfile}
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

        {/* VIEW 1: REGISTERED DEVICES FIRST (When no device is currently clicked or approved) */}
        {!activeSelectedDeviceId ? (
          <div className="registered-devices-screen">
            {/* Dashboard Subtabs Navigation: Registered Devices (Motor Models for Admin only) */}
            {isUserAdmin && (
              <div className="dash-tabs-nav-bar">
                <button
                  type="button"
                  className={`dash-tab-nav-btn ${dashboardTab === 'devices' ? 'active' : ''}`}
                  onClick={() => setDashboardTab('devices')}
                >
                  <Cpu size={16} />
                  <span>Registered Devices</span>
                  <span className="dash-tab-badge">{devices.length}</span>
                </button>

                <button
                  type="button"
                  className={`dash-tab-nav-btn ${dashboardTab === 'models' ? 'active' : ''}`}
                  onClick={() => setDashboardTab('models')}
                >
                  <Layers size={16} />
                  <span>Motor Models</span>
                  <span className="dash-tab-badge badge-models">4</span>
                </button>
              </div>
            )}

            {isUserAdmin && dashboardTab === 'models' ? (
              <Models
                embedMode={true}
                currentUser={currentUser}
                onNavigate={onNavigate}
                onSelectModel={handleModelSelectedFromDashboard}
              />
            ) : (
              <>
                {/* Optional Model Filter Indicator */}
                {activeModelFilter !== 'ALL' && (
                  <div className="model-filter-indicator-bar">
                    <span>
                      Filtered by Model: <strong>{activeModelFilter}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-clear-model-filter"
                      onClick={() => setActiveModelFilter('ALL')}
                    >
                      Clear Filter (Show All Devices)
                    </button>
                  </div>
                )}

                {loadingDevices && devices.length === 0 ? (
                  <div className="dash-card devices-loading-state">
                    <Loader2 size={32} className="animate-spin" />
                    <p>Loading registered devices...</p>
                  </div>
                ) : (activeModelFilter === 'ALL' ? devices : devices.filter((d) => d.modelNumber === activeModelFilter)).length === 0 ? (
                  !isUserAdmin && hasPendingDevices ? (
                    <div className="dash-card empty-devices-card" style={{ border: '1.5px solid #FDE68A', background: '#FFFDF5' }}>
                      <Clock size={48} style={{ color: '#D97706', margin: '0 auto 12px' }} />
                      <h3 style={{ color: '#B45309' }}>Pending Approval by Admin</h3>
                      <p style={{ maxWidth: '520px', margin: '0 auto 16px', color: '#78350F' }}>
                        You registered device <strong>{pendingDeviceList.map((d) => d.deviceId).join(', ')}</strong>. It is currently <strong>pending approval by Admin</strong>. Once approved by admin, this device will be added and your live dashboard, tank levels, and history will show automatically.
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onNavigate('devices')}
                        style={{ background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }}
                      >
                        <Clock size={16} /> View Device Status
                      </button>
                    </div>
                  ) : (
                    <div className="dash-card empty-devices-card">
                      <Cpu size={48} className="empty-icon" />
                      <h3>
                        {!isUserAdmin
                          ? 'No Registered Devices Found'
                          : activeModelFilter !== 'ALL'
                          ? `No Devices Registered Under Model ${activeModelFilter}`
                          : 'No Registered Devices Found'}
                      </h3>
                      <p>
                        {!isUserAdmin
                          ? 'You have not registered any IoT tank devices yet. Register your administrator-provided Device ID to start monitoring.'
                          : activeModelFilter !== 'ALL'
                          ? `Register a new hardware device with model ${activeModelFilter} to begin monitoring.`
                          : 'Register your first hardware controller to begin receiving real-time water tank and power metrics.'}
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onNavigate('devices')}
                      >
                        <Plus size={16} /> {!isUserAdmin ? 'Register a Device ID' : 'Register Device'}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="registered-devices-main-grid">
                    {(activeModelFilter === 'ALL' ? devices : devices.filter((d) => d.modelNumber === activeModelFilter)).map((dev) => {
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="hub-device-id">{dev.deviceId}</span>
                              {dev.modelNumber && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: '#EFF6FF',
                                    color: '#0284C7',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #BFDBFE',
                                  }}
                                >
                                  {dev.modelNumber}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const isFault = dev.status === 'Fault' || dev.deviceStatus === 'Fault';
                              if (isFault) {
                                return (
                                  <span className="hub-status-pill fault" title={dev.faultDescription || 'Fault condition reported'}>
                                    <span className="status-dot"></span>
                                    FAULT
                                  </span>
                                );
                              }
                              const isActive = dev.status === 'Active' || dev.deviceStatus === 'Active' || isOnline;
                              return (
                                <span className={`hub-status-pill ${hasTelemetry || isActive ? 'active' : 'no-data'}`}>
                                  <span className="status-dot"></span>
                                  {hasTelemetry || isActive ? 'ACTIVE' : 'NO DATA'}
                                </span>
                              );
                            })()}
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
              </>
            )}
          </div>
        ) : (
          /* VIEW 2: SELECTED DEVICE DASHBOARD (After user clicks a card) */
          <div className="selected-device-view">
            {/* Top Navigation Banner with Back Button */}
            <div className="dash-card device-view-header-bar">
              <div className="device-view-back-group">
                {(isUserAdmin || devices.length > 1) && (
                  <button
                    type="button"
                    className="btn-back-to-devices"
                    onClick={handleBackToDevices}
                    title="Return to Devices List"
                  >
                    <ArrowLeft size={16} />
                    <span>{isUserAdmin ? 'All Devices' : 'My Devices'}</span>
                  </button>
                )}

                {isUserAdmin && (
                  <button
                    type="button"
                    className="btn-back-to-devices"
                    onClick={() => {
                      setSelectedDeviceId(null);
                      setDashboardTab('models');
                    }}
                    title="View and Manage Motor Models"
                  >
                    <Layers size={15} />
                    <span>Models</span>
                  </button>
                )}

                <div className="device-view-divider" />

                <div className="device-view-active-title">
                  <span className="active-id-chip">{selectedDeviceId}</span>
                  {selectedDevice?.modelNumber && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#EFF6FF',
                        color: '#0284C7',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #BFDBFE',
                        letterSpacing: '0.3px',
                      }}
                      title={`Standardized Model: ${selectedDevice.modelNumber}`}
                    >
                      {selectedDevice.modelNumber}
                    </span>
                  )}
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
                waterLevelStatus={waterTank.waterLevelStatus}
                selectedDeviceId={selectedDeviceId}
                selectedDevice={selectedDevice}
                hasData={hasData}
                onMotorStateChanged={handleMotorStateChanged}
              />
              <PowerMetricsCard
                metrics={{
                  ...powerMetrics,
                  energy: powerMetrics.energy ?? dashboardData?.energy?.totalKwh ?? null,
                }}
                modelNumber={selectedDevice?.modelNumber}
                hasData={hasData}
              />
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
                waterLevelStatus={waterTank.waterLevelStatus}
                sumpTank={waterTank.sumpTank}
                overheadTank={waterTank.overheadTank}
                modelNumber={selectedDevice?.modelNumber}
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

            {/* 10. Dedicated Fault Logs & Diagnostics Section */}
            <FaultLogsSection
              selectedDeviceId={selectedDeviceId}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
