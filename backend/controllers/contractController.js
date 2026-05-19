const Contract = require('../models/contractModel');
const ContractPage = require('../models/contractPageModel');
const DOMPurify = require('isomorphic-dompurify');

const sanitizePages = (pages) => {
    if (!Array.isArray(pages)) return pages;
    return pages.map(page => ({
        ...page,
        content: page.content ? DOMPurify.sanitize(page.content) : page.content
    }));
};


exports.createContract = async (req, res) => {
    try {
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const contractData = { ...req.body, business_id };
        const newContract = await Contract.create(contractData);

        // Sync contract_pages if provided
        if (req.body.contract_pages && Array.isArray(req.body.contract_pages)) {
            const sanitizedPages = sanitizePages(req.body.contract_pages);
            await ContractPage.syncContractPages(newContract.id, business_id, sanitizedPages);
        }


        res.status(201).json({
            success: true,
            message: 'Contract created successfully',
            data: newContract
        });
    } catch (error) {
        console.error('Error creating contract:', error);

        // Handle duplicate number error
        if (error.code === 'DUPLICATE_NUMBER') {
            return res.status(409).json({
                success: false,
                message: error.message,
                code: 'DUPLICATE_NUMBER',
                field: 'contract_number'
            });
        }

        res.status(500).json({ success: false, message: 'Failed to create contract', error: error.message });
    }
};

exports.getAllContracts = async (req, res) => {
    try {
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const contracts = await Contract.getAllByBusiness(business_id);
        res.status(200).json({ success: true, data: contracts });
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contracts', error: error.message });
    }
};

exports.getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const contract = await Contract.getById(id, business_id);
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }

        // Fetch pages for this contract
        const pages = await ContractPage.getByContractId(id, business_id);
        contract.contract_pages = pages;

        res.status(200).json({ success: true, data: contract });
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contract', error: error.message });
    }
};

exports.updateContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const success = await Contract.update(id, business_id, req.body);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Contract not found or no changes made' });
        }

        // Sync contract_pages if provided
        if (req.body.contract_pages && Array.isArray(req.body.contract_pages)) {
            const sanitizedPages = sanitizePages(req.body.contract_pages);
            await ContractPage.syncContractPages(id, business_id, sanitizedPages);
        }


        res.status(200).json({ success: true, message: 'Contract updated successfully' });
    } catch (error) {
        console.error('Error updating contract:', error);
        res.status(500).json({ success: false, message: 'Failed to update contract', error: error.message });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const success = await Contract.delete(id, business_id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }

        res.status(200).json({ success: true, message: 'Contract deleted successfully' });
    } catch (error) {
        console.error('Error deleting contract:', error);
        res.status(500).json({ success: false, message: 'Failed to delete contract', error: error.message });
    }
};

exports.getNextContractNumber = async (req, res) => {
    try {
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

        // Get unified next number for contract
        const nextNumber = await getUnifiedNextNumber(business_id, 'contract');

        res.status(200).json({
            success: true,
            data: {
                contract_number: nextNumber
            }
        });
    } catch (error) {
        console.error('Error getting next contract number:', error);
        res.status(500).json({ success: false, message: 'Failed to get next contract number', error: error.message });
    }
};

exports.togglePageLock = async (req, res) => {
    try {
        const { id } = req.params; // Page ID
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await ContractPage.toggleLock(id, business_id);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Error toggling page lock:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle page lock', error: error.message });
    }
};

exports.getLockedContractPages = async (req, res) => {
    try {
        const { business_id } = req.query;
        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const pages = await ContractPage.getLockedPagesByBusinessId(business_id);
        res.status(200).json({ success: true, data: pages });
    } catch (error) {
        console.error('Error fetching locked contract pages:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch locked pages', error: error.message });
    }
};
