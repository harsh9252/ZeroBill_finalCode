const { pool } = require('../config/database');

// @desc    Get All Transactions
// @route   GET /api/superadmin/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    const paymentMethod = req.query.paymentMethod || '';

    const offset = (page - 1) * limit;

    // Build where clause
    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`
        (bh.id LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ?)
      `);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereConditions.push('bh.payment_status = ?');
      params.push(status);
    }

    if (startDate) {
      whereConditions.push('DATE(bh.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(bh.created_at) <= ?');
      params.push(endDate);
    }

    if (paymentMethod) {
      whereConditions.push('bh.payment_method = ?');
      params.push(paymentMethod);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM billing_history bh
      LEFT JOIN users u ON bh.user_id = u.id
      LEFT JOIN account_approvals aa ON bh.approval_id = aa.id
      ${whereClause}
    `, params);

    const total = countResult[0]?.total || 0;

    // Get transactions
    const [transactions] = await pool.query(`
      SELECT 
        bh.id as transactionId,
        CONCAT('TXN', LPAD(bh.id, 6, '0')) as transactionNumber,
        bh.approval_id as approvalId,
        bh.user_id as userId,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'N/A') as userName,
        COALESCE(u.email, 'N/A') as userEmail,
        COALESCE(u.phone, 'N/A') as userPhone,
        bh.plan_type as plan,
        bh.amount,
        bh.currency,
        bh.payment_status as status,
        bh.payment_method as paymentMethod,
        bh.transaction_id as gatewayTransactionId,
        bh.reference_number as referenceNumber,
        bh.created_at as date,
        bh.updated_at as updatedAt,
        COALESCE(aa.first_name, 'N/A') as approvalFirstName,
        COALESCE(aa.last_name, 'N/A') as approvalLastName,
        COALESCE(aa.email, 'N/A') as approvalEmail,
        COALESCE(aa.plan_name, 'N/A') as approvalPlanName,
        COALESCE(aa.status, 'N/A') as approvalStatus
      FROM billing_history bh
      LEFT JOIN users u ON bh.user_id = u.id
      LEFT JOIN account_approvals aa ON bh.approval_id = aa.id
      ${whereClause}
      ORDER BY bh.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get summary
    const [summaryResult] = await pool.query(`
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN payment_status = 'success' THEN 1 ELSE 0 END) as completedTransactions,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pendingTransactions,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failedTransactions,
        SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) as totalRevenue
      FROM billing_history bh
      LEFT JOIN users u ON bh.user_id = u.id
      LEFT JOIN account_approvals aa ON bh.approval_id = aa.id
      ${whereClause}
    `, params);

    const summary = summaryResult[0] || {};

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalTransactions: summary.totalTransactions || 0,
          completedTransactions: summary.completedTransactions || 0,
          pendingTransactions: summary.pendingTransactions || 0,
          failedTransactions: summary.failedTransactions || 0,
          totalRevenue: summary.totalRevenue || 0
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

// @desc    Get Specific Transaction
// @route   GET /api/superadmin/transactions/:transactionId
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transactionId = req.params.transactionId;

    const [transactions] = await pool.query(`
      SELECT 
        bh.id as transactionId,
        CONCAT('TXN', LPAD(bh.id, 6, '0')) as transactionNumber,
        bh.approval_id as approvalId,
        bh.user_id as userId,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'N/A') as userName,
        COALESCE(u.email, 'N/A') as userEmail,
        COALESCE(u.phone, 'N/A') as userPhone,
        bh.plan_type as plan,
        bh.amount,
        bh.currency,
        bh.created_at as date,
        bh.updated_at as updatedAt,
        bh.payment_status as status,
        bh.payment_method as paymentMethod,
        bh.transaction_id as gatewayTransactionId,
        bh.reference_number as referenceNumber,
        COALESCE(a.address_line_1, 'N/A') as billingAddress,
        COALESCE(aa.first_name, 'N/A') as approvalFirstName,
        COALESCE(aa.last_name, 'N/A') as approvalLastName,
        COALESCE(aa.email, 'N/A') as approvalEmail,
        COALESCE(aa.phone, 'N/A') as approvalPhone,
        COALESCE(aa.plan_name, 'N/A') as approvalPlanName,
        COALESCE(aa.plan_type, 'N/A') as approvalPlanType,
        COALESCE(aa.plan_price, 0) as approvalPlanPrice,
        COALESCE(aa.status, 'N/A') as approvalStatus,
        aa.created_at as approvalCreatedAt
      FROM billing_history bh
      LEFT JOIN users u ON bh.user_id = u.id
      LEFT JOIN address a ON u.id = a.user_id
      LEFT JOIN account_approvals aa ON bh.approval_id = aa.id
      WHERE bh.id = ?
    `, [transactionId]);

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transactions[0]
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error.message
    });
  }
};

// @desc    Get User Transactions
// @route   GET /api/superadmin/transactions/user/:userId
// @access  Private
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM billing_history 
      WHERE user_id = ?
    `, [userId]);

    const total = countResult[0]?.total || 0;

    // Get transactions
    const [transactions] = await pool.query(`
      SELECT 
        id as transactionId,
        CONCAT('TXN', LPAD(id, 6, '0')) as transactionId,
        plan_type as plan,
        amount,
        created_at as date,
        payment_status as status
      FROM billing_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user transactions',
      error: error.message
    });
  }
};

// @desc    Export Transactions
// @route   GET /api/superadmin/transactions/export
// @access  Private
exports.exportTransactions = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const status = req.query.status || '';

    let query = `
      SELECT 
        CONCAT('TXN', LPAD(bh.id, 6, '0')) as transactionId,
        CONCAT(u.first_name, ' ', u.last_name) as userName,
        u.email as userEmail,
        bh.plan_type as plan,
        bh.amount,
        bh.created_at as date,
        bh.payment_status as status,
        bh.payment_method as paymentMethod
      FROM billing_history bh
      JOIN users u ON bh.user_id = u.id
    `;

    if (status) {
      query += ` WHERE bh.payment_status = '${status}'`;
    }

    query += ' ORDER BY bh.created_at DESC';

    const [transactions] = await pool.query(query);

    res.status(200).json({
      success: true,
      data: transactions,
      message: `${transactions.length} transactions exported successfully`
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
};
