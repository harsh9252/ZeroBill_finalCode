const { pool } = require('../config/database');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || value === null || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const ApprovalWorkflow = {
  // Get all configured approval levels for a business and document type (sorted)
  getWorkflow: async (businessId, documentType) => {
    try {
      const query = `
        SELECT * FROM approval_workflows 
        WHERE business_id = ? AND document_type = ? 
        ORDER BY level_number ASC
      `;
      const [rows] = await pool.query(query, [businessId, documentType]);
      return rows;
    } catch (error) {
      console.error('Error in ApprovalWorkflow.getWorkflow:', error);
      throw error;
    }
  },

  // Save/Update configurations in bulk for a business and document type
  saveWorkflow: async (businessId, documentType, levels) => {
    // levels is an array of objects: [ { level_number: 1, approver_email: 'a@t.com' }, ... ]
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Delete existing configurations for this business and document type
      const deleteQuery = 'DELETE FROM approval_workflows WHERE business_id = ? AND document_type = ?';
      await connection.query(deleteQuery, [businessId, documentType]);

      // 2. Insert new configurations if any levels are provided
      if (levels && levels.length > 0) {
        const insertQuery = `
          INSERT INTO approval_workflows (business_id, document_type, level_number, approver_email) 
          VALUES (?, ?, ?, ?)
        `;
        
        for (const item of levels) {
          if (item.approver_email && item.approver_email.trim()) {
            await connection.query(insertQuery, [
              businessId,
              documentType,
              parseInt(item.level_number),
              item.approver_email.trim().toLowerCase()
            ]);
          }
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error in ApprovalWorkflow.saveWorkflow:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
};

module.exports = ApprovalWorkflow;
