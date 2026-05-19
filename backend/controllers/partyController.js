const Party = require('../models/partyModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');

// Helper function to get business ID
const getBusinessId = async (req) => {
  // First, check if business_id is provided in query or body
  let businessId = req.query.business_id || req.body.business_id;

  if (businessId) {
    // Handle subuser access
    if (req.user.isSubUser) {
      // For subusers, check if business is in their accessible businesses
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        const error = new Error('Invalid business access - subuser not authorized for this business');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    } else {
      // For regular users, verify the business belongs to them
      const business = await Business.findById(businessId);
      if (!business || business.user_id !== req.user.id) {
        const error = new Error('Invalid business ID or access denied');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    }
  }

  // If not provided, get user's first accessible business
  if (req.user.isSubUser) {
    // For subusers, use first accessible business
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      const error = new Error('No accessible businesses found for this subuser.');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return req.user.accessibleBusinessIds[0];
  } else {
    // For regular users, get their first active business
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses || businesses.length === 0) {
      const error = new Error('No business found for this user. Please create a business first.');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return businesses[0].id;
  }
};

// Helper to parse address arrays from various input formats (multer multi-value, JSON string, or Array)
const parseArray = (val) => {
  if (val === undefined) return undefined;
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap(item => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          return [item];
        }
      }
      return [item];
    });
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return [val];
    }
  }
  return [val];
};

// Helper function to safely extract and trim string values
const safeExtract = (value) => {
  if (value === undefined || value === null) return null;
  const stripped = String(value).trim();
  return stripped === '' ? null : stripped;
};

// Create a new party
exports.createParty = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const businessId = await getBusinessId(req);

    // Helper function to safely extract and trim string values
    const safeExtract = (value) => {
      if (value === undefined || value === null) return null;
      const stripped = String(value).trim();
      return stripped === '' ? null : stripped;
    };

    let billingAddresses = parseArray(req.body.billingAddresses) || [];
    let shippingAddresses = parseArray(req.body.shippingAddresses) || [];




    // If no arrays provided but individual fields exist, construct the array for the model
    if (billingAddresses.length === 0 && (req.body.billing_address || req.body.city || req.body.state || req.body.pincode)) {
      billingAddresses.push({
        line1: safeExtract(req.body.billing_address) || '',
        city: safeExtract(req.body.city),
        state: safeExtract(req.body.state),
        pincode: safeExtract(req.body.pincode),
        country: safeExtract(req.body.country)
      });
    }

    if (shippingAddresses.length === 0) {
      shippingAddresses.push({
        attention: safeExtract(req.body.shipping_attention),
        line1: safeExtract(req.body.shipping_address) || '',
        line2: safeExtract(req.body.shipping_line2),
        city: safeExtract(req.body.ship_city),
        state: safeExtract(req.body.ship_state),
        pincode: safeExtract(req.body.ship_pincode),
        country: safeExtract(req.body.ship_country),
        phone: safeExtract(req.body.shipping_phone),
        fax: safeExtract(req.body.shipping_fax)
      });
    } else if (billingAddresses.length > 0) {
      // Default to billing address if no shipping provided
      shippingAddresses = [...billingAddresses];
    }


    let logoUrl = null;
    if (req.file) {
      const relativePath = req.file.path.split(/uploads[\\\/]/)[1];
      logoUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }



    // Accept all party-related fields
    const partyData = {
      business_id: businessId,
      party_type: safeExtract(req.body.party_type) || 'customer',
      party_name: safeExtract(req.body.name),
      trade_name: safeExtract(req.body.trade_name),
      category: safeExtract(req.body.category),
      category_id: req.body.category_id ? parseInt(req.body.category_id) : undefined,
      phone_number: safeExtract(req.body.phone_number),
      email: safeExtract(req.body.email),
      billing_address: safeExtract(req.body.billing_address),
      shipping_address: safeExtract(req.body.shipping_address),
      city: safeExtract(req.body.city),
      state: safeExtract(req.body.state),
      pincode: safeExtract(req.body.pincode),
      country: safeExtract(req.body.country),
      ship_city: safeExtract(req.body.ship_city),
      ship_state: safeExtract(req.body.ship_state),
      ship_pincode: safeExtract(req.body.ship_pincode),
      ship_country: safeExtract(req.body.ship_country),
      billingAddresses: billingAddresses,
      shippingAddresses: shippingAddresses,
      gstin: safeExtract(req.body.gstin),
      vat: safeExtract(req.body.vat),
      no_tax: req.body.no_tax === true || req.body.no_tax === 'true',
      opening_balance: req.body.opening_balance ? parseFloat(req.body.opening_balance) : 0,
      balance_type: safeExtract(req.body.balance_type) || 'receivable',
      credit_limit: req.body.credit_limit ? parseFloat(req.body.credit_limit) : 0,
      credit_days: req.body.credit_days ? parseInt(req.body.credit_days) : 0,
      pan_number: safeExtract(req.body.pan_number),
      bank_name: safeExtract(req.body.bank_name),
      bank_branch: safeExtract(req.body.bank_branch),
      account_number: safeExtract(req.body.account_number),
      ifsc_code: safeExtract(req.body.ifsc_code),
      notes: safeExtract(req.body.notes),
      contact_person_name: safeExtract(req.body.contact_person_name),
      contact_person_phone: safeExtract(req.body.contact_person_phone),
      logo: logoUrl,
    };




    // Validate required fields
    if (!partyData.party_name) {
      return res.status(400).json({
        success: false,
        message: 'Party name is required'
      });
    }

    const partyId = await Party.create(partyData);

    // Fetch the created party to return full data
    const createdParty = await Party.findById(partyId, businessId);


    res.status(201).json({
      success: true,
      message: 'Party created successfully',
      data: createdParty
    });
  } catch (error) {
    console.error('Error creating party:', error);

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before adding parties.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create party',
      error: error.message
    });
  }
};

