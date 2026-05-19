import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Search, Calendar, ChevronDown, FileText, Download, Trash2, Edit2, ArrowLeft, Image, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import MainLoader from '../../../Components/MainLoader.jsx';
import ActionButtons from '../../../Components/ActionButtons.jsx';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/dateFormat.js';
import { showSuccessToast, showErrorToast, showConfirmationDialog } from '../../../Components/ActionMessageModel.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import AddCustomerModel from './AddCustomerModel.jsx';
import AddTransactionModel from './AddTransactionModel.jsx';
import { zKhataAPI, businessAPI, getApiConfig } from '../../../utils/api.js';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import CustomPreviewDropdown from "../../../Components/CustomPreviewDropdown.jsx";
import TransactionHistoryPDF from './TransactionHistoryPDF.jsx';
import { generateKhataHistoryPDF } from '../../../utils/khataPdfGenerator.js';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
function StatusPill({ status }) {
    const map = {
        paid: 'bg-green-50 text-[#129046] border-green-200',
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };

    return (
        <span className={`border px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            <span>{(status || '').charAt(0).toUpperCase() + (status || '').slice(1)}</span>
        </span>
    );
}



export default function ZKhataBook({ currency, language = 'en-IN' }) {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [selectedParty, setSelectedParty] = useState(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [editParty, setEditParty] = useState(null);
    const [editTransaction, setEditTransaction] = useState(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteType, setDeleteType] = useState('party'); // 'party' or 'transaction'
    const [businessInfo, setBusinessInfo] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const [businessId, setBusinessId] = useState(localStorage.getItem('selectedBusinessId'));

    // Date range states for List View
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const bounds = useMemo(() => getRangeBoundsPure(dateRangeLabel, customRange), [dateRangeLabel, customRange]);

    // Date range states for Detail View
    const [detailDateRangeLabel, setDetailDateRangeLabel] = useState('All Dates');
    const [detailCustomRange, setDetailCustomRange] = useState({ from: '', to: '' });
    const detailBounds = useMemo(() => getRangeBoundsPure(detailDateRangeLabel, detailCustomRange), [detailDateRangeLabel, detailCustomRange]);

    useEffect(() => {
        const handleBusinessChange = (event) => {
            const { businessId: newId } = event.detail;
            if (newId && newId !== businessId) {
                setBusinessId(newId);
                setViewMode('list');
                setSelectedParty(null);
                setTransactions([]);
            }
        };

        window.addEventListener('businessChanged', handleBusinessChange);
        return () => window.removeEventListener('businessChanged', handleBusinessChange);
    }, [businessId]);

    const formatCurrencyDisplay = (v) => formatCurrency(v, currency);

    const fetchParties = async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const response = await zKhataAPI.getAllParties(businessId, 'all');
            if (response.success) {
                setRows(response.data);
            }
        } catch (error) {
            console.error('Error fetching parties:', error);
            showErrorToast('Failed to fetch parties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParties();
        if (businessId) {
            businessAPI.getById(businessId).then(res => {
                if (res.success) setBusinessInfo(res.data);
            });
        }
    }, [businessId]);

    const fetchTransactions = async (partyId) => {
        if (!businessId || !partyId) return;
        setTransactionsLoading(true);
        try {
            const response = await zKhataAPI.getTransactionsForParty(partyId, businessId);
            if (response.success) {
                setTransactions(response.data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showErrorToast('Failed to fetch transactions');
        } finally {
            setTransactionsLoading(false);
        }
    };




    const handleSaveParty = async (partyData) => {
        try {
            let response;
            if (editParty) {
                response = await zKhataAPI.updateParty(editParty.id, {
                    ...partyData,
                    business_id: businessId
                });
            } else {
                response = await zKhataAPI.createParty({
                    ...partyData,
                    business_id: businessId
                });
            }

            if (response.success) {
                showSuccessToast(editParty ? 'Party updated successfully' : 'Party added successfully');
                setIsAddModalOpen(false);
                setEditParty(null);
                fetchParties();
            } else {
                // Check if it's a duplicate number error
                if (response.code === 'DUPLICATE_NUMBER') {
                    const error = new Error(response.message);
                    error.code = 'DUPLICATE_NUMBER';
                    error.field = 'entry_number';
                    throw error;
                }
                throw new Error(response.message || 'Failed to save party');
            }
        } catch (error) {
            console.error('Error saving party:', error);
            // Re-throw error so form can handle it
            throw error;
        }
    };

    const handleDeleteParty = (row) => {
        setItemToDelete(row);
        setDeleteType('party');
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete || !businessId) return;

        try {
            if (deleteType === 'party') {
                const response = await zKhataAPI.deleteParty(itemToDelete.id, businessId);
                if (response.success) {
                    showSuccessToast('Party deleted successfully!');
                    fetchParties();
                }
            } else {
                const response = await zKhataAPI.deleteTransaction(itemToDelete.id, businessId);
                if (response.success) {
                    showSuccessToast('Transaction deleted successfully!');
                    fetchTransactions(selectedParty.id);
                }
            }
            setDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(`Error deleting ${deleteType}:`, error);
            showErrorToast(`Failed to delete ${deleteType}`);
        }
    };


    const handleEditParty = (row) => {
        setEditParty(row);
        setIsAddModalOpen(true);
    };



    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

        return rows.filter((r) => {
            let dateOk = true;
            if (bounds && (bounds.start || bounds.end)) {
                // Parse the row date as a local date (YYYY-MM-DD + T00:00:00)
                const d = new Date((r.created_at || r.date).split('T')[0] + 'T00:00:00');
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
                (r.phone_number && r.phone_number.toLowerCase().includes(q)) ||
                (r.entry_number && r.entry_number.toLowerCase().includes(q)) ||
                (r.id && r.id.toString().toLowerCase().includes(q));
            return dateOk && matchSearch;
        });
    }, [rows, query, dateRangeLabel, customRange]);

    const columns = [
        {
            key: 'entry_number',
            title: 'Entry Number',
            sortable: true,
            render: (r) => <span>{r.entry_number || `#${r.id}`}</span>
        },
        {
            key: 'party_name',
            title: 'Party Name',
            sortable: true
        },
        {
            key: 'phone_number',
            title: 'Mobile',
            sortable: true,
            render: (r) => {
                const phone = r.phone_number || '';
                if (phone.includes(' ')) {
                    const [code, ...rest] = phone.split(' ');
                    return <span className="text-sm text-gray-600">{`(${code}) ${rest.join(' ')}`}</span>;
                }
                return <span className="text-sm text-gray-600">{phone || '-'}</span>;
            }
        },
        {
            key: 'created_at',
            title: 'Date',
            sortable: true,
            render: (r) => formatDate(r.created_at, language)
        },
        {
            key: 'updated_at',
            title: 'Updated Date',
            sortable: true,
            render: (r) => formatDate(r.updated_at || r.created_at, language)
        },
        {
            key: 'balance',
            title: 'Current Balance',
            sortable: true,
            render: (r) => {
                const opening = Number(r.opening_balance || 0);
                const isOpeningIn = r.balance_type === 'Money In';

                // Net balance = (Opening In - Opening Out) + (Total In - Total Out)
                // In our case, opening balance is absolute with a type.
                const netOpening = isOpeningIn ? opening : -opening;
                const netTransactions = Number(r.total_in || 0) - Number(r.total_out || 0);
                const finalBalance = netOpening + netTransactions;

                return (
                    <span className={`font-bold ${finalBalance >= 0 ? 'text-[#129046]' : 'text-red-600'}`}>
                        {formatCurrencyDisplay(Math.abs(finalBalance))}
                        <span className="text-[10px] ml-1 font-medium italic">
                            {finalBalance >= 0 ? '(Credit)' : '(Debit)'}
                        </span>
                    </span>
                );
            }
        },
        {
            key: 'action',
            title: 'Action',
            render: (r) => (
                <ActionButtons
                    actions={['edit', 'delete']}
                    onEdit={(e) => {
                        e.stopPropagation();
                        handleEditParty(r);
                    }}
                    onDelete={(e) => {
                        e.stopPropagation();
                        handleDeleteParty(r);
                    }}
                />
            )
        }
    ];




    const handleTransactionSave = async (txData) => {
        try {
            let response;
            if (editTransaction) {
                response = await zKhataAPI.updateTransaction(editTransaction.id, {
                    ...txData,
                    business_id: businessId
                });
            } else {
                response = await zKhataAPI.addTransaction({
                    ...txData,
                    business_id: businessId,
                    party_id: selectedParty.id
                });
            }

            if (response.success) {
                showSuccessToast(editTransaction ? 'Transaction updated successfully' : 'Transaction recorded successfully');
                setIsTransactionModalOpen(false);
                setEditTransaction(null);
                fetchTransactions(selectedParty.id);
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            showErrorToast('Failed to save transaction');
        }
    };

    const handleEditTransaction = (tx) => {
        setEditTransaction(tx);
        setIsTransactionModalOpen(true);
    };

    const handleDeleteTransaction = (tx) => {
        setItemToDelete(tx);
        setDeleteType('transaction');
        setDeleteModalOpen(true);
    };

    const handleRowClick = (row) => {
        setSelectedParty(row);
        setViewMode('detail');
        fetchTransactions(row.id);
    };
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (!detailBounds || !detailBounds.start || !detailBounds.end) return true;

            const date = new Date(t.date || t.created_at);
            date.setHours(0, 0, 0, 0);

            const start = new Date(detailBounds.start);
            const end = new Date(detailBounds.end);
            end.setHours(23, 59, 59, 999);

            return date >= start && date <= end;
        });
    }, [transactions, detailBounds]);
    const handleDownloadPDF = async () => {
        setIsPdfLoading(true);
        try {
            await generateKhataHistoryPDF({
                party: selectedParty,
                transactions: filteredTransactions, // ✅ FIXED
                businessInfo: businessInfo,
                currency: currency,
                language: language
            });
        } catch (error) {
            console.error('PDF Generation Error:', error);
            showErrorToast('Failed to generate professional PDF');
        } finally {
            setIsPdfLoading(false);
        }
    };

    if (loading) return <MainLoader />;

    return (
        <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
            {viewMode === 'detail' && selectedParty ? (
                // Detail View UI
                <div className="flex flex-col min-h-screen">
                    {/* Desktop Header */}
                    <div className="hidden md:flex items-center justify-between pt-4 pb-3 px-4 border-b border-yellow-200 bg-white rounded-b-xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setViewMode('list');
                                    setSelectedParty(null);
                                }}
                                className="group p-2 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-yellow-900 group-hover:text-green-700" />
                            </button>
                            <h2 translate="no" className="text-xl font-bold text-yellow-900">
                                <span>{selectedParty.party_name}</span>
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="px-4 py-2 bg-[#129046] hover:bg-[#129046]/90 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New Entry</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="md:hidden bg-white border-b border-yellow-200 px-4 py-3 flex items-center justify-between rounded-b-xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setViewMode('list');
                                    setSelectedParty(null);
                                }}
                                className="group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
                            >
                                <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                            </button>
                            <div>
                                <h1 translate="no" className="text-base font-bold text-yellow-900 truncate max-w-[200px]">
                                    <span>{selectedParty.party_name}</span>
                                </h1>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsTransactionModalOpen(true)}
                            className="p-2 bg-[#129046] text-white rounded-lg shadow-sm active:scale-95 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto md:pb-0 pb-20 mt-2 px-2 sm:px-4">
                        <div className="flex-1 flex flex-col border-1 border-yellow-200 rounded-lg bg-gray-50 min-h-[80vh]">
                            {/* Header / Tabs Placeholder */}
                            <div className="flex items-center justify-between border-b border-gray-200 bg-white rounded-t-lg px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-bold text-yellow-900 uppercase tracking-wider">Transaction History</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Date_wise_Filter_Button
                                        dateRangeLabel={detailDateRangeLabel}
                                        onRangeChange={(label) => setDetailDateRangeLabel(label)}
                                        customRange={detailCustomRange}
                                        onRangeApply={(range) => {
                                            setDetailCustomRange(range);
                                            setDetailDateRangeLabel("Custom Date Range");
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                                <div className="space-y-4">
                                    {/* Summary Cards */}
                                    {(() => {
                                        const filteredTxs = transactions.filter(t => {
                                            if (!detailBounds || !detailBounds.start || !detailBounds.end) return true;
                                            const date = new Date(t.date || t.created_at);
                                            date.setHours(0, 0, 0, 0);
                                            return date >= detailBounds.start && date <= detailBounds.end;
                                        });
                                        const totalIn = filteredTxs.filter(t => t.type === 'payment_in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                        const totalOut = filteredTxs.filter(t => t.type === 'payment_out').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                        const netBalance = totalIn - totalOut;
                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2"><span>Money In</span></p>
                                                    <p translate="no" className="text-xl font-black text-[#129046]"><span>{formatCurrencyDisplay(totalIn)}</span></p>
                                                </div>
                                                <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2"><span>Money Out</span></p>
                                                    <p translate="no" className="text-xl font-black text-red-600"><span>{formatCurrencyDisplay(totalOut)}</span></p>
                                                </div>
                                                <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2"><span>Net Balance</span></p>
                                                    <p translate="no" className={`text-xl font-black ${netBalance >= 0 ? 'text-[#129046]' : 'text-red-600'}`}>
                                                        <span>{formatCurrencyDisplay(Math.abs(netBalance))}</span>
                                                        <span className="text-xs ml-1 font-bold"><span>{netBalance >= 0 ? '(Credit)' : '(Debit)'}</span></span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Transactions Table */}
                                    <div className="bg-white border-1 border-yellow-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                                            {(() => {
                                                const filteredTxs = transactions.filter(t => {
                                                    if (!detailBounds || !detailBounds.start || !detailBounds.end) return true;
                                                    const date = new Date(t.date || t.created_at);
                                                    date.setHours(0, 0, 0, 0);
                                                    return date >= detailBounds.start && date <= detailBounds.end;
                                                });
                                                return <p className="text-sm font-semibold text-gray-700">Entries: {filteredTxs.length}</p>;
                                            })()}
                                            <button
                                                onClick={handleDownloadPDF}
                                                disabled={isPdfLoading}
                                                className="px-4 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-70"
                                            >
                                                {isPdfLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                                <span>{isPdfLoading ? 'Generating...' : 'Download PDF'}</span>
                                            </button>
                                        </div>
                                        {transactionsLoading ? (
                                            <div className="p-8 text-center text-gray-400">Loading transactions...</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Description</th>
                                                            <th className="px-4 py-2 text-right font-semibold text-gray-700">Money Out</th>
                                                            <th className="px-4 py-2 text-right font-semibold text-gray-700">Money In</th>
                                                            <th className="px-4 py-2 text-center font-semibold text-gray-700">Attachment</th>
                                                            <th className="px-4 py-2 text-center font-semibold text-gray-700">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {transactions.filter(t => {
                                                            if (!detailBounds || !detailBounds.start || !detailBounds.end) return true;
                                                            const date = new Date(t.date || t.created_at);
                                                            date.setHours(0, 0, 0, 0);
                                                            return date >= detailBounds.start && date <= detailBounds.end;
                                                        }).map((t) => (
                                                            <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${t.is_opening_balance ? 'bg-blue-50/30' : ''}`}>
                                                                <td className="px-4 py-2 text-gray-800 font-medium">{formatDate(t.date || t.created_at, language)}</td>
                                                                <td className="px-4 py-2 text-gray-700">
                                                                    <div className="flex flex-col">
                                                                        <span className={`transition-colors ${t.is_opening_balance ? 'font-black text-gray-800' : 'text-gray-800 font-medium'}`}>
                                                                            {t.description || (t.is_opening_balance ? 'Opening Balance' : 'No description')}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-semibold text-red-600">
                                                                    {t.type === 'payment_out' ? formatCurrencyDisplay(Number(t.amount)) : '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-semibold text-green-600">
                                                                    {t.type === 'payment_in' ? formatCurrencyDisplay(Number(t.amount)) : '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-center">
                                                                    {t.image_url ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                const fullUrl = t.image_url.startsWith('http') ? t.image_url : `${getApiConfig().backendURL}${t.image_url}`;
                                                                                setSelectedImage(fullUrl);
                                                                                setShowImageModal(true);
                                                                            }}
                                                                            className="p-1 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-tight"
                                                                        >
                                                                            <Paperclip className="w-3.5 h-3.5" />
                                                                            <span>View</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-xs font-semibold">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2 text-center">
                                                                    {!t.is_opening_balance ? (
                                                                        <ActionButtons
                                                                            actions={['edit', 'delete']}
                                                                            onEdit={(e) => {
                                                                                e.stopPropagation();
                                                                                handleEditTransaction(t);
                                                                            }}
                                                                            onDelete={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteTransaction(t);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">System Entry</span>
                                                                            <span className="text-[9px] text-gray-300">Non-editable</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // List View UI
                <>
                    <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="hidden md:block">
                                <DashboardBackButton />
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="md:hidden flex items-center justify-between w-full mb-3">
                                    <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                    >
                                        <Plus size={16} /> <span>New</span>
                                    </button>
                                </div>

                                <div className="flex-1 sm:flex-initial">
                                    <input
                                        type="text"
                                        placeholder="Search by name or mobile..."
                                        className="w-full sm:w-64 h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors bg-white/50 focus:bg-white"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        aria-label="Search"
                                    />
                                </div>

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

                                    <div className="hidden md:block">
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                            aria-label="Create new"
                                        >
                                            <Plus size={18} />
                                            <span>New</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!loading && rows.length === 0 && (
                        <GeneralEmptyState
                            title="No Entries Found"
                            description="Start by adding your first entry to the Khata book."
                            buttonText="Add First Entry"
                            onButtonClick={() => setIsAddModalOpen(true)}
                            icon={FileText}
                        />
                    )}

                    {rows.length > 0 && (
                        <div className="">
                            <ReusableTable
                                columns={columns}
                                data={filtered}
                                rowKey={(r) => r.id}
                                initialPageSize={10}
                                onRowClick={handleRowClick}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Modals are always rendered at the bottom */}
            <AddCustomerModel
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditParty(null);
                }}
                onSave={handleSaveParty}
                editData={editParty}
                currency={currency}
                language={language}
            />

            <AddTransactionModel
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setEditTransaction(null);
                }}
                onSave={handleTransactionSave}
                editData={editTransaction}
                currency={currency}
                language={language}
            />

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName={deleteType === 'party' ? (itemToDelete?.party_name || "") : (itemToDelete?.description || "Transaction")}
                itemType={deleteType === 'party' ? 'party' : 'transaction'}
            />

            {/* Image/File Preview Modal */}
            {showImageModal && selectedImage && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
                    <div
                        className="relative w-full h-screen flex items-center justify-center p-4"
                        onWheel={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                const imgElement = document.getElementById('modal-image');
                                if (imgElement) {
                                    const currentScale = parseFloat(imgElement.dataset.scale || 1);
                                    const newScale = e.deltaY > 0 ? Math.max(0.5, currentScale - 0.1) : Math.min(3, currentScale + 0.1);
                                    imgElement.dataset.scale = newScale;
                                    imgElement.style.transform = `scale(${newScale})`;
                                }
                            }
                        }}
                    >
                        <button
                            onClick={() => {
                                setShowImageModal(false);
                                setSelectedImage(null);
                            }}
                            className="absolute top-8 right-8 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center z-10 transition-all shadow-lg font-bold"
                        >
                            <span className="text-3xl leading-none font-light">×</span>
                        </button>

                        {(() => {
                            const isPdf = selectedImage.toLowerCase().split('?')[0].endsWith('.pdf');
                            const isWord = selectedImage.toLowerCase().split('?')[0].endsWith('.doc') || selectedImage.toLowerCase().split('?')[0].endsWith('.docx');
                            const isExcel = selectedImage.toLowerCase().split('?')[0].endsWith('.xls') || selectedImage.toLowerCase().split('?')[0].endsWith('.xlsx');
                            
                            if (isPdf) {
                                return (
                                    <iframe
                                        src={selectedImage}
                                        title="PDF Viewer"
                                        className="w-full max-w-4xl h-[85vh] bg-white rounded-lg shadow-xl"
                                    />
                                );
                            } else if (isWord || isExcel || !/\.(jpg|jpeg|png|gif|webp|jfif|svg|bmp|tiff|avif)($|\?)/i.test(selectedImage)) {
                                const fileName = selectedImage.split('/').pop() || 'document';
                                return (
                                    <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full border border-gray-100">
                                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg max-w-full truncate px-4">{decodeURIComponent(fileName)}</h3>
                                        <p className="text-gray-500 text-xs uppercase font-semibold">
                                            {isWord ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : 'Attachment File'}
                                        </p>
                                        <a
                                            href={selectedImage}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 px-6 py-2.5 bg-[#129046] hover:bg-[#129046]/90 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
                                        >
                                            Download Attachment
                                        </a>
                                    </div>
                                );
                            } else {
                                return (
                                    <img
                                        id="modal-image"
                                        src={selectedImage}
                                        alt="Screenshot Preview"
                                        data-scale="1"
                                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                                    />
                                );
                            }
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
