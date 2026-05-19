/**
 * Handle API response errors and throw appropriate errors
 * @param {Object} response - API response object
 * @param {string} documentType - Type of document (quotation, proforma, etc.)
 * @throws {Error} - Throws error with code and field for duplicate number errors
 */
export const handleAPIResponse = (response, documentType) => {
  if (response.success) {
    return response;
  }

  // Check if it's a duplicate number error
  if (response.code === 'DUPLICATE_NUMBER') {
    const error = new Error(response.message);
    error.code = 'DUPLICATE_NUMBER';
    error.field = response.field || 'number';
    throw error;
  }

  throw new Error(response.message || `Failed to create ${documentType}`);
};

/**
 * Get the number field name for a document type
 * @param {string} documentType - Type of document
 * @returns {string} - Field name for the number
 */
export const getNumberFieldName = (documentType) => {
  const fieldMap = {
    'quotation': 'quotation_number',
    'proforma': 'proforma_number',
    'sales': 'invoice_number',
    'salesReturn': 'sales_return_number',
    'creditNote': 'credit_note_number',
    'debitNote': 'debit_note_number',
    'deliveryChallan': 'challan_number',
    'purchaseOrder': 'purchase_order_number',
    'purchaseInvoice': 'purchase_invoice_number',
    'purchaseReturn': 'purchase_return_number',
    'bookInvoice': 'book_invoice_number',
    'contract': 'contract_number',
    'zKhataParty': 'entry_number',
    'paymentIn': 'payment_number',
    'paymentOut': 'payment_number'
  };

  return fieldMap[documentType] || 'number';
};
