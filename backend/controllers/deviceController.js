const Device = require('../models/Device');
const SensorData = require('../models/SensorData');
const MotorHistory = require('../models/MotorHistory');
const iotService = require('../services/iotService');

/**
 * Helper to extract device ID from params, body, or query
 */
const extractDeviceId = (req) => {
  const raw = req.params?.id || req.body?.deviceId || req.body?.deviceid || req.query?.deviceId || req.query?.id;
  if (!raw) return null;
  return String(raw).trim().toUpperCase();
};

/**
 * POST /api/device
 * PUT  /api/device
 * PUT  /api/device/:id
 * Unified method to create/update device and ingest live telemetry by deviceId
 */
exports.saveDeviceData = async (req, res) => {
  try {
    const rawId = req.params?.id || req.body?.deviceId || req.body?.deviceid || req.query?.deviceId;
    
    // Check if ID is a Mongo ObjectId or a Device ID
    let targetDeviceId = null;
    let existingDevice = null;

    if (rawId && rawId.match(/^[0-9a-fA-F]{24}$/)) {
      existingDevice = await Device.findById(rawId);
      if (existingDevice) {
        targetDeviceId = existingDevice.deviceId;
      }
    }

    if (!targetDeviceId) {
      targetDeviceId = rawId ? String(rawId).trim().toUpperCase() : (req.body.deviceId ? String(req.body.deviceId).trim().toUpperCase() : 'WT-DEV-001');
    }

    const {
      name,
      location,
      status,
      description,
      voltage,
      current,
      power,
      powerFactor,
      tankCapacity,
      tankcapacity,
      waterConsumption,
      waterconsuption,
      waterLevel,
      motorStatus,
      energyConsumption,
      timestamp,
    } = req.body;

    // Resolve capacity and consumption
    const hasExplicitCap = tankCapacity !== undefined || tankcapacity !== undefined;
    const cap = hasExplicitCap 
      ? Number(tankCapacity !== undefined ? tankCapacity : tankcapacity) 
      : existingDevice?.tankCapacity;

    const hasExplicitDesc = description !== undefined && description !== null && String(description).trim() !== '';

    const con = waterConsumption !== undefined 
      ? Number(waterConsumption) 
      : (waterconsuption !== undefined 
          ? Number(waterconsuption) 
          : (waterLevel !== undefined ? Math.round((Number(waterLevel) / 100) * (cap || 1000)) : 0));

    const wl = (cap && cap > 0) ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
    const ms = motorStatus ? (String(motorStatus).toUpperCase() === 'ON' ? 'ON' : 'OFF') : undefined;

    // 1. Find or create/update the Device metadata document
    if (!existingDevice) {
      existingDevice = await Device.findOne({ deviceId: targetDeviceId });
    }

    let deviceDoc;
    if (existingDevice) {
      const updates = { lastActive: new Date() };
      if (name !== undefined) updates.name = String(name).trim();
      if (location !== undefined) updates.location = String(location).trim();
      if (status !== undefined) updates.status = String(status).toUpperCase();
      if (hasExplicitCap) updates.tankCapacity = cap;
      if (description !== undefined) {
        const descTrim = String(description).trim();
        if (descTrim) {
          updates.description = descTrim;
        } else {
          await Device.updateOne({ _id: existingDevice._id }, { $unset: { description: 1 } });
        }
      }

      deviceDoc = await Device.findByIdAndUpdate(existingDevice._id, { $set: updates }, { new: true });
    } else {
      const devPayload = {
        deviceId: targetDeviceId,
        name: name ? String(name).trim() : `Device ${targetDeviceId}`,
        location: location ? String(location).trim() : 'Main Facility',
        status: status ? String(status).toUpperCase() : 'ONLINE',
        lastActive: new Date(),
      };
      if (hasExplicitCap) {
        devPayload.tankCapacity = cap;
      }
      if (hasExplicitDesc) {
        devPayload.description = String(description).trim();
      }

      deviceDoc = new Device(devPayload);
      await deviceDoc.save();
    }

    // 2. Check if telemetry sensor fields were provided
    const hasTelemetry = voltage !== undefined ||
      current !== undefined ||
      power !== undefined ||
      powerFactor !== undefined ||
      waterConsumption !== undefined ||
      waterconsuption !== undefined ||
      waterLevel !== undefined ||
      motorStatus !== undefined ||
      energyConsumption !== undefined;

    let savedTelemetry = null;

    if (hasTelemetry) {
      const v = voltage !== undefined ? Number(voltage) : 230;
      const c = current !== undefined ? Number(current) : 0;
      const pf = powerFactor !== undefined ? Math.max(0, Math.min(1.0, Number(powerFactor))) : 0.92;
      const p = power !== undefined ? Number(power) : Math.round(v * c * pf);

      const currentState = iotService.getRuntimeState(targetDeviceId) || {};
      const energy = energyConsumption !== undefined 
        ? Number(energyConsumption) 
        : (currentState.energyConsumption || 0);

      const recordTime = timestamp ? new Date(timestamp) : new Date();
      const finalMotorStatus = ms || currentState.motorStatus || 'OFF';

      const sensorRecord = new SensorData({
        deviceId: targetDeviceId,
        voltage: +v.toFixed(1),
        current: +c.toFixed(2),
        power: p,
        powerFactor: +pf.toFixed(2),
        tankCapacity: cap,
        waterConsumption: con,
        motorStatus: finalMotorStatus,
        energyConsumption: +energy.toFixed(3),
        timestamp: recordTime,
      });

      savedTelemetry = await sensorRecord.save();

      // Track motor history state transition
      if (currentState.motorStatus !== finalMotorStatus) {
        const prevOpen = await MotorHistory.findOne({ deviceId: targetDeviceId, endTime: null }).sort({ startTime: -1 });
        if (prevOpen) {
          prevOpen.endTime = recordTime;
          prevOpen.duration = Math.max(0, Math.floor((recordTime - prevOpen.startTime) / 1000));
          await prevOpen.save();
        }

        const motorEvent = new MotorHistory({
          deviceId: targetDeviceId,
          motorStatus: finalMotorStatus,
          eventType: finalMotorStatus === 'ON' ? 'REMOTE_ON' : 'REMOTE_OFF',
          startTime: recordTime,
          endTime: null,
          duration: 0,
          timestamp: recordTime,
          note: `Updated via /api/device (${targetDeviceId})`,
        });
        await motorEvent.save();
      }

      // Update in-memory state & notify live Socket.IO listeners
      iotService.updateRuntimeState({
        deviceId: targetDeviceId,
        voltage: savedTelemetry.voltage,
        current: savedTelemetry.current,
        power: savedTelemetry.power,
        powerFactor: savedTelemetry.powerFactor,
        tankCapacity: cap,
        waterConsumption: con,
        waterLevel: wl,
        motorStatus: finalMotorStatus,
        energyConsumption: savedTelemetry.energyConsumption,
        lastOnTime: finalMotorStatus === 'ON' ? recordTime : currentState.lastOnTime,
        lastOffTime: finalMotorStatus === 'OFF' ? recordTime : currentState.lastOffTime,
        isHardwareConnected: true,
      });
    }

    const cleanDevice = { ...(deviceDoc.toObject ? deviceDoc.toObject() : deviceDoc) };
    if (cleanDevice.description === '' || cleanDevice.description === null) {
      delete cleanDevice.description;
    }

    const resPayload = {
      device: cleanDevice,
    };
    if (savedTelemetry) {
      resPayload.telemetry = savedTelemetry;
      resPayload.waterLevel = wl;
    }

    return res.status(200).json({
      success: true,
      message: 'Device data saved and synchronized successfully',
      data: resPayload,
    });
  } catch (error) {
    console.error('[/api/device saveDeviceData error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process device data',
      error: error.message,
    });
  }
};

