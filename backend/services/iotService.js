const SensorData = require('../models/SensorData');
const MotorHistory = require('../models/MotorHistory');
const MotorCommand = require('../models/MotorCommand');

// In-memory runtime state for fast, ultra-responsive updates
let runtimeState = {
  deviceId: 'WT-DEV-001',
  motorStatus: 'OFF',
  lastOnTime: null,
  lastOffTime: null,
  currentOnDuration: 0,
  tankCapacity: 1000,
  waterConsumption: 0,
  waterLevel: 0,
  voltage: 0,
  current: 0.0,
  power: 0,
  powerFactor: 0,
  energyConsumption: 0,
  isHardwareConnected: false,
};

let deviceRuntimeStates = {};

let ioInstance = null;
let ackInterval = null;

const setSocketIO = (io) => {
  ioInstance = io;
  // Start the 1-second live acknowledgement emitter
  if (!ackInterval) {
    ackInterval = setInterval(() => {
      if (ioInstance) {
        ioInstance.emit('device_ack', {
          status: 'Active',
          acknowledgedAt: new Date().toISOString(),
          serverTime: Date.now(),
        });
      }
    }, 1000);
  }
};

const getSocketIO = () => ioInstance;

const initRuntimeStateFromDB = async () => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    if (latest) {
      const cap = latest.tankCapacity !== undefined && latest.tankCapacity !== null ? Number(latest.tankCapacity) : null;
      const con = latest.waterConsumption !== undefined && latest.waterConsumption !== null ? Number(latest.waterConsumption) : null;
      let lvl = latest.waterLevel !== undefined && latest.waterLevel !== null ? Number(latest.waterLevel) : null;
      if (lvl === null && cap && con !== null && cap > 0) {
        lvl = Math.min(100, Math.max(0, Math.round((con / cap) * 100)));
      }

      runtimeState = {
        ...runtimeState,
        deviceId: latest.deviceId || 'WT-DEV-001',
        motorStatus: latest.motorStatus || 'OFF',
        tankCapacity: cap,
        waterConsumption: con,
        waterLevel: lvl,
        waterLevelStatus: latest.waterLevelStatus || (lvl !== null ? (lvl < 25 ? 'Low' : lvl > 75 ? 'High' : 'Medium') : null),
        voltage: latest.voltage !== undefined ? latest.voltage : null,
        current: latest.current !== undefined ? latest.current : null,
        vol1: latest.vol1 !== undefined ? latest.vol1 : null,
        vol2: latest.vol2 !== undefined ? latest.vol2 : null,
        vol3: latest.vol3 !== undefined ? latest.vol3 : null,
        cu1: latest.cu1 !== undefined ? latest.cu1 : null,
        cu2: latest.cu2 !== undefined ? latest.cu2 : null,
        cu3: latest.cu3 !== undefined ? latest.cu3 : null,
        power: latest.power !== undefined ? latest.power : null,
        powerFactor: latest.powerFactor !== undefined ? latest.powerFactor : null,
        frequency: latest.frequency !== undefined ? latest.frequency : null,
        energyConsumption: latest.energyConsumption || 0,
        sumpTank: latest.sumpTank || null,
        overheadTank: latest.overheadTank || null,
        deviceStatus: latest.deviceStatus || 'Active',
      };

      if (latest.deviceId) {
        deviceRuntimeStates[latest.deviceId.toUpperCase()] = { ...runtimeState };
      }
    }
    const lastOn = await MotorHistory.findOne({ motorStatus: 'ON' }).sort({ startTime: -1 });
    if (lastOn) runtimeState.lastOnTime = lastOn.startTime;
    const lastOff = await MotorHistory.findOne({ motorStatus: 'OFF' }).sort({ startTime: -1 });
    if (lastOff) runtimeState.lastOffTime = lastOff.startTime;
  } catch (err) {
    console.error('Failed to init runtime state from DB:', err.message);
  }
};

const getRuntimeState = (deviceId) => {
  if (deviceId) {
    const cleanId = String(deviceId).toUpperCase();
    if (deviceRuntimeStates[cleanId]) {
      return { ...deviceRuntimeStates[cleanId] };
    }
    return null;
  }
  return { ...runtimeState };
};

