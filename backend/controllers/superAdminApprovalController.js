const AccountApproval = require('../models/accountApprovalModel');
const User = require('../models/userModel');
const { sendEmail } = require('../utils/nodemailerService');
const BillingReceiptService = require('../services/BillingReceiptService');
const path = require('path');
const fs = require('fs');

// Get all pending approvals
exports.getAllPendingApprovals = async (req, res) => {
  try {
    const approvals = await AccountApproval.getPending();

    res.status(200).json({
      success: true,
      data: {
        approvals: approvals || [],
        totalPending: approvals?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending approvals',
      error: error.message
    });
  }
};

// Get approvals with filters
exports.getApprovals = async (req, res) => {
  try {
    const { status, email } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (email) filters.email = email;

    const approvals = await AccountApproval.getAll(filters);

    res.status(200).json({
      success: true,
      data: approvals,
      count: approvals.length
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approvals',
      error: error.message
    });
  }
};

// Approve signup request (create user account)
exports.approveSignup = async (req, res) => {
  try {
    const { id } = req.params;
    const superAdminId = req.user.id;

    // Get approval details
    const approval = await AccountApproval.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a ${approval.status} request`
      });
    }

    // Create user account
    const userData = {
      firstName: approval.first_name,
      lastName: approval.last_name,
      email: approval.email,
      phone: approval.phone,
      password: approval.password_hash, // Already hashed
      planId: approval.plan_id,
      planType: approval.plan_type
    };

    const userResult = await User.create(userData);

    // Link billing history to new user
    // We do this by updating the user_id for any billing records associated with this approval_id
    try {
      const { pool } = require('../config/database');
      await pool.execute(
        'UPDATE billing_history SET user_id = ? WHERE approval_id = ?',
        [userResult.insertId, id]
      );
    
    } catch (billingError) {
      console.error('Error linking billing history:', billingError);
      // Don't fail the request, just log it. Data is still there with approval_id.
    }

    // Update approval status
    await AccountApproval.approve(id, superAdminId);

    // Update user_id in account_approvals
    await AccountApproval.updateUserId(id, userResult.insertId);

    // Send approval email to user
    try {
      const loginLink = `${process.env.FRONTEND_URL}/login`;
      const emailContent = `
        <h2>Your Signup Request Approved!</h2>
        <p>Dear ${approval.first_name} ${approval.last_name},</p>
        <p>Your signup request has been approved. You can now login to your account.</p>
        <h3>Login Credentials:</h3>
        <p><strong>Email:</strong> ${approval.email}</p>
        <p><strong>Password:</strong> Use the password you set during signup</p>
        <p><a href="${loginLink}">Click here to login</a></p>
        <p>Plan: ${approval.plan_name}</p>
      `;

      await sendEmail(
        approval.email,
        'Signup Request Approved - InvoiceBillBook',
        emailContent
      );
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Signup request approved successfully',
      data: {
        approvalId: id,
        userId: userResult.insertId,
        email: approval.email,
        status: 'approved'
      }
    });
  } catch (error) {
    console.error('Error approving signup request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving signup request',
      error: error.message
    });
  }
};

// Reject signup request
exports.rejectSignup = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const superAdminId = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Get approval details
    const approval = await AccountApproval.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a ${approval.status} request`
      });
    }

    // Update approval status
    await AccountApproval.reject(id, superAdminId, rejectionReason);

    // Send rejection email to user
    try {
      const emailContent = `
        <h2>Signup Request Rejected</h2>
        <p>Dear ${approval.first_name} ${approval.last_name},</p>
        <p>Unfortunately, your signup request has been rejected.</p>
        <p><strong>Reason:</strong> ${rejectionReason}</p>
        <p>Please contact support for more information.</p>
      `;

      await sendEmail(
        approval.email,
        'Signup Request Rejected - InvoiceBillBook',
        emailContent
      );
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Signup request rejected successfully',
      data: {
        approvalId: id,
        email: approval.email,
        status: 'rejected',
        rejectionReason
      }
    });
  } catch (error) {
    console.error('Error rejecting signup request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting signup request',
      error: error.message
    });
  }
};

// Get approval details by ID
exports.getApprovalDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const approval = await AccountApproval.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: approval
    });
  } catch (error) {
    console.error('Error fetching approval details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approval details',
      error: error.message
    });
  }
};

// Get dashboard statistics
exports.getApprovalStats = async (req, res) => {
  try {
    const pending = await AccountApproval.getAll({ status: 'pending' });
    const approved = await AccountApproval.getAll({ status: 'approved' });
    const rejected = await AccountApproval.getAll({ status: 'rejected' });

    res.status(200).json({
      success: true,
      data: {
        pending: pending?.length || 0,
        approved: approved?.length || 0,
        rejected: rejected?.length || 0,
        total: (pending?.length || 0) + (approved?.length || 0) + (rejected?.length || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approval stats',
      error: error.message
    });
  }
};

// Download invoice for signup request
exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Get approval details to find the invoice
    const approval = await AccountApproval.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    // Check if we have a billing record
    const { pool } = require('../config/database');
    const [billingRows] = await pool.execute(
      'SELECT reference_number FROM billing_history WHERE approval_id = ?',
      [id]
    );

    // Get the invoice number from billing record if exists, otherwise generate a temporary one
    const invoiceNumber = billingRows.length > 0 ? billingRows[0].reference_number : `INV-${Date.now()}`;
    const fileName = `Plan-Invoice.pdf`;
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const filePath = path.join(tempDir, fileName);

    const billingData = {
      reference_number: invoiceNumber,
      plan_name: approval.plan_name || 'Plan',
      plan_type: approval.plan_type || 'Subscription',
      amount: parseFloat(approval.plan_price || 0),
      description: `Subscription for ${approval.plan_name}`
    };

    const userData = {
      first_name: approval.first_name,
      last_name: approval.last_name,
      email: approval.email,
      phone: approval.phone
    };

    await BillingReceiptService.generateReceiptPDF(billingData, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading invoice PDF:', err);
      }
      // Optional: delete file after download
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error('Error deleting temp PDF file:', unlinkError);
      }
    });

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading invoice',
      error: error.message
    });
  }
};
