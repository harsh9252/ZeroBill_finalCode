const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grnController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, grnController.create);
router.get('/', protect, grnController.getAll);
router.get('/next-number', protect, grnController.getNextNumber);
router.get('/:id', protect, grnController.getById);
router.put('/:id', protect, grnController.update);
router.delete('/:id', protect, grnController.delete);

module.exports = router;
