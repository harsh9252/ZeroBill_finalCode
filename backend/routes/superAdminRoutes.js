const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const superAdminAuthController = require('../controllers/superAdminAuthController');
const superAdminDashboardController = require('../controllers/superAdminDashboardController');
const superAdminUserController = require('../controllers/superAdminUserController');
const superAdminTransactionController = require('../controllers/superAdminTransactionController');
const accountApprovalsController = require('../controllers/accountApprovalsController');
const demoManagementController = require('../controllers/demoManagementController');
const { verifySuperAdminToken, isSuperAdmin } = require('../middleware/superAdminAuthMiddleware');

// ==========================================
// Authentication Routes (Public)
// ==========================================

// Login
router.post(
  '/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().trim()
  ],
  superAdminAuthController.login
);

// Logout
router.post('/auth/logout', verifySuperAdminToken, superAdminAuthController.logout);

// Refresh Token
router.post(
  '/auth/refresh-token',
  [body('refreshToken').notEmpty()]
  , superAdminAuthController.refreshToken
);

// ==========================================
// Profile Routes (Private)
// ==========================================

// Get Profile
router.get('/profile', verifySuperAdminToken, superAdminAuthController.getProfile);

// Update Profile
router.put(
  '/profile',
  verifySuperAdminToken,
  [
    body('name').notEmpty().trim(),
    body('phone').notEmpty().trim()
  ],
  superAdminAuthController.updateProfile
);

// Change Password
router.put(
  '/password',
  verifySuperAdminToken,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
    body('confirmPassword').notEmpty()
  ],
  superAdminAuthController.changePassword
);

// Get System Status
router.get('/system/status', verifySuperAdminToken, superAdminAuthController.getSystemStatus);

// ==========================================
// Dashboard Routes (Private)
// ==========================================

// Get Dashboard Statistics
router.get('/dashboard/stats', verifySuperAdminToken, superAdminDashboardController.getStats);

// Get Recent Activity
router.get('/dashboard/recent-activity', verifySuperAdminToken, superAdminDashboardController.getRecentActivity);

// ==========================================
// User Management Routes (Private)
// ==========================================

// Get All Active Users
router.get('/users/active', verifySuperAdminToken, superAdminUserController.getActiveUsers);

// Get Specific Active User
router.get('/users/active/:userId', verifySuperAdminToken, superAdminUserController.getActiveUserById);

// Get All Inactive Users
router.get('/users/inactive', verifySuperAdminToken, superAdminUserController.getInactiveUsers);

// Get All Deleted Users
router.get('/users/deleted', verifySuperAdminToken, superAdminUserController.getDeletedUsers);

// Update User
router.put(
  '/users/:userId',
  verifySuperAdminToken,
  [
    body('name').optional().trim(),
    body('phone').optional().trim()
  ],
  superAdminUserController.updateUser
);

// Deactivate User
router.put(
  '/users/:userId/deactivate',
  verifySuperAdminToken,
  [body('reason').notEmpty().trim()],
  superAdminUserController.deactivateUser
);

// Restore User
router.put(
  '/users/:userId/restore',
  verifySuperAdminToken,
  superAdminUserController.restoreUser
);

// Permanently Delete User
router.delete(
  '/users/:userId/permanent',
  verifySuperAdminToken,
  [body('confirmPassword').notEmpty()],
  superAdminUserController.permanentlyDeleteUser
);

// Export Users
router.get('/users/export', verifySuperAdminToken, superAdminUserController.exportUsers);

// ==========================================
// Transaction Routes (Private)
// ==========================================

// Get All Transactions
router.get('/transactions', verifySuperAdminToken, superAdminTransactionController.getTransactions);

// Get Specific Transaction
router.get('/transactions/:transactionId', verifySuperAdminToken, superAdminTransactionController.getTransactionById);

// Get User Transactions
router.get('/transactions/user/:userId', verifySuperAdminToken, superAdminTransactionController.getUserTransactions);

// Export Transactions
router.get('/transactions/export', verifySuperAdminToken, superAdminTransactionController.exportTransactions);

// ==========================================
// Account Approvals Routes (Private)
// ==========================================

// Get All Pending Approvals
router.get('/approvals', verifySuperAdminToken, accountApprovalsController.getPendingApprovals);

// Get Approval Details
router.get('/approvals/:approvalId', verifySuperAdminToken, accountApprovalsController.getApprovalDetails);

// Approve Account
router.put(
  '/approvals/:approvalId/approve',
  verifySuperAdminToken,
  accountApprovalsController.approveAccount
);

// Reject Account
router.put(
  '/approvals/:approvalId/reject',
  verifySuperAdminToken,
  [body('reason').notEmpty().trim()],
  accountApprovalsController.rejectAccount
);

// ==========================================
// Demo Management Routes (Private)
// ==========================================

// Get all availability overrides
router.get('/demo/availability', verifySuperAdminToken, demoManagementController.getOverrides);

// Set availability override
router.post('/demo/availability', verifySuperAdminToken, demoManagementController.setOverride);

// Remove availability override
router.delete('/demo/availability', verifySuperAdminToken, demoManagementController.removeOverride);

module.exports = router;
