const MRN = require('../models/mrnModel');

const mrnController = {
  create: async (req, res) => {
    try {
      const data = req.body;
      if (!data.business_id) return res.status(400).json({ success: false, message: 'business_id is required' });
      if (!data.mrn_number && !data.grn_number) return res.status(400).json({ success: false, message: 'mrn_number is required' });

      const mrnNumber = data.mrn_number || data.grn_number;
      const exists = await MRN.checkNumberExists(mrnNumber, data.business_id);
      if (exists) {
        return res.status(400).json({ success: false, message: 'MRN number already exists', field: 'mrn_number' });
      }

      const id = await MRN.create(data);
      const record = await MRN.findById(id, data.business_id);
      return res.status(201).json({ success: true, message: 'MRN created successfully', data: record });
    } catch (error) {
      console.error('Error creating MRN:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to create MRN' });
    }
  },

  getAll: async (req, res) => {
    try {
      const { business_id } = req.query;
      if (!business_id) return res.status(400).json({ success: false, message: 'business_id is required' });
      const records = await MRN.findByBusinessId(business_id);
      return res.json({ success: true, data: records });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;
      const record = await MRN.findById(id, business_id);
      if (!record) return res.status(404).json({ success: false, message: 'MRN not found' });
      return res.json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;



      if (!id || id === 'undefined') return res.status(400).json({ success: false, message: 'MRN id is required' });
      if (!data.business_id) return res.status(400).json({ success: false, message: 'business_id is required' });

      const numericId = parseInt(id);
      const numericBusinessId = parseInt(data.business_id);

      if (isNaN(numericId)) return res.status(400).json({ success: false, message: 'Invalid MRN id' });

      if (data.mrn_number) {
        const exists = await MRN.checkNumberExists(data.mrn_number, numericBusinessId, numericId);
        if (exists) {
          return res.status(400).json({ success: false, message: 'MRN number already exists', field: 'mrn_number' });
        }
      }

      const updated = await MRN.update(numericId, { ...data, business_id: numericBusinessId });
      if (!updated) return res.status(404).json({ success: false, message: 'MRN not found' });

      const record = await MRN.findById(numericId, numericBusinessId);
      return res.json({ success: true, message: 'MRN updated successfully', data: record });
    } catch (error) {
      console.error('Error updating MRN:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;
      const deleted = await MRN.delete(id, business_id);
      if (!deleted) return res.status(404).json({ success: false, message: 'MRN not found' });
      return res.json({ success: true, message: 'MRN deleted successfully' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  getNextNumber: async (req, res) => {
    try {
      const { business_id } = req.query;
      if (!business_id) return res.status(400).json({ success: false, message: 'business_id is required' });

      const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');
      const nextNumber = await getUnifiedNextNumber(business_id, 'mrn');

      return res.json({ success: true, data: { mrn_number: nextNumber } });
    } catch (error) {
      console.error('Error getting next MRN number:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = mrnController;
