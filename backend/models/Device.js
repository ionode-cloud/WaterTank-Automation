const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      description: 'Unique hardware identifier (e.g., WT-001, ESP32-PUMP-01)',
    },
    name: {
      type: String,
      required: [true, 'Device Name is required'],
      trim: true,
      description: 'User-friendly device title (e.g., Main Rooftop Pump)',
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      description: 'Physical installation location (e.g., Rooftop, Basement)',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'ACTIVE', 'INACTIVE'],
      default: 'ONLINE',
    },
    tankCapacity: {
      type: Number,
      min: 0,
      description: 'Nominal tank volume in Liters',
    },
    description: {
      type: String,
      trim: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

deviceSchema.index({ deviceId: 1 }, { unique: true });
deviceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Device', deviceSchema);
