const BookInvoice = require('../models/bookInvoiceModel');

const adjustStockOnUpdate = async (oldInvoice, newInvoice, businessId) => {
    if (!oldInvoice || !newInvoice) return;
    const oldLines = (oldInvoice.book_invoice_data && oldInvoice.book_invoice_data.lines) || [];
    const newLines = (newInvoice.book_invoice_data && newInvoice.book_invoice_data.lines) || [];

    const oldMap = {};
    const newMap = {};

    oldLines.forEach(line => {
        const productId = line.productId;
        if (productId && !isNaN(productId)) {
            oldMap[productId] = (oldMap[productId] || 0) + (parseFloat(line.qty) || 0);
        }
    });

    newLines.forEach(line => {
        const productId = line.productId;
        if (productId && !isNaN(productId)) {
            newMap[productId] = (newMap[productId] || 0) + (parseFloat(line.qty) || 0);
        }
    });

    const allProductIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
    const Inventory = require('../models/inventoryModel');

    for (const productId of allProductIds) {
        const oldQty = oldMap[productId] || 0;
        const newQty = newMap[productId] || 0;
        const diff = newQty - oldQty; // positive means new is larger (add stock), negative means old was larger (subtract stock)

        if (diff !== 0) {
            await Inventory.updateStock(productId, businessId, diff, `Book Invoice ${newInvoice.book_invoice_number}`);
        }
    }
};

