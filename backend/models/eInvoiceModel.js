const { pool } = require('../config/database');

class EInvoice {
    // Save a new E-Invoice log
    static async create(data) {
        const query = `
      INSERT INTO einvoice_logs (
        business_id, sales_invoice_id, irn, ack_no, ack_date,
        signed_qr_code, signed_invoice, status, irp_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [
            data.business_id,
            data.sales_invoice_id,
            data.irn || null,
            data.ack_no || null,
            data.ack_date || null,
            data.signed_qr_code || null,
            data.signed_invoice || null,
            data.status || 'generated',
            JSON.stringify(data.irp_response || {}),
        ]);

        return this.findById(result.insertId);
    }

    // Find a log by its DB id
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM einvoice_logs WHERE id = ?',
            [id]
        );
        if (!rows[0]) return null;
        rows[0].irp_response = typeof rows[0].irp_response === 'string'
            ? JSON.parse(rows[0].irp_response) : rows[0].irp_response;
        return rows[0];
    }

    // Find by sales_invoice_id (to check if IRN already exists)
    static async findBySalesInvoiceId(salesInvoiceId) {
        const [rows] = await pool.execute(
            'SELECT * FROM einvoice_logs WHERE sales_invoice_id = ? ORDER BY created_at DESC LIMIT 1',
            [salesInvoiceId]
        );
        if (!rows[0]) return null;
        rows[0].irp_response = typeof rows[0].irp_response === 'string'
            ? JSON.parse(rows[0].irp_response) : rows[0].irp_response;
        return rows[0];
    }

    // Get all E-Invoice logs for a business (for dashboard list)
    static async findByBusinessId(businessId, limit = 50, offset = 0) {
        const query = `
      SELECT el.*, si.invoice_number, si.party_name, si.grand_total, si.invoice_date
      FROM einvoice_logs el
      LEFT JOIN sales_invoices si ON el.sales_invoice_id = si.id
      WHERE el.business_id = ?
      ORDER BY el.created_at DESC
      LIMIT ? OFFSET ?
    `;
        const [rows] = await pool.execute(query, [businessId, limit, offset]);
        return rows.map(r => ({
            ...r,
            irp_response: typeof r.irp_response === 'string' ? JSON.parse(r.irp_response) : r.irp_response
        }));
    }

    // Count total records for pagination
    static async countByBusinessId(businessId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as total FROM einvoice_logs WHERE business_id = ?',
            [businessId]
        );
        return rows[0].total;
    }

    // Update status (used for cancellation)
    static async updateStatus(id, status, cancelReason = null) {
        await pool.execute(
            'UPDATE einvoice_logs SET status = ?, cancel_reason = ? WHERE id = ?',
            [status, cancelReason, id]
        );
        return this.findById(id);
    }

    // Cancel by IRN
    static async cancelByIrn(irn, cancelReason) {
        const [rows] = await pool.execute(
            'SELECT * FROM einvoice_logs WHERE irn = ? LIMIT 1',
            [irn]
        );
        if (!rows[0]) return null;
        return this.updateStatus(rows[0].id, 'cancelled', cancelReason);
    }

    // Find by IRN
    static async findByIrn(irn) {
        const [rows] = await pool.execute(
            'SELECT * FROM einvoice_logs WHERE irn = ? LIMIT 1',
            [irn]
        );
        if (!rows[0]) return null;
        rows[0].irp_response = typeof rows[0].irp_response === 'string'
            ? JSON.parse(rows[0].irp_response) : rows[0].irp_response;
        return rows[0];
    }

    // Update E-Way Bill info
    static async updateEWayBill(irn, ewayBillNo, ewayBillDate) {
        await pool.execute(
            'UPDATE einvoice_logs SET eway_bill_no = ?, eway_bill_date = ? WHERE irn = ?',
            [ewayBillNo, ewayBillDate, irn]
        );
        return this.findByIrn(irn);
    }
}

module.exports = EInvoice;
