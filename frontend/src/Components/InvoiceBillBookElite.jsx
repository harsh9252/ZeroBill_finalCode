import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../Screen/Admin/Sidebar/Sidebar";
import Header from "./Header";
import CommonDropdown from "./CustomDropdown";
import MobileBottomNav from "./MobileBottomNav";
// import LocationDetectionBanner from "./LocationDetectionBanner"; // Removed - location detection runs in backend only
import GoogleTranslate from "./GoogleTranslate";
import MainLoader from "./MainLoader";

import { authAPI, businessAPI } from "../utils/api";
import { useActionMessage } from "../contexts/ActionMessageContext";
import Swal from "sweetalert2";
import { showCustomDialog } from "./ActionMessageModel";



import Dashboard from "../Screen/Admin/Dashboard/Dashboard";
import Parties from "../Screen/Admin/Parties/Parties";
import Inventory from "../Screen/Admin/Inventory/Inventory";
import Quotation from "../Screen/Admin/Quotation/Quotation";
import SalesInvoice from "../Screen/Admin/SalesInvoice/SalesInvoice";
import Payment from "../Screen/Admin/PaymentIn/Payment";
import PaymentOut from "../Screen/Admin/PaymentOut/PaymentOut";
import SalesReturn from "../Screen/Admin/SalesReturn/SalesReturn";
import DeliveryChallan from "../Screen/Admin/DeliveryChallan/DeliveryChallan";
import ProformaInvoice from "../Screen/Admin/ProformaInvoice/ProformaInvoice";
const BookPurchaseOrder = lazy(() => import('../Screen/Admin/PurchaseInvoice/BookPurchaseOrder'));
const CustomQuotation = lazy(() => import('../Screen/Admin/Quotation/CustomQuotation'));
const Agreement = lazy(() => import('../Screen/Admin/Contract/Contract'));
const BookInvoice = lazy(() => import('../Screen/Admin/BookInvoice/BookInvoice'));
const PurchaseReturn = lazy(() => import('../Screen/Admin/PurchaseReturn/PurchaseReturn'));
const SalesLeadView = lazy(() => import('../Screen/Admin/SalesLead/SalesLeadView'));
const LeadManagement = lazy(() => import('../Screen/Admin/SalesLead/LeadManagement'));
import CreditNote from "../Screen/Admin/CreditNote/CreditNote";
// import Expenses from "../Screen/Admin/Expenses/Expenses"; // TODO: Create Expenses component
import PurchaseOrder from "../Screen/Admin/PurchaseOrder/PurchaseOrder";
import DebitNote from "../Screen/Admin/DebitNote/DebitNote";
import ProjectExpense from "../Screen/Admin/ProjectExpense/ProjectExpense";
import Reportspanel from "../Screen/Admin/Reportspanel";
import EInvoice from "../Screen/Admin/EInvoice/eInvoice";
import ZKhataBook from "../Screen/Admin/ZKhataBook/ZKhataBook";
import Ledger from "../Screen/Admin/Ledger/Ledger";
import Documents from "../Screen/Admin/Documents/Documents";
import GRN from "../Screen/Admin/GRN/GRN";
import MRN from "../Screen/Admin/MRN/MRN";
import PurchaseRequisitionList from "../Screen/Admin/PurchaseRequisition/PurchaseRequisitionList";
import { websiteUrl } from '../config/appConfig';

import Account from "../Screen/Admin/Setting/Account";
import BusinessManagement from "../Screen/Admin/Setting/BusinessManagement";
import VoucherSetting from "../Screen/Admin/Setting/VoucherSetting";
import Support from "../Screen/Admin/Support/Support";

import { COUNTRY_OPTIONS } from "../utils/dropdownOptions";
import { CURRENCY_SYMBOLS, getCurrencyRate, refreshRates } from "../config/currencyConfig";
import { autoDetectLocalization, markAutoDetectDone, getStoredLocationInfo } from "../utils/geolocationService";

// Manager user
import ManageUser from "../Screen/Admin/ManageUsers/ManageUser";
import PlanExpiryModal from "./PlanExpiryModal";

