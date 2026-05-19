const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/superAdminModel');

// Verify Super Admin Token
exports.verifySuperAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Check if user is super admin
      if (decoded.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Super Admin only.'
        });
      }

      // Get super admin details
      const superAdmin = await SuperAdmin.findById(decoded.id);
      if (!superAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Super Admin not found'
        });
      }

      // Check if account is active
      if (superAdmin.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Attach user to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        ...superAdmin
      };

      next();
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

// Check if user is Super Admin
exports.isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin only.'
    });
  }
  next();
};

// Optional token verification (doesn't fail if no token)
exports.optionalSuperAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (!err && decoded.role === 'superadmin') {
          const superAdmin = await SuperAdmin.findById(decoded.id);
          if (superAdmin && superAdmin.status === 'active') {
            req.user = {
              id: decoded.id,
              role: decoded.role,
              ...superAdmin
            };
          }
        }
      });
    }

    next();
  } catch (error) {
    console.error('Optional token verification error:', error);
    next();
  }
};
