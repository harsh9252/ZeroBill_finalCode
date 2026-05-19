// InvoiceBillBook Frontend App
// Updated: Fresh build deployment
import React, { useCallback, useState, useEffect, useContext, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { authAPI } from "./utils/api.js";
import InvoiceBillBookElite from "./Components/InvoiceBillBookElite.jsx";
import Login from "./Components/login";
import PincodeTest from "./Components/PincodeTest.jsx";
import TermsTestPage from "./Components/TermsTestPage.jsx";
import SuperAdminLogin from "./Screen/SuperAdmin/Login/SuperAdminLogin.jsx";
import SuperAdminLayout from "./Screen/SuperAdmin/Layout/SuperAdminLayout.jsx";
import SuperAdminDashboard from "./Screen/SuperAdmin/Dashboard/SuperAdminDashboard.jsx";
import ActiveUsers from "./Screen/SuperAdmin/ActiveUsers/ActiveUsers.jsx";
import Transactions from "./Screen/SuperAdmin/Transactions/Transactions.jsx";
import InactiveUsers from "./Screen/SuperAdmin/InactiveUsers/InactiveUsers.jsx";
import SuperAdminSettings from "./Screen/SuperAdmin/Settings/SuperAdminSettings.jsx";
import AccountApprovals from "./Screen/SuperAdmin/AccountApprovals/AccountApprovals.jsx";
import PricingManagement from "./Screen/SuperAdmin/Pricing/PricingManagement.jsx";
import DemoManagement from "./Screen/SuperAdmin/DemoManagement/DemoManagement.jsx";
import { ActionMessageProvider, default as ActionMessageContext } from "./contexts/ActionMessageContext.jsx";
import PublicDownload from "./Screen/Admin/Public/PublicDownload.jsx";

import "bootstrap/dist/css/bootstrap.min.css";

const STORAGE_KEY = "zbe-authenticated";
const SUPER_ADMIN_AUTH_KEY = "superAdminAuth";

function AppContent() {
  const navigate = useNavigate();
  const { showSuccess } = useContext(ActionMessageContext);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState(
    () => localStorage.getItem(SUPER_ADMIN_AUTH_KEY) === "true"
  );

  // Ref to track last authentication check time
  const lastCheckTime = useRef(0);
  const checkInterval = 5000; // 5 seconds polling interval
  const throttleInterval = 2000; // Don't check more than once every 2 seconds on interaction

  // Function to check user status with throttling
  const checkStatus = useCallback(async (forced = false) => {
    const now = Date.now();
    
    // Only check if authenticated and either forced or interval passed
    if ((isAuthenticated || isSuperAdminAuthenticated) && 
        (forced || (now - lastCheckTime.current > throttleInterval))) {
      
      lastCheckTime.current = now;
      try {
        // If super admin, we would normally check superadmin status...
        // but since the user specifically asked for "subuser" (which falls under isAuthenticated), 
        // we'll focus on the main auth API.
        // Skip checking regular profile if we are currently on a superadmin route
        const isSuperAdminRoute = window.location.pathname.includes('/superadmin') || window.location.hash.includes('/superadmin');
        
        if (isAuthenticated && !isSuperAdminRoute) {
          const response = await authAPI.getProfile();
          if (response && response.success && response.data) {
            // Merge existing storage data with new profile data to prevent loss of accessibleBusinesses
            const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...existingUser, ...response.data }));
          }
        }
      } catch (error) {
        // Errors (like 401) are already handled by the logic in api.js (it redirects automatically)
        console.warn('Auth status check failed:', error.message);
      }
    }
  }, [isAuthenticated, isSuperAdminAuthenticated]);

  // Sync authentication state with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(localStorage.getItem(STORAGE_KEY) === "true");
      setIsSuperAdminAuthenticated(localStorage.getItem(SUPER_ADMIN_AUTH_KEY) === "true");
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Background polling and interaction listeners for "instant" redirect
  useEffect(() => {
    if (!isAuthenticated && !isSuperAdminAuthenticated) return;

    // 1. Periodic Polling (5 seconds)
    const intervalId = setInterval(() => {
      checkStatus();
    }, checkInterval);

    // 2. Interaction Listeners
    const handleInteraction = () => checkStatus();
    const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'focus', 'visibilitychange'];
    
    interactionEvents.forEach(event => {
      window.addEventListener(event, handleInteraction);
    });

    // Initial check on mount
    checkStatus(true);

    return () => {
      clearInterval(intervalId);
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [isAuthenticated, isSuperAdminAuthenticated, checkStatus]);

  const handleLoginSuccess = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsAuthenticated(true);
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const handleSuperAdminLoginSuccess = useCallback(() => {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, "true");
    setIsSuperAdminAuthenticated(true);
    // Force a small delay to ensure state updates before navigation
    setTimeout(() => {
      navigate("/superadmin/dashboard", { replace: true });
    }, 100);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    // Clear all authentication data
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // Update authentication state
    setIsAuthenticated(false);

    // Show success message
    showSuccess("Signed out successfully");

    // Redirect to login page
    navigate("/login", { replace: true });
  }, [navigate, showSuccess]);

  const handleSuperAdminLogout = useCallback(() => {
    // Clear Super Admin authentication data
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    localStorage.removeItem('superAdminUser');
    localStorage.removeItem('superAdminEmail');

    // Update authentication state
    setIsSuperAdminAuthenticated(false);

    // Show success message
    showSuccess("Super Admin signed out successfully");

    // Redirect to Super Admin login page
    navigate("/superadmin/login", { replace: true });
  }, [navigate, showSuccess]);

  return (
    <Routes>
      {/* Super Admin Routes - MUST BE FIRST - HIGHEST PRIORITY */}
      <Route path="/superadmin/login" element={<SuperAdminLogin onLoginSuccess={handleSuperAdminLoginSuccess} />} />

      <Route
        path="/superadmin/*"
        element={
          (isSuperAdminAuthenticated && localStorage.getItem(SUPER_ADMIN_AUTH_KEY) === "true") ? (
            <SuperAdminLayout onLogout={handleSuperAdminLogout}>
              <Routes>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="approvals" element={<AccountApprovals />} />
                <Route path="active-users" element={<ActiveUsers />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="plans" element={<PricingManagement />} />
                <Route path="pricing" element={<Navigate to="plans" replace />} />
                <Route path="inactive-users" element={<InactiveUsers />} />
                <Route path="demo-management" element={<DemoManagement />} />
                <Route path="settings" element={<SuperAdminSettings />} />
                <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
              </Routes>
            </SuperAdminLayout>
          ) : (
            <Navigate to="/superadmin/login" replace />
          )
        }
      />

      {/* Regular User Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        } 
      />
      <Route path="/test-pincode" element={<PincodeTest />} />
      <Route path="/test-terms" element={<TermsTestPage />} />

      {/* Public share/download links - no auth required */}
      <Route path="/public/download/:type/:id" element={<PublicDownload />} />

      {/* Root redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Regular User Main Routes - CATCH ALL LAST */}
      <Route
        path="/*"
        element={
          (isAuthenticated && localStorage.getItem(STORAGE_KEY) === "true") ? (
            <InvoiceBillBookElite onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ActionMessageProvider>
      <AppContent />
    </ActionMessageProvider>
  );
}
