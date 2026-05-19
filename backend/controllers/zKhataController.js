const ZKhataParty = require('../models/zKhataPartyModel');
const ZKhataTransaction = require('../models/zKhataTransactionModel');
const Business = require('../models/businessModel');

// Helper function to validate business access
const validateBusinessAccess = async (req, businessId) => {
    if (!businessId) {
        return { valid: false, message: 'Business ID is required' };
    }

    if (req.user.isSubUser) {
        if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
            return { valid: false, message: 'Access denied: You do not have permission to access this business' };
        }
    } else {
        const business = await Business.findById(businessId);
        if (!business || business.user_id !== req.user.id) {
            return { valid: false, message: 'Invalid business access' };
        }
    }

    return { valid: true };
};

class ZKhataController {
    // Party Controllers
    static async createParty(req, res) {
        try {
            const { business_id } = req.body;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const partyData = {
                businessId: business_id,
                entry_number: req.body.entry_number || null,
                partyName: req.body.partyName,
                phoneNumber: req.body.phoneNumber,
                partyType: req.body.partyType,
                openingBalance: req.body.openingBalance,
                balanceType: req.body.balanceType,
                gstin: req.body.gstin,
                address: req.body.address
            };

            const party = await ZKhataParty.create(partyData);
            res.status(201).json({ success: true, data: party });
        } catch (error) {
            // Handle duplicate number error
            if (error.code === 'DUPLICATE_NUMBER') {
                return res.status(409).json({
                    success: false,
                    message: error.message,
                    code: 'DUPLICATE_NUMBER',
                    field: 'entry_number'
                });
            }

            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getParties(req, res) {
        try {
            const { business_id, type } = req.query;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const parties = await ZKhataParty.findByBusinessId(business_id, type || 'all');
            res.status(200).json({ success: true, data: parties });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getPartyById(req, res) {
        try {
            const { business_id } = req.query;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const party = await ZKhataParty.findById(req.params.id);
            if (!party || party.business_id !== parseInt(business_id)) {
                return res.status(404).json({ success: false, message: 'Party not found' });
            }
            res.status(200).json({ success: true, data: party });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Transaction Controllers
    static async addTransaction(req, res) {
        try {
            const { business_id, party_id } = req.body;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            let screenshotPath = req.body.imageUrl || null;
            if (req.file) {
                const normalizedPath = req.file.path.replace(/\\/g, '/');
                const uploadsIndex = normalizedPath.indexOf('/uploads');
                if (uploadsIndex !== -1) {
                    screenshotPath = normalizedPath.substring(uploadsIndex);
                } else {
                    screenshotPath = `/uploads/${req.file.filename}`;
                }
            }

            const transactionData = {
                partyId: party_id,
                businessId: business_id,
                amount: req.body.amount,
                type: req.body.type,
                date: req.body.date,
                description: req.body.description,
                imageUrl: screenshotPath
            };

            const transaction = await ZKhataTransaction.create(transactionData);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getTransactionsForParty(req, res) {
        try {
            const { business_id } = req.query;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const party = await ZKhataParty.findById(req.params.partyId);
            if (!party || party.business_id !== parseInt(business_id)) {
                return res.status(404).json({ success: false, message: 'Party not found' });
            }

            const transactions = await ZKhataTransaction.findByPartyId(req.params.partyId, business_id);

            // Inject virtual opening balance transaction if it exists
            if (party.opening_balance && parseFloat(party.opening_balance) > 0) {
                const openingTx = {
                    id: `opening-${party.id}`,
                    party_id: party.id,
                    business_id: party.business_id,
                    amount: party.opening_balance,
                    type: party.balance_type === 'Money In' ? 'payment_in' : 'payment_out',
                    date: party.created_at,
                    description: 'Opening Balance',
                    is_opening_balance: true
                };
                // Since transactions are DESC, the opening balance (oldest) goes at the end
                transactions.push(openingTx);
            }

            res.status(200).json({ success: true, data: transactions });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateParty(req, res) {
        try {
            const { business_id } = req.body;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const partyData = {
                partyName: req.body.partyName,
                phoneNumber: req.body.phoneNumber,
                partyType: req.body.partyType,
                openingBalance: req.body.openingBalance,
                balanceType: req.body.balanceType,
                gstin: req.body.gstin,
                address: req.body.address
            };

            const party = await ZKhataParty.update(req.params.id, business_id, partyData);
            if (!party) {
                return res.status(404).json({ success: false, message: 'Party not found or access denied' });
            }
            res.status(200).json({ success: true, data: party });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteParty(req, res) {
        try {
            const { business_id } = req.query;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const success = await ZKhataParty.delete(req.params.id, business_id);
            if (!success) {
                return res.status(404).json({ success: false, message: 'Party not found or access denied' });
            }
            res.status(200).json({ success: true, message: 'Party deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateTransaction(req, res) {
        try {
            const { business_id } = req.body;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            let screenshotPath = req.body.imageUrl;
            if (req.file) {
                const normalizedPath = req.file.path.replace(/\\/g, '/');
                const uploadsIndex = normalizedPath.indexOf('/uploads');
                if (uploadsIndex !== -1) {
                    screenshotPath = normalizedPath.substring(uploadsIndex);
                } else {
                    screenshotPath = `/uploads/${req.file.filename}`;
                }
            }

            const transactionData = {
                amount: req.body.amount,
                type: req.body.type,
                date: req.body.date,
                description: req.body.description,
                imageUrl: screenshotPath
            };

            const transaction = await ZKhataTransaction.update(req.params.id, business_id, transactionData);
            if (!transaction) {
                return res.status(404).json({ success: false, message: 'Transaction not found or access denied' });
            }
            res.status(200).json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteTransaction(req, res) {
        try {
            const { business_id } = req.query;
            const accessCheck = await validateBusinessAccess(req, business_id);
            if (!accessCheck.valid) {
                return res.status(403).json({ success: false, message: accessCheck.message });
            }

            const success = await ZKhataTransaction.delete(req.params.id, business_id);
            if (!success) {
                return res.status(404).json({ success: false, message: 'Transaction not found or access denied' });
            }
            res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ZKhataController;
