
const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Routes for Tax ID validation
 */

// GET /api/tax/validate?country_iso=IN&tin=...
router.get('/validate', protect, taxController.validateTaxId);

module.exports = router;
