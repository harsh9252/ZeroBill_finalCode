import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Search,
    FileText,
    Download,
    Calendar,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowLeft as BackArrow,
    Filter,
    X,
    ChevronRight,
    Calculator,
    ExternalLink,
    DownloadCloud,
    FileSpreadsheet,
    Plus,
    Edit2,
    Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import AddLedgerEntryModel from './AddLedgerEntryModel.jsx';
// Force reload: 2026-03-23T12:40:05
import MainLoader from '../../../Components/MainLoader.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import { formatCurrency, convertToINR } from '../../../utils/currency';
import { formatDate } from '../../../utils/dateFormat.js';
import api from '../../../utils/api.js';
import { showErrorToast, showSuccessToast, showLoadingModal, showConfirmationDialog, closeModal } from '../../../Components/ActionMessageModel.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';

const {
    partyAPI,
    salesInvoiceAPI,
    paymentInAPI,
    paymentOutAPI,
    creditNoteAPI,
    debitNoteAPI,
    salesReturnAPI,
    bookInvoiceAPI,
    purchaseReturnAPI,
    businessAPI
} = api;

export default function Ledger({ currency = 'INR', language = 'en-IN' }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDirectEntryOpen, setIsDirectEntryOpen] = useState(false);
    const [editEntryData, setEditEntryData] = useState(null);
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [rawTransactions, setRawTransactions] = useState({
        invoices: [],
        paymentsIn: [],
        paymentsOut: [],
        creditNotes: [],
        debitNotes: [],
        salesReturns: [],
        bookInvoices: [],
        purchaseReturns: []
    });
    const [partySearch, setPartySearch] = useState('');
    const [businessId] = useState(localStorage.getItem('selectedBusinessId'));
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [businessInfo, setBusinessInfo] = useState(null);
    const ledgerRef = React.useRef(null);

    useEffect(() => {
        if (businessId) {
            businessAPI.getById(businessId).then(res => {
                if (res.success) setBusinessInfo(res.data);
            }).catch(err => console.error("Error fetching business info:", err));
        }
    }, [businessId]);

    const handleDirectEntrySave = async (txData) => {
        try {
            showLoadingModal('Saving entry...');
            const party = parties.find(p => p.id === parseInt(txData.party_id));
            const payload = {
                party_id: txData.party_id,
                party_name: party?.party_name || 'Direct Entry',
                business_id: businessId,
                payment_date: txData.date,
                notes: txData.notes,
                payment_mode: 'Cash',
                reference_no: txData.reference_no,
                amount_received: convertToINR(txData.amount, currency), // For Payments
                grand_total: convertToINR(txData.amount, currency), // For Invoices/Notes
                total_amount: convertToINR(txData.amount, currency),
                subtotal: convertToINR(txData.base_amount || txData.amount, currency),
                tax_amount: convertToINR(txData.amount - (txData.base_amount || txData.amount), currency),
                line_items: [], // Required by some APIs
                created_by: 1 // Default
            };

            const isUpdate = !!editEntryData;
            let apiToUse;

            switch (txData.voucher_type) {
                case 'Payment In':
                    apiToUse = paymentInAPI;
                    payload.payment_number = txData.voucher_number || `PI-${Date.now()}`;
                    break;
                case 'Payment Out':
                    apiToUse = paymentOutAPI;
                    payload.payment_number = txData.voucher_number || `PO-${Date.now()}`;
                    break;
                case 'Invoice':
                case 'Tax Invoice':
                    apiToUse = salesInvoiceAPI;
                    payload.invoice_number = txData.voucher_number;
                    payload.invoice_date = txData.date;
                    payload.status = 'open';
                    break;
                case 'Purchase':
                case 'Book Invoice':
                    apiToUse = bookInvoiceAPI;
                    payload.book_invoice_number = txData.voucher_number;
                    payload.invoice_date = txData.date;
                    break;
                case 'Debit Note':
                case 'Dr Note':
                    apiToUse = debitNoteAPI;
                    payload.debit_note_number = txData.voucher_number;
                    payload.note_date = txData.date;
                    break;
                case 'Credit Note':
                case 'Cr Note':
                    apiToUse = creditNoteAPI;
                    payload.note_number = txData.voucher_number;
                    payload.note_date = txData.date;
                    break;
                case 'Sales Return':
                    apiToUse = salesReturnAPI;
                    payload.return_number = txData.voucher_number;
                    payload.return_date = txData.date;
                    break;
                default:
                    apiToUse = paymentInAPI;
                    // For custom types, store the type name in payment_mode so it can be retrieved for display
                    payload.payment_mode = txData.voucher_type;
                    payload.payment_number = txData.voucher_number || `PI-${Date.now()}`;
            }

            if (isUpdate) {
                // Now robustly handled in api.js, but keeping consistency here
                await apiToUse.update(editEntryData.id, businessId, payload);
            } else {
                // Now robustly handled in api.js, but keeping consistency here
                await apiToUse.create(businessId, payload);
            }

            closeModal();
            showSuccessToast(`Entry ${isUpdate ? 'updated' : 'recorded'} successfully`);
            setIsDirectEntryOpen(false);
            setEditEntryData(null);
            fetchLedgerData(txData.party_id);
        } catch (error) {
            closeModal();
            console.error('Error saving direct entry:', error);
            if (error.code === 'DUPLICATE_NUMBER') {
                showErrorToast(error.message || 'Duplicate entry number');
            } else {
                showErrorToast('Failed to save direct entry');
            }
        }
    };

    const handleEditClick = (tx) => {
        setEditEntryData({
            ...tx,
            id: tx.id // Ensure database ID is preserved
        });
        setIsDirectEntryOpen(true);
    };

    const handleDeleteClick = async (tx) => {
        const isConfirmed = await showConfirmationDialog({
            title: 'Delete Entry?',
            text: `Are you sure you want to delete this entry?`,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            icon: 'warning',
            itemName: `${tx.type} #${tx.number}`,
            itemType: tx.type.toLowerCase()
        });

        if (isConfirmed) {
            showLoadingModal('Deleting entry...');
            try {
                let apiToUse;
                switch (tx.type) {
                    case 'Payment In': apiToUse = paymentInAPI; break;
                    case 'Payment Out': apiToUse = paymentOutAPI; break;
                    case 'Invoice':
                    case 'Tax Invoice': apiToUse = salesInvoiceAPI; break;
                    case 'Purchase':
                    case 'Book Invoice': apiToUse = bookInvoiceAPI; break;
                    case 'Credit Note':
                    case 'Cr Note': apiToUse = creditNoteAPI; break;
                    case 'Debit Note':
                    case 'Dr Note': apiToUse = debitNoteAPI; break;
                    case 'Sales Return': apiToUse = salesReturnAPI; break;
                    case 'Purchase Return': apiToUse = purchaseReturnAPI; break;
                    default: apiToUse = paymentInAPI;
                }
                const response = await apiToUse.delete(tx.id, businessId);

                closeModal();
                if (response.success) {
                    showSuccessToast('Entry deleted successfully');
                    fetchLedgerData(selectedParty.id);
                } else {
                    showErrorToast(response.message || 'Failed to delete entry');
                }
            } catch (error) {
                closeModal();
                console.error('Error deleting entry:', error);
                showErrorToast('Error: Could not connect to server');
            }
        }
    };

    const handleDownloadExcel = async () => {
        if (!selectedParty || unifiedTransactions.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ledger Report');

        // --- STYLING CONSTANTS ---
        const PRIMARY_GREEN = '129046';
        const LIGHT_GREEN = 'E8F5E9';
        const TEXT_WHITE = 'FFFFFF';
        const BORDER_COLOR = 'E0E0E0';

        // --- 1. HEADER SECTION ---
        // Title
        const titleRow = worksheet.addRow(['LEDGER REPORT']);
        titleRow.font = { name: 'Arial Black', size: 16, color: { argb: PRIMARY_GREEN } };
        worksheet.mergeCells('A1:G1');
        titleRow.alignment = { horizontal: 'center' };

        // Business & Party Info
        worksheet.addRow([]); // Spacer

        const infoStartRow = 3;
        worksheet.getCell(`A${infoStartRow}`).value = 'BUSINESS DETAILS';
        worksheet.getCell(`A${infoStartRow}`).font = { bold: true, color: { argb: PRIMARY_GREEN } };
        worksheet.getCell(`E${infoStartRow}`).value = 'PARTY DETAILS';
        worksheet.getCell(`E${infoStartRow}`).font = { bold: true, color: { argb: PRIMARY_GREEN } };

        worksheet.getCell(`A${infoStartRow + 1}`).value = businessInfo?.business_name || 'My Business';
        worksheet.getCell(`A${infoStartRow + 2}`).value = businessInfo?.email || '';
        worksheet.getCell(`A${infoStartRow + 3}`).value = businessInfo?.phone_number || '';

        worksheet.getCell(`E${infoStartRow + 1}`).value = selectedParty.party_name;
        worksheet.getCell(`E${infoStartRow + 2}`).value = selectedParty.phone_number || 'N/A';
        worksheet.getCell(`E${infoStartRow + 3}`).value = `Period: ${dateRangeLabel}`;

        worksheet.addRow([]); // Spacer
        worksheet.addRow([]); // Spacer

        // --- 2. TABLE HEADERS ---
        const headerRow = worksheet.addRow([
            'Sr.No',
            'Date',
            'Particulars',
            'Voucher Type',
            'Voucher No',
            'Debits',
            'Credit',
            'Balance'
        ]);

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: PRIMARY_GREEN }
            };
            cell.font = { bold: true, color: { argb: TEXT_WHITE } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // --- 3. DATA ROWS ---
        unifiedTransactions.forEach((tx, idx) => {
            const row = worksheet.addRow([
                tx.isOpening ? '-' : idx + 1,
                formatDate(tx.date, language),
                tx.particulars,
                tx.type,
                tx.isOpening ? '-' : (tx.number || tx.id),
                tx.debit || 0,
                tx.credit || 0,
                Math.abs(tx.balance)
            ]);

            // Zebra Striping & Borders
            const isAlt = idx % 2 === 1;
            row.eachCell((cell, colNumber) => {
                if (isAlt) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F9F9F9' }
                    };
                }
                cell.border = {
                    top: { style: 'thin', color: { argb: BORDER_COLOR } },
                    left: { style: 'thin', color: { argb: BORDER_COLOR } },
                    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
                    right: { style: 'thin', color: { argb: BORDER_COLOR } }
                };

                // Alignment
                if (colNumber >= 3 && colNumber <= 5) {
                    cell.alignment = { horizontal: 'right' };
                    cell.numFmt = '#,##0.00';
                } else {
                    cell.alignment = { horizontal: 'left' };
                }
            });
        });

        // --- 4. SUMMARY ROW ---
        worksheet.addRow([]); // Spacer
        const summaryRow = worksheet.addRow([
            'TOTAL SUMMARY',
            '',
            '',
            '',
            '',
            totals.debit,
            totals.credit,
            Math.abs(totals.balance)
        ]);

        summaryRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'EEEEEE' }
            };
            cell.border = {
                top: { style: 'medium' },
                bottom: { style: 'medium' }
            };
            if (colNumber >= 3) {
                cell.alignment = { horizontal: 'right' };
                cell.numFmt = '#,##0.00';
            }
        });

        // --- 5. FINAL ADJUSTMENTS ---
        worksheet.getColumn(1).width = 8;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 15;
        worksheet.getColumn(6).width = 12;
        worksheet.getColumn(7).width = 12;
        worksheet.getColumn(8).width = 15;

        // --- 6. SAVE FILE ---
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `Ledger_${selectedParty.party_name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(new Blob([buffer]), filename);
    };

    const handleDownloadPDF = async () => {
        if (!ledgerRef.current) return;

        await generateUniversalPDF({
            element: ledgerRef.current,
            filename: `Ledger_${selectedParty?.party_name || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`,
            orientation: 'portrait',
            renderWidth: 794, // A4 Portrait width at 96dpi
            margin: 10,
            onStart: () => {
                // Potential loading state here
            }
        });
    };

    const fetchParties = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);
        try {
            const response = await partyAPI.getAll(businessId);
            if (response.success) {
                const sortedParties = (response.data || []).sort((a, b) =>
                    a.party_name.localeCompare(b.party_name)
                );
                setParties(sortedParties);
                if (sortedParties.length > 0 && !selectedParty) {
                    setSelectedParty(sortedParties[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching parties:', error);
        } finally {
            setIsLoading(false);
        }
    }, [businessId, selectedParty]);

    const fetchLedgerData = useCallback(async (partyId) => {
        if (!businessId || !partyId) return;
        setIsLoading(true);
        try {
            // Include zKhata transactions if needed, but for now we'll stick to formal payments
            const [invoices, payIn, payOut, cNotes, dNotes, sReturns, bookInvoices, pReturns] = await Promise.all([
                salesInvoiceAPI.getAll(businessId),
                paymentInAPI.getAll(businessId),
                paymentOutAPI.getAll(businessId),
                creditNoteAPI.getAll(businessId),
                debitNoteAPI.getAll(businessId),
                salesReturnAPI.getAll(businessId),
                bookInvoiceAPI.getAll(businessId),
                purchaseReturnAPI.getAll(businessId)
            ]);

            const filterByParty = (res, pId) => (res.success && Array.isArray(res.data))
                ? res.data.filter(item => String(item.party_id) === String(pId))
                : [];

            setRawTransactions({
                invoices: filterByParty(invoices, partyId),
                paymentsIn: filterByParty(payIn, partyId),
                paymentsOut: filterByParty(payOut, partyId),
                creditNotes: filterByParty(cNotes, partyId),
                debitNotes: filterByParty(dNotes, partyId),
                salesReturns: filterByParty(sReturns, partyId),
                bookInvoices: filterByParty(bookInvoices, partyId),
                purchaseReturns: filterByParty(pReturns, partyId)
            });
        } catch (error) {
            console.error('Error fetching ledger data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchParties();
    }, [businessId]);

    useEffect(() => {
        if (selectedParty) {
            fetchLedgerData(selectedParty.id);
        }
    }, [selectedParty, fetchLedgerData]);

    const { unifiedTransactions, totals } = useMemo(() => {
        const filterRange = getRangeBoundsPure(dateRangeLabel, customRange) || {};

        let all = [
            ...rawTransactions.invoices
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.invoice_date || item.date || item.createdAt,
                    particulars: 'To Sales',
                    type: 'Tax Invoice',
                    number: item.invoice_number || item.id,
                    debit: parseFloat(item.grand_total || 0),
                    credit: 0
                })),
            ...rawTransactions.paymentsIn
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => {
                    const isCustom = item.payment_mode && !['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'].includes(item.payment_mode);
                    return {
                        id: item.id,
                        date: item.payment_date || item.date || item.createdAt,
                        particulars: isCustom ? `By ${item.payment_mode}` : 'By Payment In',
                        type: isCustom ? item.payment_mode : 'Payment In',
                        number: item.payment_number || item.id,
                        debit: 0,
                        credit: parseFloat(item.amount_received || 0),
                        description: item.notes || ''
                    };
                }),
            ...rawTransactions.creditNotes
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.note_date || item.date || item.createdAt,
                    particulars: 'By Credit Note',
                    type: 'Cr Note',
                    number: item.note_number || item.id,
                    debit: 0,
                    credit: parseFloat(item.grand_total || 0),
                    description: item.notes || ''
                })),
            ...rawTransactions.paymentsOut
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => {
                    const isCustom = item.payment_mode && !['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'].includes(item.payment_mode);
                    return {
                        id: item.id,
                        date: item.payment_date || item.date || item.createdAt,
                        particulars: isCustom ? `To ${item.payment_mode}` : 'To Payment Out',
                        type: isCustom ? item.payment_mode : 'Payment Out',
                        number: item.payment_number || item.id,
                        debit: parseFloat(item.amount_received || item.amount_paid || item.amount || 0),
                        credit: 0,
                        description: item.notes || ''
                    };
                }),
            ...rawTransactions.debitNotes
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.note_date || item.date || item.createdAt,
                    particulars: 'To Debit Note',
                    type: 'Dr Note',
                    number: item.debit_note_number || item.note_number || item.id,
                    debit: parseFloat(item.grand_total || 0),
                    credit: 0
                })),
            ...rawTransactions.salesReturns
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.return_date || item.date || item.createdAt,
                    particulars: 'By Sales Return',
                    type: 'Sales Return',
                    number: item.return_number || item.id,
                    debit: 0,
                    credit: parseFloat(item.grand_total || 0)
                })),
            ...rawTransactions.bookInvoices
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.date || item.createdAt,
                    particulars: 'By Purchase',
                    type: 'Book Invoice',
                    number: item.book_invoice_number || item.invoice_number || item.id,
                    debit: 0,
                    credit: parseFloat(item.grand_total || 0)
                })),
            ...rawTransactions.purchaseReturns
                .filter(item => item.party_id === selectedParty.id || item.party_name === selectedParty.party_name)
                .map(item => ({
                    id: item.id,
                    date: item.return_date || item.date || item.createdAt,
                    particulars: 'To Purchase Return',
                    type: 'Purchase Return',
                    number: item.purchase_return_number || item.return_number || item.id,
                    debit: parseFloat(item.grand_total || 0),
                    credit: 0
                }))
        ];

        // 1. Initial balance from party record
        const initialPartyBalance = parseFloat(selectedParty?.opening_balance || 0);
        const startingPoint = (selectedParty?.balance_type === 'payable') ? -initialPartyBalance : initialPartyBalance;

        // 2. Separate into Previous and Current based on date filter
        const start = filterRange.start ? new Date(filterRange.start) : null;
        const end = filterRange.end ? new Date(filterRange.end) : null;

        const previousTransactions = [];
        const currentTransactions = [];

        all.forEach(t => {
            const d = new Date(String(t.date).split('T')[0] + 'T00:00:00');
            if (start && d < start) {
                previousTransactions.push(t);
            } else if (end && d > end) {
                // Ignore for current view
            } else {
                currentTransactions.push(t);
            }
        });

        // 3. Calculate Balance Brought Forward
        const bbf = previousTransactions.reduce((acc, t) => acc + (t.debit - t.credit), startingPoint);

        // 4. Sort current transactions
        currentTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 5. Build final list with running balance
        let currentBalance = bbf;
        const unified = currentTransactions.map(t => {
            currentBalance += (t.debit - t.credit);
            return { ...t, balance: currentBalance };
        });

        // 6. Add Opening Balance row if date filter exists or bbf != 0
        const result = [];
        if (start || bbf !== 0) {
            result.push({
                id: 'opening',
                date: start || (unified.length > 0 ? unified[0].date : new Date()),
                particulars: 'Opening Balance (B/F)',
                type: 'Opening',
                number: '-',
                debit: bbf > 0 ? Math.abs(bbf) : 0,
                credit: bbf < 0 ? Math.abs(bbf) : 0,
                balance: bbf,
                isOpening: true
            });
        }

        const finalTransactions = [...result, ...unified];

        return {
            unifiedTransactions: finalTransactions,
            totals: {
                debit: finalTransactions.reduce((sum, t) => sum + t.debit, 0),
                credit: finalTransactions.reduce((sum, t) => sum + t.credit, 0),
                balance: currentBalance
            }
        };
    }, [rawTransactions, dateRangeLabel, customRange, selectedParty]);

    const filteredParties = useMemo(() => {
        const q = partySearch.trim().toLowerCase();
        return parties.filter(p =>
            p.party_name.toLowerCase().includes(q) ||
            (p.phone_number && p.phone_number.includes(q))
        );
    }, [parties, partySearch]);

    if (isLoading && parties.length === 0) return <MainLoader />;

    return (
        <div className="flex h-[calc(100vh-100px)] mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl font-sans">
            {/* --- Left Sidebar: Party List --- */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/20">
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                        <DashboardBackButton showText={false} className="!p-1.5" />
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#129046]" />
                            Parties
                        </h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search party..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#129046]/20 focus:border-[#129046] transition-all"
                            value={partySearch}
                            onChange={(e) => setPartySearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredParties.length > 0 ? (
                        <div className="divide-y divide-gray-50/50">
                            {filteredParties.map(party => (
                                <button
                                    key={party.id}
                                    onClick={() => setSelectedParty(party)}
                                    className={`w-full text-left px-4 py-2.5 transition-all hover:bg-white flex items-center justify-between group border-l-4 ${selectedParty?.id === party.id
                                        ? 'bg-white border-l-[#129046] shadow-sm'
                                        : 'bg-transparent border-l-[#129046]/60 hover:bg-green-50/10'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${selectedParty?.id === party.id ? 'text-[#129046]' : 'text-gray-700'}`}>
                                            <span translate="no">{party.party_name}</span>
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate font-medium">
                                            {party.phone_number ? (
                                                <span translate="no">{party.phone_number}</span>
                                            ) : (
                                                <span>No contact</span>
                                            )}
                                        </p>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedParty?.id === party.id ? 'text-[#129046] translate-x-0.5' : 'text-gray-300 group-hover:translate-x-0.5'}`} />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-xs italic font-medium">
                            No parties found
                        </div>
                    )}
                </div>
            </div>

            {/* --- Main Content: Ledger View --- */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selectedParty ? (
                    <>
                        <div className="p-4 md:px-6 md:py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 translate="no" className="text-xl font-black text-gray-900 leading-tight">
                                    <span>{selectedParty.party_name}</span>
                                </h1>
                                <p className="text-[11px] text-gray-500 font-bold flex items-center gap-2 mt-0.5">
                                    <span className="px-1.5 py-0.5 bg-[#129046]/10 rounded text-[#129046] text-[9px] uppercase tracking-wider">
                                        Party Ledger
                                    </span>
                                    • <span translate="no">{selectedParty.phone_number || 'Contact Details N/A'}</span>
                                </p>
                            </div>

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
                                    onClick={handleDownloadPDF}
                                    title="Download PDF"
                                    className="p-2 text-gray-400 hover:text-[#129046] border border-gray-200 rounded-lg hover:bg-green-50/50 transition-all flex items-center justify-center shadow-sm"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleDownloadExcel}
                                    title="Download Excel"
                                    className="p-2 text-gray-400 hover:text-[#129046] border border-gray-200 rounded-lg hover:bg-green-50/50 transition-all flex items-center justify-center shadow-sm"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsDirectEntryOpen(true)}
                                    title="Add Direct Entry"
                                    className="p-2 text-white bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:shadow-md rounded-lg transition-all flex items-center justify-center shadow-sm active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                            <style>{`
                                @media print {
                                    @page {
                                        size: A4 portrait;
                                        margin: 0;
                                    }
                                    
                                    body {
                                        margin: 0;
                                        padding: 0;
                                    }
                                    
                                    .ledger-page {
                                        width: 210mm;
                                        height: 297mm;
                                        min-height: 297mm;
                                        max-height: 297mm;
                                        padding: 10mm;
                                        box-sizing: border-box;
                                        page-break-after: always;
                                        page-break-inside: avoid;
                                        overflow: hidden;
                                        background: white;
                                        position: relative;
                                    }
                                    
                                    .ledger-page:last-child {
                                        page-break-after: avoid;
                                    }
                                    
                                    .ledger-header {
                                        margin-bottom: 6mm;
                                        padding-bottom: 3mm;
                                    }
                                    
                                    .ledger-summary-cards {
                                        margin-bottom: 6mm;
                                    }
                                    
                                    table {
                                        page-break-inside: auto;
                                    }
                                    
                                    tr {
                                        page-break-inside: avoid;
                                        page-break-after: auto;
                                    }
                                    
                                    thead {
                                        display: table-header-group;
                                    }
                                    
                                    tfoot {
                                        display: table-footer-group;
                                    }
                                }
                                
                                .ledger-container {
                                    background: white;
                                    overflow-x: auto;
                                }
                                
                                table {
                                    table-layout: fixed;
                                    width: 100%;
                                }
                                
                                .ledger-page {
                                    width: 100%;
                                    max-width: 1150px;
                                    margin: 0 auto 20px auto;
                                    min-height: 297mm;
                                    padding: 12mm;
                                    box-sizing: border-box;
                                    background: white;
                                    position: relative;
                                    overflow: hidden;
                                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                                    border-radius: 8px;
                                }
                            `}</style>

                            <div ref={ledgerRef} className="ledger-container">
                                {(() => {
                                    // Split transactions into pages
                                    const ROWS_PER_PAGE = 18; // Adjusted for larger font size
                                    const pages = [];

                                    for (let i = 0; i < unifiedTransactions.length; i += ROWS_PER_PAGE) {
                                        const pageTransactions = unifiedTransactions.slice(i, i + ROWS_PER_PAGE);
                                        const isFirstPage = i === 0;
                                        const isLastPage = i + ROWS_PER_PAGE >= unifiedTransactions.length;

                                        pages.push(
                                            <div key={i} className="ledger-page">
                                                {/* Header Section - Only on first page */}
                                                {isFirstPage && (
                                                    <>
                                                        <div className="ledger-header mb-3 pb-2 border-b-2 border-gray-200">
                                                            <h1 className="text-lg font-black text-gray-900 mb-2">
                                                                LEDGER REPORT
                                                            </h1>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-[#129046] uppercase mb-1">Business Details</p>
                                                                    <p className="text-[11px] font-bold text-gray-900">{businessInfo?.business_name || 'My Business'}</p>
                                                                    <p className="text-[9px] text-gray-600">{businessInfo?.email || ''}</p>
                                                                    <p className="text-[9px] text-gray-600">{businessInfo?.phone_number || ''}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-[#129046] uppercase mb-1">Party Details</p>
                                                                    <p className="text-[11px] font-bold text-gray-900">{selectedParty.party_name}</p>
                                                                    <p className="text-[9px] text-gray-600">{selectedParty.phone_number || 'N/A'}</p>
                                                                    <p className="text-[9px] text-gray-600">Period: {dateRangeLabel}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Summary Cards - Only on first page */}
                                                        <div className="ledger-summary-cards grid grid-cols-3 gap-2 mb-3">
                                                            <div className={`p-2 rounded-lg shadow relative overflow-hidden border ${totals.balance >= 0
                                                                ? 'bg-orange-50 border-orange-100 text-orange-900'
                                                                : 'bg-green-50 border-green-100 text-green-900'
                                                                }`}>
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Net Settlement</p>
                                                                    <p className="text-sm font-black">{formatCurrency(Math.abs(totals.balance), currency)}</p>
                                                                </div>
                                                                <div className="mt-1">
                                                                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded-full ${totals.balance >= 0 ? 'bg-orange-200/50' : 'bg-green-200/50'
                                                                        }`}>
                                                                        {totals.balance >= 0 ? 'Receivable' : 'Payable'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-gradient-to-br from-[#129046] to-[#0d6e35] p-2 rounded-lg shadow text-white">
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/80 mb-0.5">Total Debit</p>
                                                                    <p className="text-sm font-black">{formatCurrency(totals.debit, currency)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[7px] font-bold text-white/60 mt-1">
                                                                    <Calculator className="w-2 h-2" />
                                                                    <span className="uppercase tracking-tight">Total Receivables</span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-2 rounded-lg shadow text-white">
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/80 mb-0.5">Total Credit</p>
                                                                    <p className="text-sm font-black">{formatCurrency(totals.credit, currency)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[7px] font-bold text-white/60 mt-1">
                                                                    <Calculator className="w-2 h-2" />
                                                                    <span className="uppercase tracking-tight">Total Payments</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Page number for continuation pages */}
                                                {!isFirstPage && (
                                                    <div className="mb-3 pb-2 border-b border-gray-200">
                                                        <p className="text-[10px] font-bold text-gray-600">
                                                            {selectedParty.party_name} - Ledger (Continued)
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Transactions Table */}
                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full text-[9px] table-fixed">
                                                        <thead className="bg-[#f1f5f9] text-[#475569] border-b border-gray-200">
                                                            <tr>
                                                                <th className="w-[3%] px-2 py-2 text-left font-bold uppercase tracking-wider text-[10px]">SR.NO</th>
                                                                <th className="w-[9%] px-2 py-2 text-left font-bold uppercase tracking-wider text-[10px]">DATE</th>
                                                                <th className="w-[21%] px-2 py-2 text-left font-bold uppercase tracking-wider text-[10px]">PARTICULARS</th>
                                                                <th className="w-[13%] px-2 py-2 text-left font-bold uppercase tracking-wider text-[10px]">VOUCHER TYPE</th>
                                                                <th className="w-[15%] px-2 py-2 text-left font-bold uppercase tracking-wider text-[10px]">VOUCHER NO</th>
                                                                <th className="w-[10%] px-2 py-2 text-right font-bold uppercase tracking-wider text-[10px]">DEBITS</th>
                                                                <th className="w-[10%] px-2 py-2 text-right font-bold uppercase tracking-wider text-[10px]">CREDIT</th>
                                                                <th className="w-[12%] px-2 py-2 text-right font-bold uppercase tracking-wider text-[10px]">BALANCE</th>
                                                                <th className="w-[7%] px-1 py-2 text-center font-bold uppercase tracking-wider text-[10px] print:hidden">ACTION</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {pageTransactions.map((tx, idx) => (
                                                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                                    <td className={`px-2 py-2 font-medium whitespace-nowrap text-[11px] ${tx.isOpening ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                                                                        {tx.isOpening ? '-' : i + idx + 1}
                                                                    </td>
                                                                    <td className={`px-2 py-2 font-medium whitespace-nowrap text-[11px] ${tx.isOpening ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                                                                        {formatDate(tx.date, language)}
                                                                    </td>
                                                                    <td className={`px-2 py-2 font-medium text-[11px] break-words ${tx.isOpening ? 'text-blue-600 font-bold italic' : 'text-gray-700'}`}>
                                                                        {tx.particulars}
                                                                    </td>
                                                                    <td className={`px-2 py-2 font-medium text-[11px] break-words ${tx.isOpening ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                                                                        {tx.type}
                                                                    </td>
                                                                    <td className={`px-2 py-2 font-bold text-[11px] break-words ${tx.isOpening ? 'text-blue-600' : 'text-gray-900'}`}>
                                                                        {tx.isOpening ? '-' : `#${tx.number || tx.id}`}
                                                                    </td>
                                                                    <td className={`px-2 py-2 text-right font-bold whitespace-nowrap text-[11px] ${tx.debit > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                                                                        {tx.debit > 0 ? formatCurrency(tx.debit, currency) : '-'}
                                                                    </td>
                                                                    <td className={`px-2 py-2 text-right font-bold whitespace-nowrap text-[11px] ${tx.credit > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                                                                        {tx.credit > 0 ? formatCurrency(tx.credit, currency) : '-'}
                                                                    </td>
                                                                    <td className={`px-2 py-2 text-right font-bold text-[11px] whitespace-nowrap text-gray-900`}>
                                                                        {formatCurrency(Math.abs(tx.balance), currency)}

                                                                    </td>
                                                                    <td className="px-1 py-2 text-center print:hidden">
                                                                        {!tx.isOpening && (
                                                                            <div className="flex items-center justify-center gap-1">
                                                                                <button
                                                                                    onClick={() => handleEditClick(tx)}
                                                                                    className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                                                    title="Edit Entry"
                                                                                >
                                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteClick(tx)}
                                                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                                                    title="Delete Entry"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        {/* Show footer only on last page */}
                                                        {isLastPage && (
                                                            <tfoot className="bg-[#0f172a] text-white font-bold border-t-2 border-gray-900">
                                                                <tr>
                                                                    <td colSpan={5} className="px-2 py-2.5 text-[11px] uppercase tracking-widest">
                                                                        TOTAL SUMMARY
                                                                    </td>
                                                                    <td className="px-2 py-2.5 text-right text-[12px] whitespace-nowrap">{formatCurrency(totals.debit, currency)}</td>
                                                                    <td className="px-2 py-2.5 text-right text-[12px] whitespace-nowrap">{formatCurrency(totals.credit, currency)}</td>
                                                                    <td className="px-2 py-2.5 text-right text-[12px] whitespace-nowrap">
                                                                        {formatCurrency(Math.abs(totals.balance), currency)}
                                                                        <span className="text-[7px] ml-0.5 opacity-80 uppercase font-black">
                                                                            {totals.balance >= 0 ? 'Dr' : 'Cr'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="print:hidden"></td>
                                                                </tr>
                                                            </tfoot>
                                                        )}
                                                    </table>
                                                </div>

                                                {/* Page number at bottom */}
                                                <div className="absolute bottom-[10mm] right-[15mm] text-[8px] text-gray-400">
                                                    Page {Math.floor(i / ROWS_PER_PAGE) + 1}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // If no transactions, show empty state
                                    if (unifiedTransactions.length === 0) {
                                        pages.push(
                                            <div key="empty" className="ledger-page">
                                                <div className="ledger-header mb-3 pb-2 border-b-2 border-gray-200">
                                                    <h1 className="text-lg font-black text-gray-900 mb-2">
                                                        LEDGER REPORT
                                                    </h1>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[9px] font-bold text-[#129046] uppercase mb-1">Business Details</p>
                                                            <p className="text-[11px] font-bold text-gray-900">{businessInfo?.business_name || 'My Business'}</p>
                                                            <p className="text-[9px] text-gray-600">{businessInfo?.email || ''}</p>
                                                            <p className="text-[9px] text-gray-600">{businessInfo?.phone_number || ''}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-bold text-[#129046] uppercase mb-1">Party Details</p>
                                                            <p className="text-[11px] font-bold text-gray-900">{selectedParty.party_name}</p>
                                                            <p className="text-[9px] text-gray-600">{selectedParty.phone_number || 'N/A'}</p>
                                                            <p className="text-[9px] text-gray-600">Period: {dateRangeLabel}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center py-20">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                                        <FileText className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-gray-400 font-medium italic text-sm">No transactions found for this period</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return pages;
                                })()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-[#129046] mb-6 shadow-xl shadow-green-100 animate-bounce">
                            <BackArrow className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">Select a Party</h2>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto font-medium font-sans">
                            Choose a party from the left sidebar to view their full transaction ledger and settlement history.
                        </p>
                    </div>
                )}
            </div>
            {/* Direct Entry Modal */}
            <AddLedgerEntryModel
                isOpen={isDirectEntryOpen}
                onClose={() => {
                    setIsDirectEntryOpen(false);
                    setEditEntryData(null);
                }}
                onSave={handleDirectEntrySave}
                parties={parties}
                selectedParty={selectedParty}
                editData={editEntryData}
                currency={currency}
            />
        </div>
    );
}
