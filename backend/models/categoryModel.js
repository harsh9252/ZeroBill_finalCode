const { pool } = require('../config/database');

const Category = {
  // Create a new category
  create: async (categoryData) => {
    const query = `
      INSERT INTO items_category (business_id, name)
      VALUES (?, ?)
    `;
    const values = [categoryData.business_id, categoryData.name];
    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  // Get all categories for a business
  findByBusinessId: async (businessId) => {
    const query = 'SELECT * FROM items_category WHERE business_id = ? ORDER BY name ASC';
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  },

  // Get category by ID
  findById: async (id, businessId) => {
    const query = 'SELECT * FROM items_category WHERE id = ? AND business_id = ?';
    const [rows] = await pool.execute(query, [id, businessId]);
    return rows[0];
  },

  // Update category
  update: async (id, businessId, name) => {
    const query = 'UPDATE items_category SET name = ? WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [name, id, businessId]);
    return result.affectedRows > 0;
  },

  // Delete category
  delete: async (id, businessId) => {
    const query = 'DELETE FROM items_category WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  // Find category by name for a business
  findByName: async (businessId, name) => {
    const query = 'SELECT * FROM items_category WHERE business_id = ? AND name = ?';
    const [rows] = await pool.execute(query, [businessId, name]);
    return rows[0];
  }
};

module.exports = Category;
