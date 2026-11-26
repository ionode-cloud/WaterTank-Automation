import React, { useState } from 'react';
import { Power, Droplet, Droplets, Loader2, Cpu, MapPin, Layers, Gauge } from 'lucide-react';
import { forceMotorOn, forceMotorOff } from '../services/api';

const Header = ({
  motorStatus = null,
  waterLevel = null,
  waterLevelStatus = null,
  selectedDeviceId = null,
  selectedDevice = null,
  hasData = true,
  onMotorStateChanged,
}) => {
  const [loading, setLoading] = useState(false);

  const isMotorKnown = hasData && motorStatus !== null && motorStatus !== undefined;
  const isMotorOn = isMotorKnown && motorStatus === 'ON';

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const targetAction = isMotorOn ? 'OFF' : 'ON';
      if (isMotorOn) {
        await forceMotorOff('dashboard_header', selectedDeviceId);
      } else {
        await forceMotorOn('dashboard_header', selectedDeviceId);
      }
      if (onMotorStateChanged) {
        onMotorStateChanged(targetAction);
      }
    } catch (err) {
      console.error('Failed to toggle motor:', err);
    } finally {
      setLoading(false);
    }
  };

  const devId = selectedDeviceId || selectedDevice?.deviceId || 'WT-DEV';
  const modelNum = selectedDevice?.modelNumber || 'SG-1PS-1.5';
  const location = selectedDevice?.location || 'Rooftop Tank';
  const opMode = selectedDevice?.operatingMode || 'AUTO';
  const tankCap = selectedDevice?.tankCapacity || 1000;
  const numericLevel = hasData && waterLevel !== null && waterLevel !== undefined ? Number(waterLevel) : null;
  const clampedPercent = numericLevel !== null ? Math.min(Math.max(numericLevel, 0), 100) : 0;

  return (
    <div className="dash-card user-system-card header-system-card">
      {/* 1. Top: Branding, Title & Live Status */}
      <div className="system-header-profile">
        <div className="system-avatar-circle" title="WaterTank System">
          WT
        </div>
        <div className="system-title-wrap">
          <div className="system-title-row">
            <h3 title={selectedDevice?.name || 'WaterTank System'}>
              {selectedDevice?.name || 'WaterTank System'}
            </h3>
            <span className={`live-connection-pill ${hasData ? 'pill-online' : 'pill-standby'}`}>
              <span className={`pulse-dot-small ${hasData ? 'dot-active' : 'dot-standby'}`}></span>
              <span>{hasData ? 'Online' : 'Standby'}</span>
            </span>
          </div>
          <p className="system-sub-meta">
            <MapPin size={11} className="sub-loc-icon" />
            <span>{location}</span>
            <span className="meta-sub-dot">•</span>
            <span>WELCOME TO DASHBOARD</span>
          </p>
        </div>
      </div>

      {/* 2. Middle: Visual Water Tank Progress Gauge & Device Specs */}
      <div className="header-device-middle-info">
        {/* Water Tank Progress Gauge */}
        <div className="tank-progress-widget">
          <div className="tank-progress-labels">
            <div className="tank-label-left">
              <Droplets size={13} className="tank-gauge-droplet" />
              <span className="tank-name">Overhead Tank</span>
              <span className="tank-cap-badge">{tankCap} L</span>
            </div>
            <div className="tank-label-right">
              <strong className="tank-pct-val">
                {numericLevel !== null ? `${numericLevel}%` : '-'}
              </strong>
            </div>
          </div>

          <div className="tank-progress-track">
            <div
              className={`tank-progress-fill ${numericLevel === null ? 'fill-standby' : ''}`}
              style={{
                width: numericLevel !== null ? `${clampedPercent}%` : '0%',
              }}
            ></div>
          </div>

          <div className="tank-progress-footer">
            <span className="tank-status-label">
              Status:{' '}
              <strong>
                {waterLevelStatus || (numericLevel !== null ? (numericLevel < 20 ? 'LOW' : numericLevel > 90 ? 'FULL' : 'NORMAL') : 'Awaiting Data')}
              </strong>
            </span>
            <span className="tank-mode-label">
              Mode: <strong className={opMode === 'AUTO' ? 'text-auto' : 'text-manual'}>{opMode}</strong>
            </span>
          </div>
        </div>

        {/* Device Meta Chips Row */}
        <div className="header-meta-chips-row">
          <div className="header-meta-chip chip-devid" title="Hardware Device ID">
            <Cpu size={12} className="meta-chip-icon" />
            <span>{devId}</span>
          </div>

          <div className="header-meta-chip chip-model" title="Standardized Motor Model">
            <Layers size={12} className="meta-chip-icon" />
            <span>{modelNum}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Left = Circle Power Button, Right = Water Level & Motor Status */}
      <div className="header-controls-split">
        {/* Left Side: Circle Power Button */}
        <div className="header-button-left">
          <button
            type="button"
            className={`circle-power-btn ${
              !isMotorKnown ? 'btn-power-nodata' : (isMotorOn ? 'btn-power-on' : 'btn-power-off')
            } ${loading ? 'btn-loading' : ''}`}
            onClick={handleToggle}
            disabled={loading}
            title={
              !isMotorKnown
                ? 'No motor data received yet'
                : (isMotorOn
                  ? 'Motor is RUNNING - Click to STOP'
                  : 'Motor is STOPPED - Click to START')
            }
            aria-label={!isMotorKnown ? 'Motor state unknown' : (isMotorOn ? 'Turn Motor OFF' : 'Turn Motor ON')}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Power size={21} className="power-icon-svg" />
            )}
            <span className="power-btn-label">{!isMotorKnown ? '-' : (isMotorOn ? 'ON' : 'OFF')}</span>
          </button>
        </div>

        {/* Right Side: Water Level and Motor Status Badge */}
        <div className="header-status-right">
          {/* Water Level Pill */}
          <div className="header-water-pill">
            <div className="header-pill-left">
              <Droplet size={14} className="water-drop-icon" />
              <span className="water-pill-text">Water Level:</span>
            </div>
            <strong className="header-pill-val">
              {hasData && waterLevel !== null && waterLevel !== undefined ? `${waterLevel}%` : '-'}
            </strong>
          </div>

          {/* Motor Status Badge */}
          <div
            className={`header-motor-badge ${
              !isMotorKnown ? 'badge-motor-nodata' : (isMotorOn ? 'badge-motor-running' : 'badge-motor-stopped')
            }`}
          >
            <div className="header-pill-left">
              <span className="badge-status-dot"></span>
              <span className="badge-status-label">Motor:</span>
            </div>
            <span className="badge-status-text">
              {!isMotorKnown ? '-' : (isMotorOn ? 'RUNNING' : 'STOP')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
