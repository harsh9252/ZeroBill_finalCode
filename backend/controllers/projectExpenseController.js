const ProjectExpense = require('../models/projectExpenseModel');
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

// Create a new project expense record
const createAccount = async (req, res) => {
  try {
    const {
      business_id,
      account_name,
      location,
      start_date,
      end_date,
      amount,
      remarks,
      project_type,
      value_breakdown,
      category,
      expense_number
    } = req.body;

    if (!business_id || !account_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Business ID, project name, start date, and end date are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const expenseData = {
      businessId: business_id,
      expenseNumber: expense_number,
      accountName: account_name,
      location: location,
      startDate: start_date,
      endDate: end_date,
      amount: amount || 0,
      remarks,
      projectType: project_type || 'payable',
      valueBreakdown: value_breakdown,
      category: category
    };

    const newExpense = await ProjectExpense.create(expenseData);

    res.status(201).json({
      success: true,
      message: 'Project expense created successfully',
      data: newExpense
    });
  } catch (error) {
    console.error('Error creating project expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create project expense',
      error: error.message
    });
  }
};

// Get all project expenses for a business
const getAccounts = async (req, res) => {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const expenses = await ProjectExpense.findByBusinessId(business_id);

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project expenses',
      error: error.message
    });
  }
};

// Get project expense by ID
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const expense = await ProjectExpense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Project expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching project expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project expense',
      error: error.message
    });
  }
};

// Update project expense
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      business_id,
      account_name,
      location,
      start_date,
      end_date,
      amount,
      remarks,
      project_type,
      value_breakdown,
      category,
      expense_number
    } = req.body;

    if (!business_id || !account_name) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and project name are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const expenseData = {
      expenseNumber: expense_number,
      accountName: account_name,
      location: location,
      startDate: start_date,
      endDate: end_date,
      amount: amount,
      remarks,
      projectType: project_type,
      valueBreakdown: value_breakdown,
      category: category
    };

    const updatedExpense = await ProjectExpense.update(id, business_id, expenseData);

    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Project expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Project expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Error updating project expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update project expense',
      error: error.message
    });
  }
};

// Delete project expense
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const deleted = await ProjectExpense.delete(id, business_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Project expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Project expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project expense',
      error: error.message
    });
  }
};

// Generate next project expense number
const getNextNumber = async (req, res) => {
  try {
    let businessId = req.query.business_id;

    if (!businessId) {
      if (req.user.isSubUser) {
        if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No accessible businesses found for this subuser.',
            code: 'NO_BUSINESS_FOUND'
          });
        }
        businessId = req.user.accessibleBusinessIds[0];
      } else {
        const Business = require('../models/businessModel');
        const businesses = await Business.findByUserId(req.user.id);
        if (!businesses || businesses.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No business found for this user. Please create a business first.',
            code: 'NO_BUSINESS_FOUND'
          });
        }
        businessId = businesses[0].id;
      }
    }

    const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

    const nextNumber = await getUnifiedNextNumber(businessId, 'project_expense');

    res.status(200).json({
      success: true,
      data: {
        expense_number: nextNumber
      }
    });
  } catch (error) {
    console.error('Error getting next project expense number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next project expense number',
      error: error.message
    });
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getNextNumber,
  // Placeholder methods to avoid route errors
  setDefaultAccount: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' }),
  addTransaction: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' }),
  getTransactions: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' }),
  syncBankDetails: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' }),
  getPartiesWithBalances: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' }),
  getTransactionsByParty: (req, res) => res.status(501).json({ success: false, message: 'Not implemented in simple view' })
};
