const { pool: db } = require('../config/database');

const AccountApproval = {
  // Create new signup approval request
  create: async (data) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      planId,
      planName,
      planType,
      planPrice
    } = data;

    const query = `
      INSERT INTO account_approvals (
        first_name, last_name, email, phone, password_hash,
        plan_id, plan_name, plan_type, plan_price, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    try {
      const [result] = await db.query(query, [
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        planId || null,
        planName || null,
        planType || 'trial',
        planPrice || 0
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Get all pending approvals
  getPending: async () => {
    const query = `
      SELECT * FROM account_approvals 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `;

    try {
      const [results] = await db.query(query);
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Get approval by ID
  getById: async (id) => {
    const query = `SELECT * FROM account_approvals WHERE id = ?`;

    try {
      const [results] = await db.query(query, [id]);
      return results[0];
    } catch (error) {
      throw error;
    }
  },

  // Get approval by email
  getByEmail: async (email) => {
    const query = `SELECT * FROM account_approvals WHERE email = ?`;

    try {
      const [results] = await db.query(query, [email]);
      return results[0];
    } catch (error) {
      throw error;
    }
  },

  // Get approval by user ID
  getByUserId: async (userId) => {
    const query = `SELECT * FROM account_approvals WHERE user_id = ? ORDER BY created_at DESC`;

    try {
      const [results] = await db.query(query, [userId]);
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Approve signup request
  approve: async (id, superAdminId) => {
    const query = `
      UPDATE account_approvals 
      SET status = 'approved', approved_by = ?, approved_at = NOW()
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [superAdminId, id]);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Reject signup request
  reject: async (id, superAdminId, rejectionReason) => {
    const query = `
      UPDATE account_approvals 
      SET status = 'rejected', approved_by = ?, rejection_reason = ?, approved_at = NOW()
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [superAdminId, rejectionReason, id]);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Get all approvals with filters
  getAll: async (filters = {}) => {
    let query = 'SELECT * FROM account_approvals WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.email) {
      query += ' AND email LIKE ?';
      params.push(`%${filters.email}%`);
    }

    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const [results] = await db.query(query, params);
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Update user_id after account creation
  updateUserId: async (id, userId) => {
    const query = `
      UPDATE account_approvals 
      SET user_id = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [userId, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = AccountApproval;
