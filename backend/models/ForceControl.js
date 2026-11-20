const mongoose = require('mongoose');

const forceControlSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['FORCE_ON', 'FORCE_OFF'],
      required: true,
      description: 'Force action type executed on the water tank motor',
    },
    motorStatus: {
      type: String,
      enum: ['ON', 'OFF'],
      required: true,
      description: 'Resulting motor state',
    },
    triggeredBy: {
      type: String,
      default: 'dashboard_header',
      description: 'Origin or user executing the force control',
    },
    waterLevelAtTrigger: {
      type: Number,
      default: 0,
      description: 'Tank water level percentage at the moment of trigger',
    },
    note: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

forceControlSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ForceControl', forceControlSchema);
