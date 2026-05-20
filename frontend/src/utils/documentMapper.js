import api from './api';
import { numberToWords } from './numberToWords';

/**
 * Shared utility to resolve asset URLs (images, QR codes)
 */
const resolveUrl = (url, backendURL) => {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${backendURL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Shared utility to aggregate totals from lines
 */
const aggregateTotals = (lines, metaData, row, currency) => {
    const lineDetails = (lines || []).map(l => {
        const qty = Number(l.qty || 0);
        const price = Number(l.price || 0);
        const discountPct = Number(l.discountPct || l.discount_pct || 0);
        const amt = qty * price;
        const discountValue = (amt * discountPct) / 100;

        // Use pre-calculated taxable if available, otherwise calculate it
        const taxable = Number(l.taxable) || Math.max(0, amt - discountValue);

        const cgstPct = Number(l.cgstPct || l.cgst_pct || 0);
        const sgstPct = Number(l.sgstPct || l.sgst_pct || 0);
        const igstPct = Number(l.igstPct || l.igst_pct || 0);
        const vatPct = Number(l.vatPct || l.vat_pct || 0);

        // Use pre-calculated individual tax amounts if available, otherwise calculate from percent
        const cgstAmt = Number(l.cgstAmount || l.cgst_amount) || (taxable * cgstPct / 100);
        const sgstAmt = Number(l.sgstAmount || l.sgst_amount) || (taxable * sgstPct / 100);
        const igstAmt = Number(l.igstAmount || l.igst_amount) || (taxable * igstPct / 100);
        const vatAmt = Number(l.vatAmount || l.vat_amount) || (taxable * vatPct / 100);

        // Total tax for this line
        const totalTax = Number(l.tax) || (cgstAmt + sgstAmt + igstAmt + vatAmt);

        return {
            taxable,
            cgstAmt,
            sgstAmt,
            igstAmt,
            vatAmt,
            totalTax,
            discountValue
        };
    });

    const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
    const taxableAmount = lineDetails.reduce((sum, l) => sum + l.taxable, 0);
    const totalTax = lineDetails.reduce((sum, l) => sum + l.totalTax, 0);
    const cgstAmount = lineDetails.reduce((sum, l) => sum + l.cgstAmt, 0);
    const sgstAmount = lineDetails.reduce((sum, l) => sum + l.sgstAmt, 0);
    const igstAmount = lineDetails.reduce((sum, l) => sum + l.igstAmt, 0);
    const vatAmount = lineDetails.reduce((sum, l) => sum + l.vatAmt, 0);
    const totalDiscountValue = lineDetails.reduce((sum, l) => sum + l.discountValue, 0);

    const chargesTotal = (Array.isArray(metaData.charges) ? metaData.charges : []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const discountAfterTaxPct = Number(metaData.discountAfterTaxPct || 0);
    let discountAfterTaxValue = (taxableAmount + totalTax + chargesTotal) * (discountAfterTaxPct / 100);

    if (discountAfterTaxValue === 0 && (row.discount_amount || row.discount || metaData.discountAmount || metaData.discount)) {
        discountAfterTaxValue = Number(row.discount_amount || row.discount || metaData.discountAmount || metaData.discount || 0);
    }

    let grandTotal = taxableAmount + totalTax + chargesTotal - discountAfterTaxValue;

    const paymentTerms = metaData.paymentTerms || [];
    if (isNaN(grandTotal)) grandTotal = Number(row.grand_total || row.total_amount || row.amount) || 0;

    return {
        totalQty: totalQty,
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        taxTotal: parseFloat(totalTax.toFixed(2)),
        cgstAmount: parseFloat(cgstAmount.toFixed(2)),
        sgstAmount: parseFloat(sgstAmount.toFixed(2)),
        igstAmount: parseFloat(igstAmount.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        discount: parseFloat(totalDiscountValue.toFixed(2)),
        discountAmount: parseFloat(totalDiscountValue.toFixed(2)),
        additionalCharges: parseFloat(chargesTotal.toFixed(2)),
        discountAfterTax: parseFloat(discountAfterTaxValue.toFixed(2)),
        total: parseFloat(grandTotal.toFixed(2)),
        subtotal: parseFloat((taxableAmount + totalTax).toFixed(2)),
        totalInWords: numberToWords(Math.round(grandTotal), currency === 'INR' ? 'indian' : 'international'),
        amountAfterTax: parseFloat(grandTotal.toFixed(2)),
        amountDue: parseFloat(grandTotal.toFixed(2)),
        paymentTerms: paymentTerms,
    };
};

/**
 * Generic document mapper factory
 */
const mapGenericDocument = async (row, businessData, partyAPI, options = {}) => {
    if (!businessData) return null;

    const {
        documentType = 'document',
        metaField = 'meta', // some rows use row.meta, some row.invoice_data
        documentNumberField = 'id',
        documentDateField = 'date',
        termsApiMethod = 'getByQuotationId', // or getBySalesId
        currency = 'INR',
        language = 'en-IN'
    } = options;
    // const metaData = row[metaField] || row.invoice_data || row.note_data || row.challan_data || row.order_data || row.book_purchase_order_data || row.book_invoice_data || row.sales_return_data || {};
    // // const lines = Array.isArray(metaData.lines) ? metaData.lines : [];

    // const lines =
    //     row?.credit_note_data?.lines ||
    //     row?.debit_note_data?.lines ||
    //     row?.metaData?.lines ||
    //     row?.lines ||
    //     row?.items ||
    //     row?.products ||
    //     [];

    let rawMeta = row[metaField] || row.invoice_data || row.note_data || row.credit_note_data || row.debit_note_data || row.challan_data || row.delivery_challan_data || row.order_data || row.purchase_order_data || row.book_purchase_order_data || row.book_invoice_data || row.sales_return_data || row.purchase_return_data || row.quotation_data || row.proforma_data || row.meta || {};

    let metaData = rawMeta;
    if (typeof rawMeta === 'string') {
        try {
            metaData = JSON.parse(rawMeta);
        } catch (e) {
            metaData = {};
        }
    }

    const lines = Array.isArray(metaData.lines) ? metaData.lines : (Array.isArray(row.lines) ? row.lines : []);



    const backendURL = api.getApiConfig().backendURL;
    const totals = aggregateTotals(lines, metaData, row, currency);

    // Asset Resolution
    const logoUrl = resolveUrl(businessData?.logo_url, backendURL);
    const signatureUrl = resolveUrl(businessData?.signature_url, backendURL);
    const stampUrl = resolveUrl(businessData?.stamp_url, backendURL);

    // Party Details
    let partyDetails = null;
    const partyId = row.party_id || row.partyId;
    if (partyId) {
        try {
            const result = await partyAPI.getById(partyId, row.business_id);
            if (result.success && result.data) {
                partyDetails = result.data;
            }
        } catch (error) {
            console.error('Error fetching party details:', error);
        }
    }
    const customerTypeValue = partyDetails?.gstin || partyDetails?.vat || "";

    const customerTypeLabel = partyDetails?.gstin
        ? "GSTIN:"
        : partyDetails?.vat
            ? "VAT No:"
            : "";
    // Utility function to sanitize values
    const safeString = (val) => {
        if (val === null || val === undefined) return '';
        if (val === 'null') return '';
        return String(val);
    };

    // CUSTOMER ADDRESS
    const customerAddress = safeString(metaData.billing_address || partyDetails?.billing_address || row.partyAddress || '').trim();

    // SHIPPING ADDRESS
    const shippingAddress = safeString(metaData.shipping_address || (partyDetails?.shipping_address || partyDetails?.billing_address) || customerAddress).trim();

    // Bank Details
    let bankDetails = null;
    const bankId = row.bank_id || row.bankId || metaData.bank_id;
    if (bankId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendURL}/api/bank-details/${bankId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    bankDetails = result.data;
                }
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
        }
    }
    if (!bankDetails && metaData.bankAccount) {
        bankDetails = metaData.bankAccount;
    }

    // Terms & Conditions
    let terms = [];
    let termsSections = [];
    if (row.dbId || row.id) {
        try {

            const { termsConditionsAPI } = api;
            const docId = row.dbId || row.id;
            // const termsResult = await termsConditionsAPI[termsApiMethod](row.dbId, row.business_id);
            const termsResult = await termsConditionsAPI[termsApiMethod](docId, row.business_id);
            const termsResponse = await termsConditionsAPI.getByProformaId(row.dbId);

            if (termsResult.success && termsResult.data && termsResult.data.length > 0) {
                termsSections = termsResult.data.map(t => ({
                    heading: t.heading,
                    content: t.content,
                    section_order: t.section_order
                }));
                terms = termsResult.data.map(section => section.content).filter(content => content && content.trim());
            } else {
                // const metaTerms = metaData.terms || row.notes || "";
                const metaTerms =
                    metaData.terms ||
                    row.notes ||
                    row.remark ||
                    metaData.remark ||
                    "";
                terms = metaTerms ? metaTerms.split('\n').filter(t => t.trim()) : [];
                termsSections = metaTerms ? [{ heading: "Terms & Conditions", content: metaTerms, section_order: 1 }] : [];
            }
        } catch (error) {
            console.error('Error fetching terms:', error);
        }
    }

    // Date formatting helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' });
    };
    // Company business
    const gstValue = businessData?.gstin || businessData?.vat_number || "";

    const businessTypeLabel = businessData?.gstin
        ? "GSTIN:"
        : businessData?.vat_number
            ? "VAT No:"
            : "";
    return {
        company: {
            name: businessData?.business_name || "",
            tagline: businessData?.tagline || "",
            addressLines: (businessData?.address ? businessData.address.split('\n').filter(line => line.trim()) : []),
            state: businessData?.state || "",
            country: businessData?.country || "India",
            tel: businessData?.phone || "",
            web: businessData?.website || "",
            website: businessData?.website || "",
            email: businessData?.email || "",
            gstin: gstValue,
            businessTypeLabel: businessTypeLabel,
            pan: businessData?.pan || "",
            logo: { url: logoUrl, text: "", slogan: "" },
            signatureUrl: signatureUrl,
            stampUrl: stampUrl,
        },
        customer: {
            name: partyDetails?.party_name || row.partyName || row.party_name || '',
            attention: metaData.billing_attention || partyDetails?.billing_attention || '',
            address: customerAddress,
            phone: partyDetails?.phone_number || '',
            gstin: customerTypeValue || '',
            customerTypeLabel: customerTypeLabel || '',
            placeOfSupply: partyDetails?.state || '',
            state: partyDetails?.state || '',
            country: metaData.country || partyDetails?.country || '',
        },
        shipping: {
            name: partyDetails?.party_name || row.partyName || row.party_name || '',
            attention: metaData.shipping_attention || partyDetails?.shipping_attention || '',
            address: shippingAddress,
            phone: partyDetails?.shipping_phone || partyDetails?.phone_number || '',
            state: partyDetails?.ship_state || partyDetails?.state || '',
            country: metaData.ship_country || partyDetails?.ship_country || metaData.country || partyDetails?.country || '',
        },

        quotation: {
            number: row[documentNumberField] || row.id,
            date: formatDate(row[documentDateField] || row.date),
            dueDate: (
                row.due_date ||
                row.dueDate ||
                row.valid_until ||
                row.valid_till ||
                row.expected_delivery_date ||
                metaData.dueDate ||
                metaData.due_date ||
                metaData.valid_until ||
                metaData.valid_till ||
                metaData.expiry_date ||
                metaData.expected_delivery_date ||
                metaData.delivery_date ||
                row.meta?.dueDate ||
                row.meta?.due_date ||
                row.meta?.valid_until
            ) ? formatDate(
                row.due_date ||
                row.dueDate ||
                row.valid_until ||
                row.valid_till ||
                row.expected_delivery_date ||
                metaData.dueDate ||
                metaData.due_date ||
                metaData.valid_until ||
                metaData.valid_till ||
                metaData.expiry_date ||
                metaData.expected_delivery_date ||
                metaData.delivery_date ||
                row.meta?.dueDate ||
                row.meta?.due_date ||
                row.meta?.valid_until
            ) : null,
            reverseCharge: metaData.payableOnReverseCharge || 'No',
            lrNo: metaData.lrNo || '',
            transport: metaData.transport || '',
            transportId: metaData.transportId || '',
            vehicleNumber: metaData.vehicleNumber || '',
            po_agreement_number: row.po_agreement_number || metaData.po_agreement_number || '',
            remark: row.remark || metaData.remark || '',
        },
        products: lines.map((l, i) => ({
            srNo: i + 1,
            description: l.description || l.name || '',
            subtitle: l.subtitle || '',
            hsn: l.hsn || '',
            qty: Number(l.qty) || 0,
            unit: l.unit || 'PCS',
            price: parseFloat((Number(l.price) || 0).toFixed(2)),
            discountPct: parseFloat((Number(l.discountPct) || 0).toFixed(2)),
            taxType: l.taxType || l.tax_type || 'GST',
            cgstPct: parseFloat((Number(l.cgstPct) || 0).toFixed(2)),
            sgstPct: parseFloat((Number(l.sgstPct) || 0).toFixed(2)),
            igstPct: parseFloat((Number(l.igstPct) || 0).toFixed(2)),
            vatPct: parseFloat((Number(l.vatPct) || 0).toFixed(2)),
            taxable: parseFloat((Number(l.taxable) || 0).toFixed(2)),
            tax: parseFloat((Number(l.tax) || 0).toFixed(2)),
            total: parseFloat((Number(l.total) || 0).toFixed(2)),
            image_url: resolveUrl(l.image_url, backendURL),
        })),
        totals: totals,
        bank: {
            bank_name: bankDetails?.bank_name || '',
            branch: bankDetails?.branch || '',
            account_number: bankDetails?.account_number || bankDetails?.accountNo || '',
            ifsc: bankDetails?.ifsc || 'IFSC',
            account_holder_name: bankDetails?.account_holder_name || '',
            qr_code: resolveUrl(bankDetails?.qr_code || bankDetails?.qrCode, backendURL),
            upi: bankDetails?.upi || '',
        },
        gstNote: {
            payableOnReverseCharge: metaData.payableOnReverseCharge || 'N.A.',
            other: metaData.otherGSTNote || 'N.A.'
        },
        terms: terms,
        termsSections: termsSections,
        notes: row.notes || row.customer_notes || metaData.notes || metaData.customer_notes || metaData.special_instructions || '',
        remark: row.remark || row.remarks || metaData.remark || metaData.remarks || '',
        documentType: documentType,
        currencySymbol: currency === 'USD' ? '$' : '₹',
        activeCurrency: currency,
    };
};

/**
 * Specific Document Mappers
 */

export const mapToSalesInvoiceData = async (row, businessData, partyAPI, passedEInvoiceData = null, currency = 'INR', language = 'en-IN') => {
    const data = await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'sales_invoice',
        documentNumberField: 'invoice_number',
        documentDateField: 'invoice_date',
        termsApiMethod: 'getBySalesId',
        currency,
        language
    });
    if (data) data.einvoice = passedEInvoiceData;
    return data;
};

