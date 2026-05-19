const CustomQuotation = require('../models/customQuotationModel');
const DOMPurify = require('isomorphic-dompurify');

const sanitizeSections = (sections) => {
  if (!Array.isArray(sections)) return sections;
  return sections.map(section => ({
    ...section,
    content: section.content ? DOMPurify.sanitize(section.content) : section.content
  }));
};

exports.createCustomQuotation = async (req, res) => {
  try {
    const { generateInvoiceNumber } = require('../utils/invoiceSequenceGenerator');
    const businessId = req.body.business_id;

    if (!req.body.quotation_number) {
      req.body.quotation_number = await generateInvoiceNumber(businessId, 'custom_quotation');
    }

    if (req.body.sections) {
      req.body.sections = sanitizeSections(req.body.sections);
    }

    if (req.body.quotation_number) {
      const existing = await CustomQuotation.findByQuotationNumber(businessId, req.body.quotation_number);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Quotation number ${req.body.quotation_number} already exists`
        });
      }
    }

    const quotationId = await CustomQuotation.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Custom Quotation created successfully',
      data: { id: quotationId }
    });
  } catch (error) {
    console.error('Error creating Custom Quotation Controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Custom Quotation',
      error: error.message
    });
  }
};

exports.getCustomQuotationById = async (req, res) => {
  try {
    const quotation = await CustomQuotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Custom Quotation not found'
      });
    }
    res.status(200).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error fetching Custom Quotation by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Custom Quotation',
      error: error.message
    });
  }
};

exports.getCustomQuotationsByBusiness = async (req, res) => {
  try {
    const quotations = await CustomQuotation.findByBusinessId(req.params.businessId);
    res.status(200).json({
      success: true,
      data: quotations
    });
  } catch (error) {
    console.error('Error fetching Custom Quotations by business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Custom Quotations',
      error: error.message
    });
  }
};

exports.updateCustomQuotation = async (req, res) => {
  try {
    if (req.body.sections) {
      req.body.sections = sanitizeSections(req.body.sections);
    }

    if (req.body.quotation_number) {
      const current = await CustomQuotation.findById(req.params.id);
      if (current && current.quotation_number !== req.body.quotation_number) {
        const existing = await CustomQuotation.findByQuotationNumber(current.business_id, req.body.quotation_number);
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Quotation number ${req.body.quotation_number} already exists`
          });
        }
      }
    }

    const updated = await CustomQuotation.update(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Custom Quotation not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Custom Quotation updated successfully'
    });
  } catch (error) {
    console.error('Error updating Custom Quotation Controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Custom Quotation',
      error: error.message
    });
  }
};

exports.deleteCustomQuotation = async (req, res) => {
  try {
    const deleted = await CustomQuotation.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Custom Quotation not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Custom Quotation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Custom Quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Custom Quotation',
      error: error.message
    });
  }
};

exports.getNextQuotationNumber = async (req, res) => {
  try {
    const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');
    const businessId = req.params.businessId || req.query.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const nextNumber = await getUnifiedNextNumber(businessId, 'custom_quotation');
    res.status(200).json({
      success: true,
      data: { quotation_number: nextNumber }
    });
  } catch (error) {
    console.error('Error getting next Custom Quotation number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next quotation number',
      error: error.message
    });
  }
};
