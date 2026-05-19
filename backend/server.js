// InvoiceBillBook Backend Server - New Feature Branch: New_feature-23-Mar-26
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initializeDatabase } = require('./config/database');
const { initializeEmailService } = require('./utils/nodemailerService');
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const partyRoutes = require('./routes/partyRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const supportRoutes = require('./routes/supportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const billingRoutes = require('./routes/billingRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const bankDetailsRoutes = require('./routes/bankDetailsRoutes');
const taxRoutes = require('./routes/taxRoutes');
const subUserRoutes = require('./routes/subUserRoutes');
const proformaInvoiceRoutes = require('./routes/proformaInvoiceRoutes');
const salesInvoiceRoutes = require('./routes/salesInvoiceRoutes');
const bookPurchaseOrderRoutes = require('./routes/bookPurchaseOrderRoutes');
const salesReturnRoutes = require('./routes/salesReturnRoutes');
const creditNoteRoutes = require('./routes/creditNoteRoutes');
const deliveryChallanRoutes = require('./routes/deliveryChallanRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const termsConditionsRoutes = require('./routes/termsConditionsRoutes');
const paymentInRoutes = require('./routes/paymentInRoutes');
const paymentOutRoutes = require('./routes/paymentOutRoutes');
const purchaseReturnRoutes = require('./routes/purchaseReturnRoutes');
const debitNoteRoutes = require('./routes/debitNoteRoutes');
const projectExpenseRoutes = require('./routes/projectExpenseRoutes');
const projectExpenseTransactionRoutes = require('./routes/projectExpenseTransactionRoutes');
const eInvoiceRoutes = require('./routes/eInvoiceRoutes');
const bookInvoiceRoutes = require('./routes/bookInvoiceRoutes');
const contractRoutes = require('./routes/contractRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const superAdminApprovalRoutes = require('./routes/superAdminApprovalRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const zKhataRoutes = require('./routes/zKhataRoutes');
const documentRoutes = require('./routes/documentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const projectPartyRoutes = require('./routes/projectPartyRoutes');
const customQuotationRoutes = require('./routes/customQuotationRoutes');
const grnRoutes = require('./routes/grnRoutes');
const mrnRoutes = require('./routes/mrnRoutes');
const purchaseRequisitionRoutes = require('./routes/purchaseRequisitionRoutes');
const salesLeadRoutes = require('./routes/salesLeadRoutes');
const upload = require('./middleware/uploadMiddleware');

// Load environment variables
dotenv.config();

// Initialize database
initializeDatabase();

// Initialize email service (Nodemailer with Gmail)
initializeEmailService();

const app = express();

// Dynamic CORS configuration based on environment variables
const getCorsOptions = () => {
  const allowedOrigins = [];

  // In development, allow the configured dev URLs
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.FRONTEND_URL_DEV) {
      const devUrls = process.env.FRONTEND_URL_DEV.split(',').map(url => url.trim());
      allowedOrigins.push(...devUrls);
    }
  }

  // Parse production frontend URLs from environment variable
  if (process.env.FRONTEND_URL) {
    const prodUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
    allowedOrigins.push(...prodUrls);
  }

  // Parse website URLs if configured
  if (process.env.WEBSITE_URL) {
    const websiteUrls = process.env.WEBSITE_URL.split(',').map(url => url.trim());
    allowedOrigins.push(...websiteUrls);
  }

  // Parse superadmin URLs if configured
  if (process.env.SUPERADMIN_URL) {
    const superAdminUrls = process.env.SUPERADMIN_URL.split(',').map(url => url.trim());
    allowedOrigins.push(...superAdminUrls);
  }


  //comment part
  // If no origins are configured, allow all origins (for development flexibility)
  if (allowedOrigins.length === 0) {
    // In production, NEVER allow all origins. Fallback to an empty list or specific domain.
    if (process.env.NODE_ENV === 'production') {
      return {
        origin: false,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      };
    }

    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}. Allowed origins: ${allowedOrigins.map(a => typeof a === 'string' ? a : a.toString()).join(', ')}`);
        return callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
};

const corsOptions = getCorsOptions();

app.use(cors(corsOptions));

// Body parsing middleware with increased limit for base64 file uploads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));


// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image upload route - with business context (for parties, business, etc.)
const { protect } = require('./middleware/authMiddleware');

// Image upload route - with business context
app.post(['/api/upload', '/upload'], protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, image_url: `/uploads/${req.file.filename}` });
});

// Image upload route - without business context
const { uploadDirect, uploadAny } = require('./middleware/uploadMiddleware');
app.post('/api/upload-direct', protect, uploadDirect.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, image_url: `/uploads/${req.file.filename}` });
});

// Generic file upload route
app.post(['/api/upload-file', '/upload-file'], protect, uploadAny.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, file_url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
});


// Routes
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/business', '/business'], businessRoutes);
app.use(['/api/parties', '/parties'], partyRoutes);
app.use(['/api/inventory', '/inventory'], inventoryRoutes);
app.use(['/api/support', '/support'], supportRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/billing', '/billing'], billingRoutes);
app.use(['/api/quotations', '/quotations'], quotationRoutes);
app.use(['/api/bank-details', '/bank-details'], bankDetailsRoutes);
app.use(['/api/tax', '/tax'], taxRoutes);
app.use(['/api/sub-users', '/sub-users'], subUserRoutes);
app.use(['/api/proforma-invoices', '/proforma-invoices'], proformaInvoiceRoutes);
app.use(['/api/sales-invoices', '/sales-invoices'], salesInvoiceRoutes);
app.use(['/api/book-purchase-orders', '/book-purchase-orders'], bookPurchaseOrderRoutes);
app.use(['/api/sales-returns', '/sales-returns'], salesReturnRoutes);
app.use(['/api/credit-notes', '/credit-notes'], creditNoteRoutes);
app.use(['/api/delivery-challans', '/delivery-challans'], deliveryChallanRoutes);
app.use(['/api/purchase-orders', '/purchase-orders'], purchaseOrderRoutes);
app.use(['/api/terms-conditions', '/terms-conditions'], termsConditionsRoutes);
app.use(['/api/payment-in', '/payment-in'], paymentInRoutes);
app.use(['/api/payment-out', '/payment-out'], paymentOutRoutes);
app.use(['/api/purchase-returns', '/purchase-returns'], purchaseReturnRoutes);
app.use(['/api/debit-notes', '/debit-notes'], debitNoteRoutes);
app.use(['/api/project-expense', '/project-expense'], projectExpenseRoutes);
app.use(['/api/project-expense-transactions', '/project-expense-transactions'], projectExpenseTransactionRoutes);
app.use(['/api/e-invoice', '/e-invoice'], eInvoiceRoutes);
app.use(['/api/book-invoices', '/book-invoices'], bookInvoiceRoutes);
app.use(['/api/contracts', '/contracts'], contractRoutes);
app.use(['/api/superadmin', '/superadmin'], superAdminRoutes);
app.use(['/api/pricing', '/pricing'], pricingRoutes);
app.use(['/api/approvals', '/approvals'], superAdminApprovalRoutes);
app.use(['/api/currency', '/currency'], currencyRoutes);
app.use(['/api/calendar', '/calendar'], calendarRoutes);
app.use(['/api/z-khata', '/z-khata'], zKhataRoutes);
app.use(['/api/documents', '/documents'], documentRoutes);
app.use(['/api/categories', '/categories'], categoryRoutes);
app.use(['/api/project-parties', '/project-parties'], projectPartyRoutes);
app.use(['/api/custom-quotations', '/custom-quotations'], customQuotationRoutes);
app.use(['/api/grn', '/grn'], grnRoutes);
app.use(['/api/mrn', '/mrn'], mrnRoutes);
app.use(['/api/purchase-requisitions', '/purchase-requisitions'], purchaseRequisitionRoutes);
app.use(['/api/sales-leads', '/sales-leads'], salesLeadRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  // Get allowed origins for debugging
  const allowedOrigins = [];
  if (process.env.FRONTEND_URL_DEV) {
    allowedOrigins.push(...process.env.FRONTEND_URL_DEV.split(',').map(url => url.trim()));
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map(url => url.trim()));
  }

  res.json({
    status: 'OK',
    message: 'Server is running',
    version: '1.0.1-SECURITY-HARDENED-2026-04-27',
    environment: process.env.NODE_ENV || 'production'
  });

});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // Get allowed origins for logging
  const allowedOrigins = [];
  if (process.env.FRONTEND_URL_DEV) {
    allowedOrigins.push(...process.env.FRONTEND_URL_DEV.split(',').map(url => url.trim()));
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map(url => url.trim()));
  }
});
