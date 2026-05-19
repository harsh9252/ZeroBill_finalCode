const axios = require('axios');
const crypto = require('crypto');

// ─── Dynamic config from ENV ─────────────────────────────────────────────────
const getConfig = () => ({
    provider: process.env.EINVOICE_PROVIDER || 'iris',
    baseUrl: process.env.EINVOICE_BASE_URL || 'https://api.irisgst.com/einvoice',
    clientId: process.env.EINVOICE_CLIENT_ID || '',
    clientSecret: process.env.EINVOICE_CLIENT_SECRET || '',
    username: process.env.EINVOICE_USERNAME || '',
    password: process.env.EINVOICE_PASSWORD || '',
    gstin: process.env.EINVOICE_GSTIN || '',
    enabled: process.env.EINVOICE_ENABLED === 'true',
    sandbox: process.env.EINVOICE_SANDBOX !== 'false',
    // ✅ MOCK MODE — set EINVOICE_MOCK=true in .env to skip real API
    mock: process.env.EINVOICE_MOCK === 'true',
});

// ─── MOCK IRN Generator ───────────────────────────────────────────────────────
/**
 * Creates realistic-looking fake IRN, AckNo, QR data for testing.
 * Real IRN format = SHA-256(SellerGSTIN + InvoiceNo + FinancialYear)
 */
const generateMockIRN = (invoice, business) => {
    const sellerGstin = business.gstin || 'TEST_GSTIN_000000';
    const invoiceNo = invoice.invoice_number || 'INV-MOCK';
    const fy = (() => {
        const d = new Date(invoice.invoice_date || Date.now());
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-indexed
        return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    })();

    // IRN = SHA-256 hash (mimics real format exactly)
    const irnSource = `${sellerGstin}${invoiceNo}${fy}`;
    const irn = crypto.createHash('sha256').update(irnSource).digest('hex');

    // Ack Number = 15 digit numeric (realistic format)
    const ackNo = `1123${Date.now().toString().slice(-11)}`;

    // Ack Date = current date-time in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);
    const ackDate = istDate.toISOString().slice(0, 19).replace('T', ' ');

    // Signed QR — in real life this is a JWT. We generate short version for display/testing.
    const qrPayload = JSON.stringify({
        SellerGstin: sellerGstin,
        BuyerGstin: 'BUYER_GSTIN_000000',
        DocNo: invoiceNo,
        DocDate: invoice.invoice_date,
        TotInvVal: invoice.grand_total || 0,
        ItemCnt: 1,
        MainHsnCode: '9999',
        Irn: irn,
        IssDate: ackDate,
    });
    const signedQrCode = Buffer.from(qrPayload).toString('base64');

    // Mock signed invoice (short JWT-like)
    const signedInvoice = `MOCK.${Buffer.from(JSON.stringify({ irn, ackNo })).toString('base64')}.MOCKSIG`;

    return {
        irn,
        ack_no: ackNo,
        ack_date: ackDate,
        signed_qr_code: signedQrCode,
        signed_invoice: signedInvoice,
        raw_response: { _mock: true, message: 'Mock E-Invoice — for testing only', Irn: irn, AckNo: ackNo, AckDt: ackDate },
        payload_sent: { _mock: true, invoice_number: invoiceNo, gstin: sellerGstin },
    };
};

// ─── Token Cache ──────────────────────────────────────────────────────────────
let _tokenCache = null;
let _tokenExpiry = null;

