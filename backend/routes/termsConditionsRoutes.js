const express = require('express');
const router = express.Router();
const termsConditionsController = require('../controllers/termsConditionsController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get all terms & conditions for a quotation
router.get('/quotation/:quotationId', termsConditionsController.getTermsByQuotationId);
router.get('/sales/:salesId', termsConditionsController.getTermsBySalesId);
router.get('/proforma/:proformaId', termsConditionsController.getTermsByProformaId);
router.get('/credit-note/:creditNoteId', termsConditionsController.getTermsByCreditNoteId);
router.get('/debit-note/:debitNoteId', termsConditionsController.getTermsByDebitNoteId);
router.get('/sales-return/:salesReturnId', termsConditionsController.getTermsBySalesReturnId);
router.get('/purchase-return/:purchaseReturnId', termsConditionsController.getTermsByPurchaseReturnId);
router.get('/delivery-challan/:deliveryChallanId', termsConditionsController.getTermsByDeliveryChallanId);
router.get('/purchase-invoice/:purchaseInvoiceId', termsConditionsController.getTermsByPurchaseInvoiceId);
router.get('/purchase-order/:purchaseOrderId', termsConditionsController.getTermsByPurchaseOrderId);
router.get('/book-purchase-order/:bookPurchaseOrderId', termsConditionsController.getTermsByBookPurchaseOrderId);
router.get('/book-invoice/:bookInvoiceId', termsConditionsController.getTermsByBookInvoiceId);

// Create single terms & conditions section
router.post('/', termsConditionsController.createTerms);

// Bulk create terms & conditions sections
router.post('/bulk', termsConditionsController.bulkCreateTerms);

// Update terms & conditions
router.put('/:id', termsConditionsController.updateTerms);

// Delete single terms & conditions section
router.delete('/:id', termsConditionsController.deleteTerms);

// Delete all terms & conditions for a quotation
router.delete('/quotation/:quotationId', termsConditionsController.deleteTermsByQuotationId);
router.delete('/book-invoice/:bookInvoiceId', termsConditionsController.deleteTermsByBookInvoiceId);

// Get globally locked terms
router.get('/locked/global', termsConditionsController.getLockedTerms);

// Lock a specific section globally
router.post('/:id/lock', termsConditionsController.lockSection);

module.exports = router;
