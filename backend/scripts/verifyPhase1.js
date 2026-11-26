/**
 * Phase 1 Verification Script
 * Validates model registry and additive database schema extensions.
 */

const assert = require('assert');
const { MOTOR_MODELS, VALID_MODEL_NUMBERS, getModelConfig, isValidModel, getAllModels } = require('../config/motorModels');

console.log('--- Phase 1 Verification Started ---\n');

// 1. Verify Model Registry
console.log('1. Checking Centralized Motor Models Registry...');
assert.strictEqual(VALID_MODEL_NUMBERS.length, 4, 'Must have exactly 4 models');
assert.deepStrictEqual(VALID_MODEL_NUMBERS, ['SG-1PS-1.5', 'SG-1PD-1.5', 'SG-3PD-7.5', 'SG-3PSD-15']);

// Check Model 1
const m1 = getModelConfig('SG-1PS-1.5');
assert(m1 !== null, 'Model 1 must exist');
assert.strictEqual(m1.tanks.sump.supported, false, 'Model 1 must NOT support Sump tank');
assert.strictEqual(m1.tanks.overhead.supported, true, 'Model 1 must support Overhead tank');
assert.strictEqual(m1.electrical.phaseType, 'single');
assert.deepStrictEqual(m1.electrical.voltageFields, ['voltage']);
assert.deepStrictEqual(m1.electrical.currentFields, ['current']);
console.log('✓ Model 1 (SG-1PS-1.5 - Single Phase Submersible) verified.');

// Check Model 2
const m2 = getModelConfig('SG-1PD-1.5');
assert(m2 !== null, 'Model 2 must exist');
assert.strictEqual(m2.tanks.sump.supported, true, 'Model 2 must support Sump tank');
assert.strictEqual(m2.tanks.overhead.supported, true, 'Model 2 must support Overhead tank');
assert.strictEqual(m2.electrical.phaseType, 'single');
console.log('✓ Model 2 (SG-1PD-1.5 - Single Phase DOL) verified.');

// Check Model 3
const m3 = getModelConfig('SG-3PD-7.5');
assert(m3 !== null, 'Model 3 must exist');
assert.strictEqual(m3.tanks.sump.supported, true, 'Model 3 must support Sump tank');
assert.strictEqual(m3.electrical.phaseType, 'three');
assert.deepStrictEqual(m3.electrical.voltageFields, ['vol1', 'vol2', 'vol3']);
assert.deepStrictEqual(m3.electrical.currentFields, ['cu1', 'cu2', 'cu3']);
console.log('✓ Model 3 (SG-3PD-7.5 - 3-Phase DOL) verified.');

// Check Model 4
const m4 = getModelConfig('SG-3PSD-15');
assert(m4 !== null, 'Model 4 must exist');
assert.strictEqual(m4.specialDisplay.hasStarDeltaStages, true, 'Model 4 must support Star/Delta stages');
assert.deepStrictEqual(m4.specialDisplay.starDeltaStages, ['STAR', 'TRANSITION', 'DELTA']);
assert.strictEqual(m4.electrical.phaseType, 'three');
console.log('✓ Model 4 (SG-3PSD-15 - 3-Phase Star-Delta) verified.');

// 2. Verify Mongoose Schemas In-Memory Validation
console.log('\n2. Checking Mongoose Schemas & Backward Compatibility...');

const Device = require('../models/Device');
const DeviceInventory = require('../models/DeviceInventory');
const User = require('../models/User');
const MotorCommand = require('../models/MotorCommand');
const FaultLog = require('../models/FaultLog');
const SensorData = require('../models/SensorData');

// A. Test Legacy Device (no modelNumber, no assignedUserId)
const legacyDev = new Device({
  deviceId: 'WT-LEGACY-001',
  name: 'Old Rooftop Pump',
  location: 'Rooftop',
  tankCapacity: 1000,
});
const legacyErr = legacyDev.validateSync();
assert.strictEqual(legacyErr, undefined, 'Legacy device must validate cleanly without new fields');
assert.strictEqual(legacyDev.modelNumber, null, 'Legacy device modelNumber must default to null');
assert.strictEqual(legacyDev.assignedUserId, null, 'Legacy device assignedUserId must default to null');
assert.strictEqual(legacyDev.operatingMode, 'MANUAL');
console.log('✓ Backward compatibility: Legacy Device documents validate without error.');

