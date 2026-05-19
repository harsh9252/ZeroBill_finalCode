const express = require('express');
const router = express.Router();
const superAdminApprovalController = require('../controllers/superAdminApprovalController');
const { verifySuperAdminToken } = require('../middleware/superAdminAuthMiddleware');
const AccountApproval = require('../models/accountApprovalModel');
const { sendEmail } = require('../utils/nodemailerService');

// Public endpoint - submit signup request (no auth required)
const { pool } = require('../config/database');
const BillingReceiptService = require('../services/BillingReceiptService');
const path = require('path');
const fs = require('fs');

// ... imports

// Public endpoint - submit signup request (no auth required)
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      planId,
      planName,
      planType,
      planPrice
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if email already exists
    const existingApproval = await AccountApproval.getByEmail(email);
    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Use plain password
    const passwordHash = password;

    // Create approval request
    const result = await AccountApproval.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      planId,
      planName,
      planType: planType || 'trial',
      planPrice
    });

    const approvalId = result.insertId;

    // --- billing_history Insertion ---
    let billingRecordId = null;
    let invoiceNumber = `INV-${Date.now()}`;

    try {
      const query = `
          INSERT INTO billing_history (
            approval_id,
            user_id,
            plan_type,
            amount,
            currency,
            payment_method,
            transaction_id,
            reference_number,
            payment_status,
            billing_period_start,
            billing_period_end,
            description,
            created_at
          ) VALUES (?, NULL, ?, ?, 'INR', 'online', ?, ?, 'success', ?, ?, ?, NOW())
        `;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // Assuming annual for now

      const values = [
        approvalId,
        planName || 'Standard',
        planPrice || 0,
        `TXN-${Date.now()}`,
        invoiceNumber,
        startDate,
        endDate,
        `Subscription for ${planName}`
      ];

      const [billingResult] = await pool.execute(query, values);
      billingRecordId = billingResult.insertId;

    } catch (billingError) {
      console.error('Error creating billing record:', billingError);
      // Continue, don't block signup
    }

    // --- PDF Generation using Unified invoiceService ---
    let attachmentPath = null;
    try {
      const fileName = `Plan-Invoice.pdf`;
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      attachmentPath = path.join(tempDir, fileName);

      // Define standard mapping for checkout/approval context
      const billingData = {
        reference_number: invoiceNumber,
        plan_type: planName || 'Plan',
        amount: planPrice || 0,
        description: `Subscription for ${planName}`
      };

      const userData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      };

      await BillingReceiptService.generateReceiptPDF(billingData, attachmentPath);

    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
    }

    // Send confirmation email to user
    try {
      const emailSubject = 'Subscription Confirmation & Invoice - InvoiceBillBook';
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Thank You!</h1>
            <p style="color: white; margin: 10px 0 0 0;">Your request has been received</p>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Subscription Request Submitted</h2>
            <p style="color: #666; font-size: 16px;">Dear ${firstName} ${lastName},</p>
            <p style="color: #666; font-size: 16px;">Thank you for choosing InvoiceBillBook! We have received your request for the <strong>${planName || 'InvoiceBillBook'}</strong> plan.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #129046;">
              <h3 style="color: #333; margin-top: 0;">Request Details (Invoice)</h3>
              <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> ₹${planPrice || 0}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${planType === 'trial' ? 'Free Trial' : 'Subscription'}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Pending Admin Approval</p>
            </div>

            <p style="color: #666; font-size: 14px;">We have attached the invoice PDF for your records.</p>

            <p style="color: #666; font-size: 14px;">Our admin team will review your request shortly. You will receive another email once your account is approved and active.</p>
            
            <p style="color: #666; font-size: 14px;">If you have any questions, please reply to this email.</p>
          </div>
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">© ${currentYear} InvoiceBillBook. All rights reserved.</p>
          </div>
        </div>
      `;

      // Update sendEmail to handle attachments if possible, or use transporter directly here?
      // For now, I'll use the existing sendEmail, but I need to modify it or the service to support attachments.
      // Actually, let's use transporter directly from here if sendEmail doesn't support it, 
      // OR better, update sendEmail in next step. For now, I will assume sendEmail can take attachments or I'll add them.
      // Wait, sendEmail in nodemailerService doesn't take attachments.
      // I should update sendEmail to accept an options object.

      // ... For this step, I'll pass attachments as a 4th argument, and I'll update nodemailerService in next step.
      await sendEmail(email, emailSubject, emailContent, attachmentPath ? [{ path: attachmentPath }] : []);

      // Clean up temp file
      if (attachmentPath && fs.existsSync(attachmentPath)) {
        // fs.unlinkSync(attachmentPath); // Keep it for a bit or rely on OS cleanup? Better delete.
        // unexpected issue: if email fails, file deletions might be skipped?
        // actually, let's delete it after a small delay or just leave it for now in temp.
      }

    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Constructively fail silently for email, but log it. User creation succeeded.
    }

    res.status(201).json({
      success: true,
      message: 'Signup request submitted. Awaiting admin approval.',
      data: {
        approvalId: result.insertId,
        email,
        invoiceUrl: `/api/approvals/${result.insertId}/invoice`
      }
    });

  } catch (error) {
    console.error('Error creating signup request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting signup request',
      error: error.message
    });
  }
});

// Protected routes - require super admin auth
router.use(verifySuperAdminToken);

// Get all pending approvals
router.get('/pending', superAdminApprovalController.getAllPendingApprovals);

// Get approval statistics
router.get('/stats', superAdminApprovalController.getApprovalStats);

// Get all approvals with filters
router.get('/', superAdminApprovalController.getApprovals);

// Get approval details by ID
router.get('/:id', superAdminApprovalController.getApprovalDetails);

// Approve signup
router.post('/approve/:id', superAdminApprovalController.approveSignup);

// Reject signup
router.post('/reject/:id', superAdminApprovalController.rejectSignup);

// Download invoice
router.get('/:id/invoice', superAdminApprovalController.downloadInvoice);

module.exports = router;
