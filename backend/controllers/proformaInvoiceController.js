const ProformaInvoice = require('../models/proformaInvoiceModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
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

// Create proforma invoice
exports.createProformaInvoice = async (req, res) => {
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

    const invoiceData = {
      business_id: businessId,
      proforma_number: req.body.proforma_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      proforma_date: req.body.proforma_date || new Date().toISOString().split('T')[0],
      updated_date: req.body.updated_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      po_agreement_number: req.body.po_agreement_number || null,
      remark: req.body.remark || null,
      valid_until: req.body.valid_until,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      invoice_data: req.body.invoice_data || req.body.quotation_data || {},
      is_active: 1,
      bank_id: req.body.bank_id,
      quotation_id: req.body.quotation_id || null
    };

    const invoiceId = await ProformaInvoice.create(invoiceData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('proforma', invoiceId, invoiceData.party_id, businessId, req.body.terms_sections);
    } else if (req.body.quotation_id) {
      // Copy terms from source quotation if no explicit terms provided
      const TermsConditions = require('../models/termsConditionsModel');
      const sourceTerms = await TermsConditions.findByQuotationId(req.body.quotation_id);

      if (sourceTerms && sourceTerms.length > 0) {
        const newSections = sourceTerms.map((section, index) => ({
          heading: section.heading,
          content: section.content,
          section_order: section.section_order,
          proforma_invoice_id: invoiceId,
          party_id: invoiceData.party_id,
          business_id: businessId,
          is_locked: section.is_locked ? 1 : 0
        }));
        await TermsConditions.bulkCreate(null, invoiceData.party_id, businessId, newSections);
      }
    }

    const createdInvoice = await ProformaInvoice.findById(invoiceId, businessId);

    res.status(201).json({
      success: true,
      message: 'Proforma invoice created successfully',
      data: createdInvoice
    });
  } catch (error) {
    console.error('Error creating proforma invoice:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'proforma_number'
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
      message: 'Failed to create proforma invoice',
      error: error.message
    });
  }
};

// Get all proforma invoices
exports.getAllProformaInvoices = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {};
    if (req.query.status && req.query.status !== 'all') filters.status = req.query.status;
    if (req.query.party_id && req.query.party_id !== '' && req.query.party_id !== 'all') filters.party_id = req.query.party_id;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;

    const invoices = await ProformaInvoice.findByBusinessId(businessId, filters);

   
    if (invoices.length > 0) {
    
    }

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    console.error('Error fetching proforma invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proforma invoices',
      error: error.message
    });
  }
};

// Get proforma invoice by ID
exports.getProformaInvoiceById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const invoice = await ProformaInvoice.findById(id, businessId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching proforma invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proforma invoice',
      error: error.message
    });
  }
};

// Update proforma invoice
exports.updateProformaInvoice = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const invoiceData = req.body;

    // Validate invoice ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID. Cannot update invoice without a valid ID.',
        code: 'INVALID_ID'
      });
    }

    // Handle terms sections update if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('proforma', id, invoiceData.party_id, businessId, req.body.terms_sections);
    }

    const updated = await ProformaInvoice.update(id, businessId, invoiceData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Proforma invoice not found or no changes made'
      });
    }

    const updatedInvoice = await ProformaInvoice.findById(id, businessId);

    res.status(200).json({
      success: true,
      message: 'Proforma invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating proforma invoice:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'proforma_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update proforma invoice',
      error: error.message
    });
  }
};

// Delete proforma invoice
exports.deleteProformaInvoice = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // 1. Delete the proforma invoice
    const deleted = await ProformaInvoice.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Proforma invoice not found'
      });
    }

    // 2. Clean up related terms and conditions
    const TermsConditions = require('../models/termsConditionsModel');
    await TermsConditions.deleteByProformaId(id);

    res.status(200).json({
      success: true,
      message: 'Proforma invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting proforma invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete proforma invoice',
      error: error.message
    });
  }
};

// Get proforma invoice statistics
exports.getProformaStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await ProformaInvoice.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching proforma stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Get next proforma invoice number (based on last saved)
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
    
    // Get last saved proforma number
    const lastNumber = await ProformaInvoice.getLastProformaNumber(businessId);
   
    
    // Calculate next number using unified sequence
    const nextNumber = await getUnifiedNextNumber(businessId, 'proforma');
   

    res.status(200).json({
      success: true,
      data: {
        proforma_invoice_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next proforma number:', error);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to get next proforma number',
      error: error.message,
      code: error.code
    });
  }
};

// Generate next proforma invoice number
exports.generateNumber = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');
    
    const nextNumber = await generateInvoiceNumber(businessId, 'proforma');

    res.status(200).json({
      success: true,
      data: {
        proforma_number: nextNumber
      }
    });
  } catch (error) {
    console.error('Error generating proforma number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate proforma number',
      error: error.message
    });
  }
};

