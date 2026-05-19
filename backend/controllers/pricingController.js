const { pool } = require('../config/database');

// @desc    Get All Pricing Plans
// @route   GET /api/pricing
// @access  Public
exports.getAllPricingPlans = async (req, res) => {
  try {
    const [plans] = await pool.query(`
      SELECT 
        id,
        name,
        original_price,
        offer_price,
        period,
        description,
        features,
        is_active,
        display_order,
        featured_label,
        show_featured_label,
        max_subusers,
        max_businesses
      FROM pricing_plans
      WHERE is_active = true
      ORDER BY display_order ASC
    `);

    res.status(200).json({
      success: true,
      data: plans || []
    });
  } catch (error) {
    console.error('Get pricing plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing plans',
      error: error.message
    });
  }
};

// @desc    Get All Pricing Plans (Admin - includes inactive)
// @route   GET /api/superadmin/pricing
// @access  Private (SuperAdmin)
exports.getAllPricingPlansAdmin = async (req, res) => {
  try {
    const [plans] = await pool.query(`
      SELECT 
        id,
        name,
        original_price,
        offer_price,
        period,
        description,
        features,
        is_active,
        display_order,
        featured_label,
        show_featured_label,
        max_subusers,
        max_businesses,
        created_at,
        updated_at
      FROM pricing_plans
      ORDER BY display_order ASC
    `);

    res.status(200).json({
      success: true,
      data: plans || []
    });
  } catch (error) {
    console.error('Get pricing plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing plans',
      error: error.message
    });
  }
};

// @desc    Get Single Pricing Plan
// @route   GET /api/superadmin/pricing/:id
// @access  Private (SuperAdmin)
exports.getPricingPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [plans] = await pool.query(`
      SELECT * FROM pricing_plans WHERE id = ?
    `, [id]);

    if (!plans.length) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      data: plans[0]
    });
  } catch (error) {
    console.error('Get pricing plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing plan',
      error: error.message
    });
  }
};

// @desc    Create Pricing Plan
// @route   POST /api/superadmin/pricing
// @access  Private (SuperAdmin)
exports.createPricingPlan = async (req, res) => {
  try {
    const { name, original_price, offer_price, period, description, features, display_order, max_subusers, max_businesses } = req.body;

    if (!name || offer_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name and offer price are required'
      });
    }

    const featuresJson = JSON.stringify(features || []);

    const [result] = await pool.query(`
      INSERT INTO pricing_plans (name, original_price, offer_price, period, description, features, display_order, max_subusers, max_businesses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, original_price || null, offer_price, period || 'month', description || '', featuresJson, display_order || 0, max_subusers || 0, max_businesses || 1]);

    res.status(201).json({
      success: true,
      message: 'Pricing plan created successfully',
      data: {
        id: result.insertId,
        name,
        original_price,
        offer_price,
        period,
        description,
        features,
        max_subusers,
        max_businesses
      }
    });
  } catch (error) {
    console.error('Create pricing plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pricing plan',
      error: error.message
    });
  }
};

// @desc    Update Pricing Plan
// @route   PUT /api/superadmin/pricing/:id
// @access  Private (SuperAdmin)
exports.updatePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, original_price, offer_price, period, description, features, is_active, display_order, featured_label, show_featured_label, max_subusers, max_businesses } = req.body;

    const featuresJson = features ? JSON.stringify(features) : undefined;

    let updateQuery = 'UPDATE pricing_plans SET ';
    const updateValues = [];
    const updateFields = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (original_price !== undefined) {
      updateFields.push('original_price = ?');
      updateValues.push(original_price);
    }
    if (offer_price !== undefined) {
      updateFields.push('offer_price = ?');
      updateValues.push(offer_price);
    }
    if (period !== undefined) {
      updateFields.push('period = ?');
      updateValues.push(period);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (featuresJson !== undefined) {
      updateFields.push('features = ?');
      updateValues.push(featuresJson);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    if (display_order !== undefined) {
      updateFields.push('display_order = ?');
      updateValues.push(display_order);
    }
    if (featured_label !== undefined) {
      updateFields.push('featured_label = ?');
      updateValues.push(featured_label);
    }
    if (show_featured_label !== undefined) {
      updateFields.push('show_featured_label = ?');
      updateValues.push(show_featured_label);
    }
    if (max_subusers !== undefined) {
      updateFields.push('max_subusers = ?');
      updateValues.push(max_subusers);
    }
    if (max_businesses !== undefined) {
      updateFields.push('max_businesses = ?');
      updateValues.push(max_businesses);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    updateValues.push(id);

    const [result] = await pool.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pricing plan updated successfully'
    });
  } catch (error) {
    console.error('Update pricing plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pricing plan',
      error: error.message
    });
  }
};

// @desc    Delete Pricing Plan
// @route   DELETE /api/superadmin/pricing/:id
// @access  Private (SuperAdmin)
exports.deletePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(`
      DELETE FROM pricing_plans WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pricing plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete pricing plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pricing plan',
      error: error.message
    });
  }
};

// @desc    Toggle Pricing Plan Active Status
// @route   PUT /api/superadmin/pricing/:id/toggle
// @access  Private (SuperAdmin)
exports.togglePricingPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [plan] = await pool.query(`
      SELECT is_active FROM pricing_plans WHERE id = ?
    `, [id]);

    if (!plan.length) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    const newStatus = !plan[0].is_active;

    await pool.query(`
      UPDATE pricing_plans SET is_active = ? WHERE id = ?
    `, [newStatus, id]);

    res.status(200).json({
      success: true,
      message: `Pricing plan ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus }
    });
  } catch (error) {
    console.error('Toggle pricing plan status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pricing plan status',
      error: error.message
    });
  }
};

// @desc    Reorder Pricing Plans
// @route   PUT /api/pricing/admin/reorder
// @access  Private (SuperAdmin)
exports.reorderPricingPlans = async (req, res) => {
  try {
 
    const { plans } = req.body;
    if (!plans) {
      return res.status(400).json({
        success: false,
        message: 'plans field is required'
      });
    }

    if (!Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        message: 'plans must be an array'
      });
    }

    if (plans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'plans array cannot be empty'
      });
    }

    // Update display_order for each plan
    for (const plan of plans) {
      
      if (!plan.id) {
       
        return res.status(400).json({
          success: false,
          message: 'Each plan must have an id'
        });
      }

      if (plan.display_order === undefined || plan.display_order === null) {
    
        return res.status(400).json({
          success: false,
          message: 'Each plan must have a display_order'
        });
      }

      const [result] = await pool.query(`
        UPDATE pricing_plans SET display_order = ? WHERE id = ?
      `, [plan.display_order, plan.id]);

    }

    res.status(200).json({
      success: true,
      message: 'Pricing plans reordered successfully'
    });
  } catch (error) {
    console.error('Reorder pricing plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder pricing plans',
      error: error.message
    });
  }
};

// @desc    Update Featured Label
// @route   PUT /api/pricing/admin/:id/featured
// @access  Private (SuperAdmin)
exports.updateFeaturedLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { featured_label, show_featured_label } = req.body;

    if (show_featured_label === undefined) {
      return res.status(400).json({
        success: false,
        message: 'show_featured_label is required'
      });
    }

    const [result] = await pool.query(`
      UPDATE pricing_plans SET featured_label = ?, show_featured_label = ? WHERE id = ?
    `, [featured_label || null, show_featured_label, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Featured label updated successfully'
    });
  } catch (error) {
    console.error('Update featured label error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured label',
      error: error.message
    });
  }
};
