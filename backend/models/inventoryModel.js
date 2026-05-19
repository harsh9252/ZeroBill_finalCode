const { pool } = require('../config/database');

// Helper function to convert undefined to null
const sanitizeValue = (value, defaultValue = null) => {
  return value !== undefined && value !== '' ? value : defaultValue;
};

const Inventory = {
  // Create a new inventory item
  create: async (itemData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const query = `
        INSERT INTO inventory (
          business_id, item_code, item_name, category_id, item_type,
          description, unit, alt_unit, conversion_rate, hsn_code,
          gst_rate, purchase_price, sale_price, purchase_price_tax_type, sale_price_tax_type,
          opening_stock, as_of_date, low_stock_qty,
          image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        itemData.business_id,
        sanitizeValue(itemData.item_code),
        itemData.item_name,
        sanitizeValue(itemData.category_id),
        sanitizeValue(itemData.item_type, 'product'),
        sanitizeValue(itemData.description),
        sanitizeValue(itemData.unit, 'PCS'),
        sanitizeValue(itemData.alt_unit),
        sanitizeValue(itemData.conversion_rate, 1),
        sanitizeValue(itemData.hsn_code),
        sanitizeValue(itemData.gst_rate),
        sanitizeValue(itemData.purchase_price, 0.00),
        sanitizeValue(itemData.sale_price, 0.00),
        sanitizeValue(itemData.purchase_price_tax_type, 'with_tax'),
        sanitizeValue(itemData.sale_price_tax_type, 'with_tax'),
        sanitizeValue(itemData.opening_stock, 0),
        sanitizeValue(itemData.as_of_date),
        sanitizeValue(itemData.low_stock_qty),
        sanitizeValue(itemData.image_url)
      ];

      const [result] = await connection.execute(query, values);
      const insertId = result.insertId;

      // Log initial stock history
      const initialStock = parseFloat(sanitizeValue(itemData.opening_stock, 0));
      if (initialStock !== 0 && !isNaN(initialStock)) {
        const historyQuery = `
          INSERT INTO inventory_stock_history (business_id, inventory_id, amount, action_type, notes)
          VALUES (?, ?, ?, ?, ?)
        `;
        const actionType = initialStock > 0 ? 'ADD' : 'SUBTRACT';
        await connection.execute(historyQuery, [itemData.business_id, insertId, initialStock, actionType, 'Initial Opening Stock']);
      }

      await connection.commit();
      return insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get all inventory items for a business
  findByBusinessId: async (businessId, filters = {}) => {
    // Validate businessId
    if (!businessId || businessId === undefined) {
      throw new Error('businessId is required and cannot be undefined');
    }

    let query = `
      SELECT inventory.*, cats.name as category_name 
      FROM inventory 
      LEFT JOIN items_category cats ON inventory.category_id = cats.id
      WHERE inventory.business_id = ?
    `;
    const values = [businessId];

    // Add filters
    if (filters.item_type && filters.item_type !== '') {
      query += ' AND item_type = ?';
      values.push(filters.item_type);
    }

    if (filters.category_id && filters.category_id !== '') {
      query += ' AND inventory.category_id = ?';
      values.push(filters.category_id);
    }

    if (filters.low_stock_only) {
      query += ' AND opening_stock <= low_stock_qty AND low_stock_qty IS NOT NULL';
    }

    // Add search
    if (filters.search && filters.search.trim() !== '') {
      query += ' AND (item_name LIKE ? OR item_code LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, values);
    return rows;
  },

  // Get inventory item by ID
  findById: async (id, businessId) => {
    const query = `
      SELECT inventory.*, cats.name as category_name 
      FROM inventory 
      LEFT JOIN items_category cats ON inventory.category_id = cats.id
      WHERE inventory.id = ? AND inventory.business_id = ?
    `;
    const [rows] = await pool.execute(query, [id, businessId]);
    return rows[0];
  },

  // Get inventory item by code
  findByCode: async (code, businessId) => {
    const query = 'SELECT * FROM inventory WHERE item_code = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [code, businessId]);
    return rows[0];
  },

  // Update inventory item
  update: async (id, businessId, itemData) => {
    const query = `
      UPDATE inventory SET
        item_code = ?,
        item_name = ?,
        category_id = ?,
        item_type = ?,
        description = ?,
        unit = ?,
        alt_unit = ?,
        conversion_rate = ?,
        hsn_code = ?,
        gst_rate = ?,
        purchase_price = ?,
        sale_price = ?,
        purchase_price_tax_type = ?,
        sale_price_tax_type = ?,
        opening_stock = ?,
        as_of_date = ?,
        low_stock_qty = ?,
        image_url = ?,
        updated_at = NOW()
      WHERE id = ? AND business_id = ?
    `;

    const values = [
      sanitizeValue(itemData.item_code),
      itemData.item_name,
      sanitizeValue(itemData.category_id),
      sanitizeValue(itemData.item_type, 'product'),
      sanitizeValue(itemData.description),
      sanitizeValue(itemData.unit, 'PCS'),
      sanitizeValue(itemData.alt_unit),
      sanitizeValue(itemData.conversion_rate, 1),
      sanitizeValue(itemData.hsn_code),
      sanitizeValue(itemData.gst_rate),
      sanitizeValue(itemData.purchase_price, 0.00),
      sanitizeValue(itemData.sale_price, 0.00),
      sanitizeValue(itemData.purchase_price_tax_type, 'with_tax'),
      sanitizeValue(itemData.sale_price_tax_type, 'with_tax'),
      sanitizeValue(itemData.opening_stock, 0),
      sanitizeValue(itemData.as_of_date),
      sanitizeValue(itemData.low_stock_qty),
      sanitizeValue(itemData.image_url),
      id,
      businessId
    ];

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Update stock quantity
  updateStock: async (id, businessId, quantityChange, reason = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const query = `
        UPDATE inventory
        SET opening_stock = opening_stock + ?, updated_at = NOW()
        WHERE id = ? AND business_id = ?
      `;

      const [result] = await connection.execute(query, [quantityChange, id, businessId]);

      if (result.affectedRows > 0) {
        // Log history
        const historyQuery = `
          INSERT INTO inventory_stock_history (business_id, inventory_id, amount, action_type, notes)
          VALUES (?, ?, ?, ?, ?)
        `;
        const actionType = quantityChange >= 0 ? 'ADD' : 'SUBTRACT';
        await connection.execute(historyQuery, [businessId, id, Math.abs(quantityChange), actionType, reason || 'Manual Stock Update']);
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Delete inventory item (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM inventory WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get stock history
  getStockHistory: async (id, businessId) => {
    const query = `
      SELECT * FROM inventory_stock_history 
      WHERE inventory_id = ? AND business_id = ?
      ORDER BY created_at ASC
    `;
    const [rows] = await pool.execute(query, [id, businessId]);
    return rows;
  },

  // Hard delete inventory item
  hardDelete: async (id, businessId) => {
    const query = 'DELETE FROM inventory WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Get inventory statistics
  getStats: async (businessId) => {
    const query = `
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN item_type = 'product' THEN 1 ELSE 0 END) as total_products,
        SUM(CASE WHEN item_type = 'service' THEN 1 ELSE 0 END) as total_services,
        SUM(opening_stock * purchase_price) as total_inventory_value,
        SUM(CASE WHEN opening_stock <= low_stock_qty AND low_stock_qty IS NOT NULL THEN 1 ELSE 0 END) as low_stock_items
      FROM inventory
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  // Get categories for a business
  getCategories: async (businessId) => {
    const query = 'SELECT DISTINCT category FROM inventory WHERE business_id = ? AND category IS NOT NULL ORDER BY category';
    const [rows] = await pool.execute(query, [businessId]);
    return rows.map(row => row.category);
  }
};

module.exports = Inventory;
