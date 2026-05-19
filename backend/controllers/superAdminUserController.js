const { pool } = require('../config/database');
const SuperAdmin = require('../models/superAdminModel');

// @desc    Get All Active Users
// @route   GET /api/superadmin/users/active
// @access  Private
exports.getActiveUsers = async (req, res) => {
  try {
 
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

  

    // Build search condition
    let searchCondition = '';
    let searchParams = [];

    if (search) {
      searchCondition = `
        WHERE (
          CONCAT(u.first_name, ' ', u.last_name) LIKE ? 
          OR u.email LIKE ? 
          OR u.phone LIKE ?
        ) AND u.is_active = true
      `;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    } else {
      searchCondition = 'WHERE u.is_active = true';
    }

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM users u
      ${searchCondition}
    `, searchParams);

    const total = countResult[0]?.total || 0;

    // Get users with their latest billing info
    const [users] = await pool.query(`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        u.phone,
        u.created_at as joinDate,
        COALESCE(latest_bh.plan_type, 'N/A') as subscription,
        latest_bh.billing_period_end as subscriptionExpiryDate,
        'active' as status
      FROM users u
      LEFT JOIN (
        SELECT bh1.*
        FROM billing_history bh1
        INNER JOIN (
          SELECT user_id, MAX(created_at) as max_created_at
          FROM billing_history
          GROUP BY user_id
        ) bh2 ON bh1.user_id = bh2.user_id AND bh1.created_at = bh2.max_created_at
      ) latest_bh ON u.id = latest_bh.user_id
      ${searchCondition}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]);

  

    res.status(200).json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active users',
      error: error.message
    });
  }
};

// @desc    Get Specific Active User
// @route   GET /api/superadmin/users/active/:userId
// @access  Private
exports.getActiveUserById = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [users] = await pool.query(`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        u.phone,
        b.business_name as business,
        b.business_type as businessType,
        u.created_at as joinDate,
        'active' as status,
        'Premium' as subscription,
        DATE_ADD(u.created_at, INTERVAL 1 YEAR) as subscriptionExpiry,
        u.updated_at as lastLogin,
        (SELECT COUNT(*) FROM billing_history WHERE user_id = u.id) as totalTransactions,
        (SELECT SUM(amount) FROM billing_history WHERE user_id = u.id AND payment_status = 'success') as totalSpent,
        a.address_line_1 as address,
        b.gst_number as gstNumber
      FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      LEFT JOIN address a ON u.id = a.user_id
      WHERE u.id = ? AND u.is_active = true
    `, [userId]);

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

// @desc    Get All Inactive Users
// @route   GET /api/superadmin/users/inactive
// @access  Private
exports.getInactiveUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    let searchCondition = '';
    let searchParams = [];

    if (search && search.trim()) {
      searchCondition = `
        AND (
          CONCAT(u.first_name, ' ', u.last_name) LIKE ? 
          OR u.email LIKE ? 
          OR b.business_name LIKE ?
        )
      `;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      WHERE u.is_active = false ${searchCondition}
    `, searchParams);

    const total = countResult[0]?.total || 0;

    // Get inactive users with their latest billing info
    const [users] = await pool.query(`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        u.phone,
        b.business_name as business,
        u.updated_at as deactivatedDate,
        'Deactivated by Super Admin' as reason,
        'Inactive' as status,
        COALESCE(latest_bh.plan_type, 'N/A') as subscription,
        latest_bh.billing_period_end as subscriptionExpiryDate
      FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      LEFT JOIN (
        SELECT bh1.*
        FROM billing_history bh1
        INNER JOIN (
          SELECT user_id, MAX(created_at) as max_created_at
          FROM billing_history
          GROUP BY user_id
        ) bh2 ON bh1.user_id = bh2.user_id AND bh1.created_at = bh2.max_created_at
      ) latest_bh ON u.id = latest_bh.user_id
      WHERE u.is_active = false ${searchCondition}
      ORDER BY u.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inactive users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inactive users',
      error: error.message
    });
  }
};

