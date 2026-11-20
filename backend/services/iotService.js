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

const setSocketIO = (io) => {
  ioInstance = io;
};

const initRuntimeStateFromDB = async () => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    if (latest) {
      const cap = Number(latest.tankCapacity) || 1000;
      const con = Number(latest.waterConsumption) || 0;
      const lvl = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : (latest.waterLevel || 0);

      runtimeState = {
        ...runtimeState,
        deviceId: latest.deviceId || 'WT-DEV-001',
        motorStatus: latest.motorStatus || 'OFF',
        tankCapacity: cap,
        waterConsumption: con,
        waterLevel: lvl,
        voltage: latest.voltage || 0,
        current: latest.current || 0,
        power: latest.power || 0,
        powerFactor: latest.powerFactor || 0,
        energyConsumption: latest.energyConsumption || 0,
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
    // Return null if no telemetry has been recorded specifically for this device
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
    tankCapacity: 1000,
    waterConsumption: 0,
    waterLevel: 0,
    voltage: 0,
    current: 0.0,
    power: 0,
    powerFactor: 0,
    energyConsumption: 0,
    isHardwareConnected: true,
    hasData: true,
  };

  if (partial.tankCapacity !== undefined || partial.waterConsumption !== undefined) {
    const cap = partial.tankCapacity !== undefined ? Number(partial.tankCapacity) : (baseDeviceState.tankCapacity || 1000);
    const con = partial.waterConsumption !== undefined ? Number(partial.waterConsumption) : (baseDeviceState.waterConsumption || 0);
    partial.tankCapacity = cap;
    partial.waterConsumption = con;
    partial.waterLevel = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
  }

  deviceRuntimeStates[cleanId] = { ...baseDeviceState, ...partial, deviceId: cleanId, hasData: true };
  runtimeState = { ...runtimeState, ...partial, deviceId: cleanId, hasData: true };

  if (ioInstance) {
    ioInstance.emit('sensor_update', deviceRuntimeStates[cleanId]);
  }
};

/**
 * Calculate motor statistics: current ON/OFF duration, total ON/OFF durations
 */
const getMotorStats = async (deviceId) => {
  const cleanId = deviceId ? String(deviceId).toUpperCase() : null;
  const state = getRuntimeState(cleanId);
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
const executeMotorCommand = async (commandType, source = 'dashboard') => {
  const targetStatus = commandType.toUpperCase();
  if (!['ON', 'OFF'].includes(targetStatus)) {
    throw new Error('Invalid command: must be ON or OFF');
  }

  // Prevent redundant identical commands
  if (runtimeState.motorStatus === targetStatus) {
    return {
      success: true,
      message: `Motor is already ${targetStatus}`,
      motorStatus: targetStatus,
      alreadyInState: true,
    };
  }

  const requestedAt = new Date();

  // Create audit command record
  const cmdRecord = new MotorCommand({
    command: targetStatus,
    requestedAt,
    source,
    status: 'pending',
  });
  await cmdRecord.save();

  try {
    // Hardware bridge hook:
    // If real hardware is connected via MQTT/HTTP, dispatch command and await ACK
    // Otherwise acknowledge via simulation controller
    const acknowledgedAt = new Date();

    // Close previous open history record if any
    const previousOpenRecord = await MotorHistory.findOne({ endTime: null }).sort({ startTime: -1 });
    if (previousOpenRecord) {
      previousOpenRecord.endTime = acknowledgedAt;
      previousOpenRecord.duration = Math.max(0, Math.floor((acknowledgedAt - previousOpenRecord.startTime) / 1000));
      await previousOpenRecord.save();
    }

    // Create new motor history record
    const newHistory = new MotorHistory({
      motorStatus: targetStatus,
      eventType: targetStatus === 'ON' ? 'FORCE_ON' : 'FORCE_OFF',
      startTime: acknowledgedAt,
      endTime: null,
      duration: 0,
      timestamp: acknowledgedAt,
      note: `Triggered by ${source}`,
    });
    await newHistory.save();

    // Update runtime state
    if (targetStatus === 'ON') {
      runtimeState.motorStatus = 'ON';
      runtimeState.lastOnTime = acknowledgedAt;
      runtimeState.voltage = 230 + (Math.random() * 4 - 2);
      runtimeState.current = +(6.5 + (Math.random() * 0.8 - 0.4)).toFixed(2);
      runtimeState.power = Math.round(runtimeState.voltage * runtimeState.current * runtimeState.powerFactor);
    } else {
      runtimeState.motorStatus = 'OFF';
      runtimeState.lastOffTime = acknowledgedAt;
      runtimeState.voltage = 232 + (Math.random() * 3 - 1.5);
      runtimeState.current = 0.0;
      runtimeState.power = 0;
    }

    // Save snapshot to SensorData
    const sensorSnapshot = new SensorData({
      voltage: +runtimeState.voltage.toFixed(1),
      current: runtimeState.current,
      power: runtimeState.power,
      powerFactor: runtimeState.powerFactor,
      waterLevel: runtimeState.waterLevel,
      motorStatus: runtimeState.motorStatus,
      energyConsumption: +runtimeState.energyConsumption.toFixed(3),
      source: runtimeState.source,
      timestamp: acknowledgedAt,
    });
    await sensorSnapshot.save();

    // Update command record
    cmdRecord.status = 'success';
    cmdRecord.acknowledgedAt = acknowledgedAt;
    await cmdRecord.save();

    // Broadcast through Socket.IO
    if (ioInstance) {
      ioInstance.emit('motor_status_update', {
        motorStatus: targetStatus,
        lastOnTime: runtimeState.lastOnTime,
        lastOffTime: runtimeState.lastOffTime,
        timestamp: acknowledgedAt,
      });
      ioInstance.emit('sensor_update', runtimeState);
    }

    return {
      success: true,
      message: `Motor command ${targetStatus} acknowledged and executed successfully`,
      commandId: cmdRecord._id,
      motorStatus: targetStatus,
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
  initRuntimeStateFromDB,
  getRuntimeState,
  updateRuntimeState,
  getMotorStats,
  executeMotorCommand,
};
