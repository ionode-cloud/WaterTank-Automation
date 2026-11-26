const express = require('express');
const router = express.Router();
const faultController = require('../controllers/faultController');
const { optionalProtect } = require('../middleware/auth');

router.route('/')
  .get(optionalProtect, faultController.getFaultLogs)
  .post(faultController.createFaultLog);

router.route('/:id/resolve')
  .put(optionalProtect, faultController.resolveFaultLog);

module.exports = router;
