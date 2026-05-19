const { pool } = require('../config/database');

// @desc    Get All Pending Account Approvals
// @route   GET /api/superadmin/approvals
// @access  Private
exports.getPendingApprovals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let searchCondition = '';
    let searchParams = [];

    if (search) {
      searchCondition = `
        WHERE (
          CONCAT(aa.first_name, ' ', aa.last_name) LIKE ? 
          OR aa.email LIKE ? 
          OR aa.business_name LIKE ?
        ) AND aa.status = 'pending'
      `;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    } else {
      searchCondition = 'WHERE aa.status = \'pending\'';
    }

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM account_approvals aa
      ${searchCondition}
    `, searchParams);

    const total = countResult[0]?.total || 0;

    // Get pending approvals
    const [approvals] = await pool.query(`
      SELECT 
        aa.id,
        aa.user_id,
        CONCAT(aa.first_name, ' ', aa.last_name) as name,
        aa.email,
        aa.phone,
        aa.business_name,
        aa.gst_number,
        aa.status,
        aa.created_at as requestDate
      FROM account_approvals aa
      ${searchCondition}
      ORDER BY aa.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        approvals: approvals || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: 'Failed to get pending approvals',
      error: error.message
    });
  }
};

// @desc    Get Approval Details
// @route   GET /api/superadmin/approvals/:approvalId
// @access  Private
exports.getApprovalDetails = async (req, res) => {
  try {
    const approvalId = req.params.approvalId;

    const [approvals] = await pool.query(`
      SELECT 
        aa.id,
        aa.user_id,
        CONCAT(aa.first_name, ' ', aa.last_name) as name,
        aa.email,
        aa.phone,
        aa.business_name,
        aa.gst_number,
        aa.status,
        aa.rejection_reason,
        aa.created_at as requestDate,
        aa.approved_at,
        u.is_active
      FROM account_approvals aa
      LEFT JOIN users u ON aa.user_id = u.id
      WHERE aa.id = ?
    `, [approvalId]);

    if (!approvals.length) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: approvals[0]
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get approval details',
      error: error.message
    });
  }
};

// @desc    Approve Account
// @route   PUT /api/superadmin/approvals/:approvalId/approve
// @access  Private
exports.approveAccount = async (req, res) => {
  try {
    const approvalId = req.params.approvalId;
    const superAdminId = req.user.id;

    // Get approval details
    const [approvals] = await pool.query(`
      SELECT * FROM account_approvals WHERE id = ?
    `, [approvalId]);

    if (!approvals.length) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    const approval = approvals[0];

    // Update user to active
    await pool.query(`
      UPDATE users SET is_active = true WHERE id = ?
    `, [approval.user_id]);

    // Update approval status
    await pool.query(`
      UPDATE account_approvals 
      SET status = 'approved', approved_at = NOW(), approved_by = ?
      WHERE id = ?
    `, [superAdminId, approvalId]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status)
      VALUES (?, 'account_approved', 'account_approval', ?, 'success')
    `;
    await pool.query(auditQuery, [superAdminId, approvalId]);

    res.status(200).json({
      success: true,
      message: 'Account approved successfully',
      data: {
        id: approvalId,
        status: 'approved',
        approvedAt: new Date()
      }
    });
  } catch (error) {
  
    res.status(500).json({
      success: false,
      message: 'Failed to approve account',
      error: error.message
    });
  }
};

// @desc    Reject Account
// @route   PUT /api/superadmin/approvals/:approvalId/reject
// @access  Private
exports.rejectAccount = async (req, res) => {
  try {
    const approvalId = req.params.approvalId;
    const superAdminId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Update approval status
    await pool.query(`
      UPDATE account_approvals 
      SET status = 'rejected', rejection_reason = ?, approved_by = ?
      WHERE id = ?
    `, [reason, superAdminId, approvalId]);

    // Log audit
    const auditQuery = `
      INSERT INTO audit_logs (super_admin_id, action, target_type, target_id, status, changes)
      VALUES (?, 'account_rejected', 'account_approval', ?, 'success', ?)
    `;
    const changes = JSON.stringify({ reason });
    await pool.query(auditQuery, [superAdminId, approvalId, changes]);

    res.status(200).json({
      success: true,
      message: 'Account rejected successfully',
      data: {
        id: approvalId,
        status: 'rejected',
        reason
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to reject account',
      error: error.message
    });
  }
};

// @desc    Get Approval Statistics
// @route   GET /api/superadmin/approvals/stats/summary
// @access  Private
exports.getApprovalStats = async (req, res) => {
  try {
    // Get pending count
    const [pendingResult] = await pool.query(`
      SELECT COUNT(*) as count FROM account_approvals WHERE status = 'pending'
    `);
    const pendingCount = pendingResult[0]?.count || 0;

    // Get approved count
    const [approvedResult] = await pool.query(`
      SELECT COUNT(*) as count FROM account_approvals WHERE status = 'approved'
    `);
    const approvedCount = approvedResult[0]?.count || 0;

    // Get rejected count
    const [rejectedResult] = await pool.query(`
      SELECT COUNT(*) as count FROM account_approvals WHERE status = 'rejected'
    `);
    const rejectedCount = rejectedResult[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount
      }
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to get approval statistics',
      error: error.message
    });
  }
};
