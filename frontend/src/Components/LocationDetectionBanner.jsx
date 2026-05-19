import React, { useState, useEffect } from 'react';
import { Globe, MapPin, X, RotateCcw } from 'lucide-react';
import { resetAutoDetect, autoDetectLocalization } from '../utils/geolocationService';

/**
 * Location Detection Banner
 * Shows user their auto-detected location and allows them to reset
 */
export default function LocationDetectionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const checkAndShowBanner = () => {
      const country = localStorage.getItem('userCountry');
      const city = localStorage.getItem('userCity');
      const autoDetectDone = localStorage.getItem('autoDetectDone');
      const currency = localStorage.getItem('siteCurrency');
      const language = localStorage.getItem('siteLang');

      if (autoDetectDone === 'true' && country && city) {
        setLocationInfo({
          country,
          city,
          currency,
          language
        });
        setShowBanner(true);
      }
    };

    // Check on mount
    checkAndShowBanner();

    // Listen for storage changes (from other tabs or components)
    const handleStorageChange = () => {
      checkAndShowBanner();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      resetAutoDetect();
      
      // Re-run auto-detection
      const result = await autoDetectLocalization();
      
      if (result.detected) {
        setLocationInfo({
          country: result.country,
          city: result.city,
          currency: result.currency,
          language: result.language
        });
        
        // Reload page to apply new settings
        window.location.reload();
      }
    } catch (error) {
      console.error('Error resetting auto-detection:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!showBanner || !locationInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg border border-green-200 p-4 max-w-sm z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-green-600 animate-pulse" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Location Auto-Detected</p>
          
          <div className="mt-2 space-y-1 text-xs text-gray-700">
            <p className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="truncate">
                <strong>{locationInfo.city}</strong>, {locationInfo.country}
              </span>
            </p>
            
            <p className="flex items-center gap-1 ml-4">
              💱 <strong>{locationInfo.currency}</strong> | 🗣️ <strong>{locationInfo.language}</strong>
            </p>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              {isResetting ? 'Resetting...' : 'Re-detect'}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setShowBanner(false)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
