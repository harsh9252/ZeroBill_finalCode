// MobileCard.jsx
import React from "react";
import { Users, MoreVertical, Edit3, Trash2 } from "lucide-react";

export default function MobileCard({
  partyName,
  mobileNumber,
  partyType,
  balance,
  category,
  onEdit,
  onDelete,
  email,
  id,
  isActionsOpen,
  onToggleActions,
  onCloseActions,
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 hover:shadow-xl relative">
      {/* Top Section */}
      <div className="flex items-center justify-between">
        {/* Left Block */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {partyName}
            </h3>

            <div className="flex items-center gap-1 mt-0.5">
              {email && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Toggle */}
        <button
          onClick={() => onToggleActions(id)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Popup Actions */}
      {isActionsOpen && (
        <div className="absolute right-4 top-14 bg-white p-2 shadow-lg flex items-center gap-2 rounded-lg border border-yellow-100 z-50">
          <button
            onClick={() => {
              onEdit?.();
              onCloseActions?.();
            }}
            className="flex items-center gap-2 px-2 py-2 bg-green-500 rounded-lg text-sm text-white"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onDelete?.();
              onCloseActions?.();
            }}
            className="flex items-center gap-2 px-2 py-2 bg-red-500 rounded-lg text-sm text-white"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
