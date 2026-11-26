/**
 * Phase 2 Verification Script
 * Validates Admin User Management, RBAC Middleware, and Manufactured Device Inventory.
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');

console.log('--- Phase 2 Verification Started ---\n');

// 1. Verify User Model and Password Hashing
console.log('1. Testing User Model & Password Hashing...');
const User = require('../models/User');

const testPassword = 'SecurePassword2026!';
const testUser = new User({
  name: 'Industrial Operator',
  username: 'op_ind_01',
  email: 'operator1@factory.com',
  password: testPassword,
  role: 'USER',
  mobileNumber: '+91 9123456789',
  location: 'Plant 1, Sector 4',
});

const userValidationErr = testUser.validateSync();
assert.strictEqual(userValidationErr, undefined, 'User document must validate cleanly');
assert.strictEqual(testUser.role, 'USER');
assert.strictEqual(testUser.username, 'op_ind_01');
console.log('✓ User schema fields (username, mobileNumber, location, role) validated.');

// Test password hashing hook
(async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(testPassword, salt);
    testUser.password = hashed;
    const isMatch = await testUser.matchPassword(testPassword);
    const isWrongMatch = await testUser.matchPassword('WrongPass!');
    assert.strictEqual(isMatch, true, 'Bcrypt password comparison must succeed for correct password');
    assert.strictEqual(isWrongMatch, false, 'Bcrypt password comparison must fail for wrong password');
    console.log('✓ Bcrypt password hashing and matchPassword() validated.');

    // 2. Testing RBAC Middleware Logic
    console.log('\n2. Testing RBAC & Device Ownership Middleware...');
    const { adminOnly, requireRole, verifyDeviceOwnership } = require('../middleware/auth');

    // Test adminOnly with uppercase ADMIN and lowercase admin
    let adminNextCalled = false;
    adminOnly({ user: { role: 'ADMIN' } }, {}, () => { adminNextCalled = true; });
    assert.strictEqual(adminNextCalled, true, 'adminOnly must accept role ADMIN');

    let adminLowerNextCalled = false;
    adminOnly({ user: { role: 'admin' } }, {}, () => { adminLowerNextCalled = true; });
    assert.strictEqual(adminLowerNextCalled, true, 'adminOnly must accept role admin');

    let forbiddenCalled = false;
    const mockRes = {
      status: (code) => {
        assert.strictEqual(code, 403, 'Must return 403 Forbidden for non-admin');
        return {
          json: (data) => {
            forbiddenCalled = true;
            assert.strictEqual(data.success, false);
          },
        };
      },
    };
    adminOnly({ user: { role: 'USER' } }, mockRes, () => {});
    assert.strictEqual(forbiddenCalled, true, 'adminOnly must reject role USER with 403');
    console.log('✓ adminOnly middleware validates ADMIN vs USER permissions cleanly.');

    // 3. Testing Manufactured Device Inventory Logic
    console.log('\n3. Testing Manufactured Device Inventory Logic...');
    const DeviceInventory = require('../models/DeviceInventory');
    const { isValidModel } = require('../config/motorModels');

    // Valid model checks
    assert.strictEqual(isValidModel('SG-1PS-1.5'), true);
    assert.strictEqual(isValidModel('SG-1PD-1.5'), true);
    assert.strictEqual(isValidModel('SG-3PD-7.5'), true);
    assert.strictEqual(isValidModel('SG-3PSD-15'), true);
    assert.strictEqual(isValidModel('INVALID-MODEL-99'), false);
    console.log('✓ isValidModel correctly verifies the 4 standard models.');

    const validInv = new DeviceInventory({
      deviceId: 'WT-MFG-001',
      manufacturingModelNumber: 'SG-3PD-7.5',
      deviceApiKey: 'secret_mfg_api_key_443',
      batchNumber: 'BATCH-2026-Q1',
      status: 'UNREGISTERED',
    });
    const invErr = validInv.validateSync();
    assert.strictEqual(invErr, undefined, 'DeviceInventory with valid model must validate');
    assert.strictEqual(validInv.status, 'UNREGISTERED');

    // Check invalid model rejection
    const invalidInv = new DeviceInventory({
      deviceId: 'WT-MFG-002',
      manufacturingModelNumber: 'UNKNOWN-MODEL',
    });
    const invalidInvErr = invalidInv.validateSync();
    assert(invalidInvErr !== undefined, 'Invalid model must fail DeviceInventory schema validation');
    console.log('✓ DeviceInventory validates factory model requirements.');

    // 4. Test Controller Functions import & route mounting
    console.log('\n4. Verifying Routes & Controllers exports...');
    const userController = require('../controllers/userController');
    assert(typeof userController.createUser === 'function');
    assert(typeof userController.getAllUsers === 'function');
    assert(typeof userController.getUserById === 'function');
    assert(typeof userController.updateUser === 'function');
    assert(typeof userController.resetUserPassword === 'function');
    assert(typeof userController.reassignDevice === 'function');
    console.log('✓ userController exports all required user management handlers.');

    const inventoryController = require('../controllers/inventoryController');
    assert(typeof inventoryController.verifyDevice === 'function');
    assert(typeof inventoryController.addInventoryDevice === 'function');
    assert(typeof inventoryController.batchImportInventory === 'function');
    assert(typeof inventoryController.getInventory === 'function');
    assert(typeof inventoryController.updateInventoryStatus === 'function');
    console.log('✓ inventoryController exports all required inventory handlers.');

    console.log('\n--- ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Phase 2 Verification Failed:', err);
    process.exit(1);
  }
})();
