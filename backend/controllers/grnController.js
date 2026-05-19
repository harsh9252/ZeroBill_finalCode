const GRN = require('../models/grnModel');

const grnController = {
  create: async (req, res) => {
    try {
      const data = req.body;

      if (!data.business_id) {
        return res.status(400).json({ success: false, message: 'business_id is required' });
      }
      if (!data.grn_number) {
        return res.status(400).json({ success: false, message: 'grn_number is required' });
      }

      const exists = await GRN.checkNumberExists(data.grn_number, data.business_id);
      if (exists) {
        return res.status(400).json({ success: false, message: 'GRN number already exists', field: 'grn_number' });
      }

      const id = await GRN.create(data);
      const record = await GRN.findById(id, data.business_id);

      return res.status(201).json({ success: true, message: 'GRN created successfully', data: record });
    } catch (error) {
      console.error('Error creating GRN:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to create GRN' });
    }
  },

  getAll: async (req, res) => {
    try {
      const { business_id } = req.query;
      if (!business_id) return res.status(400).json({ success: false, message: 'business_id is required' });

      const records = await GRN.findByBusinessId(business_id);
      return res.json({ success: true, data: records });
    } catch (error) {
      console.error('Error fetching GRNs:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;
      const record = await GRN.findById(id, business_id);
      if (!record) return res.status(404).json({ success: false, message: 'GRN not found' });
      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;
      console.log('GRN Delete Request - ID:', id, 'Business ID:', business_id);
      const deleted = await GRN.delete(id, business_id);
      if (!deleted) return res.status(404).json({ success: false, message: 'GRN not found' });
      return res.json({ success: true, message: 'GRN deleted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      console.log('GRN Update - id:', id, 'business_id:', data.business_id);
      
      if (!id || id === 'undefined') return res.status(400).json({ success: false, message: 'GRN id is required' });
      if (!data.business_id) return res.status(400).json({ success: false, message: 'business_id is required' });

      const numericId = parseInt(id);
      const numericBusinessId = parseInt(data.business_id);
      
      if (isNaN(numericId)) return res.status(400).json({ success: false, message: 'Invalid GRN id' });

      if (data.grn_number) {
        const exists = await GRN.checkNumberExists(data.grn_number, numericBusinessId, numericId);
        if (exists) {
          return res.status(400).json({ success: false, message: 'GRN number already exists', field: 'grn_number' });
        }
      }

      const updated = await GRN.update(numericId, { ...data, business_id: numericBusinessId });
      if (!updated) return res.status(404).json({ success: false, message: 'GRN not found' });

      const record = await GRN.findById(numericId, numericBusinessId);
      return res.json({ success: true, message: 'GRN updated successfully', data: record });
    } catch (error) {
      console.error('Error updating GRN:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getNextNumber: async (req, res) => {
    try {
      const { business_id } = req.query;
      if (!business_id) return res.status(400).json({ success: false, message: 'business_id is required' });

      const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');
      const nextNumber = await getUnifiedNextNumber(business_id, 'grn');

      return res.json({ success: true, data: { grn_number: nextNumber } });
    } catch (error) {
      console.error('Error getting next GRN number:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = grnController;
