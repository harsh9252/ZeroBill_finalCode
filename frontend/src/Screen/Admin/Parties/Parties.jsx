// Parties.jsx

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import MainLoader from "../../../Components/MainLoader.jsx";

// Add custom CSS for smooth horizontal bounce animation
const horizontalBounceStyle = `
  @keyframes smoothHorizontalBounce {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(6px);
    }
    50% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  .animate-smooth-bounce {
    animation: smoothHorizontalBounce 2.5s ease-in-out infinite;
  }
`;

// Style moved into the component logic to avoid side-effects during import
import Date_wise_Filter_Button, {
  getRangeBoundsPure,
  DATE_RANGE_OPTS,
} from "../../../Components/Date_wise_Filter_Button.jsx";
import {
  PARTY_TYPE_OPTIONS,
  BALANCE_TYPE_OPTIONS,
  TXN_TYPE_OPTIONS,
  STATUS_OPTIONS,
  STATE_OPTIONS,
  getCategoryOptions,
  getDateRangeOptions,
} from "../../../utils/dropdownOptions.js";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Upload,
  FileBarChart2,
  Plus,
  X,
  Search,
  MoreVertical,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Banknote,
  Building,
  User,
  Users,
  PlusCircle,
  Edit3,
  Trash2,
  Eye,
  Calculator,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import ActionButtons from "../../../Components/ActionButtons.jsx";
import ReusableTable from "../../../Components/ReusableTable.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { getBackendURL, getImageURL } from '../../../utils/config.js';
import jsPDF from 'jspdf';
import { formatCurrency, getCurrencySymbol, convertFromINR, convertToINR, convertAmount } from '../../../utils/currency.js';
/* ---------------- Unified Popups from ActionMessageModel ---------------- */
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showSuccessModal,
  showErrorModal,
  showLoadingModal,
  closeModal,
  showConfirmationDialog,
  showCustomDialog,
  ErrorMessages
} from "../../../Components/ActionMessageModel.jsx";
import {
  partyAPI,
  categoryAPI,
  businessAPI,
  salesInvoiceAPI,
  paymentInAPI,
  paymentOutAPI,
  creditNoteAPI,
  debitNoteAPI,
  salesReturnAPI,
  purchaseReturnAPI
} from "../../../utils/api.js";
import { countryCodes } from "../../../utils/countryCodes.js";


// Helper to format phone numbers as (+XX) YYYYYYYYYY
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "-";
  const trimmed = phoneNumber.trim();
  if (trimmed.startsWith("+")) {
    // Sort country codes by dial_code length descending to match the longest one first
    const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
    for (const c of sortedCodes) {
      if (trimmed.startsWith(c.dial_code)) {
        const dialCode = c.dial_code;
        const numberPart = trimmed.slice(dialCode.length).trim();
        return `(${dialCode}) ${numberPart}`;
      }
    }
  }
  return trimmed;
};

/* ---------------- Reusable Sub-components ---------------- */
const getBackendUrl = () => {
  return getBackendURL();
};

// Keep parity with existing usage if needed, but point to unified functions
const showToast = (config, type = "success") => {
  let finalConfig = {};
  if (typeof config === "string") {
    // If it's a string, treat it as the 'text' property
    finalConfig = { text: config, icon: type };
  } else {
    // If it's an object, use it directly
    finalConfig = config;
  }

  const { title = "", text = "", icon = "success", timer = 1400 } = finalConfig;

  if (icon === "success") showSuccessToast({ title, text, timer });
  else if (icon === "error") showErrorToast({ title, text, timer });
  else if (icon === "warning") showWarningToast({ title, text, timer });
  else showInfoToast({ title, text, timer });
};