const getToken = async (forceRefresh = false) => {
    const cfg = getConfig();
    
    // Clear cache if provider or gstin changed (for sandbox testing) or forceRefresh requested
    const cacheKey = `${cfg.provider}_${cfg.gstin}_${cfg.username}`;
    if (forceRefresh || (_tokenCache && _tokenCache.key !== cacheKey)) {
        _tokenCache = null;
        _tokenExpiry = null;
    }

    if (_tokenCache && _tokenExpiry && Date.now() < _tokenExpiry) return _tokenCache.token;

    const authEndpoints = {
        iris: `${cfg.baseUrl}/auth/login`,
        nic: `${cfg.baseUrl}/auth/token`,
        masters: `${cfg.baseUrl}/api/v1/token-auth/`,
    };

    let payload = { client_id: cfg.clientId, client_secret: cfg.clientSecret, username: cfg.username, password: cfg.password, gstin: cfg.gstin };
    if (cfg.provider === 'masters') {
        payload = { username: cfg.username, password: cfg.password };
    }

    try {
        const response = await axios.post(
            authEndpoints[cfg.provider] || authEndpoints.iris,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const data = response.data;
        // Masters India sometimes uses 'access' instead of 'access_token'
        const token = data.data?.AuthToken || data.AuthToken || data.access_token || data.token || data.access;
        
        if (!token) {
            logApiCall('AUTH_ERROR', authEndpoints[cfg.provider], payload, data);
            throw new Error('E-Invoice auth failed: no token in response');
        }

        _tokenCache = { token, key: `${cfg.provider}_${cfg.gstin}_${cfg.username}` };
        _tokenExpiry = Date.now() + 5 * 60 * 60 * 1000; // 5 hours
        return token;
    } catch (err) {
        const errData = err.response?.data || err.message;
        logApiCall('AUTH_ERROR', authEndpoints[cfg.provider], payload, errData);
        throw err;
    }
};

// ─── State Code Mapping ───────────────────────────────────────────────────────
const STATE_CODES = {
    'Jammu & Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04',
    'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08',
    'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12',
    'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15', 'Tripura': '16',
    'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20',
    'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24',
    'Daman and Diu': '25', 'Dadra and Nagar Haveli': '26', 'Maharashtra': '27',
    'Andhra Pradesh': '28', 'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31',
    'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34', 'Andaman and Nicobar Islands': '35',
    'Telangana': '36', 'Ladakh': '38',
};

const getStateCode = (stateName) => {
    if (!stateName) return '29'; // default Karnataka
    if (/^\d{2}$/.test(stateName.trim())) return stateName.trim();
    return STATE_CODES[stateName] || '29';
};

const extractStateCodeFromGstin = (gstin) => {
    if (gstin && gstin.length >= 2 && /^\d{2}/.test(gstin)) {
        return gstin.substring(0, 2);
    }
    return null;
};

// ─── State to Pincode Mapping (Safety Fallbacks) ─────────────────────────────
const STATE_PINCODE_MAP = {
    '01': '190001', '02': '171001', '03': '160017', '04': '160017',
    '05': '248001', '06': '122001', '07': '110001', '08': '302001',
    '09': '226001', '10': '800001', '11': '737101', '12': '791111',
    '13': '797001', '14': '795001', '15': '796001', '16': '799001',
    '17': '793001', '18': '781001', '19': '700001', '20': '834001',
    '21': '751001', '22': '492001', '23': '462001', '24': '380001',
    '25': '396210', '26': '396230', '27': '400001', '28': '500001',
    '29': '560001', '30': '403001', '31': '682555', '32': '695001',
    '33': '600001', '34': '605001', '35': '744101', '36': '500001',
    '37': '792011', '38': '194101',
};

const STATE_TO_PIN_PREFIX = {
    '01': '1', '02': '1', '03': '1', '04': '1', '06': '1', '07': '1',
    '05': '2', '09': '2',
    '08': '3', '24': '3',
    '23': '4', '22': '4', '27': '4', '25': '4', '26': '4', '30': '4',
    '28': '5', '36': '5', '29': '5',
    '31': '6', '32': '6', '33': '6', '34': '6',
    '19': '7', '11': '7', '18': '7', '12': '7', '13': '7', '14': '7', '15': '7', '16': '7', '17': '7', '35': '7',
    '10': '8', '20': '8',
};

const validateAndFixPincode = (pin, stateCode) => {
    let p = (pin || '').toString().replace(/[^0-9]/g, '');
    // If pin is empty, invalid length, or a common placeholder, use state-specific default
    if (p.length !== 6 || p === '100000' || p === '000000') {
        return parseInt(STATE_PINCODE_MAP[stateCode] || '110001');
    }
    
    // Safety check: Pincode prefix vs State region
    const expectedPrefix = STATE_TO_PIN_PREFIX[stateCode];
    if (expectedPrefix && p[0] !== expectedPrefix) {
        console.warn(`[E-Invoice Safety] Pincode ${p} does not match region for state ${stateCode}. Using default.`);
        return parseInt(STATE_PINCODE_MAP[stateCode] || '110001');
    }
    
    return parseInt(p);
};

// ─── Phone Number Formatter ──────────────────────────────────────────────────
/**
 * Ensures phone number is exactly 10 digits without +91 or other prefixes.
 * NIC/IRIS/Masters validation often fails if Ph > 12 chars.
 */
const formatEInvoicePhone = (phone) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    let p = phone.toString().replace(/[^0-9]/g, '');
    
    // If it starts with 91 and is longer than 10 digits, remove the 91
    if (p.length > 10 && p.startsWith('91')) {
        p = p.substring(p.length - 10);
    }
    
    // Final safety: ensure it's not longer than 10 (or 12 if including some extension, but 10 is standard for India)
    // We take the last 10 digits to be safe.
    if (p.length > 10) {
        p = p.slice(-10);
    }
    
    return p || null;
};

