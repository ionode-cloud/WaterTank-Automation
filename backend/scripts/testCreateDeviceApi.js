const mongoose = require('mongoose');
const { getModelConfig } = require('../config/motorModels');
const Device = require('../models/Device');

async function testCreateDeviceApi() {
  console.log('Testing createDevice payload structure...');

  const selectedModel = 'SG-3PD-7.5';
  const modelCfg = getModelConfig(selectedModel);

  const payload = {
    deviceId: 'WT-SIM-3PD',
    name: 'Main Submersible Pump',
    location: 'Building B - Rooftop',
    modelNumber: selectedModel,
    modelName: modelCfg?.modelName || selectedModel,
    motorType: modelCfg?.motorType || null,
    motorCapacity: modelCfg?.hpRating?.label || null,
    phase: modelCfg?.phase || null,
  };

  console.log('Device payload sent by API:', payload);

  const dev = new Device(payload);
  const validationErr = dev.validateSync();
  if (validationErr) {
    throw new Error('Device validation failed: ' + validationErr.message);
  }

  console.log('✔ Device validated successfully:');
  console.log('  DeviceId:', dev.deviceId);
  console.log('  ModelNumber:', dev.modelNumber);
  console.log('  ModelName:', dev.modelName);
  console.log('  MotorType:', dev.motorType);
  console.log('  Phase:', dev.phase);

  console.log('ALL API PAYLOAD TESTS PASSED!');
}

testCreateDeviceApi().catch((err) => {
  console.error('API test failed:', err);
  process.exit(1);
});
