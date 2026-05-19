import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper';

import { getApiConfig } from '../../../utils/api';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF';

// Map format names to numeric IDs used by PDFFormatWrapper
const formatMapping = {
  'FormatOne': 1,
  'FormatTwo': 2,
  'FormatThree': 3,
  'FormatFour': 4,
  'FormatFive': 5,
  'ProformaFormat_1': 1,
  'ProformaFormat_2': 2,
  'ProformaFormat_3': 3,
  'ProformaFormat_4': 4,
  'ProformaFormat_5': 5,
  'SalesInvoiceFormat_1': 1,
  'SalesInvoiceFormat_2': 2,
  'SalesInvoiceFormat_3': 3,
  'SalesInvoiceFormat_4': 4,
  'SalesInvoiceFormat_5': 5,
  'Letterhead': 'letterhead'
};

const PublicDownload = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const formatParam = searchParams.get('format') || 'FormatOne';
  const isPrintView = searchParams.get('view') === 'print';
  const formatNumber = formatMapping[formatParam] || 1;
  const config = getApiConfig();

  const backendURL = config.backendURL;

  
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('fetching'); // fetching, generating, completed, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
     
        setStatus('fetching');
        
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const endpointMap = {
          'quotation': 'quotations',
          'proforma': 'proforma-invoices',
          'sales-invoice': 'sales-invoices',
        };
        const endpoint = endpointMap[type] || 'quotations';
        const fullUrl = `${baseUrl}/${endpoint}/public/${id}`;
        
 
        const response = await axios.get(fullUrl);
    
        
        if (response.data.success) {
       
          setData(response.data.data);
          setStatus('generating');
        } else {
          console.error('[DEBUG] PublicDownload: API Success False', response.data.message);
          throw new Error(response.data.message || 'Failed to fetch document details');
        }
      } catch (err) {
        console.error('[DEBUG] PublicDownload: Fetch error', err.message);
        setErrorMessage(err.response?.data?.message || err.message || 'Link expired or invalid');
        setStatus('error');
      }
    };

    fetchData();
  }, [id, type]);

  // Auto-download effect
  useEffect(() => {
    const triggerDownload = async () => {
      if (status === 'generating' && data) {
        try {

          const wrapperData = prepareDataForWrapper(data);
          const filename = `${wrapperData.quotation.number || 'document'}.pdf`;

          await generateUniversalPDF({
            component: (
              <PDFFormatWrapper
                data={wrapperData}
                formatNumber={formatNumber}
                documentType={type}
              />
            ),
            filename,
            margin: 0,
            onSuccess: () => {
  
              setStatus('completed');
            },
            onError: (err) => {
              console.error('[DEBUG] PublicDownload: PDF generation error', err);
              setErrorMessage('Failed to generate PDF automatically. Please refresh or try again.');
              setStatus('error');
            }
          });
        } catch (err) {
          console.error('[DEBUG] PublicDownload: Auto-trigger error', err);
          setStatus('error');
          setErrorMessage('Could not initialize automatic download.');
        }
      }
    };

    triggerDownload();
  }, [status, data]);



  const prepareDataForWrapper = (raw) => {
    if (!raw) return null;
    const docData = raw.quotation_data || raw.invoice_data || {};
    const biz = raw.business_details || {};
    const lines = docData.lines || raw.lines || [];
    
    // Exact address line splitting as per Quotation.jsx
    const addressStr = biz.address || "";
    const addressLines = addressStr ? addressStr.split('\n').filter(line => line.trim()) : [];

    // Prefix image URLs as per Quotation.jsx
    const logoUrl = biz.logo_url ? `${backendURL}${biz.logo_url}` : null;
    const signatureUrl = biz.signature_url ? `${backendURL}${biz.signature_url}` : null;
    const stampUrl = biz.stamp_url ? `${backendURL}${biz.stamp_url}` : null;

    // Transform raw API data to match the internal structure expected by components
    return {
      company: {
        ...biz,
        name: biz.business_name || "Company Name",
        tagline: biz.tagline || "",
        addressLines: addressLines.length > 0 ? addressLines : [addressStr],
        tel: biz.phone || "",
        web: biz.website || "",
        email: biz.email || "",
        gstin: biz.gstin || "",
        logo: { 
          url: logoUrl, 
          text: "", 
          slogan: biz.tagline || "" 
        },
        signatureUrl: signatureUrl,
        stampUrl: stampUrl,
        bank_details: biz.bank_details || {}
      },
      customer: {
        name: raw.party_name || docData.partyName || "Customer",
        address: raw.billing_address || docData.billingAddress || "N/A",
        shippingAddress: raw.shipping_address || docData.shippingAddress || raw.billing_address || docData.billingAddress || "N/A",
        phone: raw.party_phone || docData.partyPhone || "",
        gstin: raw.party_gstin || docData.partyGstin || "",
        placeOfSupply: raw.place_of_supply || docData.placeOfSupply || ""
      },
      quotation: {
        id: id,
        number: raw.quotation_number || raw.proforma_number || id,
        date: new Date(raw.quotation_date || raw.proforma_date || Date.now()).toLocaleDateString(),
        valid_until: raw.valid_until || docData.valid_until || null,
        po_agreement_number: raw.po_agreement_number,
        remark: raw.remark,
        reverseCharge: raw.reverse_charge || docData.reverseCharge || 'No'
      },
      products: lines.map((l, i) => ({
        srNo: i + 1,
        description: l.description || l.name || '',
        subtitle: l.subtitle || '',
        hsn: l.hsn || '',
        qty: l.qty || 0,
        unit: l.unit || 'PCS',
        price: parseFloat(Number(l.price || 0).toFixed(2)),
        discountPct: parseFloat(Number(l.discountPct || 0).toFixed(2)),
        taxType: l.taxType || 'GST',
        cgstPct: parseFloat(Number(l.cgstPct || 0).toFixed(2)),
        sgstPct: parseFloat(Number(l.sgstPct || 0).toFixed(2)),
        igstPct: parseFloat(Number(l.igstPct || 0).toFixed(2)),
        taxable: parseFloat(Number(l.taxable || 0).toFixed(2)),
        tax: parseFloat(Number(l.tax || 0).toFixed(2)),
        total: parseFloat(Number(l.total || 0).toFixed(2)),
        image_url: l.image_url
      })),
      totals: {
        total_amount: parseFloat(Number(raw.total_amount || 0).toFixed(2)),
        tax_amount: parseFloat(Number(raw.tax_amount || 0).toFixed(2)),
        discount_amount: parseFloat(Number(raw.discount_amount || 0).toFixed(2)),
        grand_total: parseFloat(Number(raw.grand_total || raw.total_amount || 0).toFixed(2)),
        subtotal: parseFloat(Number(raw.total_amount || 0).toFixed(2)),
        taxTotal: parseFloat(Number(raw.tax_amount || 0).toFixed(2)),
        total: parseFloat(Number(raw.grand_total || raw.total_amount || 0).toFixed(2)),
        taxableAmount: parseFloat((Number(raw.total_amount || 0) - Number(raw.tax_amount || 0)).toFixed(2))
      },
      gstNote: {
        payableOnReverseCharge: raw.reverse_charge || docData.reverseCharge || 'No',
        other: 'N.A.'
      },
      bank: biz.bank_details || {},
      termsSections: raw.terms_sections || [],
      einvoice: raw.einvoice || { status: 'NONE' },
      quotation_data: docData,
      documentType: type
    };
  };

  const wrapperData = prepareDataForWrapper(data);

  // If this is the print view (visited by Puppeteer), render ONLY the document
  if (isPrintView && data) {
    return (
      <div id="pdf-ready-signal" data-pdf-ready="true">
        <PDFFormatWrapper 
          data={wrapperData} 
          formatNumber={formatNumber} 
          documentType={type} 
        />
      </div>
    );
  }

  // Minimal UI for "Direct Download" feel
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center">
        {status === 'error' ? (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-500 w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#129046] text-white rounded-lg font-semibold hover:bg-[#0e7538]"
            >
              Try Again
            </button>
          </>
        ) : status === 'completed' ? (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500 w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Downloaded!</h1>
            <p className="text-gray-600 mb-4">You can close this tab now.</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-[#129046] animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Downloading...</h1>
            <p className="text-gray-500">Please wait while we prepare your document.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicDownload;