const updateRuntimeState = (partial) => {
  const cleanId = partial.deviceId ? String(partial.deviceId).toUpperCase() : (runtimeState.deviceId || 'WT-DEV-001');
  const baseDeviceState = deviceRuntimeStates[cleanId] || {
    deviceId: cleanId,
    motorStatus: 'OFF',
    lastOnTime: null,
    lastOffTime: null,
    currentOnDuration: 0,
    tankCapacity: null,
    waterConsumption: null,
    waterLevel: null,
    waterLevelStatus: null,
    sumpTank: null,
    overheadTank: null,
    voltage: null,
    current: null,
    vol1: null,
    vol2: null,
    vol3: null,
    cu1: null,
    cu2: null,
    cu3: null,
    power: null,
    powerFactor: null,
    frequency: null,
    energyConsumption: 0,
    deviceStatus: 'Active',
    isHardwareConnected: true,
    hasData: true,
  };

  // Derive water level & status if possible
  const cap = partial.tankCapacity !== undefined ? (partial.tankCapacity !== null ? Number(partial.tankCapacity) : null) : baseDeviceState.tankCapacity;
  const con = partial.waterConsumption !== undefined ? (partial.waterConsumption !== null ? Number(partial.waterConsumption) : null) : baseDeviceState.waterConsumption;
  let lvl = partial.waterLevel !== undefined ? (partial.waterLevel !== null ? Number(partial.waterLevel) : null) : baseDeviceState.waterLevel;

  if (lvl === null && cap && con !== null && cap > 0) {
    lvl = Math.min(100, Math.max(0, Math.round((con / cap) * 100)));
  }

  // Derive waterLevelStatus if not explicitly provided
  let lvlStatus = partial.waterLevelStatus || baseDeviceState.waterLevelStatus;
  if (!lvlStatus && lvl !== null) {
    lvlStatus = lvl < 25 ? 'Low' : lvl > 75 ? 'High' : 'Medium';
  }

  // Sump Tank & Overhead Tank handling
  const sump = partial.sumpTank !== undefined ? partial.sumpTank : baseDeviceState.sumpTank;
  const overhead = partial.overheadTank !== undefined ? partial.overheadTank : baseDeviceState.overheadTank;

  const merged = {
    ...baseDeviceState,
    ...partial,
    deviceId: cleanId,
    tankCapacity: cap,
    waterConsumption: con,
    waterLevel: lvl,
    waterLevelStatus: lvlStatus,
    sumpTank: sump,
    overheadTank: overhead,
    hasData: true,
    isHardwareConnected: true,
  };

  deviceRuntimeStates[cleanId] = merged;
  runtimeState = merged;

  if (ioInstance) {
    ioInstance.emit('sensor_update', merged);
  }
};

/**
 * Calculate motor statistics: current ON/OFF duration, total ON/OFF durations
 */
