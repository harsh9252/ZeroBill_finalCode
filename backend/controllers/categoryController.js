const Category = require('../models/categoryModel');
const Business = require('../models/businessModel');

// Helper function to get business ID (similar to partyController)
const getBusinessId = async (req) => {
  let businessId = req.query.business_id || req.body.business_id;
  
  if (businessId) {
    if (req.user.isSubUser) {
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        throw new Error('Invalid business access');
      }
      return businessId;
    } else {
      const business = await Business.findById(businessId);
      if (!business || business.user_id !== req.user.id) {
        throw new Error('Invalid business ID or access denied');
      }
      return businessId;
    }
  }
  
  if (req.user.isSubUser) {
    return req.user.accessibleBusinessIds[0];
  } else {
    const businesses = await Business.findByUserId(req.user.id);
    return businesses[0].id;
  }
};

// Get all categories for a business
const getAllCategories = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const categories = await Category.findByBusinessId(businessId);
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Check if category already exists for this business
    const existing = await Category.findByName(businessId, name);
    if (existing) {
      return res.status(200).json({ // Return existing if already there (for frontend "add if not exists" logic)
        success: true,
        data: existing,
        message: 'Category already exists'
      });
    }

    const categoryId = await Category.create({
      business_id: businessId,
      name
    });

    const newCategory = await Category.findById(categoryId, businessId);

    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    const deleted = await Category.delete(id, businessId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  deleteCategory
};
