const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

const sanitizeValue = (value, defaultValue = null) => {
    if (value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
        return defaultValue;
    }
    return value;
};

const BookInvoice = {
    create: async (invoiceData) => {
        // If user provided a book invoice number, check if it already exists
        if (invoiceData.book_invoice_number) {
            const exists = await checkDocumentNumberExists(invoiceData.business_id, 'book_invoice', invoiceData.book_invoice_number);
            if (exists) {
                const error = new Error(`Book invoice number ${invoiceData.book_invoice_number} already exists in this business`);
                error.code = 'DUPLICATE_NUMBER';
                throw error;
            }
        }

        const invoiceNumber = invoiceData.book_invoice_number || await generateInvoiceNumber(invoiceData.business_id, 'book_invoice');

        const query = `
      INSERT INTO book_invoices (
        book_invoice_number, business_id, party_id, party_name, invoice_date, updated_date,
        due_date, status, total_amount, discount_amount, tax_amount, grand_total,
        notes, po_reference, created_by, book_invoice_data, bank_id, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            invoiceNumber,
            invoiceData.business_id,
            sanitizeValue(invoiceData.party_id),
            invoiceData.party_name,
            invoiceData.invoice_date || (() => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })(),
            invoiceData.updated_date || (() => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })(),
            sanitizeValue(invoiceData.due_date),
            sanitizeValue(invoiceData.status, 'open'),
            sanitizeValue(invoiceData.total_amount, 0),
            sanitizeValue(invoiceData.discount_amount, 0),
            sanitizeValue(invoiceData.tax_amount, 0),
            sanitizeValue(invoiceData.grand_total, 0),
            sanitizeValue(invoiceData.notes),
            sanitizeValue(invoiceData.po_reference),
            invoiceData.created_by || null,
            JSON.stringify(invoiceData.book_invoice_data || invoiceData.invoice_data || invoiceData.line_items || {}),
            sanitizeValue(invoiceData.bank_id),
            sanitizeValue(invoiceData.remark)
        ];

        const [result] = await pool.execute(query, values);
        return result.insertId;
    },

    findByBusinessId: async (businessId, filters = {}) => {
        let query = `
      SELECT bi.*
      FROM book_invoices bi
      WHERE bi.business_id = ?
    `;
        const values = [businessId];

        if (filters.status) {
            query += ' AND bi.status = ?';
            values.push(filters.status);
        }

        if (filters.party_id) {
            query += ' AND bi.party_id = ?';
            values.push(filters.party_id);
        }

        if (filters.po_reference) {
            query += ' AND bi.po_reference = ?';
            values.push(filters.po_reference);
        }

        if (filters.from_date) {
            query += ' AND bi.invoice_date >= ?';
            values.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND bi.invoice_date <= ?';
            values.push(filters.to_date);
        }

        query += ' ORDER BY bi.created_at DESC';

        const [rows] = await pool.execute(query, values);

        return rows.map(row => ({
            ...row,
            book_invoice_data: typeof row.book_invoice_data === 'string' ? JSON.parse(row.book_invoice_data) : row.book_invoice_data
        }));
    },

    findById: async (id, businessId) => {
        const query = `
      SELECT bi.*
      FROM book_invoices bi
      WHERE bi.id = ? AND bi.business_id = ?
    `;

        const [rows] = await pool.execute(query, [id, businessId]);

        if (rows.length === 0) return null;

        const record = rows[0];
        record.book_invoice_data = typeof record.book_invoice_data === 'string' ? JSON.parse(record.book_invoice_data) : record.book_invoice_data;

        return record;
    },

    findByPoReference: async (poReference, businessId) => {
        const [rows] = await pool.execute(
            `SELECT * FROM book_invoices WHERE po_reference = ? AND business_id = ? ORDER BY created_at DESC`,
            [poReference, businessId]
        );
        return rows.map(row => ({
            ...row,
            book_invoice_data: typeof row.book_invoice_data === 'string' ? JSON.parse(row.book_invoice_data) : row.book_invoice_data
        }));
    },

    update: async (id, businessId, invoiceData) => {
        const fields = [];
        const values = [];

        if (invoiceData.book_invoice_number !== undefined) {
            // Safety check for duplicate number during update
            const exists = await checkDocumentNumberExists(businessId, 'book_invoice', invoiceData.book_invoice_number);
            
            // We need to make sure it's not the SAME invoice we are updating
            if (exists) {
                const queryCheck = 'SELECT id FROM book_invoices WHERE business_id = ? AND book_invoice_number = ?';
                const [rows] = await pool.execute(queryCheck, [businessId, invoiceData.book_invoice_number]);
                if (rows.length > 0 && rows[0].id !== parseInt(id)) {
                    const error = new Error(`Book invoice number ${invoiceData.book_invoice_number} already exists`);
                    error.code = 'DUPLICATE_NUMBER';
                    throw error;
                }
            }

            fields.push('book_invoice_number = ?');
            values.push(sanitizeValue(invoiceData.book_invoice_number));
        }

        if (invoiceData.party_id !== undefined) {
            fields.push('party_id = ?');
            values.push(sanitizeValue(invoiceData.party_id));
        }
        if (invoiceData.party_name !== undefined) {
            fields.push('party_name = ?');
            values.push(invoiceData.party_name);
        }
        if (invoiceData.invoice_date !== undefined) {
            fields.push('invoice_date = ?');
            values.push(invoiceData.invoice_date);
        }
        if (invoiceData.updated_date !== undefined) {
            fields.push('updated_date = ?');
            values.push(invoiceData.updated_date);
        }
        if (invoiceData.due_date !== undefined) {
            fields.push('due_date = ?');
            values.push(invoiceData.due_date);
        }
        if (invoiceData.status !== undefined) {
            fields.push('status = ?');
            values.push(invoiceData.status);
        }
        if (invoiceData.total_amount !== undefined) {
            fields.push('total_amount = ?');
            values.push(sanitizeValue(invoiceData.total_amount, 0));
        }
        if (invoiceData.discount_amount !== undefined) {
            fields.push('discount_amount = ?');
            values.push(sanitizeValue(invoiceData.discount_amount, 0));
        }
        if (invoiceData.tax_amount !== undefined) {
            fields.push('tax_amount = ?');
            values.push(sanitizeValue(invoiceData.tax_amount, 0));
        }
        if (invoiceData.grand_total !== undefined) {
            fields.push('grand_total = ?');
            values.push(sanitizeValue(invoiceData.grand_total, 0));
        }
        if (invoiceData.notes !== undefined) {
            fields.push('notes = ?');
            values.push(sanitizeValue(invoiceData.notes));
        }
        if (invoiceData.po_reference !== undefined) {
            fields.push('po_reference = ?');
            values.push(sanitizeValue(invoiceData.po_reference));
        }
        if (invoiceData.book_invoice_data !== undefined) {
            fields.push('book_invoice_data = ?');
            values.push(JSON.stringify(invoiceData.book_invoice_data));
        }
        if (invoiceData.bank_id !== undefined) {
            fields.push('bank_id = ?');
            values.push(sanitizeValue(invoiceData.bank_id));
        }
        if (invoiceData.remark !== undefined) {
            fields.push('remark = ?');
            values.push(sanitizeValue(invoiceData.remark));
        }

        if (fields.length === 0) return true;

        const query = `UPDATE book_invoices SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`;
        values.push(id, businessId);

        const [result] = await pool.execute(query, values);
        return result.affectedRows > 0;
    },

    delete: async (id, businessId) => {
        const query = 'DELETE FROM book_invoices WHERE id = ? AND business_id = ?';
        const [result] = await pool.execute(query, [id, businessId]);
        return result.affectedRows > 0;
    },

    getStats: async (businessId) => {
        const query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(grand_total) as total_amount
      FROM book_invoices
      WHERE business_id = ?
    `;

        const [rows] = await pool.execute(query, [businessId]);
        return rows[0];
    },

    getLastInvoiceNumber: async (businessId) => {
        const query = `
      SELECT book_invoice_number FROM book_invoices 
      WHERE business_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
        const [rows] = await pool.execute(query, [businessId]);
        if (rows.length > 0) {
            return rows[0].book_invoice_number;
        }
        return null;
    }
};

module.exports = BookInvoice;
