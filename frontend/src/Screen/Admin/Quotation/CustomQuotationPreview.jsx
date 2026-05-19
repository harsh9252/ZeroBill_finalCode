import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Share2, ChevronDown, Mail, ArrowLeft } from 'lucide-react';
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig';
import CustomPreviewDropdown from '../../../Components/CustomPreviewDropdown';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showInfoToast } from '../../../Components/ActionMessageModel';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF';
import { useReactToPrint } from 'react-to-print';
import CustomQuotation_1 from '../../../Components/PDFFormat/CustomQuotation_1';
import CustomQuotation_2 from '../../../Components/PDFFormat/CustomQuotation_2';
import CustomQuotation_Emerald from '../../../Components/PDFFormat/CustomQuotation_Emerald';
import CustomQuotationLetterhead from '../../../Components/PDFFormat/CustomQuotationLetterhead';
import { generateEmeraldDocx } from '../../../Components/PDFFormat/generateEmeraldDocx';
import { generateLetterheadDocx } from '../../../Components/PDFFormat/generateLetterheadDocx';
import { convertFileToImage } from '../../../utils/fileConverter';
import { customQuotationAPI } from '../../../utils/api';
import api from '../../../utils/api';

const { businessAPI, getApiConfig } = api;

export default function CustomQuotationPreview({ quotation, onBack }) {
  const [selectedFormat, setSelectedFormat] = useState('Emerald');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [businessData, setBusinessData] = useState(null);

  // Load business data
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        if (selectedBusinessId) {
          const response = await businessAPI.getById(selectedBusinessId);
          if (response.success) {
            setBusinessData(response.data);
          }
        }
      } catch (error) {
        console.error('Error loading business data:', error);
      }
    };
    loadBusinessData();
  }, []);

  // Map Custom Quotation to PDF Format Data
  const previewData = useMemo(() => {
    if (!quotation || !businessData) return null;

    const addressLines = businessData.address ? businessData.address.split('\n').filter(l => l.trim()) : [];
    const logoUrl = businessData.logo_url ? `${getApiConfig().backendURL}${businessData.logo_url}` : null;

    return {
      company: {
        name: quotation.company_name || businessData.business_name || "Company Name",
        address: quotation.company_address || businessData.address || "N/A",
        tel: quotation.company_phone || businessData.phone || "",
        email: quotation.company_email || businessData.email || "",
        website: businessData.website || "",
        gstin: businessData.gstin || "",
        logo: { url: quotation.logo || logoUrl },
        addressLines: addressLines
      },
      customer: {
        name: quotation.customer_name || quotation.company_email || "Client Name",
        address: quotation.customer_address || "N/A",
        phone: quotation.customer_phone || quotation.company_phone || "N/A",
        email: quotation.customer_email || "N/A",
      },
      quotation: {
        number: quotation.quotation_number || "N/A",
        date: quotation.quotation_date ? new Date(quotation.quotation_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A",
        quotation_date: quotation.quotation_date, // Added raw date
        paymentTerms: "N/A",
        headerText: quotation.header_text || "QUOTATION",
        business_name: quotation.business_name || "",
        remark: quotation.remark || ""
      },
      products: [],
      totals: {
        total: quotation.total_amount || 0,
        totalInWords: ""
      },
      // Sections array from the new 1-table schema
      termsSections: (quotation.sections || []).map(s => ({
        heading: s.heading,
        content: s.content
      })),
      documentType: DOCUMENT_TYPES.CUSTOM_QUOTATION,
      currencySymbol: "₹"
    };
  }, [quotation, businessData]);

  const pdfFormats = {
    Emerald: { label: 'Format-3', id: 3, component: CustomQuotation_Emerald },
    FormatOne: { label: 'Format-1', id: 1, component: CustomQuotation_1 },
    FormatTwo: { label: 'Format-2', id: 2, component: CustomQuotation_2 },
    Letterhead: { label: 'Letterhead', id: 'letterhead', component: CustomQuotationLetterhead }
  };

  const printRef = useRef(null);

  const handleDownloadPDF = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewData ? `Custom_Quotation_${previewData.quotation.number || 'draft'}` : 'Document',
  });

  const handleDownloadWord = () => {
    if (!previewData) return;

    if (selectedFormat === 'Emerald') {
      generateEmeraldDocx(previewData);
    } else if (selectedFormat === 'Letterhead') {
      generateLetterheadDocx(previewData, uploadedLetterhead);
    } else {
      // Fallback
      generateEmeraldDocx(previewData);
    }
  };
  const handleLetterheadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Block Word files - they cannot be converted to letterhead properly
    if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file (JPEG, PNG, WEBP).');
      e.target.value = '';
      return;
    }

    // Allowed types: images + PDF
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf'
    ];

    if (!validTypes.includes(file.type)) {
      showErrorToast("Please upload a valid file (PDF, JPEG, PNG, GIF, WEBP)");
      e.target.value = '';
      return;
    }

    // Check file size (e.g., limit to 10MB for PDF, 5MB for images)
    const isPDF = file.type === 'application/pdf';
    const sizeLimit = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > sizeLimit) {
      showErrorToast(`File is too large. Please upload under ${isPDF ? '10MB' : '5MB'}.`);
      e.target.value = '';
      return;
    }

    try {
      if (isPDF) {
        showInfoToast("Converting PDF to letterhead... please wait.");
      }

      const imageData = await convertFileToImage(file);
      setUploadedLetterhead(imageData);
      setSelectedFormat('Letterhead');
      showSuccessToast(isPDF ? "PDF converted and uploaded successfully" : "Letterhead uploaded successfully");
    } catch (err) {
      console.error("Error processing letterhead:", err);
      if (err.message === 'WORD_NOT_SUPPORTED') {
        showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file.');
      } else {
        showErrorToast("Failed to process file. Please try a different format or an image.");
      }
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="min-h-screen bg-white w-full flex-col flex overflow-hidden">
      {/* Header */}
      <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 px-2 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              Preview - {quotation.quotation_number}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFormat('Emerald')}
                className={`h-9 px-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${selectedFormat === 'Emerald'
                  ? 'border-green-600 bg-green-50 text-green-700 shadow-sm'
                  : 'border-green-200 text-green-600 hover:border-green-400 bg-white'
                  }`}
              >
                Design 1
              </button>
              
              {uploadedLetterhead && (
                <button
                  onClick={() => setSelectedFormat('Letterhead')}
                  className={`h-9 px-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${selectedFormat === 'Letterhead'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-blue-200 text-blue-600 hover:border-blue-400 bg-white'
                    }`}
                >
                  Letterhead
                </button>
              )}
            </div>

            <div className="relative">
              <input type="file" id="lh-upload" hidden accept="application/pdf, .pdf, image/*" onChange={handleLetterheadUpload} />
              <label htmlFor="lh-upload" className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                {uploadedLetterhead ? 'Change Letterhead' : 'Upload Letterhead'}
              </label>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={!previewData}
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download size={16} />
              Print / Save PDF
            </button>

            <button
              onClick={handleDownloadWord}
              className="h-9 px-4 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download size={16} className="text-blue-500" />
              Word
            </button>

            {/* <div className="relative">
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                className="h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <Share2 size={16} />
              </button>
 
              {showShareDropdown && (() => {
                const dbId = quotation.dbId || quotation.id;
                const formatKey = selectedFormat || 'FormatOne';
                const shareUrl = `${window.location.origin}/#/public/download/custom-quotation/${dbId}?format=${formatKey}`;
 
                const businessName = businessData?.business_name || 'our company';
                const clientName = previewData?.customer?.name || 'Customer';
                const docId = quotation.id || '';
                const date = quotation.date ? new Date(quotation.date).toLocaleDateString() : '';
 
                const msg = encodeURIComponent(`Hi ${clientName},\n\nPlease find your Custom Quotation ${docId} from ${businessName}.\n\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you!`);
                const emailSubject = encodeURIComponent(`Custom Quotation ${docId} from ${businessName}`);
                const emailBody = encodeURIComponent(`Hi ${clientName},\n\nPlease find your Custom Quotation ${docId} from ${businessName}.\n\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you,\n${businessName}`);
 
                return (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    <a
                      href={`https://wa.me/?text=${msg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareDropdown(false)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Share2 size={14} className="text-green-500" /> WhatsApp
                    </a>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&su=${emailSubject}&body=${emailBody}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareDropdown(false)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Mail size={14} className="text-blue-500" /> Email
                    </a>
                  </div>
                );
              })()}
            </div> */}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-20 bg-slate-100 w-full flex-grow overflow-auto">
        <div className="w-full flex flex-col items-center">
          {previewData ? (() => {
            const SelectedComp = pdfFormats[selectedFormat].component;
            return <SelectedComp
              ref={printRef}
              quotationData={previewData}
              letterheadImage={uploadedLetterhead}
            />;
          })() : (
            <div className="flex items-center justify-center h-96 text-gray-400 italic">
              Preparing document preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

