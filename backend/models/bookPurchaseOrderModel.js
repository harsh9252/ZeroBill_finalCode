const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const BookPurchaseOrder = {
  create: async (orderData) => {
    // Check if number already exists
    if (orderData.book_purchase_order_number) {
      const exists = await checkDocumentNumberExists(orderData.business_id, 'book_purchase_order', orderData.book_purchase_order_number);
      if (exists) {
        const error = new Error(`Book Purchase Order number ${orderData.book_purchase_order_number} already exists`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const orderNumber = orderData.book_purchase_order_number || await generateInvoiceNumber(orderData.business_id, 'book_purchase_order');

    const query = `
      INSERT INTO book_purchase_orders (
        book_purchase_order_number, business_id, party_id, party_name, order_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, book_purchase_order_data, bank_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      orderNumber,
      orderData.business_id,
      sanitizeValue(orderData.party_id),
      orderData.party_name,
      orderData.order_date || new Date().toISOString().split('T')[0],
      orderData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(orderData.status, 'open'),
      sanitizeValue(orderData.total_amount, 0),
      sanitizeValue(orderData.discount_amount, 0),
      sanitizeValue(orderData.tax_amount, 0),
      sanitizeValue(orderData.grand_total, 0),
      sanitizeValue(orderData.notes),
      orderData.created_by || 1,
      JSON.stringify(orderData.book_purchase_order_data || {}),
      sanitizeValue(orderData.bank_id),
      sanitizeValue(orderData.po_agreement_number),
      sanitizeValue(orderData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT bpo.*
      FROM book_purchase_orders bpo
      WHERE bpo.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND bpo.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND bpo.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND bpo.order_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND bpo.order_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY bpo.created_at DESC';

    const [rows] = await pool.execute(query, values);

    return rows.map(row => ({
      ...row,
      book_purchase_order_data: typeof row.book_purchase_order_data === 'string' ? JSON.parse(row.book_purchase_order_data) : row.book_purchase_order_data
    }));
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT bpo.*
      FROM book_purchase_orders bpo
      WHERE bpo.id = ? AND bpo.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const record = rows[0];
    record.book_purchase_order_data = typeof record.book_purchase_order_data === 'string' ? JSON.parse(record.book_purchase_order_data) : record.book_purchase_order_data;

    return record;
  },

  update: async (id, businessId, orderData) => {
    const fields = [];
    const values = [];

    if (orderData.book_purchase_order_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'book_purchase_order', orderData.book_purchase_order_number);
      
      // We need to make sure it's not the SAME order we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM book_purchase_orders WHERE business_id = ? AND book_purchase_order_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, orderData.book_purchase_order_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Book Purchase Order number ${orderData.book_purchase_order_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('book_purchase_order_number = ?');
      values.push(sanitizeValue(orderData.book_purchase_order_number));
    }

    if (orderData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(orderData.party_id));
    }
    if (orderData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(orderData.party_name);
    }
    if (orderData.order_date !== undefined) {
      fields.push('order_date = ?');
      values.push(orderData.order_date);
    }
    if (orderData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(orderData.updated_date);
    }
    if (orderData.status !== undefined) {
      fields.push('status = ?');
      values.push(orderData.status);
    }
    if (orderData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(orderData.total_amount, 0));
    }
    if (orderData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(orderData.discount_amount, 0));
    }
    if (orderData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(orderData.tax_amount, 0));
    }
    if (orderData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(orderData.grand_total, 0));
    }
    if (orderData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(orderData.notes));
    }
    if (orderData.book_purchase_order_data !== undefined) {
      fields.push('book_purchase_order_data = ?');
      values.push(JSON.stringify(orderData.book_purchase_order_data));
    }
    if (orderData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(orderData.bank_id));
    }
    if (orderData.po_agreement_number !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(orderData.po_agreement_number));
    }
    if (orderData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(orderData.remark));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE book_purchase_orders SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  delete: async (id, businessId) => {
    const query = 'DELETE FROM book_purchase_orders WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM book_purchase_orders
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  getLastOrderNumber: async (businessId) => {
    const query = `
      SELECT book_purchase_order_number FROM book_purchase_orders 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    if (rows.length > 0) {
      return rows[0].book_purchase_order_number;
    }
    return null;
  }
};

module.exports = BookPurchaseOrder;
