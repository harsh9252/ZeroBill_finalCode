const jwt = require('jsonwebtoken');
const SubUser = require('../models/subUserModel');
const User = require('../models/userModel');

// Protect routes - verify JWT token for both main users and sub-users
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

      // Check if this is a sub-user token
      if (decoded.isSubUser) {
        // Get sub-user from token
        const subUser = await SubUser.findById(decoded.id);

        if (!subUser) {
          return res.status(401).json({
            success: false,
            message: 'Sub-user not found'
          });
        }

        if (!subUser.is_active) {
          return res.status(401).json({
            success: false,
            message: 'Sub-user account is deactivated'
          });
        }


        // Attach sub-user info to request
        req.user = {
          id: subUser.id,
          email: subUser.email,
          name: subUser.name,
          parentUserId: subUser.parent_user_id,
          isSubUser: true,
          ownerEmail: subUser.parent_email,
          accessibleBusinessIds: subUser.businessIds || []
        };
      } else {
        // Regular user token
        const user = await User.findById(decoded.id);

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
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isSubUser: false,
          ownerEmail: user.email
        };
      }

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

// Middleware to check business access for sub-users
exports.checkBusinessAccess = async (req, res, next) => {
  try {
    // If not a sub-user, allow access (main users can access all their businesses)
    if (!req.user.isSubUser) {
      return next();
    }

    // Get business ID from request (could be in params, query, or body)
    // Check for 'id' in params as well, since many routes use it as the business ID
    let businessId = req.params.businessId || req.params.id || req.query.business_id || req.body.business_id;

    // If no business ID specified, continue (will be filtered in the controller)
    if (!businessId) {
      return next();
    }

    // Convert to number for comparison
    businessId = parseInt(businessId);

    // Check if sub-user has access to this business
    if (!req.user.accessibleBusinessIds.includes(businessId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this business'
      });
    }

    next();
  } catch (error) {
    console.error('Business access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during business access check',
      error: error.message
    });
  }
};