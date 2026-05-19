import React, { useMemo, useState, useEffect } from 'react';
import { convertFileToImage } from '../../../utils/fileConverter';
import ReactDOM from 'react-dom/client';
import { ChevronDown, FileText, Plus, Edit2, Trash2, ArrowLeft, X, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure, useDateRange } from '../../../Components/Date_wise_Filter_Button.jsx';
import CustomPreviewDropdown from '../../../Components/CustomPreviewDropdown.jsx';
import QuotationForm from '../Quotation/QuotationForm.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import MainLoader from '../../../Components/MainLoader.jsx';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/dateFormat.js';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';

const { deliveryChallanAPI, businessAPI, termsConditionsAPI, getApiConfig, partyAPI } = api;
import { mapToDeliveryChallanData } from "../../../utils/documentMapper";

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



export default function DeliveryChallan({ currency, language = 'en-US' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const { bounds } = useDateRange(dateRangeLabel, customRange);
  const [status, setStatus] = useState(STATUS_OPTS[0]);
  const [rows, setRows] = useState([]);

  //Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('deliveryChallanViewMode', mode);
      return mode;
    }
    const savedMode = localStorage.getItem('deliveryChallanViewMode');
    return savedMode || 'list';
  });

  const [loading, setLoading] = useState(viewMode === 'list');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Preview page states
  const [previewDeliveryChallan, setPreviewDeliveryChallan] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
      // FormatFive: {
      //   component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
      //   label: 'Format-5'
      // },
    };

    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.DELIVERY_CHALLAN} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  const [currentBusinessId, setCurrentBusinessId] = useState(localStorage.getItem("selectedBusinessId"));

  const formattedRangeLabel = () => {
    const { from, to } = customRange;
    if (from && to) return `${from} — ${to}`;
    if (from) return `${from} —`;
    if (to) return `— ${to}`;
    return 'Custom Date Range';
  };

  // Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('deliveryChallanViewMode', mode);

      if (mode === 'create') {
        setLoading(false);
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingDeliveryChallanRow');
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
      localStorage.removeItem('deliveryChallanViewMode');
    }
  }, [searchParams]);

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

  // Fetch preview data when previewDeliveryChallan changes
  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewDeliveryChallan) {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewDeliveryChallan]);

  // Fetch preview data when previewDeliveryChallan changes
  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewDeliveryChallan) {
        try {
          const data = await mapToDeliveryChallanDataInternal(previewDeliveryChallan);
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
  }, [previewDeliveryChallan]);

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

  // Function to map delivery challan row to PDF data
  const mapToDeliveryChallanDataInternal = async (row) => {
    return await mapToDeliveryChallanData(row, businessData, partyAPI, currency);
  };

  // Generate PDF function
  const generatePDF = async (deliveryChallanData) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[selectedFormat].component;
      const fileName = `${deliveryChallanData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={deliveryChallanData} />,
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

  // Listen for business changes and refetch
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {
        setCurrentBusinessId(newBusinessId);

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

        setViewMode('list');
        navigate('/deliveryChallan');

        const fetchNewChallans = async () => {
          try {
            setLoading(true);
            const response = await deliveryChallanAPI.getAll(newBusinessId);
            if (response.success) {
              const transformedData = response.data.map(challan => ({
                id: challan.challan_number,
                dbId: challan.id,
                date: challan.challan_date,
                updatedDate: challan.updated_date,
                partyName: challan.party_name,
                party_id: challan.party_id,
                bank_id: challan.bank_id,
                business_id: challan.business_id,
                amount: parseFloat(challan.grand_total || challan.total_amount || 0),
                status: challan.status,
                po_agreement_number: challan.po_agreement_number || '',
                remark: challan.remark || '',
                due_date: challan.due_date || challan.valid_until || challan.expected_delivery_date || challan.meta?.dueDate || challan.challan_data?.dueDate || challan.challan_data?.due_date,
                notes: challan.notes || challan.challan_data?.notes || challan.meta?.notes,
                meta: challan.challan_data || {}
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
        fetchNewChallans();
      }
    };

    window.addEventListener('storage', handleBusinessChange);
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, [currentBusinessId, viewMode]);

  // Load delivery challans from API
  useEffect(() => {
    const loadChallans = async () => {
      try {
        setLoading(true);
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        const response = await deliveryChallanAPI.getAll(selectedBusinessId);

        if (response.success) {
          const transformedData = response.data.map(challan => ({
            id: challan.challan_number,
            dbId: challan.id,
            date: challan.challan_date,
            updatedDate: challan.updated_date,
            partyName: challan.party_name,
            party_id: challan.party_id,
            bank_id: challan.bank_id,
            business_id: challan.business_id,
            amount: parseFloat(challan.grand_total || challan.total_amount || 0),
            status: challan.status,
            po_agreement_number: challan.po_agreement_number || '',
            remark: challan.remark || '',
            due_date: challan.due_date || challan.valid_until || challan.expected_delivery_date || challan.meta?.dueDate || challan.challan_data?.dueDate || challan.challan_data?.due_date,
            notes: challan.notes || challan.challan_data?.notes || challan.meta?.notes,
            meta: challan.challan_data || {}
          }));
          setRows(transformedData);
        } else {
          throw new Error(response.message || 'API call failed');
        }
      } catch (error) {
        console.error('Error loading delivery challans:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'list') {
      loadChallans();
    }
  }, [viewMode]);


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

  //Navigate to create view
  const handleCreateClick = () => {
    setEditingRow(null);
    setLoading(false);
    navigate('/deliveryChallan?mode=create', { replace: true });
  };

  // Handle save for CREATE
  const handleFormSaveForCreate = async (challanData) => {
    try {
      const challanPayload = {
        challan_number: challanData.challan_number || challanData.id,
        challan_date: challanData.challan_date || challanData.date || new Date().toISOString().slice(0, 10),
        party_name: challanData.party_name || challanData.partyName || challanData.party || '',
        party_id: challanData.party_id || null,
        bank_id: challanData.bank_id || null,
        status: challanData.status || 'open',
        total_amount: Number(challanData.total_amount || challanData.amount || challanData.meta?.total || 0),
        grand_total: Number(challanData.grand_total || challanData.amount || challanData.meta?.total || 0),
        discount_amount: Number(challanData.discount_amount || challanData.meta?.discountAmount || 0),
        tax_amount: Number(challanData.tax_amount || challanData.meta?.tax || 0),
        notes: challanData.notes || '',
        po_agreement_number: challanData.po_agreement_number || '',
        remark: challanData.remark || '',
        challan_data: challanData.challan_data || {
          lines: challanData.meta?.lines || [],
          notes: challanData.notes || '',
          po_agreement_number: challanData.po_agreement_number || '',
          remark: challanData.remark || '',
          paymentTerms: challanData.meta?.paymentTerms ?? 30
        },
        terms_sections: challanData.terms_sections || []
      };

      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await deliveryChallanAPI.create({ ...challanPayload, business_id: businessId });

      if (response.success) {
        showSuccessToast(`Delivery Challan ${challanPayload.challan_number} created successfully`);
        localStorage.removeItem('deliveryChallanViewMode');
        navigate('/deliveryChallan');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'challan_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to create delivery challan');
      }
    } catch (err) {
      console.error('Error creating delivery challan:', err);
      // Re-throw error so form can handle it
      throw err;
    }
  };

  // Navigate to edit view
  const handleEditClick = (row) => {
    const rawLines = Array.isArray(row.meta?.lines) ? row.meta.lines : Array.isArray(row.lines) ? row.lines : [];
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

    const initialData = {
      id: row.dbId || row.id, // Critical: signal Edit Mode to QuotationForm
      challan_number: row.id, // Map id to challan_number for form
      challan_date: row.date, // Map date to challan_date for form
      dbId: row.dbId || row.id,
      date: row.date,
      updatedDate: row.updatedDate,
      partyName: row.partyName,
      party_name: row.partyName, // Include party_name for form
      party_id: row.party_id, // Include party_id
      bank_id: row.bank_id, // Include bank_id
      amount: row.amount,
      grand_total: row.amount, // Include grand_total
      status: row.status,
      po_agreement_number: row.po_agreement_number || '',
      remark: row.remark || '',
      meta: {
        invoiceNo: row.id,
        lines: normalizedLines,
        ...(row.meta || {}),
        remark: row.remark || '',
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
      },
      type: 'deliveryChallan'
    };

    setEditingRow({ sourceRow: row, initialData });
    localStorage.setItem('editingDeliveryChallanRow', JSON.stringify({ sourceRow: row, initialData }));
    navigate(`/deliveryChallan?mode=edit&id=${row.id}`);
  };

  // Handle save for EDIT
  const handleFormSaveForEdit = async (challanData) => {
    try {
      if (!editingRow || !editingRow.sourceRow) {
        await handleFormSaveForCreate(challanData);
        return;
      }

      const challanPayload = {
        challan_number: challanData.challan_number || challanData.id,
        challan_date: challanData.challan_date || challanData.date || editingRow.sourceRow.date,
        party_name: challanData.party_name || challanData.partyName || editingRow.sourceRow.partyName,
        party_id: challanData.party_id || editingRow.sourceRow.party_id || null,
        bank_id: challanData.bank_id || editingRow.sourceRow.bank_id || null,
        status: challanData.status || editingRow.sourceRow.status,
        total_amount: Number(challanData.total_amount || challanData.amount || challanData.meta?.total || editingRow.sourceRow.amount || 0),
        grand_total: Number(challanData.grand_total || challanData.amount || challanData.meta?.total || editingRow.sourceRow.amount || 0),
        notes: challanData.notes || '',
        po_agreement_number: challanData.po_agreement_number || '',
        remark: challanData.remark || '',
        challan_data: challanData.challan_data || {
          lines: challanData.meta?.lines || [],
          notes: challanData.notes || '',
          po_agreement_number: challanData.po_agreement_number || '',
          remark: challanData.remark || '',
          paymentTerms: challanData.meta?.paymentTerms ?? 30
        },
        terms_sections: challanData.terms_sections || []
      };

      const dbId = editingRow.sourceRow.dbId || editingRow.sourceRow.id;
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await deliveryChallanAPI.update(dbId, challanPayload, businessId);

      if (response.success) {
        setEditingRow(null);
        localStorage.removeItem('editingDeliveryChallanRow');
        showSuccessToast(`Delivery Challan updated successfully`);
        localStorage.removeItem('deliveryChallanViewMode');
        navigate('/deliveryChallan');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'challan_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to update delivery challan');
      }
    } catch (err) {
      console.error('Error updating delivery challan:', err);
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
    const businessId = localStorage.getItem('selectedBusinessId');

    try {
      showLoadingModal('Deleting delivery challan...');
      const response = await deliveryChallanAPI.delete(dbId, businessId);

      if (response.success) {
        showSuccessToast(`${itemToDelete.id} deleted successfully`);

        const fetchResponse = await deliveryChallanAPI.getAll(businessId);
        if (fetchResponse.success) {
          const transformedData = fetchResponse.data.map(challan => ({
            id: challan.challan_number,
            dbId: challan.id,
            date: challan.challan_date,
            updatedDate: challan.updated_date,
            partyName: challan.party_name,
            party_id: challan.party_id,
            bank_id: challan.bank_id,
            business_id: challan.business_id,
            amount: parseFloat(challan.grand_total || challan.total_amount || 0),
            status: challan.status,
            po_agreement_number: challan.po_agreement_number || '',
            remark: challan.remark || '',
            meta: challan.challan_data || {}
          }));
          setRows(transformedData);
        }
      } else {
        throw new Error(response.message || 'Failed to delete delivery challan');
      }
      closeModal();
      setDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (err) {
      console.error('Error deleting delivery challan:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete delivery challan.');
    }
  };

  const handleBack = () => {
    setEditingRow(null);
    navigate('/deliveryChallan', { replace: true });
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

  // Fixed Header Component for Delivery Challan Preview
  const DeliveryChallanPreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setViewMode('list'); setPreviewDeliveryChallan(null); }}
            className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <button
            onClick={() => { setViewMode('list'); setPreviewDeliveryChallan(null); }}
            className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            <span>Delivery Challan Preview - </span><span translate="no"><span>{previewDeliveryChallan.id || previewDeliveryChallan.challan_number}</span></span>
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
    return <MainLoader message="Loading delivery challans..." />;
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <QuotationForm
        onSave={editingRow?.sourceRow ? handleFormSaveForEdit : handleFormSaveForCreate}
        onBack={handleBack}
        initialData={editingRow?.initialData || editingRow || {}}
        formTitle={editingRow?.sourceRow ? "Update Delivery Challan" : "Create Delivery Challan"}
        showTopActions={true}
        showBottomActions={true}
        saveLabel={editingRow?.sourceRow ? "Update Delivery Challan" : "Create Delivery Challan"}
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  // Preview page render
  if (viewMode === 'preview' && previewDeliveryChallan) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Fixed Header - Always visible at top */}
        <DeliveryChallanPreviewHeader />

        {/* PDF Preview Content - Full Width Centered with top padding for fixed header */}
        <div className="preview-wrapper pt-16 p-6 bg-white w-full min-h-screen">
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
    );
  }

  const columns = [
    {
      key: 'id',
      title: 'Challan Number',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-gray-700" translate="no"><span>{r.id}</span></span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (r) => <span>{formatDate(r.date)}</span>
    },
    {
      key: 'partyName',
      title: 'Party Name',
      sortable: true,
      render: (r) => <span>{r.partyName}</span>
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (r) => <span translate="no"><span>{formatCurrencyDisplay(r.amount)}</span></span>,
      tdClass: 'text-right'
    },
  ];

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateClick}
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
              placeholder="DC-0000 or Party Name"
              className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
              aria-label="Search"
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
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
            <DashboardBackButton />
            <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="DC-0000 or Party Name"
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
                onClick={handleCreateClick}
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

      {!loading && rows.length === 0 && viewMode === "list" && (
        <GeneralEmptyState
          title="No Delivery Challans Found"
          description="You haven't created any delivery challans yet. Start by creating your first delivery challan."
          buttonText="Create First Delivery Challan"
          onButtonClick={handleCreateClick}
          icon={FileText}
        />
      )}


      {rows.length > 0 && viewMode === "list" && (
        <div className="">
          <ReusableTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id}
            initialPageSize={10}
            onRowClick={(row) => { setPreviewDeliveryChallan(row); setViewMode('preview'); }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
            emptyMessage="No delivery challans match your search criteria."
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
        itemType="delivery challan"
      />
    </div>
  );
}
