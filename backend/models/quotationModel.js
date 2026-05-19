const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

// Helper function to convert undefined to null
const sanitizeValue = (value, defaultValue = null) => {
  return value !== undefined && value !== '' ? value : defaultValue;
};

const Quotation = {
  // Create a new quotation
  create: async (quotationData) => {
    // If user provided a quotation number, check if it already exists
    if (quotationData.quotation_number) {
      const exists = await checkDocumentNumberExists(quotationData.business_id, 'quotation', quotationData.quotation_number);
      if (exists) {
        const error = new Error(`Quotation number ${quotationData.quotation_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    // Use provided quotation number or generate a new one
    const quotationNumber = quotationData.quotation_number || await generateInvoiceNumber(quotationData.business_id, 'quotation');
    
    // Enrich data with inventory details before storing
    const quotationDataParsed = sanitizeValue(quotationData.quotation_data, {});
    const items = quotationDataParsed.lines || quotationDataParsed.products || [];

    // Remove terms and termsHeading from quotation_data as they will be stored separately
    if (quotationDataParsed.terms) delete quotationDataParsed.terms;
    if (quotationDataParsed.termsHeading) delete quotationDataParsed.termsHeading;

    if (Array.isArray(items)) {
      for (let product of items) {
        if (product.item_code) {
          const inventoryQuery = 'SELECT gst_rate, hsn_code, unit, sale_price FROM inventory WHERE item_code = ? AND business_id = ?';
          const [inventoryRows] = await pool.execute(inventoryQuery, [product.item_code, quotationData.business_id]);
          if (inventoryRows.length > 0) {
            const inventory = inventoryRows[0];
            product.gstRate = inventory.gst_rate;
            product.gst_rate = inventory.gst_rate;
            product.hsnCode = inventory.hsn_code;
            product.hsn_code = inventory.hsn_code;
            product.unit = inventory.unit;
            product.salePrice = inventory.sale_price;
            product.sale_price = inventory.sale_price;
          }
        }
      }
    }

    const query = `INSERT INTO quotations (business_id, quotation_number, quotation_date, updated_date, party_name, party_id, status, total_amount, discount_amount, tax_amount, grand_total, notes, po_agreement_number, remark, valid_until, created_by, quotation_data, bank_id, terms_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;


    const values = [
      parseInt(quotationData.business_id) || quotationData.business_id,
      quotationNumber,
      quotationData.quotation_date || null,
      quotationData.updated_date || new Date().toISOString().slice(0, 10),
      quotationData.party_name || '',
      parseInt(quotationData.party_id) || null,
      quotationData.status || 'open',
      parseFloat(quotationData.total_amount) || 0.00,
      parseFloat(quotationData.discount_amount) || 0.00,
      parseFloat(quotationData.tax_amount) || 0.00,
      parseFloat(quotationData.grand_total) || 0.00,
      quotationData.notes || null,
      quotationData.po_agreement_number || quotationData.poAgreementNumber || null,
      quotationData.remark || null,
      quotationData.valid_until || null,
      parseInt(quotationData.created_by) || quotationData.created_by,
      JSON.stringify(quotationDataParsed),
      parseInt(quotationData.bank_id) || null,
      parseInt(quotationData.terms_id) || null
    ];

    try {
      const [result] = await pool.execute(query, values);
      
      return result.insertId;
    } catch (error) {
      console.error(' MODEL CREATE - Insert FAILED!');
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
      console.error('SQL State:', error.sqlState);
      console.error('Values being inserted:', {
        business_id: values[0],
        quotation_number: values[1],
        quotation_date: values[2],
        party_name: values[4],
        party_id: values[5],
        created_by: values[13],
        bank_id: values[15]
      });
      throw error;
    }
  },

  // Get all quotations for a business
  findByBusinessId: async (businessId, filters = {}) => {
    if (!businessId || businessId === undefined) {
      throw new Error('businessId is required and cannot be undefined');
    }



    let query = 'SELECT * FROM quotations WHERE business_id = ?';
    const values = [businessId];

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      query += ' AND status = ?';
      values.push(filters.status);
    }

    // Add party filter
    if (filters.party_id) {
      query += ' AND party_id = ?';
      values.push(filters.party_id);
    }

    // Add search filter
    if (filters.search && filters.search.trim() !== '') {
      query += ' AND (quotation_number LIKE ? OR party_name LIKE ? OR notes LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    // Add date range filter
    if (filters.start_date) {
      query += ' AND quotation_date >= ?';
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND quotation_date <= ?';
      values.push(filters.end_date);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, values);

    // Parse quotation_data JSON for each row
    return rows.map(row => ({
      ...row,
      quotation_data: row.quotation_data ? JSON.parse(row.quotation_data) : {}
    }));
  },

  // Get quotation by ID
  findById: async (id, businessId) => {
    const query = 'SELECT * FROM quotations WHERE id = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const row = rows[0];
    const quotationData = row.quotation_data ? (typeof row.quotation_data === 'string' ? JSON.parse(row.quotation_data) : row.quotation_data) : {};
    const items = quotationData.lines || quotationData.products || [];

    // Enrich data with inventory details
    if (Array.isArray(items)) {
      for (let product of items) {
        if (product.item_code) {
          const inventoryQuery = 'SELECT gst_rate, hsn_code, unit, sale_price FROM inventory WHERE item_code = ? AND business_id = ?';
          const [inventoryRows] = await pool.execute(inventoryQuery, [product.item_code, businessId]);
          if (inventoryRows.length > 0) {
            const inventory = inventoryRows[0];
            product.gstRate = inventory.gst_rate;
            product.gst_rate = inventory.gst_rate;
            product.hsnCode = inventory.hsn_code;
            product.hsn_code = inventory.hsn_code;
            product.unit = inventory.unit;
            product.salePrice = inventory.sale_price;
            product.sale_price = inventory.sale_price;
          }
        }
      }
    }

    return {
      ...row,
      quotation_data: quotationData
    };
  },

  // Update quotation
  update: async (id, businessId, quotationData) => {
    // Remove terms and termsHeading from quotation_data if present
    const cleanedQuotationData = quotationData.quotation_data ? sanitizeValue(quotationData.quotation_data, {}) : null;
    
    // Ensure nested fields inside quotation_data are consistent if they were sent as root fields
    if (cleanedQuotationData && quotationData.lines && !cleanedQuotationData.lines) {
      cleanedQuotationData.lines = quotationData.lines;
    }

    if (cleanedQuotationData) {
      if (cleanedQuotationData.terms) delete cleanedQuotationData.terms;
      if (cleanedQuotationData.termsHeading) delete cleanedQuotationData.termsHeading;
    }

    const fields = [];
    const values = [];

    if (quotationData.quotation_number !== undefined) {
      // Safety check for duplicate number during update
      const { checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');
      const exists = await checkDocumentNumberExists(businessId, 'quotation', quotationData.quotation_number);
      
      // We need to make sure it's not the SAME quotation we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM quotations WHERE business_id = ? AND quotation_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, quotationData.quotation_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Quotation number ${quotationData.quotation_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('quotation_number = ?');
      values.push(sanitizeValue(quotationData.quotation_number));
    }
    if (quotationData.quotation_date !== undefined) {
      fields.push('quotation_date = ?');
      values.push(sanitizeValue(quotationData.quotation_date));
    }
    if (quotationData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(quotationData.updated_date);
    } else {
      fields.push('updated_date = ?');
      values.push(new Date().toISOString().slice(0, 10));
    }
    if (quotationData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(sanitizeValue(quotationData.party_name));
    }
    if (quotationData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(quotationData.party_id));
    }
    if (quotationData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(quotationData.bank_id));
    }
    if (quotationData.terms_id !== undefined) {
      fields.push('terms_id = ?');
      values.push(sanitizeValue(quotationData.terms_id));
    }
    if (quotationData.status !== undefined) {
      fields.push('status = ?');
      values.push(sanitizeValue(quotationData.status, 'open'));
    }
    if (quotationData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(quotationData.total_amount, 0.00));
    }
    if (quotationData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(quotationData.discount_amount, 0.00));
    }
    if (quotationData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(quotationData.tax_amount, 0.00));
    }
    if (quotationData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(quotationData.grand_total, 0.00));
    }
    if (quotationData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(quotationData.notes));
    }
    if (quotationData.po_agreement_number !== undefined || quotationData.poAgreementNumber !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(quotationData.po_agreement_number || quotationData.poAgreementNumber));
    }
    if (quotationData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(quotationData.remark));
    }
    if (quotationData.valid_until !== undefined) {
      fields.push('valid_until = ?');
      values.push(sanitizeValue(quotationData.valid_until));
    }
    if (cleanedQuotationData) {
      fields.push('quotation_data = ?');
      values.push(JSON.stringify(cleanedQuotationData));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE quotations SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete quotation (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM quotations WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Hard delete quotation
  hardDelete: async (id, businessId) => {
    const query = 'DELETE FROM quotations WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get quotation statistics
  getStats: async (businessId) => {
    const query = `
      SELECT
        COUNT(*) as total_quotations,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_quotations,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_quotations,
        SUM(grand_total) as total_value,
        AVG(grand_total) as average_value
      FROM quotations
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  // Get last saved quotation number for a business
  getLastQuotationNumber: async (businessId) => {
    const query = `
      SELECT quotation_number FROM quotations 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [businessId]);
    
    if (rows.length > 0) {
     
      return rows[0].quotation_number;
    }
  
    return null;
  },

  // Generate next quotation number (deprecated - use generateInvoiceNumber instead)
  generateQuotationNumber: async (businessId) => {
    return await generateInvoiceNumber(businessId, 'quotation');
  }
};

module.exports = Quotation;