// ─── JSON Schema Builder ──────────────────────────────────────────────────────
const buildPayload = (invoice, business, party, cfg = {}) => {
    let invoiceData = {};
    try {
        invoiceData = typeof invoice.invoice_data === 'string'
            ? JSON.parse(invoice.invoice_data) : (invoice.invoice_data || {});
    } catch (e) {
        console.error('Failed to parse invoice_data:', e.message);
    }

    // Support varied formats: { lines: [...] }, { line_items: [...] }, or direct [...]
    const items = invoiceData.lines || invoiceData.line_items || (Array.isArray(invoiceData) ? invoiceData : []);
    
    if (!items || items.length === 0) {
        throw new Error('Invoice has no items. At least one item is required for E-Invoice.');
    }

    const lineItems = items;

    const fmtDate = (d) => {
        const dt = d ? new Date(d) : new Date();
        const validDt = isNaN(dt.getTime()) ? new Date() : dt;
        return `${String(validDt.getDate()).padStart(2, '0')}/${String(validDt.getMonth() + 1).padStart(2, '0')}/${validDt.getFullYear()}`;
    };

    const sellerGstin = cfg.gstin || business.gstin || '';
    const buyerGstin = party?.gstin || '';
    
    if (!sellerGstin) throw new Error('Seller GSTIN is missing.');
    if (!buyerGstin) throw new Error('Buyer GSTIN is missing.');
    
    // Use GSTIN prefix (first 2 digits) as state code, fallback to name mapping
    const sellerState = extractStateCodeFromGstin(sellerGstin) || getStateCode(business.state);
    const buyerState = extractStateCodeFromGstin(buyerGstin) || getStateCode(party?.state || invoice.billing_state);
    
    const isIgst = sellerState !== buyerState;

    const headerDiscount = parseFloat(invoice.discount_amount || 0);
    // Calculate total gross assessable value to distribute header discount proportionally
    const totalGrossAssessable = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || item.qty || 1);
        const unitPrice = parseFloat(item.unit_price || item.rate || item.price || 0);
        const gross = parseFloat(item.taxable_amount || item.taxable || item.subtotal || (qty * unitPrice));
        const itemDisc = parseFloat(item.discount || item.discountValue || 0);
        return sum + (gross - itemDisc);
    }, 0);

    const itemList = lineItems.map((item, idx) => {
        const qty = parseFloat(item.quantity || item.qty || 1);
        const unitPrice = parseFloat(item.unit_price || item.rate || item.price || 0);
        const gross = parseFloat(item.taxable_amount || item.taxable || item.subtotal || (qty * unitPrice));
        const itemDisc = parseFloat(item.discount || item.discountValue || 0);
        
        // Initial taxable value for this item (Net of item-level discount)
        let itemAssAmt = gross - itemDisc;

        // Distribute header-level discount across items proportionally
        if (headerDiscount > 0 && totalGrossAssessable > 0) {
            const proRataHeaderDisc = (itemAssAmt / totalGrossAssessable) * headerDiscount;
            itemAssAmt -= proRataHeaderDisc;
        }

        itemAssAmt = parseFloat(itemAssAmt.toFixed(2));
        
        const gstRate = parseFloat(item.gst_rate || item.tax_rate || item.gstPct || 18);
        const igstAmt = isIgst ? parseFloat((itemAssAmt * gstRate / 100).toFixed(2)) : 0;
        const cgstAmt = !isIgst ? parseFloat((itemAssAmt * gstRate / 200).toFixed(2)) : 0;
        const SGSTAmt = !isIgst ? parseFloat((itemAssAmt * gstRate / 200).toFixed(2)) : 0;
        
        const hsn = (item.hsn || item.hsn_code || '9999').toString().replace(/[^0-9]/g, '');
        const isService = hsn.startsWith('99') || item.is_service || item.isService || (item.taxType === 'GST' && !item.unit) || false;

        return {
            SlNo: String(idx + 1),
            PrdDesc: (item.item_name || item.description || item.name || 'Item').substring(0, 100),
            IsServc: isService ? 'Y' : 'N',
            HsnCd: hsn,
            Qty: qty,
            Unit: item.unit || (isService ? 'OTH' : 'NOS'),
            UnitPrice: unitPrice,
            TotAmt: parseFloat((qty * unitPrice).toFixed(2)),
            Discount: parseFloat(itemDisc.toFixed(2)),
            AssAmt: itemAssAmt,
            GstRt: gstRate,
            IgstAmt: igstAmt,
            CgstAmt: cgstAmt,
            SgstAmt: SGSTAmt,
            TotItemVal: parseFloat((itemAssAmt + igstAmt + cgstAmt + SGSTAmt).toFixed(2)),
        };
    });

    const totalAssVal = itemList.reduce((s, i) => s + i.AssAmt, 0);
    const totalIgstVal = itemList.reduce((s, i) => s + i.IgstAmt, 0);
    const totalCgstVal = itemList.reduce((s, i) => s + i.CgstAmt, 0);
    const totalSgstVal = itemList.reduce((s, i) => s + i.SgstAmt, 0);

    // --- Robust Balancing Fix (Error 2189 & Rounding Limit) ---
    const sumOfComponents = parseFloat((totalAssVal + totalIgstVal + totalCgstVal + totalSgstVal).toFixed(2));
    const grandTotal = parseFloat(parseFloat(invoice.grand_total || sumOfComponents).toFixed(2));
    const diff = parseFloat((grandTotal - sumOfComponents).toFixed(2));

    let roundOff = 0;
    let otherCharges = 0;
    let extraDiscount = 0;

    if (Math.abs(diff) <= 1.0) {
        roundOff = diff;
    } else if (diff > 1.0) {
        otherCharges = diff;
    } else {
        extraDiscount = Math.abs(diff);
    }

    return {
        Version: '1.1',
        TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N', IgstOnIntra: 'N' },
        DocDtls: { Typ: 'INV', No: (invoice.invoice_number || '').substring(0, 16), Dt: fmtDate(invoice.invoice_date) },
        SellerDtls: {
            Gstin: sellerGstin,
            LglNm: (business.business_name || 'None').substring(0, 100),
            TrdNm: (business.business_name || 'None').substring(0, 100),
            Addr1: (business.address || 'None').substring(0, 100),
            Loc: (business.city && business.city.length >= 3 ? business.city : 'None').substring(0, 50),
            Pin: validateAndFixPincode(business.postal_code, sellerState),
            Stcd: sellerState,
            Ph: formatEInvoicePhone(business.phone),
            Em: business.email || null,
        },
        BuyerDtls: {
            Gstin: buyerGstin,
            LglNm: (party?.party_name || invoice.party_name || 'None').substring(0, 100),
            TrdNm: (party?.trade_name || party?.party_name || invoice.party_name || 'None').substring(0, 100),
            Pos: buyerState,
            Addr1: (party?.address || invoice.billing_address || 'None').substring(0, 100),
            Loc: ((party?.city || invoice.billing_city || 'None').length >= 3 ? (party?.city || invoice.billing_city || 'None') : 'None').substring(0, 50),
            Pin: validateAndFixPincode(party?.postal_code || invoice.billing_pincode, buyerState),
            Stcd: buyerState,
            Ph: formatEInvoicePhone(party?.phone || invoice.billing_phone),
            Em: party?.email || null,
        },
        ItemList: itemList,
        ValDtls: {
            AssVal: parseFloat(totalAssVal.toFixed(2)),
            CgstVal: parseFloat(totalCgstVal.toFixed(2)),
            SgstVal: parseFloat(totalSgstVal.toFixed(2)),
            IgstVal: parseFloat(totalIgstVal.toFixed(2)),
            Discount: parseFloat(extraDiscount.toFixed(2)),
            OthChrg: parseFloat(otherCharges.toFixed(2)),
            TotInvVal: grandTotal,
            RndOffAmt: parseFloat(roundOff.toFixed(2)),
        },
    };
};

