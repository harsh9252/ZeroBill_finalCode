const express = require('express');
const router = express.Router();
const projectExpenseController = require('../controllers/projectExpenseController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication (supports both main users and subusers)
router.use(protect);

// Routes for project expense accounts
router.post('/', projectExpenseController.createAccount);
router.get('/next-number', projectExpenseController.getNextNumber);
router.get('/', projectExpenseController.getAccounts);
router.get('/:id', projectExpenseController.getAccountById);
router.put('/:id', projectExpenseController.updateAccount);
router.delete('/:id', projectExpenseController.deleteAccount);
router.post('/:id/set-default', projectExpenseController.setDefaultAccount);


// Party and Balance specific routes
router.get('/parties/balances', projectExpenseController.getPartiesWithBalances);
router.get('/parties/transactions', projectExpenseController.getTransactionsByParty);

// Transaction routes
router.post('/transactions', projectExpenseController.addTransaction);
router.get('/transactions/list', projectExpenseController.getTransactions);

// Sync bank details from bank_details table
router.post('/sync-bank', projectExpenseController.syncBankDetails);

module.exports = router;
