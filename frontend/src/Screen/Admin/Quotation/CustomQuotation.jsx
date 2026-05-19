import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    ChevronDown,
    Filter,
    FileText,
    Edit2,
    Trash2,
    Eye,
    ArrowLeft,
    Download
} from 'lucide-react';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import MainLoader from '../../../Components/MainLoader.jsx';
import api from '../../../utils/api';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/dateFormat.js';
import { showSuccessToast, showErrorToast } from '../../../Components/ActionMessageModel.jsx';
 import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
 import CustomQuotationForm from './CustomQuotationForm.jsx';
 import CustomQuotationPreview from './CustomQuotationPreview.jsx';
 import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';

const { quotationAPI, businessAPI, partyAPI, termsConditionsAPI, customQuotationAPI, getApiConfig } = api;

const STATUS_OPTS = [
    { label: 'Show All', value: 'all' },
    { label: 'Show Open', value: 'open' },
    { label: 'Show Closed', value: 'closed' },
];

const DUMMY_DATA = [
    {
        id: "CQ-2024-001",
        dbId: 101,
        date: "2024-03-15T10:30:00Z",
        companyName: "Acme Industries",
        email: "contact@acme.com",
        phone: "+91 99999 88888",
        status: "open"
    },
    {
        id: "CQ-2024-002",
        dbId: 102,
        date: "2024-03-18T14:45:00Z",
        companyName: "Global Solutions Ltd",
        email: "info@globalsolutions.com",
        phone: "+91 77777 66666",
        status: "closed"
    },
    {
        id: "CQ-2024-003",
        dbId: 103,
        date: "2024-03-20T09:15:00Z",
        companyName: "TechNova Enterprises",
        email: "support@technova.in",
        phone: "+91 88888 77777",
        status: "open"
    }
];

const CustomQuotation = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit', 'preview'
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const businessId = localStorage.getItem("selectedBusinessId") || "1";

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const response = await customQuotationAPI.getByBusinessId(businessId);
            if (response.success) {
                setRows(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching custom quotations:", error);
            showErrorToast("Failed to fetch custom quotations");
        } finally {
            setLoading(false);
        }
    };

    const [query, setQuery] = useState('');
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [status, setStatus] = useState(STATUS_OPTS[0]);
    const [editingData, setEditingData] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [previewItem, setPreviewItem] = useState(null);

    useEffect(() => {
        fetchQuotations();
    }, [businessId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

        return rows.filter((r) => {
            let dateOk = true;
            if (bounds && (bounds.start || bounds.end)) {
                const d = new Date(String(r.quotation_date).split('T')[0] + 'T00:00:00');
                const s = bounds.start ? new Date(bounds.start) : null;
                const e = bounds.end ? new Date(bounds.end) : null;
                if (s) s.setHours(0, 0, 0, 0);
                if (e) e.setHours(23, 59, 59, 999);

                if (s && e) dateOk = d >= s && d <= e;
                else if (s) dateOk = d >= s;
                else if (e) dateOk = d <= e;
            }
            const matchStatus = status.value === 'all' ? true : r.status === status.value;
            const matchSearch = !q ||
                r.business_name?.toLowerCase().includes(q) ||
                r.company_name?.toLowerCase().includes(q) ||
                r.quotation_number?.toLowerCase().includes(q) ||
                r.company_email?.toLowerCase().includes(q) ||
                r.company_phone?.toLowerCase().includes(q);

            return dateOk && matchStatus && matchSearch;
        });
    }, [rows, query, status, dateRangeLabel, customRange]);

    const columns = [
        { key: 'quotation_number', title: 'Quotation#', sortable: true },
        { key: 'quotation_date', title: 'Date', sortable: true, render: (r) => formatDate(r.quotation_date) },
        { key: 'business_name', title: 'Company Name', sortable: true },
        { key: 'company_email', title: 'Proposal For', sortable: true },
        { key: 'company_phone', title: 'Contact / Email', sortable: true },
        { key: 'company_name', title: 'Prepared By', sortable: true }
    ];

    const handleEditClick = (row) => {
        setEditingData(row);
        setViewMode('edit');
    };

    const handleDeleteClick = (row) => {
        setItemToDelete(row);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const response = await customQuotationAPI.delete(itemToDelete.id);
            if (response.success) {
                showSuccessToast(`${itemToDelete.quotation_number || 'Custom Quotation'} deleted successfully`);
                fetchQuotations();
            }
            setDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            showErrorToast('Failed to delete quotation');
        }
    };

    if (viewMode === 'preview' && previewItem) {
        return (
            <CustomQuotationPreview
                quotation={previewItem}
                onBack={() => { setViewMode('list'); setPreviewItem(null); }}
            />
        );
    }

    if (viewMode === 'create' || viewMode === 'edit') {
        return (
            <CustomQuotationForm
                onBack={() => { setViewMode('list'); setEditingData(null); }}
                formType="custom"
                initialData={editingData}
                onSave={() => {
                    fetchQuotations();
                    setEditingData(null);
                    setViewMode('list');
                }}
                formTitle={viewMode === 'edit' ? "Update Custom Proposal" : "Create Custom Proposal"}
            />
        );
    }

    if (loading) return <MainLoader message="Loading Custom Proposals..." />;

    return (
        <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
            <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
                <div className="w-full">
                    {/* Mobile Layout - Right aligned */}
                    <div className="md:hidden flex flex-col space-y-3">
                        <div className="flex items-center justify-between w-full">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 px-2 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0 !text-[10px]"
                                title="Back"
                            >
                                <ArrowLeft className="w-3 h-3 text-yellow-900 group-hover:text-green-700" />
                                <span className="text-[10px] font-semibold text-yellow-900 group-hover:text-green-700">Back to Dashboard</span>
                            </button>
                            <button
                                onClick={() => setViewMode('create')}
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
                            placeholder="Search by Name"
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
                        </div>
                    </div>

                    {/* Desktop Layout - Between aligned */}
                    <div className="hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group flex items-center gap-2 px-3 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                            <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back to Dashboard</span>
                        </button>
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

                            <button
                                onClick={() => setViewMode('create')}
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

            {/* List Content */}
            <div className="">
                {!loading && rows.length === 0 ? (
                    <GeneralEmptyState
                        title="No Custom Quotations Found"
                        description="You haven't created any custom quotations yet. Start by creating your first custom quotation to manage professional quotes."
                        buttonText="Create First Custom Quotation"
                        onButtonClick={() => setViewMode('create')}
                        icon={FileText}
                    />
                ) : (
                    <ReusableTable
                        columns={columns}
                        data={filtered}
                        onSearch={setQuery}
                        loading={loading}
                        onRowClick={(row) => { setPreviewItem(row); setViewMode('preview'); }}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        rowKey="id"
                    />
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Custom Quotation"
                itemName={itemToDelete?.quotation_number}
                itemType="quotation"
            />
        </div>
    );
};

const statusOptions = STATUS_OPTS.map((o, i) => ({ id: o.value, label: o.label, value: o.value }));

export default CustomQuotation;
