const { pool } = require('../config/database');

class SubUser {
  // Create new sub-user
  static async create(subUserData) {
    try {
      const { parentUserId, name, email, password, businessIds } = subUserData;

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Insert sub-user
        const subUserQuery = `
          INSERT INTO sub_users (parent_user_id, name, email, password, is_active, permissions)
          VALUES (?, ?, ?, ?, true, ?)
        `;

        const [subUserResult] = await connection.query(subUserQuery, [
          parentUserId,
          name,
          email,
          password,
          subUserData.permissions ? JSON.stringify(subUserData.permissions) : null
        ]);

        const subUserId = subUserResult.insertId;

        // Insert business access permissions
        if (businessIds && businessIds.length > 0) {
          const businessAccessQuery = `
            INSERT INTO sub_user_business_access (sub_user_id, business_id)
            VALUES ?
          `;
          
          const businessAccessValues = businessIds.map(businessId => [subUserId, businessId]);
          await connection.query(businessAccessQuery, [businessAccessValues]);
        }

        await connection.commit();
        connection.release();

        return await this.findById(subUserId);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Find sub-user by ID with business access
  static async findById(id) {
    try {
      const query = `
        SELECT 
          su.*,
          u.email as parent_email,
          GROUP_CONCAT(b.id) as business_ids,
          GROUP_CONCAT(b.business_name) as business_names
        FROM sub_users su
        LEFT JOIN users u ON su.parent_user_id = u.id
        LEFT JOIN sub_user_business_access suba ON su.id = suba.sub_user_id
        LEFT JOIN businesses b ON suba.business_id = b.id AND b.is_active = TRUE
        WHERE su.id = ?
        GROUP BY su.id
      `;
      
      const [rows] = await pool.query(query, [id]);
      
      if (rows[0]) {
        const subUser = rows[0];
        subUser.businessIds = subUser.business_ids ? subUser.business_ids.split(',').map(id => parseInt(id)) : [];
        subUser.businessNames = subUser.business_names ? subUser.business_names.split(',') : [];
        delete subUser.business_ids;
        delete subUser.business_names;
        return subUser;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Find sub-user by email
  static async findByEmail(email) {
    try {
      const query = `
        SELECT su.*, u.email as parent_email 
        FROM sub_users su 
        LEFT JOIN users u ON su.parent_user_id = u.id
        WHERE su.email = ?
      `;
      const [rows] = await pool.query(query, [email]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find all sub-users for a parent user
  static async findByParentUserId(parentUserId) {
    try {
      const query = `
        SELECT 
          su.*,
          GROUP_CONCAT(b.id) as business_ids,
          GROUP_CONCAT(b.business_name) as business_names
        FROM sub_users su
        LEFT JOIN sub_user_business_access suba ON su.id = suba.sub_user_id
        LEFT JOIN businesses b ON suba.business_id = b.id AND b.is_active = TRUE
        WHERE su.parent_user_id = ?
        GROUP BY su.id
        ORDER BY su.created_at DESC
      `;
      
      const [rows] = await pool.query(query, [parentUserId]);
      
      return rows.map(subUser => {
        subUser.businessIds = subUser.business_ids ? subUser.business_ids.split(',').map(id => parseInt(id)) : [];
        subUser.businessNames = subUser.business_names ? subUser.business_names.split(',') : [];
        delete subUser.business_ids;
        delete subUser.business_names;
        return subUser;
      });
    } catch (error) {
      throw error;
    }
  }

  // Update sub-user
  static async update(id, subUserData) {
    try {
      const { name, email, businessIds } = subUserData;

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update sub-user basic info
        const updateQuery = `
          UPDATE sub_users 
          SET name = ?, email = ?, permissions = ?
          WHERE id = ?
        `;

        await connection.query(updateQuery, [
          name, 
          email, 
          subUserData.permissions ? JSON.stringify(subUserData.permissions) : null,
          id
        ]);

        // Update business access
        if (businessIds !== undefined) {
          // Delete existing business access
          await connection.query('DELETE FROM sub_user_business_access WHERE sub_user_id = ?', [id]);

          // Insert new business access
          if (businessIds && businessIds.length > 0) {
            const businessAccessQuery = `
              INSERT INTO sub_user_business_access (sub_user_id, business_id)
              VALUES ?
            `;
            
            const businessAccessValues = businessIds.map(businessId => [id, businessId]);
            await connection.query(businessAccessQuery, [businessAccessValues]);
          }
        }

        await connection.commit();
        connection.release();

        return await this.findById(id);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Update password
  static async updatePassword(id, newPassword) {
    try {
      const query = 'UPDATE sub_users SET password = ? WHERE id = ?';
      await pool.query(query, [newPassword, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete sub-user (soft delete)
  static async delete(id) {
    try {
      const query = 'UPDATE sub_users SET is_active = false WHERE id = ?';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  static async comparePassword(plainPassword, storedPassword) {
    return plainPassword === storedPassword;
  }

  // Update last login timestamp
  static async updateLastLogin(id) {
    try {
      const query = 'UPDATE sub_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Toggle active status
  static async toggleStatus(id, isActive) {
    try {
      const query = 'UPDATE sub_users SET is_active = ? WHERE id = ?';
      await pool.query(query, [isActive, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get accessible businesses for sub-user
  static async getAccessibleBusinesses(subUserId) {
    try {
      const query = `
        SELECT b.*
        FROM businesses b
        INNER JOIN sub_user_business_access suba ON b.id = suba.business_id
        WHERE suba.sub_user_id = ? AND b.is_active = true
      `;
      
      const [rows] = await pool.query(query, [subUserId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if sub-user has access to specific business
  static async hasBusinessAccess(subUserId, businessId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM sub_user_business_access suba
        INNER JOIN businesses b ON suba.business_id = b.id
        WHERE suba.sub_user_id = ? AND suba.business_id = ? AND b.is_active = true
      `;
      
      const [rows] = await pool.query(query, [subUserId, businessId]);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SubUser;