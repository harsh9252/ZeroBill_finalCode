// SalesInvoice.jsx
import React, { useMemo, useState, useEffect } from "react";
import { convertFileToImage } from '../../../utils/fileConverter';

import ReactDOM from 'react-dom/client';
import {
  Search,
  Settings,
  Grid2x2,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  Download,
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Package,
  ArrowRight,
  Share2,
  Mail
} from "lucide-react";

import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FaFileInvoice, FaClipboardList } from 'react-icons/fa';

import "sweetalert2/dist/sweetalert2.min.css";
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import { formatDate } from "../../../utils/dateFormat.js";
import MainLoader from "../../../Components/MainLoader.jsx";

import ReusableTable from "../../../Components/ReusableTable.jsx";
import QuotationForm from "../Quotation/QuotationForm.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';

// USE your DateRangePicker exports
import Date_wise_Filter_Button, { getRangeBoundsPure } from "../../../Components/Date_wise_Filter_Button.jsx";
import { formatCurrency } from "../../../utils/currency";
import api from '../../../utils/api';
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import InvoiceChoiceModal from "../../../Components/InvoiceChoiceModal.jsx";
const { partyAPI, businessAPI, salesInvoiceAPI } = api;

// Import Centralized PDF Format Components
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { mapToSalesInvoiceData } from "../../../utils/documentMapper";

const calculateDueDate = (date, days = 30) => {
  if (!date) return null;

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split("T")[0];
};

const STATUS_OPTS = [
  { label: "Show All", value: "all" },
  { label: "Show Open invoice", value: "open" },
  { label: "Show Overdue", value: "overdue" },
  { label: "Show Closed", value: "closed" },
];

const daysUntil = (date) => {
  if (!date || date === '0000-00-00' || date === 'null') return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  if (isNaN(target.getTime()) || target.getFullYear() < 2000) return null;
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
};


// Demo data (kept)
const DEMO = [
  {
    id: "INV-0001",
    date: "2025-10-10",
    partyName: "Acme Industries",
    dueDate: "2025-11-15",
    amount: 125000,
    status: "open",
  },
  {
    id: "INV-0002",
    date: "2025-11-01",
    partyName: "Bright Retail",
    dueDate: "2025-11-05",
    amount: 56000,
    status: "overdue",
  },
  {
    id: "INV-0003",
    date: "2025-08-20",
    partyName: "Cobalt Traders",
    dueDate: "2025-08-30",
    amount: 23450,
    status: "closed",
  },
];

