const { pool } = require('../config/database');
const crypto = require('crypto');


class OTP {
  // Generate random 6-digit OTP
  static generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }


  // Create new OTP
  static async create(email, purpose = 'login') {
    try {
      const otp = this.generateOTP();
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Delete any existing unused OTPs for this email and purpose
      await this.deleteUnused(email, purpose);

      const query = `
        INSERT INTO otps (email, otp, purpose, expires_at)
        VALUES (?, ?, ?, ?)
      `;

      await pool.query(query, [email, otp, purpose, expiresAt]);

      return otp;
    } catch (error) {
      throw error;
    }
  }

  // Verify OTP
  static async verify(email, otp, purpose = 'login') {
    try {
      const query = `
        SELECT * FROM otps 
        WHERE email = ? 
        AND otp = ? 
        AND purpose = ? 
        AND is_used = false 
        AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const [rows] = await pool.query(query, [email, otp, purpose]);

      if (rows.length === 0) {
        return { valid: false, message: 'Invalid or expired OTP' };
      }

      // Mark OTP as used
      await this.markAsUsed(rows[0].id);

      return { valid: true, message: 'OTP verified successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Mark OTP as used
  static async markAsUsed(id) {
    try {
      const query = 'UPDATE otps SET is_used = true WHERE id = ?';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete unused OTPs for email and purpose
  static async deleteUnused(email, purpose) {
    try {
      const query = 'DELETE FROM otps WHERE email = ? AND purpose = ? AND is_used = false';
      await pool.query(query, [email, purpose]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get timestamp of the most recent OTP for an email and purpose
  static async getLastOTPTimestamp(email, purpose = 'login') {
    try {
      const query = `
        SELECT created_at FROM otps 
        WHERE email = ? AND purpose = ?
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [email, purpose]);
      return rows.length > 0 ? rows[0].created_at : null;
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired OTPs (can be run periodically)
  static async cleanupExpired() {
    try {
      const query = 'DELETE FROM otps WHERE expires_at < NOW()';
      const [result] = await pool.query(query);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OTP;
