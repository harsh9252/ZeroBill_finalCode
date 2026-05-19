import React, { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationDropdown({ onOpen, onClose, isOpen, onCloseOther }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleToggle = () => {
    if (isOpen) {
      onClose();
    } else {
      onCloseOther();
      onOpen();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">New Invoice Created</p>
              <p className="text-xs text-gray-500 mt-1">A new invoice has been generated.</p>
              <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
            </div>
            <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">Payment Received</p>
              <p className="text-xs text-gray-500 mt-1">A payment has been recorded.</p>
              <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
            </div>
            <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <p className="text-sm font-medium text-gray-900">Quotation Approved</p>
              <p className="text-xs text-gray-500 mt-1">A quotation has been approved.</p>
              <p className="text-xs text-gray-400 mt-1">1 day ago</p>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
