const DebitNote = require('../models/debitNoteModel');
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

exports.createDebitNote = async (req, res) => {
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
      debit_note_number: req.body.debit_note_number || null,
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
      debit_note_data: req.body.debit_note_data || req.body.line_items || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };

    const noteId = await DebitNote.create(noteData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('debitNote', noteId, noteData.party_id, businessId, req.body.terms_sections);
    }

    const createdNote = await DebitNote.findById(noteId, businessId);

    res.status(201).json({
      success: true,
      message: 'Debit note created successfully',
      data: createdNote
    });
  } catch (error) {
    console.error('Error creating debit note:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'debit_note_number'
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
      message: 'Failed to create debit note',
      error: error.message
    });
  }
};

exports.getAllDebitNotes = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const notes = await DebitNote.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: notes,
      count: notes.length
    });
  } catch (error) {
    console.error('Error fetching debit notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debit notes',
      error: error.message
    });
  }
};

exports.getDebitNoteById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const debitNote = await DebitNote.findById(id, businessId);

    if (!debitNote) {
      return res.status(404).json({
        success: false,
        message: 'Debit note not found'
      });
    }

    res.status(200).json({
      success: true,
      data: debitNote
    });
  } catch (error) {
    console.error('Error fetching debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debit note',
      error: error.message
    });
  }
};

exports.updateDebitNote = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid debit note ID. Cannot update without a valid ID.',
        code: 'INVALID_ID'
      });
    }
    const noteData = req.body;

    const updated = await DebitNote.update(id, businessId, noteData);

    if (!updated) {
      // Check if the record exists to distinguish between "not found" and "no changes made"
      const exists = await DebitNote.findById(id, businessId);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Debit note not found'
        });
      }
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('debitNote', id, noteData.party_id, businessId, req.body.terms_sections);
    }

    const updatedNote = await DebitNote.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Debit note updated successfully',
      data: updatedNote
    });
  } catch (error) {
    console.error('Error updating debit note:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'debit_note_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update debit note',
      error: error.message
    });
  }
};

exports.deleteDebitNote = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await DebitNote.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Debit note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Debit note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting debit note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete debit note',
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
    
    const lastNumber = await DebitNote.getLastNoteNumber(businessId);
    const nextNumber = await getUnifiedNextNumber(businessId, 'debit_note');

    res.status(200).json({
      success: true,
      data: {
        debit_note_number: nextNumber,
        lastNumber: lastNumber
      }
    });
  } catch (error) {
    console.error('Error getting next debit note number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next debit note number',
      error: error.message
    });
  }
};

exports.getDebitNoteStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await DebitNote.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching debit note stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
