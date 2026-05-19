const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { emailRateLimiter } = require('../middleware/rateLimitMiddleware');

// Validation rules
const signupValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 digits')
    .matches(/^\+?\d+$/)
    .withMessage('Phone number must contain only digits'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', emailRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// OTP routes
router.post('/send-otp', emailRateLimiter, authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// Google SSO route
router.post('/google', authController.googleAuth);


// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

module.exports = router;
