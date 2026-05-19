import { getApiConfig } from './api';

/**
 * Fetch business profile state from API
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} Business data with state
 */
export const fetchBusinessState = async (businessId) => {
  if (!businessId) return { state: "" };
  try {
    const response = await fetch(`${getApiConfig().backendURL}/api/business/${businessId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (response.ok) {
      const result = await response.json();
      const bizData = result.data || result;
      if (bizData) {
        const state = bizData.state || bizData.State || bizData.business_state || 
                      bizData.businessState || bizData.state_name || bizData.billing_state || "";
        return { ...bizData, state };
      }
    }
    return { state: "" };
  } catch (error) {
    console.error("Error fetching business state:", error);
    return { state: "" };
  }
};

/**
 * Fetch party addresses from API
 * @param {string} partyId - Party ID
 * @returns {Promise<Array>} List of addresses
 */
export const fetchPartyAddresses = async (partyId) => {
  if (!partyId) return [];
  try {
    const businessId = localStorage.getItem("selectedBusinessId");
    const response = await fetch(
      `${getApiConfig().backendURL}/api/parties/${partyId}/addresses?business_id=${businessId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result.data || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching party addresses:", error);
    return [];
  }
};

/**
 * Main Auto Tax Calculation Logic
 * Fetches fresh data for both business and party to ensure accuracy.
 */
export const calculateAutoTaxType = async (params) => {
  const {
    businessId,
    partyId,
    selectedBillingIndex = 0,
    selectedShippingIndex = 0
  } = params;

  try {
    // 1. FETCH BUSINESS DATA
    const businessData = await fetchBusinessState(businessId);
    const businessCountryRaw = businessData?.country || 'India';
    const businessStateRaw = businessData?.state || '';

    // 2. FETCH PARTY DATA
    const addresses = await fetchPartyAddresses(partyId);
    const billingAddrs = (addresses || []).filter(a => a.address_type === 'billing');
    const shippingAddrs = (addresses || []).filter(a => a.address_type === 'shipping');
    
    const activeAddress = (billingAddrs.length > selectedBillingIndex) 
      ? billingAddrs[selectedBillingIndex] 
      : (shippingAddrs.length > selectedShippingIndex)
        ? shippingAddrs[selectedShippingIndex]
        : null;

    const partyCountryRaw = activeAddress?.country || 'India';
    const partyStateRaw = activeAddress?.state || activeAddress?.State || activeAddress?.state_name || activeAddress?.address_state || '';

    // 3. NORMALIZATION & COMPARISON
    const normalizeCountry = (c) => {
      const country = (c || '').trim().toLowerCase();
      if (country === 'in' || country === 'india' || country === 'ind') return 'india';
      return country;
    };

    const stateMap = {
      'AN': 'ANDAMAN AND NICOBAR ISLANDS', 'AP': 'ANDHRA PRADESH', 'AR': 'ARUNACHAL PRADESH',
      'AS': 'ASSAM', 'BR': 'BIHAR', 'CH': 'CHANDIGARH', 'CT': 'CHHATTISGARH',
      'DN': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DL': 'DELHI', 'GA': 'GOA',
      'GJ': 'GUJARAT', 'HR': 'HARYANA', 'HP': 'HIMACHAL PRADESH', 'JK': 'JAMMU AND KASHMIR',
      'JH': 'JHARKHAND', 'KA': 'KARNATAKA', 'KL': 'KERALA', 'LA': 'LADAKH',
      'LD': 'LAKSHADWEEP', 'MP': 'MADHYA PRADESH', 'MH': 'MAHARASHTRA', 'MN': 'MANIPUR',
      'ML': 'MEGHALAYA', 'MZ': 'MIZORAM', 'NL': 'NAGALAND', 'OR': 'ODISHA',
      'PY': 'PUDUCHERRY', 'PB': 'PUNJAB', 'RJ': 'RAJASTHAN', 'SK': 'SIKKIM',
      'TN': 'TAMIL NADU', 'TG': 'TELANGANA', 'TR': 'TRIPURA', 'UP': 'UTTAR PRADESH',
      'UT': 'UTTARAKHAND', 'WB': 'WEST BENGAL'
    };

    const getCanonicalState = (s) => {
      const upper = (s || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      if (!upper) return "";
      if (stateMap[upper]) return stateMap[upper];
      for (const code in stateMap) {
        if (upper === stateMap[code].replace(/[^A-Z]/g, '')) return stateMap[code];
      }
      return upper;
    };

    const bCountry = normalizeCountry(businessCountryRaw);
    const pCountry = normalizeCountry(partyCountryRaw);
    const bState = getCanonicalState(businessStateRaw);
    const pState = getCanonicalState(partyStateRaw);

    // --- CONSOLE DEBUGGING ---
    console.log("%c--- TAX CALCULATION DEBUG ---", "color: white; background: #2ecc71; padding: 4px; font-weight: bold;");
    console.log("1. BUSINESS (Raw):", { country: businessCountryRaw, state: businessStateRaw });
    console.log("2. PARTY (Raw):", { country: partyCountryRaw, state: partyStateRaw });
    console.log("3. NORMALIZED:", { bCountry, pCountry, bState, pState });

    // 4. BUSINESS LEVEL OVERRIDE (USER REQUEST)
    // If business is 'No', return No Tax regardless of party
    // If business is 'VAT', return VAT regardless of party
    // If business is 'GST', proceed to differentiate GST/IGST
    const businessTaxType = (businessData?.tax_type || businessData?.taxType || '').toUpperCase();
    
    if (businessTaxType === 'NO' || businessTaxType === 'NONE') {
      console.log("4. RESULT: No Tax (Business Override)");
      return { taxType: 'No Tax', isIndia: bCountry === 'india', isExport: bCountry !== pCountry, reason: 'Business Config: No Tax' };
    }

    if (businessTaxType === 'VAT') {
      console.log("4. RESULT: VAT (Business Override)");
      return { taxType: 'VAT', isIndia: bCountry === 'india', isExport: bCountry !== pCountry, reason: 'Business Config: VAT' };
    }

    // 5. MATCHING LOGIC (For GST/IGST or legacy detection)
    if (bCountry === 'india') {
      if (pCountry === 'india') {
        // Domestic India
        let taxType = 'GST';
        if (bState && pState) {
          taxType = (bState !== pState) ? 'IGST' : 'GST';
        } else if (pState) {
          taxType = 'IGST'; // Assume IGST if business state missing but party state exists
        }

        console.log("4. RESULT:", taxType);
        console.log("%c-----------------------------", "color: #2ecc71; font-weight: bold;");

        return {
          taxType,
          isIndia: true,
          isExport: false,
          businessState: bState,
          partyState: pState,
          reason: `Domestic India: ${bState} vs ${pState}`
        };
      } else {
        // Export
        console.log("4. RESULT: IGST (Export)");
        console.log("%c-----------------------------", "color: #2ecc71; font-weight: bold;");
        return { taxType: 'IGST', isIndia: true, isExport: true, reason: `Export to ${partyCountryRaw}` };
      }
    } else {
      // Outside India
      const isExport = bCountry !== pCountry;
      const resultType = 'VAT';
      console.log("4. RESULT:", resultType, isExport ? "(International)" : "(Local)");
      console.log("%c-----------------------------", "color: #2ecc71; font-weight: bold;");
      return {
        taxType: resultType,
        isIndia: false,
        isExport,
        reason: isExport ? `International: ${bCountry} to ${pCountry}` : `Local ${bCountry} Business`
      };
    }
  } catch (error) {
    console.error('Tax calculation error:', error);
    return { taxType: 'GST', isIndia: true, isExport: false, reason: 'Error fallback' };
  }
};
