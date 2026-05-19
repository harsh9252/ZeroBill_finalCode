const PaymentInModel = require('../models/paymentInModel');
const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

// Get next predicted payment in number
exports.getNextNumber = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const nextNumber = await getUnifiedNextNumber(businessId, 'payment_in');
    res.status(200).json({
      success: true,
      data: nextNumber
    });
  } catch (error) {
    console.error('Error fetching next payment in number:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching next payment in number',
      error: error.message
    });
  }
};

// Get all payment ins
exports.getAll = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' });
    }

    const paymentIns = await PaymentInModel.getAll(businessId);
    
    res.status(200).json({
      success: true,
      data: paymentIns,
      message: 'Payment ins fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment ins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment ins',
      error: error.message
    });
  }
};

// Get payment in by ID
exports.getById = async (req, res) => {
  try {
    const { id, businessId } = req.params;
    
    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const paymentIn = await PaymentInModel.getById(id, businessId);
    
    if (!paymentIn) {
      return res.status(404).json({ success: false, message: 'Payment in not found' });
    }

    res.status(200).json({
      success: true,
      data: paymentIn,
      message: 'Payment in fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment in:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment in',
      error: error.message
    });
  }
};

// Create payment in
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

    const paymentInId = await PaymentInModel.create(businessId, {
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
      data: { id: paymentInId },
      message: 'Payment in created successfully'
    });
  } catch (error) {
    console.error('Error creating payment in:', error);

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
      message: 'Error creating payment in',
      error: error.message
    });
  }
};

// Update payment in
exports.update = async (req, res) => {
  try {
    const { id, businessId } = req.params;
    const { payment_number, party_id, amount_received, payment_discount, payment_date, payment_mode, payment_received_in, notes, status, is_invoice_linked, linked_invoices } = req.body;

    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const updated = await PaymentInModel.update(id, businessId, {
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

    if (!updated) {
      const exists = await PaymentInModel.getById(id, businessId);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Payment in not found' });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment in updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment in:', error);

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
      message: 'Error updating payment in',
      error: error.message
    });
  }
};

// Delete payment in
exports.delete = async (req, res) => {
  try {
    const { id, businessId } = req.params;

    if (!id || !businessId) {
      return res.status(400).json({ success: false, message: 'ID and Business ID are required' });
    }

    const deleted = await PaymentInModel.delete(id, businessId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payment in not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Payment in deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment in:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment in',
      error: error.message
    });
  }
};

// Get payment ins by party
exports.getByParty = async (req, res) => {
  try {
    const { partyId, businessId } = req.params;

    if (!partyId || !businessId) {
      return res.status(400).json({ success: false, message: 'Party ID and Business ID are required' });
    }

    const paymentIns = await PaymentInModel.getByParty(partyId, businessId);

    res.status(200).json({
      success: true,
      data: paymentIns,
      message: 'Payment ins fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment ins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment ins',
      error: error.message
    });
  }
};

// Get payment ins by date range
exports.getByDateRange = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { startDate, endDate } = req.query;

    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Business ID, startDate, and endDate are required' });
    }

    const paymentIns = await PaymentInModel.getByDateRange(businessId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: paymentIns,
      message: 'Payment ins fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment ins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment ins',
      error: error.message
    });
  }
};

// Get payment ins by status
exports.getByStatus = async (req, res) => {
  try {
    const { businessId, status } = req.params;

    if (!businessId || !status) {
      return res.status(400).json({ success: false, message: 'Business ID and status are required' });
    }

    const paymentIns = await PaymentInModel.getByStatus(businessId, status);

    res.status(200).json({
      success: true,
      data: paymentIns,
      message: 'Payment ins fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching payment ins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment ins',
      error: error.message
    });
  }
};
