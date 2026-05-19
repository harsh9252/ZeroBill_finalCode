const Inventory = require('../models/inventoryModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');
const { sanitizeFolderName } = require('../utils/fileUtils');

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

// Create a new inventory item
exports.createItem = async (req, res) => {
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
 
    
    const itemData = {
      business_id: businessId,
      ...req.body,
      category_id: req.body.category_id ? parseInt(req.body.category_id) : null
    };


    // Handle file upload if present
    if (req.file) {
      // Use simple root path as configured in Multer
      itemData.image_url = `/uploads/${req.file.filename}`;
    }

    // Validate required fields
    if (!itemData.item_name) {
      
      return res.status(400).json({
        success: false,
        message: 'Item name is required'
      });
    }

    if (!itemData.item_type || !['product', 'service'].includes(itemData.item_type)) {
      
      return res.status(400).json({
        success: false,
        message: 'Valid item type is required (product or service)'
      });
    }

       // Check if item code already exists for this business
    if (itemData.item_code) {
      const existingItem = await Inventory.findByCode(itemData.item_code, businessId);
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: `Item with code "${itemData.item_code}" already exists in your inventory.`,
          code: 'DUPLICATE_ITEM_CODE'
        });
      }
    }

    const itemId = await Inventory.create(itemData);
    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: { id: itemId }
    });
  } catch (error) {
    console.error('=== ERROR CREATING INVENTORY ITEM ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before adding inventory items.',
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
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
};

// Get all inventory items
exports.getAllItems = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);

    // Build filters
    const filters = {};

    if (req.query.item_type) {
      filters.item_type = req.query.item_type;
    }

    if (req.query.category_id) {
      filters.category_id = req.query.category_id;
    }

    if (req.query.low_stock_only === 'true') {
      filters.low_stock_only = true;
    }

    if (req.query.search) {
      filters.search = req.query.search;
    }

    const items = await Inventory.findByBusinessId(businessId, filters);

    res.status(200).json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);

    // Handle specific business-related errors
    if (error.code === 'NO_BUSINESS_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'No business found. Please create a business first before viewing inventory.',
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
      message: 'Failed to fetch inventory items',
      error: error.message
    });
  }
};

// Get inventory item by ID
exports.getItemById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const item = await Inventory.findById(id, businessId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

// Get inventory item by code
exports.getItemByCode = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { code } = req.params;

    const item = await Inventory.findByCode(code, businessId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

// Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    let itemData = req.body;

    // Handle file upload if present
    if (req.file) {
      // Use simple root path as configured in Multer
      itemData.image_url = `/uploads/${req.file.filename}`;
    }

    if (itemData.category_id !== undefined) {
      itemData.category_id = itemData.category_id ? parseInt(itemData.category_id) : null;
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
      if (itemData.item_name !== undefined && (!itemData.item_name || !itemData.item_name.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Item name cannot be empty'
        });
      }

      if (itemData.item_type && !['product', 'service'].includes(itemData.item_type)) {
        return res.status(400).json({
          success: false,
          message: 'Valid item type is required (product or service)'
        });
      }
    } else {
      // For FormData requests, do minimal validation
      if (itemData.item_name !== undefined && (!itemData.item_name || !itemData.item_name.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Item name cannot be empty'
        });
      }

      if (itemData.item_type && !['product', 'service'].includes(itemData.item_type)) {
        return res.status(400).json({
          success: false,
          message: 'Valid item type is required (product or service)'
        });
      }
    }

    const updated = await Inventory.update(id, businessId, itemData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or no changes made'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully'
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);

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
        message: 'No business found. Please create a business first before updating inventory.',
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
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const { quantity_change, reason } = req.body;

    if (quantity_change === undefined || quantity_change === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity change is required'
      });
    }

    const updated = await Inventory.updateStock(id, businessId, quantity_change, reason);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get stock history
exports.getStockHistory = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const history = await Inventory.getStockHistory(id, businessId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock history',
      error: error.message
    });
  }
};

// Delete inventory item (soft delete)
exports.deleteItem = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Inventory.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
};

// Hard delete inventory item
exports.hardDeleteItem = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Inventory.hardDelete(id, businessId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inventory item permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
};

// Get inventory statistics
exports.getInventoryStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const stats = await Inventory.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory statistics',
      error: error.message
    });
  }
};

// Get categories for a business
exports.getCategories = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const categories = await Inventory.getCategories(businessId);

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory categories',
      error: error.message
    });
  }
};
