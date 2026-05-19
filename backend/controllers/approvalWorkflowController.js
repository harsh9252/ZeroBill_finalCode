const ApprovalWorkflow = require('../models/approvalWorkflowModel');
const Business = require('../models/businessModel');

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

exports.getWorkflow = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { document_type } = req.query;

    if (!document_type) {
      return res.status(400).json({
        success: false,
        message: 'document_type is required (purchase_order or purchase_requisition)'
      });
    }

    const workflow = await ApprovalWorkflow.getWorkflow(businessId, document_type);

    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error fetching approval workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval workflow',
      error: error.message
    });
  }
};

exports.saveWorkflow = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { document_type, levels } = req.body;

    if (!document_type) {
      return res.status(400).json({
        success: false,
        message: 'document_type is required'
      });
    }

    if (!Array.isArray(levels)) {
      return res.status(400).json({
        success: false,
        message: 'levels must be an array'
      });
    }

    await ApprovalWorkflow.saveWorkflow(businessId, document_type, levels);

    res.status(200).json({
      success: true,
      message: 'Approval workflow configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving approval workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save approval workflow',
      error: error.message
    });
  }
};
