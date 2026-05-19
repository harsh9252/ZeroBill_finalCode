const { pool } = require('../config/database');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || value === null || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const PurchaseRequisition = {
  create: async (data) => {
    const query = `
      INSERT INTO purchase_requisitions (
        business_id, pr_number, pr_date, requester, item_services, 
        qty, uom, unit_price, total_amount, currency, items, comments, attachment, 
        status, po_number, approvers, created_by,
        level1_email, level2_email, level3_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.business_id,
      data.pr_number,
      data.pr_date || new Date().toISOString().split('T')[0],
      data.requester,
      data.item_services,
      sanitizeValue(data.qty, 0),
      data.uom,
      sanitizeValue(data.unit_price, 0),
      sanitizeValue(data.total_amount, 0),
      sanitizeValue(data.currency, 'INR'),
      typeof data.items === 'string' ? data.items : JSON.stringify(data.items || []),
      sanitizeValue(data.comments),
      sanitizeValue(data.attachment),
      sanitizeValue(data.status, 'pending'),
      sanitizeValue(data.po_number),
      data.approvers,
      data.created_by,
      data.level1_email,
      data.level2_email,
      data.level3_email
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  getAll: async (businessId, filters = {}) => {
    let query = 'SELECT * FROM purchase_requisitions WHERE business_id = ?';
    const values = [businessId];

    if (filters.status) {
      query += ' AND status = ?';
      values.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, values);
    return rows.map(row => ({
      ...row,
      items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : []
    }));
  },

  getById: async (id, businessId) => {
    const query = 'SELECT * FROM purchase_requisitions WHERE id = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [id, businessId]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : []
    };
  },

  update: async (id, businessId, data) => {
    const fields = [];
    const values = [];

    const updateableFields = [
      'pr_number', 'pr_date', 'requester', 'item_services', 
      'qty', 'uom', 'unit_price', 'total_amount', 'currency', 'items', 'comments', 
      'attachment', 'status', 'po_number', 'approvers', 'action_by_name', 
      'action_by_email', 'action_at', 'approved_by',
      'level1_email', 'level2_email', 'level3_email'
    ];

    updateableFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === 'items' && typeof data[field] !== 'string') {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(sanitizeValue(data[field]));
        }
      }
    });

    if (fields.length === 0) return true;

    const query = `UPDATE purchase_requisitions SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  delete: async (id, businessId) => {
    const query = 'DELETE FROM purchase_requisitions WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getByPRNumber: async (prNumber, businessId) => {
    const query = 'SELECT * FROM purchase_requisitions WHERE pr_number = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [prNumber, businessId]);
    return rows.length > 0 ? rows[0] : null;
  },

  getNextPRNumber: async (businessId) => {
    const query = `
      SELECT pr_number FROM purchase_requisitions 
      WHERE business_id = ? 
      ORDER BY id DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    
    if (rows.length === 0) return 'PR-001';

    const lastNumber = rows[0].pr_number;
    const match = lastNumber.match(/(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      const prefix = lastNumber.substring(0, match.index);
      return `${prefix}${nextNum.toString().padStart(match[1].length, '0')}`;
    }
    return `${lastNumber}-001`;
  },

  getByIdSimple: async (id) => {
    const query = 'SELECT * FROM purchase_requisitions WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    if (rows.length === 0) return null;
    return rows[0];
  },

  updateSimple: async (id, data) => {
    const fields = [];
    const values = [];
    Object.keys(data).forEach(field => {
      fields.push(`${field} = ?`);
      values.push(sanitizeValue(data[field]));
    });
    const query = `UPDATE purchase_requisitions SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }
};

module.exports = PurchaseRequisition;
