const { pool } = require('../config/database');

// Invoice type prefixes
const INVOICE_PREFIXES = {
  'quotation': 'Q',
  'proforma': 'PI',
  'sales_invoice': 'INV',
  'sales_return': 'SR',
  'credit_note': 'CN',
  'delivery_challan': 'DC',
  'purchase_return': 'PR',
  'debit_note': 'DN',
  'purchase_order': 'PO',
  'book_purchase_order': 'BPO',
  'book_invoice': 'BI',
  'contract': 'AGT',
  'einvoice': 'EIN',
  'z_khata_party': 'ZB',
  'payment_in': 'PIN',
  'payment_out': 'POUT',
  'project_expense': 'PE',
  'custom_quotation': 'CTQ',
  'grn': 'GRN',
  'mrn': 'MRN',
  'purchase_requisition': 'PR',
  'sales_lead': 'SL'
};

// Mapping of invoice types to their respective tables and columns
const TABLE_MAP = {
  'quotation': 'quotations',
  'proforma': 'proforma_invoices',
  'sales_invoice': 'sales_invoices',
  'sales_return': 'sales_returns',
  'credit_note': 'credit_notes',
  'delivery_challan': 'delivery_challans',
  'purchase_return': 'purchase_returns',
  'debit_note': 'debit_notes',
  'purchase_order': 'purchase_orders',
  'book_purchase_order': 'book_purchase_orders',
  'book_invoice': 'book_invoices',
  'contract': 'contracts',
  'z_khata_party': 'z_khata_parties',
  'payment_in': 'payment_in',
  'payment_out': 'payment_out',
  'project_expense': 'project_expense',
  'einvoice': 'einvoices',
  'custom_quotation': 'custom_quotations',
  'grn': 'grn_records',
  'mrn': 'mrn_records',
  'purchase_requisition': 'purchase_requisitions',
  'sales_lead': 'sales_leads'
};

const COLUMN_MAP = {
  'quotation': 'quotation_number',
  'proforma': 'proforma_number',
  'sales_invoice': 'invoice_number',
  'sales_return': 'return_number',
  'credit_note': 'note_number',
  'delivery_challan': 'challan_number',
  'purchase_return': 'purchase_return_number',
  'debit_note': 'debit_note_number',
  'purchase_order': 'purchase_order_number',
  'book_purchase_order': 'book_purchase_order_number',
  'book_invoice': 'book_invoice_number',
  'contract': 'contract_number',
  'z_khata_party': 'entry_number',
  'payment_in': 'payment_number',
  'payment_out': 'payment_number',
  'project_expense': 'expense_number',
  'einvoice': 'einvoice_number',
  'custom_quotation': 'quotation_number',
  'grn': 'grn_number',
  'mrn': 'mrn_number',
  'purchase_requisition': 'pr_number',
  'sales_lead': 'lead_no'
};

/**
 * Generate a unique invoice number
 * @param {number} businessId - Business ID
 * @param {string} invoiceType - Type of invoice (quotation, proforma, sales_invoice, sales_return)
 * @returns {Promise<string>} - Generated invoice number (e.g., Q-2026-27-0001)
 */
