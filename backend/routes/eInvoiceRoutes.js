const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/eInvoiceController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require auth
router.use(protect);

// GET  /api/e-invoice/config           — Show provider setup status
router.get('/config', ctrl.getConfig);

// GET  /api/e-invoice/list             — All IRNs for this business
router.get('/list', ctrl.getAllEInvoices);

// GET  /api/e-invoice/invoice/:id      — IRN details for a specific sales invoice
router.get('/invoice/:invoiceId', ctrl.getEInvoiceByInvoice);

// GET  /api/e-invoice/preview/:id      — Preview JSON payload before generating
router.get('/preview/:invoiceId', ctrl.previewPayload);

// POST /api/e-invoice/generate/:id     — Generate IRN for a sales invoice
router.post('/generate/:invoiceId', ctrl.generateEInvoice);

// POST /api/e-invoice/cancel/:irn      — Cancel an existing IRN
router.post('/cancel/:irn', ctrl.cancelEInvoice);

// POST /api/e-invoice/ewaybill-by-irn  — Generate E-Way Bill by IRN
router.post('/ewaybill-by-irn', ctrl.generateEWayBill);

// GET  /api/e-invoice/details/:irn     — Fetch latest IRN details from IRP
router.get('/details/:irn', ctrl.getIRNRemoteDetails);

module.exports = router;
