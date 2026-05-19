const { pool } = require('../config/database');
const bcrypt = require('bcrypt');


class User {
  // Create new user
  static async create(userData) {
    try {
      const { firstName, lastName, email, phone, password } = userData;

      const query = `
        INSERT INTO users (first_name, last_name, email, phone, password)
        VALUES (?, ?, ?, ?, ?)
      `;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const [result] = await pool.query(query, [
        firstName,
        lastName,
        email,
        phone,
        hashedPassword
      ]);


      return {
        id: result.insertId,
        firstName,
        lastName,
        email,
        phone
      };
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = ?';
      const [rows] = await pool.query(query, [email]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by phone
  static async findByPhone(phone) {
    try {
      const query = 'SELECT * FROM users WHERE phone = ?';
      const [rows] = await pool.query(query, [phone]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email or phone
  static async findByEmailOrPhone(identifier) {
    try {
      const query = 'SELECT * FROM users WHERE email = ? OR phone = ?';
      const [rows] = await pool.query(query, [identifier, identifier]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = 'SELECT id, first_name, last_name, email, phone, is_active, created_at FROM users WHERE id = ?';
      const [rows] = await pool.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  static async comparePassword(plainPassword, storedPassword) {
    return await bcrypt.compare(plainPassword, storedPassword);
  }

  // Update user
  static async update(id, userData) {
    try {
      const { firstName, lastName, phone } = userData;
      const query = `
        UPDATE users 
        SET first_name = ?, last_name = ?, phone = ?
        WHERE id = ?
      `;

      await pool.query(query, [firstName, lastName, phone, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Update password
  static async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      const query = 'UPDATE users SET password = ? WHERE id = ?';
      await pool.query(query, [hashedPassword, id]);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete user (soft delete)
  static async delete(id) {
    try {
      const query = 'UPDATE users SET is_active = false WHERE id = ?';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get all users
  static async findAll() {
    try {
      const query = 'SELECT id, first_name, last_name, email, phone, is_active, created_at FROM users WHERE is_active = true';
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
