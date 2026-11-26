const express = require('express');
const router = express.Router();
const motorController = require('../controllers/motorController');
const { optionalProtect } = require('../middleware/auth');

router.get('/status', optionalProtect, motorController.getMotorStatus);
router.get('/history', optionalProtect, motorController.getMotorHistory);
router.get('/consumption', optionalProtect, motorController.getMotorConsumption);
router.post('/force-on', optionalProtect, motorController.forceMotorOn);
router.post('/force-off', optionalProtect, motorController.forceMotorOff);

module.exports = router;
