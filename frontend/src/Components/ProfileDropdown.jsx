import React, { useEffect, useRef } from 'react';
import { User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// import { supabase } from "@/integrations/supabase/client";

export default function ProfileDropdown({ onOpen, onClose, isOpen, onCloseOther = () => {} }) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isOpen) {
      onClose();
    } else {
      onCloseOther();
      onOpen();
    }
  };

  /* -----------------------
     ASYNC LOGOUT FUNCTION
     ----------------------- */
  const handleLogout = async () => {
    try {
      // Clear all authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedBusinessId');
      localStorage.removeItem('zbe-authenticated');
      sessionStorage.clear();

      // Close dropdown
      onClose();

      // Navigate to login
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#2B9348] to-[#227a39] flex items-center justify-center transition-all shadow-sm hover:shadow-md" 
        aria-label="Profile"
      >
        <span className="text-white font-semibold text-sm">DP</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">DP Singh</p>
            <p className="text-xs text-gray-500 mt-1">dp.singh@example.com</p>
          </div>

          <div className="py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/business');
                onClose();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">My Profile</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Navigate to settings page
                onClose();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Settings</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Navigate to help page
                onClose();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <HelpCircle className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Help Support</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <LogOut className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
