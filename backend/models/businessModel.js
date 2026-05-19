const { pool } = require('../config/database');

class Business {
  // Create a new business
  static async create(businessData) {
    const {
      userId,
      businessName,
      comment,
      businessType,
      industryType,
      businessRegistrationType,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      gstin,
      vatNumber,
      pan,
      website,
      logoUrl,
      signatureUrl,
      stampUrl,
      is_email_verified,
      tax_type
    } = businessData;

    const query = `
      INSERT INTO businesses (
        user_id, business_name, comment, business_type, industry_type,
        business_registration_type, email, phone,
        address, city, state, country, postal_code,
        gstin, vat_number, pan, website, logo_url, signature_url, stamp_url, is_email_verified, tax_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      userId,
      businessName,
      comment || null,
      businessType || null,
      industryType || null,
      businessRegistrationType || null,
      email || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      country || 'India',
      postalCode || null,
      gstin || null,
      vatNumber || null,
      pan || null,
      website || null,
      logoUrl || null,
      signatureUrl || null,
      stampUrl || null,
      is_email_verified == 1 || is_email_verified === true ? 1 : 0,
      tax_type || 'No'
    ]);

    return this.findById(result.insertId);
  }

  // Find active business by ID (Strict)
  static async findById(id) {
    const query = 'SELECT * FROM businesses WHERE id = ? AND is_active = TRUE';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find any business by ID (including inactive/deleted) - for internal use only
  static async findAnyById(id) {
    const query = 'SELECT * FROM businesses WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find multiple businesses by IDs
  static async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const query = `SELECT * FROM businesses WHERE id IN (${ids.map(() => '?').join(',')}) AND is_active = TRUE`;
    const [rows] = await pool.execute(query, ids);
    return rows;
  }

  // Find active business by ID
  static async findActiveById(id) {
    const query = 'SELECT * FROM businesses WHERE id = ? AND is_active = TRUE';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  // Find all businesses for a user
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM businesses 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  // Find all businesses for a user (including inactive)
  static async findAllByUserId(userId) {
    const query = `
      SELECT * FROM businesses 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  // Find business by GSTIN
  static async findByGSTIN(gstin) {
    const query = 'SELECT * FROM businesses WHERE gstin = ?';
    const [rows] = await pool.execute(query, [gstin]);
    return rows[0];
  }

  // Update business details
  static async update(id, userId, businessData) {
    // Build dynamic query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    // Define field mappings - support both camelCase and snake_case
    const fieldMappings = {
      businessName: 'business_name',
      business_name: 'business_name',
      comment: 'comment',
      businessType: 'business_type',
      business_type: 'business_type',
      industryType: 'industry_type',
      industry_type: 'industry_type',
      businessRegistrationType: 'business_registration_type',
      business_registration_type: 'business_registration_type',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
      postalCode: 'postal_code',
      postal_code: 'postal_code',
      gstin: 'gstin',
      pan: 'pan',
      vatNumber: 'vat_number',
      vat_number: 'vat_number',
      website: 'website',
      logoUrl: 'logo_url',
      logo_url: 'logo_url',
      signatureUrl: 'signature_url',
      signature_url: 'signature_url',
      stampUrl: 'stamp_url',
      stamp_url: 'stamp_url',
      msmeNumber: 'msme_number',
      msme_number: 'msme_number',
      cinNumber: 'cin_number',
      cin_number: 'cin_number',
      tanNumber: 'tan_number',
      tan_number: 'tan_number',
      udyamNumber: 'udyam_number',
      udyam_number: 'udyam_number',
      importExportCode: 'import_export_code',
      import_export_code: 'import_export_code',
      fssaiNumber: 'fssai_number',
      fssai_number: 'fssai_number',
      drugLicenseNumber: 'drug_license_number',
      drug_license_number: 'drug_license_number',
      is_email_verified: 'is_email_verified',
      taxType: 'tax_type',
      tax_type: 'tax_type',
      default_format: 'default_format'
    };

    // Only update fields that are provided (not undefined)
    Object.keys(fieldMappings).forEach(key => {
      // CRITICAL: Ensure we don't accidentally update business_name to null or empty
      if (businessData[key] !== undefined) {
        if ((key === 'businessName' || key === 'business_name') && !businessData[key]) {
          console.warn(`[BusinessModel] Attempted to update business_name to empty value for business ID: ${id}. Skipping.`);
          return;
        }
        updateFields.push(`${fieldMappings[key]} = ?`);
        updateValues.push(businessData[key]);
      }
    });

    // If no fields to update, return current business
    if (updateFields.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE businesses SET
        ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    updateValues.push(id, userId);

    try {
      await pool.execute(query, updateValues);
      return this.findById(id);
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  // Delete business (soft delete by setting is_active to false)
  static async delete(id, userId) {
    const query = 'UPDATE businesses SET is_active = FALSE WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  }

  // Hard delete business
  static async hardDelete(id, userId) {
    const query = 'DELETE FROM businesses WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  }

  // Toggle business active status
  static async toggleActive(id, userId) {
    const query = `
      UPDATE businesses 
      SET is_active = NOT is_active 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  }

  // Get business count for user
  static async getCountByUserId(userId) {
    const query = 'SELECT COUNT(*) as count FROM businesses WHERE user_id = ? AND is_active = TRUE';
    const [rows] = await pool.execute(query, [userId]);
    return rows[0].count;
  }
}

module.exports = Business;
