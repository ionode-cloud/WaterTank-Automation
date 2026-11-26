import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  Cpu,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Save,
  Layers,
} from 'lucide-react';
import { getCurrentUser, updateUserProfile } from '../services/api';

const ProfileModal = ({ isOpen, onClose, currentUser, onProfileUpdated }) => {
  const [profile, setProfile] = useState(currentUser || {});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Load fresh profile from backend
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(false);

    async function loadFreshProfile() {
      try {
        setLoading(true);
        const res = await getCurrentUser();
        if (res.data?.success && res.data.user) {
          const u = res.data.user;
          setProfile(u);
          setName(u.name || '');
          setPhone(u.phone || u.mobileNumber || '');
          setLocation(u.location || '');
        }
      } catch (err) {
        // Fallback to prop
        if (currentUser) {
          setProfile(currentUser);
          setName(currentUser.name || '');
          setPhone(currentUser.phone || currentUser.mobileNumber || '');
          setLocation(currentUser.location || '');
        }
      } finally {
        setLoading(false);
      }
    }

    loadFreshProfile();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const res = await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg('Profile updated successfully!');
        const updated = res.data.user;
        setProfile((prev) => ({ ...prev, ...updated }));
        setIsEditing(false);

        // Update local storage
        const stored = JSON.parse(localStorage.getItem('wt_user') || '{}');
        const merged = { ...stored, ...updated };
        localStorage.setItem('wt_user', JSON.stringify(merged));

        if (onProfileUpdated) {
          onProfileUpdated(merged);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = (profile.name || 'User').charAt(0).toUpperCase();
  const roleDisplay = String(profile.role || 'USER').toUpperCase();
  const isAdmin = roleDisplay === 'ADMIN';

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card profile-modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="auth-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* Profile Header */}
        <div className="profile-header-banner">
          <div className="profile-avatar-large">
            {initialLetter}
          </div>
          <div className="profile-header-info">
            <div className="profile-name-row">
              <h3>{profile.name || 'User'}</h3>
              <span className={`profile-role-tag ${isAdmin ? 'role-admin' : 'role-user'}`}>
                {isAdmin ? 'Administrator' : 'Standard User'}
              </span>
            </div>
            <p className="profile-email-sub">{profile.email}</p>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="auth-alert-box error" style={{ margin: '14px 0 6px' }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert-box success" style={{ margin: '14px 0 6px' }}>
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* View / Edit Mode */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
            <Loader2 size={24} className="animate-spin text-teal" />
          </div>
        ) : isEditing ? (
          <form onSubmit={handleSave} className="profile-edit-form">
            <div className="auth-input-group">
              <label>Full Name</label>
              <div className="auth-input-wrapper">
                <UserIcon size={16} className="auth-input-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Phone / Mobile</label>
              <div className="auth-input-wrapper">
                <Phone size={16} className="auth-input-icon" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Location</label>
              <div className="auth-input-wrapper">
                <MapPin size={16} className="auth-input-icon" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Building C, Rooftop Tank"
                />
              </div>
            </div>

            <div className="profile-actions-row">
              <button
                type="button"
                className="btn-profile-cancel"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-profile-save"
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <span className="detail-label">
                <UserIcon size={14} /> Full Name
              </span>
              <span className="detail-value">{profile.name || '-'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">
                <Mail size={14} /> Email Address
              </span>
              <span className="detail-value">{profile.email || '-'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">
                <Phone size={14} /> Mobile Number
              </span>
              <span className="detail-value">{profile.phone || profile.mobileNumber || 'Not set'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">
                <MapPin size={14} /> Location
              </span>
              <span className="detail-value">{profile.location || 'Not set'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">
                <Shield size={14} /> System Privilege
              </span>
              <span className="detail-value">{isAdmin ? 'Administrator (Full Access)' : 'User (Assigned Devices)'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-label">
                <Calendar size={14} /> Member Since
              </span>
              <span className="detail-value">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Active Member'}
              </span>
            </div>

            {/* Assigned Devices Section */}
            <div className="profile-devices-section">
              <div className="profile-devices-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} className="text-teal" />
                  <h4>My Registered Devices ({profile.assignedDevices?.length || profile.assignedDeviceCount || 0})</h4>
                </div>
              </div>

              {profile.assignedDevices && profile.assignedDevices.length > 0 ? (
                <div className="profile-device-tags-list">
                  {profile.assignedDevices.map((dev) => (
                    <div key={dev.deviceId || dev._id} className="profile-device-tag">
                      <span className="p-dev-id">{dev.deviceId}</span>
                      <span className="p-dev-name">{dev.name || 'Pump Controller'}</span>
                      {dev.modelNumber && <span className="p-dev-model">{dev.modelNumber}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-devices-note">
                  No devices currently linked. You can register a manufactured Device ID on the Devices page.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="profile-actions-row">
              <button
                type="button"
                className="btn-profile-edit"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={14} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
