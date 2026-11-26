const FaultLog = require('../models/FaultLog');
const Device = require('../models/Device');
const iotService = require('../services/iotService');

/**
 * GET /api/faults
 * Retrieve historical fault logs with optional filtering by deviceId and status
 */
exports.getFaultLogs = async (req, res) => {
  try {
    const { deviceId, status, limit = 50, page = 1 } = req.query;
    const filter = {};

    const isUserAdmin = req.user && String(req.user.role || '').toUpperCase() === 'ADMIN';

    // Role-based fault scoping: Regular users only see their assigned AND APPROVED device faults
    if (!isUserAdmin) {
      if (!req.user) {
        return res.status(200).json({ success: true, count: 0, total: 0, page: 1, totalPages: 0, data: [] });
      }
      const Device = require('../models/Device');
      const userDevices = await Device.find({
        assignedUserId: req.user._id,
        $or: [{ approvalStatus: 'APPROVED' }, { approvalStatus: { $exists: false } }],
      }).distinct('deviceId');

      if (deviceId) {
        const reqDevId = String(deviceId).trim().toUpperCase();
        if (!userDevices.includes(reqDevId)) {
          return res.status(200).json({ success: true, count: 0, total: 0, page: 1, totalPages: 0, data: [] });
        }
        filter.deviceId = reqDevId;
      } else {
        filter.deviceId = { $in: userDevices };
      }
    } else if (deviceId) {
      filter.deviceId = String(deviceId).trim().toUpperCase();
    }
    if (status) {
      filter.faultStatus = String(status).trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, faults] = await Promise.all([
      FaultLog.countDocuments(filter),
      FaultLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      count: faults.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: faults,
    });
  } catch (err) {
    console.error('[FaultController] Error fetching fault logs:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fault logs',
      error: err.message,
    });
  }
};

/**
 * POST /api/faults
 * Record a new hardware or system fault event
 */
exports.createFaultLog = async (req, res) => {
  try {
    const { deviceId, deviceName, faultDescription, faultStatus = 'Active' } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }
    if (!faultDescription) {
      return res.status(400).json({ success: false, message: 'Fault description is required' });
    }

    const cleanDevId = String(deviceId).trim().toUpperCase();
    const cleanDesc = String(faultDescription).trim();
    const cleanStatus = faultStatus === 'Resolved' ? 'Resolved' : 'Active';

    // Fetch device doc to get name if omitted
    const devDoc = await Device.findOne({ deviceId: cleanDevId });
    const resolvedName = deviceName || devDoc?.name || cleanDevId;

    const now = new Date();
    const newFault = new FaultLog({
      deviceId: cleanDevId,
      deviceName: resolvedName,
      faultDescription: cleanDesc,
      faultStatus: cleanStatus,
      timestamp: now,
      date: now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });

    await newFault.save();

    // Update Device status in MongoDB
    if (devDoc) {
      if (cleanStatus === 'Active') {
        devDoc.status = 'Fault';
        devDoc.deviceStatus = 'Fault';
        devDoc.faultDescription = cleanDesc;
      }
      devDoc.lastActive = now;
      await devDoc.save();
    }

    // Broadcast in real-time
    const io = iotService.getSocketIO();
    if (io) {
      io.emit('new_fault', newFault);
      io.emit('device_status_update', {
        deviceId: cleanDevId,
        status: cleanStatus === 'Active' ? 'Fault' : 'Active',
        deviceStatus: cleanStatus === 'Active' ? 'Fault' : 'Active',
        faultDescription: cleanStatus === 'Active' ? cleanDesc : null,
        timestamp: now,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Fault log recorded successfully',
      data: newFault,
    });
  } catch (err) {
    console.error('[FaultController] Error creating fault log:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to record fault log',
      error: err.message,
    });
  }
};

/**
 * PUT /api/faults/:id/resolve
 * Mark a fault as resolved and check if device status should return to Active
 */
exports.resolveFaultLog = async (req, res) => {
  try {
    const { id } = req.params;
    const fault = await FaultLog.findById(id);

    if (!fault) {
      return res.status(404).json({ success: false, message: 'Fault log not found' });
    }

    fault.faultStatus = 'Resolved';
    await fault.save();

    // Check if there are other active faults for this device
    const remainingActive = await FaultLog.findOne({
      deviceId: fault.deviceId,
      faultStatus: 'Active',
    });

    if (!remainingActive) {
      // Restore device to Active
      const devDoc = await Device.findOne({ deviceId: fault.deviceId });
      if (devDoc) {
        devDoc.status = 'Active';
        devDoc.deviceStatus = 'Active';
        devDoc.faultDescription = null;
        await devDoc.save();
      }

      const io = iotService.getSocketIO();
      if (io) {
        io.emit('device_status_update', {
          deviceId: fault.deviceId,
          status: 'Active',
          deviceStatus: 'Active',
          faultDescription: null,
          timestamp: new Date(),
        });
      }
    }

    const io = iotService.getSocketIO();
    if (io) {
      io.emit('fault_resolved', fault);
    }

    return res.status(200).json({
      success: true,
      message: 'Fault marked as resolved',
      data: fault,
    });
  } catch (err) {
    console.error('[FaultController] Error resolving fault log:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve fault log',
      error: err.message,
    });
  }
};
