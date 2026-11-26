const express = require('express');
const router = express.Router();
const {
  verifyDevice,
  addInventoryDevice,
  batchImportInventory,
  getInventory,
  updateInventoryStatus,
} = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/auth');

// Public/Registration verification lookup (Secrets stripped)
router.get('/verify/:deviceId', verifyDevice);

// Protected Admin Inventory Management
router.use(protect);
router.use(adminOnly);

router.route('/')
  .get(getInventory)
  .post(addInventoryDevice);

router.post('/batch', batchImportInventory);
router.put('/:deviceId', updateInventoryStatus);

module.exports = router;