// Get all parties
exports.getAllParties = async (req, res) => {
  try {
    // Check if business_id is provided in query params, otherwise use default
    let businessId = req.query.business_id;

    if (businessId) {
      // Handle subuser access
      if (req.user.isSubUser) {
        // For subusers, check if business is in their accessible businesses
        if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
          return res.status(403).json({
            success: false,
            message: 'Invalid business access - subuser not authorized for this business',
            code: 'INVALID_BUSINESS'
          });
        }
      } else {
        // For regular users, verify the business belongs to them
        const business = await Business.findById(businessId);
        if (!business || business.user_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Invalid business access',
            code: 'INVALID_BUSINESS'
          });
        }
      }
    } else {
      // If not provided, get user's first accessible business
      businessId = await getBusinessId(req);
    }


    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required. Please ensure you are logged in with a valid business.'
      });
    }

    // Only include filters that have actual values
    // Note: By default, only active parties (is_active = TRUE) are returned
    const filters = {};

    if (req.query.party_type) {
      filters.party_type = req.query.party_type;
    }

    if (req.query.is_active !== undefined && req.query.is_active !== '') {
      filters.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      filters.search = req.query.search;
    }

    if (req.query.category_id) {
      filters.category_id = req.query.category_id;
    }


    const parties = await Party.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: parties,
      count: parties.length
    });
  } catch (error) {
    console.error('Error fetching parties:', error);

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before viewing parties.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch parties',
      error: error.message
    });
  }
};

// Get party by ID
exports.getPartyById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const party = await Party.findById(id, businessId);

    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    res.status(200).json({
      success: true,
      data: party
    });
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch party',
      error: error.message
    });
  }
};

