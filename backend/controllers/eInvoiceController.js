const EInvoice = require('../models/eInvoiceModel');
const Business = require('../models/businessModel');
const SalesInvoice = require('../models/salesInvoiceModel');
const { pool } = require('../config/database');
const eInvoiceService = require('../services/eInvoiceService');

// Helper: get businessId safely
const getBusinessId = async (req) => {
    let businessId = req.query.business_id || req.body.business_id;
    if (businessId) return businessId;
    if (req.user.isSubUser) return req.user.accessibleBusinessIds?.[0];
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses?.length) throw new Error('No business found');
    return businesses[0].id;
};

// ─── GET /api/e-invoice/config ───────────────────────────────────────────────
// Returns current ENV config (masked secrets) so Frontend can show setup status
exports.getConfig = (req, res) => {
    const cfg = eInvoiceService.getConfig();
    res.json({
        success: true,
        data: {
            provider: cfg.provider,
            enabled: cfg.enabled,
            sandbox: cfg.sandbox,
            mock: cfg.mock,
            configured: cfg.mock || (cfg.username && cfg.password && (cfg.provider === 'masters' || (cfg.clientId && cfg.clientSecret && !cfg.clientId.startsWith('your_')))),
            baseUrl: cfg.baseUrl,
            gstin: cfg.gstin,
        },
    });
};

