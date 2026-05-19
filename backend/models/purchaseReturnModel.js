const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const PurchaseReturn = {
  create: async (returnData) => {
    // If user provided a purchase return number, check if it already exists
    if (returnData.purchase_return_number) {
      const exists = await checkDocumentNumberExists(returnData.business_id, 'purchase_return', returnData.purchase_return_number);
      if (exists) {
        const error = new Error(`Purchase return number ${returnData.purchase_return_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const returnNumber = returnData.purchase_return_number || await generateInvoiceNumber(returnData.business_id, 'purchase_return');

    const query = `
      INSERT INTO purchase_returns (
        purchase_return_number, business_id, party_id, party_name, return_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, purchase_return_data, bank_id,
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
      JSON.stringify(returnData.purchase_return_data || returnData.line_items || {}),
      sanitizeValue(returnData.bank_id),
      sanitizeValue(returnData.po_agreement_number),
      sanitizeValue(returnData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT pr.*
      FROM purchase_returns pr
      WHERE pr.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND pr.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND pr.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND pr.return_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND pr.return_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY pr.created_at DESC';

    const [rows] = await pool.execute(query, values);

    return rows.map(row => ({
      ...row,
      purchase_return_data: typeof row.purchase_return_data === 'string' ? JSON.parse(row.purchase_return_data) : row.purchase_return_data
    }));
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT pr.*
      FROM purchase_returns pr
      WHERE pr.id = ? AND pr.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const returnRecord = rows[0];
    returnRecord.purchase_return_data = typeof returnRecord.purchase_return_data === 'string' ? JSON.parse(returnRecord.purchase_return_data) : returnRecord.purchase_return_data;

    return returnRecord;
  },

  update: async (id, businessId, returnData) => {
    const fields = [];
    const values = [];

    if (returnData.purchase_return_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'purchase_return', returnData.purchase_return_number);
      
      // We need to make sure it's not the SAME session we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM purchase_returns WHERE business_id = ? AND purchase_return_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, returnData.purchase_return_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Purchase return number ${returnData.purchase_return_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('purchase_return_number = ?');
      values.push(sanitizeValue(returnData.purchase_return_number));
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
    if (returnData.purchase_return_data !== undefined) {
      fields.push('purchase_return_data = ?');
      values.push(JSON.stringify(returnData.purchase_return_data));
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

    const query = `UPDATE purchase_returns SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete purchase return (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM purchase_returns WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_returns,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM purchase_returns
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  getLastReturnNumber: async (businessId) => {
    const query = `
      SELECT purchase_return_number FROM purchase_returns 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    if (rows.length > 0) {
      return rows[0].purchase_return_number;
    }
    return null;
  }
};

module.exports = PurchaseReturn;
