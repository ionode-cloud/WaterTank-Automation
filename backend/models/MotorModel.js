const mongoose = require('mongoose');

const motorModelSchema = new mongoose.Schema(
  {
    modelNumber: {
      type: String,
      required: [true, 'Model Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    modelName: {
      type: String,
      required: [true, 'Model Name is required'],
      trim: true,
    },
    motorType: {
      type: String,
      required: [true, 'Motor Type is required'],
      trim: true,
    },
    minHp: {
      type: Number,
      required: true,
      default: 0.5,
    },
    maxHp: {
      type: Number,
      required: true,
      default: 1.5,
    },
    hpLabel: {
      type: String,
      default: '0.5 – 1.5 HP',
    },
    phase: {
      type: String,
      enum: ['Single Phase', 'Three Phase'],
      default: 'Single Phase',
    },
    tankConfiguration: {
      type: String,
      enum: ['One Tank', 'Two Tanks'],
      default: 'Two Tanks',
    },
    tankTags: {
      type: [String],
      default: ['Overhead'],
    },
    voltageFields: {
      type: [String],
      default: ['voltage'],
    },
    currentFields: {
      type: [String],
      default: ['current'],
    },
    commonFields: {
      type: [String],
      default: ['power', 'energy', 'frequency', 'powerFactor'],
    },
    hasStarDeltaStages: {
      type: Boolean,
      default: false,
    },
    showSumpTank: {
      type: Boolean,
      default: true,
    },
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

motorModelSchema.index({ phase: 1, active: 1 });

module.exports = mongoose.model('MotorModel', motorModelSchema);
