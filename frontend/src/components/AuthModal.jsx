import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

const AuthModal = ({ isOpen, onClose, initialMode = 'signup', onSuccess }) => {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    phone: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errorMsg) setErrorMsg('');
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleUseDemoAdmin = () => {
    setMode('signin');
    setFormData({
      ...formData,
      email: 'admin@hydropulse.io',
      password: 'admin123',
    });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup') {
      if (!formData.name.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (!formData.email.trim()) {
        setErrorMsg('Please enter a valid email address');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }

      setLoading(true);
      try {
        const res = await registerUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          phone: formData.phone.trim(),
        });

        if (res.data?.success) {
          const { token, user } = res.data;
          localStorage.setItem('wt_token', token);
          localStorage.setItem('wt_user', JSON.stringify(user));
          setSuccessMsg('Account registered successfully! Redirecting...');
          setTimeout(() => {
            if (onSuccess) onSuccess(user, token);
            onClose();
          }, 700);
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || err.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In mode
      if (!formData.email.trim() || !formData.password) {
        setErrorMsg('Please enter your email and password');
        return;
      }

      setLoading(true);
      try {
        const res = await loginUser({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (res.data?.success) {
          const { token, user } = res.data;
          localStorage.setItem('wt_token', token);
          localStorage.setItem('wt_user', JSON.stringify(user));
          setSuccessMsg('Signed in successfully! Loading console...');
          setTimeout(() => {
            if (onSuccess) onSuccess(user, token);
            onClose();
          }, 600);
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="auth-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-badge">
            <ShieldCheck size={24} className="auth-shield-icon" />
          </div>
          <h2 className="auth-modal-title">
            {mode === 'signup' ? 'Create Admin Account' : 'Sign In to Console'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'signup'
              ? 'Register credentials to unlock full IoT control, device setup, and privileges.'
              : 'Enter your administrator credentials to access live telemetry and actuators.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="auth-tabs-row">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('signin')}
          >
            Sign In
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="auth-alert-box error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          {mode === 'signup' && (
            <>
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Alex Henderson"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role Privilege</label>
                <div className="auth-role-selector">
                  <label className={`role-pill ${formData.role === 'admin' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={handleChange}
                    />
                    <span>Administrator (Full Access)</span>
                  </label>
                  <label className={`role-pill ${formData.role === 'operator' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="operator"
                      checked={formData.role === 'operator'}
                      onChange={handleChange}
                    />
                    <span>Operator (Live Monitor & Pump)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="auth-input-group">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="admin@hydropulse.io"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label>Phone Number (Optional)</label>
              <div className="auth-input-wrapper">
                <Phone size={16} className="auth-input-icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label>Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account & Sign In' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Pre-fill for Convenience */}
        <div className="auth-demo-helper">
          <span>Need quick access?</span>
          <button type="button" onClick={handleUseDemoAdmin} className="auth-quick-link">
            Fill Default Admin (admin@hydropulse.io)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
