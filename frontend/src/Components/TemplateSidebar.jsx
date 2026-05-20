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
              <FileText className="w-4 h-4 text-[#129046]" />
              <span>Created {title}s</span>
            </h2>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {filteredAndSorted.length}
            </span>
          </div>

          {/* Search bar - Styled like first screenshot */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Item" // Keep exact placeholder from screenshot
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border-2 border-yellow-400 rounded-xl text-sm bg-white focus:outline-none focus:border-yellow-500 transition-all placeholder-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-0.5 rounded-full hover:bg-gray-250 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
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
              className="border-0 bg-transparent py-0 pl-1 pr-6 font-semibold text-gray-700 hover:text-[#129046] focus:ring-0 focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      )}

      {/* Sidebar List - Cards styled like first screenshot */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
              const isSelected = activeDocId === dbId;

              return (
                <div
                  key={`${dbId}-${idx}`}
                  onClick={() => onSelect(doc)}
                  className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#f0fdf4] border-2 border-[#bbf7d0] shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  {/* Top row: ID (Item Name bold style in screenshot) */}
                  <span 
                    className="text-sm font-bold text-gray-900 truncate"
                    translate="no"
                  >
                    {docId}
                  </span>

                  {/* Middle row: Stock/Total Amount (Stock style in screenshot) */}
                  <span className="text-xs text-gray-500 font-medium">
                    Total: <span className="font-semibold text-gray-700">{formatCurrency(amount, currency)}</span>
                  </span>

                  {/* Bottom row: Description/Party name (gray smaller text in screenshot) */}
                  <div className="text-xs text-gray-400 truncate">
                    {party} • {formatDate(date)}
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