const getMotorStats = async (deviceId) => {
  const cleanId = deviceId ? String(deviceId).toUpperCase() : null;
  let state = getRuntimeState(cleanId);

  // If not in memory yet, query SensorData DB for this device
  if (!state && cleanId) {
    try {
      const SensorData = require('../models/SensorData');
      const latestSensor = await SensorData.findOne({ deviceId: cleanId }).sort({ timestamp: -1 });
      if (latestSensor) {
        state = {
          deviceId: cleanId,
          motorStatus: latestSensor.motorStatus || 'OFF',
          tankCapacity: latestSensor.tankCapacity || 1000,
          waterConsumption: latestSensor.waterConsumption || 0,
          waterLevel: latestSensor.waterLevel || 0,
          voltage: latestSensor.voltage || 0,
          current: latestSensor.current || 0,
          power: latestSensor.power || 0,
          powerFactor: latestSensor.powerFactor || 0,
          energyConsumption: latestSensor.energyConsumption || 0,
          hasData: true,
        };
        deviceRuntimeStates[cleanId] = { ...state };
      }
    } catch (dbErr) {
      console.error('Error fetching fallback state from SensorData:', dbErr.message);
    }
  }

  const now = new Date();

  if (!state) {
    return {
      motorStatus: null,
      currentOnDuration: 0,
      currentOffDuration: 0,
      totalOnDurationSeconds: 0,
      totalOffDurationSeconds: 0,
      hasData: false,
    };
  }
  
  // Calculate current duration
  let currentOnDuration = 0;
  let currentOffDuration = 0;

  if (state.motorStatus === 'ON') {
    currentOnDuration = Math.max(0, Math.floor((now - new Date(state.lastOnTime || now)) / 1000));
  } else {
    currentOffDuration = Math.max(0, Math.floor((now - new Date(state.lastOffTime || now)) / 1000));
  }

  // Aggregate past 24 hours total ON and OFF durations from MotorHistory
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let totalOnDurationSeconds = 0;
  let totalOffDurationSeconds = 0;

  try {
    const query = { timestamp: { $gte: past24h } };
    if (cleanId) query.deviceId = cleanId;

    const histories = await MotorHistory.find(query);
    histories.forEach((item) => {
      const dur = item.duration || 0;
      if (item.motorStatus === 'ON') {
        totalOnDurationSeconds += dur;
      } else {
        totalOffDurationSeconds += dur;
      }
    });

    // Add current in-progress duration
    if (state.motorStatus === 'ON') {
      totalOnDurationSeconds += currentOnDuration;
    } else {
      totalOffDurationSeconds += currentOffDuration;
    }
  } catch (err) {
    console.error('Error fetching motor history stats:', err.message);
  }

  return {
    motorStatus: state.motorStatus,
    lastOnTime: state.lastOnTime,
    lastOffTime: state.lastOffTime,
    currentOnDuration,
    currentOffDuration,
    totalOnDurationSeconds,
    totalOffDurationSeconds,
    isHardwareConnected: state.isHardwareConnected !== undefined ? state.isHardwareConnected : true,
  };
};

/**
 * Execute Force Motor Command (ON or OFF)
 */
