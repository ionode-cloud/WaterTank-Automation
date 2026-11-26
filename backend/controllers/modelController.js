const MotorModel = require('../models/MotorModel');
const Device = require('../models/Device');
const { MOTOR_MODELS } = require('../config/motorModels');

/**
 * Ensure the 4 authoritative standard models are present in MongoDB
 */
const seedStandardModelsIfEmpty = async () => {
  try {
    for (const [key, cfg] of Object.entries(MOTOR_MODELS)) {
      const exists = await MotorModel.findOne({ modelNumber: key });
      if (!exists) {
        await MotorModel.create({
          modelNumber: cfg.modelNumber,
          modelName: cfg.modelName,
          motorType: cfg.motorType,
          minHp: cfg.hpRating.min,
          maxHp: cfg.hpRating.max,
          hpLabel: cfg.hpRating.label,
          phase: cfg.phase,
          tankConfiguration: cfg.tankConfiguration,
          tankTags: cfg.tankTags,
          voltageFields: cfg.electrical.voltageFields,
          currentFields: cfg.electrical.currentFields,
          commonFields: cfg.electrical.commonFields,
          hasStarDeltaStages: cfg.specialDisplay.hasStarDeltaStages,
          showSumpTank: cfg.specialDisplay.showSumpTank,
          isBuiltIn: true,
          description: `${cfg.modelName} with ${cfg.hpRating.label} capacity and ${cfg.tankConfiguration} monitoring`,
          active: true,
        });
        console.log(`[Seed] Initialized standard model in DB: ${key}`);
      }
    }
  } catch (err) {
    console.error('[Seed Models Error]', err.message);
  }
};

/**
 * @desc    Get all motor models (with connected device counts)
 * @route   GET /api/models
 * @access  Public / Authenticated
 */
exports.getAllModels = async (req, res) => {
  try {
    await seedStandardModelsIfEmpty();

    const models = await MotorModel.find({ active: true }).sort({ isBuiltIn: -1, createdAt: 1 });

    // Fetch device counts per model
    const counts = await Device.aggregate([
      { $match: { modelNumber: { $ne: null } } },
      { $group: { _id: '$modelNumber', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const modelList = models.map((m) => {
      const obj = m.toObject();
      return {
        ...obj,
        deviceCount: countMap[m.modelNumber] || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: modelList.length,
      data: modelList,
    });
  } catch (err) {
    console.error('[Get All Models Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve motor models',
      error: err.message,
    });
  }
};

/**
 * @desc    Get single model by model number
 * @route   GET /api/models/:modelNumber
 * @access  Public / Authenticated
 */
exports.getModelByNumber = async (req, res) => {
  try {
    const { modelNumber } = req.params;
    const cleanNum = String(modelNumber).toUpperCase().trim();

    await seedStandardModelsIfEmpty();

    const model = await MotorModel.findOne({ modelNumber: cleanNum });
    if (!model) {
      return res.status(404).json({
        success: false,
        message: `Model '${cleanNum}' not found`,
      });
    }

    const deviceCount = await Device.countDocuments({ modelNumber: cleanNum });

    return res.status(200).json({
      success: true,
      data: {
        ...model.toObject(),
        deviceCount,
      },
    });
  } catch (err) {
    console.error('[Get Model By Number Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve model',
      error: err.message,
    });
  }
};

/**
 * @desc    Create a new motor model
 * @route   POST /api/models
 * @access  Private
 */
exports.createModel = async (req, res) => {
  try {
    const {
      modelNumber,
      modelName,
      motorType,
      minHp = 0.5,
      maxHp = 1.5,
      hpLabel,
      phase = 'Single Phase',
      tankConfiguration = 'Two Tanks',
      description = '',
    } = req.body;

    if (!modelNumber || !modelName || !motorType) {
      return res.status(400).json({
        success: false,
        message: 'Model Number, Model Name, and Motor Type are required',
      });
    }

    const cleanNum = modelNumber.toUpperCase().trim();

    const exists = await MotorModel.findOne({ modelNumber: cleanNum });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `A model with number '${cleanNum}' already exists`,
      });
    }

    const isThreePhase = String(phase).toLowerCase().includes('three');
    const isOneTank = String(tankConfiguration).toLowerCase().includes('one');

    const created = await MotorModel.create({
      modelNumber: cleanNum,
      modelName: modelName.trim(),
      motorType: motorType.trim(),
      minHp: Number(minHp),
      maxHp: Number(maxHp),
      hpLabel: hpLabel || `${minHp} – ${maxHp} HP`,
      phase: isThreePhase ? 'Three Phase' : 'Single Phase',
      tankConfiguration: isOneTank ? 'One Tank' : 'Two Tanks',
      tankTags: isOneTank ? ['Overhead'] : ['Sump', 'Overhead'],
      voltageFields: isThreePhase ? ['vol1', 'vol2', 'vol3'] : ['voltage'],
      currentFields: isThreePhase ? ['cu1', 'cu2', 'cu3'] : ['current'],
      commonFields: ['power', 'energy', 'frequency', 'powerFactor'],
      hasStarDeltaStages: cleanNum.includes('SD') || motorType.toLowerCase().includes('star-delta'),
      showSumpTank: !isOneTank,
      isBuiltIn: false,
      description: description.trim(),
      active: true,
    });

    return res.status(201).json({
      success: true,
      message: `Model '${cleanNum}' created successfully`,
      data: created,
    });
  } catch (err) {
    console.error('[Create Model Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create motor model',
      error: err.message,
    });
  }
};

