const express = require('express');
const router = express.Router();
const approvalWorkflowController = require('../controllers/approvalWorkflowController');
const { protect } = require('../middleware/subUserAuthMiddleware');

router.use(protect);

router.get('/', approvalWorkflowController.getWorkflow);
router.post('/', approvalWorkflowController.saveWorkflow);

module.exports = router;
