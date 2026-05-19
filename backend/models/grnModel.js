const { pool } = require('../config/database');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const GRN = {
  create: async (data) => {
    const query = `
      INSERT INTO grn_records (
        business_id, party_id, bill_to_address_id,
        products, terms, totals,
        grn_date, due_date, notes,
        grn_number, purchase_order_number,
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
      data.grn_date || new Date().toISOString().split('T')[0],
      sanitizeValue(data.due_date),
      sanitizeValue(data.notes),
      data.grn_number,
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
      SELECT g.*, p.party_name 
      FROM grn_records g
      LEFT JOIN parties p ON g.party_id = p.id
      WHERE g.business_id = ? 
      ORDER BY g.id DESC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows.map(r => {
      const id = r.id || r.Id || r.ID;
      return {
        ...r,
        id: id,
        products: typeof r.products === 'string' ? JSON.parse(r.products) : r.products,
        terms: typeof r.terms === 'string' ? JSON.parse(r.terms) : r.terms,
        totals: typeof r.totals === 'string' ? JSON.parse(r.totals) : r.totals,
      };
    });
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT g.*, p.party_name 
      FROM grn_records g
      LEFT JOIN parties p ON g.party_id = p.id
      WHERE g.id = ? AND g.business_id = ?
    `;
    const [rows] = await pool.execute(query, [id, businessId]);
    if (!rows.length) return null;
    const r = rows[0];
    const normalizedId = r.id || r.Id || r.ID;
    return {
      ...r,
      id: normalizedId,
      products: typeof r.products === 'string' ? JSON.parse(r.products) : r.products,
      terms: typeof r.terms === 'string' ? JSON.parse(r.terms) : r.terms,
      totals: typeof r.totals === 'string' ? JSON.parse(r.totals) : r.totals,
    };
  },

  delete: async (id, businessId) => {
    const [result] = await pool.execute(
      'DELETE FROM grn_records WHERE id = ? AND business_id = ?',
      [id, businessId]
    );
    return result.affectedRows > 0;
  },

  update: async (id, data) => {
    const query = `
      UPDATE grn_records SET
        party_id = ?, 
        bill_to_address_id = ?,
        products = ?, 
        terms = ?, 
        totals = ?,
        grn_date = ?, 
        due_date = ?, 
        notes = ?,
        grn_number = ?, 
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
      data.grn_date,
      sanitizeValue(data.due_date),
      sanitizeValue(data.notes),
      data.grn_number,
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

  getLastGRNNumber: async (businessId) => {
    const query = `
      SELECT grn_number FROM grn_records 
      WHERE business_id = ? 
      ORDER BY id DESC LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows.length > 0 ? rows[0].grn_number : null;
  },

  checkNumberExists: async (grn_number, business_id, excludeId = null) => {
    let query = 'SELECT COUNT(*) as count FROM grn_records WHERE grn_number = ? AND business_id = ?';
    const values = [grn_number, business_id];

    if (excludeId) {
      query += ' AND id != ?';
      values.push(excludeId);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].count > 0;
  },
};

module.exports = GRN;
