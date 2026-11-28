const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'WT-DEV-001',
      description: 'Associated hardware Device ID',
    },
    modelNumber: {
      type: String,
      default: null,
      description: 'Associated motor model number if known',
    },
    // Single-phase electrical (optional)
    voltage: {
      type: Number,
      min: 0,
      description: 'Line Voltage in Volts (V)',
    },
    current: {
      type: Number,
      min: 0,
      description: 'Load Current in Amperes (A)',
    },
    // Three-phase electrical (optional)
    vol1: {
      type: Number,
      min: 0,
      description: 'Phase 1 Voltage (V)',
    },
    vol2: {
      type: Number,
      min: 0,
      description: 'Phase 2 Voltage (V)',
    },
    vol3: {
      type: Number,
      min: 0,
      description: 'Phase 3 Voltage (V)',
    },
    cu1: {
      type: Number,
      min: 0,
      description: 'Phase 1 Current (A)',
    },
    cu2: {
      type: Number,
      min: 0,
      description: 'Phase 2 Current (A)',
    },
    cu3: {
      type: Number,
      min: 0,
      description: 'Phase 3 Current (A)',
    },
    // Power & Electrical Parameters
    power: {
      type: Number,
      min: 0,
      description: 'Active Power in Watts (W)',
    },
    powerFactor: {
      type: Number,
      min: 0,
      max: 1.0,
      description: 'Power Factor (PF)',
    },
    frequency: {
      type: Number,
      min: 0,
      description: 'Frequency in Hertz (Hz)',
    },
    // Star-Delta Stage (Model 4: SG-3PSD-15 only)
    starDeltaStage: {
      type: String,
      enum: ['STAR', 'TRANSITION', 'DELTA', null],
      default: null,
      description: 'Hardware reported star-delta transition stage',
    },
    // Water level status ('Low', 'Medium', 'High')
    waterLevelStatus: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'LOW', 'MEDIUM', 'HIGH', null],
      default: null,
    },
    waterLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Sump & Overhead Tanks
    sumpTank: {
      capacity: { type: Number, default: null },
      waterLevel: { type: Number, default: null },
      waterLevelStatus: { type: String, default: null },
      currentLiters: { type: Number, default: null },
    },
    overheadTank: {
      capacity: { type: Number, default: null },
      waterLevel: { type: Number, default: null },
      waterLevelStatus: { type: String, default: null },
      currentLiters: { type: Number, default: null },
    },
    // Tank & Water metrics (backward compatible)
    tankCapacity: {
      type: Number,
      min: 0,
      description: 'Tank capacity in Liters (L)',
    },
    waterConsumption: {
      type: Number,
      min: 0,
      description: 'Water consumption / volume in Liters (L)',
    },
    motorStatus: {
      type: String,
      enum: ['ON', 'OFF'],
      required: true,
      default: 'OFF',
    },
    forceOn: {
      type: Boolean,
      default: false,
      description: 'Force ON state at time of telemetry record',
    },
    forceOff: {
      type: Boolean,
      default: false,
      description: 'Force OFF state at time of telemetry record',
    },
    deviceStatus: {
      type: String,
      enum: ['Active', 'Fault', null],
      default: 'Active',
    },
    energyConsumption: {
      type: Number,
      min: 0,
      default: 0,
      description: 'Cumulative energy consumption in kilowatt-hours (kWh)',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
