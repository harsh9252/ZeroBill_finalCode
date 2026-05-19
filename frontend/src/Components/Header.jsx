import React from "react";
import ProfileSidebar from "./ProfileSidebar";
import CommonDropdown from "./CustomDropdown";
import LanguageCurrencySettings from "./LanguageCurrencySettings";
import { Settings2 } from "lucide-react";

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
        <div className="flex items-center gap-2 relative notranslate">
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
