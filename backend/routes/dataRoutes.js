const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Unified CRUD Endpoints for /api/data
router.get('/', dataController.getData);
router.get('/:id', dataController.getData);

router.post('/', dataController.createData);

router.put('/', dataController.updateData);
router.put('/:id', dataController.updateData);

router.delete('/', dataController.deleteData);
router.delete('/:id', dataController.deleteData);

module.exports = router;
