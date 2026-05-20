import {
  LayoutDashboard,
  FileText,
  Quote,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Boxes,
  ShoppingCart,
  ClipboardList,
  FileSignature,
  CloudUpload,
  IndianRupee,
  Undo2,
  FileBarChart2,
  Truck,
  RotateCw,
  FileMinus,
  FilePlus,
  Wallet,
  BarChart,
  ArrowLeft,
  User,
  Building,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Settings2,
  GitFork
} from 'lucide-react';

import { useState, useMemo, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import sidebarConfig from '../../../Jsonfiles/sidebarjson.json';
import { useNavigate } from "react-router-dom";

// If using Supabase, uncomment:
// import { supabase } from "@/integrations/supabase/client";

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Boxes,
  Quote,
  FileText,
  ShoppingCart,
  FileSignature,
  ClipboardList,
  CloudUpload,
  BarChart3,
  Settings,
  LogOut,
  IndianRupee,
  Undo2,
  FileBarChart2,
  Truck,
  RotateCw,
  FileMinus,
  FilePlus,
  Wallet,
  BarChart,
  ArrowLeft,
  User,
  Building,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Settings2,
  GitFork
};

export default function Sidebar({ onNavigate, collapsed = false, onToggle, onLogout, isPlanExpired, checkPlanExpiry, hasBusiness, checkBusiness }) {
  const [active, setActive] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState(new Set());
  const [companyLogo, setCompanyLogo] = useState(sidebarConfig.logo || '/logo-png.png');
  const [businessType, setBusinessType] = useState(null);
  const [taxType, setTaxType] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch business type from API
  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        if (!selectedBusinessId) return;

        // Import businessAPI dynamically to avoid circular dependencies
        const { businessAPI } = await import('../../../utils/api');
        const response = await businessAPI.getById(selectedBusinessId);

        if (response.success && response.data) {
          const business = response.data;
          const type = business.business_type || business.businessType;
          const detectedTaxType = business.vat_number ? 'VAT' : (business.gstin ? 'GST' : 'No');
          
          setBusinessType(type);
          setTaxType(detectedTaxType);
          localStorage.setItem('currentBusinessType', type);
          localStorage.setItem('currentTaxType', detectedTaxType);
        }
      } catch (error) {
        console.error('Error fetching business type:', error);
      }
    };

    // Load business type and tax type from localStorage on mount
    const savedBusinessType = localStorage.getItem('currentBusinessType');
    const savedTaxType = localStorage.getItem('currentTaxType');
    if (savedBusinessType) {
      setBusinessType(savedBusinessType);
    }
    if (savedTaxType) {
      setTaxType(savedTaxType);
    }

    fetchBusinessType();

    // Listen for business changes
    const handleBusinessChange = () => {
      fetchBusinessType();
    };

    window.addEventListener('businessChanged', handleBusinessChange);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, []);

  // Listen for logo updates from BusinessManagement
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { logoUrl } = event.detail;
      if (logoUrl) {
        setCompanyLogo(logoUrl);
        localStorage.setItem('currentBusinessLogo', logoUrl);
      } else {
        setCompanyLogo(sidebarConfig.logo || '/logo-png.png');
        localStorage.removeItem('currentBusinessLogo');
      }
    };

    // Load logo from localStorage on mount
    const savedLogo = localStorage.getItem('currentBusinessLogo');
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }

    window.addEventListener('businessLogoUpdated', handleLogoUpdate);
    return () => {
      window.removeEventListener('businessLogoUpdated', handleLogoUpdate);
    };
  }, []);

  /* -----------------------------
     ✅ SHARED ASYNC LOGOUT FUNCTION
  ------------------------------*/
  const handleLogout = async () => {
    try {
      // Call the parent's logout handler if provided
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      } else {
        // Fallback: Clear stored session data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('zbe-authenticated');
        sessionStorage.clear();

        // Redirect to login
        navigate("/login", { replace: true });
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

  const items = useMemo(
    () => {
      const userType = localStorage.getItem('userType');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isSubUser = userType === 'subUser' || user.isSubUser;
      const permissions = Array.isArray(user.permissions) ? user.permissions : (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : []);

      return (sidebarConfig.items || [])
        .filter((item) => {
          if (item.hidden) return false;
          // Show E-Invoice only for GST businesses
          if (item.key === 'eInvoice' && (taxType || 'No').toUpperCase().trim() !== 'GST') return false;

          // Permission check for sub-users
          if (isSubUser) {
            // Dashboard is usually allowed by default, but we can make it strictly permission-based
            if (!permissions.includes(item.key)) return false;
          }

          return true;
        })
        .map((item) => {
          let label = item.label;

          // Change "Inventory" to "Services" if business type is "Services"
          if (item.key === 'inventory' && businessType === 'Services') {
            label = 'Services';
          }

          const mappedItem = {
            ...item,
            label,
            icon: createIconElement(item.icon, item.color || 'text-gray-600'),
            path: item.path || item.key,
          };

          if (item.children) {
            mappedItem.children = item.children.map(child => ({
              ...child,
              icon: createIconElement(child.icon, child.color || 'text-gray-600'),
              path: child.path || child.key,
            }));
          }

          return mappedItem;
        })
    },
    [sidebarConfig.items, businessType, taxType, localStorage.getItem('user')]
  );

  const settingsItems = useMemo(
    () => {
      // Get user type to filter settings items
      const userType = localStorage.getItem('userType');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isSubUser = userType === 'subUser' || user.isSubUser;

      const permissions = Array.isArray(user.permissions) ? user.permissions : (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : []);

      return (sidebarConfig.setting || [])
        .filter((item) => {
          // Hide manageUser for sub-users
          if (item.key === 'manageUser' && isSubUser) {
            return false;
          }

          // Permission check for sub-users
          if (isSubUser) {
            if (!permissions.includes(item.key)) return false;
          }

          return true;
        })
        .map((item) => ({
          ...item,
          label: item.label,
          icon: createIconElement(item.icon, item.color || 'text-gray-600'),
          path: item.path || item.key,
        }));
    },
    [sidebarConfig.setting, localStorage.getItem('user')]
  );

  const isSettingsPage = ['/profile', '/account', '/business', '/manageUser', '/voucher-settings', '/approval-workflow'].includes(location.pathname);
  const currentItems = isSettingsPage ? settingsItems : items;

  const footerItems = useMemo(
    () => {
      let items = (sidebarConfig.footerItems || []).map((item) => ({
        ...item,
        label: item.label,
        icon: createIconElement(item.icon, item.color || 'text-gray-600'),
      }));

      if (isSettingsPage) {
        items.unshift({
          key: 'backToDashboard',
          label: 'Back to Dashboard',
          icon: createIconElement('ArrowLeft', 'text-gray-600'),
          path: 'dashboard',
        });
      }

      return items;
    },
    [sidebarConfig.footerItems, isSettingsPage]
  );

  const handleNavigation = (item) => {
    const targetKey = item.key || 'dashboard';
    const targetPath = item.path || targetKey;

    if (item.children && !collapsed) {
      setExpandedMenus(prev => {
        const next = new Set(prev);
        if (next.has(targetKey)) {
          next.delete(targetKey);
        } else {
          next.add(targetKey);
        }
        return next;
      });
    }

    // Define allowed paths even for expired users or users without a business
    const allowedPaths = ['dashboard', 'support', 'business', 'account', 'profile', 'manageUser'];
    const isAllowed = allowedPaths.includes(targetKey) || allowedPaths.includes(targetPath);

    if (!hasBusiness && !isAllowed) {
      if (typeof checkBusiness === 'function') {
        checkBusiness();
        return;
      }
    }

    if (isPlanExpired && !isAllowed) {
      if (typeof checkPlanExpiry === 'function') {
        checkPlanExpiry();
        return;
      }
    }

    setActive(targetKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof onNavigate === 'function') {
      onNavigate(targetPath);
    }
  };

  /* -----------------------------
       Footer Navigation (updated)
   ------------------------------*/
  const handleFooterNavigation = (item) => {
    if (item.key === 'logout') {
      handleLogout();   // ← 🟢 RUNS ASYNC LOGOUT
      return;
    }

    if (item.key === 'settings') {
      onNavigate?.('settings');
    }

    if (item.key === 'backToDashboard') {
      onNavigate?.('dashboard');
      setActive('dashboard');
      return;
    }

    // Check plan expiry for footer items too if needed
    if (isPlanExpired && item.key !== 'backToDashboard' && item.key !== 'settings') {
      // if settings is account/profile, it's allowed. If it's something else, maybe not.
      // For now, let's keep footer items simple or apply check if they map to restricted pages.
    }

    setActive(item.key);
  };

  useEffect(() => {
    const pathname = location.pathname.replace(/^\/+/, '') || 'dashboard';
    
    // Path mapping for special cases
    const pathMapping = {
      'profile': 'business',
      'sales-leads': 'salesLead',
      'lead-management': 'salesLead',
      'voucher-settings': 'voucherSettings',
      'approval-workflow': 'approvalWorkflow'
    };

    const activeKey = pathMapping[pathname] || pathname;
    
    if (activeKey !== active) {
      setActive(activeKey);
    }
  }, [location.pathname, active]);

  return (
    <aside
      className={`sidebarbackground hidden lg:flex flex-col
      fixed border-r border-r-yellow-300
      p-0 top-0 left-0
      border-white/30 h-screen
      transition-all duration-300 z-[50] ${collapsed ? 'w-20' : 'w-60'}`}
    >
      {/* HEADER */}
      <div className="top-0 z-20 flex items-center justify-center px-3 py-[10px] border-b border-yellow-200 bg-transparent"
      >
        <div
          className="flex-shrink-0 overflow-hidden h-12 w-auto max-w-48 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/dashboard')}
          title="Go to Dashboard"
        >
          <img
            src={companyLogo}
            alt="Company Logo"
            className="w-full h-full object-cover transition-all duration-300"
            onError={(e) => {
              e.currentTarget.src = sidebarConfig.logo || '/logo-png.png';
              setCompanyLogo(sidebarConfig.logo || '/logo-png.png');
            }}
          />
        </div>
      </div>



      {/* MAIN NAV ITEMS */}
      <nav className={`flex-1 overflow-y-auto py-2 px-2 ${collapsed ? 'pr-3' : 'pr-2'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {currentItems.map((item) => {
          const isExpanded = expandedMenus.has(item.key);
          const hasChildren = item.children && item.children.length > 0;
          const isActive = active === item.key || (hasChildren && item.children.some(child => active === child.key));

          return (
            <div key={item.key} className="mb-1">
              <button
                onClick={() => handleNavigation(item)}
                className={`group flex items-center justify-between w-full p-2 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-md' : 'hover:bg-yellow-50/40'
                  } ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/30 border border-white/10 transition-all">
                    {item.icon}
                  </div>
                  {!collapsed && <div className="font-medium text-gray-800">{item.label}</div>}
                </div>
                {!collapsed && hasChildren && (
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </div>
                )}
              </button>

              {/* Sub-items list */}
              {!collapsed && hasChildren && (
                <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100 mt-1 px-1 pb-2' : 'max-h-0 opacity-0'}`}>
                  {item.children.map((child) => (
                    <button
                      key={child.key}
                      onClick={() => handleNavigation(child)}
                      className={`group flex items-center gap-3 w-full p-2 pl-12 rounded-xl transition-all ${active === child.key ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-md' : 'hover:bg-yellow-50/40'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-white/30 border border-white/10`}>
                        {child.icon}
                      </div>
                      <div className={`font-medium ${active === child.key ? 'text-yellow-700' : 'text-gray-800'}`}>
                        {child.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* FOOTER ITEMS */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white/70 via-white/40 to-transparent border-t border-t border-yellow-200 ">
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
