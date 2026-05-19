const PaymentOutModel = require('../models/paymentOutModel');
const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

// Get next predicted payment out number
exports.getNextNumber = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const nextNumber = await getUnifiedNextNumber(businessId, 'payment_out');
    res.status(200).json({
      success: true,
      data: nextNumber
    });
  } catch (error) {
    console.error('Error fetching next payment out number:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching next payment out number',
      error: error.message
    });
  }
};

// Get all payment outs
exports.getAll = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const paymentOuts = await PaymentOutModel.getAll(businessId);
    
    res.status(200).json({
      success: true,
      data: paymentOuts,
      message: 'Payment outs fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment outs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment outs',
      error: error.message
    });
  }
};

// Get payment out by ID
exports.getById = async (req, res) => {
  try {
    const { id, businessId } = req.params;
    
    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const paymentOut = await PaymentOutModel.getById(id, businessId);
    
    if (!paymentOut) {
      return res.status(404).json({ success: false, message: 'Payment out not found' });
    }

    res.status(200).json({
      success: true,
      data: paymentOut,
      message: 'Payment out fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment out:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment out',
      error: error.message
    });
  }
};

// Create payment out
exports.create = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { payment_number, party_id, amount_received, payment_discount, payment_date, payment_mode, payment_received_in, notes, status, is_invoice_linked, linked_invoices } = req.body;

    if (!businessId || !party_id || !payment_date || !payment_mode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields: party_id, payment_date, payment_mode' 
      });
    }

    const paymentOutId = await PaymentOutModel.create(businessId, {
      payment_number,
      party_id,
      amount_received,
      payment_discount,
      payment_date,
      payment_mode,
      payment_received_in,
      notes,
      status,
      is_invoice_linked,
      linked_invoices
    });

    res.status(201).json({
      success: true,
      data: { id: paymentOutId },
      message: 'Payment out created successfully'
    });
  } catch (error) {
    console.error('Error creating payment out:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'payment_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating payment out',
      error: error.message
    });
  }
};

// Update payment out
exports.update = async (req, res) => {
  try {
    const { id, businessId } = req.params;
    const { payment_number, amount_received, payment_discount, payment_date, payment_mode, payment_received_in, notes, status, is_invoice_linked, linked_invoices } = req.body;

    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const updated = await PaymentOutModel.update(id, businessId, {
      payment_number,
      amount_received,
      payment_discount,
      payment_date,
      payment_mode,
      payment_received_in,
      notes,
      status,
      is_invoice_linked,
      linked_invoices
    });

    if (!updated) {
      const exists = await PaymentOutModel.getById(id, businessId);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Payment out not found' });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment out updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment out:', error);

    // Handle duplicate number error
    if (error.code === 'DUPLICATE_NUMBER') {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_NUMBER',
        field: 'payment_number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating payment out',
      error: error.message
    });
  }
};

// Delete payment out
exports.delete = async (req, res) => {
  try {
    const { id, businessId } = req.params;

    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const deleted = await PaymentOutModel.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payment out not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Payment out deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment out:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment out',
      error: error.message
    });
  }
};

// Get payment outs by party
exports.getByParty = async (req, res) => {
  try {
    const { partyId, businessId } = req.params;

    if (!partyId || !businessId) {
      return res.status(400).json({ success: false, message: 'Party ID and Business ID are required' });
    }

    const paymentOuts = await PaymentOutModel.getByParty(partyId, businessId);

    res.status(200).json({
      success: true,
      data: paymentOuts,
      message: 'Payment outs fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment outs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment outs',
      error: error.message
    });
  }
};

// Get payment outs by date range
exports.getByDateRange = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { startDate, endDate } = req.query;

    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Business ID, startDate, and endDate are required' });
    }

    const paymentOuts = await PaymentOutModel.getByDateRange(businessId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: paymentOuts,
      message: 'Payment outs fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment outs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment outs',
      error: error.message
    });
  }
};

// Get payment outs by status
exports.getByStatus = async (req, res) => {
  try {
    const { businessId, status } = req.params;

    if (!businessId || !status) {
      return res.status(400).json({ success: false, message: 'Business ID and status are required' });
    }

    const paymentOuts = await PaymentOutModel.getByStatus(businessId, status);

    res.status(200).json({
      success: true,
      data: paymentOuts,
      message: 'Payment outs fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment outs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment outs',
      error: error.message
    });
  }
};
