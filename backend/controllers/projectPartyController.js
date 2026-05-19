const ProjectParty = require('../models/projectPartyModel');
const Business = require('../models/businessModel');
const ProjectExpense = require('../models/projectExpenseModel');

// Helper function to validate business access
const validateBusinessAccess = async (req, businessId) => {
  if (!businessId) {
    return { valid: false, message: 'Business ID is required' };
  }

  if (!req.user) {
    return { valid: false, message: 'User authentication required' };
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

exports.createProjectParty = async (req, res) => {
  try {
    const { project_expense_id, party_name, phone, email, business_id } = req.body;

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    // Verify project expense belongs to this business
    const expense = await ProjectExpense.findById(project_expense_id);
    if (!expense || expense.business_id !== parseInt(business_id)) {
      return res.status(404).json({ success: false, message: 'Project expense not found in this business' });
    }

    const party = await ProjectParty.create({
      projectExpenseId: project_expense_id,
      partyName: party_name,
      phone,
      email,
      businessId: business_id
    });

    res.status(201).json({ success: true, data: party });
  } catch (error) {
    console.error('Error creating project party:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getProjectParties = async (req, res) => {
  try {
    const { project_expense_id } = req.params;
    
    // Check access via the project expense's business
    const expense = await ProjectExpense.findById(project_expense_id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Project expense not found' });
    }

    const accessCheck = await validateBusinessAccess(req, expense.business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    const parties = await ProjectParty.findByProjectExpenseId(project_expense_id);

    res.json({ success: true, data: parties });
  } catch (error) {
    console.error('Error fetching project parties:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateProjectParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { party_name, phone, email } = req.body;

    const existingParty = await ProjectParty.findById(id);
    if (!existingParty) {
      return res.status(404).json({ success: false, message: 'Project party not found' });
    }

    const accessCheck = await validateBusinessAccess(req, existingParty.business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    const party = await ProjectParty.update(id, {
      partyName: party_name,
      phone,
      email
    });

    res.json({ success: true, data: party });
  } catch (error) {
    console.error('Error updating project party:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteProjectParty = async (req, res) => {
  try {
    const { id } = req.params;

    const existingParty = await ProjectParty.findById(id);
    if (!existingParty) {
      return res.status(404).json({ success: false, message: 'Project party not found' });
    }

    const accessCheck = await validateBusinessAccess(req, existingParty.business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    await ProjectParty.delete(id);
    res.json({ success: true, message: 'Project party deleted successfully' });
  } catch (error) {
    console.error('Error deleting project party:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
