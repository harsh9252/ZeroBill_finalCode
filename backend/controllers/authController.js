const User = require('../models/userModel');
const SubUser = require('../models/subUserModel');
const { OAuth2Client } = require('google-auth-library');
const OTP = require('../models/otpModel');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/nodemailerService');
const BillingReceiptService = require('../services/BillingReceiptService');
const { pool } = require('../config/database');
const path = require('path');

const fs = require('fs');
const billingService = require('../services/billingService');
const { createUserFolder } = require('../utils/fileUtils');

// Generate JWT Token
const generateToken = (userId, isSubUser = false) => {
  return jwt.sign({
    id: userId,
    isSubUser: isSubUser
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
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

    const { firstName, lastName, email, phone, password, planId } = req.body;

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const existingUserByPhone = await User.findByPhone(phone);
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    // Create user's upload folder
    createUserFolder(email);

    // Fetch plan details from database
    let planData = null;

    try {
      const targetPlanId = planId || 4; // Fallback to 4 only if somehow missing, but we'll try to get the real one
      const [planRows] = await pool.query('SELECT id, name, period, offer_price FROM pricing_plans WHERE id = ?', [targetPlanId]);
      if (planRows.length > 0) {
        planData = planRows[0];
      }
    } catch (planFetchError) {

    }

    if (!planData) {
      // Default fallback if plan doesn't exist (safety)
      planData = { id: 4, name: 'Starter', period: 'year', offer_price: 0 };
    }

    // Add billing plan
    try {
      const referenceNumber = `PLAN-${user.id}-${Date.now()}`;
      const billingQuery = `
        INSERT INTO billing_history (
          user_id,
          plan_type,
          amount,
          currency,
          payment_method,
          transaction_id,
          reference_number,
          payment_status,
          billing_period_start,
          billing_period_end,
          plan_validations,
          description,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const startDate = new Date();
      const endDate = new Date();

      // Calculate end date based on plan period
      if (planData.period === 'year' || planData.period === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (planData.period === 'quarter') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (planData.period === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // Assume daily or fallback
        const days = parseInt(planData.period) || 30;
        endDate.setDate(endDate.getDate() + days);
      }

      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      await pool.execute(billingQuery, [
        user.id,
        planData.name,
        planData.offer_price,
        'INR',
        'registration',
        null,
        referenceNumber,
        'success',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        diffDays,
        `Plan assigned during registration: ${planData.name}`
      ]);


    } catch (billingError) {

    }

    // Send welcome email with login credentials
    try {
      // Generate invoice PDF
      const invoiceNumber = `INV-${user.id}-${Date.now()}`;
      const tempDir = path.join(__dirname, '../temp');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const invoicePath = path.join(tempDir, `${invoiceNumber}.pdf`);

      const invoiceData = {
        invoiceNumber: invoiceNumber,
        customerName: `${user.firstName} ${user.lastName}`,
        customerEmail: user.email,
        customerPhone: user.phone,
        date: new Date(),
        amount: parseFloat(planData.offer_price).toFixed(2),
        planName: planData.name,
        description: `Account Creation - ${planData.name} (${planData.period})`,
        paymentStatus: 'success',
        transactionId: `TXN-${user.id}-${Date.now()}`
      };

      // Generate PDF
      await BillingReceiptService.generateReceiptPDF(invoiceData, invoicePath);

      // Send welcome email
      await sendWelcomeEmail(
        {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: password
        },
        {
          planName: planData.name,
          planPrice: parseFloat(planData.offer_price).toFixed(2),
          planPeriod: planData.period === 'year' ? 'Annual' : planData.period === 'quarter' ? 'Quarterly' : 'Monthly',
          validityDays: planData.period === 'year' ? 365 : planData.period === 'quarter' ? 90 : 30
        },
        invoicePath
      );


      // Clean up invoice file after sending (optional - keep for records)
      // setTimeout(() => {
      //   if (fs.existsSync(invoicePath)) {
      //     fs.unlinkSync(invoicePath);
      //   }
      // }, 5000);

    } catch (emailError) {

      // Don't fail signup if email fails
    }

    // Generate token
    const token = generateToken(user.id);

    // Get billing status
    const planStatus = await billingService.getPlanStatus(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          billingPeriodEnd: planStatus.expiryDate,
          isPlanExpired: planStatus.isExpired,
          plan: planStatus.planType
        },
        token
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier & password required'
      });
    }

    // Find user by email or phone
    let user = await User.findByEmailOrPhone(identifier);
    let isSubUser = false;
    let accessibleBusinesses = [];

    if (!user) {
      // Check if it's a sub-user (only email search for sub-users for now)
      user = await SubUser.findByEmail(identifier);
      if (user) {
        isSubUser = true;
        accessibleBusinesses = await SubUser.getAccessibleBusinesses(user.id);
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email or phone number'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = isSubUser
      ? await SubUser.comparePassword(password, user.password)
      : await User.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Generate token
    const token = generateToken(user.id, isSubUser);

    // Update last login if it's a sub-user
    if (isSubUser) {
      await SubUser.updateLastLogin(user.id);
    }

    // Get billing status (use parent user's ID for sub-users)
    const targetUserIdForBilling = isSubUser ? user.parent_user_id : user.id;
    const planStatus = await billingService.getPlanStatus(targetUserIdForBilling);

    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        isSubUser: isSubUser,
        billingPeriodEnd: planStatus.expiryDate,
        isPlanExpired: planStatus.isExpired,
        plan: planStatus.planType
      },
      token
    };

    if (isSubUser) {
      responseData.user.id = user.id;
      responseData.user.name = user.name;
      responseData.user.parentUserId = user.parent_user_id;
      responseData.user.permissions = user.permissions;
      responseData.accessibleBusinesses = accessibleBusinesses;
    } else {
      responseData.user.firstName = user.first_name;
      responseData.user.lastName = user.last_name;
      responseData.user.phone = user.phone;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: responseData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private

exports.getMe = async (req, res) => {
  try {
    // Ensure user folder exists (for first-time login/dashboard access)
    if (req.user && req.user.email) {
      createUserFolder(req.user.email);
    }
    let userData = {};
    let targetUserIdForBilling = req.user.id;

    if (req.user.isSubUser) {
      const SubUser = require('../models/subUserModel');
      const user = await SubUser.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Sub-user not found'
        });
      }

      // Check if sub-user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          isDeactivated: true, // Specific flag for the frontend
          message: 'Account is deactivated'
        });
      }

      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubUser: true,
        parentUserId: user.parent_user_id,
        createdAt: user.created_at,
        permissions: user.permissions
      };

      // Also get accessible businesses for sub-users
      const accessibleBusinesses = await SubUser.getAccessibleBusinesses(user.id);
      userData.accessibleBusinesses = accessibleBusinesses;

      targetUserIdForBilling = user.parent_user_id;
    } else {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        isActive: user.is_active,
        createdAt: user.created_at,
        isSubUser: false
      };
    }

    // Get billing status
    const planStatus = await billingService.getPlanStatus(targetUserIdForBilling);

    res.status(200).json({
      success: true,
      data: {
        ...userData,
        billingPeriodEnd: planStatus.expiryDate,
        isPlanExpired: planStatus.isExpired,
        plan: planStatus.planType
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    // Handle sub-user profile update
    if (req.user && req.user.isSubUser) {
      const existingSubUser = await SubUser.findById(req.user.id);
      if (!existingSubUser) {
        return res.status(404).json({
          success: false,
          message: 'Sub-user not found'
        });
      }

      const updatedSubUser = await SubUser.update(req.user.id, {
        name: firstName || existingSubUser.name,
        email: existingSubUser.email, // Email usually read-only for sub-users
        permissions: existingSubUser.permissions
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedSubUser.id,
          name: updatedSubUser.name,
          email: updatedSubUser.email,
          isSubUser: true
        }
      });
    }

    const updatedUser = await User.update(req.user.id, {
      firstName,
      lastName,
      phone
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByEmail(req.user.email);

    // Verify current password
    const isPasswordValid = await User.comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Forgot password (send reset link/OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    let user = await User.findByEmail(email);
    let isSubUser = false;

    if (!user) {
      user = await SubUser.findByEmail(email);
      isSubUser = true;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No user found with this email'
        });
      }
    }

    // Generate and save OTP for password reset
    const OTP = require('../models/otpModel');
    const { sendOTPEmail } = require('../utils/nodemailerService');

    // Check for rate limiting (throttling)
    const lastSent = await OTP.getLastOTPTimestamp(email, 'reset_password');
    if (lastSent) {
      const secondsPassed = Math.floor((new Date() - new Date(lastSent)) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          waitSeconds: 60 - secondsPassed,
          message: `Please wait ${60 - secondsPassed} seconds before requesting another reset OTP`
        });
      }
    }

    const otp = await OTP.create(email, 'reset_password');

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, 'reset_password');

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your email'
      });
    } catch (emailError) {

      res.status(500).json({
        success: false,
        message: 'Failed to send reset OTP. Please try again later.',
        error: emailError.message
      });
    }
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset password (verify OTP and update password)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Verify OTP
    const OTP = require('../models/otpModel');
    const verification = await OTP.verify(email, otp, 'reset_password');

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.message
      });
    }

    // Find user (check both tables)
    let user = await User.findByEmail(email);
    let isSubUser = false;

    if (!user) {
      user = await SubUser.findByEmail(email);
      isSubUser = true;
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    // Update password in appropriate table
    if (isSubUser) {
      await SubUser.updatePassword(user.id, newPassword);
    } else {
      await User.updatePassword(user.id, newPassword);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Send OTP to email for login
// @route   POST /api/auth/send-otp
// @access  Public

exports.sendOTP = async (req, res) => {
  try {
    const { email, gstin, vatNumber, purpose } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // For business verification, we don't strictly need a user account to exist for that specific email
    const user = await User.findByEmail(email);

    if (!user && purpose !== 'business_verification') {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    if (user && !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate and save OTP
    const OTP = require('../models/otpModel');

    // Check for rate limiting (throttling)
    const lastSent = await OTP.getLastOTPTimestamp(email, purpose || 'login');
    if (lastSent) {
      const secondsPassed = Math.floor((new Date() - new Date(lastSent)) / 1000);
      if (secondsPassed < 60) {
        return res.status(429).json({
          success: false,
          waitSeconds: 60 - secondsPassed,
          message: `Please wait ${60 - secondsPassed} seconds before requesting another OTP`
        });
      }
    }

    let otp;
    try {
      otp = await OTP.create(email, purpose || 'login');
    } catch (dbError) {
      console.error('OTP Database Error:', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP. Server error.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, purpose || 'login', { gstin, vatNumber });

      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email successfully'
      });
    } catch (emailError) {
      console.error('SMTP Error:', emailError.message);
      
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please check email configuration.',
          error: emailError.message

        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again.',
          error: emailError.message
        });
      }
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Server error during OTP request',
        error: error.message
      });
    }
  }
};

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verification = await OTP.verify(email, otp, purpose || 'login');

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.message
      });
    }

    // If it's just for business verification, we can stop here with success
    if (purpose === 'business_verification') {
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    }

    // Get user details
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Get billing status
    const planStatus = await billingService.getPlanStatus(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
          billingPeriodEnd: planStatus.expiryDate,
          isPlanExpired: planStatus.isExpired,
          plan: planStatus.planType
        },
        token
      }
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Google SSO Sign In / Sign Up
// @route   POST /api/auth/google
// @access  Public

exports.googleAuth = async (req, res) => {
  try {
    const { token, access_token } = req.body;

    if (!token && !access_token) {
      return res.status(400).json({ success: false, message: 'Google token is required' });
    }

    let email, given_name, family_name, name, picture, googleId;

    if (access_token) {
      // access_token flow (from useGoogleLogin hook - custom button)
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const userInfo = await userInfoRes.json();
        if (!userInfo.email) {
          return res.status(401).json({ success: false, message: 'Failed to get user info from Google.' });
        }
        ({ email, given_name, family_name, name, picture, sub: googleId } = userInfo);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid Google access token.' });
      }
    } else {
      // ID token flow (from GoogleLogin component)
      try {
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        ({ email, given_name, family_name, name, picture, sub: googleId } = payload);
      } catch (verifyErr) {
        return res.status(401).json({ success: false, message: 'Invalid Google token. Please try again.' });
      }
    }

    // Check if user already exists in DB
    let user = await User.findByEmail(email);
    let isSubUser = false;
    let accessibleBusinesses = [];

    if (!user) {
      // Check if it's a sub-user
      user = await SubUser.findByEmail(email);
      if (user) {
        isSubUser = true;
        accessibleBusinesses = await SubUser.getAccessibleBusinesses(user.id);
      }
    }

    if (!user) {

      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'New user detected. Redirecting to checkout.',
        data: {
          user: {
            firstName: given_name || 'User',
            lastName: family_name || '',
            email: email,
            picture: picture || ''
          }
        }
      });
    }


    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate JWT
    const jwtToken = generateToken(user.id, isSubUser);

    // Update last login for sub-users
    if (isSubUser) {
      await SubUser.updateLastLogin(user.id);
    }

    // Get billing status (use parent user's ID for sub-users)
    const targetUserIdForBilling = isSubUser ? user.parent_user_id : user.id;
    const planStatus = await billingService.getPlanStatus(targetUserIdForBilling);

    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        isSubUser: isSubUser,
        picture: user.picture || picture || null,
        provider: 'google',
        billingPeriodEnd: planStatus.expiryDate,
        isPlanExpired: planStatus.isExpired,
        plan: planStatus.planType
      },
      token: jwtToken,
    };

    if (isSubUser) {
      responseData.user.name = user.name;
      responseData.user.parentUserId = user.parent_user_id;
      responseData.accessibleBusinesses = accessibleBusinesses;
    } else {
      responseData.user.firstName = user.first_name || user.firstName;
      responseData.user.lastName = user.last_name || user.lastName;
      responseData.user.phone = user.phone || '';
    }

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      isNewUser: false,
      data: responseData
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication',
      error: error.message
    });
  }
};


