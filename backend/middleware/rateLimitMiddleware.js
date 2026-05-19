const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for email sending endpoints
 * Limits to 3 requests per IP per hour
 */
const emailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: 'Too many emails sent from this IP. Please try again after an hour.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  emailRateLimiter
};
