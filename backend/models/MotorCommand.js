const mongoose = require('mongoose');

const motorCommandSchema = new mongoose.Schema(
  {
    commandId: {
      type: String,
      unique: true,
      sparse: true,
      description: 'Unique tracking identifier for hardware correlation',
    },
    deviceId: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'WT-DEV-001',
      index: true,
      description: 'Target hardware Device ID',
    },
    command: {
      type: String,
      enum: ['ON', 'OFF', 'FORCE_ON', 'FORCE_OFF', 'SWITCH_MODE'],
      required: true,
    },
    targetMode: {
      type: String,
      enum: ['AUTO', 'MANUAL', null],
      default: null,
      description: 'Target operating mode if SWITCH_MODE was issued',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      description: 'User who initiated the command',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'success',
        'failed',
        'PENDING',
        'ACKNOWLEDGED',
        'FAILED_NO_ACK',
        'REJECTED_AUTO_MODE',
      ],
      default: 'pending',
    },
    source: {
      type: String,
      default: 'dashboard',
    },
    failureReason: {
      type: String,
      default: null,
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
motorCommandSchema.index({ deviceId: 1, requestedAt: -1 });

module.exports = mongoose.model('MotorCommand', motorCommandSchema);
