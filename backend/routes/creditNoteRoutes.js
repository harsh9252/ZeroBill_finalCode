const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

// Get next credit note number (based on last saved)
router.get('/next-number', creditNoteController.getNextNumber);

// Create credit note
router.post('/', creditNoteController.createCreditNote);

// Get all credit notes
router.get('/', creditNoteController.getAllCreditNotes);

// Get credit note statistics
router.get('/stats', creditNoteController.getCreditNoteStats);

// Get credit note by ID
router.get('/:id', creditNoteController.getCreditNoteById);

// Update credit note
router.put('/:id', creditNoteController.updateCreditNote);

// Delete credit note
router.delete('/:id', creditNoteController.deleteCreditNote);

module.exports = router;