// Update party
exports.updateParty = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    let partyData = req.body;

    // Convert 'name' field to 'party_name' for consistency
    if (partyData.name !== undefined && partyData.party_name === undefined) {

      partyData.party_name = partyData.name;
      delete partyData.name;
    }

    if (partyData.category_id !== undefined) {
      partyData.category_id = partyData.category_id ? parseInt(partyData.category_id) : null;
    }

    // Parse address arrays
    partyData.billingAddresses = parseArray(partyData.billingAddresses);
    partyData.shippingAddresses = parseArray(partyData.shippingAddresses);

    // Ensure we have arrays even if undefined, but only if we want to default or construct from fields
    const billingProvided = Array.isArray(partyData.billingAddresses) && partyData.billingAddresses.length > 0;
    const shippingProvided = Array.isArray(partyData.shippingAddresses) && partyData.shippingAddresses.length > 0;

    if (!shippingProvided) {
      partyData.shippingAddresses = [{
        attention: safeExtract(req.body.shipping_attention),
        line1: safeExtract(req.body.shipping_address) || '',
        line2: safeExtract(req.body.shipping_line2),
        city: safeExtract(req.body.ship_city),
        state: safeExtract(req.body.ship_state),
        pincode: safeExtract(req.body.ship_pincode),
        country: safeExtract(req.body.ship_country),
        phone: safeExtract(req.body.shipping_phone),
        fax: safeExtract(req.body.shipping_fax)
      }];
    }

    if (!billingProvided && (req.body.billing_address || req.body.city || req.body.state || req.body.pincode)) {
      partyData.billingAddresses = [{
        line1: safeExtract(req.body.billing_address) || '',
        city: safeExtract(req.body.city),
        state: safeExtract(req.body.state),
        pincode: safeExtract(req.body.pincode),
        country: safeExtract(req.body.country)
      }];
    }




    // Parse no_tax field to boolean (FormData sends strings)
    if (partyData.no_tax !== undefined) {
      partyData.no_tax = partyData.no_tax === true || partyData.no_tax === 'true';
    }

    // Handle file upload if present
    if (req.file) {
      // Create logo URL from uploaded file using the actual relative path
      const relativePath = req.file.path.split(/uploads[\\\/]/)[1];
      const logoUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
      partyData.logo = logoUrl;
    }

    // Check if this is a FormData request (has file or FormData content-type)
    const isFormData = req.file || (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data'));

    if (!isFormData) {
      // For JSON requests, validate using express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Additional validation for JSON requests
      if (partyData.party_name !== undefined && (!partyData.party_name || !partyData.party_name.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Party name cannot be empty'
        });
      }

      if (partyData.party_type && !['customer', 'vendor', 'both'].includes(partyData.party_type)) {

      }
    } else {
      // For FormData requests, do minimal validation
      if (partyData.party_name !== undefined && (!partyData.party_name || !partyData.party_name.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Party name cannot be empty'
        });
      }

      if (partyData.party_type && !['customer', 'vendor', 'both'].includes(partyData.party_type)) {

      }
    }

    const updated = await Party.update(id, businessId, partyData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Party not found or no changes made'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Party updated successfully'
    });
  } catch (error) {
    console.error('Error updating party:', error);

    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    if (error.message && error.message.includes('Only image files are allowed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before updating parties.',
        code: 'NO_BUSINESS_FOUND',
        action: 'CREATE_BUSINESS'
      });
    }

    if (error.code === 'INVALID_BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'Invalid business access',
        code: 'INVALID_BUSINESS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update party',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete party (soft delete)
exports.deleteParty = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Party.hardDelete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Party deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete party',
      error: error.message
    });
  }
};

// Hard delete party
exports.hardDeleteParty = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Party.hardDelete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Party permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting party:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete party',
      error: error.message
    });
  }
};

// Get party statistics
exports.getPartyStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await Party.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching party stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch party statistics',
      error: error.message
    });
  }
};

// Get all addresses for a party
exports.getPartyAddresses = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    // First verify party belongs to this business
    const party = await Party.findById(id, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Get all addresses for this party
    const Address = require('../models/addressModel');
    const addresses = await Address.findByPartyId(id);

    res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Error fetching party addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch party addresses',
      error: error.message
    });
  }
};

// Add a new address to a party
exports.addPartyAddress = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const addressData = req.body;

    // Verify party belongs to this business
    const party = await Party.findById(id, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    const Address = require('../models/addressModel');
    const insertId = await Address.create({
      ...addressData,
      party_id: id
    });

    const newAddress = await Address.findById(insertId);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: newAddress
    });
  } catch (error) {
    console.error('Error adding party address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: error.message
    });
  }
};

