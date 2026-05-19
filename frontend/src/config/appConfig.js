/**
 * Application Configuration
 * Dynamically loads environment variables for frontend and super admin URLs
 */

const getAppConfig = () => {
  const mode = import.meta.env.VITE_APP_MODE || 'dev';

  if (mode === 'production') {
    return {
      mode: 'production',
      apiUrl: import.meta.env.VITE_API_URL,
      backendUrl: import.meta.env.VITE_BACKEND_URL,
      frontendUrl: import.meta.env.VITE_FRONTEND_URL,
      websiteUrl: import.meta.env.VITE_WEBSITE_URL,
      frontendPort: import.meta.env.VITE_FRONTEND_PORT || 443,
    };
  }

  //comment part
  // Development mode
  return {
    mode: 'dev',
    apiUrl: import.meta.env.VITE_API_URL_DEV || import.meta.env.VITE_API_URL || '',
    backendUrl: import.meta.env.VITE_BACKEND_URL_DEV || import.meta.env.VITE_BACKEND_URL || '',
    frontendUrl: import.meta.env.VITE_FRONTEND_URL_DEV || import.meta.env.VITE_FRONTEND_URL || '',
    websiteUrl: import.meta.env.VITE_WEBSITE_URL_DEV || import.meta.env.VITE_WEBSITE_URL || '',
    frontendPort: import.meta.env.VITE_FRONTEND_PORT_DEV || 5173,
  };
};

export const appConfig = getAppConfig();

// Export individual config values for easy access
export const {
  mode,
  apiUrl,
  backendUrl,
  frontendUrl,
  websiteUrl,
  frontendPort,
} = appConfig;

export default appConfig;
