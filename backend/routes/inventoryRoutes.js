const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Validation rules
const inventoryValidation = [
  body('item_name').trim().notEmpty().withMessage('Item name is required'),
  body('item_type').isIn(['product', 'service']).withMessage('Item type must be product or service'),
  body('opening_stock').optional().isNumeric().withMessage('Opening stock must be a number'),
  body('purchase_price').optional().isNumeric().withMessage('Purchase price must be a number'),
  body('sale_price')
    .notEmpty().withMessage('Sale price is required')
    .isNumeric().withMessage('Sale price must be a number')
    .custom(value => parseFloat(value) >= 0).withMessage('Sale price must be greater than or equal to 0'),
  body('gst_rate').optional().isNumeric().withMessage('GST rate must be a number'),
  body('low_stock_qty').optional().isNumeric().withMessage('Low stock quantity must be a number')
];

// All routes require authentication
router.use(protect);

// Inventory routes
router.post('/', checkPlanExpiry, upload.single('image'), inventoryValidation, inventoryController.createItem);
router.get('/', inventoryController.getAllItems);
router.get('/stats', inventoryController.getInventoryStats);
router.get('/categories', inventoryController.getCategories);
router.get('/:id', inventoryController.getItemById);
router.get('/code/:code', inventoryController.getItemByCode);

// Update route
router.put('/:id', upload.single('image'), inventoryValidation, inventoryController.updateItem);

// Stock update
router.patch('/:id/stock', inventoryController.updateStock);
router.get('/:id/stock/history', inventoryController.getStockHistory);

// Delete routes
router.delete('/:id', inventoryController.deleteItem);
router.delete('/:id/hard', inventoryController.hardDeleteItem);

module.exports = router;
