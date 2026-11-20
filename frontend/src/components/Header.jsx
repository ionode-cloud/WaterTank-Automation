import React, { useState } from 'react';
import { Power, Droplet, Loader2 } from 'lucide-react';
import { forceMotorOn, forceMotorOff } from '../services/api';

const Header = ({
  motorStatus = null,
  waterLevel = null,
  selectedDeviceId = null,
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

  return (
    <div className="dash-card user-system-card header-system-card">
      {/* Top: Branding & Profile */}
      <div className="system-header-profile">
        <div className="system-avatar-circle">WT</div>
        <div className="system-title-wrap">
          <h3>WaterTank System</h3>
          <p>WELCOME TO DASHBOARD</p>
        </div>
      </div>

      {/* Main Row: Left = Circle Button, Right = Water Level & Status (RUNNING / STOP) */}
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

        {/* Right Side: Water Level and Status Badge (RUNNING / STOP) */}
        <div className="header-status-right">
          {/* Water Level */}
          <div className="header-water-pill">
            <Droplet size={15} className="water-drop-icon" />
            <span className="water-pill-text">
              Water Level: <strong>{hasData && waterLevel !== null && waterLevel !== undefined ? `${waterLevel}%` : '-'}</strong>
            </span>
          </div>

          {/* Motor Status Badge */}
          <div
            className={`header-motor-badge ${
              !isMotorKnown ? 'badge-motor-nodata' : (isMotorOn ? 'badge-motor-running' : 'badge-motor-stopped')
            }`}
          >
            <span className="badge-status-dot"></span>
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
