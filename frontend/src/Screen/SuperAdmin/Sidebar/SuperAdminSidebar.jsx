/**
 * Super Admin Sidebar Component
 * 
 * Features:
 * - Same design as Admin Sidebar
 * - Super Admin specific menu items:
 *   - Active Users
 *   - Transactions
 *   - Inactive/Deleted Users
 * - Responsive design with collapsible functionality
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Trash2,
  Settings,
  LogOut,
  ArrowLeft,
  CheckCircle,
  CalendarDays,
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard,
  Users,
  CreditCard,
  Trash2,
  Settings,
  LogOut,
  ArrowLeft,
  CheckCircle,
  CalendarDays,
};

export default function SuperAdminSidebar({ onNavigate, collapsed = false, onToggle, onLogout }) {
  const [active, setActive] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  const superAdminLogo = '/logo-png.png';

  const handleLogout = async () => {
    try {
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('superAdminAuth');
        sessionStorage.clear();
        navigate("/superadmin/login", { replace: true });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const createIconElement = (iconName, color) => {
    const IconComponent = ICON_MAP[iconName];
    if (!IconComponent) {
      console.warn(`Icon ${iconName} not found in ICON_MAP`);
      return <div className="h-5 w-5 bg-gray-300 rounded" />;
    }
    return <IconComponent className={`h-5 w-5 ${color}`} />;
  };

  // Super Admin Menu Items
  const items = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: createIconElement('LayoutDashboard', 'text-gray-600'),
        path: 'dashboard',
      },
      // {
      //   key: 'approvals',
      //   label: 'Account Approvals',
      //   icon: createIconElement('CheckCircle', 'text-gray-600'),
      //   path: 'approvals',
      // },
      {
        key: 'activeUsers',
        label: 'Active Users',
        icon: createIconElement('Users', 'text-gray-600'),
        path: 'active-users',
      },
      {
        key: 'transactions',
        label: 'Transactions',
        icon: createIconElement('CreditCard', 'text-gray-600'),
        path: 'transactions',
      },
      {
        key: 'plans',
        label: 'Plans',
        icon: createIconElement('CreditCard', 'text-gray-600'),
        path: 'plans',
      },
      {
        key: 'inactiveUsers',
        label: 'Deactivate Users',
        icon: createIconElement('Trash2', 'text-gray-600'),
        path: 'inactive-users',
      },
      // {
      //   key: 'demoManagement',
      //   label: 'Demo Management',
      //   icon: createIconElement('CalendarDays', 'text-gray-600'),
      //   path: 'demo-management',
      // },
    ],
    []
  );

  const footerItems = useMemo(
    () => [
      {
        key: 'logout',
        label: 'Logout',
        icon: createIconElement('LogOut', 'text-red-600'),
      },
    ],
    []
  );

  const handleNavigation = (item) => {
    const targetKey = item.key || 'dashboard';
    const targetPath = item.path || targetKey;

    // Set active immediately for UI feedback
    setActive(targetKey);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof onNavigate === 'function') {
      onNavigate(targetPath);
    }
  };

  const handleFooterNavigation = (item) => {
    if (item.key === 'logout') {
      handleLogout();
      return;
    }
  };

  useEffect(() => {
    const pathname = location.pathname.replace(/^\/+/, '') || 'dashboard';

    let activeKey = 'dashboard';

    if (pathname.includes('approvals')) {
      activeKey = 'approvals';
    } else if (pathname.includes('inactive-users')) {
      activeKey = 'inactiveUsers';
    } else if (pathname.includes('active-users')) {
      activeKey = 'activeUsers';
    } else if (pathname.includes('transactions')) {
      activeKey = 'transactions';
    } else if (pathname.includes('plans')) {
      activeKey = 'plans';
    } else if (pathname.includes('settings')) {
      activeKey = 'settings';
    } else if (pathname.includes('demo-management')) {
      activeKey = 'demoManagement';
    }

    setActive(activeKey);
  }, [location.pathname]);

  return (
    <aside
      className={`sidebarbackground hidden lg:flex flex-col
      fixed border-r border-r-yellow-300
      p-0 top-0 left-0
      border-white/30 h-screen
      transition-all duration-300 z-[50] ${collapsed ? 'w-20' : 'w-60'}`}
    >
      {/* HEADER */}
      <div className="top-0 z-20 flex items-center justify-center px-3 py-[10px] border-b border-yellow-200 bg-transparent">
        <div
          className="flex-shrink-0 overflow-hidden h-12 w-auto max-w-48 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/superadmin/dashboard')}
          title="Go to Dashboard"
        >
          <img
            src={superAdminLogo}
            alt="Company Logo"
            className="w-full h-full object-cover transition-all duration-300"
          />
        </div>
      </div>

      {/* MAIN NAV ITEMS */}
      <nav className={`flex-1 overflow-y-auto py-2 px-2 ${collapsed ? 'pr-3' : 'pr-2'}`}>
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavigation(item)}
            className={`group flex items-center gap-3 w-full p-2 rounded-xl transition-all ${active === item.key ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-md' : 'hover:bg-yellow-50/40'
              } ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/30 border border-white/10 transition-all">
              {item.icon}
            </div>
            {!collapsed && <div className="font-medium text-gray-800">{item.label}</div>}
          </button>
        ))}
      </nav>

      {/* FOOTER ITEMS */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white/70 via-white/40 to-transparent border-t border-t border-yellow-200">
        <div className="flex flex-col gap-2">
          {footerItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleFooterNavigation(item)}
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/40 transition-all ${collapsed ? 'justify-center' : ''
                }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-lg bg-white/30 border border-white/10 ${item.key === 'logout' ? 'hover:bg-red-50' : ''
                  }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <div className={item.key === 'logout' ? 'text-red-600 text-sm' : 'text-gray-800 text-sm'}>
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
