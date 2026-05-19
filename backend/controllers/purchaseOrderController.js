const PurchaseOrder = require('../models/purchaseOrderModel');
const ApprovalWorkflow = require('../models/approvalWorkflowModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/nodemailerService');
const path = require('path');

const notifyApprovers = async (poData, targetEmail = null) => {
  let emailToNotify = targetEmail;

  if (!emailToNotify) {
    // Determine who to notify based on sequential logic
    let levels = [];
    if (poData.approver_sequence) {
      levels = poData.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    } else {
      levels = [
        poData.level1_email ? poData.level1_email.toLowerCase().trim() : null,
        poData.level2_email ? poData.level2_email.toLowerCase().trim() : null,
        poData.level3_email ? poData.level3_email.toLowerCase().trim() : null
      ].filter(e => e);
    }

    const approvedBy = poData.approved_by ? poData.approved_by.split(',').map(e => e.trim().toLowerCase()) : [];
    
    if (levels.length === 0) return;

    if (approvedBy.length < levels.length) {
      emailToNotify = levels[approvedBy.length];
    } else {
      return; // All approved or no next level
    }
  }

  const email = emailToNotify.trim().toLowerCase();
  const subject = `Purchase Order Approval Required: ${poData.purchase_order_number}`;
  
  // Prepare line items for email
  let lineItemsHtml = '';
  const lines = (poData.purchase_order_data?.lines || poData.order_data?.lines || []);
  if (lines.length > 0) {
    lineItemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lines.map(l => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px;">${l.description || l.name}</td>
              <td style="padding: 10px; text-align: center;">${l.qty} ${l.unit || ''}</td>
              <td style="padding: 10px; text-align: right;">₹${parseFloat(l.price || 0).toLocaleString()}</td>
              <td style="padding: 10px; text-align: right;">₹${parseFloat(l.total || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #333;">
        <div style="background: #129046; padding: 25px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">Purchase Order Approval</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${poData.purchase_order_number}</p>
        </div>
        <div style="padding: 25px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px; background-color: #fff;">
          <p>Greetings,</p>
          <p>A new Purchase Order has been created and requires your review and approval.</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>PO Number:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${poData.purchase_order_number}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${poData.order_date}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Vendor/Party:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${poData.party_name}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;"><strong>Grand Total:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #129046; font-weight: bold; font-size: 18px;">₹${parseFloat(poData.grand_total || 0).toLocaleString()}</td></tr>
            </table>
            
            ${lineItemsHtml}
            
            <div style="margin-top: 15px;">
              <strong style="color: #666;">Notes/Remark:</strong>
              <p style="margin: 5px 0; font-size: 13px; color: #555;">${poData.remark || poData.notes || 'N/A'}</p>
            </div>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.BACKEND_URL}/api/purchase-orders/public-action/${poData.id}?status=completed&email=${encodeURIComponent(email)}&action=Approve" 
               style="background-color: #129046; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
               APPROVE PO
            </a>
            <a href="${process.env.BACKEND_URL}/api/purchase-orders/public-action/${poData.id}?status=rejected&email=${encodeURIComponent(email)}&action=Reject" 
               style="background-color: #ef4444; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
               REJECT PO
            </a>
          </p>
          
          <p style="font-size: 12px; color: #999; font-style: italic; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated approval request. Clicking "Approve" will record your authorization for this document.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; font-size: 12px; color: #888;">
          © ZeroBill. Managed by Eleva8CXM.
        </div>
      </div>
    `;

    try {
      await sendEmail(email, subject, html);
    } catch (err) {
      console.error(`Failed to send PO approval email to ${email}:`, err.message);
    }
};

exports.publicAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, email, action } = req.query;

    const po = await PurchaseOrder.getByIdSimple(id);
    if (!po) {
      return res.status(404).send('<h1>Purchase Order not found</h1>');
    }

    if (po.status !== 'open' && po.status !== 'pending') {
      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #666;">Already Processed</h1>
          <p>This Purchase Order (PO: ${po.purchase_order_number}) has already been marked as <strong>${po.status}</strong>.</p>
          <a href="${process.env.FRONTEND_URL}/#/dashboard" style="color: #129046; font-weight: bold; text-decoration: none;">← Go to Dashboard</a>
        </div>
      `);
    }

    const updatedData = {
      action_by_name: email ? email.split('@')[0] : 'Approver',
      action_by_email: email || 'N/A',
      action_at: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 19).replace('T', ' ') 
    };

    let finalStatus = po.status;
    let successMessage = `PO ${action}d!`;
    let detailMessage = '';

    if (status === 'rejected') {
      finalStatus = 'rejected';
      successMessage = 'PO Rejected';
      detailMessage = `Purchase Order <strong>${po.purchase_order_number}</strong> has been rejected by <strong>${email}</strong>.`;
    } else {
      // Sequential Logic for Multi-Approval
      let levels = [];
      if (po.approver_sequence) {
        levels = po.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
      } else {
        levels = [
          po.level1_email ? po.level1_email.toLowerCase().trim() : null,
          po.level2_email ? po.level2_email.toLowerCase().trim() : null,
          po.level3_email ? po.level3_email.toLowerCase().trim() : null
        ].filter(e => e);
      }
      
      let currentApprovedBy = po.approved_by ? po.approved_by.split(',').map(e => e.trim().toLowerCase()) : [];
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
            <p>It is not your turn to approve or you have already approved this PO.</p>
          </div>
        `);
      }

      currentApprovedBy.push(approverEmail);

      // Check if fully approved
      const allApproved = currentApprovedBy.length === levels.length;
      
      if (allApproved) {
        finalStatus = 'open'; // It stays open/approved
        successMessage = 'PO Fully Approved!';
        detailMessage = `Purchase Order <strong>${po.purchase_order_number}</strong> has been successfully approved by all ${levels.length} required levels.`;
      } else {
        finalStatus = 'pending';
        successMessage = 'Approval Recorded';
        detailMessage = `Level ${currentApprovedBy.length} approval recorded. PO <strong>${po.purchase_order_number}</strong> is now waiting for Level ${currentApprovedBy.length + 1} approval.`;
        
        // Notify next level if exists
        if (nextLevelEmail) {
            notifyApprovers({ ...po, approved_by: currentApprovedBy.join(',') }, nextLevelEmail);
        }
      }
      
      updatedData.approved_by = currentApprovedBy.join(',');
    }

    updatedData.status = finalStatus;

    await PurchaseOrder.updateSimple(id, updatedData);

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fff; min-height: 100vh;">
        <div style="max-width: 500px; margin: 0 auto; background: #f9f9f9; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="font-size: 80px; color: ${finalStatus === 'open' ? '#129046' : (finalStatus === 'rejected' ? '#ef4444' : '#f59e0b')}; margin-bottom: 20px;">
            ${finalStatus === 'open' ? '✓' : (finalStatus === 'rejected' ? '✕' : '⏳')}
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
        </div>
      </div>
    `);
  } catch (error) {
    console.error('Error in PO public action:', error);
    res.status(500).send('<h1>Internal Server Error</h1>');
  }
};

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

