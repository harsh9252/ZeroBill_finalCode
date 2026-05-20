import React, { useMemo, useState, useEffect, useRef } from "react";
import { convertFileToImage } from '../../../utils/fileConverter';
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactDOM from 'react-dom/client';
import { Search, ChevronDown, ChevronUp, Plus, Edit2, Trash2, ArrowLeft, X, Download, FileText } from "lucide-react";
import TemplateSidebar from "../../../Components/TemplateSidebar.jsx";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatDate } from "../../../utils/dateFormat.js";

import Date_wise_Filter_Button, { getRangeBoundsPure } from "../../../Components/Date_wise_Filter_Button.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import ReusableTable from "../../../Components/ReusableTable.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { formatCurrency } from "../../../utils/currency";
import QuotationForm from "../Quotation/QuotationForm.jsx";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import MainLoader from "../../../Components/MainLoader.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
const { partyAPI, salesReturnAPI, salesInvoiceAPI, businessAPI, termsConditionsAPI, getApiConfig } = api;
import { mapToSalesReturnData } from "../../../utils/documentMapper";
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";


// Status options removed from UI as requested


function SalesReturn({ currency }) {
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState({ label: "Show All", value: "all" });
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('salesReturnViewMode', mode);
      return mode;
    }
    const savedMode = localStorage.getItem('salesReturnViewMode');
    return savedMode || 'list';
  });

  const [loading, setLoading] = useState(viewMode === 'list');
  const [editingRow, setEditingRow] = useState(null);
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  // Preview page states
  const [previewSalesReturn, setPreviewSalesReturn] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
      // FormatFive: {
      //   component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
      //   label: 'Format-5'
      // },
    };

    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.SALES_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  const formattedRangeLabel = () => {
    if (customRange?.from && customRange?.to) return `${customRange.from} — ${customRange.to}`;
    return 'Custom Date Range';
  };

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

  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewSalesReturn && viewMode === 'preview') {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewSalesReturn, viewMode]);

  // Update preview data when selected return changes
  useEffect(() => {
    const updatePreviewData = async () => {
      if (viewMode === 'preview' && previewSalesReturn) {
        try {
          const data = await mapToSalesReturnDataInternal(previewSalesReturn);
          setPreviewData(data);
        } catch (error) {
          console.error('Error mapping sales return to preview data:', error);
          showErrorToast('Failed to load preview data');
        }
      }
    };

    updatePreviewData();
  }, [viewMode, previewSalesReturn]);

  //  Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('salesReturnViewMode', mode);

      if (mode === 'create') {
        setLoading(false);
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingSalesReturnRow');
        if (savedEditingRow) {
          try {
            const parsedRow = JSON.parse(savedEditingRow);
            setEditingRow(parsedRow);
            setLoading(false);
          } catch (error) {
            console.error('Error parsing saved editing row:', error);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    } else {
      setViewMode('list');
      localStorage.removeItem('salesReturnViewMode');
    }
  }, [searchParams]);

  const handleCreateClick = () => {
    setEditingRow(null);
    setLoading(false);
    navigate('/salesReturn?mode=create', { replace: true });
  };

  // Function to convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      let result = '';

      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }

      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result.trim();
      }

      if (n > 0) {
        result += ones[n] + ' ';
      }

      return result.trim();
    };

    if (num === 0) return 'Zero';

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const remainder = num % 100;

    let result = '';

    if (crores > 0) {
      result += convertLessThanThousand(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      result += convertLessThanThousand(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
      result += convertLessThanThousand(thousands) + ' Thousand ';
    }
    if (hundreds > 0) {
      result += convertLessThanThousand(hundreds) + ' Hundred ';
    }
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }

    return result.trim() + ' Only';
  };

  // Function to map sales return row to PDF data
  const mapToSalesReturnDataInternal = async (row) => {
    return await mapToSalesReturnData(row, businessData, partyAPI, currency);
  };

  // Generate PDF function
  const generatePDF = async (salesReturnData) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[selectedFormat].component;
      const fileName = `${salesReturnData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={salesReturnData} />,
        filename: fileName,
        onStart: () => showLoadingModal('Generating PDF...'),
        onSuccess: () => {
          closeModal();
          showSuccessToast('PDF downloaded successfully');
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
      console.error('PDF startup failed:', error);
      closeModal();
      showErrorToast('Failed to fetch PDF component.');
      setIsGeneratingPDF(false);
    }
  };

  const fetchSalesReturns = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const response = await salesReturnAPI.getAll(selectedBusinessId);

      if (response.success) {
        const transformedData = response.data.map(sr => ({
          id: sr.return_number,
          dbId: sr.id,
          date: sr.return_date,
          partyName: sr.party_name,
          amount: parseFloat(sr.grand_total || sr.total_amount || 0),
          status: sr.status || 'open',
          meta: sr.sales_return_data || {},
          party_id: sr.party_id,
          bank_id: sr.bank_id,
          business_id: sr.business_id,
          po_agreement_number: sr.po_agreement_number || sr.sales_return_data?.po_agreement_number || '',
          remark: sr.remark || sr.sales_return_data?.remark || '',
          due_date: sr.sales_return_data?.paymentTerms ?
            (() => {
              const d = new Date(sr.return_date);
              d.setDate(d.getDate() + parseInt(sr.sales_return_data.paymentTerms));
              return d.toISOString().split('T')[0];
            })() : sr.sales_return_data?.dueDate || null
        }));
        setRows(transformedData);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error loading sales returns:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReturns();
  }, [selectedBusinessId]);

  // Listen for business changes and refetch sales returns
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      fetchSalesReturns();
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, []);


  // Status options removed from UI

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

    let list = rows.filter((r) => {
      let dateOk = true;
      const rowDate = r.date;
      if (bounds && (bounds.start || bounds.end)) {
        // Parse the row date as a local date (YYYY-MM-DD + T00:00:00)
        const d = new Date(String(rowDate).split('T')[0] + 'T00:00:00');
        const s = bounds.start ? new Date(bounds.start) : null;
        const e = bounds.end ? new Date(bounds.end) : null;
        if (s) s.setHours(0, 0, 0, 0);
        if (e) e.setHours(23, 59, 59, 999);

        if (s && e) dateOk = d >= s && d <= e;
        else if (s) dateOk = d >= s;
        else if (e) dateOk = d <= e;
      }
      const matchStatus = status.value === 'all' ? true : r.status === status.value;
      const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
      const id = r.id ? String(r.id).toLowerCase() : '';
      const matchSearch = !q || partyName.includes(q) || id.includes(q);
      return dateOk && matchStatus && matchSearch;
    });

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const A = sort.key === 'date' ? new Date(a[sort.key]) : a[sort.key];
      const B = sort.key === 'date' ? new Date(b[sort.key]) : b[sort.key];

      if (sort.key === 'amount') return (A - B) * dir;
      if (sort.key === 'date') return (A - B) * dir;

      return String(A).localeCompare(String(B)) * dir;
    });

    return list;
  }, [rows, query, status, sort, dateRangeLabel, customRange]);


  const handleCreateSalesReturn = () => {
    setEditingRow({ type: 'salesReturn' });
    setViewMode('create');
  };

  const handleEditClick = (row) => {


    // Parse sales_return_data if it's a string
    let returnData = row.meta;
    if (typeof row.meta === 'string') {
      try {
        returnData = JSON.parse(row.meta);
      } catch (e) {
        console.error('Error parsing sales_return_data:', e);
        returnData = {};
      }
    }

    const rawLines = Array.isArray(returnData?.lines)
      ? returnData.lines
      : Array.isArray(row.lines)
        ? row.lines
        : [];

    const normalizedLines = rawLines.map((ln, i) => ({
      id: ln.id || `ln-${i}-${Date.now()}`,
      description: ln.description || ln.name || '',
      subtitle: ln.subtitle || '',
      qty: ln.qty ?? ln.quantity ?? 1,
      price: ln.price || ln.amount || 0,
      hsn: ln.hsn || ln.hsnCode || ln.hsn_code || '',
      code: ln.code || ln.item_code || '',
      unit: ln.unit || 'PCS',
      taxType: ln.taxType || ln.tax_type || 'none',
      gstRate: ln.gstRate || ln.gst_rate || 0,
      cgstPct: ln.cgstPct || ln.cgst_pct || 0,
      sgstPct: ln.sgstPct || ln.sgst_pct || 0,
      igstPct: ln.igstPct || ln.igst_pct || 0,
      vatPct: ln.vatPct || ln.vat_pct || 0,
      discountPct: ln.discountPct || ln.discount_pct || 0,
      stockQuantity: ln.stockQuantity || ln.stock_quantity || 0,
      image_url: ln.image_url || ''
    }));

    const initialData = {
      id: row.dbId || row.id,
      dbId: row.dbId || row.id,
      sales_return_number: row.id,
      return_date: row.date,
      date: row.date,
      partyName: row.partyName,
      party_name: row.partyName,
      party_id: row.party_id,
      bank_id: row.bank_id,
      business_id: row.business_id,
      amount: row.amount,
      grand_total: row.amount,
      total_amount: row.amount,
      status: row.status,
      notes: returnData?.notes || '',
      po_agreement_number: row.po_agreement_number || '',
      remark: row.remark || '',
      type: 'salesReturn',
      meta: {
        ...returnData,
        invoiceNo: row.id,
        lines: normalizedLines,
        notes: returnData?.notes || '',
        bank_id: row.bank_id,
        selectedBankIndex: returnData?.selectedBankIndex,
        charges: returnData?.charges || [],
        discountAfterTaxPct: returnData?.discountAfterTaxPct || 0,
        remark: row.remark || '',
        paymentTerms: returnData?.paymentTerms ?? 30
      }
    };

    setEditingRow(initialData);

    // Save to localStorage for refresh persistence
    localStorage.setItem('editingSalesReturnRow', JSON.stringify(initialData));

    navigate(`/salesReturn?mode=edit&id=${row.dbId || row.id}`);
    setViewMode('create');
  };

  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const dbId = itemToDelete.dbId || itemToDelete.id;

    try {
      showLoadingModal('Deleting sales return...');

      const response = await salesReturnAPI.delete(dbId, selectedBusinessId);

      closeModal();
      if (response.success) {
        setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
        showSuccessToast(`${itemToDelete.id} deleted successfully`);
        setDeleteModalOpen(false);
        setItemToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete');
      }

    } catch (err) {
      console.error('Error deleting sales return:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete sales return.');
    }
  };

  const handleSalesReturnSaved = async (formData) => {
    try {
   

      const salesReturnPayload = {
        business_id: selectedBusinessId,
        sales_return_number: formData.sales_return_number || formData.id,
        return_date: formData.return_date || formData.date || new Date().toISOString().slice(0, 10),
        party_name: formData.party_name || formData.partyName || formData.party || "",
        party_id: formData.party_id || null,
        bank_id: formData.bank_id || null,
        status: formData.status || "open",
        total_amount: Number(formData.total_amount || formData.amount || formData.meta?.total || 0),
        grand_total: Number(formData.grand_total || formData.amount || formData.meta?.total || 0),
        discount_amount: Number(formData.discount_amount || formData.meta?.discountAmount || 0),
        tax_amount: Number(formData.tax_amount || formData.meta?.tax || 0),
        notes: formData.notes || '',
        po_agreement_number: formData.po_agreement_number || '',
        remark: formData.remark || '',
        sales_return_data: formData.sales_return_data || {
          lines: formData.meta?.lines || [],
          charges: formData.meta?.charges || [],
          notes: formData.notes || '',
          remark: formData.remark || '',
          bankAccount: formData.meta?.bankAccount || null,
          bankAccounts: formData.meta?.bankAccounts || [],
          selectedBankIndex: formData.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: formData.meta?.discountAfterTaxPct || 0,
          paymentTerms: formData.meta?.paymentTerms ?? 30,
          po_agreement_number: formData.po_agreement_number || '',
          // Include address overrides in fallback construction
          billing_address: formData.billing_address || formData.meta?.billing_address || "",
          city: formData.city || formData.meta?.city || "",
          state: formData.state || formData.meta?.state || "",
          pincode: formData.pincode || formData.meta?.pincode || "",
          country: formData.country || formData.meta?.country || "India",
          shipping_address: formData.shipping_address || formData.meta?.shipping_address || "",
          ship_city: formData.ship_city || formData.meta?.ship_city || "",
          ship_state: formData.ship_state || formData.meta?.ship_state || "",
          ship_pincode: formData.ship_pincode || formData.meta?.ship_pincode || "",
          ship_country: formData.ship_country || formData.meta?.ship_country || "India",
          billing_attention: formData.billing_attention || formData.meta?.billing_attention || "",
          billing_line2: formData.billing_line2 || formData.meta?.billing_line2 || "",
          billing_phone: formData.billing_phone || formData.meta?.billing_phone || "",
          billing_fax: formData.billing_fax || formData.meta?.billing_fax || "",
          shipping_attention: formData.shipping_attention || formData.meta?.shipping_attention || "",
          shipping_line2: formData.shipping_line2 || formData.meta?.shipping_line2 || "",
          shipping_phone: formData.shipping_phone || formData.meta?.shipping_phone || "",
          shipping_fax: formData.shipping_fax || formData.meta?.shipping_fax || ""
        },
        terms_sections: formData.terms_sections || []
      };

      let response;
      const isEdit = !!editingRow?.dbId;
      const dbId = editingRow?.dbId || editingRow?.id;

      if (isEdit) {
        response = await salesReturnAPI.update(dbId, salesReturnPayload, selectedBusinessId);
      } else {
        response = await salesReturnAPI.create(salesReturnPayload);
      }

      if (response.success) {
        localStorage.removeItem('editingSalesReturnRow');
        await fetchSalesReturns();
        setEditingRow(null);
        setViewMode('list');
        navigate('/salesReturn');
        closeModal();

        showSuccessToast(isEdit ? `Sales Return updated successfully` : `Sales Return ${salesReturnPayload.sales_return_number} created successfully`);
      } else {
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'sales_return_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to save sales return');
      }
    } catch (err) {
      console.error('Error saving sales return:', err);
      throw err;
    }
  };

  const handleBackToList = () => {
    setEditingRow(null);
    setViewMode('list');
  };

  const handleLetterheadUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Block Word files - they cannot be converted to letterhead properly
    if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file (JPEG, PNG, WEBP).');
      event.target.value = '';
      return;
    }

    // Support image file types and PDF
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (!validTypes.includes(file.type)) {
      showErrorToast('Please upload a valid file (PDF, JPEG, PNG, WEBP)');
      event.target.value = '';
      return;
    }

    const isPDF = file.type === 'application/pdf';

    try {
      if (isPDF) {
        showInfoToast("Converting PDF to letterhead... please wait.");
      }

      const imageData = await convertFileToImage(file);
      setUploadedLetterhead(imageData);
      setSelectedFormat('Letterhead'); // Switch to letterhead format
      showSuccessToast(isPDF ? "PDF converted and uploaded successfully" : "Letterhead uploaded successfully");
    } catch (err) {
      console.error("Error processing letterhead:", err);
      if (err.message === 'WORD_NOT_SUPPORTED') {
        showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file.');
      } else {
        showErrorToast("Failed to process file. Please try a different format or an image.");
      }
    } finally {
      event.target.value = ''; // Reset input
    }
  };
  
    // Remove letterhead
    const handleRemoveLetterhead = () => {
      setUploadedLetterhead(null);
      setSelectedFormat('FormatOne');
      showSuccessToast('Letterhead removed');
    };

  // Handle setting default format
  const handleSetDefaultFormat = async (option) => {
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      if (!businessId) return;

      const response = await businessAPI.update(businessId, {
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

  // Fixed Header Component for Sales Return Preview
  const SalesReturnPreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setViewMode('list'); setPreviewSalesReturn(null); }}
            className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <button
            onClick={() => { setViewMode('list'); setPreviewSalesReturn(null); }}
            className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            Sales Return Preview - <span>{previewSalesReturn.id}</span>
          </h1>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Format Dropdown */}
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

          {/* Upload Letterhead Button */}
          <div className="relative">
            <input
              type="file"
              id="letterhead-upload"
              accept="application/pdf, .pdf, image/*"
              onChange={handleLetterheadUpload}
              className="hidden"
            />
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

          {/* Remove Letterhead Button */}
          {uploadedLetterhead && (
            <button
              onClick={handleRemoveLetterhead}
              className="h-8 w-8 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#ef4444]/90 hover:to-[#dc2626]/90 text-white rounded-[7px] transition-all duration-200 focus:outline-none flex items-center justify-center"
              title="Remove Letterhead"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Download PDF Button */}
          {/* <button
            onClick={() => generatePDF(previewData)}
            disabled={isGeneratingPDF}
            className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap"
          >
            {isGeneratingPDF ? (
              <span className="hidden sm:inline">Generating...</span>
            ) : (
              <>
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </>
            )}
          </button> */}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <MainLoader message="Loading sales returns..." />;
  }

  // Render form when creating/editing
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <QuotationForm
        onSave={handleSalesReturnSaved}
        onBack={handleBackToList}
        initialData={editingRow || {}}
        formType="salesReturn"
        formTitle={editingRow?.dbId ? "Update Sales Return" : "Create Sales Return"}
        showTopActions
        showBottomActions
        saveLabel={editingRow?.dbId ? "Update Changes" : "Save"}
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  // Preview page render
  if (viewMode === 'preview' && previewSalesReturn) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex flex-col">
        {/* Fixed Header - Always visible at top */}
        <SalesReturnPreviewHeader />
        <div className="flex flex-1 pt-16">
          <TemplateSidebar
            documents={rows}
            selectedDocument={previewSalesReturn}
            onSelect={(doc) => {
              setPreviewSalesReturn(doc);
            }}
            title="Sales Return"
            documentType="salesReturn"
            currency={currency}
          />
          <div className="flex-1 overflow-y-auto pt-4 p-6 bg-white min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-7xl mx-auto">
              {previewData ? (() => {
                const SelectedFormat = pdfFormats[selectedFormat].component;
                return <SelectedFormat data={previewData} />;
              })() : (
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

  const columns = [
    {
      key: 'id',
      title: 'Return Number',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-gray-700">
          <span>{r.id}</span>
        </span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (r) => formatDate(r.date)
    },
    {
      key: 'po_agreement_number',
      title: 'PO Number',
      sortable: true,
      render: (r) => r.po_agreement_number ? <span className="font-semibold text-gray-700"><span>{r.po_agreement_number}</span></span> : <span className="text-gray-400"><span>-</span></span>
    },
    {
      key: 'due_date',
      title: 'Due Date',
      sortable: true,
      render: (r) => r.due_date ? formatDate(r.due_date) : <span className="text-gray-400">-</span>
    },
    {
      key: 'partyName',
      title: 'Party Name',
      sortable: true
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (r) => formatCurrencyDisplay(r.amount),
      tdClass: 'text-right'
    },
  ];

  if (loading) {
    return <MainLoader message="Loading sales returns..." />;
  }

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout - Right aligned */}
          <div className="md:hidden flex flex-col items-end space-y-3">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateSalesReturn}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
                New
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SR-0000 or Party Name"
              aria-label="Search"
              className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
            />

            <div className="flex items-center gap-2 w-full justify-end">
              <Date_wise_Filter_Button
                dateRangeLabel={dateRangeLabel}
                onRangeChange={(val) => setDateRangeLabel(val)}
                customRange={customRange}
                onRangeApply={(range) => {
                  setCustomRange(range);
                  setDateRangeLabel("Custom Date Range");
                }}
              />


              <button
                onClick={handleCreateSalesReturn}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Layout - Between aligned */}
          <div className="hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
            <DashboardBackButton />
            <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SR-0000 or Party Name"
              className="w-48 h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
              aria-label="Search"
            />

            <div className="flex items-center gap-2">
              <Date_wise_Filter_Button
                dateRangeLabel={dateRangeLabel}
                onRangeChange={(val) => setDateRangeLabel(val)}
                customRange={customRange}
                onRangeApply={(range) => {
                  setCustomRange(range);
                  setDateRangeLabel("Custom Date Range");
                }}
              />


              <button
                onClick={handleCreateSalesReturn}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
                New
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Empty State */}
      {!loading && rows.length === 0 && viewMode === "list" && (
        <GeneralEmptyState
          title="No Sales Returns Found"
          description="You haven't created any sales returns yet. Start by creating your first sales return to manage returns and refunds."
          buttonText="Create First Sales Return"
          onButtonClick={handleCreateSalesReturn}
          icon={FileText}
        />
      )}


      {/* ReusableTable */}
      {rows.length > 0 && viewMode === "list" && (
        <div className="">
          <ReusableTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id}
            initialPageSize={10}
            onRowClick={(row) => {
              setPreviewSalesReturn(row);
              setViewMode('preview');
              navigate('/salesReturn?mode=preview', { replace: true });
            }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
          />
        </div>
      )}


      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.id || ""}
        itemType="sales return"
      />
    </div>
  );
}

export default SalesReturn;
