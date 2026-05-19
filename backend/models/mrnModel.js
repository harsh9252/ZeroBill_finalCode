const { pool } = require('../config/database');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const MRN = {
  create: async (data) => {
    const query = `
      INSERT INTO mrn_records (
        business_id, party_id, bill_to_address_id,
        products, terms, totals,
        mrn_date, due_date, notes,
        mrn_number, purchase_order_number,
        delivery_location, cost_center, remark,advice_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.business_id,
      sanitizeValue(data.party_id),
      sanitizeValue(data.bill_to_address_id),
      JSON.stringify(data.products || []),
      JSON.stringify(data.terms || []),
      JSON.stringify(data.totals || {}),
      data.mrn_date || data.grn_date || new Date().toISOString().split('T')[0],
      sanitizeValue(data.due_date),
      sanitizeValue(data.notes),
      data.mrn_number || data.grn_number,
      sanitizeValue(data.purchase_order_number),
      sanitizeValue(data.delivery_location),
      sanitizeValue(data.cost_center),
      sanitizeValue(data.remark),
      sanitizeValue(data.advice_no),
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId) => {
    const query = `
      SELECT m.*, p.party_name
      FROM mrn_records m
      LEFT JOIN parties p ON m.party_id = p.id
      WHERE m.business_id = ?
      ORDER BY m.id DESC
    `;

    const [rows] = await pool.execute(query, [businessId]);

    return rows.map(r => ({
      ...r,
      products: typeof r.products === 'string' ? JSON.parse(r.products) : r.products,
      terms: typeof r.terms === 'string' ? JSON.parse(r.terms) : r.terms,
      totals: typeof r.totals === 'string' ? JSON.parse(r.totals) : r.totals,
    }));
  },

  findById: async (id, businessId) => {
    const [rows] = await pool.execute(
      'SELECT * FROM mrn_records WHERE id = ? AND business_id = ?',
      [id, businessId]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      products: typeof r.products === 'string' ? JSON.parse(r.products) : r.products,
      terms: typeof r.terms === 'string' ? JSON.parse(r.terms) : r.terms,
      totals: typeof r.totals === 'string' ? JSON.parse(r.totals) : r.totals,
    };
  },
  update: async (id, data) => {
    const query = `
        UPDATE mrn_records SET
          party_id = ?, 
          bill_to_address_id = ?,
          products = ?, 
          terms = ?, 
          totals = ?,
          mrn_date = ?, 
          due_date = ?, 
          notes = ?,
          mrn_number = ?, 
          purchase_order_number = ?,
          delivery_location = ?, 
          cost_center = ?, 
          remark = ?,
          advice_no = ?
        WHERE id = ? AND business_id = ?
      `;

    const values = [
      sanitizeValue(data.party_id),
      sanitizeValue(data.bill_to_address_id),
      JSON.stringify(data.products || []),
      JSON.stringify(data.terms || []),
      JSON.stringify(data.totals || {}),
      data.mrn_date,
      sanitizeValue(data.due_date),
      sanitizeValue(data.notes),
      data.mrn_number,
      sanitizeValue(data.purchase_order_number),
      sanitizeValue(data.delivery_location),
      sanitizeValue(data.cost_center),
      sanitizeValue(data.remark),
      sanitizeValue(data.advice_no),
      id,
      data.business_id,
    ];

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  delete: async (id, businessId) => {
    const [result] = await pool.execute(
      'DELETE FROM mrn_records WHERE id = ? AND business_id = ?',
      [id, businessId]
    );
    return result.affectedRows > 0;
  },

  checkNumberExists: async (mrn_number, business_id, excludeId = null) => {
    let query = 'SELECT COUNT(*) as count FROM mrn_records WHERE mrn_number = ? AND business_id = ?';
    const values = [mrn_number, business_id];

    if (excludeId) {
      query += ' AND id != ?';
      values.push(excludeId);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].count > 0;
  },
};

module.exports = MRN;
