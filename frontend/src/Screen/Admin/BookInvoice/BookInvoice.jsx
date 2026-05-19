import React, { useMemo, useState, useEffect } from "react";
import { convertFileToImage } from '../../../utils/fileConverter';
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactDOM from 'react-dom/client';
import { Plus, FileText, ArrowLeft, Download, Search } from "lucide-react";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatDate } from "../../../utils/dateFormat.js";

import Date_wise_Filter_Button, { getRangeBoundsPure } from "../../../Components/Date_wise_Filter_Button.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
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
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import { mapToBookInvoiceData } from "../../../utils/documentMapper";

const { bookInvoiceAPI, businessAPI, termsConditionsAPI, getApiConfig, partyAPI } = api;




function BookInvoice({ currency }) {
    const [query, setQuery] = useState('');
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    const [rows, setRows] = useState([]);
    const [sort, setSort] = useState({ key: "date", dir: "desc" });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    //Determine viewMode from URL with localStorage fallback
    const [viewMode, setViewMode] = useState(() => {
        const mode = searchParams.get('mode');
        if (mode) {
            localStorage.setItem('bookInvoiceViewMode', mode);
            return mode;
        }
        const savedMode = localStorage.getItem('bookInvoiceViewMode');
        return savedMode || 'list';
    });

    const [loading, setLoading] = useState(viewMode === 'list');
    const [editingRow, setEditingRow] = useState(null);
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    //Update viewMode when URL changes
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode) {
            setViewMode(mode);
            localStorage.setItem('bookInvoiceViewMode', mode);

            if (mode === 'create') {
                setLoading(false);
            }

            if (mode === 'edit') {
                const savedEditingRow = localStorage.getItem('editingBookInvoiceRow');
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
            localStorage.removeItem('bookInvoiceViewMode');
        }
    }, [searchParams]);

    const handleCreateClick = () => {
        setEditingRow(null);
        setLoading(false);
        navigate('/bookInvoice?mode=create', { replace: true });
    };
    const [previewBookInvoice, setPreviewBookInvoice] = useState(null);
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
                component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-1'
            },
            FormatTwo: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-2'
            },
            FormatThree: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-3'
            },
            FormatFour: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-4'
            },
            // FormatFive: {
            //     component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
            //     label: 'Format-5'
            // },
        };

        if (uploadedLetterhead) {
            formats.Letterhead = {
                component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.BOOK_INVOICE} letterheadImage={uploadedLetterhead} />,
                label: 'Letterhead'
            };
        }

        return formats;
    }, [uploadedLetterhead]);


    const fetchInvoices = async () => {
        if (!selectedBusinessId) return;
        setLoading(true);
        try {
            const response = await bookInvoiceAPI.getAll(selectedBusinessId);
            if (response?.success && Array.isArray(response.data)) {
                const formattedRows = response.data.map(invoice => ({
                    id: invoice.book_invoice_number,
                    dbId: invoice.id,
                    date: invoice.invoice_date,
                    partyName: invoice.party_name,
                    party_id: invoice.party_id,
                    amount: invoice.grand_total,
                    status: invoice.status,
                    notes: invoice.notes,
                    bank_id: invoice.bank_id,
                    total_amount: invoice.total_amount,
                    discount_amount: invoice.discount_amount,
                    tax_amount: invoice.tax_amount,
                    grand_total: invoice.grand_total,
                    book_invoice_number: invoice.book_invoice_number,
                    book_invoice_data: invoice.book_invoice_data,
                    po_reference: invoice.po_reference,
                    po_agreement_number: invoice.po_reference || '',
                    due_date: invoice.due_date || invoice.valid_until || invoice.expected_delivery_date || invoice.meta?.dueDate || invoice.book_invoice_data?.dueDate || invoice.book_invoice_data?.due_date,
                    remark: invoice.remark || ''
                }));
                setRows(formattedRows);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error('Error loading book invoices:', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [selectedBusinessId]);

    // Listen for business changes and refetch invoices
    useEffect(() => {
        const handleBusinessChanged = (event) => {
            fetchInvoices();
        };

        window.addEventListener('businessChanged', handleBusinessChanged);
        return () => {
            window.removeEventListener('businessChanged', handleBusinessChanged);
        };
    }, []);

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
        if (businessData?.default_format && previewBookInvoice) {
            setSelectedFormat(businessData.default_format);
        }
    }, [businessData?.default_format, previewBookInvoice]);

    // Fetch preview data when previewBookInvoice changes
    useEffect(() => {
        const fetchPreviewData = async () => {
            if (previewBookInvoice) {
                try {
                    const data = await mapToBookInvoiceDataInternal(previewBookInvoice);
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
    }, [previewBookInvoice]);


    const mapToBookInvoiceDataInternal = async (row) => {
        return await mapToBookInvoiceData(row, businessData, partyAPI, currency);
    };

    const onRangeChange = (opt) => {
        setDateRangeLabel(opt.label);
    };

    const onRangeApply = (range) => {
        setCustomRange(range);
        setDateRangeLabel("Custom Date Range");
    };


    // Generate PDF function
    const generatePDF = async (bookInvoiceData) => {
        if (isGeneratingPDF) return;

        setIsGeneratingPDF(true);

        try {
            const SelectedFormat = pdfFormats[selectedFormat].component;
            const fileName = `${bookInvoiceData.quotation.number}.pdf`;

            await generateUniversalPDF({
                component: <SelectedFormat data={bookInvoiceData} />,
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




    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

        let list = rows.filter((r) => {
            let dateOk = true;
            if (bounds && (bounds.start || bounds.end)) {
                // Get the invoice date as YYYY-MM-DD format - sanitize properly
                const rawDate = r.date || '';
                const dateParts = String(rawDate).split('T')[0].trim();

                // Extract YYYY-MM-DD components explicitly
                const parseDateParts = (dateStr) => {
                    if (!dateStr) return null;
                    // Handle different date formats - normalize to YYYY-MM-DD
                    const normalized = String(dateStr).replace(/[\s\/]/g, '-').trim();
                    // Match YYYY-MM-DD format
                    if (normalized.length === 10) {
                        const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                        if (match) return { year: match[1], month: match[2], day: match[3] };
                    }
                    return null;
                };

                const invoiceParts = parseDateParts(dateParts);

                // Get the bounds as YYYY-MM-DD format (using local date)
                const getLocalDateParts = (dateObj) => {
                    if (!dateObj) return null;
                    const year = String(dateObj.getFullYear());
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    return { year, month, day };
                };

                const startParts = getLocalDateParts(bounds.start);
                const endParts = getLocalDateParts(bounds.end);

                // Skip comparison if invoice date is invalid
                if (!invoiceParts) {
                    dateOk = false;
                } else if (startParts && endParts) {
                    // Compare year, month, day components individually
                    const invoiceYMD = invoiceParts.year + invoiceParts.month + invoiceParts.day;
                    const startYMD = startParts.year + startParts.month + startParts.day;
                    const endYMD = endParts.year + endParts.month + endParts.day;
                    dateOk = invoiceYMD >= startYMD && invoiceYMD <= endYMD;
                } else if (startParts) {
                    const invoiceYMD = invoiceParts.year + invoiceParts.month + invoiceParts.day;
                    const startYMD = startParts.year + startParts.month + startParts.day;
                    dateOk = invoiceYMD >= startYMD;
                } else if (endParts) {
                    const invoiceYMD = invoiceParts.year + invoiceParts.month + invoiceParts.day;
                    const endYMD = endParts.year + endParts.month + endParts.day;
                    dateOk = invoiceYMD <= endYMD;
                }
            }
            const matchStatus = true;
            const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
            const id = r.id ? String(r.id).toLowerCase() : '';
            const matchSearch = !q || partyName.includes(q) || id.includes(q);
            return dateOk && matchStatus && matchSearch;
        });

        list.sort((a, b) => {
            const dir = sort.dir === 'asc' ? 1 : -1;
            let A = a[sort.key];
            let B = b[sort.key];

            // For date sorting, compare as date strings (YYYY-MM-DD)
            if (sort.key === 'date') {
                A = String(A || '').split('T')[0];
                B = String(B || '').split('T')[0];
            }

            if (sort.key === 'amount') return ((parseFloat(A) || 0) - (parseFloat(B) || 0)) * dir;
            if (sort.key === 'date') return A.localeCompare(B) * dir;
            return String(A || '').localeCompare(String(B || '')) * dir;
        });

        return list;
    }, [rows, query, status, sort, dateRangeLabel, customRange]);

    const handleCreate = () => {
        setEditingRow({ type: 'bookInvoice' });
        setViewMode('create');
    };

    const handleEdit = async (row) => {
        //  Pre-fetch terms & conditions to ensure they load correctly in QuotationForm
        let termsSections = [];
        try {
            const rowId = row.dbId || row.id;
            const termsResponse = await termsConditionsAPI.getByBookInvoiceId(rowId, selectedBusinessId);
            if (termsResponse.success && termsResponse.data && termsResponse.data.length > 0) {
                termsSections = termsResponse.data.map(t => ({
                    id: t.id,
                    heading: t.heading,
                    content: t.content,
                    is_locked: !!t.is_locked,
                    section_order: t.section_order
                }));
            }
        } catch (error) {
            console.error('Error pre-fetching terms for edit:', error);
        }

        const rawLines = Array.isArray(row.book_invoice_data?.lines)
            ? row.book_invoice_data.lines
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
            type: 'bookInvoice',
            book_invoice_number: row.book_invoice_number || row.id,
            invoice_date: row.date || row.invoice_date,
            party_name: row.partyName || row.party_name,
            party_id: row.party_id,
            grand_total: row.amount || row.grand_total,
            bank_id: row.bank_id,
            status: row.status,
            notes: row.notes,
            po_agreement_number: row.po_reference || row.po_agreement_number || '',
            remark: row.remark || '',
            meta: {
                notes: row.notes || '',
                lines: normalizedLines,
                total: row.total_amount || 0,
                discount: row.discount_amount || 0,
                tax: row.tax_amount || 0,
                grandTotal: row.grand_total || 0,
                remark: row.remark || '',
                charges: row.book_invoice_data?.charges || [],
                discountAfterTaxPct: row.book_invoice_data?.discountAfterTaxPct || 0,
                paymentTerms: row.meta?.paymentTerms ?? row.book_invoice_data?.paymentTerms ?? 30,
                billing_address: row.book_invoice_data?.billing_address,
                city: row.book_invoice_data?.city,
                state: row.book_invoice_data?.state,
                pincode: row.book_invoice_data?.pincode,
                country: row.book_invoice_data?.country,
                shipping_address: row.book_invoice_data?.shipping_address,
                ship_city: row.book_invoice_data?.ship_city,
                ship_state: row.book_invoice_data?.ship_state,
                ship_pincode: row.book_invoice_data?.ship_pincode,
                ship_country: row.book_invoice_data?.ship_country,
                selectedBillingIndex: row.book_invoice_data?.selectedBillingIndex,
                selectedShippingIndex: row.book_invoice_data?.selectedShippingIndex,
                terms_sections: termsSections,
                terms: termsSections.map(s => s.content.replace(/<[^>]*>?/gm, "")).join("\n")
            },
            book_invoice_data: row.book_invoice_data,
            po_reference: row.po_reference,
            po_agreement_number: row.po_reference || row.po_agreement_number // Maintain compatibility with QuotationForm
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
            showLoadingModal('Deleting book invoice...');
            const response = await bookInvoiceAPI.delete(dbId, selectedBusinessId);
            if (response.success) {
                setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
                closeModal();
                showSuccessToast(`${itemToDelete.id} deleted successfully`);
                setDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                throw new Error(response.message || 'Failed to delete book invoice');
            }

        } catch (err) {
            console.error('Error deleting book invoice:', err);
            closeModal();
            showErrorToast(err?.message || 'Could not delete book invoice.');
        }
    };

    const handleSave = async (invoiceData) => {
        try {
            const invoiceDataToSave = invoiceData.book_invoice_data || {
                lines: invoiceData.meta?.lines || [],
                charges: invoiceData.meta?.charges || [],
                notes: invoiceData.notes || invoiceData.meta?.notes || '',
                bankAccount: invoiceData.meta?.bankAccount || null,
                bankAccounts: invoiceData.meta?.bankAccounts || [],
                selectedBankIndex: invoiceData.meta?.selectedBankIndex || -1,
                discountAfterTaxPct: invoiceData.meta?.discountAfterTaxPct || 0,
                remark: invoiceData.remark || '',
                paymentTerms: invoiceData.meta?.paymentTerms ?? 30,
                terms_sections: invoiceData.terms_sections || []
            };

            const payload = {
                business_id: selectedBusinessId,
                book_invoice_number: invoiceData.book_invoice_number || invoiceData.id,
                invoice_date: invoiceData.invoice_date || invoiceData.date || (() => {
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })(),
                party_name: invoiceData.party_name || invoiceData.partyName || invoiceData.party || "",
                party_id: invoiceData.party_id || null,
                bank_id: invoiceData.bank_id || null,
                status: invoiceData.status || "open",
                total_amount: Number(invoiceData.total_amount || invoiceData.amount || invoiceData.meta?.total || 0),
                discount_amount: Number(invoiceData.discount_amount || invoiceData.meta?.discount || 0),
                tax_amount: Number(invoiceData.tax_amount || invoiceData.meta?.tax || 0),
                grand_total: Number(invoiceData.grand_total || invoiceData.amount || invoiceData.meta?.grandTotal || 0),
                notes: invoiceData.notes || invoiceData.meta?.notes || "",
                remark: invoiceData.remark || "",
                po_reference: invoiceData.po_agreement_number || invoiceData.poAgreementNumber || invoiceData.po_reference || "",
                book_invoice_data: invoiceDataToSave,
                terms_sections: invoiceData.terms_sections || []
            };

            const isEdit = !!editingRow?.dbId;
            const dbId = editingRow?.dbId || editingRow?.id;

            let response;
            if (isEdit) {
                response = await bookInvoiceAPI.update(dbId, payload, selectedBusinessId);
            } else {
                response = await bookInvoiceAPI.create(payload);
            }

            if (response?.success) {
                closeModal();
                showSuccessToast(isEdit ? `Book Invoice updated successfully` : `Book Invoice ${payload.book_invoice_number} created successfully`);
                await fetchInvoices();
                setEditingRow(null);
                setViewMode('list');
            } else {
                // Check if it's a duplicate number error
                if (response?.code === 'DUPLICATE_NUMBER') {
                    const error = new Error(response?.message);
                    error.code = 'DUPLICATE_NUMBER';
                    error.field = 'book_invoice_number';
                    throw error;
                }
                throw new Error(response?.message || 'Failed to save book invoice');
            }
        } catch (err) {
            console.error('Error saving book invoice:', err);
            closeModal();
            // Re-throw error so form can handle it
            throw err;
        }
    };

    const handleBack = () => {
        setEditingRow(null);
        setViewMode('list');
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

    const BookInvoicePreviewHeader = () => (
        <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setViewMode('list'); setPreviewBookInvoice(null); }}
                        className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                    </button>

                    <button
                        onClick={() => { setViewMode('list'); setPreviewBookInvoice(null); }}
                        className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                    </button>

                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                        Book Invoice Preview - {previewBookInvoice.id || previewBookInvoice.book_invoice_number}
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
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <MainLoader message="Loading book invoices..." />;
    }

    if (viewMode === 'create') {
        return (
            <QuotationForm
                formType="bookInvoice"
                onSave={handleSave}
                onBack={handleBack}
                initialData={editingRow || {}}
                formTitle={editingRow?.dbId ? "Update Book Invoice" : "Create Book Invoice"}
                showTopActions={true}
                showBottomActions={true}
                saveLabel={editingRow?.dbId ? "Update Changes" : "Save"}
                cancelLabel="Cancel"
                currency={currency}
            />
        );
    }

    if (viewMode === 'preview' && previewBookInvoice) {
        return (
            <div className="min-h-screen bg-gray-50 w-full">
                <BookInvoicePreviewHeader />
                <div className="preview-wrapper pt-16 p-6 bg-white w-full min-h-screen">
                    <div className="w-full max-w-7xl mx-auto">
                        {previewData ? (() => {
                            const formatObj = pdfFormats[selectedFormat] || pdfFormats['FormatOne'] || Object.values(pdfFormats)[0];
                            const SelectedFormat = formatObj.component;
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
            title: 'Invoice Number',
            sortable: true,
            render: (r) => (
                <span className="text-sm text-gray-700">{r.id}</span>
            ),
        },
        {
            key: 'po_reference',
            title: 'PO Number',
            sortable: true,
            render: (r) => (
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">{r.po_reference || '—'}</span>
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
                    {/* Mobile Header - Unified with Back Button */}
                    <div className="md:hidden flex flex-col space-y-3 mb-4">
                        <div className="flex items-center justify-between w-full">
                            <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
                            <button
                                onClick={handleCreate}
                                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                            >
                                <Plus size={16} /> New
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
                        <div className="hidden md:block">
                            <DashboardBackButton />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 justify-end">
                            <div className="relative group flex-1 md:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#129046] transition-colors" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search Invoices..."
                                    className="w-full h-8 pl-10 pr-4 bg-white border-1 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-[#129046]/10 outline-none transition-all"
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

                            <div className="hidden md:block">
                                <button
                                    onClick={handleCreate}
                                    className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={18} /> New
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!loading && rows.length === 0 && viewMode === "list" && (
                <GeneralEmptyState
                    title="No Book Invoices Found"
                    description="You haven't created any book invoices yet. Start by creating your first one."
                    buttonText="Create First Book Invoice"
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
                        onRowClick={(row) => {
                            setPreviewBookInvoice(row);
                            setViewMode('preview');
                            navigate('/bookInvoice?mode=preview', { replace: true });
                        }}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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
                itemType="book invoice"
            />
        </div>
    );
}

export default BookInvoice;
