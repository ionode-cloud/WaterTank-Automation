const express = require('express');
const router = express.Router();
const {
  getAllModels,
  getModelByNumber,
  createModel,
  updateModel,
  deleteModel,
} = require('../controllers/modelController');
const { protect, adminOnly } = require('../middleware/auth');

// Public / Authenticated read routes
router.get('/', getAllModels);
router.get('/:modelNumber', getModelByNumber);

// Protected modification routes (Allows logged in users/admins to add and edit models)
router.post('/', protect, createModel);
router.put('/:modelNumber', protect, updateModel);
router.delete('/:modelNumber', protect, adminOnly, deleteModel);

module.exports = router;
