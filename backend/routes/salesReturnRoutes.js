const express = require('express');
const router = express.Router();
const salesReturnController = require('../controllers/salesReturnController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

// Get next sales return number (based on last saved)
router.get('/next-number', salesReturnController.getNextNumber);

// Generate next sales return number
router.get('/generate-number', salesReturnController.generateNumber);

// Create sales return
router.post('/', salesReturnController.createSalesReturn);

// Get all sales returns
router.get('/', salesReturnController.getAllSalesReturns);

// Get sales return statistics
router.get('/stats', salesReturnController.getSalesReturnStats);

// Get sales return by ID
router.get('/:id', salesReturnController.getSalesReturnById);

// Update sales return
router.put('/:id', salesReturnController.updateSalesReturn);

// Delete sales return
router.delete('/:id', salesReturnController.deleteSalesReturn);

module.exports = router;
