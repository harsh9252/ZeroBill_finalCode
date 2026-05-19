const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  toggleBusinessStatus,
  getCityByPincode,
  getCitiesByState,
  getVoucherSettings,
  updateVoucherSettings,
  deleteVoucherSettings
} = require('../controllers/businessController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const { protect: subUserProtect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');
const { adminOnly } = require('../middleware/adminOnlyMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadMultiple } = require('../middleware/uploadMiddleware');

// Validation rules
const businessValidation = [
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),
  body('email')
    .optional({ checkFalsy: true })
    .trim(),
  body('phone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      // Allow any number of digits
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 1) {
        throw new Error('Phone number cannot be empty');
      }
      return true;
    }),
  body('gstin')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(value)) {
        throw new Error('Invalid GSTIN format');
      }
      return true;
    }),
  body('vatNumber')
    .optional({ checkFalsy: true })
    .trim()
];


router.use(subUserProtect);


// Create business - Admin only
router.post('/', checkPlanExpiry, adminOnly, businessValidation, createBusiness);


router.get('/', getBusinesses);


router.get('/pincode/:pincode', getCityByPincode);


router.get('/cities/:state', getCitiesByState);


router.get('/:id', checkBusinessAccess, getBusinessById);


router.put('/:id', checkPlanExpiry, checkBusinessAccess, businessValidation, updateBusiness);

// Update business with file upload (logo and signature)
router.put('/:id/upload', checkPlanExpiry, checkBusinessAccess, uploadMultiple, updateBusiness);


router.delete('/:id', checkPlanExpiry, checkBusinessAccess, deleteBusiness);


router.patch('/:id/toggle', checkPlanExpiry, checkBusinessAccess, toggleBusinessStatus);

// Voucher Sequence/Prefix Settings
router.get('/voucher-settings/:businessId', checkPlanExpiry, getVoucherSettings);
router.put('/voucher-settings/:businessId', checkPlanExpiry, adminOnly, updateVoucherSettings);
router.delete('/voucher-settings/:businessId', checkPlanExpiry, adminOnly, deleteVoucherSettings);

module.exports = router;
