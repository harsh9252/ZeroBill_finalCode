const { pool } = require('../config/database');

// Helper function to sanitize values
const sanitizeValue = (value, defaultValue = null) => {
  // Convert undefined, null, empty strings and NaN to null
  // We EXCLUDE 0 and '0' from this as they are valid numeric values (e.g., for is_locked)
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
    return defaultValue;
  }
  return value;
};

const TermsConditions = {
  // Create single terms & conditions section
  create: async (termsData) => {
    try {
     
      const query = `
        INSERT INTO terms_conditions (
          quotation_id, sales_invoice_id, proforma_invoice_id, credit_note_id, debit_note_id, 
          sales_return_id, purchase_return_id, delivery_challan_id, purchase_invoice_id, 
          book_purchase_order_id, purchase_order_id, book_invoice_id, contract_id, party_id, 
          business_id, section_order, heading, content, is_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        sanitizeValue(termsData.quotation_id),
        sanitizeValue(termsData.sales_invoice_id),
        sanitizeValue(termsData.proforma_invoice_id),
        sanitizeValue(termsData.credit_note_id),
        sanitizeValue(termsData.debit_note_id),
        sanitizeValue(termsData.sales_return_id),
        sanitizeValue(termsData.purchase_return_id),
        sanitizeValue(termsData.delivery_challan_id),
        sanitizeValue(termsData.purchase_invoice_id),
        sanitizeValue(termsData.book_purchase_order_id),
        sanitizeValue(termsData.purchase_order_id),
        sanitizeValue(termsData.book_invoice_id),
        sanitizeValue(termsData.contract_id),
        sanitizeValue(termsData.party_id),
        sanitizeValue(termsData.business_id),
        sanitizeValue(termsData.section_order, 1),
        termsData.heading || 'Terms & Conditions',
        termsData.content,
        termsData.is_locked ? 1 : 0
      ];



      const [result] = await pool.execute(query, values);
      return result.insertId;
    } catch (error) {
      console.error('Database Error in TermsConditions.create:', error);
      throw error;
    }
  },

  // Get all terms & conditions for a quotation
  findByQuotationId: async (quotationId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE quotation_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [quotationId]);
    return rows;
  },

  // Get all terms & conditions for a sales invoice
  findBySalesId: async (salesId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE sales_invoice_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [salesId]);
    return rows;
  },

  // Get all terms & conditions for a proforma invoice
  findByProformaId: async (proformaId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE proforma_invoice_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [proformaId]);
    return rows;
  },

  // Get all terms & conditions for a credit note
  findByCreditNoteId: async (creditNoteId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE credit_note_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [creditNoteId]);
    return rows;
  },

  // Get all terms & conditions for a debit note
  findByDebitNoteId: async (debitNoteId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE debit_note_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [debitNoteId]);
    return rows;
  },

  // Get all terms & conditions for a sales return
  findBySalesReturnId: async (salesReturnId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE sales_return_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [salesReturnId]);
    return rows;
  },

  // Get all terms & conditions for a purchase return
  findByPurchaseReturnId: async (purchaseReturnId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE purchase_return_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [purchaseReturnId]);
    return rows;
  },

  // Get all terms & conditions for a delivery challan
  findByDeliveryChallanId: async (deliveryChallanId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE delivery_challan_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [deliveryChallanId]);
    return rows;
  },

  // Get all terms & conditions for a purchase invoice
  findByPurchaseInvoiceId: async (purchaseInvoiceId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE purchase_invoice_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [purchaseInvoiceId]);
    return rows;
  },

  // Get all terms & conditions for a purchase order
  findByPurchaseOrderId: async (purchaseOrderId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE purchase_order_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [purchaseOrderId]);
    return rows;
  },

  // Get all terms & conditions for a book purchase order
  findByBookPurchaseOrderId: async (bookPurchaseOrderId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE book_purchase_order_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [bookPurchaseOrderId]);
    return rows;
  },

  // Get all terms & conditions for a book invoice
  findByBookInvoiceId: async (bookInvoiceId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE book_invoice_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [bookInvoiceId]);
    return rows;
  },

  // Get all terms & conditions for a contract (agreement)
  findByContractId: async (contractId) => {
    const query = `
      SELECT * FROM terms_conditions 
      WHERE contract_id = ? 
      ORDER BY section_order ASC
    `;
    const [rows] = await pool.execute(query, [contractId]);
    return rows;
  },

  // Get terms & conditions by ID
  findById: async (id) => {
    const query = 'SELECT * FROM terms_conditions WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  },

  // Update terms & conditions
  update: async (id, termsData) => {
    const fields = [];
    const values = [];

    if (termsData.heading !== undefined) {
      fields.push('heading = ?');
      values.push(sanitizeValue(termsData.heading, 'Terms & Conditions'));
    }
    if (termsData.content !== undefined) {
      fields.push('content = ?');
      values.push(sanitizeValue(termsData.content, ''));
    }
    if (termsData.section_order !== undefined) {
      fields.push('section_order = ?');
      values.push(sanitizeValue(termsData.section_order, 1));
    }
    if (termsData.is_locked !== undefined) {
      fields.push('is_locked = ?');
      // For boolean/tinyint columns, ensure we send 1 or 0
      values.push(termsData.is_locked ? 1 : 0);
    }

    if (fields.length === 0) return true;

    const query = `UPDATE terms_conditions SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Delete terms & conditions section
  delete: async (id) => {
    const query = 'DELETE FROM terms_conditions WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a quotation
  deleteByQuotationId: async (quotationId) => {
    const query = 'DELETE FROM terms_conditions WHERE quotation_id = ?';
    const [result] = await pool.execute(query, [quotationId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a sales invoice
  deleteBySalesId: async (salesId) => {
    const query = 'DELETE FROM terms_conditions WHERE sales_invoice_id = ?';
    const [result] = await pool.execute(query, [salesId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a proforma invoice
  deleteByProformaId: async (proformaId) => {
    const query = 'DELETE FROM terms_conditions WHERE proforma_invoice_id = ?';
    const [result] = await pool.execute(query, [proformaId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a book invoice
  deleteByBookInvoiceId: async (bookInvoiceId) => {
    const query = 'DELETE FROM terms_conditions WHERE book_invoice_id = ?';
    const [result] = await pool.execute(query, [bookInvoiceId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a credit note
  deleteByCreditNoteId: async (creditNoteId) => {
    const query = 'DELETE FROM terms_conditions WHERE credit_note_id = ?';
    const [result] = await pool.execute(query, [creditNoteId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a debit note
  deleteByDebitNoteId: async (debitNoteId) => {
    const query = 'DELETE FROM terms_conditions WHERE debit_note_id = ?';
    const [result] = await pool.execute(query, [debitNoteId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a sales return
  deleteBySalesReturnId: async (salesReturnId) => {
    const query = 'DELETE FROM terms_conditions WHERE sales_return_id = ?';
    const [result] = await pool.execute(query, [salesReturnId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a purchase return
  deleteByPurchaseReturnId: async (purchaseReturnId) => {
    const query = 'DELETE FROM terms_conditions WHERE purchase_return_id = ?';
    const [result] = await pool.execute(query, [purchaseReturnId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a delivery challan
  deleteByDeliveryChallanId: async (deliveryChallanId) => {
    const query = 'DELETE FROM terms_conditions WHERE delivery_challan_id = ?';
    const [result] = await pool.execute(query, [deliveryChallanId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a purchase order
  deleteByPurchaseOrderId: async (purchaseOrderId) => {
    const query = 'DELETE FROM terms_conditions WHERE purchase_order_id = ?';
    const [result] = await pool.execute(query, [purchaseOrderId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a book purchase order
  deleteByBookPurchaseOrderId: async (bookPurchaseOrderId) => {
    const query = 'DELETE FROM terms_conditions WHERE book_purchase_order_id = ?';
    const [result] = await pool.execute(query, [bookPurchaseOrderId]);
    return result.affectedRows > 0;
  },

  // Delete all terms & conditions for a contract (agreement)
  deleteByContractId: async (contractId) => {
    const query = 'DELETE FROM terms_conditions WHERE contract_id = ?';
    const [result] = await pool.execute(query, [contractId]);
    return result.affectedRows > 0;
  },

  // Bulk create terms & conditions sections
  bulkCreate: async (quotationId, partyId, businessId, sections) => {
    if (!sections || sections.length === 0) return [];

    const query = `
      INSERT INTO terms_conditions (
        quotation_id, sales_invoice_id, proforma_invoice_id, credit_note_id, debit_note_id,
        sales_return_id, purchase_return_id, delivery_challan_id, purchase_invoice_id,
        book_purchase_order_id, purchase_order_id, book_invoice_id, contract_id, party_id, 
        business_id, section_order, heading, content, is_locked
      ) VALUES ?
    `;

    const values = sections.map((section, index) => [
      sanitizeValue(section.quotation_id || quotationId),
      sanitizeValue(section.sales_invoice_id),
      sanitizeValue(section.proforma_invoice_id),
      sanitizeValue(section.credit_note_id),
      sanitizeValue(section.debit_note_id),
      sanitizeValue(section.sales_return_id),
      sanitizeValue(section.purchase_return_id),
      sanitizeValue(section.delivery_challan_id),
      sanitizeValue(section.purchase_invoice_id),
      sanitizeValue(section.book_purchase_order_id),
      sanitizeValue(section.purchase_order_id),
      sanitizeValue(section.book_invoice_id),
      sanitizeValue(section.contract_id || (quotationId && !partyId ? null : quotationId)), // This is a bit messy in bulkCreate, fixing it below
      sanitizeValue(partyId),
      sanitizeValue(businessId),
      section.section_order || index + 1,
      section.heading || 'Terms & Conditions',
      section.content || '',
      section.is_locked ? 1 : 0
    ]);

    const [result] = await pool.query(query, [values]);
    return result.insertId;
  },

  updateSectionOrder: async (id, newOrder) => {
    const query = 'UPDATE terms_conditions SET section_order = ? WHERE id = ?';
    const [result] = await pool.execute(query, [newOrder, id]);
    return result.affectedRows > 0;
  },

  // Sync terms & conditions sections for a document
  syncDocumentTerms: async (docType, docId, partyId, businessId, sections) => {
    if (!sections || !Array.isArray(sections)) return true;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Mapping docType to database column name
      const typeMapping = {
        quotation: 'quotation_id',
        sales: 'sales_invoice_id',
        proforma: 'proforma_invoice_id',
        creditNote: 'credit_note_id',
        debitNote: 'debit_note_id',
        salesReturn: 'sales_return_id',
        purchaseReturn: 'purchase_return_id',
        deliveryChallan: 'delivery_challan_id',
        purchaseInvoice: 'purchase_invoice_id',
        bookPurchaseOrder: 'book_purchase_order_id',
        purchaseOrder: 'purchase_order_id',
        bookInvoice: 'book_invoice_id',
        agreement: 'contract_id'
      };

      const column = typeMapping[docType];
      if (!column) throw new Error(`Invalid document type: ${docType}`);

     

      // 1. Get current entries in database for this document
      const [currentRows] = await connection.execute(
        `SELECT id FROM terms_conditions WHERE ${column} = ?`,
        [docId]
      );
      const currentIds = currentRows.map(row => Number(row.id));
   

      // 2. Identify sections to update, create, and delete
      const incomingIds = sections.filter(s => s.id && Number(s.id) < 1000000000).map(s => Number(s.id));
      const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));


      // 3. Delete removed sections
      if (idsToDelete.length > 0) {
        await connection.query(
          `DELETE FROM terms_conditions WHERE id IN (?)`,
          [idsToDelete]
        );
      }

      // 4. Update or Insert sections
      for (const [index, section] of sections.entries()) {
        const sectionId = section.id ? Number(section.id) : null;
        const isNewSection = !sectionId || sectionId >= 1000000000 || !currentIds.includes(sectionId);

        const sectionData = {
          heading: section.heading || 'Terms & Conditions',
          content: section.content || '',
          section_order: section.section_order || index + 1,
          is_locked: (section.is_locked === true || section.is_locked === 1 || section.is_locked === '1') ? 1 : 0,
          party_id: partyId || null,
          business_id: businessId,
          [column]: docId
        };

        if (!isNewSection) {
       
          const updateFields = [];
          const updateValues = [];
          
          for (const [key, value] of Object.entries(sectionData)) {
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
          }
          
          updateValues.push(sectionId);
          await connection.execute(
            `UPDATE terms_conditions SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
          );
        } else {
    
          const fields = Object.keys(sectionData);
          const values = Object.values(sectionData);
          const placeholders = fields.map(() => '?').join(', ');
          
          await connection.execute(
            `INSERT INTO terms_conditions (${fields.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get globally locked terms for a business (deduplicated by heading and content)
  findLockedByBusinessId: async (businessId) => {
    const query = `
      SELECT t1.* FROM terms_conditions t1
      INNER JOIN (
          SELECT MAX(id) as id 
          FROM terms_conditions 
          WHERE business_id = ? AND is_locked = TRUE
          GROUP BY heading, content
      ) t2 ON t1.id = t2.id
      ORDER BY t1.section_order ASC
    `;
    const [rows] = await pool.execute(query, [businessId]);
    return rows;
  },

  // Toggle lock a section (lock one and ensure no other section is locked)
  lockSection: async (id, businessId) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if this specific section exists and get its lock status
      const [currentStatus] = await connection.execute(
        'SELECT is_locked, business_id FROM terms_conditions WHERE id = ?',
        [id]
      );

      if (currentStatus.length === 0) {
        await connection.rollback();
        throw new Error('Section not found');
      }

      // Check the lock status explicitly (1 is locked, 0 is unlocked)
      const isCurrentlyLocked = currentStatus[0].is_locked === 1 || currentStatus[0].is_locked === true;

      if (isCurrentlyLocked) {
        // If it's already locked, we want to unlock it (toggle)
        const [result] = await connection.execute(
          'UPDATE terms_conditions SET is_locked = FALSE WHERE id = ?',
          [id]
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          throw new Error('Failed to unlock section');
        }

        await connection.commit();
        return { success: true, action: 'unlocked' };
      } else {
        // Now lock this one
        const [result] = await connection.execute(
          'UPDATE terms_conditions SET is_locked = TRUE, business_id = ? WHERE id = ?',
          [businessId, id]
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          throw new Error('Failed to lock section');
        }

        await connection.commit();
        return { success: true, action: 'locked' };
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = TermsConditions;
