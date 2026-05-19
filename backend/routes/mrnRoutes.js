const express = require('express');
const router = express.Router();
const mrnController = require('../controllers/mrnController');
const { protect } = require('../middleware/authMiddleware');

// router.post('/', protect, mrnController.create);
// router.get('/', protect, mrnController.getAll);
// router.get('/:id', protect, mrnController.getById);
// router.delete('/:id', protect, mrnController.delete);
router.post('/', protect, mrnController.create);
router.get('/', protect, mrnController.getAll);
router.get('/next-number', protect, mrnController.getNextNumber);
router.get('/:id', protect, mrnController.getById);
router.put('/:id', protect, mrnController.update);
router.delete('/:id', protect, mrnController.delete);

module.exports = router;
