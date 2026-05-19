const { pool } = require('../config/database');

// Helper function to convert undefined, empty string, or NaN to null or default
const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const Address = {
  // Create a new address
  create: async (addressData, connection = null) => {
    const query = `
      INSERT INTO addresses (party_id, attention, line1, line2, city, state, pincode, country, phone, fax, address_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      sanitizeValue(addressData.party_id),
      sanitizeValue(addressData.attention),
      sanitizeValue(addressData.line1),
      sanitizeValue(addressData.line2),
      sanitizeValue(addressData.city),
      sanitizeValue(addressData.state),
      sanitizeValue(addressData.pincode),
      sanitizeValue(addressData.country),
      sanitizeValue(addressData.phone),
      sanitizeValue(addressData.fax),
      sanitizeValue(addressData.address_type)
    ];

    const executor = connection || pool;
    const [result] = await executor.execute(query, values);
    return result.insertId;
  },

  // Find exact match
  findExact: async (addressData, connection = null) => {
    const query = `
      SELECT id FROM addresses 
      WHERE party_id = ? 
      AND (attention = ? OR (attention IS NULL AND ? IS NULL))
      AND (line1 = ? OR (line1 IS NULL AND ? IS NULL)) 
      AND (line2 = ? OR (line2 IS NULL AND ? IS NULL))
      AND (city = ? OR (city IS NULL AND ? IS NULL)) 
      AND (state = ? OR (state IS NULL AND ? IS NULL)) 
      AND (pincode = ? OR (pincode IS NULL AND ? IS NULL)) 
      AND (country = ? OR (country IS NULL AND ? IS NULL)) 
      AND (phone = ? OR (phone IS NULL AND ? IS NULL))
      AND (fax = ? OR (fax IS NULL AND ? IS NULL))
      AND address_type = ?
      LIMIT 1
    `;
    const values = [
      sanitizeValue(addressData.party_id),
      sanitizeValue(addressData.attention), sanitizeValue(addressData.attention),
      sanitizeValue(addressData.line1), sanitizeValue(addressData.line1),
      sanitizeValue(addressData.line2), sanitizeValue(addressData.line2),
      sanitizeValue(addressData.city), sanitizeValue(addressData.city),
      sanitizeValue(addressData.state), sanitizeValue(addressData.state),
      sanitizeValue(addressData.pincode), sanitizeValue(addressData.pincode),
      sanitizeValue(addressData.country), sanitizeValue(addressData.country),
      sanitizeValue(addressData.phone), sanitizeValue(addressData.phone),
      sanitizeValue(addressData.fax), sanitizeValue(addressData.fax),
      sanitizeValue(addressData.address_type)
    ];
    const executor = connection || pool;
    const [rows] = await executor.execute(query, values);
    return rows[0] ? rows[0].id : null;
  },

  // Get address by ID
  findById: async (id) => {
    const query = 'SELECT * FROM addresses WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  },

  // Update address
  update: async (id, addressData, connection = null) => {
    const fields = [];
    const values = [];

    if (addressData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(addressData.party_id));
    }
    if (addressData.attention !== undefined) {
      fields.push('attention = ?');
      values.push(sanitizeValue(addressData.attention));
    }
    if (addressData.line1 !== undefined) {
      fields.push('line1 = ?');
      values.push(sanitizeValue(addressData.line1));
    }
    if (addressData.line2 !== undefined) {
      fields.push('line2 = ?');
      values.push(sanitizeValue(addressData.line2));
    }
    if (addressData.city !== undefined) {
      fields.push('city = ?');
      values.push(sanitizeValue(addressData.city));
    }
    if (addressData.state !== undefined) {
      fields.push('state = ?');
      values.push(sanitizeValue(addressData.state));
    }
    if (addressData.pincode !== undefined) {
      fields.push('pincode = ?');
      values.push(sanitizeValue(addressData.pincode));
    }
    if (addressData.country !== undefined) {
      fields.push('country = ?');
      values.push(sanitizeValue(addressData.country));
    }
    if (addressData.phone !== undefined) {
      fields.push('phone = ?');
      values.push(sanitizeValue(addressData.phone));
    }
    if (addressData.fax !== undefined) {
      fields.push('fax = ?');
      values.push(sanitizeValue(addressData.fax));
    }
    if (addressData.address_type !== undefined) {
      fields.push('address_type = ?');
      values.push(sanitizeValue(addressData.address_type));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE addresses SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    const executor = connection || pool;
    const [result] = await executor.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete address
  delete: async (id) => {
    const query = 'DELETE FROM addresses WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  },

  // Get addresses by party ID
  findByPartyId: async (partyId) => {
    const query = 'SELECT * FROM addresses WHERE party_id = ? ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, [partyId]);
    return rows;
  }
};

module.exports = Address;