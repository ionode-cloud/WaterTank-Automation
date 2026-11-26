const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

// Public Authentication Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

// Admin Console User Management Endpoints (JWT & Admin protected)
router.get('/users', protect, adminOnly, authController.getAllUsers);
router.post('/users', protect, adminOnly, authController.createUser);
router.put('/users/:id', protect, adminOnly, authController.updateUser);
router.delete('/users/:id', protect, adminOnly, authController.deleteUser);

module.exports = router;
