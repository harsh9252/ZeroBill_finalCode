const Quotation = require('../models/quotationModel');
const SalesInvoice = require('../models/salesInvoiceModel');
const ProformaInvoice = require('../models/proformaInvoiceModel');
const Party = require('../models/partyModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

// Helper function to calculate totals for a set of line items
const calculateInvoiceTotals = (lines, discountAfterTaxPct = 0, charges = []) => {
  let subtotal = 0;
  let taxAmount = 0;
  let totalAmount = 0;
  let discountAmount = 0;

  lines.forEach((line) => {
    const qty = parseFloat(line.qty) || 0;
    if (qty <= 0) return;

    const price = parseFloat(line.price || line.amount || 0);
    const lineTotal = qty * price;
    const discountPct = parseFloat(line.discountPct || line.discount_pct || 0);
    const lineDiscount = lineTotal * (discountPct / 100);
    const lineSubtotal = lineTotal - lineDiscount;

    let lineTax = 0;
    const taxType = (line.taxType || line.tax_type || "").toUpperCase();

    if (taxType === "GST") {
      const cgstPct = parseFloat(line.cgstPct || line.cgst_pct || 0);
      const sgstPct = parseFloat(line.sgstPct || line.sgst_pct || 0);
      lineTax = lineSubtotal * ((cgstPct + sgstPct) / 100);
    } else if (taxType === "IGST") {
      const igstPct = parseFloat(line.igstPct || line.igst_pct || 0);
      lineTax = lineSubtotal * (igstPct / 100);
    } else if (taxType === "VAT") {
      const vatPct = parseFloat(line.vatPct || line.vat_pct || 0);
      lineTax = lineSubtotal * (vatPct / 100);
    }

    subtotal += lineSubtotal;
    totalAmount += lineTotal;
    discountAmount += lineDiscount;
    taxAmount += lineTax;
  });

  const chargesTotal = (charges || []).reduce(
    (s, c) => s + (parseFloat(c.amount) || 0),
    0
  );
  const discountAfterTaxValue =
    (subtotal + taxAmount + chargesTotal) *
    (parseFloat(discountAfterTaxPct) / 100);

  return {
    total_amount: subtotal,
    discount_amount: discountAfterTaxValue,
    tax_amount: taxAmount,
    grand_total: subtotal + taxAmount + chargesTotal - discountAfterTaxValue,
    subtotal: subtotal,
    total_gross: totalAmount,
  };
};

// Helper function to get business ID
const getBusinessId = async (req) => {
  // First, check if business_id is provided in query or body
  let businessId = req.query.business_id || req.body.business_id;


  if (businessId) {
    // Handle subuser access
    if (req.user.isSubUser) {
      // For subusers, check if business is in their accessible businesses
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        const error = new Error('Invalid business access - subuser not authorized for this business');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
     
      return businessId;
    } else {
      // For regular users, verify the business belongs to them
      try {
        const business = await Business.findById(businessId);
       
        if (!business || business.user_id !== req.user.id) {
          const error = new Error('Invalid business ID or access denied');
          error.code = 'INVALID_BUSINESS';
          throw error;
        }
       
        return businessId;
      } catch (err) {
        console.error('getBusinessId - error verifying business:', err.message);
        throw err;
      }
    }
  }

  // If not provided, get user's first accessible business
  if (req.user.isSubUser) {
    // For subusers, use first accessible business
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      const error = new Error('No accessible businesses found for this subuser.');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
   
    return req.user.accessibleBusinessIds[0];
  } else {
    // For regular users, get their first active business
    try {
      const businesses = await Business.findByUserId(req.user.id);
    
      if (!businesses || businesses.length === 0) {
        const error = new Error('No business found for this user. Please create a business first.');
        error.code = 'NO_BUSINESS_FOUND';
        throw error;
      }
      
      return businesses[0].id;
    } catch (err) {
      console.error('getBusinessId - error getting user businesses:', err.message);
      throw err;
    }
  }
};

// Create a new quotation
exports.createQuotation = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Validate user authentication
    if (!req.user || !req.user.id) {
      console.error('createQuotation - User not authenticated:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User not authenticated. Please log in again.',
        code: 'NOT_AUTHENTICATED'
      });
    }



    const businessId = await getBusinessId(req);

    // For subusers, use parent_user_id as created_by since the foreign key references users table
    const createdBy = req.user.isSubUser ? req.user.parentUserId : req.user.id;

    const quotationData = {
      business_id: businessId,
      quotation_number: req.body.quotation_number || null,
      created_by: createdBy,
      ...req.body
    };

   

    // Generate quotation number if not provided
    if (!quotationData.quotation_number) {
      const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');
      quotationData.quotation_number = await generateInvoiceNumber(businessId, 'quotation');
    }

    // Set default quotation_date if not provided
    if (!quotationData.quotation_date) {
      quotationData.quotation_date = new Date().toISOString().slice(0, 10);
    }

    // Validate required fields
    if (!quotationData.party_name || quotationData.party_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Party name is required'
      });
    }

    const quotationId = await Quotation.create(quotationData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('quotation', quotationId, quotationData.party_id, businessId, req.body.terms_sections);
    }

    // Fetch the created quotation to return full data including party_id
    const createdQuotation = await Quotation.findById(quotationId, businessId);

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: createdQuotation
    });
  } catch (error) {
    console.error('Error creating quotation:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'quotation_number'
      });
    }

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before adding quotations.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create quotation',
      error: error.message
    });
  }
};

