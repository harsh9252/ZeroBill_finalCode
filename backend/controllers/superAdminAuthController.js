const SuperAdmin = require('../models/superAdminModel');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

// Generate JWT Token
const generateToken = (superAdminId) => {
  return jwt.sign({ id: superAdminId, role: 'superadmin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (superAdminId) => {
  return jwt.sign({ id: superAdminId, role: 'superadmin' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Super Admin Login
// @route   POST /api/superadmin/auth/login
// @access  Public
exports.login = async (req, res) => {
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

    const { email, password } = req.body;

    // Find super admin by email
    const superAdmin = await SuperAdmin.findByEmail(email);
    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if it's actually a super admin
    if (superAdmin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin only.'
      });
    }

    // Check if account is locked
    const isLocked = await SuperAdmin.isAccountLocked(superAdmin.id);
    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked. Please try again later.'
      });
    }

    // Check if account is active
    if (superAdmin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Compare password
    const isPasswordValid = await SuperAdmin.comparePassword(password, superAdmin.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await SuperAdmin.incrementLoginAttempts(superAdmin.id);

      // Check if max attempts reached
      if (superAdmin.login_attempts >= 4) {
        await SuperAdmin.lockAccount(superAdmin.id, 30);
        return res.status(403).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 30 minutes.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Update last login
    await SuperAdmin.updateLastLogin(superAdmin.id, ipAddress, userAgent);

    // Generate tokens
    const token = generateToken(superAdmin.id);
    const refreshToken = generateRefreshToken(superAdmin.id);

    // Store session
    const sessionQuery = `
      INSERT INTO login_sessions (super_admin_id, token, refresh_token, ip_address, user_agent, login_at, expires_at, is_active)
      VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), TRUE)
    `;
    await pool.query(sessionQuery, [superAdmin.id, token, refreshToken, ipAddress, userAgent]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, status, ip_address, user_agent)
      VALUES (?, 'login', 'system', 'success', ?, ?)
    `;
    await pool.query(auditQuery, [superAdmin.id, ipAddress, userAgent]);

    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          phone: superAdmin.phone,
          role: superAdmin.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// @desc    Super Admin Logout
// @route   POST /api/superadmin/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];

    // Update session
    const query = `
      UPDATE login_sessions 
      SET is_active = FALSE, logout_at = NOW()
      WHERE super_admin_id = ? AND token = ?
    `;
    await pool.query(query, [superAdminId, token]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, status)
      VALUES (?, 'logout', 'system', 'success')
    `;
    await pool.query(auditQuery, [superAdminId]);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// @desc    Refresh Token
// @route   POST /api/superadmin/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new token
      const newToken = generateToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

      // Update session
      const query = `
        UPDATE login_sessions 
        SET token = ?, refresh_token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHERE super_admin_id = ? AND refresh_token = ?
      `;
      await pool.query(query, [newToken, newRefreshToken, decoded.id, refreshToken]);

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

// @desc    Get Super Admin Profile
// @route   GET /api/superadmin/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const superAdminId = req.user.id;

    const superAdmin = await SuperAdmin.findById(superAdminId);
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Super Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: superAdmin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// @desc    Update Super Admin Profile
// @route   PUT /api/superadmin/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    const updatedProfile = await SuperAdmin.updateProfile(superAdminId, { name, phone });

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, status, changes)
      VALUES (?, 'profile_updated', 'settings', 'success', ?)
    `;
    const changes = JSON.stringify({ name, phone });
    await pool.query(auditQuery, [superAdminId, changes]);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// @desc    Change Password
// @route   PUT /api/superadmin/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Get super admin
    const superAdmin = await SuperAdmin.findById(superAdminId);
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Super Admin not found'
      });
    }

    // Verify current password
    const isPasswordValid = await SuperAdmin.comparePassword(currentPassword, superAdmin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await SuperAdmin.updatePassword(superAdminId, newPassword);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, status)
      VALUES (?, 'password_changed', 'settings', 'success')
    `;
    await pool.query(auditQuery, [superAdminId]);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// @desc    Get System Status
// @route   GET /api/superadmin/system/status
// @access  Private
exports.getSystemStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        version: '2.0.1',
        lastUpdated: new Date(),
        databaseStatus: 'Connected',
        apiStatus: 'Operational',
        uptime: '99.9%'
      }
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: error.message
    });
  }
};
