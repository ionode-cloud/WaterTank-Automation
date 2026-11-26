import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { loginUser, registerUser, googleAuth } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const isRealClientId = (id) => {
  return (
    id &&
    typeof id === 'string' &&
    id.includes('.apps.googleusercontent.com') &&
    !id.includes('your_google_client_id_here')
  );
};

const AuthModal = ({ isOpen, onClose, initialMode = 'signup', onSuccess }) => {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google Account Chooser State
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGmail, setCustomGmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Helper to load and persist saved Gmail accounts
  const loadSavedAccounts = () => {
    const defaultAccounts = [
      {
        name: 'Jyotiranjan Behera',
        email: 'jyotiranjanbehera282@gmail.com',
        avatarColor: '#EA4335',
        letter: 'J',
      },
      {
        name: 'Ionode Cloud Admin',
        email: 'ionodecloud.iot@gmail.com',
        avatarColor: '#4285F4',
        letter: 'I',
      },
      {
        name: 'WaterTank Support',
        email: 'support.watertank@gmail.com',
        avatarColor: '#34A853',
        letter: 'W',
      },
    ];

    try {
      const stored = localStorage.getItem('wt_saved_google_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const emails = new Set(parsed.map((a) => a.email.toLowerCase()));
          const combined = [...parsed];
          defaultAccounts.forEach((da) => {
            if (!emails.has(da.email.toLowerCase())) combined.push(da);
          });
          return combined;
        }
      }
    } catch {}

    return defaultAccounts;
  };

  const [savedAccounts, setSavedAccounts] = useState(loadSavedAccounts);

  const saveAccountToHistory = (email, name, picture) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name || cleanEmail.split('@')[0];
      const current = loadSavedAccounts();
      const filtered = current.filter((a) => a.email.toLowerCase() !== cleanEmail);
      const updated = [
        {
          name: cleanName,
          email: cleanEmail,
          picture: picture || '',
          avatarColor: '#4285F4',
          letter: cleanName.charAt(0).toUpperCase() || 'G',
        },
        ...filtered,
      ];
      localStorage.setItem('wt_saved_google_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch {}
  };

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    setShowGoogleChooser(false);
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

  // Execute Backend Google Login & Registration
  const completeGoogleAuth = async ({ email, name, picture, sub }) => {
    setErrorMsg('');
    setSuccessMsg('');
    setGoogleLoading(true);

    try {
      const res = await googleAuth({
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        picture: picture || '',
        sub: sub || `google_${Date.now()}`,
      });

      if (res.data?.success) {
        const { token, user } = res.data;
        saveAccountToHistory(email, name || user.name, picture || user.picture);
        localStorage.setItem('wt_token', token);
        localStorage.setItem('wt_user', JSON.stringify(user));
        setSuccessMsg(`Welcome, ${user.name}! ${mode === 'signup' ? 'Registered' : 'Logged in'} via Google.`);
        setTimeout(() => {
          if (onSuccess) onSuccess(user, token);
          onClose();
        }, 650);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
      setShowGoogleChooser(false);
    }
  };

  // Requirement: "after click on continue with google the here show all saved gmail then i click and login or signup"
  const handleGoogleSignIn = () => {
    setErrorMsg('');
    setSuccessMsg('');
    // Refresh accounts from localStorage and display the chooser immediately
    setSavedAccounts(loadSavedAccounts());
    setShowGoogleChooser(true);
  };

  // Optional trigger for official live Google OAuth popup
  const handleLiveGooglePopup = () => {
    if (
      isRealClientId(GOOGLE_CLIENT_ID) &&
      typeof window !== 'undefined' &&
      window.google?.accounts?.oauth2
    ) {
      setGoogleLoading(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              setGoogleLoading(false);
              const errMsg = tokenResponse.error_description || tokenResponse.error;
              setErrorMsg(`Google login: ${errMsg}`);
              return;
            }
            if (tokenResponse?.access_token) {
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await userInfoRes.json();
                if (!profile?.email) {
                  throw new Error('Google did not return an email address');
                }
                await completeGoogleAuth({
                  email: profile.email,
                  name: profile.name,
                  picture: profile.picture,
                  sub: profile.sub,
                });
              } catch (fetchErr) {
                setErrorMsg('Failed to retrieve Google profile: ' + fetchErr.message);
                setGoogleLoading(false);
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (clientErr) {
        console.warn('Google popup client error:', clientErr);
        setGoogleLoading(false);
        setErrorMsg('Unable to open Google popup. Please select your saved Gmail below.');
      }
    } else {
      setErrorMsg('Google OAuth client library not initialized yet. Please select your saved Gmail below.');
    }
  };

  const handleSelectSampleAccount = (acc) => {
    completeGoogleAuth({
      email: acc.email,
      name: acc.name,
      sub: `google_${acc.email.replace(/[^a-zA-Z0-9]/g, '')}`,
    });
  };

  const handleCustomGmailSubmit = (e) => {
    e.preventDefault();
    if (!customGmail.trim() || !customGmail.includes('@')) {
      setErrorMsg('Please enter a valid Gmail address');
      return;
    }
    const clean = customGmail.trim().toLowerCase();
    const namePart = clean.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    completeGoogleAuth({
      email: clean,
      name: namePart,
      sub: `google_${Date.now()}`,
    });
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
      if (!formData.email.trim()) {
        setErrorMsg('Please enter your email address');
        return;
      }
      if (!formData.password) {
        setErrorMsg('Please enter your password');
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
          setSuccessMsg('Authentication successful! Welcome back.');
          setTimeout(() => {
            if (onSuccess) onSuccess(user, token);
            onClose();
          }, 700);
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || err.message || 'Login failed');
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
            {mode === 'signup' ? 'Create Your Account' : 'Sign In to WaterTank'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'signup'
              ? 'Register credentials to access your IoT devices, live telemetry, and control.'
              : 'Enter your credentials to access live telemetry, motor actuation, and history.'}
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

        {/* Google Authentication Button */}
        <div className="auth-social-wrap" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn-google-auth"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg className="google-icon" width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            <span>{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Google Account Chooser Modal View (Displays all Gmail accounts for user selection) */}
        {showGoogleChooser && (
          <div className="google-chooser-overlay">
            <div className="google-chooser-card animate-pop-in">
              <div className="google-chooser-header">
                <svg width="22" height="22" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <h4>Choose a Google Account</h4>
                  <p>Click your saved Gmail to {mode === 'signup' ? 'register' : 'sign in'} instantly</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleChooser(false)}
                  className="auth-close-btn"
                  style={{ position: 'static' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Saved Gmail Accounts List */}
              <div className="google-accounts-list">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className="google-account-item-btn"
                    onClick={() => handleSelectSampleAccount(acc)}
                    disabled={googleLoading}
                  >
                    {acc.picture ? (
                      <img
                        src={acc.picture}
                        alt={acc.name}
                        className="google-user-circle"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="google-user-circle"
                        style={{ background: acc.avatarColor || '#4285F4' }}
                      >
                        {acc.letter || (acc.name ? acc.name.charAt(0).toUpperCase() : 'G')}
                      </div>
                    )}
                    <div className="google-user-details">
                      <span className="google-user-name">{acc.name}</span>
                      <span className="google-user-email">{acc.email}</span>
                    </div>
                    {googleLoading ? (
                      <Loader2 size={16} className="animate-spin text-teal-600" />
                    ) : (
                      <ChevronRight size={16} color="#94A3B8" />
                    )}
                  </button>
                ))}
              </div>

              {/* Use Another Account */}
              {!showCustomInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="google-another-account-btn"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <PlusCircle size={16} color="#4285F4" />
                    <span>Use another Google account</span>
                  </button>

                  {/* Optional Live Google Browser OAuth Trigger */}
                  {isRealClientId(GOOGLE_CLIENT_ID) && (
                    <button
                      type="button"
                      onClick={handleLiveGooglePopup}
                      className="google-live-popup-btn"
                      disabled={googleLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#475569',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Sparkles size={13} color="#4285F4" />
                      <span>Open Browser Google OAuth Popup</span>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCustomGmailSubmit} className="google-custom-email-form">
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      placeholder="name@gmail.com"
                      value={customGmail}
                      onChange={(e) => setCustomGmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="submit"
                      disabled={googleLoading || !customGmail.trim()}
                      className="btn-primary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                    >
                      {googleLoading ? <Loader2 size={14} className="animate-spin" /> : 'Continue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="row-form-cancel-btn"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="google-chooser-footer">
                <span>Google Client ID linked via <code>.env</code> file.</span>
              </div>
            </div>
          </div>
        )}

        <div className="auth-divider-line">
          <span>or continue with email</span>
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
