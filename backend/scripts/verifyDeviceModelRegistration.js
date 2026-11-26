const mongoose = require('mongoose');
const { getModelConfig } = require('../config/motorModels');
const Device = require('../models/Device');

async function testDeviceModelRegistration() {
  console.log('Testing Device Model registration and tank configuration...');

  // 1. Test Model 1: SG-1PS-1.5 (Overhead Only)
  const m1 = getModelConfig('SG-1PS-1.5');
  const d1 = new Device({
    deviceId: 'TEST-DEV-M1',
    name: 'Submersible Pump Tower A',
    location: 'Rooftop Tower A',
    modelNumber: 'SG-1PS-1.5',
    modelName: m1.modelName,
    motorType: m1.motorType,
    motorCapacity: m1.hpRating.label,
    phase: m1.phase,
    tankCapacity: 1500,
    tanks: {
      overhead: { configured: true, capacity: 1500, name: 'Overhead Tank' },
      sump: { configured: false, capacity: null, name: 'Sump Tank' },
    },
  });

  const err1 = d1.validateSync();
  if (err1) throw err1;
  console.log('✔ Model 1 (SG-1PS-1.5) Device validated: Overhead configured, Sump disabled');

  // 2. Test Model 3: SG-3PD-7.5 (3-Phase DOL with Dual Tanks)
  const m3 = getModelConfig('SG-3PD-7.5');
  const d3 = new Device({
    deviceId: 'TEST-DEV-M3',
    name: '3-Phase Industrial Pump',
    location: 'Basement & Rooftop',
    modelNumber: 'SG-3PD-7.5',
    modelName: m3.modelName,
    motorType: m3.motorType,
    motorCapacity: m3.hpRating.label,
    phase: m3.phase,
    tankCapacity: 5000,
    tanks: {
      overhead: { configured: true, capacity: 3000, name: 'Overhead Tank' },
      sump: { configured: true, capacity: 5000, name: 'Sump Tank' },
    },
  });

  const err3 = d3.validateSync();
  if (err3) throw err3;
  console.log('✔ Model 3 (SG-3PD-7.5) Device validated: 3-Phase DOL, Dual Tanks configured');

  // 3. Test Model 4: SG-3PSD-15 (Star-Delta with stages)
  const m4 = getModelConfig('SG-3PSD-15');
  const d4 = new Device({
    deviceId: 'TEST-DEV-M4',
    name: 'Heavy Duty Star-Delta Pump',
    location: 'Industrial Plant',
    modelNumber: 'SG-3PSD-15',
    modelName: m4.modelName,
    motorType: m4.motorType,
    motorCapacity: m4.hpRating.label,
    phase: m4.phase,
    starDeltaStage: 'DELTA',
    tankCapacity: 10000,
    tanks: {
      overhead: { configured: true, capacity: 5000, name: 'Overhead Tank' },
      sump: { configured: true, capacity: 10000, name: 'Sump Tank' },
    },
  });

  const err4 = d4.validateSync();
  if (err4) throw err4;
  console.log('✔ Model 4 (SG-3PSD-15) Device validated: Star-Delta stage supported');

  console.log('ALL DEVICE MODEL REGISTRATION TESTS PASSED!');
}

testDeviceModelRegistration().catch((err) => {
  console.error('Device model registration test failed:', err);
  process.exit(1);
});