// ─── Masters India Specific Schema Builder ────────────────────────────────────────
const buildMastersPayload = (invoice, business, party, cfg = {}) => {
    // 1. Build standard NIC payload first to reuse logic
    const nic = buildPayload(invoice, business, party, cfg);

    // 2. Map specialized Masters India format based on their v1 API
    return {
        user_gstin: nic.SellerDtls.Gstin,
        gstin: nic.SellerDtls.Gstin, // Some versions use gstin instead of user_gstin
        data_source: "erp",
        transaction_details: {
            supply_type: nic.TranDtls.SupTyp || "B2B",
            charge_type: nic.TranDtls.RegRev || "N",
            igst_on_intra: nic.TranDtls.IgstOnIntra || "N",
            ecommerce_gstin: nic.TranDtls.EcommerceGstin || "",
        },
        document_details: {
            document_type: nic.DocDtls.Typ || "INV",
            document_number: nic.DocDtls.No,
            document_date: nic.DocDtls.Dt,
        },
        seller_details: {
            gstin: nic.SellerDtls.Gstin,
            legal_name: nic.SellerDtls.LglNm || "None",
            trade_name: nic.SellerDtls.TrdNm || nic.SellerDtls.LglNm || "None",
            address1: nic.SellerDtls.Addr1 || "None",
            address2: nic.SellerDtls.Addr2 || "",
            location: nic.SellerDtls.Loc || "None",
            pincode: parseInt(nic.SellerDtls.Pin) || 100000,
            state_code: nic.SellerDtls.Stcd || "09",
            phone_number: formatEInvoicePhone(nic.SellerDtls.Ph),
            email: nic.SellerDtls.Em || "",
        },
        buyer_details: {
            gstin: nic.BuyerDtls.Gstin || "URP",
            legal_name: nic.BuyerDtls.LglNm || "None",
            trade_name: nic.BuyerDtls.TrdNm || nic.BuyerDtls.LglNm || "None",
            address1: nic.BuyerDtls.Addr1 || "None",
            address2: nic.BuyerDtls.Addr2 || "",
            location: nic.BuyerDtls.Loc || "None",
            pincode: parseInt(nic.BuyerDtls.Pin) || 100000,
            place_of_supply: nic.BuyerDtls.Pos || "09",
            state_code: nic.BuyerDtls.Stcd || "09",
            phone_number: formatEInvoicePhone(nic.BuyerDtls.Ph),
            email: nic.BuyerDtls.Em || "",
        },
        item_list: nic.ItemList.map(item => ({
            item_serial_number: item.SlNo,
            product_description: item.PrdDesc,
            is_service: item.IsServc,
            hsn_code: item.HsnCd,
            quantity: parseFloat(item.Qty),
            unit: item.Unit,
            unit_price: parseFloat(item.UnitPrice),
            total_amount: parseFloat(item.TotAmt),
            discount: parseFloat(item.Discount || 0),
            assessable_value: parseFloat(item.AssAmt),
            gst_rate: parseFloat(item.GstRt),
            igst_amount: parseFloat(item.IgstAmt || 0),
            cgst_amount: parseFloat(item.CgstAmt || 0),
            sgst_amount: parseFloat(item.SgstAmt || 0),
            total_item_value: parseFloat(item.TotItemVal),
            // Added default zeros for mandatory fields in sample
            free_quantity: 0,
            pre_tax_value: 0,
            other_charge: 0,
            cess_rate: 0,
            cess_amount: 0,
            cess_nonadvol_amount: 0,
            state_cess_rate: 0,
            state_cess_amount: 0,
            state_cess_nonadvol_amount: 0
        })),
        value_details: {
            total_assessable_value: parseFloat(nic.ValDtls.AssVal),
            total_cgst_value: parseFloat(nic.ValDtls.CgstVal),
            total_sgst_value: parseFloat(nic.ValDtls.SgstVal),
            total_igst_value: parseFloat(nic.ValDtls.IgstVal || 0),
            total_invoice_value: parseFloat(nic.ValDtls.TotInvVal),
            total_cess_value: 0,
            total_cess_value_of_state: 0,
            total_discount: parseFloat(nic.ValDtls.Discount || 0),
            total_other_charge: parseFloat(nic.ValDtls.OthChrg || 0),
            round_off_amount: parseFloat(nic.ValDtls.RndOffAmt || 0),
            total_invoice_value_additional_currency: 0
        },
    };
};

