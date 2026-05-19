import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Search, Share, MessageCircle, Mail } from "lucide-react";
import ActionButtons from "./ActionButtons";
import { FaWhatsapp, FaShareAlt } from "react-icons/fa";

export default function ReusableTable({
  columns = [],
  data = [],
  pageSizeOptions = [5, 10, 15, 25],
  defaultPageSize = 10,
  searchable = true,
  placeholder = "Search...",
  rowKey = "id",
  onEdit,
  onDelete,
  onShare,
  onRowClick,
  compact = false,
  extraActions,
  emptyMessage,
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [shareMenuOpen, setShareMenuOpen] = useState(null);
  const menuRef = useRef(null);

  const idFor = (row) => (typeof rowKey === "function" ? rowKey(row) : row[rowKey]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return data.filter((r) => {
      if (!q) return true;
      // search across all visible columns text
      return columns.some((c) => {
        const key = c.key;
        if (!key) return false;
        const val = String((typeof key === "function" ? key(r) : r[key]) ?? "").toLowerCase();
        return val.includes(q);
      });
    });
  }, [data, query, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const A = typeof sort.key === "function" ? sort.key(a) : a[sort.key];
      const B = typeof sort.key === "function" ? sort.key(b) : b[sort.key];
      if (A == null && B == null) return 0;
      if (A == null) return -1;
      if (B == null) return 1;
      if (typeof A === "number" && typeof B === "number") return sort.dir === "asc" ? A - B : B - A;
      return sort.dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  // close share menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShareMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    const active = sort.key === col.key;
    setSort({ key: col.key, dir: active && sort.dir === "asc" ? "desc" : "asc" });
  };

  const showingFrom = Math.min(sorted.length === 0 ? 0 : (page - 1) * pageSize + 1, sorted.length);
  const showingTo = Math.min(page * pageSize, sorted.length);

  // show actions column when either handler is provided
  const showActions = Boolean(onEdit || onDelete || onShare);

  return (
    <div className=" overflow-hidden bg-white  border-b border-yellow-200">

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${compact ? "text-xs" : ""}`}>
          <thead className="border-b  bg-yellow-50 text-[#733e0a]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key || col.title}
                  onClick={() => toggleSort(col)}
                  className={`px-4 py-2 text-left ${col.align === "right" ? "text-right" : "text-left"} cursor-pointer select-none whitespace-nowrap`}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm uppercase"><span>{col.title}</span></span>
                    {col.sortable && (
                      sort.key === col.key ? (sort.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null
                    )}
                  </div>
                </th>
              ))}

              {showActions && <th className="px-4 py-2 text-center whitespace-nowrap"><span>ACTION</span></th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-yellow-100">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="text-gray-300 mb-1" />
                    <p className="font-medium text-gray-600">
                      {emptyMessage ? <span>{emptyMessage}</span> : (query ? <span>No matches found for "<span>{query}</span>"</span> : <span>No records found</span>)}
                    </p>
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="text-[#129046] hover:text-green-800 text-xs font-semibold"
                      >
                        <span>Clear Search</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={idFor(row)} className={`hover:bg-yellow-50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td
                      key={(col.key || col.title) + "-" + idFor(row)}
                      className={`px-4 py-2 text-sm text-gray-700  border-yellow-200 ${col.align === "right" ? "text-left" : "text-left"}`}
                    >
                      <span>{col.render ? col.render(row) : (typeof col.key === "function" ? col.key(row) : row[col.key])}</span>
                    </td>
                  ))}

                  {showActions && (
                    <td className="px-4 py-2 border-b border-yellow-200">
                      <div className="flex items-center justify-center gap-2 relative">
                        {extraActions && extraActions(row)}
                        {(onEdit || onDelete) && (
                          <ActionButtons
                            onEdit={onEdit ? () => onEdit(row) : undefined}
                            onDelete={onDelete ? () => onDelete(row) : undefined}
                            actions={[onEdit && 'edit', onDelete && 'delete'].filter(Boolean)}
                          />
                        )}

                        {onShare && (
                          <div className="relative">
                            {/* <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareMenuOpen(shareMenuOpen === idFor(row) ? null : idFor(row));
                              }}
                              className="action-button share"
                              title="Share"
                            >
                              <FaShareAlt size={13} />
                            </button> */}
                            {shareMenuOpen === idFor(row) && (
                              <div ref={menuRef} className="absolute right-0 mt-1  bg-white border border-gray-200 rounded shadow-lg z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShare(row, 'whatsapp');
                                    setShareMenuOpen(null);
                                  }}
                                  className=" text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <FaWhatsapp size={16} className="text-green-600" /> <span>WhatsApp</span> </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShare(row, 'email');
                                    setShareMenuOpen(null);
                                  }}
                                  className=" text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                > <Mail size={16} className="text-blue-600" /><span>Email</span> </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Buttons (count + controls aligned right) */}
      <div className="flex items-center justify-end px-4 py-3 gap-4">
        {/* Showing count */}
        <div className="text-sm text-gray-600 whitespace-nowrap">
          <span>Showing <span translate="no">{showingFrom}</span> - <span translate="no">{showingTo}</span> of <span translate="no">{sorted.length}</span></span>
        </div>

        {/* Prev / Page buttons / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 border rounded text-sm disabled:opacity-50"
          >
            <span>Prev</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(0, 10)
            .map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`px-3 py-1 border rounded text-sm ${num === page ? "bg-yellow-500 text-white" : "hover:bg-gray-100"}`}
                aria-current={num === page ? "page" : undefined}
              >
                <span>{num}</span>
              </button>
            ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 border rounded text-sm disabled:opacity-50"
          >
            <span>Next</span>
          </button>
        </div>
      </div>
    </div >
  );
}
