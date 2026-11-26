const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { optionalProtect } = require('../middleware/auth');

router.get('/overview', optionalProtect, dashboardController.getDashboardOverview);

module.exports = router;
