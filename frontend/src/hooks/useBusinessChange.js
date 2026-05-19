import { useEffect } from 'react';

/**
 * Custom hook to listen for business changes and trigger a callback
 * This ensures all pages refetch data when business is changed from ProfileSidebar
 * 
 * @param {Function} callback - Function to call when business changes
 * @example
 * useBusinessChange(() => {
 *   fetchData();
 * });
 */
export const useBusinessChange = (callback) => {
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      if (callback && typeof callback === 'function') {
        callback(event);
      }
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, [callback]);
};

export default useBusinessChange;
