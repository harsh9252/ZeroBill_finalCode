const express = require('express');
const router = express.Router();
const projectPartyController = require('../controllers/projectPartyController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

router.post('/', projectPartyController.createProjectParty);
router.get('/:project_expense_id', projectPartyController.getProjectParties);
router.put('/:id', projectPartyController.updateProjectParty);
router.delete('/:id', projectPartyController.deleteProjectParty);

module.exports = router;