// Update a party address
exports.updatePartyAddress = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id, addressId } = req.params;
    const addressData = req.body;

    // Verify party belongs to this business
    const party = await Party.findById(id, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    const Address = require('../models/addressModel');
    // Verify address belongs to this party
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress || existingAddress.party_id !== parseInt(id)) {
      return res.status(404).json({
        success: false,
        message: 'Address not found for this party'
      });
    }

    const updated = await Address.update(addressId, addressData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or no changes made'
      });
    }

    const updatedAddress = await Address.findById(addressId);

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress
    });
  } catch (error) {
    console.error('Error updating party address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
};

// Delete a party address
exports.deletePartyAddress = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id, addressId } = req.params;

    // Verify party belongs to this business
    const party = await Party.findById(id, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    const Address = require('../models/addressModel');
    // Verify address belongs to this party
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress || existingAddress.party_id !== parseInt(id)) {
      return res.status(404).json({
        success: false,
        message: 'Address not found for this party'
      });
    }

    const deleted = await Address.delete(addressId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting party address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
};


// ==================== PARTY BANK DETAILS ENDPOINTS ====================

const BankDetails = require('../models/bankDetailsModel');

// Get all bank accounts for a party
exports.getPartyBankAccounts = async (req, res) => {
  try {
    const { partyId } = req.params;
    const businessId = await getBusinessId(req);

    // Verify party belongs to business
    const party = await Party.findById(partyId, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    const bankAccounts = await BankDetails.findByPartyId(partyId);

    res.json({
      success: true,
      data: bankAccounts,
      count: bankAccounts.length
    });
  } catch (error) {
    console.error('Error fetching party bank accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch party bank accounts',
      error: error.message
    });
  }
};

// Add bank account to party
exports.addPartyBankAccount = async (req, res) => {
  try {
    const { partyId } = req.params;
    const businessId = await getBusinessId(req);

    // Verify party belongs to business
    const party = await Party.findById(partyId, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    const { bankName, accountNumber, ifsc, branch, upi, accountHolderName } = req.body;

    // Validate required fields
    if (!bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bank name and account number are required'
      });
    }

    // Check for duplicate account number
    const isDuplicate = await BankDetails.checkDuplicateAccount(
      accountNumber,
      null,
      partyId
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'This account number already exists for this party'
      });
    }

    const bankAccount = await BankDetails.create({
      partyId,
      bankName,
      accountNumber,
      ifsc,
      branch,
      upi,
      accountHolderName
    });

    res.status(201).json({
      success: true,
      message: 'Bank account added successfully',
      data: bankAccount
    });
  } catch (error) {
    console.error('Error adding party bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bank account',
      error: error.message
    });
  }
};

// Update party bank account
exports.updatePartyBankAccount = async (req, res) => {
  try {
    const { partyId, bankId } = req.params;
    const businessId = await getBusinessId(req);

    // Verify party belongs to business
    const party = await Party.findById(partyId, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Verify bank account belongs to party
    const existingBank = await BankDetails.findById(bankId);
    if (!existingBank || existingBank.party_id !== parseInt(partyId)) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found for this party'
      });
    }

    const { bankName, accountNumber, ifsc, branch, upi, accountHolderName } = req.body;

    // Check for duplicate account number (excluding current account)
    if (accountNumber) {
      const isDuplicate = await BankDetails.checkDuplicateAccount(
        accountNumber,
        null,
        partyId,
        bankId
      );

      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: 'This account number already exists for this party'
        });
      }
    }

    const updatedBank = await BankDetails.update(bankId, {
      bankName,
      accountNumber,
      ifsc,
      branch,
      upi,
      accountHolderName
    });

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: updatedBank
    });
  } catch (error) {
    console.error('Error updating party bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank account',
      error: error.message
    });
  }
};

// Delete party bank account
exports.deletePartyBankAccount = async (req, res) => {
  try {
    const { partyId, bankId } = req.params;
    const businessId = await getBusinessId(req);

    // Verify party belongs to business
    const party = await Party.findById(partyId, businessId);
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Verify bank account belongs to party
    const existingBank = await BankDetails.findById(bankId);
    if (!existingBank || existingBank.party_id !== parseInt(partyId)) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found for this party'
      });
    }

    const deleted = await BankDetails.delete(bankId);

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
    console.error('Error deleting party bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error.message
    });
  }
};