// ─── Generate IRN  (Mock OR Real) ─────────────────────────────────────────────
const generateIRN = async (invoice, business, party) => {
    const cfg = getConfig();

    // ✅ MOCK MODE — skip real API, return fake data
    if (cfg.mock) {
      
        const mockResult = generateMockIRN(invoice, business);
        
        return mockResult;
    }

    // ─── REAL API ────────────────────────────────────────────────────────────
    const token = await getToken();
    const isMasters = cfg.provider === 'masters';
    const payload = isMasters 
        ? buildMastersPayload(invoice, business, party, cfg)
        : buildPayload(invoice, business, party, cfg);

    const endpoints = {
        iris: `${cfg.baseUrl}/api/einvoice/generate`,
        nic: `${cfg.baseUrl}/nic/einvoice`,
        masters: `${cfg.baseUrl}/api/v1/einvoice/`,
    };
    const authHeader = isMasters ? `JWT ${token}` : `Bearer ${token}`;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
    };

    if (isMasters) {
        // Masters India usually needs gstin in headers as well
        headers['gstin'] = cfg.gstin;
    } else {
        headers['client_id'] = cfg.clientId;
        headers['client_secret'] = cfg.clientSecret;
        headers['gstin'] = cfg.gstin;
        headers['user_name'] = cfg.username;
    }

    const url = endpoints[cfg.provider] || endpoints.iris;
    
    const makeRequest = async (tokenToUse) => {
        const currentAuthHeader = isMasters ? `JWT ${tokenToUse}` : `Bearer ${tokenToUse}`;
        const currentHeaders = { ...headers, 'Authorization': currentAuthHeader };
        return await axios.post(url, payload, { headers: currentHeaders });
    };

    try {
        let response;
        try {
            response = await makeRequest(token);
        } catch (err) {
            // If 401/403, retry once with a fresh token
            if (err.response?.status === 401 || err.response?.status === 403) {
         
                const freshToken = await getToken(true);
                response = await makeRequest(freshToken);
            } else {
                throw err;
            }
        }

        const data = response.data;
        logApiCall('GENERATE_IRN', url, payload, data);

        // 1. Find the result object (could be data.data, data.results, or an array)
        let result = data.data || data.results || data;

        // 2. If it's an array, take the first element
        if (Array.isArray(result) && result.length > 0) {
            result = result[0];
        }

        // 3. For Masters India, the actual IRN data is often inside result.message
        // Sometimes message is stringified JSON. Also check for logical errors.
        let msg = result.message || {};
        const isErrorStatus = result.code === '204' || result.code === 204 || result.status === 'No Content' || result.status === 'Failed' || result.status === 'Error';
        
        if (isErrorStatus) {
            const errorMsg = result.errorMessage || (typeof msg === 'string' ? msg : result.results?.errorMessage) || 'API Logic Error';
            throw new Error(`E-Invoice API: ${errorMsg}`);
        }

        if (typeof msg === 'string' && msg.trim().startsWith('{')) {
            try { msg = JSON.parse(msg); } catch (e) {
                console.warn('[E-Invoice Masters] Failed to parse result.message as JSON:', e.message);
            }
        }

        // 4. Extract fields (handle various casing and paths)
        // Check msg object first, then result object, then top-level data
        const irn = msg.Irn || msg.irn || msg.IRN || result.Irn || result.irn || result.IRN || data.Irn || data.irn || '';
        const ackNo = msg.AckNo || msg.ack_no || result.AckNo || result.ack_no || data.AckNo || '';
        const ackDate = msg.AckDt || msg.ack_date || result.AckDt || result.ack_date || data.AckDt || '';
        const signedQrCode = msg.SignedQRCode || msg.qrCode || result.SignedQRCode || result.qrCode || data.SignedQRCode || '';
        const signedInvoice = msg.SignedInvoice || msg.signed_invoice || result.SignedInvoice || result.signed_invoice || data.SignedInvoice || '';

        if (isMasters && !irn) {
            console.warn('[E-Invoice Masters] Success status but IRN field not found in response structure.');
        }

        return {
            irn,
            ack_no: ackNo,
            ack_date: ackDate,
            signed_invoice: signedInvoice,
            signed_qr_code: signedQrCode,
            raw_response: data,
            payload_sent: payload,
        };
    } catch (error) {
        const errResponse = error.response?.data || error.message;
        logApiCall('ERROR_GENERATE_IRN', url, payload, errResponse);
        throw error;
    }
};

