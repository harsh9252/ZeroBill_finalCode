// SalesCommonUI.jsx
import React from "react";
import { Search, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { DateRangeModal } from "../Date_wise_Filter_Button.jsx";

export default function SalesCommonUI(props) {
  const {
    title = "Sales",
    dateLabel = "",
    showCreateButton = true,
    createButtonLabel = "Create",
    onCreate = () => {},

    query = "",
    onQueryChange = () => {},
    dateRangeValue = "",
    dateRangeOpts = [],
    onDateRangeChange = () => {},
    onOpenCustomRange = () => {},
    statusValue = null,
    statusOpts = [],
    onStatusChange = () => {},

    columns = [],
    rows = [],
    sort = { key: "", dir: "asc" },
    onSortChange = () => {},

    page = 1,
    setPage = () => {},
    pageSize = 10,
    setPageSize = () => {},
    totalPages = 1,
    filteredLength = 0,

    renderRowActions = (r) => null,
    EmptyState = null,

    customRangeOpen = false,
    onCustomRangeApply = () => {},
    onCustomRangeCancel = () => {},

    className = "",
  } = props;

  const _optValue = (o) => (o == null ? "" : (o.value ?? o.label ?? o));
  const _optLabel = (o) => (o == null ? "" : (o.label ?? o.value ?? String(o)));

  const _getStatusLabel = (sv) => {
    if (sv == null) return "";
    if (typeof sv === "string") {
      const found = (statusOpts || []).find((o) => (o.value === sv) || (o.label === sv));
      return found ? _optLabel(found) : sv;
    }
    return _optLabel(sv);
  };

  return (
    <div className={`min-h-screen w-full p-4 md:p-6 border rounded-xl bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        <div />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm text-gray-600">{dateLabel}</div>
        <div>
          {showCreateButton && (
            <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus size={18} /> {createButtonLabel}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
              placeholder="Search party, CN number, invoice no"
              className="w-56 md:w-64 rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <select
            value={dateRangeValue ?? ""}
            onChange={(e) => onDateRangeChange && onDateRangeChange(e.target.value)}
            className="w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(dateRangeOpts || []).map((o, i) => (
              <option key={i} value={typeof o === "string" ? o : _optValue(o)}>
                {typeof o === "string" ? o : _optLabel(o)}
              </option>
            ))}
          </select>

          {dateRangeValue === "Custom Date Range" && (
            <button onClick={onOpenCustomRange} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50">
              Edit
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={_getStatusLabel(statusValue)}
            onChange={(e) => {
              const chosenLabel = e.target.value;
              const found = (statusOpts || []).find((o) => _optLabel(o) === chosenLabel || _optValue(o) === chosenLabel);
              if (found) onStatusChange && onStatusChange(found);
              else onStatusChange && onStatusChange({ label: chosenLabel, value: chosenLabel });
            }}
            className="w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(statusOpts || []).map((o) => (
              <option key={_optValue(o)} value={_optLabel(o)}>
                {_optLabel(o)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="max-h-[56vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-green-600 text-white">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => c.sortable === false ? null : onSortChange && onSortChange(c.key)}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${c.sortable === false ? "" : "cursor-pointer select-none"}`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{c.title}</span>
                      {c.sortable !== false && (
                        <>
                          {sort.key === c.key && sort.dir === "asc" && <ChevronUp size={14} />}
                          {sort.key === c.key && sort.dir === "desc" && <ChevronDown size={14} />}
                          {sort.key !== c.key && <span className="text-green-200/70">—</span>}
                        </>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1}>
                    {EmptyState ? <EmptyState /> : <div className="p-6 text-center text-sm text-gray-500">No records</div>}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id ?? r.key} className="border-t hover:bg-gray-50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3">
                        {c.render ? c.render(r) : (r[c.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">{renderRowActions(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
          <div className="text-sm text-gray-600">
            Showing {filteredLength === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredLength)} of {filteredLength}
          </div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 border rounded text-sm">
              {[5, 10, 15, 25].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2 py-1 border rounded text-sm disabled:opacity-50">
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 10)
              .map((num) => (
                <button key={num} onClick={() => setPage(num)} className={`px-2 py-1 text-sm border rounded ${num === page ? "bg-green-600 text-white" : "hover:bg-gray-100"}`}>
                  {num}
                </button>
              ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-2 py-1 border rounded text-sm disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>

      <DateRangeModal open={customRangeOpen} initialRange={{}} onApply={onCustomRangeApply} onCancel={onCustomRangeCancel} />
    </div>
  );
}