/* ========================
   LANGUAGE OPTIONS
========================= */
const SUPPORTED_LANGUAGES = [...new Set(COUNTRY_OPTIONS.map(opt => opt.code.split("-")[0]))].join(",");
const languageOptions = COUNTRY_OPTIONS.map(opt => ({ id: opt.code, label: opt.label }));
const currencyOptions = Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({ id: code, label: `${code} (${symbol})` }));

/* ==========================
   ROBUST REDIRECT FOR UNKNOWN PATHS
============================= */
const NotFoundRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Force redirect to dashboard if the path is unknown
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, location]);

  return null;
};

/* ==========================
   MAIN COMPONENT
============================= */
export default function InvoiceBillBookElite({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();



  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const [isPlanExpired, setIsPlanExpired] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.isPlanExpired || false;
  });

  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem("siteLang") || "en-US");
  const [currency, setCurrency] = useState(localStorage.getItem("siteCurrency") || "USD");
  const [amount, setAmount] = useState(1);
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [billingExpiryDate, setBillingExpiryDate] = useState(null);
  const [hasBusiness, setHasBusiness] = useState(true); // Default to true to avoid flash
  const [isCheckingBusiness, setIsCheckingBusiness] = useState(true);
  const [taxType, setTaxType] = useState(localStorage.getItem('currentTaxType') || 'No');
  const [businessType, setBusinessType] = useState(localStorage.getItem('currentBusinessType') || null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const userType = localStorage.getItem('userType');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Robust sub-user check (handles case sensitivity and multiple flags)
  const isSubUser = useMemo(() => {
    const isSubString = (userType || '').toLowerCase() === 'subuser';
    const hasSubFlag = user.isSubUser === true || user.isSubUser === 1 || user.isSubUser === '1';
    return isSubString || hasSubFlag;
  }, [userType, user.isSubUser]);

  // Debug logging for localhost/dev environments
  useEffect(() => {
    if (import.meta.env.DEV) {

    }
  }, [userType, isSubUser, hasBusiness, location.pathname]);

  /* ==========================
     GOOGLE TRANSLATE - APPLY LANGUAGE
  ========================== */
  const applyLanguage = useCallback((langCode) => {

    // For English variants, we want to block translation immediately
    const baseLang = langCode ? langCode.split("-")[0] : null;
    if (baseLang === "en") {

      document.body.classList.add('notranslate');
      document.documentElement.classList.add('notranslate');
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.setAttribute('lang', 'en');
    } else {

      document.body.classList.remove('notranslate');
      document.documentElement.classList.remove('notranslate');
      document.documentElement.removeAttribute('translate');
      document.documentElement.setAttribute('lang', baseLang || 'en');
    }

    const select = document.querySelector(".goog-te-combo");
    if (!select) {
      // For English, if widget isn't found, we just applied notranslate above, so we're good.
      // No need to poll infinitely for the widget just to clear its value.
      if (baseLang === "en") {

        return;
      }


      // Limit retries to 10 attempts (5 seconds)
      window.__langRetries = (window.__langRetries || 0) + 1;
      if (window.__langRetries < 20) {
        setTimeout(() => applyLanguage(langCode), 500);
      } else {
        console.warn("[InvoiceBillBookElite] .goog-te-combo retry limit reached.");
        window.__langRetries = 0;
      }
      return;
    }
    window.__langRetries = 0; // Reset on success

    try {
      if (baseLang === "en") {

        select.value = "";
        select.dispatchEvent(new Event("change", { bubbles: true }));

        const domains = [
          window.location.hostname,
          '.' + window.location.hostname,
          window.location.hostname.split('.').slice(-2).join('.'),
          '.' + window.location.hostname.split('.').slice(-2).join('.')
        ];

        const cookiePaths = ['/', '/app', '/dashboard'];
        domains.forEach(domain => {
          cookiePaths.forEach(path => {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain.replace(/^\./, '')};`;
            // Also try clearing without domain for local testing
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
          });
        });

        document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
        document.body.classList.remove('translated-ltr', 'translated-rtl');
        document.body.style.top = '0px';

        if (window.google?.translate?.TranslateElement) {
          try {
            const instance = window.google.translate.TranslateElement.getInstance();
            if (instance && instance.restore) {

              instance.restore();
            }
          } catch (e) { }
        }
      } else {

        select.value = baseLang;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) {
      console.error("[InvoiceBillBookElite] applyLanguage error:", e);
    }
  }, []);

  /* ==========================
     PLAN EXPIRY SYNC
  ========================== */
  useEffect(() => {
    const syncPlanStatus = async () => {
      try {
        const response = await authAPI.getProfile();
        if (response.success && response.data) {
          const { isPlanExpired, billingPeriodEnd } = response.data;



          setIsPlanExpired(isPlanExpired);
          setBillingExpiryDate(billingPeriodEnd);

          // Sync localStorage
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({
            ...user,
            isPlanExpired,
            billingPeriodEnd
          }));
        }
      } catch (error) {
        console.error('[PlanSync] Failed to sync plan status:', error);
      }
    };

    syncPlanStatus();
  }, []);

  /* ==========================
     BUSINESS CHECK & GUARD
  ========================== */
  const fetchBusinesses = useCallback(async () => {
    try {
      setIsCheckingBusiness(true);
      const response = await businessAPI.getAll();
      if (response.success) {
        const businesses = response.data || [];
        setHasBusiness(businesses.length > 0);

        // If we have businesses but none is selected in localStorage, select the first one
        if (businesses.length > 0 && !localStorage.getItem('selectedBusinessId')) {
          const firstBusiness = businesses[0];
          localStorage.setItem('selectedBusinessId', firstBusiness.id);
          const detectedTaxType = firstBusiness.vat_number ? 'VAT' : (firstBusiness.gstin ? 'GST' : 'No');
          localStorage.setItem('currentTaxType', detectedTaxType);
          setTaxType(detectedTaxType);

          const type = firstBusiness.business_type || firstBusiness.businessType;
          localStorage.setItem('currentBusinessType', type);
          setBusinessType(type);

          // Trigger event for components listening
          window.dispatchEvent(new CustomEvent('businessChanged', {
            detail: { businessId: firstBusiness.id, triggeredBy: 'InvoiceBillBookElite' }
          }));
        } else if (businesses.length > 0) {
          // If a business is already selected, verify it still exists and is active
          const storedId = localStorage.getItem('selectedBusinessId');
          const selectedId = storedId ? parseInt(storedId) : null;
          const selectedBusiness = businesses.find(b => b.id === selectedId);

          if (selectedBusiness) {
            // Business exists, sync current settings
            const detectedTaxType = selectedBusiness.vat_number ? 'VAT' : (selectedBusiness.gstin ? 'GST' : 'No');
            localStorage.setItem('currentTaxType', detectedTaxType);
            setTaxType(detectedTaxType);

            const type = selectedBusiness.business_type || selectedBusiness.businessType;
            localStorage.setItem('currentBusinessType', type);
            setBusinessType(type);
          } else {
            // Stale or deleted Business ID found - auto-switch to the first available business
            const firstBusiness = businesses[0];
            localStorage.setItem('selectedBusinessId', firstBusiness.id);

            const detectedTaxType = firstBusiness.vat_number ? 'VAT' : (firstBusiness.gstin ? 'GST' : 'No');
            localStorage.setItem('currentTaxType', detectedTaxType);
            setTaxType(detectedTaxType);

            const type = firstBusiness.business_type || firstBusiness.businessType;
            localStorage.setItem('currentBusinessType', type);
            setBusinessType(type);

            // Notify rest of the app about the forced business change
            window.dispatchEvent(new CustomEvent('businessChanged', {
              detail: { businessId: firstBusiness.id, triggeredBy: 'InvoiceBillBookElite' }
            }));
          }
        }
      }
    } catch (error) {
      console.error('[BusinessCheck] Failed to fetch businesses:', error);
    } finally {
      setIsCheckingBusiness(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();

    // Also refetch when businesses change (created/deleted/switched)
    const handleBusinessRefresh = (event) => {
      // Prevent infinite loop: ignore events triggered by this component itself
      if (event.detail?.triggeredBy === 'InvoiceBillBookElite') return;

      fetchBusinesses();

      const savedTaxType = localStorage.getItem('currentTaxType');
      if (savedTaxType) setTaxType(savedTaxType);

      const savedBusinessType = localStorage.getItem('currentBusinessType');
      if (savedBusinessType) setBusinessType(savedBusinessType);
    };
    window.addEventListener('businessChanged', handleBusinessRefresh);
    return () => window.removeEventListener('businessChanged', handleBusinessRefresh);
  }, [fetchBusinesses]);

  const showBusinessRequiredModal = useCallback(() => {
    // HARD BLOCK FOR SUB-USERS: They should never see this popup
    if (isSubUser) return;

    // Modal content
    const title = "Business Required";
    const message = "You need to create a business first before adding regular data.";
    const btnText = "Create Business";
    const targetUrl = "/business?create=true";

    showCustomDialog(`
      <div style="text-align: left; padding: 10px 0;">
        <div style="display: flex; justify-content: center; margin-bottom: 20px;">
           <div style="width: 60px; height: 60px; background: #EEF2FF; border-radius: 12px; display: flex; items-center; justify-content: center;">
              <svg style="width: 32px; height: 32px; color: #4F46E5;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
           </div>
        </div>
        <h2 style="text-align: center; font-size: 24px; font-weight: 700; color: #1F2937; margin-bottom: 10px;">${title}</h2>
        <p style="margin-bottom: 15px; color: #4B5563; font-size: 15px; text-align: center;">
          ${message}
        </p>
        <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          Parties are associated with your business
          </p>
        </div>
        <p style="margin: 0; color: #6B7280; font-size: 14px; text-align: center; margin-top: 10px;">
          Would you like to create a business now?
        </p>
      </div>
    `, {
      title: "",
      confirmButtonText: btnText,
      confirmButtonColor: "#4F46E5",
      allowOutsideClick: false,
      allowEscapeKey: false,
      width: '450px',
      customClass: {
        confirmButton: 'w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(targetUrl);
      }
    });
  }, [navigate, isSubUser]);

  useEffect(() => {
    // Guard for sub-users: If they have no business, they are restricted from business modules (Dashboard, Parties, etc.)
    // but allowed to access Account, Support, and Profile pages.
    if (!hasBusiness && isSubUser) {
      const allowedPaths = ["/business", "/account", "/support", "/profile"];
      const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));

      if (!isAllowed) {
        setIsRedirecting(true);
        // Add a small delay for the lazy loader as requested
        const timer = setTimeout(() => {
          navigate("/business", { replace: true });
          setIsRedirecting(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }

    // Modal show guard for admins
    if (!isCheckingBusiness && !hasBusiness && !isSubUser) {
      if (location.pathname === "/dashboard") {
        showBusinessRequiredModal();
      }
    }
  }, [isCheckingBusiness, hasBusiness, location.pathname, showBusinessRequiredModal, isSubUser, navigate]);


  const checkBusiness = useCallback((callback) => {
    if (!hasBusiness) {
      if (isSubUser) {
        // Silent redirect for sub-users
        navigate("/business", { replace: true });
      } else {
        // Show modal for main admins
        showBusinessRequiredModal();
      }
      return false;
    }
    if (typeof callback === 'function') callback();
    return true;
  }, [hasBusiness, showBusinessRequiredModal, isSubUser, navigate]);

  /* ==========================
     PLAN EXPIRY WARNING
  ========================== */
  const showPlanExpiredWarning = useCallback(() => {
    setShowExpiryModal(true);
  }, []);

  const checkPlanExpiry = (callback, fallback) => {
    if (isPlanExpired) {
      showPlanExpiredWarning();
      if (typeof fallback === 'function') fallback();
      return false;
    }
    if (typeof callback === 'function') callback();
    return true;
  };

  /* ==========================
     AUTO-DETECT LOCATION ON MOUNT
  ========================== */
  useEffect(() => {
    const initializeLocalization = async () => {
      const storedCountry = localStorage.getItem('userCountry');

      try {
        const result = await autoDetectLocalization();

        if (result.detected) {
          // If country has changed OR we've never detected before, automatically update to local defaults
          if (result.country !== storedCountry) {
            let finalLang = result.language;
            if (finalLang.startsWith("en-")) {
              finalLang = "en-US";
            }

            setCurrency(result.currency);
            setSelectedLanguage(finalLang);

            localStorage.setItem('userCountry', result.country);
            localStorage.setItem('userCity', result.city || '');
            localStorage.setItem('userTimezone', result.timezone || '');
            localStorage.setItem('siteCurrency', result.currency);
            localStorage.setItem('siteLang', finalLang);

            markAutoDetectDone();
            applyLanguage(finalLang);
          } else {
            // Country is the same, respect existing selections (manual or previous auto)
            const savedLang = localStorage.getItem('siteLang');
            if (savedLang) applyLanguage(savedLang);
          }
        } else {
          // Detection failed, fallback to saved settings
          const savedLang = localStorage.getItem('siteLang');
          if (savedLang) applyLanguage(savedLang);
        }
      } catch (error) {
        console.error('Localization initialization error:', error);
      } finally {
        setIsAutoDetecting(false);
      }
    };

    initializeLocalization();
  }, [applyLanguage]);

  /* ==========================
     CURRENCY CHANGE HANDLER
  ========================== */
  const handleCurrencyChange = (newCurrency) => {
    // Convert current amount from old currency → INR → new currency using live rates
    const rateOld = getCurrencyRate(currency);   // INR → old (units per INR)
    const rateNew = getCurrencyRate(newCurrency); // INR → new
    const amountInINR = rateOld > 0 ? amount / rateOld : amount;
    const converted = amountInINR * rateNew;

    setCurrency(newCurrency);
    setAmount(converted.toFixed(2));
    localStorage.setItem("siteCurrency", newCurrency);
    // Refresh rates in background when user changes currency
    refreshRates().catch(() => { });
  };




  /* ==========================
     RESTORE SAVED SETTINGS (Removed - handled by initializeLocalization)
  ========================== */


  /* ==========================
     LANGUAGE CHANGE HANDLER
  ========================== */
  const handleLanguageChange = (input) => {
    let langCode;
    if (input && input.target) {
      langCode = input.target.value;
    } else if (input && input.id) {
      langCode = input.id;
    } else {
      langCode = input;
    }

    if (langCode && langCode.startsWith("en-")) {
      langCode = "en-US";
    }


    const baseLang = langCode.split("-")[0];

    // Apply notranslate immediately to prevent double-translation
    if (baseLang === "en") {

      document.body.classList.add("notranslate");
      document.documentElement.classList.add("notranslate");
      document.documentElement.setAttribute('translate', 'no');
    } else {

      document.body.classList.remove("notranslate");
      document.documentElement.classList.remove("notranslate");
      document.documentElement.removeAttribute('translate');
    }

    setSelectedLanguage(langCode);
    localStorage.setItem("siteLang", langCode);

    // Function to try changing language
    const tryChangeLanguage = () => {
      const select = document.querySelector(".goog-te-combo");

      if (!select || !select.options || select.options.length === 0) {
        return false;
      }

      try {
        if (baseLang === "en") {
          // Check if we REALLY need to reload (was it translated?)
          const wasTranslated = document.documentElement.classList.contains("translated-ltr") ||
            document.documentElement.classList.contains("translated-rtl") ||
            document.cookie.includes("googtrans") ||
            document.querySelector('.goog-te-banner-frame');


          const originalOption = Array.from(select.options).find(o => o.value === "");
          select.value = "";
          select.selectedIndex = originalOption ? originalOption.index : 0;
          select.dispatchEvent(new Event("change", { bubbles: true }));

          // Clear ALL cookies

          const domains = [window.location.hostname, "." + window.location.hostname];
          const paths = ["/", "/app", "/dashboard"];
          domains.forEach(d => {
            paths.forEach(p => {
              document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}; domain=${d};`;
            });
          });

          // NUCLEAR OPTION: Reload if it was translated to ensure clean slate
          if (wasTranslated) {

            window.location.reload();
            return true;
          }

          document.documentElement.classList.remove("translated-ltr", "translated-rtl");
          document.body.classList.remove("translated-ltr", "translated-rtl");
          document.body.style.top = '0px';

          if (window.google?.translate?.TranslateElement) {
            try {
              const instance = window.google.translate.TranslateElement.getInstance();
              if (instance && instance.restore) instance.restore();
            } catch (e) { }
          }
          return true;
        }

        let found = false;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value === baseLang) {
            select.value = baseLang;
            select.selectedIndex = i;
            found = true;
            break;
          }
        }

        if (!found) return false;

        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        select.dispatchEvent(changeEvent);

        // Also try click event
        const clickEvent = new MouseEvent('click', { bubbles: true });
        select.dispatchEvent(clickEvent);

        select.focus();
        select.blur();

        return true;
      } catch (error) {

        return false;
      }
    };

    // Try immediately
    if (tryChangeLanguage()) {
      return;
    }

    // If not ready, retry with polling
    let attempts = 0;
    const maxAttempts = 20;

    const retryInterval = setInterval(() => {
      attempts++;
      if (tryChangeLanguage() || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) console.warn("[InvoiceBillBookElite] Change poll timed out.");
        clearInterval(retryInterval);
      }
    }, 500);
  };

  /* ==========================
     NAVIGATION HANDLER
  ========================== */
  const handleNavigate = (target) => {
    const key = typeof target === "string" ? target : "";
    const normalized = key.startsWith("/") ? key : `/${key || "dashboard"}`;
    navigate(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ==========================
     ENSURE BODY SCROLLING
  ========================== */
  useEffect(() => {
    // Ensure body scrolling is always enabled
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden'; // Prevent horizontal scroll
  }, []); // Only run once on mount



  const PAGE_CONFIG = {
    "/dashboard": { title: "Dashboard", subtitle: "Manage Everything from a single place", key: "dashboard" },
    "/parties": { title: "Parties", subtitle: "Manage Your Parties", key: "parties" },
    "/inventory": {
      title: businessType === 'Services' ? "Services" : "Inventory",
      subtitle: businessType === 'Services' ? "Manage Your Services" : "Manage Your Inventory",
      key: "inventory"
    },
    "/quotation": { title: "Quotation", subtitle: "Manage Your Quotations", key: "quotation" },
    "/custom-quotation": { title: "Custom Proposal", subtitle: "Manage Your Professional Custom Quotations", key: "custom-quotation" },
    "/invoice": { title: "Tax Invoice", subtitle: "Manage Your Invoices", key: "invoice" },
    "/payment": { title: "Payment In", subtitle: "Manage Your Payments", key: "payment" },
    "/salesReturn": { title: "Sales Return", subtitle: "Manage Your SalesReturns", key: "salesReturn" },
    "/deliveryChallan": { title: "Delivery Challan", subtitle: "Manage Your Delivery Challans", key: "deliveryChallan" },
    "/proformaInvoice": { title: "Proforma Invoice", subtitle: "Manage Your Proforma Invoices", key: "proformaInvoice" },
    "/bookPurchaseOrder": { title: "Book Purchase order", subtitle: "Manage Your Purchase Orders", category: "Purchase", key: "bookPurchaseOrder" },
    "/bookInvoice": { title: "Book Invoice", subtitle: "Manage Your Book Invoices", category: "Accounting", key: "bookInvoice" },
    "/purchaseReturn": { title: "Purchase Return", category: "Purchase" },
    "/creditNote": { title: "Credit Notes", subtitle: "Manage Your CreditNotes", key: "creditNote" },
    "/expenses": { title: "Expenses", subtitle: "Manage Your Expenses", key: "expenses" },
    "/paymentOut": { title: "Payment Out", subtitle: "Manage Your Payment Outs", key: "paymentOut" },
    "/debitNote": { title: "Debit Notes", subtitle: "Manage Your Debit Notes", key: "debitNote" },
    "/purchaseOrder": { title: "Purchase Order", subtitle: "Manage Your Purchase Orders", key: "purchaseOrder" },
    "/projectExpense": { title: "Project Expense", subtitle: "Manage Your Project Expenses", key: "projectExpense" },
    "/report": { title: "Reports", subtitle: "Monitor and analyze your business", key: "report" },
    "/eInvoice": { title: "E-Invoice & EWB", subtitle: "Generate and track your e-invoices", key: "eInvoice" },
    "/profile": { title: "Profile", subtitle: "Manage Your Profile", key: "profile" },
    "/account": { title: "Account", subtitle: "Manage Your Account", key: "account" },
    "/business": { title: "Manage Business", subtitle: "Manage Your Business", key: "business" },
    "/support": { title: "Support Center", subtitle: "Get Help and Support", key: "support" },
    "/manageUser": { title: "Manage Users", subtitle: "Manage Your Users", key: "manageUser" },
    "/voucher-settings": { title: "Voucher Settings", subtitle: "Customize document numbering", key: "voucherSettings" },
    "/Agreement": { title: "Agreement", subtitle: "Manage Supplier / Buyer Agreements", key: "Agreement" },
    "/zKhataBook": { title: "Z Khata Book", subtitle: "Manage Your Khata Book", key: "zKhataBook" },
    "/ledger": { title: "Ledger", subtitle: "Manage Your Ledger", key: "ledger" },
    "/documents": { title: "Documents", subtitle: "Manage Your Documents", key: "documents" },
    "/GRN": { title: "Goods Received Note", subtitle: "Manage Your GRN", key: "grn" },

    "/MRN": { title: "Material Receipt Note", subtitle: "Manage Your MRN", key: "mrn" },

    "/purchaseRequisition": { title: "Purchase Requisition", subtitle: "Manage Procurement Requests", key: "purchaseRequisition" },
    "/sales-leads": { title: "Sales Lead", subtitle: "Manage Your Sales Leads", key: "salesLead" },
    "/lead-management": { title: "Lead Management", subtitle: "Create or Edit Lead", key: "leadManagement" },

  };

  const currentPage = PAGE_CONFIG[location.pathname] || PAGE_CONFIG["/dashboard"];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* ================= FIXED RESPONSIVE HEADER ================= */}
      <Header
        currentPage={currentPage}
        sidebarCollapsed={sidebarCollapsed}
        selectedLanguage={selectedLanguage}
        handleLanguageChange={handleLanguageChange}
        currency={currency}
        handleCurrencyChange={handleCurrencyChange}
        currencyOptions={currencyOptions}
        languageOptions={languageOptions}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={onLogout}
      />

      {/* SIDEBAR - Completely independent fixed positioning */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isPlanExpired={isPlanExpired}
        checkPlanExpiry={checkPlanExpiry}
        hasBusiness={hasBusiness}
        checkBusiness={checkBusiness}
      />

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto mt-[100px] sm:mt-16 md:mt-16 lg:mt-12 bg-white text-gray-900">
        {/* MAIN CONTENT - Scrolls independently with proper margins */}
        <main className={`px-2 sm:px-3 py-2 sm:py-3 pt-20 sm:pt-24 md:pt-24 lg:pt-24 transition-all duration-300 ${sidebarCollapsed
          ? 'lg:ml-20 ml-0'
          : 'lg:ml-60 ml-0'
          }`}>

          {isRedirecting ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <MainLoader message="Loading your business workspace..." />
            </div>
          ) : (
            <>
              {/* LANGUAGE DROPDOWN UI - Hidden but functional */}
              <GoogleTranslate />

              {/* ROUTES */}
              <Suspense fallback={<MainLoader message="Loading..." />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard currency={currency} taxType={taxType} checkPlanExpiry={checkPlanExpiry} isPlanExpired={isPlanExpired} checkBusiness={checkBusiness} />} />
                  <Route path="/parties" element={<Parties currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/inventory" element={<Inventory currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/quotation" element={<Quotation currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/custom-quotation" element={<CustomQuotation currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/invoice" element={<SalesInvoice currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/payment" element={<Payment currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/salesReturn" element={<SalesReturn currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/deliveryChallan" element={<DeliveryChallan currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/proformaInvoice" element={<ProformaInvoice currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/bookPurchaseOrder" element={<BookPurchaseOrder currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/bookInvoice" element={<BookInvoice currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/Agreement" element={<Agreement currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/creditNote" element={<CreditNote currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/paymentOut" element={<PaymentOut currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/purchaseReturn" element={<PurchaseReturn currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/debitNote" element={<DebitNote currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/purchaseOrder" element={<PurchaseOrder currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/projectExpense" element={<ProjectExpense currency={currency} language={selectedLanguage} checkBusiness={checkBusiness} />} />
                  <Route path="/report" element={<Reportspanel currency={currency} language={selectedLanguage} checkBusiness={checkBusiness} />} />
                  <Route
                    path="/eInvoice"
                    element={
                      taxType !== 'GST' ?
                        <Navigate to="/dashboard" replace /> :
                        <EInvoice currency={currency} language={selectedLanguage} checkBusiness={checkBusiness} sidebarCollapsed={sidebarCollapsed} />
                    }
                  />
                  <Route path="/zKhataBook" element={<ZKhataBook currency={currency} language={selectedLanguage} checkBusiness={checkBusiness} />} />
                  <Route path="/ledger" element={<Ledger currency={currency} language={selectedLanguage} checkBusiness={checkBusiness} />} />
                  <Route path="/documents" element={<Documents language={selectedLanguage} checkBusiness={checkBusiness} />} />
                  <Route path="/GRN" element={<GRN currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/MRN" element={<MRN currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/purchaseRequisition" element={<PurchaseRequisitionList currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/sales-leads" element={<SalesLeadView currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/lead-management" element={<LeadManagement onBack={() => navigate(-1)} currency={currency} />} />

                  <Route path="/account" element={<Account currency={currency} isPlanExpired={isPlanExpired} checkPlanExpiry={checkPlanExpiry} />} />
                  <Route path="/business" element={<BusinessManagement currency={currency} isPlanExpired={isPlanExpired} checkPlanExpiry={checkPlanExpiry} />} />
                  <Route path="/voucher-settings" element={<VoucherSetting />} />
                  <Route path="/support" element={<Support currency={currency} checkBusiness={checkBusiness} />} />
                  <Route path="/manageUser" element={
                    (() => {
                      const userType = localStorage.getItem('userType');
                      const user = JSON.parse(localStorage.getItem('user') || '{}');

                      // Only allow main users to access manage users page
                      if (userType === 'subUser' || user.isSubUser) {
                        return <Navigate to="/dashboard" replace />;
                      }

                      return <ManageUser currency={currency} isPlanExpired={isPlanExpired} checkPlanExpiry={checkPlanExpiry} />;
                    })()
                  } />
                  <Route path="*" element={<NotFoundRedirect />} />
                </Routes>
              </Suspense>
            </>
          )}
        </main>
      </div>

      <MobileBottomNav onNavigate={handleNavigate} currentPage={currentPage} isPlanExpired={isPlanExpired} checkPlanExpiry={checkPlanExpiry} />

      {/* Location Detection Banner - Removed, runs in backend only */}

      {/* Plan Expiry Modal */}
      <PlanExpiryModal
        isOpen={showExpiryModal}
        onClose={() => setShowExpiryModal(false)}
        onUpgrade={() => {
          setShowExpiryModal(false);
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const token = localStorage.getItem('token');
          const params = new URLSearchParams();
          params.set('type', 'upgrade');
          if (token) params.set('token', token);
          params.set('firstName', user.firstName || '');
          params.set('lastName', user.lastName || '');
          params.set('email', user.email || '');
          params.set('phone', user.phone || '');

          window.location.href = `${websiteUrl}/#/checkout?${params.toString()}`;
        }}
        expiryDate={billingExpiryDate}
      />
    </div>
  );
}
