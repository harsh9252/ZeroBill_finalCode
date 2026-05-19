/**
 * Super Admin Profile Sidebar Component
 * 
 * Simplified version of ProfileSidebar for Super Admin
 * Features:
 * - User profile display
 * - Quick navigation menu
 * - Logout functionality
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, LayoutDashboard } from 'lucide-react';

const SuperAdminProfileSidebar = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [superAdminUser, setSuperAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch Super Admin user data from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('superAdminUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setSuperAdminUser({
          name: user.name || 'Super Admin',
          email: user.email || 'admin@example.com',
          id: user.id || ''
        });
      }
    } catch (error) {
      console.error('Error loading Super Admin user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      document.body.style.overflow = 'auto';
      
      // Call the parent's logout handler if provided
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      } else {
        // Fallback: Clear Super Admin auth data and navigate
        localStorage.removeItem('superAdminAuth');
        localStorage.removeItem('superAdminUser');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminRefreshToken');
        navigate('/superadmin/login', { replace: true });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!superAdminUser || !superAdminUser.name) return 'SA';
    return superAdminUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          toggleSidebar();
        }}
        aria-label="Toggle profile sidebar"
      >
        <User className="w-5 h-5 text-white" />
      </button>

      {/* Close Button - Outside Sidebar */}
      <button
        className={`fixed top-4 right-4 md:top-6 md:right-[360px] z-[10000] w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      >
        <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      {/* Sliding Sidebar */}
      <div className={`fixed top-0 right-0 h-screen w-[300px] md:w-[340px] max-w-[90vw] md:max-w-[95vw] bg-white shadow-2xl z-[9999] transition-all duration-400 ease-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Profile Header with Theme Background */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 pt-4 pb-16 relative">
          <div className="flex items-start gap-2.5">
            {/* User Avatar */}
            <div className="w-12 h-12 rounded-xl flex-shrink-0 border-2 border-white/30 shadow-lg bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {loading ? '...' : getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white leading-tight mb-0.5 truncate">
                {loading ? 'Loading...' : (superAdminUser?.name || 'Super Admin')}
              </h3>
              <p className="text-xs font-medium text-white/80 mb-1.5 leading-tight">
                {loading ? '' : (superAdminUser?.email || '')}
              </p>
            </div>
          </div>

          {/* Super Admin Badge */}
          {!loading && (
            <div className="absolute left-4 right-4 -bottom-8 bg-white border border-yellow-200 rounded-xl p-3 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-yellow-100 to-amber-100">
                  <span className="text-base">👑</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Super Admin</p>
                  <p className="text-xs text-gray-500">Full Access</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 pt-14 pb-4">
          {/* Menu Options - Grid Layout */}
          <div className="grid grid-cols-1 gap-3">
            {/* You can add other profile-specific links here if needed */}
          </div>
        </div>

        {/* Fixed Bottom Actions - Outside scrollable area */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-2.5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-red-200 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9997]"
          onClick={(e) => {
            e.stopPropagation();
            toggleSidebar();
          }}
        />
      )}
    </>
  );
};

export default SuperAdminProfileSidebar;
