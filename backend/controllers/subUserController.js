const SubUser = require('../models/subUserModel');
const Business = require('../models/businessModel');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const nodemailerService = require('../utils/nodemailerService');
const { pool } = require('../config/database');

// Generate JWT Token for sub-user
const generateToken = (subUserId, isSubUser = true) => {
  return jwt.sign({
    id: subUserId,
    isSubUser: isSubUser
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Create new sub-user
// @route   POST /api/sub-users
// @access  Private (Parent User only)
exports.createSubUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, permissions } = req.body;
    let { businessIds } = req.body; // Use let instead of const for businessIds
    const parentUserId = req.user.id;

    // Check if email already exists
    const existingSubUser = await SubUser.findByEmail(email);
    if (existingSubUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check sub-user limit based on current plan
    const [planRows] = await pool.query(`
      SELECT pp.max_subusers 
      FROM billing_history bh
      JOIN pricing_plans pp ON bh.plan_type = pp.name
      WHERE bh.user_id = ? AND bh.payment_status = 'success' AND bh.billing_period_end > NOW()
      ORDER BY bh.billing_period_end DESC
      LIMIT 1
    `, [parentUserId]);

    const maxSubUsers = planRows.length > 0 ? planRows[0].max_subusers : 0; // Default to 0 if no active plan
    
    // Count current active sub-users
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as count FROM sub_users WHERE parent_user_id = ?
    `, [parentUserId]);
    
    const currentSubUserCount = countRows[0].count;

    if (maxSubUsers !== -1 && currentSubUserCount >= maxSubUsers) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. You can only create ${maxSubUsers} sub-user${maxSubUsers > 1 ? 's' : ''}. Please upgrade your plan or please contact admin.`
      });
    }

    // Verify that all business IDs belong to the parent user
    if (businessIds && businessIds.length > 0) {
      const parentBusinesses = await Business.findByUserId(parentUserId);
      const parentBusinessIds = parentBusinesses.map(b => b.id);

      // Ensure businessIds are numbers for comparison
      const businessIdsAsNumbers = businessIds.map(id => parseInt(id));

      const invalidBusinessIds = businessIdsAsNumbers.filter(id => !parentBusinessIds.includes(id));

      if (invalidBusinessIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid business IDs provided'
        });
      }

      // Use the converted numbers for creation
      businessIds = businessIdsAsNumbers;
    }

    // Create sub-user
    const subUser = await SubUser.create({
      parentUserId,
      name,
      email,
      password,
      businessIds,
      permissions
    });

    res.status(201).json({
      success: true,
      message: 'Sub-user created successfully',
      data: subUser
    });

    // Send welcome email asynchronously
    try {
      const businesses = await Business.findByIds(businessIds || []);
      const businessNames = businesses.map(b => b.business_name || b.businessName || b.name);
      

      await nodemailerService.sendSubUserWelcomeEmail(name, email, password, businessNames);
    } catch (emailError) {
      console.error('Error sending welcome email to sub-user:', emailError.message);
      // We don't want to fail the request if email sending fails
    }
  } catch (error) {
    console.error('Create sub-user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all sub-users for parent user
// @route   GET /api/sub-users
// @access  Private (Parent User only)
exports.getSubUsers = async (req, res) => {
  try {
    const parentUserId = req.user.id;
    const subUsers = await SubUser.findByParentUserId(parentUserId);

    res.status(200).json({
      success: true,
      data: subUsers
    });
  } catch (error) {
    console.error('Get sub-users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get sub-user by ID
// @route   GET /api/sub-users/:id
// @access  Private (Parent User only)
exports.getSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const subUser = await SubUser.findById(id);

    if (!subUser) {
      return res.status(404).json({
        success: false,
        message: 'Sub-user not found'
      });
    }

    // Verify that sub-user belongs to the requesting parent user
    if (subUser.parent_user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: subUser
    });
  } catch (error) {
    console.error('Get sub-user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update sub-user
// @route   PUT /api/sub-users/:id
// @access  Private (Parent User only)
exports.updateSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, businessIds, password, permissions } = req.body;
    const parentUserId = req.user.id;

  

    // Check if sub-user exists and belongs to parent user
    const existingSubUser = await SubUser.findById(id);
    if (!existingSubUser || existingSubUser.parent_user_id !== parentUserId) {
      return res.status(404).json({
        success: false,
        message: 'Sub-user not found'
      });
    }

    // Check if email is already taken by another sub-user
    if (email !== existingSubUser.email) {
      const emailExists = await SubUser.findByEmail(email);
      if (emailExists && emailExists.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Verify business IDs belong to parent user
    if (businessIds && businessIds.length > 0) {
      const parentBusinesses = await Business.findByUserId(parentUserId);
      const parentBusinessIds = parentBusinesses.map(b => b.id);

      // Ensure businessIds are numbers for comparison and update
      const businessIdsAsNumbers = businessIds.map(id => parseInt(id));

      const invalidBusinessIds = businessIdsAsNumbers.filter(id => !parentBusinessIds.includes(id));
      if (invalidBusinessIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid business IDs provided'
        });
      }

      // Use the converted numbers
      req.body.businessIds = businessIdsAsNumbers;
    }

    // Update password first if provided
    if (password && password.trim() !== '') {
      await SubUser.updatePassword(id, password);
    }

    // Update sub-user basic info
    const updatedSubUser = await SubUser.update(id, {
      name,
      email,
      businessIds: req.body.businessIds || businessIds,
      permissions
    });

 
    res.status(200).json({
      success: true,
      message: 'Sub-user updated successfully',
      data: updatedSubUser
    });
  } catch (error) {
    console.error('=== UPDATE SUB-USER ERROR ===');
    console.error('Update sub-user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle sub-user status (activate/deactivate)
// @route   PATCH /api/sub-users/:id/toggle-status
// @access  Private (Parent User only)
exports.toggleSubUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const parentUserId = req.user.id;

    // Check if sub-user exists and belongs to parent user
    const existingSubUser = await SubUser.findById(id);
    if (!existingSubUser || existingSubUser.parent_user_id !== parentUserId) {
      return res.status(404).json({
        success: false,
        message: 'Sub-user not found'
      });
    }

    await SubUser.toggleStatus(id, is_active);

    res.status(200).json({
      success: true,
      message: `Sub-user ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: { is_active }
    });
  } catch (error) {
    console.error('Toggle sub-user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete sub-user (Permanent)
// @route   DELETE /api/sub-users/:id
// @access  Private (Parent User only)
exports.deleteSubUser = async (req, res) => {
  try {
    const { id } = req.params;
    const parentUserId = req.user.id;

    // Check if sub-user exists and belongs to parent user
    const existingSubUser = await SubUser.findById(id);
    if (!existingSubUser || existingSubUser.parent_user_id !== parentUserId) {
      return res.status(404).json({
        success: false,
        message: 'Sub-user not found'
      });
    }

    // Permanent delete
    const query = 'DELETE FROM sub_users WHERE id = ?';
    await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      message: 'Sub-user deleted permanently'
    });
  } catch (error) {
    console.error('Delete sub-user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Sub-user login
// @route   POST /api/sub-users/login
// @access  Public
exports.subUserLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find sub-user by email
    const subUser = await SubUser.findByEmail(email);
    if (!subUser) {
      return res.status(404).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await SubUser.comparePassword(password, subUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!subUser.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your admin.'
      });
    }


    // Get accessible businesses
    const accessibleBusinesses = await SubUser.getAccessibleBusinesses(subUser.id);

    // Generate token
    const token = generateToken(subUser.id, true);

    // Get parent user's billing status
    const billingService = require('../services/billingService');
    const planStatus = await billingService.getPlanStatus(subUser.parent_user_id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        subUser: {
          id: subUser.id,
          name: subUser.name,
          email: subUser.email,
          parentUserId: subUser.parent_user_id,
          isSubUser: true,
          billingPeriodEnd: planStatus.expiryDate,
          isPlanExpired: planStatus.isExpired,
          permissions: subUser.permissions
        },
        accessibleBusinesses,
        token
      }
    });
  } catch (error) {
    console.error('Sub-user login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change sub-user password
// @route   PUT /api/sub-users/:id/password
// @access  Private (Parent User only)
exports.changeSubUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const parentUserId = req.user.id;

    // Check if sub-user exists and belongs to parent user
    const existingSubUser = await SubUser.findById(id);
    if (!existingSubUser || existingSubUser.parent_user_id !== parentUserId) {
      return res.status(404).json({
        success: false,
        message: 'Sub-user not found'
      });
    }

    await SubUser.updatePassword(id, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change sub-user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = exports;