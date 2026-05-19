const express = require('express');
const router = express.Router();
const bankDetailsController = require('../controllers/bankDetailsController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication (supports both main users and subusers)
router.use(protect);

// Routes for bank details
router.post('/', bankDetailsController.createBankAccount);
router.get('/', bankDetailsController.getBankAccounts);
router.get('/:id', bankDetailsController.getBankAccountById);
router.put('/:id', bankDetailsController.updateBankAccount);
router.delete('/:id', bankDetailsController.deleteBankAccount);

module.exports = router;