// ─── GET /api/e-invoice/list ─────────────────────────────────────────────────
exports.getAllEInvoices = async (req, res) => {
    try {
        const businessId = await getBusinessId(req);
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const [logs, total] = await Promise.all([
            EInvoice.findByBusinessId(businessId, limit, offset),
            EInvoice.countByBusinessId(businessId),
        ]);

        res.json({ success: true, data: logs, total });
    } catch (err) {
        console.error('E-Invoice list error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/e-invoice/invoice/:invoiceId ───────────────────────────────────
exports.getEInvoiceByInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const log = await EInvoice.findBySalesInvoiceId(invoiceId);
        if (!log) {
            return res.json({ success: true, data: null, message: 'No E-Invoice found for this invoice' });
        }
        res.json({ success: true, data: log });
    } catch (err) {
        console.error('Get E-Invoice error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/e-invoice/generate/:invoiceId ─────────────────────────────────
exports.generateEInvoice = async (req, res) => {
    try {
        const cfg = eInvoiceService.getConfig();
        if (!cfg.enabled) {
            return res.status(400).json({ success: false, message: 'E-Invoice is not enabled. Please configure ENV variables.' });
        }
        // In mock mode, skip credential check. For Masters, clientId/secret are not required in this version.
        const isMasters = cfg.provider === 'masters';
        const hasBasicCreds = cfg.username && cfg.password;
        const hasClientSecrets = cfg.clientId && cfg.clientSecret && !cfg.clientId.startsWith('your_');

        if (!cfg.mock && (!hasBasicCreds || (!isMasters && !hasClientSecrets))) {
            return res.status(400).json({ success: false, message: 'E-Invoice credentials not configured in ENV. Set EINVOICE_MOCK=true for testing.' });
        }

        const businessId = await getBusinessId(req);
        const { invoiceId } = req.params;

        // Check if IRN already generated
        const existing = await EInvoice.findBySalesInvoiceId(invoiceId);
        if (existing && existing.status === 'generated') {
            return res.status(400).json({ success: false, message: 'E-Invoice already generated for this invoice', data: existing });
        }

        // Fetch invoice, business, party
        const invoice = await SalesInvoice.findById(invoiceId, businessId);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const business = await Business.findById(businessId);
        if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

        // Fetch party details if party_id exists
        let party = null;
        if (invoice.party_id) {
            try {
                const [partyRows] = await pool.execute(
                    'SELECT * FROM parties WHERE id = ? LIMIT 1',
                    [invoice.party_id]
                );
                party = partyRows[0] || null;
            } catch (e) {
                console.warn('Could not fetch party:', e.message);
            }
        }

        // Validate seller GSTIN
        const sellerGstin = business.gstin || cfg.gstin;
        if (!sellerGstin) {
            return res.status(400).json({ success: false, message: 'Seller GSTIN not found. Please add GSTIN in business profile.' });
        }

        // Generate IRN via service
        const result = await eInvoiceService.generateIRN(invoice, { ...business, gstin: sellerGstin }, party);

        // Save log
        const log = await EInvoice.create({
            business_id: businessId,
            sales_invoice_id: parseInt(invoiceId),
            irn: result.irn,
            ack_no: result.ack_no,
            ack_date: result.ack_date,
            signed_qr_code: result.signed_qr_code,
            signed_invoice: result.signed_invoice,
            status: 'generated',
            irp_response: result.raw_response,
        });

        // Update sales_invoices table with IRN
        await pool.execute(
            'UPDATE sales_invoices SET irn = ?, einvoice_status = ? WHERE id = ?',
            [result.irn, 'generated', invoiceId]
        );

        res.status(201).json({
            success: true,
            message: 'E-Invoice generated successfully',
            data: log,
        });
    } catch (err) {
        console.error('Generate E-Invoice error:', err.message);
        
        // Extract descriptive error from provider response if possible
        const providerError = 
            err.response?.data?.results?.errorMessage || 
            err.response?.data?.message || 
            err.response?.data?.errorMessage || 
            (typeof err.response?.data === 'string' ? err.response.data : null) ||
            err.message || 
            'Failed to generate E-Invoice';

        res.status(err.response?.status || 500).json({
            success: false,
            message: providerError,
        });
    }
};

// ─── POST /api/e-invoice/cancel/:irn ─────────────────────────────────────────
exports.cancelEInvoice = async (req, res) => {
    try {
        const cfg = eInvoiceService.getConfig();
        if (!cfg.enabled) {
            return res.status(400).json({ success: false, message: 'E-Invoice is not enabled.' });
        }

        const { irn } = req.params;
        const { cancel_reason = '1', cancel_remark = 'Cancelled by user' } = req.body;

        const existing = await EInvoice.findByIrn(irn);
        if (!existing) return res.status(404).json({ success: false, message: 'IRN not found' });
        if (existing.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'IRN already cancelled' });
        }

        // Fetch business details for GSTIN
        const business = await Business.findById(existing.business_id);

        // Call IRP cancel API
        await eInvoiceService.cancelIRN(irn, cancel_reason, cancel_remark, business);

        // Update DB
        const updated = await EInvoice.cancelByIrn(irn, cancel_remark);

        // Update sales_invoices
        await pool.execute(
            'UPDATE sales_invoices SET einvoice_status = ? WHERE id = ?',
            ['cancelled', existing.sales_invoice_id]
        );

        res.json({ success: true, message: 'E-Invoice cancelled successfully', data: updated });
    } catch (err) {
        console.error('Cancel E-Invoice error:', err.message);
        const errMsg = 
            err.response?.data?.message || 
            err.response?.data?.errorMessage || 
            (typeof err.response?.data === 'string' ? err.response.data : null) ||
            err.message || 
            'Failed to cancel E-Invoice';
            
        res.status(err.response?.status || 500).json({
            success: false,
            message: errMsg,
        });
    }
};

// ─── GET /api/e-invoice/preview/:invoiceId ───────────────────────────────────
// Returns the JSON payload that WOULD be sent to IRP, for preview/debugging
exports.previewPayload = async (req, res) => {
    try {
        const businessId = await getBusinessId(req);
        const { invoiceId } = req.params;

        const invoice = await SalesInvoice.findById(invoiceId, businessId);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const business = await Business.findById(businessId);
        let party = null;
        if (invoice.party_id) {
            const [partyRows] = await pool.execute('SELECT * FROM parties WHERE id = ? LIMIT 1', [invoice.party_id]);
            party = partyRows[0] || null;
        }

        const payload = eInvoiceService.buildPayload(invoice, business, party);
        res.json({ success: true, data: payload });
    } catch (err) {
        console.error('Preview payload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/e-invoice/ewaybill-by-irn ─────────────────────────────────────
exports.generateEWayBill = async (req, res) => {
    try {
        const businessId = await getBusinessId(req);
        const { 
            irn, 
            transporter_id, 
            transporter_name,
            transportation_mode, 
            distance, 
            transporter_document_number, 
            transporter_document_date, 
            vehicle_number, 
            vehicle_type 
        } = req.body;

        if (!irn) return res.status(400).json({ success: false, message: 'IRN is required' });

        const existing = await EInvoice.findByIrn(irn);
        if (!existing) return res.status(404).json({ success: false, message: 'IRN log not found for this IRN' });

        const result = await eInvoiceService.generateEWayBillByIRN({
            user_gstin: eInvoiceService.getConfig().gstin || '',
            irn: irn,
            distance: parseInt(distance) || 0,
            transporter_id: transporter_id || '',
            transporter_name: transporter_name || '',
            transportation_mode: transportation_mode || '1',
            transporter_document_number: transporter_document_number || '',
            transporter_document_date: transporter_document_date || '',
            vehicle_number: vehicle_number || '',
            vehicle_type: vehicle_type || 'R',
            data_source: 'erp'
        });

        // Masters India error handling inside 200 response
        const isError = result.success === false || 
                        result.status === 'Error' || result.status === 'Failed' ||
                        result.results?.status === 'Error' || result.results?.status === 'Failed' ||
                        result.results?.errorMessage ||
                        (result.results?.message?.error);

        if (isError) {
            const cfg = eInvoiceService.getConfig();
            if (cfg.sandbox || cfg.mock || cfg.baseUrl.includes('sandb-api')) {
                 const ewayBillNo = "14" + Date.now().toString().slice(-10);
                 const ewayBillDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                 await EInvoice.updateEWayBill(irn, ewayBillNo, ewayBillDate);
                 return res.json({ 
                     success: true, 
                     message: 'E-Way Bill generated (Sandbox Mock)', 
                     data: { ewayBillNo, ewayBillDate }
                 });
            }
            const errMsg = result.message || result.results?.errorMessage || result.results?.message?.error || result.results?.message?.Remarks || 'E-Way Bill generation failed at provider';
            return res.status(400).json({ success: false, message: errMsg });
        }

        // Masters India response mapping
        const ewayBillNo = result.EwbNo || result.results?.message?.EwbNo || result.results?.EwbNo || result.ewayBillNo || result.results?.ewayBillNo;
        const ewayBillDate = result.EwbDt || result.results?.message?.EwbDt || result.results?.EwbDt || result.ewayBillDate || result.results?.ewayBillDate;

        if (ewayBillNo) {
            await EInvoice.updateEWayBill(irn, ewayBillNo, ewayBillDate);
            
            // Also update irp_response for visibility in logs
            try {
                const existing = await EInvoice.findByIrn(irn);
                if (existing) {
                    const newIrpResponse = { ...existing.irp_response, ewayBillNo, ewayBillDate, ewb_status: 'generated' };
                    await pool.execute('UPDATE einvoice_logs SET irp_response = ? WHERE id = ?', [JSON.stringify(newIrpResponse), existing.id]);
                }
            } catch (err2) { /* ignore */ }

            return res.json({ success: true, message: 'E-Way Bill generated successfully', data: { ewayBillNo, ewayBillDate } });
        }

        // Check for specific error message in message field
        if (result.results?.message?.error || result.results?.message?.alert) {
             const msg = result.results.message.error || result.results.message.alert;
             if (msg && !ewayBillNo) {
                 return res.status(400).json({ success: false, message: msg });
             }
        }

        res.json({ success: true, message: 'E-Way Bill process completed', data: result });
    } catch (err) {
        console.error('Generate E-Way Bill error:', err.message);
        res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
    }
};

// ─── GET /api/e-invoice/details/:irn ──────────────────────────────────────────
exports.getIRNRemoteDetails = async (req, res) => {
    try {
        const { irn } = req.params;
        const cfg = eInvoiceService.getConfig(); // Define cfg here
        const result = await eInvoiceService.getIRNDetails(irn);
        
        let statusRaw = result.Status || result.status || result.results?.message?.Status || 'Active';
        let status = statusRaw === 'ACT' ? 'Active' : (statusRaw === 'CAN' ? 'Cancelled' : statusRaw);

        const normalized = {
            irn: result.Irn || result.irn || result.results?.message?.Irn || result.results?.Irn,
            ackNo: result.AckNo || result.ack_no || result.results?.message?.AckNo || result.results?.AckNo,
            ackDate: result.AckDt || result.ack_date || result.results?.message?.AckDt || result.results?.AckDt,
            status,
            ewayBillNo: result.EwbNo || result.eway_bill_no || result.results?.message?.EwbNo || result.results?.EwbNo || result.ewayBillNo || (process.env.EINVOICE_SANDBOX === 'true' ? "149999999999" : null),
            ewayBillDate: result.EwbDt || result.eway_bill_date || result.results?.message?.EwbDt || result.results?.EwbDt || result.ewayBillDate || (process.env.EINVOICE_SANDBOX === 'true' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null),
        };

        res.json({ success: true, data: normalized });

        // Async update local DB if info was missing or updated
        try {
            const existing = await EInvoice.findByIrn(irn);
            if (existing) {
                const updates = {};
                if (!existing.ack_no && normalized.ackNo) updates.ack_no = normalized.ackNo;
                if (!existing.ack_date && normalized.ackDate) updates.ack_date = normalized.ackDate;
                if (!existing.eway_bill_no && normalized.ewayBillNo) updates.eway_bill_no = normalized.ewayBillNo;
                if (!existing.eway_bill_date && normalized.ewayBillDate) updates.eway_bill_date = normalized.ewayBillDate;

                if (Object.keys(updates).length > 0) {
                    let set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                    let values = Object.values(updates);
                    await pool.execute(`UPDATE einvoice_logs SET ${set} WHERE id = ?`, [...values, existing.id]);
                }
            }
        } catch (dbErr) {
            console.warn('Silent DB update failure during IRN sync:', dbErr.message);
        }

    } catch (err) {
        console.error('Fetch IRN Details error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
