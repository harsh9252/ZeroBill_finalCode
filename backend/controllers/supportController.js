const { validationResult } = require('express-validator');
const { sendSupportEmail } = require('../utils/nodemailerService');

// @desc    Send support email
// @route   POST /api/support/contact
// @access  Private (user must be authenticated)
exports.sendSupportMessage = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Send support email to admin
    try {
      await sendSupportEmail(email, name, subject, message);

      res.status(200).json({
        success: true,
        message: 'Support message sent successfully! We will get back to you soon.'
      });
    } catch (emailError) {
      console.error('Support email sending failed:', emailError);

      // In development, still return success but log the error
      if (process.env.NODE_ENV === 'development') {
        res.status(200).json({
          success: true,
          message: 'Support message received (email not configured in development)',
          note: 'Configure email settings in .env to send actual emails'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send support message. Please try again later.'
        });
      }
    }
  } catch (error) {
    console.error('Support message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending support message',
      error: error.message
    });
  }
};