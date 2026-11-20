const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hydropulse_watertank_super_secret_jwt_key_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';

/**
 * Generate signed JWT Token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * POST /api/auth/register
 * Public user registration
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'admin', phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `An account with email '${cleanEmail}' already exists`,
      });
    }

    const user = new User({
      name: String(name).trim(),
      email: cleanEmail,
      password,
      role: ['admin', 'operator', 'viewer'].includes(role) ? role : 'admin',
      phone: phone ? String(phone).trim() : '',
      lastLogin: new Date(),
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[/api/auth/register error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register account',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate credentials & return JWT
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact the administrator.',
      });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('[/api/auth/login error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process login',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Retrieve currently logged in user profile
 */
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/users
 * Retrieve all registered users & administrators (Admin Only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role) {
      filter.role = role.toLowerCase();
    }

    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = users.map((u) => ({
      ...u,
      displayPassword: u.displayPassword || (u.email === 'admin@hydropulse.io' ? 'admin123' : 'password123'),
    }));

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (error) {
    console.error('[/api/admin/users error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin users',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/users
 * Admin Console: Create a new user/admin credential
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'admin', phone, isActive = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An account with email '${cleanEmail}' already exists`,
      });
    }

    const user = new User({
      name: String(name).trim(),
      email: cleanEmail,
      password,
      displayPassword: password,
      role: ['admin', 'operator', 'viewer'].includes(role) ? role : 'admin',
      phone: phone ? String(phone).trim() : '',
      isActive: Boolean(isActive),
    });

    await user.save();

    const created = await User.findById(user._id).select('-password');

    return res.status(201).json({
      success: true,
      message: 'Admin credential created successfully',
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create user credential',
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/users/:id
 * Admin Console: Edit/update user credentials
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, phone, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User credential not found',
      });
    }

    if (name !== undefined) user.name = String(name).trim();
    if (role !== undefined && ['admin', 'operator', 'viewer'].includes(role)) {
      user.role = role;
    }
    if (phone !== undefined) user.phone = String(phone).trim();
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== user.email) {
        const emailTaken = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (emailTaken) {
          return res.status(409).json({
            success: false,
            message: `Email '${cleanEmail}' is already taken by another account`,
          });
        }
        user.email = cleanEmail;
      }
    }

    // If new password was supplied, update and it will be hashed by pre-save hook
    if (password && String(password).trim().length >= 6) {
      user.password = String(password).trim();
      user.displayPassword = String(password).trim();
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Admin credential updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user credential',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Admin Console: Delete user credentials
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User credential not found',
      });
    }

    // Safety: Prevent deleting the current user if they are the only admin remaining
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    if (userToDelete.role === 'admin' && totalAdmins <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only remaining Administrator account',
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `User '${userToDelete.name}' (${userToDelete.email}) deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user credential',
      error: error.message,
    });
  }
};

/**
 * Seed Default Administrator if no accounts exist
 */
exports.seedDefaultAdmin = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const defaultAdmin = new User({
        name: 'Super Admin',
        email: 'admin@hydropulse.io',
        password: 'admin123',
        displayPassword: 'admin123',
        role: 'admin',
        phone: '+91 9876543210',
        isActive: true,
        lastLogin: new Date(),
      });
      await defaultAdmin.save();
      console.log('----------------------------------------------------');
      console.log('[Auth Seed] Created default administrator:');
      console.log('   Email:    admin@hydropulse.io');
      console.log('   Password: admin123');
      console.log('----------------------------------------------------');
    } else {
      const admin = await User.findOne({ email: 'admin@hydropulse.io' });
      if (admin && !admin.displayPassword) {
        admin.displayPassword = 'admin123';
        await admin.save();
      }
    }
  } catch (error) {
    console.error('[Auth Seed Error]', error.message);
  }
};
