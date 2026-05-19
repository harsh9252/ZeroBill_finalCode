const BankDetails = require('../models/bankDetailsModel');
const Business = require('../models/businessModel');

// Helper function to validate business access for subusers
const validateBusinessAccess = async (req, businessId) => {
  if (!businessId) {
    return { valid: false, message: 'Business ID is required' };
  }

  // If subuser, check if they have access to this business
  if (req.user.isSubUser) {
    if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
      return { valid: false, message: 'Access denied: You do not have permission to access this business' };
    }
  } else {
    // For regular users, verify the business belongs to them
    const business = await Business.findById(businessId);
    if (!business || business.user_id !== req.user.id) {
      return { valid: false, message: 'Invalid business access' };
    }
  }

  return { valid: true };
};

// Create a new bank account
const createBankAccount = async (req, res) => {
  try {
    const { business_id, bank_name, account_number, ifsc, branch, upi, account_holder_name, qr_code } = req.body;
    // Validate required fields
    if (!business_id || !bank_name || !account_number) {
      return res.status(400).json({
        success: false,
        message: 'Business ID, bank name, and account number are required'
      });
    }

    // Validate business access
    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Check for duplicate account number
    const isDuplicate = await BankDetails.checkDuplicateAccount(account_number, business_id, null);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Account number already exists for this business'
      });
    }

    const bankData = {
      businessId: business_id,
      bankName: bank_name,
      accountNumber: account_number,
      ifsc,
      branch,
      upi,
      accountHolderName: account_holder_name,
      qrCode: qr_code
    };

    const newBank = await BankDetails.create(bankData);

    res.status(201).json({
      success: true,
      message: 'Bank account created successfully',
      data: newBank
    });
  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: 'Failed to create bank account',
      error: error.message
    });
  }
};

// Get all bank accounts for a business
const getBankAccounts = async (req, res) => {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Validate business access
    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const banks = await BankDetails.findByBusinessId(business_id);

    res.json({
      success: true,
      data: banks
    });
  } catch (error) {
  
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank accounts',
      error: error.message
    });
  }
};

// Get bank account by ID
const getBankAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const bank = await BankDetails.findById(id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      data: bank
    });
  } catch (error) {
  
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank account',
      error: error.message
    });
  }
};

// Update bank account
const updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id, bank_name, account_number, ifsc, branch, upi, account_holder_name, qr_code } = req.body;
    // Validate required fields
    if (!business_id || !bank_name || !account_number) {
      return res.status(400).json({
        success: false,
        message: 'Business ID, bank name, and account number are required'
      });
    }

    // Validate business access
    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    // Check for duplicate account number (excluding current record)
    const isDuplicate = await BankDetails.checkDuplicateAccount(account_number, business_id, null, id);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Account number already exists for this business'
      });
    }

    const bankData = {
      bankName: bank_name,
      accountNumber: account_number,
      ifsc,
      branch,
      upi,
      accountHolderName: account_holder_name,
      qrCode: qr_code
    };

    const updatedBank = await BankDetails.update(id, bankData, business_id);

    if (!updatedBank) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: updatedBank
    });
  } catch (error) {
  
    res.status(500).json({
      success: false,
      message: `Failed to update bank account: ${error.message}`,
      error: error.message
    });
  }
};

// Delete bank account
const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Validate business access
    const accessCheck = await validateBusinessAccess(req, business_id);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        message: accessCheck.message
      });
    }

    const deleted = await BankDetails.delete(id, business_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
 
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error.message
    });
  }
};

module.exports = {
  createBankAccount,
  getBankAccounts,
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount
};
