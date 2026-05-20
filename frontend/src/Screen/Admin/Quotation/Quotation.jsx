import React, { useMemo, useState, useEffect } from 'react';
import { convertFileToImage } from '../../../utils/fileConverter';
import TemplateSidebar from '../../../Components/TemplateSidebar.jsx';

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
import QuotationForm from './QuotationForm.jsx';
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
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, SuccessMessages, ErrorMessages, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import { mapToQuotationData } from '../../../utils/documentMapper';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import ConvertQuotationModal from '../../../Components/ConvertQuotationModal.jsx';
const { quotationAPI, businessAPI, partyAPI, termsConditionsAPI, getApiConfig } = api;
//  ADD ALL THESE CONSTANTS
const STATUS_OPTS = [
  { label: 'Show All', value: 'all' },
  { label: 'Show Open', value: 'open' },
  { label: 'Show Closed', value: 'closed' },
];


function StatusPill({ status }) {
  const map = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    closed: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <span className={`border px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.open}`}>
      <span><span>{(status || '').charAt(0).toUpperCase() + (status || '').slice(1)}</span></span>
    </span>
  );
}


const DEMO = [];

export default function Quotation({ currency, checkBusiness }) {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      // Save to localStorage as backup
      localStorage.setItem('quotationViewMode', mode);
      return mode;
    }
    // Try to restore from localStorage if URL doesn't have mode
    const savedMode = localStorage.getItem('quotationViewMode');
    return savedMode || 'list';
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(viewMode === 'list');
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState(STATUS_OPTS[0]); // default to 'Show Open Quotation'
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  const [editingRow, setEditingRow] = useState(null);
  const [showFormatOne, setShowFormatOne] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const [showBulkConvertDropdown, setShowBulkConvertDropdown] = useState(false);

  // Letterhead upload state
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [showLetterheadUpload, setShowLetterheadUpload] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  // Text Editor Modal State
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [convertModal, setConvertModal] = useState({
    isOpen: false,
    type: 'proforma',
    quotations: [] // Changed to array
  });

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
      // FormatFive: {
      //   component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
      //   label: 'Format-5'
      // },
    };


    // Add Letterhead format if letterhead is uploaded
    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.QUOTATION} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  //  Memoize initialData at top level to prevent hooks order violation
  const memoizedInitialData = useMemo(() => editingRow?.initialData, [editingRow?.initialData?.dbId]);

  const statusOptions = useMemo(() => {
    return STATUS_OPTS.map((o, i) => ({ id: o.value ?? `s-${i}`, label: o.label, value: o.value }));
  }, []);

  //  Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('quotationViewMode', mode);

      // If entering create mode, reset loading to false immediately
      if (mode === 'create') {
        setLoading(false);
      }

      // If entering edit mode, restore editingRow from localStorage
      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingQuotationRow');
        if (savedEditingRow) {
          try {
            const parsedRow = JSON.parse(savedEditingRow);
            setEditingRow(parsedRow);
            setLoading(false); // Stop loading once data is ready
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
      localStorage.removeItem('quotationViewMode');
      // Loading remains true until list is fetched by the other useEffect
    }
  }, [searchParams]);

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
          const data = await mapToQuotationDataInternal(previewQuotation);
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

  // Track selected business ID for refetching
  const [currentBusinessId, setCurrentBusinessId] = useState(localStorage.getItem("selectedBusinessId"));

  // Listen for business changes and refetch quotations
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {
        setCurrentBusinessId(newBusinessId);

        // Load new business data
        const loadNewBusinessData = async () => {
          try {
            const response = await businessAPI.getById(newBusinessId);
            if (response.success) {
              setBusinessData(response.data);
            }
          } catch (error) {
            console.error('Error loading new business data:', error);
          }
        };
        loadNewBusinessData();

        // Redirect to list view and refetch quotations for the new business
        setViewMode('list');
        setPreviewQuotation(null);
        navigate('/quotation');

        const fetchNewQuotations = async () => {
          try {
            setLoading(true);
            const response = await quotationAPI.getAll(newBusinessId);
            if (response.success) {
              const transformedData = response.data.map(quotation => ({
                id: quotation.quotation_number,
                dbId: quotation.id,
                date: quotation.quotation_date,
                updatedDate: quotation.updated_date,
                partyName: quotation.party_name,
                party_id: quotation.party_id,
                bank_id: quotation.bank_id,
                terms_id: quotation.terms_id,
                business_id: quotation.business_id,
                amount: parseFloat(quotation.grand_total || quotation.total_amount || 0),
                status: quotation.status,
                meta: quotation.quotation_data || {}
              }));
              setRows(transformedData);
            } else {
              setRows([]);
            }
          } catch (error) {
            setRows([]);
          } finally {
            setLoading(false);
          }
        };
        fetchNewQuotations();
      }
    };

    // Listen for storage changes (when business is changed in another tab/window)
    window.addEventListener('storage', handleBusinessChange);

    // Also listen for a custom event that can be dispatched when business changes
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, [currentBusinessId, viewMode]);

  // Load quotations from API
  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);

        // Get selected business ID from localStorage
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');

        const response = await quotationAPI.getAll(selectedBusinessId);

        if (response.success) {
          // Transform API data to match frontend format
          const transformedData = response.data.map(quotation => {
            const transformed = {
              id: quotation.quotation_number,
              dbId: quotation.id, // Store database ID separately
              date: quotation.quotation_date,
              updatedDate: quotation.updated_date,
              partyName: quotation.party_name,
              party_id: quotation.party_id, // Include party_id for fetching details
              bank_id: quotation.bank_id, // Include bank_id for fetching details
              terms_id: quotation.terms_id, // Include terms_id for fetching terms
              business_id: quotation.business_id, // Include business_id
              amount: parseFloat(quotation.grand_total || quotation.total_amount || 0),
              status: quotation.status,
              remark: quotation.remark || '',
              po_agreement_number: quotation.po_agreement_number || '',
              due_date: quotation.due_date || quotation.valid_until || quotation.expiry_date || quotation.expected_delivery_date || quotation.meta?.dueDate || quotation.quotation_data?.dueDate || quotation.quotation_data?.due_date,
              notes: quotation.notes || quotation.quotation_data?.notes || quotation.meta?.notes,
              meta: quotation.quotation_data || {}
            };
            return transformed;
          });

          setRows(transformedData);
        } else {
          throw new Error(response.message || 'API call failed');
        }
      } catch (error) {
        console.error('Error loading quotations:', error);
        /* Silencing red error toast as per user request */
        /*
        showErrorToast('Failed to load quotations: ' + error.message);
        */

        // Show empty state instead of demo data
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'list' || viewMode === 'preview') {
      loadQuotations();
    }
  }, [viewMode]);



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
      const matchStatus = status.value === 'all' ? true : r.status === status.value;
      const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
      const id = r.id ? String(r.id).toLowerCase() : '';
      const matchSearch = !q || partyName.includes(q) || id.includes(q);
      return dateOk && matchStatus && matchSearch;
    });

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const A = sort.key === 'date' || sort.key === 'dueDate' ? new Date(a[sort.key]) : a[sort.key];
      const B = sort.key === 'date' || sort.key === 'dueDate' ? new Date(b[sort.key]) : b[sort.key];

      if (sort.key === 'amount') return (A - B) * dir;
      if (sort.key === 'date' || sort.key === 'dueDate') return (A - B) * dir;

      return String(A).localeCompare(String(B)) * dir;
    });

    return list;
  }, [rows, dateRangeLabel, customRange, query, status, sort]);


  // Navigate to create view
  const handleCreateClick = () => {
    checkBusiness(() => {
      setEditingRow(null);
      setLoading(false); // Ensure loader is hidden
      navigate('/quotation?mode=create', { replace: true });
    });
  };

  // Handle save for CREATE with SweetAlert (loading + toast)
  const handleFormSaveForCreate = async (invoice) => {
    try {


      // Prepare data for API - number is already in invoice.quotation_number
      const quotationData = {
        quotation_number: invoice.quotation_number || invoice.id,
        quotation_date: invoice.quotation_date || invoice.date || new Date().toISOString().slice(0, 10),
        party_name: invoice.party_name || invoice.partyName || invoice.party || '',
        party_id: invoice.party_id || null,
        ship_to_party_id: invoice.ship_to_party_id || null,
        bank_id: invoice.bank_id || null,
        status: invoice.status || 'open',
        total_amount: Number(invoice.total_amount || invoice.amount || invoice.meta?.total || 0),
        grand_total: Number(invoice.grand_total || invoice.amount || invoice.meta?.total || 0),
        discount_amount: Number(invoice.discount_amount || invoice.meta?.discountAmount || 0),
        tax_amount: Number(invoice.tax_amount || invoice.meta?.tax || 0),
        notes: invoice.notes || '',
        remark: invoice.remark || '',
        po_agreement_number: invoice.poAgreementNumber || '',
        valid_until: invoice.valid_until || invoice.dueDate || '',
        terms_sections: invoice.terms_sections || [], // Include terms sections
        quotation_data: invoice.quotation_data || {
          lines: invoice.meta?.lines || [],
          notes: invoice.notes || '',
          remark: invoice.remark || '',
          valid_until: invoice.valid_until || invoice.dueDate || '',
          paymentTerms: invoice.meta?.paymentTerms ?? 30
        }
      };



      // Call API to create quotation
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await quotationAPI.create({ ...quotationData, business_id: businessId });

      if (response.success) {
        showSuccessToast(`Quotation ${quotationData.quotation_number} created successfully`);
        localStorage.removeItem('quotationViewMode');
        // Navigate to list view - useEffect will fetch the updated data
        navigate('/quotation');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {

          // Create error with special marker in message
          const error = new Error(`DUPLICATE_NUMBER:${response.message}`);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'quotation_number';

          throw error;
        }
        throw new Error(response.message || 'Failed to create quotation');
      }
    } catch (err) {
      console.error('Error creating quotation:', err);

      // Re-throw error so form can handle it
      throw err;
    }
  };

  // Navigate to edit view
  const handleEditClick = (row) => {


    // Parse quotation_data if it's a string
    let quotationData = row.meta;
    if (typeof row.meta === 'string') {
      try {
        quotationData = JSON.parse(row.meta);
      } catch (e) {
        console.error('Error parsing quotation_data:', e);
        quotationData = {};
      }
    }

    const rawLines = Array.isArray(quotationData?.lines)
      ? quotationData.lines
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
      stockQuantity: ln.stockQuantity || ln.stock_quantity || 0,
      discountPct: ln.discountPct || ln.discount_pct || 0,
      image_url: ln.image_url || ''
    }));

    const initialData = {
      id: row.dbId || row.id, // Use database ID
      dbId: row.dbId || row.id, // Include database ID for fetching terms
      quotation_number: row.id, // Display quotation number
      quotation_date: row.date,
      date: row.date,
      updatedDate: row.updatedDate,
      partyName: row.partyName,
      party_name: row.partyName,
      party_id: row.party_id,
      bank_id: row.bank_id,
      terms_id: row.terms_id,
      business_id: row.business_id,
      amount: row.amount,
      grand_total: row.amount,
      total_amount: row.amount,
      status: row.status,
      remark: row.remark || '',
      po_agreement_number: row.po_agreement_number || '',
      notes: quotationData?.notes || '',
      terms: quotationData?.terms || '',
      termsHeading: quotationData?.termsHeading || 'Terms & Conditions',
      valid_until: quotationData?.valid_until || '',
      type: 'quotation', // Explicitly set type
      meta: {
        invoiceNo: row.id,
        lines: normalizedLines,
        notes: quotationData?.notes || '',
        terms: quotationData?.terms || '',
        termsHeading: quotationData?.termsHeading || 'Terms & Conditions',
        valid_until: quotationData?.valid_until || '',
        bank_id: row.bank_id,
        selectedBankIndex: quotationData?.selectedBankIndex,
        charges: quotationData?.charges || [],
        discountAfterTaxPct: quotationData?.discountAfterTaxPct || 0,
        remark: row.remark || '',
        paymentTerms: quotationData?.paymentTerms ?? 30,
        // Address Overrides
        billing_address: quotationData?.billing_address || '',
        city: quotationData?.city || '',
        state: quotationData?.state || '',
        pincode: quotationData?.pincode || '',
        country: quotationData?.country || '',
        shipping_address: quotationData?.shipping_address || '',
        ship_city: quotationData?.ship_city || '',
        ship_state: quotationData?.ship_state || '',
        ship_pincode: quotationData?.ship_pincode || '',
        ship_country: quotationData?.ship_country || '',
        selectedBillingIndex: quotationData?.selectedBillingIndex,
        selectedShippingIndex: quotationData?.selectedShippingIndex,
        ship_to_party_id: quotationData?.ship_to_party_id || row.ship_to_party_id || '',
      }
    };



    setEditingRow({ sourceRow: row, initialData });

    // Save to localStorage for refresh persistence
    localStorage.setItem('editingQuotationRow', JSON.stringify({ sourceRow: row, initialData }));

    navigate(`/quotation?mode=edit&id=${row.dbId || row.id}`);
  };

  //  Handle save for EDIT with SweetAlert (loading + toast)
  const handleFormSaveForEdit = async (invoice) => {
    try {
      // If no editingRow, fall back to create flow
      if (!editingRow || !editingRow.sourceRow) {
        await handleFormSaveForCreate(invoice);
        return;
      }

      const targetId = editingRow.sourceRow.id;

      // Prepare data for API - use the data directly from the form
      const quotationData = {
        quotation_number: invoice.quotation_number || invoice.id, // Use updated number from form
        quotation_date: invoice.quotation_date || invoice.date || editingRow.sourceRow.date,
        party_name: invoice.party_name || invoice.partyName || editingRow.sourceRow.partyName,
        party_id: invoice.party_id || editingRow.sourceRow.party_id || null,
        ship_to_party_id: invoice.ship_to_party_id || null,
        bank_id: invoice.bank_id || editingRow.sourceRow.bank_id || null,
        status: invoice.status || editingRow.sourceRow.status,
        total_amount: Number(invoice.total_amount || invoice.amount || invoice.meta?.total || editingRow.sourceRow.amount || 0),
        grand_total: Number(invoice.grand_total || invoice.amount || invoice.meta?.total || editingRow.sourceRow.amount || 0),
        notes: invoice.notes || '',
        remark: invoice.remark || '',
        po_agreement_number: invoice.poAgreementNumber || '',
        valid_until: invoice.valid_until || invoice.dueDate || '',
        terms_sections: invoice.terms_sections || [], // Include terms sections
        quotation_data: invoice.quotation_data || {
          lines: invoice.meta?.lines || [],
          charges: invoice.meta?.charges || [],
          notes: invoice.notes || '',
          remark: invoice.remark || '',
          valid_until: invoice.valid_until || invoice.dueDate || '',
          bankAccount: invoice.meta?.bankAccount || null,
          bankAccounts: invoice.meta?.bankAccounts || [],
          selectedBankIndex: invoice.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: invoice.meta?.discountAfterTaxPct || 0,
          paymentTerms: invoice.meta?.paymentTerms ?? 30
        }
      };



      // Call API to update quotation - use database ID, not quotation number
      const dbId = editingRow.sourceRow.dbId || editingRow.sourceRow.id;
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await quotationAPI.update(dbId, quotationData, businessId);

      if (response.success) {
        setEditingRow(null);
        localStorage.removeItem('editingQuotationRow');

        showSuccessToast(`Quotation updated successfully`);
        localStorage.removeItem('quotationViewMode');
        // Navigate to list view - useEffect will fetch the updated data
        navigate('/quotation');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER' || response.status === 409) {
          // Create error with special marker in message
          const error = new Error(`DUPLICATE_NUMBER:${response.message || 'Quotation number already exists'}`);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'quotation_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to update quotation');
      }
    } catch (err) {
      console.error('Error updating quotation:', err);
      // Re-throw error so form can handle it
      throw err;
    }
  };

  // Delete confirmation using premium delete modal
  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      showLoadingModal("Deleting permanently...");

      const dbId = itemToDelete.dbId || itemToDelete.id;
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await quotationAPI.delete(dbId, businessId);

      closeModal();
      if (response.success) {
        showSuccessToast(`${itemToDelete.id} deleted successfully`);

        // Refetch quotations to update the list
        const fetchResponse = await quotationAPI.getAll(businessId);
        if (fetchResponse.success) {
          const transformedData = fetchResponse.data.map(quotation => ({
            id: quotation.quotation_number,
            dbId: quotation.id,
            date: quotation.quotation_date,
            updatedDate: quotation.updated_date,
            partyName: quotation.party_name,
            party_id: quotation.party_id,
            bank_id: quotation.bank_id,
            terms_id: quotation.terms_id,
            business_id: quotation.business_id,
            amount: parseFloat(quotation.grand_total || quotation.total_amount || 0),
            status: quotation.status,
            meta: quotation.quotation_data || {}
          }));
          setRows(transformedData);
        }
        setDeleteModalOpen(false);
        setItemToDelete(null);
      } else {
        throw new Error(response.message || 'Failed to delete quotation');
      }

    } catch (err) {
      closeModal();
      console.error('Error deleting quotation:', err);
      showErrorToast(err?.message || 'Could not delete quotation.');
    }
  };

  //  Handle Conversion to Sales or Proforma
  const handleConvertQuotation = async (type) => {
    if (!previewQuotation) return;

    const typeLabel = type === 'sales' ? 'Sales Invoice' : 'Proforma Invoice';

    try {
      // Show confirmation dialog first (as requested)
      const result = await Swal.fire({
        title: '',
        html: `
          <div class="flex flex-col items-center text-center py-4 px-4 sm:px-6">
            <!-- Animated Icon with Pulse Effect -->
            <div class="relative mb-3">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-xl border-2 border-blue-300 animate-pulse">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div class="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            </div>

            <!-- Title with Better Typography -->
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Convert Quotation
            </h2>
            
            <!-- Description with Proper Grammar -->
            <p class="text-gray-600 text-sm sm:text-base mb-3 leading-relaxed max-w-md px-2">
              You are about to convert quotation <strong class="text-blue-600 font-semibold">${previewQuotation.id}</strong> to a ${typeLabel.toLowerCase()}.
            </p>

            <!-- Info Box with Better Alignment -->
            <div class="w-full max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-l-4 border-blue-500 shadow-sm">
              <div class="flex items-start gap-3">
                <svg class="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-left flex-1">
                  <p class="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                    A new invoice will be created and this quotation will be marked as converted.
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
        setConvertModal({
          isOpen: true,
          type,
          quotations: [previewQuotation]
        });
      }
    } catch (err) {
      console.error(`Error initiating conversion:`, err);
    }
  };

  const executeConversion = async (type, conversionData) => {
    // conversionData is [{ id, items }, ...]
    const typeLabel = type === 'sales' ? 'Sales Invoice' : 'Proforma Invoice';
    const businessId = localStorage.getItem('selectedBusinessId');

    try {
      showLoadingModal(`Converting documents...`);

      let successCount = 0;
      let failCount = 0;

      for (const entry of conversionData) {
        const { id, items } = entry;
        try {
          const response = await quotationAPI.convert(id, { type, items });
          if (response.success) successCount++;
          else failCount++;
        } catch (err) {
          console.error(`Error converting ${id}:`, err);
          failCount++;
        }
      }

      // Refresh list
      const refreshResponse = await quotationAPI.getAll(businessId);
      if (refreshResponse.success) {
        setRows(refreshResponse.data.map(q => ({
          id: q.quotation_number,
          dbId: q.id,
          date: q.quotation_date,
          updatedDate: q.updated_at,
          partyName: q.party_name,
          amount: parseFloat(q.grand_total || q.total_amount || 0),
          status: q.status,
          meta: q.quotation_data || {},
          party_id: q.party_id,
          bank_id: q.bank_id,
          terms_id: q.terms_id,
          business_id: q.business_id,
          remark: q.remark || '',
          po_agreement_number: q.po_agreement_number || '',
        })));
      }

      // Update preview if active
      if (previewQuotation) {
        const activeDbId = previewQuotation.dbId || previewQuotation.id;
        const wasConverted = conversionData.find(d => d.id === activeDbId);
        if (wasConverted) {
          const updatedQuotationResponse = await quotationAPI.getById(activeDbId, businessId);
          if (updatedQuotationResponse.success) {
            const q = updatedQuotationResponse.data;
            setPreviewQuotation({
              id: q.quotation_number,
              dbId: q.id,
              date: q.quotation_date,
              updatedDate: q.updated_at,
              partyName: q.party_name,
              amount: parseFloat(q.grand_total || q.total_amount || 0),
              status: q.status,
              meta: q.quotation_data || {},
              party_id: q.party_id,
              bank_id: q.bank_id,
              terms_id: q.terms_id,
              business_id: q.business_id,
              remark: q.remark || '',
              po_agreement_number: q.po_agreement_number || '',
            });
          }
        }
      }

      closeModal();

      if (failCount === 0) {
        showSuccessToast(`Successfully converted ${successCount} documents`);
      } else {
        showErrorToast(`Converted ${successCount} documents. Failed: ${failCount}`);
      }
    } catch (err) {
      console.error(`Error in executeConversion:`, err);
      closeModal();
      showErrorToast(err?.message || `Could not complete conversion.`);
    } finally {
      setConvertModal({ isOpen: false, type: 'proforma', quotations: [] });
    }
  };

  //  Handle Bulk Conversion
  const handleBulkConvert = async (type) => {
    if (selectedRows.size === 0) return;

    const ids = Array.from(selectedRows);
    // Get the actual database IDs from the rows
    const rowsToConvert = rows.filter(r => selectedRows.has(r.id));
    const dbIds = rowsToConvert.map(r => r.dbId || r.id);
    const typeLabel = type === 'sales' ? 'Sales Invoices' : 'Proforma Invoices';
    const businessId = localStorage.getItem('selectedBusinessId');

    try {
      // Custom confirmation dialog with improved design - Reduced Height
      const result = await Swal.fire({
        title: '',
        html: `
          <div class="flex flex-col items-center text-center py-4 px-4 sm:px-6">
            <!-- Animated Icon with Pulse Effect -->
            <div class="relative mb-3">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-xl border-2 border-blue-300 animate-pulse">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div class="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            </div>

            <!-- Title with Better Typography -->
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Convert ${ids.length > 1 ? 'Quotations' : 'Quotation'}
            </h2>
            
            <!-- Description with Proper Grammar -->
            <p class="text-gray-600 text-sm sm:text-base mb-3 leading-relaxed max-w-md px-2">
              ${ids.length > 1
            ? `You are about to convert <strong class="text-blue-600 font-semibold">${ids.length} quotations</strong> to ${typeLabel.toLowerCase()}.`
            : `You are about to convert <strong class="text-blue-600 font-semibold">1 quotation</strong> to a ${typeLabel.toLowerCase().replace('invoices', 'invoice')}.`
          }
            </p>

            <!-- Info Box with Better Alignment -->
            <div class="w-full max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-l-4 border-blue-500 shadow-sm">
              <div class="flex items-start gap-3">
                <svg class="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-left flex-1">
                  <p class="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                    ${ids.length > 1 ? 'New invoices will be created' : 'A new invoice will be created'} and ${ids.length > 1 ? 'these quotations' : 'this quotation'} will be marked as converted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: ids.length > 1 ? 'Convert All' : 'Convert',
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
        setConvertModal({
          isOpen: true,
          type,
          quotations: rowsToConvert
        });
        setSelectedRows(new Set());
      }
    } catch (err) {
      console.error('Bulk conversion error:', err);
      showErrorToast('An error occurred during bulk conversion.');
    }
  };


  //  Handle back navigation
  const handleBackToList = () => {
    setEditingRow(null);
    localStorage.removeItem('editingQuotationRow');
    localStorage.removeItem('quotationViewMode');
    navigate('/quotation');
  };

  // Function to generate and download PDF via Frontend (High Fidelity)
  const handleDownloadPDF = async (q = selectedQuotation || previewQuotation) => {
    if (!q) {
      showErrorToast('No quotation selected');
      return;
    }

    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);

    try {
      showLoadingModal('Generating PDF...');

      const quotationData = await mapToQuotationDataInternal(q);
      const SelectedFormat = pdfFormats[selectedFormat || 'FormatOne'].component;
      const fileName = `${quotationData.customer.name.replace(/[^a-z0-9]/gi, '_')}-Quotation-${quotationData.quotation.number}.pdf`;

      // Legacy: Handle HTML-to-Canvas PDF
      await generateUniversalPDF({
        component: <SelectedFormat data={quotationData} />,
        filename: fileName,
        onStart: () => showLoadingModal('Generating PDF...'),
        onSuccess: () => {
          closeModal();
          showSuccessToast('PDF Downloaded successfully');
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
      console.error('Error downloading PDF:', error);
      closeModal();
      showErrorToast('Failed to download PDF');
      setIsGeneratingPDF(false);
    }
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

  // Function to map quotation row to FormatOne data
  const mapToQuotationDataInternal = async (row) => {
    return await mapToQuotationData(row, businessData, partyAPI, currency);
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
        itemType="quotation"
      />

      <ConvertQuotationModal
        isOpen={convertModal.isOpen}
        onClose={() => setConvertModal({ ...convertModal, isOpen: false, quotations: [] })}
        onConvert={executeConversion}
        quotations={convertModal.quotations}
        type={convertModal.type}
      />
    </>
  );

  if (loading) {
    return <MainLoader message="Loading quotations..." />;
  }

  if (viewMode === 'create') {
    return (
      <>
        <QuotationForm
          onSave={handleFormSaveForCreate}
          onBack={handleBackToList}
          initialData={{}}
          formTitle="Create Quotation"
          formType="quotation"
          showTopActions
          showBottomActions
          saveLabel="Save"
          cancelLabel="Cancel"
          currency={currency}
        />
        {modals}
      </>
    );
  }

  if (viewMode === 'edit' && editingRow?.initialData) {
    return (
      <>
        <QuotationForm
          key={editingRow.initialData.dbId} // Add key to force remount on different quotation
          onSave={handleFormSaveForEdit}
          onBack={handleBackToList}
          initialData={memoizedInitialData}
          formTitle="Update Quotation"
          formType="quotation"
          showTopActions
          showBottomActions
          saveLabel="Update Changes"
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

  // Fixed Header Component for Quotation Preview
  const QuotationPreviewHeader = () => (
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
            Quotation Preview - {previewQuotation.id}
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
            onClick={() => handleDownloadPDF()}
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
              const formatKey = selectedFormat || 'FormatOne';
              const shareUrl = `${window.location.origin}/#/public/download/quotation/${dbId}?format=${formatKey}`;

              const businessName = businessData?.name || 'our company';
              const partyName = previewQuotation?.partyName || 'Customer';
              const docId = previewQuotation?.id || '';
              const amount = previewQuotation?.amount || '0';
              const date = previewQuotation?.date ? new Date(previewQuotation.date).toLocaleDateString() : '';

              const msg = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Quotation ${docId} from ${businessName}.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you!`);
              const emailSubject = encodeURIComponent(`Quotation ${docId} from ${businessName}`);
              const emailBody = encodeURIComponent(`Hi ${partyName},\n\nPlease find your Quotation ${docId} attached below.\n\nTotal Amount: ₹${amount}\nDate: ${date}\n\nView/Download here:\n${shareUrl}\n\nThank you,\n${businessName}`);
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
                    handleConvertQuotation('sales');
                    setShowConvertDropdown(false);
                  }}
                  className="w-full px-2 py-1.5 text-left hover:bg-green-100 transition-all border-b border-gray-200"
                  style={{ boxShadow: 'none' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Tax Invoice</div>
                    <div className="text-xs text-gray-500">Convert to sales invoice</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleConvertQuotation('proforma');
                    setShowConvertDropdown(false);
                  }}
                  className="w-full px-2 py-1.5 text-left hover:bg-green-100 transition-all"
                  style={{ boxShadow: 'none' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Proforma Invoice</div>
                    <div className="text-xs text-gray-500">Convert to proforma invoice</div>
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
      <div className="min-h-screen bg-gray-50 w-full relative flex flex-col">
        <QuotationPreviewHeader />
        <div className="flex flex-1 pt-16">
          <TemplateSidebar
            documents={rows}
            selectedDocument={previewQuotation}
            onSelect={(doc) => {
              setPreviewQuotation(doc);
            }}
            title="Quotation"
            documentType="quotation"
            currency={currency}
          />
          <div className="flex-1 overflow-y-auto pt-4 pb-12 p-6 bg-white min-h-[calc(100vh-4rem)]">
            <div className="max-w-7xl mx-auto">
              {previewData ? (() => {
                const formatObj = pdfFormats[selectedFormat] || pdfFormats['FormatOne'] || Object.values(pdfFormats)[0];
                const SelectedFormat = formatObj.component;
                return <SelectedFormat data={previewData} />;
              })() : (
                <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Preparing document preview...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {modals}
      </div>
    );
  }

  const columns = [
    {
      key: 'id',
      title: 'Quotation Number',
      sortable: true,
      render: (r) => (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedRows.has(r.id)}
            onChange={(e) => {
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
            onClick={(e) => e.stopPropagation()}
            className="mr-3 rounded text-green-600 w-5 h-5 cursor-pointer"
          />
          <span className="text-sm text-gray-700" translate="no">
            <span>{r.id}</span>
          </span>
        </div>
      ),
    },

    {
      key: 'date',
      title: <span>Date</span>,
      sortable: true,
      render: (r) => <span>{formatDate(r.date)}</span>
    },

    {
      key: 'partyName',
      title: <span>Party Name</span>,
      sortable: true,
      render: (r) => <span>{r.partyName}</span>
    },
    {
      key: 'updatedDate',
      title: <span>Updated Date</span>,
      sortable: true,
      render: (r) => <span>{formatDate(r.updatedDate)}</span>
    },
    {
      key: 'amount',
      title: <span>Amount</span>,
      sortable: true,
      render: (r) => <span translate="no"><span>{formatCurrencyDisplay(r.amount)}</span></span>,
      tdClass: 'text-right'
    },
    {
      key: 'status',
      title: <span>Status</span>,
      sortable: false,
      render: (r) => <StatusPill status={r.status} />
    },
  ];

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout - Right aligned */}
          <div className="md:hidden flex flex-col items-end space-y-3">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
                <span>New</span>
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Q-0000 or Party Name"
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
                onChange={(opt) => {
                  const found = STATUS_OPTS.find((s) => s.label === opt.label) || STATUS_OPTS[0];
                  setStatus(found);
                }}
                placeholder="Status"
                className="w-32"
              />

              <button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
              </button>
            </div>

            {selectedRows.size > 0 && (
              <div className="flex flex-wrap gap-2 justify-end w-full">
                <button
                  onClick={() => handleBulkConvert('sales')}
                  className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:shadow-lg text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <FileCheck size={16} strokeWidth={2.5} />
                  <span>Convert to Sales</span> <span key={selectedRows.size} translate="no" className="notranslate ml-1">({selectedRows.size})</span>
                </button>
                <button
                  onClick={() => handleBulkConvert('proforma')}
                  className="bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:shadow-lg text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <FileText size={16} strokeWidth={2.5} />
                  <span>Convert to Proforma</span> <span key={selectedRows.size} translate="no" className="notranslate ml-1">({selectedRows.size})</span>
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
                placeholder="Search by Name"
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
                  onChange={(opt) => {
                    const found = STATUS_OPTS.find((s) => s.label === opt.label) || STATUS_OPTS[0];
                    setStatus(found);
                  }}
                  placeholder="Status"
                  className="w-32"
                />

                <button
                  onClick={handleCreateClick}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                  aria-label="Create new"
                >
                  <Plus size={18} />
                  <span>New</span>
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
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            handleBulkConvert('sales');
                            setShowBulkConvertDropdown(false);
                          }}
                          className="w-full px-2 py-1.5 text-left hover:bg-green-100 transition-all border-b border-gray-200"
                          style={{ boxShadow: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900"><span>Sales Invoice</span></div>
                            <div className="text-xs text-gray-500"><span>Convert to sales invoice</span></div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            handleBulkConvert('proforma');
                            setShowBulkConvertDropdown(false);
                          }}
                          className="w-full px-2 py-1.5 text-left hover:bg-green-100 transition-all"
                          style={{ boxShadow: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900"><span>Proforma Invoice</span></div>
                            <div className="text-xs text-gray-500"><span>Convert to proforma invoice</span></div>
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
          title="No Quotations Found"
          description="You haven't created any quotations yet. Start by creating your first quotation to share with your customers."
          buttonText="Create First Quotation"
          onButtonClick={handleCreateClick}
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
            onRowClick={(row) => { setPreviewQuotation(row); setViewMode('preview'); }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
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
              <h2 className="font-semibold text-lg">Quotation Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedQuotation)}
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
              {/* Use previewData if available and matches the selected quotation, otherwise use mapToQuotationData correctly provided we handle it */}
              {previewData && (previewQuotation?.id === selectedQuotation?.id) ? (
                (() => {
                  const SelectedFormatComp = pdfFormats[selectedFormat || 'FormatOne'].component;
                  return <SelectedFormatComp data={previewData} />;
                })()
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 italic">Please view this quotation from the list for a full preview.</div>
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