export const mapToQuotationData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'quotation',
        documentNumberField: 'id',
        documentDateField: 'date',
        termsApiMethod: 'getByQuotationId',
        currency,
        language
    });
};

export const mapToProformaInvoiceData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {

        documentType: 'proforma',
        documentNumberField: 'proforma_number',
        documentDateField: 'proforma_date',
        termsApiMethod: 'getByProformaId',
        currency,
        language
    });
};

export const mapToSalesReturnData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'sales_return',
        documentNumberField: 'return_number',
        documentDateField: 'return_date',
        termsApiMethod: 'getBySalesReturnId',
        currency,
        language
    });
};

export const mapToCreditNoteData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'credit_note',
        documentNumberField: 'note_number',
        documentDateField: 'note_date',
        termsApiMethod: 'getByCreditNoteId',
        currency,
        language
    });
};

export const mapToDebitNoteData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'debit_note',
        documentNumberField: 'note_number',
        documentDateField: 'note_date',
        termsApiMethod: 'getByDebitNoteId',
        currency,
        language
    });
};

export const mapToDeliveryChallanData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'delivery_challan',
        documentNumberField: 'challan_number',
        documentDateField: 'challan_date',
        termsApiMethod: 'getByDeliveryChallanId',
        currency,
        language
    });
};

export const mapToPurchaseOrderData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'purchase_order',
        documentNumberField: 'order_number',
        documentDateField: 'order_date',
        termsApiMethod: 'getByPurchaseOrderId',
        currency,
        language
    });
};

export const mapToBookPurchaseOrderData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'book_purchase_order',
        documentNumberField: 'order_number',
        documentDateField: 'order_date',
        termsApiMethod: 'getByBookPurchaseOrderId',
        currency,
        language
    });
};

export const mapToBookInvoiceData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'book_invoice',
        documentNumberField: 'invoice_number',
        documentDateField: 'invoice_date',
        termsApiMethod: 'getByBookInvoiceId',
        currency,
        language
    });
};

export const mapToPurchaseReturnData = async (row, businessData, partyAPI, currency = 'INR', language = 'en-IN') => {
    return await mapGenericDocument(row, businessData, partyAPI, {
        documentType: 'purchase_return',
        documentNumberField: 'return_number',
        documentDateField: 'return_date',
        termsApiMethod: 'getByPurchaseReturnId',
        currency,
        language
    });
};
