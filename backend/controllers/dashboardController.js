const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const iotService = require('../services/iotService');

exports.getDashboardOverview = async (req, res) => {
  try {
    const requestedDeviceId = req.query.deviceId ? String(req.query.deviceId).trim().toUpperCase() : null;
    const isUserRegular = req.user && !['ADMIN', 'OPERATOR'].includes(String(req.user.role).toUpperCase());

    // Find device info if requested, scoped to user if regular user
    let deviceDoc = null;
    let targetDeviceId = requestedDeviceId;

    if (isUserRegular) {
      const Device = require('../models/Device');
      const approvedFilter = {
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      };

      if (targetDeviceId) {
        deviceDoc = await Device.findOne({ deviceId: targetDeviceId, ...approvedFilter });
      }
      if (!deviceDoc) {
        deviceDoc = await Device.findOne(approvedFilter).sort({ createdAt: 1 });
      }
      if (deviceDoc) {
        targetDeviceId = deviceDoc.deviceId;
      } else {
        // Regular user has no approved devices yet
        return res.status(200).json({
          success: true,
          data: {
            device: null,
            system: {
              name: 'WaterTank System',
              status: 'STANDBY',
              timestamp: new Date(),
              isHardwareConnected: false,
            },
            hasData: false,
            isUserEmpty: true,
            message: 'No approved device has been assigned to your account yet. If you have registered a device ID, it is pending administrator approval.',
            powerMetrics: {
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
              frequency: 50.0,
              energy: null,
            },
            waterTank: {
              levelPercentage: null,
              capacityLiters: 1000,
              currentLiters: null,
              tankCapacity: 1000,
              waterConsumption: null,
              waterLevelStatus: null,
              sumpTank: null,
              overheadTank: null,
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
    } else {
      // Admin / anonymous overview
      if (targetDeviceId) {
        deviceDoc = await Device.findOne({ deviceId: targetDeviceId });
      } else {
        // Default to first registered device
        deviceDoc = await Device.findOne().sort({ createdAt: 1 });
        if (deviceDoc) {
          targetDeviceId = deviceDoc.deviceId;
        }
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
            vol1: null,
            vol2: null,
            vol3: null,
            cu1: null,
            cu2: null,
            cu3: null,
            power: null,
            powerFactor: null,
            frequency: 50.0,
            energy: null,
          },
          waterTank: {
            levelPercentage: null,
            capacityLiters: deviceDoc?.tankCapacity || null,
            currentLiters: null,
            tankCapacity: deviceDoc?.tankCapacity || null,
            waterConsumption: null,
            waterLevelStatus: null,
            sumpTank: null,
            overheadTank: null,
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
      vol1: latestRecord.vol1,
      vol2: latestRecord.vol2,
      vol3: latestRecord.vol3,
      cu1: latestRecord.cu1,
      cu2: latestRecord.cu2,
      cu3: latestRecord.cu3,
      power: latestRecord.power,
      powerFactor: latestRecord.powerFactor,
      frequency: latestRecord.frequency !== undefined && latestRecord.frequency !== null ? latestRecord.frequency : 50.0,
      tankCapacity: latestRecord.tankCapacity || deviceDoc?.tankCapacity || null,
      waterConsumption: latestRecord.waterConsumption || 0,
      waterLevelStatus: latestRecord.waterLevelStatus || null,
      sumpTank: latestRecord.sumpTank || null,
      overheadTank: latestRecord.overheadTank || null,
      motorStatus: latestRecord.motorStatus || 'OFF',
      energyConsumption: latestRecord.energyConsumption || 0,
      deviceId: latestRecord.deviceId || targetDeviceId,
    } : {
      ...runtimeState,
      deviceId: targetDeviceId,
      tankCapacity: deviceDoc?.tankCapacity || runtimeState.tankCapacity || null,
      frequency: runtimeState.frequency !== undefined && runtimeState.frequency !== null ? runtimeState.frequency : 50.0,
    };

    const cap = activeState.tankCapacity || null;
    const con = activeState.waterConsumption !== undefined ? activeState.waterConsumption : null;
    const levelPercentage = (cap && cap > 0 && con !== null) ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : (latestRecord?.waterLevel ?? (runtimeState?.waterLevel ?? null));

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

    const resolvedWlStatus = activeState.waterLevelStatus || (levelPercentage !== null ? (levelPercentage < 25 ? 'Low' : levelPercentage > 75 ? 'High' : 'Medium') : null);

    return res.status(200).json({
      success: true,
      data: {
        device: {
          deviceId: targetDeviceId || 'WT-DEV-001',
          name: deviceDoc?.name || 'WaterTank Pump Controller',
          location: deviceDoc?.location || 'Main Tank',
          status: deviceDoc?.status || 'ONLINE',
          deviceStatus: deviceDoc?.deviceStatus || (deviceDoc?.status === 'Fault' ? 'Fault' : 'Active'),
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
          vol1: activeState.vol1 || null,
          vol2: activeState.vol2 || null,
          vol3: activeState.vol3 || null,
          cu1: activeState.cu1 || null,
          cu2: activeState.cu2 || null,
          cu3: activeState.cu3 || null,
          power: activeState.power,
          powerFactor: activeState.powerFactor,
          frequency: activeState.frequency !== undefined && activeState.frequency !== null ? activeState.frequency : 50.0,
          energy: activeState.energyConsumption !== undefined && activeState.energyConsumption !== null
            ? +Number(activeState.energyConsumption).toFixed(2)
            : +totalEnergy.toFixed(2),
        },
        waterTank: {
          levelPercentage: levelPercentage,
          capacityLiters: cap,
          currentLiters: con,
          tankCapacity: cap,
          waterConsumption: con,
          waterLevelStatus: resolvedWlStatus,
          sumpTank: activeState.sumpTank || null,
          overheadTank: activeState.overheadTank || null,
          status: levelPercentage !== null ? (levelPercentage < 25 ? 'LOW' : levelPercentage > 85 ? 'FULL' : 'NORMAL') : null,
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