// Get all quotations
exports.getAllQuotations = async (req, res) => {
  try {
    // Check if business_id is provided in query params, otherwise use default
    let businessId = req.query.business_id;

    if (businessId) {
      // Handle subuser access
      if (req.user.isSubUser) {
        // For subusers, check if business is in their accessible businesses
        if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
          return res.status(403).json({
            success: false,
            message: 'Invalid business access - subuser not authorized for this business',
            code: 'INVALID_BUSINESS'
          });
        }
      } else {
        // For regular users, verify the business belongs to them
        const business = await Business.findById(businessId);
        if (!business || business.user_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Invalid business access',
            code: 'INVALID_BUSINESS'
          });
        }
      }
    } else {
      // If not provided, get user's first accessible business
      businessId = await getBusinessId(req);
    }

   

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required. Please ensure you are logged in with a valid business.'
      });
    }

    // Build filters from query parameters
    const filters = {};

    if (req.query.status && req.query.status !== 'all') {
      filters.status = req.query.status;
    }

    if (req.query.search) {
      filters.search = req.query.search;
    }

    if (req.query.start_date) {
      filters.start_date = req.query.start_date;
    }

    if (req.query.end_date) {
      filters.end_date = req.query.end_date;
    }

    if (req.query.party_id && req.query.party_id !== '' && req.query.party_id !== 'all') {
      filters.party_id = req.query.party_id;
    }

   

    const quotations = await Quotation.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before viewing quotations.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotations',
      error: error.message
    });
  }
};

// Get quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const quotation = await Quotation.findById(id, businessId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotation',
      error: error.message
    });
  }
};

// Update quotation
exports.updateQuotation = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const quotationData = req.body;

    // Validate quotation ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID. Cannot update quotation without a valid ID.',
        code: 'INVALID_ID'
      });
    }

    // Validate required fields
    if (quotationData.party_name !== undefined && (!quotationData.party_name || !quotationData.party_name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Party name cannot be empty'
      });
    }

    if (quotationData.status && !['open', 'closed'].includes(quotationData.status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (open or closed)'
      });
    }

    // Check if quotation number is being changed and if it's already in use
    if (quotationData.quotation_number) {
      const existingQuotation = await Quotation.findById(id, businessId);
      if (existingQuotation && existingQuotation.quotation_number !== quotationData.quotation_number) {
        const { checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');
        const exists = await checkDocumentNumberExists(businessId, 'quotation', quotationData.quotation_number);
        if (exists) {
          return res.status(409).json({
            success: false,
            message: `Quotation number ${quotationData.quotation_number} already exists in this business`,
            code: 'DUPLICATE_NUMBER',
            field: 'quotation_number'
          });
        }
      }
    }

    // Handle terms & conditions update if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('quotation', id, quotationData.party_id, businessId, req.body.terms_sections);
      
      // Get the first term's ID to set as terms_id for backward compatibility
      const createdTerms = await TermsConditions.findByQuotationId(id);
      if (createdTerms.length > 0) {
        quotationData.terms_id = createdTerms[0].id;
      }
    }

    const updated = await Quotation.update(id, businessId, quotationData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found or no changes made'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully'
    });
  } catch (error) {
    console.error('Error updating quotation:', error);

    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'quotation_number'
      });
    }

    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before updating quotations.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update quotation',
      error: error.message
    });
  }
};

// Delete quotation (soft delete)
exports.deleteQuotation = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Quotation.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quotation',
      error: error.message
    });
  }
};

// Hard delete quotation
exports.hardDeleteQuotation = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Quotation.hardDelete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quotation',
      error: error.message
    });
  }
};

// Get quotation statistics
exports.getQuotationStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await Quotation.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching quotation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotation statistics',
      error: error.message
    });
  }
};

