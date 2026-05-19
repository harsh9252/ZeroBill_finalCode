const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const DeliveryChallan = {
  create: async (challanData) => {
    // If user provided a challan number, check if it already exists
    if (challanData.challan_number) {
      const exists = await checkDocumentNumberExists(challanData.business_id, 'delivery_challan', challanData.challan_number);
      if (exists) {
        const error = new Error(`Delivery challan number ${challanData.challan_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const challanNumber = challanData.challan_number || await generateInvoiceNumber(challanData.business_id, 'delivery_challan');

    const query = `
      INSERT INTO delivery_challans (
        challan_number, business_id, party_id, party_name, challan_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, challan_data, bank_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      challanNumber,
      challanData.business_id,
      sanitizeValue(challanData.party_id),
      challanData.party_name,
      challanData.challan_date || new Date().toISOString().split('T')[0],
      challanData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(challanData.status, 'open'),
      sanitizeValue(challanData.total_amount, 0),
      sanitizeValue(challanData.discount_amount, 0),
      sanitizeValue(challanData.tax_amount, 0),
      sanitizeValue(challanData.grand_total, 0),
      sanitizeValue(challanData.notes),
      challanData.created_by || 1,
      JSON.stringify(challanData.challan_data || challanData.line_items || {}),
      sanitizeValue(challanData.bank_id),
      sanitizeValue(challanData.po_agreement_number),
      sanitizeValue(challanData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT dc.*
      FROM delivery_challans dc
      WHERE dc.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND dc.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND dc.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND dc.challan_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND dc.challan_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY dc.created_at DESC';

    const [rows] = await pool.execute(query, values);

    return rows.map(row => ({
      ...row,
      challan_data: typeof row.challan_data === 'string' ? JSON.parse(row.challan_data) : row.challan_data
    }));
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT dc.*
      FROM delivery_challans dc
      WHERE dc.id = ? AND dc.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const record = rows[0];
    record.challan_data = typeof record.challan_data === 'string' ? JSON.parse(record.challan_data) : record.challan_data;

    return record;
  },

  update: async (id, businessId, challanData) => {
    const fields = [];
    const values = [];

    if (challanData.challan_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'delivery_challan', challanData.challan_number);
      
      // We need to make sure it's not the SAME challan we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM delivery_challans WHERE business_id = ? AND challan_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, challanData.challan_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Delivery challan number ${challanData.challan_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('challan_number = ?');
      values.push(sanitizeValue(challanData.challan_number));
    }

    if (challanData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(challanData.party_id));
    }
    if (challanData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(challanData.party_name);
    }
    if (challanData.challan_date !== undefined) {
      fields.push('challan_date = ?');
      values.push(challanData.challan_date);
    }
    if (challanData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(challanData.updated_date);
    }
    if (challanData.status !== undefined) {
      fields.push('status = ?');
      values.push(challanData.status);
    }
    if (challanData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(challanData.total_amount, 0));
    }
    if (challanData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(challanData.discount_amount, 0));
    }
    if (challanData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(challanData.tax_amount, 0));
    }
    if (challanData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(challanData.grand_total, 0));
    }
    if (challanData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(challanData.notes));
    }
    if (challanData.challan_data !== undefined) {
      fields.push('challan_data = ?');
      values.push(JSON.stringify(challanData.challan_data));
    }
    if (challanData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(challanData.bank_id));
    }
    if (challanData.po_agreement_number !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(challanData.po_agreement_number));
    }
    if (challanData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(challanData.remark));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE delivery_challans SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete delivery challan (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM delivery_challans WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_challans,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM delivery_challans
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  getLastChallanNumber: async (businessId) => {
    const query = `
      SELECT challan_number FROM delivery_challans 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
   
    const [rows] = await pool.execute(query, [businessId]);
 
    if (rows.length > 0) {
  
      return rows[0].challan_number;
    }
  
    return null;
  }
};

module.exports = DeliveryChallan;
