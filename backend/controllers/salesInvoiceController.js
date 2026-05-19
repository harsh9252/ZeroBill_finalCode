const SalesInvoice = require('../models/salesInvoiceModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

const adjustStockOnUpdate = async (oldInvoice, newInvoice, businessId) => {
  if (!oldInvoice || !newInvoice) return;
  const oldLines = (oldInvoice.invoice_data && oldInvoice.invoice_data.lines) || [];
  const newLines = (newInvoice.invoice_data && newInvoice.invoice_data.lines) || [];

  const oldMap = {};
  const newMap = {};

  oldLines.forEach(line => {
    const productId = line.productId;
    if (productId && !isNaN(productId)) {
      oldMap[productId] = (oldMap[productId] || 0) + (parseFloat(line.qty) || 0);
    }
  });

  newLines.forEach(line => {
    const productId = line.productId;
    if (productId && !isNaN(productId)) {
      newMap[productId] = (newMap[productId] || 0) + (parseFloat(line.qty) || 0);
    }
  });

  const allProductIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  const Inventory = require('../models/inventoryModel');

  for (const productId of allProductIds) {
    const oldQty = oldMap[productId] || 0;
    const newQty = newMap[productId] || 0;
    const diff = oldQty - newQty; // positive means old was larger (return stock), negative means new is larger (subtract stock)

    if (diff !== 0) {
      await Inventory.updateStock(productId, businessId, diff, `Tax Invoice ${newInvoice.invoice_number}`);
    }
  }
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

// Create sales invoice
exports.createSalesInvoice = async (req, res) => {
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

    // For subusers, use parent_user_id as created_by since the foreign key references users table
    const createdBy = req.user.isSubUser ? req.user.parentUserId : req.user.id;

    const invoiceData = {
      business_id: businessId,
      invoice_number: req.body.invoice_number || null,
      created_by: createdBy,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      invoice_date: req.body.invoice_date || new Date().toISOString().split('T')[0],
      due_date: req.body.due_date,
      billing_address: req.body.billing_address,
      billing_city: req.body.billing_city,
      billing_state: req.body.billing_state,
      billing_pincode: req.body.billing_pincode,
      billing_country: req.body.billing_country || 'India',
      shipping_address: req.body.shipping_address,
      shipping_city: req.body.shipping_city,
      shipping_state: req.body.shipping_state,
      shipping_pincode: req.body.shipping_pincode,
      shipping_country: req.body.shipping_country || 'India',
      subtotal: parseFloat(req.body.subtotal) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      total_amount: parseFloat(req.body.total_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      paid_amount: parseFloat(req.body.paid_amount) || 0,
      bank_id: req.body.bank_id,
      notes: req.body.notes,
      po_agreement_number: req.body.po_agreement_number || null,
      remark: req.body.remark || null,
      terms_conditions: req.body.terms_conditions,
      payment_terms: req.body.payment_terms,
      status: req.body.status || 'open',
      line_items: req.body.line_items || [],
      invoice_data: req.body.invoice_data || null,
      proforma_invoice_id: req.body.proforma_invoice_id,
      quotation_id: req.body.quotation_id
    };



    const invoiceId = await SalesInvoice.create(invoiceData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('sales', invoiceId, invoiceData.party_id, businessId, req.body.terms_sections);
    } else if (req.body.proforma_invoice_id || req.body.quotation_id) {
      // Copy terms from source document if no explicit terms provided
      let sourceTerms = [];
      const TermsConditions = require('../models/termsConditionsModel');
      if (req.body.proforma_invoice_id) {
        sourceTerms = await TermsConditions.findByProformaId(req.body.proforma_invoice_id);
      } else if (req.body.quotation_id) {
        sourceTerms = await TermsConditions.findByQuotationId(req.body.quotation_id);
      }

      if (sourceTerms && sourceTerms.length > 0) {
        const newSections = sourceTerms.map((section, index) => ({
          heading: section.heading,
          content: section.content,
          section_order: section.section_order,
          sales_invoice_id: invoiceId,
          party_id: invoiceData.party_id,
          business_id: businessId,
          is_locked: section.is_locked ? 1 : 0
        }));
        await TermsConditions.bulkCreate(null, invoiceData.party_id, businessId, newSections);
      }
    }

    const createdInvoice = await SalesInvoice.findById(invoiceId, businessId);

    // Deduct stock for all items in the sales invoice
    if (createdInvoice && createdInvoice.invoice_data && Array.isArray(createdInvoice.invoice_data.lines)) {
      const Inventory = require('../models/inventoryModel');
      for (const line of createdInvoice.invoice_data.lines) {
        const productId = line.productId;
        const qty = parseFloat(line.qty) || 0;
        if (productId && qty > 0 && !isNaN(productId)) {
          await Inventory.updateStock(productId, businessId, -qty, `Tax Invoice ${createdInvoice.invoice_number}`);
        }
      }
    }

    // 🔗 Robust Sync: If linked to a PO, synchronize the booked quantities immediately
    if (invoiceData.po_agreement_number) {

      const po = await PurchaseOrder.findByOrderNumber(invoiceData.po_agreement_number, businessId);
      if (po) {

        await PurchaseOrder.syncWithInvoices(po.id, businessId);
      } else {
        console.warn(`Linked PO "${invoiceData.po_agreement_number}" not found for sync.`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sales invoice created successfully',
      data: createdInvoice
    });
  } catch (error) {
    console.error('Error creating sales invoice:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'invoice_number'
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
      message: 'Failed to create sales invoice',
      error: error.message
    });
  }
};

// Get all sales invoices
exports.getAllSalesInvoices = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    const filters = {};
    if (req.query.status && req.query.status !== 'all') filters.status = req.query.status;
    if (req.query.party_id && req.query.party_id !== '' && req.query.party_id !== 'all') filters.party_id = req.query.party_id;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;

    const invoices = await SalesInvoice.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    console.error('Error fetching sales invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales invoices',
      error: error.message
    });
  }
};

