const SensorData = require('../models/SensorData');
const MotorHistory = require('../models/MotorHistory');
const iotService = require('../services/iotService');

/**
 * GET /api/data
 * GET /api/data/:id
 * Retrieve telemetry records (single by ID or paginated list)
 */
exports.getData = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;

    // Single item query
    if (id) {
      const item = await SensorData.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Record with id ${id} not found`,
        });
      }
      return res.status(200).json({
        success: true,
        data: item,
      });
    }

    // Return all distinct device IDs that exist in telemetry history or devices (for Admin dropdown)
    const isUserAdmin = req.user && ['ADMIN', 'OPERATOR'].includes(String(req.user.role || '').toUpperCase());
    if (req.query.devicesOnly === 'true' || req.query.view === 'devices') {
      const Device = require('../models/Device');
      if (isUserAdmin) {
        const [sensorDevs, motorDevs, regDevs] = await Promise.all([
          SensorData.distinct('deviceId'),
          MotorHistory.distinct('deviceId'),
          Device.distinct('deviceId'),
        ]);
        const allUniqueDevs = Array.from(new Set([...sensorDevs, ...motorDevs, ...regDevs])).filter(Boolean).sort();
        return res.status(200).json({
          success: true,
          data: allUniqueDevs,
        });
      } else {
        const userDevices = req.user ? await Device.find({
          assignedUserId: req.user._id,
          $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
        }).distinct('deviceId') : [];
        return res.status(200).json({
          success: true,
          data: userDevices,
        });
      }
    }

    // List query with filters & pagination
    const limit = Math.min(500, parseInt(req.query.limit, 10) || 50);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    const Device = require('../models/Device');

    // Role-based history scoping: Regular users see only their assigned AND APPROVED device history.
    // Administrators see ALL telemetry history across ALL devices (past, present, deleted, or unassigned).
    if (!isUserAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          pagination: { total: 0, page, limit, totalPages: 0 },
          data: [],
        });
      }
      const userDevices = await Device.find({
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      }).distinct('deviceId');

      if (req.query.deviceId) {
        const reqDevId = String(req.query.deviceId).trim().toUpperCase();
        if (!userDevices.includes(reqDevId)) {
          return res.status(200).json({
            success: true,
            pagination: { total: 0, page, limit, totalPages: 0 },
            data: [],
          });
        }
        filter.deviceId = reqDevId;
      } else {
        filter.deviceId = { $in: userDevices };
      }
    } else if (req.query.deviceId) {
      filter.deviceId = String(req.query.deviceId).trim().toUpperCase();
    }
    if (req.query.motorStatus) {
      filter.motorStatus = req.query.motorStatus.toUpperCase();
    }
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const [total, records] = await Promise.all([
      SensorData.countDocuments(filter),
      SensorData.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: records,
    });
  } catch (error) {
    console.error('[GET /api/data error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve telemetry data',
      error: error.message,
    });
  }
};

/**
 * POST /api/data
 * Ingest / create new sensor telemetry record
 */
exports.createData = async (req, res) => {
  try {
    const {
      deviceId,
      voltage = 0,
      current = 0,
      power,
      powerFactor = 0,
      waterLevel,
      tankCapacity,
      tankcapacity,
      waterConsumption,
      waterconsuption,
      motorStatus = 'OFF',
      forceOn,
      forceOff,
      energyConsumption,
      timestamp,
    } = req.body;

    const cleanDeviceId = String(deviceId || 'WT-DEV-001').trim().toUpperCase();
    const v = Number(voltage) || 0;
    const c = Number(current) || 0;
    const pf = Math.max(0, Math.min(1.0, Number(powerFactor) || 0));
    const p = power !== undefined ? Number(power) : Math.round(v * c * (pf || 0.92));

    // Support tankCapacity / tankcapacity and waterConsumption / waterconsuption
    const cap = tankCapacity !== undefined 
      ? Number(tankCapacity) 
      : (tankcapacity !== undefined ? Number(tankcapacity) : 1000);

    const con = waterConsumption !== undefined 
      ? Number(waterConsumption) 
      : (waterconsuption !== undefined 
          ? Number(waterconsuption) 
          : (waterLevel !== undefined ? Math.round((Number(waterLevel) / 100) * cap) : 0));

    // Calculate waterLevel percentage dynamically
    const wl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
    let ms = (motorStatus || 'OFF').toUpperCase() === 'ON' ? 'ON' : 'OFF';
    const fOn = forceOn !== undefined ? (forceOn === true || String(forceOn).toLowerCase() === 'true') : undefined;
    const fOff = forceOff !== undefined ? (forceOff === true || String(forceOff).toLowerCase() === 'true') : undefined;

    if (fOn === true) {
      ms = 'ON';
    } else if (fOff === true) {
      ms = 'OFF';
    }

    const currentState = iotService.getRuntimeState(cleanDeviceId);
    const energy = energyConsumption !== undefined 
      ? Number(energyConsumption) 
      : (currentState.energyConsumption || 0);

    const recordTime = timestamp ? new Date(timestamp) : new Date();

    const record = new SensorData({
      deviceId: cleanDeviceId,
      voltage: +v.toFixed(1),
      current: +c.toFixed(2),
      power: p,
      powerFactor: +pf.toFixed(2),
      tankCapacity: cap,
      waterConsumption: con,
      motorStatus: ms,
      forceOn: Boolean(fOn),
      forceOff: Boolean(fOff),
      energyConsumption: +energy.toFixed(3),
      timestamp: recordTime,
    });

    const saved = await record.save();

    // Persist to Device model
    if (fOn !== undefined || fOff !== undefined || ms) {
      const devUpdates = { motorStatus: ms, lastActive: recordTime };
      if (fOn !== undefined) {
        devUpdates.forceOn = fOn;
        if (fOn === true) devUpdates.forceOff = false;
      }
      if (fOff !== undefined) {
        devUpdates.forceOff = fOff;
        if (fOff === true) devUpdates.forceOn = false;
      }
      const Device = require('../models/Device');
      await Device.updateOne({ deviceId: cleanDeviceId }, { $set: devUpdates }).catch(() => {});
    }

    // If motorStatus changed, track MotorHistory event
    if (currentState.motorStatus !== ms) {
      const prevOpen = await MotorHistory.findOne({ deviceId: cleanDeviceId, endTime: null }).sort({ startTime: -1 });
      if (prevOpen) {
        prevOpen.endTime = recordTime;
        prevOpen.duration = Math.max(0, Math.floor((recordTime - prevOpen.startTime) / 1000));
        await prevOpen.save();
      }

      const motorEvent = new MotorHistory({
        deviceId: cleanDeviceId,
        motorStatus: ms,
        eventType: ms === 'ON' ? 'REMOTE_ON' : 'REMOTE_OFF',
        startTime: recordTime,
        endTime: null,
        duration: 0,
        timestamp: recordTime,
        note: `Updated via POST /api/data (${cleanDeviceId})`,
      });
      await motorEvent.save();
    }

    // Sync in-memory runtime state & broadcast through Socket.IO
    iotService.updateRuntimeState({
      deviceId: cleanDeviceId,
      voltage: saved.voltage,
      current: saved.current,
      power: saved.power,
      powerFactor: saved.powerFactor,
      tankCapacity: saved.tankCapacity,
      waterConsumption: saved.waterConsumption,
      waterLevel: Math.round(wl),
      motorStatus: saved.motorStatus,
      energyConsumption: saved.energyConsumption,
      lastOnTime: ms === 'ON' ? recordTime : currentState.lastOnTime,
      lastOffTime: ms === 'OFF' ? recordTime : currentState.lastOffTime,
      isHardwareConnected: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Telemetry data created successfully',
      data: saved,
    });
  } catch (error) {
    console.error('[POST /api/data error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create telemetry record',
      error: error.message,
    });
  }
};

/**
 * PUT /api/data
 * PUT /api/data/:id
 * Update an existing telemetry record
 */
exports.updateData = async (req, res) => {
  try {
    let id = req.params.id || req.body._id || req.body.id;
    if (!id) {
      const latest = await SensorData.findOne().sort({ timestamp: -1 });
      if (latest) {
        id = latest._id;
      } else {
        return exports.createData(req, res);
      }
    }

    const updates = {};
    if (req.body.voltage !== undefined) updates.voltage = Number(req.body.voltage);
    if (req.body.current !== undefined) updates.current = Number(req.body.current);
    if (req.body.power !== undefined) updates.power = Number(req.body.power);
    if (req.body.powerFactor !== undefined) updates.powerFactor = Number(req.body.powerFactor);
    
    if (req.body.tankCapacity !== undefined) updates.tankCapacity = Number(req.body.tankCapacity);
    if (req.body.tankcapacity !== undefined) updates.tankCapacity = Number(req.body.tankcapacity);
    if (req.body.waterConsumption !== undefined) updates.waterConsumption = Number(req.body.waterConsumption);
    if (req.body.waterconsuption !== undefined) updates.waterConsumption = Number(req.body.waterconsuption);

    let computedWaterLevel = null;
    if (updates.tankCapacity !== undefined || updates.waterConsumption !== undefined) {
      const existing = await SensorData.findById(id);
      const cap = updates.tankCapacity !== undefined ? updates.tankCapacity : (existing?.tankCapacity || 1000);
      const con = updates.waterConsumption !== undefined ? updates.waterConsumption : (existing?.waterConsumption || 0);
      computedWaterLevel = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
    }

    if (req.body.motorStatus !== undefined) updates.motorStatus = req.body.motorStatus.toUpperCase();
    if (req.body.energyConsumption !== undefined) updates.energyConsumption = Number(req.body.energyConsumption);
    if (req.body.timestamp !== undefined) updates.timestamp = new Date(req.body.timestamp);

    const updated = await SensorData.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Record with id ${id} not found`,
      });
    }

    // Refresh runtime state & broadcast
    iotService.updateRuntimeState({
      voltage: updated.voltage,
      current: updated.current,
      power: updated.power,
      powerFactor: updated.powerFactor,
      tankCapacity: updated.tankCapacity,
      waterConsumption: updated.waterConsumption,
      waterLevel: computedWaterLevel !== null ? computedWaterLevel : iotService.getRuntimeState().waterLevel,
      motorStatus: updated.motorStatus,
      energyConsumption: updated.energyConsumption,
      isHardwareConnected: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Telemetry record updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('[PUT /api/data error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update telemetry record',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/data
 * DELETE /api/data/:id
 * Delete a specific record, or bulk delete based on filter
 */
exports.deleteData = async (req, res) => {
  try {
    const id = req.params.id || req.query.id || req.body._id || req.body.id;

    if (id) {
      const deleted = await SensorData.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Record with id ${id} not found`,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Telemetry record deleted successfully',
        deletedId: id,
      });
    }

    // Purge all records if requested
    if (req.query.all === 'true' || req.body?.all === true) {
      const resSensors = await SensorData.deleteMany({});
      const resHistories = await MotorHistory.deleteMany({});
      return res.status(200).json({
        success: true,
        message: 'All sensor records and motor histories deleted successfully',
        deletedSensors: resSensors.deletedCount,
        deletedHistories: resHistories.deletedCount,
      });
    }

    // Bulk deletion by olderThanDays query param
    const { olderThanDays } = req.query;
    if (olderThanDays) {
      const cutoffDate = new Date(Date.now() - parseInt(olderThanDays, 10) * 24 * 60 * 60 * 1000);
      const result = await SensorData.deleteMany({ timestamp: { $lt: cutoffDate } });
      return res.status(200).json({
        success: true,
        message: `Deleted records older than ${olderThanDays} days`,
        deletedCount: result.deletedCount,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please specify an id (:id, ?id=, body.id) or ?olderThanDays=N for bulk cleanup',
    });
  } catch (error) {
    console.error('[DELETE /api/data error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete telemetry record',
      error: error.message,
    });
  }
};