/* ---------------- Create Category Modal (simple) ---------------- */
function CreateCategoryModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTimeout(() => inputRef.current?.focus(), 0);
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate?.(trimmed);
    setName("");
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Create New Category
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Category Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Snacks"
            className="w-full px-3 py-2.5 bg-white/50 border-2 border-gray-200 rounded-lg focus:border-green-500 text-sm"
          />
        </div>

        <div className="px-4 pb-4 pt-1.5">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-xs hover:from-[#129046]/90 hover:to-[#9ccc53]/90 disabled:opacity-50"
            >
              <Plus className="w-3 h-3 inline-block mr-1" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Billing Address Modal ---------------- */
function BillingAddressModal({ open, onClose, billingAddress, onSave }) {
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Track manually edited address fields
  const [manualAddressEdits, setManualAddressEdits] = useState({ city: false, state: false, country: false });

  // Search and Loading states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Refs for click outside
  const countryInputRef = useRef(null);
  const countryOptionsListRef = useRef(null);
  const stateInputRef = useRef(null);
  const stateOptionsListRef = useRef(null);
  const cityInputRef = useRef(null);
  const cityOptionsListRef = useRef(null);

  const [countryHighlightedIndex, setCountryHighlightedIndex] = useState(0);
  const [stateHighlightedIndex, setStateHighlightedIndex] = useState(0);
  const [cityHighlightedIndex, setCityHighlightedIndex] = useState(0);

  // Keyboard navigation for dropdowns
  const handleCountryKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCountryHighlightedIndex((prev) => (prev < filteredCountryOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCountryHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredCountryOptions.length > 0) {
      e.preventDefault();
      selectCountryOption(filteredCountryOptions[countryHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setShowCountryDropdown(false);
    }
  };

  const handleStateKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setStateHighlightedIndex((prev) => (prev < filteredStateOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setStateHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredStateOptions.length > 0) {
      e.preventDefault();
      selectStateOption(filteredStateOptions[stateHighlightedIndex].id);
    } else if (e.key === "Escape") {
      setShowStateDropdown(false);
    }
  };

  const handleCityKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev < filteredCityOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredCityOptions.length > 0) {
      e.preventDefault();
      selectCityOption(filteredCityOptions[cityHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setShowCityDropdown(false);
    }
  };

  // Auto-scroll highlighted option into view for Country
  useEffect(() => {
    if (showCountryDropdown && countryOptionsListRef.current) {
      const highlightedElement = countryOptionsListRef.current.children[countryHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [countryHighlightedIndex, showCountryDropdown]);

  // Auto-scroll highlighted option into view for State
  useEffect(() => {
    if (showStateDropdown && stateOptionsListRef.current) {
      const highlightedElement = stateOptionsListRef.current.children[stateHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [stateHighlightedIndex, showStateDropdown]);

  // Auto-scroll highlighted option into view for City
  useEffect(() => {
    if (showCityDropdown && cityOptionsListRef.current) {
      const highlightedElement = cityOptionsListRef.current.children[cityHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [cityHighlightedIndex, showCityDropdown]);

  useEffect(() => {
    if (open) {
      setLine1(billingAddress?.line1 || "");
      setCity(billingAddress?.city || "");
      setState(billingAddress?.state || "");
      setPincode(billingAddress?.pincode || "");
      setCountry(billingAddress?.country || "");

      // Initialize manual edits tracking based on existing data
      setManualAddressEdits({
        city: !!billingAddress?.city,
        state: !!billingAddress?.state,
        country: !!billingAddress?.country
      });

      // Auto-detect country if empty
      if (!(billingAddress?.country)) {
        const detectCountry = async () => {
          try {
            const response = await fetch('https://country.is/');
            if (!response.ok) return;
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              console.warn('Country detection did not return JSON');
              return;
            }
            const data = await response.json();
            if (data && data.country) {
              const countryData = countryCodes.find(c => c.code === data.country);
              if (countryData) {
                setCountry(countryData.name);
                setCountrySearchTerm(countryData.name);
              }
            }
          } catch (error) {
            console.warn('Error detecting country:', error.message);
          }
        };
        detectCountry();
      }

      setErrors({});
      fetchCountries();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, billingAddress]);

  useEffect(() => {
    if (country) {
      fetchStates(country);
    } else {
      setStates([]);
    }
  }, [country]);

  useEffect(() => {
    if (country && state) {
      fetchCities(country, state);
    } else {
      setCities([]);
    }
  }, [country, state]);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
      const result = await response.json();
      if (!result.error) {
        setCountries(result.data.map(c => ({ label: c.name, value: c.name })));
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchStates = async (countryName) => {
    setLoadingStates(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const result = await response.json();
      if (!result.error) {
        setStates(result.data.states.map(s => ({ label: s.name, id: s.name })));
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (countryName, stateName) => {
    setLoadingCities(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const result = await response.json();
      if (!result.error) {
        setCities(result.data.map(c => ({ label: c, value: c })));
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = (value) => {
    setPincode(value);
    if (value.length > 0) {
      setManualAddressEdits({ city: false, state: false, country: false });
    }
  };

  const fetchAddressByPincode = async (value) => {
    if (!value || value.length < 3) return;

    try {
      setPincodeLoading(true);
      const resp = await businessAPI.getCityByPincode(value, country);
      if (resp.success && resp.data) {
        const { city: fetchedCity, state: fetchedState } = resp.data;

        if (!manualAddressEdits.city && fetchedCity && fetchedCity !== value) {
          setCities(prev => {
            const exists = prev.some(opt => opt.value === fetchedCity);
            if (!exists) {
              return [{ label: fetchedCity, value: fetchedCity }, ...prev];
            }
            return prev;
          });

          setCity(fetchedCity);
          setErrors(prev => ({ ...prev, city: '' }));
        }

        if (!manualAddressEdits.state && fetchedState) {
          setState(fetchedState);
          setErrors(prev => ({ ...prev, state: '' }));
        }

        if (!manualAddressEdits.country && resp.data.country) setCountry(resp.data.country);
        setErrors(prev => ({ ...prev, pincode: '' }));
        return;
      } else {
        showInfoToast('No address found for this pincode. Please enter manually.');
      }

      // Fallback
      if (country && country.toLowerCase() !== 'india') {
        const normalized = country.trim().toLowerCase();
        const countryData = countryCodes.find(c =>
          c.name.toLowerCase() === normalized ||
          c.code.toLowerCase() === normalized
        );
        if (countryData && countryData.code) {
          const fbResp = await fetch(`https://api.zippopotam.us/${countryData.code.toLowerCase()}/${value}`);
          if (fbResp.ok) {
            const fbData = await fbResp.ok ? await fbResp.json() : null;
            if (fbData && fbData.places && fbData.places.length > 0) {
              const place = fbData.places[0];
              setCity(place['place name']);
              setState(place['state']);
              setErrors(prev => ({ ...prev, city: '', state: '', pincode: '' }));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Pincode error:", e);
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchAddressByPincode(pincode);
    }
  };

  // Auto-fetch on pincode change
  useEffect(() => {
    const pincodeValue = pincode?.trim();
    if (pincodeValue && pincodeValue.length >= 3 && !pincodeLoading) {
      const timer = setTimeout(() => {
        fetchAddressByPincode(pincodeValue);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pincode]);

  const handleSave = () => {
    const newErrors = {};
    if (!line1.trim()) newErrors.line1 = "Street address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!pincode.trim()) newErrors.pincode = "Pincode is required";
    if (!country.trim()) newErrors.country = "Country is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({ line1, city, state, pincode, country });
    onClose();
  };

  const filteredCountryOptions = countries.filter(option =>
    option.label.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  const filteredStateOptions = states.filter(option =>
    option.label.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  const filteredCityOptions = cities.filter(option =>
    option.label.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  const selectCountryOption = (val) => {
    setCountry(val);
    setCountrySearchTerm("");
    setShowCountryDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, country: true }));
  };

  const selectStateOption = (val) => {
    setState(val);
    setStateSearchTerm("");
    setShowStateDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, state: true }));
  };

  const selectCityOption = (val) => {
    setCity(val);
    setCitySearchTerm("");
    setShowCityDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, city: true }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 transition-all duration-300 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Billing Address</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 group"
          >
            <X className="w-4 h-4 text-white/80 group-hover:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Row 1: Pincode, City */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pincode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pincode / ZIP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  onKeyDown={handlePincodeKeyDown}
                  className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all ${errors.pincode ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                  placeholder="Enter pincode/ZIP"
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {errors.pincode && <p className="text-[10px] text-red-500 mt-1">{errors.pincode}</p>}
            </div>

            {/* City */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                ref={cityInputRef}
                value={city}
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  setCitySearchTerm(val);
                  if (!showCityDropdown) setShowCityDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, city: true }));
                }}
                onFocus={() => {
                  setShowCityDropdown(true);
                  setCitySearchTerm(city);
                  const selectedIdx = filteredCityOptions.findIndex(c => c.value === city || c.label === city);
                  setCityHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleCityKeyDown}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.city ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingCities ? "Loading..." : "Search city"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
              {errors.city && <p className="text-[10px] text-red-500 mt-1">{errors.city}</p>}
              {showCityDropdown && (
                <div ref={cityOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredCityOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCityOption(opt.value)}
                      onMouseEnter={() => setCityHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${cityHighlightedIndex === idx || city === opt.value
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: State, Country */}
          <div className="grid grid-cols-2 gap-4">
            {/* State */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                ref={stateInputRef}
                value={state}
                onChange={(e) => {
                  const val = e.target.value;
                  setState(val);
                  setStateSearchTerm(val);
                  if (!showStateDropdown) setShowStateDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setShowStateDropdown(true);
                  setStateSearchTerm(state);
                  const selectedIdx = filteredStateOptions.findIndex(s => s.id === state || s.label === state);
                  setStateHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleStateKeyDown}
                onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.state ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingStates ? "Loading..." : "Search state"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
              {errors.state && <p className="text-[10px] text-red-500 mt-1">{errors.state}</p>}
              {showStateDropdown && (
                <div ref={stateOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredStateOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectStateOption(opt.id)}
                      onMouseEnter={() => setStateHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${stateHighlightedIndex === idx || state === opt.id
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                ref={countryInputRef}
                value={country}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountry(val);
                  setCountrySearchTerm(val);
                  if (!showCountryDropdown) setShowCountryDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, country: true }));
                }}
                onFocus={() => {
                  setShowCountryDropdown(true);
                  setCountrySearchTerm(country);
                  const selectedIdx = filteredCountryOptions.findIndex(c => c.value === country || c.label === country);
                  setCountryHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleCountryKeyDown}
                onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.country ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingCountries ? "Loading..." : "Search country"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
              {errors.country && <p className="text-[10px] text-red-500 mt-1">{errors.country}</p>}
              {showCountryDropdown && (
                <div ref={countryOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredCountryOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCountryOption(opt.value)}
                      onMouseEnter={() => setCountryHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${countryHighlightedIndex === idx || country === opt.value
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Street Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              rows={2}
              className={`w-full px-4 py-2 border-2 rounded-lg text-xs resize-none focus:ring-1 focus:ring-green-400 focus:outline-none transition-all ${errors.line1 ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
              placeholder="Enter street address"
            />
            {errors.line1 && <p className="text-[10px] text-red-500 mt-1">{errors.line1}</p>}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 backdrop-blur-sm">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all duration-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 rounded-md bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-xs font-bold shadow-lg shadow-green-200 hover:shadow-green-300 hover:translate-y-[-1px] transition-all duration-200 active:scale-95"
            >
              Save Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Shipping Address Modal ---------------- */
function ShippingAddressModal({ open, onClose, address, onSave }) {
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Track manually edited address fields
  const [manualAddressEdits, setManualAddressEdits] = useState({ city: false, state: false, country: false });

  // Search and Loading states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [countryHighlightedIndex, setCountryHighlightedIndex] = useState(0);
  const [stateHighlightedIndex, setStateHighlightedIndex] = useState(0);
  const [cityHighlightedIndex, setCityHighlightedIndex] = useState(0);

  // Refs for auto-scroll and click outside
  const countryInputRef = useRef(null);
  const countryOptionsListRef = useRef(null);
  const stateInputRef = useRef(null);
  const stateOptionsListRef = useRef(null);
  const cityInputRef = useRef(null);
  const cityOptionsListRef = useRef(null);

  // Keyboard navigation for dropdowns
  const handleCountryKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCountryHighlightedIndex((prev) => (prev < filteredCountryOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCountryHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredCountryOptions.length > 0) {
      e.preventDefault();
      selectCountryOption(filteredCountryOptions[countryHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setShowCountryDropdown(false);
    }
  };

  const handleStateKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setStateHighlightedIndex((prev) => (prev < filteredStateOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setStateHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredStateOptions.length > 0) {
      e.preventDefault();
      selectStateOption(filteredStateOptions[stateHighlightedIndex].id);
    } else if (e.key === "Escape") {
      setShowStateDropdown(false);
    }
  };

  const handleCityKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev < filteredCityOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredCityOptions.length > 0) {
      e.preventDefault();
      selectCityOption(filteredCityOptions[cityHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setShowCityDropdown(false);
    }
  };

  // Auto-scroll highlighted option into view for Country
  useEffect(() => {
    if (showCountryDropdown && countryOptionsListRef.current) {
      const highlightedElement = countryOptionsListRef.current.children[countryHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [countryHighlightedIndex, showCountryDropdown]);

  // Auto-scroll highlighted option into view for State
  useEffect(() => {
    if (showStateDropdown && stateOptionsListRef.current) {
      const highlightedElement = stateOptionsListRef.current.children[stateHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [stateHighlightedIndex, showStateDropdown]);

  // Auto-scroll highlighted option into view for City
  useEffect(() => {
    if (showCityDropdown && cityOptionsListRef.current) {
      const highlightedElement = cityOptionsListRef.current.children[cityHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [cityHighlightedIndex, showCityDropdown]);

  useEffect(() => {
    if (open) {
      setLine1(address?.line1 || "");
      setCity(address?.city || "");
      setState(address?.state || "");
      setPincode(address?.pincode || "");
      setCountry(address?.country || "");

      // Initialize manual edits tracking based on existing data
      setManualAddressEdits({
        city: !!address?.city,
        state: !!address?.state,
        country: !!address?.country
      });

      // Auto-detect country if empty
      if (!(address?.country)) {
        const detectCountry = async () => {
          try {
            const response = await fetch('https://country.is/');
            if (!response.ok) return;
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              console.warn('Country detection did not return JSON');
              return;
            }
            const data = await response.json();
            if (data && data.country) {
              const countryData = countryCodes.find(c => c.code === data.country);
              if (countryData) {
                setCountry(countryData.name);
                setCountrySearchTerm(countryData.name);
              }
            }
          } catch (error) {
            console.warn('Error detecting country:', error.message);
          }
        };
        detectCountry();
      }

      setErrors({});
      fetchCountries();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, address]);

  useEffect(() => {
    if (country) {
      fetchStates(country);
    } else {
      setStates([]);
    }
  }, [country]);

  useEffect(() => {
    if (country && state) {
      fetchCities(country, state);
    } else {
      setCities([]);
    }
  }, [country, state]);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
      const result = await response.json();
      if (!result.error) {
        setCountries(result.data.map(c => ({ label: c.name, value: c.name })));
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchStates = async (countryName) => {
    setLoadingStates(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const result = await response.json();
      if (!result.error) {
        setStates(result.data.states.map(s => ({ label: s.name, id: s.name })));
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (countryName, stateName) => {
    setLoadingCities(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const result = await response.json();
      if (!result.error) {
        setCities(result.data.map(c => ({ label: c, value: c })));
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = (value) => {
    setPincode(value);
    if (value.length > 0) {
      setManualAddressEdits({ city: false, state: false, country: false });
    }
  };

  const fetchAddressByPincode = async (value) => {
    if (!value || value.length < 3) return;

    try {
      setPincodeLoading(true);
      const resp = await businessAPI.getCityByPincode(value, country);
      if (resp.success && resp.data) {
        const { city: fetchedCity, state: fetchedState } = resp.data;

        if (!manualAddressEdits.city && fetchedCity && fetchedCity !== value) {
          setCities(prev => {
            const exists = prev.some(opt => opt.value === fetchedCity);
            if (!exists) {
              return [{ label: fetchedCity, value: fetchedCity }, ...prev];
            }
            return prev;
          });

          setCity(fetchedCity);
          setErrors(prev => ({ ...prev, city: '' }));
        }

        if (!manualAddressEdits.state && fetchedState) {
          setState(fetchedState);
          setErrors(prev => ({ ...prev, state: '' }));
        }

        if (!manualAddressEdits.country && resp.data.country) setCountry(resp.data.country);
        setErrors(prev => ({ ...prev, pincode: '' }));
        return;
      } else {
        showInfoToast('No address found for this pincode. Please enter manually.');
      }

      // Fallback
      if (country && country.toLowerCase() !== 'india') {
        const normalized = country.trim().toLowerCase();
        const countryData = countryCodes.find(c =>
          c.name.toLowerCase() === normalized ||
          c.code.toLowerCase() === normalized
        );
        if (countryData && countryData.code) {
          const fbResp = await fetch(`https://api.zippopotam.us/${countryData.code.toLowerCase()}/${value}`);
          if (fbResp.ok) {
            const fbData = await fbResp.ok ? await fbResp.json() : null;
            if (fbData && fbData.places && fbData.places.length > 0) {
              const place = fbData.places[0];
              setCity(place['place name']);
              setState(place['state']);
              setErrors(prev => ({ ...prev, city: '', state: '', pincode: '' }));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Pincode error:", e);
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchAddressByPincode(pincode);
    }
  };

  // Auto-fetch on pincode change
  useEffect(() => {
    const pincodeValue = pincode?.trim();
    if (pincodeValue && pincodeValue.length >= 3 && !pincodeLoading) {
      const timer = setTimeout(() => {
        fetchAddressByPincode(pincodeValue);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pincode]);

  const handleSave = () => {
    const newErrors = {};
    if (!line1.trim()) newErrors.line1 = "Street address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!pincode.trim()) newErrors.pincode = "Pincode is required";
    if (!country.trim()) newErrors.country = "Country is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({ line1, city, state, pincode, country });
    onClose();
  };

  const filteredCountryOptions = countries.filter(option =>
    option.label.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  const filteredStateOptions = states.filter(option =>
    option.label.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  const filteredCityOptions = cities.filter(option =>
    option.label.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  const selectCountryOption = (val) => {
    setCountry(val);
    setCountrySearchTerm("");
    setShowCountryDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, country: true }));
  };

  const selectStateOption = (val) => {
    setState(val);
    setStateSearchTerm("");
    setShowStateDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, state: true }));
  };

  const selectCityOption = (val) => {
    setCity(val);
    setCitySearchTerm("");
    setShowCityDropdown(false);
    setManualAddressEdits(prev => ({ ...prev, city: true }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 transition-all duration-300 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Shipping Address</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 group"
          >
            <X className="w-4 h-4 text-white/80 group-hover:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Row 1: Pincode, City */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pincode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pincode / ZIP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  onKeyDown={handlePincodeKeyDown}
                  className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all ${errors.pincode ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                  placeholder="Enter pincode/ZIP"
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {errors.pincode && <p className="text-[10px] text-red-500 mt-1">{errors.pincode}</p>}
            </div>

            {/* City */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                ref={cityInputRef}
                value={city}
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  setCitySearchTerm(val);
                  if (!showCityDropdown) setShowCityDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, city: true }));
                }}
                onFocus={() => {
                  setShowCityDropdown(true);
                  setCitySearchTerm(city);
                  const selectedIdx = filteredCityOptions.findIndex(c => c.value === city || c.label === city);
                  setCityHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleCityKeyDown}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.city ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingCities ? "Loading..." : "Search city"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
              {errors.city && <p className="text-[10px] text-red-500 mt-1">{errors.city}</p>}
              {showCityDropdown && (
                <div ref={cityOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredCityOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCityOption(opt.value)}
                      onMouseEnter={() => setCityHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${cityHighlightedIndex === idx || city === opt.value
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: State, Country */}
          <div className="grid grid-cols-2 gap-4">
            {/* State */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                ref={stateInputRef}
                value={state}
                onChange={(e) => {
                  const val = e.target.value;
                  setState(val);
                  setStateSearchTerm(val);
                  if (!showStateDropdown) setShowStateDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setShowStateDropdown(true);
                  setStateSearchTerm(state);
                  const selectedIdx = filteredStateOptions.findIndex(s => s.id === state || s.label === state);
                  setStateHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleStateKeyDown}
                onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.state ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingStates ? "Loading..." : "Search state"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
              {errors.state && <p className="text-[10px] text-red-500 mt-1">{errors.state}</p>}
              {showStateDropdown && (
                <div ref={stateOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredStateOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectStateOption(opt.id)}
                      onMouseEnter={() => setStateHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${stateHighlightedIndex === idx || state === opt.id
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                ref={countryInputRef}
                value={country}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountry(val);
                  setCountrySearchTerm(val);
                  if (!showCountryDropdown) setShowCountryDropdown(true);
                  setManualAddressEdits(prev => ({ ...prev, country: true }));
                }}
                onFocus={() => {
                  setShowCountryDropdown(true);
                  setCountrySearchTerm(country);
                  const selectedIdx = filteredCountryOptions.findIndex(c => c.value === country || c.label === country);
                  setCountryHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                }}
                onKeyDown={handleCountryKeyDown}
                onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                className={`w-full px-4 py-2 border-2 rounded-lg text-xs focus:ring-1 focus:ring-green-400 focus:outline-none transition-all pr-10 ${errors.country ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
                placeholder={loadingCountries ? "Loading..." : "Search country"}
              />
              <ChevronDown className={`absolute right-3 top-[34px] w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
              {errors.country && <p className="text-[10px] text-red-500 mt-1">{errors.country}</p>}
              {showCountryDropdown && (
                <div ref={countryOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredCountryOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCountryOption(opt.value)}
                      onMouseEnter={() => setCountryHighlightedIndex(idx)}
                      className={`w-full px-4 py-2 text-left text-xs transition-colors border-b border-gray-50 last:border-0 ${countryHighlightedIndex === idx || country === opt.value
                        ? "bg-[#129046] text-white font-bold"
                        : "hover:bg-gray-50 text-gray-800"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Street Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              rows={2}
              className={`w-full px-4 py-2 border-2 rounded-lg text-xs resize-none focus:ring-1 focus:ring-green-400 focus:outline-none transition-all ${errors.line1 ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-[#129046]"}`}
              placeholder="Enter street address"
            />
            {errors.line1 && <p className="text-[10px] text-red-500 mt-1">{errors.line1}</p>}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 backdrop-blur-sm">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all duration-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-1.5 rounded-xl bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-xs font-bold shadow-lg shadow-green-200 hover:shadow-green-300 hover:translate-y-[-1px] transition-all duration-200 active:scale-95"
            >
              Save Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Shipping Addresses Modal ---------------- */
function ShippingAddressesModal({
  open,
  onClose,
  addresses,
  selectedIndex,
  onSelect,
  onEdit,
  onAdd,
  allSavedAddresses = [], // All addresses from database
}) {
  if (!open) return null;

  // Merge allSavedAddresses and addresses prop (form state)
  // Deduplicate by line1 and pincode to avoid showing the same address twice
  const displayAddresses = Array.from(new Map(
    [...(allSavedAddresses || []), ...(addresses || [])]
      .filter(addr => addr && (addr.line1 || addr.city || addr.state || addr.pincode))
      .map(addr => [`${addr.line1}-${addr.pincode}`, addr])
  ).values());

  const validAddresses = displayAddresses;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Select Shipping Address
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {validAddresses.length > 0 ? (
            validAddresses.map((addr, index) => {
              const selectedAddr = (addresses && selectedIndex >= 0) ? addresses[selectedIndex] : null;
              const isSelected = addr && selectedAddr && (
                (addr.id && selectedAddr.id && addr.id === selectedAddr.id) ||
                (addr.line1?.trim() === selectedAddr.line1?.trim() &&
                  addr.city?.trim() === selectedAddr.city?.trim() &&
                  addr.state?.trim() === selectedAddr.state?.trim() &&
                  addr.pincode?.toString().trim() === selectedAddr.pincode?.toString().trim())
              );

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                    ? "border-green-500 bg-green-50 ring-1 ring-green-100"
                    : "border-gray-100 hover:bg-gray-50 focus-within:bg-gray-50 text-gray-700"
                    }`}
                  onClick={() => {
                    onSelect(addr);
                    onClose();
                  }}
                >
                  <input
                    type="radio"
                    checked={!!isSelected}
                    onChange={() => {
                      onSelect(addr);
                      onClose();
                    }}
                    className="w-4 h-4 text-[#129046] focus:ring-[#129046]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={`flex-1 text-sm ${isSelected ? "font-semibold text-green-900" : ""}`}>
                    {(!addr.line1 && !addr.city && !addr.state && !addr.pincode) ? (
                      <span className="text-gray-400 italic">No address added</span>
                    ) : (
                      <>
                        {addr.line1 || 'No address'}
                        {addr.city && `, ${addr.city}`}
                        {addr.state && `, ${addr.state}`}
                        {addr.pincode && ` - ${addr.pincode}`}
                        {addr.country && `, ${addr.country}`}
                      </>
                    )}
                  </div>
                  {index < displayAddresses.length && (
                    <ActionButtons
                      onEdit={() => onEdit(addr)}
                      actions={['edit']}
                    />
                  )}
                </div>
              );
            })
          ) : null}

          <button
            onClick={onAdd}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400"
          >
            + Add New Address
          </button>
        </div>

        <div className="px-4 pb-4 pt-1.5">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Billing Addresses Modal ---------------- */
function BillingAddressesModal({
  open,
  onClose,
  addresses,
  selectedIndex,
  onSelect,
  onEdit,
  onAdd,
  allSavedAddresses = [],
}) {
  if (!open) return null;

  // Merge allSavedAddresses and addresses prop (form state)
  // Deduplicate by line1 and pincode to avoid showing the same address twice
  const displayAddresses = Array.from(new Map(
    [...(allSavedAddresses || []), ...(addresses || [])]
      .filter(addr => addr && (addr.line1 || addr.city || addr.state || addr.pincode))
      .map(addr => [`${addr.line1}-${addr.pincode}`, addr])
  ).values());

  const validAddresses = displayAddresses;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Select Billing Address
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {validAddresses.length > 0 ? (
            validAddresses.map((addr, index) => {
              const selectedAddr = (addresses && selectedIndex >= 0) ? addresses[selectedIndex] : null;
              const isSelected = addr && selectedAddr && (
                (addr.id && selectedAddr.id && addr.id === selectedAddr.id) ||
                (addr.line1?.trim() === selectedAddr.line1?.trim() &&
                  addr.city?.trim() === selectedAddr.city?.trim() &&
                  addr.state?.trim() === selectedAddr.state?.trim() &&
                  addr.pincode?.toString().trim() === selectedAddr.pincode?.toString().trim())
              );

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                    ? "border-green-500 bg-green-50 ring-1 ring-green-100"
                    : "border-gray-100 hover:bg-gray-50 focus-within:bg-gray-50 text-gray-700"
                    }`}
                  onClick={() => {
                    onSelect(addr);
                    onClose();
                  }}
                >
                  <input
                    type="radio"
                    checked={!!isSelected}
                    onChange={() => {
                      onSelect(addr);
                      onClose();
                    }}
                    className="w-4 h-4 text-[#129046] focus:ring-[#129046]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={`flex-1 text-sm ${isSelected ? "font-semibold text-green-900" : ""}`}>
                    {(!addr.line1 && !addr.city && !addr.state && !addr.pincode) ? (
                      <span className="text-gray-400 italic">No address added</span>
                    ) : (
                      <>
                        {addr.line1 || 'No address'}
                        {addr.city && `, ${addr.city}`}
                        {addr.state && `, ${addr.state}`}
                        {addr.pincode && ` - ${addr.pincode}`}
                        {addr.country && `, ${addr.country}`}
                      </>
                    )}
                  </div>
                  {index < displayAddresses.length && (
                    <ActionButtons
                      onEdit={() => onEdit(addr)}
                      actions={['edit']}
                    />
                  )}
                </div>
              );
            })
          ) : null}

          <button
            onClick={onAdd}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400"
          >
            + Add New Address
          </button>
        </div>

        <div className="px-4 pb-4 pt-1.5">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Category selector (mirrors sample) ---------------- */
function CategorySelectInput({ categories = [], onCreate, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filtered = categories.filter(
    (c) =>
      c && c.name && c.name.toLowerCase().includes(q.toLowerCase())
  );

  const selectedCategoryName = categories.find(c => c.id === value)?.name || "";

  const handleClear = (e) => {
    e?.stopPropagation();
    onChange?.("");
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={boxRef}>
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? q : selectedCategoryName}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder="Search Categories"
          className="w-full h-8 px-3 py-1.5 pr-8 border border-gray-300 rounded-lg focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white text-sm cursor-pointer"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-red-50 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-red-700 font-bold" strokeWidth={3} />
          </button>
        )}
      </div>

      {open && (
        <div className="w-full absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-2xl overflow-hidden z-[1000] rounded-lg">
          <div className="max-h-48 overflow-y-auto">
            {/* All Categories Option */}
            <button
              onClick={() => {
                onChange?.("");
                setQ("");
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors ${!value ? "bg-[#1fbe5a]/10 hover:bg-[#1fbe5a]/20" : "hover:bg-yellow-50"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${!value ? "bg-[#1fbe5a]" : "bg-gray-400"}`} />
              <span className={`text-xs font-semibold ${!value ? "text-[#1fbe5a]" : "text-gray-900"}`}>
                <span>{(!value ? "All Categories" : "All Categories")}</span>
              </span>
            </button>

            {filtered.length ? (
              filtered.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onChange?.(cat.id);
                    setQ("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-xs font-semibold text-gray-900">
                    <span>{cat.name}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No categories found
              </div>
            )}

            {/* Separate Create Category button at the bottom */}
            {onCreate && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    onCreate?.();
                  }}
                  className="w-full text-left px-4 py-3 bg-[#1fbe5a] hover:bg-[#1fbe5a]/90 font-semibold text-white flex items-center gap-2.5"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs font-semibold"><span>Create Category</span></span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Category selector for form (separate component) ---------------- */
function CategorySelectInputForm({ categories = [], onCreate, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filtered = categories.filter(
    (c) =>
      c && c.name && c.name.toLowerCase().includes(q.toLowerCase())
  );

  const selectedCategoryName = categories.find(c => c.id === value)?.name || "";

  const handleClear = (e) => {
    e?.stopPropagation();
    onChange?.("");
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={boxRef}>
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? q : selectedCategoryName}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder="Search Categories"
          className="w-full h-8 px-3 py-1.5 pr-8 border border-gray-300 rounded-[7px] focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white text-sm cursor-pointer"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-red-50 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-red-700 font-bold" strokeWidth={3} />
          </button>
        )}
      </div>

      {open && (
        <div className="w-full absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-2xl overflow-hidden z-[1000] rounded-lg">
          <div className="max-h-48 overflow-y-auto">
            {/* All Categories Option */}
            <button
              onClick={() => {
                onChange?.("");
                setQ("");
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors ${!value ? "bg-[#1fbe5a]/10 hover:bg-[#1fbe5a]/20" : "hover:bg-yellow-50"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${!value ? "bg-[#1fbe5a]" : "bg-gray-400"}`} />
              <span className={`text-xs font-semibold ${!value ? "text-[#1fbe5a]" : "text-gray-900"}`}>
                <span>All Categories</span>
              </span>
            </button>

            {filtered.length ? (
              filtered.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onChange?.(cat.id);
                    setQ("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-xs font-semibold text-gray-900">
                    <span>{cat.name}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No categories found
              </div>
            )}

            {/* Separate Create Category button at the bottom */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  onCreate?.();
                }}
                className="w-full text-left px-4 py-3 bg-[#1fbe5a] hover:bg-[#1fbe5a]/90 font-semibold text-white flex items-center gap-2.5"
              >
                <Plus className="w-3 h-3" />
                <span className="text-xs font-semibold"><span>Create Category</span></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Generic selector (same style as Category) ---------------- */
function GenericSelectInput({
  value,
  onChange,
  placeholder = "Select option",
  options = [],
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="relative w-full" ref={boxRef}>
      <input
        ref={inputRef}
        value={value || ""}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white text-sm cursor-pointer"
        readOnly
      />

      {open && (
        <div className="w-full absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-2xl overflow-hidden z-[1000] rounded-lg">
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id || option}
                onClick={() => {
                  onChange?.(option.id || option);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-2.5"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-xs font-semibold text-gray-900">
                  <span>{option.label || option}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Mobile party card (kept compact) ---------------- */

function MobilePartyCard({
  partyName,
  mobileNumber,
  partyType,
  balance,
  category,
  onEdit,
  onDelete,
  onDetails, // <-- new prop
  email,
  id,
  isActionsOpen,
  onToggleActions,
  onCloseActions,
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-3 hover:shadow-xl relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {partyName}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              {email && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <span>{email}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActions(id);
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-expanded={isActionsOpen}
            aria-controls={`actions-${id}`}
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {isActionsOpen && (
        <div
          data-actions-container
          id={`actions-${id}`}
          className="absolute right-4 top-14 bg-white p-2 m-2 shadow-lg items-center justify-end gap-2 rounded-lg border-1 border-yellow-100 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
              onCloseActions?.();
            }}
            className="flex items-center gap-2 px-2 py-2 w-full text-sm text-green-500 hover:bg-green-50"
          >
            Edit
          </button>

          <hr />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetails?.();
              onCloseActions?.();
            }}
            className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100"
          >
            Details
          </button>
          <hr />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
              onCloseActions?.();
            }}
            className="flex items-center gap-2 px-2 py-2 text-red-500 text-sm hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Party Form (create/edit) ---------------- */
function PartyForm({
  initialData = null,
  onCancel,
  onSave,
  categories = [],
  onCreateCategory,
  isEdit = false,
  currency = "INR",
}) {
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };
  const inputRef = useRef(null);
  const prevCurrencyRef = useRef(currency);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Phone Country Code dropdown state variables
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState("");
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);
  const [phoneCodeHighlightedIndex, setPhoneCodeHighlightedIndex] = useState(0);
  const phoneCodeInputRef = useRef(null);
  const phoneCodeOptionsListRef = useRef(null);

  // Contact Person Phone Country Code dropdown state variables
  const [contactCodeSearchTerm, setContactCodeSearchTerm] = useState("");
  const [showContactCodeDropdown, setShowContactCodeDropdown] = useState(false);
  const [contactCodeHighlightedIndex, setContactCodeHighlightedIndex] = useState(0);
  const contactCodeInputRef = useRef(null);
  const contactCodeOptionsListRef = useRef(null);

  // Filter country codes based on search term
  const filteredCountryCodes = useMemo(() => {
    return countryCodes.filter(c =>
      c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
      c.dial_code.includes(phoneCodeSearchTerm)
    );
  }, [phoneCodeSearchTerm]);

  // Filter contact person country codes based on search term
  const filteredContactCodes = useMemo(() => {
    return countryCodes.filter(c =>
      c.name.toLowerCase().includes(contactCodeSearchTerm.toLowerCase()) ||
      c.dial_code.includes(contactCodeSearchTerm)
    );
  }, [contactCodeSearchTerm]);

  const selectPhoneCodeOption = (dialCode) => {
    setFormData((prev) => ({ ...prev, mobileNumberCode: dialCode }));
    setShowPhoneCodeDropdown(false);
    setPhoneCodeSearchTerm("");
    setPhoneCodeHighlightedIndex(0);
  };

  const selectContactCodeOption = (dialCode) => {
    setFormData((prev) => ({ ...prev, contactPersonCode: dialCode }));
    setShowContactCodeDropdown(false);
    setContactCodeSearchTerm("");
    setContactCodeHighlightedIndex(0);
  };
  const handlePhoneCodeKeyDown = (e) => {
    if (!showPhoneCodeDropdown || filteredCountryCodes.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPhoneCodeHighlightedIndex((prev) =>
        prev < filteredCountryCodes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPhoneCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredCountryCodes.length > 0) {
      e.preventDefault();
      selectPhoneCodeOption(filteredCountryCodes[phoneCodeHighlightedIndex].dial_code);
    } else if (e.key === "Escape") {
      setShowPhoneCodeDropdown(false);
      setPhoneCodeSearchTerm("");
    }
  };

  const handleContactCodeKeyDown = (e) => {
    if (!showContactCodeDropdown || filteredContactCodes.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setContactCodeHighlightedIndex((prev) =>
        prev < filteredContactCodes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setContactCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredContactCodes.length > 0) {
      e.preventDefault();
      selectContactCodeOption(filteredContactCodes[contactCodeHighlightedIndex].dial_code);
    } else if (e.key === "Escape") {
      setShowContactCodeDropdown(false);
      setContactCodeSearchTerm("");
    }
  };

  const defaultAddress = {
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
  };

  const [formData, setFormData] = useState({
    partyName: "",
    tradeName: "",
    mobileNumber: "",
    mobileNumberCode: "+91",
    contactPersonCode: "+91",
    email: "",
    openingBalance: "",
    toCollect: 0,
    gstin: "",
    vat: "",
    panNumber: "",
    partyType: "customer",
    category_id: "",
    balanceType: "",
    billingAddresses: [], // Start empty for new party
    selectedBillingAddressIndex: -1,
    shippingAddresses: [], // Start empty for new party
    selectedShippingAddressIndex: -1,
    shippingAddressSameAsBilling: true,
    creditPeriod: "",
    creditLimit: "",
    contactPerson: { name: "", phone: "" },
    bankAccounts: [],
    customFields: [],
    notes: "",
    otherPartyType: "",
    registrationType: "GSTIN", // "GSTIN", "VAT", or "NO_TAX"
  });

  const clearTaxErrors = () => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.gstin;
      delete newErrors.vat;
      return newErrors;
    });
  };

  const [errors, setErrors] = useState({});
  const [gstinLoading, setGstinLoading] = useState(false);
  const [isGstinAutofetched, setIsGstinAutofetched] = useState(false);
  const [showBillingAddressesModal, setShowBillingAddressesModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showShippingAddressesModal, setShowShippingAddressesModal] =
    useState(false);
  const [editingShippingIndex, setEditingShippingIndex] = useState(null);
  const [showShippingAddressModal, setShowShippingAddressModal] =
    useState(false);
  const [editingBillingIndex, setEditingBillingIndex] = useState(null);
  const [dropdowns, setDropdowns] = useState({});
  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [allSavedAddresses, setAllSavedAddresses] = useState({ billing: [], shipping: [] });

  // Fetch all saved addresses from database when editing party
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (initialData && initialData.id) {
        try {
          const { partyAPI } = await import("../../../utils/api.js");
          const selectedBusinessId = localStorage.getItem("selectedBusinessId");
          const response = await partyAPI.getAddresses(initialData.id, selectedBusinessId);

          if (response.success && response.data) {
            const addresses = response.data;
            const billingAddrs = addresses.filter(addr => addr.address_type === 'billing');
            const shippingAddrs = addresses.filter(addr => addr.address_type === 'shipping');


            setAllSavedAddresses({ billing: billingAddrs, shipping: shippingAddrs });
          }
        } catch (error) {
          console.error('Error fetching saved addresses:', error);
        }
      }
    };

    fetchSavedAddresses();
  }, [initialData?.id]);

  // Fetch bank accounts from database when editing party
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (initialData && initialData.id) {
        try {
          const { partyAPI } = await import("../../../utils/api.js");
          const selectedBusinessId = localStorage.getItem("selectedBusinessId");
          const response = await partyAPI.getBankAccounts(initialData.id, selectedBusinessId);

          if (response.success && response.data) {

            // Map backend fields to frontend fields
            const bankAccounts = response.data.map(bank => ({
              id: bank.id,
              bankName: bank.bank_name,
              accountNumber: bank.account_number,
              ifsc: bank.ifsc,
              branch: bank.branch,
              accountHolder: bank.account_holder_name,
            }));

            setFormData(prev => ({
              ...prev,
              bankAccounts: bankAccounts
            }));
          }
        } catch (error) {
          console.error('Error fetching bank accounts:', error);
        }
      }
    };

    fetchBankAccounts();
  }, [initialData?.id]);

  // Cleanup blob URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  useEffect(() => {
    if (initialData) {
      let billingAddresses = [];
      let selectedBillingAddressIndex = -1;
      if (
        initialData.billingAddresses &&
        Array.isArray(initialData.billingAddresses) &&
        initialData.billingAddresses.length > 0
      ) {
        billingAddresses = initialData.billingAddresses.map((addr) => ({
          ...defaultAddress,
          ...addr,
        }));
        selectedBillingAddressIndex =
          initialData.selectedBillingAddressIndex || 0;
      } else if (initialData.billingAddress && (initialData.billingAddress.line1 || initialData.billingAddress.city || initialData.billingAddress.state || initialData.billingAddress.pincode)) {
        const billingAddress =
          typeof initialData.billingAddress === "string"
            ? { ...defaultAddress, line1: initialData.billingAddress }
            : { ...defaultAddress, ...(initialData.billingAddress || {}) };
        billingAddresses = [billingAddress];
        selectedBillingAddressIndex = 0;
      }

      let shippingAddresses = [];
      let selectedShippingAddressIndex = -1;
      if (
        initialData.shippingAddresses &&
        Array.isArray(initialData.shippingAddresses) &&
        initialData.shippingAddresses.length > 0
      ) {
        shippingAddresses = initialData.shippingAddresses.map((addr) => ({
          ...defaultAddress,
          ...addr,
        }));
        selectedShippingAddressIndex =
          initialData.selectedShippingAddressIndex || 0;
      } else if (initialData.shippingAddress && (initialData.shippingAddress.line1 || initialData.shippingAddress.city || initialData.shippingAddress.state || initialData.shippingAddress.pincode)) {
        const shippingAddress =
          typeof initialData.shippingAddress === "string"
            ? { ...defaultAddress, line1: initialData.shippingAddress }
            : { ...defaultAddress, ...(initialData.shippingAddress || {}) };
        shippingAddresses = [shippingAddress];
        selectedShippingAddressIndex = 0;
      }

      // Check if billing and shipping addresses are the same
      const selectedBilling = billingAddresses[selectedBillingAddressIndex] || defaultAddress;
      const selectedShipping = shippingAddresses[selectedShippingAddressIndex] || defaultAddress;

      const isSameAddress =
        selectedBilling.line1 === selectedShipping.line1 &&
        selectedBilling.city === selectedShipping.city &&
        selectedBilling.state === selectedShipping.state &&
        selectedBilling.pincode === selectedShipping.pincode &&
        selectedBilling.country === selectedShipping.country;

      setFormData({
        partyName: initialData.partyName || "",
        tradeName: initialData.tradeName || "",
        mobileNumber: (function () {
          const phoneValue = initialData.mobileNumber || "";
          if (phoneValue.startsWith("+")) {
            const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
            const match = sortedCodes.find(c => phoneValue.startsWith(c.dial_code));
            if (match) return phoneValue.slice(match.dial_code.length);
          }
          return phoneValue;
        })(),
        mobileNumberCode: (function () {
          const phoneValue = initialData.mobileNumber || "";
          if (phoneValue.startsWith("+")) {
            const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
            const match = sortedCodes.find(c => phoneValue.startsWith(c.dial_code));
            if (match) return match.dial_code;
          }
          return "+91";
        })(),
        email: initialData.email || "",
        openingBalance:
          initialData.openingBalance != null ? convertFromINR(initialData.openingBalance, currency).toFixed(2) : "",
        toCollect: initialData.toCollect || 0,
        gstin: initialData.gstin || "",
        vat: initialData.vat || "",
        panNumber: initialData.panNumber || "",
        partyType: ["customer", "vendor", "both"].includes((initialData.partyType || "customer").toLowerCase())
          ? (initialData.partyType || "customer").toLowerCase()
          : "other",
        otherPartyType: !["customer", "vendor", "both"].includes((initialData.partyType || "customer").toLowerCase())
          ? initialData.partyType
          : "",
        category_id: initialData.category_id || "",
        balanceType: initialData.balanceType || initialData.balance_type || "receivable",
        billingAddresses,
        selectedBillingAddressIndex,
        shippingAddresses,
        selectedShippingAddressIndex,
        shippingAddressSameAsBilling:
          initialData.shippingAddressSameAsBilling !== undefined
            ? initialData.shippingAddressSameAsBilling
            : isSameAddress,
        creditPeriod: initialData.credit_days || initialData.creditPeriod || "",
        creditLimit: (initialData.credit_limit || initialData.creditLimit) ? convertFromINR(initialData.credit_limit || initialData.creditLimit, currency).toFixed(2) : "",
        contactPerson: {
          name: initialData.contactPerson?.name || "",
          phone: (function () {
            const phoneValue = initialData.contactPerson?.phone || "";
            if (phoneValue.startsWith("+")) {
              const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
              const match = sortedCodes.find(c => phoneValue.startsWith(c.dial_code));
              if (match) return phoneValue.slice(match.dial_code.length);
            }
            return phoneValue;
          })(),
        },
        contactPersonCode: (function () {
          const phoneValue = initialData.contactPerson?.phone || "";
          if (phoneValue.startsWith("+")) {
            const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
            const match = sortedCodes.find(c => phoneValue.startsWith(c.dial_code));
            if (match) return match.dial_code;
          }
          return "+91";
        })(),
        bankAccounts: Array.isArray(initialData.bankAccounts)
          ? initialData.bankAccounts
          : [],
        customFields: Array.isArray(initialData.customFields)
          ? initialData.customFields
          : [],
        notes: initialData.notes || initialData.remark || "",
        id: initialData.id,
        registrationType: initialData.no_tax ? "NO_TAX" : (initialData.vat ? "VAT" : (initialData.gstin ? "GSTIN" : "NO_TAX")),
      });

      // Handle existing logo display
      if (
        initialData.logo &&
        typeof initialData.logo === "string" &&
        initialData.logo.startsWith("/uploads/")
      ) {
        // Construct full logo URL
        const fullLogoUrl = getImageURL(initialData.logo);
        setLogoPreview(fullLogoUrl);
      } else {
        // Clear logo preview if no valid logo
        setLogoPreview(null);
      }

      // Clear any existing file reference when loading data
      setLogoFile(null);
    } else {
      setFormData((prev) => ({
        ...prev,
        billingAddresses: [],
        selectedBillingAddressIndex: -1,
        shippingAddresses: [],
        selectedShippingAddressIndex: -1,
      }));

      // Clear logo states for new party
      setLogoPreview(null);
      setLogoFile(null);
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialData]);

  // Effect to convert currency when the currency prop changes
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      setFormData(prev => {
        const newOpeningBalance = prev.openingBalance
          ? convertFromINR(convertToINR(prev.openingBalance, prevCurrencyRef.current), currency).toFixed(2)
          : "";
        const newCreditLimit = prev.creditLimit
          ? convertFromINR(convertToINR(prev.creditLimit, prevCurrencyRef.current), currency).toFixed(2)
          : "";

        return {
          ...prev,
          openingBalance: newOpeningBalance,
          creditLimit: newCreditLimit,
        };
      });
      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the party type dropdown
      const partyTypeDropdown = event.target.closest(
        '[data-dropdown="partyType"]'
      );
      if (!partyTypeDropdown && dropdowns.partyType) {
        setDropdowns((prev) => ({ ...prev, partyType: false }));
      }

      // Check if click is outside the balance type dropdown
      const balanceTypeDropdown = event.target.closest(
        '[data-dropdown="balanceType"]'
      );
      if (!balanceTypeDropdown && dropdowns.balanceType) {
        setDropdowns((prev) => ({ ...prev, balanceType: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdowns.partyType, dropdowns.balanceType]);

  // Click outside handler for phone code dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const phoneDropdown = event.target.closest(
        '[data-dropdown="phoneCode"]'
      );
      if (!phoneDropdown && showPhoneCodeDropdown) {
        setShowPhoneCodeDropdown(false);
        setPhoneCodeSearchTerm("");
        setPhoneCodeHighlightedIndex(0);
      }

      const contactDropdown = event.target.closest(
        '[data-dropdown="contactCode"]'
      );
      if (!contactDropdown && showContactCodeDropdown) {
        setShowContactCodeDropdown(false);
        setContactCodeSearchTerm("");
        setContactCodeHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPhoneCodeDropdown]);

  // Real-time field validation
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "partyName":
        if (!value || !value.trim()) {
          error = "Party name is required";
        } else if (value.trim().length < 2) {
          error = "Party name must be at least 2 characters";
        }
        break;

      case "mobileNumber":
        if (!value || !value.trim()) {
          error = "Mobile number is required";
        }
        break;

      case "email":
        if (value && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = "Email must contain @ and domain (e.g., user@example.com)";
          }
        }
        break;

      case "gstin":
      case "vat":
        if (value && value.trim()) {
          const cleanValue = value.trim().toUpperCase();
          if (formData.registrationType === "VAT" || name === "vat") {
            // VAT Validation
            if (cleanValue.length < 4 || cleanValue.length > 20) {
              error = "VAT number must be between 4 and 20 characters";
            }
          } else if (formData.registrationType === "GSTIN" || name === "gstin") {
            // Indian GSTIN Validation
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (cleanValue.length !== 15 || !gstinRegex.test(cleanValue)) {
              error = "Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).";
            }
          }
        } else if (name === "gstin" || name === "vat") {
          // Clear error if empty
          error = "";
        }
        break;

        // case "panNumber":
        //   if (value && value.trim()) {
        //     const panValue = value.trim().toUpperCase();
        //     if (panValue.length > 0 && panValue.length < 10) {
        //       error = "PAN must be exactly 10 characters";
        //     } else if (panValue.length === 10) {
        //       const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        //       if (!panRegex.test(panValue)) {
        //         error = "Invalid PAN format (e.g., ABCDE1234F)";
        //       }
        //     }
        //   }
        break;

      case "pincode":
      case "ship_pincode":
        if (value && value.trim()) {
          const pincodeValue = value.replace(/\D/g, "");
          if (pincodeValue.length > 0 && pincodeValue.length < 6) {
            error = "Pincode must be exactly 6 digits";
          } else if (pincodeValue.length > 6) {
            error = "Pincode cannot exceed 6 digits";
          }
        }
        break;

      case "openingBalance":
      case "creditLimit":
        if (value && value < 0) {
          error = "Amount cannot be negative";
        }
        break;

      // case "creditPeriod":
      //   if (value && (value < 0 || value > 365)) {
      //     error = "Credit period must be between 0 and 365 days";
      //   }
      //   break;

      default:
        break;
    }

    return error;
  };

  // Validation function for form submission
  const validateForm = () => {
    const newErrors = {};

    // Party Name - Required
    if (!formData.partyName || !formData.partyName.trim()) {
      newErrors.partyName = "Party name is required";
    }

    // Mobile Number - Required
    if (!formData.mobileNumber || !formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required";
    }

    // Party Type - Required
    if (!formData.partyType || !formData.partyType.trim()) {
      newErrors.partyType = "Party type is required";
    }

    // Other Party Type - Required if "other" is selected
    if (formData.partyType === "other" && (!formData.otherPartyType || !formData.otherPartyType.trim())) {
      newErrors.otherPartyType = "Please specify the party type";
    }

    // Email - Optional but if provided, must be valid
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Email must contain @ and domain (e.g., user@example.com)";
      }
    }

    // GSTIN/VAT - Optional but if provided, must be valid format
    if (formData.registrationType === "VAT") {
      if (formData.vat && formData.vat.trim()) {
        const vatValue = formData.vat.trim().toUpperCase();
        if (vatValue.length < 4 || vatValue.length > 20) {
          newErrors.vat = "VAT number must be between 4 and 20 characters";
        }
      }
    } else if (formData.registrationType === "GSTIN") {
      if (formData.gstin && formData.gstin.trim()) {
        const gstinValue = formData.gstin.trim().toUpperCase();
        if (gstinValue.length !== 15) {
          newErrors.gstin = "GSTIN must be exactly 15 characters";
        } else {
          const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstinRegex.test(gstinValue)) {
            newErrors.gstin = "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)";
          }
        }
      }
    }

    // PAN Number - Optional but if provided, must be valid format
    // Skip PAN validation when VAT is selected
    if (formData.panNumber && formData.panNumber.trim() && formData.registrationType !== "VAT") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.panNumber.trim().toUpperCase())) {
        newErrors.panNumber = "Invalid PAN format (e.g., ABCDE1234F)";
      }
    }

    // Bank Account Validation - If any bank field is filled, validate all required fields
    if (formData.bankAccounts && formData.bankAccounts.length > 0) {
      formData.bankAccounts.forEach((account, index) => {
        const hasAnyBankField = account.bankName || account.accountNumber || account.ifsc || account.branch;

        if (hasAnyBankField) {
          // If any bank field is filled, require all essential fields
          if (!account.bankName || !account.bankName.trim()) {
            newErrors[`bankAccount_${index}_bankName`] = "Bank name is required when adding bank details";
          }
          if (!account.accountNumber || !account.accountNumber.trim()) {
            newErrors[`bankAccount_${index}_accountNumber`] = "Account number is required when adding bank details";
          }
          if (!account.ifsc || !account.ifsc.trim()) {
            newErrors[`bankAccount_${index}_ifsc`] = "IFSC code is required when adding bank details";
          }
          if (!account.branch || !account.branch.trim()) {
            newErrors[`bankAccount_${index}_branch`] = "Branch name is required when adding bank details";
          }
        }
      });
    }

    // Contact Person Validation - Date of Birth is optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    const success = validateForm();
    if (success) {
      // If shipping address is same as billing, copy billing to shipping
      const finalFormData = { ...formData };
      if (finalFormData.shippingAddressSameAsBilling) {
        if (Array.isArray(finalFormData.billingAddresses) && finalFormData.billingAddresses.length > 0) {
          finalFormData.shippingAddresses = [...finalFormData.billingAddresses.map(addr => ({ ...addr }))];
          finalFormData.selectedShippingAddressIndex = finalFormData.selectedBillingAddressIndex;
        }
      }

      const dataToSave = {
        ...finalFormData,
        mobileNumber: (finalFormData.mobileNumberCode || "") + (finalFormData.mobileNumber || ""),
        contactPerson: {
          ...finalFormData.contactPerson,
          phone: (finalFormData.contactPersonCode || "") + (finalFormData.contactPerson?.phone || ""),
        },
        openingBalance: finalFormData.openingBalance ? convertToINR(finalFormData.openingBalance, currency) : 0,
        creditLimit: finalFormData.creditLimit ? convertToINR(finalFormData.creditLimit, currency) : 0,
        logoFile: logoFile,
      };
      onSave?.(dataToSave);
    } else {
      // Re-calculate errors for toast logic because setErrors is async
      const currentErrors = {};
      if (!formData.partyName || !formData.partyName.trim()) currentErrors.partyName = true;
      if (!formData.mobileNumber || !formData.mobileNumber.trim()) currentErrors.mobileNumber = true;

      const hasBankErrors = Object.keys(errors).some(key => key.startsWith('bankAccount_'));

      if (hasBankErrors) {
        showErrorToast({
          title: "Incomplete Bank Details",
          text: "Please fill in all required bank account fields (Bank Name, Branch, Account Number, and IFSC Code)",
          timer: 4000
        });
      } else {
        // Construct a more professional error message based on missing fields
        let errorMsg = "Please fill in all required fields to continue.";
        if (!formData.partyName.trim() && !formData.mobileNumber.trim()) {
          errorMsg = "Party Name and Mobile Number are required.";
        } else if (!formData.partyName.trim()) {
          errorMsg = "Please enter the Party Name.";
        } else if (!formData.mobileNumber.trim()) {
          errorMsg = "Please enter the Mobile Number.";
        }

        showErrorToast({
          title: "Required Fields Missing",
          text: errorMsg,
          timer: 3000
        });
      }

      // Scroll to first error
      const firstErrorElement = document.querySelector('.border-red-500, .border-yellow-500, .border-red-300');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for contact person phone
    if (name === "contactPerson.phone") {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({
          ...prev,
          contactPerson: { ...prev.contactPerson, phone: value }
        }));
      }
      return;
    }

    // Special handling for mobile number
    if (name === "mobileNumber") {
      if (/^\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }

      // Real-time validation
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return;
    }

    // Special handling for GSTIN/VAT - convert to uppercase and limit to 20 chars
    if (name === "gstin" || name === "vat") {
      const cleanValue = value.toUpperCase().slice(0, 20);
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));

      // Real-time validation
      const error = validateField(name, cleanValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return;
    }

    // Special handling for PAN - convert to uppercase and limit based on tax type
    if (name === "panNumber") {
      const maxLen = formData.registrationType === "VAT" ? 999 : 10;
      const cleanValue = value.toUpperCase().slice(0, maxLen);
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));

      // Real-time validation
      const error = validateField(name, cleanValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return;
    }

    // Handle nested fields
    if (name.includes(".")) {
      const parts = name.split(".");
      setFormData((prev) => {
        const next = { ...prev };
        let cur = next;
        for (let i = 0; i < parts.length - 1; i++) {
          cur[parts[i]] = { ...(cur[parts[i]] || {}) };
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
        return next;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Real-time validation for the field
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      // Clear error if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (e, addressType, field) => {
    // If it's the legacy singular field name but we are using arrays
    const isPluralType = addressType.endsWith('es');
    const targetKey = isPluralType ? addressType : `${addressType}es`;

    setFormData((prev) => {
      if (isPluralType || Array.isArray(prev[targetKey])) {
        // If it's an array, update the selected index
        const index = addressType.startsWith('bill') ? prev.selectedBillingAddressIndex : prev.selectedShippingAddressIndex;
        if (index === -1) return prev; // No selection

        const newAddresses = [...(prev[targetKey] || [])];
        newAddresses[index] = {
          ...(newAddresses[index] || defaultAddress),
          [field]: e.target.value,
        };
        return { ...prev, [targetKey]: newAddresses };
      }

      // Fallback for singular object if still used anywhere
      return {
        ...prev,
        [addressType]: {
          ...((prev && prev[addressType]) || defaultAddress),
          [field]: e.target.value,
        },
      };
    });
  };

  const handleGstinFetch = async () => {
    if (!formData.gstin) return;
    setGstinLoading(true);

    try {
      // Determine country ISO
      let country_iso = 'IN';
      if (/^[a-zA-Z]{2}/.test(formData.gstin)) {
        country_iso = formData.gstin.substring(0, 2).toUpperCase();
      } else if (formData.gstin.length === 15) {
        country_iso = 'IN';
      }

      const { taxAPI } = await import("../../../utils/api.js");
      const response = await taxAPI.validate(country_iso, formData.gstin);

      if (response.success && response.taxId) {
        const fetchedData = response;

        const updatedAddress = {
          line1: fetchedData.address || '',
          city: fetchedData.city || '',
          state: fetchedData.state || '',
          pincode: fetchedData.pincode || '',
          country: fetchedData.country || 'India',
        };

        setFormData((prev) => {
          const currentBilling = Array.isArray(prev.billingAddresses) ? prev.billingAddresses : [];

          // Check if this address already exists to avoid duplicates
          const exists = currentBilling.some(a =>
            a.line1 === updatedAddress.line1 &&
            a.pincode === updatedAddress.pincode
          );

          const newBilling = exists ? currentBilling : [...currentBilling, updatedAddress];
          const newIndex = exists
            ? currentBilling.findIndex(a => a.line1 === updatedAddress.line1 && a.pincode === updatedAddress.pincode)
            : newBilling.length - 1;

          return {
            ...prev,
            partyName: fetchedData.companyName || prev.partyName,
            tradeName: fetchedData.tradeName || prev.tradeName,
            billingAddresses: newBilling,
            selectedBillingAddressIndex: newIndex,
            shippingAddresses: prev.shippingAddressSameAsBilling
              ? (exists ? prev.shippingAddresses : [...(prev.shippingAddresses || []), updatedAddress])
              : prev.shippingAddresses,
            selectedShippingAddressIndex: prev.shippingAddressSameAsBilling
              ? (exists ? prev.selectedShippingAddressIndex : (prev.shippingAddresses || []).length)
              : prev.selectedShippingAddressIndex,
            panNumber: fetchedData.panNumber || prev.panNumber,
          };
        });

        // Set autofetch flag
        setIsGstinAutofetched(true);

        showToast({
          title: "Auto populated",
          text: `Party details auto-populated for ${country_iso} Tax ID!`,
          icon: "success",
          timer: 3000,
        });
      } else {
        showToast({
          title: "Error",
          text: response.message || "Failed to fetch Tax ID data",
          icon: "error",
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching Tax ID data:", error);
      showToast({
        title: "Error",
        text: error.message || "Unable to fetch tax details automatically. Please enter the details manually.",
        icon: "error",
        timer: 3000,
      });
    } finally {
      setGstinLoading(false);
    }
  };

  const addBankAccount = () => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: [
        ...((prev && prev.bankAccounts) || []),
        {
          accountNumber: "",
          ifsc: "",
          bankName: "",
          branch: "",
          accountHolder: "",
        },
      ],
    }));
  };

  const updateBankAccount = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map((account, i) =>
        i === index ? { ...account, [field]: value } : account
      ),
    }));
  };

  const removeBankAccount = (index) => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter((_, i) => i !== index),
    }));
  };

  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [
        ...((prev && prev.customFields) || []),
        { label: "", value: "" },
      ],
    }));
  };

  const updateCustomField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((cf, i) =>
        i === index ? { ...cf, [field]: value } : cf
      ),
    }));
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, i) => i !== index),
    }));
  };

  const toggleDropdown = (key) => {
    setDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectDropdownOption = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setDropdowns((prev) => ({ ...prev, [key]: false }));
  };

  return (
    <div className="party-form-root">
      <div className="mt-4 min-h-screen w-full">
        <div className="bg-white border-1 border-yellow-200 text-yellow-900 rounded-lg mb-4 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={onCancel}
                className="p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-yellow-900" />
              </button>
              <h3 className="text-lg md:text-xl font-bold truncate">
                <span>{initialData ? "Update Party" : "Create Party"}</span>
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onCancel}
                style={{ padding: "6px 12px" }}
                className="bg-red-600 text-white rounded-[7px] text-sm md:text-base font-medium hover:bg-red-700 transition-colors md:h-8 md:py-1 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{ padding: "6px 12px" }}
                className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] text-white rounded-[7px] text-sm md:text-base font-medium disabled:bg-gray-400 disabled:text-gray-200 hover:from-[#0d6b35]/90 hover:to-[#7a8f3d]/90 transition-all duration-200 md:h-8 md:py-1 flex items-center justify-center"
              >
                <span>{isEdit ? "Update" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-full bg-white rounded-lg border-1 border-yellow-200">
          <div className="p-4 md:p-6 space-y-8 overflow-y-auto">
            {/* General */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-yellow-900">
                General Details
              </h4>

              {/* Logo Upload Section */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-center">
                  <label
                    htmlFor="party-logo-upload"
                    className="w-24 h-24 border-2 border-dashed border-[#129046] rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden transition-colors group cursor-pointer hover:bg-green-50"
                  >
                    {logoPreview ? (
                      <>
                        <img
                          src={logoPreview}
                          alt="Party Logo"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        {/* Hover overlay for upload option */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                          <div className="text-center text-white">
                            <Upload className="w-6 h-6 mx-auto mb-1" />
                            <div className="text-xs font-medium">Change Logo</div>
                          </div>
                        </div>
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (logoPreview && logoPreview.startsWith("blob:")) {
                              URL.revokeObjectURL(logoPreview);
                            }
                            setLogoFile(null);
                            setLogoPreview(null);
                            showToast(
                              "Logo removed. Click Save to apply changes."
                            );
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Remove logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center pointer-events-none">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">Upload Logo</div>
                      </div>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate file type
                        const validTypes = [
                          "image/jpeg",
                          "image/jpg",
                          "image/png",
                          "image/gif",
                          "image/webp",
                        ];
                        if (!validTypes.includes(file.type)) {
                          showToast(
                            "Please upload a valid image file (JPG, PNG, GIF, WEBP)",
                            "error"
                          );
                          return;
                        }

                        // Validate file size (max 5MB)
                        const maxSize = 5 * 1024 * 1024;
                        if (file.size > maxSize) {
                          showToast(
                            "Image size should be less than 5MB",
                            "error"
                          );
                          return;
                        }

                        // Clean up previous preview URL
                        if (logoPreview && logoPreview.startsWith("blob:")) {
                          URL.revokeObjectURL(logoPreview);
                        }

                        // Create preview URL
                        const previewUrl = URL.createObjectURL(file);
                        setLogoFile(file);
                        setLogoPreview(previewUrl);
                        showToast(
                          "Logo uploaded successfully! Click Save to apply changes."
                        );
                      }
                    }}
                    className="hidden"
                    id="party-logo-upload"
                  />
                </div>

                <div className="text-center mt-2">
                  <label
                    htmlFor="party-logo-upload"
                    className="text-sm text-[#129046] hover:text-[#129046]/80 cursor-pointer font-medium"
                  >
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG/JPG, max 5 MB</p>
                </div>
              </div>
              <div className="space-y-6">
                {/* Top Section: 2 Columns for first 2 rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Row 1 Column 1: GST/VAT Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 flex-nowrap h-[42px]">
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        Are You GST or VAT Register?
                      </label>
                      <div className="flex items-center gap-3 flex-nowrap">
                        <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                          <input
                            type="radio"
                            name="registrationType"
                            value="GSTIN"
                            checked={formData.registrationType === "GSTIN"}
                            onChange={() => {
                              setFormData(prev => ({ ...prev, registrationType: "GSTIN" }));
                              clearTaxErrors();
                            }}
                            className="w-4 h-4 accent-[#129046] text-[#129046] border-gray-300 focus:ring-[#129046] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#129046] transition-colors">GSTIN</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                          <input
                            type="radio"
                            name="registrationType"
                            value="VAT"
                            checked={formData.registrationType === "VAT"}
                            onChange={() => {
                              setFormData(prev => ({ ...prev, registrationType: "VAT" }));
                              clearTaxErrors();
                            }}
                            className="w-4 h-4 accent-[#129046] text-[#129046] border-gray-300 focus:ring-[#129046] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#129046] transition-colors">VAT/PAN</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                          <input
                            type="radio"
                            name="registrationType"
                            value="NO_TAX"
                            checked={formData.registrationType === "NO_TAX"}
                            onChange={() => {
                              setFormData(prev => ({ ...prev, registrationType: "NO_TAX", gstin: "", vat: "" }));
                              clearTaxErrors();
                            }}
                            className="w-4 h-4 accent-[#129046] text-[#129046] border-gray-300 focus:ring-[#129046] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-[#129046] transition-colors">No Tax</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Row 1 Column 2: GST/VAT Input */}
                  <div className="space-y-2">
                    {(formData.registrationType && formData.registrationType !== "NO_TAX") ? (
                      <div className="space-y-2 opacity-100 transition-opacity duration-300">
                        <label className="block text-sm font-semibold text-gray-700">
                          <span>{formData.registrationType === "VAT" ? "VAT/PAN Number" : "GSTIN"}</span>
                        </label>
                        <div className="relative">
                          <input
                            name={formData.registrationType === "VAT" ? "vat" : "gstin"}
                            type="text"
                            value={formData.registrationType === "VAT" ? formData.vat : formData.gstin}
                            onChange={handleInputChange}
                            placeholder={formData.registrationType === "GSTIN" ? "Enter GSTIN" : "Enter VAT/PAN"}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${formData.registrationType === "GSTIN" ? "pr-32" : ""} ${(formData.registrationType === "VAT" ? errors.vat : errors.gstin) ? "border-red-300" : ""
                              }`}
                          />
                          {formData.registrationType === "GSTIN" && (
                            <button
                              type="button"
                              onClick={handleGstinFetch}
                              disabled={gstinLoading || !formData.gstin}
                              className="absolute right-0 top-0 bottom-0 px-3 bg-gradient-to-r from-[#129046] to-[#1fbe5a] text-white text-sm font-bold rounded-r-lg rounded-l-none hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 border-l border-gray-300"
                              title="Get Details"
                            >
                              {gstinLoading ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Search size={16} />
                                  <span className="hidden sm:inline">Get Details</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {errors.gstin && formData.registrationType === "GSTIN" && (
                          <p className="mt-1 text-sm text-red-600 font-medium"><span>{errors.gstin}</span></p>
                        )}
                        {errors.vat && formData.registrationType === "VAT" && (
                          <p className="mt-1 text-sm text-red-600 font-medium"><span>{errors.vat}</span></p>
                        )}
                      </div>
                    ) : (
                      <div className="h-full hidden md:block"></div>
                    )}
                  </div>

                  {/* Row 2 Column 1: Party Name */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Party Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={inputRef}
                      name="partyName"
                      value={formData.partyName || ""}
                      onChange={handleInputChange}
                      placeholder="Enter party name"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors.partyName ? "border-red-300" : ""
                        }`}
                      autoComplete="off"
                    />
                    {errors.partyName && (
                      <p className="mt-1 text-sm text-red-600">
                        <span>{errors.partyName}</span>
                      </p>
                    )}
                  </div>

                  {/* Row 2 Column 2: Trade Name */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Trade Name
                    </label>
                    <input
                      name="tradeName"
                      value={formData.tradeName || ""}
                      onChange={handleInputChange}
                      placeholder="Enter trade name"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors.tradeName ? "border-red-300" : ""
                        }`}
                      autoComplete="off"
                    />
                    {errors.tradeName && (
                      <p className="mt-1 text-sm text-red-600">
                        <span>{errors.tradeName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section: 3 Columns for rest of the fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {/* Column 4: Remark */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Additonal Information
                    </label>
                    <input
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                      placeholder="Enter remark"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="relative w-24 custom-dropdown" data-dropdown="phoneCode">
                        <input
                          ref={phoneCodeInputRef}
                          type="text"
                          autoComplete="off"
                          value={showPhoneCodeDropdown ? phoneCodeSearchTerm : (formData.mobileNumberCode || "")}
                          onChange={(e) => {
                            setPhoneCodeSearchTerm(e.target.value);
                            if (!showPhoneCodeDropdown) setShowPhoneCodeDropdown(true);
                            setPhoneCodeHighlightedIndex(0);
                          }}
                          onFocus={() => setShowPhoneCodeDropdown(true)}
                          onKeyDown={handlePhoneCodeKeyDown}
                          placeholder="+91"
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:outline-none transition-colors ${errors.mobileNumber ? "border-red-300" : "border-gray-300"}`}
                        />
                        {showPhoneCodeDropdown && (
                          <div ref={phoneCodeOptionsListRef} className="absolute z-[110] w-64 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                            {filteredCountryCodes.length > 0 ? (
                              filteredCountryCodes.map((c, index) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => selectPhoneCodeOption(c.dial_code)}
                                  onMouseEnter={() => setPhoneCodeHighlightedIndex(index)}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${phoneCodeHighlightedIndex === index
                                    ? "bg-[#129046] text-white"
                                    : formData.mobileNumberCode === c.dial_code
                                      ? "bg-[#129046]/20 text-gray-800"
                                      : "hover:bg-gray-50"
                                    }`}
                                >
                                  <span className="font-bold">{c.dial_code}</span> ({c.name})
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No results</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          name="mobileNumber"
                          value={formData.mobileNumber || ""}
                          onChange={handleInputChange}
                          placeholder="Enter mobile number"
                          className={`w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors.mobileNumber
                            ? "border-red-300 focus:border-red-300 focus:ring-red-400"
                            : ""
                            }`}
                        />
                      </div>
                    </div>
                    {errors.mobileNumber && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.mobileNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        name="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                        className={`w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors.email
                          ? "border-red-300 focus:border-red-300 focus:ring-red-400"
                          : ""
                          }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Opening Balance
                    </label>

                    <div className="space-y-1">
                      <div className="flex items-center  ">
                        {/* Amount Input */}
                        <div className="relative w-1/2">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-sm font-medium">{getCurrencySymbol(currency)}</span>
                          </div>
                          <input
                            name="openingBalance"
                            type="number"
                            step="0.01"
                            value={formData.openingBalance}
                            onChange={handleInputChange}
                            onWheel={(e) => e.target.blur()}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-300 h-10 rounded-l-xl focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>

                        {/* Dropdown using custom dropdown */}
                        <div className="w-1/2">
                          <div
                            className="relative custom-dropdown"
                            data-dropdown="balanceType"
                          >
                            <button
                              type="button"
                              onClick={() => toggleDropdown("balanceType")}
                              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-r-xl focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white flex items-center justify-between text-sm"
                            >
                              <span
                                className={
                                  formData.balanceType
                                    ? "text-gray-800"
                                    : "text-gray-400"
                                }
                              >
                                {BALANCE_TYPE_OPTIONS.find(
                                  (type) => type.id === formData.balanceType
                                )?.label || "Select Type"}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform ${dropdowns.balanceType ? "rotate-180" : ""
                                  }`}
                              />
                            </button>

                            {dropdowns.balanceType && (
                              <div className="absolute z-50 w-full mt-1 bg-white border-1 border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {BALANCE_TYPE_OPTIONS.map((type) => (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() =>
                                      selectDropdownOption("balanceType", type.id)
                                    }
                                    className={`w-full px-4 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${formData.balanceType === type.id
                                      ? "bg-[#129046] text-white hover:bg-[#129046]/90"
                                      : "hover:bg-[#129046]/10"
                                      }`}
                                  >
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      PAN Number
                    </label>
                    <input
                      name="panNumber"
                      value={formData.panNumber || ""}
                      onChange={handleInputChange}
                      placeholder="Enter PAN number"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors.panNumber ? "border-red-300" : ""
                        }`}
                      maxLength={formData.registrationType === "VAT" ? "999" : "10"}
                    />
                    {errors.panNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.panNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Party Type <span className="text-red-500">*</span>
                    </label>
                    {formData.partyType === "other" ? (
                      <div className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Other = </span>
                          <input
                            type="text"
                            name="otherPartyType"
                            value={formData.otherPartyType || ""}
                            onChange={handleInputChange}
                            className={`w-full pl-16 pr-10 py-2 bg-white border rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 transition-all outline-none ${errors.otherPartyType ? "border-red-300" : "border-gray-300"}`}
                            placeholder="Specify type..."
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, partyType: "customer", otherPartyType: "" }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Switch to dropdown"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="relative custom-dropdown"
                        data-dropdown="partyType"
                      >
                        <button
                          type="button"
                          onClick={() => toggleDropdown("partyType")}
                          className={`w-full h-10 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white flex items-center justify-between ${errors.partyType ? "border-red-300" : ""}`}
                        >
                          <span
                            className={
                              formData.partyType ? "text-gray-800" : "text-gray-400"
                            }
                          >
                            {PARTY_TYPE_OPTIONS.find(
                              (type) => type.id === formData.partyType
                            )?.label || "Select Party Type"}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${dropdowns.partyType ? "rotate-180" : ""
                              }`}
                          />
                        </button>

                        {dropdowns.partyType && (
                          <div className="absolute z-50 w-full mt-1 bg-white border-1 border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {PARTY_TYPE_OPTIONS.map((type) => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() =>
                                  selectDropdownOption("partyType", type.id)
                                }
                                className={`w-full px-4 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${formData.partyType === type.id
                                  ? "bg-[#129046] text-white hover:bg-[#129046]/90"
                                  : "hover:bg-[#129046]/10"
                                  }`}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {errors.partyType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.partyType}
                      </p>
                    )}
                    {errors.otherPartyType && formData.partyType === "other" && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.otherPartyType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Party Category
                    </label>
                    <CategorySelectInputForm
                      categories={categories}
                      value={formData.category_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, category_id: val }))}
                      onCreate={() => setShowCreateModal(true)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="w-4 h-4" /> Address
                </h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Billing Address
                    </label>
                  </div>
                  <textarea
                    value={(() => {
                      const selected = formData.billingAddresses[formData.selectedBillingAddressIndex];
                      return selected ? `${selected.line1 || ""}${selected.city ? `, ${selected.city}` : ""}${selected.state ? `, ${selected.state}` : ""}${selected.pincode ? ` - ${selected.pincode}` : ""}${selected.country ? `, ${selected.country}` : ""}` : "";
                    })()}
                    onClick={() => {
                      setShowBillingAddressesModal(true);
                    }}
                    readOnly
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm resize-none cursor-pointer focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                    placeholder="Click to select billing address"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Shipping Address
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.shippingAddressSameAsBilling}
                        disabled={!formData.billingAddresses[formData.selectedBillingAddressIndex]?.line1}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => {
                            let newAddresses = prev.shippingAddresses;
                            let newIndex = prev.selectedShippingAddressIndex;
                            if (checked) {
                              // When checked, copy billing address to shipping
                              newAddresses = [{ ...prev.billingAddresses[prev.selectedBillingAddressIndex] }];
                              newIndex = 0;
                            } else {
                              // When unchecked, keep existing shipping addresses
                              // Only keep the billing address if it exists in shipping addresses
                              if (
                                newAddresses.length === 1 &&
                                JSON.stringify(newAddresses[0]) ===
                                JSON.stringify(prev.billingAddresses[prev.selectedBillingAddressIndex])
                              ) {
                                // If only billing address exists, keep it as is
                                // Don't add a blank address
                                newIndex = 0;
                              }
                            }
                            return {
                              ...prev,
                              shippingAddressSameAsBilling: checked,
                              shippingAddresses: newAddresses,
                              selectedShippingAddressIndex: newIndex,
                            };
                          });
                        }}
                      />
                      <label className="text-sm text-gray-700">
                        Same As Billing Address
                      </label>
                    </div>
                  </div>
                  {(() => {
                    const selectedShipping =
                      formData.shippingAddresses[
                      formData.selectedShippingAddressIndex
                      ] || formData.shippingAddresses[0];
                    return (
                      <>
                        <textarea
                          value={
                            formData.shippingAddressSameAsBilling
                              ? `${formData.billingAddresses[formData.selectedBillingAddressIndex]?.line1 || ""}${formData.billingAddresses[formData.selectedBillingAddressIndex]?.city
                                ? `, ${formData.billingAddresses[formData.selectedBillingAddressIndex].city}`
                                : ""
                              }${formData.billingAddresses[formData.selectedBillingAddressIndex]?.state
                                ? `, ${formData.billingAddresses[formData.selectedBillingAddressIndex].state}`
                                : ""
                              }${formData.billingAddresses[formData.selectedBillingAddressIndex]?.pincode
                                ? `, ${formData.billingAddresses[formData.selectedBillingAddressIndex].pincode}`
                                : ""
                              }${formData.billingAddresses[formData.selectedBillingAddressIndex]?.country
                                ? `, ${formData.billingAddresses[formData.selectedBillingAddressIndex].country}`
                                : ""
                              }`
                              : `${selectedShipping?.line1 || ""}${selectedShipping?.city
                                ? `, ${selectedShipping.city}`
                                : ""
                              }${selectedShipping?.state
                                ? `, ${selectedShipping.state}`
                                : ""
                              }${selectedShipping?.pincode
                                ? `, ${selectedShipping.pincode}`
                                : ""
                              }${selectedShipping?.country
                                ? `, ${selectedShipping.country}`
                                : ""
                              }`
                          }
                          onClick={() => {
                            if (!formData.shippingAddressSameAsBilling) {
                              setShowShippingAddressesModal(true);
                            }
                          }}
                          readOnly
                          disabled={formData.shippingAddressSameAsBilling}
                          rows={2}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm resize-none transition-colors ${formData.shippingAddressSameAsBilling
                            ? "bg-gray-100 cursor-not-allowed text-gray-600"
                            : "cursor-pointer hover:border-blue-500 focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none"
                            }`}
                          placeholder={
                            formData.shippingAddressSameAsBilling
                              ? ""
                              : "Click to edit shipping address"
                          }
                        />

                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Credit Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#f3c117]" /> Credit Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Credit Period
                  </label>
                  <div className="relative">
                    <input
                      name="creditPeriod"
                      type="number"
                      value={formData.creditPeriod}
                      onChange={handleInputChange}
                      onWheel={(e) => e.target.blur()}
                      placeholder="0"
                      min="0"
                      max="365"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${errors.creditPeriod ? "border-red-300" : ""
                        }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">Days</span>
                    </div>
                  </div>
                  {/* {errors.creditPeriod && (
                    <p className="mt-1 text-sm text-red-600">{errors.creditPeriod}</p>
                  )} */}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Credit Limit
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm font-medium">{getCurrencySymbol(currency)}</span>
                    </div>
                    <input
                      name="creditLimit"
                      type="number"
                      value={formData.creditLimit}
                      onChange={handleInputChange}
                      onWheel={(e) => e.target.blur()}
                      placeholder="0.00"
                      min="0"
                      className={`w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${errors.creditLimit ? "border-red-300" : ""
                        }`}
                    />
                  </div>
                  {errors.creditLimit && (
                    <p className="mt-1 text-sm text-red-600">{errors.creditLimit}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#1fbe5a]" /> Contact Person Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Person Name
                  </label>
                  <input
                    name="contactPerson.name"
                    value={formData.contactPerson?.name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactPerson: {
                          ...((prev && prev.contactPerson) || {
                            name: "",
                            dateOfBirth: "",
                          }),
                          name: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <div className="flex items-start gap-2">
                    <div className="relative w-24 custom-dropdown" data-dropdown="contactCode">
                      <input
                        ref={contactCodeInputRef}
                        type="text"
                        autoComplete="off"
                        value={showContactCodeDropdown ? contactCodeSearchTerm : (formData.contactPersonCode || "")}
                        onChange={(e) => {
                          setContactCodeSearchTerm(e.target.value);
                          if (!showContactCodeDropdown) setShowContactCodeDropdown(true);
                          setContactCodeHighlightedIndex(0);
                        }}
                        onFocus={() => setShowContactCodeDropdown(true)}
                        onKeyDown={handleContactCodeKeyDown}
                        placeholder="+91"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:outline-none transition-colors border-gray-300`}
                      />
                      {showContactCodeDropdown && (
                        <div ref={contactCodeOptionsListRef} className="absolute z-[110] w-64 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                          {filteredContactCodes.length > 0 ? (
                            filteredContactCodes.map((c, index) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => selectContactCodeOption(c.dial_code)}
                                onMouseEnter={() => setContactCodeHighlightedIndex(index)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${contactCodeHighlightedIndex === index
                                  ? "bg-[#129046] text-white"
                                  : formData.contactPersonCode === c.dial_code
                                    ? "bg-[#129046]/20 text-gray-800"
                                    : "hover:bg-gray-50"
                                  }`}
                              >
                                <span className="font-bold">{c.dial_code}</span> ({c.name})
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">No results</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        name="contactPerson.phone"
                        type="text"
                        inputMode="numeric"
                        value={formData.contactPerson?.phone || ""}
                        onChange={handleInputChange}
                        placeholder="Enter contact number"
                        className={`w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors border-gray-200`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                <h4 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 md:w-5 md:h-5 text-[#f3c117]" /> Party Bank
                  Account
                </h4>
                {/* Show button on top only when no accounts exist */}
                {(!formData.bankAccounts || formData.bankAccounts.length === 0) && (
                  <button
                    onClick={addBankAccount}
                    className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#1fbe5a]/10 text-[#1fbe5a] rounded-lg text-sm md:text-base self-start md:self-auto hover:bg-[#1fbe5a]/20 transition-colors"
                  >
                    <PlusCircle className="w-3 h-3 md:w-4 md:h-4" /> Add Bank Account
                  </button>
                )}
              </div>

              {formData.bankAccounts && formData.bankAccounts.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                  <p className="text-xs md:text-sm text-blue-800">
                    <strong>Note:</strong> When adding bank details, all fields marked with <span className="text-red-500">*</span> are required to ensure complete information.
                  </p>
                </div>
              )}

              {(formData.bankAccounts || []).map((account, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-semibold text-gray-900">
                      Bank Account {index + 1}
                    </h5>
                    <button
                      onClick={() => removeBankAccount(index)}
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={account.bankName || ""}
                        onChange={(e) =>
                          updateBankAccount(index, "bankName", e.target.value)
                        }
                        placeholder="Enter bank name"
                        className={`w-full px-3 py-2 border-1 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors[`bankAccount_${index}_bankName`] ? 'border-red-500' : 'border-gray-200'
                          }`}
                      />
                      {errors[`bankAccount_${index}_bankName`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`bankAccount_${index}_bankName`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={account.branch || ""}
                        onChange={(e) =>
                          updateBankAccount(index, "branch", e.target.value)
                        }
                        placeholder="Enter branch"
                        className={`w-full px-3 py-2 border-1 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors[`bankAccount_${index}_branch`] ? 'border-red-500' : 'border-gray-200'
                          }`}
                      />
                      {errors[`bankAccount_${index}_branch`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`bankAccount_${index}_branch`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Holder
                      </label>
                      <input
                        value={account.accountHolder || ""}
                        onChange={(e) =>
                          updateBankAccount(
                            index,
                            "accountHolder",
                            e.target.value
                          )
                        }
                        placeholder="Enter account holder name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={account.accountNumber || ""}
                        onChange={(e) =>
                          updateBankAccount(
                            index,
                            "accountNumber",
                            e.target.value
                          )
                        }
                        placeholder="Enter account number"
                        className={`w-full px-3 py-2 border-1 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors[`bankAccount_${index}_accountNumber`] ? 'border-red-500' : 'border-gray-200'
                          }`}
                      />
                      {errors[`bankAccount_${index}_accountNumber`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`bankAccount_${index}_accountNumber`]}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IFSC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={account.ifsc || ""}
                        onChange={(e) =>
                          updateBankAccount(index, "ifsc", e.target.value)
                        }
                        placeholder="Enter IFSC code"
                        className={`w-full px-3 py-2 border-1 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors ${errors[`bankAccount_${index}_ifsc`] ? 'border-red-500' : 'border-gray-200'
                          }`}
                        maxLength="11"
                      />
                      {errors[`bankAccount_${index}_ifsc`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`bankAccount_${index}_ifsc`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Show button at bottom when accounts exist */}
              {formData.bankAccounts && formData.bankAccounts.length > 0 && (
                <button
                  onClick={addBankAccount}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#1fbe5a]/10 text-[#1fbe5a] rounded-lg text-sm md:text-base hover:bg-[#1fbe5a]/20 transition-colors w-full md:w-auto justify-center"
                >
                  <PlusCircle className="w-3 h-3 md:w-4 md:h-4" /> Add Another Bank Account
                </button>
              )}
            </div>

            {/* Custom fields section - currently empty */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* Future: Add custom field button here if needed */}
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="p-4 md:p-6 border-t border-yellow-200 bg-gray-50 flex items-center justify-end gap-3 rounded-b-lg mt-auto">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={gstinLoading}
              className="px-6 py-2 bg-[#1fbe5a] hover:bg-[#199d4a] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[100px]"
            >
              {gstinLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEdit ? (
                "Update"
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        <CreateCategoryModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name) => {
            const newCategory = await onCreateCategory(name);
            if (newCategory && newCategory.id) {
              setFormData(prev => ({ ...prev, category_id: newCategory.id }));
            }
            setShowCreateModal(false);
          }}
        />

        <BillingAddressModal
          open={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          billingAddress={editingBillingIndex !== null ? formData.billingAddresses[editingBillingIndex] : { line1: "", city: "", state: "", pincode: "" }}
          onSave={(data) => {
            if (editingBillingIndex !== null) {
              setFormData((prev) => {
                const newBillingAddresses = [...prev.billingAddresses];
                newBillingAddresses[editingBillingIndex] = {
                  ...newBillingAddresses[editingBillingIndex],
                  ...data,
                };

                // Sync to shipping ONLY if flag is active and we are editing the currently selected billing address
                const shouldSync = prev.shippingAddressSameAsBilling && (editingBillingIndex === prev.selectedBillingAddressIndex);

                return {
                  ...prev,
                  billingAddresses: newBillingAddresses,
                  shippingAddresses: shouldSync
                    ? [...newBillingAddresses]
                    : prev.shippingAddresses,
                  selectedShippingAddressIndex: shouldSync ? editingBillingIndex : prev.selectedShippingAddressIndex
                };
              });
            } else {
              setFormData((prev) => {
                const newBillingAddresses = [...prev.billingAddresses, { ...defaultAddress, ...data }];
                const newIndex = newBillingAddresses.length - 1;
                const shouldSync = prev.shippingAddressSameAsBilling;

                return {
                  ...prev,
                  billingAddresses: newBillingAddresses,
                  selectedBillingAddressIndex: newIndex,
                  shippingAddresses: shouldSync
                    ? [...newBillingAddresses]
                    : prev.shippingAddresses,
                  selectedShippingAddressIndex: shouldSync
                    ? newIndex
                    : prev.selectedShippingAddressIndex,
                };
              });
              // Update allSavedAddresses with the new address
              setAllSavedAddresses((prev) => ({
                ...prev,
                billing: [...prev.billing, { ...data, address_type: 'billing' }]
              }));
            }
            setEditingBillingIndex(null);
          }}
        />

        <ShippingAddressModal
          open={showShippingAddressModal}
          onClose={() => setShowShippingAddressModal(false)}
          address={
            editingShippingIndex !== null
              ? formData.shippingAddresses[editingShippingIndex]
              : { line1: "", city: "", state: "", pincode: "" }
          }
          onSave={(data) => {
            if (editingShippingIndex !== null) {
              setFormData((prev) => {
                const newAddresses = [...prev.shippingAddresses];
                newAddresses[editingShippingIndex] = {
                  ...newAddresses[editingShippingIndex],
                  ...data,
                };
                return { ...prev, shippingAddresses: newAddresses };
              });
            } else {
              setFormData((prev) => ({
                ...prev,
                shippingAddresses: [
                  ...prev.shippingAddresses,
                  { ...defaultAddress, ...data },
                ],
                selectedShippingAddressIndex: prev.shippingAddresses.length,
              }));
              // Update allSavedAddresses with the new address
              setAllSavedAddresses((prev) => ({
                ...prev,
                shipping: [...prev.shipping, { ...data, address_type: 'shipping' }]
              }));
            }
            setEditingShippingIndex(null);
          }}
        />

        <ShippingAddressesModal
          open={showShippingAddressesModal}
          onClose={() => setShowShippingAddressesModal(false)}
          addresses={formData.shippingAddresses}
          allSavedAddresses={allSavedAddresses.shipping}
          selectedIndex={formData.selectedShippingAddressIndex}
          onSelect={(addr) => {
            // Find if this address already exists in the form
            const existingIndex = formData.shippingAddresses.findIndex(
              (a) => a.line1 === addr.line1 && a.city === addr.city && a.state === addr.state && a.pincode === addr.pincode
            );

            if (existingIndex >= 0) {
              // Address already in form, just select it
              setFormData((prev) => ({
                ...prev,
                selectedShippingAddressIndex: existingIndex,
              }));
            } else {
              // New address from database, add it to form
              setFormData((prev) => ({
                ...prev,
                shippingAddresses: [...prev.shippingAddresses, addr],
                selectedShippingAddressIndex: prev.shippingAddresses.length,
              }));
            }
          }}
          onEdit={(addr) => {
            let idx = formData.shippingAddresses.findIndex(
              (a) =>
                a &&
                a.line1 === addr.line1 &&
                a.city === addr.city &&
                a.state === addr.state &&
                a.pincode === addr.pincode
            );

            if (idx === -1) {
              // Address not in form, add it first so it can be edited
              idx = formData.shippingAddresses.length;
              setFormData((prev) => ({
                ...prev,
                shippingAddresses: [...prev.shippingAddresses, addr],
                selectedShippingAddressIndex: idx
              }));
            }

            setEditingShippingIndex(idx);
            setShowShippingAddressModal(true);
            setShowShippingAddressesModal(false);
          }}
          onAdd={() => {
            setEditingShippingIndex(null);
            setShowShippingAddressModal(true);
            setShowShippingAddressesModal(false);
          }}
        />

        <BillingAddressesModal
          open={showBillingAddressesModal}
          onClose={() => setShowBillingAddressesModal(false)}
          addresses={formData.billingAddresses}
          selectedIndex={formData.selectedBillingAddressIndex}
          allSavedAddresses={allSavedAddresses.billing}
          onSelect={(addr) => {
            // Find if this address already exists in the form
            const existingIndex = formData.billingAddresses.findIndex(
              (a) => a.line1 === addr.line1 && a.city === addr.city && a.state === addr.state && a.pincode === addr.pincode
            );

            if (existingIndex >= 0) {
              // Address already in form, just select it
              setFormData((prev) => ({
                ...prev,
                selectedBillingAddressIndex: existingIndex,
                shippingAddresses: prev.shippingAddressSameAsBilling
                  ? [...prev.billingAddresses]
                  : prev.shippingAddresses,
                selectedShippingAddressIndex: prev.shippingAddressSameAsBilling
                  ? existingIndex
                  : prev.selectedShippingAddressIndex,
              }));
            } else {
              // New address from database, add it to form
              setFormData((prev) => {
                const newBilling = [...prev.billingAddresses, addr];
                const newIdx = newBilling.length - 1;
                return {
                  ...prev,
                  billingAddresses: newBilling,
                  selectedBillingAddressIndex: newIdx,
                  shippingAddresses: prev.shippingAddressSameAsBilling
                    ? [...newBilling]
                    : prev.shippingAddresses,
                  selectedShippingAddressIndex: prev.shippingAddressSameAsBilling
                    ? newIdx
                    : prev.selectedShippingAddressIndex,
                };
              });
            }
          }}
          onEdit={(addr) => {
            let idx = formData.billingAddresses.findIndex(
              (a) =>
                a &&
                a.line1 === addr.line1 &&
                a.city === addr.city &&
                a.state === addr.state &&
                a.pincode === addr.pincode
            );

            if (idx === -1) {
              // Address not in form, add it first so it can be edited
              idx = formData.billingAddresses.length;
              setFormData((prev) => ({
                ...prev,
                billingAddresses: [...prev.billingAddresses, addr],
                selectedBillingAddressIndex: idx
              }));
            }

            setEditingBillingIndex(idx);
            setShowBillingModal(true);
            setShowBillingAddressesModal(false);
          }}
          onAdd={() => {
            setEditingBillingIndex(null);
            setShowBillingModal(true);
            setShowBillingAddressesModal(false);
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- Party Detail / Mobile-First Design ---------------- */
function PartyDetail({
  party = {},
  onBack,
  onEdit,
  onDelete,
  onSelectParty,
  allParties = [],
  currency = "USD",
  formatCurrencyDisplay,
}) {
  const defaultAddress = {
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
  };

  // activePartyId tracks which party is selected
  const [activePartyId, setActivePartyId] = useState(party?.id ?? null);
  const [isEdit, setIsEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile, transactions

  // Phone Country Code dropdown state variables
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState("");
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);
  const [phoneCodeHighlightedIndex, setPhoneCodeHighlightedIndex] = useState(0);
  const phoneCodeInputRef = useRef(null);
  const phoneCodeOptionsListRef = useRef(null);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showSidebarButton, setShowSidebarButton] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);

  // **NEW: Shared filter states for Transactions, Ledger, and Item Report**
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [dateRangeBounds, setDateRangeBounds] = useState({
    from: "",
    to: "",
  });
  const [txnType, setTxnType] = useState("");
  const [status, setStatus] = useState("");

  const [sidebarQuery, setSidebarQuery] = useState("");

  const [rawLedgerData, setRawLedgerData] = useState({
    invoices: [],
    paymentsIn: [],
    paymentsOut: [],
    creditNotes: [],
    debitNotes: [],
    salesReturns: [],
    purchaseReturns: []
  });
  const [loadingLedger, setLoadingLedger] = useState(false);

  // State for transactions (Payment In and Payment Out only)
  const [transactionsData, setTransactionsData] = useState({
    paymentsIn: [],
    paymentsOut: []
  });
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchLedgerData = useCallback(async (partyId) => {
    const businessId = localStorage.getItem('selectedBusinessId');
    if (!businessId || !partyId) return;

    setLoadingLedger(true);
    try {
      // Fetch all relevant data concurrently
      const [invoices, payIn, payOut, cNotes, dNotes, sReturns, pReturns] = await Promise.all([
        salesInvoiceAPI.getAll(businessId),
        paymentInAPI.getAll(businessId),
        paymentOutAPI.getAll(businessId),
        creditNoteAPI.getAll(businessId),
        debitNoteAPI.getAll(businessId),
        salesReturnAPI.getAll(businessId),
        purchaseReturnAPI.getAll(businessId)
      ]);

      const filterByParty = (res, pId) => (res.success && Array.isArray(res.data))
        ? res.data.filter(item => String(item.party_id) === String(pId))
        : [];

      setRawLedgerData({
        invoices: filterByParty(invoices, partyId),
        paymentsIn: filterByParty(payIn, partyId),
        paymentsOut: filterByParty(payOut, partyId),
        creditNotes: filterByParty(cNotes, partyId),
        debitNotes: filterByParty(dNotes, partyId),
        salesReturns: filterByParty(sReturns, partyId),
        purchaseReturns: filterByParty(pReturns, partyId)
      });
    } catch (error) {
      console.error('Error fetching ledger details:', error);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    if (activePartyId && activeTab === "ledger") {
      fetchLedgerData(activePartyId);
    }
  }, [activePartyId, activeTab, fetchLedgerData]);

  // Fetch transactions (Payment In and Payment Out only)
  const fetchTransactionsData = useCallback(async (partyId) => {
    const businessId = localStorage.getItem('selectedBusinessId');
    if (!businessId || !partyId) return;

    setLoadingTransactions(true);
    try {
      const [payIn, payOut] = await Promise.all([
        paymentInAPI.getByParty(partyId, businessId),
        paymentOutAPI.getByParty(partyId, businessId)
      ]);

      setTransactionsData({
        paymentsIn: payIn.success && Array.isArray(payIn.data) ? payIn.data : [],
        paymentsOut: payOut.success && Array.isArray(payOut.data) ? payOut.data : []
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactionsData({
        paymentsIn: [],
        paymentsOut: []
      });
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // Fetch transactions when activePartyId or transactions tab changes
  useEffect(() => {
    if (activePartyId && activeTab === "transactions") {
      fetchTransactionsData(activePartyId);
    }
  }, [activePartyId, activeTab, fetchTransactionsData]);

  const formattedRangeLabel = () => {
    const { start, end } = dateRangeBounds;
    if (start && end) return `${start} — ${end}`;
    if (start) return `${start} —`;
    if (end) return `— ${end}`;
    return "Custom Date Range";
  };

  // whenever parent changes `party` prop (e.g. on initial open), sync active id
  useEffect(() => {
    if (party && party.id) setActivePartyId(party.id);
  }, [party]);

  // Fetch bank accounts when party changes
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (activePartyId) {
        try {
          const { partyAPI } = await import("../../../utils/api.js");
          const businessId = localStorage.getItem("selectedBusinessId");
          const response = await partyAPI.getBankAccounts(activePartyId, businessId);

          if (response.success && response.data) {
            setBankAccounts(response.data);
          }
        } catch (error) {
          console.error('Error fetching bank accounts:', error);
          setBankAccounts([]);
        }
      }
    };

    fetchBankAccounts();
  }, [activePartyId]);

  // find currently selected party object (from allParties if provided, else fallback to prop)
  const currentParty = useMemo(() => {
    if (allParties && activePartyId != null) {
      const found = allParties.find(
        (p) => String(p.id) === String(activePartyId)
      );
      if (found) return found;
    }
    return party || {};
  }, [allParties, activePartyId, party]);

  const billingAddress =
    typeof currentParty.billingAddress === "string"
      ? { ...defaultAddress, line1: currentParty.billingAddress }
      : { ...defaultAddress, ...(currentParty.billingAddress || {}) };

  // filtered list for sidebar (from allParties)
  const filteredSidebar = (allParties || []).filter((p) => {
    const partyName = (p.partyName || p.name || "");
    const nameStr = typeof partyName === 'string' ? partyName : String(partyName || "");
    return nameStr.toLowerCase().includes(sidebarQuery.toLowerCase());
  });

  const handleSidebarClick = async (p) => {
    setActivePartyId(p.id);

    // Fetch fresh party data from backend to ensure all fields including logo are populated
    try {
      const { partyAPI } = await import("../../../utils/api.js");
      const businessId = localStorage.getItem("selectedBusinessId");
      const result = await partyAPI.getById(p.id, businessId);

      if (result.success && result.data) {
        // Map backend data to frontend format
        const party = result.data;
        const billingAddr = party.billing_address
          ? typeof party.billing_address === "string"
            ? {
              line1: party.billing_address,
              city: party.city || "",
              state: party.state || "",
              pincode: party.pincode || "",
              country: party.country || "India",
            }
            : party.billing_address
          : { line1: "", city: "", state: "", pincode: "", country: "" };

        const shippingAddr = party.shipping_address
          ? typeof party.shipping_address === "string"
            ? {
              line1: party.shipping_address,
              city: party.ship_city || party.city || "",
              state: party.ship_state || party.state || "",
              pincode: party.ship_pincode || party.pincode || "",
              country: party.ship_country || party.country || "India",
            }
            : party.shipping_address
          : { line1: "", city: "", state: "", pincode: "", country: "" };

        const isSameAddress =
          billingAddr.line1 === shippingAddr.line1 &&
          billingAddr.city === shippingAddr.city &&
          billingAddr.state === shippingAddr.state &&
          billingAddr.pincode === shippingAddr.pincode &&
          billingAddr.country === shippingAddr.country;

        const billingAddresses = party.billingAddresses && party.billingAddresses.length > 0
          ? party.billingAddresses
          : [billingAddr];

        const shippingAddresses = party.shippingAddresses && party.shippingAddresses.length > 0
          ? party.shippingAddresses
          : [shippingAddr];

        const freshPartyData = {
          id: party.id,
          partyName: party.party_name,
          tradeName: party.trade_name || "",
          category: party.category || "-",
          mobileNumber: party.phone_number,
          partyType:
            party.party_type.charAt(0).toUpperCase() +
            party.party_type.slice(1),
          balance: parseFloat(party.opening_balance) || 0,
          openingBalance: parseFloat(party.opening_balance) || 0,
          email: party.email || "",
          gstin: party.gstin || "",
          vat: party.vat || "",
          no_tax: party.no_tax,
          panNumber: party.pan_number || "",
          balanceType: party.balance_type || "receivable",
          logo: party.logo || null,
          billingAddresses: billingAddresses,
          selectedBillingAddressIndex: 0,
          shippingAddresses: shippingAddresses,
          selectedShippingAddressIndex: 0,
          shippingAddressSameAsBilling: isSameAddress,
          creditPeriod: party.credit_days || 0,
          creditLimit: parseFloat(party.credit_limit) || 0,
          contactPerson: {
            name: party.contact_person_name || "",
            phone: party.contact_person_phone || ""
          },
          bankAccounts: party.bank_name
            ? [
              {
                accountNumber: party.account_number || "",
                ifsc: party.ifsc_code || "",
                bankName: party.bank_name || "",
                branch: party.bank_branch || "",
                accountHolder: party.party_name,
              },
            ]
            : [],
          customFields: [],
          notes: party.notes || "",
        };

        // inform parent so it can update its selectedParty state as well
        onSelectParty?.(freshPartyData);
      }
    } catch (error) {
      console.error("Error fetching party details:", error);
      // Fallback to using the party from allParties if API call fails
      onSelectParty?.(p);
    }
  };

  /* ------------------ Ledger helpers (inside PartyDetail scope) ------------------ */

  const getOpeningBalance = () => {
    // Prefer explicit openingBalance if available, else fall back to party.balance or 0
    if (
      currentParty &&
      typeof currentParty.openingBalance !== "undefined" &&
      currentParty.openingBalance !== null
    ) {
      return Number(currentParty.openingBalance) || 0;
    }
    return Number(currentParty.balance) || 0;
  };

  // Get transactions list combining Payment In and Payment Out
  const getTransactionsList = () => {
    // Helper function to normalize date to YYYY-MM-DD format
    const normalizeDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    const transactions = [
      ...transactionsData.paymentsIn.map(item => ({
        id: item.id,
        date: normalizeDate(item.payment_date),
        voucher: `Payment In #${item.payment_number}`,
        type: 'Payment In',
        amount: parseFloat(item.amount_received || 0),
        status: item.status || 'Completed'
      })),
      ...transactionsData.paymentsOut.map(item => ({
        id: item.id,
        date: normalizeDate(item.payment_date),
        voucher: `Payment Out #${item.payment_number}`,
        type: 'Payment Out',
        amount: parseFloat(item.amount_paid || item.amount || 0),
        status: item.status || 'Completed'
      }))
    ];

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    return transactions;
  };


  const getLedgerTransactions = (partyObj) => {
    const opening = getOpeningBalance();

    // Helper function to normalize date to YYYY-MM-DD format
    const normalizeDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    // Unified transactions logic similar to Ledger.jsx
    let all = [
      ...rawLedgerData.invoices.map(item => ({
        id: item.id,
        date: normalizeDate(item.invoice_date),
        voucher: `Tax Invoice #${item.invoice_number}`,
        type: 'Sale',
        debit: parseFloat(item.grand_total || 0),
        credit: 0
      })),
      ...rawLedgerData.paymentsIn.map(item => ({
        id: item.id,
        date: normalizeDate(item.payment_date),
        voucher: `Payment In #${item.payment_number}`,
        type: 'Payment In',
        debit: 0,
        credit: parseFloat(item.amount_received || 0)
      })),
      ...rawLedgerData.paymentsOut.map(item => ({
        id: item.id,
        date: normalizeDate(item.payment_date),
        voucher: `Payment Out #${item.payment_number}`,
        type: 'Payment Out',
        debit: parseFloat(item.amount_paid || item.amount || 0),
        credit: 0
      })),
      ...rawLedgerData.creditNotes.map(item => ({
        id: item.id,
        date: normalizeDate(item.note_date),
        voucher: `Credit Note #${item.note_number}`,
        type: 'Credit Note',
        debit: 0,
        credit: parseFloat(item.grand_total || 0)
      })),
      ...rawLedgerData.debitNotes.map(item => ({
        id: item.id,
        date: normalizeDate(item.note_date),
        voucher: `Debit Note #${item.debit_note_number}`,
        type: 'Debit Note',
        debit: parseFloat(item.grand_total || 0),
        credit: 0
      })),
      ...rawLedgerData.salesReturns.map(item => ({
        id: item.id,
        date: normalizeDate(item.return_date || item.date || item.invoice_date),
        voucher: `Sales Return #${item.return_number}`,
        type: 'Sales Return',
        debit: 0,
        credit: parseFloat(item.grand_total || 0)
      })),
      ...rawLedgerData.purchaseReturns.map(item => ({
        id: item.id,
        date: normalizeDate(item.return_date || item.date || item.bill_date),
        voucher: `Purchase Return #${item.return_number}`,
        type: 'Purchase Return',
        debit: parseFloat(item.grand_total || 0),
        credit: 0
      }))
    ];

    all.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = opening;
    return all.map((t) => {
      running = running + (Number(t.debit || 0) - Number(t.credit || 0));
      return { ...t, runningBalance: running };
    });
  };

  const getClosingBalance = (partyObj) => {
    const txs = getLedgerTransactions(partyObj);
    if (!txs.length) return getOpeningBalance();
    return txs[txs.length - 1].runningBalance;
  };

  /* ------------------ End ledger helpers ------------------ */

  const onRangeChange = (label) => {
    setDateRangeLabel(label);
    const bounds = getRangeBoundsPure(label);
    if (bounds) {
      // Convert Date objects to YYYY-MM-DD format, accounting for timezone
      const fromDate = new Date(bounds.start);
      const toDate = new Date(bounds.end);

      const fromStr = fromDate.getFullYear() + '-' +
        String(fromDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(fromDate.getDate()).padStart(2, '0');

      const toStr = toDate.getFullYear() + '-' +
        String(toDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(toDate.getDate()).padStart(2, '0');

      setDateRangeBounds({
        from: fromStr,
        to: toStr,
      });
    } else {
      // "All Dates" selected
      setDateRangeBounds({
        from: "",
        to: "",
      });
    }
  };

  // **NEW: Unified filter function**
  const applyFilters = (transactions) => {
    let filtered = [...transactions];

    // Date filter only
    const { from, to } = dateRangeBounds;
    if (from || to) {
      filtered = filtered.filter((r) => {
        if (!r.date) return false;

        // Parse the transaction date (should be in YYYY-MM-DD format)
        const txDate = r.date;

        // Compare dates as strings (YYYY-MM-DD format)
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
        return true;
      });
    }

    return filtered;
  };

  // Ledger rows filtered by date bounds (if any)
  const ledgerRowsAll = getLedgerTransactions(currentParty);
  const ledgerRows = applyFilters(ledgerRowsAll);

  // Calculate opening balance shown (for filtered range: opening + any rows before start)
  const computeOpeningForRange = () => {
    if (!dateRangeBounds.from) return getOpeningBalance();
    // calculate running balance up to (but not including) first included txn
    let running = getOpeningBalance();
    const start = dateRangeBounds.from;
    const txs = getLedgerTransactions(currentParty);
    const sorted = [...txs].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });
    for (const t of sorted) {
      if (t.date >= start) break;
      running = running + (Number(t.debit || 0) - Number(t.credit || 0));
    }
    return running;
  };

  const openingForDisplayed = computeOpeningForRange();
  const closingForDisplayed = ledgerRows.length
    ? ledgerRows[ledgerRows.length - 1].runningBalance
    : openingForDisplayed;

  // **NEW: Filter control component**
  const FilterControls = () => (
    <>
      {/* Desktop Layout - Only Date Filter */}
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Date_wise_Filter_Button
          dateRangeLabel={dateRangeLabel}
          onRangeChange={onRangeChange}
          customRange={dateRangeBounds}
          onRangeApply={(range) => {
            setDateRangeLabel('Custom Date Range');
            setDateRangeBounds(range);
          }}
        />
      </div>
    </>
  );

  const totals = useMemo(() => {
    const rows = getLedgerTransactions(currentParty);
    const filtered = applyFilters(rows);
    return {
      debit: filtered.reduce((sum, t) => sum + (t.debit || 0), 0),
      credit: filtered.reduce((sum, t) => sum + (t.credit || 0), 0),
      balance: closingForDisplayed
    };
  }, [currentParty, rawLedgerData, dateRangeBounds, closingForDisplayed]);

  return (
    <div className="min-h-screen bg-gray-50 mt-4 relative overflow-hidden">
      {/* Mobile Sidebar Button - appears in party detail view */}
      <button
        onClick={() => setIsSliderOpen(true)}
        className="md:hidden fixed left-0 top-1/2 transform -translate-y-1/2 z-30 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white w-6 h-16 rounded-r-md shadow-lg transition-all duration-300 flex items-center justify-center px-0"
        aria-label="Open party sidebar"
      >
        <ChevronRight className="w-7 h-7 text-white" strokeWidth={4} />
      </button>

      {/* Mobile-First Layout - Completely Different from Desktop */}

      {/* Slide-out Party Selector */}
      <div
        className={`fixed left-0 top-[92px] z-50 w-72 h-[82vh] bg-white shadow-2xl transition-transform duration-300 ease-in-out pb-10 ${isSliderOpen ? "translate-x-0" : "-translate-x-full"
          } md:hidden`}
      >
        {/* Close button for mobile slider */}
        <button
          onClick={() => setIsSliderOpen(false)}
          className="md:hidden fixed right-0 top-[240px] transform -translate-y-1/2 z-30 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white w-6 h-16 rounded-l-md shadow-lg transition-all duration-300 flex items-center justify-center px-0"
          aria-label="Close party sidebar"
        >
          <ChevronLeft className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        <div className="flex flex-col h-full">
          {/* Header - Hidden on Mobile */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-gray-200 bg-[#f3c117]">
            <h3 className="text-lg font-bold text-white">Select Party</h3>
            <button
              onClick={() => setIsSliderOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <input
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search parties..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#f3c117] focus:ring-2 focus:ring-[#f3c117]/20"
              />
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          {/* Party List - Show on Mobile */}
          <div className="flex-1 overflow-y-auto">
            {(filteredSidebar || []).map((p) => {
              const isActive = String(activePartyId) === String(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    handleSidebarClick(p);
                    setIsSliderOpen(false);
                  }}
                  className={`w-full text-left p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive
                    ? "bg-[#f3c117]/10 border-l-4 border-l-[#f3c117]"
                    : ""
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        <span>{p.partyName || p.name || "-"}</span>
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          translate="no"
                          className={`text-xs px-2 py-0.5 rounded-full ${Number(p.balance) >= 0
                            ? "text-green-600 bg-green-50"
                            : "text-red-600 bg-red-50"
                            }`}
                        >
                          {formatCurrencyDisplay(p.balance ?? 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          <span>{p.category || "-"}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {!filteredSidebar.length && (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No parties found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isSliderOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSliderOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-yellow-200 px-4 py-2 flex items-center justify-between rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
            </button>
            <div>
              <h1 className="text-base font-bold text-yellow-900">
                <span>{currentParty.partyName || "Party Details"}</span>
              </h1>
              <div className="text-xs text-gray-600 mt-1">
                <span translate="no"><span>{formatCurrencyDisplay(currentParty.balance || 0)}</span></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSliderOpen(true)}
            className="p-1.5 bg-[#f3c117] text-white rounded-lg hover:bg-[#f3c117]/90"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Header (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between pt-2 pb-3 px-3 border-b border-yellow-200 bg-white rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="group p-2 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
            >
              <ArrowLeft className="w-5 h-5 text-yellow-900 group-hover:text-green-700" />
            </button>
            <h2 className="text-xl font-bold text-yellow-900">
              <span>{currentParty.partyName || "Cash Sale"}</span>
            </h2>
            <span translate="no" className="text-sm px-3 py-1 bg-gray-100 text-yellow-900 rounded-full font-medium">
              <span>{formatCurrencyDisplay(currentParty.balance || 0)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(currentParty)}
              className="p-2 bg-green-500 text-white rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto md:pb-0 pb-20">
          {/* Unified Layout - Same for Mobile and Desktop */}
          <div className="">
            <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-0">
              <aside className="hidden md:block border-l border-t border-b border-yellow-200 rounded-l-lg bg-white md:min-h-screen mt-2">
                <div className="p-3">
                  <div className="relative">
                    <input
                      value={sidebarQuery}
                      onChange={(e) => setSidebarQuery(e.target.value)}
                      placeholder="Search Party"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-[7px] h-8"
                    />
                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div
                  className="px-3 pb-3 space-y-2 overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 64px)" }}
                >
                  {(filteredSidebar || []).map((p) => {
                    const isActive = String(activePartyId) === String(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSidebarClick(p)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition border ${isActive
                          ? "bg-green-50 border-green-200"
                          : "bg-white hover:bg-yellow-50 border-yellow-200"
                          }`}
                      >
                        <div className="text-sm font-medium truncate">
                          <span>{p.partyName || p.name || "-"}</span>
                        </div>
                        <div
                          translate="no"
                          className={`text-xs ${Number(p.balance) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                            }`}
                        >
                          <span>Balance: <span>{formatCurrencyDisplay(p.balance ?? 0)}</span></span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <span>{p.category || "-"}</span>
                        </div>
                      </button>
                    );
                  })}

                  {!filteredSidebar.length && (
                    <div className="text-center text-sm text-gray-500 py-6">
                      No parties found
                    </div>
                  )}
                </div>
              </aside>

              <main className="bg-white rounded-lg md:rounded-l-none md:rounded-r-xl border-1 border-yellow-200 flex flex-col mt-2">
                <div className="flex-shrink-0">
                  {/* Desktop Tabs */}
                  <div className="hidden md:block border-b border-yellow-200 pr-4">
                    <div className="flex gap-0">
                      {[
                        { id: "profile", label: "Profile" },
                        { id: "transactions", label: "Transactions" },
                        {
                          id: "ledger",
                          label: "Ledger (Statement)",
                          mobileLabel: "Ledger",
                        },
                        // {
                        //   id: "report",
                        //   label: "Item Wise Report",
                        //   mobileLabel: "Reports",
                        // }, 
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`-mb-[2px] px-4 py-1.5 flex items-center justify-center whitespace-nowrap ${activeTab === tab.id
                            ? "text-green-700 font-medium bg-yellow-100"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Tabs - Compact and Responsive */}
                  <div className="md:hidden border-b border-yellow-200">
                    <div className="flex overflow-x-auto scrollbar-hide gap-0">
                      {[
                        { id: "profile", label: "Profile" },
                        { id: "transactions", label: "Transactions" },
                        {
                          id: "ledger",
                          label: "Ledger (Statement)",
                          mobileLabel: "Ledger",
                        },
                        {
                          id: "report",
                          label: "Item Wise Report",
                          mobileLabel: "Reports",
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`-mb-[2px] px-3 py-1.5 flex items-center justify-center flex-shrink-0 text-sm font-medium whitespace-nowrap ${activeTab === tab.id
                            ? "text-green-700 bg-yellow-100"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                          <span>{tab.mobileLabel || tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "transactions" && (
                    <div className="space-y-4">
                      <FilterControls />

                      <div className="border-l border-r border-yellow-200 rounded-lg overflow-x-auto">
                        {loadingTransactions ? (
                          <div className="px-4 py-8 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
                          </div>
                        ) : (
                          <table className="w-full min-w-[600px]">
                            <thead>
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                  <span>Date</span>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                  <span>Transaction Type</span>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                  <span>Transaction Number</span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                                  <span>Amount</span>
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                  <span>Status</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {applyFilters(getTransactionsList()).length > 0 ? (
                                applyFilters(getTransactionsList()).map((tx) => (
                                  <tr
                                    key={tx.id}
                                    className="border-t border-gray-100"
                                  >
                                    <td className="px-4 py-3 text-sm">
                                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span>{tx.type}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span>{tx.voucher}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                      <span translate="no"><span>{formatCurrencyDisplay(tx.amount)}</span></span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs ${tx.status === "Completed" || tx.status === "Paid"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-yellow-100 text-yellow-800"
                                          }`}
                                      >
                                        <span>{tx.status}</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan="5"
                                    className="px-4 py-8 text-center"
                                  >
                                    <GeneralEmptyState
                                      title="No Transactions Found"
                                      description="No payment transactions found for this party."
                                    />
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "profile" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                        <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                          <h3 className="font-semibold text-lg">
                            General Details
                          </h3>
                        </div>

                        {/* Desktop Layout - Hidden on Mobile */}
                        <div className="hidden md:block p-4 space-y-3 text-sm break-words">
                          <div className="grid grid-cols-[1fr_2fr] gap-4">
                            <div className="flex items-center justify-center border-2 border-yellow-200 rounded-lg p-1">
                              {currentParty.logo ? (
                                <img
                                  src={getImageURL(currentParty.logo)}
                                  alt="Party Logo"
                                  className="w-full h-full object-contain rounded-lg"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Users className="w-10 h-10 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">
                                  <span>Party Name:</span>
                                </span>
                                <span className="font-semibold text-gray-800">
                                  <span>{currentParty.partyName}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">
                                  <span>Mobile:</span>
                                </span>
                                <span className="font-semibold text-gray-800">
                                  <span translate="no"><span>{formatPhoneNumber(currentParty.mobileNumber)}</span></span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">
                                  <span>Email:</span>
                                </span>
                                <span className="font-semibold text-gray-800">
                                  <span>{currentParty.email || "-"}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">
                                  <span>Party Type:</span>
                                </span>
                                <span className="font-semibold text-gray-800">
                                  <span>{currentParty.partyType}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">
                                  <span>Category:</span>
                                </span>
                                <span className="font-semibold text-gray-800">
                                  <span>{currentParty.category || "-"}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Layout - Hidden on Desktop */}
                        <div className="md:hidden p-4 space-y-4 text-sm break-words">
                          {/* Logo at Top */}
                          <div className="flex justify-center mb-4">
                            <div className="flex items-center justify-center border-2 border-yellow-200 rounded-lg p-2 w-24 h-24">
                              {currentParty.logo ? (
                                <img
                                  src={getImageURL(currentParty.logo)}
                                  alt="Party Logo"
                                  className="w-full h-full object-contain rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                                  <Users className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Details in Left-Right Layout */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">
                                <span>Party Name:</span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                <span>{currentParty.partyName}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">
                                <span>Mobile:</span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                <span translate="no">{formatPhoneNumber(currentParty.mobileNumber)}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">
                                <span>Email:</span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                <span>{currentParty.email || "-"}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">
                                <span>Party Type:</span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                <span>{currentParty.partyType}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">
                                <span>Category:</span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                <span>{currentParty.category || "-"}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                        <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                          <h3 className="font-semibold text-lg">
                            Business Details
                          </h3>
                        </div>
                        <div className="p-4 space-y-3 text-sm break-words">
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 font-medium">
                              <span>{currentParty.vat ? "VAT:" : currentParty.gstin ? "GSTIN:" : "Tax Type:"}</span>
                            </span>
                            <span className="font-semibold text-gray-800 text-right">
                              <span>{currentParty.vat ? currentParty.vat : currentParty.gstin ? currentParty.gstin : "No Tax"}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 font-medium"><span>PAN Number:</span></span>
                            <span className="font-semibold text-gray-800 text-right">
                              <span>{currentParty.panNumber || "-"}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 font-medium"><span>Trade Name:</span></span>
                            <span className="font-semibold text-gray-800 text-right">
                              <span>{currentParty.tradeName || "-"}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 font-medium"><span>Credit Limit:</span></span>
                            <span className="font-semibold text-gray-800 text-right">
                              <span translate="no"><span>{formatCurrencyDisplay(currentParty.creditLimit || 0)}</span></span>
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 font-medium"><span>Credit Period:</span></span>
                            <span className="font-semibold text-gray-800 text-right">
                              <span><span>{currentParty.creditPeriod || 0}</span> <span>days</span></span>
                            </span>
                          </div>
                          <div className="border-t border-gray-100 pt-2 mt-2 text-sm break-words">
                            <span className="text-gray-600 font-medium mr-1.5"><span>Remark:</span></span>
                            <span className="text-gray-700 leading-relaxed font-normal">
                              <span>{currentParty.notes || currentParty.remark || "-"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                        <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                          <h3 className="font-semibold text-lg">
                            Billing Address
                          </h3>
                        </div>
                        <div className="p-4 text-sm break-words">
                          <p className="text-gray-700 leading-relaxed">
                            <span>{billingAddress.line1 || "No address provided"}</span>
                            {billingAddress.city && (
                              <>
                                <br />
                                <span>{billingAddress.city}</span>
                                {billingAddress.state && <span>{`, ${billingAddress.state}`}</span>}
                                {billingAddress.pincode && <span>{` - ${billingAddress.pincode}`}</span>}
                              </>
                            )}
                            {billingAddress.country && (
                              <>
                                <br />
                                <span>{billingAddress.country}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                        <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                          <h3 className="font-semibold text-lg">
                            Shipping Address
                          </h3>
                        </div>
                        <div className="p-4 text-sm break-words">
                          <p className="text-gray-700 leading-relaxed">
                            <span>{currentParty.shippingAddresses?.[0]?.line1 || currentParty.shippingAddress || "No address provided"}</span>
                            {(currentParty.shippingAddresses?.[0]?.city || currentParty.ship_city) && (
                              <>
                                <br />
                                <span>{currentParty.shippingAddresses?.[0]?.city || currentParty.ship_city}</span>
                                {(currentParty.shippingAddresses?.[0]?.state || currentParty.ship_state) &&
                                  <span>{`, ${currentParty.shippingAddresses?.[0]?.state || currentParty.ship_state}`}</span>}
                                {(currentParty.shippingAddresses?.[0]?.pincode || currentParty.ship_pincode) &&
                                  <span>{` - ${currentParty.shippingAddresses?.[0]?.pincode || currentParty.ship_pincode}`}</span>}
                              </>
                            )}
                            {(currentParty.shippingAddresses?.[0]?.country || currentParty.ship_country) && (
                              <>
                                <br />
                                <span>{currentParty.shippingAddresses?.[0]?.country || currentParty.ship_country}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Bank Details Cards - One card per bank account */}
                      {bankAccounts && bankAccounts.length > 0 ? (
                        bankAccounts.map((bank, index) => (
                          <div key={bank.id || index} className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                            <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                              <h3 className="font-semibold text-lg">
                                Bank Details {bankAccounts.length > 1 ? `#${index + 1}` : ''}
                              </h3>
                            </div>
                            <div className="p-4 space-y-3 text-sm break-words">
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600 font-medium">Bank Name:</span>
                                <span className="font-semibold text-gray-800 text-right">
                                  <span>{bank.bank_name || "-"}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600 font-medium">Branch:</span>
                                <span className="font-semibold text-gray-800 text-right">
                                  <span>{bank.branch || "-"}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600 font-medium">Account Holder:</span>
                                <span className="font-semibold text-gray-800 text-right">
                                  <span>{bank.account_holder_name || currentParty.partyName || "-"}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600 font-medium">Account Number:</span>
                                <span className="font-semibold text-gray-800 text-right">
                                  <span>{bank.account_number || "-"}</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600 font-medium">IFSC Code:</span>
                                <span className="font-semibold text-gray-800 text-right">
                                  <span>{bank.ifsc || "-"}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="border-1 border-yellow-200 rounded-lg overflow-hidden bg-white">
                          <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                            <h3 className="font-semibold text-lg">
                              Bank Details
                            </h3>
                          </div>
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No bank details available
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "ledger" && (
                    <div className="rounded-lg">
                      <FilterControls />

                      <div className="border border-gray-200 p-3 rounded-lg bg-white shadow-sm mt-2">
                        {/* Header with Title and Download Button */}
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                          <div>
                            <h2 className="text-sm font-semibold text-gray-800">{currentParty.partyName}</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Ledger Statement</p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const doc = new jsPDF('p', 'mm', 'a4');
                                const pageWidth = doc.internal.pageSize.getWidth();
                                const pageHeight = doc.internal.pageSize.getHeight();

                                // Create HTML content for the PDF
                                const htmlContent = `
                                  <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
                                    <!-- Header -->
                                    <div style="text-align: center; margin-bottom: 20px;">
                                      <h1 style="margin: 0; font-size: 24px; color: #333;">LEDGER STATEMENT</h1>
                                    </div>
                                    
                                    <!-- Summary Cards -->
                                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                                      <!-- Balance Card -->
                                      <div style="flex: 1; border: 2px solid #FFB366; border-radius: 8px; padding: 15px; background: #FFF8F0;">
                                        <div style="font-size: 11px; font-weight: bold; color: #8B4513; margin-bottom: 8px;">BALANCE</div>
                                        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 5px;">${formatCurrencyDisplay(Math.abs(totals.balance))}</div>
                                        <div style="font-size: 10px; color: #FF9800; font-weight: bold;">${totals.balance >= 0 ? 'Receivable' : 'Payable'}</div>
                                      </div>
                                      
                                      <!-- Total Debit Card -->
                                      <div style="flex: 1; border-radius: 8px; padding: 15px; background: #129046; color: white;">
                                        <div style="font-size: 11px; font-weight: bold; margin-bottom: 8px;">TOTAL DEBIT</div>
                                        <div style="font-size: 20px; font-weight: bold;">${formatCurrencyDisplay(totals.debit)}</div>
                                      </div>
                                      
                                      <!-- Total Credit Card -->
                                      <div style="flex: 1; border-radius: 8px; padding: 15px; background: #1E293B; color: white;">
                                        <div style="font-size: 11px; font-weight: bold; margin-bottom: 8px;">TOTAL CREDIT</div>
                                        <div style="font-size: 20px; font-weight: bold;">${formatCurrencyDisplay(totals.credit)}</div>
                                      </div>
                                    </div>
                                    
                                  
                                    
                                    <!-- Table -->
                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
                                      <thead>
                                        <tr style="background: #C8E6C9; border: 1px solid #4CAF50;">
                                          <th style="padding: 8px; text-align: left; border: 1px solid #4CAF50; font-weight: bold;">Date</th>
                                          <th style="padding: 8px; text-align: left; border: 1px solid #4CAF50; font-weight: bold;">Voucher</th>
                                          <th style="padding: 8px; text-align: center; border: 1px solid #4CAF50; font-weight: bold;">Sr No</th>
                                          <th style="padding: 8px; text-align: right; border: 1px solid #4CAF50; font-weight: bold;text-align : center">Credit</th>
                                          <th style="padding: 8px; text-align: right; border: 1px solid #4CAF50; font-weight: bold;text-align : center">Debit</th> 
                                          <th style="padding: 8px; text-align: right; border: 1px solid #4CAF50; font-weight: bold;text-align : center">Balance</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <!-- Opening Balance -->
                                        <tr style="background: #FFFDE7; border: 1px solid #4CAF50;">
                                         <td className="px-2 py-1.5 text-gray-700 font-medium" colSpan="5">Opening Balance</td>
                                          <td style="padding: 8px; text-align: center; border: 1px solid #4CAF50; font-weight: bold;text-align : center">${formatCurrencyDisplay(getOpeningBalance())}</td>
                                        </tr>
                                        
                                        <!-- Data Rows -->
                                        ${ledgerRows.map((r, i) => `
                                          <tr style="background: ${i % 2 === 0 ? '#F5F5F5' : '#FFFFFF'}; border: 1px solid #E0E0E0;">
                                            <td style="padding: 6px; border: 1px solid #E0E0E0;vertical-align: middle;">${r.date}</td>
                                            <td style="padding: 6px; border: 1px solid #E0E0E0;vertical-align: middle;">${r.voucher}</td>
                                            <td style="padding: 6px; text-align: center; vertical-align: middle; border: 1px solid #E0E0E0;">${i + 1}</td>
                                            <td style="padding: 6px; text-align: center; vertical-align: middle; border: 1px solid #E0E0E0;">${r.credit ? formatCurrencyDisplay(r.credit) : '-'}</td>
                                            <td style="padding: 6px; text-align: center; vertical-align: middle; border: 1px solid #E0E0E0;">${r.debit ? formatCurrencyDisplay(r.debit) : '-'}</td>
                                            
                                            <td style="padding: 6px; text-align: center; vertical-align: middle; border: 1px solid #E0E0E0; font-weight: bold;">${r.runningBalance ? formatCurrencyDisplay(r.runningBalance) : '-'}</td>
                                          </tr>
                                        `).join('')}
                                        
                                        <!-- Closing Balance -->
                                        <tr style="background: #FFFDE7; border: 1px solid #4CAF50;">
                                          <td className="px-2 py-1.5 text-gray-700 font-medium" colSpan="5">Closing Balance</td>
                                          <td style="padding: 8px; text-align: right; border: 1px solid #4CAF50; font-weight: bold;text-align : center">${formatCurrencyDisplay(ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : getOpeningBalance())}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    
                                    <!-- Footer -->
                                    <div style="text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #DDD; padding-top: 10px;">
                                      <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                                    </div>
                                  </div>
                                `;

                                // Create a temporary container
                                const container = document.createElement('div');
                                container.innerHTML = htmlContent;
                                container.style.position = 'absolute';
                                container.style.left = '-9999px';
                                container.style.width = '210mm';
                                container.style.background = 'white';
                                document.body.appendChild(container);

                                // Import html2canvas
                                const { default: html2canvas } = await import('html2canvas');

                                // Convert HTML to canvas
                                const canvas = await html2canvas(container, {
                                  scale: 2,
                                  useCORS: true,
                                  logging: false,
                                  backgroundColor: '#ffffff'
                                });

                                // Remove temporary container
                                document.body.removeChild(container);

                                // Calculate dimensions
                                const imgWidth = 210; // A4 width in mm
                                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                const imgData = canvas.toDataURL('image/png');

                                // Add image to PDF
                                let heightLeft = imgHeight;
                                let position = 0;

                                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                heightLeft -= pageHeight;

                                while (heightLeft >= 0) {
                                  position = heightLeft - imgHeight;
                                  doc.addPage();
                                  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                  heightLeft -= pageHeight;
                                }

                                // Save PDF
                                doc.save(`${(currentParty.partyName || 'ledger').replace(/\s+/g, '_')}_ledger.pdf`);
                              } catch (error) {
                                console.error('Error generating PDF:', error);
                                alert('Error generating PDF. Please try again.');
                              }
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#0d6e35] hover:to-[#7ab03d] text-white rounded-md text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
                            title="Download as PDF"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        </div>

                        {/* Summary Cards - Compact */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`p-2.5 rounded-lg shadow flex flex-col justify-between border ${totals.balance >= 0
                            ? 'bg-orange-50 border-orange-200 text-orange-900'
                            : 'bg-green-50 border-green-200 text-green-900'
                            }`}>
                            <p className="text-[8px] font-bold uppercase opacity-70"><span>Balance</span></p>
                            <p className="text-base font-bold"><span translate="no"><span>{formatCurrencyDisplay(Math.abs(totals.balance))}</span></span></p>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit ${totals.balance >= 0 ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'
                              }`}>
                              {totals.balance >= 0 ? 'Receivable' : 'Payable'}
                            </span>
                          </div>

                          <div className="bg-gradient-to-br from-[#129046] to-[#0d6e35] p-2.5 rounded-lg shadow text-white flex flex-col justify-between">
                            <p className="text-[8px] font-bold uppercase text-white/80"><span>Total Debit</span></p>
                            <p className="text-base font-bold"><span translate="no"><span>{formatCurrencyDisplay(totals.debit)}</span></span></p>
                          </div>

                          <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-2.5 rounded-lg shadow text-white flex flex-col justify-between">
                            <p className="text-[8px] font-bold uppercase text-white/80"><span>Total Credit</span></p>
                            <p className="text-base font-bold"><span translate="no"><span>{formatCurrencyDisplay(totals.credit)}</span></span></p>
                          </div>
                        </div>

                        {/* Party Info and Date Range - Compact */}


                        {/* Ledger Table - Compact */}
                        <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full min-w-[900px] text-xs">
                            <thead className="bg-gradient-to-r from-[#129046]/10 to-[#9ccc53]/10 border-b border-gray-200">
                              <tr>
                                <th className="px-2 py-2 text-center font-semibold text-gray-700"><span>Sr No</span></th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-700"><span>Date</span></th>
                                <th className="px-2 py-2 text-left font-semibold text-gray-700"><span>Invoice Number</span></th>
                                <th className="px-2 py-2 text-right font-semibold text-gray-700"><span>Credit</span></th>
                                <th className="px-2 py-2 text-right font-semibold text-gray-700"><span>Debit</span></th>
                                <th className="px-2 py-2 text-right font-semibold text-gray-700"><span>Balance</span></th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <td className="px-2 py-1.5 text-gray-700 font-medium" colSpan={5}>Opening Balance</td>
                                {/* <td className="px-2 py-1.5 text-gray-700">-</td> */}
                                {/* <td className="px-2 py-1.5 text-center text-gray-700">-</td>
                                <td className="px-2 py-1.5 text-right text-gray-700">-</td>
                                <td className="px-2 py-1.5 text-right text-gray-700">-</td>
                                <td className="px-2 py-1.5 text-right text-gray-700">-</td>
                                <td className="px-2 py-1.5 text-right text-gray-700">-</td> */}
                                <td className="px-2 py-1.5 text-right font-semibold text-[#129046]">
                                  <span translate="no"><span>{formatCurrencyDisplay(openingForDisplayed)}</span></span>
                                </td>
                              </tr>

                              {ledgerRows.map((tx, idx) => (
                                <tr
                                  key={tx.id || idx}
                                  className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                                >
                                  <td className="px-2 py-1.5 text-center text-gray-700"><span>{idx + 1}</span></td>
                                  <td className="px-2 py-1.5 text-gray-700"><span>{tx.date}</span></td>
                                  <td className="px-2 py-1.5 text-gray-700"><span>{tx.voucher}</span></td>

                                  <td className="px-2 py-1.5 text-right text-gray-700">
                                    <span translate="no"><span>{tx.credit ? formatCurrencyDisplay(tx.credit) : "-"}</span></span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-gray-700">
                                    <span translate="no"><span>{tx.debit ? formatCurrencyDisplay(tx.debit) : "-"}</span></span>
                                  </td>
                                  {/* <td className="px-2 py-1.5 text-right text-gray-700">
                                    {tx.tds_by_party ? formatCurrencyDisplay(tx.tds_by_party) : "-"}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-gray-700">
                                    {tx.tds_by_self ? formatCurrencyDisplay(tx.tds_by_self) : "-"}
                                  </td> */}
                                  <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                                    <span translate="no"><span>{formatCurrencyDisplay(tx.runningBalance)}</span></span>
                                  </td>
                                </tr>
                              ))}

                              <tr className="bg-gradient-to-r from-[#129046]/5 to-[#9ccc53]/5 border-t-2 border-[#129046]/20 font-semibold">
                                <td className="px-2 py-2 text-gray-900">Closing Balance</td>
                                {/* <td className="px-2 py-2 text-gray-700">-</td> */}
                                {/* <td className="px-2 py-2 text-center text-gray-700">-</td> */}
                                {/* <td className="px-2 py-2 text-right text-gray-700">-</td> */}
                                {/* <td className="px-2 py-2 text-right text-gray-700">-</td> */}
                                {/* <td className="px-2 py-2 text-right text-gray-700">-</td> */}
                                {/* <td className="px-2 py-2 text-right text-gray-700">-</td> */}
                                <td className="px-2 py-2 text-right text-[#129046]" colSpan={5}>
                                  <span translate="no"><span>{formatCurrencyDisplay(closingForDisplayed)}</span></span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>


                    </div>
                  )}

                  {activeTab === "report" && (
                    <div className="space-y-4">
                      <FilterControls />

                      <div className="border-l border-r border-yellow-200 rounded-lg overflow-x-auto scrollbar-hide">
                        <table className="w-full min-w-[500px]">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                Item Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td
                                colSpan="4"
                                className="px-4 py-16 text-center"
                              >
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                  <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                    <FileBarChart2 className="w-8 h-8 text-gray-300" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-500">
                                    No item reports for the selected filters
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Parties component (list + create/edit + detail) ---------------- */
export default function Parties({ currency = "USD", checkBusiness }) {
  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Inject the horizontal bounce style on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const styleId = "parties-horizontal-bounce-style";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = horizontalBounceStyle;
        document.head.appendChild(style);
      }
    }
  }, []);

  const [openActionsCardId, setOpenActionsCardId] = useState(null);
  const [categories, setCategories] = useState([]); // Initialize as empty array
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    category_id: "",
    partyType: "",
    balanceType: "",
    search: "",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };


  const defaultAddress = {
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
  };

  const handleCreateCategory = async (name) => {
    try {
      const { categoryAPI } = await import("../../../utils/api.js");
      const response = await categoryAPI.create({ name });
      if (response.success) {
        setCategories((prev) => [...prev, response.data]);
        setShowCreateModal(false); // Assuming this is the modal state for category creation
        showToast({ title: "Category Created", icon: "success" });
        return response.data;
      }
    } catch (error) {
      showToast({ title: "Error creating category", text: error.message, icon: "error" });
    }
    return null;
  };
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [partyData, setPartyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  // Fetch parties and categories from backend
  useEffect(() => {
    fetchParties();
    fetchCategories();
  }, [filters]);

  // Listen for business changes and refetch parties
  useEffect(() => {
    const handleBusinessChanged = (event) => {
      fetchParties();
      fetchCategories();
    };

    window.addEventListener("businessChanged", handleBusinessChanged);
    return () => {
      window.removeEventListener("businessChanged", handleBusinessChanged);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const selectedBusinessId = localStorage.getItem("selectedBusinessId");
      const { categoryAPI } = await import("../../../utils/api.js");
      const response = await categoryAPI.getAll(selectedBusinessId);
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchParties = async () => {
    try {
      setLoading(true);

      // Import partyAPI from utils
      const { partyAPI } = await import("../../../utils/api.js");

      // Get selected business ID from localStorage
      const selectedBusinessId = localStorage.getItem("selectedBusinessId");

      const result = await partyAPI.getAll(selectedBusinessId, filters);

      if (result.success) {
        // Map backend data to frontend format
        const mappedParties = result.data.map((party) => {
          const billingAddr = party.billing_address
            ? typeof party.billing_address === "string"
              ? {
                line1: party.billing_address,
                city: party.city || "",
                state: party.state || "",
                pincode: party.pincode || "",
                country: party.country || "India",
              }
              : party.billing_address
            : defaultAddress;

          const shippingAddr = party.shipping_address
            ? typeof party.shipping_address === "string"
              ? {
                line1: party.shipping_address,
                city: party.ship_city || party.city || "",
                state: party.ship_state || party.state || "",
                pincode: party.ship_pincode || party.pincode || "",
                country: party.ship_country || party.country || "India",
              }
              : party.shipping_address
            : defaultAddress;

          const billingAddressesList = (party.billingAddresses && party.billingAddresses.length > 0)
            ? party.billingAddresses
            : [billingAddr];

          const shippingAddressesList = (party.shippingAddresses && party.shippingAddresses.length > 0)
            ? party.shippingAddresses
            : [shippingAddr];

          // Check if billing and shipping addresses are the same (using primary ones)
          const isSameAddress =
            billingAddr.line1 === shippingAddr.line1 &&
            billingAddr.city === shippingAddr.city &&
            billingAddr.state === shippingAddr.state &&
            billingAddr.pincode === shippingAddr.pincode &&
            billingAddr.country === shippingAddr.country;

          return {
            id: party.id,
            partyName: party.party_name,
            tradeName: party.trade_name || "",
            category: party.category_name || "-",
            category_id: party.category_id,
            mobileNumber: party.phone_number,
            partyType:
              party.party_type.charAt(0).toUpperCase() +
              party.party_type.slice(1),
            balance: parseFloat(party.opening_balance) || 0,
            openingBalance: parseFloat(party.opening_balance) || 0,
            email: party.email || "",
            gstin: party.gstin || "",
            vat: party.vat || "",
            panNumber: party.pan_number || "",
            balanceType: party.balance_type || "receivable",
            logo: party.logo || null,
            billingAddress: billingAddr,
            billingAddresses: billingAddressesList,
            selectedBillingAddressIndex: 0,
            shippingAddresses: shippingAddressesList,
            selectedShippingAddressIndex: 0,
            shippingAddressSameAsBilling: isSameAddress,
            bill_to_id: party.bill_to_id,
            ship_to_id: party.ship_to_id,
            creditPeriod: party.credit_days || 0,
            creditLimit: parseFloat(party.credit_limit) || 0,
            contactPerson: {
              name: party.contact_person_name || "",
              phone: party.contact_person_phone || ""
            },
            bankAccounts: party.bank_name
              ? [
                {
                  accountNumber: party.account_number || "",
                  ifsc: party.ifsc_code || "",
                  bankName: party.bank_name || "",
                  branch: party.bank_branch || "",
                  accountHolder: party.party_name,
                },
              ]
              : [],
            customFields: [],
            notes: party.notes || "",
            no_tax: party.no_tax === 1 || party.no_tax === true || party.no_tax === "true",
            registration_type: party.registration_type || (party.no_tax ? "NO_TAX" : party.gstin ? "GSTIN" : party.vat ? "VAT" : ""),
          };
        });
        setPartyData(mappedParties);
      }
    } catch (error) {
      console.error("Error fetching parties:", error);

      // Handle specific business validation error
      if (error.response?.data?.code === "NO_BUSINESS_FOUND") {
        // Show empty state instead of business setup message
        setPartyData([]); // Clear any existing data
        return;
      }

      /* Suppress noisy red error toast as per user request */
      /*
      showToast({
        title: "Error",
        text: error.response?.data?.message || "Failed to load parties",
        icon: "error",
      });
      */
    } finally {
      setLoading(false);
    }
  };

  const bulkButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bulkButtonRef.current &&
        !bulkButtonRef.current.contains(event.target)
      ) {
        setShowBulkDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") setShowBulkDropdown(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Close if clicking outside of mobile card actions
      if (openActionsCardId && !e.target.closest("[data-actions-container]")) {
        setOpenActionsCardId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionsCardId]);

  const filteredParties = filters.category_id
    ? partyData.filter((p) => String(p.category_id) === String(filters.category_id))
    : partyData;

  const handleSaveCategory = (name) => {
    if (!name) return;
    setCategories((prev) => [...prev, name]);
    handleFilterChange("category_id", name);
    setShowCreateModal(false);
  };

  const handleCreateParty = async (partyDataInput) => {
    try {
      // Import partyAPI from utils
      const { partyAPI } = await import("../../../utils/api.js");

      // Get selected business ID from localStorage
      const selectedBusinessId = localStorage.getItem("selectedBusinessId");

      // Create FormData for file upload
      const formData = new FormData();

      // Clean phone number - remove non-digits but keep '+'
      const cleanPhoneNumber = (partyDataInput.mobileNumber || "").replace(/[^\d+]/g, "");

      // Add business data
      formData.append(
        "business_id",
        selectedBusinessId ? parseInt(selectedBusinessId) : ""
      );
      formData.append(
        "party_type",
        partyDataInput.partyType === "other"
          ? partyDataInput.otherPartyType
          : partyDataInput.partyType.toLowerCase()
      );
      formData.append("name", partyDataInput.partyName); // Changed from party_name to name

      // Only add optional fields if they have values
      if (partyDataInput.tradeName && partyDataInput.tradeName.trim()) {
        formData.append("trade_name", partyDataInput.tradeName);
      }

      if (partyDataInput.category_id) {
        formData.append("category_id", partyDataInput.category_id);
      }

      // Only add phone_number if it's not empty
      if (cleanPhoneNumber) {
        formData.append("phone_number", cleanPhoneNumber);
      }

      // Only add email if it's not empty
      if (partyDataInput.email && partyDataInput.email.trim()) {
        formData.append("email", partyDataInput.email);
      }

      // Handle GSTIN/VAT/No Tax based on registrationType
      if (partyDataInput.registrationType === "NO_TAX") {
        formData.append("gstin", "");
        formData.append("vat", "");
        formData.append("no_tax", "true");
      } else if (partyDataInput.registrationType === "GSTIN") {
        if (partyDataInput.gstin && partyDataInput.gstin.trim()) {
          formData.append("gstin", partyDataInput.gstin);
        }
        formData.append("vat", "");
        formData.append("no_tax", "false");
      } else if (partyDataInput.registrationType === "VAT") {
        formData.append("gstin", "");
        if (partyDataInput.vat && partyDataInput.vat.trim()) {
          formData.append("vat", partyDataInput.vat);
        }
        formData.append("no_tax", "false");
      }

      // Get selected addresses
      const selectedBilling = partyDataInput.billingAddresses?.[partyDataInput.selectedBillingAddressIndex] || {};
      const selectedShipping = partyDataInput.shippingAddresses?.[partyDataInput.selectedShippingAddressIndex] || {};



      // Helper function to add field only if it has a value
      const addIfNotEmpty = (fieldName, value) => {
        if (value && value.trim && value.trim() !== '') {
          formData.append(fieldName, value);
        }
      };

      // Billing address fields
      addIfNotEmpty("billing_address", selectedBilling?.line1);
      addIfNotEmpty("city", selectedBilling?.city);
      addIfNotEmpty("state", selectedBilling?.state);
      addIfNotEmpty("pincode", selectedBilling?.pincode);
      if (selectedBilling?.country) {
        formData.append("country", selectedBilling.country);
      }

      // Shipping address fields - if same as billing, use billing address data
      if (partyDataInput.shippingAddressSameAsBilling) {

        addIfNotEmpty("shipping_address", selectedBilling?.line1);
        addIfNotEmpty("ship_city", selectedBilling?.city);
        addIfNotEmpty("ship_state", selectedBilling?.state);
        addIfNotEmpty("ship_pincode", selectedBilling?.pincode);
        if (selectedBilling?.country) {
          formData.append("ship_country", selectedBilling.country);
        }
      } else {

        addIfNotEmpty("shipping_address", selectedShipping?.line1);
        addIfNotEmpty("ship_city", selectedShipping?.city);
        addIfNotEmpty("ship_state", selectedShipping?.state);
        addIfNotEmpty("ship_pincode", selectedShipping?.pincode);
        if (selectedShipping?.country) {
          formData.append("ship_country", selectedShipping.country);
        }
      }
      formData.append(
        "opening_balance",
        parseFloat(partyDataInput.openingBalance) || 0
      );
      formData.append(
        "balance_type",
        partyDataInput.balanceType || "receivable"
      );
      formData.append(
        "credit_limit",
        parseFloat(partyDataInput.creditLimit) || 0
      );
      formData.append(
        "credit_days",
        parseInt(partyDataInput.creditPeriod) || 0
      );

      // Only add optional fields if they have values
      if (partyDataInput.panNumber && partyDataInput.panNumber.trim()) {
        formData.append("pan_number", partyDataInput.panNumber);
      }

      // Bank accounts will be saved separately after party creation
      // No need to send bank fields in party creation

      if (partyDataInput.notes && partyDataInput.notes.trim()) {
        formData.append("notes", partyDataInput.notes);
      }

      // Contact person fields

      if (partyDataInput.contactPerson?.name && partyDataInput.contactPerson.name.trim()) {
        formData.append("contact_person_name", partyDataInput.contactPerson.name);

      }
      if (partyDataInput.contactPerson?.phone && partyDataInput.contactPerson.phone.trim()) {
        formData.append("contact_person_phone", partyDataInput.contactPerson.phone);

      }

      // Add logo file if exists
      if (partyDataInput.logoFile) {
        formData.append("logo", partyDataInput.logoFile);
      }

      // Add all addresses for multi-address support
      if (partyDataInput.billingAddresses && partyDataInput.billingAddresses.length > 0) {
        formData.append("billingAddresses", JSON.stringify(partyDataInput.billingAddresses));
      }
      if (partyDataInput.shippingAddresses && partyDataInput.shippingAddresses.length > 0) {
        formData.append("shippingAddresses", JSON.stringify(partyDataInput.shippingAddresses));
      }

      // Add selected indices
      formData.append("selectedBillingAddressIndex", partyDataInput.selectedBillingAddressIndex || 0);
      formData.append("selectedShippingAddressIndex", partyDataInput.selectedShippingAddressIndex || 0);

      // Log all FormData entries for debugging

      for (let pair of formData.entries()) {

      }

      const result = await partyAPI.createWithFile(formData);


      // Save bank accounts separately if they exist
      if (partyDataInput.bankAccounts && partyDataInput.bankAccounts.length > 0 && result.data?.id) {

        const selectedBusinessId = localStorage.getItem("selectedBusinessId");

        for (const bankAccount of partyDataInput.bankAccounts) {
          // Only save if bank account has required fields
          if (bankAccount.bankName && bankAccount.accountNumber) {
            try {
              await partyAPI.addBankAccount(result.data.id, {
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber,
                ifsc: bankAccount.ifsc || '',
                branch: bankAccount.branch || '',
                accountHolderName: bankAccount.accountHolder || '',
              }, selectedBusinessId);

            } catch (bankError) {
              console.error("Error saving bank account:", bankError);
            }
          }
        }
      }

      showToast({
        title: "Created",
        text: `Party "${partyDataInput.partyName}" created successfully! Ready for next entry.`,
        icon: "success",
      });

      // Refresh parties list
      await fetchParties();

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent("partyChanged"));

      setViewMode("list");
    } catch (error) {
      console.error("Error creating party:", error);
      console.error("Error response:", error.response?.data);

      // Log validation errors if present
      if (error.response?.data?.errors) {
        console.error("Validation errors:", error.response.data.errors);
      }

      // Handle specific business validation error
      if (error.response?.data?.code === "NO_BUSINESS_FOUND") {
        showCustomDialog(`
            <div style="text-align: left; padding: 10px 0;">
              <p style="margin-bottom: 15px; color: #374151; font-size: 15px;">
                You need to create a business first before adding parties.
              </p>
              <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 500;">
                  💼 Parties are associated with your business
                </p>
              </div>
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                Would you like to create a business now?
              </p>
            </div>
          `, {
          title: "Business Required",
          confirmButtonText: "Create Business",
          allowOutsideClick: false,
          allowEscapeKey: true,
        }).then((result) => {
          if (result.isConfirmed) {
            // Navigate to business management with create parameter
            window.location.href =
              "/admin/settings/business-management?create=true";
          }
        });
        return;
      }

      // Handle other errors
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create party";
      showToast({
        title: "Error",
        text: errorMessage,
        icon: "error",
      });
    }
  };

  const onEditParty = (partyOrId) => {
    const partyObj =
      typeof partyOrId === "object" && partyOrId !== null
        ? partyOrId
        : partyData.find((p) => String(p.id) === String(partyOrId));

    if (!partyObj) {
      showErrorModal("Could not open editor: party not found.");
      return;
    }

    // Use arrays from backend if available, otherwise fallback to single address
    const billingAddresses = partyObj.billingAddresses && partyObj.billingAddresses.length > 0
      ? partyObj.billingAddresses
      : [
        partyObj.billingAddress
          ? typeof partyObj.billingAddress === "string"
            ? {
              line1: partyObj.billingAddress,
              city: partyObj.city || "",
              state: partyObj.state || "",
              pincode: partyObj.pincode || "",
              country: partyObj.country || "India",
            }
            : { ...partyObj.billingAddress }
          : { line1: "", city: "", state: "", pincode: "", country: "" }
      ];

    const shippingAddresses = partyObj.shippingAddresses && partyObj.shippingAddresses.length > 0
      ? partyObj.shippingAddresses
      : [
        partyObj.shippingAddress
          ? typeof partyObj.shippingAddress === "string"
            ? {
              line1: partyObj.shippingAddress,
              city: partyObj.ship_city || "",
              state: partyObj.ship_state || "",
              pincode: partyObj.ship_pincode || "",
              country: partyObj.ship_country || "India",
            }
            : { ...partyObj.shippingAddress }
          : { line1: "", city: "", state: "", pincode: "", country: "" }
      ];

    // Determine selected billing index based on bill_to_id
    let selectedBillingAddressIndex = 0;
    if (partyObj.bill_to_id) {
      const idx = billingAddresses.findIndex(a => a.id === partyObj.bill_to_id);
      if (idx !== -1) selectedBillingAddressIndex = idx;
    }

    // Determine selected shipping index based on ship_to_id
    let selectedShippingAddressIndex = 0;
    if (partyObj.ship_to_id) {
      const idx = shippingAddresses.findIndex(a => a.id === partyObj.ship_to_id);
      if (idx !== -1) selectedShippingAddressIndex = idx;
    }

    const normalized = {
      ...partyObj,
      billingAddresses: billingAddresses,
      selectedBillingAddressIndex: selectedBillingAddressIndex,
      shippingAddresses: shippingAddresses,
      selectedShippingAddressIndex: selectedShippingAddressIndex,
    };

    setEditData({ ...normalized });
    setViewMode("edit");
  };

  const handleUpdateParty = async (updatedData) => {
    const idToUpdate = updatedData.id;
    if (!idToUpdate) {
      showErrorModal("Failed to update — missing id");
      return;
    }

    try {
      // Import partyAPI from utils
      const { partyAPI } = await import("../../../utils/api.js");

      const businessId = localStorage.getItem("selectedBusinessId")
        ? parseInt(localStorage.getItem("selectedBusinessId"))
        : null;

      // Clean phone number - remove non-digits but keep '+'
      const cleanPhoneNumber = (updatedData.mobileNumber || "").replace(/[^\d+]/g, "");

      // Check if there's a logo file to upload
      if (updatedData.logoFile) {


        // Use FormData for file upload
        const formData = new FormData();

        // Add business data
        formData.append("business_id", businessId);
        formData.append(
          "party_type",
          updatedData.partyType === "other"
            ? updatedData.otherPartyType
            : updatedData.partyType.toLowerCase()
        );
        formData.append("name", updatedData.partyName);

        // Only add optional fields if they have values
        if (updatedData.tradeName && updatedData.tradeName.trim()) {
          formData.append("trade_name", updatedData.tradeName);
        }

        if (updatedData.category_id) {
          formData.append("category_id", updatedData.category_id);
        }

        // Only add phone_number if it's not empty
        if (cleanPhoneNumber) {
          formData.append("phone_number", cleanPhoneNumber);
        }

        // Add all addresses for multi-address support
        if (updatedData.billingAddresses && updatedData.billingAddresses.length > 0) {
          formData.append("billingAddresses", JSON.stringify(updatedData.billingAddresses));
        }
        if (updatedData.shippingAddresses && updatedData.shippingAddresses.length > 0) {
          formData.append("shippingAddresses", JSON.stringify(updatedData.shippingAddresses));
        }

        // Only add email if it's not empty
        if (updatedData.email && updatedData.email.trim()) {
          formData.append("email", updatedData.email);
        }

        // Add GSTIN/VAT fields based on registrationType
        if (updatedData.registrationType === "NO_TAX") {
          formData.append("gstin", "");
          formData.append("vat", "");
          formData.append("no_tax", "true");
        } else if (updatedData.registrationType === "GSTIN") {
          if (updatedData.gstin && updatedData.gstin.trim()) {
            formData.append("gstin", updatedData.gstin);
          }
          formData.append("vat", "");
          formData.append("no_tax", "false");
        } else if (updatedData.registrationType === "VAT") {
          formData.append("gstin", "");
          if (updatedData.vat && updatedData.vat.trim()) {
            formData.append("vat", updatedData.vat);
          }
          formData.append("no_tax", "false");
        }

        // Get selected addresses
        const selectedBilling = updatedData.billingAddresses?.[updatedData.selectedBillingAddressIndex] || {};
        const selectedShipping = updatedData.shippingAddresses?.[updatedData.selectedShippingAddressIndex] || {};

        // Helper function to add field only if it has a value
        const addIfNotEmpty = (fieldName, value) => {
          if (value && value.trim && value.trim() !== '') {
            formData.append(fieldName, value);
          }
        };

        // Billing address fields
        addIfNotEmpty("billing_address", selectedBilling?.line1);
        addIfNotEmpty("city", selectedBilling?.city);
        addIfNotEmpty("state", selectedBilling?.state);
        addIfNotEmpty("pincode", selectedBilling?.pincode);
        if (selectedBilling?.country) {
          formData.append("country", selectedBilling.country);
        }

        // Shipping address fields
        addIfNotEmpty("shipping_address", selectedShipping?.line1);
        addIfNotEmpty("ship_city", selectedShipping?.city);
        addIfNotEmpty("ship_state", selectedShipping?.state);
        addIfNotEmpty("ship_pincode", selectedShipping?.pincode);
        if (selectedShipping?.country) {
          formData.append("ship_country", selectedShipping.country);
        }

        formData.append("opening_balance", parseFloat(updatedData.openingBalance) || 0);
        formData.append("balance_type", updatedData.balanceType || "receivable");
        formData.append("credit_limit", parseFloat(updatedData.creditLimit) || 0);
        formData.append("credit_days", parseInt(updatedData.creditPeriod) || 0);

        // Only add optional fields if they have values
        if (updatedData.panNumber && updatedData.panNumber.trim()) {
          formData.append("pan_number", updatedData.panNumber);
        }

        // Add selected indices
        formData.append("selectedBillingAddressIndex", updatedData.selectedBillingAddressIndex || 0);
        formData.append("selectedShippingAddressIndex", updatedData.selectedShippingAddressIndex || 0);
        if (updatedData.bankAccounts?.[0]?.bankName && updatedData.bankAccounts[0].bankName.trim()) {
          formData.append("bank_name", updatedData.bankAccounts[0].bankName);
        }
        if (updatedData.bankAccounts?.[0]?.branch && updatedData.bankAccounts[0].branch.trim()) {
          formData.append("bank_branch", updatedData.bankAccounts[0].branch);
        }
        if (updatedData.bankAccounts?.[0]?.accountNumber && updatedData.bankAccounts[0].accountNumber.trim()) {
          formData.append("account_number", updatedData.bankAccounts[0].accountNumber);
        }
        if (updatedData.bankAccounts?.[0]?.ifsc && updatedData.bankAccounts[0].ifsc.trim()) {
          formData.append("ifsc_code", updatedData.bankAccounts[0].ifsc);
        }
        if (updatedData.notes && updatedData.notes.trim()) {
          formData.append("notes", updatedData.notes);
        }

        // Contact person fields
        if (updatedData.contactPerson?.name && updatedData.contactPerson.name.trim()) {
          formData.append("contact_person_name", updatedData.contactPerson.name);

        }
        if (updatedData.contactPerson?.phone && updatedData.contactPerson.phone.trim()) {
          formData.append("contact_person_phone", updatedData.contactPerson.phone);

        } else {

        }

        // Add logo file
        formData.append("logo", updatedData.logoFile);

        const result = await partyAPI.updateWithFile(
          idToUpdate,
          formData,
          businessId
        );

      } else {


        // Regular JSON update without file
        const selectedBilling = updatedData.billingAddresses?.[updatedData.selectedBillingAddressIndex] || {};
        const selectedShipping = updatedData.shippingAddresses?.[updatedData.selectedShippingAddressIndex] || {};

        const updateData = {
          business_id: businessId,
          party_type:
            updatedData.partyType === "other"
              ? updatedData.otherPartyType
              : updatedData.partyType.toLowerCase(),
          name: updatedData.partyName,
          // Other fields
          opening_balance: parseFloat(updatedData.openingBalance) || 0,
          balance_type: updatedData.balanceType || "receivable",
          credit_limit: parseFloat(updatedData.creditLimit) || 0,
          credit_days: parseInt(updatedData.creditPeriod) || 0,
          billingAddresses: updatedData.billingAddresses,
          shippingAddresses: updatedData.shippingAddresses,
          selectedBillingAddressIndex: updatedData.selectedBillingAddressIndex || 0,
          selectedShippingAddressIndex: updatedData.selectedShippingAddressIndex || 0,
        };

        // Only add optional fields if they have values
        if (updatedData.tradeName && updatedData.tradeName.trim()) {
          updateData.trade_name = updatedData.tradeName;
        }
        if (updatedData.category_id) {
          updateData.category_id = updatedData.category_id;
        }
        // Add GSTIN/VAT fields based on registrationType
        if (updatedData.registrationType === "NO_TAX") {
          updateData.gstin = "";
          updateData.vat = "";
          updateData.no_tax = true;
        } else if (updatedData.registrationType === "GSTIN") {
          updateData.gstin = updatedData.gstin && updatedData.gstin.trim() ? updatedData.gstin : "";
          updateData.vat = "";
          updateData.no_tax = false;
        } else if (updatedData.registrationType === "VAT") {
          updateData.gstin = "";
          updateData.vat = updatedData.vat && updatedData.vat.trim() ? updatedData.vat : "";
          updateData.no_tax = false;
        }
        if (updatedData.panNumber && updatedData.panNumber.trim()) {
          updateData.pan_number = updatedData.panNumber;
        }
        if (updatedData.notes && updatedData.notes.trim()) {
          updateData.notes = updatedData.notes;
        }

        // Billing address fields - only add if not empty
        if (selectedBilling?.line1 && selectedBilling.line1.trim()) {
          updateData.billing_address = selectedBilling.line1;
        }
        if (selectedBilling?.city && selectedBilling.city.trim()) {
          updateData.city = selectedBilling.city;
        }
        if (selectedBilling?.state && selectedBilling.state.trim()) {
          updateData.state = selectedBilling.state;
        }
        if (selectedBilling?.pincode && selectedBilling.pincode.trim()) {
          updateData.pincode = selectedBilling.pincode;
        }
        if (selectedBilling?.country) {
          updateData.country = selectedBilling.country;
        }

        // Shipping address fields - only add if not empty
        if (selectedShipping?.line1 && selectedShipping.line1.trim()) {
          updateData.shipping_address = selectedShipping.line1;
        }
        if (selectedShipping?.city && selectedShipping.city.trim()) {
          updateData.ship_city = selectedShipping.city;
        }
        if (selectedShipping?.state && selectedShipping.state.trim()) {
          updateData.ship_state = selectedShipping.state;
        }
        if (selectedShipping?.pincode && selectedShipping.pincode.trim()) {
          updateData.ship_pincode = selectedShipping.pincode;
        }
        if (selectedShipping?.country) {
          updateData.ship_country = selectedShipping.country;
        }

        // Bank accounts will be handled separately after party update
        // No need to send bank fields in party update

        // Contact person fields - only add if not empty
        if (updatedData.contactPerson?.name && updatedData.contactPerson.name.trim()) {
          updateData.contact_person_name = updatedData.contactPerson.name;

        }
        if (updatedData.contactPerson?.phone && updatedData.contactPerson.phone.trim()) {
          updateData.contact_person_phone = updatedData.contactPerson.phone;

        } else {

        }

        // Only add phone_number if it's not empty
        if (cleanPhoneNumber) {
          updateData.phone_number = cleanPhoneNumber;
        }

        // Only add email if it's not empty
        if (updatedData.email && updatedData.email.trim()) {
          updateData.email = updatedData.email;
        }

        // Execute JSON update
        const result = await partyAPI.update(idToUpdate, updateData, businessId);

        // Handle bank accounts separately
        if (updatedData.bankAccounts && updatedData.bankAccounts.length > 0) {


          // Get existing bank accounts
          const existingBanks = await partyAPI.getBankAccounts(idToUpdate, businessId);
          const existingBankIds = existingBanks.data?.map(b => b.id) || [];

          // Track which bank IDs are in the updated data
          const updatedBankIds = [];

          for (const bankAccount of updatedData.bankAccounts) {
            // Only process if bank account has required fields
            if (bankAccount.bankName && bankAccount.accountNumber) {
              try {
                if (bankAccount.id) {
                  // Update existing bank account
                  await partyAPI.updateBankAccount(idToUpdate, bankAccount.id, {
                    bankName: bankAccount.bankName,
                    accountNumber: bankAccount.accountNumber,
                    ifsc: bankAccount.ifsc || '',
                    branch: bankAccount.branch || '',
                    accountHolderName: bankAccount.accountHolder || '',
                  }, businessId);
                  updatedBankIds.push(bankAccount.id);

                } else {
                  // Add new bank account
                  const newBank = await partyAPI.addBankAccount(idToUpdate, {
                    bankName: bankAccount.bankName,
                    accountNumber: bankAccount.accountNumber,
                    ifsc: bankAccount.ifsc || '',
                    branch: bankAccount.branch || '',
                    accountHolderName: bankAccount.accountHolder || '',
                  }, businessId);

                }
              } catch (bankError) {
                console.error("Error saving bank account:", bankError);
              }
            }
          }

          // Delete bank accounts that were removed
          for (const existingId of existingBankIds) {
            if (!updatedBankIds.includes(existingId)) {
              try {
                await partyAPI.deleteBankAccount(idToUpdate, existingId, businessId);

              } catch (deleteError) {
                console.error("Error deleting bank account:", deleteError);
              }
            }
          }
        }
      }

      showToast({
        title: "Updated",
        text: `Party "${updatedData.partyName}" updated successfully!`,
        icon: "success",
      });

      // Refresh parties list
      await fetchParties();

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent("partyChanged"));

      setEditData(null);
      setViewMode("list");
    } catch (error) {
      console.error("Error updating party:", error);
      showToast({
        title: "Error",
        text: error.message || "Failed to update party",
        icon: "error",
      });
    }
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const onDeleteParty = (partyOrId) => {
    // Map ID or Party to full Party Object if possible
    const partyObj =
      typeof partyOrId === "object" && partyOrId !== null
        ? partyOrId
        : partyData.find((p) => String(p.id) === String(partyOrId));

    if (!partyObj || !partyObj.id) {
      showErrorModal("Unable to delete \u2014 invalid party.");
      return;
    }

    setPartyToDelete(partyObj);
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const handleHardDeleteParty = async () => {
    if (!partyToDelete || deleteConfirmText !== `Delete ${partyToDelete.partyName}`) return;

    showLoadingModal("Deleting permanently...");

    try {
      const { partyAPI } = await import("../../../utils/api.js");
      const businessId = localStorage.getItem("selectedBusinessId");

      await partyAPI.hardDelete(partyToDelete.id, businessId);

      closeModal();
      showToast({
        title: "Deleted",
        text: `Permanently deleted ${partyToDelete.partyName}`,
        icon: "success",
      });

      // Refresh parties list
      await fetchParties();

      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent("partyChanged"));

      if (selectedParty && String(selectedParty.id) === String(partyToDelete.id)) {
        setSelectedParty(null);
        setViewMode("list");
      }

      setDeleteModalOpen(false);
      setPartyToDelete(null);
    } catch (err) {
      closeModal();
      showErrorModal({
        title: "Error",
        text: err?.message || "Could not delete party.",
      });
    }
  };


  /* --------- Edit/Create view --------- */
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="mt-4 min-h-screen w-full">
        <PartyForm
          categories={categories}
          onCreateCategory={handleCreateCategory}
          initialData={viewMode === "edit" ? editData : null}
          onCancel={() => {
            setEditData(null);
            setViewMode("list");
          }}
          onSave={viewMode === "edit" ? handleUpdateParty : handleCreateParty}
          isEdit={viewMode === "edit"}
          currency={currency}
        />
      </div>
    );
  }



  /* --------- Detail view --------- */
  if (viewMode === "detail" && selectedParty) {
    return (
      <div className="mt-4 min-h-screen w-full">
        <PartyDetail
          party={selectedParty}
          allParties={partyData}
          currency={currency}
          formatCurrencyDisplay={formatCurrencyDisplay}
          onSelectParty={(p) => {
            const billingAddr = typeof p.billingAddress === "string"
              ? {
                line1: p.billingAddress,
                city: "",
                state: "",
                pincode: "",
                country: "",
              }
              : {
                line1: "",
                city: "",
                state: "",
                pincode: "",
                country: "",
                ...(p.billingAddress || {}),
              };

            const shippingAddrs = Array.isArray(p.shippingAddresses)
              ? p.shippingAddresses
              : [p.shippingAddress || defaultAddress];

            const selectedShippingIdx = p.selectedShippingAddressIndex || 0;
            const shippingAddr = shippingAddrs[selectedShippingIdx] || defaultAddress;

            // Check if billing and shipping addresses are the same
            const isSameAddress =
              billingAddr.line1 === shippingAddr.line1 &&
              billingAddr.city === shippingAddr.city &&
              billingAddr.state === shippingAddr.state &&
              billingAddr.pincode === shippingAddr.pincode &&
              billingAddr.country === shippingAddr.country;

            const normalized = {
              ...p,
              address: p.address || "",
              billingAddress: billingAddr,
              shippingAddresses: shippingAddrs,
              selectedShippingAddressIndex: selectedShippingIdx,
              shippingAddressSameAsBilling:
                p.shippingAddressSameAsBilling !== undefined
                  ? p.shippingAddressSameAsBilling
                  : isSameAddress,
            };
            setSelectedParty(normalized);
          }}
          onBack={() => {
            setSelectedParty(null);
            setViewMode("list");
          }}
          onEdit={() => onEditParty(selectedParty)}
          onDelete={() => onDeleteParty(selectedParty)}
        />
      </div>
    );
  }

  if (loading) {
    return <MainLoader message="Loading parties..." />;
  }

  /* --------- List view (table + mobile) --------- */
  return (
    <div className="mt-4 h-auto w-full rounded-lg border-1 border-yellow-200 flex flex-col relative">
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0">
          {/* Mobile Header - Back Button and New Button */}
          <div className="md:hidden flex items-center justify-between p-3 bg-white border-b border-gray-200 rounded-t-xl">
            <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
            <button
              onClick={() => checkBusiness(() => setViewMode("create"))}
              className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 w-full p-2 bg-white border-b border-gray-200 md:rounded-t-xl">
            <div className="hidden md:block">
              <DashboardBackButton />
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="w-full max-w-xs">
                <CategorySelectInput
                  categories={categories}
                  value={filters.category_id}
                  onChange={(val) => handleFilterChange("category_id", val)}
                />
              </div>

              <div className="hidden md:block">
                <button
                  onClick={() => checkBusiness(() => setViewMode("create"))}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 font-bold" /> New
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Empty State */}
            {!loading && partyData.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <GeneralEmptyState
                  title="No Parties Found"
                  description="You haven't added any parties yet. Start by adding your first customer or vendor to manage their transactions."
                  buttonText="Add Your First Party"
                  onButtonClick={() => checkBusiness(() => setViewMode("create"))}
                  icon={Users}
                />
              </div>
            )}

            {/* Mobile View */}
            {partyData.length > 0 && (
              <div className="md:hidden p-4 space-y-3">
                {filteredParties.map((party) => (
                  <div
                    key={party.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      const normalized = {
                        ...party,
                        address: party.address || "",
                        billingAddress:
                          typeof party.billingAddress === "string"
                            ? {
                              line1: party.billingAddress,
                              city: "",
                              state: "",
                              pincode: "",
                              country: "",
                            }
                            : {
                              line1: "",
                              city: "",
                              state: "",
                              pincode: "",
                              country: "",
                              ...(party.billingAddress || {}),
                            },
                        shippingAddresses: Array.isArray(party.shippingAddresses)
                          ? party.shippingAddresses
                          : [party.shippingAddress || defaultAddress],
                        selectedShippingAddressIndex:
                          party.selectedShippingAddressIndex || 0,
                        shippingAddressSameAsBilling:
                          party.shippingAddressSameAsBilling || false,
                      };
                      setSelectedParty(normalized);
                      setViewMode("detail");
                    }}
                  >
                    {/* Header Row - Only Party Name and Type */}
                    <div className="flex items-center gap-3 mb-4">
                      {party.logo ? (
                        <img
                          src={getImageURL(party.logo)}
                          alt="Party Logo"
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base truncate">
                          <span>{party.partyName}</span>
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-700">
                            <span>{party.partyType}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Table-like Details Grid - 3 Row Layout */}
                    <div className="space-y-3 mb-4">
                      {/* Row 1: Category and Mobile Number */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Category
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f3c117]/10 text-[#f3c117] border border-[#f3c117]/20">
                              <span>{party.category || "-"}</span>
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Mobile Number
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            <span translate="no"><span>{formatPhoneNumber(party.mobileNumber)}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Email and Party Type */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Email
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            <span>{party.email || "-"}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Party Type
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            <span>{party.partyType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Balance and Action Buttons */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Balance
                          </div>
                          <div className="flex items-center justify-start">
                            <span
                              translate="no"
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${party.balance >= 0
                                ? "text-green-600 bg-green-50 border border-green-200"
                                : "text-red-600 bg-red-50 border border-red-200"
                                }`}
                            >
                              <span>{formatCurrencyDisplay(party.balance)}</span>
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                            Actions
                          </div>
                          <div className="flex items-center justify-start gap-1">
                            <ActionButtons
                              onView={() => {
                                const normalized = {
                                  ...party,
                                  address: party.address || "",
                                  billingAddress:
                                    typeof party.billingAddress === "string"
                                      ? {
                                        line1: party.billingAddress,
                                        city: "",
                                        state: "",
                                        pincode: "",
                                        country: "",
                                      }
                                      : {
                                        line1: "",
                                        city: "",
                                        state: "",
                                        pincode: "",
                                        country: "",
                                        ...(party.billingAddress || {}),
                                      },
                                  shippingAddresses: Array.isArray(
                                    party.shippingAddresses
                                  )
                                    ? party.shippingAddresses
                                    : [party.shippingAddress || defaultAddress],
                                  selectedShippingAddressIndex:
                                    party.selectedShippingAddressIndex || 0,
                                  shippingAddressSameAsBilling:
                                    party.shippingAddressSameAsBilling || false,
                                };
                                setSelectedParty(normalized);
                                setViewMode("detail");
                              }}
                              onEdit={() => onEditParty(party)}
                              onDelete={() => onDeleteParty(party)}
                              actions={['view', 'edit', 'delete']}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filteredParties.length === 0 && (
              <div className="md:hidden p-4">
                <GeneralEmptyState
                  title="No Parties Found"
                  description="No parties match your search or category filter. Try adjusting them or add a new party."
                />
              </div>
            )}

            {/* Desktop View */}
            {partyData.length > 0 && (
              <div className="hidden md:block max-h-full overflow-y-auto">
                <ReusableTable
                  columns={[
                    {
                      key: "partyName",
                      title: "Party Name",
                      sortable: true,
                      width: "100%",
                      render: (r) => (
                        <div className="flex items-center gap-3">
                          {r.logo ? (
                            <img
                              src={getImageURL(r.logo)}
                              alt="Party Logo"
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-[#1fbe5a] rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              <span>{r.partyName}</span>
                            </span>
                            {r.tradeName && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                <span>{r.tradeName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "category",
                      title: "Category",
                      sortable: true,
                      width: "auto",
                      render: (r) => (
                        <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          <span>{r.category}</span>
                        </span>
                      ),
                    },
                    {
                      key: "mobileNumber",
                      title: "Mobile Number",
                      sortable: true,
                      width: "auto",
                      render: (r) => <span translate="no"><span>{formatPhoneNumber(r.mobileNumber)}</span></span>,
                    },
                    {
                      key: "email",
                      title: "Email",
                      sortable: false,
                      width: "auto",
                      render: (r) => <span>{r.email || "-"}</span>,
                    },
                    {
                      key: "partyType",
                      title: "Party Type",
                      sortable: true,
                      width: "auto",
                      render: (r) => <span className=""><span>{r.partyType}</span></span>,
                    },
                    {
                      key: "balance",
                      title: "Balance",
                      align: "right",
                      sortable: true,
                      width: "auto",
                      render: (r) => (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${r.balance >= 0
                            ? "text-green-600 bg-green-50 border border-green-200"
                            : "text-red-600 bg-red-50 border border-red-200"
                            }`}
                        >
                          <span translate="no"><span>{formatCurrencyDisplay(r.balance)}</span></span>
                        </span>
                      ),
                    },
                  ]}
                  data={filteredParties}
                  rowKey="id"
                  defaultPageSize={10}
                  pageSizeOptions={[5, 10, 15, 20]}
                  searchable={true}
                  onRowClick={(row) => {
                    const normalized = {
                      ...row,
                      address: row.address || "",
                      billingAddress:
                        typeof row.billingAddress === "string"
                          ? {
                            line1: row.billingAddress,
                            city: "",
                            state: "",
                            pincode: "",
                            country: "",
                          }
                          : {
                            line1: "",
                            city: "",
                            state: "",
                            pincode: "",
                            country: "",
                            ...(row.billingAddress || {}),
                          },
                      shippingAddress:
                        typeof row.shippingAddress === "string"
                          ? {
                            line1: row.shippingAddress,
                            city: "",
                            state: "",
                            pincode: "",
                            country: "",
                          }
                          : {
                            line1: "",
                            city: "",
                            state: "",
                            pincode: "",
                            country: "",
                            ...(row.shippingAddress || {}),
                          },
                    };
                    setSelectedParty(normalized);
                    setViewMode("detail");
                  }}
                  onEdit={(row) => onEditParty(row)}
                  onDelete={(row) => onDeleteParty(row)}
                  emptyState={
                    <GeneralEmptyState
                      title="No Parties Found"
                      description="No parties match your search or category filter. Try adjusting them or add a new party."
                    />
                  }
                />
              </div>
            )}
          </div>
        </div>

        <CreateCategoryModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleSaveCategory}
        />

        {/* GitHub Style Hard Delete Modal */}
        {deleteModalOpen && partyToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 transition-opacity">
            <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden relative">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/80">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Delete {partyToDelete.partyName}
                </h3>
                <button
                  onClick={() => { setDeleteModalOpen(false); setPartyToDelete(null); }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1 rounded-md transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  All related data will be <strong>deleted</strong>. Are you sure you want to delete this party?
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Please type <strong>"Delete {partyToDelete.partyName}"</strong> to confirm.
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  disabled={deleteConfirmText !== `Delete ${partyToDelete.partyName}`}
                  onClick={handleHardDeleteParty}
                  className="w-full py-2 bg-[#dc2626] text-white text-sm font-medium rounded-md shadow-sm hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Delete this party
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
