import React, { useState, useMemo } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ArrowUpDown, FileText, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateFormat';

/**
 * Reusable selection sidebar inside preview pages.
 * Allows searching, sorting and selecting from already created documents.
 */
export default function TemplateSidebar({
  documents = [],
  selectedDocument = null,
  onSelect = () => {},
  title = "Documents",
  documentType = "invoice",
  currency = "INR",
  isCollapsed = false,
  onToggleCollapse = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, amount_desc, amount_asc

  // Normalize document ID/Number
  const getDocId = (doc) => {
    if (!doc) return '';
    return doc.id || doc.note_number || doc.invoice_number || doc.book_purchase_order_number || doc.quotation_number || doc.dbId || '';
  };

  // Normalizes document party name
  const getPartyName = (doc) => {
    if (!doc) return '';
    return doc.partyName || doc.party_name || 'Customer';
  };

  // Normalizes document date
  const getDocDate = (doc) => {
    if (!doc) return '';
    return doc.date || doc.order_date || doc.note_date || doc.invoice_date || doc.quotation_date || '';
  };

  // Normalizes document amount
  const getDocAmount = (doc) => {
    if (!doc) return 0;
    return parseFloat(doc.amount || doc.grand_total || doc.total_amount || 0);
  };

  // Normalizes document status
  const getDocStatus = (doc) => {
    if (!doc) return 'open';
    return (doc.status || 'open').toLowerCase();
  };

  // Filter and sort documents
  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // Filter
    let list = documents.filter((doc) => {
      const docId = getDocId(doc).toLowerCase();
      const party = getPartyName(doc).toLowerCase();
      return docId.includes(q) || party.includes(q);
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(getDocDate(b)) - new Date(getDocDate(a));
      }
      if (sortBy === 'date_asc') {
        return new Date(getDocDate(a)) - new Date(getDocDate(b));
      }
      if (sortBy === 'amount_desc') {
        return getDocAmount(b) - getDocAmount(a);
      }
      if (sortBy === 'amount_asc') {
        return getDocAmount(a) - getDocAmount(b);
      }
      return 0;
    });

    return list;
  }, [documents, searchQuery, sortBy]);

  const activeDocId = selectedDocument ? (selectedDocument.dbId || getDocId(selectedDocument)) : '';

  const statusColors = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    overdue: 'bg-rose-50 text-rose-700 border-rose-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    converted: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div 
      className={`relative flex flex-col bg-white border-r border-gray-200 h-[calc(100vh-4rem)] z-30 transition-all duration-300 ${
        isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'
      }`}
    >
      {/* Sidebar Header */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span>Created {title}</span>
            </h2>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {filteredAndSorted.length}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort selection */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Sort by</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-0 bg-transparent py-0 pl-1 pr-6 font-semibold text-gray-700 hover:text-green-600 focus:ring-0 focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      )}

      {/* Sidebar List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <p className="text-sm font-semibold text-gray-400">No {title.toLowerCase()} found</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting your search query.</p>
            </div>
          ) : (
            filteredAndSorted.map((doc, idx) => {
              const docId = getDocId(doc);
              const dbId = doc.dbId || docId;
              const party = getPartyName(doc);
              const date = getDocDate(doc);
              const amount = getDocAmount(doc);
              const status = getDocStatus(doc);
              const isSelected = activeDocId === dbId;

              return (
                <div
                  key={`${dbId}-${idx}`}
                  onClick={() => onSelect(doc)}
                  className={`group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-br from-green-50/70 to-emerald-50/40 border-green-300 shadow-sm scale-[0.99] translate-x-1'
                      : 'bg-white border-gray-150 hover:border-gray-300 hover:bg-gray-50/50 hover:translate-x-0.5'
                  }`}
                >
                  {/* Left indicator bar for active item */}
                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-green-500 to-emerald-600 rounded-r-lg" />
                  )}

                  {/* Top row: ID and Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className={`text-sm font-bold truncate transition-colors ${
                        isSelected ? 'text-green-700' : 'text-gray-800 group-hover:text-green-600'
                      }`}
                      translate="no"
                    >
                      {docId}
                    </span>
                    <span className={`border px-2 py-0.5 rounded-full text-[10px] font-medium leading-none ${
                      statusColors[status] || statusColors.open
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  {/* Middle row: Customer/Party */}
                  <div className="text-xs text-gray-500 font-medium truncate">
                    {party}
                  </div>

                  {/* Bottom row: Date and Amount */}
                  <div className="flex items-center justify-between text-xs mt-0.5">
                    <span className="text-gray-400">{formatDate(date)}</span>
                    <span className="font-semibold text-gray-700 group-hover:text-gray-900" translate="no">
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
