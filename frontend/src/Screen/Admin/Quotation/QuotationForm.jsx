import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import { Plus, X, ArrowLeft, Settings, Edit2, FileText, Trash2, Building, Edit3, ChevronDown, Upload, Lock, Unlock, Search, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { getApiConfig, partyAPI, quotationAPI, businessAPI, apiRequest, termsConditionsAPI, inventoryAPI, categoryAPI, bookPurchaseOrderAPI, purchaseOrderAPI } from "../../../utils/api.js";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showErrorModal, showSuccessModal, showConfirmationDialog, showPremiumInputDialog } from "../../../Components/ActionMessageModel.jsx";
import PartyModal from "../Parties/AddPartyPopupModal.jsx";
import TextEditorModal from "../../../Components/TextEditorModal.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import { STATE_OPTIONS, getUnitOptions, DEFAULT_UNIT_OPTIONS, COUNTRY_PHONE_CODES } from "../../../utils/dropdownOptions.js";
import { calculateAutoTaxType } from "../../../utils/autoTaxCalculation.js";
import { convertAmount, getCurrencySymbol, convertToINR } from "../../../utils/currency.js";
import { getGeolocationFromIP } from "../../../utils/geolocationService.js";

/* ---------- CSS ANIMATIONS ---------- */
const bounceAnimationStyle = `
  @keyframes uploadBounce {
    0%, 100% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(25%);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
  
  .upload-bounce-animation {
    animation: uploadBounce 0.6s ease-in-out;
    animation-iteration-count: 2;
    animation-delay: 0s;
  }
  
  .upload-bounce-repeat {
    animation: uploadBounce 0.6s ease-in-out 2;
  }
`;

/* ---------- TERMS LIST STYLING ---------- */
const termsListStyles = `
  .terms-content {
    line-height: 1.6;
  }
  
  .terms-content ul, .terms-content ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
    display: block;
  }
  
  .terms-content ul li, .terms-content ol li {
    margin: 0.25em 0;
    display: list-item;
    list-style-position: outside;
  }
  
  .terms-content ul {
    list-style-type: disc;
  }
  
  .terms-content ul ul {
    list-style-type: circle;
    margin-left: 1em;
  }
  
  .terms-content ul ul ul {
    list-style-type: square;
    margin-left: 1em;
  }
  
  .terms-content ol {
    list-style-type: decimal;
  }
  
  .terms-content ol ol {
    list-style-type: lower-alpha;
    margin-left: 1em;
  }
  
  .terms-content ol ol ol {
    list-style-type: lower-roman;
    margin-left: 1em;
  }
  
  .terms-content p {
    margin: 0.5em 0;
    display: block;
  }
  
  .terms-content strong {
    font-weight: 600;
    color: #1f2937;
  }
  
  .terms-content em {
    font-style: italic;
  }
  
  .terms-content u {
    text-decoration: underline;
  }
  
  .terms-content a {
    color: #129046;
    text-decoration: underline;
  }
  
  .terms-content code {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }
  
  .terms-content blockquote {
    border-left: 4px solid #129046;
    padding-left: 1em;
    margin-left: 0;
    color: #6b7280;
  }
  
  .terms-content hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1em 0;
  }
`;

// Inject the styles
// Inject styles safely
const StyleInjector = () => {
  useEffect(() => {
    const styleId = "upload-bounce-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = bounceAnimationStyle + termsListStyles;
      document.head.appendChild(style);
    }
  }, []);
  return null;
};

/* ---------- HELPERS ---------- */
const formatAddressString = (fields) => {
  return fields
    .filter(f => f && String(f).toLowerCase() !== "null" && String(f).trim() !== "")
    .join(", ");
};


/* ---------- HELPERS ---------- */

