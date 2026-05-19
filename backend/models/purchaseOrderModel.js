const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const PurchaseOrder = {
  create: async (orderData) => {
    // If user provided a purchase order number, check if it already exists
    if (orderData.purchase_order_number) {
      const exists = await checkDocumentNumberExists(orderData.business_id, 'purchase_order', orderData.purchase_order_number);
      if (exists) {
        const error = new Error(`Purchase order number ${orderData.purchase_order_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const orderNumber = orderData.purchase_order_number || await generateInvoiceNumber(orderData.business_id, 'purchase_order');

    const query = `
      INSERT INTO purchase_orders (
        purchase_order_number, business_id, party_id, party_name, order_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, purchase_order_data, bank_id,
        po_agreement_number, remark,
        level1_email, level2_email, level3_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(orderData.order_data || orderData.purchase_order_data || orderData.line_items || {}),
      sanitizeValue(orderData.bank_id),
      sanitizeValue(orderData.po_agreement_number),
      sanitizeValue(orderData.remark),
      orderData.level1_email || null,
      orderData.level2_email || null,
      orderData.level3_email || null
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT po.*
      FROM purchase_orders po
      WHERE po.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND po.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND po.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND po.order_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND po.order_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY po.created_at DESC';

    const [rows] = await pool.execute(query, values);

    return rows.map(row => ({
      ...row,
      purchase_order_data: typeof row.purchase_order_data === 'string' ? JSON.parse(row.purchase_order_data) : row.purchase_order_data,
      order_data: typeof row.purchase_order_data === 'string' ? JSON.parse(row.purchase_order_data) : row.purchase_order_data // Backward compatibility
    }));
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT po.*
      FROM purchase_orders po
      WHERE po.id = ? AND po.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const record = rows[0];
    record.purchase_order_data = typeof record.purchase_order_data === 'string' ? JSON.parse(record.purchase_order_data) : record.purchase_order_data;
    record.order_data = record.purchase_order_data; // Backward compatibility

    return record;
  },

  // Find purchase order by order number
  findByOrderNumber: async (orderNumber, businessId) => {
    const query = `
      SELECT po.*
      FROM purchase_orders po
      WHERE po.purchase_order_number = ? AND po.business_id = ?
    `;

    const [rows] = await pool.execute(query, [orderNumber, businessId]);

    if (rows.length === 0) return null;

    const record = rows[0];
    record.purchase_order_data = typeof record.purchase_order_data === 'string' ? JSON.parse(record.purchase_order_data) : record.purchase_order_data;
    record.order_data = record.purchase_order_data; // Backward compatibility

    return record;
  },

  update: async (id, businessId, orderData) => {
    try {
      const fields = [];
      const values = [];

      if (orderData.purchase_order_number !== undefined) {
        // Safety check for duplicate number during update
        const exists = await checkDocumentNumberExists(businessId, 'purchase_order', orderData.purchase_order_number);
        
        // We need to make sure it's not the SAME order we are updating
        if (exists) {
          const queryCheck = 'SELECT id FROM purchase_orders WHERE business_id = ? AND purchase_order_number = ?';
          const [rows] = await pool.execute(queryCheck, [businessId, orderData.purchase_order_number]);
          if (rows.length > 0 && rows[0].id !== parseInt(id)) {
            const error = new Error(`Purchase order number ${orderData.purchase_order_number} already exists`);
            error.code = 'DUPLICATE_NUMBER';
            throw error;
          }
        }

        fields.push('purchase_order_number = ?');
        values.push(sanitizeValue(orderData.purchase_order_number));
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
      if (orderData.order_data !== undefined || orderData.purchase_order_data !== undefined) {
        fields.push('purchase_order_data = ?');
        values.push(JSON.stringify(orderData.order_data || orderData.purchase_order_data));
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
      if (orderData.level1_email !== undefined) {
        fields.push('level1_email = ?');
        values.push(sanitizeValue(orderData.level1_email));
      }
      if (orderData.level2_email !== undefined) {
        fields.push('level2_email = ?');
        values.push(sanitizeValue(orderData.level2_email));
      }
      if (orderData.level3_email !== undefined) {
        fields.push('level3_email = ?');
        values.push(sanitizeValue(orderData.level3_email));
      }
      if (orderData.approved_by !== undefined) {
        fields.push('approved_by = ?');
        values.push(sanitizeValue(orderData.approved_by));
      }
      if (orderData.action_by_name !== undefined) {
        fields.push('action_by_name = ?');
        values.push(sanitizeValue(orderData.action_by_name));
      }
      if (orderData.action_by_email !== undefined) {
        fields.push('action_by_email = ?');
        values.push(sanitizeValue(orderData.action_by_email));
      }
      if (orderData.action_at !== undefined) {
        fields.push('action_at = ?');
        values.push(orderData.action_at);
      }

      if (fields.length === 0) return true;

      const query = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
      values.push(id, businessId);

      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in PurchaseOrder.update:', error);
      throw error;
    }
  },

  // Delete purchase order (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM purchase_orders WHERE id = ? AND business_id = ?';
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
      FROM purchase_orders
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  getLastOrderNumber: async (businessId) => {
    const query = `
      SELECT purchase_order_number FROM purchase_orders 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    if (rows.length > 0) {
      return rows[0].purchase_order_number;
    }
    return null;
  },

  syncWithInvoices: async (poId, businessId) => {
    const PurchaseOrder = module.exports; // circular dependency handling
    const SalesInvoice = require('./salesInvoiceModel');

    // 1. Get the PO
    const po = await PurchaseOrder.findById(poId, businessId);
    if (!po) return null;

    const poNumber = po.purchase_order_number;
 

    // 2. Get all active sales invoices for this PO
    const invoices = await SalesInvoice.findByPoNumber(poNumber, businessId);


    // 3. Recalculate booked quantities
    const poData = po.purchase_order_data || po.order_data || { lines: [] };

    // Reset all bookedQty to 0 first
    if (poData.lines && Array.isArray(poData.lines)) {
      poData.lines.forEach(line => {
        line.bookedQty = 0;
      });

      // Sum from invoices
      invoices.forEach(inv => {
        const invLines = (inv.invoice_data && inv.invoice_data.lines) ? inv.invoice_data.lines : [];
        invLines.forEach(invLine => {
          const invItemIdentifier = (invLine.name || invLine.description || '').trim().toLowerCase();

          const poLineIndex = poData.lines.findIndex(pl => {
            const poItemIdentifier = (pl.name || pl.description || '').trim().toLowerCase();
            return poItemIdentifier === invItemIdentifier;
          });

          if (poLineIndex !== -1) {
            const qty = parseFloat(invLine.qty || 0);
            poData.lines[poLineIndex].bookedQty = (parseFloat(poData.lines[poLineIndex].bookedQty) || 0) + qty;
          }
        });
      });

      // 4. Update PO in DB
      await PurchaseOrder.update(poId, businessId, { purchase_order_data: poData });
    

      const updatedPo = await PurchaseOrder.findById(poId, businessId);
      return updatedPo;
    }

    return po;
  },

  getByIdSimple: async (id) => {
    const query = 'SELECT * FROM purchase_orders WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    if (rows.length === 0) return null;
    const row = rows[0];
    row.purchase_order_data = typeof row.purchase_order_data === 'string' ? JSON.parse(row.purchase_order_data) : row.purchase_order_data;
    row.order_data = row.purchase_order_data;
    return row;
  },

  updateSimple: async (id, data) => {
    const fields = [];
    const values = [];
    Object.keys(data).forEach(field => {
      fields.push(`${field} = ?`);
      values.push(sanitizeValue(data[field]));
    });
    if (fields.length === 0) return true;
    const query = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  }
};

module.exports = PurchaseOrder;