// Get sales invoice by ID
exports.getSalesInvoiceById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const invoice = await SalesInvoice.findById(id, businessId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching sales invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales invoice',
      error: error.message
    });
  }
};

// Update sales invoice
exports.updateSalesInvoice = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const invoiceData = req.body;

    // Validate invoice ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID. Cannot update invoice without a valid ID.',
        code: 'INVALID_INVOICE_ID'
      });
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('sales', id, invoiceData.party_id, businessId, req.body.terms_sections);
    }

    const oldInvoice = await SalesInvoice.findById(id, businessId);

    const updated = await SalesInvoice.update(id, businessId, invoiceData);

    if (!updated) {
      // Check if the record exists to distinguish between "not found" and "no changes made"
      const exists = await SalesInvoice.findById(id, businessId);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Sales invoice not found'
        });
      }
    }

    const updatedInvoice = await SalesInvoice.findById(id, businessId);

    await adjustStockOnUpdate(oldInvoice, updatedInvoice, businessId);

    res.status(200).json({
      success: true,
      message: 'Sales invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating sales invoice:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'invoice_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update sales invoice',
      error: error.message
    });
  }
};

// Delete sales invoice
exports.deleteSalesInvoice = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // 1. Fetch the invoice to check for PO linkage and get line items
    const invoice = await SalesInvoice.findById(id, businessId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found'
      });
    }

    // 2. If it's linked to a PO, roll back the quantities
    // 2. If it's linked to a PO, identify the ID for sync after deletion
    let linkedPoId = null;
    if (invoice.po_agreement_number) {

      const po = await PurchaseOrder.findByOrderNumber(invoice.po_agreement_number, businessId);
      if (po) {
        linkedPoId = po.id;
      }
    }

    // 3. Delete the invoice
    const deleted = await SalesInvoice.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found'
      });
    }

    // Return stock since the invoice is deleted
    if (invoice && invoice.invoice_data && Array.isArray(invoice.invoice_data.lines)) {
      const Inventory = require('../models/inventoryModel');
      for (const line of invoice.invoice_data.lines) {
        const productId = line.productId;
        const qty = parseFloat(line.qty) || 0;
        if (productId && qty > 0 && !isNaN(productId)) {
          await Inventory.updateStock(productId, businessId, qty, `Tax Invoice ${invoice.invoice_number} (Deleted)`);
        }
      }
    }

    // 4. Perform robust sync if a PO was linked
    if (linkedPoId) {

      await PurchaseOrder.syncWithInvoices(linkedPoId, businessId);
    }

    res.status(200).json({
      success: true,
      message: 'Sales invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sales invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sales invoice',
      error: error.message
    });
  }
};

