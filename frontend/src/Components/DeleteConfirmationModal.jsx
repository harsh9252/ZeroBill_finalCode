import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  title,
  actionText = 'Delete',
  description,
  variant = 'red'
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const expectedText = `${actionText} ${itemName}`;
  const isConfirmed = confirmText === expectedText;

  // Use the exact same colors and styling as original software delete modal
  const colors = {
    red: {
      ring: 'focus:ring-red-500',
      border: 'focus:border-red-500',
      btn: 'bg-[#dc2626] hover:bg-[#b91c1c]'
    },
    orange: {
      ring: 'focus:ring-orange-500',
      border: 'focus:border-orange-500',
      btn: 'bg-orange-600 hover:bg-orange-700'
    }
  }[variant] || {
    ring: 'focus:ring-red-500',
    border: 'focus:border-red-500',
    btn: 'bg-[#dc2626] hover:bg-[#b91c1c]'
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 transition-opacity">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden relative text-left">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/80">
          <h3 className="text-[15px] font-semibold text-gray-900">
            <span>{title || `${actionText} ${itemName}`}</span>
          </h3>
          <button
            onClick={() => {
              setConfirmText("");
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            {description || (
              <>
                This action <strong>cannot</strong> be undone. This will permanently delete this {itemType} and remove it from the database forever.
              </>
            )}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span>Please type <strong>"{expectedText}"</strong> to confirm.</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={`w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${colors.ring} ${colors.border} focus:bg-white transition-colors`}
              placeholder={`Type "${expectedText}"`}
            />
          </div>
          <button
            disabled={!isConfirmed}
            onClick={() => {
              onConfirm();
              setConfirmText("");
            }}
            className={`w-full py-2 ${colors.btn} text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            <span>{actionText} this {itemType}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DeleteConfirmationModal;
