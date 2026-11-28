const Device = require('../models/Device');
const SensorData = require('../models/SensorData');
const MotorHistory = require('../models/MotorHistory');
const FaultLog = require('../models/FaultLog');
const iotService = require('../services/iotService');
const { getModelConfig } = require('../config/motorModels');

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
      deviceStatus,
      faultDescription,
      description,
      modelNumber,
      modelName,
      motorType,
      motorCapacity,
      phase,
      tanks,
      overheadCapacity,
      sumpCapacity,
      voltage,
      current,
      vol1,
      vol2,
      vol3,
      cu1,
      cu2,
      cu3,
      frequency,
      power,
      powerFactor,
      waterLevelStatus,
      sumpTank,
      overheadTank,
      tankCapacity,
      tankcapacity,
      waterConsumption,
      waterconsuption,
      waterLevel,
      motorStatus,
      forceOn,
      forceOff,
      energyConsumption,
      timestamp,
    } = req.body;

    // Resolve capacity and consumption
    const hasExplicitCap = tankCapacity !== undefined || tankcapacity !== undefined;
    const cap = hasExplicitCap 
      ? Number(tankCapacity !== undefined ? tankCapacity : tankcapacity) 
      : existingDevice?.tankCapacity;

    // Resolve model configuration
    const cleanModelNumber = modelNumber ? String(modelNumber).trim() : undefined;
    const modelCfg = cleanModelNumber ? getModelConfig(cleanModelNumber) : null;

    // Resolve tank configuration
    const resolvedTanks = {
      overhead: {
        configured: modelCfg ? modelCfg.tanks.overhead.supported : true,
        capacity: overheadCapacity !== undefined ? Number(overheadCapacity) : (tanks?.overhead?.capacity || cap || null),
        name: tanks?.overhead?.name || 'Overhead Tank',
        location: tanks?.overhead?.location || 'Rooftop',
      },
      sump: {
        configured: modelCfg ? modelCfg.tanks.sump.supported : Boolean(sumpCapacity || tanks?.sump?.configured),
        capacity: (modelCfg && !modelCfg.tanks.sump.supported) ? null : (sumpCapacity !== undefined ? Number(sumpCapacity) : (tanks?.sump?.capacity || null)),
        name: tanks?.sump?.name || 'Sump Tank',
        location: tanks?.sump?.location || 'Ground',
      },
    };

    const hasExplicitDesc = description !== undefined && description !== null && String(description).trim() !== '';

    const con = waterConsumption !== undefined 
      ? Number(waterConsumption) 
      : (waterconsuption !== undefined 
          ? Number(waterconsuption) 
          : (waterLevel !== undefined ? Math.round((Number(waterLevel) / 100) * (cap || 1000)) : 0));

    const wl = (cap && cap > 0) ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : (waterLevel !== undefined ? Number(waterLevel) : null);
    let ms = motorStatus ? (String(motorStatus).toUpperCase() === 'ON' ? 'ON' : 'OFF') : undefined;
    const fOn = forceOn !== undefined ? (forceOn === true || String(forceOn).toLowerCase() === 'true') : undefined;
    const fOff = forceOff !== undefined ? (forceOff === true || String(forceOff).toLowerCase() === 'true') : undefined;

    if (fOn === true) {
      ms = 'ON';
    } else if (fOff === true) {
      ms = 'OFF';
    }

    // Determine normalized status (Active vs Fault)
    const rawStatus = (deviceStatus || status || '').trim();
    const isFault = rawStatus.toLowerCase() === 'fault' || Boolean(faultDescription);
    const resolvedStatus = isFault ? 'Fault' : (rawStatus.toUpperCase() === 'OFFLINE' ? 'OFFLINE' : 'Active');
    const resolvedDeviceStatus = isFault ? 'Fault' : 'Active';

    // 1. Find or create/update the Device metadata document
    if (!existingDevice) {
      existingDevice = await Device.findOne({ deviceId: targetDeviceId });
    }

    let deviceDoc;
    if (existingDevice) {
      const updates = { 
        lastActive: new Date(),
        lastAck: new Date(),
        status: resolvedStatus,
        deviceStatus: resolvedDeviceStatus,
      };
      if (name !== undefined) updates.name = String(name).trim();
      if (location !== undefined) updates.location = String(location).trim();
      if (hasExplicitCap) updates.tankCapacity = cap;
      if (faultDescription !== undefined) updates.faultDescription = faultDescription ? String(faultDescription).trim() : null;
      if (cleanModelNumber !== undefined) {
        updates.modelNumber = cleanModelNumber;
        updates.modelName = modelName || modelCfg?.modelName || cleanModelNumber;
        updates.motorType = motorType || modelCfg?.motorType || null;
        updates.motorCapacity = motorCapacity || modelCfg?.hpRating?.label || null;
        updates.phase = phase || modelCfg?.phase || null;
        updates.tanks = resolvedTanks;
      }
      if (description !== undefined) {
        const descTrim = String(description).trim();
        if (descTrim) {
          updates.description = descTrim;
        } else {
          await Device.updateOne({ _id: existingDevice._id }, { $unset: { description: 1 } });
        }
      }
      if (fOn !== undefined) {
        updates.forceOn = fOn;
        if (fOn === true) updates.forceOff = false;
      }
      if (fOff !== undefined) {
        updates.forceOff = fOff;
        if (fOff === true) updates.forceOn = false;
      }
      if (ms !== undefined) updates.motorStatus = ms;

      deviceDoc = await Device.findByIdAndUpdate(existingDevice._id, { $set: updates }, { new: true });
    } else {
      const devPayload = {
        deviceId: targetDeviceId,
        name: name ? String(name).trim() : `Device ${targetDeviceId}`,
        location: location ? String(location).trim() : 'Main Facility',
        status: resolvedStatus,
        deviceStatus: resolvedDeviceStatus,
        faultDescription: faultDescription ? String(faultDescription).trim() : null,
        lastActive: new Date(),
        lastAck: new Date(),
      };
      if (fOn !== undefined) {
        devPayload.forceOn = fOn;
        if (fOn === true) devPayload.forceOff = false;
      }
      if (fOff !== undefined) {
        devPayload.forceOff = fOff;
        if (fOff === true) devPayload.forceOn = false;
      }
      if (ms !== undefined) devPayload.motorStatus = ms;
      if (cleanModelNumber) {
        devPayload.modelNumber = cleanModelNumber;
        devPayload.modelName = modelName || modelCfg?.modelName || cleanModelNumber;
        devPayload.motorType = motorType || modelCfg?.motorType || null;
        devPayload.motorCapacity = motorCapacity || modelCfg?.hpRating?.label || null;
        devPayload.phase = phase || modelCfg?.phase || null;
        devPayload.tanks = resolvedTanks;
      }
      if (req.user?._id) {
        devPayload.assignedUserId = req.user._id;
      }
      if (hasExplicitCap) {
        devPayload.tankCapacity = cap;
      }
      if (hasExplicitDesc) {
        devPayload.description = String(description).trim();
      }

      deviceDoc = new Device(devPayload);
      await deviceDoc.save();
    }

    // If fault reported, record in FaultLog
    if (isFault) {
      const desc = faultDescription ? String(faultDescription).trim() : 'Hardware reported fault condition';
      const now = new Date();
      const faultRecord = new FaultLog({
        deviceId: targetDeviceId,
        deviceName: deviceDoc.name || targetDeviceId,
        faultDescription: desc,
        faultStatus: 'Active',
        timestamp: now,
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      await faultRecord.save();

      const io = iotService.getSocketIO();
      if (io) {
        io.emit('new_fault', faultRecord);
        io.emit('device_status_update', {
          deviceId: targetDeviceId,
          status: 'Fault',
          deviceStatus: 'Fault',
          faultDescription: desc,
          timestamp: now,
        });
      }
    }

    // 2. Check if telemetry sensor fields were provided
    const hasTelemetry = voltage !== undefined ||
      current !== undefined ||
      vol1 !== undefined ||
      vol2 !== undefined ||
      vol3 !== undefined ||
      cu1 !== undefined ||
      cu2 !== undefined ||
      cu3 !== undefined ||
      power !== undefined ||
      powerFactor !== undefined ||
      frequency !== undefined ||
      waterConsumption !== undefined ||
      waterconsuption !== undefined ||
      waterLevel !== undefined ||
      waterLevelStatus !== undefined ||
      sumpTank !== undefined ||
      overheadTank !== undefined ||
      motorStatus !== undefined ||
      energyConsumption !== undefined;

    let savedTelemetry = null;

    if (hasTelemetry) {
      // Dynamic single or three phase voltage
      const v = voltage !== undefined ? Number(voltage) : null;
      const v1 = vol1 !== undefined ? Number(vol1) : null;
      const v2 = vol2 !== undefined ? Number(vol2) : null;
      const v3 = vol3 !== undefined ? Number(vol3) : null;

      // Dynamic single or three phase current
      const c = current !== undefined ? Number(current) : null;
      const c1 = cu1 !== undefined ? Number(cu1) : null;
      const c2 = cu2 !== undefined ? Number(cu2) : null;
      const c3 = cu3 !== undefined ? Number(cu3) : null;

      const pf = powerFactor !== undefined ? Math.max(0, Math.min(1.0, Number(powerFactor))) : null;
      const freq = frequency !== undefined ? Number(frequency) : null;

      let p = power !== undefined ? Number(power) : null;
      if (p === null) {
        if (v !== null && c !== null) {
          p = Math.round(v * c * (pf || 0.92));
        } else if (v1 !== null && c1 !== null) {
          p = Math.round((v1 * c1 + (v2 || v1) * (c2 || c1) + (v3 || v1) * (c3 || c1)) * (pf || 0.92));
        }
      }

      const currentState = iotService.getRuntimeState(targetDeviceId) || {};
      const energy = energyConsumption !== undefined 
        ? Number(energyConsumption) 
        : (currentState.energyConsumption || 0);

      const recordTime = timestamp ? new Date(timestamp) : new Date();
      const finalMotorStatus = (fOn === true ? 'ON' : (fOff === true ? 'OFF' : (ms || currentState.motorStatus || 'OFF')));

      // Determine water level status (Low / Medium / High)
      let resolvedWlStatus = waterLevelStatus || null;
      if (!resolvedWlStatus && wl !== null) {
        resolvedWlStatus = wl < 25 ? 'Low' : wl > 75 ? 'High' : 'Medium';
      }

      const sensorPayload = {
        deviceId: targetDeviceId,
        motorStatus: finalMotorStatus,
        energyConsumption: +energy.toFixed(3),
        timestamp: recordTime,
        deviceStatus: resolvedDeviceStatus,
        forceOn: Boolean(fOn !== undefined ? fOn : deviceDoc?.forceOn),
        forceOff: Boolean(fOff !== undefined ? fOff : deviceDoc?.forceOff),
      };

      if (v !== null) sensorPayload.voltage = +v.toFixed(1);
      if (c !== null) sensorPayload.current = +c.toFixed(2);
      if (v1 !== null) sensorPayload.vol1 = +v1.toFixed(1);
      if (v2 !== null) sensorPayload.vol2 = +v2.toFixed(1);
      if (v3 !== null) sensorPayload.vol3 = +v3.toFixed(1);
      if (c1 !== null) sensorPayload.cu1 = +c1.toFixed(2);
      if (c2 !== null) sensorPayload.cu2 = +c2.toFixed(2);
      if (c3 !== null) sensorPayload.cu3 = +c3.toFixed(2);
      if (p !== null) sensorPayload.power = p;
      if (pf !== null) sensorPayload.powerFactor = +pf.toFixed(2);
      if (freq !== null) sensorPayload.frequency = +freq.toFixed(1);
      if (cap !== undefined && cap !== null) sensorPayload.tankCapacity = cap;
      if (con !== null) sensorPayload.waterConsumption = con;
      if (wl !== null) sensorPayload.waterLevel = wl;
      if (resolvedWlStatus) sensorPayload.waterLevelStatus = resolvedWlStatus;
      if (sumpTank) sensorPayload.sumpTank = sumpTank;
      if (overheadTank) sensorPayload.overheadTank = overheadTank;

      const sensorRecord = new SensorData(sensorPayload);
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
        voltage: v,
        current: c,
        vol1: v1,
        vol2: v2,
        vol3: v3,
        cu1: c1,
        cu2: c2,
        cu3: c3,
        power: p,
        powerFactor: pf,
        frequency: freq,
        tankCapacity: cap,
        waterConsumption: con,
        waterLevel: wl,
        waterLevelStatus: resolvedWlStatus,
        sumpTank: sumpTank || currentState.sumpTank || null,
        overheadTank: overheadTank || currentState.overheadTank || null,
        deviceStatus: resolvedDeviceStatus,
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
      const isUserAdmin = req.user && ['ADMIN', 'OPERATOR'].includes(String(req.user.role || '').toUpperCase());

      // Role-based history scoping: Regular users see ONLY their assigned AND APPROVED device history
      if (!isUserAdmin) {
        if (!req.user) {
          return res.status(200).json({
            success: true,
            pagination: { total: 0, page, limit, totalPages: 0 },
            data: [],
          });
        }
        const userApprovedDevices = await Device.find({
          assignedUserId: req.user._id,
          $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
        }).distinct('deviceId');

        if (req.query.deviceId) {
          const reqDevId = String(req.query.deviceId).trim().toUpperCase();
          if (!userApprovedDevices.includes(reqDevId)) {
            return res.status(200).json({
              success: true,
              pagination: { total: 0, page, limit, totalPages: 0 },
              data: [],
            });
          }
          filter.deviceId = reqDevId;
        } else {
          filter.deviceId = { $in: userApprovedDevices };
        }
      } else if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId.toUpperCase();
      }

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

    // Role-based device visibility: Regular users see only their assigned AND APPROVED devices!
    if (req.user && !['ADMIN', 'OPERATOR'].includes(String(req.user.role || '').toUpperCase())) {
      filter.assignedUserId = req.user._id;
      // If includePending query param is not explicitly set, ONLY return approved devices!
      if (!req.query.includePending) {
        filter.$or = [
          { approvalStatus: 'APPROVED' },
          { approvalStatus: { $exists: false } },
        ];
      }
    }

    const devices = await Device.find(filter).sort({ createdAt: -1 }).lean();

    // Attach latest telemetry readings to each device
    const devicesWithData = await Promise.all(
      devices.map(async (dev) => {
        const latest = await SensorData.findOne({ deviceId: dev.deviceId }).sort({ timestamp: -1 }).lean();
        const rt = iotService.getRuntimeState(dev.deviceId);

        const hasTelemetry = Boolean(latest || (rt && rt.hasData));

        const devStatus = dev.deviceStatus || (dev.status === 'Fault' ? 'Fault' : 'Active');
        const cleanDev = { 
          ...dev,
          status: dev.status || devStatus,
          deviceStatus: devStatus,
          lastAck: dev.lastAck || dev.lastActive || new Date(),
          faultDescription: dev.faultDescription || null,
        };
        if (cleanDev.description === '' || cleanDev.description === null) {
          delete cleanDev.description;
        }

        const devForceOn = Boolean(dev.forceOn);
        const devForceOff = Boolean(dev.forceOff);
        const devMotorStatus = devForceOn ? 'ON' : (devForceOff ? 'OFF' : (dev.motorStatus || (latest ? latest.motorStatus : (rt?.motorStatus ?? 'OFF'))));

        cleanDev.motorStatus = devMotorStatus;
        cleanDev.forceOn = devForceOn;
        cleanDev.forceOff = devForceOff;

        if (!hasTelemetry) {
          return cleanDev;
        }

        const cap = latest?.tankCapacity || dev.tankCapacity || null;
        const con = latest?.waterConsumption !== undefined ? latest.waterConsumption : (rt?.waterConsumption ?? null);
        let wl = latest?.waterLevel !== undefined ? latest.waterLevel : (rt?.waterLevel ?? null);
        if (wl === null && cap && con !== null && cap > 0) {
          wl = Math.min(100, Math.max(0, Math.round((con / cap) * 100)));
        }

        const wlStatus = latest?.waterLevelStatus || rt?.waterLevelStatus || (wl !== null ? (wl < 25 ? 'Low' : wl > 75 ? 'High' : 'Medium') : null);

        return {
          ...cleanDev,
          data: {
            voltage: latest?.voltage !== undefined ? latest.voltage : (rt?.voltage ?? null),
            current: latest?.current !== undefined ? latest.current : (rt?.current ?? null),
            vol1: latest?.vol1 !== undefined ? latest.vol1 : (rt?.vol1 ?? null),
            vol2: latest?.vol2 !== undefined ? latest.vol2 : (rt?.vol2 ?? null),
            vol3: latest?.vol3 !== undefined ? latest.vol3 : (rt?.vol3 ?? null),
            cu1: latest?.cu1 !== undefined ? latest.cu1 : (rt?.cu1 ?? null),
            cu2: latest?.cu2 !== undefined ? latest.cu2 : (rt?.cu2 ?? null),
            cu3: latest?.cu3 !== undefined ? latest.cu3 : (rt?.cu3 ?? null),
            power: latest?.power !== undefined ? latest.power : (rt?.power ?? null),
            powerFactor: latest?.powerFactor !== undefined ? latest.powerFactor : (rt?.powerFactor ?? null),
            frequency: latest?.frequency !== undefined ? latest.frequency : (rt?.frequency ?? null),
            waterLevelStatus: wlStatus,
            sumpTank: latest?.sumpTank || rt?.sumpTank || null,
            overheadTank: latest?.overheadTank || rt?.overheadTank || null,
            ...(cleanDev.tankCapacity !== undefined && cleanDev.tankCapacity !== null ? { tankCapacity: cap } : {}),
            waterConsumption: con,
            waterLevel: wl,
            motorStatus: devMotorStatus,
            forceOn: devForceOn,
            forceOff: devForceOff,
            energyConsumption: latest ? latest.energyConsumption : (rt?.energyConsumption ?? 0),
            deviceStatus: devStatus,
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

    const devForceOn = Boolean(device.forceOn);
    const devForceOff = Boolean(device.forceOff);
    const devMotorStatus = devForceOn ? 'ON' : (devForceOff ? 'OFF' : (device.motorStatus || (latest ? latest.motorStatus : (rt?.motorStatus ?? 'OFF'))));

    cleanDev.motorStatus = devMotorStatus;
    cleanDev.forceOn = devForceOn;
    cleanDev.forceOff = devForceOff;

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
          motorStatus: devMotorStatus,
          forceOn: devForceOn,
          forceOff: devForceOff,
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
 * Regular user: Unlinks device from account (removes only for user, preserves hardware for admin)
 * Admin: Permanently deletes device and associated telemetry history
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

    const isAdmin = req.user && String(req.user.role || '').toUpperCase() === 'ADMIN';

    let targetDevice;
    if (String(rawId).match(/^[0-9a-fA-F]{24}$/)) {
      targetDevice = await Device.findById(rawId);
    } else {
      const cleanId = String(rawId).trim().toUpperCase();
      targetDevice = await Device.findOne({ deviceId: cleanId });
    }

    if (!targetDevice) {
      return res.status(404).json({
        success: false,
        message: `Device '${rawId}' not found`,
      });
    }

    // USER DELETION: Soft unlink!
    // The device is removed only from the user's account and remains intact in inventory for Admin.
    // The user (or another user) can re-register the same device later.
    if (!isAdmin) {
      if (targetDevice.assignedUserId && req.user && !targetDevice.assignedUserId.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to remove a device assigned to another user account',
        });
      }

      targetDevice.assignedUserId = null;
      targetDevice.approvalStatus = 'PENDING';
      targetDevice.isApproved = false;
      targetDevice.registrationSource = 'ADMIN_PROVISIONED';
      targetDevice.rejectionReason = null;
      targetDevice.requestedAt = null;
      targetDevice.approvedBy = null;
      targetDevice.approvedAt = null;
      await targetDevice.save();

      try {
        const DeviceInventory = require('../models/DeviceInventory');
        await DeviceInventory.updateOne(
          { deviceId: targetDevice.deviceId },
          { $set: { status: 'AVAILABLE', registeredUserId: null, registeredAt: null } }
        );
      } catch (invErr) {
        console.warn('Failed to update DeviceInventory on user unlinking device:', invErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Device '${targetDevice.deviceId}' removed from your account. The hardware remains in inventory.`,
        data: targetDevice,
      });
    }

    // ADMIN DELETION: Remove hardware device from active collection
    await Device.findByIdAndDelete(targetDevice._id);

    // IMPORTANT: Per system requirement ("on admin panel History tab show all device history not delete any history show all"),
    // DO NOT delete SensorData or MotorHistory records!
    // Historical telemetry and motor logs are preserved forever so Admin can view full history.

    try {
      const DeviceInventory = require('../models/DeviceInventory');
      await DeviceInventory.deleteOne({ deviceId: targetDevice.deviceId });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: `Device '${targetDevice.deviceId}' removed from active inventory. All historical telemetry records remain preserved.`,
      data: targetDevice,
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

/**
 * POST /api/device/claim
 * Allows a registered user to claim / register a manufactured device by ID (provided by admin)
 */
exports.claimDevice = async (req, res) => {
  try {
    const { deviceId, name, location } = req.body;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required to register and claim a device',
      });
    }

    const cleanId = String(deviceId).trim().toUpperCase();
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to claim a device',
      });
    }

    // 1. Check if device already exists in Device collection (created/provisioned by admin)
    let device = await Device.findOne({ deviceId: cleanId });

    // 2. Check if device exists in manufactured DeviceInventory (provisioned by admin)
    const DeviceInventory = require('../models/DeviceInventory');
    const inventoryItem = await DeviceInventory.findOne({ deviceId: cleanId });

    // REQUIREMENT: Device ID cannot be randomly added by user. Must be created by admin!
    if (!device && !inventoryItem) {
      return res.status(404).json({
        success: false,
        message: `Device ID '${cleanId}' was not recognized. You can only register a Device ID created and provided by your Administrator.`,
      });
    }

    if (device) {
      // Check if already claimed and approved for someone else
      if (device.assignedUserId && !device.assignedUserId.equals(userId) && device.approvalStatus === 'APPROVED') {
        const isUserAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
        if (!isUserAdmin) {
          return res.status(409).json({
            success: false,
            message: `Device '${cleanId}' is already registered and assigned to another user account. Contact your administrator.`,
          });
        }
      }

      // Check if already registered by the same user
      if (device.assignedUserId && device.assignedUserId.equals(userId)) {
        if (device.approvalStatus === 'PENDING') {
          return res.status(200).json({
            success: true,
            message: `Your registration request for Device '${cleanId}' has already been submitted and is pending Administrator approval.`,
            data: device,
          });
        }
        if (device.approvalStatus === 'APPROVED') {
          return res.status(200).json({
            success: true,
            message: `Device '${cleanId}' is already registered and approved for your account.`,
            data: device,
          });
        }
      }

      device.assignedUserId = userId;
      device.registrationSource = 'USER_REGISTERED';
      device.approvalStatus = 'PENDING';
      device.isApproved = false;
      device.requestedAt = new Date();
      device.rejectionReason = null;
      if (name && String(name).trim()) device.name = String(name).trim();
      if (location && String(location).trim()) device.location = String(location).trim();
      device.lastActive = new Date();
      await device.save();

      // If also tracked in DeviceInventory, update its status
      if (inventoryItem) {
        inventoryItem.status = 'UNREGISTERED';
        inventoryItem.registeredUserId = userId;
        inventoryItem.registeredAt = new Date();
        await inventoryItem.save();
      }

      return res.status(200).json({
        success: true,
        message: `Registration request for Device '${cleanId}' submitted successfully! Awaiting Administrator approval before appearing on your dashboard.`,
        data: device,
      });
    }

    // If device exists in DeviceInventory (provisioned by admin)
    if (inventoryItem.status === 'REGISTERED' && inventoryItem.registeredUserId && !inventoryItem.registeredUserId.equals(userId)) {
      const isUserAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
      if (!isUserAdmin) {
        return res.status(409).json({
          success: false,
          message: `Device '${cleanId}' is already registered to another user account. Contact your administrator.`,
        });
      }
    }

    let modelNumber = inventoryItem.manufacturingModelNumber || 'SG-1PS-1.5';
    let modelName = 'Single Phase Submersible';
    let motorType = 'Single Phase Submersible';
    let motorCapacity = '0.5 – 1.5 HP';
    let phase = 'Single Phase';

    inventoryItem.registeredUserId = userId;
    inventoryItem.registeredAt = new Date();
    await inventoryItem.save();

    const modelCfg = getModelConfig(modelNumber);
    const resolvedTanks = {
      overhead: {
        configured: modelCfg ? modelCfg.tanks.overhead.supported : true,
        capacity: 1000,
        name: 'Overhead Tank',
        location: location || 'Rooftop',
      },
      sump: {
        configured: modelCfg ? modelCfg.tanks.sump.supported : false,
        capacity: modelCfg?.tanks?.sump?.supported ? 1000 : null,
        name: 'Sump Tank',
        location: location || 'Ground',
      },
    };

    device = new Device({
      deviceId: cleanId,
      name: name && String(name).trim() ? String(name).trim() : `Pump Controller ${cleanId}`,
      location: location && String(location).trim() ? String(location).trim() : 'Main Facility',
      modelNumber,
      modelName,
      motorType,
      motorCapacity,
      phase,
      tanks: resolvedTanks,
      tankCapacity: 1000,
      assignedUserId: userId,
      registrationSource: 'USER_REGISTERED',
      approvalStatus: 'PENDING',
      isApproved: false,
      requestedAt: new Date(),
      status: 'Active',
      deviceStatus: 'Active',
      lastActive: new Date(),
    });

    await device.save();

    return res.status(201).json({
      success: true,
      message: `Registration request for Device '${cleanId}' submitted successfully! Awaiting Administrator approval before appearing on your dashboard.`,
      data: device,
    });
  } catch (err) {
    console.error('[/api/device/claim error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to claim device',
      error: err.message,
    });
  }
};

/**
 * GET /api/device/user-registered-devices
 * Returns all devices registered/requested by users with owner/user details populated (Admin only)
 * NOTE: Devices created by Admin do NOT appear here. Only devices requested by standard users appear here.
 */
exports.getUserRegisteredDevices = async (req, res) => {
  try {
    // Only query devices requested/registered by users (NOT standalone admin devices)
    const filter = {
      registrationSource: 'USER_REGISTERED',
      assignedUserId: { $ne: null },
    };

    const devices = await Device.find(filter)
      .populate('assignedUserId', 'name email username phone mobileNumber location role')
      .populate('approvedBy', 'name email')
      .sort({ requestedAt: -1, createdAt: -1 })
      .lean();

    // Filter out any devices where assigned user is an Admin
    const userOnlyDevices = devices.filter((d) => {
      const u = d.assignedUserId;
      if (!u) return false;
      const role = String(u.role || '').toUpperCase();
      return role !== 'ADMIN';
    });

    const formatted = userOnlyDevices.map((d) => {
      const u = d.assignedUserId;
      const apprBy = d.approvedBy;
      return {
        _id: d._id,
        deviceId: d.deviceId,
        name: d.name,
        location: d.location,
        modelNumber: d.modelNumber || 'Legacy',
        modelName: d.modelName || 'Standard Controller',
        status: d.deviceStatus || d.status || 'Active',
        operatingMode: d.operatingMode || 'MANUAL',
        registrationSource: d.registrationSource || 'USER_REGISTERED',
        approvalStatus: d.approvalStatus || (d.isApproved ? 'APPROVED' : 'PENDING'),
        isApproved: Boolean(d.isApproved),
        requestedAt: d.requestedAt || d.createdAt,
        approvedAt: d.approvedAt || null,
        approvedBy: apprBy ? { name: apprBy.name, email: apprBy.email } : null,
        rejectionReason: d.rejectionReason || null,
        assignedUser: u ? {
          id: u._id,
          name: u.name,
          email: u.email,
          username: u.username,
          phone: u.phone || u.mobileNumber || '',
          location: u.location || '',
        } : null,
        createdAt: d.createdAt,
        lastActive: d.lastActive || d.lastAck || d.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error('[/api/device/user-registered-devices error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered devices',
      error: err.message,
    });
  }
};

/**
 * PUT /api/device/user-registered-devices/:id/approve
 * Admin approves/accepts a user device registration request
 */
exports.approveUserDevice = async (req, res) => {
  try {
    const { id } = req.params;
    let device;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      device = await Device.findById(id);
    }
    if (!device) {
      device = await Device.findOne({ deviceId: String(id).trim().toUpperCase() });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    device.approvalStatus = 'APPROVED';
    device.isApproved = true;
    device.approvedAt = new Date();
    device.approvedBy = req.user?._id || null;
    device.status = 'Active';
    device.deviceStatus = 'Active';
    device.rejectionReason = null;
    device.lastActive = new Date();
    await device.save();

    // Also update DeviceInventory if present
    try {
      const DeviceInventory = require('../models/DeviceInventory');
      await DeviceInventory.updateOne(
        { deviceId: device.deviceId },
        {
          $set: {
            status: 'REGISTERED',
            registeredUserId: device.assignedUserId,
            registeredAt: new Date(),
          },
        }
      );
    } catch (invErr) {
      console.warn('Inventory update notice in approveUserDevice:', invErr.message);
    }

    await device.populate('assignedUserId', 'name email username phone mobileNumber location');

    return res.status(200).json({
      success: true,
      message: `Device '${device.deviceId}' registration has been ACCEPTED! The user can now access details and live telemetry on their dashboard.`,
      data: device,
    });
  } catch (err) {
    console.error('[/api/device/user-registered-devices/:id/approve error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve device registration',
      error: err.message,
    });
  }
};

/**
 * PUT /api/device/user-registered-devices/:id/reject
 * Admin rejects a user device registration request
 */
exports.rejectUserDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    let device;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      device = await Device.findById(id);
    }
    if (!device) {
      device = await Device.findOne({ deviceId: String(id).trim().toUpperCase() });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    device.approvalStatus = 'REJECTED';
    device.isApproved = false;
    device.status = 'INACTIVE';
    device.rejectionReason = reason ? String(reason).trim() : 'Registration request rejected by Administrator';
    await device.save();

    await device.populate('assignedUserId', 'name email username phone mobileNumber location');

    return res.status(200).json({
      success: true,
      message: `Device '${device.deviceId}' registration request has been REJECTED.`,
      data: device,
    });
  } catch (err) {
    console.error('[/api/device/user-registered-devices/:id/reject error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject device registration',
      error: err.message,
    });
  }
};

/**
 * POST /api/device/:id/force-on
 * Overrides motor status to ON. When forceOn is true:
 * - forceOn is set to true
 * - forceOff is set to false
 * - motorStatus is set to ON
 */
exports.forceDeviceMotorOn = async (req, res) => {
  try {
    const rawId = req.params?.id || req.body?.deviceId || req.query?.deviceId;
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    let device = null;
    if (String(rawId).match(/^[0-9a-fA-F]{24}$/)) {
      device = await Device.findById(rawId);
    }
    if (!device) {
      device = await Device.findOne({ deviceId: String(rawId).trim().toUpperCase() });
    }
    if (!device) {
      return res.status(404).json({ success: false, message: `Device '${rawId}' not found` });
    }

    device.forceOn = true;
    device.forceOff = false;
    device.motorStatus = 'ON';
    device.lastActive = new Date();
    await device.save();

    await iotService.executeMotorCommand('ON', req.body?.source || 'device_force_on', device.deviceId);

    return res.status(200).json({
      success: true,
      message: `Force ON successfully executed for device ${device.deviceId}`,
      data: device,
    });
  } catch (error) {
    console.error('[/api/device/:id/force-on error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute Force ON for device',
    });
  }
};

/**
 * POST /api/device/:id/force-off
 * Overrides motor status to OFF. When forceOff is true:
 * - forceOff is set to true
 * - forceOn is set to false
 * - motorStatus is set to OFF
 */
exports.forceDeviceMotorOff = async (req, res) => {
  try {
    const rawId = req.params?.id || req.body?.deviceId || req.query?.deviceId;
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    let device = null;
    if (String(rawId).match(/^[0-9a-fA-F]{24}$/)) {
      device = await Device.findById(rawId);
    }
    if (!device) {
      device = await Device.findOne({ deviceId: String(rawId).trim().toUpperCase() });
    }
    if (!device) {
      return res.status(404).json({ success: false, message: `Device '${rawId}' not found` });
    }

    device.forceOff = true;
    device.forceOn = false;
    device.motorStatus = 'OFF';
    device.lastActive = new Date();
    await device.save();

    await iotService.executeMotorCommand('OFF', req.body?.source || 'device_force_off', device.deviceId);

    return res.status(200).json({
      success: true,
      message: `Force OFF successfully executed for device ${device.deviceId}`,
      data: device,
    });
  } catch (error) {
    console.error('[/api/device/:id/force-off error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute Force OFF for device',
    });
  }
};
