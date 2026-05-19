const express = require('express');
const router = express.Router();
const purchaseReturnController = require('../controllers/purchaseReturnController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

router.use(protect);

router.get('/next-number', purchaseReturnController.getNextNumber);
router.post('/', purchaseReturnController.createPurchaseReturn);
router.get('/', purchaseReturnController.getAllPurchaseReturns);
router.get('/stats', purchaseReturnController.getPurchaseReturnStats);
router.get('/:id', purchaseReturnController.getPurchaseReturnById);
router.put('/:id', purchaseReturnController.updatePurchaseReturn);
router.delete('/:id', purchaseReturnController.deletePurchaseReturn);

module.exports = router;
