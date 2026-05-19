/**
 * Document Type Configuration
 * 
 * This file contains configuration for different document types
 * to dynamically change labels, titles, and other text in PDF formats
 */

export const DOCUMENT_TYPES = {
  QUOTATION: 'quotation',
  PROFORMA: 'proforma',
  SALES_INVOICE: 'sales_invoice',
  PURCHASE_ORDER: 'purchase_order',
  DELIVERY_CHALLAN: 'delivery_challan',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
  SALES_RETURN: 'sales_return',
  PURCHASE_RETURN: 'purchase_return',
  PURCHASE_INVOICE: 'purchase_invoice',
  BOOK_INVOICE: 'book_invoice',
  EINVOICE: 'e_invoice',
  CUSTOM_QUOTATION: 'custom_quotation',
};

export const getDocumentConfig = (documentType) => {
  const configs = {
    [DOCUMENT_TYPES.QUOTATION]: {
      title: 'QUOTATION',
      numberLabel: 'Quotation No',
      dateLabel: 'Quotation Date',
      validityLabel: 'Valid Until',
      showValidity: true,
      showDueDate: false,
      showPoAndRemark: false,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.PROFORMA]: {
      title: 'PROFORMA INVOICE',
      numberLabel: 'Proforma No',
      dateLabel: 'Proforma Date',
      validityLabel: 'Valid Until',
      showValidity: true,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.SALES_INVOICE]: {
      title: 'TAX INVOICE',
      numberLabel: 'Invoice No',
      dateLabel: 'Invoice Date',
      validityLabel: 'Due Date',
      showValidity: false,
      showDueDate: true,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.PURCHASE_ORDER]: {
      title: 'PURCHASE ORDER',
      numberLabel: 'PO No',
      dateLabel: 'PO Date',
      validityLabel: 'Delivery Date',
      showValidity: true,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Supplier Name / Service Provider Name',
      shipToLabel: 'Ship To',
      receiverLabel: 'Receiver',
      showBankDetails: false,
      showSummary: true,
    },
    [DOCUMENT_TYPES.DELIVERY_CHALLAN]: {
      title: 'DELIVERY CHALLAN',
      numberLabel: 'Challan No',
      dateLabel: 'Challan Date',
      validityLabel: 'Delivery Date',
      showValidity: true,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Goods delivered in good condition',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: false,
      showSummary: false,
    },
    [DOCUMENT_TYPES.CREDIT_NOTE]: {
      title: 'CREDIT NOTE',
      numberLabel: 'Credit Note No',
      dateLabel: 'Credit Note Date',
      validityLabel: 'Valid Until',
      showValidity: false,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.DEBIT_NOTE]: {
      title: 'DEBIT NOTE',
      numberLabel: 'Debit Note No',
      dateLabel: 'Debit Note Date',
      validityLabel: 'Valid Until',
      showValidity: false,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.SALES_RETURN]: {
      title: 'SALES RETURN',
      numberLabel: 'Return No',
      dateLabel: 'Return Date',
      validityLabel: 'Valid Until',
      showValidity: false,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.PURCHASE_RETURN]: {
      title: 'PURCHASE RETURN',
      numberLabel: 'Return No',
      dateLabel: 'Return Date',
      validityLabel: 'Valid Until',
      showValidity: false,
      showDueDate: false,
      showPoAndRemark: true,
      footerText: 'Thank you!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.PURCHASE_INVOICE]: {
      title: 'BOOK PURCHASE ORDER',
      numberLabel: 'Order No',
      dateLabel: 'Order Date',
      validityLabel: 'Due Date',
      showValidity: false,
      showDueDate: true,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.BOOK_INVOICE]: {
      title: 'BOOK INVOICE',
      numberLabel: 'Invoice No',
      dateLabel: 'Invoice Date',
      validityLabel: 'Due Date',
      showValidity: false,
      showDueDate: true,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.EINVOICE]: {
      title: 'TAX INVOICE',
      numberLabel: 'Invoice No',
      dateLabel: 'Invoice Date',
      validityLabel: 'Due Date',
      showValidity: false,
      showDueDate: true,
      showPoAndRemark: true,
      footerText: 'Thank you for your business!',
      termsTitle: 'Terms & Conditions',
      billToLabel: 'Bill To',
      showBankDetails: true,
      showSummary: true,
    },
    [DOCUMENT_TYPES.CUSTOM_QUOTATION]: {
      title: 'CUSTOM QUOTATION',
      numberLabel: 'Custom Quotation#',
      dateLabel: 'Quotation Date',
      validityLabel: 'Valid Until',
      showValidity: true,
      showDueDate: false,
      showPoAndRemark: false,
      footerText: 'Thank you for your business!',
      termsTitle: 'Details',
      billToLabel: 'Client Info',
      showBankDetails: true,
      showSummary: false,
    },
  };

  return configs[documentType] || configs[DOCUMENT_TYPES.QUOTATION];
};

/**
 * Helper function to get document title
 */
export const getDocumentTitle = (documentType) => {
  return getDocumentConfig(documentType).title;
};

/**
 * Helper function to get number label
 */
export const getNumberLabel = (documentType) => {
  return getDocumentConfig(documentType).numberLabel;
};

/**
 * Helper function to get date label
 */
export const getDateLabel = (documentType) => {
  return getDocumentConfig(documentType).dateLabel;
};
