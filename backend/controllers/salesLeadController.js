const SalesLead = require('../models/salesLeadModel');
const { generateInvoiceNumber, getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

const salesLeadController = {
  // Create a new sales lead
  create: async (req, res) => {
    try {
      const {
        business_id, lead_no, title, value, uoms, email, phone,
        source, probability, priority, date_added, assigned_to,
        status, closed_by, close_comment, activity_log, files
      } = req.body;

      if (!business_id) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      const leadData = {
        business_id,
        lead_no: lead_no || await generateInvoiceNumber(business_id, 'sales_lead'),
        title,
        value,
        uoms,
        email,
        phone,
        source,
        probability,
        priority,
        date_added,
        assigned_to,
        status: status || 'open',
        closed_by,
        close_comment,
        activity_log: activity_log || [{ time: new Date().toISOString(), note: 'Lead created' }],
        files,
        created_by: req.user.id
      };

      const id = await SalesLead.create(leadData);

      res.status(201).json({
        success: true,
        message: 'Sales lead created successfully',
        data: { id, ...leadData }
      });
    } catch (error) {
      console.error('Error creating sales lead:', error);
      res.status(500).json({ success: false, message: 'Error creating sales lead', error: error.message });
    }
  },

  // Get all sales leads
  getAll: async (req, res) => {
    try {
      const { business_id, status, search } = req.query;

      if (!business_id) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      const filters = { status, search };
      if (req.user.isSubUser) {
        filters.assigned_to = req.user.name;
        console.log(`[DEBUG] Sub-user '${req.user.name}' fetching leads for business '${business_id}'`);
      }
      
      console.log(`[DEBUG] SalesLead.getAll filters:`, filters);

      const leads = await SalesLead.getAll(business_id, filters);

      res.status(200).json({
        success: true,
        data: leads
      });
    } catch (error) {
      console.error('Error fetching sales leads:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales leads', error: error.message });
    }
  },

  // Get next lead number
  getNextNumber: async (req, res) => {
    try {
      const { business_id } = req.query;

      if (!business_id) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      const nextNumber = await getUnifiedNextNumber(business_id, 'sales_lead');

      res.status(200).json({
        success: true,
        data: { lead_no: nextNumber }
      });
    } catch (error) {
      console.error('Error getting next lead number:', error);
      res.status(500).json({ success: false, message: 'Error getting next lead number', error: error.message });
    }
  },

  // Get a specific sales lead by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;

      if (!business_id) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      const lead = await SalesLead.getById(id, business_id);

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Sales lead not found' });
      }

      // Restriction for sub-users
      if (req.user.isSubUser) {
        const assignedTo = lead.assigned_to ? lead.assigned_to.trim().toLowerCase() : '';
        const userName = req.user.name ? req.user.name.trim().toLowerCase() : '';
        
        if (assignedTo !== userName) {
          console.log(`[DEBUG] Access denied for sub-user '${req.user.name}': Lead assigned to '${lead.assigned_to}'`);
          return res.status(403).json({ success: false, message: 'Access denied: Lead not assigned to you' });
        }
      }

      res.status(200).json({
        success: true,
        data: lead
      });
    } catch (error) {
      console.error('Error fetching sales lead:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales lead', error: error.message });
    }
  },

  // Update a sales lead
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.body;
      const updateData = req.body;

      // Ensure business_id is extracted properly from either body or query to be safe
      const bId = business_id || req.query.business_id;

      if (!bId) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      // Check if lead exists
      const existingLead = await SalesLead.getById(id, bId);
      if (!existingLead) {
        return res.status(404).json({ success: false, message: 'Sales lead not found' });
      }

      // Restriction for sub-users
      if (req.user.isSubUser) {
        const assignedTo = existingLead.assigned_to ? existingLead.assigned_to.trim().toLowerCase() : '';
        const userName = req.user.name ? req.user.name.trim().toLowerCase() : '';
        
        if (assignedTo !== userName) {
          return res.status(403).json({ success: false, message: 'Access denied: Lead not assigned to you' });
        }
      }

      const success = await SalesLead.update(id, bId, updateData);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Sales lead updated successfully'
        });
      } else {
        res.status(400).json({ success: false, message: 'Failed to update sales lead' });
      }
    } catch (error) {
      console.error('Error updating sales lead:', error);
      res.status(500).json({ success: false, message: 'Error updating sales lead', error: error.message });
    }
  },

  // Delete a sales lead
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { business_id } = req.query;

      if (!business_id) {
        return res.status(400).json({ success: false, message: 'Business ID is required' });
      }

      // Check if lead exists and check permissions for sub-user
      const existingLead = await SalesLead.getById(id, business_id);
      if (!existingLead) {
        return res.status(404).json({ success: false, message: 'Sales lead not found' });
      }

      if (req.user.isSubUser) {
        const assignedTo = existingLead.assigned_to ? existingLead.assigned_to.trim().toLowerCase() : '';
        const userName = req.user.name ? req.user.name.trim().toLowerCase() : '';
        
        if (assignedTo !== userName) {
          return res.status(403).json({ success: false, message: 'Access denied: Lead not assigned to you' });
        }
      }

      const success = await SalesLead.delete(id, business_id);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Sales lead deleted successfully'
        });
      } else {
        res.status(404).json({ success: false, message: 'Sales lead not found or could not be deleted' });
      }
    } catch (error) {
      console.error('Error deleting sales lead:', error);
      res.status(500).json({ success: false, message: 'Error deleting sales lead', error: error.message });
    }
  }
};

module.exports = salesLeadController;
