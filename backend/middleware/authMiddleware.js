const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      let userData = {};

      if (decoded.isSubUser) {
        const SubUser = require('../models/subUserModel');
        user = await SubUser.findById(decoded.id);
        if (user) {
          userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            isSubUser: true,
            parentUserId: user.parent_user_id,
            ownerEmail: user.parent_email,
            accessibleBusinessIds: user.businessIds || []
          };
        }
      } else {
        user = await User.findById(decoded.id);
        if (user) {
          userData = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isSubUser: false,
            ownerEmail: user.email
          };
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Attach user to request
      req.user = userData;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Check plan expiry for write operations
exports.checkPlanExpiry = async (req, res, next) => {
  try {
    // Only block POST, PUT, DELETE requests
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const billingService = require('../services/billingService');

      // If it's a sub-user, we check the parent user's plan
      const targetUserId = req.user.isSubUser ? req.user.parentUserId : req.user.id;

      const planStatus = await billingService.getPlanStatus(targetUserId);

      if (planStatus.isExpired) {
        return res.status(403).json({
          success: false,
          message: 'The subscription plan for this account has expired. Please upgrade to continue performing this action.',
          isExpired: true,
          expiryDate: planStatus.expiryDate
        });
      }
    }
    next();
  } catch (error) {
    console.error('Plan expiry check error:', error);
    next(); // Proceed anyway, or return error? Proceeding is safer for UX if billing check fails
  }
};
