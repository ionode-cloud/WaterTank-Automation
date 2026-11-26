const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hydropulse_watertank_super_secret_jwt_key_2026_secure';

/**
 * Protect routes - verifies Bearer JWT token in Authorization header
 */
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - No JWT authentication token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This user account has been deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[JWT Auth Error]', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized - Invalid or expired authentication token',
      error: error.message,
    });
  }
};

/**
 * Optional protect - extracts req.user if a valid token is provided, but does not block if missing
 */
exports.optionalProtect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive !== false) {
      req.user = user;
    }
  } catch (err) {
    // Non-blocking: proceed as anonymous guest
  }
  next();
};

/**
 * Restrict access to administrators only (supports both 'admin' and 'ADMIN')
 */
exports.adminOnly = (req, res, next) => {
  const role = String(req.user?.role || '').toUpperCase();
  if (role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden - Administrator privileges required to perform this action',
  });
};

/**
 * Restrict access to specific roles
 */
exports.requireRole = (...roles) => {
  const upperRoles = roles.map((r) => String(r).toUpperCase());
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toUpperCase();
    if (upperRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Forbidden - Required role: [${roles.join(', ')}]. Current role: ${userRole}`,
    });
  };
};

/**
 * Verify Device Ownership Middleware
 * Ensures regular users can only read or control devices assigned to them.
 * Admins are automatically granted universal access.
 */
exports.verifyDeviceOwnership = async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (role === 'ADMIN') {
      return next(); // Admins have full access
    }

    const deviceId = req.params.deviceId || req.body.deviceId || req.query.deviceId;
    if (!deviceId) {
      return next(); // Scoped to user's assigned devices by controller query
    }

    const Device = require('../models/Device');
    const device = await Device.findOne({ deviceId: deviceId.toUpperCase() });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device '${deviceId}' not found`,
      });
    }

    // Check device assignment
    if (!device.assignedUserId || !device.assignedUserId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You do not have permission to view or control this device',
      });
    }

    req.targetDevice = device;
    next();
  } catch (err) {
    console.error('[Device Ownership Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify device ownership authorization',
      error: err.message,
    });
  }
};
