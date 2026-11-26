const mongoose = require('mongoose');

const faultLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    modelNumber: {
      type: String,
      default: null,
      index: true,
    },
    deviceName: {
      type: String,
      trim: true,
      default: '',
    },
    faultType: {
      type: String,
      enum: [
        'UNDER_VOLTAGE',
        'OVER_VOLTAGE',
        'OVER_CURRENT',
        'MOTOR_TRIP',
        'PHASE_FAILURE',
        'DRY_RUN',
        'SENSOR_FAILURE',
        'COMMUNICATION_FAILURE',
        'GENERAL_FAULT',
      ],
      default: 'GENERAL_FAULT',
      index: true,
    },
    faultDescription: {
      type: String,
      required: [true, 'Fault description is required'],
      trim: true,
    },
    faultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: 'Sensor value at the time the fault triggered',
    },
    faultStatus: {
      type: String,
      enum: ['Active', 'Resolved', 'ACTIVE', 'RESOLVED'],
      default: 'Active',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    recoveryConfirmCount: {
      type: Number,
      default: 0,
      description: 'Number of consecutive normal packets confirming recovery',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    date: {
      type: String,
      default: '',
    },
    time: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Format date and time before saving if not explicitly set
faultLogSchema.pre('save', function (next) {
  const targetDate = this.timestamp || this.triggeredAt || new Date();
  if (!this.date) {
    this.date = targetDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (!this.time) {
    this.time = targetDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  // Synchronize status fields
  if (this.status && !this.faultStatus) {
    this.faultStatus = this.status === 'ACTIVE' ? 'Active' : 'Resolved';
  } else if (this.faultStatus && !this.status) {
    this.status = this.faultStatus.toUpperCase();
  }
  next();
});

faultLogSchema.index({ timestamp: -1 });
faultLogSchema.index({ deviceId: 1, timestamp: -1 });
faultLogSchema.index({ deviceId: 1, faultType: 1, status: 1 });

module.exports = mongoose.model('FaultLog', faultLogSchema);
