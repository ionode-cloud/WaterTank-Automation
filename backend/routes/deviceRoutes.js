const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { protect, optionalProtect, adminOnly } = require('../middleware/auth');

// Claim manufactured device by ID (Authenticated user)
router.post('/claim', protect, deviceController.claimDevice);

// User-registered devices view & approval actions for Admin Panel
router.get('/user-registered-devices', protect, adminOnly, deviceController.getUserRegisteredDevices);
router.put('/user-registered-devices/:id/approve', protect, adminOnly, deviceController.approveUserDevice);
router.put('/user-registered-devices/:id/reject', protect, adminOnly, deviceController.rejectUserDevice);

// All unified CRUD & Telemetry ingestion methods on /api/device
router.route('/')
  .get(optionalProtect, deviceController.getDevices)
  .post(optionalProtect, deviceController.saveDeviceData)
  .put(optionalProtect, deviceController.saveDeviceData)
  .delete(optionalProtect, deviceController.deleteDevice);

router.route('/:id')
  .get(optionalProtect, deviceController.getDeviceById)
  .post(optionalProtect, deviceController.saveDeviceData)
  .put(optionalProtect, deviceController.saveDeviceData)
  .delete(optionalProtect, deviceController.deleteDevice);

module.exports = router;
