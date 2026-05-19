import React, { useState, useRef, useEffect } from "react";
import { Globe, X, Check } from "lucide-react";
import { createPortal } from "react-dom";
import CommonDropdown from "./CustomDropdown";

export default function LanguageCurrencySettings({
  selectedLanguage,
  handleLanguageChange,
  currency,
  handleCurrencyChange,
  currencyOptions,
  languageOptions,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempLanguage, setTempLanguage] = useState(selectedLanguage);
  const [tempCurrency, setTempCurrency] = useState(currency);
  const [cardStyle, setCardStyle] = useState({});
  const buttonRef = useRef(null);
  const cardRef = useRef(null);

  // Sync temp state when props change
  useEffect(() => {
    setTempLanguage(selectedLanguage);
    setTempCurrency(currency);
  }, [selectedLanguage, currency, isOpen]);

  const updateCardPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      // Card width is 280px as per user request
      const cardWidth = 280;
      let left = rect.right - cardWidth;
      
      // Ensure it doesn't go off screen on mobile
      if (left < 10) left = 10;
      if (left + cardWidth > window.innerWidth - 10) {
        left = window.innerWidth - cardWidth - 10;
      }

      setCardStyle({
        position: "absolute",
        top: `${rect.bottom + scrollY + 8}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        zIndex: 9999,
      });
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (!prev) {
        updateCardPosition();
      }
      return !prev;
    });
  };

  const handleSave = () => {
    if (tempLanguage !== selectedLanguage) {
      const langOption = languageOptions.find(opt => opt.id === tempLanguage);
      if (langOption) {
        handleLanguageChange(langOption);
      } else {
        // Fallback for just the code if option not found
        handleLanguageChange({ id: tempLanguage });
      }
    }
    if (tempCurrency !== currency) {
      handleCurrencyChange(tempCurrency);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        // Only close if we didn't click inside a portal (like the dropdown menu)
        if (!event.target.closest('.dropdown-menu-portal')) {
           setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateCardPosition);
      window.addEventListener("scroll", updateCardPosition, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateCardPosition);
      window.removeEventListener("scroll", updateCardPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center transition-all hover:shadow-md"
        aria-label="Language and Currency Settings"
      >
        <Globe size={20} className="text-gray-600" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={cardRef}
            style={cardStyle}
            className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200 notranslate"
          >
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-1"><span>Set Language and Currency</span></h3>
              <p className="text-[10px] text-gray-500 leading-tight">
                <span>Select your preferred language and currency. You can update the settings at any time.</span>
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <span>Language</span>
                </label>
                <CommonDropdown
                  options={languageOptions}
                  value={tempLanguage || "en-US"}
                  valueBy="id"
                  onChange={(opt) => setTempLanguage(opt.id)}
                  className="h-9"
                  className2="notranslate"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <span>Currency</span>
                </label>
                <CommonDropdown
                  options={currencyOptions}
                  value={tempCurrency || "USD"}
                  valueBy="id"
                  onChange={(opt) => setTempCurrency(opt.id)}
                  className="h-9"
                  className2="notranslate"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3">
              <button
                onClick={handleSave}
                className="w-full bg-[#129046] hover:bg-[#0e7538] text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-100 active:scale-95"
              >
                <span>Save</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
