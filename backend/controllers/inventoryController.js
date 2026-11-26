const crypto = require('crypto');
const DeviceInventory = require('../models/DeviceInventory');
const { isValidModel } = require('../config/motorModels');

/**
 * @desc    Verify a manufactured Device ID before registration
 * @route   GET /api/inventory/verify/:deviceId
 * @access  Public / Authenticated
 */
exports.verifyDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const cleanId = String(deviceId || '').toUpperCase().trim();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required for verification',
      });
    }

    const item = await DeviceInventory.findOne({ deviceId: cleanId }).select('-deviceApiKey');

    if (!item) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: `Device ID '${cleanId}' is not found in the manufactured device inventory. Please check the hardware label or scan the QR code.`,
      });
    }

    if (item.status === 'REGISTERED') {
      return res.status(409).json({
        success: false,
        verified: false,
        status: item.status,
        manufacturingModelNumber: item.manufacturingModelNumber,
        message: `Device '${cleanId}' is already registered to an owner. Please contact an administrator to reassign this device.`,
      });
    }

    if (item.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        verified: false,
        status: item.status,
        message: `Device '${cleanId}' is currently marked DISABLED. It cannot be registered at this time.`,
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: `Manufactured device '${cleanId}' verified and available for registration.`,
      data: {
        deviceId: item.deviceId,
        manufacturingModelNumber: item.manufacturingModelNumber,
        manufacturingDate: item.manufacturingDate,
        status: item.status,
        batchNumber: item.batchNumber,
      },
    });
  } catch (err) {
    console.error('[Verify Inventory Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify manufactured device',
      error: err.message,
    });
  }
};

/**
 * @desc    Add a single manufactured device to factory inventory (Admin only)
 * @route   POST /api/inventory
 * @access  Private (Admin)
 */
exports.addInventoryDevice = async (req, res) => {
  try {
    const { deviceId, manufacturingModelNumber, batchNumber, notes, customApiKey } = req.body;

    if (!deviceId || !manufacturingModelNumber) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and Manufacturing Model Number are required',
      });
    }

    const cleanId = deviceId.toUpperCase().trim();
    const cleanModel = manufacturingModelNumber.trim();

    if (!isValidModel(cleanModel) && cleanModel !== 'LEGACY') {
      return res.status(400).json({
        success: false,
        message: `Invalid model number '${cleanModel}'. Must be one of SG-1PS-1.5, SG-1PD-1.5, SG-3PD-7.5, SG-3PSD-15.`,
      });
    }

    // Check for existing record
    const exists = await DeviceInventory.findOne({ deviceId: cleanId });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Device ID '${cleanId}' is already present in inventory (Status: ${exists.status})`,
      });
    }

    // Generate secure device API key
    const generatedApiKey = customApiKey || `ak_${cleanId.toLowerCase()}_${crypto.randomBytes(16).toString('hex')}`;

    const inventoryItem = await DeviceInventory.create({
      deviceId: cleanId,
      manufacturingModelNumber: cleanModel,
      deviceApiKey: generatedApiKey,
      batchNumber: batchNumber || '',
      notes: notes || '',
      status: 'UNREGISTERED',
    });

    return res.status(201).json({
      success: true,
      message: `Device '${cleanId}' added to factory inventory successfully.`,
      data: {
        deviceId: inventoryItem.deviceId,
        manufacturingModelNumber: inventoryItem.manufacturingModelNumber,
        status: inventoryItem.status,
        batchNumber: inventoryItem.batchNumber,
        manufacturingDate: inventoryItem.manufacturingDate,
      },
    });
  } catch (err) {
    console.error('[Add Inventory Device Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to add device to inventory',
      error: err.message,
    });
  }
};

/**
 * @desc    Batch import manufactured devices into inventory (Admin only)
 * @route   POST /api/inventory/batch
 * @access  Private (Admin)
 */
exports.batchImportInventory = async (req, res) => {
  try {
    const { devices } = req.body;

    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An array of device objects is required for batch import',
      });
    }

    const results = {
      inserted: 0,
      skipped: 0,
      errors: [],
    };

    for (const item of devices) {
      if (!item.deviceId || !item.manufacturingModelNumber) {
        results.errors.push(`Missing deviceId or model for item: ${JSON.stringify(item)}`);
        results.skipped++;
        continue;
      }

      const cleanId = item.deviceId.toUpperCase().trim();
      const cleanModel = item.manufacturingModelNumber.trim();

      if (!isValidModel(cleanModel) && cleanModel !== 'LEGACY') {
        results.errors.push(`Invalid model number '${cleanModel}' for device '${cleanId}'`);
        results.skipped++;
        continue;
      }

      try {
        const apiKey = `ak_${cleanId.toLowerCase()}_${crypto.randomBytes(16).toString('hex')}`;
        await DeviceInventory.create({
          deviceId: cleanId,
          manufacturingModelNumber: cleanModel,
          deviceApiKey: apiKey,
          batchNumber: item.batchNumber || '',
          notes: item.notes || '',
          status: 'UNREGISTERED',
        });
        results.inserted++;
      } catch (insertErr) {
        if (insertErr.code === 11000) {
          results.skipped++;
          results.errors.push(`Device '${cleanId}' already exists in inventory (duplicate).`);
        } else {
          results.errors.push(`Failed to insert '${cleanId}': ${insertErr.message}`);
          results.skipped++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Batch import completed. Inserted: ${results.inserted}, Skipped: ${results.skipped}`,
      data: results,
    });
  } catch (err) {
    console.error('[Batch Import Inventory Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to batch import inventory devices',
      error: err.message,
    });
  }
};

/**
 * @desc    Get paginated inventory list with filters (Admin only)
 * @route   GET /api/inventory
 * @access  Private (Admin)
 */
exports.getInventory = async (req, res) => {
  try {
    const { status, model, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = String(status).toUpperCase();
    if (model) filter.manufacturingModelNumber = String(model);
    if (search) {
      filter.$or = [
        { deviceId: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await DeviceInventory.countDocuments(filter);

    const items = await DeviceInventory.find(filter)
      .select('-deviceApiKey')
      .populate('registeredUserId', 'name email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      data: items,
    });
  } catch (err) {
    console.error('[Get Inventory Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory records',
      error: err.message,
    });
  }
};

/**
 * @desc    Update manufactured device status or notes (Admin only)
 * @route   PUT /api/inventory/:deviceId
 * @access  Private (Admin)
 */
exports.updateInventoryStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status, batchNumber, notes } = req.body;
    const cleanId = deviceId.toUpperCase().trim();

    const item = await DeviceInventory.findOne({ deviceId: cleanId });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Device '${cleanId}' not found in inventory`,
      });
    }

    if (status) {
      const upperStatus = String(status).toUpperCase();
      if (!['UNREGISTERED', 'REGISTERED', 'DISABLED'].includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be UNREGISTERED, REGISTERED, or DISABLED',
        });
      }
      item.status = upperStatus;
    }

    if (batchNumber !== undefined) item.batchNumber = batchNumber;
    if (notes !== undefined) item.notes = notes;

    await item.save();

    return res.status(200).json({
      success: true,
      message: `Inventory device '${cleanId}' updated successfully`,
      data: {
        deviceId: item.deviceId,
        manufacturingModelNumber: item.manufacturingModelNumber,
        status: item.status,
        batchNumber: item.batchNumber,
        notes: item.notes,
      },
    });
  } catch (err) {
    console.error('[Update Inventory Status Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update inventory record',
      error: err.message,
    });
  }
};
