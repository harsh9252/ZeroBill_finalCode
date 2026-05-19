const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

// Helper function to sanitize values
const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const SalesReturn = {
  // Create new sales return
  create: async (returnData) => {
    // If user provided a sales return number, check if it already exists
    if (returnData.sales_return_number) {
      const exists = await checkDocumentNumberExists(returnData.business_id, 'sales_return', returnData.sales_return_number);
      if (exists) {
        const error = new Error(`Sales return number ${returnData.sales_return_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const returnNumber = returnData.sales_return_number || await generateInvoiceNumber(returnData.business_id, 'sales_return');

    const query = `
      INSERT INTO sales_returns (
        return_number, business_id, party_id, party_name, return_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, sales_return_data, bank_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      returnNumber,
      returnData.business_id,
      sanitizeValue(returnData.party_id),
      returnData.party_name,
      returnData.return_date || new Date().toISOString().split('T')[0],
      returnData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(returnData.status, 'open'),
      sanitizeValue(returnData.total_amount, 0),
      sanitizeValue(returnData.discount_amount, 0),
      sanitizeValue(returnData.tax_amount, 0),
      sanitizeValue(returnData.grand_total, 0),
      sanitizeValue(returnData.notes),
      returnData.created_by || 1,
      JSON.stringify(returnData.sales_return_data || returnData.line_items || {}),
      sanitizeValue(returnData.bank_id),
      sanitizeValue(returnData.po_agreement_number),
      sanitizeValue(returnData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  // Get all sales returns for a business
  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT sr.*
      FROM sales_returns sr
      WHERE sr.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND sr.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND sr.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND sr.return_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND sr.return_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY sr.created_at DESC';

    const [rows] = await pool.execute(query, values);

    // Parse JSON sales_return_data
    return rows.map(row => ({
      ...row,
      sales_return_data: typeof row.sales_return_data === 'string' ? JSON.parse(row.sales_return_data) : row.sales_return_data
    }));
  },

  // Get sales return by ID
  findById: async (id, businessId) => {
    const query = `
      SELECT sr.*
      FROM sales_returns sr
      WHERE sr.id = ? AND sr.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const returnRecord = rows[0];
    returnRecord.sales_return_data = typeof returnRecord.sales_return_data === 'string' ? JSON.parse(returnRecord.sales_return_data) : returnRecord.sales_return_data;

    return returnRecord;
  },

  // Update sales return
  update: async (id, businessId, returnData) => {
    const fields = [];
    const values = [];

    const returnNum = returnData.return_number || returnData.sales_return_number;
    if (returnNum !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'sales_return', returnNum);
      
      // We need to make sure it's not the SAME session we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM sales_returns WHERE business_id = ? AND return_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, returnNum]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Sales return number ${returnNum} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('return_number = ?');
      values.push(sanitizeValue(returnNum));
    }

    if (returnData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(returnData.party_id));
    }
    if (returnData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(returnData.party_name);
    }
    if (returnData.return_date !== undefined) {
      fields.push('return_date = ?');
      values.push(returnData.return_date);
    }
    if (returnData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(returnData.updated_date);
    }
    if (returnData.status !== undefined) {
      fields.push('status = ?');
      values.push(returnData.status);
    }
    if (returnData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(returnData.total_amount, 0));
    }
    if (returnData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(returnData.discount_amount, 0));
    }
    if (returnData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(returnData.tax_amount, 0));
    }
    if (returnData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(returnData.grand_total, 0));
    }
    if (returnData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(returnData.notes));
    }
    if (returnData.sales_return_data !== undefined) {
      fields.push('sales_return_data = ?');
      values.push(JSON.stringify(returnData.sales_return_data));
    }
    if (returnData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(returnData.bank_id));
    }
    if (returnData.po_agreement_number !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(returnData.po_agreement_number));
    }
    if (returnData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(returnData.remark));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE sales_returns SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete sales return (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM sales_returns WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get statistics
  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_returns,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM sales_returns
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  // Get last saved sales return number for a business
  getLastReturnNumber: async (businessId) => {
    const query = `
      SELECT return_number FROM sales_returns 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [businessId]);
    
    if (rows.length > 0) {
   
      return rows[0].return_number;
    }
  
    return null;
  }
};

module.exports = SalesReturn;
