const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createSubUser,
  getSubUsers,
  getSubUser,
  updateSubUser,
  deleteSubUser,
  subUserLogin,
  changeSubUserPassword,
  toggleSubUserStatus
} = require('../controllers/subUserController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminOnlyMiddleware');

// Validation middleware
const validateSubUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('businessIds')
    .optional()
    .isArray()
    .withMessage('Business IDs must be an array')
];

const validateSubUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('businessIds')
    .optional()
    .isArray()
    .withMessage('Business IDs must be an array')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validatePasswordChange = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes
router.post('/login', validateLogin, subUserLogin);

// Protected routes (require admin user authentication)
router.use(adminOnly); // All routes below require admin authentication

router.post('/', checkPlanExpiry, validateSubUser, createSubUser);
router.get('/', getSubUsers);
router.get('/:id', getSubUser);
router.put('/:id', checkPlanExpiry, validateSubUserUpdate, updateSubUser);
router.patch('/:id/status', checkPlanExpiry, toggleSubUserStatus);
router.delete('/:id', checkPlanExpiry, deleteSubUser);
router.put('/:id/password', checkPlanExpiry, validatePasswordChange, changeSubUserPassword);

module.exports = router;