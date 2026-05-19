const express = require('express');
const router = express.Router();
const ZKhataController = require('../controllers/zKhataController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.use(protect);

// Party Routes
router.post('/parties', ZKhataController.createParty);
router.get('/parties', ZKhataController.getParties);
router.get('/parties/:id', ZKhataController.getPartyById);
router.put('/parties/:id', ZKhataController.updateParty);
router.delete('/parties/:id', ZKhataController.deleteParty);

// Transaction Routes
router.post('/transactions', uploadMiddleware.uploadAny.single('screenshot'), ZKhataController.addTransaction);
router.get('/parties/:partyId/transactions', ZKhataController.getTransactionsForParty);
router.put('/transactions/:id', uploadMiddleware.uploadAny.single('screenshot'), ZKhataController.updateTransaction);
router.delete('/transactions/:id', ZKhataController.deleteTransaction);

module.exports = router;
