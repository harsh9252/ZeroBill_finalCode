const TermsConditions = require('../models/termsConditionsModel');
const Business = require('../models/businessModel');
const DOMPurify = require('isomorphic-dompurify');


// Helper function to get business ID
const getBusinessId = async (req) => {
  let businessId = req.query.business_id || req.body.business_id;

  if (businessId) {
    if (req.user.isSubUser) {
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        const error = new Error('Invalid business access - subuser not authorized for this business');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    } else {
      const business = await Business.findById(businessId);
      if (!business || business.user_id !== req.user.id) {
        const error = new Error('Invalid business ID or access denied');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    }
  }

  if (req.user.isSubUser) {
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      const error = new Error('No accessible businesses found for this subuser.');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return req.user.accessibleBusinessIds[0];
  } else {
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses || businesses.length === 0) {
      const error = new Error('No business found for this user. Please create a business first.');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return businesses[0].id;
  }
};

// Get all terms & conditions for a quotation
exports.getTermsByQuotationId = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const businessId = await getBusinessId(req);



    const terms = await TermsConditions.findByQuotationId(quotationId);

    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a sales invoice
exports.getTermsBySalesId = async (req, res) => {
  try {
    const { salesId } = req.params;
   
    const terms = await TermsConditions.findBySalesId(salesId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a proforma invoice
exports.getTermsByProformaId = async (req, res) => {
  try {
    const { proformaId } = req.params;
   
    const terms = await TermsConditions.findByProformaId(proformaId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a credit note
exports.getTermsByCreditNoteId = async (req, res) => {
  try {
    const { creditNoteId } = req.params;

    const terms = await TermsConditions.findByCreditNoteId(creditNoteId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a debit note
exports.getTermsByDebitNoteId = async (req, res) => {
  try {
    const { debitNoteId } = req.params;

    const terms = await TermsConditions.findByDebitNoteId(debitNoteId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a sales return
exports.getTermsBySalesReturnId = async (req, res) => {
  try {
    const { salesReturnId } = req.params;
 
    const terms = await TermsConditions.findBySalesReturnId(salesReturnId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a purchase return
exports.getTermsByPurchaseReturnId = async (req, res) => {
  try {
    const { purchaseReturnId } = req.params;

    const terms = await TermsConditions.findByPurchaseReturnId(purchaseReturnId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a delivery challan
exports.getTermsByDeliveryChallanId = async (req, res) => {
  try {
    const { deliveryChallanId } = req.params;
   
    const terms = await TermsConditions.findByDeliveryChallanId(deliveryChallanId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a purchase invoice
exports.getTermsByPurchaseInvoiceId = async (req, res) => {
  try {
    const { purchaseInvoiceId } = req.params;
  
    const terms = await TermsConditions.findByPurchaseInvoiceId(purchaseInvoiceId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a purchase order
exports.getTermsByPurchaseOrderId = async (req, res) => {
  try {
    const { purchaseOrderId } = req.params;

    const terms = await TermsConditions.findByPurchaseOrderId(purchaseOrderId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a book invoice
exports.getTermsByBookInvoiceId = async (req, res) => {
  try {
    const { bookInvoiceId } = req.params;
   
    const terms = await TermsConditions.findByBookInvoiceId(bookInvoiceId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Get all terms & conditions for a book purchase order
exports.getTermsByBookPurchaseOrderId = async (req, res) => {
  try {
    const { bookPurchaseOrderId } = req.params;
   
    const terms = await TermsConditions.findByBookPurchaseOrderId(bookPurchaseOrderId);
    res.status(200).json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error('Error fetching terms & conditions for book purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms & conditions',
      error: error.message
    });
  }
};

// Create terms & conditions section
exports.createTerms = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const termsData = {
      ...req.body,
      business_id: businessId
    };

 

    if (termsData.content) {
      termsData.content = DOMPurify.sanitize(termsData.content);
    }

    const termsId = await TermsConditions.create(termsData);


    res.status(201).json({
      success: true,
      message: 'Terms & conditions created successfully',
      data: { id: termsId }
    });
  } catch (error) {
    console.error('Error creating terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create terms & conditions',
      error: error.message
    });
  }
};

// Bulk create terms & conditions sections
exports.bulkCreateTerms = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { quotation_id, party_id, sections } = req.body;

 

    if (!sections || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sections array is required'
      });
    }

    const sanitizedSections = (sections || []).map(section => ({
      ...section,
      content: section.content ? DOMPurify.sanitize(section.content) : section.content
    }));

    const termsId = await TermsConditions.bulkCreate(quotation_id, party_id, businessId, sanitizedSections);


    res.status(201).json({
      success: true,
      message: 'Terms & conditions created successfully',
      data: { id: termsId }
    });
  } catch (error) {
    console.error('Error bulk creating terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create terms & conditions',
      error: error.message
    });
  }
};

// Update terms & conditions
exports.updateTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const termsData = req.body;

    if (termsData.content) {
      termsData.content = DOMPurify.sanitize(termsData.content);
    }

    const updated = await TermsConditions.update(id, termsData);


    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Terms & conditions not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Terms & conditions updated successfully'
    });
  } catch (error) {
    console.error('Error updating terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update terms & conditions',
      error: error.message
    });
  }
};

// Delete terms & conditions section
exports.deleteTerms = async (req, res) => {
  try {
    const { id } = req.params;



    const deleted = await TermsConditions.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Terms & conditions not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Terms & conditions deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete terms & conditions',
      error: error.message
    });
  }
};

// Delete all terms & conditions for a quotation
exports.deleteTermsByQuotationId = async (req, res) => {
  try {
    const { quotationId } = req.params;

    const deleted = await TermsConditions.deleteByQuotationId(quotationId);

    res.status(200).json({
      success: true,
      message: 'All terms & conditions deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete terms & conditions',
      error: error.message
    });
  }
};

// Delete all terms & conditions for a book invoice
exports.deleteTermsByBookInvoiceId = async (req, res) => {
  try {
    const { bookInvoiceId } = req.params;

   

    const deleted = await TermsConditions.deleteByBookInvoiceId(bookInvoiceId);

    res.status(200).json({
      success: true,
      message: 'All terms & conditions for book invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting terms & conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete terms & conditions',
      error: error.message
    });
  }
};
// Get globally locked terms for a business
exports.getLockedTerms = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const lockedTerms = await TermsConditions.findLockedByBusinessId(businessId);

    res.status(200).json({
      success: true,
      data: lockedTerms || []
    });
  } catch (error) {
    console.error('Error fetching locked terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locked terms',
      error: error.message
    });
  }
};

// Lock a terms section
exports.lockSection = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = await getBusinessId(req);

    const result = await TermsConditions.lockSection(id, businessId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to lock terms section'
      });
    }

    res.status(200).json({
      success: true,
      message: `Terms section ${result.action} successfully`,
      action: result.action
    });
  } catch (error) {
    console.error('Error locking terms section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock terms section',
      error: error.message
    });
  }
};