// Get next quotation number based on last saved number
exports.getNextQuotationNumber = async (req, res) => {
  try {


    // For next-number endpoint, we don't need strict business verification
    // Just get the business ID from query or use user's first business
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
    const { getNextNumberFromLast } = require('../utils/numberGenerator');

    // Get last saved quotation number
    const lastNumber = await Quotation.getLastQuotationNumber(businessId);


    // Calculate next number using unified sequence
    const nextNumber = await getUnifiedNextNumber(businessId, 'quotation');


    res.status(200).json({
      success: true,
      data: {
        quotation_number: nextNumber,
        lastNumber: lastNumber
      }
    });
  } catch (error) {
    console.error('Error getting next quotation number:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get next quotation number',
      error: error.message,
      code: error.code
    });
  }
};

// Generate next quotation number
exports.generateQuotationNumber = async (req, res) => {
  try {
    const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');
    const quotationNumber = await generateInvoiceNumber(businessId, 'quotation');

    res.status(200).json({
      success: true,
      data: { quotation_number: quotationNumber }
    });
  } catch (error) {
    console.error('Error generating quotation number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quotation number',
      error: error.message
    });
  }
};

// Convert quotation to Sales or Proforma Invoice
exports.convertQuotation = async (req, res) => {
  let businessId;
  let id;
  let type;

  try {
    businessId = await getBusinessId(req);
    id = req.params.id;
    type = req.body.type; // 'sales' or 'proforma'
    const selectedItems = req.body.items; // Array of { id, qty }

    if (!['sales', 'proforma'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversion type. Must be "sales" or "proforma".'
      });
    }

    // 1. Fetch Quotation
    const quotation = await Quotation.findById(id, businessId);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // 2. Determine items for conversion and remaining items for quotation
    let invoiceLines = [];
    let remainingQuotationLines = [];

    const originalLines = (quotation.quotation_data?.lines || []).map(l => ({...l, id: l.id || `line-${Math.random().toString(36).substr(2, 9)}`}));

    if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
      // Partial conversion
      remainingQuotationLines = JSON.parse(JSON.stringify(originalLines));

      selectedItems.forEach(item => {
        const lineIndex = remainingQuotationLines.findIndex(l => l.id === item.id);
        if (lineIndex !== -1) {
          const originalLine = remainingQuotationLines[lineIndex];
          const convertingQty = parseFloat(item.qty) || 0;

          if (convertingQty > 0) {
            invoiceLines.push({
              ...originalLine,
              qty: convertingQty
            });
            // Don't subtract quantity from original document as requested
          }
        }
      });
    } else {
      // Full conversion
      invoiceLines = [...originalLines];
      remainingQuotationLines = [...originalLines];
    }

    if (invoiceLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected for conversion or invalid quantities.'
      });
    }

    // 3. Map Data to Invoice Format
    const createdBy = req.user.isSubUser ? req.user.parentUserId : req.user.id;
    const discountAfterTaxPct = quotation.quotation_data?.discountAfterTaxPct || 0;
    const charges = quotation.quotation_data?.charges || [];
    const totals = calculateInvoiceTotals(invoiceLines, discountAfterTaxPct, charges);

    const invoiceData = {
      business_id: businessId,
      created_by: createdBy,
      party_id: quotation.party_id,
      party_name: quotation.party_name,
      ...totals,
      bank_id: quotation.bank_id,
      notes: quotation.notes || (quotation.quotation_data?.notes || ''),
      po_agreement_number: quotation.po_agreement_number || (quotation.quotation_data?.po_agreement_number || ''),
      remark: quotation.remark || (quotation.quotation_data?.remark || ''),
      invoice_data: {
        ...(quotation.quotation_data || {}),
        lines: invoiceLines,
        notes: quotation.notes || (quotation.quotation_data?.notes || ''),
        remark: quotation.remark || (quotation.quotation_data?.remark || ''),
        valid_until: quotation.valid_until || ''
      },
      quotation_id: quotation.id,
      valid_until: quotation.valid_until || '',
      status: 'open'
    };

    let resultId;
    let message;

    if (type === 'sales') {
      const invoiceDate = new Date();
      invoiceData.invoice_date = invoiceDate.toISOString().split('T')[0];
      
      // Use original valid_until or dueDate if available, otherwise default to 15 days
      let dueDateStr = quotation.valid_until || (quotation.quotation_data?.dueDate);
      if (!dueDateStr) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);
        dueDateStr = dueDate.toISOString().split('T')[0];
      }
      invoiceData.due_date = dueDateStr;
      resultId = await SalesInvoice.create(invoiceData);
      message = 'Quotation converted to Sales Invoice successfully';
    } else {
      invoiceData.proforma_date = new Date().toISOString().split('T')[0];
      resultId = await ProformaInvoice.create(invoiceData);
      message = 'Quotation converted to Proforma Invoice successfully';
    }

    // 4. Copy Terms & Conditions
    const TermsConditions = require('../models/termsConditionsModel');
    const quotationTerms = await TermsConditions.findByQuotationId(id);

    if (quotationTerms && quotationTerms.length > 0) {
      const newSections = quotationTerms.map((section) => ({
        heading: section.heading,
        content: section.content,
        section_order: section.section_order,
        sales_invoice_id: type === 'sales' ? resultId : null,
        proforma_invoice_id: type === 'proforma' ? resultId : null,
        party_id: quotation.party_id,
        business_id: businessId,
        is_locked: section.is_locked ? 1 : 0
      }));
      await TermsConditions.bulkCreate(null, quotation.party_id, businessId, newSections);
    }

    // 5. Update Original Quotation
    const remainingTotals = calculateInvoiceTotals(remainingQuotationLines, discountAfterTaxPct, charges);
    
    // Check if it's fully converted by comparing requested items with original items
    let allConverted = false;
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      allConverted = true; // Full conversion
    } else {
      // Check if all lines are covered by selected items with matching or greater quantity
      allConverted = originalLines.every(ol => {
        const si = selectedItems.find(item => item.id === ol.id);
        return si && parseFloat(si.qty) >= parseFloat(ol.qty);
      });
    }

    await Quotation.update(id, businessId, {
      ...remainingTotals,
      status: allConverted ? 'closed' : 'open',
      quotation_data: {
        ...quotation.quotation_data,
        lines: remainingQuotationLines
      }
    });

    res.status(201).json({
      success: true,
      message,
      data: { id: resultId, type }
    });

  } catch (error) {
    console.error('Error converting quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert quotation',
      error: error.message
    });
  }
};