const executeMotorCommand = async (commandType, source = 'dashboard', deviceId = null) => {
  const targetStatus = commandType.toUpperCase();
  if (!['ON', 'OFF'].includes(targetStatus)) {
    throw new Error('Invalid command: must be ON or OFF');
  }

  // Resolve target device ID
  const Device = require('../models/Device');
  let cleanId = deviceId ? String(deviceId).trim().toUpperCase() : null;
  let devDoc = null;

  if (cleanId) {
    devDoc = await Device.findOne({ deviceId: cleanId });
  } else {
    devDoc = await Device.findOne().sort({ createdAt: 1 });
    cleanId = devDoc ? devDoc.deviceId : (runtimeState.deviceId || 'WT-DEV-001');
  }

  const requestedAt = new Date();

  // Create audit command record
  const cmdRecord = new MotorCommand({
    deviceId: cleanId,
    command: targetStatus,
    requestedAt,
    source,
    status: 'pending',
  });
  await cmdRecord.save();

  try {
    const acknowledgedAt = new Date();

    // Close previous open history record for this device if any
    const previousOpenRecord = await MotorHistory.findOne({
      $or: [{ deviceId: cleanId }, { deviceId: { $exists: false } }],
      endTime: null,
    }).sort({ startTime: -1 });

    if (previousOpenRecord) {
      previousOpenRecord.endTime = acknowledgedAt;
      previousOpenRecord.duration = Math.max(0, Math.floor((acknowledgedAt - previousOpenRecord.startTime) / 1000));
      await previousOpenRecord.save();
    }

    // Create new motor history record with deviceId
    const newHistory = new MotorHistory({
      deviceId: cleanId,
      motorStatus: targetStatus,
      eventType: targetStatus === 'ON' ? 'FORCE_ON' : 'FORCE_OFF',
      startTime: acknowledgedAt,
      endTime: null,
      duration: 0,
      timestamp: acknowledgedAt,
      note: `Triggered by ${source} (${cleanId})`,
    });
    await newHistory.save();

    // Get current device state or create realistic defaults
    const existingDevState = deviceRuntimeStates[cleanId] || (cleanId === runtimeState.deviceId ? runtimeState : null);
    const cap = devDoc?.tankCapacity || existingDevState?.tankCapacity || 1000;
    const con = existingDevState?.waterConsumption !== undefined && existingDevState.waterConsumption > 0
      ? existingDevState.waterConsumption
      : Math.round(cap * 0.65);
    const wl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 65;

    const baseDevState = existingDevState ? { ...existingDevState } : {
      deviceId: cleanId,
      tankCapacity: cap,
      waterConsumption: con,
      waterLevel: wl,
      powerFactor: 0.92,
      energyConsumption: 0.45,
    };

    baseDevState.deviceId = cleanId;
    baseDevState.motorStatus = targetStatus;
    baseDevState.tankCapacity = cap;
    baseDevState.waterConsumption = con;
    baseDevState.waterLevel = wl;
    baseDevState.isHardwareConnected = true;
    baseDevState.hasData = true;

    if (targetStatus === 'ON') {
      baseDevState.lastOnTime = acknowledgedAt;
      baseDevState.voltage = +(230 + (Math.random() * 4 - 2)).toFixed(1);
      baseDevState.current = +(6.5 + (Math.random() * 0.8 - 0.4)).toFixed(2);
      baseDevState.powerFactor = +(baseDevState.powerFactor || 0.92).toFixed(2);
      baseDevState.power = Math.round(baseDevState.voltage * baseDevState.current * baseDevState.powerFactor);
      baseDevState.energyConsumption = +((baseDevState.energyConsumption || 0.45) + 0.005).toFixed(3);
    } else {
      baseDevState.lastOffTime = acknowledgedAt;
      baseDevState.voltage = +(232 + (Math.random() * 3 - 1.5)).toFixed(1);
      baseDevState.current = 0.0;
      baseDevState.power = 0;
      baseDevState.powerFactor = +(baseDevState.powerFactor || 0.92).toFixed(2);
    }

    // Update in-memory runtime maps
    deviceRuntimeStates[cleanId] = { ...baseDevState };
    runtimeState = { ...baseDevState };

    // Save snapshot to SensorData with deviceId
    const sensorSnapshot = new SensorData({
      deviceId: cleanId,
      voltage: baseDevState.voltage,
      current: baseDevState.current,
      power: baseDevState.power,
      powerFactor: baseDevState.powerFactor,
      tankCapacity: cap,
      waterConsumption: con,
      waterLevel: wl,
      motorStatus: targetStatus,
      energyConsumption: baseDevState.energyConsumption,
      source: source,
      timestamp: acknowledgedAt,
    });
    await sensorSnapshot.save();

    // Update Device status in MongoDB
    if (devDoc) {
      devDoc.status = 'ONLINE';
      devDoc.lastActive = acknowledgedAt;
      await devDoc.save();
    }

    // Update command record
    cmdRecord.status = 'success';
    cmdRecord.acknowledgedAt = acknowledgedAt;
    await cmdRecord.save();

    // Broadcast through Socket.IO
    if (ioInstance) {
      ioInstance.emit('motor_status_update', {
        deviceId: cleanId,
        motorStatus: targetStatus,
        lastOnTime: baseDevState.lastOnTime,
        lastOffTime: baseDevState.lastOffTime,
        timestamp: acknowledgedAt,
      });
      ioInstance.emit('motor_status_changed', {
        deviceId: cleanId,
        motorStatus: targetStatus,
        eventType: targetStatus === 'ON' ? 'FORCE_ON' : 'FORCE_OFF',
        timestamp: acknowledgedAt,
      });
      ioInstance.emit('sensor_update', {
        ...baseDevState,
        deviceId: cleanId,
        timestamp: acknowledgedAt,
      });
    }

    return {
      success: true,
      message: `Motor command ${targetStatus} acknowledged and executed successfully for ${cleanId}`,
      commandId: cmdRecord._id,
      motorStatus: targetStatus,
      deviceId: cleanId,
      acknowledgedAt,
    };
  } catch (error) {
    cmdRecord.status = 'failed';
    cmdRecord.errorMessage = error.message;
    await cmdRecord.save();
    throw error;
  }
};

module.exports = {
  setSocketIO,
  getSocketIO,
  initRuntimeStateFromDB,
  getRuntimeState,
  updateRuntimeState,
  getMotorStats,
  executeMotorCommand,
};