/**
 * @desc    Update an existing motor model
 * @route   PUT /api/models/:modelNumber
 * @access  Private
 */
exports.updateModel = async (req, res) => {
  try {
    const { modelNumber } = req.params;
    const cleanNum = String(modelNumber).toUpperCase().trim();
    const { modelName, motorType, minHp, maxHp, hpLabel, phase, tankConfiguration, description } = req.body;

    const model = await MotorModel.findOne({ modelNumber: cleanNum });
    if (!model) {
      return res.status(404).json({
        success: false,
        message: `Model '${cleanNum}' not found`,
      });
    }

    if (modelName) model.modelName = modelName.trim();
    if (motorType) model.motorType = motorType.trim();
    if (minHp !== undefined) model.minHp = Number(minHp);
    if (maxHp !== undefined) model.maxHp = Number(maxHp);
    if (hpLabel) {
      model.hpLabel = hpLabel;
    } else if (minHp !== undefined || maxHp !== undefined) {
      model.hpLabel = `${model.minHp} – ${model.maxHp} HP`;
    }
    if (phase) {
      model.phase = String(phase).toLowerCase().includes('three') ? 'Three Phase' : 'Single Phase';
      model.voltageFields = model.phase === 'Three Phase' ? ['vol1', 'vol2', 'vol3'] : ['voltage'];
      model.currentFields = model.phase === 'Three Phase' ? ['cu1', 'cu2', 'cu3'] : ['current'];
    }
    if (tankConfiguration) {
      const isOneTank = String(tankConfiguration).toLowerCase().includes('one');
      model.tankConfiguration = isOneTank ? 'One Tank' : 'Two Tanks';
      model.tankTags = isOneTank ? ['Overhead'] : ['Sump', 'Overhead'];
      model.showSumpTank = !isOneTank;
    }
    if (description !== undefined) model.description = description.trim();

    await model.save();

    return res.status(200).json({
      success: true,
      message: `Model '${cleanNum}' updated successfully`,
      data: model,
    });
  } catch (err) {
    console.error('[Update Model Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update motor model',
      error: err.message,
    });
  }
};

/**
 * @desc    Delete a custom motor model (Built-in models cannot be deleted)
 * @route   DELETE /api/models/:modelNumber
 * @access  Private (Admin)
 */
exports.deleteModel = async (req, res) => {
  try {
    const { modelNumber } = req.params;
    const cleanNum = String(modelNumber).toUpperCase().trim();

    const model = await MotorModel.findOne({ modelNumber: cleanNum });
    if (!model) {
      return res.status(404).json({
        success: false,
        message: `Model '${cleanNum}' not found`,
      });
    }

    if (model.isBuiltIn) {
      return res.status(400).json({
        success: false,
        message: `Standard built-in model '${cleanNum}' cannot be deleted. You can edit its parameters if needed.`,
      });
    }

    // Check if any devices are using this model
    const deviceCount = await Device.countDocuments({ modelNumber: cleanNum });
    if (deviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete model '${cleanNum}' because ${deviceCount} registered device(s) are assigned to it.`,
      });
    }

    await MotorModel.deleteOne({ modelNumber: cleanNum });

    return res.status(200).json({
      success: true,
      message: `Model '${cleanNum}' deleted successfully`,
    });
  } catch (err) {
    console.error('[Delete Model Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete motor model',
      error: err.message,
    });
  }
};
