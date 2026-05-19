/**
 * Centralized Configuration Utility
 * Get API and Backend URLs from environment variables
 */

/**
 * Get Backend URL (for file uploads, images, etc.)
 * @returns {string} Backend base URL
 */
export const getBackendURL = () => {
  return import.meta.env.VITE_BACKEND_URL || '';
};

/**
 * Get API Base URL (for API endpoints)
 * @returns {string} API base URL
 */
export const getApiURL = () => {
  return import.meta.env.VITE_API_URL || '';
};

/**
 * Get Frontend URL
 * @returns {string} Frontend base URL
 */
export const getFrontendURL = () => {
  return import.meta.env.VITE_FRONTEND_URL || '';
};

/**
 * Get full image URL
 * @param {string} imagePath - Image path from database (e.g., '/uploads/image-123.jpg')
 * @returns {string} Full image URL
 */
export const getImageURL = (imagePath) => {
  if (!imagePath) return '';

  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Prepend backend URL
  let backendURL = getBackendURL();
  
  // Safety check: if backendURL is missing protocol but looks like a domain, add https://
  if (backendURL && !backendURL.startsWith('http')) {
    backendURL = `https://${backendURL}`;
  }

  // Ensure no double slashes except for protocol
  const base = backendURL.endsWith('/') ? backendURL.slice(0, -1) : backendURL;
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${base}${path}`;
};

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return import.meta.env.DEV;
};

/**
 * Check if running in production mode
 * @returns {boolean}
 */
export const isProduction = () => {
  return import.meta.env.PROD;
};

// Export all URLs as constants for convenience
export const BACKEND_URL = getBackendURL();
export const API_URL = getApiURL();
export const FRONTEND_URL = getFrontendURL();
