const express = require('express');
const router = express.Router();
const proformaInvoiceController = require('../controllers/proformaInvoiceController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');

// Public routes (No Auth required)
router.get('/public/:id', proformaInvoiceController.getPublicProforma);

// All routes below require authentication
router.use(protect);

// Get next proforma invoice number (based on last saved)
router.get('/next-number', proformaInvoiceController.getNextNumber);

// Generate next proforma invoice number
router.get('/generate-number', proformaInvoiceController.generateNumber);

// Create proforma invoice
router.post('/', checkPlanExpiry, proformaInvoiceController.createProformaInvoice);

// Get all proforma invoices
router.get('/', proformaInvoiceController.getAllProformaInvoices);

// Get proforma invoice statistics
router.get('/stats', proformaInvoiceController.getProformaStats);

// Get proforma invoice by ID
router.get('/:id', proformaInvoiceController.getProformaInvoiceById);

// Update proforma invoice
router.put('/:id', checkPlanExpiry, proformaInvoiceController.updateProformaInvoice);

// Delete proforma invoice
router.delete('/:id', checkPlanExpiry, proformaInvoiceController.deleteProformaInvoice);

// Convert proforma invoice to Sales Invoice
router.post('/:id/convert', proformaInvoiceController.convertProformaToSales);

module.exports = router;
