import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { partyAPI, taxAPI, businessAPI } from "../../../utils/api.js";
import { showSuccessToast, showErrorToast, showInfoToast } from "../../../Components/ActionMessageModel.jsx";
import { countryCodes } from '../../../utils/countryCodes.js';
import { ChevronDown, Search, MapPin, Users } from "lucide-react";
import { STATE_OPTIONS } from "../../../utils/dropdownOptions.js";

function PartyModal({
  open = true,
  onClose = () => { },
  onSave = () => { },
}) {
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState("customer");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [gstin, setGstin] = useState("");
  const [vat, setVat] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [remark, setRemark] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState("");
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);
  const phoneCodeInputRef = React.useRef(null);
  const [loading, setLoading] = useState(false);

  // Search/Dropdown States for Address
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryInputRef = React.useRef(null);
  const countryOptionsListRef = React.useRef(null);
  const [countryHighlightedIndex, setCountryHighlightedIndex] = useState(0);

  const [stateSearchTerm, setStateSearchTerm] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateInputRef = React.useRef(null);
  const stateOptionsListRef = React.useRef(null);
  const [stateHighlightedIndex, setStateHighlightedIndex] = useState(0);

  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = React.useRef(null);
  const cityOptionsListRef = React.useRef(null);
  const [cityHighlightedIndex, setCityHighlightedIndex] = useState(0);

  // Loading States for Address Lookups
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Dynamic Options
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const pincodeTimeoutRef = React.useRef(null);

  // Track manually edited address fields
  const [manualAddressEdits, setManualAddressEdits] = useState({ city: false, state: false, country: false });

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Dynamic sections state
  const [showAddress, setShowAddress] = useState(true);
  const [showGstin, setShowGstin] = useState(false);
  const [taxIdLoading, setTaxIdLoading] = useState(false);
  const [taxType, setTaxType] = useState(""); // "", "GSTIN", "VAT", or "NO_TAX"

  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      // Auto-detect country code
      const detectCountry = async () => {
        try {
          const response = await fetch('https://country.is/');
          if (!response.ok) return;
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) return;

          const data = await response.json();
          if (data && data.country) {
            const countryData = countryCodes.find(c => c.code === data.country);
            if (countryData) {
              setCountryCode(countryData.dial_code);
            }
          }
        } catch (error) {
          console.warn('Error detecting country:', error.message);
        }
      };
      detectCountry();

      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock scroll with multiple methods
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');

      return () => {
        // Restore scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
      const data = await response.json();
      if (!data.error) {
        const countries = data.data.map(c => ({
          label: c.name,
          value: c.name
        })).sort((a, b) => a.label.localeCompare(b.label));
        setAllCountries(countries);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch states by country
  const fetchStatesByCountry = async (countryName) => {
    try {
      setLoadingStates(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const data = await response.json();
      if (!data.error) {
        const states = data.data.states.map(s => ({
          label: s.name,
          value: s.name,
          id: s.name
        }));
        setStateOptions(states);
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

  // Fetch cities by state and country
  const fetchCitiesByStateAndCountry = async (countryName, stateName) => {
    try {
      setLoadingCities(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const data = await response.json();
      if (!data.error) {
        const cities = data.data.map(c => ({
          label: c,
          value: c
        }));
        setCityOptions(cities);
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

  // Initialize countries
  useEffect(() => {
    fetchAllCountries();
  }, []);

  // Load states/cities when country/state changes
  useEffect(() => {
    if (country) {
      fetchStatesByCountry(country);
    }
  }, [country]);

  useEffect(() => {
    if (country && state) {
      fetchCitiesByStateAndCountry(country, state);
    } else {
      setCityOptions([]);
    }
  }, [state, country]);

  // Filter countries, states, cities
  const filteredCountryOptions = allCountries.filter((c) =>
    c.label.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  const filteredStateOptions = (country === 'India' ? STATE_OPTIONS : stateOptions).filter((state) =>
    state.label.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  const filteredCityOptions = cityOptions.filter((city) =>
    city.label.toLowerCase().includes(citySearchTerm.toLowerCase())
  );


  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setPartyName("");
      setPartyType("customer");
      setPhoneNumber("");
      setBillingAddress("");
      setCity("");
      setState("");
      setPincode("");
      setCountry("");
      setGstin("");
      setVat("");
      setTradeName("");
      setPanNumber("");
      setRemark("");
      setCountryCode("+91");
      setShowAddress(true);
      setShowGstin(false);
      setCountrySearchTerm("");
      setShowCountryDropdown(false);
      setStateSearchTerm("");
      setShowStateDropdown(false);
      setCitySearchTerm("");
      setShowCityDropdown(false);
      setTaxType("");
      setShippingAddress("");
      setSameAsBilling(true);
    }
  }, [open]);

  // Handle same as billing checkbox
  const [shippingAddress, setShippingAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Handle pincode change
  const handlePincodeChange = (e) => {
    const value = e.target.value;
    setPincode(value);
    // Reset manual edit flags when pincode changes so auto-fill works
    if (value.length > 0) {
      setManualAddressEdits({ city: false, state: false, country: false });
    }
  };

  const fetchAddressByPincode = async (value) => {
    if (!value || value.length < 3) return;

    try {
      setPincodeLoading(true);
      const response = await businessAPI.getCityByPincode(value, country);
      if (response.success && response.data) {
        const { city: fetchedCity, state: fetchedState, country: fetchedCountry } = response.data;

        if (!manualAddressEdits.city && fetchedCity) {
          // Update city options so it's selectable in the custom dropdown
          setCityOptions(prev => {
            const exists = prev.some(opt => opt.value === fetchedCity);
            if (!exists) {
              return [{ label: fetchedCity, value: fetchedCity }, ...prev];
            }
            return prev;
          });

          setCity(fetchedCity);
          setCitySearchTerm(fetchedCity);
          setErrors(prev => ({ ...prev, city: '' }));
        }
        if (!manualAddressEdits.state && fetchedState) {
          setState(fetchedState);
          setStateSearchTerm(fetchedState);
          setErrors(prev => ({ ...prev, state: '' }));
        }
        if (!manualAddressEdits.country && fetchedCountry) {
          setCountry(fetchedCountry);
          setCountrySearchTerm(fetchedCountry);
          setErrors(prev => ({ ...prev, country: '' }));
        }

        // Clear pincode error if successful
        setErrors(prev => ({ ...prev, pincode: '' }));
      } else {
        showInfoToast('No address found for this pincode. Please enter manually.');
      }
    } catch (error) {
      console.error('Error fetching address from pincode:', error);
    } finally {
      setPincodeLoading(false);
    }
  };

  // Auto-fetch on pincode change with debounce
  useEffect(() => {
    const pincodeValue = pincode?.trim();
    if (pincodeValue && pincodeValue.length >= 3 && !pincodeLoading) {
      const timer = setTimeout(() => {
        fetchAddressByPincode(pincodeValue);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pincode]);

  const handlePincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchAddressByPincode(pincode);
    }
  };

  // Selection Handlers
  const selectCountryOption = (countryName) => {
    setCountry(countryName);
    setCountrySearchTerm(countryName);
    setShowCountryDropdown(false);
    setErrors(prev => ({ ...prev, country: '' }));
    // Reset manual edit flag for country
    setManualAddressEdits(prev => ({ ...prev, country: true }));
  };

  const selectStateOption = (stateName) => {
    setState(stateName);
    setStateSearchTerm(stateName);
    setShowStateDropdown(false);
    setErrors(prev => ({ ...prev, state: '' }));
    // Set manual edit flag
    setManualAddressEdits(prev => ({ ...prev, state: true }));
  };

  const selectCityOption = (cityName) => {
    setCity(cityName);
    setCitySearchTerm(cityName);
    setShowCityDropdown(false);
    setErrors(prev => ({ ...prev, city: '' }));
    // Set manual edit flag
    setManualAddressEdits(prev => ({ ...prev, city: true }));
  };

  async function handleSave() {
    // Clear previous errors
    setErrors({});

    // Validation
    const newErrors = {};

    // Party Name validation
    if (!partyName.trim()) {
      newErrors.partyName = "Party name is required";
    } else if (partyName.trim().length < 2) {
      newErrors.partyName = "Party name must be at least 2 characters";
    }

    // Phone Number validation
    if (!phoneNumber || !phoneNumber.trim()) {
      newErrors.phoneNumber = "Mobile number is required";
    } else {
      const phoneRegex = /^\d+$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        newErrors.phoneNumber = "Please enter a valid mobile number";
      }
    }

    // GSTIN/VAT validation
    if (taxType === "GSTIN" && gstin.trim()) {
      if (gstin.trim().length !== 15) {
        newErrors.gstin = "GSTIN must be exactly 15 characters";
      }
    } else if (taxType === "VAT" && !vat.trim()) {
      newErrors.vat = "VAT number is required";
    }

    // PAN validation if entered
    // if (panNumber.trim()) {
    //   const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    //   if (!panRegex.test(panNumber.trim().toUpperCase())) {
    //     newErrors.panNumber = "Invalid PAN number format";
    //   }
    // }

    // Address validation (only if address section is shown)
    if (showAddress) {
      if (!state.trim()) {
        newErrors.state = "State is required";
      }

      if (!city.trim()) {
        newErrors.city = "City is required";
      } else if (city.trim().length < 2) {
        newErrors.city = "City must be at least 2 characters";
      }

      if (!pincode.trim()) {
        newErrors.pincode = "Pincode/ZIP is required";
      } else if (country === 'India' && !/^\d{6}$/.test(pincode.trim())) {
        newErrors.pincode = "Indian pincode must be exactly 6 digits";
      } else if (pincode.trim().length < 3) {
        newErrors.pincode = "Invalid pincode/ZIP";
      }

      if (!country) {
        newErrors.country = "Country is required";
      }

      if (!billingAddress.trim()) {
        newErrors.billingAddress = "Billing address is required";
      }

      if (!sameAsBilling && !shippingAddress.trim()) {
        newErrors.shippingAddress = "Shipping address is required";
      }
    }



    // If there are validation errors, show them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      console.error('Form validation errors:', newErrors);
      return;
    }

    setLoading(true);
    try {
      // Get selected business ID from localStorage
      const selectedBusinessId = localStorage.getItem("selectedBusinessId");

      // Create payload with business ID and required fields
      const payload = {
        business_id: selectedBusinessId,
        name: partyName.trim(),
        phone_number: phoneNumber.trim() ? (countryCode + phoneNumber.trim()) : null,
        notes: remark.trim() || null,
      };

      // Add address fields separately if address section is shown and has data
      if (showAddress) {
        // Save street address parts
        if (billingAddress.trim()) {
          payload.billing_address = billingAddress.trim();
          payload.shipping_address = sameAsBilling ? billingAddress.trim() : shippingAddress.trim();
        }

        // Save individual fields
        if (city.trim()) {
          payload.city = city.trim();
          payload.ship_city = city.trim();
        }
        if (state.trim()) {
          payload.state = state.trim();
          payload.ship_state = state.trim();
        }
        if (pincode.trim()) {
          payload.pincode = pincode.trim();
          payload.ship_pincode = pincode.trim();
        }
        if (country) {
          payload.country = country;
          payload.ship_country = country;
        }
      }

      // Add Trade Name if entered
      if (tradeName.trim()) {
        payload.trade_name = tradeName.trim();
      }

      // Add PAN Number if entered
      if (panNumber.trim()) {
        payload.pan_number = panNumber.trim().toUpperCase();
      }

      // Add GSTIN/VAT based on selection
      if (taxType === "GSTIN" && gstin.trim()) {
        payload.gstin = gstin.trim();
      } else if (taxType === "VAT" && vat.trim()) {
        payload.vat = vat.trim();
      }

      // Add no_tax flag if selected
      if (taxType === "NO_TAX") {
        payload.no_tax = true;
      }

      // Remove null/undefined/empty fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] === null || payload[key] === undefined || payload[key] === "") {
          delete payload[key];
        }
      });



      const response = await partyAPI.create(payload);

      if (response.success) {
        // Close modal immediately
        onSave(response.data);
        onClose();

        // Show quick success message
        await showSuccessToast("Party created successfully");
      } else {
        throw new Error(response.message || 'Failed to create party');
      }
    } catch (error) {
      console.error('Error creating party:', error);
      // Don't show popup error - just log to console as requested
    } finally {
      setLoading(false);
    }
  }

  const handleTaxIdFetch = async () => {
    if (!gstin) return;
    setTaxIdLoading(true);

    try {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstin || gstin.length !== 15 || !gstinRegex.test(gstin)) {
        showErrorToast("Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).");
        setTaxIdLoading(false);
        return;
      }

      const isVat = taxType === 'VAT';
      const countryIso = isVat ? 'other' : 'IN';

      const response = await taxAPI.validate(countryIso, gstin);

      if (response.success) {
        const fetchedData = response;

        const name = fetchedData.companyName || fetchedData.tradeName || '';
        if (name) setPartyName(name);

        const fetchedTradeName = fetchedData.tradeName || '';
        if (fetchedTradeName) setTradeName(fetchedTradeName);

        if (fetchedData.address || fetchedData.state || fetchedData.city || fetchedData.pincode) {
          setShowAddress(true);
        }

        if (fetchedData.address) setBillingAddress(fetchedData.address);
        if (fetchedData.state) {
          setState(fetchedData.state);
          setStateSearchTerm(fetchedData.state);
        }
        if (fetchedData.city) {
          setCity(fetchedData.city);
          setCitySearchTerm(fetchedData.city);
        }
        if (fetchedData.pincode) {
          setPincode(fetchedData.pincode);
        }
        if (fetchedData.panNumber) {
          setPanNumber(fetchedData.panNumber);
        }
        if (countryIso === 'IN') {
          setCountry("India");
          setCountrySearchTerm("India");
        }

        showSuccessToast(
          fetchedData.note
            ? (isVat ? "Basic VAT info extracted. Please verify." : "Basic GSTIN info extracted. Please verify.")
            : "Party details auto-populated successfully!"
        );

        if (fetchedData.note) {
          setTimeout(() => showInfoToast(fetchedData.note), 1000);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch Tax ID details');
      }
    } catch (error) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (gstin.length !== 15 || !gstinRegex.test(gstin)) {
        showErrorToast("Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).");
      } else {
        showErrorToast(error.message || "Unable to fetch tax details automatically. Please enter the details manually.");
      }
    } finally {
      setTaxIdLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">
            <span>Add New Party</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/20 hover:shadow-lg transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-0">
          {/* Section 1: Tax / GST Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Search size={16} className="text-[#129046]" />
                <span>Tax Information</span>
              </h4>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  <span>Are You GST or VAT Registered?</span>
                </label>
                <div className="flex items-center gap-4">
                  {['GSTIN', 'VAT', 'NO_TAX'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="taxType"
                        value={type}
                        checked={taxType === type}
                        onChange={() => {
                          setTaxType(type);
                          setErrors(prev => ({ ...prev, gstin: "", vat: "" }));
                          if (type === 'NO_TAX') {
                            setGstin("");
                            setVat("");
                          }
                        }}
                        className="w-4 h-4 accent-[#129046] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#129046] transition-colors">
                        {type === 'NO_TAX' ? 'No Tax' : type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {taxType && taxType !== 'NO_TAX' && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {taxType === 'GSTIN' ? 'GSTIN' : 'VAT Number'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex shadow-sm">
                      <input
                        value={taxType === 'GSTIN' ? gstin : vat}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (taxType === 'GSTIN') setGstin(val);
                          else setVat(val);
                        }}
                        className={`block w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none ${errors.gstin || errors.vat
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                          } ${taxType === 'GSTIN' ? 'rounded-r-none' : ''}`}
                        placeholder={taxType === 'GSTIN' ? "e.g. 22AAAAA0000A1Z5" : "Enter VAT number"}
                      />
                      {taxType === 'GSTIN' && (
                        <button
                          type="button"
                          onClick={handleTaxIdFetch}
                          disabled={taxIdLoading}
                          className="flex-shrink-0 px-4 bg-gradient-to-r from-[#129046] to-[#1fbe5a] text-white text-sm font-bold rounded-r-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 border-l border-gray-100"
                        >
                          {taxIdLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Search size={14} />
                              <span>Get Details</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {taxType === 'GSTIN' && errors.gstin && (
                      <p className="text-xs text-red-600 mt-1">{errors.gstin}</p>
                    )}
                    {taxType === 'VAT' && errors.vat && (
                      <p className="text-xs text-red-600 mt-1">{errors.vat}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Party Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users size={16} className="text-[#129046]" />
                <span>Party Information</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Party Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Party Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none ${errors.partyName
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                    }`}
                  placeholder="Enter party name"
                />
                {errors.partyName && <p className="text-xs text-red-600 mt-1">{errors.partyName}</p>}
              </div>

              {/* Trade Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Trade Name
                </label>
                <input
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                  placeholder="Enter trade name"
                />
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  maxLength={taxType === "VAT" ? "999" : "10"}
                  className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none ${errors.panNumber
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                    }`}
                  placeholder="Enter PAN number"
                />
                {errors.panNumber && <p className="text-xs text-red-600 mt-1">{errors.panNumber}</p>}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-2">
                  <div className="relative w-24 flex-shrink-0">
                    <div className="relative">
                      <input
                        ref={phoneCodeInputRef}
                        type="text"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none bg-white pr-8"
                        value={showPhoneCodeDropdown ? phoneCodeSearchTerm : countryCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhoneCodeSearchTerm(val);
                          setCountryCode(val);
                          if (!showPhoneCodeDropdown) setShowPhoneCodeDropdown(true);
                        }}
                        onFocus={() => {
                          setShowPhoneCodeDropdown(true);
                          setPhoneCodeSearchTerm(countryCode);
                        }}
                        onBlur={() => setTimeout(() => setShowPhoneCodeDropdown(false), 200)}
                        placeholder="+91"
                      />
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {showPhoneCodeDropdown && (
                      <div className="absolute z-[3000] w-56 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto left-0 animate-in fade-in zoom-in duration-200">
                        {countryCodes
                          .filter(c =>
                            c.dial_code.includes(phoneCodeSearchTerm) ||
                            c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase())
                          )
                          .map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCountryCode(c.dial_code);
                                setShowPhoneCodeDropdown(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${countryCode === c.dial_code ? "bg-[#129046]/10 text-[#129046]" : "hover:bg-gray-50 text-gray-700"
                                }`}
                            >
                              <span className="font-bold">{c.dial_code}</span>
                              <span className="text-xs text-gray-400 ml-2 truncate">{c.name}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setPhoneNumber(value);
                        }
                      }}
                      className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none ${errors.phoneNumber
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                      placeholder="Enter mobile number"
                    />
                    {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additonal Information
                </label>
                <input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                  placeholder="Enter remark"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Address Information */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <MapPin size={16} className="text-[#129046]" />
                <span>Address Information</span>
              </h4>
            </div>

            <div className="space-y-4">
              {/* Pincode, City, State in one row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Pincode */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pincode / ZIP <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={pincode}
                      onChange={handlePincodeChange}
                      onKeyDown={handlePincodeKeyDown}
                      maxLength="10"
                      className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none ${errors.pincode
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                      placeholder="Enter zip/pincode"
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {errors.pincode ? (
                    <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>
                  ) : (
                    <p className="text-[10px] text-green-600 mt-1 uppercase tracking-tight">
                      <span>Auto-fills city & state</span>
                    </p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={cityInputRef}
                      value={showCityDropdown ? citySearchTerm : city}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCitySearchTerm(val);
                        setCity(val);
                        if (!showCityDropdown) setShowCityDropdown(true);
                        setCityHighlightedIndex(0);
                        setErrors(prev => ({ ...prev, city: '' }));
                      }}
                      onFocus={() => {
                        setShowCityDropdown(true);
                        setCitySearchTerm(city);
                      }}
                      onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                      className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none pr-10 ${errors.city
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                      placeholder={loadingCities ? "Loading..." : "Search city"}
                      disabled={loadingCities}
                    />
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />

                    {showCityDropdown && (
                      <div ref={cityOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {filteredCityOptions.length > 0 ? (
                          filteredCityOptions.map((option, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectCityOption(option.value)}
                              onMouseEnter={() => setCityHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${cityHighlightedIndex === index ? "bg-[#129046] text-white" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                              <span>{option.label}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            {loadingCities ? "Fetching cities..." : "No cities found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={stateInputRef}
                      value={showStateDropdown ? stateSearchTerm : state}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStateSearchTerm(val);
                        setState(val);
                        if (!showStateDropdown) setShowStateDropdown(true);
                        setStateHighlightedIndex(0);
                        setErrors(prev => ({ ...prev, state: '' }));
                      }}
                      onFocus={() => {
                        setShowStateDropdown(true);
                        setStateSearchTerm(state);
                      }}
                      onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                      className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none pr-10 ${errors.state
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                      placeholder={loadingStates ? "Loading..." : "Search state"}
                      disabled={loadingStates}
                    />
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />

                    {showStateDropdown && (
                      <div ref={stateOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {filteredStateOptions.length > 0 ? (
                          filteredStateOptions.map((option, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectStateOption(option.id)}
                              onMouseEnter={() => setStateHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${stateHighlightedIndex === index ? "bg-[#129046] text-white" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                              <span>{option.label}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            {loadingStates ? "Fetching states..." : "No states found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state}</p>}
                </div>
              </div>

              {/* Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={countryInputRef}
                      value={showCountryDropdown ? countrySearchTerm : country}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCountrySearchTerm(val);
                        setCountry(val);
                        if (!showCountryDropdown) setShowCountryDropdown(true);
                        setCountryHighlightedIndex(0);
                        setErrors(prev => ({ ...prev, country: '' }));
                      }}
                      onFocus={() => {
                        setShowCountryDropdown(true);
                        setCountrySearchTerm(country);
                      }}
                      onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                      className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none pr-10 ${errors.country
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                      placeholder={loadingCountries ? "Loading..." : "Search country"}
                      disabled={loadingCountries}
                    />
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />

                    {showCountryDropdown && (
                      <div ref={countryOptionsListRef} className="absolute z-[2500] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {filteredCountryOptions.length > 0 ? (
                          filteredCountryOptions.map((option, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectCountryOption(option.value)}
                              onMouseEnter={() => setCountryHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${countryHighlightedIndex === index ? "bg-[#129046] text-white" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                              <span>{option.label}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            {loadingCountries ? "Fetching countries..." : "No countries found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Billing Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none resize-none ${errors.billingAddress
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                    }`}
                  rows={2}
                  placeholder="Enter complete billing address"
                />
                {errors.billingAddress && <p className="text-xs text-red-600 mt-1">{errors.billingAddress}</p>}
              </div>

              {/* Shipping Address Same as Billing Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="w-4 h-4 accent-[#129046] cursor-pointer"
                />
                <label htmlFor="sameAsBilling" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Shipping address same as billing
                </label>
              </div>

              {/* Shipping Address (Optional if separate) */}
              {!sameAsBilling && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Shipping Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none resize-none ${errors.shippingAddress
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                      }`}
                    rows={2}
                    placeholder="Enter complete shipping address"
                  />
                  {errors.shippingAddress && <p className="text-xs text-red-600 mt-1">{errors.shippingAddress}</p>}
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Fixed buttons at bottom */}
        <div className="flex justify-end gap-3 px-6 py-2 border-t bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-md text-sm font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200"
            disabled={loading}
          >
            <span>{loading ? "Saving..." : "Save Party"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartyModal;
