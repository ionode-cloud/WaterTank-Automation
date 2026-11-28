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
      enum: ['Active', 'Fault', 'ONLINE', 'OFFLINE', 'ACTIVE', 'INACTIVE'],
      default: 'Active',
    },
    deviceStatus: {
      type: String,
      enum: ['Active', 'Fault'],
      default: 'Active',
    },
    faultDescription: {
      type: String,
      default: null,
    },
    lastAck: {
      type: Date,
      default: Date.now,
    },
    // Standard Model Association (null for legacy unassigned devices)
    modelNumber: {
      type: String,
      enum: ['SG-1PS-1.5', 'SG-1PD-1.5', 'SG-3PD-7.5', 'SG-3PSD-15', null],
      default: null,
      index: true,
    },
    modelName: {
      type: String,
      default: null,
    },
    motorType: {
      type: String,
      default: null,
    },
    motorCapacity: {
      type: String,
      default: null,
    },
    phase: {
      type: String,
      enum: ['Single Phase', 'Three Phase', null],
      default: null,
    },
    // Motor control mode: AUTO (manual buttons disabled) vs MANUAL
    operatingMode: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      default: 'MANUAL',
    },
    // Motor operational state & Force Override Controls
    motorStatus: {
      type: String,
      enum: ['ON', 'OFF'],
      default: 'OFF',
      index: true,
      description: 'Current operational state of the motor: ON or OFF',
    },
    forceOn: {
      type: Boolean,
      default: false,
      description: 'Force ON manual override flag. When true, motorStatus is forced to ON.',
    },
    forceOff: {
      type: Boolean,
      default: false,
      description: 'Force OFF manual override flag. When true, motorStatus is forced to OFF.',
    },
    // Multi-tenant user ownership
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Device Registration & Admin Approval Workflow
    registrationSource: {
      type: String,
      enum: ['ADMIN_PROVISIONED', 'USER_REGISTERED'],
      default: 'ADMIN_PROVISIONED',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    // Model-Specific Independent Tank Configuration
    tanks: {
      sump: {
        configured: { type: Boolean, default: false },
        capacity: { type: Number, default: null },
        name: { type: String, default: 'Sump Tank' },
        location: { type: String, default: 'Ground' },
      },
      overhead: {
        configured: { type: Boolean, default: false },
        capacity: { type: Number, default: null },
        name: { type: String, default: 'Overhead Tank' },
        location: { type: String, default: 'Rooftop' },
      },
    },
    // Hardware-reported Star/Delta stage (for Model 4: SG-3PSD-15)
    starDeltaStage: {
      type: String,
      enum: ['STAR', 'TRANSITION', 'DELTA', null],
      default: null,
    },
    // Dedicated heartbeat tracking
    lastHeartbeat: {
      type: Date,
      default: null,
    },
    latencyMs: {
      type: Number,
      default: null,
    },
    // Legacy tankCapacity field maintained for backward compatibility
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

deviceSchema.index({ createdAt: -1 });
deviceSchema.index({ assignedUserId: 1, modelNumber: 1 });

/**
 * Enforce Force ON / Force OFF motor state transition logic:
 * - If forceOn is true: motorStatus becomes 'ON' (if it was OFF, it also turns ON) and forceOff becomes false.
 * - If forceOff is true: motorStatus becomes 'OFF' (if it was ON, it turns OFF, or if already OFF, stays OFF) and forceOn becomes false.
 */
deviceSchema.pre('save', function (next) {
  if (this.forceOn === true || String(this.forceOn).toLowerCase() === 'true') {
    this.forceOn = true;
    this.forceOff = false;
    this.motorStatus = 'ON';
  } else if (this.forceOff === true || String(this.forceOff).toLowerCase() === 'true') {
    this.forceOff = true;
    this.forceOn = false;
    this.motorStatus = 'OFF';
  }
  next();
});

deviceSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const setObj = update.$set || update;
  if (setObj.forceOn === true || String(setObj.forceOn).toLowerCase() === 'true') {
    setObj.forceOn = true;
    setObj.forceOff = false;
    setObj.motorStatus = 'ON';
  } else if (setObj.forceOff === true || String(setObj.forceOff).toLowerCase() === 'true') {
    setObj.forceOff = true;
    setObj.forceOn = false;
    setObj.motorStatus = 'OFF';
  }
  next();
});

module.exports = mongoose.model('Device', deviceSchema);