/**
 * GET /api/device
 * Shows all devices with their latest data, or paginated telemetry history
 */
exports.getDevices = async (req, res) => {
  try {
    // If telemetry history view is explicitly requested (e.g. for History log page)
    if (req.query.view === 'telemetry' || req.query.type === 'history') {
      const limit = Math.min(500, parseInt(req.query.limit, 10) || 50);
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.deviceId) filter.deviceId = req.query.deviceId.toUpperCase();
      if (req.query.motorStatus) filter.motorStatus = req.query.motorStatus.toUpperCase();
      if (req.query.startDate || req.query.endDate) {
        filter.timestamp = {};
        if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
      }

      const [total, records] = await Promise.all([
        SensorData.countDocuments(filter),
        SensorData.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
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
    }

    // Default: Show all registered devices with their latest telemetry data merged!
    const { search, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ deviceId: regex }, { name: regex }, { location: regex }];
    }

    const devices = await Device.find(filter).sort({ createdAt: -1 }).lean();

    // Attach latest telemetry readings to each device
    const devicesWithData = await Promise.all(
      devices.map(async (dev) => {
        const latest = await SensorData.findOne({ deviceId: dev.deviceId }).sort({ timestamp: -1 }).lean();
        const rt = iotService.getRuntimeState(dev.deviceId);

        const hasTelemetry = Boolean(latest || (rt && rt.hasData));

        const cleanDev = { ...dev };
        if (cleanDev.description === '' || cleanDev.description === null) {
          delete cleanDev.description;
        }

        if (!hasTelemetry) {
          return cleanDev;
        }

        const cap = latest?.tankCapacity || dev.tankCapacity || 1000;
        const con = latest?.waterConsumption !== undefined ? latest.waterConsumption : (rt?.waterConsumption || 0);
        const wl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;

        return {
          ...cleanDev,
          data: {
            voltage: latest ? latest.voltage : (rt?.voltage ?? null),
            current: latest ? latest.current : (rt?.current ?? null),
            power: latest ? latest.power : (rt?.power ?? null),
            powerFactor: latest ? latest.powerFactor : (rt?.powerFactor ?? null),
            ...(cleanDev.tankCapacity !== undefined ? { tankCapacity: cap } : {}),
            waterConsumption: con,
            waterLevel: wl,
            motorStatus: latest ? latest.motorStatus : (rt?.motorStatus ?? 'OFF'),
            energyConsumption: latest ? latest.energyConsumption : (rt?.energyConsumption ?? 0),
            timestamp: latest?.timestamp || rt?.timestamp || dev.lastActive || new Date(),
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: devicesWithData.length,
      data: devicesWithData,
    });
  } catch (error) {
    console.error('[/api/device getDevices error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve devices with data',
      error: error.message,
    });
  }
};

/**
 * GET /api/device/:id
 * Retrieve a single device with its latest data
 */
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    let device;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      device = await Device.findById(id).lean();
    }
    if (!device) {
      device = await Device.findOne({ deviceId: id.toUpperCase() }).lean();
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device '${id}' not found`,
      });
    }

    const latest = await SensorData.findOne({ deviceId: device.deviceId }).sort({ timestamp: -1 }).lean();
    const rt = iotService.getRuntimeState(device.deviceId);
    const hasTelemetry = Boolean(latest || (rt && rt.hasData));

    const cleanDev = { ...device };
    if (cleanDev.description === '' || cleanDev.description === null) {
      delete cleanDev.description;
    }

    if (!hasTelemetry) {
      return res.status(200).json({
        success: true,
        data: cleanDev,
      });
    }

    const cap = latest?.tankCapacity || device.tankCapacity || 1000;
    const con = latest?.waterConsumption !== undefined ? latest.waterConsumption : (rt?.waterConsumption || 0);
    const wl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;

    return res.status(200).json({
      success: true,
      data: {
        ...cleanDev,
        data: {
          voltage: latest ? latest.voltage : (rt?.voltage ?? null),
          current: latest ? latest.current : (rt?.current ?? null),
          power: latest ? latest.power : (rt?.power ?? null),
          powerFactor: latest ? latest.powerFactor : (rt?.powerFactor ?? null),
          ...(cleanDev.tankCapacity !== undefined ? { tankCapacity: cap } : {}),
          waterConsumption: con,
          waterLevel: wl,
          motorStatus: latest ? latest.motorStatus : (rt?.motorStatus ?? 'OFF'),
          energyConsumption: latest ? latest.energyConsumption : (rt?.energyConsumption ?? 0),
          timestamp: latest?.timestamp || rt?.timestamp || device.lastActive || new Date(),
        },
      },
    });
  } catch (error) {
    console.error('[/api/device getDeviceById error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve device',
      error: error.message,
    });
  }
};

/**
 * PUT /api/device/:id or PUT /api/device
 */
exports.updateDevice = exports.saveDeviceData;

/**
 * DELETE /api/device/:id or DELETE /api/device
 * Remove a device and its associated telemetry history
 */
exports.deleteDevice = async (req, res) => {
  try {
    const rawId = req.params?.id || req.query?.deviceId || req.body?.deviceId;
    if (!rawId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the device ID to delete',
      });
    }

    let deleted;
    if (String(rawId).match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await Device.findByIdAndDelete(rawId);
    } else {
      const cleanId = String(rawId).trim().toUpperCase();
      deleted = await Device.findOneAndDelete({ deviceId: cleanId });
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Device '${rawId}' not found`,
      });
    }

    // Clean up associated telemetry records so no orphaned data remains
    await Promise.all([
      SensorData.deleteMany({ deviceId: deleted.deviceId }),
      MotorHistory.deleteMany({ deviceId: deleted.deviceId }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Device '${deleted.deviceId}' and all associated telemetry removed successfully`,
      data: deleted,
    });
  } catch (error) {
    console.error('[/api/device deleteDevice error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete device',
      error: error.message,
    });
  }
};
