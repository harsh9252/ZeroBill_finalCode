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
import CreditNoteForm from "./CreditNoteForm.jsx";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import MainLoader from "../../../Components/MainLoader.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
const { partyAPI, salesReturnAPI, salesInvoiceAPI, businessAPI, termsConditionsAPI, getApiConfig } = api;
import { mapToCreditNoteData } from "../../../utils/documentMapper";
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";


// Status options removed from UI as requested


function CreditNote({ currency }) {
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState({ label: "Show All", value: "all" });
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  //Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('creditNoteViewMode', mode);
      return mode;
    }
    const savedMode = localStorage.getItem('creditNoteViewMode');
    return savedMode || 'list';
  });

  const [loading, setLoading] = useState(viewMode === 'list');
  const [editingRow, setEditingRow] = useState(null);
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  // Preview page states
  const [previewCreditNote, setPreviewCreditNote] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Format currency display function
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
      // FormatFive: {
      //   component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
      //   label: 'Format-5'
      // },
    };

    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.CREDIT_NOTE} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  const bounds = useMemo(() => getRangeBoundsPure(dateRangeLabel, customRange), [dateRangeLabel, customRange]);

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

  // Update preview data when selected note changes
  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewCreditNote && viewMode === 'preview') {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewCreditNote, viewMode]);

  useEffect(() => {
    const updatePreviewData = async () => {
      if (viewMode === 'preview' && previewCreditNote) {
        try {
          const data = await mapToCreditNoteDataInternal(previewCreditNote);
          setPreviewData(data);
        } catch (error) {
          console.error('Error mapping credit note to preview data:', error);
          showErrorToast('Failed to load preview data');
        }
      }
    };

    updatePreviewData();
  }, [viewMode, previewCreditNote]);

  // Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('creditNoteViewMode', mode);

      if (mode === 'create') {
        setLoading(false);
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingCreditNoteRow');
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
      localStorage.removeItem('creditNoteViewMode');
    }
  }, [searchParams]);

  const handleCreateClick = () => {
    setEditingRow(null);
    setLoading(false);
    navigate('/creditNote?mode=create', { replace: true });
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

  // Function to map credit note row to PDF data
  const mapToCreditNoteDataInternal = async (row) => {
    return await mapToCreditNoteData(row, businessData, partyAPI, currency);
  };

  // Generate PDF function
  const generatePDF = async (creditNoteData) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[selectedFormat].component;
      const fileName = `${creditNoteData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={creditNoteData} />,
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

  const fetchCreditNotes = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const filters = {};
      if (status.value !== 'all') {
        filters.status = status.value;
      }
      const response = await api.creditNoteAPI.getAll(selectedBusinessId, filters);

      if (response.success && Array.isArray(response.data)) {
        const formattedRows = response.data.map(note => ({
          ...note,
          id: note.note_number || note.id,
          dbId: note.id,
          date: note.note_date,
          partyName: note.party_name,
          party_id: note.party_id,
          amount: note.grand_total,
          due_date: note.due_date || note.valid_until || note.expected_delivery_date || note.meta?.dueDate || note.credit_note_data?.dueDate || note.credit_note_data?.due_date,
          notes: note.notes || note.credit_note_data?.notes || note.meta?.notes,
          status: note.status,
        }));

        setRows(formattedRows);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error loading credit notes:', error);
      showErrorToast('Failed to load credit notes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [selectedBusinessId, status, bounds]);

  // Listen for business changes and refetch credit notes
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      fetchCreditNotes();
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, []);


  // Status options removed from UI

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = rows.filter((r) => {
      let dateOk = true;
      const rowDate = r.note_date || r.date;
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

      const matchSearch = !q ||
        (r.party_name && r.party_name.toLowerCase().includes(q)) ||
        (r.note_number && String(r.note_number).toLowerCase().includes(q)) ||
        (r.id && String(r.id).toLowerCase().includes(q));

      return dateOk && matchSearch;
    });

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const A = sort.key === 'note_date' ? new Date(a[sort.key] || a.date) : a[sort.key];
      const B = sort.key === 'note_date' ? new Date(b[sort.key] || b.date) : b[sort.key];

      if (sort.key === 'grand_total') return ((a.grand_total || a.amount) - (b.grand_total || b.amount)) * dir;
      if (sort.key === 'note_date') return (A - B) * dir;

      return String(A).localeCompare(String(B)) * dir;
    });

    return list;
  }, [rows, query, sort, bounds]);

  const onRangeChange = (val) => setDateRangeLabel(val);
  const onRangeApply = (range) => {
    setCustomRange(range);
    setDateRangeLabel('Custom Date Range');
  };

  const handleCreateCreditNote = () => {
    setEditingRow({ type: 'creditNote' });
    setViewMode('create');
  };

  const handleEditClick = (row) => {
    const rawLines = Array.isArray(row.credit_note_data?.lines)
      ? row.credit_note_data.lines
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

    setEditingRow({
      ...row,
      dbId: row.dbId || row.id,
      type: 'creditNote',
      // Ensure all fields are properly mapped for edit
      credit_note_number: row.note_number || row.id,
      note_date: row.date || row.note_date,
      party_name: row.partyName || row.party_name,
      party_id: row.party_id,
      grand_total: row.amount || row.grand_total,
      bank_id: row.bank_id,
      status: row.status,
      notes: row.notes,
      po_agreement_number: row.po_agreement_number || '',
      remark: row.remark || '',
      // Wrap notes in meta object for form compatibility
      meta: {
        notes: row.notes || '',
        lines: normalizedLines,
        total: row.total_amount || 0,
        discount: row.discount_amount || 0,
        tax: row.tax_amount || 0,
        grandTotal: row.grand_total || 0,
        remark: row.remark || '',
        charges: row.credit_note_data?.charges || [],
        discountAfterTaxPct: row.credit_note_data?.discountAfterTaxPct || 0,
        paymentTerms: row.meta?.paymentTerms ?? row.credit_note_data?.paymentTerms ?? 30,
        billing_address: row.credit_note_data?.billing_address,
        city: row.credit_note_data?.city,
        state: row.credit_note_data?.state,
        pincode: row.credit_note_data?.pincode,
        country: row.credit_note_data?.country,
        shipping_address: row.credit_note_data?.shipping_address,
        ship_city: row.credit_note_data?.ship_city,
        ship_state: row.credit_note_data?.ship_state,
        ship_pincode: row.credit_note_data?.ship_pincode,
        ship_country: row.credit_note_data?.ship_country,
        selectedBillingIndex: row.credit_note_data?.selectedBillingIndex,
        selectedShippingIndex: row.credit_note_data?.selectedShippingIndex,
      },
      credit_note_data: row.credit_note_data
    });
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
      showLoadingModal('Deleting credit note...');

      await api.creditNoteAPI.delete(dbId, selectedBusinessId);

      closeModal();
      setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
      showSuccessToast(`${itemToDelete.note_number || itemToDelete.id} deleted successfully`);
      setDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (err) {
      console.error('Error deleting credit note:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete credit note.');
    }
  };

  const handleCreditNoteSaved = async (noteData) => {
    try {
      const creditNotePayload = {
        business_id: selectedBusinessId,
        credit_note_number: noteData.credit_note_number || noteData.id,
        note_date: noteData.note_date || noteData.date || new Date().toISOString().slice(0, 10),
        party_name: noteData.party_name || noteData.partyName || noteData.party || "",
        party_id: noteData.party_id || null,
        bank_id: noteData.bank_id || null,
        status: noteData.status || "open",
        total_amount: Number(noteData.total_amount || noteData.amount || noteData.meta?.total || 0),
        discount_amount: Number(noteData.discount_amount || noteData.meta?.discount || 0),
        tax_amount: Number(noteData.tax_amount || noteData.meta?.tax || 0),
        grand_total: Number(noteData.grand_total || noteData.meta?.grandTotal || 0),
        notes: noteData.notes || noteData.meta?.notes || "",
        remark: noteData.remark || "",
        po_agreement_number: noteData.po_agreement_number || noteData.poAgreementNumber || "",
        credit_note_data: noteData.credit_note_data || {
          lines: noteData.meta?.lines || [],
          charges: noteData.meta?.charges || [],
          notes: noteData.notes || noteData.meta?.notes || '',
          remark: noteData.remark || '',
          bankAccount: noteData.meta?.bankAccount || null,
          bankAccounts: noteData.meta?.bankAccounts || [],
          selectedBankIndex: noteData.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: noteData.meta?.discountAfterTaxPct || 0,
          paymentTerms: noteData.meta?.paymentTerms ?? 30
        },
        terms_sections: noteData.terms_sections || []
      };

      let response;
      const isEdit = !!editingRow?.dbId;
      const dbId = editingRow?.dbId || editingRow?.id;

      if (isEdit) {
        response = await api.creditNoteAPI.update(dbId, creditNotePayload, selectedBusinessId);
        if (response.success) {
          setRows((prev) => prev.map((r) => r.dbId === dbId ? {
            ...response.data,
            id: response.data.note_number,
            dbId: response.data.id,
            date: response.data.note_date,
            partyName: response.data.party_name,
            party_id: response.data.party_id,
            amount: response.data.grand_total,
            status: response.data.status,
          } : r));
        }
      } else {
        response = await api.creditNoteAPI.create(creditNotePayload);
        if (response.success) {
          const newNote = response.data;
          setRows((prev) => [{
            ...newNote,
            id: newNote.note_number,
            dbId: newNote.id,
            date: newNote.note_date,
            partyName: newNote.party_name,
            party_id: newNote.party_id,
            amount: newNote.grand_total,
            status: newNote.status,
          }, ...prev]);
        }
      }

      if (!response.success) {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'credit_note_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to save credit note');
      }

      setEditingRow(null);
      setViewMode('list');
      closeModal();

      showSuccessToast(isEdit ? `Credit Note updated successfully` : `Credit Note ${creditNotePayload.credit_note_number} created successfully`);
    } catch (err) {
      console.error('Error saving credit note:', err);
      closeModal();
      // Re-throw error so form can handle it
      throw err;
    }
  };

  const handleBackToList = () => {
    setEditingRow(null);
    setViewMode('list');
  };

  // Handle letterhead upload
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

  // Fixed Header Component for Credit Note Preview
  const CreditNotePreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setViewMode('list'); setPreviewCreditNote(null); }}
            className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <button
            onClick={() => { setViewMode('list'); setPreviewCreditNote(null); }}
            className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            <span>Credit Note Preview - </span><span translate="no"><span>{previewCreditNote.id || previewCreditNote.note_number}</span></span>
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
    return <MainLoader message="Loading credit notes..." />;
  }

  // Render form when creating/editing
  if (viewMode === 'create') {
    return (
      <CreditNoteForm
        onSave={handleCreditNoteSaved}
        onBack={handleBackToList}
        initialData={editingRow || {}}
        formTitle={editingRow?.dbId ? "Update Credit Note" : "Create Credit Note"}
        showTopActions={true}
        showBottomActions={true}
        saveLabel={editingRow?.dbId ? "Update Changes" : "Save"}
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  // Preview page render
  if (viewMode === 'preview' && previewCreditNote) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex flex-col">
        {/* Fixed Header - Always visible at top */}
        <CreditNotePreviewHeader />
        <div className="flex flex-1 pt-16">
          <TemplateSidebar
            documents={rows}
            selectedDocument={previewCreditNote}
            onSelect={(doc) => {
              setPreviewCreditNote(doc);
            }}
            title="Credit Note"
            documentType="creditNote"
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
      key: 'note_number',
      title: 'Credit Note Number',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-gray-700" translate="no">
          <span>{r.note_number || r.id}</span>
        </span>
      ),
    },
    {
      key: 'note_date',
      title: 'Date',
      sortable: true,
      render: (r) => <span>{formatDate(r.note_date || r.date)}</span>
    },
    {
      key: 'party_name',
      title: 'Party Name',
      sortable: true,
      render: (r) => <span>{r.party_name}</span>
    },
    {
      key: 'grand_total',
      title: 'Amount',
      sortable: true,
      render: (r) => <span translate="no"><span>{formatCurrencyDisplay(r.grand_total || r.amount)}</span></span>,
      tdClass: 'text-right'
    },
  ];

  if (loading) {
    return <MainLoader message="Loading credit notes..." />;
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
                onClick={handleCreateCreditNote}
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
              placeholder="CN-0000 or Party Name"
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
                onClick={handleCreateCreditNote}
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
              placeholder="CN-0000 or Party Name"
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
                onClick={handleCreateCreditNote}
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
          title="No Credit Notes Found"
          description="You haven't created any credit notes yet. Start by creating your first credit note to manage returns and refunds."
          buttonText="Create First Credit Note"
          onButtonClick={handleCreateCreditNote}
          icon={FileText}
        />
      )}

      {/* No Search Results State */}

      {/* ReusableTable */}
      {rows.length > 0 && viewMode === "list" && (
        <div className="">
          <ReusableTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.dbId || r.id}
            initialPageSize={10}
            onRowClick={(row) => {
              setPreviewCreditNote(row);
              setViewMode('preview');
              navigate('/creditNote?mode=preview', { replace: true });
            }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
            emptyMessage="No credit notes match your search criteria."
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
        itemName={itemToDelete?.note_number || itemToDelete?.id || ""}
        itemType="credit note"
      />
    </div>
  );
}

export default CreditNote;
