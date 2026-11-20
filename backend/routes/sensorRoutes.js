const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.get('/latest', sensorController.getLatestSensor);
router.get('/history', sensorController.getSensorHistory);

module.exports = router;