// Simple State Dropdown Component
function SimpleStateDropdown({ value, onChange, placeholder = "Select State" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleStateSelect = (stateId) => {
    onChange(stateId);
    setIsOpen(false);
  };

  const selectedStateName = STATE_OPTIONS.find((s) => s.id === value)?.label || placeholder;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm text-left bg-white hover:border-[#129046] transition-colors flex items-center justify-between"
      >
        <span className={value ? "text-gray-800" : "text-gray-500"}>
          <span>{selectedStateName}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#129046] rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {STATE_OPTIONS.map((state) => (
            <button
              key={state.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleStateSelect(state.id);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${value === state.id
                ? "bg-[#129046] text-white"
                : "hover:bg-[#129046]/10"
                }`}
            >
              {state.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- HELPERS ---------- */

const calculateDueDate = (d, days) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  dt.setDate(dt.getDate() + Number(days || 0));
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

/* ---------------- Billing Address Modal (Universal Standardization) ---------------- */
function BillingAddressModal({ open, onClose, billingAddress, onSave }) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const [formData, setFormData] = useState({
    attention: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    fax: "",
  });
  const [manualAddressEdits, setManualAddressEdits] = useState({
    city: false,
    state: false,
    country: false,
  });
  const [phoneCode, setPhoneCode] = useState("+91");

  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [dropdowns, setDropdowns] = useState({});

  // Search terms for dropdowns
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const [pincodeLoading, setPincodeLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        attention: billingAddress?.attention || "",
        line1: billingAddress?.line1 || "",
        line2: billingAddress?.line2 || "",
        city: billingAddress?.city || "",
        state: billingAddress?.state || "",
        pincode: billingAddress?.pincode || "",
        country: billingAddress?.country || "India",
        phone: billingAddress?.phone || "",
        fax: billingAddress?.fax || "",
      });
      // Reset search terms, phone code and dropdowns
      setPhoneCode(billingAddress?.phoneCode || "+91");
      setManualAddressEdits({
        city: false,
        state: false,
        country: false
      });
      setCountrySearch("");
      setStateSearch("");
      setCitySearch("");
      setDropdowns({});
      fetchAllCountries();
    }
  }, [open, billingAddress]);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/iso');
      const data = await response.json();
      if (!data.error) {
        setAllCountries(data.data.map(c => ({ label: c.name, value: c.name })));
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch states when country changes
  useEffect(() => {
    if (formData.country) {
      fetchStates(formData.country);
    }
  }, [formData.country]);

  const fetchStates = async (countryName) => {
    try {
      setLoadingStates(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const data = await response.json();
      if (!data.error) {
        setStateOptions(data.data.states.map(s => ({ label: s.name, value: s.name })));
      } else {
        setStateOptions([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setStateOptions([]);
    } finally {
      setLoadingStates(false);
    }
  };

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.country && formData.state) {
      fetchCities(formData.country, formData.state);
    }
  }, [formData.country, formData.state]);

  const fetchCities = async (countryName, stateName) => {
    try {
      setLoadingCities(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const data = await response.json();
      if (!data.error) {
        setCityOptions(data.data.map(c => ({ label: c, value: c })));
      } else {
        setCityOptions([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = async (value) => {
    setFormData(prev => ({ ...prev, pincode: value }));
    if (value.length >= 3) {
      try {
        setPincodeLoading(true);
        const response = await businessAPI.getCityByPincode(value);
        if (response.success && response.data) {
          const { city, state, country } = response.data;
          setFormData(prev => ({
            ...prev,
            city: (!manualAddressEdits.city && city) ? city : prev.city,
            state: (!manualAddressEdits.state && state) ? state : prev.state,
            country: (!manualAddressEdits.country && country) ? country : prev.country
          }));
        }
      } catch (error) {
        console.error('Error fetching address from pincode:', error);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      await onSave({ ...formData, phoneCode });
      onClose();
    } catch (err) {
      console.error("Error in Modal handleSave:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-base font-bold text-white"><span>Billing Address</span></h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20">
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-gray-800">
          {/* Attention */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Receipt Name / Attention</label>
            <input
              type="text"
              value={formData.attention}
              onChange={(e) => setFormData(prev => ({ ...prev, attention: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Enter attention name"
            />
          </div>

          {/* Country */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Country/Region *</label>
            <input
              type="text"
              value={dropdowns.country ? countrySearch : (formData.country || "")}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setFormData(prev => ({ ...prev, country: e.target.value }));
                setManualAddressEdits(prev => ({ ...prev, country: true }));
                setDropdowns(prev => ({ ...prev, country: true }));
              }}
              onFocus={() => {
                setCountrySearch("");
                setDropdowns(prev => ({ ...prev, country: true }));
              }}
              onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, country: false })), 150)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Select country"
            />
            {dropdowns.country && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                {allCountries
                  .filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map((country, idx) => (
                    <button
                      key={idx}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, country: country.value, state: "", city: "" }));
                        setManualAddressEdits(prev => ({ ...prev, country: true }));
                        setDropdowns(prev => ({ ...prev, country: false }));
                      }}
                    >
                      <span>{country.label}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Address</label>
            <textarea
              value={formData.line1}
              onChange={(e) => setFormData(prev => ({ ...prev, line1: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all resize-none"
              placeholder="Street 1"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <textarea
              value={formData.line2}
              onChange={(e) => setFormData(prev => ({ ...prev, line2: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all resize-none"
              placeholder="Street 2"
            />
          </div>

          {/* City */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">City </label>
            <input
              type="text"
              value={dropdowns.city ? citySearch : (formData.city || "")}
              onChange={(e) => {
                setCitySearch(e.target.value);
                setFormData(prev => ({ ...prev, city: e.target.value }));
                setManualAddressEdits(prev => ({ ...prev, city: true }));
                setDropdowns(prev => ({ ...prev, city: true }));
              }}
              onFocus={() => {
                setCitySearch("");
                setDropdowns(prev => ({ ...prev, city: true }));
              }}
              onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, city: false })), 150)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Enter city"
            />
            {dropdowns.city && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                {(cityOptions.length > 0 ? cityOptions : [{ label: citySearch, value: citySearch }])
                  .filter(c => c.label.toLowerCase().includes(citySearch.toLowerCase()))
                  .map((city, idx) => (
                    <button
                      key={idx}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, city: city.value }));
                        setManualAddressEdits(prev => ({ ...prev, city: true }));
                        setDropdowns(prev => ({ ...prev, city: false }));
                      }}
                    >
                      <span>{city.label}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Row: State, Pincode */}
          <div className="grid grid-cols-2 gap-4">
            {/* State */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">State </label>
              <input
                type="text"
                value={dropdowns.state ? stateSearch : (formData.state || "")}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setFormData(prev => ({ ...prev, state: e.target.value }));
                  setManualAddressEdits(prev => ({ ...prev, state: true }));
                  setDropdowns(prev => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setStateSearch("");
                  setDropdowns(prev => ({ ...prev, state: true }));
                }}
                onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, state: false })), 150)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                placeholder="Select state"
              />
              {dropdowns.state && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                  {stateOptions
                    .filter(s => s.label.toLowerCase().includes(stateSearch.toLowerCase()))
                    .map((state, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, state: state.value }));
                          setManualAddressEdits(prev => ({ ...prev, state: true }));
                          setDropdowns(prev => ({ ...prev, state: false }));
                        }}
                      >
                        <span>{state.label}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pin Code </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                  placeholder="Enter pincode"
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-2.5 text-[#129046]">
                    <div className="w-3 h-3 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row: Phone, Fax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Phone</label>
              <div className="flex gap-2">
                <div className="w-24 flex-shrink-0">
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="w-full px-1 py-2 border border-gray-300 rounded-md text-xs focus:border-[#129046] focus:outline-none"
                  >
                    {COUNTRY_PHONE_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                  placeholder="Enter phone"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Fax Number</label>
              <input
                type="text"
                value={formData.fax}
                onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                placeholder="Enter fax number"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 italic pb-2 border-b border-gray-100">
            Note: Changes made here will be updated for this customer.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#129046] text-white text-xs font-bold shadow-md hover:bg-[#0e7a3a] transition-all transform active:scale-95">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shipping Address Modal (Universal Standardization) ---------------- */
function ShippingAddressModal({ open, onClose, address, onSave }) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const [formData, setFormData] = useState({
    attention: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    fax: "",
  });
  const [manualAddressEdits, setManualAddressEdits] = useState({
    city: false,
    state: false,
    country: false,
  });
  const [phoneCode, setPhoneCode] = useState("+91");

  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [dropdowns, setDropdowns] = useState({});

  // Search terms for dropdowns
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const [pincodeLoading, setPincodeLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        attention: address?.attention || "",
        line1: address?.line1 || "",
        line2: address?.line2 || "",
        city: address?.city || "",
        state: address?.state || "",
        pincode: address?.pincode || "",
        country: address?.country || "India",
        phone: address?.phone || "",
        fax: address?.fax || "",
      });
      // Reset search terms, phone code and dropdowns
      setPhoneCode(address?.phoneCode || "+91");
      setManualAddressEdits({
        city: false,
        state: false,
        country: false
      });
      setCountrySearch("");
      setStateSearch("");
      setCitySearch("");
      setDropdowns({});
      fetchAllCountries();
    }
  }, [open, address]);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/iso');
      const data = await response.json();
      if (!data.error) {
        setAllCountries(data.data.map(c => ({ label: c.name, value: c.name })));
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch states when country changes
  useEffect(() => {
    if (formData.country) {
      fetchStates(formData.country);
    }
  }, [formData.country]);

  const fetchStates = async (countryName) => {
    try {
      setLoadingStates(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const data = await response.json();
      if (!data.error) {
        setStateOptions(data.data.states.map(s => ({ label: s.name, value: s.name })));
      } else {
        setStateOptions([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setStateOptions([]);
    } finally {
      setLoadingStates(false);
    }
  };

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.country && formData.state) {
      fetchCities(formData.country, formData.state);
    }
  }, [formData.country, formData.state]);

  const fetchCities = async (countryName, stateName) => {
    try {
      setLoadingCities(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const data = await response.json();
      if (!data.error) {
        setCityOptions(data.data.map(c => ({ label: c, value: c })));
      } else {
        setCityOptions([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = async (value) => {
    setFormData(prev => ({ ...prev, pincode: value }));
    if (value.length >= 3) {
      try {
        setPincodeLoading(true);
        const response = await businessAPI.getCityByPincode(value);
        if (response.success && response.data) {
          const { city, state, country } = response.data;
          setFormData(prev => ({
            ...prev,
            city: (!manualAddressEdits.city && city) ? city : prev.city,
            state: (!manualAddressEdits.state && state) ? state : prev.state,
            country: (!manualAddressEdits.country && country) ? country : prev.country
          }));
        }
      } catch (error) {
        console.error('Error fetching address from pincode:', error);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      await onSave({ ...formData, phoneCode });
      onClose();
    } catch (err) {
      console.error("Error in Modal handleSave:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-base font-bold text-white"><span>Shipping Address</span></h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20">
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-gray-800">
          {/* Attention */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Receipt Name / Attention</label>
            <input
              type="text"
              value={formData.attention}
              onChange={(e) => setFormData(prev => ({ ...prev, attention: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Enter attention name"
            />
          </div>

          {/* Country */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Country/Region *</label>
            <input
              type="text"
              value={dropdowns.country ? countrySearch : (formData.country || "")}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setFormData(prev => ({ ...prev, country: e.target.value }));
                setManualAddressEdits(prev => ({ ...prev, country: true }));
                setDropdowns(prev => ({ ...prev, country: true }));
              }}
              onFocus={() => {
                setCountrySearch("");
                setDropdowns(prev => ({ ...prev, country: true }));
              }}
              onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, country: false })), 150)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Select country"
            />
            {dropdowns.country && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                {allCountries
                  .filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map((country, idx) => (
                    <button
                      key={idx}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, country: country.value, state: "", city: "" }));
                        setManualAddressEdits(prev => ({ ...prev, country: true }));
                        setDropdowns(prev => ({ ...prev, country: false }));
                      }}
                    >
                      {country.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Address</label>
            <textarea
              value={formData.line1}
              onChange={(e) => setFormData(prev => ({ ...prev, line1: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all resize-none"
              placeholder="Street 1"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <textarea
              value={formData.line2}
              onChange={(e) => setFormData(prev => ({ ...prev, line2: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all resize-none"
              placeholder="Street 2"
            />
          </div>

          {/* City */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">City *</label>
            <input
              type="text"
              value={dropdowns.city ? citySearch : (formData.city || "")}
              onChange={(e) => {
                setCitySearch(e.target.value);
                setFormData(prev => ({ ...prev, city: e.target.value }));
                setManualAddressEdits(prev => ({ ...prev, city: true }));
                setDropdowns(prev => ({ ...prev, city: true }));
              }}
              onFocus={() => {
                setCitySearch("");
                setDropdowns(prev => ({ ...prev, city: true }));
              }}
              onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, city: false })), 150)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
              placeholder="Enter city"
            />
            {dropdowns.city && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                {(cityOptions.length > 0 ? cityOptions : [{ label: citySearch, value: citySearch }])
                  .filter(c => c.label.toLowerCase().includes(citySearch.toLowerCase()))
                  .map((city, idx) => (
                    <button
                      key={idx}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, city: city.value }));
                        setManualAddressEdits(prev => ({ ...prev, city: true }));
                        setDropdowns(prev => ({ ...prev, city: false }));
                      }}
                    >
                      {city.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Row: State, Pincode */}
          <div className="grid grid-cols-2 gap-4">
            {/* State */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">State *</label>
              <input
                type="text"
                value={dropdowns.state ? stateSearch : (formData.state || "")}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setFormData(prev => ({ ...prev, state: e.target.value }));
                  setManualAddressEdits(prev => ({ ...prev, state: true }));
                  setDropdowns(prev => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setStateSearch("");
                  setDropdowns(prev => ({ ...prev, state: true }));
                }}
                onBlur={() => setTimeout(() => setDropdowns(prev => ({ ...prev, state: false })), 150)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                placeholder="Select state"
              />
              {dropdowns.state && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto py-1 animate-in slide-in-from-top-2 duration-200">
                  {stateOptions
                    .filter(s => s.label.toLowerCase().includes(stateSearch.toLowerCase()))
                    .map((state, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50 transition-colors"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, state: state.value }));
                          setManualAddressEdits(prev => ({ ...prev, state: true }));
                          setDropdowns(prev => ({ ...prev, state: false }));
                        }}
                      >
                        {state.label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pin Code *</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                  placeholder="Enter pincode"
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-2.5 text-[#129046]">
                    <div className="w-3 h-3 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row: Phone, Fax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Phone</label>
              <div className="flex gap-2">
                <div className="w-24 flex-shrink-0">
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="w-full px-1 py-2 border border-gray-300 rounded-md text-xs focus:border-[#129046] focus:outline-none"
                  >
                    {COUNTRY_PHONE_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                  placeholder="Enter phone"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Fax Number</label>
              <input
                type="text"
                value={formData.fax}
                onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-green-500/20 focus:border-[#129046] focus:outline-none transition-all"
                placeholder="Enter fax number"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 italic pb-2 border-b border-gray-100">
            Note: Changes made here will be updated for this customer.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#129046] text-white text-xs font-bold shadow-md hover:bg-[#0e7a3a] transition-all transform active:scale-95">Save</button>
        </div>
      </div>
    </div>
  );
}



/* ---------------- Billing Addresses Selection Modal (from Parties.jsx) ---------------- */
function BillingAddressesModal({
  open,
  onClose,
  addresses,
  selectedIndex,
  onSelect,
  onEdit,
  onAdd,
}) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-2xl flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Select Billing Address
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-2xl hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {addresses && addresses.length > 0 ? (
            addresses.map((addr, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={index}
                  onClick={() => onSelect(index)}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                    ? "border-[#129046] bg-green-50 shadow-sm"
                    : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => onSelect(index)}
                    className="w-4 h-4 accent-[#129046]"
                  />
                  <div className="flex-1 text-sm text-gray-700 break-words" style={{ overflowWrap: 'anywhere' }}>
                    {addr.line1 || 'No address'}, {addr.city || ''}, {addr.state || ''} - {addr.pincode || ''}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(index);
                    }}
                    className="p-2 hover:bg-white rounded text-gray-400 hover:text-[#129046]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              No addresses found
            </div>
          )}

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
              className="px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shipping Addresses Selection Modal (from Parties.jsx) ---------------- */
function ShippingAddressesModal({
  open,
  onClose,
  addresses,
  selectedIndex,
  onSelect,
  onEdit,
  onAdd,
}) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-2xl flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Select Shipping Address
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-2xl hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {addresses && addresses.length > 0 ? (
            addresses.map((addr, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={index}
                  onClick={() => onSelect(index)}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                    ? "border-[#129046] bg-green-50 shadow-sm"
                    : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => onSelect(index)}
                    className="w-4 h-4 accent-[#129046]"
                  />
                  <div className="flex-1 text-sm text-gray-700 break-words" style={{ overflowWrap: 'anywhere' }}>
                    {addr.line1 || 'No address'}, {addr.city || ''}, {addr.state || ''} - {addr.pincode || ''}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(index);
                    }}
                    className="p-2 hover:bg-white rounded text-gray-400 hover:text-[#129046]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              No addresses found
            </div>
          )}

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
              className="px-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- BankModal ---------- */
function BankModal({
  open = true,
  onClose = () => { },
  onSave = () => { },
  initial = {},
}) {
  const [bankName, setBankName] = useState(initial.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(initial.account_number || "");
  const [ifsc, setIfsc] = useState(initial.ifsc || "");
  const [branch, setBranch] = useState(initial.branch || "");
  const [upi, setUpi] = useState(initial.upi || "");
  const [accountHolderName, setAccountHolderName] = useState(initial.account_holder_name || "");
  const [qrCode, setQrCode] = useState(initial.qr_code || "");
  const [qrCodePreview, setQrCodePreview] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const qrInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      setBranch("");
      setUpi("");
      setAccountHolderName("");
      setQrCode("");
      setQrCodePreview("");
      setErrors({});
      // Restore scroll
      document.body.style.overflow = 'unset';
    } else {
      // Set initial values when modal opens
      setBankName(initial.bank_name || "");
      setAccountNumber(initial.account_number || "");
      setIfsc(initial.ifsc || "");
      setBranch(initial.branch || "");
      setUpi(initial.upi || "");
      setAccountHolderName(initial.account_holder_name || "");
      setQrCode(initial.qr_code || "");
      setQrCodePreview("");
      setErrors({});
      // Lock scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, initial]);

  async function handleQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => setQrCodePreview(event.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingQr(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${getApiConfig().backendURL}/api/upload-direct`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success && data.image_url) {
        setQrCode(data.image_url);
        showSuccessToast("Scanner uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading QR:", error);
      showErrorToast("Failed to upload scanner image");
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleSave() {
    const newErrors = {};
    if (!bankName.trim()) newErrors.bankName = "Bank Name is required";
    if (!accountNumber.trim()) newErrors.accountNumber = "Account Number is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    setLoading(true);
    try {
      const isEditing = !!initial.id;
      const bankData = {
        business_id: localStorage.getItem("selectedBusinessId"),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc: ifsc.trim() || null,
        branch: branch.trim() || null,
        upi: upi.trim() || null,
        account_holder_name: accountHolderName.trim() || null,
        qr_code: qrCode || null,
      };

      const url = isEditing
        ? `${getApiConfig().backendURL}/api/bank-details/${initial.id}`
        : `${getApiConfig().backendURL}/api/bank-details`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bankData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || (isEditing ? 'Failed to update bank account' : 'Failed to add bank account'));
      }

      const result = await response.json();

      onSave(result.data);
      onClose();

      await showSuccessToast(isEditing ? "Bank account updated successfully" : "Bank account added successfully");
    } catch (error) {
      console.error('Error saving bank:', error);
      showErrorToast(error.message || "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-2xl flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              <span>{initial.id ? "Edit Bank Account" : "Add Bank Account"}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-2xl hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span>Bank Name </span><span className="text-red-500">*</span>
              </label>
              <input
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  if (errors.bankName) setErrors(prev => ({ ...prev, bankName: "" }));
                }}
                className={`w-full px-4 py-2 border-2 rounded-lg text-sm transition-all focus:outline-none ${errors.bankName
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                  }`}
                placeholder="Enter bank name"
                required
              />
              {errors.bankName && (
                <p className="mt-1 text-[10px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <span>{errors.bankName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span>Account Number </span><span className="text-red-500">*</span>
              </label>
              <input
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (errors.accountNumber) setErrors(prev => ({ ...prev, accountNumber: "" }));
                }}
                className={`w-full px-4 py-2 border-2 rounded-lg text-sm transition-all focus:outline-none ${errors.accountNumber
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                  }`}
                placeholder="Enter account number"
                required
              />
              {errors.accountNumber && (
                <p className="mt-1 text-[10px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <span>{errors.accountNumber}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span>IFSC Code</span>
              </label>
              <input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                placeholder="Enter IFSC code"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span>Branch</span>
              </label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                placeholder="Enter branch name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span>Account Holder's Name</span>
              </label>
              <input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                placeholder="Enter account holder's name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>UPI ID & Payment Scanner</span>
                <span className="text-[10px] text-gray-400 font-normal normal-case italic"><span>Add QR image for faster payments</span></span>
              </label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                    placeholder="Enter UPI ID (optional)"
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <input
                    type="file"
                    ref={qrInputRef}
                    onChange={handleQrUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => qrInputRef.current?.click()}
                    disabled={uploadingQr}
                    className={`px-4 py-2 border-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap ${qrCode || qrCodePreview
                      ? "border-[#129046] bg-green-50 text-[#129046]"
                      : "border-gray-200 text-gray-500 hover:border-[#129046] hover:text-[#129046]"
                      }`}
                  >
                    {uploadingQr ? (
                      <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{qrCode || qrCodePreview ? "Change QR Image" : "Upload QR Image"}</span>
                  </button>
                </div>
              </div>

              {/* QR Preview Section */}
              {(qrCode || qrCodePreview) && (
                <div className="mt-3 flex items-center gap-4 p-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="relative w-20 h-20 bg-white border-2 border-gray-100 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={qrCodePreview || qrCode}
                      alt="Bank Scanner"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQrCode("");
                        setQrCodePreview("");
                      }}
                      className="absolute top-0.5 right-0.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-800"><span>Scanner Preview</span></p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed"><span>This QR code will be displayed to customers for digital payments.</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-sm font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200"
              disabled={loading}
            >
              <span>{loading ? "Saving..." : "Save Bank Account"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ---------- ProductModal ---------- */
function ProductModal({
  open = true,
  products = [],
  setProducts = () => { },
  pageSize = 8,
  onClose = () => { },
  onDone = () => { },
  onAddNew = () => { },
  onEdit = () => { },
  currentLines = [],
  currency = "INR",
  customUnits = [],
  setCustomUnits = () => { },
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [step, setStep] = useState("browse"); // "browse" | "review"
  const [selectedKeys, setSelectedKeys] = useState(new Set()); // set of product keys currently checked
  const [bufferLines, setBufferLines] = useState([]); // selected items shown in "Review"
  const [focusedInput, setFocusedInput] = useState(null); // { id, field, val }

  // edit/create form state
  const [showCreate, setShowCreate] = useState(false);
  const [editMode, setEditMode] = useState(false); // false -> create, true -> edit
  const [editingProduct, setEditingProduct] = useState(null);
  const [formState, setFormState] = useState({
    id: "",
    name: "",
    code: "",
    salesPrice: 0,
    purchasePrice: 0,
    stock: "",
    subtitle: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    // Reset selection and step when modal opens to allow direct adding
    setStep("browse");

    // Save current scroll position
    const scrollY = window.scrollY;

    // Lock scroll with multiple methods
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    // Reset buffer and selection for a clean "Add Selected" workflow
    setBufferLines([]);
    setSelectedKeys(new Set());

    setPage(1);

    // Cleanup function
    return () => {
      // Restore scroll
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function updateProduct(productId, patch) {
    if (!productId) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...patch } : p));
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return [];
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(qq) ||
        ((p.code || "") + "").toLowerCase().includes(qq),
    );
  }, [products, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageItemsArr = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const keyFor = (p) => p.id || p.code || p.name;

  // Select all functionality
  const allSelected = pageItemsArr.length > 0 && pageItemsArr.every(p => selectedKeys.has(keyFor(p)));
  const someSelected = pageItemsArr.some(p => selectedKeys.has(keyFor(p)));

  function toggleSelectAll() {
    if (allSelected) {
      // Deselect all on current page
      setSelectedKeys(prev => {
        const copy = new Set(prev);
        pageItemsArr.forEach(p => copy.delete(keyFor(p)));
        return copy;
      });
    } else {
      // Select all on current page
      setSelectedKeys(prev => {
        const copy = new Set(prev);
        pageItemsArr.forEach(p => copy.add(keyFor(p)));
        return copy;
      });
    }
  }

  function toggleSelect(product) {
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      const key = keyFor(product);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
  }

  function selectAllOnPage() {
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      pageItemsArr.forEach((p) => copy.add(keyFor(p)));
      return copy;
    });
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  // Directly add selected products and close modal (skipping review)
  function handleAddSelected() {
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) {
      showErrorToast("Select at least one product before adding");
      return;
    }
    const selectedProducts = products.filter((p) =>
      selectedKeys.has(keyFor(p)),
    );
    const normalized = selectedProducts.map((product) => ({
      id: `tmp-${Date.now()}-${Math.random()}`,
      productId: product.id || null,
      description: product.name,
      subtitle: product.subtitle || "",
      hsn: product.hsn || "",
      code: product.code || "",
      qty: product.qty || "1",
      unit: product.stockUnit || "PCS",
      price: product.salesPrice ?? 0,
      discountPct: 0,
      taxType: 'GST',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
      vatPct: 0,
      overrideAmount: null,
      image_url: product.image_url,
      stockQuantity: product.stockQuantity || 0,
      stockUnit: product.stockUnit || "PCS",
    }));

    onDone(normalized);
    onClose();
  }

  // OPEN create form (blank) - but now it adds to buffer directly
  function openCreateForm() {
    const newLine = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      productId: null,
      description: "",
      subtitle: "",
      hsn: "",
      code: "",
      qty: 0,
      unit: "PCS",
      price: 0,
      discountPct: 0,
      taxType: 'GST',
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
      vatPct: 0,
      overrideAmount: null,
      image_url: "",
      stockQuantity: 0,
      stockUnit: "PCS",
      isNewEntry: true, // Mark as new entry for styling
    };

    setBufferLines((prev) => [newLine, ...prev]);
    setStep("review");
  }

  // OPEN edit form pre-filled
  function openEditForm(product) {
    setEditMode(true);
    setEditingProduct(product);
    setFormState({
      id: product.id ?? "",
      name: product.name ?? "",
      code: product.code ?? "",
      salesPrice: product.salesPrice ?? 0,
      purchasePrice: product.purchasePrice ?? 0,
      stock: product.stock ?? "",
      subtitle: product.subtitle ?? "",
    });
    setShowCreate(true);
  }

  function removeFromBuffer(id) {
    setBufferLines((b) => b.filter((x) => x.id !== id));
  }
  function updateBufferLine(id, patch) {
    setBufferLines((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  }

  const handleUnitChange = async (lineId, opt) => {
    if (opt?.id === "OTHER") {
      const newUnit = await showPremiumInputDialog({
        title: "Add Custom Unit",
        text: "Enter a custom measurement unit (e.g., BAG, CAN, DRUM)",
        inputPlaceholder: "Enter unit name",
        inputValidator: (value) => {
          if (!value || value.trim() === "") return "Unit name cannot be empty";
          if (value.length > 10) return "Unit name must be 10 characters or less";
          const exists = [...DEFAULT_UNIT_OPTIONS.map(o => o.id), ...customUnits].some(u => u.toUpperCase() === value.trim().toUpperCase());
          if (exists) return "This unit already exists";
          return null;
        },
        variant: "green",
        confirmText: "Add Unit"
      });
      if (newUnit && newUnit.trim()) {
        const unitUpper = newUnit.trim().toUpperCase();
        const updatedUnits = [...customUnits, unitUpper];
        setCustomUnits(updatedUnits);
        localStorage.setItem('customUnits', JSON.stringify(updatedUnits));
        updateBufferLine(lineId, { unit: unitUpper });
      }
    } else {
      updateBufferLine(lineId, { unit: opt?.id || "PCS" });
    }
  };

  const handleUnitChangeBrowse = async (productId, opt) => {
    if (opt?.id === "OTHER") {
      const newUnit = await showPremiumInputDialog({
        title: "Add Custom Unit",
        text: "Enter a custom measurement unit (e.g., BAG, CAN, DRUM)",
        inputPlaceholder: "Enter unit name",
        inputValidator: (value) => {
          if (!value || value.trim() === "") return "Unit name cannot be empty";
          if (value.length > 10) return "Unit name must be 10 characters or less";
          const exists = [...DEFAULT_UNIT_OPTIONS.map(o => o.id), ...customUnits].some(u => u.toUpperCase() === value.trim().toUpperCase());
          if (exists) return "This unit already exists";
          return null;
        },
        variant: "green",
        confirmText: "Add Unit"
      });
      if (newUnit && newUnit.trim()) {
        const unitUpper = newUnit.trim().toUpperCase();
        const updatedUnits = [...customUnits, unitUpper];
        setCustomUnits(updatedUnits);
        localStorage.setItem('customUnits', JSON.stringify(updatedUnits));
        updateProduct(productId, { stockUnit: unitUpper });
      }
    } else {
      updateProduct(productId, { stockUnit: opt?.id || "PCS" });
    }
  };

  // Handle image upload for buffer lines
  async function handleImageUploadBuffer(e, id) {
    const file = e.target.files[0];
    if (!file) return;



    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onload = (event) => {

      updateBufferLine(id, { image_url: event.target.result }); // temporary data URL
    };
    reader.readAsDataURL(file);

    // Upload to server in background
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${getApiConfig().backendURL}/api/upload-direct`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.image_url) {

        updateBufferLine(id, { image_url: data.image_url }); // replace with server URL (don't prepend backend URL here)
      } else {
        console.warn('Upload response missing image_url:', data);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Keep the preview data URL if upload fails
    }
  }

  const bufferSubtotal = bufferLines.reduce((s, b) => {
    const qty = Number(b.qty || 0);
    const price = Number(b.price || 0);
    const amt = qty * price;
    const discount = (Number(b.discountPct || 0) / 100) * amt;
    const taxable = Math.max(0, amt - discount);
    let taxRate = 0;
    if (b.taxType === 'GST') {
      taxRate = (Number(b.cgstPct || 0) + Number(b.sgstPct || 0)) / 100;
    } else if (b.taxType === 'IGST') {
      taxRate = Number(b.igstPct || 0) / 100;
    } else if (b.taxType === 'VAT') {
      taxRate = Number(b.vatPct || 0) / 100;
    }
    const tax = taxable * taxRate;
    const total =
      b.overrideAmount != null ? Number(b.overrideAmount) : taxable + tax;
    return s + total;
  }, 0);

  // handle controlled form change
  function handleFormChange(field, value) {
    setFormState((s) => ({ ...s, [field]: value }));
  }

  // submit create/edit form
  async function handleFormSubmit(e) {
    e && e.preventDefault && e.preventDefault();
    const f = formState;
    const name = (f.name || "").trim();
    if (!name) {
      await showErrorModal({
        title: "Missing name",
        text: "Enter item name",
      });
      return;
    }

    const payload = {
      id: f.id || `NEW-${Date.now()}`,
      name: f.name,
      code: (f.code || "").trim(),
      salesPrice: Number(f.salesPrice || 0),
      purchasePrice: Number(f.purchasePrice || 0),
      stock: f.stock || "",
      subtitle: f.subtitle || "",
    };

    if (editMode) {
      // call edit handler
      onEdit(payload);
      setShowCreate(false);
      await showSuccessToast("Product updated");
    } else {
      // NEW: Save to backend inventory
      const existing = products.find(p => (p.name || "").toLowerCase() === name.toLowerCase());
      if (existing) {
        // If already exists, just use it
        onAddNew({ ...payload, id: existing.id || existing.code || existing.name });
      } else {
        try {
          showLoadingModal("Saving to inventory...");
          const bizId = localStorage.getItem('selectedBusinessId') || "0";
          const res = await saveToInventory(payload);

          if (res.success && res.data) {
            const newProd = res.data;
            setProducts((prev) => [newProd, ...prev]);
            onAddNew({ ...payload, id: newProd.id });
          } else {
            onAddNew(payload);
          }
        } catch (err) {
          console.error("Failed to save to inventory:", err);
          onAddNew(payload); // proceed anyway for document consistency
        } finally {
          closeModal();
        }
      }

      setShowCreate(false);
      await showSuccessToast("Product added to document and inventory");
    }

    // keep selection for new/edited item
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      copy.add(payload.id ?? payload.code ?? payload.name);
      return copy;
    });
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4"
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header: dynamic by step */}
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-4 py-4 flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold text-white">
            {step === "browse" ? <span>Select Products</span> : <span>Review Selected Items</span>}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white font-bold" />
          </button>
        </div>

        {/* Search and Actions */}
        {step === "browse" && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products by name or code"
                className="flex-1 min-w-[200px] px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
              />
              <button
                onClick={openCreateForm}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-800 hover:text-gray-900 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2"
                title="Manually enter product details"
              >
                <Plus className="w-4 h-4" />
                Manual Entry
              </button>
              <button
                onClick={handleAddSelected}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] text-white rounded-lg text-sm font-bold hover:shadow-md transition-all whitespace-nowrap"
              >
                <span>Add Selected</span> <span className="notranslate" translate="no"> (<span>{selectedKeys.size}</span>)</span>
              </button>
            </div>
          </div>
        )}

        {/* Search and Action Buttons - Review step */}
        {step === "review" && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products by name or code"
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
              />
              <button
                onClick={() => setStep("browse")}
                className="px-4 py-2.5 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  // finish and return bufferLines to parent
                  if (bufferLines.length === 0) {
                    onClose();
                    return;
                  }
                  onDone(bufferLines);
                  onClose();
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] text-white rounded-lg text-sm font-medium hover:from-[#0d6b35]/90 hover:to-[#7a8f3d]/90 transition-all duration-200 whitespace-nowrap"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* STEP: BROWSE */}
          {step === "browse" && (
            <>
              {/* Horizontal scroll container for products table */}
              <div className="relative overflow-x-auto rounded-lg border border-yellow-200 mb-6">
                <div className="inline-block min-w-full">
                  <table className="min-w-[1000px] w-full text-sm">
                    <thead className="bg-gray-100 text-black">
                      <tr>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-12">
                          <div className="flex items-center justify-center gap-0">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected && !allSelected;
                              }}
                              onChange={toggleSelectAll}
                              className="w-5 h-5 cursor-pointer accent-[#129046]"
                            />
                            <span className="ml-1">All</span>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                          <span>IMAGE</span>
                        </th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[200px]">
                          <span>ITEM NAME</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          <span>HSN/SAC</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>STOCK</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>QTY</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                          <span>UNIT</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          <span>UNIT PRICE</span>
                        </th>
                        <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          <span>Total Amount</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!q.trim() ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-12 text-center text-gray-400"
                          >
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-lg font-medium"><span>Search for products to add</span></p>
                            <p className="text-sm"><span>Type a product name or code in the search bar above</span></p>
                          </td>
                        </tr>
                      ) : pageItemsArr.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-gray-500 text-sm"
                          >
                            <span>No products for "<span>{q}</span>"</span>
                          </td>
                        </tr>
                      ) : (
                        pageItemsArr.map((p) => {
                          const key = keyFor(p);
                          const checked = selectedKeys.has(key);
                          return (
                            <tr key={key} className="border-t hover:bg-gray-50">
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelect(p)}
                                  className="w-5 h-5 cursor-pointer accent-[#129046]"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden border">
                                  {p.image_url ? (
                                    <img
                                      src={`${getApiConfig().backendURL}${p.image_url}`}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.parentElement.querySelector('.no-image-text').style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <div className="no-image-text w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{ display: p.image_url ? "none" : "flex" }}>
                                    No Image
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle">
                                <input
                                  type="text"
                                  value={p.name || ""}
                                  onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none font-medium"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="text"
                                  value={p.hsn || ""}
                                  onChange={(e) => updateProduct(p.id, { hsn: e.target.value })}
                                  className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="text"
                                  value={p.stockQuantity !== undefined && p.stockQuantity !== null ? Number(p.stockQuantity) : 0}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*\.?\d*$/.test(val) || val === '') {
                                      updateProduct(p.id, { stockQuantity: val === '' ? 0 : Number(val) });
                                    }
                                  }}
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center text-gray-600"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="text"
                                  value={p.qty ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*\.?\d*$/.test(val) || val === '') {
                                      updateProduct(p.id, { qty: val === '' ? 0 : Number(val) });
                                    }
                                  }}
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <CommonDropdown
                                  options={getUnitOptions(customUnits)}
                                  value={p.stockUnit || "PCS"}
                                  valueBy="id"
                                  onChange={(opt) => handleUnitChangeBrowse(p.id, opt)}
                                  className2="border border-gray-300 rounded"
                                  className="w-20 h-9"
                                  style={{ width: 'auto', minWidth: '150px' }}
                                  id={`browse-unit-dropdown-${p.id}`}
                                  name="stockUnit"
                                  placeholder="Unit"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="text"
                                  value={
                                    focusedInput?.id === p.id && focusedInput?.field === 'browse-price'
                                      ? focusedInput.val
                                      : `${getCurrencySymbol(currency)}${convertAmount(p.salesPrice, currency).toFixed(2)}`
                                  }
                                  onFocus={() => setFocusedInput({ id: p.id, field: 'browse-price', val: `${getCurrencySymbol(currency)}${convertAmount(p.salesPrice, currency).toFixed(2)}` })}
                                  onChange={(e) => {
                                    const symbol = getCurrencySymbol(currency);
                                    let val = e.target.value;
                                    setFocusedInput({ id: p.id, field: 'browse-price', val });
                                    if (val.startsWith(symbol)) val = val.substring(symbol.length);
                                    const cleanVal = val.replace(/[^0-9.]/g, "");
                                    updateProduct(p.id, {
                                      salesPrice: cleanVal === "" ? 0 : convertToINR(Number(cleanVal), currency)
                                    });
                                  }}
                                  onBlur={() => setFocusedInput(null)}
                                  className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center font-medium text-green-600"
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <span translate="no" className="font-medium text-blue-600 notranslate">
                                  <span>{getCurrencySymbol(currency)}</span>
                                  <span>{(Number(p.qty || 0) * convertAmount(p.salesPrice, currency)).toFixed(2)}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Scroll indicator */}
                <div className="sticky left-0 bottom-0 w-full py-1 bg-gradient-to-r from-transparent via-yellow-100/20 to-transparent text-center text-xs text-gray-500 border-t border-yellow-200">
                  ← Scroll horizontally →
                </div>
              </div>


            </>
          )}

          {/* STEP: REVIEW */}
          {step === "review" && (
            <>
              {bufferLines.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No items selected. Click "Back to Browse" to choose items.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">
                      <span>Selected Items</span> <span className="notranslate" translate="no"> (<span>{bufferLines.length}</span>)</span>
                    </h4>
                  </div>

                  {/* Horizontal scroll container for selected items table */}
                  <div className="relative overflow-x-auto rounded-lg border border-yellow-200">
                    <div className="inline-block min-w-full">
                      <table className="min-w-[1000px] w-full text-sm">
                        <thead className="bg-gray-100 text-black">
                          <tr>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                              <span>IMAGE</span>
                            </th>
                            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[250px]">
                              <span>PRODUCT NAME</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                              <span>HSN/SAC</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                              <span>STOCK</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                              <span>QTY</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                              <span>UNIT</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-28">
                              <span>UNIT PRICE</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                              <span>DISCOUNT (%)</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                              <span>Total Amount</span>
                            </th>
                            <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                              <span>ACTIONS</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bufferLines.map((b) => {
                            const qty = Number(b.qty || 0);
                            const price = Number(b.price || 0);
                            const amt = qty * price;
                            const discountPct = Number(b.discountPct || 0);
                            const discountValue = (amt * discountPct) / 100;
                            const taxable = amt - discountValue;
                            return (
                              <tr key={b.id} className="border-t hover:bg-gray-50">
                                <td className="px-2 py-2 text-center align-middle">
                                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden border relative group">
                                    {b.image_url ? (
                                      <>
                                        <img
                                          src={b.image_url.startsWith('data:') ? b.image_url : `${getApiConfig().backendURL}${b.image_url}`}
                                          alt={b.description}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            console.error('Image load error:', e.target.src);
                                            e.target.style.display = "none";
                                            const noImageDiv = e.target.parentElement.querySelector('.no-image-text');
                                            if (noImageDiv) noImageDiv.style.display = "flex";
                                          }}
                                        />
                                        <div className="no-image-text w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{ display: "none" }}>
                                          No Image
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById(`file-input-buffer-${b.id}`).click()}
                                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200"
                                          title="Change Image"
                                        >
                                          <Upload size={16} className="text-white" strokeWidth={2.5} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <div className="no-image-text w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                          No Image
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById(`file-input-buffer-${b.id}`).click()}
                                          className="absolute inset-0 bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 w-full h-full flex items-center justify-center transition-all duration-200 upload-bounce-repeat"
                                          title="Upload Image"
                                          style={{
                                            animation: 'uploadBounce 0.6s ease-in-out 2',
                                            animationIterationCount: '2',
                                            animationDelay: '0s'
                                          }}
                                          onAnimationEnd={(e) => {
                                            // Re-trigger animation every 5 seconds
                                            setTimeout(() => {
                                              e.target.style.animation = 'none';
                                              setTimeout(() => {
                                                e.target.style.animation = 'uploadBounce 0.6s ease-in-out 2';
                                              }, 10);
                                            }, 5000);
                                          }}
                                        >
                                          <Upload size={20} strokeWidth={2.5} />
                                        </button>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      id={`file-input-buffer-${b.id}`}
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => handleImageUploadBuffer(e, b.id)}
                                    />
                                  </div>
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={b.description || ""}
                                    onChange={(e) =>
                                      updateBufferLine(b.id, { description: e.target.value })
                                    }
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none"
                                    placeholder="Item Name"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={b.hsn || ""}
                                    onChange={(e) =>
                                      updateBufferLine(b.id, { hsn: e.target.value })
                                    }
                                    className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                    placeholder="HSN Code"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={b.stockQuantity || b.stockQuantity === 0 ? Number(b.stockQuantity) : ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Only allow numbers
                                      if (/^\d*$/.test(value) || value === '') {
                                        updateBufferLine(b.id, {
                                          stockQuantity: value === '' ? 0 : Number(value),
                                        });
                                      }
                                    }}
                                    className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={
                                      focusedInput?.id === b.id && focusedInput?.field === 'qty'
                                        ? focusedInput.val
                                        : (b.qty ?? "")
                                    }
                                    onFocus={() => setFocusedInput({ id: b.id, field: 'qty', val: String(b.qty ?? "") })}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setFocusedInput({ id: b.id, field: 'qty', val: value });
                                      // Only allow numbers and decimal point
                                      if (/^\d*\.?\d*$/.test(value) || value === '') {
                                        updateBufferLine(b.id, {
                                          qty: value === '' ? 0 : Number(value),
                                        });
                                      }
                                    }}
                                    onBlur={() => setFocusedInput(null)}
                                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <CommonDropdown
                                    options={getUnitOptions(customUnits)}
                                    value={b.unit || "PCS"}
                                    valueBy="id"
                                    onChange={(opt) => handleUnitChange(b.id, opt)}
                                    className2="normalFormOption"
                                    className="w-full sm:w-full h-[34px]"
                                    style={{ width: 'auto', minWidth: '150px' }}
                                    id={`buffer-unit-dropdown-${b.id}`}
                                    name="unit"
                                    placeholder="Select Unit"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={
                                      focusedInput?.id === b.id && focusedInput?.field === 'price'
                                        ? focusedInput.val
                                        : `${getCurrencySymbol(currency)}${convertAmount(b.price, currency).toFixed(2)}`
                                    }
                                    onFocus={(e) => {
                                      const currentVal = `${getCurrencySymbol(currency)}${convertAmount(b.price, currency).toFixed(2)}`;
                                      setFocusedInput({ id: b.id, field: 'price', val: currentVal });
                                    }}
                                    onChange={(e) => {
                                      const symbol = getCurrencySymbol(currency);
                                      let val = e.target.value;

                                      // Update local focused state
                                      setFocusedInput({ id: b.id, field: 'price', val });

                                      // Process for underlying data
                                      if (val.startsWith(symbol)) val = val.substring(symbol.length);
                                      const cleanVal = val.replace(/[^0-9.]/g, "");
                                      const parts = cleanVal.split(".");
                                      const finalVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");

                                      updateBufferLine(b.id, {
                                        price: finalVal === "" ? 0 : convertToINR(Number(finalVal), currency),
                                      });
                                    }}
                                    onBlur={() => setFocusedInput(null)}
                                    className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={
                                      focusedInput?.id === b.id && focusedInput?.field === 'discountPct'
                                        ? focusedInput.val
                                        : (b.discountPct ?? "")
                                    }
                                    onFocus={() => setFocusedInput({ id: b.id, field: 'discountPct', val: String(b.discountPct ?? "") })}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setFocusedInput({ id: b.id, field: 'discountPct', val: value });
                                      if (/^\d*\.?\d*$/.test(value) || value === "") {
                                        updateBufferLine(b.id, {
                                          discountPct: value === "" ? 0 : Number(value),
                                        });
                                      }
                                    }}
                                    onBlur={() => setFocusedInput(null)}
                                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-[#1fbe5a] focus:ring-1 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center align-middle">
                                  <span translate="no" className="font-medium text-blue-600 notranslate">
                                    <span>{getCurrencySymbol(currency)}</span>
                                    <span>{convertAmount(taxable, currency).toFixed(2)}</span>
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-center align-middle">
                                  <button
                                    onClick={() => removeFromBuffer(b.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Remove item"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Scroll indicator */}
                    <div className="sticky left-0 bottom-0 w-full py-1 bg-gradient-to-r from-transparent via-yellow-100/20 to-transparent text-center text-xs text-gray-500 border-t border-yellow-200">
                      ← Scroll horizontally →
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed pagination controls at bottom of modal */}
        {step === "browse" && (
          <div className="px-6 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
              <div className="text-yellow-900 font-medium hidden sm:block">
                <span>Showing </span>
                <span className="notranslate" translate="no">
                  <span>{(page - 1) * pageSize + 1}</span>-
                  <span>{Math.min(page * pageSize, filtered.length)}</span>
                </span>
                <span> of </span>
                <span className="notranslate" translate="no">{filtered.length}</span>
              </div>
              <div className="text-yellow-900 font-medium sm:hidden">
                <span className="notranslate" translate="no">
                  <span>{Math.min(page * pageSize, filtered.length)}</span> of <span>{filtered.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 sm:px-3 sm:py-1 border border-yellow-200 rounded text-yellow-900 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Prev</span>
                  <span className="sm:hidden">‹</span>
                </button>
                <span className="px-2 py-1 sm:px-3 sm:py-1 bg-yellow-100 border border-yellow-200 rounded text-yellow-900 font-medium text-xs sm:text-sm notranslate" translate="no">
                  <span>{page}</span> / <span>{totalPages}</span>
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="px-2 py-1 sm:px-3 sm:py-1 border border-yellow-200 rounded text-yellow-900 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">›</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Main QuotationForm (Create Sale Form) ---------- */
export default function QuotationForm(props) {
  return (
    <>
      <StyleInjector />
      <QuotationFormContent {...props} />
    </>
  );
}

function QuotationFormContent({
  onSave,
  onBack,
  initialData = {},
  products: initialProducts = [],
  // New props for customizable title and action buttons
  formTitle = "Create Quotation",
  formType: explicitFormType, // New prop for explicit type setting
  showTopActions = true,
  showBottomActions = true,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  billToLabel = "Bill To",
  showBankDetails = true,
  currency = "INR", // Default to INR
}) {
  const navigate = useNavigate();
  const todayISO = new Date().toISOString().slice(0, 10);

  // Helper function to determine form type
  const getFormType = () => {
    // Priority 1: explicitly passed prop
    if (explicitFormType) {
      return explicitFormType;
    }

    // Priority 2: explicitly provided in initialData
    if (initialData.type === 'sales_return') {
      return 'salesReturn';
    }
    if (initialData.type) {
      return initialData.type;
    }

    // Priority 3: title-based detection
    const title = formTitle?.toLowerCase() || '';
    if (title.includes('delivery challan')) return 'deliveryChallan';
    if (title.includes('book invoice')) return 'bookInvoice';
    if (title.includes('book purchase order')) return 'bookPurchaseOrder';
    if (title.includes('purchase invoice')) return 'bookPurchaseOrder';
    if (title.includes('debit note')) return 'debitNote';
    if (title.includes('purchase order')) return 'purchaseOrder';
    if (title.includes('credit note')) return 'creditNote';
    if (title.includes('proforma')) return 'proforma';
    if (title.includes('sales return')) return 'salesReturn';
    if (title.includes('sales') || title.includes('invoice')) return 'sales';
    return 'quotation';
  };

  const formType = getFormType();
  const isPurchase = formType && (formType.toLowerCase().includes('purchase') || formType === 'debitNote' || formType === 'purchaseReturn');

  // Fetch Book Purchase Orders for Tax Invoice
  const [bookPOs, setBookPOs] = useState([]);
  const [standardPOs, setStandardPOs] = useState([]);
  useEffect(() => {
    const fetchBookPOs = async () => {
      if (['sales', 'creditNote', 'debitNote'].includes(formType)) {
        try {
          const businessId = localStorage.getItem("selectedBusinessId");
          if (businessId) {
            const response = await bookPurchaseOrderAPI.getAll(businessId);
            if (response.success) {
              setBookPOs(response.data || []);
            }

            // Also fetch standard POs for "From PO Order" flow
            const stdResponse = await purchaseOrderAPI.getAll(businessId);
            if (stdResponse.success) {
              setStandardPOs(stdResponse.data || []);
            }
          }
        } catch (error) {
          console.error("Error fetching POs:", error);
        }
      }
    };
    fetchBookPOs();
  }, [formType]);

  // Loading state for initial data fetch
  const [invoiceNoError, setInvoiceNoError] = useState('');
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-dropdown-container')) {
        setActiveSearchRowId(null);
      }
    };
    const handleScroll = () => {
      setActiveSearchRowId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Quotation number will be generated by backend
  // (removed frontend generation logic)

  const [party, setParty] = useState(initialData.partyName || initialData.party_name || "");
  const [invoiceNo, setInvoiceNo] = useState(() => {
    // For editing, use the existing number from initialData
    if (initialData.quotation_number) {
      return initialData.quotation_number;
    }
    if (initialData.invoice_number) {
      return initialData.invoice_number;
    }
    if (initialData.proforma_number) {
      return initialData.proforma_number;
    }
    if (initialData.sales_return_number) {
      return initialData.sales_return_number;
    }
    if (initialData.credit_note_number) {
      return initialData.credit_note_number;
    }
    if (initialData.note_number) {
      return initialData.note_number;
    }
    if (initialData.purchase_return_number) {
      return initialData.purchase_return_number;
    }
    if (initialData.debit_note_number) {
      return initialData.debit_note_number;
    }
    if (initialData.purchase_order_number) {
      return initialData.purchase_order_number;
    }
    if (initialData.challan_number) {
      return initialData.challan_number;
    }
    if (initialData.purchase_invoice_number) {
      return initialData.purchase_invoice_number;
    }
    if (initialData.book_invoice_number) {
      return initialData.book_invoice_number;
    }
    if (initialData.book_purchase_order_number) {
      return initialData.book_purchase_order_number;
    }

    // For new documents, start empty - will be filled by useEffect from API
    return '';
  });
  const [invoiceDate, setInvoiceDate] = useState(() => {
    // Get the date value and format it properly for date input (yyyy-MM-dd)
    const rawDate = initialData.date ||
      initialData.invoice_date ||
      initialData.invoiceDate ||
      initialData.quotation_date ||
      initialData.note_date ||
      initialData.return_date ||
      initialData.challan_date ||
      initialData.order_date ||
      initialData.created_at ||
      initialData.createdAt;

    if (rawDate) {
      // Handle ISO timestamp format (e.g., "2026-01-21T18:30:00.000Z")
      if (rawDate.includes('T')) {
        return rawDate.split('T')[0];
      }
      // Handle other formats that might need formatting
      try {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Invalid date format:', rawDate);
      }
    }

    return todayISO;
  });
  const [paymentTerms, setPaymentTerms] = useState(
    initialData.meta?.paymentTerms ?? 30,
  );
  const [dueDate, setDueDate] = useState(() => {
    const rawDue = initialData.due_date ||
      initialData.dueDate ||
      initialData.valid_until ||
      initialData.valid_till ||
      initialData.expiry_date ||
      initialData.expected_delivery_date ||
      initialData.delivery_date ||
      initialData.meta?.dueDate ||
      initialData.meta?.due_date ||
      initialData.meta?.valid_until ||
      initialData.meta?.valid_till;

    if (rawDue) {
      if (typeof rawDue === 'string' && rawDue.includes('T')) {
        return rawDue.split('T')[0];
      }
      return rawDue;
    }

    return calculateDueDate(todayISO, paymentTerms);
  });
  const [notes, setNotes] = useState(initialData.meta?.notes || initialData.notes || "");
  const [poAgreementNumber, setPoAgreementNumber] = useState(initialData.meta?.poAgreementNumber || initialData.po_agreement_number || "");
  const [remark, setRemark] = useState(initialData.meta?.remark || initialData.remark || "");
  const [termsText, setTermsText] = useState(
    initialData.meta?.terms || initialData.terms || ""
  );
  const [charges, setCharges] = useState(initialData.meta?.charges || initialData.charges || []);
  const [discountAfterTaxPct, setDiscountAfterTaxPct] = useState(
    initialData.meta?.discountAfterTaxPct || initialData.discountAfterTaxPct || 0,
  );

  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankIndex, setSelectedBankIndex] = useState(-1);
  const [editingBankIndex, setEditingBankIndex] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);

  // Dynamic products state
  const [products, setProducts] = useState(initialProducts);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Parties state for dropdown
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  // Address modal states (from Parties.jsx)
  const [showBillingAddressModal, setShowBillingAddressModal] = useState(false);
  const [showShippingAddressModal, setShowShippingAddressModal] = useState(false);
  const [showBillingAddressesModal, setShowBillingAddressesModal] = useState(false);
  const [showShippingAddressesModal, setShowShippingAddressesModal] = useState(false);
  const [editingBillingIndex, setEditingBillingIndex] = useState(null);
  const [editingShippingIndex, setEditingShippingIndex] = useState(null);
  const [selectedBillingAddressIndex, setSelectedBillingAddressIndex] = useState(0);
  const [selectedShippingAddressIndex, setSelectedShippingAddressIndex] = useState(0);
  const [partyAddresses, setPartyAddresses] = useState({ billing: [], shipping: [] });

  // NEW: Business data and manual shipping details for Purchase Orders
  const [businessData, setBusinessData] = useState(null);
  const [shippingDetails, setShippingDetails] = useState(() => {
    // If editing and has shipping meta, use it
    if (initialData.meta?.shipping_address || initialData.meta?.ship_city) {
      return {
        shipping_address: initialData.meta.shipping_address || "",
        ship_city: initialData.meta.ship_city || "",
        ship_state: initialData.meta.ship_state || "",
        ship_pincode: initialData.meta.ship_pincode || "",
        ship_country: initialData.meta.ship_country || "India",
        meta: {
          shipping_attention: initialData.meta.shipping_attention || "",
          shipping_line2: initialData.meta.shipping_line2 || "",
          shipping_phone: initialData.meta.shipping_phone || "",
          shipping_fax: initialData.meta.shipping_fax || ""
        }
      };
    }
    return {
      shipping_address: "",
      ship_city: "",
      ship_state: "",
      ship_pincode: "",
      ship_country: "India",
      meta: {
        shipping_attention: "",
        shipping_line2: "",
        shipping_phone: "",
        shipping_fax: ""
      }
    };
  });
  const [showBusinessShippingEditModal, setShowBusinessShippingEditModal] = useState(false);

  // NEW: Sync shippingDetails from initialData when it changes (for editing)
  useEffect(() => {
    if (initialData.meta?.shipping_address || initialData.meta?.ship_city || initialData.shipping_address) {
      setShippingDetails({
        shipping_address: initialData.meta?.shipping_address || initialData.shipping_address || "",
        ship_city: initialData.meta?.ship_city || initialData.ship_city || "",
        ship_state: initialData.meta?.ship_state || initialData.ship_state || "",
        ship_pincode: initialData.meta?.ship_pincode || initialData.ship_pincode || "",
        ship_country: initialData.meta?.ship_country || initialData.ship_country || "India",
        meta: {
          shipping_attention: initialData.meta?.shipping_attention || initialData.shipping_attention || "",
          shipping_line2: initialData.meta?.shipping_line2 || initialData.shipping_line2 || "",
          shipping_phone: initialData.meta?.shipping_phone || initialData.shipping_phone || "",
          shipping_fax: initialData.meta?.shipping_fax || initialData.shipping_fax || ""
        }
      });
    }
  }, [initialData.id, initialData.meta?.shipping_address, initialData.meta?.ship_city]);

  const [customUnits, setCustomUnits] = useState(() => {
    const saved = localStorage.getItem('customUnits');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState([]);

  const [showUnitDropdown, setShowUnitDropdown] = useState(null); // will store the line id
  const [showTaxTypeDropdown, setShowTaxTypeDropdown] = useState(null); // will store the line id

  // GST/VAT/No Tax Toggle State
  const [useGST, setUseGST] = useState(() => {
    const val = initialData.meta?.useGST;
    return val === true || val === 1 || val === "true";
  });
  const [useVAT, setUseVAT] = useState(() => {
    const val = initialData.meta?.useVAT;
    return val === true || val === 1 || val === "true";
  });
  const [useNoTax, setUseNoTax] = useState(() => {
    const val = initialData.meta?.useNoTax;
    return val === true || val === 1 || val === "true";
  });
  const [isBusinessIndia, setIsBusinessIndia] = useState(true);
  const [isExport, setIsExport] = useState(false);

  // Auto-calculated tax type (GST or IGST) - tracks what was auto-determined
  const [autoCalculatedTaxType, setAutoCalculatedTaxType] = useState('GST');
  const isFirstTaxDetectionRef = useRef(true);

  const [termsHeading, setTermsHeading] = useState(initialData.meta?.termsHeading || "Terms & Conditions");

  // Determine if this is an editing form
  const isEditing = !!(initialData.quotation_number || initialData.invoice_number || initialData.proforma_number ||
    initialData.sales_return_number || initialData.credit_note_number || initialData.note_number ||
    initialData.purchase_return_number || initialData.debit_note_number || initialData.purchase_order_number ||
    initialData.challan_number || initialData.purchase_invoice_number || initialData.book_purchase_order_number || initialData.id);

  const [focusedInput, setFocusedInput] = useState(null); // { id, field, val }

  // Approval Workflow State
  const [level1_email, setLevel1Email] = useState(initialData.level1_email || initialData.meta?.level1_email || "");
  const [level2_email, setLevel2Email] = useState(initialData.level2_email || initialData.meta?.level2_email || "");
  const [level3_email, setLevel3Email] = useState(initialData.level3_email || initialData.meta?.level3_email || "");

  useEffect(() => {
    // Fetch categories for inventory mapping
    const fetchCategories = async () => {
      try {
        const res = await categoryAPI.getAll(localStorage.getItem('selectedBusinessId'));
        if (res.success && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();

    // Removed IP-based tax detection as per user request
  }, []);
  const [sections, setSections] = useState([
    {
      id: 1,
      heading: initialData.meta?.termsHeading || "Terms & Conditions",
      content: initialData.meta?.terms || " ",
      is_locked: false
    }
  ]);

  // Text Editor Modal State
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);

  // Sync sections from initialData when they change (e.g., after pre-fetch in BookInvoice)
  useEffect(() => {
    if (initialData?.meta?.terms_sections && Array.isArray(initialData.meta.terms_sections) && initialData.meta.terms_sections.length > 0) {
      setSections(initialData.meta.terms_sections);
    } else if (initialData?.meta?.terms) {
      setSections([{
        id: 1,
        heading: initialData.meta?.termsHeading || "Terms & Conditions",
        content: initialData.meta.terms,
        is_locked: false
      }]);
    }
  }, [initialData?.meta?.terms_sections, initialData?.meta?.terms]);

  // Fetch terms sections from database when editing existing document
  useEffect(() => {
    const fetchLockedTerms = async () => {
      try {
        const businessId = localStorage.getItem('selectedBusinessId');
        const lockedResponse = await termsConditionsAPI.getLockedTerms(businessId);
        if (lockedResponse.success && Array.isArray(lockedResponse.data)) {


          // Deduplicate by heading and content
          const uniqueTerms = [];
          const seen = new Set();

          for (const term of lockedResponse.data) {
            const key = `${term.heading.trim().toLowerCase()}_${term.content.trim().toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueTerms.push(term);
            }
          }

          return uniqueTerms.map((lockedTerm, index) => ({
            id: lockedTerm.id, // Keep real ID for dynamic locking
            heading: lockedTerm.heading,
            content: lockedTerm.content,
            is_locked: true,
            is_template: true // Mark as template to prevent overwriting original on Save
          }));
        }
      } catch (error) {
        console.error('Error fetching global locked terms:', error);
      }
      return [];
    };

    const fetchTermsSections = async () => {
      const documentId = initialData.dbId || initialData.id;
      const docType = initialData.type || formType || 'quotation';

      try {
        let response = null;

        // Only fetch document-specific terms if document exists
        if (documentId) {


          if (docType === 'sales') {
            response = await termsConditionsAPI.getBySalesId(documentId);
          } else if (docType === 'proforma') {
            response = await termsConditionsAPI.getByProformaId(documentId);
          } else if (docType === 'creditNote') {
            response = await termsConditionsAPI.getByCreditNoteId(documentId);
          } else if (docType === 'debitNote') {
            response = await termsConditionsAPI.getByDebitNoteId(documentId);
          } else if (docType === 'salesReturn') {
            response = await termsConditionsAPI.getBySalesReturnId(documentId);
          } else if (docType === 'purchaseReturn') {
            response = await termsConditionsAPI.getByPurchaseReturnId(documentId);
          } else if (docType === 'deliveryChallan') {
            response = await termsConditionsAPI.getByDeliveryChallanId(documentId);
          } else if (docType === 'bookPurchaseOrder') {
            response = await termsConditionsAPI.getByBookPurchaseOrderId(documentId);
          } else if (docType === 'purchaseInvoice') {
            response = await termsConditionsAPI.getByPurchaseInvoiceId(documentId);
          } else if (docType === 'bookInvoice') {
            response = await termsConditionsAPI.getByBookInvoiceId(documentId);
          } else if (docType === 'purchaseOrder') {
            response = await termsConditionsAPI.getByPurchaseOrderId(documentId);
          } else {
            response = await termsConditionsAPI.getByQuotationId(documentId);
          }
        }

        let sectionsToSet = [];

        // If document-specific terms exist, use them
        if (response?.success && response?.data && response.data.length > 0) {

          sectionsToSet = response.data.map((term, index) => ({
            id: term.id || Date.now() + index,
            heading: term.heading,
            content: term.content,
            is_locked: term.is_locked === 1 || term.is_locked === true
          }));
        } else {
          // If no document-specific terms, fetch and use locked global terms
          const lockedTerms = await fetchLockedTerms();
          if (lockedTerms && lockedTerms.length > 0) {
            sectionsToSet = lockedTerms;
          } else {
            // If no locked terms either, use default empty section
            sectionsToSet = [{
              id: 1,
              heading: "Terms & Conditions",
              content: " ",
              is_locked: false
            }];
          }
        }

        setSections(sectionsToSet);
        if (sectionsToSet.length > 0) {
          setTermsHeading(sectionsToSet[0].heading);
          setTermsText(sectionsToSet[0].content);
        }
      } catch (error) {
        console.error(`Error fetching terms sections:`, error);
        // Fallback to default
        setSections([{
          id: 1,
          heading: "Terms & Conditions",
          content: " ",
          is_locked: false
        }]);
      }
    };

    // Only fetch if initialData doesn't already contain terms
    const hasExistingTerms = initialData?.meta?.terms_sections?.length > 0 || initialData?.meta?.terms;

    if (!hasExistingTerms) {
      fetchTermsSections();
    }
  }, [initialData]);

  const handleToggleLock = async (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // If it's a real database record (not a high number Date.now() from UI)
    if (section.id && section.id < 1000000000) {
      try {
        const res = await termsConditionsAPI.lockSection(section.id);
        if (res.success) {
          // Toggle local state to match DB action
          const newStatus = res.action === 'locked';
          setSections(prev => prev.map(s =>
            s.id === sectionId ? { ...s, is_locked: newStatus } : s
          ));
        }
      } catch (error) {
        console.error('Error toggling lock dynamically:', error);
        // Fallback to local toggle if API fails
        setSections(prev => prev.map(s =>
          s.id === sectionId ? { ...s, is_locked: !s.is_locked } : s
        ));
      }
    } else {
      // For purely new unsaved sections, just toggle locally
      setSections(prev => prev.map(s =>
        s.id === sectionId ? { ...s, is_locked: !s.is_locked } : s
      ));
    }
  };

  // Selected party details for Bill To / Ship To sections
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedPartyDetails, setSelectedPartyDetails] = useState(null);


  // Fetch party addresses when party is selected
  useEffect(() => {
    const fetchPartyAddresses = async () => {
      if (!selectedParty || !selectedParty.id) {
        setPartyAddresses({ billing: [], shipping: [] });
        return;
      }

      try {
        const businessId = localStorage.getItem("selectedBusinessId");
        const response = await fetch(
          `${getApiConfig().backendURL}/api/parties/${selectedParty.id}/addresses?business_id=${businessId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Separate billing and shipping addresses
            const billingAddrs = result.data.filter(addr => addr.address_type === 'billing');
            const shippingAddrs = result.data.filter(addr => addr.address_type === 'shipping');

            setPartyAddresses({
              billing: billingAddrs,
              shipping: shippingAddrs
            });

            // Find matching billing index
            if (billingAddrs.length > 0 && selectedPartyDetails) {
              const currentLine1 = selectedPartyDetails.billing_address || "";
              const currentPincode = selectedPartyDetails.pincode || "";

              const idx = billingAddrs.findIndex(a =>
                (a.id === selectedParty.bill_to_id) ||
                (a.line1?.trim() === currentLine1.trim() && a.pincode?.toString().trim() === currentPincode.toString().trim())
              );
              if (idx !== -1) setSelectedBillingAddressIndex(idx);
              else setSelectedBillingAddressIndex(0);
            }

            // Find matching shipping index
            if (shippingAddrs.length > 0 && selectedPartyDetails) {
              const currentShipLine1 = selectedPartyDetails.shipping_address || "";
              const currentShipPincode = selectedPartyDetails.ship_pincode || "";

              const idx = shippingAddrs.findIndex(a =>
                (a.id === selectedParty.ship_to_id) ||
                (a.line1?.trim() === currentShipLine1.trim() && a.pincode?.toString().trim() === currentShipPincode.toString().trim())
              );
              if (idx !== -1) setSelectedShippingAddressIndex(idx);
              else setSelectedShippingAddressIndex(0);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching party addresses:', error);
      }
    };

    fetchPartyAddresses();
  }, [selectedParty, selectedPartyDetails]);


  // Auto-calculate tax type based on business state and party address state
  // NOTE: This will be moved after lines state is declared to avoid reference errors

  // Track selected business ID
  const [currentBusinessId, setCurrentBusinessId] = useState(localStorage.getItem("selectedBusinessId"));
  // Load bank accounts for the business
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const businessId = localStorage.getItem("selectedBusinessId");
        if (!businessId) return;

        const response = await fetch(`${getApiConfig().backendURL}/api/bank-details?business_id=${businessId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setBankAccounts(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading bank accounts:', error);
      }
    };

    loadBankAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not when initialData changes

  // Separate useEffect to set selected bank index after bank accounts are loaded
  useEffect(() => {
    if (bankAccounts.length === 0) {
      setSelectedBankIndex(-1);
      return;
    }

    // Only set default if not already selected or if current selection is invalid
    if (selectedBankIndex === -1 || !bankAccounts[selectedBankIndex]) {
      const savedBankId = initialData.bank_id || initialData.meta?.bank_id;
      const savedSelectedIndex = initialData.meta?.selectedBankIndex;

      if (savedBankId) {
        const bankIndex = bankAccounts.findIndex(bank => bank.id === savedBankId);
        if (bankIndex !== -1) {
          setSelectedBankIndex(bankIndex);
        } else {
          setSelectedBankIndex(0);
        }
      } else if (savedSelectedIndex != null && bankAccounts[savedSelectedIndex]) {
        setSelectedBankIndex(savedSelectedIndex);
      } else {
        setSelectedBankIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccounts]); // Run when bank accounts are loaded

  // Fetch products for the selected business
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const { inventoryAPI } = await import("../../../utils/api.js");
        const selectedBusinessId = localStorage.getItem("selectedBusinessId");

        if (selectedBusinessId) {

          const result = await inventoryAPI.getAll(selectedBusinessId);

          if (result.success && result.data) {

            // Map backend data to frontend format
            const mappedProducts = result.data.map((product) => ({
              id: product.id,
              name: product.item_name,
              code: product.item_code || product.hsn_code,
              hsn: product.hsn_code || "", // Only show HSN code, blank if null
              salesPrice: parseFloat(product.sale_price) || 0,
              purchasePrice: parseFloat(product.purchase_price) || 0,
              qty: "",
              stockQuantity: product.opening_stock || 0,
              stockUnit: product.unit || "PCS",
              subtitle: product.description || product.category || "",
              image_url: product.image_url, // Add image URL mapping
            }));

            setProducts(mappedProducts);
          } else {

          }
        } else {

        }
      } catch (error) {
        console.error("Error fetching products:", error);
        // Keep empty array as fallback
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch parties for the selected business
  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoadingParties(true);
        const selectedBusinessId = localStorage.getItem("selectedBusinessId");

        if (selectedBusinessId) {

          const result = await partyAPI.getAll(selectedBusinessId);

          if (result.success && result.data) {
            const mappedData = result.data.map(p => ({
              ...p,
              no_tax: p.no_tax === 1 || p.no_tax === true || p.no_tax === "true",
              registration_type: p.registration_type || (p.no_tax ? "NO_TAX" : p.gstin ? "GSTIN" : p.vat ? "VAT" : ""),
              registrationType: p.registration_type || (p.no_tax ? "NO_TAX" : p.gstin ? "GSTIN" : p.vat ? "VAT" : ""),
            }));
            setParties(mappedData);
          } else {
            setParties([]);
          }
        } else {

          setParties([]);
        }
      } catch (error) {
        console.error("Error fetching parties:", error);
        setParties([]);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchParties();
  }, []); // Note: This will refetch when selectedBusinessId changes if we add it to deps, but since it's from localStorage, we need a different approach

  // NEW: Fetch business details on mount and initialize shippingDetails for Purchase Orders
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      const businessId = localStorage.getItem("selectedBusinessId");
      if (businessId) {
        try {
          const res = await businessAPI.getById(businessId);
          if (res.success && res.data) {
            setBusinessData(res.data);

            // If it's a new Purchase Order and we don't have shippingDetails set from meta,
            // default Ship To to business details
            if (formType === 'purchaseOrder' && !initialData.id && !shippingDetails.shipping_address) {
              setShippingDetails({
                shipping_address: res.data.address || "",
                ship_city: res.data.city || "",
                ship_state: res.data.state || "",
                ship_pincode: res.data.pincode || "",
                ship_country: res.data.country || "India",
                meta: {
                  shipping_attention: res.data.business_name || res.data.name || "",
                  shipping_line2: "",
                  shipping_phone: res.data.phone_number || "",
                  shipping_fax: ""
                }
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch business details:", err);
        }
      }
    };
    fetchBusinessDetails();
  }, [formType, initialData.id]);

  // Listen for business changes and update state
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {

        setCurrentBusinessId(newBusinessId);

        // Refetch parties for the new business
        if (newBusinessId) {
          partyAPI.getAll(newBusinessId).then(result => {
            if (result.success && result.data) {
              setParties(result.data);
            } else {
              setParties([]);
            }
          }).catch(error => {
            console.error("Error refetching parties:", error);
            setParties([]);
          });
        } else {
          setParties([]);
        }
      }
    };

    // Listen for storage changes (when business is changed in another tab/window)
    window.addEventListener('storage', handleBusinessChange);

    // Also listen for a custom event that can be dispatched when business changes
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, [currentBusinessId]);

  const [showNotes, setShowNotes] = useState(Boolean(initialData.meta?.notes || initialData.notes));
  const [showTerms, setShowTerms] = useState(Boolean(initialData.meta?.terms || initialData.terms));

  // IMPORTANT CHANGE: do not show a default blank line when there are no initial lines.
  // Show lines only if initialData.meta.lines exists; otherwise start with empty array.
  const [lines, setLines] = useState(() => {
    // Try to get lines from different possible locations
    const lineItems = initialData.meta?.lines ||
      initialData.book_purchase_order_data?.lines ||
      initialData.credit_note_data?.lines ||
      initialData.sales_return_data?.lines ||
      initialData.challan_data?.lines ||
      initialData.purchase_invoice_data?.lines ||
      initialData.purchase_return_data?.lines ||
      initialData.debit_note_data?.lines ||
      initialData.purchase_order_data?.lines ||
      initialData.quotation_data?.lines ||
      initialData.invoice_data?.lines ||
      initialData.proforma_data?.lines ||
      [];

    if (lineItems && lineItems.length > 0) {
      return lineItems.map((ln) => {
        const cgst = ln.cgstPct ?? ln.cgst_pct ?? 0;
        const sgst = ln.sgstPct ?? ln.sgst_pct ?? 0;
        const igst = ln.igstPct ?? ln.igst_pct ?? 0;
        const vat = ln.vatPct ?? ln.vat_pct ?? 0;
        const discount = ln.discountPct ?? ln.discount_pct ?? 0;

        // Auto-detect tax type if not provided
        let detectedTaxType = ln.taxType || (ln.tax_type);
        if (!detectedTaxType) {
          if (igst > 0) detectedTaxType = 'IGST';
          else if (vat > 0) detectedTaxType = 'VAT';
          else if (cgst > 0 || sgst > 0) detectedTaxType = 'GST';
          else detectedTaxType = 'No Tax';
        }

        return {
          ...ln,
          id: ln.id || Date.now() + Math.random(),
          taxType: detectedTaxType,
          cgstPct: cgst,
          sgstPct: sgst,
          igstPct: igst,
          vatPct: vat,
          discountPct: discount,
        };
      });
    }

    // Default to 1 manual row for new documents
    return [
      {
        id: Date.now() + Math.random(),
        description: "",
        subtitle: "",
        hsn: "",
        qty: "",
        unit: "PCS",
        price: 0,
        discountPct: 0,
        taxType: "GST",
        cgstPct: 0,
        sgstPct: 0,
        igstPct: 0,
        vatPct: 0,
        overrideAmount: null,
      }
    ];
  });

  const [lineErrors, setLineErrors] = useState({});

  // Auto-select party when editing existing document OR when pre-filled data is provided for a new document
  useEffect(() => {
    const targetPartyName = initialData.partyName || initialData.party_name;
    const targetPartyId = initialData.party_id;


    if (parties.length > 0) {
      // 1. Handle Bill To Party
      if (targetPartyName || targetPartyId) {
        const existingParty = parties.find(p =>
          (targetPartyId && String(p.id) === String(targetPartyId)) ||
          (targetPartyName && p.party_name?.toLowerCase() === targetPartyName.toLowerCase())
        );

        if (existingParty && (!selectedParty || String(selectedParty.id) !== String(existingParty.id))) {
          setSelectedParty(existingParty);
          setParty(existingParty.party_name);

          // Fetch full party details in background
          partyAPI.getById(existingParty.id, localStorage.getItem("selectedBusinessId")).then(result => {
            if (result.success && result.data) {
              // Helper to find field in any possible location
              const findField = (fieldName) => {
                return initialData[fieldName] ||
                  initialData.meta?.[fieldName] ||
                  initialData.quotation_data?.[fieldName] ||
                  initialData.invoice_data?.[fieldName] ||
                  initialData.proforma_data?.[fieldName] ||
                  initialData.challan_data?.[fieldName] ||
                  initialData.book_invoice_data?.[fieldName] ||
                  initialData.book_purchase_order_data?.[fieldName] ||
                  initialData.credit_note_data?.[fieldName] ||
                  initialData.debit_note_data?.[fieldName] ||
                  initialData.sales_return_data?.[fieldName] ||
                  initialData.purchase_return_data?.[fieldName] ||
                  initialData.purchase_order_data?.[fieldName] ||
                  initialData.purchase_invoice_data?.[fieldName];
              };

              const mergedDetails = {
                ...result.data,
                billing_address: findField('billing_address') || result.data.billing_address,
                city: (findField('city') !== undefined && findField('city') !== "null") ? findField('city') : result.data.city,
                state: (findField('state') !== undefined && findField('state') !== "null") ? findField('state') : result.data.state,
                pincode: (findField('pincode') !== undefined && findField('pincode') !== "null") ? findField('pincode') : result.data.pincode,
                country: findField('country') || result.data.country || 'India',

                shipping_address: findField('shipping_address') || result.data.shipping_address,
                ship_city: (findField('ship_city') !== undefined && findField('ship_city') !== "null") ? findField('ship_city') : result.data.ship_city,
                ship_state: (findField('ship_state') !== undefined && findField('ship_state') !== "null") ? findField('ship_state') : result.data.ship_state,
                ship_pincode: (findField('ship_pincode') !== undefined && findField('ship_pincode') !== "null") ? findField('ship_pincode') : result.data.ship_pincode,
                ship_country: findField('ship_country') || result.data.ship_country || 'India',

                meta: {
                  ...result.data.meta,
                  billing_attention: findField('billing_attention') || result.data.meta?.billing_attention || "",
                  billing_line2: findField('billing_line2') || result.data.meta?.billing_line2 || "",
                  billing_phone: findField('billing_phone') || result.data.meta?.billing_phone || "",
                  billing_fax: findField('billing_fax') || result.data.meta?.billing_fax || "",
                  shipping_attention: findField('shipping_attention') || result.data.meta?.shipping_attention || "",
                  shipping_line2: findField('shipping_line2') || result.data.meta?.shipping_line2 || "",
                  shipping_phone: findField('shipping_phone') || result.data.meta?.shipping_phone || "",
                  shipping_fax: findField('shipping_fax') || result.data.meta?.shipping_fax || "",
                }
              };
              setSelectedPartyDetails(mergedDetails);

              if (initialData.meta?.selectedBillingIndex !== undefined) {
                setSelectedBillingAddressIndex(initialData.meta.selectedBillingIndex);
              }
            } else {
              setSelectedPartyDetails(existingParty);
            }
          }).catch(error => {
            console.error("❌ Error fetching party details:", error);
            setSelectedPartyDetails(existingParty);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties.length, initialData.partyName, initialData.party_name, initialData.party_id]);

  // submitting state to prevent double submits
  const [submitting, setSubmitting] = useState(false);

  /*
  // OLD LOGIC (Commented out)
  // Auto-calculate tax type based on business state and party address state
  useEffect(() => {
    const autoCalculateTaxType = async () => {


      if (!selectedParty || !partyAddresses.billing || partyAddresses.billing.length === 0) {

        return;
      }

      const businessId = localStorage.getItem("selectedBusinessId");
      if (!businessId) {

        return;
      }

      try {


        const result = await calculateAutoTaxType({
          businessId,
          partyAddresses,
          selectedBillingIndex: selectedBillingAddressIndex,
          selectedShippingIndex: selectedShippingAddressIndex,
          currentLines: lines
        });



        if (result.taxType) {

          setAutoCalculatedTaxType(result.taxType);

        }
      } catch (error) {

      }
    };

    autoCalculateTaxType();
  }, [selectedParty, partyAddresses, selectedBillingAddressIndex, selectedShippingAddressIndex]);

  // Handle auto-selecting GST/VAT/No Tax based on party details
  useEffect(() => {
    if (selectedPartyDetails) {


      if (selectedPartyDetails.gstin) {

        handleGSTVATToggle(true, false, false);
      } else if (selectedPartyDetails.vat) {

        handleGSTVATToggle(false, true, false);
      } else {

        handleGSTVATToggle(false, false, true);
      }
    }
  }, [selectedPartyDetails]);
  */

  useEffect(() => {
    const applyTaxDetection = async () => {
      console.log("%c[TaxDetection] Starting...", "color: cyan; font-weight: bold;");

      if (!selectedParty) {
        console.log("[TaxDetection] No party selected.");
        return;
      }

      // Respect saved or provided settings during initial load if they exist
      const isTrue = (v) => v === true || v === 1 || v === "true";
      const hasSavedTaxMode = initialData.meta && (isTrue(initialData.meta.useGST) || isTrue(initialData.meta.useVAT) || isTrue(initialData.meta.useNoTax));
      const skipToggleUpdate = isFirstTaxDetectionRef.current && hasSavedTaxMode;

      if (isFirstTaxDetectionRef.current) {
        isFirstTaxDetectionRef.current = false;
      }

      const hasAddresses = (partyAddresses.billing && partyAddresses.billing.length > 0) ||
        (partyAddresses.shipping && partyAddresses.shipping.length > 0);

      if (!hasAddresses) {
        console.log("[TaxDetection] No addresses found yet for party:", selectedParty.id);
        return;
      }

      const businessId = localStorage.getItem("selectedBusinessId");
      if (!businessId) {
        console.log("[TaxDetection] No businessId in localStorage.");
        return;
      }

      try {
        const result = await calculateAutoTaxType({
          businessId,
          partyId: selectedParty.id,
          selectedBillingIndex: selectedBillingAddressIndex,
          selectedShippingIndex: selectedShippingAddressIndex
        });

        // 1. Set System Mode (GST or VAT)
        setIsBusinessIndia(result.isIndia);
        setIsExport(result.isExport);

        if (!skipToggleUpdate) {
          if (result.taxType === 'No Tax') {
            setUseGST(false);
            setUseVAT(false);
            setUseNoTax(true);
            setAutoCalculatedTaxType('No Tax');
          } else if (result.taxType === 'VAT') {
            setUseGST(false);
            setUseVAT(true);
            setUseNoTax(false);
            setAutoCalculatedTaxType('VAT');
          } else {
            // GST or IGST
            setUseGST(true);
            setUseVAT(false);
            setUseNoTax(false);
            setAutoCalculatedTaxType(result.taxType);
          }

          // 2. Update all lines with the new tax calculation
          setLines(prevLines =>
            prevLines.map(line => {
              const isIGST = result.taxType === 'IGST';
              return {
                ...line,
                taxType: result.taxType,
                // Reset taxes based on the detected type
                cgstPct: (result.taxType === 'GST') ? (line.cgstPct || 0) : 0,
                sgstPct: (result.taxType === 'GST') ? (line.sgstPct || 0) : 0,
                igstPct: (result.taxType === 'IGST') ? (line.igstPct || (Number(line.cgstPct || 0) + Number(line.sgstPct || 0)) || 0) : 0,
                vatPct: (result.taxType === 'VAT') ? (line.vatPct || 0) : 0
              };
            })
          );
        } else {
          // Even if skipping toggle update, we should set autoCalculatedTaxType 
          // so that if they later switch to GST, it knows whether it's GST or IGST
          if (result.isIndia) {
            setAutoCalculatedTaxType(result.taxType);
          } else {
            setAutoCalculatedTaxType('VAT');
          }
        }
      } catch (error) {
        console.error("Error in tax detection effect:", error);
      }
    };

    applyTaxDetection();
  }, [selectedParty, selectedPartyDetails, partyAddresses, selectedBillingAddressIndex, selectedShippingAddressIndex]);


  useEffect(() => {
    setDueDate(calculateDueDate(invoiceDate, paymentTerms));
  }, [invoiceDate, paymentTerms]);

  // Update lines with new tax type when toggle changes (Label update only)
  useEffect(() => {
    if (!useGST && !useVAT && !useNoTax) {
      return;
    }

    if (lines.length === 0) {
      return;
    }
    setLines((prevLines) =>
      prevLines.map((line) => {
        if (useGST) {
          return {
            ...line,
            taxType: autoCalculatedTaxType === 'IGST' ? 'IGST' : 'GST',
            // Defaulting to 0 if not set, or keeping existing rates
            cgstPct: line.cgstPct ?? 0,
            sgstPct: line.sgstPct ?? 0,
            igstPct: line.igstPct ?? 0,
            vatPct: 0
          };
        } else if (useVAT) {
          return {
            ...line,
            taxType: 'VAT',
            vatPct: line.vatPct ?? 0,
            cgstPct: 0,
            sgstPct: 0,
            igstPct: 0
          };
        } else if (useNoTax) {
          return {
            ...line,
            taxType: 'No Tax',
            cgstPct: 0,
            sgstPct: 0,
            igstPct: 0,
            vatPct: 0
          };
        }
        return line;
      })
    );
  }, [autoCalculatedTaxType, useGST, useVAT, useNoTax]);

  // Update fields when initialData changes (for edit mode)
  useEffect(() => {

    const newPoNumber = initialData.po_agreement_number || initialData.poAgreementNumber || initialData.meta?.po_agreement_number || initialData.meta?.poAgreementNumber || "";
    const newRemark = initialData.remark || initialData.meta?.remark || "";
    const newNotes = initialData.notes || initialData.meta?.notes || "";
    const newCharges = initialData.charges || initialData.meta?.charges || [];
    const newDiscountAfterTaxPct = initialData.discountAfterTaxPct || initialData.meta?.discountAfterTaxPct || 0;

    setPoAgreementNumber(newPoNumber);
    setRemark(newRemark);
    setNotes(newNotes);
    setCharges(newCharges);
    setDiscountAfterTaxPct(newDiscountAfterTaxPct);
  }, [
    initialData.poAgreementNumber, initialData.po_agreement_number, initialData.meta?.poAgreementNumber, initialData.meta?.po_agreement_number,
    initialData.remark, initialData.meta?.remark,
    initialData.notes, initialData.meta?.notes,
    initialData.charges, initialData.meta?.charges,
    initialData.discountAfterTaxPct, initialData.meta?.discountAfterTaxPct
  ]);

  // Fetch next quotation number when form loads for new documents
  useEffect(() => {
    const fetchNextDocumentNumber = async () => {
      // Only fetch for new documents (no initialData.id)
      if (initialData.id) {

        return;
      }

      try {
        const selectedBusinessId = localStorage.getItem("selectedBusinessId");


        if (!selectedBusinessId) {
          console.warn('No business ID found');
          // Set default number if no business ID
          const year = new Date().getFullYear();
          const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
          const defaultNumber = `${formType === 'quotation' ? 'Q' : formType === 'sales' ? 'INV' : formType === 'proforma' ? 'PI' : 'SR'}-${financialYear}-0001`;
          setInvoiceNo(defaultNumber);
          return;
        }

        let response;

        switch (formType) {
          case 'deliveryChallan': {
            const { deliveryChallanAPI } = await import('../../../utils/api');
            response = await deliveryChallanAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.challan_number) {

              setInvoiceNo(response.data.challan_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`DC-${financialYear}-0001`);
            }
            break;
          }
          case 'bookInvoice': {
            const { bookInvoiceAPI } = await import('../../../utils/api');
            response = await bookInvoiceAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.book_invoice_number) {
              setInvoiceNo(response.data.book_invoice_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`BI-${financialYear}-0001`);
            }
            break;
          }
          case 'bookPurchaseOrder': {
            const { bookPurchaseOrderAPI } = await import('../../../utils/api');
            response = await bookPurchaseOrderAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response.data.order_number) {
              setInvoiceNo(response.data.order_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`BPO-${financialYear}-0001`);
            }
            break;
          }
          case 'purchaseReturn': {
            const { purchaseReturnAPI } = await import('../../../utils/api');
            response = await purchaseReturnAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.purchase_return_number) {
              setInvoiceNo(response.data.purchase_return_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`PR-${financialYear}-0001`);
            }
            break;
          }
          case 'debitNote': {
            const { debitNoteAPI } = await import('../../../utils/api');
            response = await debitNoteAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.debit_note_number) {
              setInvoiceNo(response.data.debit_note_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`DN-${financialYear}-0001`);
            }
            break;
          }
          case 'purchaseOrder': {
            const { purchaseOrderAPI } = await import('../../../utils/api');
            response = await purchaseOrderAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.purchase_order_number) {
              setInvoiceNo(response.data.purchase_order_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`PO-${financialYear}-0001`);
            }
            break;
          }
          case 'creditNote': {
            const { creditNoteAPI } = await import('../../../utils/api');
            response = await creditNoteAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.credit_note_number) {
              setInvoiceNo(response.data.credit_note_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`CN-${financialYear}-0001`);
            }
            break;
          }
          case 'salesReturn': {
            const { salesReturnAPI } = await import('../../../utils/api');
            response = await salesReturnAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.sales_return_number) {
              setInvoiceNo(response.data.sales_return_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`SR-${financialYear}-0001`);
            }
            break;
          }
          case 'proforma': {
            const { proformaInvoiceAPI } = await import('../../../utils/api');
            response = await proformaInvoiceAPI.getNextNumber(selectedBusinessId);

            // Backend returns proforma_invoice_number (not proforma_number)
            const proformaNum = response?.data?.proforma_invoice_number || response?.data?.proforma_number;
            if (response?.success && proformaNum) {
              setInvoiceNo(proformaNum);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`PI-${financialYear}-0001`);
            }
            break;
          }
          case 'sales': {
            const { salesInvoiceAPI } = await import('../../../utils/api');
            response = await salesInvoiceAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.invoice_number) {
              setInvoiceNo(response.data.invoice_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`INV-${financialYear}-0001`);
            }
            break;
          }
          case 'quotation':
          default: {
            const { quotationAPI } = await import('../../../utils/api');
            response = await quotationAPI.getNextNumber(selectedBusinessId);

            if (response?.success && response?.data?.quotation_number) {
              setInvoiceNo(response.data.quotation_number);
            } else {
              const year = new Date().getFullYear();
              const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
              setInvoiceNo(`Q-${financialYear}-0001`);
            }
            break;
          }
        }
      } catch (error) {
        console.error('â Œ Error fetching next document number:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          stack: error.stack
        });
        // Set default number on error
        const year = new Date().getFullYear();
        const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
        let prefix = 'Q';
        if (formType === 'deliveryChallan') prefix = 'DC';
        else if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') prefix = 'BPO';
        else if (formType === 'bookInvoice') prefix = 'BI';
        else if (formType === 'purchaseReturn') prefix = 'PR';
        else if (formType === 'debitNote') prefix = 'DN';
        else if (formType === 'purchaseOrder') prefix = 'PO';
        else if (formType === 'creditNote') prefix = 'CN';
        else if (formType === 'sales') prefix = 'INV';
        else if (formType === 'proforma') prefix = 'PI';
        else if (formType === 'salesReturn') prefix = 'SR';
        setInvoiceNo(`${prefix}-${financialYear}-0001`);
      }
    };

    fetchNextDocumentNumber();
  }, [formType, initialData.id]);

  const handleGSTVATToggle = (gstEnabled, vatEnabled, noTaxEnabled) => {
    setUseGST(gstEnabled);
    setUseVAT(vatEnabled);
    setUseNoTax(noTaxEnabled);

    // Update all lines with new tax type
    let newTaxType = 'GST';
    if (gstEnabled) {
      // Use the auto-calculated type (GST or IGST) instead of hardcoding GST
      newTaxType = autoCalculatedTaxType === 'IGST' ? 'IGST' : 'GST';
    } else if (vatEnabled) {
      newTaxType = 'VAT';
    } else if (noTaxEnabled) {
      newTaxType = 'No Tax';
    }

    setLines(prevLines =>
      prevLines.map(line => {
        const isIGST = newTaxType === 'IGST';
        return {
          ...line,
          taxType: newTaxType,
          // Reset percentages based on the selected mode
          cgstPct: isIGST ? 0 : (newTaxType === 'GST' ? line.cgstPct : 0),
          sgstPct: isIGST ? 0 : (newTaxType === 'GST' ? line.sgstPct : 0),
          igstPct: isIGST ? (line.igstPct || (Number(line.cgstPct || 0) + Number(line.sgstPct || 0)) || 0) : 0,
          vatPct: newTaxType === 'VAT' ? (line.vatPct || 0) : 0
        };
      })
    );
  };

  const lineTotals = useMemo(
    () =>
      lines.map((l) => {
        const qty = Number(l.qty || 0);
        const price = Number(l.price || 0);
        const amt = qty * price;
        const discountPct = Number(l.discountPct || 0);
        const discountValue = (amt * discountPct) / 100;
        const taxable = Math.max(0, amt - discountValue);
        const cgstAmount = l.taxType === 'GST' ? taxable * (Number(l.cgstPct || 0) / 100) : 0;
        const sgstAmount = l.taxType === 'GST' ? taxable * (Number(l.sgstPct || 0) / 100) : 0;
        const igstAmount = l.taxType === 'IGST' ? taxable * (Number(l.igstPct || 0) / 100) : 0;
        const vatAmount = l.taxType === 'VAT' ? taxable * (Number(l.vatPct || 0) / 100) : 0;
        const tax = cgstAmount + sgstAmount + igstAmount + vatAmount;
        const computedTotal = taxable + tax;
        const override =
          l.overrideAmount != null ? Number(l.overrideAmount) : null;
        const total = override != null ? override : computedTotal;
        return { ...l, amt, discountValue, taxable, cgstAmount, sgstAmount, igstAmount, vatAmount, tax, computedTotal, total };
      }),
    [lines],
  );

  const subtotal = lineTotals.reduce(
    (s, l) =>
      s +
      (l.overrideAmount != null
        ? Number(l.overrideAmount) - Number(l.tax || 0)
        : l.taxable),
    0,
  );
  const totalTax = lineTotals.reduce((s, l) => s + Number(l.tax || 0), 0);
  const totalCgst = lineTotals.reduce((s, l) => s + Number(l.cgstAmount || 0), 0);
  const totalSgst = lineTotals.reduce((s, l) => s + Number(l.sgstAmount || 0), 0);
  const totalIgst = lineTotals.reduce((s, l) => s + Number(l.igstAmount || 0), 0);
  const totalVat = lineTotals.reduce((s, l) => s + Number(l.vatAmount || 0), 0);
  const chargesTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const discountAfterTaxValue =
    (subtotal + totalTax + chargesTotal) *
    (Number(discountAfterTaxPct || 0) / 100);
  const totalAmount =
    subtotal + totalTax + chargesTotal - discountAfterTaxValue;

  function updateLine(id, patch) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

    // Clear error for the field being updated
    if (Object.keys(patch).length > 0) {
      const updatedField = Object.keys(patch)[0];
      setLineErrors(prev => {
        if (!prev[id] || !prev[id][updatedField]) return prev;
        const newRowErrors = { ...prev[id] };
        delete newRowErrors[updatedField];

        const newErrors = { ...prev };
        if (Object.keys(newRowErrors).length === 0) {
          delete newErrors[id];
        } else {
          newErrors[id] = newRowErrors;
        }
        return newErrors;
      });
    }
  }

  const handleUnitChange = async (lineId, opt, isBuffer = false) => {
    if (opt?.id === "OTHER") {
      const newUnit = await showPremiumInputDialog({
        title: "Add Custom Unit",
        text: "Enter a custom measurement unit (e.g., BAG, CAN, DRUM)",
        inputPlaceholder: "Enter unit name",
        inputValidator: (value) => {
          if (!value || value.trim() === "") return "Unit name cannot be empty";
          if (value.length > 10) return "Unit name must be 10 characters or less";
          const exists = [...DEFAULT_UNIT_OPTIONS.map(o => o.id), ...customUnits].some(u => u.toUpperCase() === value.trim().toUpperCase());
          if (exists) return "This unit already exists";
          return null;
        },
        variant: "green",
        confirmText: "Add Unit"
      });
      if (newUnit && newUnit.trim()) {
        const unitUpper = newUnit.trim().toUpperCase();
        const updatedUnits = [...customUnits, unitUpper];
        setCustomUnits(updatedUnits);
        localStorage.setItem('customUnits', JSON.stringify(updatedUnits));
        if (isBuffer) {
          updateBufferLine(lineId, { unit: unitUpper });
        } else {
          updateLine(lineId, { unit: unitUpper });
        }
      }
    } else {
      if (isBuffer) {
        updateBufferLine(lineId, { unit: opt?.id || "PCS" });
      } else {
        updateLine(lineId, { unit: opt?.id || "PCS" });
      }
    }
  };

  async function handleImageUpload(e, id) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      updateLine(id, { image_url: event.target.result }); // temporary data URL
    };
    reader.readAsDataURL(file);

    // Upload to server in background
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${getApiConfig().backendURL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        updateLine(id, { image_url: data.image_url }); // replace with server URL
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Keep the preview data URL if upload fails
    }
  }
  async function removeLine(id) {
    // Use SweetAlert confirm
    const isConfirmed = await showConfirmationDialog({
      title: "Delete this line item?",
      text: "This action will remove the line from the invoice.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;
    setLines((prev) => prev.filter((x) => x.id !== id));
  }
  function addEmptyLine() {
    // When user requests manual entry, add exactly one blank line
    // Use the auto-calculated tax type if available, otherwise use the toggle selection
    let defaultTaxType = autoCalculatedTaxType; // Use auto-calculated type first

    // If user has manually selected VAT or No Tax, override the auto-calculated type
    if (useVAT) {
      defaultTaxType = 'VAT';
    } else if (useNoTax) {
      defaultTaxType = 'No Tax';
    }



    setLines((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        description: "",
        subtitle: "",
        hsn: "",
        qty: "",
        unit: "PCS",
        price: 0,
        discountPct: 0,
        taxType: defaultTaxType,
        cgstPct: 0,
        sgstPct: 0,
        igstPct: 0,
        vatPct: 0,
        overrideAmount: null,
      },
    ]);
  }

  function addCharge() {
    setCharges((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), label: "Additional Charge", amount: 0 },
    ]);
  }
  function updateCharge(id, patch) {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }
  function removeCharge(id) {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  }

  function addNewSection() {
    const newSection = { id: Date.now(), heading: "New Section", content: "" };
    setSections((prev) => [...prev, newSection]);
    // Automatically open text editor for the new section
    setEditingSectionId(newSection.id);
    setShowTextEditor(true);
  }

  function removeSection(id) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  // product modal control
  const [showProductModal, setShowProductModal] = useState(false);

  function addLinesFromModal(newLines = []) {
    if (!Array.isArray(newLines) || newLines.length === 0) return;

    // Determine the default tax type based on auto-calculation first, then toggle selection
    let defaultTaxType = autoCalculatedTaxType; // Use auto-calculated type first

    // If user has manually selected VAT or No Tax, override the auto-calculated type
    if (useVAT) {
      defaultTaxType = 'VAT';
    } else if (useNoTax) {
      defaultTaxType = 'No Tax';
    }


    const normalized = newLines.map((ln) => ({
      ...ln,
      id: ln.id || `imp-${Date.now()}-${Math.random()}`,
      productId: ln.productId || ln.productId || null,
      unit: ln.unit || "PCS",
      subtitle: ln.subtitle || "",
      discountPct: ln.discountPct || 0,
      taxType: defaultTaxType,
      cgstPct: (isExport || defaultTaxType !== 'GST') ? 0 : (ln.cgstPct || 0),
      sgstPct: (isExport || defaultTaxType !== 'GST') ? 0 : (ln.sgstPct || 0),
      igstPct: (isExport || defaultTaxType !== 'IGST') ? 0 : (ln.igstPct || 0),
      vatPct: (isExport || defaultTaxType !== 'VAT') ? 0 : (ln.vatPct || 0),
      overrideAmount: ln.overrideAmount != null ? ln.overrideAmount : null,
      qty: ln.qty ?? "",
      price: Number(ln.price ?? 0),
      description: ln.description ?? ln.name ?? "",
      hsn: ln.hsn ?? ln.code ?? "",
      image_url: ln.image_url || "",
    }));

    // Append new lines to current document lines
    setLines(prev => [...prev, ...normalized]);

    setShowProductModal(false);
  }

  const addBank = (acc) => {
    setBankAccounts((prev) => [...prev, acc]);
    if (selectedBankIndex === -1) setSelectedBankIndex(0);
  };

  const updateBank = async (idx, resultData) => {
    setBankAccounts((prev) => prev.map((a, i) => (i === idx ? resultData : a)));
  };

  const removeBank = async (idx) => {
    const bankToDelete = bankAccounts[idx];
    if (!bankToDelete) return;

    const isConfirmed = await showConfirmationDialog({
      title: "Delete Bank Account?",
      text: `Are you sure you want to delete the account for ${bankToDelete.bank_name}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!isConfirmed) return;

    try {
      const businessId = localStorage.getItem("selectedBusinessId");
      const response = await fetch(`${getApiConfig().backendURL}/api/bank-details/${bankToDelete.id}?business_id=${businessId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setBankAccounts((prev) => prev.filter((_, i) => i !== idx));
        if (selectedBankIndex === idx) {
          setSelectedBankIndex(bankAccounts.length > 1 ? 0 : -1);
        } else if (selectedBankIndex > idx) {
          setSelectedBankIndex(selectedBankIndex - 1);
        }
        // Re-fetch to ensure sync with backend and other parts of the app
        const businessId = localStorage.getItem("selectedBusinessId");
        const fetchResponse = await fetch(`${getApiConfig().backendURL}/api/bank-details?business_id=${businessId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (fetchResponse.ok) {
          const result = await fetchResponse.json();
          setBankAccounts(result.data || []);
        }
        await showSuccessToast("Bank account removed successfully");
      }
    } catch (error) {
      console.error('Error deleting bank:', error);
      await showErrorModal("Failed to delete bank account");
    }
  };


  const saveToInventory = async (itemData) => {
    try {
      const token = localStorage.getItem('token');
      const selectedBusinessId = localStorage.getItem('selectedBusinessId');
      const currentBusinessName = localStorage.getItem('currentBusinessName');

      const formData = new FormData();
      // Add business context
      if (selectedBusinessId) formData.append('business_id', selectedBusinessId);
      if (currentBusinessName) formData.append('businessName', currentBusinessName);

      // Map fields to backend snake_case naming
      formData.append('item_name', (itemData.name || itemData.description || "").trim());
      formData.append('item_type', 'product');
      formData.append('item_code', itemData.code || `PRO-${Date.now()}`);

      // Convert prices to INR for storage in the inventory database.
      // IMPORTANT: Line items (from buffer/manual entry) store `price` already in INR
      // (it was converted via convertToINR at input time). So we must NOT convert again.
      // Only `salesPrice` / `salePrice` (from the old create form) are in display currency
      // and need conversion.
      const saleInr = (itemData.price != null && itemData.price !== undefined)
        ? 0  // Only save in purchase price, not in sales price
        : convertToINR(Number(itemData.salesPrice || itemData.salePrice || 0), currency);
      // Fix: If manual entry line has price, map it as the purchase price in INR
      const purchaseInr = (itemData.price != null && itemData.price !== undefined)
        ? Number(itemData.price || 0)  // Already in INR — do NOT convert again
        : (itemData.purchasePrice ? convertToINR(Number(itemData.purchasePrice), currency) : 0);

      formData.append('sale_price', saleInr);
      formData.append('purchase_price', purchaseInr);
      formData.append('opening_stock', itemData.qty || 0);
      formData.append('unit', itemData.stockUnit || itemData.unit || "PCS");

      // Fix: Don't use hardcoded '1' if it doesn't exist. Use empty string so backend sanitizes to NULL.
      const catId = itemData.category_id || categories[0]?.id || "";
      formData.append('category_id', catId);

      formData.append('hsn_code', itemData.hsn || "");
      formData.append('image_url', itemData.image_url || "");
      formData.append('sale_price_tax_type', 'with_tax');
      formData.append('purchase_price_tax_type', 'with_tax');

      const response = await fetch(`${getApiConfig().baseURL}/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // No Content-Type header - browser sets it correctly for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      return await response.json();
    } catch (error) {
      console.error('Inventory save helper error:', error);
      return { success: false, message: error.message };
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();


    if (!party.trim()) {
      showErrorToast("Please enter a party name");
      return;
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      showErrorToast("Please add at least one item");
      return;
    }

    const newErrors = {};
    let firstErrorRowId = null;

    lines.forEach((l) => {
      const rowErrors = {};
      if (!(l.description || "").toString().trim()) {
        rowErrors.description = true;
      }
      if (Number(l.qty) < 0) {
        rowErrors.qty = true;
      }


      if (Object.keys(rowErrors).length > 0) {
        newErrors[l.id] = rowErrors;
        if (!firstErrorRowId) firstErrorRowId = l.id;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setLineErrors(newErrors);
      showErrorToast("Item Name is required (highlighted in red)");
      return;
    }

    // Validate tax type selection
    if (!useGST && !useVAT && !useNoTax) {
      showErrorToast("Please select a tax type (GST, VAT, or No Tax)");
      return;
    }

    // Validate invoice date
    if (!invoiceDate) {
      showErrorToast("Please select an invoice date");
      return;
    }

    // Validate bank account if needed
    if (selectedBankIndex < 0 && bankAccounts.length > 0) {
      showErrorToast("Please select a bank account");
      return;
    }

    // Get business ID - always get from localStorage to ensure latest value
    let selectedBusinessId = localStorage.getItem("selectedBusinessId");

    if (!selectedBusinessId) {
      // Try to get from URL params as fallback
      const urlParams = new URLSearchParams(window.location.search);
      selectedBusinessId = urlParams.get('businessId');
    }

    if (!selectedBusinessId) {
      // Last resort - try to get from user data or default to 1
      selectedBusinessId = "1";
    }

    // NEW: Save manual entries to inventory before submitting document
    const updatedLines = [...lines];
    let linesChanged = false;
    try {
      showLoadingModal("Saving new items to inventory...");
      for (let i = 0; i < updatedLines.length; i++) {
        const l = updatedLines[i];
        const isManual = !l.productId || l.productId.toString().startsWith('tmp-');
        if (isManual && l.description && l.description.trim()) {
          // check duplicate in local products list
          const existing = products.find(p => (p.name || "").toLowerCase() === (l.description || "").toLowerCase());
          if (existing) {
            updatedLines[i] = { ...l, productId: existing.id || existing.code || existing.name };
            linesChanged = true;
          } else {
            // Create new product in backend inventory
            try {
              const res = await saveToInventory(l);
              if (res.success && res.data) {
                const newProd = res.data;
                updatedLines[i] = { ...l, productId: newProd.id };
                // Update global products list so it's available in browse
                setProducts(prev => [newProd, ...prev]);
                linesChanged = true;
              }
            } catch (itemErr) {
              console.error("Failed to save item to inventory:", l.description, itemErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error processing manual entries:", err);
    } finally {
      if (linesChanged) {
        setLines(updatedLines);
      }
      closeModal();
    }

    // Recalculate line totals for the final payload using updatedLines
    const finalLineTotals = updatedLines.map((l) => {
      const qty = Number(l.qty || 0);
      const price = Number(l.price || 0);
      const amt = qty * price;
      const discountPct = Number(l.discountPct || 0);
      const discountValue = (amt * discountPct) / 100;
      const taxable = Math.max(0, amt - discountValue);
      const cgstAmount = l.taxType === 'GST' ? taxable * (Number(l.cgstPct || 0) / 100) : 0;
      const sgstAmount = l.taxType === 'GST' ? taxable * (Number(l.sgstPct || 0) / 100) : 0;
      const igstAmount = l.taxType === 'IGST' ? taxable * (Number(l.igstPct || 0) / 100) : 0;
      const vatAmount = l.taxType === 'VAT' ? taxable * (Number(l.vatPct || 0) / 100) : 0;
      const tax = cgstAmount + sgstAmount + igstAmount + vatAmount;
      const computedTotal = taxable + tax;
      const override = l.overrideAmount != null ? Number(l.overrideAmount) : null;
      const total = override != null ? override : computedTotal;
      return { ...l, amt, discountValue, taxable, cgstAmount, sgstAmount, igstAmount, vatAmount, tax, computedTotal, total };
    });




    const terms_sections = sections.map((section, index) => ({
      // If it's a template, we MUST pass null so backend creates a NEW row for this document
      id: section.is_template ? null : ((section.id && section.id > 1000000000) ? null : section.id),
      section_order: index + 1,
      heading: section.heading,
      content: section.content,
      is_locked: section.is_locked ? 1 : 0
    }));



    // Determine field names based on form type
    const isProformaInvoice = formType === 'proforma';
    const isSalesInvoice = formType === 'sales';
    const isSalesReturn = formType === 'salesReturn';
    const isCreditNote = formType === 'creditNote';
    const isDeliveryChallan = formType === 'deliveryChallan';
    const isBookPurchaseOrder = formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice';
    const isBookInvoice = formType === 'bookInvoice';
    const isPurchaseReturn = formType === 'purchaseReturn';
    const isDebitNote = formType === 'debitNote';
    const isPurchaseOrder = formType === 'purchaseOrder';
    const isQuotation = !isProformaInvoice && !isSalesInvoice && !isSalesReturn && !isCreditNote && !isDeliveryChallan && !isBookPurchaseOrder && !isBookInvoice && !isPurchaseReturn && !isDebitNote && !isPurchaseOrder;

    // Address overrides from selectedPartyDetails or manual shippingDetails
    const shipToDetailsToUse = formType === 'purchaseOrder' ? shippingDetails : selectedPartyDetails;
    const addressOverrides = {
      billing_address: selectedPartyDetails?.billing_address || '',
      city: selectedPartyDetails?.city || '',
      state: selectedPartyDetails?.state || '',
      pincode: selectedPartyDetails?.pincode || '',
      country: selectedPartyDetails?.country || 'India',
      billing_attention: selectedPartyDetails?.meta?.billing_attention || '',
      billing_line2: selectedPartyDetails?.meta?.billing_line2 || '',
      billing_phone: selectedPartyDetails?.meta?.billing_phone || '',
      billing_fax: selectedPartyDetails?.meta?.billing_fax || '',
      shipping_address: shipToDetailsToUse?.shipping_address || '',
      ship_city: shipToDetailsToUse?.ship_city || '',
      ship_state: shipToDetailsToUse?.ship_state || '',
      ship_pincode: shipToDetailsToUse?.ship_pincode || '',
      ship_country: shipToDetailsToUse?.ship_country || 'India',
      shipping_attention: shipToDetailsToUse?.meta?.shipping_attention || '',
      shipping_line2: shipToDetailsToUse?.meta?.shipping_line2 || '',
      shipping_phone: shipToDetailsToUse?.meta?.shipping_phone || '',
      shipping_fax: shipToDetailsToUse?.meta?.shipping_fax || '',
      ship_to_party_id: selectedParty?.id || null,
    };

    // Base invoice data with conditional field names
    const invoiceData = {
      business_id: selectedBusinessId,
      party_name: party,
      party_id: selectedParty?.id || null,
      ship_to_party_id: selectedParty?.id || null,
      bank_id: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex].id : null,
      status: "open",
      total_amount: Math.round(subtotal),
      discount_amount: Math.round(discountAfterTaxValue),
      tax_amount: Math.round(totalTax),
      grand_total: Math.round(totalAmount),
      notes: notes || '',
      terms_sections,
      level1_email: level1_email || null,
      level2_email: level2_email || null,
      level3_email: level3_email || null,
    };

    // Add type-specific fields
    if (isProformaInvoice) {
      invoiceData.proforma_number = invoiceNo;
      invoiceData.proforma_date = invoiceDate;
      invoiceData.valid_until = dueDate || '';
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.invoice_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isSalesInvoice) {
      invoiceData.invoice_number = invoiceNo;
      invoiceData.invoice_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.invoice_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isSalesReturn) {
      invoiceData.sales_return_number = invoiceNo;
      invoiceData.return_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.sales_return_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isCreditNote) {
      invoiceData.credit_note_number = invoiceNo;
      invoiceData.note_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.credit_note_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isDeliveryChallan) {
      invoiceData.challan_number = invoiceNo;
      invoiceData.challan_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.challan_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isBookPurchaseOrder) {
      invoiceData.book_purchase_order_number = invoiceNo;
      invoiceData.order_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.book_purchase_order_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isBookInvoice) {
      invoiceData.book_invoice_number = invoiceNo;
      invoiceData.invoice_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.book_invoice_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isPurchaseReturn) {
      invoiceData.purchase_return_number = invoiceNo;
      invoiceData.return_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.purchase_return_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isDebitNote) {
      invoiceData.debit_note_number = invoiceNo;
      invoiceData.note_date = invoiceDate;
      invoiceData.due_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.debit_note_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else if (isPurchaseOrder) {
      invoiceData.purchase_order_number = invoiceNo;
      invoiceData.order_date = invoiceDate;
      invoiceData.expected_delivery_date = dueDate || null;
      invoiceData.po_agreement_number = poAgreementNumber || '';
      invoiceData.remark = remark || '';
      invoiceData.purchase_order_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        ...addressOverrides,
      };
    } else {
      // Quotation
      // Always send quotation_number (fetched from API for new, existing for edit)
      invoiceData.quotation_number = invoiceNo;
      invoiceData.quotation_date = invoiceDate;
      invoiceData.valid_until = dueDate || '';
      invoiceData.quotation_data = {
        lines: finalLineTotals,
        charges,
        notes,
        remark: remark || '',
        bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
        bankAccounts,
        selectedBankIndex,
        discountAfterTaxPct,
        paymentTerms,
        dueDate,
        useGST,
        useVAT,
        useNoTax,
        ...addressOverrides,
      };
    }

    // Keep these for backward compatibility with parent component
    invoiceData.id = invoiceNo;
    invoiceData.date = invoiceDate;
    invoiceData.partyName = party;
    invoiceData.dueDate = dueDate;
    invoiceData.amount = Math.round(totalAmount);
    invoiceData.poAgreementNumber = poAgreementNumber || '';
    invoiceData.notes = notes || '';
    invoiceData.remark = remark || '';
    invoiceData.level1_email = level1_email || null;
    invoiceData.level2_email = level2_email || null;
    invoiceData.level3_email = level3_email || null;
    invoiceData.meta = {
      lines: finalLineTotals,
      charges,
      notes,
      remark: remark || '',
      bankAccount: selectedBankIndex >= 0 ? bankAccounts[selectedBankIndex] : null,
      bankAccounts,
      selectedBankIndex,
      discountAfterTaxPct,
      paymentTerms,
      useGST,
      useVAT,
      useNoTax,
      selectedBillingIndex: selectedBillingAddressIndex,
      selectedShippingIndex: selectedShippingAddressIndex,
      ship_to_party_id: selectedParty?.id || null,
      ...addressOverrides,
      terms_sections: sections,
      terms: sections.map(s => s.content.replace(/<[^>]*>?/gm, '')).join('\n'), // Plain text fallback for old templates
      level1_email: level1_email || null,
      level2_email: level2_email || null,
      level3_email: level3_email || null,
    };

    // Explicitly add terms_sections at top level for Book Invoice and others
    invoiceData.terms_sections = sections;
    invoiceData.terms = sections.map(s => s.content.replace(/<[^>]*>?/gm, '')).join('\n');



    // If onSave is provided, await it and show loading + success
    if (onSave) {
      try {
        setSubmitting(true);
        // Removed showLoadingModal - no popup modal during save

        // allow sync or async onSave
        const res = onSave(invoiceData);
        if (res && typeof res.then === "function") {
          await res;
        }

        closeModal();
        setSubmitting(false);

        // show a local success toast (parent may show its own toast too)
        await showSuccessToast("Saved");
      } catch (err) {


        // Check if error is for duplicate number FIRST
        // Check both the code property and the message content
        const isDuplicateError = err?.code === 'DUPLICATE_NUMBER' ||
          (err?.message && err.message.startsWith('DUPLICATE_NUMBER:')) ||
          (err?.message && err.message.includes('already exists'));

        if (isDuplicateError) {

          closeModal(); // Close any loading modal
          setSubmitting(false);
          // Extract the actual message if it has the marker
          const message = err?.message?.startsWith('DUPLICATE_NUMBER:')
            ? err.message.substring('DUPLICATE_NUMBER:'.length)
            : err?.message;
          setInvoiceNoError(message);
          return; // Don't show modal, just show field error
        }


        closeModal(); // Close any loading modal
        setSubmitting(false);

        await showErrorModal({
          title: "Save failed",
          text: err?.message || "Could not save invoice"
        });
      }
    } else {
      // if no onSave, just return data via console and close loading
      await showSuccessToast({
        title: "Prepared data",
        text: JSON.stringify(invoiceData).slice(0, 120)
      });
    }
  }

  return (
    <div className="min-h-screen mt-4 ">
      <div className="mx-auto ">
        {/* Top header: shows title + optional top actions */}
        <div className="bg-white border border-gray-300 text-yellow-900 rounded-[7px] mb-4 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="w-5 h-5 text-yellow-900" />
              </button>
              <h3 className="text-lg md:text-xl font-bold truncate">
                {formTitle}
              </h3>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onBack}
                style={{ padding: "6px 12px" }}
                className="bg-red-600 text-white rounded-[7px] text-sm md:text-base font-medium hover:bg-red-700 transition-colors md:h-8 md:py-1 flex items-center justify-center"
                disabled={submitting}
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                form="invoiceForm"
                disabled={submitting}
                style={{ padding: "6px 12px" }}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] text-sm md:text-base font-medium disabled:bg-gray-400 disabled:text-gray-200 hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 md:h-8 md:py-1 flex items-center justify-center"
              >
                {submitting ? "Saving..." : saveLabel}
              </button>
            </div>
          </div>
        </div>

        <form
          id="invoiceForm"
          onSubmit={handleSubmit}
          className="bg-white rounded-[7px] border border-gray-300 custombackground shadow-xl overflow-x-auto"
        >
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Quotation Info */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b border-yellow-200 text-yellow-900 pb-2">
                {(() => {
                  if (formType === 'deliveryChallan') return 'Delivery Challan Information';
                  if (formType === 'bookInvoice') return 'Book Invoice Information';
                  if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') return 'Book Purchase order Information';
                  if (formType === 'purchaseReturn') return 'Purchase Return Information';
                  if (formType === 'debitNote') return 'Debit Note Information';
                  if (formType === 'purchaseOrder') return 'Purchase Order Information';
                  if (formType === 'creditNote') return 'Credit Note Information';
                  if (formType === 'proforma') return 'Proforma Invoice Information';
                  if (formType === 'salesReturn') return 'Sales Return Information';
                  if (formType === 'sales') return 'Tax Invoice Information';
                  return 'Quotation Information';
                })()}
              </h2>

              {/* First Row: Bill To and Quotation Number only */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                {/* Bill To Column - col-4 when no party, col-8 when party selected */}
                <div className={!selectedParty ? "md:col-span-4" : "md:col-span-8"}>
                  {!selectedParty ? (
                    <>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {billToLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          value={party}
                          onChange={(e) => setParty(e.target.value)}
                          onFocus={() => setShowPartyDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                          placeholder="Select or enter customer/party name"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                          required
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Party Dropdown */}
                        {showPartyDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 flex flex-col">
                            {/* Header with column titles */}
                            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500">Party Name</span>
                              <span className="text-xs font-medium text-gray-500">Balance</span>
                            </div>

                            {/* Scrollable party list */}
                            <div className="overflow-y-auto max-h-48">
                              {loadingParties ? (
                                <div className="px-3 py-2 text-center text-xs text-gray-500">
                                  Loading parties...
                                </div>
                              ) : parties.length > 0 ? (
                                (() => {
                                  // Filter parties by party name or trade name
                                  const searchTerm = party.toLowerCase();
                                  const filtered = parties.filter(p =>
                                    p.party_name.toLowerCase().includes(searchTerm) ||
                                    (p.trade_name && p.trade_name.toLowerCase().includes(searchTerm))
                                  );

                                  // Sort: matching items first, then others
                                  const sorted = filtered.sort((a, b) => {
                                    const aNameMatch = a.party_name.toLowerCase().startsWith(searchTerm);
                                    const bNameMatch = b.party_name.toLowerCase().startsWith(searchTerm);
                                    const aTradeMatch = a.trade_name && a.trade_name.toLowerCase().startsWith(searchTerm);
                                    const bTradeMatch = b.trade_name && b.trade_name.toLowerCase().startsWith(searchTerm);

                                    if ((aNameMatch || aTradeMatch) && !(bNameMatch || bTradeMatch)) return -1;
                                    if (!(aNameMatch || aTradeMatch) && (bNameMatch || bTradeMatch)) return 1;
                                    return 0;
                                  });

                                  return sorted.length > 0 ? sorted.map((partyItem) => (
                                    <button
                                      key={partyItem.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={async () => {
                                        try {
                                          const selectedBusinessId = localStorage.getItem("selectedBusinessId");
                                          if (selectedBusinessId) {
                                            const result = await partyAPI.getById(partyItem.id, selectedBusinessId);
                                            if (result.success && result.data) {
                                              const partyDetails = {
                                                ...result.data,
                                                no_tax: result.data.no_tax === 1 || result.data.no_tax === true || result.data.no_tax === "true",
                                                registration_type: result.data.registration_type || (result.data.no_tax ? "NO_TAX" : result.data.gstin ? "GSTIN" : result.data.vat ? "VAT" : ""),
                                                registrationType: result.data.registration_type || (result.data.no_tax ? "NO_TAX" : result.data.gstin ? "GSTIN" : result.data.vat ? "VAT" : ""),
                                              };
                                              setSelectedParty(partyItem);
                                              setSelectedPartyDetails(partyDetails);


                                              setParty(partyItem.party_name);
                                              setShowPartyDropdown(false);

                                              /* 
                                               // Auto-sync Tax Type Selection (Robust check) - Now handled by applyTaxDetection
                                               const regType = (partyDetails.registrationType || partyDetails.registration_type || "").toUpperCase();
                                               const hasGstin = partyDetails.gstin && partyDetails.gstin !== "null" && partyDetails.gstin.trim() !== "";
                                               const hasVat = partyDetails.vat && partyDetails.vat !== "null" && partyDetails.vat.trim() !== "";

                                               if (regType === "VAT" || (hasVat && !hasGstin)) {
                                                 handleGSTVATToggle(false, true, false);
                                               } else if (regType === "GSTIN" || hasGstin) {
                                                 handleGSTVATToggle(true, false, false);
                                               } else if (regType === "NO_TAX") {
                                                 handleGSTVATToggle(false, false, true);
                                               }
                                               */
                                            }
                                          }
                                        } catch (error) {
                                          console.error("Error fetching party details:", error);
                                          // Fallback to basic info
                                          setSelectedParty(partyItem);
                                          setSelectedPartyDetails(partyItem);


                                          setParty(partyItem.party_name);
                                          setShowPartyDropdown(false);
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-300 last:border-b-0"
                                    >
                                      <div className="flex justify-between items-center gap-2">
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 text-sm">
                                            {partyItem.party_name}
                                          </div>
                                          {partyItem.trade_name && (
                                            <div className="text-xs text-gray-500">
                                              {partyItem.trade_name}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 flex-shrink-0">
                                          {partyItem.balance || partyItem.opening_balance || '0.0'}
                                        </div>
                                      </div>
                                    </button>
                                  )) : (
                                    <div className="px-3 py-2 text-center text-xs text-gray-500">
                                      No parties found
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="px-3 py-2 text-center text-xs text-gray-500">
                                  No parties found
                                </div>
                              )}
                            </div>

                            {/* Fixed Add New Party button at bottom */}
                            <div className="border-t border-gray-200 p-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setShowPartyDropdown(false);
                                  setShowPartyModal(true);
                                }}
                                className="w-full px-3 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-xs font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200"
                              >
                                + Add New Party
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bill To Section */}
                      <div className="border-2 border-yellow-200 rounded-lg p-4 relative shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-yellow-900 border-b-2 border-yellow-100 pb-1"><span>{billToLabel}</span></h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParty(null);
                            setSelectedPartyDetails(null);
                            setParty("");
                            setShowPartyDropdown(true);
                          }}
                          className="absolute top-4 right-2 px-2 text-xs font-semibold text-green-600 border border-green-600 hover:text-green-700 hover:bg-green-50 hover:shadow-sm rounded transition-all duration-200 bg-white h-[28px] flex items-center justify-center whitespace-nowrap z-10"
                        >
                          <span>Change Party</span>
                        </button>
                        <div className="space-y-2 text-sm pr-8">
                          <div className="font-bold text-gray-900 text-base">
                            <span>{selectedPartyDetails?.meta?.billing_attention || selectedPartyDetails?.party_name || selectedParty?.party_name}</span>
                          </div>
                          {selectedPartyDetails?.billing_address && (
                            <div className="text-gray-700 leading-relaxed">
                              <span className="font-semibold text-gray-900"><span>Address:</span></span>{" "}
                              <span className="text-gray-700">
                                <span>
                                  {formatAddressString([
                                    selectedPartyDetails.billing_address,
                                    selectedPartyDetails.city,
                                    selectedPartyDetails.state,
                                    selectedPartyDetails.pincode,
                                    selectedPartyDetails.country
                                  ])}
                                </span>
                              </span>
                            </div>
                          )}
                          {selectedPartyDetails?.phone_number && (
                            <div className="text-gray-700">
                              <span className="font-semibold text-gray-900"><span>Phone:</span></span>{" "}
                              <span className="text-gray-700"><span>{selectedPartyDetails.phone_number}</span></span>
                            </div>
                          )}
                          {selectedPartyDetails?.state && (
                            <div className="text-gray-700 bg-green-50/50 p-1 rounded inline-block">
                              <span className="font-semibold text-[#129046]"><span>Place of Supply:</span></span>{" "}
                              <span className="text-[#129046]"><span>{selectedPartyDetails.state}</span></span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1.5 text-green-600 border border-green-600 hover:text-green-700 hover:bg-green-50 hover:shadow-sm rounded transition-all duration-200 bg-white h-[28px] w-[28px] flex items-center justify-center"
                            title="Edit Billing Address"
                            onClick={() => setShowBillingAddressesModal(true)}
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Ship To Section */}
                      <div className="border-2 border-yellow-200 rounded-lg p-4 relative shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-yellow-900 border-b-2 border-yellow-100 pb-1"><span>Ship To</span></h3>
                        </div>


                        <div className="space-y-2 text-sm pr-8">
                          {formType === 'purchaseOrder' ? (
                            <>
                              <div className="font-bold text-gray-900 text-base">
                                <span>{shippingDetails.meta.shipping_attention || (businessData?.business_name || businessData?.name)}</span>
                              </div>
                              <div className="text-gray-700 leading-relaxed break-words" style={{ overflowWrap: 'anywhere' }}>
                                <span>
                                  {formatAddressString([
                                    shippingDetails.shipping_address,
                                    shippingDetails.ship_city,
                                    shippingDetails.ship_state,
                                    shippingDetails.ship_pincode,
                                    shippingDetails.ship_country,
                                    shippingDetails.meta?.shipping_line2
                                  ])}
                                </span>
                              </div>
                              {shippingDetails.meta.shipping_phone && (
                                <div className="text-gray-700">
                                  <span>{shippingDetails.meta.shipping_phone}</span>
                                </div>
                              )}
                              {shippingDetails.ship_state && (
                                <div className="text-gray-700 bg-green-50/50 p-1 rounded inline-block">
                                  <span>{shippingDetails.ship_state}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {selectedPartyDetails?.meta?.shipping_attention ? (
                                <div className="font-bold text-gray-900 text-base">
                                  <span>{selectedPartyDetails.meta.shipping_attention}</span>
                                </div>
                              ) : null}
                              <div className="text-gray-700 leading-relaxed break-words" style={{ overflowWrap: 'anywhere' }}>
                                <span>
                                  {formatAddressString([
                                    selectedPartyDetails?.shipping_address,
                                    selectedPartyDetails?.ship_city,
                                    selectedPartyDetails?.ship_state,
                                    selectedPartyDetails?.ship_pincode,
                                    selectedPartyDetails?.ship_country,
                                    selectedPartyDetails?.meta?.shipping_line2
                                  ])}
                                </span>
                              </div>
                              {selectedPartyDetails?.meta?.shipping_phone && (
                                <div className="text-gray-700">
                                  <span>{selectedPartyDetails.meta.shipping_phone}</span>
                                </div>
                              )}
                              {selectedPartyDetails?.ship_state && (
                                <div className="text-gray-700 bg-green-50/50 p-1 rounded inline-block">
                                  <span>{selectedPartyDetails.ship_state}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="absolute bottom-2 right-2 p-1.5 text-green-600 border border-green-600 hover:text-green-700 hover:bg-green-50 hover:shadow-sm rounded transition-all duration-200 bg-white h-[28px] w-[28px] flex items-center justify-center"
                          title="Edit Shipping Address"
                          onClick={() => {
                            if (formType === 'purchaseOrder') {
                              setShowBusinessShippingEditModal(true);
                            } else {
                              setShowShippingAddressesModal(true);
                            }
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quotation Number Column - always col-4 */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {(() => {
                      if (formType === 'deliveryChallan') return 'Delivery Challan Number';
                      if (formType === 'bookInvoice') return 'Book Invoice Number';
                      if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') return 'Book PO Number';
                      if (formType === 'purchaseReturn') return 'Purchase Return Number';
                      if (formType === 'debitNote') return 'Debit Note Number';
                      if (formType === 'purchaseOrder') return 'Purchase Order Number';
                      if (formType === 'creditNote') return 'Credit Note Number';
                      if (formType === 'proforma') return 'Proforma Invoice Number';
                      if (formType === 'salesReturn') return 'Sales Return Number';
                      if (formType === 'sales') return 'Tax Invoice Number';
                      return 'Quotation Number';
                    })()}
                  </label>
                  <input
                    value={invoiceNo}
                    onChange={(e) => {
                      setInvoiceNo(e.target.value);
                      setInvoiceNoError(''); // Clear error when user changes value
                    }}
                    className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none transition-colors ${invoiceNoError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20'
                      }`}
                    disabled={submitting}
                  />
                  {invoiceNoError && (
                    <p className="mt-1 text-sm text-red-500 font-medium">{invoiceNoError}</p>
                  )}

                  {/* PO / Agreement Number - Show only when party is selected (not for Quotation) */}
                  {selectedParty && formType !== 'quotation' && (
                    <div className="mt-2">
                      {/* <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Agreement Number
                      </label> */}
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        P.O/Aggr. No
                      </label>
                      {['sales', 'creditNote', 'debitNote'].includes(formType) ? (
                        <CommonDropdown
                          options={(formType === 'debitNote' || formType === 'creditNote' || initialData?.isFromPO || initialData?.meta?.isFromPO ? standardPOs : bookPOs).map(po => ({
                            id: po.purchase_order_number || po.book_purchase_order_number || po.id,
                            label: po.purchase_order_number || po.book_purchase_order_number || po.id
                          }))}
                          value={poAgreementNumber}
                          onChange={(opt) => setPoAgreementNumber(opt.label)}
                          placeholder="Select or enter P.O/Aggr. No"
                          allowCustomInput={true}
                          customInputLabel="Enter manual number"
                          customInputPlaceholder="Type P.O/Aggr. No..."
                          searchable={true}
                          liveSearch={true}
                          className="h-10"
                        />
                      ) : (
                        <input
                          type="text"
                          value={poAgreementNumber}
                          onChange={(e) => setPoAgreementNumber(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                          placeholder="Enter P.O/Aggr. No"
                          disabled={submitting}
                        />
                      )}
                    </div>
                  )}

                  {/* Remark - Show only when party is selected */}
                  {selectedParty && (
                    <div className="mt-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remark
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none resize-none"
                        placeholder="Enter remark"
                        rows="2"
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>

                {/* Blank Column - col-4, only visible when no party selected */}
                {!selectedParty && (
                  <div className="md:col-span-4">
                    {/* Intentionally blank */}
                  </div>
                )}
              </div>

              {/* Second Row: All other fields */}
              {selectedParty && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {(() => {
                        if (formType === 'deliveryChallan') return 'Delivery Challan Date';
                        if (formType === 'bookInvoice') return 'Book Invoice Date';
                        if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') return 'Order Date';
                        if (formType === 'purchaseReturn') return 'Purchase Return Date';
                        if (formType === 'debitNote') return 'Debit Note Date';
                        if (formType === 'purchaseOrder') return 'Purchase Order Date';
                        if (formType === 'creditNote') return 'Credit Note Date';
                        if (formType === 'proforma') return 'Proforma Invoice Date';
                        if (formType === 'salesReturn') return 'Sales Return Date';
                        if (formType === 'sales') return 'Tax Invoice Date';
                        return 'Quotation Date';
                      })()}
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Terms (days)
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d{0,5}$/.test(value)) {
                          setPaymentTerms(value === '' ? '' : Number(value) || 0);
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        const newDueDate = e.target.value;
                        setDueDate(newDueDate);
                        if (invoiceDate && newDueDate) {
                          const start = new Date(invoiceDate);
                          const end = new Date(newDueDate);
                          const diffTime = end - start;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (!isNaN(diffDays) && diffDays >= 0) {
                            setPaymentTerms(diffDays);
                          }
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              {!selectedParty && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {(() => {
                        if (formType === 'deliveryChallan') return 'Delivery Challan Date';
                        if (formType === 'bookInvoice') return 'Book Invoice Date';
                        if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') return 'Order Date';
                        if (formType === 'purchaseReturn') return 'Purchase Return Date';
                        if (formType === 'debitNote') return 'Debit Note Date';
                        if (formType === 'purchaseOrder') return 'Purchase Order Date';
                        if (formType === 'creditNote') return 'Credit Note Date';
                        if (formType === 'proforma') return 'Proforma Invoice Date';
                        if (formType === 'salesReturn') return 'Sales Return Date';
                        if (formType === 'sales') return 'Tax Invoice Date';
                        return 'Quotation Date';
                      })()}
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Terms (days)
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d{0,5}$/.test(value)) {
                          setPaymentTerms(value === '' ? '' : Number(value) || 0);
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        const newDueDate = e.target.value;
                        setDueDate(newDueDate);
                        if (invoiceDate && newDueDate) {
                          const start = new Date(invoiceDate);
                          const end = new Date(newDueDate);
                          const diffTime = end - start;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (!isNaN(diffDays) && diffDays >= 0) {
                            setPaymentTerms(diffDays);
                          }
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Items */}
            <section>
              {/* GST/VAT/No Tax Toggle Section - DISABLED until party is selected */}
              <div className={`mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 ${!selectedParty ? 'opacity-50 pointer-events-none' : ''
                }`}>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  <span>Tax Type Selection</span>
                  {!selectedParty && <span className="text-red-500 ml-2">(Select Bill To first)</span>}
                </h3>

                {!selectedParty ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please select a party in "Bill To" section to enable tax type selection
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tax Type Checkboxes */}
                    <div className="flex flex-wrap gap-6">
                      {/* GST Checkbox - Show only if business is in India */}
                      {isBusinessIndia && (
                        <label className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-all ${useGST ? 'bg-green-100 border-2 border-green-500' : 'border-2 border-transparent'
                          }`}>
                          <input
                            type="checkbox"
                            checked={useGST}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleGSTVATToggle(true, false, false);
                              } else {
                                handleGSTVATToggle(false, useVAT, useNoTax);
                              }
                            }}
                            className="w-5 h-5 rounded text-green-600 cursor-pointer accent-green-600"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            GST (CGST/SGST/IGST)
                          </span>
                        </label>
                      )}

                      {/* VAT Checkbox - Show only if business is NOT in India */}
                      {!isBusinessIndia && (
                        <label className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-all ${useVAT ? 'bg-green-100 border-2 border-green-500' : 'border-2 border-transparent'
                          }`}>
                          <input
                            type="checkbox"
                            checked={useVAT}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleGSTVATToggle(false, true, false);
                              } else {
                                handleGSTVATToggle(useGST, false, useNoTax);
                              }
                            }}
                            className="w-5 h-5 rounded text-green-600 cursor-pointer accent-green-600"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            VAT
                          </span>
                        </label>
                      )}

                      {/* No Tax Checkbox - Always show */}
                      <label className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-all ${useNoTax ? 'bg-green-100 border-2 border-green-500' : 'border-2 border-transparent'
                        }`}>
                        <input
                          type="checkbox"
                          checked={useNoTax}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleGSTVATToggle(false, false, true);
                            } else {
                              handleGSTVATToggle(useGST, useVAT, false);
                            }
                          }}
                          className="w-5 h-5 rounded text-green-600 cursor-pointer accent-green-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          No Tax
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {useGST && !useVAT && !useNoTax && <span key="gst-msg">✓ GST will be applied to all items</span>}
                      {useVAT && !useGST && !useNoTax && <span key="vat-msg">✓ VAT will be applied to all items</span>}
                      {useNoTax && !useGST && !useVAT && <span key="notax-msg">✓ No tax will be applied to all items</span>}
                      {!useGST && !useVAT && !useNoTax && <span key="select-msg">Select a tax type for items</span>}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mb-4 gap-3">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold">
                  Items / Services
                </h2>
                <div className="flex gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-sm font-semibold hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 flex items-center justify-center"
                    disabled={submitting}
                  >
                    <Plus
                      size={12}
                      className="sm:w-3 sm:h-3 md:w-4 md:h-4 w-3 h-3"
                    />{" "}
                    <span className="hidden sm:inline">Add Products</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                  <button
                    type="button"
                    onClick={addEmptyLine}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 bg-gradient-to-r from-[#f3c117] to-[#e6b800] text-white rounded-lg text-sm font-semibold hover:from-[#f3c117]/90 hover:to-[#e6b800]/90 transition-all duration-200 flex items-center justify-center"
                    disabled={submitting}
                  >
                    <span className="hidden sm:inline">Manual Entry</span>
                    <span className="sm:hidden">Manual</span>
                  </button>
                </div>
              </div>

              {/* Horizontal scroll container */}
              <div className="relative overflow-x-auto rounded-lg border border-yellow-200 mb-6">
                <div className="inline-block min-w-full">
                  <table className="min-w-[1100px] w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100 text-black">
                      <tr>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-12">
                          <span>NO</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                          <span>IMAGE</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[250px]">
                          <span>ITEM NAME</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          <span>HSN/SAC</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>QTY</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>UNIT</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>UNIT PRICE</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          <span>DISC (%)</span>
                        </th>
                        {/* Show IGST only if GST is enabled AND it is an inter-state transaction */}
                        {selectedParty && useGST && autoCalculatedTaxType === 'IGST' && (
                          <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                            <span>{isExport ? "GST (%)" : "IGST (%)"}</span>
                          </th>
                        )}

                        {/* Show GST Master, CGST & SGST only if GST is enabled AND it is an intra-state transaction */}
                        {selectedParty && useGST && autoCalculatedTaxType === 'GST' && (
                          <>
                            <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24 bg-green-50/50">
                              <span>GST (%)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                              <span>CGST (%)</span>
                            </th>
                            <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                              <span>SGST (%)</span>
                            </th>
                          </>
                        )}

                        {/* Show VAT only if VAT is enabled */}
                        {selectedParty && useVAT && (
                          <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                            <span>VAT (%)</span>
                          </th>
                        )}

                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          <span>TOTAL AMOUNT</span>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-16">
                          <span>ACTION</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineTotals.map((l, idx) => (
                        <tr key={l.id} className="border-t hover:bg-gray-50">
                          {/* NO Column */}
                          <td className="px-1 sm:px-2 py-2 text-center align-middle">
                            <span>{idx + 1}</span>
                          </td>

                          {/* IMAGE */}
                          <td className="px-1 sm:px-2 py-2 text-center align-middle">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden border relative">
                              {l.image_url ? (
                                <>
                                  <img
                                    src={l.image_url.startsWith('data:') ? l.image_url : `${getApiConfig().backendURL}${l.image_url}`}
                                    alt={l.description}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('Image load error in main form:', e.target.src);
                                      e.target.style.display = "none";
                                      const noImageText = e.target.parentElement.querySelector('.no-image-text');
                                      if (noImageText) {
                                        noImageText.style.display = "flex";
                                      }
                                    }}
                                  />
                                  <div className="no-image-text w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{ display: "none" }}>
                                    <span>No Image</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-full h-full flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`file-input-${l.id}`).click()}
                                      className="bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 upload-bounce-repeat"
                                      title="Upload Image"
                                      style={{
                                        animation: 'uploadBounce 0.6s ease-in-out 2',
                                        animationIterationCount: '2',
                                        animationDelay: '0s'
                                      }}
                                      onAnimationEnd={(e) => {
                                        // Re-trigger animation every 5 seconds
                                        setTimeout(() => {
                                          e.target.style.animation = 'none';
                                          setTimeout(() => {
                                            e.target.style.animation = 'uploadBounce 0.6s ease-in-out 2';
                                          }, 10);
                                        }, 5000);
                                      }}
                                    >
                                      <Upload size={20} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                  <input
                                    type="file"
                                    id={`file-input-${l.id}`}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleImageUpload(e, l.id)}
                                  />
                                </>
                              )}
                            </div>
                          </td>

                          {/* ITEM NAME */}
                          <td className="px-2 py-2 align-middle">
                            <div className="relative search-dropdown-container">
                              <input
                                value={l.description}
                                onChange={(e) => {
                                  updateLine(l.id, {
                                    description: e.target.value,
                                  });
                                  setActiveSearchRowId(l.id);
                                  const rect = e.target.getBoundingClientRect();
                                  setDropdownCoords({
                                    top: rect.bottom + window.scrollY,
                                    left: rect.left + window.scrollX,
                                    width: rect.width
                                  });
                                }}
                                onFocus={(e) => {
                                  setActiveSearchRowId(l.id);
                                  const rect = e.target.getBoundingClientRect();
                                  setDropdownCoords({
                                    top: rect.bottom + window.scrollY,
                                    left: rect.left + window.scrollX,
                                    width: rect.width
                                  });
                                }}
                                className={`border-2 rounded-lg text-sm focus:outline-none ${lineErrors[l.id]?.description
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                  }`}
                                style={{ padding: '0.5rem', width: '100%', minWidth: '280px' }}
                                placeholder="Item Name *"
                                disabled={submitting}
                              />

                              {activeSearchRowId === l.id && l.description && createPortal(
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: `${dropdownCoords.top}px`,
                                    left: `${dropdownCoords.left}px`,
                                    width: `${dropdownCoords.width}px`,
                                  }}
                                  className="bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] max-h-60 overflow-y-auto search-dropdown-container"
                                >
                                  {products
                                    .filter(p => (p.name || "").toLowerCase().includes((l.description || "").toLowerCase()))
                                    .slice(0, 10)
                                    .map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                          const isPurchase = formType && (formType.toLowerCase().includes('purchase') || formType === 'debitNote' || formType === 'purchaseReturn');
                                          const finalPrice = isPurchase ? (product.purchasePrice || product.salesPrice || 0) : (product.salesPrice || 0);

                                          updateLine(l.id, {
                                            productId: product.id,
                                            description: product.name,
                                            subtitle: product.subtitle || "",
                                            hsn: product.hsn || "",
                                            unit: product.stockUnit || "PCS",
                                            price: finalPrice,
                                            image_url: product.image_url || "",
                                          });
                                          setActiveSearchRowId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-green-50/70 border-b border-gray-100 last:border-0 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          {product.image_url ? (
                                            <img
                                              src={product.image_url}
                                              alt={product.name}
                                              className="w-8 h-8 object-cover rounded-md border border-gray-100 flex-shrink-0"
                                              onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                          ) : (
                                            <div className="w-8 h-8 bg-gray-100 text-gray-500 flex items-center justify-center rounded-md font-semibold text-xs border border-gray-100 flex-shrink-0">
                                              {(product.name || "P").charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[150px]">{product.name}</p>
                                            <p className="text-[10px] text-gray-400">Code: {product.code || "N/A"}</p>
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-xs font-bold text-[#129046]">
                                            {getCurrencySymbol(currency)} {isPurchase ? (product.purchasePrice || 0) : (product.salesPrice || 0)}
                                          </p>
                                          <p className="text-[10px] text-gray-400">Stock: {product.stockQuantity} {product.stockUnit}</p>
                                        </div>
                                      </button>
                                    ))}
                                  {products.filter(p => (p.name || "").toLowerCase().includes((l.description || "").toLowerCase())).length === 0 && (
                                    <div className="p-3 text-center text-xs text-gray-500 italic">
                                      No matching items found
                                    </div>
                                  )}
                                </div>,
                                document.body
                              )}
                            </div>
                          </td>

                          {/* HSN/SAC */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              value={l.hsn || ""}
                              onChange={(e) =>
                                updateLine(l.id, { hsn: e.target.value })
                              }
                              className="border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                              style={{ padding: '0.5rem', width: 'auto', maxWidth: '85px' }}
                              placeholder="HSN Code"
                              disabled={submitting}
                            />
                          </td>

                          {/* QTY - Compact */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              type="text"
                              value={
                                focusedInput?.id === l.id && focusedInput?.field === 'qty'
                                  ? focusedInput.val
                                  : (l.qty ?? "")
                              }
                              onFocus={() => setFocusedInput({ id: l.id, field: 'qty', val: String(l.qty ?? "") })}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFocusedInput({ id: l.id, field: 'qty', val: value });
                                // Only allow numbers and decimal point
                                if (/^\d*\.?\d*$/.test(value) || value === '') {
                                  updateLine(l.id, {
                                    qty: value === '' ? 0 : Number(value),
                                  });
                                }
                              }}
                              onBlur={() => setFocusedInput(null)}
                              className={`border-2 rounded-lg text-sm focus:outline-none text-center ${lineErrors[l.id]?.qty
                                ? "border-red-500/0 border-gray-200" // Remove red highlight for qty
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                }`}
                              style={{ padding: '0.5rem', width: 'auto', maxWidth: '60px' }}
                              placeholder="0"
                              disabled={submitting}
                            />
                          </td>

                          {/* UNIT - Compact */}
                          <td className="px-2 py-2 align-middle">
                            <CommonDropdown
                              options={getUnitOptions(customUnits)}
                              value={l.unit || "PCS"}
                              valueBy="id"
                              onChange={(opt) => handleUnitChange(l.id, opt)}
                              className2="border-2 border-gray-200 rounded-lg"
                              className="w-full sm:w-full h-[40px]"
                              style={{ width: 'auto', minWidth: '100px' }}
                              id={`unit-dropdown-${l.id}`}
                              name="unit"
                              placeholder="Select Unit"
                              disabled={submitting}
                            />
                          </td>

                          {/* UNIT PRICE - Compact */}
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={
                                  focusedInput?.id === l.id && focusedInput?.field === 'price'
                                    ? focusedInput.val
                                    : `${getCurrencySymbol(currency)}${convertAmount(l.price, currency).toFixed(2)}`
                                }
                                onFocus={() => {
                                  const currentVal = `${getCurrencySymbol(currency)}${convertAmount(l.price, currency).toFixed(2)}`;
                                  setFocusedInput({ id: l.id, field: 'price', val: currentVal });
                                }}
                                onChange={(e) => {
                                  const symbol = getCurrencySymbol(currency);
                                  let val = e.target.value;

                                  // Update local focused state
                                  setFocusedInput({ id: l.id, field: 'price', val });

                                  // Process for underlying data
                                  if (val.startsWith(symbol)) val = val.substring(symbol.length);
                                  const cleanVal = val.replace(/[^0-9.]/g, "");
                                  const parts = cleanVal.split(".");
                                  const finalVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
                                  const inrValue = finalVal === "" ? 0 : convertToINR(Number(finalVal), currency);
                                  updateLine(l.id, { price: inrValue });
                                }}
                                onBlur={() => setFocusedInput(null)}
                                className={`border-2 rounded-lg text-sm focus:outline-none text-center ${lineErrors[l.id]?.price
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                  }`}
                                style={{ padding: '0.5rem', width: 'auto', minWidth: '110px', maxWidth: '140px' }}
                                placeholder="0.00"
                                disabled={submitting}
                              />
                            </div>
                          </td>

                          {/* DISC (%) - Compact */}
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                value={
                                  focusedInput?.id === l.id && focusedInput?.field === 'discountPct'
                                    ? focusedInput.val
                                    : (l.discountPct || l.discountPct === 0 ? l.discountPct : "")
                                }
                                onFocus={() => setFocusedInput({ id: l.id, field: 'discountPct', val: String(l.discountPct ?? "") })}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFocusedInput({ id: l.id, field: 'discountPct', val: value });
                                  // Only allow numbers and decimal point
                                  if (/^\d*\.?\d*$/.test(value) || value === '') {
                                    updateLine(l.id, {
                                      discountPct: value === '' ? 0 : Number(value),
                                    });
                                  }
                                }}
                                onBlur={() => setFocusedInput(null)}
                                className="border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                placeholder="0"
                                disabled={submitting}
                              />
                              <span className="text-xs text-gray-600">%</span>
                            </div>
                          </td>

                          {/* IGST (%) - Show if GST enabled and it is an inter-state transaction */}
                          {selectedParty && useGST && autoCalculatedTaxType === 'IGST' && (
                            <td className="px-2 py-2 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={
                                    focusedInput?.id === l.id && focusedInput?.field === 'igstPct'
                                      ? focusedInput.val
                                      : (l.igstPct ?? "")
                                  }
                                  onFocus={() => setFocusedInput({ id: l.id, field: 'igstPct', val: String(l.igstPct ?? "") })}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setFocusedInput({ id: l.id, field: 'igstPct', val: value });
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                      updateLine(l.id, {
                                        igstPct: value === '' ? 0 : Number(value),
                                        taxType: 'IGST',
                                        // Clear other taxes when IGST is set
                                        cgstPct: 0,
                                        sgstPct: 0,
                                        vatPct: 0
                                      });
                                    }
                                  }}
                                  onBlur={() => setFocusedInput(null)}
                                  className="border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                  style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                  placeholder="0"
                                  disabled={submitting}
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            </td>
                          )}

                          {/* GST (%) Master - Show if GST enabled and it is an intra-state transaction */}
                          {selectedParty && useGST && autoCalculatedTaxType === 'GST' && (
                            <td className="px-2 py-2 align-middle bg-green-50/20">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={
                                    focusedInput?.id === l.id && focusedInput?.field === 'gstMaster'
                                      ? focusedInput.val
                                      : (Number(l.cgstPct || 0) + Number(l.sgstPct || 0))
                                  }
                                  onFocus={() => setFocusedInput({ id: l.id, field: 'gstMaster', val: String(Number(l.cgstPct || 0) + Number(l.sgstPct || 0)) })}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setFocusedInput({ id: l.id, field: 'gstMaster', val: value });
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                      const totalGst = value === '' ? 0 : Number(value);
                                      updateLine(l.id, {
                                        cgstPct: totalGst / 2,
                                        sgstPct: totalGst / 2,
                                        taxType: 'GST',
                                        // Clear other taxes when GST is set
                                        igstPct: 0,
                                        vatPct: 0
                                      });
                                    }
                                  }}
                                  onBlur={() => setFocusedInput(null)}
                                  className="border-2 border-green-200 rounded-lg text-sm font-semibold focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center bg-white"
                                  style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                  placeholder="0"
                                  disabled={submitting}
                                />
                                <span className="text-xs text-gray-600 font-bold">%</span>
                              </div>
                            </td>
                          )}

                          {/* CGST (%) - Show if GST enabled and it is an intra-state transaction */}
                          {selectedParty && useGST && autoCalculatedTaxType === 'GST' && (
                            <td className="px-2 py-2 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={l.cgstPct ?? ""}
                                  className="border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed text-center"
                                  style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                  placeholder="0"
                                  readOnly
                                  tabIndex="-1"
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            </td>
                          )}

                          {/* SGST (%) - Show if GST enabled and it is an intra-state transaction */}
                          {selectedParty && useGST && autoCalculatedTaxType === 'GST' && (
                            <td className="px-2 py-2 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={l.sgstPct ?? ""}
                                  className="border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed text-center"
                                  style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                  placeholder="0"
                                  readOnly
                                  tabIndex="-1"
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            </td>
                          )}

                          {/* VAT (%) - Show if VAT enabled */}
                          {selectedParty && useVAT && (
                            <td className="px-2 py-2 align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={
                                    focusedInput?.id === l.id && focusedInput?.field === 'vatPct'
                                      ? focusedInput.val
                                      : (l.vatPct ?? "")
                                  }
                                  onFocus={() => setFocusedInput({ id: l.id, field: 'vatPct', val: String(l.vatPct ?? "") })}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setFocusedInput({ id: l.id, field: 'vatPct', val: value });
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                      updateLine(l.id, {
                                        vatPct: value === '' ? 0 : Number(value),
                                        taxType: 'VAT',
                                        igstPct: 0,
                                        cgstPct: 0,
                                        sgstPct: 0
                                      });
                                    }
                                  }}
                                  onBlur={() => setFocusedInput(null)}
                                  className="border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                                  style={{ padding: '0.5rem', width: 'auto', maxWidth: '50px' }}
                                  placeholder="0"
                                  disabled={submitting}
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            </td>
                          )}

                          {/* TOTAL AMOUNT */}
                          <td className="px-2 py-2 align-middle">
                            <div translate="no" className="text-center font-medium whitespace-nowrap notranslate">
                              <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(l.total, currency).toFixed(2)}</span>
                            </div>
                          </td>

                          {/* ACTION - Compact */}
                          <td className="px-2 py-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => removeLine(l.id)}
                              className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              disabled={submitting}
                              title="Remove item"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {lines.length === 0 && (
                        <tr>
                          <td
                            colSpan={15}
                            className="px-4 py-8 text-center text-gray-500 text-sm"
                          >
                            No items added yet — click "Add Products" or "Manual
                            Entry" to add.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Scroll indicator */}
                <div className="sticky left-0 bottom-0 w-full py-1 bg-gradient-to-r from-transparent via-yellow-100/20 to-transparent text-center text-xs text-gray-500 border-t border-yellow-200">
                  <span>← Scroll horizontally →</span>
                </div>
              </div>

              <div className="flex justify-center">
                {/* Add Another Item button if needed */}
              </div>
            </section>

            {/* Summary (unchanged) */}
            {formType !== 'deliveryChallan' && (
              <section className="bg-gray-50 rounded-xl p-6 border-1 border-yellow-200">
                <h2 className="text-xl font-semibold mb-4">
                  {(() => {
                    if (formType === 'deliveryChallan') return 'Delivery Challan Summary';
                    if (formType === 'bookInvoice') return 'Book Invoice Summary';
                    if (formType === 'bookPurchaseOrder' || formType === 'purchaseInvoice') return 'Book Purchase order Summary';
                    if (formType === 'purchaseReturn') return 'Purchase Return Summary';
                    if (formType === 'debitNote') return 'Debit Note Summary';
                    if (formType === 'purchaseOrder') return 'Purchase Order Summary';
                    if (formType === 'creditNote') return 'Credit Note Summary';
                    if (formType === 'proforma') return 'Proforma Invoice Summary';
                    if (formType === 'salesReturn') return 'Sales Return Summary';
                    if (formType === 'sales') return 'Tax Invoice Summary';
                    return 'Quotation Summary';
                  })()}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between py-2 border-b">
                      <span><span>Subtotal</span></span>
                      <span translate="no" className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(subtotal, currency).toFixed(2)}</span></span>
                    </div>
                    {totalCgst > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span><span>CGST</span></span>
                        <span translate="no" className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalCgst, currency).toFixed(2)}</span></span>
                      </div>
                    )}
                    {totalSgst > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span><span>SGST</span></span>
                        <span translate="no" className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalSgst, currency).toFixed(2)}</span></span>
                      </div>
                    )}
                    {totalIgst > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span><span>IGST</span></span>
                        <span translate="no" className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalIgst, currency).toFixed(2)}</span></span>
                      </div>
                    )}
                    {totalVat > 0 && (
                      <div className="flex justify-between py-2 border-b">
                        <span><span>VAT</span></span>
                        <span translate="no" className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalVat, currency).toFixed(2)}</span></span>
                      </div>
                    )}


                    <div className="mt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          <span>Additional Charges</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            addCharge();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1fbe5a]/10 text-[#1fbe5a] rounded-xl text-sm font-medium hover:bg-[#1fbe5a]/20 transition-colors whitespace-nowrap"
                          disabled={submitting}
                        >
                          <Plus size={14} /> Add Charge
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {charges.length === 0 && (
                          <div className="text-sm text-gray-500">
                            <span>No additional charges</span>
                          </div>
                        )}
                        {charges.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 p-2 bg-white rounded border"
                          >
                            <input
                              value={c.label}
                              onChange={(e) =>
                                updateCharge(c.id, { label: e.target.value })
                              }
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                              disabled={submitting}
                            />
                            <div className="flex items-center gap-1 w-24">
                              <input
                                type="text"
                                value={
                                  focusedInput?.id === c.id && focusedInput?.field === 'amount'
                                    ? focusedInput.val
                                    : `${getCurrencySymbol(currency)}${convertAmount(c.amount, currency).toFixed(2)}`
                                }
                                onFocus={() => {
                                  const currentVal = `${getCurrencySymbol(currency)}${convertAmount(c.amount, currency).toFixed(2)}`;
                                  setFocusedInput({ id: c.id, field: 'amount', val: currentVal });
                                }}
                                onChange={(e) => {
                                  const symbol = getCurrencySymbol(currency);
                                  let val = e.target.value;

                                  // Update local focused state
                                  setFocusedInput({ id: c.id, field: 'amount', val });

                                  // Process for underlying data
                                  if (val.startsWith(symbol)) val = val.substring(symbol.length);
                                  const cleanVal = val.replace(/[^0-9.]/g, "");
                                  const parts = cleanVal.split(".");
                                  const finalVal = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
                                  const inrValue = finalVal === "" ? 0 : convertToINR(Number(finalVal), currency);
                                  updateCharge(c.id, { amount: inrValue });
                                }}
                                onBlur={() => setFocusedInput(null)}
                                className="w-32 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-right"
                                placeholder="0.00"
                                disabled={submitting}
                              />
                            </div>
                            <button
                              onClick={() => removeCharge(c.id)}
                              className="text-red-600 p-2 -m-2 rounded-lg hover:bg-red-50"
                              disabled={submitting}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {chargesTotal > 0 && (
                        <div className="flex justify-between pt-2 border-t font-medium text-gray-900">
                          <span><span>Total Charges:</span></span>
                          <span translate="no" className="notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(chargesTotal, currency).toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                          <span>Discount After Tax</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={
                              focusedInput?.id === 'footer' && focusedInput?.field === 'discountAfterTaxPct'
                                ? focusedInput.val
                                : discountAfterTaxPct
                            }
                            onFocus={() => setFocusedInput({ id: 'footer', field: 'discountAfterTaxPct', val: String(discountAfterTaxPct) })}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFocusedInput({ id: 'footer', field: 'discountAfterTaxPct', val: value });
                              // Only allow numbers and decimal point
                              if (/^\d*\.?\d*$/.test(value) || value === '') {
                                setDiscountAfterTaxPct(value === '' ? 0 : Number(value));
                              }
                            }}
                            onBlur={() => setFocusedInput(null)}
                            className="w-20 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-right"
                            placeholder="0"
                            disabled={submitting}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                      {discountAfterTaxValue > 0 && (
                        <div className="flex justify-between text-sm text-red-600 font-medium mt-1">
                          <span><span>Discount Amount:</span></span>
                          <span translate="no" className="notranslate"><span>-{getCurrencySymbol(currency)}</span> <span>{convertAmount(discountAfterTaxValue, currency).toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pl-0 sm:border-l sm:pl-6">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold flex justify-between items-center">
                      <span><span>Grand Total</span></span>
                      <span translate="no" className="notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalAmount, currency).toFixed(2)}</span></span>
                    </div>

                    <div className="bg-white p-4 rounded-lg border space-y-2 text-sm mt-4">
                      <div className="flex justify-between">
                        <span><span>Subtotal:</span></span>
                        <span className="font-medium notranslate">
                          <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(subtotal, currency).toFixed(2)}</span>
                        </span>
                      </div>

                      {totalCgst > 0 && (
                        <div className="flex justify-between">
                          <span><span>CGST:</span></span>
                          <span className="font-medium notranslate">
                            <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalCgst, currency).toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {totalSgst > 0 && (
                        <div className="flex justify-between">
                          <span><span>SGST:</span></span>
                          <span className="font-medium notranslate">
                            <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalSgst, currency).toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {totalIgst > 0 && (
                        <div className="flex justify-between">
                          <span><span>IGST:</span></span>
                          <span className="font-medium notranslate">
                            <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalIgst, currency).toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {totalVat > 0 && (
                        <div className="flex justify-between">
                          <span><span>VAT:</span></span>
                          <span className="font-medium notranslate">
                            <span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalVat, currency).toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {(totalCgst > 0 || totalSgst > 0 || totalIgst > 0 || totalVat > 0) && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>
                            <span>Total Taxable Amount {(totalCgst > 0 && totalSgst > 0) ? '(CGST+SGST)' : totalIgst > 0 ? '(IGST)' : totalVat > 0 ? '(VAT)' : ''}:</span>
                          </span>
                          <span className="notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalTax, currency).toFixed(2)}</span></span>
                        </div>
                      )}

                      {chargesTotal > 0 && (
                        <div className="flex justify-between">
                          <span><span>Charges:</span></span>
                          <span className="font-medium notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(chargesTotal, currency).toFixed(2)}</span></span>
                        </div>
                      )}

                      {discountAfterTaxValue > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span><span>Discount:</span></span>
                          <span className="font-medium">
                            -{getCurrencySymbol(currency)} {convertAmount(discountAfterTaxValue, currency).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t font-bold text-lg">
                        <span><span>Amount Due:</span></span>
                        <span className="notranslate"><span>{getCurrencySymbol(currency)}</span> <span>{convertAmount(totalAmount, currency).toFixed(2)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Approval Workflow Section (Purchase Order only) */}
            {formType === 'purchaseOrder' && (
              <section className="bg-white rounded-xl p-6 border-2 border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-green-50">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Approval Workflow (Optional)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Level 1 Approver Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs">@</span>
                      </div>
                      <input
                        type="email"
                        value={level1_email}
                        onChange={(e) => setLevel1Email(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                        placeholder="level1@example.com"
                        disabled={submitting}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Receives PO details first for approval</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Level 2 Approver Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs">@</span>
                      </div>
                      <input
                        type="email"
                        value={level2_email}
                        onChange={(e) => setLevel2Email(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                        placeholder="level2@example.com"
                        disabled={submitting}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Notified after Level 1 approves</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Level 3 Approver Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs">@</span>
                      </div>
                      <input
                        type="email"
                        value={level3_email}
                        onChange={(e) => setLevel3Email(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                        placeholder="level3@example.com"
                        disabled={submitting}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Notified after Level 2 approves</p>
                  </div>
                </div>
              </section>
            )}

            {/* Additional Info: Payment Info (bank), Notes */}
            <section className={`grid grid-cols-1 ${showBankDetails && formType !== 'deliveryChallan' ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showBankDetails && formType !== 'deliveryChallan' && (
                <div className="border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold"><span>Bank Accounts</span></h3>
                    <div className="flex gap-4">
                      {selectedBankIndex >= 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBankIndex(selectedBankIndex);
                            setShowBankModal(true);
                          }}
                          className="flex items-center gap-1 text-[#129046] hover:text-[#0d6b35] text-sm font-medium transition-colors hover:underline"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBankIndex(null);
                          setShowBankModal(true);
                        }}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors hover:underline"
                      >
                        <Plus size={14} />
                        Add Bank Account
                      </button>
                    </div>
                  </div>

                  {bankAccounts.length > 0 ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <span>Select Bank Account</span>
                        </label>
                        <div className="relative">
                          <input
                            value={selectedBankIndex >= 0 && bankAccounts[selectedBankIndex] ? bankAccounts[selectedBankIndex].bank_name : ""}
                            onChange={() => { }} // Read-only
                            onFocus={() => setShowBankDropdown(true)}
                            onBlur={() => setTimeout(() => setShowBankDropdown(false), 200)}
                            placeholder="Select bank account"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                            disabled={submitting}
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={() => setShowBankDropdown(!showBankDropdown)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Bank Dropdown */}
                          {showBankDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 flex flex-col">
                              <div className="overflow-y-auto max-h-48">
                                {bankAccounts.map((acc, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setSelectedBankIndex(idx);
                                      setShowBankDropdown(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-300 last:border-b-0 text-sm relative ${selectedBankIndex === idx ? "bg-green-50" : ""
                                      }`}
                                  >
                                    {selectedBankIndex === idx && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600"></div>
                                    )}
                                    <div className="ml-2">
                                      <div className={`font-medium text-sm ${selectedBankIndex === idx ? "text-green-800" : "text-gray-900"
                                        }`}>
                                        <span>{acc.bank_name}</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <span>{acc.account_number}</span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedBankIndex >= 0 && bankAccounts[selectedBankIndex] ? (
                        <div className="text-sm">

                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-medium"><span>Bank Name:</span></span> <span>{bankAccounts[selectedBankIndex].bank_name}</span>
                              </div>
                              <div>
                                <span className="font-medium"><span>Account Number:</span></span> <span>{bankAccounts[selectedBankIndex].account_number}</span>
                              </div>
                              {bankAccounts[selectedBankIndex].ifsc && (
                                <div>
                                  <span className="font-medium"><span>IFSC Code:</span></span> <span>{bankAccounts[selectedBankIndex].ifsc}</span>
                                </div>
                              )}
                              {bankAccounts[selectedBankIndex].branch && (
                                <div>
                                  <span className="font-medium"><span>Branch:</span></span> <span>{bankAccounts[selectedBankIndex].branch}</span>
                                </div>
                              )}
                              {bankAccounts[selectedBankIndex].account_holder_name && (
                                <div>
                                  <span className="font-medium"><span>Account Holder's Name:</span></span> <span>{bankAccounts[selectedBankIndex].account_holder_name}</span>
                                </div>
                              )}
                              {bankAccounts[selectedBankIndex].upi && (
                                <div>
                                  <span className="font-medium"><span>UPI ID:</span></span> <span>{bankAccounts[selectedBankIndex].upi}</span>
                                </div>
                              )}
                            </div>
                            {bankAccounts[selectedBankIndex].qr_code && (
                              <div className="flex-shrink-0">
                                <div className="text-xs font-semibold text-gray-500 mb-1 text-center">QR Code</div>
                                <img
                                  src={bankAccounts[selectedBankIndex].qr_code.startsWith('http') ? bankAccounts[selectedBankIndex].qr_code : `${getApiConfig().backendURL}${bankAccounts[selectedBankIndex].qr_code}`}
                                  alt="Bank QR"
                                  className="w-40 h-40 object-contain border-2 border-gray-100 rounded-lg p-1 bg-white shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
                                  onClick={() => window.open(bankAccounts[selectedBankIndex].qr_code.startsWith('http') ? bankAccounts[selectedBankIndex].qr_code : `${getApiConfig().backendURL}${bankAccounts[selectedBankIndex].qr_code}`, '_blank')}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end mt-3 gap-3">
                            <button
                              type="button"
                              onClick={() => removeBank(selectedBankIndex)}
                              className="text-red-600 text-sm hover:text-red-800 underline"
                              disabled={submitting}
                            >
                              <span>Remove Bank Account</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedBankIndex === -1 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          <span>No bank account selected</span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="border-dashed p-4 rounded-lg text-center text-sm text-gray-500 hover:border-gray-400 transition-colors">
                      <Settings size={20} className="mx-auto mb-2" />
                      <span>No payment method configured</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold"><span>Customer Notes</span></h3>
                  <button
                    type="button"
                    onClick={() => setShowNotes((s) => !s)}
                    className="text-green-600 text-sm"
                  >
                    <span>{showNotes ? "Hide" : "Add Note"}</span>
                  </button>
                </div>
                {showNotes ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none resize-none"
                    rows={4}
                    placeholder="Add any special instructions or notes for the customer..."
                    disabled={submitting}
                  />
                ) : (
                  <div className="text-sm text-gray-500"><span>No notes added</span></div>
                )}
              </div>
            </section>

            {/* Terms & Conditions - Separate Row */}
            <section className="mt-6">
              <div className="border-2 border-yellow-200 rounded-lg p-4 space-y-4">
                {sections.map((section, index) => (
                  <div key={section.id}>
                    {index > 0 && <hr className="border-gray-200 my-4" />}
                    <div className="grid grid-cols-12 gap-0">
                      <div className="col-span-8">
                        <h3 className="text-lg font-semibold mb-2"><span>{section.heading}</span></h3>
                        <div
                          className="text-sm text-gray-700 terms-content"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content) }}

                          style={{
                            wordBreak: 'break-word',
                            lineHeight: '1.6'
                          }}
                        />
                      </div>
                      <div className="col-span-4 flex gap-2 items-center justify-end pl-4">
                        {/* Global Lock Button - Show only if section has content */}
                        {section.content && section.content.trim() && (
                          <button
                            type="button"
                            onClick={() => handleToggleLock(section.id)}
                            className={`${section.is_locked
                              ? "bg-red-500 text-white border-red-600 hover:bg-red-600"
                              : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                              } w-10 h-10 rounded-md flex items-center justify-center transition-all border shadow-sm hover:shadow`}
                            title={section.is_locked ? "Global Terms (Locked)" : "Make Global (Lock)"}
                          >
                            {section.is_locked ? (
                              <Lock size={20} strokeWidth={2} />
                            ) : (
                              <Unlock size={20} strokeWidth={2} />
                            )}
                          </button>
                        )}
                        {/* Edit Button - Icon Only */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setShowTextEditor(true);
                          }}
                          className="bg-green-100 text-green-700 w-10 h-10 rounded-md flex items-center justify-center hover:bg-green-200 transition-all border border-green-200 shadow-sm hover:shadow"
                          title="Edit Terms"
                        >
                          <Edit2 size={20} strokeWidth={2.5} />
                        </button>
                        {/* Section Button - Icon Only - Show only in last section */}
                        {index === sections.length - 1 && (
                          <button
                            type="button"
                            onClick={addNewSection}
                            className="bg-yellow-100 text-yellow-700 w-10 h-10 rounded-md flex items-center justify-center hover:bg-yellow-200 transition-all border border-yellow-200 shadow-sm hover:shadow"
                            title="Add Section"
                          >
                            <Plus size={20} strokeWidth={2.5} />
                          </button>
                        )}
                        {/* Delete Button - Icon Only - Not shown for first section */}
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="bg-red-100 text-red-700 w-10 h-10 rounded-md flex items-center justify-center hover:bg-red-200 transition-all border border-red-200 shadow-sm hover:shadow"
                            title="Delete Section"
                          >
                            <Trash2 size={20} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Footer with Save/Cancel Buttons */}
            <div className="border-t border-gray-300 pt-4 mt-8">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onBack}
                  style={{ padding: "6px 16px", height: "36px" }}
                  className="bg-red-600 text-white rounded-[7px] text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                  disabled={submitting}
                >
                  <span>{cancelLabel}</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "6px 16px", height: "36px" }}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] text-sm font-medium disabled:bg-gray-400 disabled:text-gray-200 hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 flex items-center justify-center"
                >
                  <span>{submitting ? "Saving..." : saveLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modals */}
      <ProductModal
        open={showProductModal}
        products={products}
        setProducts={setProducts}
        onClose={() => setShowProductModal(false)}
        onDone={addLinesFromModal}
        currentLines={lines}
        currency={currency}
        customUnits={customUnits}
        setCustomUnits={setCustomUnits}
      />

      <PartyModal
        open={showPartyModal}
        onClose={() => setShowPartyModal(false)}
        onSave={(newParty) => {
          // Add to parties list
          setParties(prev => [...prev, newParty]);

          // Automatically select the newly created party and show Bill To/Ship To sections
          setSelectedParty(newParty);
          setSelectedPartyDetails(newParty);
          setParty(newParty.party_name || newParty.name || "");

          /* Handled by applyTaxDetection */

          // Ensure dropdown is closed
          setShowPartyDropdown(false);
          setShowPartyModal(false);
        }}
      />
      <BankModal
        open={showBankModal}
        initial={editingBankIndex != null ? bankAccounts[editingBankIndex] : {}}
        onClose={() => {
          setShowBankModal(false);
          setEditingBankIndex(null);
        }}
        onSave={(acc) => {
          if (editingBankIndex != null) {
            updateBank(editingBankIndex, acc);
          } else {
            addBank(acc);
          }
          setShowBankModal(false);
          setEditingBankIndex(null);
        }}
      />

      {/* Address Modals (from Parties.jsx) */}
      <BillingAddressesModal
        open={showBillingAddressesModal}
        onClose={() => setShowBillingAddressesModal(false)}
        addresses={partyAddresses.billing}
        selectedIndex={selectedBillingAddressIndex}
        onSelect={(index) => {
          setSelectedBillingAddressIndex(index);

          // Update selectedPartyDetails with the selected billing address
          const selectedAddress = partyAddresses.billing[index];
          if (selectedAddress) {
            setSelectedPartyDetails(prev => ({
              ...prev,
              billing_address: selectedAddress.line1,
              city: selectedAddress.city,
              state: selectedAddress.state,
              pincode: selectedAddress.pincode,
              country: selectedAddress.country || 'India',
              meta: {
                ...prev?.meta,
                billing_attention: selectedAddress.attention || "",
                billing_line2: selectedAddress.line2 || "",
                billing_phone: selectedAddress.phone || "",
                billing_fax: selectedAddress.fax || ""
              }
            }));
          }

          setShowBillingAddressesModal(false);
        }}
        onEdit={(index) => {
          setEditingBillingIndex(index);
          setShowBillingAddressModal(true);
          setShowBillingAddressesModal(false);
        }}
        onAdd={() => {
          setEditingBillingIndex(-1);
          setShowBillingAddressModal(true);
          setShowBillingAddressesModal(false);
        }}
      />

      <BillingAddressModal
        open={showBillingAddressModal}
        onClose={() => setShowBillingAddressModal(false)}
        billingAddress={
          editingBillingIndex >= 0
            ? partyAddresses.billing[editingBillingIndex]
            : editingBillingIndex === -1
              ? { attention: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", phone: "", fax: "" }
              : {
                attention: selectedPartyDetails?.meta?.billing_attention || "",
                line1: selectedPartyDetails?.billing_address || "",
                line2: selectedPartyDetails?.meta?.billing_line2 || "",
                city: selectedPartyDetails?.city || "",
                state: selectedPartyDetails?.state || "",
                pincode: selectedPartyDetails?.pincode || "",
                country: selectedPartyDetails?.country || "India",
                phone: selectedPartyDetails?.meta?.billing_phone || "",
                fax: selectedPartyDetails?.meta?.billing_fax || ""
              }
        }
        onSave={async (data) => {
          try {


            if (!selectedParty || !selectedParty.id) {
              console.error("â Œ No party selected");
              showErrorToast("Please select a party first");
              return;
            }

            const businessId = localStorage.getItem('selectedBusinessId');


            // Prepare update data - only update billing address fields
            // This will trigger the party model to create/update address in addresses table
            const updateAddress = {
              attention: data.attention,
              line1: data.line1,
              line2: data.line2,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              country: data.country || 'India',
              phone: data.phone,
              fax: data.fax
            };

            // CRITICAL: Ensure ID is preserved from the original address record
            if (data.id) {
              updateAddress.id = data.id;
            } else if (editingBillingIndex !== null && (partyAddresses.billing && partyAddresses.billing[editingBillingIndex]?.id)) {
              updateAddress.id = partyAddresses.billing[editingBillingIndex].id;
            }

            const updateData = {
              billingAddresses: [updateAddress],
              selectedBillingAddressIndex: 0,
              // Also keep flat fields for document snapshot compatibility
              billing_address: data.line1,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              country: data.country || 'India',
              // Add meta for custom fields
              meta: {
                billing_attention: data.attention,
                billing_line2: data.line2,
                billing_phone: data.phone,
                billing_fax: data.fax
              }
            };



            // Call API to update party - this will automatically handle addresses table
            const response = await partyAPI.update(selectedParty.id, updateData, businessId);


            if (response.success) {


              // Update local state
              setSelectedPartyDetails(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  billing_address: data.line1,
                  city: data.city,
                  state: data.state,
                  pincode: data.pincode,
                  country: data.country || 'India',
                  meta: {
                    ...(prev.meta || {}),
                    billing_attention: data.attention,
                    billing_line2: data.line2,
                    billing_phone: data.phone,
                    billing_fax: data.fax
                  }
                };
              });

              // Refresh party addresses from addresses table

              const addressResponse = await fetch(
                `${getApiConfig().backendURL}/api/parties/${selectedParty.id}/addresses?business_id=${businessId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );

              if (addressResponse.ok) {
                const addressResult = await addressResponse.json();
                if (addressResult.success && addressResult.data) {
                  const billingAddrs = addressResult.data.filter(addr => addr.address_type === 'billing');
                  const shippingAddrs = addressResult.data.filter(addr => addr.address_type === 'shipping');
                  setPartyAddresses({
                    billing: billingAddrs,
                    shipping: shippingAddrs
                  });

                }
              }

              showSuccessToast('Billing address saved successfully');
              setShowBillingAddressModal(false);
            } else {
              throw new Error(response.message || 'Failed to save billing address');
            }
          } catch (error) {
            console.error("â Œ Error saving billing address:", error);
            showErrorToast(error.message || 'Failed to save billing address');
          }
        }}
      />

      <ShippingAddressesModal
        open={showShippingAddressesModal}
        onClose={() => setShowShippingAddressesModal(false)}
        addresses={partyAddresses.shipping}
        selectedIndex={selectedShippingAddressIndex}
        onSelect={(index) => {
          setSelectedShippingAddressIndex(index);

          // Update correct party details
          const addrsToUse = partyAddresses.shipping;
          const selectedAddress = addrsToUse[index];

          if (selectedAddress) {
            const updateDetails = (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                shipping_address: selectedAddress.line1,
                ship_city: selectedAddress.city,
                ship_state: selectedAddress.state,
                ship_pincode: selectedAddress.pincode,
                ship_country: selectedAddress.country || 'India',
                meta: {
                  ...(prev.meta || {}),
                  shipping_attention: selectedAddress.attention || "",
                  shipping_line2: selectedAddress.line2 || "",
                  shipping_phone: selectedAddress.phone || "",
                  shipping_fax: selectedAddress.fax || ""
                }
              };
            };

            setSelectedPartyDetails(updateDetails);
          }

          setShowShippingAddressesModal(false);
        }}
        onEdit={(index) => {
          setEditingShippingIndex(index);
          setShowShippingAddressModal(true);
          setShowShippingAddressesModal(false);
        }}
        onAdd={() => {
          setEditingShippingIndex(-1);
          setShowShippingAddressModal(true);
          setShowShippingAddressesModal(false);
        }}
      />

      <ShippingAddressModal
        open={showShippingAddressModal}
        onClose={() => setShowShippingAddressModal(false)}
        address={
          editingShippingIndex >= 0
            ? partyAddresses.shipping[editingShippingIndex]
            : editingShippingIndex === -1
              ? { attention: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", phone: "", fax: "" }
              : {
                attention: selectedPartyDetails?.meta?.shipping_attention || "",
                line1: selectedPartyDetails?.shipping_address || "",
                line2: selectedPartyDetails?.meta?.shipping_line2 || "",
                city: selectedPartyDetails?.ship_city || "",
                state: selectedPartyDetails?.ship_state || "",
                pincode: selectedPartyDetails?.ship_pincode || "",
                country: selectedPartyDetails?.ship_country || "India",
                phone: selectedPartyDetails?.meta?.shipping_phone || "",
                fax: selectedPartyDetails?.meta?.shipping_fax || ""
              }
        }
        onSave={async (data) => {
          try {
            const partyToUse = selectedParty;
            if (!partyToUse || !partyToUse.id) {
              console.error("❌ No party selected");
              showErrorToast("Please select a party first");
              return;
            }

            const businessId = localStorage.getItem('selectedBusinessId');

            // Prepare update data - only update shipping address fields
            const updateAddress = {
              attention: data.attention,
              line1: data.line1,
              line2: data.line2,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              country: data.country || 'India',
              phone: data.phone,
              fax: data.fax
            };

            // CRITICAL: Ensure ID is preserved from the original address record
            const currentAddrs = partyAddresses.shipping;
            if (data.id) {
              updateAddress.id = data.id;
            } else if (editingShippingIndex !== null && currentAddrs[editingShippingIndex]?.id) {
              updateAddress.id = currentAddrs[editingShippingIndex].id;
            }

            const updateData = {
              shippingAddresses: [updateAddress],
              selectedShippingAddressIndex: 0,
              shipping_address: data.line1,
              ship_city: data.city,
              ship_state: data.state,
              ship_pincode: data.pincode,
              ship_country: data.country || 'India',
              meta: {
                shipping_attention: data.attention,
                shipping_line2: data.line2,
                shipping_phone: data.phone,
                shipping_fax: data.fax
              }
            };

            // Call API to update party
            const response = await partyAPI.update(partyToUse.id, updateData, businessId);

            if (response.success) {
              // Update local state
              const updateFunc = prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  shipping_address: data.line1,
                  ship_city: data.city,
                  ship_state: data.state,
                  ship_pincode: data.pincode,
                  ship_country: data.country || 'India',
                  meta: {
                    ...(prev.meta || {}),
                    shipping_attention: data.attention,
                    shipping_line2: data.line2,
                    shipping_phone: data.phone,
                    shipping_fax: data.fax
                  }
                };
              };

              setSelectedPartyDetails(updateFunc);

              // Refresh party addresses
              const addressResponse = await fetch(
                `${getApiConfig().backendURL}/api/parties/${partyToUse.id}/addresses?business_id=${businessId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );

              if (addressResponse.ok) {
                const addressResult = await addressResponse.json();
                if (addressResult.success && addressResult.data) {
                  const billingAddrs = addressResult.data.filter(addr => addr.address_type === 'billing');
                  const shippingAddrs = addressResult.data.filter(addr => addr.address_type === 'shipping');
                  setPartyAddresses({
                    billing: billingAddrs,
                    shipping: shippingAddrs
                  });
                }
              }

              showSuccessToast('Shipping address saved successfully');
              setShowShippingAddressModal(false);
            } else {
              throw new Error(response.message || 'Failed to save shipping address');
            }
          } catch (error) {
            console.error("❌ Error saving shipping address:", error);
            showErrorToast(error.message || 'Failed to save shipping address');
          }
        }}
      />

      {/* Text Editor Modal */}
      <TextEditorModal
        open={showTextEditor}
        sectionId={editingSectionId}
        onClose={() => {
          setShowTextEditor(false);
          setEditingSectionId(null);
          window.currentEditingSectionId = null;
        }}
        initialContent={
          editingSectionId
            ? sections.find(s => s.id === editingSectionId)?.content || ""
            : ""
        }
        initialHeading={
          editingSectionId
            ? sections.find(s => s.id === editingSectionId)?.heading || ""
            : ""
        }
        onSave={(htmlContent, heading) => {
          setSections(prev =>
            prev.map(s =>
              s.id === editingSectionId
                ? { ...s, content: htmlContent, heading }
                : s
            )
          );
          setShowTextEditor(false);
          setEditingSectionId(null);
          window.currentEditingSectionId = null;
        }}
      />

      {/* Business Shipping Address Edit Modal */}
      <ShippingAddressModal
        open={showBusinessShippingEditModal}
        onClose={() => setShowBusinessShippingEditModal(false)}
        address={{
          attention: shippingDetails.meta.shipping_attention,
          line1: shippingDetails.shipping_address,
          line2: shippingDetails.meta.shipping_line2,
          city: shippingDetails.ship_city,
          state: shippingDetails.ship_state,
          pincode: shippingDetails.ship_pincode,
          country: shippingDetails.ship_country,
          phone: shippingDetails.meta.shipping_phone,
          fax: shippingDetails.meta.shipping_fax,
        }}
        onSave={(data) => {
          setShippingDetails({
            shipping_address: data.line1,
            ship_city: data.city,
            ship_state: data.state,
            ship_pincode: data.pincode,
            ship_country: data.country,
            meta: {
              shipping_attention: data.attention,
              shipping_line2: data.line2,
              shipping_phone: data.phone,
              shipping_fax: data.fax,
            }
          });
        }}
      />

    </div>
  );
}




