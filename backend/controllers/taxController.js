
const taxService = require('../services/taxService');

/**
 * Controller to handle tax-related requests
 */

exports.validateTaxId = async (req, res) => {
    try {
        const { country_iso, tin } = req.query;

        if (!country_iso || !tin) {
            return res.status(400).json({
                success: false,
                message: 'Country ISO and Tax ID (TIN) are required'
            });
        }

        const result = await taxService.validateTaxId(country_iso, tin);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        console.error('[TaxController] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error during tax validation',
            error: error.message
        });
    }
};