// Convert proforma invoice to Sales Invoice
exports.convertProformaToSales = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const selectedItems = req.body.items; // Array of { id, qty }

    // 1. Fetch Proforma Invoice
    const proforma = await ProformaInvoice.findById(id, businessId);
    if (!proforma) {
      return res.status(404).json({
        success: false,
        message: 'Proforma invoice not found'
      });
    }

    // 2. Determine items for conversion and remaining items for proforma
    let invoiceLines = [];
    let remainingProformaLines = [];

    const originalLines = (proforma.invoice_data?.lines || []).map(l => ({
      ...l, 
      id: l.id || `line-${Math.random().toString(36).substr(2, 9)}`
    }));

    if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
      // Partial conversion
      remainingProformaLines = JSON.parse(JSON.stringify(originalLines));

      selectedItems.forEach(item => {
        const lineIndex = remainingProformaLines.findIndex(l => l.id === item.id);
        if (lineIndex !== -1) {
          const originalLine = remainingProformaLines[lineIndex];
          const convertingQty = parseFloat(item.qty) || 0;

          if (convertingQty > 0) {
            invoiceLines.push({
              ...originalLine,
              qty: convertingQty
            });
            // Don't subtract quantity from original document as requested
            // originalLine.qty = Math.max(0, parseFloat(originalLine.qty || 0) - convertingQty);
          }
        }
      });
    } else {
      // Full conversion
      invoiceLines = [...originalLines];
      remainingProformaLines = [...originalLines];
    }

    if (invoiceLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected for conversion or invalid quantities.'
      });
    }

    // 3. Prepare Sales Invoice Data
    const SalesInvoice = require('../models/salesInvoiceModel');
    const invoiceDate = new Date();
    
    // Use original valid_until or dueDate if available, otherwise default to 15 days
    let dueDateStr = proforma.valid_until || (proforma.invoice_data?.dueDate);
    if (!dueDateStr) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      dueDateStr = dueDate.toISOString().split('T')[0];
    }

    const discountAfterTaxPct = proforma.invoice_data?.discountAfterTaxPct || 0;
    const charges = proforma.invoice_data?.charges || [];
    const totals = calculateInvoiceTotals(invoiceLines, discountAfterTaxPct, charges);

    const invoiceData = {
      business_id: businessId,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      party_id: proforma.party_id,
      party_name: proforma.party_name,
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDateStr,
      ...totals,
      bank_id: proforma.bank_id,
      notes: proforma.notes || (proforma.invoice_data?.notes || ''),
      po_agreement_number: proforma.po_agreement_number || (proforma.invoice_data?.po_agreement_number || ''),
      remark: proforma.remark || (proforma.invoice_data?.remark || ''),
      invoice_data: {
        ...(proforma.invoice_data || {}),
        lines: invoiceLines,
        notes: proforma.notes || (proforma.invoice_data?.notes || ''),
        remark: proforma.remark || (proforma.invoice_data?.remark || '')
      },
      proforma_id: proforma.id,
      status: 'open'
    };

    // 4. Create Sales Invoice
    const resultId = await SalesInvoice.create(invoiceData);

    // 5. Copy Terms & Conditions if they exist
    const TermsConditions = require('../models/termsConditionsModel');
    const proformaTerms = await TermsConditions.findByProformaId(id);

    if (proformaTerms && proformaTerms.length > 0) {
      const newSections = proformaTerms.map((section) => ({
        heading: section.heading,
        content: section.content,
        section_order: section.section_order,
        sales_invoice_id: resultId,
        proforma_invoice_id: null,
        party_id: proforma.party_id,
        business_id: businessId,
        is_locked: section.is_locked ? 1 : 0
      }));

      await TermsConditions.bulkCreate(null, proforma.party_id, businessId, newSections);
    }

    // 6. Update Original Proforma Invoice
    const remainingTotals = calculateInvoiceTotals(remainingProformaLines, discountAfterTaxPct, charges);
    
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

    await ProformaInvoice.update(id, businessId, {
      ...remainingTotals,
      status: allConverted ? 'closed' : 'open',
      invoice_data: {
        ...proforma.invoice_data,
        lines: remainingProformaLines
      }
    });

    res.status(201).json({
      success: true,
      message: 'Proforma invoice converted successfully',
      data: { id: resultId }
    });

  } catch (error) {
    console.error('Error converting proforma invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert proforma invoice',
      error: error.message
    });
  }
};

// Get public proforma invoice details for shared links (No Auth)
exports.getPublicProforma = async (req, res) => {
  try {
    const { id } = req.params;
  

    // 1. Fetch Proforma
    const query = 'SELECT * FROM proforma_invoices WHERE id = ? AND is_active = 1';
    const [rows] = await pool.execute(query, [id]);

    if (rows.length === 0) {
      console.warn('[DEBUG] getPublicProforma: Proforma not found or inactive');
      return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
    }

    const proforma = rows[0];
    // Parse invoice_data if it's a string
    if (typeof proforma.invoice_data === 'string') {
      proforma.invoice_data = JSON.parse(proforma.invoice_data);
    }

    // 2. Fetch Business Data
    const [bizRows] = await pool.execute('SELECT * FROM businesses WHERE id = ?', [proforma.business_id]);
    const business = bizRows[0] || {};

    // 3. Fetch Terms
    const [termsRows] = await pool.execute(
      'SELECT heading, content FROM terms_conditions WHERE proforma_invoice_id = ? ORDER BY section_order ASC',
      [id]
    );

    // 4. Fetch Bank Details (if any)
    let bankData = {};
    if (proforma.bank_id) {
      const [bankRows] = await pool.execute('SELECT * FROM bank_details WHERE id = ?', [proforma.bank_id]);
      if (bankRows.length > 0) bankData = bankRows[0];
    }

    // 5. Fetch Party details for addresses
    let partyData = {};
    if (proforma.party_id) {
      const [partyRows] = await pool.execute('SELECT * FROM parties WHERE id = ?', [proforma.party_id]);
      if (partyRows.length > 0) {
        partyData = partyRows[0];
      }
    }

    // Combine for frontend PublicDownload expectations
    const responseData = {
      ...proforma,
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
    console.error('[ERROR] getPublicProforma:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
