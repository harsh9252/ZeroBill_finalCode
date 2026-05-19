const express = require('express');
const router = express.Router();
const bookInvoiceController = require('../controllers/bookInvoiceController');

// All routes require business_id in query or body
router.get('/', bookInvoiceController.getAll);
router.get('/stats', bookInvoiceController.getStats);
router.get('/next-number', bookInvoiceController.getNextNumber);
router.get('/by-po', bookInvoiceController.getByPoReference);          // GET /api/book-invoices/by-po?po_reference=PO-xxx&business_id=1
router.get('/:id', bookInvoiceController.getById);
router.post('/', bookInvoiceController.create);
router.put('/:id', bookInvoiceController.update);
router.delete('/:id', bookInvoiceController.delete);

module.exports = router;
