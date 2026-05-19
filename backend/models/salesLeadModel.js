const { pool } = require('../config/database');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || value === null || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const SalesLead = {
  create: async (data) => {
    const query = `
      INSERT INTO sales_leads (
        business_id, lead_no, title, value, uoms, email, phone,
        source, probability, priority, date_added, assigned_to,
        status, closed_by, close_comment, activity_log, files, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      sanitizeValue(data.business_id),
      sanitizeValue(data.lead_no),
      sanitizeValue(data.title),
      sanitizeValue(data.value, 0),
      typeof data.uoms === 'string' ? data.uoms : JSON.stringify(data.uoms || []),
      sanitizeValue(data.email),
      sanitizeValue(data.phone),
      sanitizeValue(data.source),
      sanitizeValue(data.probability, 0),
      sanitizeValue(data.priority, 'Medium'),
      sanitizeValue(data.date_added),
      sanitizeValue(data.assigned_to),
      sanitizeValue(data.status, 'open'),
      sanitizeValue(data.closed_by),
      sanitizeValue(data.close_comment),
      typeof data.activity_log === 'string' ? data.activity_log : JSON.stringify(data.activity_log || []),
      typeof data.files === 'string' ? data.files : JSON.stringify(data.files || []),
      sanitizeValue(data.created_by)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  getAll: async (businessId, filters = {}) => {
    let query = 'SELECT * FROM sales_leads WHERE business_id = ?';
    const values = [businessId];

    if (filters.status && filters.status !== 'all') {
      query += ' AND status = ?';
      values.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (title LIKE ? OR lead_no LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filters.assigned_to) {
      query += ' AND LOWER(TRIM(assigned_to)) = LOWER(TRIM(?))';
      values.push(filters.assigned_to);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, values);
    return rows.map(row => ({
      ...row,
      uoms: row.uoms ? (typeof row.uoms === 'string' ? JSON.parse(row.uoms) : row.uoms) : [],
      activity_log: row.activity_log ? (typeof row.activity_log === 'string' ? JSON.parse(row.activity_log) : row.activity_log) : [],
      files: row.files ? (typeof row.files === 'string' ? JSON.parse(row.files) : row.files) : []
    }));
  },

  getById: async (id, businessId) => {
    const query = 'SELECT * FROM sales_leads WHERE id = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [id, businessId]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      uoms: row.uoms ? (typeof row.uoms === 'string' ? JSON.parse(row.uoms) : row.uoms) : [],
      activity_log: row.activity_log ? (typeof row.activity_log === 'string' ? JSON.parse(row.activity_log) : row.activity_log) : [],
      files: row.files ? (typeof row.files === 'string' ? JSON.parse(row.files) : row.files) : []
    };
  },

  update: async (id, businessId, data) => {
    const fields = [];
    const values = [];

    const updateableFields = [
      'title', 'value', 'uoms', 'email', 'phone', 'source',
      'probability', 'priority', 'date_added', 'assigned_to',
      'status', 'closed_by', 'close_comment', 'activity_log', 'files'
    ];

    updateableFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (['uoms', 'activity_log', 'files'].includes(field) && typeof data[field] !== 'string') {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(sanitizeValue(data[field]));
        }
      }
    });

    if (fields.length === 0) return true;

    const query = `UPDATE sales_leads SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    await pool.execute(query, values);
    return true;
  },

  delete: async (id, businessId) => {
    const query = 'DELETE FROM sales_leads WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getNextLeadNumber: async (businessId) => {
    const query = `
      SELECT lead_no FROM sales_leads 
      WHERE business_id = ?
      ORDER BY id DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    
    if (rows.length === 0) return 'SL-001';

    const lastNumber = rows[0].lead_no;
    const match = lastNumber.match(/(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      const prefix = lastNumber.substring(0, match.index);
      return `${prefix}${nextNum.toString().padStart(match[1].length, '0')}`;
    }
    return `${lastNumber}-001`;
  }
};

module.exports = SalesLead;
