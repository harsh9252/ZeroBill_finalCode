const express = require('express');
const router = express.Router();
const salesLeadController = require('../controllers/salesLeadController');
const { protect } = require('../middleware/authMiddleware');

// Protect all sales lead routes with authentication middleware
router.use(protect);

// Create a new sales lead
router.post('/', salesLeadController.create);

// Get all sales leads
router.get('/', salesLeadController.getAll);

// Get next lead number
router.get('/next-number', salesLeadController.getNextNumber);

// Get a specific sales lead
router.get('/:id', salesLeadController.getById);

// Update a sales lead
router.put('/:id', salesLeadController.update);

// Delete a sales lead
router.delete('/:id', salesLeadController.delete);

module.exports = router;