function StatusPill({ status }) {
  const map = {
    open: { text: "Open", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    overdue: { text: "Overdue", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    closed: { text: "Closed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  const s = map[status] || map.open;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}><span>{s.text}</span></span>;
}

function DuePill({ date }) {
  const d = daysUntil(date);
  if (d === null) return <span className="text-gray-400 text-[10px] italic">Not Set</span>;

  let text = "";
  let cls = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ";
  if (d < 0) {
    text = `Overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"}`;
    cls += "bg-rose-50 text-rose-700 border-rose-200";
  } else if (d === 0) {
    text = "Due today";
    cls += "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    text = `In ${d} day${d === 1 ? "" : "s"}`;
    cls += "bg-slate-50 text-slate-700 border-slate-200";
  }
  return <span className={cls}><span>{text}</span></span>;
}


// Removed local InvoiceChoiceModal as it is now a shared component in src/Components/

// MAIN SalesInvoice component
export default function SalesInvoice({ currency, checkBusiness }) {
  const [query, setQuery] = useState("");
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState(STATUS_OPTS[0]);
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [selectedRows, setSelectedRows] = useState(new Set());

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('salesInvoiceViewMode', mode);
      return mode === 'edit' ? 'create' : mode;
    }
    const savedMode = localStorage.getItem('salesInvoiceViewMode');
    return savedMode === 'edit' ? 'create' : (savedMode || 'list');
  });

  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  
  // Fetch data
  const fetchSalesInvoices = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const response = await salesInvoiceAPI.getAll(selectedBusinessId);
      if (response.success) {
        setRows(response.data.map(q => {
        //  payment terms nikalo
        const paymentTerms =
        q.invoice_data?.paymentTerms ||
        q.payment_terms ||   // fallback agar backend field ho
        30;

        //  due date calculate karo (fallback)
        let calculatedDueDate = q.due_date;

if (!calculatedDueDate) {
  calculatedDueDate = calculateDueDate(q.invoice_date, paymentTerms);
}
        

        return {
          id: q.invoice_number,
          dbId: q.id,
          date: q.invoice_date,
          updatedDate: q.updated_at,
          partyName: q.party_name,
          amount: parseFloat(q.grand_total),
          status: q.status || 'open',

          //  FIXED LINE
          dueDate: calculatedDueDate,

          meta: q.invoice_data || {},
          party_id: q.party_id,
          bank_id: q.bank_id,
          business_id: q.business_id,
          quotation_id: q.quotation_id,
          proforma_id: q.proforma_id,
          po_agreement_number: q.po_agreement_number || '',
          remark: q.remark || '',
          einvoice_status: q.einvoice_status || null,
          irn: q.irn || null,
        };
      }));
      }
    } catch (err) {
      console.error('Error fetching sales invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesInvoices();
  }, [selectedBusinessId]);

  // Listen for business changes and refetch sales invoices
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      fetchSalesInvoices();
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, []);


  //  Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode === 'edit' ? 'create' : mode);
      localStorage.setItem('salesInvoiceViewMode', mode);

      if (mode === 'create') {
        const prefilled = localStorage.getItem('prefilledInvoiceData');
        if (prefilled) {
          try {
            setEditingRow(JSON.parse(prefilled));
            localStorage.removeItem('prefilledInvoiceData'); // Clear after use
          } catch (e) {
            console.error('Failed to parse prefilled invoice data', e);
          }
        }
        setLoading(false);
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingSalesInvoiceRow');
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
      localStorage.removeItem('salesInvoiceViewMode');
      setLoading(false);
    }
  }, [searchParams]);

  //  Navigate to create view
  const handleCreateClick = () => {
    checkBusiness(() => {
      setEditingRow(null);
      setLoading(false);
      navigate('/invoice?mode=create', { replace: true });
    });
  };
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');

  // Letterhead upload state
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  // Available PDF formats - memoized to include letterhead dynamically
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.SALES_INVOICE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.SALES_INVOICE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.SALES_INVOICE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.SALES_INVOICE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
    };

    // Add Letterhead format if letterhead is uploaded
    if (uploadedLetterhead) {
      formats.Letterhead = { 
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.SALES_INVOICE} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

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

  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewInvoice) {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewInvoice]);

  // Fetch preview data when previewInvoice changes
  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewInvoice) {
        try {
          const data = await mapToSalesInvoiceData(previewInvoice, businessData, partyAPI, currency);
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
  }, [previewInvoice]);

  // Handle row click to open preview
  const handleRowClick = (row) => {
    setPreviewInvoice(row);
    setViewMode('preview');
  };


  const statusOptions = useMemo(() => {
    return STATUS_OPTS.map((o, i) => ({ id: o.value ?? `s-${i}`, label: o.label, value: o.value }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

    // 1. Map rows and apply dynamic status (overdue check)
    let processedRows = rows.map(r => {
      if (r.status === "closed") return r;
      const diff = daysUntil(r.dueDate);
      return {
        ...r,
        // If it's not closed and past due date, it's overdue
        status: (diff !== null && diff < 0) ? "overdue" : r.status
      };
    });

    // 2. Filter the processed rows
    let list = processedRows.filter((r) => {
      // Date filtering
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

      // Status filtering
      let statusOk = true;
      if (status.value !== "all") {
        statusOk = r.status === status.value;
      }

      // Search filtering (Invoice Number or Party Name)
      const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
      const id = r.id ? String(r.id).toLowerCase() : '';
      const sOk = !q || partyName.includes(q) || id.includes(q);

      return dateOk && statusOk && sOk;
    });

    // 3. Sorting
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      let A = a[sort.key];
      let B = b[sort.key];

      if (sort.key === "date" || sort.key === "dueDate") {
        A = new Date(A || 0);
        B = new Date(B || 0);
      }

      if (sort.key === "amount" || sort.key === "date" || sort.key === "dueDate") {
        return (A - B) * dir;
      }

      return String(A || "").localeCompare(String(B || "")) * dir;
    });

    return list;
  }, [rows, dateRangeLabel, customRange, status, query, sort]);


  const optLabel = (opt) => (typeof opt === "string" ? opt : opt.label || opt);

  // Edit opens CreateSaleForm for edit
  const handleEditClick = (row) => {


    const rawLines = Array.isArray(row.meta?.lines)
      ? row.meta.lines
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
      image_url: ln.image_url || ''
    }));

    const editRow = {
      ...row,
      dbId: row.dbId || row.id,
      type: 'sales',
      invoice_number: row.id, // Map id to invoice_number for form compatibility
      invoice_date: row.date, // Map date to invoice_date for form compatibility
      poAgreementNumber: row.po_agreement_number || "",
      remark: row.remark || "",
      meta: {
        ...row.meta,
        lines: normalizedLines,
        charges: row.meta?.charges || [],
        notes: row.meta?.notes || '',
        bankAccount: row.meta?.bankAccount || null,
        bankAccounts: row.meta?.bankAccounts || [],
        selectedBankIndex: row.meta?.selectedBankIndex || -1,
        discountAfterTaxPct: row.meta?.discountAfterTaxPct || 0,
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
      invoice_data: row.meta // Also include invoice_data for backward compatibility
    };

    setEditingRow(editRow);
    localStorage.setItem('editingSalesInvoiceRow', JSON.stringify(editRow));
    navigate('/invoice?mode=edit', { replace: true });
    setViewMode("create");
  };

  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const dbId = itemToDelete.dbId || itemToDelete.id;

    try {
      showLoadingModal('Deleting invoice...');

      const response = await salesInvoiceAPI.hardDelete(dbId, selectedBusinessId);

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
      console.error('Error deleting sales invoice:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete invoice.');
    }
  };

  const handleCreateSalesInvoice = () => {
    setShowChoiceModal(true);
  };

  // handle Create modal "Continue"
  const handleChoiceContinue = (choice) => {
    setShowChoiceModal(false);
    if (choice.type === 'normal') {
      handleCreateClick();
    } else {
      // Prefilled data from PO
      const { poData, selectedItems } = choice;

      // Extract full metadata from PO Data
      let poMeta = {};
      try {
        poMeta = (poData.book_purchase_order_data && typeof poData.book_purchase_order_data === 'object')
          ? poData.book_purchase_order_data
          : (typeof poData.purchase_invoice_data === 'string'
            ? JSON.parse(poData.purchase_invoice_data)
            : (poData.purchase_invoice_data || poData.invoice_data || poData.purchase_order_data || poData.order_data || poData.book_purchase_order_data || {}));
      } catch (e) {
        console.error('Failed to parse PO metadata for mapping', e);
      }

      // Map selected PO items to form structure
      const prefilledLines = selectedItems.map(item => ({
        ...item,
        qty: parseFloat(item.orderQty),
        // Ensure tax fields are carried over correctly
        taxType: item.taxType || 'GST',
        cgstPct: item.cgstPct ?? 9,
        sgstPct: item.sgstPct ?? 9,
        igstPct: item.igstPct ?? 18,
      }));

      const prefilledData = {
        type: 'sales',
        partyName: poData.party_name || poData.partyName,
        party_name: poData.party_name || poData.partyName,
        party_id: poData.party_id,
        bank_id: poData.bank_id,
        po_agreement_number: poData.book_purchase_order_number || poData.purchase_invoice_number || poData.purchase_order_number || poData.invoice_number || poData.id,
        remark: poData.remark || poMeta.remark || "",
        notes: poData.notes || poMeta.notes || "",
        meta: {
          ...poMeta, // Carry over Additional Charges, Discounts, Bank Info, etc.
          lines: prefilledLines, // Only include selected items/quantities
          notes: `Based on PO #${poData.purchase_order_number || poData.book_purchase_order_number || poData.id}. ${poMeta.notes || ""}`,
          bank_id: poData.bank_id,
          poAgreementNumber: poData.purchase_order_number || poData.book_purchase_order_number || poData.id,
          isFromPO: true, // Flag for QuotationForm
          // Preserve selected address and bank indices
          selectedBillingIndex: poMeta.selectedBillingIndex ?? 0,
          selectedShippingIndex: poMeta.selectedShippingIndex ?? 0,
          selectedBankIndex: poMeta.selectedBankIndex ?? -1,
          ship_to_party_id: poMeta.ship_to_party_id || poData.ship_to_party_id || null,
        },
        // Maintain compatibility for QuotationForm initialization
        book_purchase_order_data: {
          ...poMeta,
          lines: prefilledLines,
          ship_to_party_id: poMeta.ship_to_party_id || poData.ship_to_party_id || null,
        }
      };

      // setEditingRow(prefilledData);
      setEditingRow({
        ...prefilledData,
        _sourcePoDbId: poData.id,           // PO ka actual DB id
        _sourcePoItems: selectedItems,       // selected items with orderQty
        _sourcePoData: poData,              // full PO data for rebuild
      });
      navigate('/invoice?mode=create', { replace: true });
      navigate('/invoice?mode=create', { replace: true });
    }
  };

 const handleInvoiceSaved = async (invoiceData) => {
    try {
      const salesData = {
        business_id: selectedBusinessId,
        invoice_number: invoiceData.invoice_number || invoiceData.id,
        invoice_date: invoiceData.invoice_date || invoiceData.date || new Date().toISOString().slice(0, 10),
        party_name: invoiceData.party_name || invoiceData.partyName || invoiceData.party || "",
        party_id: invoiceData.party_id || null,
        ship_to_party_id: invoiceData.ship_to_party_id || null,
        bank_id: invoiceData.bank_id || null,
        status: invoiceData.status || "open",
        total_amount: Number(invoiceData.total_amount || invoiceData.amount || invoiceData.meta?.total || 0),
        grand_total: Number(invoiceData.grand_total || invoiceData.amount || invoiceData.meta?.total || 0),
        discount_amount: Number(invoiceData.discount_amount || invoiceData.meta?.discountAmount || 0),
        tax_amount: Number(invoiceData.tax_amount || invoiceData.meta?.taxAmount || 0),
        notes: invoiceData.notes || invoiceData.meta?.notes || "",
        due_date: invoiceData.due_date || invoiceData.dueDate || null,
        po_agreement_number: invoiceData.poAgreementNumber || "",
        remark: invoiceData.remark || "",
        invoice_data: invoiceData.invoice_data || {
          lines: invoiceData.meta?.lines || [],
          charges: invoiceData.meta?.charges || [],
          notes: invoiceData.notes || invoiceData.meta?.notes || '',
          remark: invoiceData.remark || '',
          bankAccount: invoiceData.meta?.bankAccount || null,
          bankAccounts: invoiceData.meta?.bankAccounts || [],
          selectedBankIndex: invoiceData.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: invoiceData.meta?.discountAfterTaxPct || 0,
          paymentTerms: invoiceData.meta?.paymentTerms ?? 30
        },
        terms_sections: invoiceData.terms_sections || []
      };

      let response;
      const dbId = editingRow?.dbId || editingRow?.id;
      const isEdit = !!dbId && !editingRow?._sourcePoDbId; // ✅ PO se bana invoice edit nahi hai
      
      if (isEdit) {
        response = await salesInvoiceAPI.update(dbId, salesData, selectedBusinessId);
      } else {
        response = await salesInvoiceAPI.create(salesData);
      }

      if (response.success) {
        await fetchSalesInvoices();

        // ✅ Agar invoice PO se bana tha, to PO ki bookedQty update karo
        if (!isEdit && editingRow?._sourcePoDbId && editingRow?._sourcePoItems) {
          try {
            const poData = editingRow._sourcePoData;
            const selectedItems = editingRow._sourcePoItems;

            // PO ki existing meta parse karo
            let poMeta = {};
            try {
              poMeta = (poData.book_purchase_order_data && typeof poData.book_purchase_order_data === 'object')
                ? poData.book_purchase_order_data
                : typeof poData.book_purchase_order_data === 'string'
                  ? JSON.parse(poData.book_purchase_order_data)
                  : {};
            } catch (e) {
              console.error('PO meta parse error', e);
            }

            const existingLines = poMeta.lines || [];

            // ✅ selectedItems ke orderQty ko bookedQty mein add karo + extra fields clean karo
            const updatedLines = existingLines.map(line => {
              const matched = selectedItems.find(si =>
                (si.description || si.name) === (line.description || line.name) &&
                String(si.price) === String(line.price)
              );

              // ✅ Har line se orderQty, remainingQty, error strip karo before saving
              const { orderQty, remainingQty, error, ...cleanLine } = line;

              if (matched) {
                const addedQty = parseFloat(matched.orderQty) || 0;
                const currentBooked = cleanLine.bookedQty || 0;
                return {
                  ...cleanLine,
                  bookedQty: currentBooked + addedQty,
                };
              }

              return cleanLine;
            });

            // ✅ Agar sab items fully booked ho gaye to PO status 'closed' karo
            const allBooked = updatedLines.every(line => {
              const total = parseFloat(line.qty || line.quantity || 0);
              const booked = parseFloat(line.bookedQty || 0);
              return total > 0 && booked >= total; // ✅ total > 0 check bhi add kiya
            });

            const updatedPoMeta = { ...poMeta, lines: updatedLines };

            const updatedPayload = {
              business_id: selectedBusinessId,
              book_purchase_order_number: poData.book_purchase_order_number || poData.id,
              order_date: (poData.order_date || poData.invoice_date || poData.date || '').split('T')[0],
              party_name: poData.party_name || poData.partyName || '',
              party_id: poData.party_id || null,
              bank_id: poData.bank_id || null,
              status: allBooked ? 'closed' : (poData.status || 'open'),
              total_amount: Number(poData.total_amount || 0),
              discount_amount: Number(poData.discount_amount || 0),
              tax_amount: Number(poData.tax_amount || 0),
              grand_total: Number(poData.grand_total || 0),
              notes: poData.notes || poMeta.notes || '',
              remark: poData.remark || '',
              po_agreement_number: poData.po_agreement_number || '',
              book_purchase_order_data: updatedPoMeta,
              terms_sections: poData.terms_sections || [],
            };

            const { bookPurchaseOrderAPI } = api;
            await bookPurchaseOrderAPI.update(editingRow._sourcePoDbId, updatedPayload);
          } catch (poUpdateErr) {
            console.error('❌ Failed to update PO bookedQty:', poUpdateErr);
          }
        }

        setEditingRow(null);
        navigate('/invoice', { replace: true });
        closeModal();
        showSuccessToast(isEdit ? `Invoice updated successfully` : `Invoice ${salesData.invoice_number} created successfully`);
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'invoice_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to save invoice');
      }
    } catch (err) {
      console.error('Error saving sales invoice:', err);
      closeModal();
      // Re-throw error so form can handle it
      throw err;
    }
  };

  const handleBackToList = () => {
    setEditingRow(null);
    setPreviewInvoice(null);
    setViewMode('list');
    navigate('/invoice', { replace: true });
  };

  // Function to generate and download PDF
  const generatePDF = async (invoiceData, formatKey = selectedFormat) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[formatKey].component;
      const fileName = `SalesInvoice-${invoiceData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={invoiceData} />,
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

  // Preview Header Component
  const SalesInvoicePreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-3">
          {/* Desktop Back Button */}
          <button
            onClick={() => { setViewMode('list'); setPreviewInvoice(null); }}
            className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          {/* Mobile Back Button */}
          <button
            onClick={() => { setViewMode('list'); setPreviewInvoice(null); }}
            className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            Sales Invoice Preview - {previewInvoice?.id}
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
              const dbId = previewInvoice?.dbId || previewInvoice?.id;
              const formatKey = selectedFormat || 'SalesInvoiceFormat_1';
              const shareUrl = `${window.location.origin}/#/public/download/sales-invoice/${dbId}?format=${formatKey}`;

              const businessName = businessData?.name || 'our company';
              const partyName = previewInvoice?.partyName || 'Customer';
              const docId = previewInvoice?.id || '';
              const amount = previewInvoice?.amount || '0';
              const date = previewInvoice?.date ? new Date(previewInvoice.date).toLocaleDateString() : '';

              const msg = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Tax Invoice ${docId} from ${businessName}.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you!`);
              const emailSubject = encodeURIComponent(`Tax Invoice ${docId} from ${businessName}`);
              const emailBody = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Tax Invoice ${docId} attached below.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you,\n${businessName}`);
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
        </div>
      </div>
    </div>
  );

  // Render preview mode
  if (viewMode === 'preview' && previewInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Fixed Header */}
        <SalesInvoicePreviewHeader />

        {/* Preview Content */}
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
      </div>
    );
  }

  // Render CreateSaleForm when creating/editing
  if (viewMode === "create") {
    const isEditing = !!(editingRow?.dbId || editingRow?.id);
    return (
      <QuotationForm
        key={editingRow?.dbId || editingRow?.id || (editingRow ? 'prefilled' : 'new')}
        onSave={handleInvoiceSaved}
        onBack={handleBackToList}
        initialData={editingRow || {}}
        formTitle={isEditing ? "Updated Tax Invoice" : "Create Tax Invoice"}
        formType="sales"
        showTopActions={true}
        showBottomActions={true}
        saveLabel={isEditing ? "Update Change" : "Save"}
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  if (loading) {
    return <MainLoader message="Loading sales invoices..." />;
  }

  // List view
  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout - Right aligned */}
          <div className="md:hidden flex flex-col items-end space-y-3">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateSalesInvoice}
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
              placeholder="INV-0000 or Party Name"
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
                onClick={handleCreateSalesInvoice}
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
              placeholder="INV-0000 or Party Name"
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
                onClick={handleCreateSalesInvoice}
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
          title="No Sales Invoices Found"
          description="You haven't created any sales invoices yet. Start by creating your first invoice to manage your sales and payments."
          buttonText="Create First Sales Invoice"
          onButtonClick={handleCreateSalesInvoice}
          icon={FileText}
        />
      )}

      {viewMode === "list" && rows.length > 0 && (
        <div className="overflow-hidden custombackground">
          <ReusableTable
            columns={[
              {
                key: 'id',
                title: 'Invoice Number',
                sortable: true,
                render: (r) => (
                  <span className="text-sm text-gray-700" translate="no">
                    <span>{r.id}</span>
                  </span>
                )
              },
              { key: "date", title: "Date", sortable: true, render: (r) => <span>{formatDate(r.date)}</span> },
              { key: "po_agreement_number", title: "P.O/Aggr. No", sortable: true, render: (r) => r.po_agreement_number ? <span className="font-semibold text-gray-700" translate="no"><span>{r.po_agreement_number}</span></span> : <span className="text-gray-400"><span>-</span></span> },
              { key: "partyName", title: "Party Name", sortable: true, render: (r) => <span>{r.partyName}</span> },
              { key: "dueDate", title: "Due In", sortable: true, render: (r) => <DuePill date={r.dueDate} />, thClass: 'min-w-[160px]' },
              { key: "amount", title: "Amount", sortable: true, render: (r) => <span translate="no"><span>{formatCurrency(r.amount, currency)}</span></span>, tdClass: 'text-right' },

            ]}
            data={filtered}
            rowKey="id"
            defaultPageSize={10}
            pageSizeOptions={[5, 10, 15, 25]}
            searchable={false}
            onRowClick={handleRowClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
            emptyMessage="No sales invoices match your search criteria."
          />
        </div>
      )}


      {/* Choice Modal for New Invoice */}
      <InvoiceChoiceModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onContinue={handleChoiceContinue}
        currency={currency}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.id || ""}
        itemType="sales invoice"
      />
    </div>
  );
}
