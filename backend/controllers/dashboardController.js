const Party = require('../models/partyModel');
const Business = require('../models/businessModel');
const Quotation = require('../models/quotationModel');
const SalesInvoice = require('../models/salesInvoiceModel');
const ProformaInvoice = require('../models/proformaInvoiceModel');

// Helper function to get business ID
const getBusinessId = async (req) => {
  // First, check if business_id is provided in query or body
  let businessId = req.query.business_id || req.body.business_id;

  if (businessId) {
    businessId = parseInt(businessId);

    // Check if user is a sub-user
    if (req.user.isSubUser) {
      // For sub-users, verify they have access to this business
      if (!req.user.accessibleBusinessIds.includes(businessId)) {
        throw new Error('Access denied: You do not have permission to access this business');
      }
      return businessId;
    } else {
      // For main users, verify the business belongs to them
      const business = await Business.findById(businessId);

      // if (!business || business.user_id !== req.user.id) {
      //   throw new Error('Invalid business ID or access denied');
      // }

      if (!business || business.user_id !== req.user.id) {
        return null;
      }
      return businessId;
    }
  }

  // If not provided, get appropriate business based on user type
  if (req.user.isSubUser) {
    // For sub-users, get their accessible businesses
    if (!req.user.accessibleBusinessIds || req.user.accessibleBusinessIds.length === 0) {
      throw new Error('No accessible businesses found for this sub-user');
    }
    return req.user.accessibleBusinessIds[0]; // Return first accessible business
  } else {
    // For main users, get their first active business
    const businesses = await Business.findByUserId(req.user.id);
    if (!businesses || businesses.length === 0) {
      return null; // Return null instead of throwing for new users
    }
    return businesses[0].id;
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const businessId = await getBusinessId(req);
    if (!businessId) {
      // Return empty stats for new users
      return res.status(200).json({
        success: true,
        data: {
          parties: { total: 0, customers: 0, vendors: 0, receivable: 0, payable: 0 },
          quotations: { total: 0, open: 0, closed: 0, total_value: 0 },
          invoices: { total: 0, sales: 0, proforma: 0, open: 0, closed: 0 }
        }
      });
    }

    // Get statistics for all document types
    const [partyStats, quotationStats, salesInvoiceStats, proformaStats] = await Promise.all([
      Party.getStats(businessId),
      Quotation.getStats(businessId),
      SalesInvoice.getStats(businessId),
      ProformaInvoice.getStats(businessId)
    ]);

    // Combine all stats
    const dashboardStats = {
      parties: {
        total: partyStats?.total_parties || 0,
        customers: partyStats?.total_customers || 0,
        vendors: partyStats?.total_vendors || 0,
        receivable: partyStats?.total_receivable || 0,
        payable: partyStats?.total_payable || 0
      },
      quotations: {
        total: quotationStats?.total_quotations || 0,
        open: quotationStats?.open_quotations || 0,
        closed: quotationStats?.closed_quotations || 0,
        total_value: quotationStats?.total_value || 0
      },
      invoices: {
        total: salesInvoiceStats?.total_invoices || 0,
        sales: salesInvoiceStats?.total_invoices || 0,
        proforma: proformaStats?.total_proformas || 0,
        open: salesInvoiceStats?.open_count || 0,
        closed: salesInvoiceStats?.closed_count || 0
      }
    };

    res.status(200).json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};