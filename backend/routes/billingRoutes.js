const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// Apply auth middleware to all billing routes
router.use(protect);

// Get billing history for the authenticated user
router.get('/history', billingController.getBillingHistory);

// Get billing summary/stats for the authenticated user
router.get('/summary', billingController.getBillingSummary);

// Download receipt for a specific billing record
router.get('/receipt/:id', billingController.downloadReceipt);

// Upgrade plan for the authenticated user
router.post('/upgrade', billingController.upgradePlan);

// Health check for billing routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Billing routes are working',
    user: req.user ? { id: req.user.id, email: req.user.email } : null
  });
});

module.exports = router;