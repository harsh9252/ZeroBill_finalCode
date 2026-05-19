const CreditNote = require('../models/creditNoteModel');
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

// Create credit note
exports.createCreditNote = async (req, res) => {
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

    const noteData = {
      business_id: businessId,
      credit_note_number: req.body.credit_note_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      note_date: req.body.note_date || new Date().toISOString().split('T')[0],
      updated_date: req.body.updated_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      credit_note_data: req.body.credit_note_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };


    const noteId = await CreditNote.create(noteData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('creditNote', noteId, noteData.party_id, businessId, req.body.terms_sections);
    }

    const createdNote = await CreditNote.findById(noteId, businessId);

    res.status(201).json({
      success: true,
      message: 'Credit note created successfully',
      data: createdNote
    });
  } catch (error) {
    console.error('Error creating credit note:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'credit_note_number'
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
      message: 'Failed to create credit note',
      error: error.message
    });
  }
};

// Get all credit notes
exports.getAllCreditNotes = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const notes = await CreditNote.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: notes,
      count: notes.length
    });
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit notes',
      error: error.message
    });
  }
};

// Get credit note by ID
exports.getCreditNoteById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const creditNote = await CreditNote.findById(id, businessId);

    if (!creditNote) {
      return res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
    }

    res.status(200).json({
      success: true,
      data: creditNote
    });
  } catch (error) {
    console.error('Error fetching credit note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit note',
      error: error.message
    });
  }
};

// Update credit note
exports.updateCreditNote = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit note ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }
    const noteData = req.body;
    const updated = await CreditNote.update(id, businessId, noteData);

    if (!updated) {
      // Check if the record exists to distinguish between "not found" and "no changes made"
      const exists = await CreditNote.findById(id, businessId);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Credit note not found'
        });
      }
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('creditNote', id, noteData.party_id, businessId, req.body.terms_sections);
    }

    const updatedNote = await CreditNote.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Credit note updated successfully',
      data: updatedNote
    });
  } catch (error) {
    console.error('Error updating credit note:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'credit_note_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update credit note',
      error: error.message
    });
  }
};

// Delete credit note
exports.deleteCreditNote = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await CreditNote.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Credit note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting credit note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete credit note',
      error: error.message
    });
  }
};

// Get next credit note number (based on last saved)
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
    
    // Get last saved note number
    const lastNumber = await CreditNote.getLastNoteNumber(businessId);
    
    
    // Calculate next number using unified sequence
    const nextNumber = await getUnifiedNextNumber(businessId, 'credit_note');


    res.status(200).json({
      success: true,
      data: {
        credit_note_number: nextNumber,
        lastNumber: lastNumber
      }
    });
  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: 'Failed to get next credit note number',
      error: error.message,
      code: error.code
    });
  }
};

// Get credit note statistics
exports.getCreditNoteStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await CreditNote.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching credit note stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
