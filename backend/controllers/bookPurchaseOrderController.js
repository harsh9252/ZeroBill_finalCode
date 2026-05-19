const BookPurchaseOrder = require('../models/bookPurchaseOrderModel');
const Business = require('../models/businessModel');
const { validationResult } = require('express-validator');

const getBusinessId = async (req) => {
  let businessId = req.query.business_id || req.body.business_id;

  if (businessId) {
    if (req.user.isSubUser) {
      if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
        const error = new Error('Invalid business access');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    } else {
      const business = await Business.findById(businessId);
      if (!business || business.user_id !== req.user.id) {
        const error = new Error('Invalid business access');
        error.code = 'INVALID_BUSINESS';
        throw error;
      }
      return businessId;
    }
  }

  if (req.user.isSubUser) {
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      const error = new Error('No accessible businesses found');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return req.user.accessibleBusinessIds[0];
  } else {
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses || businesses.length === 0) {
      const error = new Error('No business found');
      error.code = 'NO_BUSINESS_FOUND';
      throw error;
    }
    return businesses[0].id;
  }
};

exports.createBookPurchaseOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const businessId = await getBusinessId(req);

    const orderData = {
      business_id: businessId,
      book_purchase_order_number: req.body.book_purchase_order_number || null,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      order_date: req.body.order_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      total_amount: parseFloat(req.body.total_amount) || 0,
      discount_amount: parseFloat(req.body.discount_amount) || 0,
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      grand_total: parseFloat(req.body.grand_total) || 0,
      notes: req.body.notes,
      bank_id: req.body.bank_id,
      created_by: req.user.isSubUser ? req.user.parentUserId : req.user.id,
      book_purchase_order_data: req.body.book_purchase_order_data || req.body.order_data || req.body.line_items || {},
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };

    const orderId = await BookPurchaseOrder.create(orderData);

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('bookPurchaseOrder', orderId, orderData.party_id, businessId, req.body.terms_sections);
    }

    res.status(201).json({
      success: true,
      message: 'Book Purchase Order created successfully',
      data: {
        id: orderId,
        ...orderData
      }
    });
  } catch (error) {
    console.error('Error creating book purchase order:', error);
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'book_purchase_order_number'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create book purchase order',
      error: error.message
    });
  }
};

exports.getAllBookPurchaseOrders = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const filters = {
      status: req.query.status,
      party_id: req.query.party_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };
    const orders = await BookPurchaseOrder.findByBusinessId(businessId, filters);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching book purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book purchase orders',
      error: error.message
    });
  }
};

exports.getBookPurchaseOrderById = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const order = await BookPurchaseOrder.findById(id, businessId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Book Purchase Order not found'
      });
    }
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching book purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book purchase order',
      error: error.message
    });
  }
};

exports.updateBookPurchaseOrder = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID'
      });
    }

    const orderData = {
      book_purchase_order_number: req.body.book_purchase_order_number,
      party_id: req.body.party_id,
      party_name: req.body.party_name,
      order_date: req.body.order_date,
      status: req.body.status,
      total_amount: req.body.total_amount,
      discount_amount: req.body.discount_amount,
      tax_amount: req.body.tax_amount,
      grand_total: req.body.grand_total,
      notes: req.body.notes,
      bank_id: req.body.bank_id,
      book_purchase_order_data: req.body.book_purchase_order_data || req.body.order_data || req.body.line_items,
      po_agreement_number: req.body.po_agreement_number,
      remark: req.body.remark
    };

    const updated = await BookPurchaseOrder.update(id, businessId, orderData);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Book Purchase Order not found'
      });
    }

    // Handle terms sections if provided
    if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
      const TermsConditions = require('../models/termsConditionsModel');
      await TermsConditions.syncDocumentTerms('bookPurchaseOrder', id, orderData.party_id, businessId, req.body.terms_sections);
    }
    res.status(200).json({
      success: true,
      message: 'Book Purchase Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating book purchase order:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'book_purchase_order_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update book purchase order',
      error: error.message
    });
  }
};

exports.deleteBookPurchaseOrder = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { id } = req.params;
    const deleted = await BookPurchaseOrder.delete(id, businessId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Book Purchase Order not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Book Purchase Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting book purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book purchase order',
      error: error.message
    });
  }
};

exports.getNextNumber = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');
    const lastNumber = await BookPurchaseOrder.getLastOrderNumber(businessId);
    const nextNumber = await getUnifiedNextNumber(businessId, 'book_purchase_order');
    res.status(200).json({
      success: true,
      data: {
        order_number: nextNumber,
        lastNumber: lastNumber,
      }
    });
  } catch (error) {
    console.error('Error getting next BPO number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next number',
      error: error.message
    });
  }
};

module.exports = exports;
