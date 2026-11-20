const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// All unified CRUD & Telemetry ingestion methods on /api/device
router.route('/')
  .get(deviceController.getDevices)
  .post(deviceController.saveDeviceData)
  .put(deviceController.saveDeviceData)
  .delete(deviceController.deleteDevice);

router.route('/:id')
  .get(deviceController.getDeviceById)
  .post(deviceController.saveDeviceData)
  .put(deviceController.saveDeviceData)
  .delete(deviceController.deleteDevice);

module.exports = router;
