const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserDevices,
  reassignDevice,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

// All user management routes require valid authentication
router.use(protect);

// Admin-only collection routes
router.route('/')
  .get(adminOnly, getAllUsers)
  .post(adminOnly, createUser);

// Admin device reassignment
router.post('/reassign-device', adminOnly, reassignDevice);

// Individual user routes
router.route('/:id')
  .get(getUserById) // Admin or Self
  .put(adminOnly, updateUser)
  .delete(adminOnly, deleteUser);

// Admin-only password reset
router.post('/:id/reset-password', adminOnly, resetUserPassword);

// Devices assigned to user
router.get('/:id/devices', getUserDevices);

module.exports = router;
