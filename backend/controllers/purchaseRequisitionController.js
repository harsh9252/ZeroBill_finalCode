const PurchaseRequisition = require('../models/purchaseRequisitionModel');
const ApprovalWorkflow = require('../models/approvalWorkflowModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/nodemailerService');
const path = require('path');
const { generateInvoiceNumber, getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

const getBusinessId = async (req) => {
  let businessId = req.query.business_id || req.body.business_id;

  if (businessId) {
    if (req.user.isSubUser) {
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        const error = new Error('Invalid business access');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    } else {
      const business = await Business.findById(businessId);
      if (!business || business.user_id !== req.user.id) {
        const error = new Error('Invalid business access');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    }
  }

  if (req.user.isSubUser) {
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      const error = new Error('No accessible businesses found');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return req.user.accessibleBusinessIds[0];
  } else {
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses || businesses.length === 0) {
      const error = new Error('No business found');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return businesses[0].id;
  }
};

const notifyApprovers = async (prData, targetEmail = null) => {
  let emailToNotify = targetEmail;

  if (!emailToNotify) {
    // Determine who to notify based on sequential logic
    let levels = [];
    if (prData.approver_sequence) {
      levels = prData.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    } else {
      levels = [
        prData.level1_email ? prData.level1_email.toLowerCase().trim() : null,
        prData.level2_email ? prData.level2_email.toLowerCase().trim() : null,
        prData.level3_email ? prData.level3_email.toLowerCase().trim() : null
      ].filter(e => e);
    }

    const approvedBy = prData.approved_by ? prData.approved_by.split(',').map(e => e.trim().toLowerCase()) : [];
    
    if (levels.length === 0) return;

    if (approvedBy.length < levels.length) {
      emailToNotify = levels[approvedBy.length];
    } else {
      return; // All approved or no next level
    }
  }

  const email = emailToNotify.trim().toLowerCase();
  const subject = `Purchase Requisition Approval Required: ${prData.pr_number}`;
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #129046; padding: 20px; text-align: center; color: white;">
          <h2>Purchase Requisition Approval</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #eee;">
          <p>A new Purchase Requisition has been created/updated and requires your approval.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>PR Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${prData.pr_number}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${prData.pr_date}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Requester:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${prData.requester}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Item/Services:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${prData.item_services}</td></tr>
            
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Estimated Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #129046; font-weight: bold;">₹${parseFloat(prData.total_amount || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Comments:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${prData.comments || 'N/A'}</td></tr>
          </table>
          <p style="margin-bottom: 20px;">Please log in to the system to review details, or use the quick actions below to approve or reject this request directly from this email.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BACKEND_URL}/api/purchase-requisitions/public-action/${prData.id}?status=completed&email=${encodeURIComponent(email)}&action=Approve" 
               style="background-color: #129046; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 15px; display: inline-block;">
               APPROVE REQUEST
            </a>
            <a href="${process.env.BACKEND_URL}/api/purchase-requisitions/public-action/${prData.id}?status=rejected&email=${encodeURIComponent(email)}&action=Reject" 
               style="background-color: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
               REJECT REQUEST
            </a>
          </div>
          
          <p style="font-size: 13px; color: #666; font-style: italic;">Note: Selecting an action above will update the status immediately and record your email as the approver.</p>
        </div>
        <div style="background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px;">
          © InvoiceBillBook. All rights reserved.
        </div>
      </div>
    `;

    try {
      const attachments = [];
      if (prData.attachment) {
        let fileList = [];
        try {
          const parsed = JSON.parse(prData.attachment);
          fileList = Array.isArray(parsed) ? parsed : [prData.attachment];
        } catch (e) {
          fileList = [prData.attachment];
        }

        fileList.forEach((file, index) => {
          const absolutePath = path.join(__dirname, '..', file);
          attachments.push({
            filename: `PR-${prData.pr_number}-Att-${index + 1}${path.extname(file)}`,
            path: absolutePath
          });
        });
      }

      await sendEmail(email, subject, html, attachments);
    } catch (err) {
      console.error(`Failed to send approval email to ${email}:`, err.message);
    }
};

exports.createPR = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    let attachmentPaths = [];
    if (req.files && req.files.length > 0) {
      attachmentPaths = req.files.map(file => {
        const relativePath = file.path.split(/uploads[\\\/]/)[1];
        return `/uploads/${relativePath.replace(/\\/g, '/')}`;
      });
    }

    // Check for duplicate PR number
    if (req.body.pr_number) {
      const existingPR = await PurchaseRequisition.getByPRNumber(req.body.pr_number, businessId);
      if (existingPR) {
        return res.status(409).json({
          success: false,
          message: `Purchase Requisition number ${req.body.pr_number} already exists`,
          code: 'DUPLICATE_PR_NUMBER'
        });
      }
    }

    // Fetch dynamic approval workflow
    const workflowLevels = await ApprovalWorkflow.getWorkflow(businessId, 'purchase_requisition');
    let approverSequence = null;
    let lvl1 = req.body.level1_email;
    let lvl2 = req.body.level2_email;
    let lvl3 = req.body.level3_email;

    if (workflowLevels && workflowLevels.length > 0) {
      const emails = workflowLevels.map(l => l.approver_email.trim().toLowerCase());
      approverSequence = emails.join(',');
      lvl1 = emails[0] || null;
      lvl2 = emails[1] || null;
      lvl3 = emails[2] || null;
    }

    const prData = {
      business_id: businessId,
      pr_number: req.body.pr_number || await generateInvoiceNumber(businessId, 'purchase_requisition'),
      pr_date: (req.body.pr_date || new Date().toISOString()).split('T')[0],
      requester: req.body.requester,
      item_services: req.body.item_services,
      qty: parseFloat(req.body.qty) || 0,
      uom: req.body.uom,
      unit_price: parseFloat(req.body.unit_price) || 0,
      total_amount: parseFloat(req.body.total_amount) || 0,
      currency: req.body.currency || 'INR',
      comments: req.body.comments,
      attachment: attachmentPaths.length > 0 ? JSON.stringify(attachmentPaths) : null,
      status: req.body.status || 'pending',
      approvers: req.body.approvers,
      level1_email: lvl1,
      level2_email: lvl2,
      level3_email: lvl3,
      approver_sequence: approverSequence,
      items: req.body.items,
      created_by: req.user.id
    };

    const prId = await PurchaseRequisition.create(prData);

    // Notify approvers (Include ID for public links)
    notifyApprovers({ ...prData, id: prId });

    res.status(201).json({
      success: true,
      message: 'Purchase Requisition created successfully',
      data: { id: prId, ...prData }
    });
  } catch (error) {
    console.error('Error creating PR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Purchase Requisition',
      error: error.message
    });
  }
};

exports.getAllPRs = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const filters = {
      status: req.query.status
    };
    const prs = await PurchaseRequisition.getAll(businessId, filters);
    res.status(200).json({
      success: true,
      count: prs.length,
      data: prs
    });
  } catch (error) {
    console.error('Error fetching PRs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Requisitions',
      error: error.message
    });
  }
};

exports.getPRById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const pr = await PurchaseRequisition.getById(id, businessId);

    if (!pr) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pr
    });
  } catch (error) {
    console.error('Error fetching PR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Requisition',
      error: error.message
    });
  }
};

exports.updatePR = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const currentPR = await PurchaseRequisition.getById(id, businessId);
    if (!currentPR) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found'
      });
    }

    // Validation: Require PO number if status is being set to 'completed'
    if (req.body.status === 'completed' && !req.body.po_number && !currentPR.po_number) {
      return res.status(400).json({
        success: false,
        message: 'PO number is required when marking PR as completed'
      });
    }

    // Check for duplicate PR number if it's being changed
    if (req.body.pr_number && req.body.pr_number !== currentPR.pr_number) {
      const existingPR = await PurchaseRequisition.getByPRNumber(req.body.pr_number, businessId);
      if (existingPR) {
        return res.status(409).json({
          success: false,
          message: `Purchase Requisition number ${req.body.pr_number} already exists`,
          code: 'DUPLICATE_PR_NUMBER'
        });
      }
    }

    let existingPaths = [];
    try {
      existingPaths = req.body.existing_attachments ? JSON.parse(req.body.existing_attachments) : [];
    } catch (e) {
      existingPaths = [];
    }

    let newAttachmentPaths = [];
    if (req.files && req.files.length > 0) {
      newAttachmentPaths = req.files.map(file => {
        const relativePath = file.path.split(/uploads[\\\/]/)[1];
        return `/uploads/${relativePath.replace(/\\/g, '/')}`;
      });
    }

    const finalAttachmentPaths = [...existingPaths, ...newAttachmentPaths];
    const attachmentValue = finalAttachmentPaths.length > 0 ? JSON.stringify(finalAttachmentPaths) : null;

    // Load dynamic approval workflow if status is pending and we want to refresh/apply it
    let approverSequence = req.body.approver_sequence || currentPR.approver_sequence;
    let lvl1 = req.body.level1_email !== undefined ? req.body.level1_email : currentPR.level1_email;
    let lvl2 = req.body.level2_email !== undefined ? req.body.level2_email : currentPR.level2_email;
    let lvl3 = req.body.level3_email !== undefined ? req.body.level3_email : currentPR.level3_email;

    if ((!approverSequence || approverSequence === '') && (!lvl1 || lvl1 === '') && currentPR.status === 'pending') {
      const workflowLevels = await ApprovalWorkflow.getWorkflow(businessId, 'purchase_requisition');
      if (workflowLevels && workflowLevels.length > 0) {
        const emails = workflowLevels.map(l => l.approver_email.trim().toLowerCase());
        approverSequence = emails.join(',');
        lvl1 = emails[0] || null;
        lvl2 = emails[1] || null;
        lvl3 = emails[2] || null;
      }
    }

    const updatedData = {
      ...req.body,
      attachment: attachmentValue,
      items: req.body.items,
      currency: req.body.currency,
      level1_email: lvl1,
      level2_email: lvl2,
      level3_email: lvl3,
      approver_sequence: approverSequence
    };

    // Auto-complete if fully approved via manual override
    let levels = [];
    if (updatedData.approver_sequence) {
      levels = updatedData.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    } else {
      levels = [
        updatedData.level1_email,
        updatedData.level2_email,
        updatedData.level3_email
      ].map(e => e ? e.toLowerCase().trim() : null).filter(e => e);
    }
    
    const approvedList = (updatedData.approved_by || currentPR.approved_by || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    
    if (levels.length > 0 && levels.every(e => approvedList.includes(e)) && updatedData.status !== 'rejected') {
      updatedData.status = 'completed';
    }

    if (updatedData.pr_date) {
      updatedData.pr_date = updatedData.pr_date.split('T')[0];
    }

    if (updatedData.action_at) {
      updatedData.action_at = new Date(updatedData.action_at).toISOString().slice(0, 19).replace('T', ' ');
    }

    const updated = await PurchaseRequisition.update(id, businessId, updatedData);

    if (updated && (req.body.status || req.body.approved_by || req.body.level1_email || req.body.level2_email || req.body.level3_email || approverSequence)) {
      // Re-notify next level if status or approvals changed (Async - don't await)
      notifyApprovers({ ...currentPR, ...updatedData });
    }


    res.status(200).json({
      success: true,
      message: 'Purchase Requisition updated successfully'
    });
  } catch (error) {
    console.error('Error updating PR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Purchase Requisition',
      error: error.message
    });
  }
};

exports.deletePR = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const deleted = await PurchaseRequisition.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Requisition not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Requisition deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting PR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Purchase Requisition',
      error: error.message
    });
  }
};

exports.getNextNumber = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const nextNumber = await getUnifiedNextNumber(businessId, 'purchase_requisition');
    res.status(200).json({
      success: true,
      data: { pr_number: nextNumber }
    });
  } catch (error) {
    console.error('Error getting next PR number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next PR number',
      error: error.message
    });
  }
};

exports.publicAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, email, action } = req.query;

    const pr = await PurchaseRequisition.getByIdSimple(id);
    if (!pr) {
      return res.status(404).send('<h1>Purchase Requisition not found</h1>');
    }

    if (pr.status !== 'pending') {
      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #666;">Already Processed</h1>
          <p>This Purchase Requisition (PR: ${pr.pr_number}) has already been marked as <strong>${pr.status}</strong>.</p>
          <a href="${process.env.FRONTEND_URL}/#/dashboard" style="color: #129046; font-weight: bold; text-decoration: none;">← Go to Dashboard</a>
        </div>
      `);
    }

    const updatedData = {
      action_by_name: email ? email.split('@')[0] : 'Approver',
      action_by_email: email || 'N/A',
      action_at: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 19).replace('T', ' ') 
    };

    let finalStatus = pr.status;
    let successMessage = `PR ${action}d!`;
    let detailMessage = '';

    if (status === 'rejected') {
      finalStatus = 'rejected';
      successMessage = 'PR Rejected';
      detailMessage = `Purchase Requisition <strong>${pr.pr_number}</strong> has been rejected by <strong>${email}</strong>.`;
    } else {
      // Sequential Logic for Multi-Approval
      let levels = [];
      if (pr.approver_sequence) {
        levels = pr.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
      } else {
        levels = [
          pr.level1_email ? pr.level1_email.toLowerCase().trim() : null,
          pr.level2_email ? pr.level2_email.toLowerCase().trim() : null,
          pr.level3_email ? pr.level3_email.toLowerCase().trim() : null
        ].filter(e => e);
      }
      
      let currentApprovedBy = pr.approved_by ? pr.approved_by.split(',').map(e => e.trim().toLowerCase()) : [];
      const approverEmail = email.toLowerCase().trim();
      
      let isAllowed = false;
      let nextLevelEmail = null;

      const currentIdx = currentApprovedBy.length;
      if (currentIdx < levels.length && levels[currentIdx] === approverEmail) {
        isAllowed = true;
        nextLevelEmail = (currentIdx + 1 < levels.length) ? levels[currentIdx + 1] : null;
      }

      if (!isAllowed) {
        return res.send(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #ef4444;">Invalid Action</h1>
            <p>It is not your turn to approve or you have already approved this PR.</p>
          </div>
        `);
      }

      currentApprovedBy.push(approverEmail);

      // Check if fully approved
      const allApproved = currentApprovedBy.length === levels.length;
      
      if (allApproved) {
        finalStatus = 'completed';
        successMessage = 'PR Fully Approved!';
        detailMessage = `Purchase Requisition <strong>${pr.pr_number}</strong> has been successfully approved by all ${levels.length} required levels.`;
      } else {
        finalStatus = 'pending';
        successMessage = 'Approval Recorded';
        detailMessage = `Level ${currentApprovedBy.length} approval recorded. PR <strong>${pr.pr_number}</strong> is now waiting for Level ${currentApprovedBy.length + 1} approval.`;
        
        // Notify next level if exists
        if (nextLevelEmail) {
            notifyApprovers({ ...pr, approved_by: currentApprovedBy.join(',') }, nextLevelEmail);
        }
      }
      
      updatedData.approved_by = currentApprovedBy.join(',');
    }

    updatedData.status = finalStatus;

    await PurchaseRequisition.updateSimple(id, updatedData);

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fff; min-height: 100vh;">
        <div style="max-width: 500px; margin: 0 auto; background: #f9f9f9; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="font-size: 80px; color: ${finalStatus === 'completed' ? '#129046' : (finalStatus === 'rejected' ? '#ef4444' : '#f59e0b')}; margin-bottom: 20px;">
            ${finalStatus === 'completed' ? '✓' : (finalStatus === 'rejected' ? '✕' : '⏳')}
          </div>
          <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">${successMessage}</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            ${detailMessage}
          </p>
          <div style="margin: 25px 0; padding: 15px; background: #fff; border-radius: 10px; display: inline-block; border: 1px solid #eee;">
            <p style="margin: 0; color: #777; font-size: 14px;">Logged Action by: <strong>${email}</strong></p>
          </div>
          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/#/dashboard" style="background: #129046; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">View in Dashboard</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">This multi-level approval process ensures all stakeholders are aligned.</p>
        </div>
      </div>
    `);
  } catch (error) {
    console.error('Error in PR public action:', error);
    res.status(500).send('<h1>Internal Server Error</h1><p>Failed to process your request. Please try again later.</p>');
  }
};
