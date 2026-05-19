const express = require('express');
const router = express.Router();
const projectExpenseTransactionController = require('../controllers/projectExpenseTransactionController');
const { protect } = require('../middleware/subUserAuthMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// All routes require authentication
router.use(protect);

// Get all transactions for a project expense (must come before /:businessId/:id)
router.get('/:businessId/project-expense/:projectExpenseId', projectExpenseTransactionController.getByProjectExpenseId);

// Get summary for a project expense (must come before /:businessId/:id)
router.get('/:businessId/project-expense/:projectExpenseId/summary', projectExpenseTransactionController.getSummary);

// Create a new transaction
router.post('/:businessId', uploadMiddleware.uploadAny.single('screenshot'), projectExpenseTransactionController.create);

// Get all transactions for a business
router.get('/:businessId', projectExpenseTransactionController.getByBusinessId);

// Get transaction by ID (must come last)
router.get('/:businessId/:id', projectExpenseTransactionController.getById);

// Update transaction
router.put('/:businessId/:id', uploadMiddleware.uploadAny.single('screenshot'), projectExpenseTransactionController.update);

// Delete transaction
router.delete('/:businessId/:id', projectExpenseTransactionController.delete);

module.exports = router;
