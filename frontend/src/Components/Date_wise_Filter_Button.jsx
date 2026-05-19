import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Edit2 } from 'lucide-react';

// ----- Constants ------------------------------------------------------------------
export const DATE_RANGE_OPTS = [
  "All Dates",
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "Last 7 Days",
  "This Month",
  "Previous Month",
  "Last 30 Days",
  "This Quarter",
  "Previous Quarter",
  "Current Fiscal Year",
  "Previous Fiscal Year",
  "Last 365 Days",
  "Custom Date Range",
];

// ----- Pure helpers ---------------------------------------------------------------
export function startOfDay(d) {
  // Create a date in local timezone by using year, month, day from the input date
  const local = new Date(d);
  return new Date(local.getFullYear(), local.getMonth(), local.getDate(), 0, 0, 0, 0);
}
export function endOfDay(d) {
  const local = new Date(d);
  return new Date(local.getFullYear(), local.getMonth(), local.getDate(), 23, 59, 59, 999);
}
export function startOfMonth(d) {
  const local = new Date(d);
  return new Date(local.getFullYear(), local.getMonth(), 1);
}
export function endOfMonth(d) {
  const local = new Date(d);
  return new Date(local.getFullYear(), local.getMonth() + 1, 0);
}
export function startOfQuarter(d) {
  const local = new Date(d);
  const q = Math.floor(local.getMonth() / 3);
  return new Date(local.getFullYear(), q * 3, 1);
}
export function endOfQuarter(d) {
  const local = new Date(d);
  const q = Math.floor(local.getMonth() / 3);
  return new Date(local.getFullYear(), q * 3 + 2, 1, 23, 59, 59, 999);
}

function parseExplicitRange(label) {
  if (!label || typeof label !== 'string') return null;
  const parts = label.split('to').map(s => s.trim());
  if (parts.length !== 2) return null;
  const a = new Date(parts[0]); const b = new Date(parts[1]);
  if (isNaN(a) || isNaN(b)) return null;
  return { start: startOfDay(a), end: endOfDay(b) };
}

