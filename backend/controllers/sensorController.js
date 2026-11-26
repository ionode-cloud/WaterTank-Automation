const SensorData = require('../models/SensorData');
const iotService = require('../services/iotService');

/**
 * GET /api/sensors/latest
 */
exports.getLatestSensor = async (req, res) => {
  try {
    const runtimeState = iotService.getRuntimeState();
    return res.status(200).json({
      success: true,
      data: runtimeState,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get latest sensor reading',
      error: error.message,
    });
  }
};

/**
 * GET /api/sensors/history
 */
exports.getSensorHistory = async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const history = await SensorData.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history.reverse(), // ascending chronological order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sensor history',
      error: error.message,
    });
  }
};

/**
 * GET /api/water-level/history
 */
exports.getWaterLevelHistory = async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const filter = req.query.deviceId ? { deviceId: req.query.deviceId.toUpperCase() } : {};
    const records = await SensorData.find(filter, 'tankCapacity waterConsumption timestamp')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const formatted = records.reverse().map((r) => {
      const cap = r.tankCapacity || 1000;
      const con = r.waterConsumption || 0;
      const level = cap > 0 ? Math.min(100, Math.max(0, Math.round((con / cap) * 100))) : 0;
      return {
        timestamp: r.timestamp,
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        waterLevel: level,
        tankCapacity: cap,
        waterConsumption: con,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve water level history',
      error: error.message,
    });
  }
};

/**
 * GET /api/power/history
 * Supports range=24h, 7d, 30d or monthly
 */
exports.getPowerHistory = async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    const now = new Date();
    let startDate;

    if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d' || range === 'monthly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // 24h default
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const filter = { timestamp: { $gte: startDate } };
    const isUserAdmin = req.user && String(req.user.role || '').toUpperCase() === 'ADMIN';

    if (!isUserAdmin && req.user) {
      const Device = require('../models/Device');
      const userDevices = await Device.find({
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      }).distinct('deviceId');

      if (req.query.deviceId) {
        const reqDevId = String(req.query.deviceId).trim().toUpperCase();
        if (!userDevices.includes(reqDevId)) {
          return res.status(200).json({ success: true, range, count: 0, data: [] });
        }
        filter.deviceId = reqDevId;
      } else {
        filter.deviceId = { $in: userDevices };
      }
    } else if (req.query.deviceId) {
      filter.deviceId = req.query.deviceId.toUpperCase();
    }

    const records = await SensorData.find(filter)
      .sort({ timestamp: 1 })
      .lean();

    // Map records for clean Recharts display
    const chartData = records.map((item) => {
      const d = new Date(item.timestamp);
      let timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (range === '7d' || range === '30d' || range === 'monthly') {
        timeLabel = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${timeLabel}`;
      }
      return {
        timestamp: item.timestamp,
        time: timeLabel,
        power: item.power,
        voltage: item.voltage,
        current: item.current,
        energy: item.energyConsumption,
      };
    });

    return res.status(200).json({
      success: true,
      range,
      count: chartData.length,
      data: chartData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve power history',
      error: error.message,
    });
  }
};
