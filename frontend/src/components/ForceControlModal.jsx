import React, { useState } from 'react';
import {
  Power,
  Play,
  Square,
  Droplets,
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { forceMotorOn, forceMotorOff } from '../services/api';

const ForceControlModal = ({
  isOpen,
  onClose,
  targetAction, // 'ON' or 'OFF'
  currentStatus = 'OFF',
  waterLevel = 0,
  onSuccess,
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const isTurningOn = targetAction === 'ON';

  const handleExecute = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      let res;
      if (isTurningOn) {
        res = await forceMotorOn('dashboard_header');
      } else {
        res = await forceMotorOff('dashboard_header');
      }

      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `Motor Force ${targetAction} successfully executed!`,
        });
        if (onSuccess) onSuccess(targetAction);
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.message || `Failed to execute Force ${targetAction}`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Execution failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-modal-overlay" onClick={onClose}>
      <div
        className="force-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="force-modal-header">
          <div className="force-modal-title-wrap">
            <div className={`force-modal-icon-badge ${isTurningOn ? 'badge-on' : 'badge-off'}`}>
              <Power size={20} />
            </div>
            <div>
              <h4>Force Motor Control Model</h4>
              <p>Manual override command for water pump system</p>
            </div>
          </div>
          <button className="force-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="force-modal-body">
          {/* Status Overview Cards */}
          <div className="modal-status-grid">
            <div className="modal-status-box">
              <span className="modal-status-label">Current Motor</span>
              <span
                className={`modal-status-val ${
                  currentStatus === 'ON' ? 'status-val-on' : 'status-val-off'
                }`}
              >
                ● {currentStatus}
              </span>
            </div>

            <div className="modal-status-box">
              <span className="modal-status-label">Tank Water Level</span>
              <div className="modal-water-row">
                <Droplets size={15} color="#00A896" />
                <span className="modal-water-val">{waterLevel}%</span>
              </div>
            </div>

            <div className="modal-status-box">
              <span className="modal-status-label">Target Action</span>
              <span
                className={`modal-target-tag ${
                  isTurningOn ? 'target-tag-on' : 'target-tag-off'
                }`}
              >
                FORCE {targetAction}
              </span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="modal-safety-notice">
            <ShieldAlert size={18} className="safety-icon" />
            <div>
              <div className="safety-title">Safety & Automation Notice</div>
              <div className="safety-desc">
                {isTurningOn
                  ? 'Initiating Force ON will start the motor immediately. An automatic safety shutoff will trigger if water level reaches 100% capacity.'
                  : 'Initiating Force OFF will immediately shut down pump operation and log the stop duration.'}
              </div>
            </div>
          </div>

          {/* Optional Note Field */}
          <div className="modal-field-group">
            <label>Reason / Operator Note (Optional)</label>
            <input
              type="text"
              placeholder={isTurningOn ? 'e.g. Manual morning top-up' : 'e.g. Routine maintenance shut-down'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`modal-feedback-alert ${
                feedback.type === 'success' ? 'feedback-success' : 'feedback-error'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="force-modal-footer">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`modal-confirm-btn ${isTurningOn ? 'btn-force-on' : 'btn-force-off'}`}
            onClick={handleExecute}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Executing...</span>
              </>
            ) : isTurningOn ? (
              <>
                <Play size={15} />
                <span>Confirm Force ON</span>
              </>
            ) : (
              <>
                <Square size={15} />
                <span>Confirm Force OFF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceControlModal;
