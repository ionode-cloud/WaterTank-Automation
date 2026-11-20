const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const iotService = require('../services/iotService');

exports.getDashboardOverview = async (req, res) => {
  try {
    const requestedDeviceId = req.query.deviceId ? String(req.query.deviceId).trim().toUpperCase() : null;

    // Find device info if requested
    let deviceDoc = null;
    let targetDeviceId = requestedDeviceId;

    if (targetDeviceId) {
      deviceDoc = await Device.findOne({ deviceId: targetDeviceId });
    } else {
      // Default to first registered device
      deviceDoc = await Device.findOne().sort({ createdAt: 1 });
      if (deviceDoc) {
        targetDeviceId = deviceDoc.deviceId;
      }
    }

    const filter = targetDeviceId ? { deviceId: targetDeviceId } : {};

    // Query latest sensor reading for this device from DB
    const latestRecord = await SensorData.findOne(filter).sort({ timestamp: -1 });
    const runtimeState = iotService.getRuntimeState(targetDeviceId);

    const hasTelemetry = Boolean(latestRecord || (runtimeState && runtimeState.hasData));
    const now = new Date();

    if (!hasTelemetry) {
      return res.status(200).json({
        success: true,
        data: {
          device: {
            deviceId: targetDeviceId || 'WT-DEV-001',
            name: deviceDoc?.name || `Device ${targetDeviceId || 'WT-DEV-001'}`,
            location: deviceDoc?.location || 'Unassigned',
            status: deviceDoc?.status || 'OFFLINE',
          },
          system: {
            name: deviceDoc?.name || 'WaterTank Automation',
            status: 'OFFLINE',
            timestamp: now,
            isHardwareConnected: false,
          },
          hasData: false,
          powerMetrics: {
            voltage: null,
            current: null,
            power: null,
            powerFactor: null,
          },
          waterTank: {
            levelPercentage: null,
            capacityLiters: deviceDoc?.tankCapacity || 1000,
            currentLiters: null,
            tankCapacity: deviceDoc?.tankCapacity || 1000,
            waterConsumption: null,
            status: 'AWAITING_DATA',
          },
          motor: {
            motorStatus: null,
            currentOnDuration: 0,
            currentOffDuration: 0,
            totalOnDurationSeconds: 0,
            totalOffDurationSeconds: 0,
          },
          energy: {
            totalKwh: null,
            todayKwh: null,
            monthlyKwh: null,
          },
        },
      });
    }

    // Merge latest DB record into state if available
    const activeState = latestRecord ? {
      voltage: latestRecord.voltage,
      current: latestRecord.current,
      power: latestRecord.power,
      powerFactor: latestRecord.powerFactor,
      tankCapacity: latestRecord.tankCapacity || deviceDoc?.tankCapacity || 1000,
      waterConsumption: latestRecord.waterConsumption || 0,
      motorStatus: latestRecord.motorStatus || 'OFF',
      energyConsumption: latestRecord.energyConsumption || 0,
      deviceId: latestRecord.deviceId || targetDeviceId,
    } : {
      ...runtimeState,
      deviceId: targetDeviceId,
      tankCapacity: deviceDoc?.tankCapacity || runtimeState.tankCapacity || 1000,
    };

    const cap = activeState.tankCapacity || 1000;
    const con = activeState.waterConsumption || 0;
    const levelPercentage = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;

    const motorStats = await iotService.getMotorStats(targetDeviceId);

    // Calculate Today's Energy & Monthly Energy for this device
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const earliestToday = await SensorData.findOne({ ...filter, timestamp: { $gte: startOfToday } }).sort({ timestamp: 1 });
    const earliestMonth = await SensorData.findOne({ ...filter, timestamp: { $gte: startOfMonth } }).sort({ timestamp: 1 });

    const totalEnergy = activeState.energyConsumption || 0;
    let todayEnergy = 0;
    let monthlyEnergy = 0;

    if (earliestToday) {
      todayEnergy = Math.max(0, +(totalEnergy - earliestToday.energyConsumption).toFixed(2));
    } else {
      todayEnergy = +(totalEnergy).toFixed(2);
    }

    if (earliestMonth) {
      monthlyEnergy = Math.max(todayEnergy, +(totalEnergy - earliestMonth.energyConsumption).toFixed(2));
    } else {
      monthlyEnergy = +(totalEnergy).toFixed(2);
    }

    return res.status(200).json({
      success: true,
      data: {
        device: {
          deviceId: targetDeviceId || 'WT-DEV-001',
          name: deviceDoc?.name || 'WaterTank Pump Controller',
          location: deviceDoc?.location || 'Main Tank',
          status: deviceDoc?.status || 'ONLINE',
        },
        system: {
          name: deviceDoc?.name || 'WaterTank Automation',
          status: 'ONLINE',
          timestamp: now,
          isHardwareConnected: true,
        },
        hasData: true,
        powerMetrics: {
          voltage: activeState.voltage,
          current: activeState.current,
          power: activeState.power,
          powerFactor: activeState.powerFactor,
        },
        waterTank: {
          levelPercentage: levelPercentage,
          capacityLiters: cap,
          currentLiters: con,
          tankCapacity: cap,
          waterConsumption: con,
          status: levelPercentage < 25 ? 'LOW' : levelPercentage > 85 ? 'FULL' : 'NORMAL',
        },
        motor: {
          ...motorStats,
          motorStatus: activeState.motorStatus,
        },
        energy: {
          totalKwh: +totalEnergy.toFixed(2),
          todayKwh: todayEnergy,
          monthlyKwh: monthlyEnergy,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard overview',
      error: error.message,
    });
  }
};