// Hard delete sales invoice
exports.hardDeleteSalesInvoice = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // 1. Fetch the invoice to check for PO linkage and get line items
    const invoice = await SalesInvoice.findById(id, businessId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found'
      });
    }

    // 2. If it's linked to a PO, identify the ID for sync after deletion
    let linkedPoId = null;
    if (invoice.po_agreement_number) {
      const po = await PurchaseOrder.findByOrderNumber(invoice.po_agreement_number, businessId);
      if (po) {
        linkedPoId = po.id;
      }
    }

    // 3. Hard delete the invoice
    const deleted = await SalesInvoice.hardDelete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found'
      });
    }

    // Return stock since the invoice is deleted
    if (invoice && invoice.invoice_data && Array.isArray(invoice.invoice_data.lines)) {
      const Inventory = require('../models/inventoryModel');
      for (const line of invoice.invoice_data.lines) {
        const productId = line.productId;
        const qty = parseFloat(line.qty) || 0;
        if (productId && qty > 0 && !isNaN(productId)) {
          await Inventory.updateStock(productId, businessId, qty, `Tax Invoice ${invoice.invoice_number} (Deleted)`);
        }
      }
    }

    // 4. Clean up related terms and conditions
    const TermsConditions = require('../models/termsConditionsModel');
    await TermsConditions.deleteBySalesId(id);

    // 5. Perform robust sync if a PO was linked
    if (linkedPoId) {
      await PurchaseOrder.syncWithInvoices(linkedPoId, businessId);
    }

    res.status(200).json({
      success: true,
      message: 'Sales invoice permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error hard deleting sales invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete sales invoice',
      error: error.message
    });
  }
};

// Get sales invoice statistics
exports.getSalesStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await SalesInvoice.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Generate next sales invoice number
exports.getNextNumber = async (req, res) => {
  try {
    ('getNextNumber (Sales Invoice) called');
   

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

    // Get last saved invoice number
    const lastNumber = await SalesInvoice.getLastInvoiceNumber(businessId);
 

    // Calculate next number using unified sequence
    const nextNumber = await getUnifiedNextNumber(businessId, 'sales_invoice');


    res.status(200).json({
      success: true,
      data: {
        invoice_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next sales invoice number:', error);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to get next sales invoice number',
      error: error.message,
      code: error.code
    });
  }
};

exports.generateNumber = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');

    const nextNumber = await generateInvoiceNumber(businessId, 'sales_invoice');

    res.status(200).json({
      success: true,
      data: {
        invoice_number: nextNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales invoice number',
      error: error.message
    });
  }
};

// Get public sales invoice details for shared links (No Auth)
exports.getPublicSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;


    // 1. Fetch Sales Invoice
    const query = 'SELECT * FROM sales_invoices WHERE id = ? AND is_active = 1';
    const [rows] = await pool.execute(query, [id]);

    if (rows.length === 0) {
      console.warn('[DEBUG] getPublicSalesInvoice: Invoice not found or inactive');
      return res.status(404).json({ success: false, message: 'Sales invoice not found' });
    }

    const invoice = rows[0];
    // Parse invoice_data if it's a string
    if (typeof invoice.invoice_data === 'string') {
      invoice.invoice_data = JSON.parse(invoice.invoice_data);
    }

    // 2. Fetch Business Data
    const [bizRows] = await pool.execute('SELECT * FROM businesses WHERE id = ?', [invoice.business_id]);
    const business = bizRows[0] || {};

    // 3. Fetch Terms
    const [termsRows] = await pool.execute(
      'SELECT heading, content FROM terms_conditions WHERE sales_invoice_id = ? ORDER BY section_order ASC',
      [id]
    );

    // 4. Fetch Bank Details (if any)
    let bankData = {};
    if (invoice.bank_id) {
      const [bankRows] = await pool.execute('SELECT * FROM bank_details WHERE id = ?', [invoice.bank_id]);
      if (bankRows.length > 0) bankData = bankRows[0];
    }

    // 5. Fetch Party details for addresses
    let partyData = {};
    if (invoice.party_id) {
      const [partyRows] = await pool.execute('SELECT * FROM parties WHERE id = ?', [invoice.party_id]);
      if (partyRows.length > 0) {
        partyData = partyRows[0];
      }
    }

    // Combine for frontend PublicDownload expectations
    const responseData = {
      ...invoice,
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
    console.error('[ERROR] getPublicSalesInvoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