// @desc    Get All Deleted Users
// @route   GET /api/superadmin/users/deleted
// @access  Private
exports.getDeletedUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    let searchCondition = '';
    let searchParams = [];

    if (search && search.trim()) {
      searchCondition = `
        AND (
          CONCAT(u.first_name, ' ', u.last_name) LIKE ? 
          OR u.email LIKE ? 
          OR b.business_name LIKE ?
        )
      `;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      WHERE u.is_active = false ${searchCondition}
    `, searchParams);

    const total = countResult[0]?.total || 0;

    // Get deleted users
    const [users] = await pool.query(`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        b.business_name as business,
        u.updated_at as deletedDate,
        'User requested permanent deletion' as reason,
        'Deleted' as type,
        u.created_at as lastActive
      FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      WHERE u.is_active = false ${searchCondition}
      ORDER BY u.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deleted users',
      error: error.message
    });
  }
};

// @desc    Update User
// @route   PUT /api/superadmin/users/:userId
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const superAdminId = req.user.id;
    const { name, phone } = req.body;

    // Update user
    const query = `
      UPDATE users 
      SET first_name = ?, phone = ?, updated_at = NOW()
      WHERE id = ?
    `;
    await pool.query(query, [name, phone, userId]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status, changes)
      VALUES (?, 'user_updated', 'user', ?, 'success', ?)
    `;
    const changes = JSON.stringify({ name, phone });
    await pool.query(auditQuery, [superAdminId, userId, changes]);

    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// @desc    Deactivate User
// @route   PUT /api/superadmin/users/:userId/deactivate
// @access  Private
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const superAdminId = req.user.id;
    const { reason } = req.body;

    // Deactivate user
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = ?
    `;
    await pool.query(query, [userId]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status, changes)
      VALUES (?, 'user_deactivated', 'user', ?, 'success', ?)
    `;
    const changes = JSON.stringify({ reason });
    await pool.query(auditQuery, [superAdminId, userId, changes]);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        id: userId,
        status: 'inactive',
        deactivatedDate: new Date(),
        reason
      }
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};

// @desc    Restore User
// @route   PUT /api/superadmin/users/:userId/restore
// @access  Private
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const superAdminId = req.user.id;

    // Restore user
    const query = `
      UPDATE users 
      SET is_active = true, updated_at = NOW()
      WHERE id = ?
    `;
    await pool.query(query, [userId]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status)
      VALUES (?, 'user_restored', 'user', ?, 'success')
    `;
    await pool.query(auditQuery, [superAdminId, userId]);

    res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: {
        id: userId,
        status: 'active',
        restoredDate: new Date()
      }
    });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore user',
      error: error.message
    });
  }
};

// @desc    Permanently Delete User
// @route   DELETE /api/superadmin/users/:userId/permanent
// @access  Private
exports.permanentlyDeleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const superAdminId = req.user.id;
    // Delete user and all related data (cascades handle most of it)
    // 1. Explicitly delete businesses to trigger cascading deletes
    await pool.query('DELETE FROM businesses WHERE user_id = ?', [userId]);

    // 2. Delete the user
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status)
      VALUES (?, 'user_permanently_deleted', 'user', ?, 'success')
    `;
    await pool.query(auditQuery, [superAdminId, userId]);

    res.status(200).json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error) {
    console.error('Permanently delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete user',
      error: error.message
    });
  }
};

// @desc    Export Users
// @route   GET /api/superadmin/users/export
// @access  Private
exports.exportUsers = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const type = req.query.type || 'active';

    let query = `
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        u.phone,
        b.business_name as business,
        u.created_at as joinDate,
        'active' as status
      FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
    `;

    if (type === 'active') {
      query += ' WHERE u.is_active = true';
    } else if (type === 'inactive') {
      query += ' WHERE u.is_active = false';
    }

    const [users] = await pool.query(query);

    res.status(200).json({
      success: true,
      data: users,
      message: `${users.length} users exported successfully`
    });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: error.message
    });
  }
};
