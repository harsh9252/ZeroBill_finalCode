// src/config/invoiceConfig.js

export const defaultLabels = {
  pageTitle: "Create Sales Invoice",
  pageSubtitle: "Fill in the details below to create a new invoice",
  billTo: "Bill To",
  invoiceNumber: "Invoice Number",
  invoiceDate: "Invoice Date",
  paymentTerms: "Payment Terms (days)",
  dueDate: "Due Date",
  addProducts: "Add Products",
  manualEntry: "Manual Entry",
  subtotal: "Subtotal",
  taxTotal: "Tax Total",
  grandTotal: "Grand Total",
  discountAfterTax: "Discount After Tax",
  customerNotes: "Customer Notes",
  paymentInfo: "Payment Information",
  terms: "Terms & Conditions",
  saveBtn: "Save & Create Invoice",
  cancelBtn: "Cancel",
  addCharge: "Add Charge",
  noItems: "No items added yet",
};

// Item & product table headers
export const defaultItemTableHeaders = [
  { key: "no", label: "NO" },
  { key: "description", label: "ITEM DESCRIPTION" },
  { key: "hsn", label: "HSN/SAC" },
  { key: "qty", label: "QTY" },
  { key: "unit", label: "UNIT" },
  { key: "unitPrice", label: "UNIT PRICE" },
  { key: "discount", label: "DISC (%)" },
  { key: "tax", label: "TAX (%)" },
  { key: "amount", label: "AMOUNT" },
  { key: "actions", label: "ACTIONS" },
];

export const defaultProductTableHeaders = [
  { key: "name", label: "PRODUCT NAME" },
  { key: "code", label: "CODE" },
  { key: "salesPrice", label: "SALE PRICE" },
  { key: "purchasePrice", label: "PURCHASE PRICE" },
  { key: "stock", label: "STOCK" },
  { key: "actions", label: "ACTIONS" },
];

export const defaultBankFields = [
  { key: "bankName", label: "Bank Name", type: "text", placeholder: "e.g. State Bank of India" },
  { key: "accountNumber", label: "Account Number", type: "text", placeholder: "Enter account number" },
  { key: "ifsc", label: "IFSC", type: "text", placeholder: "IFSC Code" },
  { key: "branch", label: "Branch", type: "text", placeholder: "Branch Name" },
  { key: "upi", label: "UPI ID", type: "text", placeholder: "yourupi@bank" },
];

export const defaultUnits = ["PCS", "BOX", "MTR", "KG", "LTR"];

export const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    name: "Amul Butter 500gm",
    code: "8901262010023",
    salesPrice: 220,
    purchasePrice: 190,
    stock: "50 BOX",
    subtitle: "Dairy Product",
  },
  {
    id: "p2",
    name: "Blue Widget Small",
    code: "BW-001",
    salesPrice: 150,
    purchasePrice: 120,
    stock: "12 PCS",
    subtitle: "Electronics Component",
  },
  {
    id: "p3",
    name: "Red Widget Large",
    code: "RW-001",
    salesPrice: 250,
    purchasePrice: 200,
    stock: "8 PCS",
    subtitle: "Industrial Part",
  },
  {
    id: "p4",
    name: "Green Cable 5m",
    code: "GC-005",
    salesPrice: 85,
    purchasePrice: 65,
    stock: "25 MTR",
    subtitle: "Electrical Supply",
  },
];

export const defaultSections = [
  { key: "invoiceInfo", enabled: true },
  { key: "items", enabled: true },
  { key: "summary", enabled: true },
  { key: "notes", enabled: true },
  { key: "bank", enabled: true },
  { key: "terms", enabled: true },
];

// ---------------------------
// New: date-range / status / pagination config
// ---------------------------

/**
 * DATE_RANGE_OPTS
 * Used by DateRange selects across Invoice, SalesReturn, CreditNote, etc.
 * 'days' === null means "All time" or special / custom handling.
 */
export const DATE_RANGE_OPTS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Last 365 Days", days: 365 },
  { label: "All Time", days: null },
  { label: "Custom Date Range", days: null },
];

export const DEFAULT_DATE_RANGE_LABEL = "Last 365 Days";

/**
 * STATUS_OPTS
 * Standardized status filter options for list views (Invoices, SalesReturn, CreditNote).
 */
export const STATUS_OPTS = [
  { label: "Show All", value: "all" },
  { label: "Show Open", value: "open" },
  { label: "Show Overdue", value: "overdue" },
  { label: "Show Closed", value: "closed" },
];

/**
 * Pagination defaults
 */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Optional helpers (exported as simple constants)
 * You can import these to keep consistent labels/format across components.
 */
export const DEFAULT_CURRENCY_LOCALE = "en-IN";
export const DEFAULT_CURRENCY_CODE = "INR";

// default export (optional)
export default {
  defaultLabels,
  defaultItemTableHeaders,
  defaultProductTableHeaders,
  defaultBankFields,
  defaultUnits,
  SAMPLE_PRODUCTS,
  defaultSections,
  DATE_RANGE_OPTS,
  DEFAULT_DATE_RANGE_LABEL,
  STATUS_OPTS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_CURRENCY_LOCALE,
  DEFAULT_CURRENCY_CODE,
};
