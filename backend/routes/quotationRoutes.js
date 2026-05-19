const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Validation rules for quotation creation
const quotationValidationRules = [
  body('party_name')
    .trim()
    .notEmpty()
    .withMessage('Party name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Party name must be between 1 and 255 characters'),

  body('quotation_date')
    .isISO8601()
    .withMessage('Valid quotation date is required'),

  body('status')
    .optional()
    .isIn(['open', 'closed'])
    .withMessage('Status must be either open or closed'),

  body('total_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('grand_total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Grand total must be a positive number'),

  body('valid_until')
    .optional()
    .isISO8601()
    .withMessage('Valid until date must be a valid date')
];

// Public routes (No Auth required)
router.get('/public/:id', quotationController.getPublicQuotation);

// Apply auth middleware to all routes below
router.use(protect);

// Routes
router.get('/generate-number', quotationController.generateQuotationNumber);
router.get('/next-number', quotationController.getNextQuotationNumber);
router.get('/stats', quotationController.getQuotationStats);
router.get('/', quotationController.getAllQuotations);
router.get('/:id', quotationController.getQuotationById);
router.post('/', checkPlanExpiry, quotationValidationRules, quotationController.createQuotation);
router.put('/:id', checkPlanExpiry, quotationController.updateQuotation);
router.delete('/:id', checkPlanExpiry, quotationController.deleteQuotation);
router.get('/business/:business_id', quotationController.getQuotationsByBusinessId);

router.delete('/:id/hard', quotationController.hardDeleteQuotation);

// Convert quotation to Sales or Proforma Invoice
router.post('/:id/convert', quotationController.convertQuotation);

module.exports = router;
