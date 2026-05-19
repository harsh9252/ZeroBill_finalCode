const SalesReturn = require('../models/salesReturnModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');

// Helper function to get business ID
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

// Create sales return
exports.createSalesReturn = async (req, res) => {
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
      sales_return_number: req.body.sales_return_number || null,
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
      sales_return_data: req.body.sales_return_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };

   

    const returnId = await SalesReturn.create(returnData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('salesReturn', returnId, returnData.party_id, businessId, req.body.terms_sections);
    }

    const createdReturn = await SalesReturn.findById(returnId, businessId);

    res.status(201).json({
      success: true,
      message: 'Sales return created successfully',
      data: createdReturn
    });
  } catch (error) {
    console.error('Error creating sales return:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'sales_return_number'
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
      message: 'Failed to create sales return',
      error: error.message
    });
  }
};

// Get all sales returns
exports.getAllSalesReturns = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const returns = await SalesReturn.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: returns,
      count: returns.length
    });
  } catch (error) {
    console.error('Error fetching sales returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales returns',
      error: error.message
    });
  }
};

// Get sales return by ID
exports.getSalesReturnById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const salesReturn = await SalesReturn.findById(id, businessId);

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salesReturn
    });
  } catch (error) {
    console.error('Error fetching sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales return',
      error: error.message
    });
  }
};

// Update sales return
exports.updateSalesReturn = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid sales return ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }
    const returnData = req.body;

    const updated = await SalesReturn.update(id, businessId, returnData);

    if (!updated) {
      // Check if the record exists to distinguish between "not found" and "no changes made"
      const exists = await SalesReturn.findById(id, businessId);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Sales return not found'
        });
      }
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('salesReturn', id, returnData.party_id, businessId, req.body.terms_sections);
    }

    const updatedReturn = await SalesReturn.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Sales return updated successfully',
      data: updatedReturn
    });
  } catch (error) {
    console.error('Error updating sales return:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'sales_return_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update sales return',
      error: error.message
    });
  }
};

// Delete sales return
exports.deleteSalesReturn = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await SalesReturn.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Sales return not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sales return deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sales return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sales return',
      error: error.message
    });
  }
};

// Generate next sales return number
// Get next sales return number (based on last saved)
exports.getNextNumber = async (req, res) => {
  try {

    
    // For next-number endpoint, we don't need strict business verification
    let businessId = req.query.business_id;
    
    if (!businessId) {
      // If not provided, get user's first accessible business
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
    
    // Get last saved return number
    const lastNumber = await SalesReturn.getLastReturnNumber(businessId);
  
    
    // Calculate next number using unified sequence
    const nextNumber = await getUnifiedNextNumber(businessId, 'sales_return');


    res.status(200).json({
      success: true,
      data: {
        sales_return_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next sales return number:', error);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to get next sales return number',
      error: error.message,
      code: error.code
    });
  }
};

exports.generateNumber = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');
    
    const nextNumber = await generateInvoiceNumber(businessId, 'sales_return');

    res.status(200).json({
      success: true,
      data: {
        sales_return_number: nextNumber
      }
    });
  } catch (error) {
    console.error('Error generating sales return number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales return number',
      error: error.message
    });
  }
};

// Get sales return statistics
exports.getSalesReturnStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await SalesReturn.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching sales return stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
