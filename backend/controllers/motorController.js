const MotorHistory = require('../models/MotorHistory');
const ForceControl = require('../models/ForceControl');
const Device = require('../models/Device');
const iotService = require('../services/iotService');

/**
 * GET /api/motor/status
 */
exports.getMotorStatus = async (req, res) => {
  try {
    const devId = req.query?.deviceId || req.body?.deviceId;
    const stats = await iotService.getMotorStats(devId);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve motor status',
      error: error.message,
    });
  }
};

/**
 * GET /api/motor/history
 */
exports.getMotorHistory = async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const filter = {};
    const devId = req.query?.deviceId || req.body?.deviceId;
    if (devId) {
      filter.deviceId = String(devId).trim().toUpperCase();
    }

    // Role-based Multi-User Scoping: regular users only see their own assigned AND APPROVED devices' history
    const isUserAdmin = req.user && ['ADMIN', 'OPERATOR'].includes(String(req.user.role || '').toUpperCase());
    if (!isUserAdmin) {
      if (!req.user) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      const userDevices = await Device.find({
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      }).select('deviceId').lean();
      const userDeviceIds = userDevices.map(d => d.deviceId);
      if (userDeviceIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      if (filter.deviceId) {
        if (!userDeviceIds.includes(filter.deviceId)) {
          return res.status(403).json({ success: false, message: 'Access denied: this device is not assigned to your account' });
        }
      } else {
        filter.deviceId = { $in: userDeviceIds };
      }
    }

    const history = await MotorHistory.find(filter)
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve motor history',
      error: error.message,
    });
  }
};

/**
 * GET /api/motor/consumption
 * Aggregates ON/OFF switch events per day, total ON events, total OFF events
 */
exports.getMotorConsumption = async (req, res) => {
  try {
    const past7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filter = { timestamp: { $gte: past7Days } };
    const devId = req.query?.deviceId || req.body?.deviceId;
    if (devId) {
      filter.deviceId = String(devId).trim().toUpperCase();
    }

    // Role-based Multi-User Scoping:
    const isUserAdmin = req.user && String(req.user.role || '').toUpperCase() === 'ADMIN';
    if (!isUserAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: { totalOnEvents: 0, totalOffEvents: 0, days: [] },
        });
      }
      const userDevices = await Device.find({
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      }).select('deviceId').lean();
      const userDeviceIds = userDevices.map(d => d.deviceId);
      if (userDeviceIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: { totalOnEvents: 0, totalOffEvents: 0, days: [] },
        });
      }
      if (filter.deviceId) {
        if (!userDeviceIds.includes(filter.deviceId)) {
          return res.status(403).json({ success: false, message: 'Access denied: this device is not assigned to your account' });
        }
      } else {
        filter.deviceId = { $in: userDeviceIds };
      }
    }

    const histories = await MotorHistory.find(filter).lean();

    let totalOnEvents = 0;
    let totalOffEvents = 0;

    // Group by Day (e.g. "Mon", "Tue", "Wed", or "19 Nov")
    const dayMap = {};
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize past 7 days in map
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayKey = daysOfWeek[d.getDay()];
      dayMap[dayKey] = { day: dayKey, onCount: 0, offCount: 0, totalDurationMin: 0 };
    }

    histories.forEach((item) => {
      const d = new Date(item.startTime || item.timestamp);
      const dayKey = daysOfWeek[d.getDay()];

      if (item.motorStatus === 'ON') {
        totalOnEvents++;
        if (dayMap[dayKey]) {
          dayMap[dayKey].onCount += 1;
          dayMap[dayKey].totalDurationMin += Math.round((item.duration || 0) / 60);
        }
      } else {
        totalOffEvents++;
        if (dayMap[dayKey]) {
          dayMap[dayKey].offCount += 1;
        }
      }
    });

    const dailyActivity = Object.values(dayMap);

    return res.status(200).json({
      success: true,
      data: {
        totalOnEvents,
        totalOffEvents,
        totalEvents: totalOnEvents + totalOffEvents,
        dailyActivity,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve motor consumption metrics',
      error: error.message,
    });
  }
};

/**
 * POST /api/motor/force-on
 */
exports.forceMotorOn = async (req, res) => {
  try {
    const rawDevId = req.body?.deviceId || req.body?.deviceid || req.query?.deviceId || req.query?.id;
    const devId = rawDevId ? String(rawDevId).trim().toUpperCase() : null;
    const result = await iotService.executeMotorCommand('ON', req.body.source || 'dashboard_header', devId);
    const state = iotService.getRuntimeState(devId);
    
    const targetDev = devId || state?.deviceId || 'WT-DEV-001';
    
    // Save record to ForceControl model
    await ForceControl.create({
      deviceId: targetDev,
      action: 'FORCE_ON',
      motorStatus: 'ON',
      triggeredBy: req.body.source || 'dashboard_header',
      waterLevelAtTrigger: state?.waterLevel || 0,
      note: req.body.note || `Force ON command executed for ${targetDev}`,
      status: 'SUCCESS',
    });

    // Update Device model state: Force ON forces motorStatus to ON, forceOff to false
    await Device.updateOne(
      { deviceId: targetDev },
      { $set: { forceOn: true, forceOff: false, motorStatus: 'ON' } }
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute Force ON command',
    });
  }
};

/**
 * POST /api/motor/force-off
 */
exports.forceMotorOff = async (req, res) => {
  try {
    const rawDevId = req.body?.deviceId || req.body?.deviceid || req.query?.deviceId || req.query?.id;
    const devId = rawDevId ? String(rawDevId).trim().toUpperCase() : null;
    const result = await iotService.executeMotorCommand('OFF', req.body.source || 'dashboard_header', devId);
    const state = iotService.getRuntimeState(devId);

    const targetDev = devId || state?.deviceId || 'WT-DEV-001';

    // Save record to ForceControl model
    await ForceControl.create({
      deviceId: targetDev,
      action: 'FORCE_OFF',
      motorStatus: 'OFF',
      triggeredBy: req.body.source || 'dashboard_header',
      waterLevelAtTrigger: state?.waterLevel || 0,
      note: req.body.note || `Force OFF command executed for ${targetDev}`,
      status: 'SUCCESS',
    });

    // Update Device model state: Force OFF forces motorStatus to OFF, forceOn to false
    await Device.updateOne(
      { deviceId: targetDev },
      { $set: { forceOff: true, forceOn: false, motorStatus: 'OFF' } }
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute Force OFF command',
    });
  }
};
