const express = require('express');
const router = express.Router();
const motorController = require('../controllers/motorController');

router.get('/status', motorController.getMotorStatus);
router.get('/history', motorController.getMotorHistory);
router.get('/consumption', motorController.getMotorConsumption);
router.post('/force-on', motorController.forceMotorOn);
router.post('/force-off', motorController.forceMotorOff);

module.exports = router;