// ─── Cancel IRN  (Mock OR Real) ───────────────────────────────────────────────
const cancelIRN = async (irn, cancelReason = '1', cancelRemark = 'Cancelled by user', business = null) => {
    const cfg = getConfig();

    if (cfg.mock) {
      
        return { _mock: true, message: 'Mock cancel successful', Irn: irn, CnlDate: new Date().toISOString() };
    }

    const token = await getToken();

    const endpoints = {
        iris: `${cfg.baseUrl}/api/einvoice/cancel`,
        nic: `${cfg.baseUrl}/nic/einvoice/cancel`,
        masters: `${cfg.baseUrl}/api/v1/cancel-einvoice/`,
    };

    const isMasters = cfg.provider === 'masters';
    const authHeader = isMasters ? `JWT ${token}` : `Bearer ${token}`;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
    };

    let payload;
    if (isMasters) {
        payload = {
            user_gstin: cfg.gstin || business?.gstin || '',
            irn: irn,
            cancel_reason: cancelReason,
            cancel_remarks: cancelRemark,
            ewaybill_cancel: ""
        };
    } else {
        headers['client_id'] = cfg.clientId;
        headers['client_secret'] = cfg.clientSecret;
        headers['gstin'] = cfg.gstin;
        headers['user_name'] = cfg.username;
        payload = { Irn: irn, CnlRsn: cancelReason, CnlRem: cancelRemark };
    }

    const response = await axios.post(
        endpoints[cfg.provider] || endpoints.iris,
        payload,
        { headers }
    );

    return response.data;
};

