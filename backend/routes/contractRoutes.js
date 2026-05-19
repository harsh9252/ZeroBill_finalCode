const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { protect } = require('../middleware/subUserAuthMiddleware');

router.use(protect);

router.get('/next-number', contractController.getNextContractNumber);
router.get('/locked-pages', contractController.getLockedContractPages);
router.post('/', contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', contractController.updateContract);
router.delete('/:id', contractController.deleteContract);
router.put('/page/:id/lock', contractController.togglePageLock);

module.exports = router;
