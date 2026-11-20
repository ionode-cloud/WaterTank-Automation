const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'WT-DEV-001',
      index: true,
      description: 'Associated hardware Device ID',
    },
    voltage: {
      type: Number,
      required: true,
      min: 0,
      description: 'Line Voltage in Volts (V)',
    },
    current: {
      type: Number,
      required: true,
      min: 0,
      description: 'Load Current in Amperes (A)',
    },
    power: {
      type: Number,
      required: true,
      min: 0,
      description: 'Active Power in Watts (W)',
    },
    powerFactor: {
      type: Number,
      required: true,
      min: 0,
      max: 1.0,
      default: 0.92,
      description: 'Power Factor (PF)',
    },
    tankCapacity: {
      type: Number,
      default: 1000,
      min: 0,
      description: 'Tank capacity in Liters (L)',
    },
    waterConsumption: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Water consumption / volume in Liters (L)',
    },
    motorStatus: {
      type: String,
      enum: ['ON', 'OFF'],
      required: true,
      default: 'OFF',
    },
    energyConsumption: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      description: 'Cumulative energy consumption in kilowatt-hours (kWh)',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
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
