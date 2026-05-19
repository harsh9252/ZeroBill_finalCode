const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

class PaymentOutModel {
  // Get all payment outs for a business
  static async getAll(businessId) {
    try {
      const query = `
        SELECT 
          po.id,
          po.payment_number,
          po.party_id,
          p.party_name,
          po.amount_received,
          po.payment_discount,
          DATE_FORMAT(po.payment_date, '%Y-%m-%d') as payment_date,
          po.payment_mode,
          po.notes,
          po.status,
          po.is_invoice_linked,
          po.linked_invoices,
          po.created_at,
          po.updated_at
        FROM payment_out po
        JOIN parties p ON po.party_id = p.id
        WHERE po.business_id = ?
        ORDER BY po.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment out by ID
  static async getById(id, businessId) {
    try {
      const query = `
        SELECT 
          po.id,
          po.payment_number,
          po.party_id,
          p.party_name,
          po.amount_received,
          po.payment_discount,
          DATE_FORMAT(po.payment_date, '%Y-%m-%d') as payment_date,
          po.payment_mode,
          po.payment_received_in,
          po.notes,
          po.status,
          po.is_invoice_linked,
          po.linked_invoices,
          po.created_at,
          po.updated_at
        FROM payment_out po
        JOIN parties p ON po.party_id = p.id
        WHERE po.id = ? AND po.business_id = ?
      `;
      
      const [results] = await pool.query(query, [id, businessId]);
      return results[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new payment out
  static async create(businessId, data) {
    try {
      // If user provided a payment number, check if it already exists
      if (data.payment_number) {
        const exists = await checkDocumentNumberExists(businessId, 'payment_out', data.payment_number);
        if (exists) {
          const error = new Error(`Payment number ${data.payment_number} already exists in this business`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      const paymentNumber = data.payment_number || await generateInvoiceNumber(businessId, 'payment_out');
      
      const query = `
        INSERT INTO payment_out 
        (business_id, payment_number, party_id, amount_received, payment_discount, payment_date, payment_mode, payment_received_in, notes, status, is_invoice_linked, linked_invoices)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await pool.query(query, [
        businessId,
        paymentNumber,
        data.party_id,
        data.amount_received || 0,
        data.payment_discount || 0,
        data.payment_date,
        data.payment_mode,
        data.payment_received_in || null,
        data.notes || null,
        data.status || 'open',
        data.is_invoice_linked ? 1 : 0,
        data.linked_invoices ? JSON.stringify(data.linked_invoices) : null
      ]);
      
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Update payment out
  static async update(id, businessId, data) {
    try {
      // Safety check for duplicate number during update
      if (data.payment_number) {
        const exists = await checkDocumentNumberExists(businessId, 'payment_out', data.payment_number);
        if (exists) {
          const queryCheck = 'SELECT id FROM payment_out WHERE business_id = ? AND payment_number = ?';
          const [rows] = await pool.query(queryCheck, [businessId, data.payment_number]);
          if (rows.length > 0 && rows[0].id !== parseInt(id)) {
            const error = new Error(`Payment number ${data.payment_number} already exists`);
            error.code = 'DUPLICATE_NUMBER';
            throw error;
          }
        }
      }

      const query = `
        UPDATE payment_out 
        SET 
          payment_number = ?,
          amount_received = ?,
          payment_discount = ?,
          payment_date = ?,
          payment_mode = ?,
          payment_received_in = ?,
          notes = ?,
          status = ?,
          is_invoice_linked = ?,
          linked_invoices = ?
        WHERE id = ? AND business_id = ?
      `;
      
      const [result] = await pool.query(query, [
        data.payment_number,
        data.amount_received || 0,
        data.payment_discount || 0,
        data.payment_date,
        data.payment_mode,
        data.payment_received_in || null,
        data.notes || null,
        data.status || 'open',
        data.is_invoice_linked ? 1 : 0,
        data.linked_invoices ? JSON.stringify(data.linked_invoices) : null,
        id,
        businessId
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete payment out
  static async delete(id, businessId) {
    try {
      const query = 'DELETE FROM payment_out WHERE id = ? AND business_id = ?';
      const [result] = await pool.query(query, [id, businessId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get payment outs by party
  static async getByParty(partyId, businessId) {
    try {
      const query = `
        SELECT 
          po.id,
          po.payment_number,
          po.amount_received,
          po.payment_discount,
          po.payment_date,
          po.payment_mode,
          po.status,
          po.is_invoice_linked,
          po.linked_invoices
        FROM payment_out po
        WHERE po.party_id = ? AND po.business_id = ?
        ORDER BY po.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [partyId, businessId]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment outs by date range
  static async getByDateRange(businessId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          po.id,
          po.payment_number,
          po.party_id,
          p.party_name,
          po.amount_received,
          po.payment_discount,
          po.payment_date,
          po.payment_mode,
          po.status
        FROM payment_out po
        JOIN parties p ON po.party_id = p.id
        WHERE po.business_id = ? AND po.payment_date BETWEEN ? AND ?
        ORDER BY po.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId, startDate, endDate]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment outs by status
  static async getByStatus(businessId, status) {
    try {
      const query = `
        SELECT 
          po.id,
          po.payment_number,
          po.party_id,
          p.party_name,
          po.amount_received,
          po.payment_discount,
          po.payment_date,
          po.payment_mode,
          po.status
        FROM payment_out po
        JOIN parties p ON po.party_id = p.id
        WHERE po.business_id = ? AND po.status = ?
        ORDER BY po.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId, status]);
      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PaymentOutModel;
