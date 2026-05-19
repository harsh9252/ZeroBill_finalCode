const { pool } = require('../config/database');
const { generateInvoiceNumber, checkDocumentNumberExists } = require('../utils/invoiceSequenceGenerator');

class PaymentInModel {
  // Get all payment ins for a business
  static async getAll(businessId) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.payment_number,
          pi.party_id,
          p.party_name,
          pi.amount_received,
          pi.payment_discount,
          DATE_FORMAT(pi.payment_date, '%Y-%m-%d') as payment_date,
          pi.payment_mode,
          pi.notes,
          pi.status,
          pi.is_invoice_linked,
          pi.linked_invoices,
          pi.created_at,
          pi.updated_at
        FROM payment_in pi
        JOIN parties p ON pi.party_id = p.id
        WHERE pi.business_id = ?
        ORDER BY pi.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment in by ID
  static async getById(id, businessId) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.payment_number,
          pi.party_id,
          p.party_name,
          pi.amount_received,
          pi.payment_discount,
          DATE_FORMAT(pi.payment_date, '%Y-%m-%d') as payment_date,
          pi.payment_mode,
          pi.payment_received_in,
          pi.notes,
          pi.status,
          pi.is_invoice_linked,
          pi.linked_invoices,
          pi.created_at,
          pi.updated_at
        FROM payment_in pi
        JOIN parties p ON pi.party_id = p.id
        WHERE pi.id = ? AND pi.business_id = ?
      `;
      
      const [results] = await pool.query(query, [id, businessId]);
      return results[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new payment in
  static async create(businessId, data) {
    try {
      // If user provided a payment number, check if it already exists
      if (data.payment_number) {
        const exists = await checkDocumentNumberExists(businessId, 'payment_in', data.payment_number);
        if (exists) {
          const error = new Error(`Payment number ${data.payment_number} already exists in this business`);
          error.code = 'DUPLICATE_NUMBER';
          throw error;
        }
      }

      const paymentNumber = data.payment_number || await generateInvoiceNumber(businessId, 'payment_in');
      
      const query = `
        INSERT INTO payment_in 
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

  // Update payment in
  static async update(id, businessId, data) {
    try {
      // Safety check for duplicate number during update
      if (data.payment_number) {
        const exists = await checkDocumentNumberExists(businessId, 'payment_in', data.payment_number);
        if (exists) {
          const queryCheck = 'SELECT id FROM payment_in WHERE business_id = ? AND payment_number = ?';
          const [rows] = await pool.query(queryCheck, [businessId, data.payment_number]);
          if (rows.length > 0 && rows[0].id !== parseInt(id)) {
            const error = new Error(`Payment number ${data.payment_number} already exists`);
            error.code = 'DUPLICATE_NUMBER';
            throw error;
          }
        }
      }

      const query = `
        UPDATE payment_in 
        SET 
          payment_number = ?,
          party_id = ?,
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
        data.party_id,
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

  // Delete payment in
  static async delete(id, businessId) {
    try {
      const query = 'DELETE FROM payment_in WHERE id = ? AND business_id = ?';
      const [result] = await pool.query(query, [id, businessId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get payment ins by party
  static async getByParty(partyId, businessId) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.payment_number,
          pi.amount_received,
          pi.payment_discount,
          pi.payment_date,
          pi.payment_mode,
          pi.status,
          pi.is_invoice_linked,
          pi.linked_invoices
        FROM payment_in pi
        WHERE pi.party_id = ? AND pi.business_id = ?
        ORDER BY pi.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [partyId, businessId]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment ins by date range
  static async getByDateRange(businessId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.payment_number,
          pi.party_id,
          p.party_name,
          pi.amount_received,
          pi.payment_discount,
          pi.payment_date,
          pi.payment_mode,
          pi.status
        FROM payment_in pi
        JOIN parties p ON pi.party_id = p.id
        WHERE pi.business_id = ? AND pi.payment_date BETWEEN ? AND ?
        ORDER BY pi.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId, startDate, endDate]);
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get payment ins by status
  static async getByStatus(businessId, status) {
    try {
      const query = `
        SELECT 
          pi.id,
          pi.payment_number,
          pi.party_id,
          p.party_name,
          pi.amount_received,
          pi.payment_discount,
          pi.payment_date,
          pi.payment_mode,
          pi.status
        FROM payment_in pi
        JOIN parties p ON pi.party_id = p.id
        WHERE pi.business_id = ? AND pi.status = ?
        ORDER BY pi.payment_date DESC
      `;
      
      const [results] = await pool.query(query, [businessId, status]);
      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PaymentInModel;
