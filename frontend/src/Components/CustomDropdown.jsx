// CommonDropdown.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export default function CommonDropdown({
  options = [],
  value = undefined, // controlled value (label or id depending on valueBy)
  onChange = undefined,
  valueBy = "label", // "label" | "id"
  placeholder = "Select an option",
  id = undefined,
  name = undefined,
  className = "",
  className2 = "",
  disabled = false,
  searchable = false,
  allowCustomInput = false,
  enableScroll = undefined,
  maxHeight = 280,
  onCreate = undefined,
  showAddOption = false,
  addOptionLabel = "+ Add New",
  liveSearch = false,
  customInputLabel = "Enter custom value",
  customInputPlaceholder = "Type here...",
}) {
  const isControlled = value !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState({});

  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  const useScroll = typeof enableScroll === "boolean" ? enableScroll : options.length > 8;

  // Filter options based on search query
  const filteredOptions = liveSearch && searchQuery.trim()
    ? options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  // resolve selected key & option
  const selectedKey = isControlled ? value : internalValue;
  const selectedOption = options.find((opt) =>
    valueBy === "id" ? opt.id === selectedKey : opt.label === selectedKey
  );

  // function to update menu position
  const updateMenuPosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      setMenuStyle({
        position: 'absolute',
        top: `${rect.bottom + scrollY}px`,
        left: `${rect.left + scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    }
  };

  // toggle
  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((s) => {
      if (!s) {
        setSearchQuery("");
        updateMenuPosition();
        setTimeout(() => {
          if (liveSearch && searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
      return !s;
    });
  };

  // select
  const selectOption = (opt) => {
    if (isControlled) {
      onChange?.(opt);
    } else {
      setInternalValue(valueBy === "id" ? opt.id : opt.label);
      onChange?.(opt);
    }
    setIsOpen(false);
    setShowCustomInput(false);
    setCustomInput("");
    btnRef.current?.focus();
  };

  // handle custom input
  const handleCustomInput = () => {
    setShowCustomInput(true);
    setIsOpen(false);
    setCustomInput(selectedKey || "");
  };

  // save custom input
  const saveCustomInput = () => {
    if (customInput.trim()) {
      const customOption = { label: customInput.trim(), value: customInput.trim() };
      if (isControlled) {
        onChange?.(customOption);
      } else {
        setInternalValue(customInput.trim());
        onChange?.(customOption);
      }
    }
    setShowCustomInput(false);
    setCustomInput("");
    btnRef.current?.focus();
  };

  // cancel custom input
  const cancelCustomInput = () => {
    setShowCustomInput(false);
    setCustomInput("");
    btnRef.current?.focus();
  };

  // keyboard & outside click & scroll
  useEffect(() => {
    function onDocClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    }

    function onKeyDown(e) {
      if (disabled) return;
      if (showCustomInput) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveCustomInput();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelCustomInput();
        }
        return;
      }
      if (!isOpen) {
        if ((e.key === "ArrowDown" || e.key === " ") && document.activeElement === btnRef.current) {
          e.preventDefault();
          setIsOpen(true);
          updateMenuPosition();
          setHighlightIndex(0);
        }
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setHighlightIndex(-1);
        setSearchQuery("");
        btnRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const prev = i - 1;
          return prev < 0 ? filteredOptions.length - 1 : prev;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightIndex]);
        }
      }
    }

    function handleScroll(e) {
      if (isOpen && menuRef.current) {
        // If the scroll target is the menu itself or anything inside it, do nothing
        if (e.target === menuRef.current || menuRef.current.contains(e.target)) {
          return;
        }
        // Also check if the target has a menu ancestor (for extra safety with portals/nested scrolls)
        if (e.target.closest && e.target.closest('[role="menu"]')) {
          return;
        }
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    // Listen to scroll events on any parent to close dropdown (essential for tables)
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, highlightIndex, options, onChange, showCustomInput]);

  // When open, highlight the selected option (if any)
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(
        (opt) => (valueBy === "id" ? opt.id === selectedKey : opt.label === selectedKey)
      );
      setHighlightIndex(idx >= 0 ? idx : 0);

      if (useScroll && menuRef.current) {
        setTimeout(() => {
          const el = menuRef.current.querySelector("[data-highlight='true']");
          if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
        }, 0);
      }
    } else {
      setHighlightIndex(-1);
    }
  }, [isOpen, filteredOptions, selectedKey, valueBy, useScroll, searchQuery]);

  // Update position on window resize
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', updateMenuPosition);
      return () => window.removeEventListener('resize', updateMenuPosition);
    }
  }, [isOpen]);

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      aria-labelledby={id}
      className={`bg-white rounded-xl shadow-2xl border border-gray-100 dropdown-menu-portal ${className2}`}
      style={{
        ...menuStyle,
        maxHeight: useScroll ? `${maxHeight}px` : "auto",
        overflowY: useScroll ? "auto" : "visible",
      }}
    >
      {liveSearch && (
        <div className="sticky top-0 bg-white border-b border-gray-200 p-2 rounded-t-xl">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightIndex(0);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="py-2">
        {allowCustomInput && (
          <button
            type="button"
            onClick={handleCustomInput}
            className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-150 bg-blue-50 hover:bg-blue-100 font-medium text-blue-600 border-b border-gray-100"
          >
            <span className="text-sm font-medium"><span>{customInputLabel}</span></span>
          </button>
        )}

        {filteredOptions.map((option, index) => {
          const isSelected =
            selectedOption &&
            (valueBy === "id" ? option.id === selectedOption.id : option.label === selectedOption.label);
          const isHighlighted = index === highlightIndex;
          const isFirstApiCity = !option.isCustom && index > 0 && filteredOptions[index - 1]?.isCustom;

          return (
            <React.Fragment key={option.id ?? option.label}>
              {isFirstApiCity && (
                <div className="border-t border-gray-200 my-1">
                  <div className="px-4 py-1 text-xs text-gray-500 bg-gray-50">
                    <span>Available Cities</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                role="menuitem"
                data-highlight={isHighlighted ? "true" : undefined}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectOption(option)}
                className={`dropdown-item dropdown-item-base w-full px-2 py-2 text-left flex items-center gap-3 transition-all duration-150 ${isSelected ? "selected-item" : ""
                  } ${option.isCustom ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"} ${index !== options.length - 1 && !isFirstApiCity ? "border-b border-gray-100" : ""
                  }`}
              >
                <span className="text-sm">{option.icon}</span>
                <span className={`truncate text-sm ${option.isCustom ? "font-medium text-blue-700" : ""}`}>
                  <span>{option.label}</span>
                  {option.isCustom && <span className="text-xs text-blue-500 ml-1">(Custom)</span>}
                </span>
              </button>
            </React.Fragment>
          );
        })}

        {showAddOption && onCreate && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCreate();
            }}
            className="w-full px-4 py-2 text-left flex items-center gap-3 transition-all duration-150 bg-[#1fbe5a]/10 hover:bg-[#1fbe5a]/20 font-semibold text-[#1fbe5a] border-t border-gray-100"
          >
            <span className="text-sm">+</span>
            <span className="text-sm font-semibold"><span>{addOptionLabel}</span></span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className.includes('h-') ? '' : 'h-8'} ${className}`}>
      <button
        id={id}
        name={name}
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleOpen}
        disabled={disabled}
        className={`relative ${className2} w-full px-3 h-full text-gray-800 rounded-[7px] border border-gray-300 transition-all duration-200 flex items-center justify-between ${disabled
          ? 'cursor-not-allowed !bg-gray-100'
          : 'bg-white hover:border-[#129046] focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none'
          }`}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-sm">{selectedOption ? selectedOption.icon : null}</span>
          <span className="truncate text-sm text-gray-800">
            <span>{selectedOption ? selectedOption.label : (selectedKey || placeholder)}</span>
          </span>
        </span>

        <ChevronDown
          size={20}
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""} text-gray-400`}
        />
      </button>

      {isOpen && !disabled && createPortal(menuContent, document.body)}

      {showCustomInput && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {customInputLabel}:
              </label>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveCustomInput();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelCustomInput();
                  }
                }}
                placeholder={customInputPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelCustomInput}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={saveCustomInput}
                disabled={!customInput.trim()}
                className="px-3 py-1.5 text-sm bg-[#1fbe5a] text-white rounded-lg hover:bg-[#1fbe5a]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