// Get quotations by business ID
exports.getQuotationsByBusinessId = async (req, res) => {
  try {
    const { business_id } = req.params;

    // Validate business access
    if (req.user.isSubUser) {
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(business_id))) {
        return res.status(403).json({
          success: false,
          message: 'Invalid business access - subuser not authorized for this business',
          code: 'INVALID_BUSINESS'
        });
      }
    } else {
      const business = await Business.findById(business_id);
      if (!business || business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Invalid business access',
          code: 'INVALID_BUSINESS'
        });
      }
    }

    const filters = {};
    if (req.query.status && req.query.status !== 'all') {
      filters.status = req.query.status;
    }
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const quotations = await Quotation.findByBusinessId(business_id, filters);

    res.status(200).json({
      success: true,
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    console.error('Error fetching quotations by business ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotations',
      error: error.message
    });
  }
};

// Get public quotation details for shared links (No Auth)
exports.getPublicQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Fetch Quotation
    const query = 'SELECT * FROM quotations WHERE id = ? AND is_active = TRUE';
    const [rows] = await pool.execute(query, [id]);

    if (rows.length === 0) {
      console.warn('[DEBUG] getPublicQuotation: Quotation not found or inactive');
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const quotation = rows[0];
    // Parse quotation_data if it's a string
    if (typeof quotation.quotation_data === 'string') {
      quotation.quotation_data = JSON.parse(quotation.quotation_data);
    }

    // 2. Fetch Business Data
    const [bizRows] = await pool.execute('SELECT * FROM businesses WHERE id = ?', [quotation.business_id]);
    const business = bizRows[0] || {};

    // 3. Fetch Terms
    const [termsRows] = await pool.execute(
      'SELECT heading, content FROM terms_conditions WHERE quotation_id = ? ORDER BY section_order ASC',
      [id]
    );

    // 4. Fetch Bank Details (if any)
    let bankData = {};
    if (quotation.bank_id) {
      const [bankRows] = await pool.execute('SELECT * FROM bank_details WHERE id = ?', [quotation.bank_id]);
      if (bankRows.length > 0) bankData = bankRows[0];
    }

    // 5. Fetch Party details for addresses
    let partyData = {};
    if (quotation.party_id) {
      const [partyRows] = await pool.execute('SELECT * FROM parties WHERE id = ?', [quotation.party_id]);
      if (partyRows.length > 0) {
        partyData = partyRows[0];
      }
    }

    // Combine for frontend PublicDownload expectations
    const responseData = {
      ...quotation,
      business_details: {
        ...business,
        bank_details: bankData
      },
      terms_sections: termsRows,
      // Map party fields to what PublicDownload expects
      billing_address: partyData.billing_address || partyData.address,
      shipping_address: partyData.shipping_address,
      party_phone: partyData.phone_number,
      party_gstin: partyData.gstin,
      place_of_supply: partyData.state
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('[ERROR] getPublicQuotation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


