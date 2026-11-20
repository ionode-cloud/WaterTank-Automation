const mongoose = require('mongoose');

const motorCommandSchema = new mongoose.Schema(
  {
    command: {
      type: String,
      enum: ['ON', 'OFF'],
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    source: {
      type: String,
      default: 'dashboard',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

motorCommandSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('MotorCommand', motorCommandSchema);
