const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const supportController = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');
const { emailRateLimiter } = require('../middleware/rateLimitMiddleware');

// Validation rules
const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
];

// Protected routes (require authentication)
router.post('/contact', protect, emailRateLimiter, contactValidation, supportController.sendSupportMessage);

module.exports = router;