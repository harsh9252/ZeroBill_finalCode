import React, { useEffect, useState, useCallback, useMemo } from "react";
import { convertFileToImage } from "../../../utils/fileConverter";
import axios from "axios";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showInfoToast } from "../../../Components/ActionMessageModel";
import {
  FileCheck, FileX, RefreshCw, XCircle, CheckCircle,
  AlertCircle, Settings, ChevronDown, ChevronUp, Loader2,
  FileSearch, QrCode, Hash, ArrowLeft, Zap, Download, Truck
} from "lucide-react";
import TemplateSidebar from "../../../Components/TemplateSidebar.jsx";
import api from '../../../utils/api';
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import { mapToSalesInvoiceData } from "../../../utils/documentMapper";
import { formatCurrency } from '../../../utils/currency';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';

const API_URL = import.meta.env.VITE_API_URL_DEV || import.meta.env.VITE_API_URL;

// --- Status Badge -------------------------------------------------------------
const StatusBadge = ({ status }) => {
  const map = {
    generated: { cls: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle size={12} />, label: "Generated" },
    cancelled: { cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle size={12} />, label: "Cancelled" },
    failed: { cls: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertCircle size={12} />, label: "Failed" },
    not_applicable: { cls: "bg-gray-100 text-gray-500 border-gray-200", icon: null, label: "N/A" },
    pending: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Loader2 size={12} className="animate-spin" />, label: "Pending" },
  };
  const { cls, icon, label } = map[status] || map.not_applicable;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
      {icon} {label}
    </span>
  );
};