exports.createPurchaseOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const businessId = await getBusinessId(req);

    // Fetch dynamic approval workflow
    const workflowLevels = await ApprovalWorkflow.getWorkflow(businessId, 'purchase_order');
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

    const orderData = {
      business_id: businessId,
      purchase_order_number: req.body.purchase_order_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      order_date: req.body.order_date || new Date().toISOString().split('T')[0],
      updated_date: req.body.updated_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      order_data: req.body.order_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark,
      level1_email: lvl1,
      level2_email: lvl2,
      level3_email: lvl3,
      approver_sequence: approverSequence
    };

    // If approval sequence or level1 email is provided, default status to pending
    if (orderData.level1_email || orderData.approver_sequence) {
      orderData.status = 'pending';
    }

    const orderId = await PurchaseOrder.create(orderData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('purchaseOrder', orderId, orderData.party_id, businessId, req.body.terms_sections);
    }
    const createdOrder = await PurchaseOrder.findById(orderId, businessId);

    // Trigger notification if workflow exists
    if (createdOrder && (createdOrder.level1_email || createdOrder.approver_sequence)) {
      await notifyApprovers(createdOrder);
    }

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: createdOrder
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'purchase_order_number'
      });
    }

    if (error.code === 'NO_BUSINESS_FOUND' || error.code === 'INVALID_BUSINESS') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
};

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const orders = await PurchaseOrder.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: error.message
    });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Sync quantities before returning to ensure accuracy (addresses rollback sync issues)
    const order = await PurchaseOrder.syncWithInvoices(id, businessId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }

    const currentPO = await PurchaseOrder.findById(id, businessId);
    if (!currentPO) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const orderData = req.body;

    // Load dynamic approval workflow if status is pending and we want to refresh/apply it
    let approverSequence = orderData.approver_sequence || currentPO.approver_sequence;
    let lvl1 = orderData.level1_email !== undefined ? orderData.level1_email : currentPO.level1_email;
    let lvl2 = orderData.level2_email !== undefined ? orderData.level2_email : currentPO.level2_email;
    let lvl3 = orderData.level3_email !== undefined ? orderData.level3_email : currentPO.level3_email;

    if ((!approverSequence || approverSequence === '') && (!lvl1 || lvl1 === '') && currentPO.status === 'pending') {
      const workflowLevels = await ApprovalWorkflow.getWorkflow(businessId, 'purchase_order');
      if (workflowLevels && workflowLevels.length > 0) {
        const emails = workflowLevels.map(l => l.approver_email.trim().toLowerCase());
        approverSequence = emails.join(',');
        lvl1 = emails[0] || null;
        lvl2 = emails[1] || null;
        lvl3 = emails[2] || null;
      }
    }

    orderData.approver_sequence = approverSequence;
    orderData.level1_email = lvl1;
    orderData.level2_email = lvl2;
    orderData.level3_email = lvl3;

    const updated = await PurchaseOrder.update(id, businessId, orderData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found or no changes made'
      });
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('purchaseOrder', id, orderData.party_id, businessId, req.body.terms_sections);
    }

    const updatedOrder = await PurchaseOrder.findById(id, businessId);

    // If it's still pending and has level emails, trigger notification (in case it was updated)
    if (updatedOrder && updatedOrder.status === 'pending' && (updatedOrder.level1_email || updatedOrder.approver_sequence) && !updatedOrder.approved_by) {
      await notifyApprovers(updatedOrder);
    }

    res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'purchase_order_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order',
      error: error.message
    });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await PurchaseOrder.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase order',
      error: error.message
    });
  }
};

exports.getNextNumber = async (req, res) => {
  try {
    let businessId = req.query.business_id;

    if (!businessId) {
      if (req.user.isSubUser) {
        if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No accessible businesses found for this subuser.',
            code: 'NO_BUSINESS_FOUND'
          });
        }
        businessId = req.user.accessibleBusinessIds[0];
      } else {
        const Business = require('../models/businessModel');
        const businesses = await Business.findByUserId(req.user.id);
        if (!businesses || businesses.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No business found for this user. Please create a business first.',
            code: 'NO_BUSINESS_FOUND'
          });
        }
        businessId = businesses[0].id;
      }
    }

    const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

    const lastNumber = await PurchaseOrder.getLastOrderNumber(businessId);
    const nextNumber = await getUnifiedNextNumber(businessId, 'purchase_order');
    res.status(200).json({
      success: true,
      data: {
        purchase_order_number: nextNumber,
        lastNumber: lastNumber
      }
    });
  } catch (error) {
    console.error('Error getting next purchase order number:', error);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to get next purchase order number',
      error: error.message,
      code: error.code
    });
  }
};

exports.getPurchaseOrderStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await PurchaseOrder.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching purchase order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
