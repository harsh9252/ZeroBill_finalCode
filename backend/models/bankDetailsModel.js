const { pool } = require('../config/database');

class BankDetails {
  // Create a new bank account (for business or party)
  static async create(bankData) {
    const {
      businessId,
      partyId,
      bankName,
      accountNumber,
      ifsc,
      branch,
      upi,
      accountHolderName,
      qrCode
    } = bankData;

    // Validate: either businessId or partyId must be provided
    if (!businessId && !partyId) {
      throw new Error('Either businessId or partyId must be provided');
    }

    const query = `
      INSERT INTO bank_details (
        business_id, party_id, bank_name, account_number, ifsc, branch, upi, account_holder_name, qr_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      businessId || null,
      partyId || null,
      bankName,
      accountNumber,
      ifsc || null,
      branch || null,
      upi || null,
      accountHolderName || null,
      qrCode || null
    ]);

    return this.findById(result.insertId);
  }

  // Find bank account by ID
  static async findById(id) {
    const query = 'SELECT * FROM bank_details WHERE id = ? AND is_active = TRUE';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find all bank accounts for a business
  static async findByBusinessId(businessId) {
    const query = `
      SELECT * FROM bank_details
      WHERE business_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  }

  // Find all bank accounts for a party
  static async findByPartyId(partyId) {
    const query = `
      SELECT * FROM bank_details
      WHERE party_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [partyId]);
    return rows;
  }

  // Update bank account
  static async update(id, bankData, businessId = null) {
    const {
      bankName,
      accountNumber,
      ifsc,
      branch,
      upi,
      accountHolderName,
      qrCode
    } = bankData;

    let query = `
      UPDATE bank_details SET
        bank_name = ?,
        account_number = ?,
        ifsc = ?,
        branch = ?,
        upi = ?,
        account_holder_name = ?,
        qr_code = ?
      WHERE id = ? AND is_active = TRUE
    `;
    let params = [
      bankName,
      accountNumber,
      ifsc || null,
      branch || null,
      upi || null,
      accountHolderName || null,
      qrCode || null,
      id
    ];

    if (businessId) {
      query = query.replace('WHERE id = ?', 'WHERE id = ? AND business_id = ?');
      params.push(businessId);
    }

 
    await pool.execute(query, params);
    return this.findById(id);
  }

  // Delete bank account (soft delete)
  static async delete(id, businessId = null) {
    let query = 'UPDATE bank_details SET is_active = FALSE WHERE id = ?';
    let params = [id];

    if (businessId) {
      query += ' AND business_id = ?';
      params.push(businessId);
    }

    const [result] = await pool.execute(query, params);
    return result.affectedRows > 0;
  }

  // Check if account number already exists for business or party
  static async checkDuplicateAccount(accountNumber, businessId = null, partyId = null, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM bank_details WHERE account_number = ? AND is_active = TRUE';
    let params = [accountNumber];

    if (businessId) {
      query += ' AND business_id = ?';
      params.push(businessId);
    }

    if (partyId) {
      query += ' AND party_id = ?';
      params.push(partyId);
    }

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].count > 0;
  }
}

module.exports = BankDetails;
