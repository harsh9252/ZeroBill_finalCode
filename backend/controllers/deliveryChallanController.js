const DeliveryChallan = require('../models/deliveryChallanModel');
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

exports.createDeliveryChallan = async (req, res) => {
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

    const challanData = {
      business_id: businessId,
      challan_number: req.body.challan_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      challan_date: req.body.challan_date || new Date().toISOString().split('T')[0],
      updated_date: req.body.updated_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      challan_data: req.body.challan_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };



    const challanId = await DeliveryChallan.create(challanData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('deliveryChallan', challanId, challanData.party_id, businessId, req.body.terms_sections);
    }

    const createdChallan = await DeliveryChallan.findById(challanId, businessId);

    res.status(201).json({
      success: true,
      message: 'Delivery challan created successfully',
      data: createdChallan
    });
  } catch (error) {
    console.error('Error creating delivery challan:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'challan_number'
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
      message: 'Failed to create delivery challan',
      error: error.message
    });
  }
};

exports.getAllDeliveryChallans = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const challans = await DeliveryChallan.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: challans,
      count: challans.length
    });
  } catch (error) {
    console.error('Error fetching delivery challans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery challans',
      error: error.message
    });
  }
};

exports.getDeliveryChallanById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const challan = await DeliveryChallan.findById(id, businessId);

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found'
      });
    }

    res.status(200).json({
      success: true,
      data: challan
    });
  } catch (error) {
    console.error('Error fetching delivery challan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery challan',
      error: error.message
    });
  }
};

exports.updateDeliveryChallan = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery challan ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }
    const challanData = req.body;

  

    const updated = await DeliveryChallan.update(id, businessId, challanData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found or no changes made'
      });
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('deliveryChallan', id, challanData.party_id, businessId, req.body.terms_sections);
    }

    const updatedChallan = await DeliveryChallan.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Delivery challan updated successfully',
      data: updatedChallan
    });
  } catch (error) {
    console.error('Error updating delivery challan:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'challan_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update delivery challan',
      error: error.message
    });
  }
};

exports.deleteDeliveryChallan = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await DeliveryChallan.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery challan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting delivery challan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery challan',
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
    
    const lastNumber = await DeliveryChallan.getLastChallanNumber(businessId);
   
    
    const nextNumber = await getUnifiedNextNumber(businessId, 'delivery_challan');
    

    res.status(200).json({
      success: true,
      data: {
        challan_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next delivery challan number:', error);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to get next delivery challan number',
      error: error.message,
      code: error.code
    });
  }
};

exports.getDeliveryChallanStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await DeliveryChallan.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching delivery challan stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
