/**
 * Environment Configuration
 * Dynamically loads environment variables based on current environment
 */

export const config = {
  // Frontend URL
  frontendUrl: import.meta.env.VITE_FRONTEND_URL,

  // Backend URL
  backendUrl: import.meta.env.VITE_BACKEND_URL,

  // Environment
  isDevelopment: import.meta.env.VITE_ENV === 'development',
  isProduction: import.meta.env.VITE_ENV === 'production',

  // API Endpoints (with hash routing)
  loginUrl: import.meta.env.VITE_FRONTEND_URL + '/#/login',

  dashboardUrl: import.meta.env.VITE_FRONTEND_URL + '/#/dashboard',

  superAdminLoginUrl: import.meta.env.VITE_FRONTEND_URL + '/#/superadmin/login',
};

export default config;