// --- QR Modal -----------------------------------------------------------------
const QRModal = ({ log, onClose, language = 'en-IN' }) => {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">QR Code - {log.invoice_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
        </div>
        {log.signed_qr_code ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(log.signed_qr_code)}&size=220x220`}
              alt="QR Code"
              className="border border-gray-200 rounded-lg"
            />
            <div className="text-xs text-gray-500 text-center">Scan with GST QR scanner to verify</div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-6">QR Code not available</div>
        )}
        <div className="mt-4 space-y-2 text-xs text-gray-600">
          <div className="flex justify-between"><span className="font-medium">IRN</span><span className="font-mono text-[10px] max-w-[180px] truncate">{log.irn}</span></div>
          <div className="flex justify-between"><span className="font-medium">Ack No</span><span>{log.ack_no || '-'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Ack Date</span><span>{log.ack_date ? new Date(log.ack_date).toLocaleString(language) : '-'}</span></div>
        </div>
      </div>
    </div>
  );
};

// --- Cancel Modal -------------------------------------------------------------
const CancelModal = ({ log, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("1");
  const [remark, setRemark] = useState("");
  if (!log) return null;
  const reasons = [
    { value: "1", label: "Duplicate" },
    { value: "2", label: "Data Entry Mistake" },
    { value: "3", label: "Order Cancelled" },
    { value: "4", label: "Other" },
  ];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 mb-1">Cancel IRN</h3>
        <p className="text-xs text-gray-500 mb-4">Invoice: <b>{log.invoice_number}</b></p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cancel Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remark (optional)</label>
            <input type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Enter remark..." className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            Warning: IRN can only be cancelled within 24 hours of generation.
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onConfirm(log.irn, reason, remark)} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileX size={14} />} <span>Confirm Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- E-Way Bill Modal ---------------------------------------------------------
const EWayBillModal = ({ log, onClose, onConfirm, loading }) => {
  const [formData, setFormData] = useState({
    transporter_id: "",
    transporter_name: "SandBox Transporter",
    transportation_mode: "1",
    distance: "500",
    transporter_document_number: "12345",
    transporter_document_date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    vehicle_number: "DL1AB1234",
    vehicle_type: "R"
  });

  if (!log) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">Generate E-Way Bill</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-1">For Invoice: <b>{log.invoice_number}</b> | IRN: <span className="font-mono text-[10px]">{log.irn?.slice(0, 15)}...</span></p>
        <div className="bg-amber-50 border border-amber-200 p-2 rounded-md mb-4 flex items-start gap-2">
          <div className="text-amber-600 text-[10px] bg-amber-100 p-0.5 rounded px-1.5 font-bold mt-0.5">TIP</div>
          <p className="text-[10px] text-amber-700 leading-tight">
            For <b>Sandbox</b>: Distance should be balanced (ex: 500), Vehicle No must look like <b>DL1AB1234</b>, and the invoice must have at least one <b>Goods HSN</b> (e.g. 1010, not just 9999).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Transporter ID / GSTIN</label>
            <input name="transporter_id" value={formData.transporter_id} onChange={handleChange} placeholder="05AAABB..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Transporter Name</label>
            <input name="transporter_name" value={formData.transporter_name} onChange={handleChange} placeholder="Optional" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mode</label>
            <select name="transportation_mode" value={formData.transportation_mode} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none">
              <option value="1">Road</option>
              <option value="2">Rail</option>
              <option value="3">Air</option>
              <option value="4">Ship</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Distance (Km)</label>
            <input name="distance" type="number" value={formData.distance} onChange={handleChange} onWheel={(e) => e.target.blur()} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Doc Number</label>
            <input name="transporter_document_number" value={formData.transporter_document_number} onChange={handleChange} placeholder="Optional" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Doc Date</label>
            <input name="transporter_document_date" value={formData.transporter_document_date} onChange={handleChange} placeholder="DD/MM/YYYY" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vehicle No</label>
            <input name="vehicle_number" value={formData.vehicle_number} onChange={handleChange} placeholder="e.g. DL1BC1234" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vehicle Type</label>
            <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none">
              <option value="R">Regular</option>
              <option value="O">Over Dimensional</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">Discard</button>
          <button onClick={() => onConfirm(formData)} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />} <span>Generate E-Way Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Landing Page ------------------------------------------------------------
const LandingPage = ({ onStart }) => {
  const cards = [
    {
      title: "Automated Generation",
      desc: "Instant IRN and signed QR code generation with Govt. IRP.",
      icon: <Zap className="text-white" />,
      gradient: "from-amber-500 to-amber-600",
      glow: "shadow-amber-500/20"
    },
    {
      title: "E-Way Bill Integration",
      desc: "Generate seamless E-Way bills directly from your IRN data.",
      icon: <RefreshCw className="text-white" />,
      gradient: "from-amber-500 to-amber-600",
      glow: "shadow-amber-500/20"
    },
    {
      title: "Smart Reconciliation",
      desc: "Auto-sync with GSTR-1 and eliminate manual accounting errors.",
      icon: <CheckCircle className="text-white" />,
      gradient: "from-amber-500 to-amber-600",
      glow: "shadow-amber-500/20"
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-90px)] w-full bg-[#FEF9C3]/40 flex flex-col justify-between pt-4 pb-4 sm:pt-6 sm:pb-16">
      <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-white/40 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/3 bg-indigo-50/30 blur-[80px] rounded-full" />

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <DashboardBackButton />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-3 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Settings size={12} />
          Powered by Govt. Standards
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-gray-800 mb-3 tracking-tight leading-tight">
          Next-Gen <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">E-Invoicing</span>
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-2xl font-medium">
          InvoiceBillBook simplifies GST compliance. Generate, manage and track your
          E-Invoices with industry-leading speed and professional security.
        </p>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`group relative bg-white border border-yellow-200 px-6 py-3 rounded-2xl flex flex-col items-center text-center shadow-sm transition-colors`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg mb-3 transition-transform`}>
                {React.cloneElement(card.icon, { size: 24 })}
              </div>
              <h3 className="text-gray-800 font-bold text-lg mb-1 tracking-wide">{card.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-t-full bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <div className="mb-4 mt-4 relative">
          <button
            onClick={onStart}
            className="relative z-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-3.5 rounded-2xl shadow-lg font-bold text-lg transition-all active:scale-95 flex items-center gap-3"
          >
            Start Generating e-Invoices
            <FileCheck size={20} />
          </button>
        </div>
        <div className="flex items-center gap-6 text-gray-400 text-[9px] font-bold uppercase tracking-[2px]">
          <span>GST Compliance 2026</span>
          <span className="w-1 h-2 bg-gray-300 rounded-full" />
          <span>Real-time Sync</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>Encrypted Vault</span>
        </div>
      </div>
    </div>
  );
};