const generateInvoiceNumber = async (businessId, invoiceType) => {
  if (!businessId || !invoiceType) {
    throw new Error('businessId and invoiceType are required');
  }

  const year = new Date().getFullYear();
  const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
  
  try {
    // Step 0: Determine prefix (priority: DB -> Hardcoded)
    let prefix = INVOICE_PREFIXES[invoiceType];
    const [existingSequence] = await pool.execute(
      `SELECT prefix, current_number FROM invoice_sequences 
       WHERE business_id = ? AND invoice_type = ? AND financial_year = ?`,
      [businessId, invoiceType, financialYear]
    );

    if (existingSequence.length > 0 && existingSequence[0].prefix) {
      prefix = existingSequence[0].prefix;
    }

    if (!prefix) {
      throw new Error(`Unknown invoice type: ${invoiceType}`);
    }

    const table = TABLE_MAP[invoiceType];
    const column = COLUMN_MAP[invoiceType];

    // Step 1: Always find the real max from the actual document table
    let maxFromTable = 0;
    let hasRecords = false;
    if (table && column) {
      const [rows] = await pool.execute(
        `SELECT ${column} FROM ${table} 
         WHERE business_id = ? AND ${column} LIKE ? 
         ORDER BY CAST(SUBSTRING_INDEX(${column}, '-', -1) AS UNSIGNED) DESC LIMIT 10`,
        [businessId, `${prefix}-%`]
      );
      if (rows.length > 0) {
        hasRecords = true;
        for (const row of rows) {
          const val = row[column];
          if (val) {
            const parts = val.split('-');
            const num = parseInt(parts[parts.length - 1]);
            if (!isNaN(num) && num > maxFromTable) maxFromTable = num;
          }
        }
      }
    }

    // Step 2: Determine next number
    const maxFromSequence = existingSequence.length > 0 ? existingSequence[0].current_number : 0;
    
    let newNumber;
    if (hasRecords) {
      // If records exist, we take the higher of (table max + 1) or the custom sequence number
      newNumber = Math.max(maxFromTable + 1, maxFromSequence);
    } else {
      // If no records exist, start exactly with the custom sequence number (allows 0)
      newNumber = maxFromSequence;
    }

    // Step 3: Update the sequence table with this new number to maintain sync
    await pool.execute(
      `INSERT INTO invoice_sequences 
       (business_id, invoice_type, prefix, current_number, financial_year) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE current_number = ?`,
      [businessId, invoiceType, prefix, newNumber, financialYear, newNumber]
    );

    // Format: PREFIX-YYYY-YY-XXXX
    // Example: Q-2026-27-0001, INV-2026-27-0005
    return `${prefix}-${newNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw error;
  }
};

/**
 * Get the next predicted invoice number without incrementing
 * @param {number} businessId 
 * @param {string} invoiceType 
 * @returns {Promise<string>}
 */
const getUnifiedNextNumber = async (businessId, invoiceType) => {
  const year = new Date().getFullYear();
  const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
  
  // Step 0: Determine prefix (priority: DB -> Hardcoded)
  let prefix = INVOICE_PREFIXES[invoiceType];
  const [sequences] = await pool.execute(
    `SELECT prefix, current_number FROM invoice_sequences 
     WHERE business_id = ? AND invoice_type = ? AND financial_year = ?`,
    [businessId, invoiceType, financialYear]
  );

  if (sequences.length > 0 && sequences[0].prefix) {
    prefix = sequences[0].prefix;
  }

  if (!prefix) throw new Error(`Unknown invoice type: ${invoiceType}`);

  const table = TABLE_MAP[invoiceType];
  const column = COLUMN_MAP[invoiceType];

  // Always find the actual max number already saved in the real table
  let maxFromTable = 0;
  let hasRecords = false;
  if (table && column) {
    try {
      const [rows] = await pool.execute(
        `SELECT ${column} FROM ${table} 
         WHERE business_id = ? AND ${column} LIKE ?
         ORDER BY CAST(SUBSTRING_INDEX(${column}, '-', -1) AS UNSIGNED) DESC LIMIT 10`,
        [businessId, `${prefix}-%`]
      );
      if (rows.length > 0) {
        hasRecords = true;
        for (const row of rows) {
          const val = row[column];
          if (val) {
            const parts = val.split('-');
            const num = parseInt(parts[parts.length - 1]);
            if (!isNaN(num) && num > maxFromTable) maxFromTable = num;
          }
        }
      }
    } catch (e) {
      // Table may not exist yet; ignore
    }
  }

  // The next number depends on the document type
  let maxFromSequence = 0;
  if (sequences.length > 0) {
    maxFromSequence = sequences[0].current_number;
  }
  
  let nextNumber;
  if (hasRecords) {
    nextNumber = Math.max(maxFromTable + 1, maxFromSequence);
  } else {
    nextNumber = maxFromSequence;
  }

  return `${prefix}-${nextNumber}`;
};

/**
 * Get all sequences for a business
 * @param {number} businessId - Business ID
 * @returns {Promise<Array>} - Array of sequences
 */
const getSequencesByBusiness = async (businessId) => {
  const [sequences] = await pool.execute(
    `SELECT * FROM invoice_sequences 
     WHERE business_id = ? 
     ORDER BY invoice_type, financial_year DESC`,
    [businessId]
  );
  return sequences;
};

/**
 * Reset sequence for a specific invoice type and financial year
 * @param {number} businessId - Business ID
 * @param {string} invoiceType - Type of invoice
 * @param {string} financialYear - Financial year
 */
const resetSequence = async (businessId, invoiceType, financialYear) => {
  const [result] = await pool.execute(
    `UPDATE invoice_sequences 
     SET current_number = 0 
     WHERE business_id = ? AND invoice_type = ? AND financial_year = ?`,
    [businessId, invoiceType, financialYear]
  );
  return result.affectedRows > 0;
};

/**
 * Check if a document number already exists for a business
 * @param {number} businessId - Business ID
 * @param {string} invoiceType - Type of invoice
 * @param {string} documentNumber - Document number to check
 * @returns {Promise<boolean>} - true if exists, false otherwise
 */
const checkDocumentNumberExists = async (businessId, invoiceType, documentNumber) => {
  if (!documentNumber) return false;

  const table = TABLE_MAP[invoiceType];
  const column = COLUMN_MAP[invoiceType];

  if (!table || !column) {
    throw new Error(`Unknown invoice type: ${invoiceType}`);
  }

  try {
    // Check if table has is_active column (payment_in and payment_out don't have it)
    const hasIsActive = !['payment_in', 'payment_out'].includes(table);
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE business_id = ? AND ${column} = ?${hasIsActive ? ' AND is_active = 1' : ''}`;
    const [results] = await pool.execute(query, [businessId, documentNumber]);
    return results[0].count > 0;
  } catch (error) {
    console.error(`Error checking document number for ${invoiceType}:`, error);
    throw error;
  }
};

module.exports = {
  generateInvoiceNumber,
  getUnifiedNextNumber,
  getSequencesByBusiness,
  resetSequence,
  checkDocumentNumberExists,
  INVOICE_PREFIXES
};
