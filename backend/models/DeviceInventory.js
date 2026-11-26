const mongoose = require('mongoose');

const deviceInventorySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      description: 'Manufactured hardware identifier',
    },
    manufacturingModelNumber: {
      type: String,
      required: [true, 'Manufacturing Model Number is required'],
      enum: ['SG-1PS-1.5', 'SG-1PD-1.5', 'SG-3PD-7.5', 'SG-3PSD-15', 'LEGACY'],
      description: 'Assigned factory model identifier',
    },
    deviceApiKey: {
      type: String,
      select: false,
      description: 'Hardware authentication secret key, hidden by default',
    },
    manufacturingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['UNREGISTERED', 'REGISTERED', 'DISABLED'],
      default: 'UNREGISTERED',
      index: true,
    },
    registeredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    registeredAt: {
      type: Date,
      default: null,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

deviceInventorySchema.index({ manufacturingModelNumber: 1, status: 1 });

module.exports = mongoose.model('DeviceInventory', deviceInventorySchema);
