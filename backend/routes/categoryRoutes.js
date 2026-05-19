const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all categories for a business
router.get('/', authMiddleware.protect, categoryController.getAllCategories);

// Create a new category
router.post('/', authMiddleware.protect, categoryController.createCategory);

// Delete a category
router.delete('/:id', authMiddleware.protect, categoryController.deleteCategory);

module.exports = router;