const Dashboard = ({ onBack, currency = 'INR', language = 'en-IN', sidebarCollapsed }) => {
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ enabled: false, configured: false, provider: 'iris', mock: false });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [previewData, setPreviewData] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(parseInt(localStorage.getItem('selectedBusinessId')));
  const [businessData, setBusinessData] = useState(null);
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ewbModal, setEwbModal] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(null);

  // Date range state
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const { partyAPI, businessAPI } = api;

  useEffect(() => {
    const handleBusinessChange = (event) => {
      const newId = event.detail?.businessId || parseInt(localStorage.getItem('selectedBusinessId'));
      setSelectedBusinessId(newId);
    };
    window.addEventListener('businessChanged', handleBusinessChange);
    return () => window.removeEventListener('businessChanged', handleBusinessChange);
  }, []);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!selectedBusinessId) return;
      try {
        const result = await businessAPI.getById(selectedBusinessId);
        if (result.success && result.data) setBusinessData(result.data);
      } catch (error) {
        console.error('Error fetching business details:', error);
      }
    };
    fetchBusiness();
  }, [selectedBusinessId, businessAPI]);

  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewInvoice && viewMode === 'preview') {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewInvoice, viewMode]);

  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewInvoice && viewMode === 'preview' && businessData) {
        try {
          setPreviewData(null);
          const result = await api.salesInvoiceAPI.getById(previewInvoice.id, selectedBusinessId);

          const fullInvoice = {
            ...(result.data || previewInvoice),
            dbId: previewInvoice.id,
            business_id: selectedBusinessId
          };

          const log = logs.find(l => String(l.sales_invoice_id) === String(previewInvoice.id));
          const data = await mapToSalesInvoiceData(fullInvoice, businessData, api.partyAPI, log, currency, language);
          if (data) {
            data.documentType = (log?.status === 'generated') ? 'e_invoice' : 'sales_invoice';
            setPreviewData(data);
          }
        } catch (error) {
          console.error('Error fetching preview data:', error);
          setPreviewData(null);
        }
      }
    };
    fetchPreviewData();
  }, [previewInvoice, viewMode, logs, currency, language, selectedBusinessId]);

  const handleRowClick = (inv) => {
    setPreviewData(null);
    setPreviewInvoice(inv);
    setViewMode('preview');
  };

  const handleBackToList = () => {
    setPreviewInvoice(null);
    setViewMode('list');
  };

  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.EINVOICE} currency={currency} language={language} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.EINVOICE} currency={currency} language={language} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.EINVOICE} currency={currency} language={language} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.EINVOICE} currency={currency} language={language} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
    };
    // if (uploadedLetterhead) {
    //   formats.Letterhead = {
    //     component: (props) => <PDFFormatWrapper {...props} formatNumber="letterhead" documentType={DOCUMENT_TYPES.EINVOICE} letterheadImage={uploadedLetterhead} currency={currency} language={language} />,
    //     label: 'Letterhead'
    //   };
    // }
    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => (
          <PDFFormatWrapper
            {...props}
            formatNumber='letterhead'
            documentType={DOCUMENT_TYPES.EINVOICE}
            letterheadImage={uploadedLetterhead}   // ✅ ONLY THIS
            currency={currency}
            language={language}
          />
        ),
        label: 'Letterhead'
      };
    }
    return formats;
  }, [currency, language, uploadedLetterhead]);


  // NAYA - YE DAALO
  const generatePDF = async (invoiceData, formatKey = selectedFormat) => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const SelectedFormat = pdfFormats[formatKey].component;
      const fileName = `${invoiceData.quotation?.number || previewInvoice?.invoice_number}.pdf`;
      await generateUniversalPDF({
        component: <SelectedFormat data={invoiceData} />,
        filename: fileName,
        onStart: () => showLoadingModal('Generating PDF...'),
        onSuccess: () => {
          closeModal();
          showSuccessToast('E-Invoice PDF downloaded successfully');
          setIsGeneratingPDF(false);
        },
        onError: (err) => {
          console.error('PDF generation failed:', err);
          closeModal();
          showErrorToast('Failed to generate PDF. Please try again.');
          setIsGeneratingPDF(false);
        }
      });
    } catch (error) {
      console.error('Failed to setup PDF generation:', error);
      closeModal();
      showErrorToast('Failed to setup PDF. Please try again.');
      setIsGeneratingPDF(false);
    }
  };

  const handleLetterheadUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Support image file types, PDF and Word docs
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const isDocument = file.type === 'application/pdf' || file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx');

    if (!validTypes.includes(file.type) && !isDocument) {
      showErrorToast('Please upload a valid file (PDF, JPEG, PNG, WEBP, DOC, DOCX)');
      return;
    }

    try {
      if (isDocument) {
        showInfoToast("Converting document to letterhead... please wait.");
      }

      const imageData = await convertFileToImage(file);
      setUploadedLetterhead(imageData);
      setSelectedFormat('Letterhead'); // Switch to letterhead format
      showSuccessToast(isDocument ? "Document converted and uploaded successfully" : "Letterhead uploaded successfully");
    } catch (err) {
      console.error("Error processing letterhead:", err);
      showErrorToast("Failed to process file. Please try a different format or an image.");
    } finally {
      event.target.value = ''; // Reset input
    }
  };

  const handleRemoveLetterhead = () => {
    setUploadedLetterhead(null);
    setSelectedFormat('FormatOne');
    showSuccessToast('Letterhead removed');
  };

  // Handle setting default format
  const handleSetDefaultFormat = async (option) => {
    try {
      if (!selectedBusinessId) return;

      const response = await businessAPI.update(selectedBusinessId, {
        default_format: option.id
      });

      if (response.success) {
        showSuccessToast(`${option.label} set as global default format`);
        // Update local business data state
        setBusinessData(prev => ({
          ...prev,
          default_format: option.id
        }));
      } else {
        showErrorToast('Failed to set default format');
      }
    } catch (error) {
      console.error('Error setting default format:', error);
      showErrorToast('Something went wrong');
    }
  };

  const EInvoicePreviewHeader = () => (
    <div className={`fixed top-16 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'lg:left-20 left-0' : 'lg:left-60 left-0'}`}>
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handleBackToList} className="flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>
          <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            {previewInvoice?.invoice_number}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CustomPreviewDropdown
            options={Object.entries(pdfFormats).map(([key, format]) => ({
              id: key,
              label: format.label
            }))}
            value={selectedFormat}
            onChange={(option) => setSelectedFormat(option.id)}
            placeholder="Select Format"
            className="w-28 sm:w-32 h-8"
            valueBy="id"
            defaultOptionId={businessData?.default_format}
            onSetDefault={handleSetDefaultFormat}
          />
          <div className="relative">
            <input type="file" id="letterhead-upload" accept="application/pdf, .pdf, application/msword, .doc, application/vnd.openxmlformats-officedocument.wordprocessingml.document, .docx, image/*" onChange={handleLetterheadUpload} className="hidden" />
            <label
              htmlFor="letterhead-upload"
              className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#f59e0b] to-[#f97316] hover:from-[#f59e0b]/90 hover:to-[#f97316]/90 text-white rounded-[7px] text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              title="Upload Letterhead"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden md:inline">Upload Letterhead</span>
              <span className="hidden sm:inline md:hidden">Upload</span>
            </label>
          </div>
          {uploadedLetterhead && (
            <button onClick={handleRemoveLetterhead} className="h-8 w-8 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#ef4444]/90 hover:to-[#dc2626]/90 text-white rounded-[7px] transition-all duration-200 focus:outline-none flex items-center justify-center">
              <FileX size={14} />
            </button>
          )}
          {/* <button onClick={() => generatePDF(previewData)} disabled={isGeneratingPDF} className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap">
            {isGeneratingPDF ? "Generating..." : "Download PDF"}
          </button> */}
        </div>
      </div>
    </div>
  );

  const fetchAll = useCallback(async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const [cfgRes, logsRes, salesRes] = await Promise.all([
        axios.get(`${API_URL}/e-invoice/config?business_id=${selectedBusinessId}`, { headers }),
        axios.get(`${API_URL}/e-invoice/list?business_id=${selectedBusinessId}`, { headers }),
        axios.get(`${API_URL}/sales-invoices?business_id=${selectedBusinessId}`, { headers }),
      ]);
      setConfig(cfgRes.data.data || {});
      setLogs(logsRes.data.data || []);
      setSalesInvoices(salesRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBusinessId, headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async (invoiceId) => {
    setGenerating(invoiceId);
    showLoadingModal('Generating IRN...');
    try {
      await axios.post(`${API_URL}/e-invoice/generate/${invoiceId}?business_id=${selectedBusinessId}`, {}, { headers });
      closeModal();
      showSuccessToast('IRN generated successfully!');
      fetchAll();
    } catch (err) {
      closeModal();
      showErrorToast({ title: 'Failed', text: err.response?.data?.message || err.message });
    } finally {
      setGenerating(null);
    }
  };

  const handleCancelConfirm = async (irn, reason, remark) => {
    setCancelling(true);
    showLoadingModal('Cancelling IRN...');
    try {
      await axios.post(`${API_URL}/e-invoice/cancel/${irn}?business_id=${selectedBusinessId}`, { cancel_reason: reason, cancel_remark: remark }, { headers });
      closeModal();
      showSuccessToast('IRN cancelled successfully!');
      setCancelModal(null);
      fetchAll();
    } catch (err) {
      closeModal();
      showErrorToast({ title: 'Failed', text: err.response?.data?.message || err.message });
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateEwb = async (formData) => {
    showLoadingModal('Generating E-Way Bill...');
    try {
      const payload = { ...formData, irn: ewbModal.irn };
      await axios.post(`${API_URL}/e-invoice/ewaybill-by-irn?business_id=${selectedBusinessId}`, payload, { headers });
      closeModal();
      showSuccessToast('E-Way Bill generated successfully!');
      setEwbModal(null);
      fetchAll();
    } catch (err) {
      closeModal();
      showErrorToast({ title: 'Failed', text: err.response?.data?.message || err.message });
    }
  };

  const handleCheckStatus = async (irn) => {
    setFetchingDetails(irn);
    showLoadingModal('Fetching IRN Details...');
    try {
      const res = await axios.get(`${API_URL}/e-invoice/details/${irn}?business_id=${selectedBusinessId}`, { headers });
      closeModal();
      const info = res.data.data;
      showSuccessToast({
        title: 'IRN Status Sync',
      });
      fetchAll();
    } catch (err) {
      closeModal();
      showErrorToast({ title: 'Failed', text: err.response?.data?.message || err.message });
    } finally {
      setFetchingDetails(null);
    }
  };

  const filteredInvoices = useMemo(() => {
    let data = [...salesInvoices];

    // Date Filter 
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

    if (bounds) {
      const start = new Date(bounds.start);
      const end = new Date(bounds.end);

      // Fix: include full end day
      end.setHours(23, 59, 59, 999);

      data = data.filter(inv => {
        const d = new Date(inv.invoice_date);
        d.setHours(0, 0, 0, 0);

        return d >= start && d <= end;
      });
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      data = data.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.party_name?.toLowerCase().includes(q)
      );
    }

    return data;
  }, [salesInvoices, dateRangeLabel, customRange, searchQuery]);

  const stats = useMemo(() => {
    // Map to keep only the latest log for each invoice
    const latestLogsMap = new Map();
    [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(log => {
      latestLogsMap.set(String(log.sales_invoice_id), log);
    });

    const latestLogs = Array.from(latestLogsMap.values());
    return {
      total: latestLogs.length,
      generated: latestLogs.filter(l => l.status === 'generated').length,
      cancelled: latestLogs.filter(l => l.status === 'cancelled').length,
    };
  }, [logs]);

  if (viewMode === 'preview' && previewInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 w-full mb-10 pb-10 flex flex-col">
        <EInvoicePreviewHeader />
        <div className="flex flex-1 pt-16">
          <TemplateSidebar
            documents={filteredInvoices}
            selectedDocument={previewInvoice}
            onSelect={(doc) => {
              handleRowClick(doc);
            }}
            title="e-Invoice"
            documentType="sales"
            currency={currency}
          />
          <div className="flex-1 overflow-y-auto pt-4 p-6 bg-white min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-7xl mx-auto">
              {previewData ? (
                (() => {
                  const SelectedFormat = pdfFormats[selectedFormat]?.component;
                  return SelectedFormat ? <SelectedFormat data={previewData} /> : null;
                })()
              ) : (
                <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border-gray-200 mt-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Preparing document preview...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {qrModal && <QRModal log={qrModal} onClose={() => setQrModal(null)} language={language} />}
      {cancelModal && <CancelModal log={cancelModal} onClose={() => setCancelModal(null)} onConfirm={handleCancelConfirm} loading={cancelling} />}
      {ewbModal && <EWayBillModal log={ewbModal} onClose={() => setEwbModal(null)} onConfirm={handleGenerateEwb} loading={loading} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white px-4 sm:px-5 py-3 sm:py-2.5 border-b border-yellow-200 gap-3">
        <div className="flex items-center gap-3">
          <DashboardBackButton />
          <span className="text-sm font-semibold text-gray-700">E-Invoice Dashboard</span>
          <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border font-semibold ${config.mock ? 'bg-red-500 text-white' : config.configured ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {config.mock ? 'Mock' : config.configured ? `Active` : 'Setup Error'}
          </span>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
          <div className="flex flex-1 sm:flex-none items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
            <Settings size={14} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs w-full sm:w-32"
            />
          </div>

          <Date_wise_Filter_Button
            dateRangeLabel={dateRangeLabel}
            onRangeChange={(val) => setDateRangeLabel(val)}
            customRange={customRange}
            onRangeApply={(range) => {
              setCustomRange(range);
              setDateRangeLabel("Custom Date Range");
            }}
          />
          <button onClick={fetchAll} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition" title="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>


      <div className="bg-[#FEF9C3]/40 h-[calc(100vh-64px)] p-3 sm:p-5 flex flex-col overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
          {[
            { label: 'Total IRNs', value: stats.total, icon: <Hash size={18} className="text-indigo-500" />, bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'Active', value: stats.generated, icon: <CheckCircle size={18} className="text-green-500" />, bg: 'bg-green-50', border: 'border-green-100' },
            { label: 'Cancelled', value: stats.cancelled, icon: <XCircle size={18} className="text-red-500" />, bg: 'bg-red-50', border: 'border-red-100' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} ${s.border} border rounded-xl p-3 sm:p-4 flex items-center gap-3`}>
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">{s.icon}</div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Invoices & E-Invoice Status</h3>
            <span className="text-xs text-gray-400">{filteredInvoices.length} total invoices</span>
          </div>
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 size={20} className="animate-spin" /> Loading...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-14 text-center">
              <GeneralEmptyState
                title="No Invoices Found"
                description="Try adjusting your date range or search filters."
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto scrollbar-hide">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Invoice No', 'Party', 'Date', 'Amount', 'IRN', 'Ack No', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`px-3 py-2 text-left text-[10px] font-bold text-gray-600 uppercase whitespace-nowrap ${(h === 'IRN' || h === 'Ack No') ? 'hidden md:table-cell' : ''} ${h === 'Date' ? 'hidden sm:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const log = logs.find(l => String(l.sales_invoice_id) === String(inv.id));
                    const isBusy = generating === inv.id;
                    const isGenerated = log?.status === 'generated';
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-yellow-50/60 cursor-pointer group" onClick={() => handleRowClick(inv)}>
                        <td className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap text-[11px] sm:text-xs text-indigo-700 underline underline-offset-2 decoration-dotted">{inv.invoice_number}</td>
                        <td className="px-2 sm:px-3 py-2 text-gray-700 max-w-[100px] sm:max-w-[150px] truncate text-[10px] sm:text-[11px] font-medium">{inv.party_name || '-'}</td>
                        <td className="px-2 sm:px-3 py-2 text-gray-500 text-[10px] whitespace-nowrap hidden sm:table-cell">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                        <td className="px-2 sm:px-3 py-2 font-semibold text-gray-800 whitespace-nowrap text-[10px] sm:text-[11px]">{inv.grand_total ? formatCurrency(inv.grand_total, currency) : '-'}</td>
                        <td className="px-3 py-2 hidden md:table-cell">{log?.irn ? <span className="font-mono text-[9px] text-gray-500 truncate w-[100px] block" title={log.irn}>{log.irn}</span> : '-'}</td>
                        <td className="px-3 py-2 text-[10px] text-gray-400 font-medium whitespace-nowrap hidden md:table-cell">{log?.ack_no || '-'}</td>
                        <td className="px-2 sm:px-3 py-2"><StatusBadge status={log?.status || 'not_applicable'} /></td>
                        <td className="px-2 sm:px-3 py-2">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {isGenerated ? (
                              <>
                                <button onClick={() => setQrModal(log)} title="View QR" className="p-1.5 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"><QrCode size={13} /></button>
                                <button onClick={() => setEwbModal(log)} title="Generate EWB" className="p-1.5 rounded-md bg-amber-500 text-white lg:block hidden"><Truck size={13} /></button>
                                <div className="lg:hidden relative">
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle a small menu or simple action
                                    setEwbModal(log);
                                  }} className="p-1.5 rounded-md bg-amber-500 text-white"><Truck size={13} /></button>
                                </div>
                                <button onClick={() => setCancelModal(log)} title="Cancel" className="p-1.5 rounded-md bg-red-500 text-white hidden sm:block"><XCircle size={13} /></button>
                              </>
                            ) : (
                              <button onClick={() => handleGenerate(inv.id)} disabled={isBusy || loading} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-green-600 rounded-md disabled:opacity-50">
                                {isBusy ? <Loader2 size={10} className="animate-spin" /> : <FileCheck size={10} />} <span className="hidden sm:inline">Generate</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const EInvoice = ({ currency, language, sidebarCollapsed }) => {
  const [view, setView] = useState('landing');
  return (
    <div className="border border-yellow-200 mt-4 rounded-2xl overflow-hidden bg-[#FEF9C3]/50 shadow-sm">
      {view === 'landing' ? <LandingPage onStart={() => setView('dashboard')} /> : <Dashboard onBack={() => setView('landing')} currency={currency} language={language} sidebarCollapsed={sidebarCollapsed} />}
    </div>
  );
};

export default EInvoice;