const bookInvoiceController = {
    create: async (req, res) => {
        try {
            const id = await BookInvoice.create(req.body);

            // Handle terms sections if provided
            if (req.body.terms_sections && Array.isArray(req.body.terms_sections) && req.body.terms_sections.length > 0) {
                const TermsConditions = require('../models/termsConditionsModel');
                await TermsConditions.syncDocumentTerms('bookInvoice', id, req.body.party_id, req.body.business_id, req.body.terms_sections);
            }

            // Add stock for all items in the book invoice
            const invoice = await BookInvoice.findById(id, req.body.business_id);
            if (invoice && invoice.book_invoice_data && Array.isArray(invoice.book_invoice_data.lines)) {
                const Inventory = require('../models/inventoryModel');
                for (const line of invoice.book_invoice_data.lines) {
                    const productId = line.productId;
                    const qty = parseFloat(line.qty) || 0;
                    if (productId && qty > 0 && !isNaN(productId)) {
                        await Inventory.updateStock(productId, req.body.business_id, qty, `Book Invoice ${invoice.book_invoice_number}`);
                    }
                }
            }

            res.status(201).json({ success: true, message: 'Book Invoice created successfully', id });
        } catch (error) {
            console.error('Error creating book invoice:', error);

            // Handle duplicate number error
            if (error.code === 'DUPLICATE_NUMBER') {
                return res.status(409).json({
                    success: false,
                    message: error.message,
                    code: 'DUPLICATE_NUMBER',
                    field: 'book_invoice_number'
                });
            }

            res.status(500).json({ success: false, message: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const { business_id, ...filters } = req.query;
            const invoices = await BookInvoice.findByBusinessId(business_id, filters);
            res.json({ success: true, data: invoices });
        } catch (error) {
            console.error('Error getting book invoices:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const { business_id } = req.query;
            const invoice = await BookInvoice.findById(id, business_id);
            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Book Invoice not found' });
            }
            res.json({ success: true, data: invoice });
        } catch (error) {
            console.error('Error getting book invoice:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get all Book Invoices linked to a specific PO
    getByPoReference: async (req, res) => {
        try {
            const { po_reference, business_id } = req.query;
            if (!po_reference || !business_id) {
                return res.status(400).json({ success: false, message: 'po_reference and business_id are required' });
            }
            const invoices = await BookInvoice.findByPoReference(po_reference, business_id);
            res.json({ success: true, data: invoices });
        } catch (error) {
            console.error('Error getting book invoices by PO reference:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { business_id, updateType, supplierInvoiceData, ...invoiceData } = req.body;

            const oldInvoice = await BookInvoice.findById(id, business_id);

            if (updateType === 'supplier_invoice' && supplierInvoiceData) {
                const record = await BookInvoice.findById(id, business_id);
                if (!record) {
                    return res.status(404).json({ success: false, message: 'Book Invoice not found' });
                }

                const data = record.book_invoice_data || {};
                const lines = data.lines || [];
                const targetIdx = supplierInvoiceData.originalIndex;
                const targetInvoiceNo = supplierInvoiceData.invoiceNo;

                let found = false;
                lines.forEach((line, lIdx) => {
                    if (lIdx === targetIdx || line.originalIndex === targetIdx) {
                        const sInvoices = line.supplierInvoices || [];
                        sInvoices.forEach((si, siIdx) => {
                            if (si.invoiceNo === targetInvoiceNo) {
                                sInvoices[siIdx] = {
                                    ...si,
                                    receivedQty: parseFloat(supplierInvoiceData.receivedQty) || 0,
                                    unitPrice: parseFloat(supplierInvoiceData.unitPrice) || 0,
                                    discountPct: parseFloat(supplierInvoiceData.discountPct) || 0,
                                    taxPct: parseFloat(supplierInvoiceData.taxPct) || 0,
                                    vatPct: parseFloat(supplierInvoiceData.vatPct) || 0,
                                    cgstPct: parseFloat(supplierInvoiceData.cgstPct) || 0,
                                    sgstPct: parseFloat(supplierInvoiceData.sgstPct) || 0,
                                    igstPct: parseFloat(supplierInvoiceData.igstPct) || 0,
                                    amount: parseFloat(supplierInvoiceData.amount) || 0,
                                    notes: supplierInvoiceData.notes,
                                    invoiceDate: supplierInvoiceData.invoiceDate || si.invoiceDate
                                };
                                found = true;
                            }
                        });

                        if (found) {
                            line.qty = sInvoices.reduce((sum, inv) => sum + (parseFloat(inv.receivedQty) || 0), 0);
                            line.amount = sInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
                        }
                    }
                });

                if (!found) {
                    return res.status(404).json({ success: false, message: 'Supplier invoice not found in record' });
                }

                const newTotalAmount = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
                const updatePayload = {
                    total_amount: newTotalAmount,
                    grand_total: newTotalAmount,
                    book_invoice_data: { ...data, lines }
                };

                await BookInvoice.update(id, business_id, updatePayload);
                const newInvoice = await BookInvoice.findById(id, business_id);
                await adjustStockOnUpdate(oldInvoice, newInvoice, business_id);

                return res.json({ success: true, message: 'Supplier invoice updated successfully' });
            }

            const success = await BookInvoice.update(id, business_id, invoiceData);
            if (!success) {
                const exists = await BookInvoice.findById(id, business_id);
                if (!exists) {
                    return res.status(404).json({ success: false, message: 'Book Invoice not found' });
                }
            }

            if (req.body.terms_sections && Array.isArray(req.body.terms_sections)) {
                const TermsConditions = require('../models/termsConditionsModel');
                await TermsConditions.syncDocumentTerms('bookInvoice', id, invoiceData.party_id, business_id, req.body.terms_sections);
            }

            const newInvoice = await BookInvoice.findById(id, business_id);
            await adjustStockOnUpdate(oldInvoice, newInvoice, business_id);

            res.json({ success: true, message: 'Book Invoice updated successfully' });
        } catch (error) {
            console.error('Error updating book invoice:', error);

            // Handle duplicate number error
            if (error.code === 'DUPLICATE_NUMBER') {
                return res.status(409).json({
                    success: false,
                    message: error.message,
                    code: 'DUPLICATE_NUMBER',
                    field: 'book_invoice_number'
                });
            }

            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const { business_id } = req.query;

            const oldInvoice = await BookInvoice.findById(id, business_id);

            const success = await BookInvoice.delete(id, business_id);
            if (!success) {
                return res.status(404).json({ success: false, message: 'Book Invoice not found' });
            }

            // Deduct stock since the invoice is deleted
            if (oldInvoice && oldInvoice.book_invoice_data && Array.isArray(oldInvoice.book_invoice_data.lines)) {
                const Inventory = require('../models/inventoryModel');
                for (const line of oldInvoice.book_invoice_data.lines) {
                    const productId = line.productId;
                    const qty = parseFloat(line.qty) || 0;
                    if (productId && qty > 0 && !isNaN(productId)) {
                        await Inventory.updateStock(productId, business_id, -qty, `Book Invoice ${oldInvoice.book_invoice_number} (Deleted)`);
                    }
                }
            }

            res.json({ success: true, message: 'Book Invoice deleted successfully' });
        } catch (error) {
            console.error('Error deleting book invoice:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getStats: async (req, res) => {
        try {
            const { business_id } = req.query;
            const stats = await BookInvoice.getStats(business_id);
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Error getting book invoice stats:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getNextNumber: async (req, res) => {
        try {
            const { business_id } = req.query;
            const { getUnifiedNextNumber } = require('../utils/invoiceSequenceGenerator');

            const lastNumber = await BookInvoice.getLastInvoiceNumber(business_id);
            const nextNumber = await getUnifiedNextNumber(business_id, 'book_invoice');

            res.json({ success: true, data: { book_invoice_number: nextNumber } });
        } catch (error) {
            console.error('Error getting next book invoice number:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = bookInvoiceController;
