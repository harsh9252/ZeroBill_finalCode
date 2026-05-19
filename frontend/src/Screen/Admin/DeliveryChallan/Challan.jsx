// Challan.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, Plus, Edit2, Trash2 } from "lucide-react";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog } from '../../../Components/ActionMessageModel.jsx';
import "sweetalert2/dist/sweetalert2.min.css";
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import { formatDate } from "../../../utils/dateFormat.js";
// adjust path if needed:
import CreateSaleForm from "../../../Components/SalesFormInvoice/CreateSaleForm.jsx";
import ReusableTable from "../../../Components/ReusableTable.jsx"; // <-- adjust path if needed
import { formatCurrency } from "../../../utils/currency";

// --- Demo Data ---
const STATUS_OPTS = [
  { label: "Show All Challan", value: "all" },
  { label: "Show Open Challan", value: "open" },
  { label: "Show Closed Challan", value: "closed" },
];

const DEMO = [
  { id: "Q-0001", date: "2025-10-10", partyName: "Acme Industries", amount: 15000, status: "open", meta: {} },
  { id: "Q-0002", date: "2025-11-01", partyName: "Bright Retail", amount: 7200, status: "open", meta: {} },
  { id: "Q-0003", date: "2025-08-20", partyName: "Cobalt Traders", amount: 12800, status: "closed", meta: {} },
];

// normalize arbitrary lines to the shape CreateSaleForm expects
const normalizeLinesForForm = (rawLines = []) => {
  if (!Array.isArray(rawLines)) return [];
  return rawLines.map((ln, i) => ({
    id: ln.id || ln.lineId || `ln-${i}-${Date.now()}`,
    description: ln.description ?? ln.name ?? ln.item ?? ln.label ?? "",
    subtitle: ln.subtitle ?? ln.subtitleText ?? "",
    hsn: ln.hsn ?? ln.code ?? ln.sku ?? "",
    qty: Number(ln.qty ?? ln.quantity ?? ln.q ?? 1),
    unit: ln.unit ?? (typeof ln.stock === "string" && ln.stock.includes("PCS") ? "PCS" : "PCS"),
    price: Number(ln.price ?? ln.salesPrice ?? ln.rate ?? ln.amount ?? 0),
    discountPct: Number(ln.discountPct ?? ln.discount ?? 0),
    taxPct: Number(ln.taxPct ?? ln.tax ?? 18),
    overrideAmount:
      ln.overrideAmount != null
        ? ln.overrideAmount
        : ln.totalAmount != null
        ? ln.totalAmount
        : null,
  }));
};

