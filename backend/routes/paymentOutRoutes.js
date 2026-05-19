const express = require('express');
const router = express.Router();
const paymentOutController = require('../controllers/paymentOutController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const { checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

// Get next payment out number (Put this before ID route)
router.get('/:businessId/next-number', checkBusinessAccess, paymentOutController.getNextNumber);

// Get payment out by ID
router.get('/:businessId/:id', checkBusinessAccess, paymentOutController.getById);

// Get payment outs by party
router.get('/:businessId/party/:partyId', checkBusinessAccess, paymentOutController.getByParty);

// Get payment outs by date range
router.get('/:businessId/date-range', checkBusinessAccess, paymentOutController.getByDateRange);

// Get payment outs by status
router.get('/:businessId/status/:status', checkBusinessAccess, paymentOutController.getByStatus);

// Get all payment outs for a business
router.get('/:businessId', checkBusinessAccess, paymentOutController.getAll);

// Create payment out
router.post('/:businessId', checkPlanExpiry, checkBusinessAccess, paymentOutController.create);

// Update payment out
router.put('/:businessId/:id', checkPlanExpiry, checkBusinessAccess, paymentOutController.update);

// Delete payment out
router.delete('/:businessId/:id', checkPlanExpiry, checkBusinessAccess, paymentOutController.delete);

module.exports = router;
