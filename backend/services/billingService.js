const { pool } = require('../config/database');

/**
 * Service to handle billing and subscription plan status
 */
//comment
const billingService = {
    /**
     * Get the current plan status for a user
     * @param {number} userId - The ID of the user
     * @returns {Object} Plan status including isExpired and expiryDate
     */
    getPlanStatus: async (userId) => {
        try {
            // Find the most recent successful payment
            const query = `
        SELECT plan_type, billing_period_end, payment_status
        FROM billing_history
        WHERE user_id = ? AND payment_status = 'success'
        ORDER BY billing_period_end DESC
        LIMIT 1
      `;

            const [rows] = await pool.query(query, [userId]);

            const now = new Date();

            if (rows.length === 0) {
                // No subscription found - for this system, we might default to expired or a trial
                // Based on the code in authController, it seems we check if the plan is expired.
                // If no plan, we'll return as expired with a past date to be safe.
                return {
                    isExpired: true,
                    expiryDate: null,
                    planType: 'None'
                };
            }

            const expiryDate = new Date(rows[0].billing_period_end);
            const isExpired = now > expiryDate;

            return {
                isExpired,
                expiryDate: rows[0].billing_period_end,
                planType: rows[0].plan_type
            };
        } catch (error) {
            console.error('Error in getPlanStatus:', error);
            // Fail-safe: return as expired if there's an error
            return {
                isExpired: true,
                expiryDate: null,
                planType: 'Error'
            };
        }
    }
};

module.exports = billingService;
