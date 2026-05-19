const express = require('express');
const router = express.Router();
const paymentInController = require('../controllers/paymentInController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const { checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

// Create payment in
router.post('/:businessId', checkPlanExpiry, checkBusinessAccess, paymentInController.create);
router.get('/:businessId', checkBusinessAccess, paymentInController.getAll);

// Get next payment in number
router.get('/:businessId/next-number', checkBusinessAccess, paymentInController.getNextNumber);

// Other payment in routes
router.get('/:businessId/party/:partyId', checkBusinessAccess, paymentInController.getByParty);
router.get('/:businessId/date-range', checkBusinessAccess, paymentInController.getByDateRange);
router.get('/:businessId/status/:status', checkBusinessAccess, paymentInController.getByStatus);

// Specific payment in operations (by ID)
router.get('/:businessId/:id', checkBusinessAccess, paymentInController.getById);
router.put('/:businessId/:id', checkPlanExpiry, checkBusinessAccess, paymentInController.update);
router.delete('/:businessId/:id', checkPlanExpiry, checkBusinessAccess, paymentInController.delete);

module.exports = router;