// --- Component ---
export default function Challan({ currency }) {
  const [query, setQuery] = useState("");
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [status, setStatus] = useState(STATUS_OPTS[1]);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  // rows are editable now
  const [rows, setRows] = useState(DEMO);

  // pagination (kept but ReusableTable will handle its own pager by default)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // view state: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState("list");
  const [editingRow, setEditingRow] = useState(null);

  const formattedRangeLabel = () => {
    const { from, to } = customRange;
    if (from && to) return `${from} — ${to}`;
    if (from) return `${from} —`;
    if (to) return `— ${to}`;
    return "Custom Date Range";
  };

  // build dropdown-friendly options for CommonDropdown


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

      const matchStatus = status.value === "all" ? true : r.status === status.value;
      const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
      const id = r.id ? String(r.id).toLowerCase() : '';
      const matchSearch = !q || partyName.includes(q) || id.includes(q);

      return dateOk && matchStatus && matchSearch;
    });

    // sort
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const A = sort.key === "date" ? new Date(a.date) : a[sort.key];
      const B = sort.key === "date" ? new Date(b.date) : b[sort.key];

      if (sort.key === "date") return (A - B) * dir;
      if (sort.key === "amount") return (A - B) * dir;
      return String(A ?? "").localeCompare(String(B ?? "")) * dir;
    });

    return list;
  }, [rows, query, status, sort, dateRangeLabel, customRange]);

  // pagination derived (kept for header display)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, dateRangeLabel, customRange, status, pageSize, sort]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ---------- Handlers ----------

  // open create (full form)
  const handleCreate = () => {
    setEditingRow(null);
    setViewMode("create");
  };

  // create/save handler — normalize invoice -> challan row
  const handleFormSaveForCreate = async (invoice) => {
    const newRow = {
      id: invoice.id || `CH-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      date: invoice.date || new Date().toISOString().slice(0, 10),
      partyName: invoice.partyName || invoice.party || "",
      amount: Number(invoice.amount || invoice.meta?.total || 0),
      status: invoice.status || "open",
      meta: {
        ...(invoice.meta || {}),
        _invoiceSource: invoice,
      },
    };
    setRows((prev) => [newRow, ...prev]);
    setViewMode("list");

    await showSuccessToast({
      title: `${newRow.id} created`,
      timer: 1400,
    });
  };

  // open edit in full CreateSaleForm with normalized lines
  const handleEditClick = (row) => {
    // pull lines from meta if present
    const rawLines = Array.isArray(row.meta?.lines) ? row.meta.lines : Array.isArray(row.lines) ? row.lines : [];
    const normalizedLines = normalizeLinesForForm(rawLines);

    const initialData = {
      id: row.id?.startsWith("INV") ? row.id : row.meta?.invoiceNo || `INV-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      date: row.date,
      partyName: row.partyName,
      dueDate: row.dueDate,
      amount: row.amount,
      status: row.status,
      meta: {
        invoiceNo: row.meta?.invoiceNo || row.id,
        lines: normalizedLines,
        ...(row.meta || {}),
      },
    };

    setEditingRow({ sourceRow: row, initialData });
    setViewMode("edit");
  };

  // Save handler when editing via CreateSaleForm
  const handleFormSaveForEdit = async (invoice) => {
    // If editingRow exists, replace that row
    if (!editingRow || !editingRow.sourceRow) {
      // fallback to create
      await handleFormSaveForCreate(invoice);
      return;
    }

    const targetId = editingRow.sourceRow.id;
    const updatedRow = {
      id: targetId,
      date: invoice.date || editingRow.sourceRow.date,
      partyName: invoice.partyName || editingRow.sourceRow.partyName,
      amount: Number(invoice.amount || invoice.meta?.total || editingRow.sourceRow.amount || 0),
      status: invoice.status || editingRow.sourceRow.status,
      meta: {
        ...(invoice.meta || {}),
      },
    };

    setRows((prev) => prev.map((r) => (r.id === targetId ? { ...r, ...updatedRow } : r)));
    setEditingRow(null);
    setViewMode("list");

    await showSuccessToast({
      title: `${updatedRow.id} updated`,
      timer: 1400,
    });
  };

  const handleDeleteClick = async (row) => {
    try {
      const confirmed = await showConfirmationDialog({
        title: `Delete ${row.id}?`,
        text: "This action cannot be undone.",
        confirmText: "Yes, delete",
        cancelText: "Cancel",
      });
      if (!confirmed) return;

      showLoadingModal({ title: "Deleting...", text: "Please wait" });

      // if you have an API call, await it here (e.g. await api.deleteChallan(row.id))
      setRows((prev) => prev.filter((r) => r.id !== row.id));

      closeModal();
      await showSuccessToast({
        title: `${row.id} deleted`,
        timer: 1400,
      });
    } catch (err) {
      closeModal();
      await showErrorToast({ title: "Error", text: err?.message || "Could not delete item." });
    }
  };

  // form cancel/back
  const handleFormCancel = () => {
    setEditingRow(null);
    setViewMode("list");
  };

  // Date range handlers (accept CommonDropdown option objects or raw values)
  const onRangeChange = (optOrLabel) => {
    const val = optOrLabel && optOrLabel.label ? optOrLabel.label : optOrLabel;
    setDateRangeLabel(val);
  };
  const onRangeApply = (range) => {
    setCustomRange(range);
    setDateRangeLabel("Custom Date Range");
  };

  const onStatusChange = (optOrLabel) => {
    const val = optOrLabel && optOrLabel.value ? optOrLabel.value : (optOrLabel && optOrLabel.label ? optOrLabel.label : optOrLabel);
    const found = STATUS_OPTS.find((o) => o.value === val || o.label === val);
    setStatus(found || STATUS_OPTS[1]);
  };

  // ---------- Render ----------
  // If create/edit mode -> show CreateSaleForm full page
  if (viewMode === "create") {
    return (
      <CreateSaleForm
        onSave={handleFormSaveForCreate}
        onBack={handleFormCancel}
        initialData={{}}
        formTitle="Create Delivery Challan"
        showTopActions={true}
        showBottomActions={true}
        saveLabel="Save"
        cancelLabel="Cancel"
      />
    );
  }

  if (viewMode === "edit" && editingRow?.initialData) {
    return (
      <CreateSaleForm
        onSave={handleFormSaveForEdit}
        onBack={handleFormCancel}
        initialData={editingRow.initialData}
        formTitle="Update Delivery Challan"
        showTopActions={true}
        showBottomActions={true}
        saveLabel="Update Changes"
        cancelLabel="Cancel"
      />
    );
  }

  // default: list view
  // Columns for ReusableTable — no row click handler (inventory-only row click rule)
  const columns = [
    { key: "date", title: "Date", sortable: true, width: "130px", render: (r) => formatDate(r.date) },
    { key: "id", title: "Delivery Challan Number", sortable: true, render: (r) => <span className="font-medium">{r.id}</span> },
    { key: "partyName", title: "Party Name", sortable: true },
    { key: "amount", title: "Amount", sortable: true, align: "right", render: (r) => <span className="whitespace-nowrap">{formatCurrency(r.amount, currency)}</span> },
    { key: "status", title: "Status", sortable: false, render: (r) => <StatusPill status={r.status} /> },
    {
      key: "actions",
      title: "Actions",
      sortable: false,
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditClick(r); }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm bg-green-500 text-white"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(r); }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm bg-danger text-white"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 w-full">
        {/* left: search + date range */}
        <div className="flex-1 w-full sm:w-auto ">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full  justify-content-end">
            {/* Search */}
            <div className="w-full sm:w-auto">
              <div className="relative w-full">
                <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="DC-0000 or Party Name"
                  aria-label="Search"
                  className="w-full sm:w-56 md:w-64 rounded-[7px] h-8 border border-gray-300 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Date range (CommonDropdown) */}
            <div className="w-full sm:w-auto flex items-center gap-2">
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
        </div>

        {/* right: status + new */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className=" ">
            <CommonDropdown
              options={statusOptions}
              value={status.label}
              onChange={(opt) => onStatusChange(opt)}
              className="commonDropdown w-full sm:w-56"
              placeholder="Status"
              id="ch-status"
              name="status"
            />
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={handleCreate}
              aria-label="New"
              className="w-full sm:w-auto inline-flex h-8 items-center gap-2 justify-center rounded-md bg-green-500 px-3 text-sm font-medium text-white"
            >
              <Plus size={18} /> <span>New</span>
            </button>
          </div>
        </div>
      </div>

      {/* ReusableTable — using filtered data, no row click so inventory rule is respected */}
      <div className="">
        <ReusableTable
          columns={columns}
          data={filtered}
          rowKey="id"
          defaultPageSize={10}
          pageSizeOptions={[5, 10, 15, 25]}
          searchable={false}
          compact={false}
        />
      </div>

    </div>
  );
}

/* --- Small UI bits --- */
function StatusPill({ status }) {
  const map = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    closed: "bg-green-50 text-green-700 border-green-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`border px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.open}`}>{(status || "").charAt(0).toUpperCase() + (status || "").slice(1)}</span>;
}
