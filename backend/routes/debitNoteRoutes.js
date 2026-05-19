const express = require('express');
const router = express.Router();
const debitNoteController = require('../controllers/debitNoteController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

router.use(protect);

router.get('/next-number', debitNoteController.getNextNumber);
router.post('/', debitNoteController.createDebitNote);
router.get('/', debitNoteController.getAllDebitNotes);
router.get('/stats', debitNoteController.getDebitNoteStats);
router.get('/:id', debitNoteController.getDebitNoteById);
router.put('/:id', debitNoteController.updateDebitNote);
router.delete('/:id', debitNoteController.deleteDebitNote);

module.exports = router;
