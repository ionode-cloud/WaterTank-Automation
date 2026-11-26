import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  Layers,
  Cpu,
  Zap,
  Droplet,
  Droplets,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Activity,
  Gauge,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { getModels, createModel, updateModel, deleteModel } from '../services/api';
import MOTOR_MODELS from '../config/motorModels';

const Models = ({
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  embedMode = false,
  onSelectModel,
}) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('ALL'); // 'ALL' | 'Single Phase' | 'Three Phase'

  // Top Inline Form State: Closed by default; opens when clicking "Add Model" or "Edit"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingModelNumber, setEditingModelNumber] = useState('');
  const [formData, setFormData] = useState({
    modelNumber: '',
    modelName: '',
    motorType: '',
    minHp: 0.5,
    maxHp: 1.5,
    hpLabel: '0.5 – 1.5 HP',
    phase: 'Single Phase',
    tankConfiguration: 'Two Tanks',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const formSectionRef = useRef(null);

  // Fetch models from backend (falls back to static MOTOR_MODELS if API unavailable)
  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getModels();
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setModels(res.data.data);
      } else {
        setModels(Object.values(MOTOR_MODELS).map((m) => ({ ...m, deviceCount: 0 })));
      }
    } catch (err) {
      console.warn('Could not fetch models from server, loading standard config:', err.message);
      setModels(Object.values(MOTOR_MODELS).map((m) => ({ ...m, deviceCount: 0 })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Open / Reset Top Form for New Model
  const handleOpenAddForm = () => {
    setModalMode('create');
    setEditingModelNumber('');
    setFormData({
      modelNumber: '',
      modelName: '',
      motorType: '',
      minHp: 0.5,
      maxHp: 1.5,
      hpLabel: '0.5 – 1.5 HP',
      phase: 'Single Phase',
      tankConfiguration: 'Two Tanks',
      description: '',
    });
    setFeedback(null);
    setIsFormOpen(true);

    setTimeout(() => {
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Open Top Form for Editing Existing Model
  const handleOpenEditForm = (model) => {
    setModalMode('edit');
    setEditingModelNumber(model.modelNumber);
    setFormData({
      modelNumber: model.modelNumber,
      modelName: model.modelName || '',
      motorType: model.motorType || '',
      minHp: model.minHp !== undefined ? model.minHp : (model.hpRating?.min || 0.5),
      maxHp: model.maxHp !== undefined ? model.maxHp : (model.hpRating?.max || 1.5),
      hpLabel: model.hpLabel || model.hpRating?.label || '0.5 – 1.5 HP',
      phase: model.phase || 'Single Phase',
      tankConfiguration: model.tankConfiguration || (model.showSumpTank ? 'Two Tanks' : 'One Tank'),
      description: model.description || '',
    });
    setFeedback(null);
    setIsFormOpen(true);

    setTimeout(() => {
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleCancelEdit = () => {
    setModalMode('create');
    setEditingModelNumber('');
    setFormData({
      modelNumber: '',
      modelName: '',
      motorType: '',
      minHp: 0.5,
      maxHp: 1.5,
      hpLabel: '0.5 – 1.5 HP',
      phase: 'Single Phase',
      tankConfiguration: 'Two Tanks',
      description: '',
    });
    setFeedback(null);
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.modelNumber || !formData.modelName || !formData.motorType) {
      setFeedback({ type: 'error', text: 'Model Number, Model Name, and Motor Type are required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        ...formData,
        minHp: Number(formData.minHp),
        maxHp: Number(formData.maxHp),
        hpLabel: formData.hpLabel || `${formData.minHp} – ${formData.maxHp} HP`,
      };

      if (modalMode === 'create') {
        const res = await createModel(payload);
        if (res.data?.success) {
          setFeedback({ type: 'success', text: `Model ${payload.modelNumber} created successfully!` });
          fetchModels();
          setTimeout(() => {
            handleCancelEdit();
            setIsFormOpen(false);
          }, 1200);
        } else {
          setFeedback({ type: 'error', text: res.data?.message || 'Failed to create model' });
        }
      } else {
        const res = await updateModel(editingModelNumber, payload);
        if (res.data?.success) {
          setFeedback({ type: 'success', text: `Model ${editingModelNumber} updated successfully!` });
          fetchModels();
          setTimeout(() => {
            handleCancelEdit();
            setIsFormOpen(false);
          }, 1200);
        } else {
          setFeedback({ type: 'error', text: res.data?.message || 'Failed to update model' });
        }
      }
    } catch (err) {
      console.error('Error submitting model form:', err);
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Server error occurred while saving model',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "Use Model" - Navigates to Dashboard with this model active
  const handleUseModel = (model) => {
    try {
      localStorage.setItem('wt_selected_model', model.modelNumber);
    } catch {
      // Ignore localStorage errors
    }
    if (onSelectModel) {
      onSelectModel(model);
    } else if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  // Delete custom model
  const handleDeleteModel = async (modelNumber) => {
    if (!window.confirm(`Are you sure you want to delete model '${modelNumber}'?`)) return;
    try {
      const res = await deleteModel(modelNumber);
      if (res.data?.success) {
        fetchModels();
      } else {
        alert(res.data?.message || 'Failed to delete model');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting model');
    }
  };

  // Filtered models
  const filteredModels = models.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (m.modelNumber || '').toLowerCase().includes(q) ||
      (m.modelName || '').toLowerCase().includes(q) ||
      (m.motorType || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q);

    const matchesPhase =
      phaseFilter === 'ALL' ||
      (m.phase || '').toLowerCase().includes(phaseFilter.toLowerCase());

    return matchesSearch && matchesPhase;
  });

  const pageBody = (
    <div className={`models-page-container ${embedMode ? 'models-embedded' : ''}`}>
      {/* 1. Header Bar with Title and Add Button */}
      <div className="dash-card models-top-header">
        <div className="models-header-left">
          <div className="models-icon-badge">
            <Layers size={22} className="text-blue" />
          </div>
          <div>
            <h2>Motor Models & Architecture</h2>
            <p>Industrial motor category configurations, HP ratings, phase parameters, and tank architectures</p>
          </div>
        </div>

        <div className="models-header-actions">
          <button
            type="button"
            className={`btn-add-model ${isFormOpen ? 'btn-active-close' : ''}`}
            onClick={() => {
              if (isFormOpen) {
                setIsFormOpen(false);
                handleCancelEdit();
              } else {
                handleOpenAddForm();
              }
            }}
            title={isFormOpen ? 'Close Add Model Form' : 'Add Custom Motor Model'}
          >
            {isFormOpen ? (
              <>
                <X size={16} />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Add Model</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. TOP INLINE "ADD / EDIT MODEL" FORM - Shown ONLY when user clicks Add Model or Edit */}
      {isFormOpen && (
        <div className="dash-card models-inline-form-card animate-pop-in" ref={formSectionRef} id="models-top-form">
          <div className="models-form-header">
            <div className="form-header-title-box">
              <div className="form-title-icon-bubble">
                {modalMode === 'edit' ? <Edit3 size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>
                  {modalMode === 'edit' ? (
                    <>
                      Editing Motor Model <span className="editing-id-tag">{editingModelNumber}</span>
                    </>
                  ) : (
                    'Add New Motor Model'
                  )}
                </h3>
                <p>
                  {modalMode === 'edit'
                    ? 'Update horsepower ratings, phase parameters, and tank configurations for this model.'
                    : 'Define a new standardized motor category specification and dashboard architecture.'}
                </p>
              </div>
            </div>

            <div className="form-header-right-actions">
              {modalMode === 'edit' && (
                <button
                  type="button"
                  className="btn-cancel-edit-mode"
                  onClick={handleCancelEdit}
                  title="Cancel editing and switch back to Add New Model"
                >
                  <RotateCcw size={14} />
                  <span>Cancel Edit</span>
                </button>
              )}

              <button
                type="button"
                className="btn-close-form-circle"
                onClick={() => {
                  setIsFormOpen(false);
                  handleCancelEdit();
                }}
                title="Close Form"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="models-inline-form-body">
            {feedback && (
              <div className={`models-form-alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="models-form-grid-3col">
              {/* Column 1: Identification */}
              <div className="model-form-col">
                <div className="col-section-header">
                  <span className="col-step-num">1</span>
                  <h4>Model Identification</h4>
                </div>

                <div className="model-form-group">
                  <label>Model Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. SG-1PS-1.5"
                    value={formData.modelNumber}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value.toUpperCase().trim() })}
                    required
                    className="input-monospace"
                  />
                  <span className="form-hint">Unique standard hardware model code</span>
                </div>

                <div className="model-form-group">
                  <label>Model Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Single Phase Standard"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    required
                  />
                </div>

                <div className="model-form-group">
                  <label>Motor Type / Category *</label>
                  <input
                    type="text"
                    placeholder="e.g. Submersible Pump / Monoblock"
                    value={formData.motorType}
                    onChange={(e) => setFormData({ ...formData, motorType: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Column 2: Electrical & Ratings */}
              <div className="model-form-col">
                <div className="col-section-header">
                  <span className="col-step-num">2</span>
                  <h4>Electrical & Ratings</h4>
                </div>

                <div className="model-form-group">
                  <label>Electrical Phase *</label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  >
                    <option value="Single Phase">Single Phase (1-Phase / 230V)</option>
                    <option value="Three Phase">Three Phase (3-Phase / 415V)</option>
                  </select>
                </div>

                <div className="model-hp-row">
                  <div className="model-form-group">
                    <label>Min HP</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={formData.minHp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          minHp: val,
                          hpLabel: `${val} – ${formData.maxHp} HP`,
                        });
                      }}
                    />
                  </div>

                  <div className="model-form-group">
                    <label>Max HP</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={formData.maxHp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          maxHp: val,
                          hpLabel: `${formData.minHp} – ${val} HP`,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="model-form-group">
                  <label>HP Range Display Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 0.5 – 1.5 HP"
                    value={formData.hpLabel}
                    onChange={(e) => setFormData({ ...formData, hpLabel: e.target.value })}
                  />
                </div>
              </div>

              {/* Column 3: Architecture & Notes */}
              <div className="model-form-col">
                <div className="col-section-header">
                  <span className="col-step-num">3</span>
                  <h4>Tanks & Architecture</h4>
                </div>

                <div className="model-form-group">
                  <label>Tank Configuration</label>
                  <select
                    value={formData.tankConfiguration}
                    onChange={(e) => setFormData({ ...formData, tankConfiguration: e.target.value })}
                  >
                    <option value="One Tank">One Tank (Overhead Tank only)</option>
                    <option value="Two Tanks">Two Tanks (Sump & Overhead Tanks)</option>
                  </select>
                </div>

                <div className="model-form-group">
                  <label>Description & Technical Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Provide operational specifications, contactor ratings, or starter architecture notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="models-inline-form-footer">
              <button
                type="button"
                className="btn-models-cancel"
                onClick={() => {
                  setIsFormOpen(false);
                  handleCancelEdit();
                }}
                disabled={submitting}
              >
                <X size={15} />
                <span>Cancel / Close</span>
              </button>

              <button
                type="button"
                className="btn-models-reset"
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                <RotateCcw size={15} />
                <span>Reset Fields</span>
              </button>

              <button
                type="submit"
                className="btn-models-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="btn-spinner-wrap">
                    <Activity size={16} className="animate-spin" />
                    <span>Saving Model...</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{modalMode === 'edit' ? 'Update Motor Model' : 'Create Motor Model'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Filters & Search Toolbar */}
      <div className="dash-card models-filter-bar">
        <div className="models-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search models by name, model number, or motor type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="models-phase-filters">
          <button
            type="button"
            className={`phase-filter-pill ${phaseFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setPhaseFilter('ALL')}
          >
            All Models ({models.length})
          </button>
          <button
            type="button"
            className={`phase-filter-pill ${phaseFilter === 'Single Phase' ? 'active' : ''}`}
            onClick={() => setPhaseFilter('Single Phase')}
          >
            Single Phase
          </button>
          <button
            type="button"
            className={`phase-filter-pill ${phaseFilter === 'Three Phase' ? 'active' : ''}`}
            onClick={() => setPhaseFilter('Three Phase')}
          >
            Three Phase
          </button>
        </div>
      </div>

      {/* 4. Models Grid Display */}
      {loading ? (
        <div className="dash-card models-loading-state">
          <Activity size={32} className="animate-spin text-blue" />
          <p>Loading motor models & architectures...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="dash-card models-empty-state">
          <Info size={36} className="empty-icon" />
          <h3>No Models Found</h3>
          <p>No motor models match your search query. Use the form above to configure a new category.</p>
        </div>
      ) : (
        <div className="models-cards-grid">
          {filteredModels.map((m) => {
            const is3Phase = (m.phase || '').toLowerCase().includes('three');
            const hasStarDelta = m.specialDisplay?.hasStarDeltaStages || m.modelNumber === 'SG-3PSD-15';
            const showDualTanks = m.showSumpTank || m.tankConfiguration === 'Two Tanks';

            return (
              <div
                key={m.modelNumber}
                className={`model-category-card ${editingModelNumber === m.modelNumber ? 'card-editing-highlight' : ''}`}
              >
                {/* Card Top: Phase Tag & Model Number */}
                <div className="model-card-top-row">
                  <span className={`model-phase-pill ${is3Phase ? 'three-phase' : 'single-phase'}`}>
                    <Zap size={12} />
                    <span>{m.phase || (is3Phase ? 'Three Phase' : 'Single Phase')}</span>
                  </span>
                  <span className="model-number-tag">{m.modelNumber}</span>
                </div>

                {/* Title & Motor Type */}
                <div className="model-card-title-section">
                  <h3 className="model-card-title">{m.modelName}</h3>
                  <span className="model-motor-type-label">{m.motorType || 'Industrial Motor'}</span>
                </div>

                {/* HP Rating Pill */}
                <div className="model-hp-badge">
                  <Gauge size={14} className="text-blue" />
                  <span>
                    Horsepower Rating: <strong>{m.hpLabel || `${m.minHp || 0.5} – ${m.maxHp || 1.5} HP`}</strong>
                  </span>
                </div>

                {/* Description */}
                {m.description && (
                  <p className="model-card-desc">{m.description}</p>
                )}

                {/* Specifications List */}
                <div className="model-specs-box">
                  <div className="model-spec-item">
                    <span className="spec-label">Starter Architecture:</span>
                    <span className="spec-value">{m.starterType || (is3Phase ? 'DOL / Star-Delta' : 'Direct-On-Line')}</span>
                  </div>

                  <div className="model-spec-item">
                    <span className="spec-label">Tank Architecture:</span>
                    <span className="spec-value">
                      {showDualTanks ? (
                        <span className="tank-tag-dual">
                          <Droplets size={13} /> Sump & Overhead (2 Tanks)
                        </span>
                      ) : (
                        <span className="tank-tag-one">
                          <Droplet size={13} /> Overhead Only (1 Tank)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="model-spec-item">
                    <span className="spec-label">Electrical Telemetry:</span>
                    <span className="spec-value">
                      {is3Phase
                        ? 'V1, V2, V3 & I1, I2, I3, Power, PF, Freq'
                        : 'Voltage & Current, Power, PF, Freq'}
                    </span>
                  </div>

                  {hasStarDelta && (
                    <div className="model-spec-item star-delta-highlight">
                      <span className="spec-label">Hardware Stage Engine:</span>
                      <span className="spec-value star-delta-badges">
                        <span className="stage-chip">STAR</span>
                        <span className="stage-arrow">→</span>
                        <span className="stage-chip">TRANSITION</span>
                        <span className="stage-arrow">→</span>
                        <span className="stage-chip">DELTA</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Assigned Devices Indicator */}
                <div className="model-device-status-row">
                  <span className="device-count-text">
                    <Cpu size={14} />
                    <span>Registered Devices: <strong>{m.deviceCount || 0}</strong></span>
                  </span>
                </div>

                {/* Card Action Buttons: Use, Edit, Delete */}
                <div className="model-card-actions">
                  <button
                    type="button"
                    className="btn-use-model"
                    onClick={() => handleUseModel(m)}
                    title={`Open Dashboard for ${m.modelName}`}
                  >
                    <span>Use Model</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-edit-model"
                    onClick={() => handleOpenEditForm(m)}
                    title="Edit Model in Top Form"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  {!m.isBuiltIn && (
                    <button
                      type="button"
                      className="btn-delete-model"
                      onClick={() => handleDeleteModel(m.modelNumber)}
                      title="Delete Custom Model"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedMode) {
    return (
      <div className="models-embedded-view">
        {pageBody}
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar currentPage="models" onNavigate={onNavigate} onLogout={onLogout} currentUser={currentUser} onOpenProfile={onOpenProfile} />

      <main className="main-content">
        <Navbar
          currentPage="models"
          onNavigate={onNavigate}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onRefresh={fetchModels}
        />
        {pageBody}
      </main>
    </div>
  );
};

export default Models;
