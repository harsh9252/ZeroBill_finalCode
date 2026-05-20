import { useMemo, useState } from "react";
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
  Building,  // <-- add for Manage Business
  Plus,   // <-- add
  X,       // <-- add
  TrendingUp,
  Settings2,
  GitFork
} from 'lucide-react';

import sidebarConfig from "../Jsonfiles/sidebarjson.json";

// Map JSON icon names -> lucide components
const ICON_MAP = {
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
  Building, // <-- add for Manage Business
  Plus, // <-- add
  X,     // <-- add
  TrendingUp,
  Settings2,
  GitFork
};


const BottomIcon = ({ label, icon, onClick, active = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center p-2 rounded-full transition-colors ${active ? "text-green-600 bg-transparent" : "text-gray-600 hover:bg-gray-100"
      }`}
  >
    <div className={`h-5 w-5 ${active ? "text-green-600" : ""}`}>{icon}</div>
    <span
      className={`text-xs mt-1 font-medium ${active ? "text-green-600" : "text-gray-600"
        }`}
    >
      {label}
    </span>
  </button>
);

export default function MobileBottomNav({ onNavigate, currentPage, isPlanExpired, checkPlanExpiry }) {
  const [isGridOpen, setIsGridOpen] = useState(false);

  const createIcon = (name, color) => {
    const C = ICON_MAP[name];
    return C ? (
      <C className={`h-7 w-7 ${color || "text-gray-700"}`} />
    ) : (
      <div className="h-7 w-7 bg-gray-200 rounded" />
    );
  };

  // Translate only i18n-like keys (e.g., "sidebar.dashboard")
  const localize = (label) =>
    typeof label === "string" && /^sidebar\./.test(label) ? (label) : label;

  // Check if current page is a settings page
  const isSettingsPage = (() => {
    if (!currentPage) return false;

    const userType = localStorage.getItem('userType');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSubUser = userType === 'subUser' || user.isSubUser;

    const settingsPages = ['profile', 'account', 'business'];

    // Only include manageUser for main users
    if (!isSubUser) {
      settingsPages.push('manageUser');
    }

    return settingsPages.includes(currentPage.key);
  })();

  const mainItems = useMemo(
    () => {
      const taxType = (localStorage.getItem('currentTaxType') || 'No').toUpperCase().trim();
      return (sidebarConfig.items || [])
        .filter(it => {
          if (it.key === 'eInvoice' && taxType !== 'GST') return false;
          return true;
        })
        .map((it) => ({
          ...it,
          label: localize(it.label),
          _iconEl: createIcon(it.icon, it.color),
        }));
    },
    []
  );

  const settingItems = useMemo(
    () =>
      (sidebarConfig.setting || []).map((it) => ({
        ...it,
        label: localize(it.label),
        _iconEl: createIcon(it.icon, it.color),
      })),
    []
  );

  const footerItems = useMemo(
    () =>
      (sidebarConfig.footerItems || [])
        .filter((f) => f.key !== "logout") // Keep logout out of the quick grid
        .map((it) => ({
          ...it,
          label: localize(it.label),
          _iconEl: createIcon(it.icon, it.color),
        })),
    []
  );

  // Use setting items if on settings page, otherwise use main items
  const GRID_ITEMS = isSettingsPage
    ? [...settingItems, ...footerItems]
    : [...mainItems, ...footerItems];

  // Centralized navigation -> parent
  const go = (itemOrKey) => {
    const target =
      typeof itemOrKey === "string"
        ? itemOrKey
        : itemOrKey?.path || itemOrKey?.key || "";

    // Define allowed paths even for expired users
    const allowedPaths = ['dashboard', 'support', 'business', 'account', 'profile'];
    const isAllowed = allowedPaths.includes(target);

    if (isPlanExpired && !isAllowed) {
      if (typeof checkPlanExpiry === 'function') {
        checkPlanExpiry();
        return;
      }
    }

    setIsGridOpen(false);
    if (typeof onNavigate === "function") onNavigate(target);
  };

  return (
    <>
      {/* Full-screen two-column grid like your reference image */}
      <div className={`fixed inset-0 z-[900] bg-white lg:hidden flex flex-col transition-transform duration-300 ${isGridOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <button
            type="button"
            onClick={() => setIsGridOpen(false)}
            className="p-1 -ml-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-semibold">What are you offering?</h2>
        </div>

        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-y">
            {GRID_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item)}
                className="flex flex-col items-center justify-center gap-2 py-6 px-4 active:bg-gray-50 hover:bg-gray-100"
              >
                <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                  {item._iconEl}
                </div>
                <span className="text-[13px] leading-tight text-gray-700 text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Back to Dashboard Button - Only on Settings Pages */}
        {(() => {
          const userType = localStorage.getItem('userType');
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const isSubUser = userType === 'subUser' || user.isSubUser;

          // Show back button for account and business pages, and manageUser only for main users
          const showBackButton = currentPage?.key === 'account' ||
            currentPage?.key === 'business' ||
            (currentPage?.key === 'manageUser' && !isSubUser);

          return showBackButton;
        })() && (
            <div className="sticky bottom-0 p-3 border-t border-gray-200 bg-white shadow-lg flex justify-center">
              <button
                type="button"
                onClick={() => go("dashboard")}
                className="w-11/12 max-w-xs flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:shadow-xl hover:shadow-green-300/50 hover:scale-105 hover:from-green-600 hover:to-green-700 transition-all duration-200 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          )}
      </div>

      {/* Bottom bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-white rounded-t-[40px] shadow-2xl p-2 flex items-center justify-around border border-white/20 w-full">
          <BottomIcon
            label={("Dashboard")}
            icon={<LayoutDashboard className="h-5 w-5" />}
            onClick={() => go("dashboard")}
            active={currentPage?.key === 'dashboard'}
          />
          <BottomIcon
            label={("Quotations")}
            icon={<Quote className="h-5 w-5" />}
            onClick={() => go("quotation")}
            active={currentPage?.key === 'quotation'}
          />

          <button
            type="button"
            onClick={() => setIsGridOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#129046] to-[#9ccc53] flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Open quick menu"
          >
            <Plus className="h-7 w-7" />
          </button>

          <BottomIcon
            label={("Invoice")}
            icon={<FileText className="h-5 w-5" />}
            onClick={() => go("invoice")}
            active={currentPage?.key === 'invoice'}
          />
          <BottomIcon
            label={("Inventory")}
            icon={<Boxes className="h-5 w-5" />}
            onClick={() => go("inventory")}
            active={currentPage?.key === 'inventory'}
          />
        </div>
      </nav>
    </>
  );
}
