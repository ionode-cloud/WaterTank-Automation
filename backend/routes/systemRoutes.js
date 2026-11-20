const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const iotService = require('../services/iotService');

router.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const runtimeState = iotService.getRuntimeState();

  return res.status(200).json({
    status: 'UP',
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    simulationMode: process.env.SIMULATION_MODE === 'true',
    isHardwareConnected: runtimeState.isHardwareConnected,
    activeMode: runtimeState.source,
  });
});

module.exports = router;
