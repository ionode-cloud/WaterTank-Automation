const mongoose = require('mongoose');

const motorHistorySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'WT-DEV-001',
      index: true,
    },
    motorStatus: {
      type: String,
      enum: ['ON', 'OFF'],
      required: true,
    },
    eventType: {
      type: String,
      default: 'FORCE_ON',
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

motorHistorySchema.index({ startTime: -1 });

module.exports = mongoose.model('MotorHistory', motorHistorySchema);
