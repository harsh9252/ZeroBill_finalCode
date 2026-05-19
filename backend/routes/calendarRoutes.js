const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const demoManagementController = require('../controllers/demoManagementController');
const { emailRateLimiter } = require('../middleware/rateLimitMiddleware');

// 1. Generate auth URL for the admin to grant offline access
router.get('/auth/url', calendarController.generateAuthUrl);

// 2. Google redirects here with an authorization code
router.get('/auth/callback', calendarController.authCallback);

// 3. Get booked slots (Includes DB Overrides and Google Calendar)
router.get('/booked-slots', demoManagementController.getPublicBookedSlots);

// 4. Frontend form posts here to book a demo
router.post('/book-demo', emailRateLimiter, calendarController.bookDemo);

// 5. Cancel a demo
router.delete('/cancel-demo/:eventId', calendarController.cancelDemo);

module.exports = router;
