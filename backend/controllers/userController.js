const User = require('../models/User');
const Device = require('../models/Device');
const DeviceInventory = require('../models/DeviceInventory');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a new user account (Admin only)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      mobileNumber,
      phone,
      location,
      latitude,
      longitude,
      role = 'USER',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email address, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if email already in use
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'A user account with this email address already exists',
      });
    }

    // Check username if supplied, or default to sanitized email prefix
    let finalUsername = username ? username.toLowerCase().trim() : email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let usernameExists = await User.findOne({ username: finalUsername });
    if (usernameExists && username) {
      return res.status(409).json({
        success: false,
        message: `Username '${username}' is already taken. Please choose another.`,
      });
    } else if (usernameExists) {
      finalUsername = `${finalUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const normalizedRole = String(role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';

    const user = await User.create({
      name: name.trim(),
      username: finalUsername,
      email: email.toLowerCase().trim(),
      password,
      mobileNumber: mobileNumber || phone || '',
      phone: mobileNumber || phone || '',
      location: location || '',
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      role: normalizedRole,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        location: user.location,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('[Create User Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: err.message,
    });
  }
};

/**
 * @desc    Get all users with their assigned device count
 * @route   GET /api/users
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Only return registered end-users; exclude Admin Console administrators
    const users = await User.find({ role: { $ne: 'ADMIN' } })
      .select('-password -displayPassword')
      .sort({ createdAt: -1 });

    // Fetch device counts for all users in parallel
    const userIds = users.map((u) => u._id);
    const deviceCounts = await Device.aggregate([
      { $match: { assignedUserId: { $in: userIds } } },
      { $group: { _id: '$assignedUserId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    deviceCounts.forEach((dc) => {
      countMap[String(dc._id)] = dc.count;
    });

    const userList = users.map((u) => {
      const uObj = u.toObject();
      return {
        ...uObj,
        assignedDeviceCount: countMap[String(u._id)] || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: userList.length,
      data: userList,
    });
  } catch (err) {
    console.error('[Get All Users Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: err.message,
    });
  }
};

/**
 * @desc    Get user details by ID along with assigned devices
 * @route   GET /api/users/:id
 * @access  Private (Admin or Self)
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const callerRole = String(req.user?.role || '').toUpperCase();

    // Check permissions: Admin or same user
    if (callerRole !== 'ADMIN' && String(req.user._id) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You do not have permission to access this user profile',
      });
    }

    const user = await User.findById(id).select('-password -displayPassword');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const assignedDevices = await Device.find({ assignedUserId: user._id })
      .select('deviceId name location modelNumber modelName status deviceStatus operatingMode tanks createdAt lastActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        assignedDevices,
      },
    });
  } catch (err) {
    console.error('[Get User By Id Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      error: err.message,
    });
  }
};

/**
 * @desc    Update user details or active status
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, mobileNumber, phone, location, latitude, longitude, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name.trim();
    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Username '${username}' is already in use by another account`,
        });
      }
      user.username = cleanUsername;
    }
    if (mobileNumber !== undefined || phone !== undefined) {
      const p = mobileNumber || phone || '';
      user.mobileNumber = p;
      user.phone = p;
    }
    if (location !== undefined) user.location = location;
    if (latitude !== undefined) user.latitude = Number(latitude);
    if (longitude !== undefined) user.longitude = Number(longitude);
    if (role !== undefined) {
      user.role = String(role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        location: user.location,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error('[Update User Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: err.message,
    });
  }
};

/**
 * @desc    Reset a user's password (Admin only)
 * @route   POST /api/users/:id/reset-password
 * @access  Private (Admin)
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 6 characters long',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Password for ${user.email} has been reset successfully`,
    });
  } catch (err) {
    console.error('[Reset User Password Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset user password',
      error: err.message,
    });
  }
};

/**
 * @desc    Get all devices assigned to a specific user
 * @route   GET /api/users/:id/devices
 * @access  Private (Admin or Self)
 */
exports.getUserDevices = async (req, res) => {
  try {
    const { id } = req.params;
    const callerRole = String(req.user?.role || '').toUpperCase();

    if (callerRole !== 'ADMIN' && String(req.user._id) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You do not have permission to access these devices',
      });
    }

    const devices = await Device.find({ assignedUserId: id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (err) {
    console.error('[Get User Devices Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user devices',
      error: err.message,
    });
  }
};

/**
 * @desc    Assign or reassign a device to a user (Admin only)
 * @route   POST /api/users/reassign-device
 * @access  Private (Admin)
 */
exports.reassignDevice = async (req, res) => {
  try {
    const { deviceId, targetUserId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
    }

    const device = await Device.findOne({ deviceId: deviceId.toUpperCase().trim() });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device '${deviceId}' not found`,
      });
    }

    let targetUser = null;
    if (targetUserId) {
      targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Target user does not exist',
        });
      }
    }

    const previousOwnerId = device.assignedUserId;
    device.assignedUserId = targetUser ? targetUser._id : null;
    await device.save();

    // Sync DeviceInventory record as well
    await DeviceInventory.findOneAndUpdate(
      { deviceId: device.deviceId },
      {
        registeredUserId: targetUser ? targetUser._id : null,
        status: targetUser ? 'REGISTERED' : 'UNREGISTERED',
      }
    );

    return res.status(200).json({
      success: true,
      message: targetUser
        ? `Device ${device.deviceId} assigned to ${targetUser.name} (${targetUser.email})`
        : `Device ${device.deviceId} unassigned successfully`,
      data: {
        deviceId: device.deviceId,
        previousOwnerId,
        newOwnerId: device.assignedUserId,
      },
    });
  } catch (err) {
    console.error('[Reassign Device Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reassign device',
      error: err.message,
    });
  }
};

/**
 * @desc    Delete a user account (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Unassign any devices owned by this user
    await Device.updateMany({ assignedUserId: user._id }, { $set: { assignedUserId: null } });
    await DeviceInventory.updateMany({ registeredUserId: user._id }, { $set: { registeredUserId: null, status: 'UNREGISTERED' } });

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `User ${user.name} (${user.email}) deleted successfully`,
    });
  } catch (err) {
    console.error('[Delete User Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: err.message,
    });
  }
};