// ─── Get IRN Details ──────────────────────────────────────────────────────────
const getIRNDetails = async (irn) => {
    const cfg = getConfig();

    if (cfg.mock) {
        return { _mock: true, Irn: irn, message: 'Mock IRN details' };
    }

    const token = await getToken();

    const endpoints = {
        iris: `${cfg.baseUrl}/api/einvoice/irn/${irn}`,
        nic: `${cfg.baseUrl}/nic/einvoice/irn?irn=${irn}`,
        masters: `${cfg.baseUrl}/api/v1/get-einvoice?gstin=${cfg.gstin}&irn=${irn}`,
    };

    const isMasters = cfg.provider === 'masters';
    const authHeader = isMasters ? `JWT ${token}` : `Bearer ${token}`;

    const headers = {
        'Authorization': authHeader,
    };

    if (!isMasters) {
        headers['client_id'] = cfg.clientId;
        headers['client_secret'] = cfg.clientSecret;
        headers['gstin'] = cfg.gstin;
    }

    const response = await axios.get(
        endpoints[cfg.provider] || endpoints.iris,
        { headers }
    );

    return response.data;
};

// --- Logging Utility ---
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../einvoice_api.log');

const logApiCall = (type, url, data, response) => {
    try {
        const timestamp = new Date().toISOString();
        const safeResponse = typeof response === 'object' ? JSON.stringify(response) : String(response);
        const logEntry = `\n[${timestamp}] ${type} ${url}\nRequest: ${JSON.stringify(data)}\nResponse: ${safeResponse}\n----------------------------------------\n`;
        fs.appendFileSync(logFile, logEntry);
    } catch (e) {
        console.error('[E-Invoice Log Error]', e.message);
    }
};

// ─── Generate E-Way Bill by IRN (Masters India) ─────────────────────────────
const generateEWayBillByIRN = async (data) => {
    const cfg = getConfig();

    if (cfg.mock) {
   
        return { 
            _mock: true, 
            ewayBillNo: '1234' + Date.now().toString().slice(-8), 
            ewayBillDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            status: 'Generated' 
        };
    }

    const token = await getToken();
    const isMasters = cfg.provider === 'masters';
    if (!isMasters) throw new Error('E-Way Bill by IRN is currently only implemented for Masters India provider.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${token}`,
        'gstin': cfg.gstin
    };

    const url = `${cfg.baseUrl}/api/v1/gen-ewb-by-irn/` + (cfg.gstin ? `?gstin=${cfg.gstin}` : '');
    
    try {
        const response = await axios.post(url, data, { headers });
        logApiCall('POST', url, data, response.data);
        return response.data;
    } catch (err) {
        logApiCall('ERROR', url, data, err.response?.data || err.message);
        throw err;
    }
};

module.exports = { getConfig, buildPayload, generateIRN, cancelIRN, getIRNDetails, generateEWayBillByIRN };
