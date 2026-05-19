const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

// Helper function to sanitize values
const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const ProformaInvoice = {
  // Create new proforma invoice
  create: async (invoiceData) => {
    // If user provided a proforma number, check if it already exists
    if (invoiceData.proforma_number) {
      const exists = await checkDocumentNumberExists(invoiceData.business_id, 'proforma', invoiceData.proforma_number);
      if (exists) {
        const error = new Error(`Proforma number ${invoiceData.proforma_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const proformaNumber = invoiceData.proforma_number || await generateInvoiceNumber(invoiceData.business_id, 'proforma');

    const query = `
      INSERT INTO proforma_invoices (
        proforma_number, business_id, party_id, party_name, proforma_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, valid_until, created_by, invoice_data, bank_id, quotation_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      proformaNumber,
      invoiceData.business_id,
      sanitizeValue(invoiceData.party_id),
      invoiceData.party_name,
      invoiceData.proforma_date || new Date().toISOString().split('T')[0],
      invoiceData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(invoiceData.status, 'open'),
      sanitizeValue(invoiceData.total_amount, 0),
      sanitizeValue(invoiceData.discount_amount, 0),
      sanitizeValue(invoiceData.tax_amount, 0),
      sanitizeValue(invoiceData.grand_total, 0),
      sanitizeValue(invoiceData.notes),
      sanitizeValue(invoiceData.valid_until),
      invoiceData.created_by || 1,
      JSON.stringify(invoiceData.invoice_data || invoiceData.line_items || {}),
      sanitizeValue(invoiceData.bank_id),
      sanitizeValue(invoiceData.quotation_id),
      sanitizeValue(invoiceData.po_agreement_number),
      sanitizeValue(invoiceData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  // Get all proforma invoices for a business
  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT pi.*
      FROM proforma_invoices pi
      WHERE pi.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND pi.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND pi.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.start_date) {
      query += ' AND pi.proforma_date >= ?';
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND pi.proforma_date <= ?';
      values.push(filters.end_date);
    }

    query += ' ORDER BY pi.created_at DESC';

    const [rows] = await pool.execute(query, values);

    // Parse JSON invoice_data
    return rows.map(row => ({
      ...row,
      invoice_data: typeof row.invoice_data === 'string' ? JSON.parse(row.invoice_data) : row.invoice_data
    }));
  },

  // Get proforma invoice by ID
  findById: async (id, businessId) => {
    const query = `
      SELECT pi.*
      FROM proforma_invoices pi
      WHERE pi.id = ? AND pi.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const invoice = rows[0];
    invoice.invoice_data = typeof invoice.invoice_data === 'string' ? JSON.parse(invoice.invoice_data) : invoice.invoice_data;

    return invoice;
  },

  // Update proforma invoice
  update: async (id, businessId, invoiceData) => {
    const fields = [];
    const values = [];

    if (invoiceData.proforma_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'proforma', invoiceData.proforma_number);
      
      // We need to make sure it's not the SAME proforma we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM proforma_invoices WHERE business_id = ? AND proforma_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, invoiceData.proforma_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Proforma number ${invoiceData.proforma_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('proforma_number = ?');
      values.push(sanitizeValue(invoiceData.proforma_number));
    }

    if (invoiceData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(invoiceData.party_id));
    }
    if (invoiceData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(invoiceData.party_name);
    }
    if (invoiceData.proforma_date !== undefined) {
      fields.push('proforma_date = ?');
      values.push(invoiceData.proforma_date);
    }
    if (invoiceData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(invoiceData.updated_date);
    }
    if (invoiceData.status !== undefined) {
      fields.push('status = ?');
      values.push(invoiceData.status);
    }
    if (invoiceData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(invoiceData.total_amount, 0));
    }
    if (invoiceData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(invoiceData.discount_amount, 0));
    }
    if (invoiceData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(invoiceData.tax_amount, 0));
    }
    if (invoiceData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(invoiceData.grand_total, 0));
    }
    if (invoiceData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(invoiceData.notes));
    }
    if (invoiceData.valid_until !== undefined) {
      fields.push('valid_until = ?');
      values.push(sanitizeValue(invoiceData.valid_until));
    }
    if (invoiceData.invoice_data !== undefined) {
      fields.push('invoice_data = ?');
      values.push(JSON.stringify(invoiceData.invoice_data));
    }
    if (invoiceData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(invoiceData.bank_id));
    }
    if (invoiceData.quotation_id !== undefined) {
      fields.push('quotation_id = ?');
      values.push(sanitizeValue(invoiceData.quotation_id));
    }
    if (invoiceData.po_agreement_number !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(invoiceData.po_agreement_number));
    }
    if (invoiceData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(invoiceData.remark));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE proforma_invoices SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete proforma invoice (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM proforma_invoices WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get statistics
  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_proformas,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM proforma_invoices
      WHERE business_id = ? AND is_active = 1
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  // Get last saved proforma invoice number for a business
  getLastProformaNumber: async (businessId) => {
    const query = `
      SELECT proforma_number FROM proforma_invoices 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
   
    const [rows] = await pool.execute(query, [businessId]);
   
    if (rows.length > 0) {
     
      return rows[0].proforma_number;
    }
  
    return null;
  }
};

module.exports = ProformaInvoice;
