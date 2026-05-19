import React, { useMemo, useState, useEffect } from "react";
import { convertFileToImage } from '../../../utils/fileConverter';
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactDOM from 'react-dom/client';
import { Plus, FileText, ArrowLeft, Download } from "lucide-react";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatDate, toISODate } from "../../../utils/dateFormat.js";

import Date_wise_Filter_Button, { getRangeBoundsPure, startOfDay, endOfDay } from '../../../Components/Date_wise_Filter_Button.jsx';
import ReusableTable from "../../../Components/ReusableTable.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { formatCurrency } from "../../../utils/currency";
import QuotationForm from "../Quotation/QuotationForm.jsx";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import { mapToDebitNoteData } from "../../../utils/documentMapper";
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import MainLoader from "../../../Components/MainLoader.jsx";
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";





const dropdownRef = React.createRef();
function DateDropdown({ options, value, onChange, placeholder, className = "" }) {
    const [isOpen, setIsOpen] = useState(false);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.id === value || opt.label === value);

    return (
        <div className={`relative z-50 ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors bg-white text-left flex items-center justify-between"
            >
                <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-[7px] shadow-lg max-h-48 overflow-y-auto">
                    {options.map((option) => (
                        <button
                            key={option.id || option.label}
                            type="button"
                            onClick={() => {
                                onChange(option);
                                setIsOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors first:rounded-t-[7px] last:rounded-b-[7px] ${(selectedOption && (selectedOption.id === option.id || selectedOption.label === option.label))
                                ? "bg-[#129046] text-white hover:bg-[#129046]/90"
                                : "hover:bg-gray-50 text-gray-900"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function DebitNote({ currency }) {
    const [query, setQuery] = useState('');
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    const onRangeChange = (val) => setDateRangeLabel(val);
    const onRangeApply = (range) => {
        setCustomRange(range);
        setDateRangeLabel('Custom Date Range');
    };
    const [rows, setRows] = useState([]);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    //Determine viewMode from URL with localStorage fallback
    const [viewMode, setViewMode] = useState(() => {
        const mode = searchParams.get('mode');
        if (mode) {
            localStorage.setItem('debitNoteViewMode', mode);
            return mode;
        }
        const savedMode = localStorage.getItem('debitNoteViewMode');
        return savedMode || 'list';
    });

    const [loading, setLoading] = useState(viewMode === 'list');
    const [editingRow, setEditingRow] = useState(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [previewDebitNote, setPreviewDebitNote] = useState(null);
    const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');

    //Update viewMode when URL changes
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode) {
            setViewMode(mode);
            localStorage.setItem('debitNoteViewMode', mode);

            if (mode === 'create') {
                setLoading(false);
            }

            if (mode === 'edit') {
                const savedEditingRow = localStorage.getItem('editingDebitNoteRow');
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
            localStorage.removeItem('debitNoteViewMode');
        }
    }, [searchParams]);

    const handleCreateClick = () => {
        setEditingRow(null);
        setLoading(false);
        navigate('/debitNote?mode=create', { replace: true });
    };
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
                component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-1'
            },
            FormatTwo: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-2'
            },
            FormatThree: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-3'
            },
            FormatFour: {
                component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
                label: 'Format-4'
            },
            // FormatFive: {
            //     component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
            //     label: 'Format-5'
            // },
        };

        if (uploadedLetterhead) {
            formats.Letterhead = {
                component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.DEBIT_NOTE} letterheadImage={uploadedLetterhead} />,
                label: 'Letterhead'
            };
        }

        return formats;
    }, [uploadedLetterhead]);


    const fetchNotes = async () => {
        if (!selectedBusinessId) return;
        setLoading(true);
        try {
            const response = await api.debitNoteAPI.getAll(selectedBusinessId);

            if (response.success && Array.isArray(response.data)) {
                const formattedRows = response.data.map(note => ({
                    ...note,
                    id: note.debit_note_number,
                    debit_note_number: note.debit_note_number,
                    dbId: note.id,
                    date: note.note_date,
                    partyName: note.party_name,
                    party_id: note.party_id,
                    amount: note.grand_total,
                    due_date: note.due_date || note.valid_until || note.expected_delivery_date || note.meta?.dueDate || note.debit_note_data?.dueDate || note.debit_note_data?.due_date,
                    notes: note.notes || note.debit_note_data?.notes || note.meta?.notes,
                    status: note.status,
                }));
                setRows(formattedRows);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error('Error loading debit notes:', error);
            showErrorToast('Failed to load debit notes');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [selectedBusinessId]);

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

    // Apply default format from business settings
    useEffect(() => {
        if (businessData?.default_format && previewDebitNote) {
            setSelectedFormat(businessData.default_format);
        }
    }, [businessData?.default_format, previewDebitNote]);

    // Fetch preview data when previewDebitNote changes
    useEffect(() => {
        const fetchPreviewData = async () => {
            if (previewDebitNote) {
                try {
                    const data = await mapToDebitNoteDataInternal(previewDebitNote);
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
    }, [previewDebitNote]);

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

    const mapToDebitNoteDataInternal = async (row) => {
        return await mapToDebitNoteData(row, businessData, api.partyAPI, currency);
    };

    const generatePDF = async (debitNoteData) => {
        if (isGeneratingPDF) return;

        setIsGeneratingPDF(true);

        try {
            const SelectedFormat = pdfFormats[selectedFormat].component;
            const fileName = `${debitNoteData.customer.name.replace(/[^a-z0-9]/gi, '_')}-DebitNote-${debitNoteData.quotation.number}.pdf`;

            await generateUniversalPDF({
                component: <SelectedFormat data={debitNoteData} />,
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



    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

        let list = rows.filter((r) => {
            let dateOk = true;
            if (bounds && (bounds.start || bounds.end)) {
                // Parse the row date as a local date
                const d = startOfDay(new Date(r.date));
                const s = bounds.start ? startOfDay(new Date(bounds.start)) : null;
                const e = bounds.end ? endOfDay(new Date(bounds.end)) : null;

                if (s && e) dateOk = d >= s && d <= e;
                else if (s) dateOk = d >= s;
                else if (e) dateOk = d <= e;
            }
            const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
            const id = r.id ? String(r.id).toLowerCase() : '';
            const matchSearch = !q || partyName.includes(q) || id.includes(q);
            return dateOk && matchSearch;
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
    }, [rows, query, sort, dateRangeLabel, customRange]);

    const handleCreate = () => {
        setEditingRow({ type: 'debitNote' });
        setViewMode('create');
    };

    const handleEdit = (row) => {
        const rawLines = Array.isArray(row.debit_note_data?.lines)
            ? row.debit_note_data.lines
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
            type: 'debitNote',
            debit_note_number: row.debit_note_number || row.id,
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
                charges: row.debit_note_data?.charges || [],
                discountAfterTaxPct: row.debit_note_data?.discountAfterTaxPct || 0,
                paymentTerms: row.meta?.paymentTerms ?? row.debit_note_data?.paymentTerms ?? 30,
                billing_address: row.debit_note_data?.billing_address,
                city: row.debit_note_data?.city,
                state: row.debit_note_data?.state,
                pincode: row.debit_note_data?.pincode,
                country: row.debit_note_data?.country,
                shipping_address: row.debit_note_data?.shipping_address,
                ship_city: row.debit_note_data?.ship_city,
                ship_state: row.debit_note_data?.ship_state,
                ship_pincode: row.debit_note_data?.ship_pincode,
                ship_country: row.debit_note_data?.ship_country,
                selectedBillingIndex: row.debit_note_data?.selectedBillingIndex,
                selectedShippingIndex: row.debit_note_data?.selectedShippingIndex,
            },
            debit_note_data: row.debit_note_data
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
            showLoadingModal('Deleting debit note...');
            await api.debitNoteAPI.delete(dbId, selectedBusinessId);

            closeModal();
            setRows((prev) => prev.filter((r) => (r.dbId || r.id) !== dbId));
            showSuccessToast(`${itemToDelete.id} deleted successfully`);
            setDeleteModalOpen(false);
            setItemToDelete(null);

        } catch (err) {
            console.error('Error deleting debit note:', err);
            closeModal();
            showErrorToast(err?.message || 'Could not delete debit note.');
        }
    };

    const handleSave = async (noteData) => {
        try {
            const payload = {
                business_id: selectedBusinessId,
                debit_note_number: noteData.debit_note_number || noteData.id,
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
                debit_note_data: noteData.debit_note_data || {
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
                response = await api.debitNoteAPI.update(dbId, payload, selectedBusinessId);
                if (response.success) {
                    setRows((prev) => prev.map((r) => r.dbId === dbId ? {
                        ...response.data,
                        id: response.data.debit_note_number,
                        debit_note_number: response.data.debit_note_number,
                        dbId: response.data.id,
                        date: response.data.note_date,
                        partyName: response.data.party_name,
                        party_id: response.data.party_id,
                        amount: response.data.grand_total,
                        status: response.data.status,
                    } : r));
                }
            } else {
                response = await api.debitNoteAPI.create(payload);
                if (response.success) {
                    const newNote = response.data;
                    setRows((prev) => [{
                        ...newNote,
                        id: newNote.debit_note_number,
                        debit_note_number: newNote.debit_note_number,
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
                    error.field = 'debit_note_number';
                    throw error;
                }
                throw new Error(response.message || 'Failed to save debit note');
            }

            setEditingRow(null);
            setViewMode('list');
            closeModal();

            showSuccessToast(isEdit ? `Debit Note updated successfully` : `Debit Note ${payload.debit_note_number} created successfully`);
        } catch (err) {
            console.error('Error saving debit note:', err);
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

            const response = await api.businessAPI.update(businessId, {
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

    const DebitNotePreviewHeader = () => (
        <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setViewMode('list'); setPreviewDebitNote(null); }} className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
                        <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                    </button>
                    <button onClick={() => { setViewMode('list'); setPreviewDebitNote(null); }} className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
                        <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                    </button>
                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                        <span>Debit Note Preview - </span><span translate="no"><span>{previewDebitNote.id || previewDebitNote.debit_note_number}</span></span>
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
                    {/* <button
                        onClick={() => generatePDF(previewData)}
                        disabled={isGeneratingPDF}
                        className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap"
                    >
                        {isGeneratingPDF ? <span className="hidden sm:inline">Generating...</span> : <><Download size={14} className="sm:w-4 sm:h-4" /><span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span></>}
                    </button> */}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <MainLoader message="Loading debit notes..." />;
    }

    if (viewMode === 'create') {
        return (
            <QuotationForm
                onSave={handleSave}
                onBack={handleBack}
                initialData={editingRow || {}}
                formTitle={editingRow?.dbId ? "Update Debit Note" : "Create Debit Note"}
                showTopActions={true}
                showBottomActions={true}
                saveLabel={editingRow?.dbId ? "Update Changes" : "Save"}
                cancelLabel="Cancel"
                currency={currency}
            />
        );
    }

    // Preview page render
    if (viewMode === 'preview' && previewDebitNote) {
        return (
            <div className="min-h-screen bg-gray-50 w-full">
                <DebitNotePreviewHeader />
                <div className="preview-wrapper pt-16 p-6 bg-white w-full min-h-screen">
                    <div className="w-full max-w-7xl mx-auto">
                        {previewData ? (() => {
                            const SelectedFormat = pdfFormats[selectedFormat].component;
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

    const columns = [
        {
            key: 'id',
            title: 'Debit Note Number',
            sortable: true,
            render: (r) => (
                <span className="text-sm text-gray-700" translate="no"><span>{r.debit_note_number || r.id}</span></span>
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
            render: (r) => <span>{r.partyName}</span>,
            width: '400px'
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
                            placeholder="DN-0000 or Party Name"
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
                                onClick={handleCreate}
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
                            placeholder="DN-0000 or Party Name"
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
                    title="No Debit Notes Found"
                    description="You haven't created any debit notes yet. Start by creating your first debit note."
                    buttonText="Create First Debit Note"
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
                        onRowClick={(row) => { setPreviewDebitNote(row); setViewMode('preview'); }}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        sortState={sort}
                        onSortChange={setSort}
                        emptyMessage="No debit notes match your search criteria."
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
                itemName={itemToDelete?.debit_note_number || itemToDelete?.id || ""}
                itemType="debit note"
            />
        </div>
    );
}

export default DebitNote;
