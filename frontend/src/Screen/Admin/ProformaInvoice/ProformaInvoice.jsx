import React, { useMemo, useState, useEffect } from 'react';
import { convertFileToImage } from '../../../utils/fileConverter';
const calculateDueDate = (date, days = 30) => {
  if (!date) return null;

  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));

  return d.toISOString().split("T")[0];
};
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import ReactDOM from 'react-dom/client';
import { ChevronDown, FileText, FileCheck, ChevronUp, Plus, Edit2, Trash2, Receipt, MessageCircle, Mail, Download, ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import QuotationForm from '../Quotation/QuotationForm.jsx';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import CustomPreviewDropdown from '../../../Components/CustomPreviewDropdown.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import { LiaFileExportSolid } from "react-icons/lia";
import html2canvas from 'html2canvas';
import MainLoader from '../../../Components/MainLoader.jsx';
import { formatCurrency, convertFromINR } from '../../../utils/currency';
import { formatDate } from '../../../utils/dateFormat.js';
import { showSuccessToast, showErrorToast, showInfoToast, showLoadingModal, closeModal, SuccessMessages, ErrorMessages, showConfirmationDialog } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import ConvertQuotationModal from '../../../Components/ConvertQuotationModal.jsx';
const { proformaInvoiceAPI, salesInvoiceAPI, businessAPI, partyAPI, termsConditionsAPI, getApiConfig } = api;
import { mapToProformaInvoiceData } from '../../../utils/documentMapper';

const STATUS_OPTS = [
  { label: 'Show All', value: 'all' },
  { label: 'Show Open', value: 'open' },
  { label: 'Show Closed', value: 'closed' },
];


const calcDueIn = (dueDate) => {
  if (!dueDate || dueDate === '0000-00-00' || dueDate === 'null') return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  if (isNaN(target.getTime()) || target.getFullYear() < 2000) return "—";
  target.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((target - today) / msPerDay);
  if (diff > 0) return <span>{diff} days</span>;
  if (diff === 0) return <span>Due Today</span>;
  return <span>Overdue by <span>{Math.abs(diff)}</span> days</span>;
};


// normalize arbitrary lines to the shape CreateSaleForm expects
const normalizeLinesForForm = (rawLines = []) => {
  if (!Array.isArray(rawLines)) return [];
  return rawLines.map((ln, i) => ({
    id: ln.id || ln.lineId || `ln-${i}-${Date.now()}`,
    description: ln.description ?? ln.name ?? ln.item ?? ln.label ?? "",
    subtitle: ln.subtitle ?? ln.subtitleText ?? "",
    hsn: ln.hsn ?? ln.code ?? ln.sku ?? "",
    qty: Number(ln.qty ?? ln.quantity ?? ln.q ?? 1),
    unit:
      ln.unit ??
      (typeof ln.stock === "string" && ln.stock.includes("PCS")
        ? "PCS"
        : "PCS"),
    price: Number(ln.price ?? ln.salesPrice ?? ln.rate ?? ln.amount ?? 0),
    discountPct: Number(ln.discountPct ?? ln.discount ?? 0),
    taxType: ln.taxType || ln.tax_type || 'none',
    gstRate: ln.gstRate || ln.gst_rate || 0,
    cgstPct: ln.cgstPct || ln.cgst_pct || 0,
    sgstPct: ln.sgstPct || ln.sgst_pct || 0,
    igstPct: ln.igstPct || ln.igst_pct || 0,
    vatPct: ln.vatPct || ln.vat_pct || 0,
    overrideAmount:
      ln.overrideAmount != null
        ? ln.overrideAmount
        : ln.totalAmount != null
          ? ln.totalAmount
          : null,
  }));
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

/* -------------------------
  Component
   ------------------------ */
export default function ProformaInvoice({ currency }) {
  const [query, setQuery] = useState("");
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  // store both shapes; DateRangeModal will typically provide {from,to} or {start,end}
  const [customRange, setCustomRange] = useState({ start: "", end: "", from: "", to: "" });

  const [onRangeChange, onRangeApply] = useMemo(() => {
    const handleRangeChange = (val) => setDateRangeLabel(val);
    const handleRangeApply = (range) => {
      setCustomRange(normalizeRange(range));
      setDateRangeLabel('Custom Date Range');
    };
    return [handleRangeChange, handleRangeApply];
  }, []);

  const [status, setStatus] = useState(STATUS_OPTS[0]);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('proformaInvoiceViewMode', mode);
      return mode;
    }
    const savedMode = localStorage.getItem('proformaInvoiceViewMode');
    return savedMode || 'list';
  });

  const [loading, setLoading] = useState(viewMode === 'list');
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');
  const [businessData, setBusinessData] = useState(null); // Add businessData state

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Fetch business data
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (selectedBusinessId) {
        try {
          const response = await businessAPI.getById(selectedBusinessId);
          if (response.success) {
            setBusinessData(response.data);
          }
        } catch (error) {
          console.error('Error fetching business data:', error);
        }
      }
    };

    fetchBusinessData();
  }, [selectedBusinessId]);

  // Fetch data
  const fetchProformaInvoices = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const response = await proformaInvoiceAPI.getAll(selectedBusinessId);


      if (response.success && response.data.length > 0) {

      }

      if (response.success) {
        const mappedRows = response.data.map(q => ({
          id: q.proforma_number,
          dbId: q.id,
          date: q.proforma_date,
          updatedDate: q.updated_at,
          partyName: q.party_name,
          amount: parseFloat(q.grand_total),
          status: q.status || 'open',
          dueDate: q.valid_until,
          meta: q.invoice_data || {},
          party_id: q.party_id,
          bank_id: q.bank_id,
          business_id: q.business_id,
          quotation_id: q.quotation_id,
          po_agreement_number: q.po_agreement_number || '',
          remark: q.remark || ''
        }));


        if (mappedRows.length > 0) {

        }

        setRows(mappedRows);
      }
    } catch (err) {
      console.error('Error fetching proforma invoices:', err);
      /* Silencing red error toast as per user request */
      /*
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch proforma invoices',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
      */
    } finally {
      setLoading(false);
    }
  };

  //  Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('proformaInvoiceViewMode', mode);

      if (mode === 'create') {
        setLoading(false);
        setEditingRow(null); // Clear any previous editing state
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingProformaInvoiceRow');
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
      localStorage.removeItem('proformaInvoiceViewMode');
      setEditingRow(null); // Clear editing state when returning to list
    }
  }, [searchParams]);

  //  Navigate to create view
  const handleCreateClick = () => {
    setEditingRow(null);
    setLoading(false);
    setSelectedQuotation(null); // Clear any selected quotation
    navigate('/proformaInvoice?mode=create', { replace: true });
  };

  useEffect(() => {
    fetchProformaInvoices();
  }, [selectedBusinessId]);

  // Listen for business changes and refetch proforma invoices
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      fetchProformaInvoices();
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, []);

  // pagination (ReusableTable will manage its own pager by default)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Handle row click to open preview
  const handleRowClick = (row) => {
    setPreviewQuotation(row);
    setViewMode('preview');
  };
  const [editingRow, setEditingRow] = useState(null); // holds { sourceRow, initialData }
  const [selectedRows, setSelectedRows] = useState(new Set());

  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [showFormatOne, setShowFormatOne] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const [showBulkConvertDropdown, setShowBulkConvertDropdown] = useState(false);

  // Letterhead upload state
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [conversionDocuments, setConversionDocuments] = useState([]);
  const [conversionType, setConversionType] = useState('sales');

  // Available PDF formats - memoized to include letterhead dynamically
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.PROFORMA} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.PROFORMA} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.PROFORMA} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.PROFORMA} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
    };

    // Add Letterhead format if letterhead is uploaded
    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.PROFORMA} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  // Close convert dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if ((showConvertDropdown || showBulkConvertDropdown) && !event.target.closest('.relative')) {
        setShowConvertDropdown(false);
        setShowBulkConvertDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConvertDropdown, showBulkConvertDropdown]);

  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewQuotation) {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewQuotation]);

  // Fetch preview data when previewQuotation changes
  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewQuotation) {
        try {
          const data = await mapToProformaDataInternal(previewQuotation);
          setPreviewData(data);
        } catch (error) {
          console.error('Error fetching preview data:', error);
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };

    fetchPreviewData();
  }, [previewQuotation]);


  const statusOptions = useMemo(() => {
    return STATUS_OPTS.map((o, i) => ({ id: o.value ?? `s-${i}`, label: o.label, value: o.value }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    let list = rows.filter((r) => {
      let dateOk = true;
      if (bounds && (bounds.start || bounds.end)) {
        // Parse the row date as a local date (YYYY-MM-DD + T00:00:00)
        const d = new Date(String(r.date).split('T')[0] + 'T00:00:00');
        const s = bounds.start ? new Date(bounds.start) : null;
        const e = bounds.end ? new Date(bounds.end) : null;
        if (s) s.setHours(0, 0, 0, 0);
        if (e) e.setHours(23, 59, 59, 999);

        if (s && e) dateOk = d >= s && d <= e;
        else if (s) dateOk = d >= s;
        else if (e) dateOk = d <= e;
      }

      // status
      const statusOk =
        status.value === "all" ? true : r.status === status.value;

      // search
      const sOk =
        !q ||
        (r.partyName && String(r.partyName).toLowerCase().includes(q)) ||
        (r.id && String(r.id).toLowerCase().includes(q));

      return dateOk && statusOk && sOk;
    });

    // sort
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const A = sort.key === "date" ? new Date(a.date) : a[sort.key];
      const B = sort.key === "date" ? new Date(b.date) : b[sort.key];

      if (sort.key === "date") return (A - B) * dir;
      if (sort.key === "amount") return (A - B) * dir;
      if (sort.key === "dueDate") return (new Date(A) - new Date(B)) * dir;
      return String(A ?? "").localeCompare(String(B ?? "")) * dir;
    });

    return list;
  }, [rows, dateRangeLabel, customRange, status, query, sort]);

  // pagination derived (kept for header display)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, dateRangeLabel, customRange, status, pageSize, sort]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* -------------------------
    Actions: create / edit / delete (using CreateSaleForm)
     ------------------------ */

  const handleCreate = () => {
    handleCreateClick();
  };

  const handleFormSaveForCreate = async (invoice) => {


    try {
      const proformaData = {
        business_id: selectedBusinessId,
        proforma_number: invoice.id,
        proforma_date: invoice.date || new Date().toISOString().slice(0, 10),
        party_name: invoice.partyName || invoice.party || "",
        party_id: invoice.party_id || null,
        ship_to_party_id: invoice.ship_to_party_id || null,
        bank_id: invoice.bank_id || null,
        status: invoice.status || "open",
        total_amount: Number(invoice.amount || invoice.meta?.total || 0),
        grand_total: Number(invoice.amount || invoice.meta?.total || 0),
        discount_amount: Number(invoice.meta?.discountAmount || 0),
        tax_amount: Number(invoice.meta?.taxAmount || 0),
        notes: invoice.meta?.notes || "",
        valid_until: invoice.dueDate || null,
        po_agreement_number: invoice.poAgreementNumber || "",
        remark: invoice.remark || "",
        invoice_data: {
          ...invoice.meta,
          remark: invoice.remark || ""
        },
        terms_sections: invoice.terms_sections || []
      };



      const response = await proformaInvoiceAPI.create(proformaData);



      if (response.success) {
        await fetchProformaInvoices();
        setEditingRow(null);
        localStorage.removeItem('editingProformaInvoiceRow');
        localStorage.removeItem('proformaInvoiceViewMode');
        closeModal();
        showSuccessToast(`Proforma ${proformaData.proforma_number} created successfully`);
        // Navigate back to list view
        navigate('/proformaInvoice', { replace: true });
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'proforma_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to create proforma');
      }
    } catch (err) {
      console.error('Error saving proforma invoice:', err);
      closeModal();
      // Re-throw error so form can handle it
      throw err;
    }
  };

  const handleEditClick = (row) => {


    // prepare initialData for CreateSaleForm
    const rawLines = Array.isArray(row.meta?.lines) ? row.meta.lines : Array.isArray(row.lines) ? row.lines : [];
    const normalizedLines = normalizeLinesForForm(rawLines);

    const initialData = {
      id: row.meta?.invoiceNo || row.id || `INV-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      dbId: row.dbId || row.id,
      type: 'proforma',
      date: row.date,
      partyName: row.partyName,
      dueDate: row.dueDate,
      amount: row.amount,
      status: row.status,
      proforma_number: row.id, // Map id to proforma_number for form compatibility
      proforma_date: row.date, // Map date to proforma_date for form compatibility
      poAgreementNumber: row.po_agreement_number || "",
      remark: row.remark || "",
      meta: {
        invoiceNo: row.meta?.invoiceNo || row.id,
        lines: normalizedLines,
        ...(row.meta || {}),
        remark: row.remark || "",
        paymentTerms: row.meta?.paymentTerms ?? 30,
        billing_address: row.meta?.billing_address,
        city: row.meta?.city,
        state: row.meta?.state,
        pincode: row.meta?.pincode,
        country: row.meta?.country,
        shipping_address: row.meta?.shipping_address,
        ship_city: row.meta?.ship_city,
        ship_state: row.meta?.ship_state,
        ship_pincode: row.meta?.ship_pincode,
        ship_country: row.meta?.ship_country,
        selectedBillingIndex: row.meta?.selectedBillingIndex,
        selectedShippingIndex: row.meta?.selectedShippingIndex,
        ship_to_party_id: row.meta?.ship_to_party_id || row.ship_to_party_id || '',
      },
    };



    const editingRowData = { sourceRow: row, initialData };
    setEditingRow(editingRowData);
    localStorage.setItem('editingProformaInvoiceRow', JSON.stringify(editingRowData));
    navigate('/proformaInvoice?mode=edit', { replace: true });
  };

  const handleFormSaveForEdit = async (invoice) => {


    if (!editingRow || !editingRow.sourceRow) {

      await handleFormSaveForCreate(invoice);
      return;
    }

    const dbId = editingRow.sourceRow.dbId || editingRow.sourceRow.id;


    try {
      const proformaData = {
        business_id: selectedBusinessId, // Add business_id
        proforma_number: invoice.proforma_number || invoice.id,
        proforma_date: invoice.proforma_date || invoice.date || editingRow.sourceRow.date,
        party_name: invoice.party_name || invoice.partyName || editingRow.sourceRow.partyName,
        party_id: invoice.party_id || editingRow.sourceRow.party_id,
        ship_to_party_id: invoice.ship_to_party_id || null,
        bank_id: invoice.bank_id || editingRow.sourceRow.bank_id,
        status: invoice.status || editingRow.sourceRow.status,
        total_amount: Number(invoice.total_amount || invoice.amount || invoice.meta?.total || 0),
        grand_total: Number(invoice.grand_total || invoice.amount || invoice.meta?.total || 0),
        discount_amount: Number(invoice.discount_amount || invoice.meta?.discountAmount || 0),
        tax_amount: Number(invoice.tax_amount || invoice.meta?.taxAmount || 0),
        notes: invoice.notes || invoice.meta?.notes || "",
        valid_until: invoice.valid_until || invoice.dueDate || null,
        po_agreement_number: invoice.poAgreementNumber || "",
        remark: invoice.remark || "",
        invoice_data: invoice.invoice_data || {
          lines: invoice.meta?.lines || [],
          charges: invoice.meta?.charges || [],
          notes: invoice.notes || invoice.meta?.notes || '',
          remark: invoice.remark || '',
          bankAccount: invoice.meta?.bankAccount || null,
          bankAccounts: invoice.meta?.bankAccounts || [],
          selectedBankIndex: invoice.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: invoice.meta?.discountAfterTaxPct || 0,
          paymentTerms: invoice.meta?.paymentTerms ?? 30
        },
        terms_sections: invoice.terms_sections || []
      };



      const response = await proformaInvoiceAPI.update(dbId, proformaData, selectedBusinessId);


      if (response.success) {
        await fetchProformaInvoices();
        setEditingRow(null);
        localStorage.removeItem('editingProformaInvoiceRow');
        localStorage.removeItem('proformaInvoiceViewMode');
        closeModal();
        showSuccessToast(`Proforma updated successfully`);
        // Navigate back to list view
        navigate('/proformaInvoice', { replace: true });
      } else {
        throw new Error(response.message || 'Failed to update proforma');
      }
    } catch (err) {
      console.error('Error updating proforma:', err);
      closeModal();
      // Re-throw error so form can handle it
      throw err;
    }
  };

  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const dbId = itemToDelete.dbId || itemToDelete.id;

    try {
      showLoadingModal('Deleting...');

      const response = await proformaInvoiceAPI.delete(dbId, selectedBusinessId);

      closeModal();
      if (response.success) {
        setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
        showSuccessToast(`${itemToDelete.id} deleted`);
        setDeleteModalOpen(false);
        setItemToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting proforma:', err);
      closeModal();
      showErrorToast(err.message || 'Delete Failed');
    }
  };

  //  Handle Single Proforma to Sales Conversion
  const handleConvertProformaToSales = async () => {
    if (!previewQuotation) return;

    try {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: '',
        html: `
          <div class="flex flex-col items-center text-center py-4 px-4 sm:px-6">
            <div class="relative mb-3">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-xl border-2 border-blue-300 animate-pulse">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div class="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            </div>

            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              <span>Convert Proforma</span>
            </h2>
            
            <p class="text-gray-600 text-sm sm:text-base mb-3 leading-relaxed max-w-md px-2">
              <span>You are about to convert proforma </span><strong translate="no" class="text-blue-600 font-semibold">${previewQuotation.id}</strong><span> to a sales invoice.</span>
            </p>

            <div class="w-full max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-l-4 border-blue-500 shadow-sm">
              <div class="flex items-start gap-3">
                <svg class="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-left flex-1">
                  <p class="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                    <span>A new sales invoice will be created. You can adjust quantities in the next step.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Convert',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        width: '95%',
        customClass: {
          container: 'premium-convert-modal-container',
          popup: 'rounded-2xl shadow-2xl border-0 overflow-hidden max-w-lg mx-auto',
          htmlContainer: 'p-0 m-0',
          actions: 'flex flex-col sm:flex-row gap-3 px-4 sm:px-6 pb-4 pt-2 w-full',
          confirmButton: 'w-full sm:flex-1 px-5 py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-0',
          cancelButton: 'w-full sm:flex-1 px-5 py-3 rounded-xl font-bold text-sm sm:text-base text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-0'
        },
        buttonsStyling: false,
        backdrop: 'rgba(0, 0, 0, 0.4)',
        allowOutsideClick: true,
        allowEscapeKey: true,
        focusConfirm: false,
        showClass: {
          popup: 'animate__animated animate__fadeInDown animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp animate__faster'
        }
      });

      if (result.isConfirmed) {
        setConversionDocuments([previewQuotation]);
        setConversionType('sales');
        setIsConvertModalOpen(true);
      }
    } catch (err) {
      console.error('Error initiating conversion:', err);
      showErrorToast('Could not convert to Sales Invoice.');
    }
  };

  //  Handle Bulk Proforma to Sales Conversion
  const handleBulkConvertToSales = async () => {
    if (selectedRows.size === 0) return;

    const rowsToConvert = rows.filter(r => selectedRows.has(r.id));

    try {
      // Show confirmation dialog with premium design
      const result = await Swal.fire({
        title: '',
        html: `
          <div class="flex flex-col items-center text-center py-4 px-4 sm:px-6">
            <div class="relative mb-3">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-xl border-2 border-blue-300 animate-pulse">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div class="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            </div>

            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Convert ${rowsToConvert.length > 1 ? 'Proformas' : 'Proforma'}
            </h2>
            
            <p class="text-gray-600 text-sm sm:text-base mb-3 leading-relaxed max-w-md px-2">
              You are about to convert <strong class="text-blue-600 font-semibold">${rowsToConvert.length} proformas</strong> to sales invoices.
            </p>

            <div class="w-full max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-l-4 border-blue-500 shadow-sm">
              <div class="flex items-start gap-3">
                <svg class="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-left flex-1">
                  <p class="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                    New sales invoices will be created. You can adjust quantities in the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Convert All',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        width: '95%',
        customClass: {
          container: 'premium-convert-modal-container',
          popup: 'rounded-2xl shadow-2xl border-0 overflow-hidden max-w-lg mx-auto',
          htmlContainer: 'p-0 m-0',
          actions: 'flex flex-col sm:flex-row gap-3 px-4 sm:px-6 pb-4 pt-2 w-full',
          confirmButton: 'w-full sm:flex-1 px-5 py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-0',
          cancelButton: 'w-full sm:flex-1 px-5 py-3 rounded-xl font-bold text-sm sm:text-base text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-0'
        },
        buttonsStyling: false,
        backdrop: 'rgba(0, 0, 0, 0.4)',
        allowOutsideClick: true,
        allowEscapeKey: true,
        focusConfirm: false,
        showClass: {
          popup: 'animate__animated animate__fadeInDown animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp animate__faster'
        }
      });

      if (result.isConfirmed) {
        setConversionDocuments(rowsToConvert);
        setConversionType('sales');
        setIsConvertModalOpen(true);
      }

    } catch (err) {
      console.error('Bulk conversion error:', err);
      showErrorToast('An error occurred during bulk conversion.');
    }
  };

  const executeConversion = async (targetType, conversionBatch) => {
    const businessId = localStorage.getItem('selectedBusinessId');
    showLoadingModal(`Converting ${conversionBatch.length} items...`);

    let successCount = 0;
    let failCount = 0;

    for (const batch of conversionBatch) {
      try {
        const response = await proformaInvoiceAPI.convert(batch.id, {
          business_id: businessId,
          type: targetType,
          items: batch.items
        });

        if (response.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Failed to convert Proforma ${batch.id}:`, err);
        failCount++;
      }
    }

    await fetchProformaInvoices();
    setSelectedRows(new Set());
    closeModal();

    if (failCount === 0) {
      showSuccessToast(`Successfully converted ${successCount} items to Sales Invoices`);
      if (viewMode === 'preview') {
        // Refresh preview data if it was converted
        const updatedRow = rows.find(r => r.dbId === previewQuotation.dbId || r.id === previewQuotation.id);
        if (updatedRow) setPreviewQuotation(updatedRow);
        else setViewMode('list');
      }
    } else {
      showErrorToast(`Converted ${successCount} items. Failed: ${failCount}`);
    }
  };

  // form cancel/back
  const handleFormCancel = () => {
    setEditingRow(null);
    localStorage.removeItem('editingProformaInvoiceRow');
    localStorage.removeItem('proformaInvoiceViewMode');
    navigate('/proformaInvoice', { replace: true });
  };

  /* -------------------------
    Date range handlers
     ------------------------ */

  const onStatusChange = (optOrLabel) => {
    const val = optOrLabel && optOrLabel.value ? optOrLabel.value : (optOrLabel && optOrLabel.label ? optOrLabel.label : optOrLabel);
    const found = STATUS_OPTS.find((s) => s.value === val || s.label === val);
    setStatus(found || STATUS_OPTS[1]);
  };

  // Function to generate and download PDF
  const generatePDF = async (quotationData, formatKey = selectedFormat) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[formatKey].component;
      const fileName = `PerformanceInvoice-${quotationData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={quotationData} />,
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
          showErrorModal('Failed to generate PDF. Please try again.');
          setIsGeneratingPDF(false);
        }
      });

    } catch (error) {
      console.error('PDF setup failed:', error);
      closeModal();
      showErrorModal('Failed to initiate PDF generation.');
      setIsGeneratingPDF(false);
    }
  };

  // Function to map quotation row to FormatOne da  // Function to map proforma row to PDF Format data
  const mapToProformaDataInternal = async (row) => {
    return await mapToProformaInvoiceData(row, businessData, partyAPI, currency);
  };

  const modals = (
    <>
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.id || ""}
        itemType="proforma invoice"
      />
      {/* Conversion Modal */}
      <ConvertQuotationModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConvert={executeConversion}
        quotations={conversionDocuments}
        type={conversionType}
        sourceLabel="Proforma Invoice"
      />
    </>
  );

  /* -------------------------
    Render
     ------------------------ */

  // show full CreateSaleForm for create/edit
  if (viewMode === "create") {
    return (
      <>
        <QuotationForm
          key="create-form"
          onSave={handleFormSaveForCreate}
          onBack={handleFormCancel}
          initialData={{}}
          formTitle="Create Proforma Invoice"
          formType="proforma"
          showTopActions={true}
          showBottomActions={true}
          saveLabel="Save"
          cancelLabel="Cancel"
          currency={currency}
        />
        {modals}
      </>
    );
  }
  if (viewMode === "edit" && editingRow?.initialData) {
    return (
      <>
        <QuotationForm
          key={`edit-form-${editingRow.sourceRow?.id}`}
          onSave={handleFormSaveForEdit}
          onBack={handleFormCancel}
          initialData={editingRow.initialData}
          formTitle="Update Proforma Invoice"
          formType="proforma"
          showTopActions={true}
          showBottomActions={true}
          saveLabel="Updated Changes"
          cancelLabel="Cancel"
          currency={currency}
        />
        {modals}
      </>
    );
  }

  // Handle letterhead upload
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

  // Fixed Header Component for Proforma Invoice Preview
  const ProformaPreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-3">
          {/* Desktop Back Button */}
          <button
            onClick={() => { setViewMode('list'); setPreviewQuotation(null); }}
            className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          {/* Mobile Back Button */}
          <button
            onClick={() => { setViewMode('list'); setPreviewQuotation(null); }}
            className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            PI-Preview - {previewQuotation.id}
          </h1>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Format Dropdown - First Position */}
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
              accept="application/pdf, .pdf, application/msword, .doc, application/vnd.openxmlformats-officedocument.wordprocessingml.document, .docx, image/*"
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

          {/* Remove Letterhead Button (shown only when letterhead is uploaded) */}
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

          {/* Share Button */}
          {/* <div className="relative">
            <button
              onClick={() => setShowShareDropdown(p => !p)}
              className="h-8 w-8 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] hover:from-[#7c3aed]/90 hover:to-[#a855f7]/90 text-white rounded-[7px] transition-all duration-200 focus:outline-none flex items-center justify-center"
              title="Share"
            >
              <Share2 size={15} />
            </button>

            {showShareDropdown && (() => {
              const dbId = previewQuotation?.dbId || previewQuotation?.id;
              const formatKey = selectedFormat || 'ProformaFormat_1';
              const shareUrl = `${window.location.origin}/#/public/download/proforma/${dbId}?format=${formatKey}`;

              const businessName = businessData?.name || 'our company';
              const partyName = previewQuotation?.partyName || 'Customer';
              const docId = previewQuotation?.id || '';
              const amount = previewQuotation?.amount || '0';
              const date = previewQuotation?.date ? new Date(previewQuotation.date).toLocaleDateString() : '';

              const msg = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Proforma Invoice ${docId} from ${businessName}.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you!`);
              const emailSubject = encodeURIComponent(`Proforma Invoice ${docId} from ${businessName}`);
              const emailBody = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Proforma Invoice ${docId} attached below.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you,\n${businessName}`);
              return (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <a
                    href={`https://wa.me/?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-green-50 border-b border-gray-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366] fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.517 5.855L0 24l6.335-1.485A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.044-1.394l-.361-.214-3.761.882.939-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" /></svg>
                    WhatsApp
                  </a>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&su=${emailSubject}&body=${emailBody}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    <Mail size={14} className="text-blue-500" />
                    Email
                  </a>
                </div>
              );
            })()}
          </div> */}

          {/* Convert Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowConvertDropdown(!showConvertDropdown)}
              className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:shadow-lg text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-2 sm:px-3 flex items-center justify-center gap-1 shadow-md whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="hidden sm:inline">Convert</span>
              <ChevronDown size={12} className={`transition-transform ${showConvertDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showConvertDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    handleConvertProformaToSales();
                    setShowConvertDropdown(false);
                  }}
                  className="w-full px-2 py-1.5 text-left hover:bg-green-100 transition-all"
                  style={{ boxShadow: 'none' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Tax Invoice</div>
                    <div className="text-xs text-gray-500">Convert to sales invoice</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (viewMode === 'preview' && previewQuotation) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Fixed Header - Always visible at top */}
        <ProformaPreviewHeader />

        {/* PDF Preview Content - Full Width Centered with top padding for fixed header */}
        <div className="preview-wrapper pt-16 p-6 bg-white w-full min-h-screen">
          <div className="w-full max-w-7xl mx-auto">
            {previewData ? (() => {
              const formatObj = pdfFormats[selectedFormat] || pdfFormats['FormatOne'] || Object.values(pdfFormats)[0];
              const SelectedFormat = formatObj.component;
              return <SelectedFormat data={previewData} />;
            })() : (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading preview...</div>
              </div>
            )}
          </div>
        </div>
        {modals}
      </div>
    );
  }

  // Columns for ReusableTable with checkbox and row click
  const columns = [
    {
      key: 'id',
      title: 'Proforma Number',
      sortable: true,
      render: (r) => (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.has(r.id)}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedRows((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(r.id)) {
                  newSet.delete(r.id);
                } else {
                  newSet.add(r.id);
                }
                return newSet;
              });
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="mr-3 rounded text-green-600 w-5 h-5 cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(r);
            }}
            className="text-sm text-gray-700 cursor-pointer bg-transparent border-none p-0"
            translate="no"
          >
            <span>{r.id}</span>
          </button>
        </div>
      ),
    },
    { key: "date", title: "Date", sortable: true, render: (r) => <span>{formatDate(r.date)}</span> },
    { key: "partyName", title: "Party Name", sortable: true, render: (r) => <span>{r.partyName}</span> },
    { key: "dueDate", title: "Due In", sortable: true, render: (r) => <span>{calcDueIn(r.dueDate)}</span> },
    { key: "amount", title: "Amount", sortable: true, render: (r) => <span translate="no"><span>{formatCurrencyDisplay(r.amount)}</span></span>, tdClass: 'text-right' },
    { key: "status", title: "Status", sortable: false, render: (r) => <StatusPill status={r.status} /> },
  ];

  if (loading) {
    return <MainLoader message="Loading proforma invoices..." />;
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
                onClick={handleCreate}
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
              placeholder="PI-0000 or Party Name"
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

              <CommonDropdown
                options={statusOptions}
                value={status.label}
                onChange={(opt) => onStatusChange(opt)}
                placeholder="Status"
                className="w-52"
              />

              <button
                onClick={handleCreate}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
              </button>
            </div>

            {selectedRows.size > 0 && (
              <div className="flex flex-wrap gap-2 justify-end w-full">
                <button
                  key={`bulk-convert-btn-mobile-${selectedRows.size}`}
                  onClick={handleBulkConvertToSales}
                  className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:shadow-lg text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <LiaFileExportSolid size={16} />
                  <span>Convert to Sales</span> <span key={selectedRows.size} translate="no" className="notranslate ml-1">({selectedRows.size})</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Layout - Between aligned */}
          <div className="hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
            <DashboardBackButton />
            <div className="flex items-center gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="PI-0000 or Party Name"
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

                <CommonDropdown
                  options={statusOptions}
                  value={status.label}
                  onChange={(opt) => onStatusChange(opt)}
                  placeholder="Status"
                  className="w-52"
                />

                <button
                  onClick={handleCreate}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                  aria-label="Create new"
                >
                  <Plus size={18} />
                  New
                </button>

                {selectedRows.size > 0 && (
                  <div className="relative">
                    <button
                      key={`bulk-convert-btn-${selectedRows.size}`}
                      onClick={() => setShowBulkConvertDropdown(!showBulkConvertDropdown)}
                      className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:shadow-lg text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Convert</span> <span key={selectedRows.size} translate="no" className="notranslate">({selectedRows.size})</span>
                      <ChevronDown size={14} className={`transition-transform ${showBulkConvertDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Bulk Convert Dropdown Menu */}
                    {showBulkConvertDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            handleBulkConvertToSales();
                            setShowBulkConvertDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-green-100 transition-all"
                          style={{ boxShadow: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Tax Invoice</div>
                            <div className="text-xs text-gray-500">Convert to sales invoice</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Empty State */}
      {!loading && rows.length === 0 && viewMode === "list" && (
        <GeneralEmptyState
          title="No Proforma Invoices Found"
          description="You haven't created any proforma invoices yet. Create your first proforma invoice to share with your customers."
          buttonText="Create First Proforma"
          onButtonClick={handleCreate}
          icon={FileText}
        />
      )}

      {/* ReusableTable */}
      {viewMode === "list" && rows.length > 0 && (
        <div className="">
          <ReusableTable
            columns={columns}
            data={filtered}
            rowKey="id"
            defaultPageSize={10}
            pageSizeOptions={[5, 10, 15, 25]}
            searchable={false}
            compact={false}
            onRowClick={handleRowClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
            onShare={async (row, type) => {
              try {
                // Generate PDF blob for sharing
                const quotationData = await mapToProformaData(row);

                // Create temporary div for PDF generation
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                tempDiv.style.width = '800px';
                tempDiv.style.background = '#fff';
                document.body.appendChild(tempDiv);

                const root = ReactDOM.createRoot(tempDiv);
                await new Promise(resolve => {
                  root.render(<FormatOne quotationData={quotationData} />);
                  setTimeout(resolve, 500);
                });

                const canvas = await html2canvas(tempDiv, {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff',
                  width: 800,
                  height: tempDiv.scrollHeight,
                });

                // Create PDF blob
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                const pdfBlob = pdf.output('blob');

                // Cleanup
                root.unmount();
                if (tempDiv.parentNode) document.body.removeChild(tempDiv);

                if (type === 'whatsapp') {
                  // For WhatsApp, create a downloadable link and share text
                  const message = `Performance Invoice ${row.id} for ${row.partyName}, Amount: ${row.amount}\n\nPlease find the attached performance invoice PDF.`;
                  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                  window.open(url, '_blank');

                  // Also trigger PDF download
                  const fileName = `PerformanceInvoice-${row.id}.pdf`;
                  const url2 = URL.createObjectURL(pdfBlob);
                  const a = document.createElement('a');
                  a.href = url2;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  if (a.parentNode) document.body.removeChild(a);
                  URL.revokeObjectURL(url2);

                } else if (type === 'email') {
                  // For email, create mailto with PDF attachment (limited browser support)
                  const subject = `Performance Invoice ${row.id} - ${row.partyName}`;
                  const body = `Please find the attached performance invoice PDF.\n\nPerformance Invoice Details:\nID: ${row.id}\nParty: ${row.partyName}\nAmount: ${row.amount}\nDate: ${new Date(row.date).toLocaleDateString()}`;

                  // Download PDF first
                  const fileName = `PerformanceInvoice-${row.id}.pdf`;
                  const url = URL.createObjectURL(pdfBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  if (a.parentNode) document.body.removeChild(a);
                  URL.revokeObjectURL(url);

                  // Then open email client
                  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  window.open(mailtoUrl, '_blank');

                  showInfoToast({
                    title: 'PDF Downloaded',
                    text: 'Email client opened. Please attach the downloaded PDF to your email.',
                    timer: 4000,
                  });
                }
              } catch (error) {
                console.error('Share failed:', error);
                showErrorModal('Failed to share performance invoice. Please try again.');
              }
            }}
          // Optional: wire table sort -> component state if your ReusableTable calls `onSort(key, dir)`
          // onSort={(key, dir) => setSort({ key, dir })}
          />
        </div>
      )}


      {showFormatOne && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center print-modal">

          <div className="
       bg-white relative flex flex-col
       w-full h-full                /* Mobile fullscreen */
       md:w-4/5 md:h-4/5           /* Tablet centered */
       lg:max-w-5xl lg:max-h-[90vh] /* Large screens */
       rounded-md shadow-xl
       print-content
     ">

            {/* HEADER */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-100 print:hidden">
              <h2 className="font-semibold text-lg">Performance Invoice Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Print
                </button>
                <button
                  onClick={() => { }}
                  disabled={true}
                  title="PDF Download is temporarily disabled"
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setShowFormatOne(false)}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>
            </div>

            {/* MAIN SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-auto p-4 print-container">
              {previewData && (previewQuotation?.id === selectedQuotation?.id) ? (
                <FormatOne quotationData={previewData} />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 italic">Please view this proforma from the list for a full preview.</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <style>{`
   @media print {
     .print-modal {
       position: static !important;
       background: white !important;
       display: block !important;
       width: 100% !important;
       height: auto !important;
       z-index: auto !important;
     }
     .print-content {
       max-width: none !important;
       max-height: none !important;
       overflow: visible !important;
       background: white !important;
       box-shadow: none !important;
       border-radius: 0 !important;
     }
     .print\\:hidden {
       display: none !important;
     }
     .print-container {
       padding: 0 !important;
       overflow: visible !important;
     }
     body * {
       visibility: hidden;
     }
     .print-modal,
     .print-modal * {
       visibility: visible;
     }
     .print-modal {
       position: absolute;
       left: 0;
       top: 0;
       width: 100%;
       height: auto;
     }
   }
 `}</style>


      {modals}
    </div>
  );
}

/* -------------------------
  Small bits / helpers
   ------------------------ */
function StatusPill({ status }) {
  const map = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    closed: "bg-green-50 text-green-700 border-green-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`border px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.open}`}>{(status || "").charAt(0).toUpperCase() + (status || "").slice(1)}</span>;
}
