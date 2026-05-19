import React, { forwardRef, useEffect } from 'react';
import FormatOne from './FormatOne';
import FormatTwo from './FormatTwo';
import FormatThree from './FormatThree';
import FormatFour from './FormatFour';
import FormatFive from './FormatFive';
import LetterheadFormat from './LetterheadFormat';
import { getCurrencySymbol, convertAmount, refreshRates } from '../../utils/currency';
import { getDocumentConfig } from './documentTypeConfig';

/**
 * PDFFormatWrapper - Centralized PDF Format Component
 */
const PDFFormatWrapper = forwardRef(({ data, formatNumber = 1, documentType = 'quotation', letterheadImage = null, currency: propCurrency, language: propLanguage }, ref) => {
  const activeCurrency = propCurrency || localStorage.getItem('siteCurrency') || 'INR';
  const activeLanguage = propLanguage || localStorage.getItem('selectedLanguage') || 'en-IN';
  const currencySymbol = getCurrencySymbol(activeCurrency);

  useEffect(() => {
    refreshRates().catch(() => { });
  }, []);

  // Recursively convert amounts in an object/array
  const convertValues = (obj) => {
    if (!obj || typeof obj !== 'object') {
      // If it's a string, see if it looks like JSON (for quotation_data)
      if (typeof obj === 'string' && (obj.startsWith('{') || obj.startsWith('['))) {
        try {
          const parsed = JSON.parse(obj);
          return convertValues(parsed); // Parse and convert internally
        } catch (e) {
          return obj;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) return obj.map(convertValues);

    const converted = { ...obj };
    // Comprehensive list of price-related keys
    const priceKeys = [
      'price', 'rate', 'total', 'amount', 'taxable', 'tax',
      'grandTotal', 'subtotal', 'amountAfterTax', 'taxTotal',
      'taxableAmount', 'cgstAmount', 'sgstAmount', 'igstAmount', 'vatAmount',
      'tax_amount', 'discount_amount', 'total_amount', 'grand_total', 'paid_amount',
      'salesPrice', 'purchasePrice', 'additionalCharges', 'discountAfterTax'
    ];

    for (const key in converted) {
      if (priceKeys.includes(key) && typeof converted[key] === 'number') {
        const convertedAmountVal = convertAmount(converted[key], activeCurrency);
        converted[key] = Number(convertedAmountVal.toFixed(2));
      } else if (typeof converted[key] === 'object' || typeof converted[key] === 'string') {
        converted[key] = convertValues(converted[key]);
      }
    }
    return converted;
  };

  // Get document specific config
  const docConfig = getDocumentConfig(documentType);

  // Transform data based on document type to ensure compatibility
  let transformedData = {
    ...convertValues(data),
    documentType: documentType, // Add document type to data
    currencySymbol: currencySymbol, // Inject active currency symbol
    activeCurrency: activeCurrency, // Inject active currency code
    activeLanguage: activeLanguage, // Inject active language code
    billToLabel: docConfig?.billToLabel || 'Bill To',
    shipToLabel: docConfig?.shipToLabel || 'Ship To',
    receiverLabel: docConfig?.receiverLabel || '',
    showBankDetails: docConfig?.showBankDetails !== undefined ? docConfig.showBankDetails : true,
  };

  // Interchange "Bill To" and "Business Details" sections for Book Invoice and BPO
  if (documentType === 'book_invoice' || documentType === 'purchase_invoice') {
    const originalCompany = transformedData.company || {};
    const originalCustomer = transformedData.customer || {};

    const getAddressLines = (addressStr) => {
      if (!addressStr) return [];
      const lines = addressStr.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) return lines;
      
      const singleLine = lines[0] || "";
      if (singleLine.length > 50 && singleLine.includes(',')) {
        // Find a comma near the middle to split cleanly
        const middle = Math.floor(singleLine.length / 2);
        let commaIndex = singleLine.indexOf(',', middle - 15);
        if (commaIndex === -1 || commaIndex > middle + 15) {
          commaIndex = singleLine.indexOf(',');
        }
        if (commaIndex !== -1) {
          return [
            singleLine.substring(0, commaIndex + 1).trim(),
            singleLine.substring(commaIndex + 1).trim()
          ].filter(Boolean);
        }
      }
      return [singleLine];
    };

    transformedData.company = {
      ...originalCompany,
      name: originalCustomer.name || "",
      addressLines: getAddressLines(originalCustomer.address),
      state: originalCustomer.state || "",
      country: originalCustomer.country || "",
      tel: originalCustomer.phone || "",
      email: originalCustomer.email || "",
      web: "",
      website: "",
      gstin: originalCustomer.gstin || "",
      businessTypeLabel: originalCustomer.customerTypeLabel || "GSTIN",
      pan: originalCustomer.pan || "",
    };

    transformedData.customer = {
      ...originalCustomer,
      name: originalCompany.name || "",
      attention: originalCompany.tagline || "",
      address: Array.isArray(originalCompany.addressLines) ? originalCompany.addressLines.join(", ") : (originalCompany.addressLines || ""),
      phone: originalCompany.tel || "",
      email: originalCompany.email || "",
      gstin: originalCompany.gstin || "",
      customerTypeLabel: originalCompany.businessTypeLabel || "GSTIN",
      placeOfSupply: originalCompany.state || "",
      state: originalCompany.state || "",
      country: originalCompany.country || "",
      pan: originalCompany.pan || "",
    };
  }

  // Select format component based on formatNumber
  const renderFormat = () => {
    // Handle letterhead format
    if (formatNumber === 'letterhead' || formatNumber === 6) {
      return <LetterheadFormat data={transformedData} letterheadImage={letterheadImage} ref={ref} />;
    }

    // Handle numbered formats
    switch (formatNumber) {
      case 1:
        // return <FormatOne quotationData={transformedData} ref={ref} />;
        return <FormatOne data={transformedData} ref={ref} letterheadImage={letterheadImage} />;
      case 2:
        return <FormatTwo data={transformedData} ref={ref} />;
        // return <FormatTwo quotationData={transformedData} ref={ref}  />;
        case 3:
        return <FormatThree data={transformedData} ref={ref} letterheadImage={letterheadImage} />;
        // return <FormatThree quotationData={transformedData} ref={ref} />;
        case 4:
        return <FormatFour data={transformedData} ref={ref} />;
        // return <FormatFour quotationData={transformedData} ref={ref} />; 
        case 5:
        return <FormatFive data={transformedData} ref={ref} />;
        // return <FormatFive quotationData={transformedData} ref={ref} />;
      default:
        // return <FormatOne quotationData={transformedData} ref={ref} />;
        return <FormatOne data={transformedData} ref={ref} />;
    }
  };

  return renderFormat();
});

PDFFormatWrapper.displayName = 'PDFFormatWrapper';

export default PDFFormatWrapper;
