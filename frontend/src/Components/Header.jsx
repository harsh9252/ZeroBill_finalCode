import React, { useState, useEffect } from "react";
import ProfileSidebar from "./ProfileSidebar";
import CommonDropdown from "./CustomDropdown";
import LanguageCurrencySettings from "./LanguageCurrencySettings";
import { Settings2, Building2 } from "lucide-react";

export default function Header({
  currentPage,
  sidebarCollapsed,
  selectedLanguage,
  handleLanguageChange,
  currency,
  handleCurrencyChange,
  currencyOptions,
  languageOptions,
  onToggle,
  onLogout
}) {
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('currentBusinessName') || "");

  useEffect(() => {
    const handleBusinessUpdate = (e) => {
      if (e.detail && e.detail.businessName) {
        setBusinessName(e.detail.businessName);
      } else {
        const storedName = localStorage.getItem('currentBusinessName');
        if (storedName) setBusinessName(storedName);
      }
    };

    window.addEventListener('businessLogoUpdated', handleBusinessUpdate);
    window.addEventListener('businessChanged', handleBusinessUpdate); // Just in case
    
    // Sync across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'currentBusinessName') {
        setBusinessName(e.newValue || "");
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('businessLogoUpdated', handleBusinessUpdate);
      window.removeEventListener('businessChanged', handleBusinessUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  return (
    <div className={`fixed top-0 z-[800] bg-white border-b border-yellow-200 shadow-sm px-3 py-2 ${sidebarCollapsed
      ? 'lg:left-20 left-0 right-0'
      : 'lg:left-60 left-0 right-0'
      }`}>
      {/* MOBILE LAYOUT */}
      <div className="block md:hidden">
        {/* FIRST ROW: TITLE LEFT, PROFILE RIGHT */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-lg font-semibold"><span>{currentPage.title}</span></h1>
            <p className="text-xs text-gray-500"><span>{currentPage.subtitle}</span></p>
          </div>
          <ProfileSidebar onLogout={onLogout} />
        </div>

        {/* SECOND ROW: LANGUAGE AND CURRENCY SIDE BY SIDE */}
        <div className="flex items-center justify-between mt-2 gap-2 relative notranslate">
          {businessName && (
            <div className="flex items-center gap-1.5 h-9 px-2.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg shadow-sm">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold break-words">{businessName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 relative notranslate ml-auto">
            <LanguageCurrencySettings
              selectedLanguage={selectedLanguage}
              handleLanguageChange={handleLanguageChange}
              currency={currency}
              handleCurrencyChange={handleCurrencyChange}
              currencyOptions={currencyOptions}
              languageOptions={languageOptions}
            />
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex md:items-center md:justify-between gap-3">

        {/* LEFT SECTION: TOGGLE + TITLE */}
        <div className="flex items-center gap-3">
          {/* SIDEBAR TOGGLE BUTTON */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <span className="absolute w-5 h-0.5 bg-white -translate-y-1.5"></span>
              <span className="absolute w-5 h-0.5 bg-white"></span>
              <span className="absolute w-5 h-0.5 bg-white translate-y-1.5"></span>
            </button>
          )}

          {/* TITLE */}
          <div>
            <h1 className="text-xl md:text-2xl font-semibold"><span>{currentPage.title}</span></h1>
            <p className="text-xs md:text-sm text-gray-500"><span>{currentPage.subtitle}</span></p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3 relative notranslate flex-wrap md:flex-nowrap justify-end">
          
          {businessName && (
            <div className="flex items-center gap-2 h-10 px-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-lg shadow-sm text-yellow-800 transition-all hover:shadow-md hover:border-yellow-300">
              <Building2 className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-sm font-semibold tracking-wide break-words">{businessName}</span>
            </div>
          )}

          <LanguageCurrencySettings
            selectedLanguage={selectedLanguage}
            handleLanguageChange={handleLanguageChange}
            currency={currency}
            handleCurrencyChange={handleCurrencyChange}
            currencyOptions={currencyOptions}
            languageOptions={languageOptions}
          />
          {/* PROFILE SIDEBAR */}
          <ProfileSidebar onLogout={onLogout} />
        </div>
      </div>

    </div>
  );
}
