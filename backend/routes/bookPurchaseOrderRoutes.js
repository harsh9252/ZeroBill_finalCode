const express = require('express');
const router = express.Router();
const bookPurchaseOrderController = require('../controllers/bookPurchaseOrderController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/next-number', bookPurchaseOrderController.getNextNumber);
router.get('/', bookPurchaseOrderController.getAllBookPurchaseOrders);
router.post('/', checkPlanExpiry, bookPurchaseOrderController.createBookPurchaseOrder);
router.get('/:id', bookPurchaseOrderController.getBookPurchaseOrderById);
router.put('/:id', checkPlanExpiry, bookPurchaseOrderController.updateBookPurchaseOrder);
router.delete('/:id', checkPlanExpiry, bookPurchaseOrderController.deleteBookPurchaseOrder);

module.exports = router;
