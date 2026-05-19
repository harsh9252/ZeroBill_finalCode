const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

// Helper function to sanitize values
const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const SalesInvoice = {
  // Create new sales invoice
  create: async (invoiceData) => {
    // If user provided an invoice number, check if it already exists
    if (invoiceData.invoice_number) {
      const exists = await checkDocumentNumberExists(invoiceData.business_id, 'sales_invoice', invoiceData.invoice_number);
      if (exists) {
        const error = new Error(`Invoice number ${invoiceData.invoice_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const invoiceNumber = invoiceData.invoice_number || await generateInvoiceNumber(invoiceData.business_id, 'sales_invoice');

    const query = `
      INSERT INTO sales_invoices (
        invoice_number, business_id, party_id, party_name, invoice_date, updated_date,
        due_date, status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, invoice_data, bank_id, quotation_id, proforma_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const items = invoiceData.invoice_data || invoiceData.line_items || invoiceData.lines || [];
    const finalInvoiceData = (Array.isArray(items)) ? { lines: items } : items;

    const values = [
      invoiceNumber,
      invoiceData.business_id,
      sanitizeValue(invoiceData.party_id),
      invoiceData.party_name,
      invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      invoiceData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(invoiceData.due_date),
      sanitizeValue(invoiceData.status, 'open'),
      sanitizeValue(invoiceData.total_amount, 0),
      sanitizeValue(invoiceData.discount_amount, 0),
      sanitizeValue(invoiceData.tax_amount, 0),
      sanitizeValue(invoiceData.grand_total, 0),
      sanitizeValue(invoiceData.notes),
      invoiceData.created_by || 1,
      JSON.stringify(finalInvoiceData),
      sanitizeValue(invoiceData.bank_id),
      sanitizeValue(invoiceData.quotation_id),
      sanitizeValue(invoiceData.proforma_id),
      sanitizeValue(invoiceData.po_agreement_number),
      sanitizeValue(invoiceData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  // Get all sales invoices for a business
  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT si.*
      FROM sales_invoices si
      WHERE si.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      if (filters.status === 'overdue') {
        query += " AND si.status != 'closed' AND si.due_date < CURDATE()";
      } else if (filters.status === 'open') {
        query += " AND si.status = 'open' AND (si.due_date >= CURDATE() OR si.due_date IS NULL)";
      } else {
        query += ' AND si.status = ?';
        values.push(filters.status);
      }
    }

    if (filters.party_id) {
      query += ' AND si.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.start_date) {
      query += ' AND si.invoice_date >= ?';
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND si.invoice_date <= ?';
      values.push(filters.end_date);
    }

    query += ' ORDER BY si.created_at DESC';

    const [rows] = await pool.execute(query, values);

    // Parse JSON invoice_data
    return rows.map(row => ({
      ...row,
      invoice_data: typeof row.invoice_data === 'string' ? JSON.parse(row.invoice_data) : row.invoice_data
    }));
  },

  // Get sales invoice by ID
  findById: async (id, businessId) => {
    const query = `
      SELECT si.*
      FROM sales_invoices si
      WHERE si.id = ? AND si.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const invoice = rows[0];
    invoice.invoice_data = typeof invoice.invoice_data === 'string' ? JSON.parse(invoice.invoice_data) : invoice.invoice_data;

    return invoice;
  },

  findByPoNumber: async (poNumber, businessId) => {
    const query = `
      SELECT si.*
      FROM sales_invoices si
      WHERE si.po_agreement_number = ? AND si.business_id = ?
    `;

    const [rows] = await pool.execute(query, [poNumber, businessId]);

    return rows.map(row => ({
      ...row,
      invoice_data: typeof row.invoice_data === 'string' ? JSON.parse(row.invoice_data) : row.invoice_data
    }));
  },

  // Update sales invoice
  update: async (id, businessId, invoiceData) => {
    const fields = [];
    const values = [];
    
    if (invoiceData.invoice_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'sales_invoice', invoiceData.invoice_number);
      
      // We need to make sure it's not the SAME invoice we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM sales_invoices WHERE business_id = ? AND invoice_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, invoiceData.invoice_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Invoice number ${invoiceData.invoice_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('invoice_number = ?');
      values.push(sanitizeValue(invoiceData.invoice_number));
    }

    if (invoiceData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(invoiceData.party_id));
    }
    if (invoiceData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(invoiceData.party_name);
    }
    if (invoiceData.invoice_date !== undefined) {
      fields.push('invoice_date = ?');
      values.push(invoiceData.invoice_date);
    }
    if (invoiceData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(invoiceData.updated_date);
    }
    if (invoiceData.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(sanitizeValue(invoiceData.due_date));
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

    let finalInvoiceData = invoiceData.invoice_data;
    if (finalInvoiceData === undefined && (invoiceData.line_items !== undefined || invoiceData.lines !== undefined)) {
      const items = invoiceData.line_items || invoiceData.lines || [];
      finalInvoiceData = Array.isArray(items) ? { lines: items } : items;
    }
    
    if (finalInvoiceData !== undefined) {
      
      fields.push('invoice_data = ?');
      values.push(JSON.stringify(finalInvoiceData));
    }
    if (invoiceData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(invoiceData.bank_id));
    }
    if (invoiceData.quotation_id !== undefined) {
      fields.push('quotation_id = ?');
      values.push(sanitizeValue(invoiceData.quotation_id));
    }
    if (invoiceData.proforma_id !== undefined) {
      fields.push('proforma_id = ?');
      values.push(sanitizeValue(invoiceData.proforma_id));
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

    const query = `UPDATE sales_invoices SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);



    const [result] = await pool.execute(query, values);

    return result.affectedRows > 0;
  },

  // Delete sales invoice (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM sales_invoices WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Hard delete sales invoice
  hardDelete: async (id, businessId) => {
    const query = 'DELETE FROM sales_invoices WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get statistics
  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'open' AND (due_date >= CURDATE() OR due_date IS NULL) THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN status != 'closed' AND due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(grand_total) as total_amount
      FROM sales_invoices
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  // Get last saved sales invoice number for a business
  getLastInvoiceNumber: async (businessId) => {
    const query = `
      SELECT invoice_number FROM sales_invoices 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
   
    const [rows] = await pool.execute(query, [businessId]);

    if (rows.length > 0) {
    
      return rows[0].invoice_number;
    }

    return null;
  }
};

module.exports = SalesInvoice;
