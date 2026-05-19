const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { verifySuperAdminToken } = require('../middleware/superAdminAuthMiddleware');

// Public Routes
router.get('/', pricingController.getAllPricingPlans);

// SuperAdmin Routes (Private)
router.get('/admin/all', verifySuperAdminToken, pricingController.getAllPricingPlansAdmin);
router.post('/admin', verifySuperAdminToken, pricingController.createPricingPlan);
router.put('/admin/reorder', verifySuperAdminToken, pricingController.reorderPricingPlans);
router.get('/admin/:id', verifySuperAdminToken, pricingController.getPricingPlanById);
router.put('/admin/:id', verifySuperAdminToken, pricingController.updatePricingPlan);
router.put('/admin/:id/toggle', verifySuperAdminToken, pricingController.togglePricingPlanStatus);
router.put('/admin/:id/featured', verifySuperAdminToken, pricingController.updateFeaturedLabel);
router.delete('/admin/:id', verifySuperAdminToken, pricingController.deletePricingPlan);

module.exports = router;
