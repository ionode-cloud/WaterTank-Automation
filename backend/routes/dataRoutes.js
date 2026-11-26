const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { optionalProtect } = require('../middleware/auth');

// Unified CRUD Endpoints for /api/data
router.get('/', optionalProtect, dataController.getData);
router.get('/:id', optionalProtect, dataController.getData);

router.post('/', dataController.createData);

router.put('/', dataController.updateData);
router.put('/:id', dataController.updateData);

router.delete('/', dataController.deleteData);
router.delete('/:id', dataController.deleteData);

module.exports = router;
