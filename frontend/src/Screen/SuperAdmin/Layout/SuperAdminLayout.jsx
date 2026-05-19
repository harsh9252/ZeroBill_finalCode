/**
 * Super Admin Layout Component
 * 
 * Main layout wrapper for all Super Admin pages
 * Includes Header and Sidebar
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SuperAdminHeader from '../Header/SuperAdminHeader';
import SuperAdminSidebar from '../Sidebar/SuperAdminSidebar';

export default function SuperAdminLayout({ children, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Map routes to page names
  const pageNames = {
    'dashboard': 'Dashboard',
    'approvals': 'Account Approvals',
    'active-users': 'Active Users',
    'transactions': 'Transactions',
    'plans': 'Plans',
    'inactive-users': 'Deactivated Users',
    'demo-management': 'Demo Management',
    'settings': 'Settings'
  };

  // Update current page based on route
  useEffect(() => {
    const pathname = location.pathname.replace(/^\/superadmin\//, '');
    const pageName = pageNames[pathname] || 'Dashboard';
    setCurrentPage(pageName);
  }, [location.pathname]);

  const handleNavigate = (path) => {
    navigate(`/superadmin/${path}`);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('superAdminAuth');
      localStorage.removeItem('superAdminUser');
      navigate('/superadmin/login', { replace: true });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <SuperAdminSidebar
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        {/* Header */}
        <SuperAdminHeader
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          collapsed={sidebarCollapsed}
          onLogout={handleLogout}
          currentPage={currentPage}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pt-20 sm:pt-24 md:pt-24 lg:pt-24 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
