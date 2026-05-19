const express = require('express');
const router = express.Router();
const prController = require('../controllers/purchaseRequisitionController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/public-action/:id', prController.publicAction);
router.use(protect);

router.post('/', checkPlanExpiry, upload.uploadAny.array('attachments'), prController.createPR);
router.get('/', prController.getAllPRs);
router.get('/next-number', prController.getNextNumber);
router.get('/:id', prController.getPRById);
router.put('/:id', checkPlanExpiry, upload.uploadAny.array('attachments'), prController.updatePR);
router.delete('/:id', checkPlanExpiry, prController.deletePR);

module.exports = router;
