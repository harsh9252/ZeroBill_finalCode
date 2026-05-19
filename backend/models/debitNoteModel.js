const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
  if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const DebitNote = {
  create: async (noteData) => {
    // If user provided a debit note number, check if it already exists
    if (noteData.debit_note_number) {
      const exists = await checkDocumentNumberExists(noteData.business_id, 'debit_note', noteData.debit_note_number);
      if (exists) {
        const error = new Error(`Debit note number ${noteData.debit_note_number} already exists in this business`);
        error.code = 'DUPLICATE_NUMBER';
        throw error;
      }
    }

    const noteNumber = noteData.debit_note_number || await generateInvoiceNumber(noteData.business_id, 'debit_note');

    const query = `
      INSERT INTO debit_notes (
        debit_note_number, business_id, party_id, party_name, note_date, updated_date,
        status, total_amount, discount_amount, tax_amount, grand_total,
        notes, created_by, debit_note_data, bank_id,
        po_agreement_number, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      noteNumber,
      noteData.business_id,
      sanitizeValue(noteData.party_id),
      noteData.party_name,
      noteData.note_date || new Date().toISOString().split('T')[0],
      noteData.updated_date || new Date().toISOString().split('T')[0],
      sanitizeValue(noteData.status, 'open'),
      sanitizeValue(noteData.total_amount, 0),
      sanitizeValue(noteData.discount_amount, 0),
      sanitizeValue(noteData.tax_amount, 0),
      sanitizeValue(noteData.grand_total, 0),
      sanitizeValue(noteData.notes),
      noteData.created_by || 1,
      JSON.stringify(noteData.debit_note_data || noteData.line_items || {}),
      sanitizeValue(noteData.bank_id),
      sanitizeValue(noteData.po_agreement_number),
      sanitizeValue(noteData.remark)
    ];

    const [result] = await pool.execute(query, values);
    return result.insertId;
  },

  findByBusinessId: async (businessId, filters = {}) => {
    let query = `
      SELECT dn.*
      FROM debit_notes dn
      WHERE dn.business_id = ?
    `;
    const values = [businessId];

    if (filters.status) {
      query += ' AND dn.status = ?';
      values.push(filters.status);
    }

    if (filters.party_id) {
      query += ' AND dn.party_id = ?';
      values.push(filters.party_id);
    }

    if (filters.from_date) {
      query += ' AND dn.note_date >= ?';
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND dn.note_date <= ?';
      values.push(filters.to_date);
    }

    query += ' ORDER BY dn.created_at DESC';

    const [rows] = await pool.execute(query, values);

    return rows.map(row => ({
      ...row,
      debit_note_data: typeof row.debit_note_data === 'string' ? JSON.parse(row.debit_note_data) : row.debit_note_data
    }));
  },

  findById: async (id, businessId) => {
    const query = `
      SELECT dn.*
      FROM debit_notes dn
      WHERE dn.id = ? AND dn.business_id = ?
    `;

    const [rows] = await pool.execute(query, [id, businessId]);

    if (rows.length === 0) return null;

    const noteRecord = rows[0];
    noteRecord.debit_note_data = typeof noteRecord.debit_note_data === 'string' ? JSON.parse(noteRecord.debit_note_data) : noteRecord.debit_note_data;

    return noteRecord;
  },

  update: async (id, businessId, noteData) => {
    const fields = [];
    const values = [];

    if (noteData.debit_note_number !== undefined) {
      // Safety check for duplicate number during update
      const exists = await checkDocumentNumberExists(businessId, 'debit_note', noteData.debit_note_number);
      
      // We need to make sure it's not the SAME note we are updating
      if (exists) {
        const queryCheck = 'SELECT id FROM debit_notes WHERE business_id = ? AND debit_note_number = ?';
        const [rows] = await pool.execute(queryCheck, [businessId, noteData.debit_note_number]);
        if (rows.length > 0 && rows[0].id !== parseInt(id)) {
          const error = new Error(`Debit note number ${noteData.debit_note_number} already exists`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      fields.push('debit_note_number = ?');
      values.push(sanitizeValue(noteData.debit_note_number));
    }

    if (noteData.party_id !== undefined) {
      fields.push('party_id = ?');
      values.push(sanitizeValue(noteData.party_id));
    }
    if (noteData.party_name !== undefined) {
      fields.push('party_name = ?');
      values.push(noteData.party_name);
    }
    if (noteData.note_date !== undefined) {
      fields.push('note_date = ?');
      values.push(noteData.note_date);
    }
    if (noteData.updated_date !== undefined) {
      fields.push('updated_date = ?');
      values.push(noteData.updated_date);
    }
    if (noteData.status !== undefined) {
      fields.push('status = ?');
      values.push(noteData.status);
    }
    if (noteData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(sanitizeValue(noteData.total_amount, 0));
    }
    if (noteData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(sanitizeValue(noteData.discount_amount, 0));
    }
    if (noteData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(sanitizeValue(noteData.tax_amount, 0));
    }
    if (noteData.grand_total !== undefined) {
      fields.push('grand_total = ?');
      values.push(sanitizeValue(noteData.grand_total, 0));
    }
    if (noteData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(sanitizeValue(noteData.notes));
    }
    if (noteData.debit_note_data !== undefined) {
      fields.push('debit_note_data = ?');
      values.push(JSON.stringify(noteData.debit_note_data));
    }
    if (noteData.bank_id !== undefined) {
      fields.push('bank_id = ?');
      values.push(sanitizeValue(noteData.bank_id));
    }
    if (noteData.po_agreement_number !== undefined) {
      fields.push('po_agreement_number = ?');
      values.push(sanitizeValue(noteData.po_agreement_number));
    }
    if (noteData.remark !== undefined) {
      fields.push('remark = ?');
      values.push(sanitizeValue(noteData.remark));
    }

    if (fields.length === 0) return true;

    const query = `UPDATE debit_notes SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
    values.push(id, businessId);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete debit note (performing hard delete)
  delete: async (id, businessId) => {
    const query = 'DELETE FROM debit_notes WHERE id = ? AND business_id = ?';
    const [result] = await pool.execute(query, [id, businessId]);
    return result.affectedRows > 0;
  },

  getStats: async (businessId) => {
    const query = `
      SELECT 
        COUNT(*) as total_notes,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM debit_notes
      WHERE business_id = ?
    `;

    const [rows] = await pool.execute(query, [businessId]);
    return rows[0];
  },

  getLastNoteNumber: async (businessId) => {
    const query = `
      SELECT debit_note_number FROM debit_notes 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [businessId]);
    if (rows.length > 0) {
      return rows[0].debit_note_number;
    }
    return null;
  }
};

module.exports = DebitNote;