// B. Test New Model-Configured Device
const newDev = new Device({
  deviceId: 'WT-3PSD-001',
  name: 'Heavy Industrial Borewell',
  location: 'North Block',
  modelNumber: 'SG-3PSD-15',
  modelName: '3-Phase Star-Delta',
  motorType: '3-Phase Star-Delta',
  motorCapacity: '15 HP',
  phase: 'Three Phase',
  operatingMode: 'MANUAL',
  tanks: {
    sump: { configured: true, capacity: 5000, name: 'Ground Sump', location: 'Ground' },
    overhead: { configured: true, capacity: 3000, name: 'Rooftop Tank', location: 'Tower' },
  },
  starDeltaStage: 'DELTA',
});
const newDevErr = newDev.validateSync();
assert.strictEqual(newDevErr, undefined, 'New model device must validate cleanly');
console.log('✓ New Device document with model & tanks validates cleanly.');

// C. Test DeviceInventory
const invItem = new DeviceInventory({
  deviceId: 'WT-FACTORY-999',
  manufacturingModelNumber: 'SG-3PSD-15',
  deviceApiKey: 'secret-hardware-key-12345',
  status: 'UNREGISTERED',
});
const invErr = invItem.validateSync();
assert.strictEqual(invErr, undefined, 'DeviceInventory item must validate cleanly');
console.log('✓ DeviceInventory model validates cleanly.');

// D. Test User with new RBAC fields
const userItem = new User({
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  password: 'Password123!',
  role: 'USER',
  mobileNumber: '+91 9876543210',
  location: 'Bangalore, India',
});
const userErr = userItem.validateSync();
assert.strictEqual(userErr, undefined, 'User item must validate cleanly');
console.log('✓ User schema with username, mobile, location & USER role validates cleanly.');

// E. Test MotorCommand with commandId and tracking
const cmdItem = new MotorCommand({
  commandId: 'CMD-1700000000-001',
  deviceId: 'WT-3PSD-001',
  command: 'FORCE_ON',
  status: 'PENDING',
});
const cmdErr = cmdItem.validateSync();
assert.strictEqual(cmdErr, undefined, 'MotorCommand with commandId must validate cleanly');
console.log('✓ MotorCommand schema with commandId and tracking validates cleanly.');

// F. Test FaultLog with deduplication fields
const faultItem = new FaultLog({
  deviceId: 'WT-3PSD-001',
  faultType: 'OVER_CURRENT',
  faultDescription: 'Current exceeded 25A on Phase 2',
  faultValue: { cu2: 26.4 },
  status: 'ACTIVE',
});
const faultErr = faultItem.validateSync();
assert.strictEqual(faultErr, undefined, 'FaultLog item must validate cleanly');
console.log('✓ FaultLog schema with deduplication fields validates cleanly.');

// G. Test SensorData with optional 3-phase and starDeltaStage
const sensorItem = new SensorData({
  deviceId: 'WT-3PSD-001',
  modelNumber: 'SG-3PSD-15',
  vol1: 415,
  vol2: 416,
  vol3: 414,
  cu1: 18.2,
  cu2: 18.4,
  cu3: 18.1,
  power: 12500,
  powerFactor: 0.94,
  frequency: 50.0,
  starDeltaStage: 'DELTA',
  waterLevel: 80,
  motorStatus: 'ON',
});
const sensorErr = sensorItem.validateSync();
assert.strictEqual(sensorErr, undefined, 'SensorData with 3-phase & star-delta stage validates cleanly');
console.log('✓ SensorData schema with 3-phase and starDeltaStage validates cleanly.');

console.log('\n--- ALL PHASE 1 VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
process.exit(0);
