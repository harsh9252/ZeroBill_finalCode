const { pool } = require('../config/database');

class SuperAdmin {
  // Create new super admin
  static async create(superAdminData) {
    try {
      const { name, email, password, phone } = superAdminData;

      const query = `
        INSERT INTO super_admin_users (name, email, password, phone, role, status)
        VALUES (?, ?, ?, ?, 'superadmin', 'active')
      `;

      const [result] = await pool.query(query, [
        name,
        email,
        password,
        phone
      ]);

      return {
        id: result.insertId,
        name,
        email,
        phone,
        role: 'superadmin',
        status: 'active'
      };
    } catch (error) {
      throw error;
    }
  }

  // Find super admin by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM super_admin_users WHERE email = ?';
      const [rows] = await pool.query(query, [email]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find super admin by ID
  static async findById(id) {
    try {
      const query = `
        SELECT id, name, email, phone, role, status, two_factor_enabled, 
               last_login, created_at, updated_at 
        FROM super_admin_users 
        WHERE id = ?
      `;
      const [rows] = await pool.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    try {
      return plainPassword === hashedPassword;
    } catch (error) {
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(id, ipAddress, userAgent) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET last_login = NOW(), ip_address = ?, user_agent = ?, login_attempts = 0
        WHERE id = ?
      `;
      await pool.query(query, [ipAddress, userAgent, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Increment login attempts
  static async incrementLoginAttempts(id) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET login_attempts = login_attempts + 1
        WHERE id = ?
      `;
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Lock account
  static async lockAccount(id, lockDurationMinutes = 30) {
    try {
      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60000);
      const query = `
        UPDATE super_admin_users 
        SET is_locked = TRUE, locked_until = ?
        WHERE id = ?
      `;
      await pool.query(query, [lockedUntil, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Unlock account
  static async unlockAccount(id) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET is_locked = FALSE, locked_until = NULL, login_attempts = 0
        WHERE id = ?
      `;
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Check if account is locked
  static async isAccountLocked(id) {
    try {
      const query = `
        SELECT is_locked, locked_until FROM super_admin_users WHERE id = ?
      `;
      const [rows] = await pool.query(query, [id]);
      
      if (!rows[0]) return false;
      
      const { is_locked, locked_until } = rows[0];
      
      if (!is_locked) return false;
      
      // Check if lock has expired
      if (locked_until && new Date() > new Date(locked_until)) {
        await this.unlockAccount(id);
        return false;
      }
      
      return is_locked;
    } catch (error) {
      throw error;
    }
  }

  // Update profile
  static async updateProfile(id, profileData) {
    try {
      const { name, phone } = profileData;
      const query = `
        UPDATE super_admin_users 
        SET name = ?, phone = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await pool.query(query, [name, phone, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Update password
  static async updatePassword(id, newPassword) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET password = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await pool.query(query, [newPassword, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Update status
  static async updateStatus(id, status) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await pool.query(query, [status, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Get all super admins
  static async findAll() {
    try {
      const query = `
        SELECT id, name, email, phone, role, status, last_login, created_at 
        FROM super_admin_users 
        ORDER BY created_at DESC
      `;
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete super admin (soft delete)
  static async delete(id) {
    try {
      const query = `
        UPDATE super_admin_users 
        SET status = 'inactive', updated_at = NOW()
        WHERE id = ?
      `;
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SuperAdmin;
