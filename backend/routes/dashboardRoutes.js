const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/subUserAuthMiddleware');

// All routes require authentication
router.use(protect);

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;