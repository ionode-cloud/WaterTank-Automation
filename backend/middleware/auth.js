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

    if (!user.isActive) {
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
 * Restrict access to administrators only
 */
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden - Administrator privileges required to perform this action',
  });
};
