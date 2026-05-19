const { pool } = require('../config/database');

// @desc    Get Dashboard Statistics
// @route   GET /api/superadmin/dashboard/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    // Get total users
    const [totalUsersResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users (created in last 30 days)
    const [activeUsersResult] = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_active = true 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get total transactions
    const [totalTransactionsResult] = await pool.query(`
      SELECT COUNT(*) as count FROM billing_history 
      WHERE payment_status = 'success'
    `);
    const totalTransactions = totalTransactionsResult[0]?.count || 0;

    // Get pending issues (pending approvals)
    const [pendingIssuesResult] = await pool.query(`
      SELECT COUNT(*) as count FROM account_approvals 
      WHERE status = 'pending'
    `);
    const pendingIssues = pendingIssuesResult[0]?.count || 0;

    // Get total revenue
    const [totalRevenueResult] = await pool.query(`
      SELECT SUM(amount) as total FROM billing_history 
      WHERE payment_status = 'success'
    `);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Get monthly revenue
    const [monthlyRevenueResult] = await pool.query(`
      SELECT SUM(amount) as total FROM billing_history 
      WHERE payment_status = 'success'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Get new users this month
    const [newUsersResult] = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);
    const newUsersThisMonth = newUsersResult[0]?.count || 0;

    // Get transactions this month
    const [monthlyTransactionsResult] = await pool.query(`
      SELECT COUNT(*) as count FROM billing_history 
      WHERE payment_status = 'success'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);
    const transactionsThisMonth = monthlyTransactionsResult[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTransactions,
        pendingIssues,
        totalRevenue,
        monthlyRevenue,
        newUsersThisMonth,
        transactionsThisMonth
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get Recent Activity
// @route   GET /api/superadmin/dashboard/recent-activity
// @access  Private
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const offset = req.query.offset || 0;

    // Get recent user signups
    const [recentSignups] = await pool.query(`
      SELECT 
        id,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        created_at,
        'user_signup' as type
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Get recent transactions
    const [recentTransactions] = await pool.query(`
      SELECT 
        bh.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        bh.amount,
        bh.plan_type,
        bh.payment_status,
        bh.created_at,
        'transaction' as type
      FROM billing_history bh
      JOIN users u ON bh.user_id = u.id
      WHERE bh.payment_status = 'success'
      ORDER BY bh.created_at DESC
      LIMIT 5
    `);

    // Combine and sort activities
    const activities = [
      ...recentSignups.map(signup => ({
        id: `signup-${signup.id}`,
        type: 'user_signup',
        description: `New user ${signup.name} signed up`,
        name: signup.name,
        email: signup.email,
        timestamp: signup.created_at,
        details: { userName: signup.name, userEmail: signup.email }
      })),
      ...recentTransactions.map(txn => ({
        id: `txn-${txn.id}`,
        type: 'transaction',
        description: `Transaction of ₹${txn.amount} completed for ${txn.name}`,
        name: txn.name,
        email: txn.email,
        timestamp: txn.created_at,
        details: { amount: txn.amount, plan: txn.plan_type, status: txn.payment_status }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent activity',
      error: error.message
    });
  }
};
