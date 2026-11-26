const mongoose = require('mongoose');
const { getAllModels, getModelConfig, isValidModel, VALID_MODEL_NUMBERS } = require('../config/motorModels');
const MotorModel = require('../models/MotorModel');

async function testModels() {
  console.log('Testing centralized Motor Models configuration...');
  
  // 1. Verify 4 standard models in config
  console.log('Valid model numbers:', VALID_MODEL_NUMBERS);
  if (VALID_MODEL_NUMBERS.length !== 4) {
    throw new Error(`Expected 4 standard models, found: ${VALID_MODEL_NUMBERS.length}`);
  }

  const m1 = getModelConfig('SG-1PS-1.5');
  if (!m1 || m1.specialDisplay.showSumpTank !== false || m1.tankConfiguration !== 'One Tank') {
    throw new Error('Model 1 configuration validation failed');
  }
  console.log('✔ Model 1 (SG-1PS-1.5): Overhead only, no sump tank');

  const m2 = getModelConfig('SG-1PD-1.5');
  if (!m2 || m2.specialDisplay.showSumpTank !== true || m2.electrical.phaseType !== 'single') {
    throw new Error('Model 2 configuration validation failed');
  }
  console.log('✔ Model 2 (SG-1PD-1.5): Sump + Overhead, Single phase');

  const m3 = getModelConfig('SG-3PD-7.5');
  if (!m3 || m3.electrical.phaseType !== 'three' || m3.electrical.voltageFields.length !== 3) {
    throw new Error('Model 3 configuration validation failed');
  }
  console.log('✔ Model 3 (SG-3PD-7.5): 3-Phase DOL with V1-V3, I1-I3');

  const m4 = getModelConfig('SG-3PSD-15');
  if (!m4 || !m4.specialDisplay.hasStarDeltaStages || !m4.specialDisplay.starDeltaStages.includes('STAR')) {
    throw new Error('Model 4 configuration validation failed');
  }
  console.log('✔ Model 4 (SG-3PSD-15): 3-Phase Star-Delta with STAR/TRANSITION/DELTA stages');

  console.log('ALL MOTOR MODELS VERIFIED SUCCESSFULLY!');
}

testModels().catch((err) => {
  console.error('Model verification failed:', err);
  process.exit(1);
});
