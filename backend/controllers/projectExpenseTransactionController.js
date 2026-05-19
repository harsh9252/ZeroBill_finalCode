const ProjectExpenseTransaction = require('../models/projectExpenseTransactionModel');
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

// Create a new transaction
exports.create = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { project_expense_id, amount, transaction_type, transaction_date, description, payment_method, party_name, party_phone, category } = req.body;

    if (!businessId || !project_expense_id || !amount || !transaction_type || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: `Required fields missing: ${!project_expense_id ? 'project_expense_id ' : ''}${!amount ? 'amount ' : ''}${!transaction_type ? 'transaction_type ' : ''}${!transaction_date ? 'transaction_date' : ''}`
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Verify project expense exists
    const expense = await ProjectExpense.findById(project_expense_id);
    if (!expense || expense.business_id !== parseInt(businessId)) {
      return res.status(404).json({
        success: false,
        message: 'Project expense not found'
      });
    }

    // Get screenshot path if file was uploaded
    let screenshotPath = null;
    if (req.file) {
      // Normalize path to use forward slashes and ensure it starts with /uploads/
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads/');
      if (uploadsIndex !== -1) {
        screenshotPath = '/' + normalizedPath.substring(uploadsIndex);
      } else {
        screenshotPath = `/uploads/${req.file.filename}`;
      }
    }

    const transactionData = {
      businessId: parseInt(businessId),
      projectExpenseId: project_expense_id,
      amount: parseFloat(amount),
      transactionType: transaction_type,
      transactionDate: transaction_date,
      description: description,
      paymentMethod: payment_method || 'bank',
      screenshot: screenshotPath,
      project_party_id: req.body.project_party_id,
      party_name: party_name,
      party_phone: party_phone,
      category: category
    };
    const transaction = await ProjectExpenseTransaction.create(transactionData);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

// Get all transactions for a project expense
exports.getByProjectExpenseId = async (req, res) => {
  try {
    const { businessId, projectExpenseId } = req.params;

    if (!businessId || !projectExpenseId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and Project Expense ID are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const transactions = await ProjectExpenseTransaction.findByProjectExpenseId(projectExpenseId);

    res.json({
      success: true,
      data: transactions,
      message: 'Transactions fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get all transactions for a business
exports.getByBusinessId = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const transactions = await ProjectExpenseTransaction.findByBusinessId(businessId);

    res.json({
      success: true,
      data: transactions,
      message: 'Transactions fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get transaction by ID
exports.getById = async (req, res) => {
  try {
    const { businessId, id } = req.params;

    if (!businessId || !id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and Transaction ID are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const transaction = await ProjectExpenseTransaction.findById(id);

    if (!transaction || transaction.business_id !== parseInt(businessId)) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
};

// Update transaction
exports.update = async (req, res) => {
  try {
    const { businessId, id } = req.params;
    const { amount, transaction_type, transaction_date, description, payment_method, project_party_id, party_name, party_phone, category } = req.body;

    if (!businessId || !id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and Transaction ID are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Get screenshot path if file was uploaded, otherwise keep existing
    let screenshotPath = undefined; // undefined means don't update this field
    if (req.file) {
      // Normalize path to use forward slashes and ensure it starts with /uploads/
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const uploadsIndex = normalizedPath.indexOf('uploads/');
      if (uploadsIndex !== -1) {
        screenshotPath = '/' + normalizedPath.substring(uploadsIndex);
      } else {
        screenshotPath = `/uploads/${req.file.filename}`;
      }
    }

    const transactionData = {
      amount: amount ? parseFloat(amount) : undefined,
      transactionType: transaction_type,
      transactionDate: transaction_date,
      description: description,
      paymentMethod: payment_method,
      screenshot: screenshotPath,
      project_party_id: project_party_id,
      party_name: party_name,
      party_phone: party_phone,
      category: category
    };

    // Only add screenshot if a new file was uploaded
    if (screenshotPath !== undefined) {
      transactionData.screenshot = screenshotPath;
    }

    const transaction = await ProjectExpenseTransaction.update(id, businessId, transactionData);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error.message
    });
  }
};

// Delete transaction
exports.delete = async (req, res) => {
  try {
    const { businessId, id } = req.params;

    if (!businessId || !id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and Transaction ID are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const deleted = await ProjectExpenseTransaction.delete(parseInt(id), parseInt(businessId));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message
    });
  }
};

// Get summary for a project expense
exports.getSummary = async (req, res) => {
  try {
    const { businessId, projectExpenseId } = req.params;

    if (!businessId || !projectExpenseId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and Project Expense ID are required'
      });
    }

    const accessCheck = await validateBusinessAccess(req, businessId);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const summary = await ProjectExpenseTransaction.getSummary(projectExpenseId);

    res.json({
      success: true,
      data: summary,
      message: 'Summary fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
};
