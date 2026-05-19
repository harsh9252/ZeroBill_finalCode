const PurchaseReturn = require('../models/purchaseReturnModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');

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

exports.createPurchaseReturn = async (req, res) => {
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

    const returnData = {
      business_id: businessId,
      purchase_return_number: req.body.purchase_return_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      return_date: req.body.return_date || new Date().toISOString().split('T')[0],
      updated_date: req.body.updated_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      purchase_return_data: req.body.purchase_return_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };

    const returnId = await PurchaseReturn.create(returnData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('purchaseReturn', returnId, returnData.party_id, businessId, req.body.terms_sections);
    }

    const createdReturn = await PurchaseReturn.findById(returnId, businessId);

    res.status(201).json({
      success: true,
      message: 'Purchase return created successfully',
      data: createdReturn
    });
  } catch (error) {
    console.error('Error creating purchase return:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'purchase_return_number'
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
      message: 'Failed to create purchase return',
      error: error.message
    });
  }
};

exports.getAllPurchaseReturns = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const returns = await PurchaseReturn.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: returns,
      count: returns.length
    });
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase returns',
      error: error.message
    });
  }
};

exports.getPurchaseReturnById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const purchaseReturn = await PurchaseReturn.findById(id, businessId);

    if (!purchaseReturn) {
      return res.status(404).json({
        success: false,
        message: 'Purchase return not found'
      });
    }

    res.status(200).json({
      success: true,
      data: purchaseReturn
    });
  } catch (error) {
    console.error('Error fetching purchase return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase return',
      error: error.message
    });
  }
};

exports.updatePurchaseReturn = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase return ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }
    const returnData = req.body;

    const updated = await PurchaseReturn.update(id, businessId, returnData);

    if (!updated) {
      // Check if the record exists to distinguish between "not found" and "no changes made"
      const exists = await PurchaseReturn.findById(id, businessId);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Purchase return not found'
        });
      }
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('purchaseReturn', id, returnData.party_id, businessId, req.body.terms_sections);
    }

    const updatedReturn = await PurchaseReturn.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Purchase return updated successfully',
      data: updatedReturn
    });
  } catch (error) {
    console.error('Error updating purchase return:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'purchase_return_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update purchase return',
      error: error.message
    });
  }
};

exports.deletePurchaseReturn = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await PurchaseReturn.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Purchase return not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase return deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase return',
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
    
    const lastNumber = await PurchaseReturn.getLastReturnNumber(businessId);
    const nextNumber = await getUnifiedNextNumber(businessId, 'purchase_return');

    res.status(200).json({
      success: true,
      data: {
        purchase_return_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next purchase return number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next purchase return number',
      error: error.message
    });
  }
};

exports.getPurchaseReturnStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await PurchaseReturn.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching purchase return stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
