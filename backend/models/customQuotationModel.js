const { pool } = require('../config/database');

const formatDateForSql = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

const CustomQuotation = {
  // Create a new custom quotation
  create: async (data) => {
    try {
      const query = `
        INSERT INTO custom_quotations (
          business_id, 
          quotation_number,
          header_text, 
          quotation_date, 
          company_name, 
          company_address, 
          company_phone, 
          company_email, 
          logo,
          business_name,
          remark,
          total_amount, 
          is_metadata_locked,
          sections, 
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.business_id,
        data.quotation_number || null,
        data.header_text || null,
        formatDateForSql(data.quotation_date),
        data.company_name || null,
        data.company_address || null,
        data.company_phone || null,
        data.company_email || null,
        data.logo || null,
        data.business_name || null,
        data.remark || null,
        data.total_amount || 0,
        data.is_metadata_locked ? 1 : 0,
        JSON.stringify(data.sections || []), // Store array as JSON string
        data.status || 'Draft'
      ];

      const [result] = await pool.execute(query, values);
      return result.insertId;
    } catch (error) {
      console.error('Database Error in CustomQuotation.create:', error);
      throw error;
    }
  },

  // Update an existing custom quotation
  update: async (id, data) => {
    try {
      const updateFields = [];
      const updateValues = [];

      const fieldsMap = {
        quotation_number: data.quotation_number,
        header_text: data.header_text,
        quotation_date: data.quotation_date !== undefined ? formatDateForSql(data.quotation_date) : undefined,
        company_name: data.company_name,
        company_address: data.company_address,
        company_phone: data.company_phone,
        company_email: data.company_email,
        logo: data.logo,
        business_name: data.business_name,
        remark: data.remark,
        total_amount: data.total_amount,
        is_metadata_locked: data.is_metadata_locked !== undefined ? (data.is_metadata_locked ? 1 : 0) : undefined,
        status: data.status
      };

      for (const [key, value] of Object.entries(fieldsMap)) {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      // Handle sections specifically (stringify if provided)
      if (data.sections !== undefined) {
        updateFields.push('sections = ?');
        updateValues.push(JSON.stringify(data.sections));
      }

      if (updateFields.length === 0) return true;

      const query = `UPDATE custom_quotations SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);

      const [result] = await pool.execute(query, updateValues);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Database Error in CustomQuotation.update:', error);
      throw error;
    }
  },

  // Find by ID
  findById: async (id) => {
    const query = 'SELECT * FROM custom_quotations WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    // Parse sections back to array
    if (row.sections) {
      try {
        row.sections = JSON.parse(row.sections);
      } catch (e) {
        row.sections = [];
      }
    }
    
    return row;
  },

  // Find by Business ID
  findByBusinessId: async (businessId) => {
    const query = 'SELECT * FROM custom_quotations WHERE business_id = ? ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, [businessId]);
    
    return rows.map(row => {
      if (row.sections) {
        try {
          row.sections = JSON.parse(row.sections);
        } catch (e) {
          row.sections = [];
        }
      }
      return row;
    });
  },

  // Delete
  delete: async (id) => {
    const query = 'DELETE FROM custom_quotations WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  },

  // Get last quotation number for a business
  getLastQuotationNumber: async (businessId) => {
    const query = 'SELECT quotation_number FROM custom_quotations WHERE business_id = ? ORDER BY created_at DESC LIMIT 1';
    const [rows] = await pool.execute(query, [businessId]);
    return rows.length > 0 ? rows[0].quotation_number : null;
  },

  // Find by Quotation Number for a business
  findByQuotationNumber: async (businessId, quotationNumber) => {
    const query = 'SELECT * FROM custom_quotations WHERE business_id = ? AND quotation_number = ? LIMIT 1';
    const [rows] = await pool.execute(query, [businessId, quotationNumber]);
    return rows.length > 0 ? rows[0] : null;
  }
};

module.exports = CustomQuotation;
