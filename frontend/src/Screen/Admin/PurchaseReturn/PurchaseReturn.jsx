import React, { useMemo, useState, useEffect } from "react";
import { convertFileToImage } from '../../../utils/fileConverter';
import ReactDOM from 'react-dom/client';
import { Plus, FileText, ArrowLeft, Download } from "lucide-react";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatDate } from "../../../utils/dateFormat.js";

import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import ReusableTable from "../../../Components/ReusableTable.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { formatCurrency } from "../../../utils/currency";
import QuotationForm from "../Quotation/QuotationForm.jsx";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import MainLoader from "../../../Components/MainLoader.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';


const STATUS_OPTS = [
  { label: "Show All", value: "all" },
  { label: "Show Open", value: "open" },
  { label: "Show Closed", value: "closed" },
];


function PurchaseReturn({ currency }) {
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState(STATUS_OPTS[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [editingRow, setEditingRow] = useState(null);
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Preview page states
  const [previewPurchaseReturn, setPreviewPurchaseReturn] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);

  // Format currency display function
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.PURCHASE_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.PURCHASE_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.PURCHASE_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.PURCHASE_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
    };

    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber="letterhead" documentType={DOCUMENT_TYPES.PURCHASE_RETURN} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);


  const fetchReturns = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    try {
      const filters = {};
      if (status.value !== 'all') {
        filters.status = status.value;
      }
      if (bounds && (bounds.start || bounds.end)) {
        if (bounds.start) filters.from_date = bounds.start;
        if (bounds.end) filters.to_date = bounds.end;
      }

      const response = await api.purchaseReturnAPI.getAll(selectedBusinessId, filters);

      if (response.success && Array.isArray(response.data)) {
        const formattedRows = response.data.map(ret => ({
          id: ret.purchase_return_number,
          purchase_return_number: ret.purchase_return_number,
          dbId: ret.id,
          date: ret.return_date,
          partyName: ret.party_name,
          party_id: ret.party_id,
          amount: ret.grand_total,
          status: ret.status,
          ...ret
        }));
        setRows(formattedRows);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error loading purchase returns:', error);
      showErrorToast('Failed to load purchase returns');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [selectedBusinessId, status, dateRangeLabel, customRange]);

  // Load business data
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        if (selectedBusinessId) {
          const response = await api.businessAPI.getById(selectedBusinessId);
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

  // Fetch preview data when previewPurchaseReturn changes
  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewPurchaseReturn) {
        try {
          const data = await mapToPurchaseReturnData(previewPurchaseReturn);
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
  }, [previewPurchaseReturn]);

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
    if (crores > 0) result += convertLessThanThousand(crores) + ' Crore ';
    if (lakhs > 0) result += convertLessThanThousand(lakhs) + ' Lakh ';
    if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
    if (hundreds > 0) result += convertLessThanThousand(hundreds) + ' Hundred ';
    if (remainder > 0) result += convertLessThanThousand(remainder);
    return result.trim() + ' Only';
  };

  // Function to map purchase return row to PDF data
  const mapToPurchaseReturnData = async (row) => {
    const lines = row.meta?.lines || row.purchase_return_data?.lines || [];
    const totalQty = lines.reduce((sum, l) => sum + (l.qty || 0), 0);
    const taxableAmount = lines.reduce((sum, l) => sum + ((l.qty || 0) * (l.price || 0)), 0);
    const totalTax = lines.reduce((sum, l) => sum + (l.tax || 0), 0);
    const chargesTotal = (row.meta?.charges || row.purchase_return_data?.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const discountAfterTaxValue = (taxableAmount + totalTax + chargesTotal) * (Number(row.meta?.discountAfterTaxPct || row.purchase_return_data?.discountAfterTaxPct || 0) / 100);
    const grandTotal = taxableAmount + totalTax + chargesTotal - discountAfterTaxValue;

    const addressLines = businessData?.address ? businessData.address.split('\n').filter(line => line.trim()) : [];
    const logoUrl = businessData?.logo_url ? `${api.getApiConfig().backendURL}${businessData.logo_url}` : null;
    const signatureUrl = businessData?.signature_url ? `${api.getApiConfig().backendURL}${businessData.signature_url}` : null;
    const stampUrl = businessData?.stamp_url ? `${api.getApiConfig().backendURL}${businessData.stamp_url}` : null;

    let partyDetails = null;
    if (row.party_id) {
      try {
        const result = await api.partyAPI.getById(row.party_id, row.business_id);
        if (result.success && result.data) {
          partyDetails = result.data;
        } else {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${api.getApiConfig().backendURL}/api/parties/${row.party_id}?business_id=${row.business_id}`, {
              headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.success && data.data) {
              partyDetails = data.data;
            } else {
              throw new Error(`Direct fetch failed`);
            }
          } catch (directError) {
            partyDetails = {
              party_name: row.partyName || row.party_name || 'Party Details Not Available',
              billing_address: 'Please check party details or contact support',
              shipping_address: 'Please check party details or contact support',
              phone_number: 'Not available',
              gstin: 'Not available',
              state: 'Not available'
            };
          }
        }
      } catch (error) {
        partyDetails = {
          party_name: row.partyName || row.party_name || 'Party Details Not Available',
          billing_address: 'Please check party details or contact support',
          shipping_address: 'Please check party details or contact support',
          phone_number: 'Not available',
          gstin: 'Not available',
          state: 'Not available'
        };
      }
    } else {
      partyDetails = {
        party_name: row.partyName || row.party_name || 'No Party Selected',
        billing_address: 'No address available (no party selected)',
        shipping_address: 'No address available (no party selected)',
        phone_number: 'No phone available (no party selected)',
        gstin: 'No GSTIN available (no party selected)',
        state: 'No state available (no party selected)'
      };
    }

    let bankDetails = null;
    if (row.bank_id) {
      try {
        const response = await fetch(`${api.getApiConfig().backendURL}/api/bank-details/${row.bank_id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            bankDetails = result.data;
          }
        }
      } catch (error) {
        console.error('Error fetching bank details:', error);
      }
    }

    // Fallback to saved bank account in meta if fetch failed or bank_id is missing
    if (!bankDetails) {
      bankDetails = row.meta?.bankAccount || row.purchase_return_data?.bankAccount;
    }

    const customerAddress = partyDetails ? [
      partyDetails.billing_address || '',
      partyDetails.city && partyDetails.city !== "null" ? partyDetails.city : '',
      partyDetails.state && partyDetails.state !== "null" ? partyDetails.state : '',
      partyDetails.pincode && partyDetails.pincode !== "null" ? partyDetails.pincode : ''
    ].filter(line => line.trim()).join(', ') : '';

    const data = {
      company: {
        name: businessData?.business_name || "Your Company Name",
        tagline: businessData?.tagline || "Your Tagline",
        addressLines: addressLines.length > 0 ? addressLines : ["Address Line 1", "Address Line 2"],
        tel: businessData?.phone || "Phone",
        web: businessData?.website || "Website",
        website: businessData?.website || "Website",
        email: businessData?.email || "Email",
        gstin: businessData?.gstin || "GSTIN",
        logo: { url: logoUrl, text: "", slogan: "" },
        signatureUrl: signatureUrl,
        stampUrl: stampUrl,
      },
      customer: {
        name: row.partyName || row.party_name || '',
        address: customerAddress,
        phone: partyDetails?.phone_number || '',
        gstin: partyDetails?.gstin || '',
        placeOfSupply: partyDetails?.state || '',
      },
      quotation: {
        number: row.id || row.purchase_return_number,
        date: new Date(row.date || row.return_date).toLocaleDateString(),
        dueDate: row.dueDate ? new Date(row.dueDate).toLocaleDateString() : null,
        reverseCharge: 'No',
        lrNo: '',
        transport: '',
        transportId: '',
        vehicleNumber: '',
      },
      products: lines.map((l, i) => ({
        srNo: i + 1,
        description: l.description || l.name || '',
        subtitle: l.subtitle || '',
        hsn: l.hsn || '',
        qty: l.qty || 0,
        unit: l.unit || 'PCS',
        price: parseFloat((l.price || 0).toFixed(2)),
        discountPct: parseFloat((l.discountPct || 0).toFixed(2)),
        taxType: l.taxType || 'GST',
        cgstPct: parseFloat((l.cgstPct || 0).toFixed(2)),
        sgstPct: parseFloat((l.sgstPct || 0).toFixed(2)),
        igstPct: parseFloat((l.igstPct || 0).toFixed(2)),
        vatPct: parseFloat((l.vatPct || 0).toFixed(2)),
        taxable: parseFloat((l.taxable || 0).toFixed(2)),
        tax: parseFloat((l.tax || 0).toFixed(2)),
        total: parseFloat((l.total || 0).toFixed(2)),
        image_url: l.image_url || null,
      })),
      totals: {
        totalQty: totalQty,
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        taxTotal: parseFloat(totalTax.toFixed(2)),
        igstAmount: parseFloat(totalTax.toFixed(2)),
        additionalCharges: parseFloat(chargesTotal.toFixed(2)),
        discountAfterTax: parseFloat(discountAfterTaxValue.toFixed(2)),
        total: parseFloat(grandTotal.toFixed(2)),
        subtotal: parseFloat((taxableAmount + totalTax).toFixed(2)),
        totalInWords: numberToWords(Math.round(grandTotal)),
        amountAfterTax: parseFloat(grandTotal.toFixed(2)),
        amountDue: parseFloat(grandTotal.toFixed(2)),
      },
      bank: {
        bank_name: bankDetails?.bank_name || 'Bank Name',
        branch: bankDetails?.branch || 'Branch',
        account_number: bankDetails?.account_number || bankDetails?.accountNo || 'Account No',
        ifsc: bankDetails?.ifsc || 'IFSC',
        account_holder_name: bankDetails?.account_holder_name || 'Account Holder',
        qr_code: bankDetails?.qr_code || bankDetails?.qrCode || null,
        upi: bankDetails?.upi || null,
      },
      gstNote: { payableOnReverseCharge: 'N.A.', other: 'N.A.' },
      notes: row.meta?.notes || row.notes || row.purchase_return_data?.notes || '',
      terms: [],
      termsSections: []
    };

    try {
      if (row.dbId) {
        const termsResponse = await api.termsConditionsAPI.getByQuotationId(row.dbId);
        if (termsResponse.success && termsResponse.data && termsResponse.data.length > 0) {
          data.termsSections = termsResponse.data.map(t => ({ heading: t.heading, content: t.content, section_order: t.section_order }));
          data.terms = termsResponse.data.map(t => t.content);
        } else {
          const metaTerms = row.meta?.terms || "";
          data.terms = metaTerms.split('\n').filter(t => t.trim());
          data.termsSections = [{ heading: "Terms & Conditions", content: metaTerms, section_order: 1 }];
        }
      } else {
        const metaTerms = row.meta?.terms || "";
        data.terms = metaTerms.split('\n').filter(t => t.trim());
        data.termsSections = [{ heading: "Terms & Conditions", content: metaTerms, section_order: 1 }];
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      const metaTerms = row.meta?.terms || "";
      data.terms = metaTerms.split('\n').filter(t => t.trim());
      data.termsSections = [{ heading: "Terms & Conditions", content: metaTerms, section_order: 1 }];
    }

    return data;
  };

  // Generate PDF function
  const generatePDF = async (purchaseReturnData) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[selectedFormat].component;
      const fileName = `${purchaseReturnData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={purchaseReturnData} />,
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

  const onRangeChange = (val) => setDateRangeLabel(val);
  const onRangeApply = (range) => {
    setCustomRange(range);
    setDateRangeLabel('Custom Date Range');
  };

  const handleCreate = () => {
    setEditingRow({ type: 'purchaseReturn' });
    setViewMode('create');
  };

  const handleEdit = (row) => {
    setEditingRow({
      ...row,
      dbId: row.dbId || row.id,
      type: 'purchaseReturn',
      purchase_return_number: row.purchase_return_number || row.id,
      return_date: row.date || row.return_date,
      party_name: row.partyName || row.party_name,
      party_id: row.party_id,
      grand_total: row.amount || row.grand_total,
      bank_id: row.bank_id,
      status: row.status,
      notes: row.notes,
      // Wrap notes in meta object for form compatibility
      meta: {
        notes: row.notes || '',
        lines: row.purchase_return_data?.lines || [],
        total: row.total_amount || 0,
        discount: row.discount_amount || 0,
        tax: row.tax_amount || 0,
        grandTotal: row.grand_total || 0,
        remark: row.remark || '',
        paymentTerms: row.meta?.paymentTerms ?? row.purchase_return_data?.paymentTerms ?? 30
      },
      purchase_return_data: row.purchase_return_data
    });
    setViewMode('create');
  };

  const handleDelete = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const dbId = itemToDelete.dbId || itemToDelete.id;

    try {
      showLoadingModal('Deleting purchase return...');
      await api.purchaseReturnAPI.delete(dbId, selectedBusinessId);

      closeModal();
      setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
      showSuccessToast(`${itemToDelete.id} deleted successfully`);
      setDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (err) {
      console.error('Error deleting purchase return:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete purchase return.');
    }
  };

  const handleSave = async (returnData) => {
    try {
      const payload = {
        business_id: selectedBusinessId,
        purchase_return_number: returnData.purchase_return_number || returnData.id,
        return_date: returnData.return_date || returnData.date || new Date().toISOString().slice(0, 10),
        party_name: returnData.party_name || returnData.partyName || returnData.party || "",
        party_id: returnData.party_id || null,
        bank_id: returnData.bank_id || null,
        status: returnData.status || "open",
        total_amount: Number(returnData.total_amount || returnData.amount || returnData.meta?.total || 0),
        discount_amount: Number(returnData.discount_amount || returnData.meta?.discount || 0),
        tax_amount: Number(returnData.tax_amount || returnData.meta?.tax || 0),
        grand_total: Number(returnData.grand_total || returnData.meta?.grandTotal || 0),
        notes: returnData.notes || returnData.meta?.notes || "",
        remark: returnData.remark || "",
        purchase_return_data: returnData.purchase_return_data || {
          lines: returnData.meta?.lines || [],
          charges: returnData.meta?.charges || [],
          notes: returnData.notes || returnData.meta?.notes || '',
          bankAccount: returnData.meta?.bankAccount || null,
          bankAccounts: returnData.meta?.bankAccounts || [],
          selectedBankIndex: returnData.meta?.selectedBankIndex || -1,
          discountAfterTaxPct: returnData.meta?.discountAfterTaxPct || 0,
          paymentTerms: returnData.meta?.paymentTerms ?? 30
        },
        terms_sections: returnData.terms_sections || []
      };

      let response;
      const isEdit = !!editingRow?.dbId;
      const dbId = editingRow?.dbId || editingRow?.id;

      if (isEdit) {
        response = await api.purchaseReturnAPI.update(dbId, payload, selectedBusinessId);
        if (response.success) {
          setRows((prev) => prev.map((r) => r.dbId === dbId ? {
            id: response.data.purchase_return_number,
            dbId: response.data.id,
            purchase_return_number: response.data.purchase_return_number,
            date: response.data.return_date,
            partyName: response.data.party_name,
            party_id: response.data.party_id,
            amount: response.data.grand_total,
            status: response.data.status,
            ...response.data
          } : r));
        }
      } else {
        response = await api.purchaseReturnAPI.create(payload);
        if (response.success) {
          const newReturn = response.data;
          setRows((prev) => [{
            id: newReturn.purchase_return_number,
            dbId: newReturn.id,
            purchase_return_number: newReturn.purchase_return_number,
            date: newReturn.return_date,
            partyName: newReturn.party_name,
            party_id: newReturn.party_id,
            amount: newReturn.grand_total,
            status: newReturn.status,
            ...newReturn
          }, ...prev]);
        }
      }

      if (!response.success) {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error("DUPLICATE_NUMBER:" + response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'purchase_return_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to save purchase return');
      }

      setEditingRow(null);
      setViewMode('list');
      closeModal();

      showSuccessToast(isEdit ? `Purchase Return updated successfully` : `Purchase Return ${payload.purchase_return_number} created successfully`);
    } catch (err) {
      console.error('Error saving purchase return:', err);
      closeModal();
      // Re-throw error so form can handle it
      throw err;
    }
  };

  const handleBack = () => {
    setEditingRow(null);
    setViewMode('list');
  };

  // Fixed Header Component for Purchase Return Preview
  const PurchaseReturnPreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { setViewMode('list'); setPreviewPurchaseReturn(null); }} className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>
          <button onClick={() => { setViewMode('list'); setPreviewPurchaseReturn(null); }} className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            Purchase Return Preview - <span>{previewPurchaseReturn.id || previewPurchaseReturn.purchase_return_number}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CommonDropdown options={Object.entries(pdfFormats).map(([key, format]) => ({ id: key, label: format.label }))} value={selectedFormat} onChange={(option) => setSelectedFormat(option.id)} placeholder="Select Format" className="w-28 sm:w-32 h-8" valueBy="id" />
          <div className="relative">
            <input type="file" id="letterhead-upload" accept="application/pdf, .pdf, image/*" onChange={handleLetterheadUpload} className="hidden" />
            <label htmlFor="letterhead-upload" className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#f59e0b] to-[#f97316] hover:from-[#f59e0b]/90 hover:to-[#f97316]/90 text-white rounded-[7px] text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer" title="Upload Letterhead">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden md:inline">Upload Letterhead</span>
              <span className="hidden sm:inline md:hidden">Upload</span>
            </label>
          </div>
          {uploadedLetterhead && (
            <button onClick={handleRemoveLetterhead} className="h-8 w-8 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#ef4444]/90 hover:to-[#dc2626]/90 text-white rounded-[7px] transition-all duration-200 focus:outline-none flex items-center justify-center" title="Remove Letterhead">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={() => generatePDF(previewData)}
            disabled={isGeneratingPDF}
            className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap"
          >
            {isGeneratingPDF ? <span className="hidden sm:inline">Generating...</span> : <><Download size={14} className="sm:w-4 sm:h-4" /><span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span></>}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <MainLoader message="Loading purchase returns..." />;
  }

  if (viewMode === 'create') {
    return (
      <QuotationForm
        onSave={handleSave}
        onBack={handleBack}
        initialData={editingRow || {}}
        formTitle={editingRow?.dbId ? "Update Purchase Return" : "Create Purchase Return"}
        showTopActions={true}
        showBottomActions={true}
        saveLabel={editingRow?.dbId ? "Update Changes" : "Save"}
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  // Preview page render
  if (viewMode === 'preview' && previewPurchaseReturn) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <PurchaseReturnPreviewHeader />
        <div className="pt-36 p-6 bg-white w-full min-h-screen">
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
      title: 'Return Number',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-gray-700"><span>{r.purchase_return_number || r.id}</span></span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (r) => formatDate(r.date)
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
    {
      key: 'status',
      title: 'Status',
      sortable: false,
      render: (r) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'open' ? 'text-blue-600 bg-blue-50 border border-blue-200' :
          r.status === 'closed' ? 'text-green-600 bg-green-50 border border-green-200' :
            'text-gray-600 bg-gray-50 border border-gray-200'
          }`}>
          {r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}
        </span>
      )
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
              placeholder="PR-0000 or Party Name"
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
              <CustomDropdown
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
                onClick={handleCreate}
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
              placeholder="PR-0000 or Party Name"
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
                onClick={handleCreate}
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
          title="No Purchase Returns Found"
          description="You haven't created any purchase returns yet. Start by creating your first purchase return."
          buttonText="Create First Purchase Return"
          onButtonClick={handleCreate}
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
            onRowClick={(row) => { setPreviewPurchaseReturn(row); setViewMode('preview'); }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sortState={sort}
            onSortChange={setSort}
            emptyMessage="No purchase returns match your search criteria."
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
        itemType="purchase return"
      />
    </div>
  );
}

export default PurchaseReturn;
