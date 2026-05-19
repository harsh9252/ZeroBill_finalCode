const express = require('express');
const router = express.Router();
const customQuotationController = require('../controllers/customQuotationController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

router.post('/', customQuotationController.createCustomQuotation);
router.get('/next-number', customQuotationController.getNextQuotationNumber);
router.get('/:id', customQuotationController.getCustomQuotationById);
router.get('/business/:businessId', customQuotationController.getCustomQuotationsByBusiness);
router.put('/:id', customQuotationController.updateCustomQuotation);
router.delete('/:id', customQuotationController.deleteCustomQuotation);

module.exports = router;