export function getRangeBoundsPure(label, customRange = null) {
  if (!label) return null;
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  switch (label) {
    case 'All Dates': return null;

    case 'Today': return { start: todayStart, end: todayEnd };

    case 'Yesterday': {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }

    case 'This Week': {
      // Sunday-start week
      const d = new Date(todayStart);
      const day = d.getDay(); // Sunday=0, Monday=1...
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      return { start: startOfDay(start), end: todayEnd };
    }

    case 'Last Week': {
      const d = new Date(todayStart);
      const day = d.getDay();
      const startOfThisWeek = new Date(d);
      startOfThisWeek.setDate(d.getDate() - day);

      const start = new Date(startOfThisWeek);
      start.setDate(start.getDate() - 7);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'Last 7 Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }

    case 'This Month': {
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }

    case 'Previous Month': {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }

    case 'Last 30 Days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }

    case 'This Quarter': {
      return { start: startOfQuarter(today), end: endOfQuarter(today) };
    }

    case 'Previous Quarter': {
      const qStart = startOfQuarter(today);
      const d = new Date(qStart);
      d.setMonth(d.getMonth() - 1);
      return { start: startOfQuarter(d), end: endOfQuarter(d) };
    }

    case 'Current Fiscal Year': {
      // India FY: Apr 1 - Mar 31
      const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const start = new Date(year, 3, 1);
      const end = new Date(year + 1, 2, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'Previous Fiscal Year': {
      const year = (today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1) - 1;
      const start = new Date(year, 3, 1);
      const end = new Date(year + 1, 2, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }

    case 'Last 365 Days': {
      const start = new Date(todayStart);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return { start: startOfDay(start), end: todayEnd };
    }

    case 'Custom Date Range': {
      if (customRange && customRange.from && customRange.to) {
        const a = new Date(customRange.from);
        const b = new Date(customRange.to);
        return { start: startOfDay(a), end: endOfDay(b) };
      }
      return null;
    }

    default: {
      const parsed = parseExplicitRange(label);
      if (parsed) return parsed;
      return null;
    }
  }
}

// ----- Reusable hook --------------------------------------------------------------
export function useDateRange(label, customRange) {
  const bounds = useMemo(() => getRangeBoundsPure(label, customRange), [label, customRange?.from, customRange?.to]);
  const displayLabel = useMemo(() => {
    if (label === 'Custom Date Range' && customRange?.from && customRange?.to) return `${customRange.from} → ${customRange.to}`;
    return label;
  }, [label, customRange?.from, customRange?.to]);
  return { bounds, displayLabel };
}

// ----- Reusable modal component ---------------------------------------------------
export function DateRangeModal({ open, initialRange = { from: '', to: '' }, onApply, onCancel }) {
  const [local, setLocal] = useState({ from: '', to: '' });

  useEffect(() => {
    if (open) setLocal({ from: initialRange.from || '', to: initialRange.to || '' });
  }, [open, initialRange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-full h-full z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Custom Date Range</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
            aria-label="Close"
          >
            <span>✕</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={local.from}
                onChange={(e) => setLocal(l => ({ ...l, from: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#129046] focus:ring-2 focus:ring-green-400/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={local.to}
                onChange={(e) => setLocal(l => ({ ...l, to: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#129046] focus:ring-2 focus:ring-green-400/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
            >
              <span>Cancel</span>
            </button>
            <button
              onClick={() => onApply && onApply(local)}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-[#129046] to-[#9ccc53] text-sm font-bold text-white shadow-lg shadow-green-200 hover:opacity-90 transition-all active:scale-95"
            >
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * A reusable Date Filter Button component
 */
export default function Date_wise_Filter_Button({
  dateRangeLabel,
  onRangeChange,
  customRange,
  onRangeApply,
  className = ""
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);

  const dateOptions = useMemo(() => {
    return (Array.isArray(DATE_RANGE_OPTS) ? DATE_RANGE_OPTS : []).map((o, i) =>
      typeof o === 'string' ? { id: `dr-${i}`, label: o } : { id: o.value ?? `dr-${i}`, label: o.label ?? String(o) }
    );
  }, []);

  const handleDropdownChange = (opt) => {
    if (opt.label === 'Custom Date Range') {
      setShowCustomModal(true);
    } else {
      onRangeChange(opt.label);
    }
  };

  const handleCustomApply = (range) => {
    onRangeApply(range);
    setShowCustomModal(false);
  };

  const formattedRangeLabel = () => {
    if (dateRangeLabel === 'Custom Date Range' && customRange?.from && customRange?.to) {
      return `${customRange.from} — ${customRange.to}`;
    }
    return dateRangeLabel;
  };

  return (
    <div className={`flex flex-col md:flex-row items-end md:items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <DateDropdown
          options={dateOptions}
          value={dateRangeLabel}
          onChange={handleDropdownChange}
          placeholder="Select date range"
          className="w-32 md:w-44"
        />
        {dateRangeLabel === "Custom Date Range" && (customRange?.from || customRange?.to) && (
          <div className="hidden md:flex items-center gap-2">
            <div className="text-gray-700 text-xs font-medium">
              {formattedRangeLabel()}
            </div>
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="text-xs text-blue-500 hover:text-blue-600 underline transition-colors"
            >
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>
      {dateRangeLabel === "Custom Date Range" && (customRange?.from || customRange?.to) && (
        <div className="md:hidden flex items-center gap-2">
          <div className="text-gray-700 text-xs font-medium">
            {formattedRangeLabel()}
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="text-xs text-blue-500 underline"
          >
            <span>Edit</span>
          </button>
        </div>
      )}
      <DateRangeModal
        open={showCustomModal}
        initialRange={customRange}
        onApply={handleCustomApply}
        onCancel={() => setShowCustomModal(false)}
      />
    </div>
  );
}

// Internal Dropdown Component
function DateDropdown({ options, value, onChange, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === value || opt.label === value);

  return (
    <div className={`relative z-[60] ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors bg-white text-left flex items-center justify-between hover:bg-gray-50"
      >
        <span className={selectedOption ? "text-gray-800 truncate" : "text-gray-500 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-100">
          {options.map((option) => (
            <button
              key={option.id || option.label}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${(selectedOption && (selectedOption.id === option.id || selectedOption.label === option.label))
                ? "bg-[#129046] text-white"
                : "hover:bg-gray-50 text-gray-700"
                }`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
