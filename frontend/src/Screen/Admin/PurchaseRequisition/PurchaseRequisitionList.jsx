import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Mail,
  ChevronRight,
  RefreshCw,
  Paperclip,
  ChevronDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { purchaseRequisitionAPI } from '../../../utils/api';
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import PurchaseRequisitionForm from './PurchaseRequisitionForm';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import { showSuccessToast, showErrorToast } from "../../../Components/ActionMessageModel.jsx";
import Swal from 'sweetalert2';
import { formatCurrency, convertFromINR } from '../../../utils/currency.js';
import PRPdfFormat from '../../../Components/PDFFormat/PRPdfFormat.jsx';

const STATUS_OPTS = [
  { label: 'Show All', value: 'all' },
  { label: 'Show Pending', value: 'pending' },
  { label: 'Show Completed', value: 'completed' },
  { label: 'Show Rejected', value: 'rejected' },
];

const PurchaseRequisitionList = ({ currency, checkBusiness, }) => {

  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const mapToGRNData = (row) => {
    return {
      grn_number: row.id,
      supplier: row.partyName,
      date: row.date,
      advice_no: row.advice_no,
      order_no: row.purchase_order_number,
      location: row.delivery_location,
      cost_center: row.cost_center,
      items: row.products || [],
      terms: row.terms || [],
      remarks: row.remark,
      currency: currency,
      formType: "PR"
    };
  };

  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTS[0]);
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  // viewMode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [selectedPRId, setSelectedPRId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [prToDelete, setPrToDelete] = useState(null);

  useEffect(() => {
    fetchPRs();
    if (searchParams.get('mode') === 'create') {
      setSelectedPRId(null);
      setViewMode('create');
    }
  }, [searchParams]);

  const fetchPRs = async () => {
    try {
      setLoading(true);
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseRequisitionAPI.getAll(businessId);
      if (response.success) {
        setPrs(response.data);
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
      Swal.fire('Error', 'Failed to fetch Purchase Requisitions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (pr) => {
    setPrToDelete(pr);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!prToDelete) return;

    try {
      setLoading(true);
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseRequisitionAPI.delete(prToDelete.id, businessId);
      if (response.success) {
        showSuccessToast('Purchase Requisition deleted successfully');
        fetchPRs();
      }
    } catch (error) {
      console.error('Delete error:', error);
      showErrorToast('Failed to delete PR');
    } finally {
      setIsDeleteModalOpen(false);
      setPrToDelete(null);
      setLoading(false);
    }
  };

  const filteredPRs = useMemo(() => {
    return prs.filter(pr => {
      // Status Filter
      if (statusFilter.value !== 'all' && pr.status !== statusFilter.value) return false;

      // Search Filter
      const q = query.toLowerCase();
      if (q && !(
        pr.pr_number.toLowerCase().includes(q) ||
        pr.requester.toLowerCase().includes(q) ||
        pr.item_services.toLowerCase().includes(q) ||
        (pr.action_by_email && pr.action_by_email.toLowerCase().includes(q))
      )) return false;

      // Date Filter
      if (dateRangeLabel !== 'All Dates') {
        const prDate = new Date(pr.pr_date);
        const { start, end } = getRangeBoundsPure(dateRangeLabel, customRange) || {};
        if (start && prDate < new Date(start)) return false;
        if (end && prDate > new Date(end)) return false;
      }

      return true;
    });
  }, [prs, query, statusFilter, dateRangeLabel, customRange]);

  const handleSavePONumber = async (row, newPONumber) => {
    if (row.po_number === newPONumber) return;

    try {
      const businessId = localStorage.getItem('selectedBusinessId');

      // We use FormData because the update endpoint expects it (handling potential attachments)
      const submitData = new FormData();

      // Basic fields
      submitData.append('po_number', newPONumber);

      // We need to send other required fields for the update to succeed/not lose data
      // Backend updatePR usually spreads req.body, so we should provide enough context
      submitData.append('business_id', businessId);

      const res = await purchaseRequisitionAPI.update(row.id, submitData, businessId);
      if (res.success) {
        showSuccessToast(`PO Number updated for ${row.pr_number}`);
        fetchPRs();
      }
    } catch (error) {
      console.error('Error saving PO number:', error);
      showErrorToast('Failed to update PO number');
    }
  };

  const columns = [
    {
      title: 'PR Number',
      key: 'pr_number',
      sortable: true,
      render: (r) => <span className="font-bold text-gray-900" translate="no">{r.pr_number}</span>
    },
    {
      title: 'Date',
      key: 'pr_date',
      sortable: true,
      render: (r) => (
        <span className="text-gray-600">
          {new Date(r.pr_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      title: 'Requester',
      key: 'requester',
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px] font-bold">
            {r.requester.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-gray-700">{r.requester}</span>
        </div>
      )
    },
    {
      title: 'Item / Description',
      key: 'item_services',
      sortable: true,
      render: (r) => <p className="line-clamp-1 max-w-[200px]">{r.item_services}</p>
    },
    {
      title: 'Qty',
      key: 'qty',
      sortable: true,
      render: (r) => (
        <span translate="no">{r.qty} <span className="text-[10px] text-gray-400 uppercase">{r.uom}</span></span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (r) => {
        const styles = {
          completed: 'bg-green-50 text-green-700 border-green-200',
          rejected: 'bg-red-50 text-red-700 border-red-200',
          pending: 'bg-yellow-50 text-yellow-700 border-yellow-200'
        };
        return (
          <span className={`border px-2 py-0.5 rounded-full text-[11px] font-medium uppercase ${styles[r.status] || styles.pending}`} translate="no">
            {r.status}
          </span>
        );
      }
    },
    {
      title: 'Approval Progress',
      key: 'approved_by',
      render: (r) => {
        const approvedEmails = r.approved_by ? r.approved_by.split(',').filter(e => e.trim()) : [];
        const requiredLevels = [r.level1_email, r.level2_email, r.level3_email].filter(e => e);

        if (r.status === 'rejected') {
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                <AlertCircle size={12} /> REJECTED BY
              </span>
              <span className="text-[9px] text-gray-500 italic">{r.action_by_email}</span>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            {approvedEmails.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {approvedEmails.map((email, idx) => (
                  <span key={idx} className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded-md border border-green-100 flex items-center gap-1 font-medium" translate="no">
                    <CheckCircle size={11} className="text-green-500" /> <span translate="no">L{idx + 1}: {email.trim().split('@')[0]}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-[10px] flex items-center gap-1">
                <Clock size={11} /> No approvals yet
              </span>
            )}

            {r.status === 'pending' && requiredLevels.length > 0 && approvedEmails.length < requiredLevels.length && (
              <div className="flex justify-between items-center text-[9px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100" translate="no">
                <span translate="no">Progress: {approvedEmails.length}/{requiredLevels.length}</span>
                <span className="text-orange-500 font-bold" translate="no">Waiting for L{approvedEmails.length + 1}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'PO Number',
      key: 'po_number',
      render: (r) => {
        if (r.status !== 'completed') return <span className="text-gray-300 text-[10px] italic">Not Approved yet</span>;
        return (
          <div className="flex items-center gap-1 group">
            <input
              type="text"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              defaultValue={r.po_number}
              onBlur={(e) => handleSavePONumber(r, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePONumber(r, e.target.value);
                  e.target.blur();
                }
              }}
              className="w-32 px-2 py-1 text-[11px] font-bold border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-100 outline-none transition-all bg-white hover:border-green-300"
              placeholder="Assign PO#"
            />
            {r.po_number && (
              <CheckCircle2 size={14} className="text-green-500 opacity-0 group-focus-within:opacity-100 transition-opacity" />
            )}
          </div>
        );
      }
    }
  ];

  if (viewMode === 'edit') {
    return (
      <PurchaseRequisitionForm
        prId={selectedPRId}
        onClose={() => setViewMode('list')}
        onRefresh={fetchPRs}
        currency={currency}
      />
    );
  }
  if (viewMode === 'create') {
    return (
      <PurchaseRequisitionForm
        prId={null}
        onClose={() => setViewMode('list')}
        onRefresh={fetchPRs}
        currency={currency}
      />
    );
  }
  if (viewMode === 'preview' && previewData) {
    return <PRPdfFormat
      previewData={previewData}
      onBack={() => {
        setPreviewData(null);
        setViewMode('list');
      }}
    />;
  }


  return (
    <div className="custombackground w-full border-1 border-yellow-200 rounded-xl mt-4">
      {/* Header with Filters */}
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full flex flex-col md:flex-row md:items-center items-stretch gap-3 justify-end md:hidden">
          <div className="flex justify-between items-center w-full md:hidden mb-2">
            <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
            <button
              onClick={() => {
                setSelectedPRId(null);
                setViewMode('create');
              }}
              className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
            >
              <Plus size={18} />
              New
            </button>
          </div>
        </div>

        <div className="w-full flex-col md:flex-row md:flex hidden md:items-center items-stretch gap-3 justify-between">
          <DashboardBackButton />
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PR..."
                className="w-full md:w-48 h-8 pl-9 pr-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-all"
              />
            </div>

            <button
              onClick={() => navigate('/purchaseOrder')}
              className="hidden sm:flex items-center gap-2 px-4 h-9 text-[#005ea2] bg-[#f0f7ff] hover:bg-[#e0efff] border border-[#005ea2]/10 rounded-xl text-sm font-bold transition-all shadow-sm group"
              title="Go to Purchase Order Management"
            >
              <FileText size={18} className="text-[#005ea2]" />
              PO List
            </button>

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
                options={STATUS_OPTS}
                value={statusFilter.label}
                onChange={(opt) => setStatusFilter(opt)}
                placeholder="Status"
                className="w-32"
              />

              <button
                onClick={() => {
                  setSelectedPRId(null);
                  setViewMode('create');
                }}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
              >
                <Plus size={18} />
                New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section or Empty State */}
      {!loading && prs.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-b-xl border-t border-yellow-200">
          <GeneralEmptyState
            title="No Purchase Requisitions Found"
            description="You haven't created any purchase requisitions yet. Start by creating your first request."
            buttonText="Create First PR"
            onButtonClick={() => {
              setSelectedPRId(null);
              setViewMode('create');
            }}
            icon={FileText}
          />
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm">
          <ReusableTable
            columns={columns}
            data={filteredPRs}
            onEdit={(pr) => {
              setSelectedPRId(pr.id);
              setViewMode('edit');
            }}
            onDelete={handleDelete}
            isLoading={loading}
            onRowClick={async (row) => {
              try {
                const businessId = localStorage.getItem('selectedBusinessId');

                const res = await purchaseRequisitionAPI.getById(row.id, businessId);

                if (res.success) {
                  setPreviewData({
                    ...res.data,
                    formType: "PR"
                  });

                  setViewMode('preview');
                }
              } catch (err) {
                console.error("Preview fetch error:", err);
              }
            }}
            extraActions={(pr) => {
              let attachmentUrls = [];
              if (pr.attachment) {
                try {
                  const parsed = JSON.parse(pr.attachment);
                  attachmentUrls = Array.isArray(parsed) ? parsed : [pr.attachment];
                } catch (e) {
                  attachmentUrls = [pr.attachment];
                }
              }

              return attachmentUrls.length > 0 && (
                <div className="flex gap-1">
                  {attachmentUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url.startsWith('http') ? url : `${import.meta.env.VITE_BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all"
                      title={attachmentUrls.length > 1 ? `View Attachment ${idx + 1}` : "View Attachment"}
                    >
                      <Paperclip className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              );
            }}
          />
          {/* Scroll indicator */}
          <div className="sticky left-0 bottom-0 w-full py-2 bg-[#fdf8e4] border-t border-[#f1e6b9] text-center text-[11px] text-gray-600 font-bold">
            ← Scroll horizontally to see all fields →
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={prToDelete?.pr_number}
        itemType="Purchase Requisition"
        actionText="Delete"
        description={
          <>
            This action <strong>cannot</strong> be undone. This will permanently delete this Purchase Requisition and remove it from the database forever.
          </>
        }
      />
    </div>
  );
};

export default PurchaseRequisitionList;
