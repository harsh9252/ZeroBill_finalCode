import React, { useMemo, useState, useEffect } from 'react';
// import 'sweetalert2/dist/sweetalert2.min.css'; 
import { FileText, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import MRNForm from './MRNCreateForm.jsx';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import MainLoader from '../../../Components/MainLoader.jsx';
import { formatCurrency, convertFromINR } from '../../../utils/currency.js';
import { formatDate } from '../../../utils/dateFormat.js';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api.js';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import GrnmrnPDFFormat from '../../../Components/PDFFormat/grnmrnPDFFormat.jsx';
const { businessAPI, mrnAPI } = api;
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
      {(status || '').charAt(0).toUpperCase() + (status || '').slice(1)}
    </span>
  );
}
export default function MRN({ currency, checkBusiness }) {
  const [previewData, setPreviewData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const mapToGRNData = (row) => {
    return {
      mrn_number: row.id,
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
      formType: "MRN"
    };
  };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      // Save to localStorage as backup
      localStorage.setItem('mrnViewMode', mode);
      return mode;
    }
    // Try to restore from localStorage if URL doesn't have mode
    const savedMode = localStorage.getItem('mrnViewMode');
    return savedMode || 'list';
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(viewMode === 'list' || viewMode === 'edit');
  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState(STATUS_OPTS[0]); // default to 'Show Open Quotation'
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  const [editingRow, setEditingRow] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);



  // Use editingRow.initialData directly - the key prop on MRNForm  handles remounting
  const memoizedInitialData = editingRow?.initialData ?? {};

  const statusOptions = useMemo(() => {
    return STATUS_OPTS.map((o, i) => ({ id: o.value ?? `s-${i}`, label: o.label, value: o.value }));
  }, []);

  //  Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('mrnViewMode', mode);

      // If entering create mode, reset loading to false immediately
      if (mode === 'create') {
        setLoading(false);
      }

      // If entering edit mode, restore editingRow from localStorage
      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingMRNRow');
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
      localStorage.removeItem('mrnViewMode');
      // Loading remains true until list is fetched by the other useEffect
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

  // Track selected business ID for refetching
  const [currentBusinessId, setCurrentBusinessId] = useState(localStorage.getItem("selectedBusinessId"));

  // Listen for business changes
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {
        setCurrentBusinessId(newBusinessId);

        // Load new business data
        businessAPI.getById(newBusinessId).then(response => {
          if (response.success) setBusinessData(response.data);
        }).catch(console.error);

        // Reset to list view
        setViewMode('list');
        setPreviewData(null);
        navigate('/MRN');
        setRows([]);
      }
    };

    window.addEventListener('storage', handleBusinessChange);
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, [currentBusinessId, viewMode]);

  // Load MRN records from API
  useEffect(() => {
    const loadMRNs = async () => {
      const businessId = localStorage.getItem("selectedBusinessId");
      if (!businessId) return;

      try {
        setLoading(true);
        const response = await mrnAPI.getAll(businessId);
        // console.log("responseeee", response.data);
        response.data.forEach((item) => {
          console.log('responseeee', item.id);
        });
        if (response.success) {
          // Map backend fields to what the frontend expects in the table
          const mappedRows = response.data.map(r => {
            const dbId = r.id || r.Id || r.ID;
            const mrnNumber = r.mrn_number || r.mrn_no || 'N/A';
            
            return {
              id: mrnNumber, // Display ID
              dbId: dbId,    // Database ID
              date: r.mrn_date || r.date,
              advice_no: r.advice_no,
              partyName: r.party_name || 'N/A',
              party_id: r.party_id,
              bill_to_address_id: r.bill_to_address_id,
              amount: r.totals?.finalAmount || r.totals?.grandTotal || 0,
              status: 'open',
              updatedDate: r.updated_at,
              business_id: r.business_id,
              purchase_order_number: r.purchase_order_number,
              delivery_location: r.delivery_location,
              cost_center: r.cost_center,
              remark: r.remark,
              notes: r.notes,
              products: r.products,
              terms: r.terms,
              totals: r.totals,
            };
          });
          setRows(mappedRows);
        }
      } catch (error) {
        console.error('Error loading MRNs:', error);
        showErrorToast('Failed to load MRN records');
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'list') {
      loadMRNs();
    }
  }, [viewMode, currentBusinessId]);


  console.log("rows ==============>", rows);
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
      const mrnNumberStr = r.id ? String(r.id).toLowerCase() : '';
      const matchSearch = !q || partyName.includes(q) || mrnNumberStr.includes(q);
      return dateOk && matchStatus && matchSearch;
    });

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const A = sort.key === 'date' || sort.key === 'dueDate' || sort.key === 'mrn_number' ? new Date(a[sort.key]) : a[sort.key];
      const B = sort.key === 'date' || sort.key === 'dueDate' || sort.key === 'mrn_number' ? new Date(b[sort.key]) : b[sort.key];

      if (sort.key === 'amount') return (A - B) * dir;
      if (sort.key === 'date' || sort.key === 'dueDate' || sort.key === 'mrn_number') return (A - B) * dir;

      return String(A).localeCompare(String(B)) * dir;
    });
    console.log('########', list)
    return list;
  }, [rows, dateRangeLabel, customRange, query, status, sort]);


  // Navigate to create view
  const handleCreateClick = () => {
    checkBusiness(() => {
      setEditingRow(null);
      setLoading(false);
      navigate('/MRN?mode=create', { replace: true });
    });
  };

  // Handle save for CREATE
  const handleFormSaveForCreate = async (invoice) => {
    try {
      showLoadingModal('Saving MRN...');
      const response = await mrnAPI.create(invoice);
      closeModal();

      if (response.success) {
        showSuccessToast(`MRN ${response.data?.mrn_number || ''} saved successfully`);
        setViewMode('list');
        localStorage.removeItem('mrnViewMode');
        navigate('/MRN');
      } else {
        showErrorToast(response.message || 'Failed to save MRN');
      }
    } catch (err) {
      closeModal();
      console.error('Error saving MRN:', err);
      throw err;
    }
  };

  // Navigate to edit view
  const handleEditClick = (row) => {
    // Normalize products: map 'name' to 'description' for the form
    const normalizedLines = (row.products || []).map((ln, i) => ({
      id: ln.id || `ln-${i}-${Date.now()}`,
      description: ln.description || ln.name || '',
      name: ln.name || ln.description || '',
      subtitle: ln.subtitle || '',
      qty: ln.qty || ln.quantity || 1,
      deliveredQty: ln.deliveredQty || 0,
      comment: ln.comment || ln.comments || '',
      pack_size: ln.pack_size || '',
      unit: ln.unit || 'PCS',
      stockQuantity: ln.stockQuantity || ln.stock_quantity || 0,
      image_url: ln.image_url || '',
      productId: ln.product_id || ln.productId || null,
      price: ln.price || 0,
      hsn: ln.hsn || '',
      discountPct: ln.discountPct || 0,
      pack_size: ln.pack_size || '',
    }));


    const initialData = {
      id: row.dbId,          // CRITICAL: must be set so isEditing=true in the form
      dbId: row.dbId,
      mrn_number: row.id,
      invoiceNo: row.id,
      mrn_date: row.date,
      invoiceDate: row.date,
      date: row.date,
      advice_no: row.advice_no,
      party_id: row.party_id,
      partyName: row.partyName,
      party_name: row.partyName,
      bill_to_address_id: row.bill_to_address_id,
      purchaseOrderNumber: row.purchase_order_number,
      purchase_order_number: row.purchase_order_number,
      deliveryLocation: row.delivery_location,
      delivery_location: row.delivery_location,
      costCenter: row.cost_center,
      cost_center: row.cost_center,
      remark: row.remark,
      notes: row.notes,
      products: normalizedLines,
      terms: row.terms || [],
      totals: row.totals || {},
      status: row.status,
      business_id: row.business_id,
      type: 'mrn',

    };
    console.log('EDIT RECORD', initialData, row)
    setEditingRow({ sourceRow: row, initialData });
    localStorage.setItem('editingMRNRow', JSON.stringify({ sourceRow: row, initialData }));
    navigate(`/MRN?mode=edit&id=${row.dbId}`);
  };

  // Handle save for EDIT
  const handleFormSaveForEdit = async (invoice) => {
    try {
      showLoadingModal('Updating MRN...');
      console.log('editingRow in save handler:', editingRow);
      const mrnId = editingRow.sourceRow.dbId || editingRow.sourceRow.id;
      console.log('Updating MRN with id:', mrnId, 'editingRow:', editingRow.initialData);
      const response = await mrnAPI.update(mrnId, invoice);
      closeModal();

      if (response.success) {
        showSuccessToast(`MRN updated successfully`);
        setEditingRow(null);
        localStorage.removeItem('editingMRNRow');
        setViewMode('list');
        localStorage.removeItem('mrnViewMode');
        navigate('/MRN');
      } else {
        showErrorToast(response.message || 'Failed to update MRN');
      }
    } catch (err) {
      closeModal();
      console.error('Error updating MRN:', err);
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
      showLoadingModal('Deleting MRN...');
      const businessId = localStorage.getItem("selectedBusinessId");
      const response = await mrnAPI.delete(itemToDelete.dbId, businessId);
      closeModal();

      if (response.success) {
        setRows(prev => prev.filter(r => r.dbId !== itemToDelete.dbId));
        showSuccessToast(`MRN ${itemToDelete.id} deleted successfully`);
        setDeleteModalOpen(false);
        setItemToDelete(null);
      } else {
        showErrorToast(response.message || 'Failed to delete MRN');
      }
    } catch (error) {
      closeModal();
      console.error('Error deleting MRN:', error);
      showErrorToast('Error occurred while deleting MRN');
    }
  };

  //  Handle back navigation
  const handleBackToList = () => {
    setEditingRow(null);
    localStorage.removeItem('editingMRNRow');
    localStorage.removeItem('mrnViewMode');
    navigate('/MRN');
  };
  if (loading) {
    return <MainLoader message="Loading MRNs..." />;
  }
  // CREATE RECORD
  if (viewMode === 'create') {
    return (
      <MRNForm
        onSave={handleFormSaveForCreate}
        onBack={handleBackToList}
        initialData={{}}
        formTitle="Create"
        formType="mrn"
        showTopActions
        showBottomActions
        saveLabel="Save"
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }
  // EDIT RECORD
  if (viewMode === 'edit' && editingRow?.initialData) {
    return (
      <MRNForm
        key={editingRow.initialData.dbId}
        onSave={handleFormSaveForEdit}
        onBack={handleBackToList}
        initialData={memoizedInitialData}
        formTitle="Update MRN"
        formType="mrn"
        showTopActions
        showBottomActions
        saveLabel="Update Changes"
        cancelLabel="Cancel"
        currency={currency}
      />
    );
  }

  // MRN TABLE COLUMNS
  const columns = [
    {
      key: 'id',
      title: 'MRN No',
      sortable: true,
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
      key: 'updatedDate',
      title: 'Updated Date',
      sortable: true,
      render: (r) => formatDate(r.updatedDate)
    },
  ];

  if (viewMode === 'preview' && previewData) {
    return (
      <GrnmrnPDFFormat
        previewData={previewData}
        onBack={() => {
          setPreviewData(null);
          setViewMode('list');
          navigate('/MRN');
        }}
      />
    );
  }

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      {/* ITS TABLE HEADER LIKE NEW AND FILTER */}
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout - Back Button Integrated */}
          <div className="md:hidden flex flex-col space-y-3 mb-4">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateClick}
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
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search MRNs..."
                  className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                />
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

                {/* <CommonDropdown
                  options={statusOptions}
                  value={status.label}
                  onChange={(opt) => {
                    const found = STATUS_OPTS.find((s) => s.label === opt.label) || STATUS_OPTS[0];
                    setStatus(found);
                  }}
                  placeholder="Status"
                  className="w-32"
                /> */}

                <div className="hidden md:block">
                  <button
                    onClick={handleCreateClick}
                    className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={18} /> New
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Empty State */}
      {!loading && rows.length === 0 && viewMode === "list" && (
        <GeneralEmptyState
          title="No MRNs Found"
          description="You haven't created any MRNs yet. Start by creating your first Material Receipt Note."
          buttonText="Create First MRN"
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
            rowKey={(r) => {
              console.log("Row Data:", r);
              console.log("Row ID:", r.id);
              return r.id;
            }}
            initialPageSize={10}
            onRowClick={(row) => {
              setPreviewData(mapToGRNData(row));
              setViewMode('preview');
            }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
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
        itemType="MRN"
      />
    </div>
  );
}
