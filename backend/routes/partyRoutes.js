const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const partyController = require('../controllers/partyController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Validation rules - accept all party-related fields
const partyValidation = [
  body('name').trim().notEmpty().withMessage('Party name is required'),
  body('phone_number').optional(),
  body('party_type').optional().trim(),
  body('category').optional(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('billing_address').optional(),
  body('shipping_address').optional(),
  body('city').optional(),
  body('state').optional(),
  body('pincode').optional(),
  body('country').optional(),
  body('ship_city').optional(),
  body('ship_state').optional(),
  body('ship_pincode').optional(),
  body('ship_country').optional(),
  body('gstin').optional(),
  body('vat').optional(),
  body('opening_balance').optional().isNumeric().withMessage('Opening balance must be a number'),
  body('balance_type').optional().isIn(['receivable', 'payable']).withMessage('Balance type must be receivable or payable'),
  body('credit_limit').optional().isNumeric().withMessage('Credit limit must be a number'),
  body('credit_days').optional().isNumeric().withMessage('Credit days must be a number'),
  body('pan_number').optional(),
  body('bank_name').optional(),
  body('bank_branch').optional(),
  body('account_number').optional(),
  body('ifsc_code').optional(),
  body('notes').optional(),
  body('business_id').optional(), // Allow business_id for proper business filtering
  body('contact_person_name').optional(),
  body('contact_person_phone').optional(),
];

// Validation rules for updates (optional fields)
const updatePartyValidation = [
  body('name').optional().trim().notEmpty().withMessage('Party name cannot be empty'),
  body('phone_number').optional(),
  body('party_type').optional().trim(),
  body('category').optional(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('billing_address').optional(),
  body('shipping_address').optional(),
  body('city').optional(),
  body('state').optional(),
  body('pincode').optional(),
  body('country').optional(),
  body('ship_city').optional(),
  body('ship_state').optional(),
  body('ship_pincode').optional(),
  body('ship_country').optional(),
  body('gstin').optional(),
  body('vat').optional(),
  body('opening_balance').optional().isNumeric().withMessage('Opening balance must be a number'),
  body('balance_type').optional().isIn(['receivable', 'payable']).withMessage('Balance type must be receivable or payable'),
  body('credit_limit').optional().isNumeric().withMessage('Credit days must be a number'),
  body('credit_days').optional().isNumeric().withMessage('Credit days must be a number'),
  body('pan_number').optional(),
  body('bank_name').optional(),
  body('bank_branch').optional(),
  body('account_number').optional(),
  body('ifsc_code').optional(),
  body('notes').optional(),
  body('business_id').optional(),
  body('contact_person_name').optional(),
  body('contact_person_phone').optional(),
];

// All routes require authentication
router.use(protect);

// Party routes - specific routes before generic :id routes
router.post('/', checkPlanExpiry, upload.uploadDirect.single('logo'), partyValidation, partyController.createParty);
router.get('/', partyController.getAllParties);
router.get('/stats', partyController.getPartyStats);
router.get('/:id/addresses', partyController.getPartyAddresses);
router.post('/:id/addresses', partyController.addPartyAddress);
router.put('/:id/addresses/:addressId', partyController.updatePartyAddress);
router.delete('/:id/addresses/:addressId', partyController.deletePartyAddress);

// Party bank account routes
router.get('/:partyId/bank-accounts', partyController.getPartyBankAccounts);
router.post('/:partyId/bank-accounts', checkPlanExpiry, partyController.addPartyBankAccount);
router.put('/:partyId/bank-accounts/:bankId', checkPlanExpiry, partyController.updatePartyBankAccount);
router.delete('/:partyId/bank-accounts/:bankId', checkPlanExpiry, partyController.deletePartyBankAccount);

router.get('/:id', partyController.getPartyById);
// Single route that handles both JSON and FormData updates
router.put('/:id', checkPlanExpiry, upload.uploadDirect.single('logo'), updatePartyValidation, partyController.updateParty);
router.delete('/:id', checkPlanExpiry, partyController.deleteParty);
router.delete('/:id/hard', checkPlanExpiry, partyController.hardDeleteParty);

module.exports = router;
