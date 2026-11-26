/**
 * Authoritative Centralized Motor Models Registry (Frontend)
 * Matches backend/config/motorModels.js exactly.
 */

export const MOTOR_MODELS = {
  'SG-1PS-1.5': {
    modelNumber: 'SG-1PS-1.5',
    modelName: 'Single Phase Submersible',
    motorType: 'Single Phase Submersible',
    hpRating: { min: 0.5, max: 1.5, label: '0.5 – 1.5 HP' },
    phase: 'Single Phase',
    tankConfiguration: 'One Tank',
    tankTags: ['Overhead'],
    tanks: {
      sump: { supported: false, required: false },
      overhead: { supported: true, required: true, defaultName: 'Overhead Tank' },
    },
    electrical: {
      phaseType: 'single',
      voltageFields: ['voltage'],
      currentFields: ['current'],
      commonFields: ['power', 'energy', 'frequency', 'powerFactor'],
    },
    specialDisplay: {
      hasStarDeltaStages: false,
      showSumpTank: false,
      voltageLabel: 'Voltage',
      currentLabel: 'Current',
    },
  },

  'SG-1PD-1.5': {
    modelNumber: 'SG-1PD-1.5',
    modelName: 'Single Phase DOL',
    motorType: 'Single Phase DOL',
    hpRating: { min: 0.5, max: 1.5, label: '0.5 – 1.5 HP' },
    phase: 'Single Phase',
    tankConfiguration: 'Two Tanks',
    tankTags: ['Sump', 'Overhead'],
    tanks: {
      sump: { supported: true, required: false, defaultName: 'Sump Tank' },
      overhead: { supported: true, required: true, defaultName: 'Overhead Tank' },
    },
    electrical: {
      phaseType: 'single',
      voltageFields: ['voltage'],
      currentFields: ['current'],
      commonFields: ['power', 'energy', 'frequency', 'powerFactor'],
    },
    specialDisplay: {
      hasStarDeltaStages: false,
      showSumpTank: true,
      voltageLabel: 'Voltage',
      currentLabel: 'Current',
    },
  },

  'SG-3PD-7.5': {
    modelNumber: 'SG-3PD-7.5',
    modelName: '3-Phase DOL',
    motorType: '3-Phase DOL',
    hpRating: { min: 1.0, max: 7.5, label: '1.0 – 7.5 HP' },
    phase: 'Three Phase',
    tankConfiguration: 'Two Tanks',
    tankTags: ['Sump', 'Overhead'],
    tanks: {
      sump: { supported: true, required: false, defaultName: 'Sump Tank' },
      overhead: { supported: true, required: true, defaultName: 'Overhead Tank' },
    },
    electrical: {
      phaseType: 'three',
      voltageFields: ['vol1', 'vol2', 'vol3'],
      currentFields: ['cu1', 'cu2', 'cu3'],
      commonFields: ['power', 'energy', 'frequency', 'powerFactor'],
    },
    specialDisplay: {
      hasStarDeltaStages: false,
      showSumpTank: true,
      voltageLabels: ['Voltage 1 (V1)', 'Voltage 2 (V2)', 'Voltage 3 (V3)'],
      currentLabels: ['Current 1 (I1)', 'Current 2 (I2)', 'Current 3 (I3)'],
    },
  },

  'SG-3PSD-15': {
    modelNumber: 'SG-3PSD-15',
    modelName: '3-Phase Star-Delta',
    motorType: '3-Phase Star-Delta',
    hpRating: { min: 10.0, max: 15.0, label: '10 – 15 HP' },
    phase: 'Three Phase',
    tankConfiguration: 'Two Tanks',
    tankTags: ['Sump', 'Overhead'],
    tanks: {
      sump: { supported: true, required: false, defaultName: 'Sump Tank' },
      overhead: { supported: true, required: true, defaultName: 'Overhead Tank' },
    },
    electrical: {
      phaseType: 'three',
      voltageFields: ['vol1', 'vol2', 'vol3'],
      currentFields: ['cu1', 'cu2', 'cu3'],
      commonFields: ['power', 'energy', 'frequency', 'powerFactor'],
    },
    specialDisplay: {
      hasStarDeltaStages: true,
      starDeltaStages: ['STAR', 'TRANSITION', 'DELTA'],
      showSumpTank: true,
      voltageLabels: ['Voltage 1 (V1)', 'Voltage 2 (V2)', 'Voltage 3 (V3)'],
      currentLabels: ['Current 1 (I1)', 'Current 2 (I2)', 'Current 3 (I3)'],
    },
  },
};

export const VALID_MODEL_NUMBERS = Object.keys(MOTOR_MODELS);

export const getModelConfig = (modelNumber) => {
  if (!modelNumber) return null;
  return MOTOR_MODELS[modelNumber] || null;
};

export const isValidModel = (modelNumber) => {
  return Boolean(modelNumber && MOTOR_MODELS[modelNumber]);
};

export const getAllModels = () => {
  return Object.values(MOTOR_MODELS);
};

export default MOTOR_MODELS;
