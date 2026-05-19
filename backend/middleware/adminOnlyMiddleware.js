const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Middleware to ensure only admin users (from users table) can access certain routes
exports.adminOnly = async (req, res, next) => {
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

      // Check if this is a sub-user token (sub-users should not access admin routes)
      if (decoded.isSubUser) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Admin privileges required'
        });
      }

      // Get admin user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Admin user not found'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }

      // Attach admin user to request
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: true
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};