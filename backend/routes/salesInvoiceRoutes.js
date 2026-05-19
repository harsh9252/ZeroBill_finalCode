const express = require('express');
const router = express.Router();
const salesInvoiceController = require('../controllers/salesInvoiceController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');

// Public routes (No Auth required)
router.get('/public/:id', salesInvoiceController.getPublicSalesInvoice);

// All routes below require authentication
router.use(protect);

// Get next sales invoice number (based on last saved)
router.get('/next-number', salesInvoiceController.getNextNumber);

// Generate next sales invoice number
router.get('/generate-number', salesInvoiceController.generateNumber);

// Create sales invoice
router.post('/', checkPlanExpiry, salesInvoiceController.createSalesInvoice);

// Get all sales invoices
router.get('/', salesInvoiceController.getAllSalesInvoices);

// Get sales invoice statistics
router.get('/stats', salesInvoiceController.getSalesStats);

// Get sales invoice by ID
router.get('/:id', salesInvoiceController.getSalesInvoiceById);

// Update sales invoice
router.put('/:id', checkPlanExpiry, salesInvoiceController.updateSalesInvoice);

// Delete sales invoice
router.delete('/:id', salesInvoiceController.deleteSalesInvoice);
router.delete('/:id/hard', salesInvoiceController.hardDeleteSalesInvoice);

module.exports = router;
