const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

// Public route for email approvals
router.get('/public-action/:id', purchaseOrderController.publicAction);

router.use(protect);

router.get('/next-number', purchaseOrderController.getNextNumber);

router.post('/', purchaseOrderController.createPurchaseOrder);

router.get('/', purchaseOrderController.getAllPurchaseOrders);

router.get('/stats', purchaseOrderController.getPurchaseOrderStats);

router.get('/:id', purchaseOrderController.getPurchaseOrderById);

router.put('/:id', purchaseOrderController.updatePurchaseOrder);

router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

module.exports = router;
