import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Building,
  Edit3,
  ChevronDown,
  Unlock,
  Upload,
  ArrowLeft,
  Edit2,
  Lock,
  Trash2,
  Settings,
  Search,
  Trash,
} from "lucide-react";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import {
  STATE_OPTIONS,
  getUnitOptions,
  DEFAULT_UNIT_OPTIONS,
} from "../../../utils/dropdownOptions.js";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  getApiConfig,
  partyAPI,
  businessAPI,
  termsConditionsAPI,
  supplierAPI,
  mrnAPI,
} from "../../../utils/api.js";
import {
  showSuccessToast,
  showErrorToast,
  closeModal,
  showErrorModal,
  showConfirmationDialog,
} from "../../../Components/ActionMessageModel.jsx";
import SupplierModal from "../Supplier/AddSupplierPopupModal.jsx";
import TextEditorModal from "../../../Components/TextEditorModal.jsx";
import {
  convertAmount,
  getCurrencySymbol,
  convertToINR,
} from "../../../utils/currency.js";

/* ---------------- Billing Addresses Selection Modal (from Parties.jsx) ---------------- */
function BillingAddressesModal({
  open,
  onClose,
  addresses,
  selectedIndex,
  onSelect,
  onEdit,
  onAdd,
  title = "Select Address",
}) {
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-4 flex items-center justify-between shadow-sm">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {title}
          </h3>
          <button
            onClick={() => {
              console.log("Closing address selection");
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="text-white w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {addresses?.length ? (
            addresses.map((addr, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={index}
                  onClick={() => onSelect(index)}
                  className={`p-3 border rounded cursor-pointer flex items-center gap-3 group transition-all duration-200 ${isSelected
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300 group-hover:border-green-400"
                      }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm ${isSelected ? "text-green-900 font-medium" : "text-gray-700"}`}
                    >
                      {addr.line1}
                    </div>
                    <div className="text-xs text-gray-500">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(index);
                    }}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit Address"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            <div>No addresses</div>
          )}

          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all duration-200 font-medium group"
          >
            <Plus
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Add New Address
          </button>
        </div>

        <div className="p-4 text-right">
          <button onClick={onClose} className="btn-red">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Billing Address Modal (Universal Standardization) ---------------- */
function BillingAddressModal({ open, onClose, billingAddress, onSave }) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const [formData, setFormData] = useState({
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [errors, setErrors] = useState({});

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
        line1: billingAddress?.line1 || "",
        city: billingAddress?.city || "",
        state: billingAddress?.state || "",
        pincode: billingAddress?.pincode || "",
        country: billingAddress?.country || "India",
      });
      setErrors({});
      // fetchAllCountries();
    }
  }, [open, billingAddress]);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/iso",
      );
      const data = await response.json();
      if (!data.error) {
        setAllCountries(
          data.data.map((c) => ({ label: c.name, value: c.name })),
        );
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
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
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/states",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: countryName }),
        },
      );
      const data = await response.json();
      if (!data.error) {
        setStateOptions(
          data.data.states.map((s) => ({ label: s.name, value: s.name })),
        );
      } else {
        setStateOptions([]);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
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
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: countryName, state: stateName }),
        },
      );
      const data = await response.json();
      if (!data.error) {
        setCityOptions(data.data.map((c) => ({ label: c, value: c })));
      } else {
        setCityOptions([]);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = async (value) => {
    setFormData((prev) => ({ ...prev, pincode: value }));
    if (value.length >= 3) {
      try {
        setPincodeLoading(true);
        const response = await businessAPI.getCityByPincode(value);
        if (response.success && response.data) {
          const { city, state, country } = response.data;
          setFormData((prev) => ({
            ...prev,
            city: city || prev.city,
            state: state || prev.state,
            country: country || prev.country,
          }));
        }
      } catch (error) {
        console.error("Error fetching address from pincode:", error);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.pincode) newErrors.pincode = "Pincode / ZIP is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.country) newErrors.country = "Country is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      address_id: formData.id || null,
    });
    onClose();
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
            <h3 className="text-base font-bold text-white">Billing Address</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Row 1: Pincode, City */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pincode / ZIP *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={`w-full px-3 py-1.5 border-2 ${errors?.pincode ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                  placeholder="Enter pincode"
                />
                {errors?.pincode && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                    {errors.pincode}
                  </p>
                )}
                {pincodeLoading && (
                  <div className="absolute right-3 top-2 text-[#129046]">
                    <div className="w-3 h-3 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* City */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                value={dropdowns.city ? citySearch : formData.city || ""}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, city: true }));
                }}
                onFocus={() => {
                  setCitySearch("");
                  setDropdowns((prev) => ({ ...prev, city: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.city ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select city"
              />
              {errors?.city && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.city}
                </p>
              )}
              {dropdowns.city && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {(cityOptions.length > 0
                    ? cityOptions
                    : [{ label: citySearch, value: citySearch }]
                  )
                    .filter((c) =>
                      c.label.toLowerCase().includes(citySearch.toLowerCase()),
                    )
                    .map((city, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            city: city.value,
                          }));
                          setDropdowns((prev) => ({ ...prev, city: false }));
                        }}
                      >
                        {city.label}
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                State *
              </label>
              <input
                type="text"
                value={dropdowns.state ? stateSearch : formData.state || ""}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setStateSearch("");
                  setDropdowns((prev) => ({ ...prev, state: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.state ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select state"
              />
              {errors?.state && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.state}
                </p>
              )}
              {dropdowns.state && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {stateOptions
                    .filter((s) =>
                      s.label.toLowerCase().includes(stateSearch.toLowerCase()),
                    )
                    .map((state, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            state: state.value,
                          }));
                          setDropdowns((prev) => ({ ...prev, state: false }));
                        }}
                      >
                        {state.label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Country *
              </label>
              <input
                type="text"
                value={
                  dropdowns.country ? countrySearch : formData.country || ""
                }
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, country: true }));
                }}
                onFocus={() => {
                  setCountrySearch("");
                  setDropdowns((prev) => ({ ...prev, country: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.country ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select country"
              />
              {errors?.country && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.country}
                </p>
              )}
              {dropdowns.country && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {allCountries
                    .filter((c) =>
                      c.label
                        .toLowerCase()
                        .includes(countrySearch.toLowerCase()),
                    )
                    .map((country, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            country: country.value,
                            state: "",
                            city: "",
                          }));
                          setDropdowns((prev) => ({ ...prev, country: false }));
                        }}
                      >
                        {country.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Street Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Street Address
            </label>
            <textarea
              value={formData.line1}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, line1: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:border-[#129046] focus:outline-none transition-colors"
              placeholder="Enter street address"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-bold hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-xs font-bold shadow-md"
          >
            Save Address
          </button>
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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const [formData, setFormData] = useState({
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [errors, setErrors] = useState({});

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
        line1: address?.line1 || "",
        city: address?.city || "",
        state: address?.state || "",
        pincode: address?.pincode || "",
        country: address?.country || "India",
      });
      setErrors({});
      fetchAllCountries();
    }
  }, [open, address]);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/iso",
      );
      const data = await response.json();
      if (!data.error) {
        setAllCountries(
          data.data.map((c) => ({ label: c.name, value: c.name })),
        );
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
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
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/states",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: countryName }),
        },
      );
      const data = await response.json();
      if (!data.error) {
        setStateOptions(
          data.data.states.map((s) => ({ label: s.name, value: s.name })),
        );
      } else {
        setStateOptions([]);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
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
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: countryName, state: stateName }),
        },
      );
      const data = await response.json();
      if (!data.error) {
        setCityOptions(data.data.map((c) => ({ label: c, value: c })));
      } else {
        setCityOptions([]);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePincodeChange = async (value) => {
    setFormData((prev) => ({ ...prev, pincode: value }));
    if (value.length >= 3) {
      try {
        setPincodeLoading(true);
        const response = await businessAPI.getCityByPincode(value);
        if (response.success && response.data) {
          const { city, state, country } = response.data;
          setFormData((prev) => ({
            ...prev,
            city: city || prev.city,
            state: state || prev.state,
            country: country || prev.country,
          }));
        }
      } catch (error) {
        console.error("Error fetching address from pincode:", error);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.pincode) newErrors.pincode = "Pincode / ZIP is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.country) newErrors.country = "Country is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
    onClose();
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
            <h3 className="text-base font-bold text-white">Shipping Address</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Row 1: Pincode, City */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pincode / ZIP *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={`w-full px-3 py-1.5 border-2 ${errors?.pincode ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                  placeholder="Enter pincode"
                />
                {errors?.pincode && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                    {errors.pincode}
                  </p>
                )}
                {pincodeLoading && (
                  <div className="absolute right-3 top-2 text-[#129046]">
                    <div className="w-3 h-3 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* City */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                value={dropdowns.city ? citySearch : formData.city || ""}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, city: true }));
                }}
                onFocus={() => {
                  setCitySearch("");
                  setDropdowns((prev) => ({ ...prev, city: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.city ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select city"
              />
              {errors?.city && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.city}
                </p>
              )}
              {dropdowns.city && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {(cityOptions.length > 0
                    ? cityOptions
                    : [{ label: citySearch, value: citySearch }]
                  )
                    .filter((c) =>
                      c.label.toLowerCase().includes(citySearch.toLowerCase()),
                    )
                    .map((city, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            city: city.value,
                          }));
                          setDropdowns((prev) => ({ ...prev, city: false }));
                        }}
                      >
                        {city.label}
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                State *
              </label>
              <input
                type="text"
                value={dropdowns.state ? stateSearch : formData.state || ""}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, state: true }));
                }}
                onFocus={() => {
                  setStateSearch("");
                  setDropdowns((prev) => ({ ...prev, state: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.state ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select state"
              />
              {errors?.state && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.state}
                </p>
              )}
              {dropdowns.state && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {stateOptions
                    .filter((s) =>
                      s.label.toLowerCase().includes(stateSearch.toLowerCase()),
                    )
                    .map((state, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            state: state.value,
                          }));
                          setDropdowns((prev) => ({ ...prev, state: false }));
                        }}
                      >
                        {state.label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Country *
              </label>
              <input
                type="text"
                value={
                  dropdowns.country ? countrySearch : formData.country || ""
                }
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setDropdowns((prev) => ({ ...prev, country: true }));
                }}
                onFocus={() => {
                  setCountrySearch("");
                  setDropdowns((prev) => ({ ...prev, country: true }));
                }}
                className={`w-full px-3 py-1.5 border-2 ${errors?.country ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:border-[#129046] focus:outline-none`}
                placeholder="Select country"
              />
              {errors?.country && (
                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">
                  {errors.country}
                </p>
              )}
              {dropdowns.country && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {allCountries
                    .filter((c) =>
                      c.label
                        .toLowerCase()
                        .includes(countrySearch.toLowerCase()),
                    )
                    .map((country, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-green-50"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            country: country.value,
                            state: "",
                            city: "",
                          }));
                          setDropdowns((prev) => ({ ...prev, country: false }));
                        }}
                      >
                        {country.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Street Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Street Address
            </label>
            <textarea
              value={formData.line1}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, line1: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:border-[#129046] focus:outline-none transition-colors"
              placeholder="Enter street address"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-bold hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-xs font-bold shadow-md"
          >
            Save Address
          </button>
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
  customUnits = [],
  currency = "INR",
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState(new Set()); // set of product keys currently checked
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
    if (!open) return;

    // Lock background scroll
    document.body.classList.add("overflow-hidden");

    // Initialize buffer from currentLines
    /* 
    if (Array.isArray(currentLines) && currentLines.length > 0) {
      const normalized = currentLines.map((ln) => ({
        id: ln.id || `tmp-${Date.now()}-${Math.random()}`,
        productId: ln.productId || ln.id || null,
        description: ln.description || ln.name || "",
        subtitle: ln.subtitle || "",
        hsn: ln.hsn || ln.code || "",
        qty: ln.qty ?? "",
        unit: ln.unit || "PCS",
        price: Number(ln.price ?? ln.salesPrice ?? 0),
        image_url: ln.image_url || "",
      }));

      // setBufferLines(normalized);

      const keys = new Set(
        normalized.map((n) => n.productId ?? n.hsn ?? n.description),
      );
      setSelectedKeys(keys);
    } else {
      // setBufferLines([]);
      setSelectedKeys(new Set());
    }
    */
    setSelectedKeys(new Set());

    setPage(1);

    // Cleanup
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, currentLines]);

  function updateProduct(productId, patch) {
    if (!productId) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)),
    );
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
  const allSelected =
    pageItemsArr.length > 0 &&
    pageItemsArr.every((p) => selectedKeys.has(keyFor(p)));
  const someSelected = pageItemsArr.some((p) => selectedKeys.has(keyFor(p)));

  function toggleSelectAll() {
    if (allSelected) {
      // Deselect all on current page
      setSelectedKeys((prev) => {
        const copy = new Set(prev);
        pageItemsArr.forEach((p) => copy.delete(keyFor(p)));
        return copy;
      });
    } else {
      // Select all on current page
      setSelectedKeys((prev) => {
        const copy = new Set(prev);
        pageItemsArr.forEach((p) => copy.add(keyFor(p)));
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

  // Directly add selected products to the document
  function handleAddSelected() {
    const keys = Array.from(selectedKeys);

    if (keys.length === 0) {
      showErrorToast("Select at least one product before adding");
      return;
    }

    const selectedProducts = products.filter((p) =>
      selectedKeys.has(keyFor(p))
    );

    const normalized = selectedProducts.map((product) => ({
      id: `tmp-${Date.now()}-${Math.random()}`,
      productId: product.id,
      product_id: product.id,
      description: product.name || "",
      image_url: product.image_url || "",
      pack_size: product.pack_size || 0,
      hsn: product.hsn || "",
      // product set
      qty: Number(product.qty || 0),
      deliveredQty: Number(product.deliveredQty || 0),

      unit: product.stockUnit || "PCS",
      price: Number(product.salesPrice || 0),
      comments: product.comment || product.comments || "",
      quantity: Number(product.qty || 1),
      unit_price: Number(product.salesPrice || 0),
      amount:
        Number(product.qty || 1) * Number(product.salesPrice || 0),
    }));

    onDone(normalized);
    onClose();
  }

  // OPEN create form (blank) - now directly adds an empty line to the document
  function openCreateForm() {
    const newLine = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      productId: null,
      description: "",
      subtitle: "",
      hsn: "",
      code: "",
      qty: 0,
      deliveredQty: 0,

      unit: "PCS",
      price: 0,
      discountPct: 0,

      overrideAmount: null,
      image_url: "",
      stockQuantity: 0,
      stockUnit: "PCS",
      isNewEntry: true, // Mark as new entry for styling
    };

    onDone([newLine]);
    onClose();
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

  // function removeFromBuffer(id) {
  //   setBufferLines((b) => b.filter((x) => x.id !== id));
  // }
  // function updateBufferLine(id, patch) {
  //   setBufferLines((prev) =>
  //     prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  //   );
  // }

  // Handle image upload for buffer lines
  async function handleImageUploadBuffer(e, id) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      // updateBufferLine(id, { image_url: event.target.result }); // temporary data URL
    };
    reader.readAsDataURL(file);

    // Upload to server in background
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(
        `${getApiConfig().backendURL}/api/upload-direct`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await response.json();

      if (data.success && data.image_url) {
        // updateBufferLine(id, { image_url: data.image_url }); // replace with server URL (don't prepend backend URL here)
      } else {
        console.warn("Upload response missing image_url:", data);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Keep the preview data URL if upload fails
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4"
      style={{ touchAction: "none" }}
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-4 py-4 flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold text-white">
            Select Products
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
        {true && (
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
                className="px-4 py-2.5 bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] text-white rounded-lg text-sm font-medium hover:from-[#0d6b35]/90 hover:to-[#7a8f3d]/90 transition-all duration-200 whitespace-nowrap"
              >
                Add Selected <span translate="no">({selectedKeys.size})</span>
              </button>
            </div>
          </div>
        )}


        {/* Scrollable content area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* STEP: BROWSE */}
          {true && (
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
                                if (el)
                                  el.indeterminate =
                                    someSelected && !allSelected;
                              }}
                              onChange={toggleSelectAll}
                              className="w-5 h-5 cursor-pointer accent-[#129046]"
                            />
                            <span className="ml-1">All</span>
                          </div>
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                          IMAGE
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[250px]">
                          ITEM NAME
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          PACK SIZE
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          PRICE ({getCurrencySymbol(currency)})
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          UNIT
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          ORDER QTY
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          DELIVERED QTY
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          COMMENTS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!q.trim() ? (
                        <tr>
                          <td colSpan="10" className="px-4 py-12 text-center text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-lg font-medium">Search for products to add</p>
                            <p className="text-sm">Type a product name or code in the search bar above</p>
                          </td>
                        </tr>
                      ) : pageItemsArr.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                            No products for "{q}"
                          </td>
                        </tr>
                      ) : (
                        pageItemsArr.map((p) => {
                          const key = keyFor(p);
                          const checked = selectedKeys.has(key);

                          return (
                            <tr key={key} className="border-t hover:bg-gray-50">
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelect(p)}
                                  className="w-5 h-5"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <div className="w-16 h-16 mx-auto bg-gray-100 border">
                                  {p.image_url ? (
                                    <img
                                      src={`${getApiConfig().backendURL}${p.image_url}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-gray-400">
                                      No Image
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-2 py-2">
                                <input
                                  value={p.name || ""}
                                  onChange={(e) =>
                                    updateProduct(p.id, { name: e.target.value })
                                  }
                                  className="w-full border px-2 py-1"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  value={p.pack_size || 0}
                                  onChange={(e) =>
                                    updateProduct(p.id, {
                                      pack_size: Number(e.target.value),
                                    })
                                  }
                                  className="w-24 border px-2 py-1 text-center"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <input
                                  type="text"
                                  value={
                                    focusedInput?.id === p.id &&
                                      focusedInput?.field === "price"
                                      ? focusedInput.val
                                      : `${getCurrencySymbol(currency)}${convertAmount(p.salesPrice, currency).toFixed(2)}`
                                  }
                                  onFocus={() => {
                                    const currentVal = `${getCurrencySymbol(currency)}${convertAmount(p.salesPrice, currency).toFixed(2)}`;
                                    setFocusedInput({
                                      id: p.id,
                                      field: "price",
                                      val: currentVal,
                                    });
                                  }}
                                  onChange={(e) => {
                                    const symbol = getCurrencySymbol(currency);
                                    let val = e.target.value;

                                    // Extract numeric part to validate
                                    let numericPart = val;
                                    if (val.startsWith(symbol)) {
                                      numericPart = val.substring(symbol.length);
                                    }

                                    // Only allow numbers and one decimal point
                                    if (
                                      !/^\d*\.?\d*$/.test(numericPart) &&
                                      numericPart !== ""
                                    ) {
                                      return;
                                    }

                                    // Update local focused state
                                    setFocusedInput({
                                      id: p.id,
                                      field: "price",
                                      val,
                                    });

                                    // Process for underlying data
                                    const cleanVal = numericPart.replace(
                                      /[^0-9.]/g,
                                      "",
                                    );
                                    const parts = cleanVal.split(".");
                                    const finalVal =
                                      parts[0] +
                                      (parts.length > 1 ? "." + parts[1] : "");
                                    const inrValue =
                                      finalVal === ""
                                        ? 0
                                        : convertToINR(
                                          Number(finalVal),
                                          currency,
                                        );
                                    updateProduct(p.id, {
                                      salesPrice: inrValue,
                                    });
                                  }}
                                  onBlur={() => setFocusedInput(null)}
                                  className="w-32 border px-2 py-1 text-center"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <CommonDropdown
                                  options={getUnitOptions(customUnits)}
                                  value={p.stockUnit || "PCS"}
                                  valueBy="id"
                                  onChange={(opt) =>
                                    updateProduct(p.id, { stockUnit: opt?.id })
                                  }
                                  className="w-20"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  value={p.qty || 1}
                                  onChange={(e) =>
                                    updateProduct(p.id, {
                                      qty: Number(e.target.value),
                                    })
                                  }
                                  className="w-20 border px-2 py-1 text-center"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  value={p.deliveredQty || 0}
                                  onChange={(e) =>
                                    updateProduct(p.id, {
                                      deliveredQty: Number(e.target.value),
                                    })
                                  }
                                  className="w-20 border px-2 py-1 text-center"
                                />
                              </td>

                              <td className="px-2 py-2 text-center">
                                <input
                                  value={p.comments || ""}
                                  onChange={(e) =>
                                    updateProduct(p.id, {
                                      comments: e.target.value,
                                    })
                                  }
                                  className="w-32 border px-2 py-1"
                                />
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
        </div>

        {/* Fixed pagination controls at bottom of modal */}
        {true && (
          <div className="px-6 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
              <div className="text-yellow-900 font-medium hidden sm:block">
                Showing <span translate="no">{(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, filtered.length)}</span> of
                <span translate="no"> {filtered.length}</span>
              </div>
              <div className="text-yellow-900 font-medium sm:hidden">
                <span translate="no">{Math.min(page * pageSize, filtered.length)} of
                {filtered.length}</span>
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
                <span className="px-2 py-1 sm:px-3 sm:py-1 bg-yellow-100 border border-yellow-200 rounded text-yellow-900 font-medium text-xs sm:text-sm">
                  <span translate="no">{page} / {totalPages}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

/* ---------- Main MRNCreateForm (Goods Receipt Note Form) ---------- */
export default function MRNCreateForm({
  onSave,
  onBack,
  initialData = {},
  products: initialProducts = [],
  formTitle = "Create MRN",
  saveLabel = "Save",
  cancelLabel = "Cancel",
  billToLabel = "Supplier",
  showBankDetails = false,
  currency = "INR",
}) {
  console.log("INITIALDATA", initialData);
  const todayISO = new Date().toISOString().slice(0, 10);

  const formType = "mrn";

  // Error state for form validation
  const [mrnNoError, setMRNNoError] = useState("");

  // MRN Number State
  const [mrnNo, setMRNNo] = useState(initialData?.mrn_number || "");
  
  // Sync state when initialData arrives or changes (important for edit mode)
  useEffect(() => {
    if (initialData) {
      if (initialData.mrn_number) setMRNNo(initialData.mrn_number);
      if (initialData.advice_no) setAdviceNoteNumber(initialData.advice_no);
      if (initialData.partyName || initialData.party_name) setParty(initialData.partyName || initialData.party_name);
      if (initialData.date || initialData.mrn_date) setInvoiceDate((initialData.date || initialData.mrn_date).split('T')[0]);
      if (initialData.purchase_order_number || initialData.purchaseOrderNumber) setPurchaseOrderNumber(initialData.purchase_order_number || initialData.purchaseOrderNumber);
      if (initialData.delivery_location || initialData.deliveryLocation) setDeliveryLocation(initialData.delivery_location || initialData.deliveryLocation);
      if (initialData.cost_center || initialData.costCenter) setCostCenter(initialData.cost_center || initialData.costCenter);
      if (initialData.remark) setRemark(initialData.remark);
      if (initialData.notes) setNotes(initialData.notes);
      if (initialData.products) setProducts(initialData.products);
    }
  }, [initialData]);

  // Auto-generate MRN Number
  useEffect(() => {
    const fetchMRNNumber = async () => {
      try {
        const businessId = localStorage.getItem("selectedBusinessId");
        if (!businessId) return;

        const res = await mrnAPI.getNextNumber(businessId);
        console.log("MRN API Response:", res);

        //  Flexible response handling (main fix)
        const number =
          res?.data?.mrn_number ||
          res?.data?.number ||
          res?.mrn_number ||
          res?.number ||
          res;

        //  Only set when creating new MRN
        if (number && !initialData?.mrn_number) {
          setMRNNo(number);
          return;
        }

        // ❗ fallback ONLY if API fails
        const year = new Date().getFullYear();
        const fy = `${year}-${(year + 1).toString().slice(-2)}`;
        setMRNNo(`MRN-${fy}-0001`);
      } catch (err) {
        console.error("MRN next number error:", err);

        // ❗ fallback on error
        const year = new Date().getFullYear();
        const fy = `${year}-${(year + 1).toString().slice(-2)}`;
        setMRNNo(`MRN-${fy}-0001`);
      }
    };

    // Only run for NEW MRN (not edit)
    if (!initialData?.mrn_number && !initialData?.dbId && !initialData?.id) {
      fetchMRNNumber();
    }
  }, [initialData?.mrn_number, initialData?.dbId, initialData?.id]);

  const [party, setParty] = useState(
    initialData.partyName || initialData.party_name || "",
  );

  const [invoiceDate, setInvoiceDate] = useState(() => {
    // Get the date value and format it properly for date input (yyyy-MM-dd)
    const rawDate =
      initialData.date ||
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
      if (rawDate.includes("T")) {
        return rawDate.split("T")[0];
      }
      // Handle other formats that might need formatting
      try {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("Invalid date format:", rawDate);
      }
    }

    return todayISO;
  });
  const [paymentTerms, setPaymentTerms] = useState(
    initialData.meta?.paymentTerms ?? 30,
  );
  const [notes, setNotes] = useState(
    initialData.notes || initialData.meta?.notes || "",
  );
  const [poAgreementNumber, setPoAgreementNumber] = useState(
    initialData.po_agreement_number ||
    initialData.meta?.poAgreementNumber ||
    "",
  );
  const [remark, setRemark] = useState(
    initialData.remark || initialData.meta?.remark || "",
  );
  const [AdviceNoteNumber, setAdviceNoteNumber] = useState(
    initialData.advice_no ||
    initialData.advice_note_number ||
    initialData.meta?.adviceNoteNumber ||
    ""
  );
  console.log('### Adivce No', AdviceNoteNumber)
  // MRN-specific fields
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState(
    initialData.purchase_order_number ||
    initialData.purchaseOrderNumber ||
    initialData.meta?.purchaseOrderNumber ||
    "",
  );
  const [deliveryLocation, setDeliveryLocation] = useState(
    initialData.delivery_location ||
    initialData.deliveryLocation ||
    initialData.meta?.deliveryLocation ||
    "",
  );
  const [costCenter, setCostCenter] = useState(
    initialData.cost_center ||
    initialData.costCenter ||
    initialData.meta?.costCenter ||
    "",
  );
  const [termsText, setTermsText] = useState(
    initialData.meta?.terms || initialData.terms || "",
  );
  const [charges, setCharges] = useState(
    initialData.meta?.charges || initialData.charges || [],
  );
  // Dynamic products state
  const [products, setProducts] = useState(initialProducts);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Parties state for dropdown
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  // Address modal states (from Parties.jsx)
  const [showBillingAddressModal, setShowBillingAddressModal] = useState(false);
  const [showShippingAddressModal, setShowShippingAddressModal] =
    useState(false);
  const [showBillingAddressesModal, setShowBillingAddressesModal] =
    useState(false);
  const [showShippingAddressesModal, setShowShippingAddressesModal] =
    useState(false);
  const [editingBillingIndex, setEditingBillingIndex] = useState(null);
  const [editingShippingIndex, setEditingShippingIndex] = useState(null);

  const [partyAddresses, setPartyAddresses] = useState({
    billing: [],
    shipping: [],
  });
  const [selectedBillingAddressIndex, setSelectedBillingAddressIndex] =
    useState(0);
  const [selectedShippingAddressIndex, setSelectedShippingAddressIndex] =
    useState(0);


  // Determine if this is an editing form
  const isEditing = !!initialData.mrn_number;

  const [focusedInput, setFocusedInput] = useState(null); // { id, field, val }

  const [sections, setSections] = useState([
    {
      id: 1,
      heading: initialData.meta?.termsHeading || "Terms & Conditions",
      content: initialData.meta?.terms || "1. ",
      is_locked: false,
    },
  ]);

  // Text Editor Modal State
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);

  // Sync sections from initialData when they change (e.g., after pre-fetch in BookInvoice)
  useEffect(() => {
    if (
      initialData?.meta?.terms_sections &&
      Array.isArray(initialData.meta.terms_sections) &&
      initialData.meta.terms_sections.length > 0
    ) {
      setSections(initialData.meta.terms_sections);
    } else if (
      initialData?.terms &&
      Array.isArray(initialData.terms) &&
      initialData.terms.length > 0
    ) {
      setSections(initialData.terms);
    } else if (initialData?.meta?.terms) {
      setSections([
        {
          id: 1,
          heading: initialData.meta?.termsHeading || "Terms & Conditions",
          content: initialData.meta.terms,
          is_locked: false,
        },
      ]);
    }
  }, [initialData?.meta?.terms_sections, initialData?.meta?.terms, initialData?.terms]);

  // Fetch terms sections from database when editing existing document
  useEffect(() => {
    const fetchLockedTerms = async () => {
      try {
        const businessId = localStorage.getItem("selectedBusinessId");
        console.log("######## business ", businessId);
        const lockedResponse =
          await termsConditionsAPI.getLockedTerms(businessId);
        console.log("######## lockedResponse ", lockedResponse);
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
            is_template: true, // Mark as template to prevent overwriting original on Save
          }));
        }
      } catch (error) {
        console.error("Error fetching global locked terms:", error);
      }
      return [];
    };

    const fetchTermsSections = async () => {
      const documentId = initialData.dbId || initialData.id;
      const docType = formType;

      try {
        let response = null;

        // Only fetch document-specific terms if document exists
        if (documentId) {
          response = await termsConditionsAPI.getByQuotationId(documentId);
        }

        let sectionsToSet = [];

        // If document-specific terms exist, use them
        if (response?.success && response?.data && response.data.length > 0) {
          sectionsToSet = response.data.map((term, index) => ({
            id: term.id || Date.now() + index,
            heading: term.heading,
            content: term.content,
            is_locked: term.is_locked === 1 || term.is_locked === true,
          }));
        } else {
          // If no document-specific terms, fetch and use locked global terms
          const lockedTerms = await fetchLockedTerms();
          if (lockedTerms && lockedTerms.length > 0) {
            sectionsToSet = lockedTerms;
          } else {
            // If no locked terms either, use default empty section
            sectionsToSet = [
              {
                id: 1,
                heading: "Terms & Conditions",
                content: "1.",
                is_locked: false,
              },
            ];
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
        setSections([
          {
            id: 1,
            heading: "Terms & Conditions",
            content: "1.",
            is_locked: false,
          },
        ]);
      }
    };

    // Only fetch if initialData doesn't already contain terms
    const hasExistingTerms =
      initialData?.meta?.terms_sections?.length > 0 ||
      initialData?.meta?.terms ||
      (initialData?.terms && initialData.terms.length > 0);

    if (!hasExistingTerms) {
      fetchTermsSections();
    }
  }, [initialData]);

  const handleToggleLock = async (sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    // If it's a real database record (not a high number Date.now() from UI)
    if (section.id && section.id < 1000000000) {
      try {
        const res = await termsConditionsAPI.lockSection(section.id);
        if (res.success) {
          // Toggle local state to match DB action
          const newStatus = res.action === "locked";
          setSections((prev) =>
            prev.map((s) =>
              s.id === sectionId ? { ...s, is_locked: newStatus } : s,
            ),
          );
        }
      } catch (error) {
        console.error("Error toggling lock dynamically:", error);
        // Fallback to local toggle if API fails
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, is_locked: !s.is_locked } : s,
          ),
        );
      }
    } else {
      // For purely new unsaved sections, just toggle locally
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, is_locked: !s.is_locked } : s,
        ),
      );
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
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Separate billing and shipping addresses
            const billingAddrs = result.data.filter(
              (addr) => addr.address_type === "billing",
            );
            const shippingAddrs = result.data.filter(
              (addr) => addr.address_type === "shipping",
            );

            setPartyAddresses({
              billing: billingAddrs,
              shipping: shippingAddrs,
            });

            // Find matching billing index
            if (billingAddrs.length > 0) {
              const targetAddressId =
                initialData.bill_to_address_id || selectedParty.bill_to_id;
              const currentLine1 = selectedPartyDetails?.billing_address || "";
              const currentPincode = selectedPartyDetails?.pincode || "";

              const idx = billingAddrs.findIndex(
                (a) =>
                  a.id === targetAddressId ||
                  (a.line1?.trim() === currentLine1.trim() &&
                    a.pincode?.toString().trim() ===
                    currentPincode.toString().trim()),
              );

              if (idx !== -1) {
                setSelectedBillingAddressIndex(idx);
                // Also sync selectedPartyDetails with this specific address
                const addr = billingAddrs[idx];
                setSelectedPartyDetails((prev) => ({
                  ...prev,
                  billing_address: addr.line1,
                  city: addr.city,
                  state: addr.state,
                  pincode: addr.pincode,
                  country: addr.country || "India",
                }));
              }
            }

            // Find matching shipping index
            if (shippingAddrs.length > 0 && selectedPartyDetails) {
              const currentShipLine1 =
                selectedPartyDetails.shipping_address || "";
              const currentShipPincode =
                selectedPartyDetails.ship_pincode || "";

              const idx = shippingAddrs.findIndex(
                (a) =>
                  a.id === selectedParty.ship_to_id ||
                  (a.line1?.trim() === currentShipLine1.trim() &&
                    a.pincode?.toString().trim() ===
                    currentShipPincode.toString().trim()),
              );
              if (idx !== -1) setSelectedShippingAddressIndex(idx);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching party addresses:", error);
      }
    };

    fetchPartyAddresses();
  }, [selectedParty]); // Removed selectedPartyDetails from dependency to avoid infinite loop

  // Track selected business ID
  const [currentBusinessId, setCurrentBusinessId] = useState(
    localStorage.getItem("selectedBusinessId"),
  );

  // Separate useEffect to set selected bank index after bank accounts are loaded

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
              qty: product.qty ?? 0,
              deliveredQty: product.deliveredQty ?? 0,
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
          const result = await supplierAPI.getAll(selectedBusinessId);

          if (result.success && result.data) {
            setParties(result.data);
          } else {
            setParties([]);
          }
        } else {
          setParties([]);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        setParties([]);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchParties();
  }, []); // Note: This will refetch when selectedBusinessId changes if we add it to deps, but since it's from localStorage, we need a different approach

  // Listen for business changes and update state
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {
        setCurrentBusinessId(newBusinessId);

        // Refetch suppliers for the new business
        if (newBusinessId) {
          supplierAPI
            .getAll(newBusinessId)
            .then((result) => {
              if (result.success && result.data) {
                setParties(result.data);
              } else {
                setParties([]);
              }
            })
            .catch((error) => {
              console.error("Error refetching suppliers:", error);
              setParties([]);
            });
        } else {
          setParties([]);
        }
      }
    };

    // Listen for storage changes (when business is changed in another tab/window)
    window.addEventListener("storage", handleBusinessChange);

    // Also listen for a custom event that can be dispatched when business changes
    window.addEventListener("businessChanged", handleBusinessChange);

    return () => {
      window.removeEventListener("storage", handleBusinessChange);
      window.removeEventListener("businessChanged", handleBusinessChange);
    };
  }, [currentBusinessId]);

  const [showNotes, setShowNotes] = useState(
    Boolean(
      initialData.meta?.notes ||
      initialData.notes ||
      initialData.remark ||
      initialData.meta?.remark,
    ),
  );
  const [showTerms, setShowTerms] = useState(
    Boolean(initialData.meta?.terms || initialData.terms),
  );

  const [lines, setLines] = useState(() => {
    const lineItems =
      initialData.products || [];

    if (lineItems && lineItems.length > 0) {
      return lineItems.map((ln) => {
        const discount = ln.discountPct ?? ln.discount_pct ?? 0;

        return {
          ...ln,
          id: ln.id || Date.now() + Math.random(),
          description: ln.description || ln.name || "",
          discountPct: discount,
          deliveredQty: ln.deliveredQty ?? ln.delivered_qty ?? 0,
          pack_size: ln.pack_size ?? ln.pack_size ?? 0,
          comments: ln.comments ?? ln.comment ?? "",
        };
      });
    }
    return [];
  });

  const [lineErrors, setLineErrors] = useState({});

  // Auto-select party when editing existing document OR when pre-filled data is provided for a new document
  useEffect(() => {
    const targetPartyName = initialData.partyName || initialData.party_name;
    const targetPartyId = initialData.party_id;

    if (!targetPartyName && !targetPartyId) return;

    const businessId = localStorage.getItem("selectedBusinessId");

    // Try to find in already-loaded vendor list first
    const existingParty = parties.find(
      (p) =>
        (targetPartyId && String(p.id) === String(targetPartyId)) ||
        (targetPartyName &&
          p.party_name?.toLowerCase() === targetPartyName.toLowerCase()),
    );

    if (
      existingParty &&
      (!selectedParty || String(selectedParty.id) !== String(existingParty.id))
    ) {
      console.log(" Found party in vendor list:", existingParty);
      setSelectedParty(existingParty);
      setParty(existingParty.party_name);

      partyAPI
        .getById(existingParty.id, businessId)
        .then((result) => {
          if (result.success && result.data) {
            console.log(" Fetched full party details:", result.data);
            setSelectedPartyDetails(result.data);
            // Address index selection is now handled by fetchPartyAddresses
            // which matches against initialData.bill_to_address_id
          } else {
            setSelectedPartyDetails(existingParty);
          }
        })
        .catch(() => setSelectedPartyDetails(existingParty));
    } else if (!existingParty && targetPartyId && !selectedParty) {
      // Party not in vendor list (different party_type) — fetch directly by ID
      console.log(" Party not in vendor list, fetching by ID:", targetPartyId);
      partyAPI
        .getById(targetPartyId, businessId)
        .then((result) => {
          if (result.success && result.data) {
            console.log(" Fetched party by ID:", result.data);
            const p = result.data;
            setSelectedParty(p);
            setParty(p.party_name || targetPartyName || "");
            setSelectedPartyDetails(p);
          } else if (targetPartyName) {
            console.warn(
              " Failed to fetch party, using name only:",
              targetPartyName,
            );
            // At minimum, keep the name populated
            setParty(targetPartyName);
          }
        })
        .catch((err) => {
          console.error(" Error fetching party by ID:", err);
          if (targetPartyName) setParty(targetPartyName);
        });
    } else if (!existingParty && targetPartyName && !selectedParty) {
      // No ID, just keep the name
      console.log(" No party ID, using name only:", targetPartyName);
      setParty(targetPartyName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parties.length,
    initialData.partyName,
    initialData.party_name,
    initialData.party_id,
  ]);

  // submitting state to prevent double submits
  const [submitting, setSubmitting] = useState(false);

  // Update fields when initialData changes (for edit mode)
  useEffect(() => {
    const newPoNumber =
      initialData.po_agreement_number ||
      initialData.poAgreementNumber ||
      initialData.meta?.po_agreement_number ||
      initialData.meta?.poAgreementNumber ||
      "";
    const newRemark = initialData.remark || initialData.meta?.remark || "";
    const newNotes = initialData.notes || initialData.meta?.notes || "";
    const newCharges = initialData.charges || initialData.meta?.charges || [];
    const newDiscountAfterTaxPct =
      initialData.discountAfterTaxPct ||
      initialData.meta?.discountAfterTaxPct ||
      0;
    // MRN-specific fields
    const newPurchaseOrderNumber =
      initialData.purchase_order_number ||
      initialData.purchaseOrderNumber ||
      initialData.meta?.purchaseOrderNumber ||
      "";
    const newDeliveryLocation =
      initialData.delivery_location ||
      initialData.deliveryLocation ||
      initialData.meta?.deliveryLocation ||
      "";
    const newCostCenter =
      initialData.cost_center ||
      initialData.costCenter ||
      initialData.meta?.costCenter ||
      "";
    const newMRNNumber =
      initialData.mrn_number ||
      initialData.mrnNumber ||
      initialData.invoiceNo ||
      "";
    console.log('initinline', initialData)

    setPoAgreementNumber(newPoNumber);
    setRemark(newRemark);
    setNotes(newNotes);
    setCharges(newCharges);
    setPurchaseOrderNumber(newPurchaseOrderNumber);
    setDeliveryLocation(newDeliveryLocation);
    setCostCenter(newCostCenter);
    // setCommit()
    if (newMRNNumber) setMRNNo(newMRNNumber);
  }, [
    initialData.poAgreementNumber,
    initialData.po_agreement_number,
    initialData.meta?.poAgreementNumber,
    initialData.meta?.po_agreement_number,
    initialData.remark,
    initialData.meta?.remark,
    initialData.notes,
    initialData.meta?.notes,
    initialData.charges,
    initialData.meta?.charges,
    initialData.purchase_order_number,
    initialData.purchaseOrderNumber,
    initialData.meta?.purchaseOrderNumber,
    initialData.delivery_location,
    initialData.deliveryLocation,
    initialData.meta?.deliveryLocation,
    initialData.cost_center,
    initialData.costCenter,
    initialData.meta?.costCenter,
    initialData.mrn_number,
    initialData.mrnNumber,
    initialData.invoiceNo,
  ]);

  // Fetch next MRN number when form loads for new documents
  useEffect(() => {
    const fetchNextDocumentNumber = async () => {
      // Only fetch for new documents (no initialData.id)
      if (initialData.id) {
        return;
      }

      try {
        const selectedBusinessId = localStorage.getItem("selectedBusinessId");

        if (!selectedBusinessId) {
          console.warn("No business ID found");
          // Set default number if no business ID
          const year = new Date().getFullYear();
          const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
          const defaultNumber = `MRN-${financialYear}-0001`;
          setMRNNo(defaultNumber);
          return;
        }

        const res = await mrnAPI.getNextNumber(selectedBusinessId);
        if (res?.success) {
          const number = res?.data?.mrn_number || res?.data?.number || res?.data;
          if (number) {
            setMRNNo(number);
          }
        } else {
          const year = new Date().getFullYear();
          const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
          setMRNNo(`MRN-${financialYear}-0001`);
        }
      } catch (error) {
        console.error("❌ Error fetching next document number:", error);
      }
    };

    fetchNextDocumentNumber();
  }, [initialData.id]);

  const lineTotals = useMemo(
    () =>
      lines.map((l) => {
        const qty = Number(l.qty || 0);
        const price = Number(l.price || 0);
        const amt = qty * price;
        const discountPct = Number(l.discountPct || 0);
        const discountValue = (amt * discountPct) / 100;
        const taxable = Math.max(0, amt - discountValue);
        const total = taxable;
        return {
          ...l,
          amt,
          discountValue,
          taxable,
          total,
        };
      }),
    [lines],
  );

  const subtotal = lineTotals.reduce(
    (s, l) => s + l.taxable,
    0,
  );
  const chargesTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalAmount = subtotal + chargesTotal;

  function updateLine(id, patch) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

    // Clear error for the field being updated
    if (Object.keys(patch).length > 0) {
      const updatedField = Object.keys(patch)[0];
      setLineErrors((prev) => {
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
    formData.append("image", file);
    console.log("Image uploaded:", file);
    console.log("Image data:", formData);
    try {
      const response = await fetch(`${getApiConfig().backendURL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        updateLine(id, { image_url: data.image_url });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  }
  async function removeLine(id) {
    const isConfirmed = await showConfirmationDialog({
      title: "Remove item?",
      text: "Are you sure you want to remove this item from the list?",
      icon: "warning",
      confirmButtonText: "Yes, remove it",
    });
    if (!isConfirmed) return;
    setLines((prev) => prev.filter((x) => x.id !== id));
  }
  function addEmptyLine() {
    setLines((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        description: "",
        subtitle: "",
        hsn: "",
        qty: "",
        deliveredQty: 0,
        unit: "PCS",
        price: 0,
        discountPct: 0,
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

    const normalized = newLines.map((ln) => ({
      ...ln,
      id: ln.id || `imp-${Date.now()}-${Math.random()}`,
      productId: ln.productId || ln.productId || null,
      unit: ln.unit || "PCS",
      subtitle: ln.subtitle || "",
      discountPct: ln.discountPct || 0,
      overrideAmount: ln.overrideAmount != null ? ln.overrideAmount : null,
      qty: ln.qty ?? "",
      deliveredQty: ln.deliveredQty ?? 0,
      price: Number(ln.price ?? 0),
      description: ln.description ?? ln.name ?? "",
      hsn: ln.hsn ?? ln.code ?? "",
      image_url: ln.image_url || "",
    }));

    // Simply append new lines (no merging to allow duplicates)
    setLines((prev) => [...prev, ...normalized]);

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
      title: "Remove bank account?",
      text: "Are you sure you want to remove this bank account?",
      icon: "warning",
      confirmButtonText: "Yes, remove it",
    });

    if (!isConfirmed) return;

    try {
      const businessId = localStorage.getItem("selectedBusinessId");
      const response = await fetch(
        `${getApiConfig().backendURL}/api/bank-details/${bankToDelete.id}?business_id=${businessId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        setBankAccounts((prev) => prev.filter((_, i) => i !== idx));
        if (selectedBankIndex === idx) {
          setSelectedBankIndex(bankAccounts.length > 1 ? 0 : -1);
        } else if (selectedBankIndex > idx) {
          setSelectedBankIndex(selectedBankIndex - 1);
        }
        // Re-fetch to ensure sync with backend and other parts of the app
        const businessId = localStorage.getItem("selectedBusinessId");
        const fetchResponse = await fetch(
          `${getApiConfig().backendURL}/api/bank-details?business_id=${businessId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (fetchResponse.ok) {
          const result = await fetchResponse.json();
          setBankAccounts(result.data || []);
        }
        await showSuccessToast("Bank account removed successfully");
      }
    } catch (error) {
      console.error("Error deleting bank:", error);
      await showErrorModal("Failed to delete bank account");
    }
  };
  async function handleSubmit(e) {
    e.preventDefault();

    // ---------------- VALIDATION ----------------
    if (!party.trim()) {
      showErrorToast("Please enter a supplier name");
      return;
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      showErrorToast("Please add at least one item");
      return;
    }

    // Validate each row
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.description || !line.description.trim()) {
        showErrorToast(`Please enter item name for row ${i + 1}`);
        return;
      }
    }
    console.log('product line', lines)
    // ---------------- PRODUCTS ----------------
    const products = lines.map((l) => ({
      id: l.id,
      product_id: l.productId || null,
      name: l.description || "",
      pack_size: Number(l.pack_size || 0),
      price: Number(l.price || 0),
      unit: l.unit || "PCS",
      qty: Number(l.qty || 0),
      deliveredQty: Number(l.deliveredQty || 0),
      comments: l.comments || "",
      image_url: l.image_url || "",
    }));

    // ---------------- TOTALS ----------------
    const totals = {
      subtotal: Math.round(subtotal),
      finalAmount: Math.round(totalAmount),
    };

    // ---------------- BILL TO ---------------- 
    const selectedBillingAddr =
      partyAddresses.billing[selectedBillingAddressIndex];
    const resolvedPartyId = selectedParty?.id || initialData.party_id || null;
    const billTo = {
      party_id: resolvedPartyId,
      name: party,
      phone: selectedParty?.phone_number || selectedParty?.phone || "",
      email: selectedParty?.email || "",
      address: selectedBillingAddr
        ? `${selectedBillingAddr.line1 || ""}, ${selectedBillingAddr.city || ""}, ${selectedBillingAddr.state || ""} - ${selectedBillingAddr.pincode || ""}, ${selectedBillingAddr.country || ""}`
        : selectedPartyDetails?.billing_address || "",
    };

    // ---------------- TERMS ----------------
    const terms =
      sections?.map((s, index) => ({
        id: s.id || index + 1,
        heading: s.heading || "",
        content: s.content || "",
      })) || [];

    // REMOVE HUA HAI  terms, FROM PAYLOAD SE
    // ---------------- FINAL JSON ----------------
    const invoiceData = {
      business_id: localStorage.getItem("selectedBusinessId") || "1",

      // Top-level IDs needed by backend model
      party_id: resolvedPartyId,
      bill_to_address_id: selectedBillingAddr?.id || initialData.bill_to_address_id || null,
      billTo,
      products,
      totals,
      mrn_date: invoiceDate,
      notes: notes || "",

      // ----------- YOUR EXTRA FIELDS -----------
      mrn_number: mrnNo || "",
      purchase_order_number: purchaseOrderNumber || "",
      delivery_location: deliveryLocation || "",
      cost_center: costCenter || "",
      remark: remark || "",
      advice_no: AdviceNoteNumber || "",
    };

    // Add mrnId for edit mode
    if (isEditing && initialData.dbId) {
      invoiceData.mrnId = initialData.dbId;
    }
    console.log("Prepared invoice data for submission:", invoiceData);

    // ---------------- SAVE ----------------
    if (onSave) {
      try {
        setSubmitting(true);

        const res = onSave(invoiceData);
        if (res && typeof res.then === "function") {
          await res;
        }

        setSubmitting(false);
      } catch (err) {
        setSubmitting(false);
        closeModal();

        // Check for field-specific error from backend
        const errorData = err.response?.data;
        if (errorData?.field === "mrn_number") {
          setMRNNoError(errorData.message || "MRN number already exists");
          // Show error toast as well for visibility
          showErrorToast(errorData.message || "MRN number already exists");
        } else {
          await showErrorModal({
            title: "Save failed",
            text: err?.message || "Error",
          });
        }
      }
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
                Goods Receipt Note Information
              </h2>
              {/* First Row: Bill To and Quotation Number only */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                {/* Bill To Column - col-4 when no party, col-8 when party selected */}
                <div className={"md:col-span-5"}>
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
                          onBlur={() => setShowPartyDropdown(false)}
                          placeholder="Select or enter supplier name"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                          required
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPartyDropdown(!showPartyDropdown)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Party Dropdown */}
                        {showPartyDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 flex flex-col">
                            {/* Header with column titles */}
                            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500">
                                Supplier Name
                              </span>
                              <span className="text-xs font-medium text-gray-500">
                                Balance
                              </span>
                            </div>

                            {/* Scrollable party list */}
                            <div className="overflow-y-auto max-h-48">
                              {loadingParties ? (
                                <div className="px-3 py-2 text-center text-xs text-gray-500">
                                  Loading suppliers...
                                </div>
                              ) : parties.length > 0 ? (
                                (() => {
                                  // Filter parties by party name or trade name
                                  const searchTerm = party.toLowerCase();
                                  const filtered = parties.filter(
                                    (p) =>
                                      p.party_name
                                        .toLowerCase()
                                        .includes(searchTerm) ||
                                      (p.trade_name &&
                                        p.trade_name
                                          .toLowerCase()
                                          .includes(searchTerm)),
                                  );

                                  // Sort: matching items first, then others
                                  const sorted = filtered.sort((a, b) => {
                                    const aNameMatch = a.party_name
                                      .toLowerCase()
                                      .startsWith(searchTerm);
                                    const bNameMatch = b.party_name
                                      .toLowerCase()
                                      .startsWith(searchTerm);
                                    const aTradeMatch =
                                      a.trade_name &&
                                      a.trade_name
                                        .toLowerCase()
                                        .startsWith(searchTerm);
                                    const bTradeMatch =
                                      b.trade_name &&
                                      b.trade_name
                                        .toLowerCase()
                                        .startsWith(searchTerm);

                                    if (
                                      (aNameMatch || aTradeMatch) &&
                                      !(bNameMatch || bTradeMatch)
                                    )
                                      return -1;
                                    if (
                                      !(aNameMatch || aTradeMatch) &&
                                      (bNameMatch || bTradeMatch)
                                    )
                                      return 1;
                                    return 0;
                                  });

                                  return sorted.length > 0 ? (
                                    sorted.map((partyItem) => (
                                      <button
                                        key={partyItem.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={async () => {
                                          try {
                                            const selectedBusinessId =
                                              localStorage.getItem(
                                                "selectedBusinessId",
                                              );
                                            if (selectedBusinessId) {
                                              const result =
                                                await partyAPI.getById(
                                                  partyItem.id,
                                                  selectedBusinessId,
                                                );
                                              if (
                                                result.success &&
                                                result.data
                                              ) {
                                                const partyDetails =
                                                  result.data;
                                                setSelectedParty(partyItem);
                                                setSelectedPartyDetails(
                                                  partyDetails,
                                                );
                                                setParty(partyItem.party_name);
                                                setShowPartyDropdown(false);

                                                // Auto-sync Tax Type Selection (Robust check)
                                                const regType = (
                                                  partyDetails.registrationType ||
                                                  partyDetails.registration_type ||
                                                  ""
                                                ).toUpperCase();
                                                const hasGstin =
                                                  partyDetails.gstin &&
                                                  partyDetails.gstin !==
                                                  "null" &&
                                                  partyDetails.gstin.trim() !==
                                                  "";
                                                const hasVat =
                                                  partyDetails.vat &&
                                                  partyDetails.vat !== "null" &&
                                                  partyDetails.vat.trim() !==
                                                  "";

                                                if (
                                                  regType === "VAT" ||
                                                  (hasVat && !hasGstin)
                                                ) {
                                                  handleGSTVATToggle(
                                                    false,
                                                    true,
                                                    false,
                                                  );
                                                } else if (
                                                  regType === "GSTIN" ||
                                                  hasGstin
                                                ) {
                                                  handleGSTVATToggle(
                                                    true,
                                                    false,
                                                    false,
                                                  );
                                                } else if (
                                                  regType === "NO_TAX"
                                                ) {
                                                  handleGSTVATToggle(
                                                    false,
                                                    false,
                                                    true,
                                                  );
                                                }
                                              }
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Error fetching party details:",
                                              error,
                                            );
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
                                            {partyItem.balance ||
                                              partyItem.opening_balance ||
                                              "0.0"}
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                  ) : (
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

                            {/* Fixed Add New Supplier button at bottom */}
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
                                + Add New Supplier
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full">
                      {/* Supplier Card - Redesigned */}
                      <div className="rounded-xl border border-[#129046]/30 bg-gradient-to-br from-green-50 to-white shadow-md overflow-hidden h-full">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                              <Building className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-bold text-white tracking-wide">
                              {billToLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-md transition-all"
                              title="Change Billing Address"
                              onClick={() => setShowBillingAddressesModal(true)}
                            >
                              <Edit2 size={11} />
                              Change Address
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedParty(null);
                                setSelectedPartyDetails(null);
                                setParty("");
                              }}
                              title="Change Supplier"
                              className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-md transition-all"
                            >
                              <X size={11} />
                              Change
                            </button>
                          </div>
                        </div>
                        {/* Card Body */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="font-bold text-gray-900 text-base leading-tight">
                            {selectedPartyDetails?.party_name ||
                              selectedParty?.party_name}
                          </div>
                          {/* {selectedPartyDetails?.gstin && (
                            <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                              <span>GSTIN:</span>
                              <span>{selectedPartyDetails.gstin}</span>
                            </div>
                          )} */}
                          {selectedPartyDetails?.billing_address && (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <span className="mt-0.5 text-[#129046] flex-shrink-0">
                                Address:
                              </span>
                              <span className="leading-relaxed">
                                {selectedPartyDetails.billing_address}
                                {selectedPartyDetails?.city &&
                                  selectedPartyDetails.city !== "null"
                                  ? `, ${selectedPartyDetails.city}`
                                  : ""}
                                {selectedPartyDetails.state &&
                                  selectedPartyDetails.state !== "null"
                                  ? `, ${selectedPartyDetails.state}`
                                  : ""}
                                {selectedPartyDetails.pincode &&
                                  selectedPartyDetails.pincode !== "null"
                                  ? ` - ${selectedPartyDetails.pincode}`
                                  : ""}
                                {selectedPartyDetails.country &&
                                  selectedPartyDetails.country !== "null"
                                  ? `, ${selectedPartyDetails.country}`
                                  : ""}
                              </span>
                            </div>
                          )}
                          {selectedPartyDetails?.phone_number && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[#129046]">Phone No.:</span>
                              <span>{selectedPartyDetails.phone_number}</span>
                            </div>
                          )}
                          {selectedPartyDetails?.state && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-gray-500">
                                Place of Supply:
                              </span>
                              <span className="text-xs font-semibold text-[#129046] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                {selectedPartyDetails.state}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quotation Number Column - dynamic col-span */}
                <div className={"md:col-span-7"}>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Document Details
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          MRN Number
                        </label>
                        <input
                          value={mrnNo}
                          onChange={(e) => {
                            setMRNNo(e.target.value);
                            setMRNNoError("");
                          }}
                          className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:outline-none transition-colors ${mrnNoError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
                          disabled={submitting}
                        />
                        {mrnNoError && (
                          <p className="mt-1 text-sm text-red-500 font-medium">
                            {mrnNoError}
                          </p>
                        )}
                      </div>

                      {/* MRN-specific fields */}
                      {formType === "mrn" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Purchase Order Number
                            </label>
                            <input
                              type="text"
                              value={purchaseOrderNumber}
                              onChange={(e) =>
                                setPurchaseOrderNumber(e.target.value)
                              }
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                              placeholder="Enter PO Number"
                              disabled={submitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Delivery Location
                            </label>
                            <input
                              type="text"
                              value={deliveryLocation}
                              onChange={(e) =>
                                setDeliveryLocation(e.target.value)
                              }
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                              placeholder="Enter delivery location"
                              disabled={submitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Cost Center
                            </label>
                            <input
                              type="text"
                              value={costCenter}
                              onChange={(e) => setCostCenter(e.target.value)}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                              placeholder="Enter cost center"
                              disabled={submitting}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row: All other fields */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    MRN Date
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
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                    placeholder="Enter remarks"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Advice Note Number
                  </label>
                  <input
                    type="text"
                    value={AdviceNoteNumber}
                    onChange={(e) => setAdviceNoteNumber(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                    placeholder="Enter cost center"
                    disabled={submitting}
                  />
                </div>
              </div>
            </section>

            {/* Items */}
            <section>
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
                    />
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
              <div className="relative overflow-x-auto rounded-lg border border-yellow-200 mb-6">
                <div className="inline-block min-w-full">
                  <table className="min-w-[1100px] w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100 text-black">
                      <tr>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-12">
                          NO
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-20">
                          IMAGE
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[250px]">
                          ITEM NAME
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          PACK SIZE
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          PRICE
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-32">
                          UNIT
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          ORDER QTY
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          DELIVERED QTY
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-24">
                          COMMENTS
                        </th>
                        <th className="px-1 sm:px-2 py-2 text-center font-semibold whitespace-nowrap w-16">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineTotals.map((l, idx) => (
                        <tr key={l.id} className="border-t hover:bg-gray-50">
                          <td className="px-1 sm:px-2 py-2 text-center align-middle">
                            {idx + 1}
                          </td>

                          {/* IMAGE */}
                          <td className="px-1 sm:px-2 py-2 text-center align-middle">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden border relative">
                              {l.image_url ? (
                                <>
                                  <img
                                    src={
                                      l.image_url.startsWith("data:")
                                        ? l.image_url
                                        : `${getApiConfig().backendURL}${l.image_url}`
                                    }
                                    alt={l.description}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error(
                                        "Image load error in main form:",
                                        e.target.src,
                                      );
                                      e.target.style.display = "none";
                                      const noImageText =
                                        e.target.parentElement.querySelector(
                                          ".no-image-text",
                                        );
                                      if (noImageText) {
                                        noImageText.style.display = "flex";
                                      }
                                    }}
                                  />
                                  <div
                                    className="no-image-text w-full h-full flex items-center justify-center text-gray-400 text-xs"
                                    style={{ display: "none" }}
                                  >
                                    No Image
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-full h-full flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        document
                                          .getElementById(`file-input-${l.id}`)
                                          .click()
                                      }
                                      className="bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 upload-bounce-repeat"
                                      title="Upload Image"
                                      style={{
                                        animation:
                                          "uploadBounce 0.6s ease-in-out 2",
                                        animationIterationCount: "2",
                                        animationDelay: "0s",
                                      }}
                                      onAnimationEnd={(e) => {
                                        // Re-trigger animation every 5 seconds
                                        setTimeout(() => {
                                          e.target.style.animation = "none";
                                          setTimeout(() => {
                                            e.target.style.animation =
                                              "uploadBounce 0.6s ease-in-out 2";
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
                                    style={{ display: "none" }}
                                    onChange={(e) => handleImageUpload(e, l.id)}
                                  />
                                </>
                              )}
                            </div>
                          </td>

                          {/* ITEM NAME */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              value={l.description}
                              onChange={(e) =>
                                updateLine(l.id, {
                                  description: e.target.value,
                                })
                              }
                              className={`border-2 rounded-lg text-sm focus:outline-none ${lineErrors[l.id]?.description
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                }`}
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                minWidth: "280px",
                              }}
                              placeholder="GOODS NAME"
                              disabled={submitting}
                            />
                          </td>

                          {/* PACK SIZE */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              type="text"
                              value={l.pack_size || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value) || value === "") {
                                  updateLine(l.id, {
                                    pack_size: value === "" ? 0 : Number(value),
                                  });
                                }
                              }}
                              className={`border-2 rounded-lg text-sm focus:outline-none text-center ${lineErrors[l.id]?.qty
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                }`}
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                maxWidth: "60px",
                              }}
                              placeholder="PACK SIZE"
                              disabled={submitting}
                            />
                          </td>

                          {/* PRICE */}
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={
                                  focusedInput?.id === l.id &&
                                    focusedInput?.field === "price"
                                    ? focusedInput.val
                                    : `${getCurrencySymbol(currency)}${convertAmount(l.price, currency).toFixed(2)}`
                                }
                                onFocus={() => {
                                  const currentVal = `${getCurrencySymbol(currency)}${convertAmount(l.price, currency).toFixed(2)}`;
                                  setFocusedInput({
                                    id: l.id,
                                    field: "price",
                                    val: currentVal,
                                  });
                                }}
                                onChange={(e) => {
                                  const symbol = getCurrencySymbol(currency);
                                  let val = e.target.value;

                                  // Extract numeric part to validate
                                  let numericPart = val;
                                  if (val.startsWith(symbol)) {
                                    numericPart = val.substring(symbol.length);
                                  }

                                  // Only allow numbers and one decimal point
                                  if (!/^\d*\.?\d*$/.test(numericPart) && numericPart !== "") {
                                    return;
                                  }

                                  // Update local focused state
                                  setFocusedInput({
                                    id: l.id,
                                    field: "price",
                                    val,
                                  });

                                  // Process for underlying data
                                  const cleanVal = numericPart.replace(/[^0-9.]/g, "");
                                  const parts = cleanVal.split(".");
                                  const finalVal =
                                    parts[0] +
                                    (parts.length > 1 ? "." + parts[1] : "");
                                  const inrValue =
                                    finalVal === ""
                                      ? 0
                                      : convertToINR(
                                        Number(finalVal),
                                        currency,
                                      );
                                  updateLine(l.id, { price: inrValue });
                                }}
                                onBlur={() => setFocusedInput(null)}
                                className="border-2 border-gray-200 rounded-lg text-sm focus:outline-none text-center focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                style={{
                                  padding: "0.5rem",
                                  width: "auto",
                                  minWidth: "110px",
                                  maxWidth: "140px",
                                }}
                                // placeholder="0.00"
                                disabled={submitting}
                              />
                            </div>
                          </td>

                          {/* UNIT - Compact */}
                          <td className="px-2 py-2 align-middle">
                            <select
                              value={l.unit || "PCS"}
                              onChange={(e) =>
                                updateLine(l.id, { unit: e.target.value })
                              }
                              className="border-2 border-gray-200 rounded-lg text-sm text-left focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                minWidth: "80px",
                              }}
                              disabled={submitting}
                            >
                              <option value="PCS">PCS</option>
                              <option value="BOX">BOX</option>
                              <option value="MTR">MTR</option>
                              <option value="KG">KG</option>
                              <option value="LTR">LTR</option>
                            </select>
                          </td>
                          {/* ORDER QTY */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              type="text"
                              value={l.qty || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and decimal point
                                if (/^\d*\.?\d*$/.test(value) || value === "") {
                                  updateLine(l.id, {
                                    qty: value === "" ? 0 : Number(value),
                                  });
                                }
                              }}
                              className={`border-2 rounded-lg text-sm focus:outline-none text-center ${lineErrors[l.id]?.qty
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                }`}
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                maxWidth: "60px",
                              }}
                              placeholder="ORDER QTY"
                              disabled={submitting}
                            />
                          </td>
                          {/* DELIVERED QTY */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              type="text"
                              value={l.deliveredQty || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only allow numbers and decimal point
                                if (/^\d*\.?\d*$/.test(value) || value === "") {
                                  updateLine(l.id, {
                                    deliveredQty: value === "" ? 0 : Number(value),
                                  });
                                }
                              }}
                              className={`border-2 rounded-lg text-sm focus:outline-none text-center ${lineErrors[l.id]?.qty
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                                }`}
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                maxWidth: "60px",
                              }}
                              placeholder="DELIVERED QTY"
                              disabled={submitting}
                            />
                          </td>
                          {/* COMMENTS */}
                          <td className="px-2 py-2 align-middle">
                            <input
                              value={l.comments || ""}
                              onChange={(e) =>
                                updateLine(l.id, { comments: e.target.value })
                              }
                              className="border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-center"
                              style={{
                                padding: "0.5rem",
                                width: "auto",
                                maxWidth: "85px",
                              }}
                              placeholder="Comments"
                              disabled={submitting}
                            />
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
                  ← Scroll horizontally →
                </div>
              </div>

              <div className="flex justify-center">
                {/* Add Another Item button if needed */}
              </div>
            </section>

            {/* Additional Info: Payment Info (bank), Notes */}
            {/* <section
              className={`grid grid-cols-1 ${showBankDetails && formType !== "deliveryChallan" ? "lg:grid-cols-2" : ""} gap-6`}
            >
              <div className="border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Customer Notes</h3>
                  <button
                    type="button"
                    onClick={() => setShowNotes((s) => !s)}
                    className="text-green-600 text-sm"
                  >
                    {showNotes ? "Hide" : "Add Note"}
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
                  <div className="text-sm text-gray-500">No notes added</div>
                )}
              </div>
            </section> */}

            {/* Terms & Conditions - Separate Row */}


            {/* Bottom Footer with Save/Cancel Buttons */}
            <div className="border-t border-gray-300 pt-4 mt-8">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onBack}
                  style={{ padding: "6px 16px", height: "36px" }}
                  className="bg-red-600 text-white rounded-[7px] text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                  disabled={submitting}
                >
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "6px 16px", height: "36px" }}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] text-sm font-medium disabled:bg-gray-400 disabled:text-gray-200 hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 flex items-center justify-center"
                >
                  {submitting ? "Saving..." : saveLabel}
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
        onAddNew={(p) => { }}
        currentLines={lines}
        currency={currency}
      />

      <SupplierModal
        open={showPartyModal}
        onClose={() => setShowPartyModal(false)}
        onSave={(newParty) => {
          setParties((prev) => [...prev, newParty]);

          setSelectedParty(newParty);
          setSelectedPartyDetails(newParty);
          setParty(newParty.party_name || newParty.name || "");

          setShowPartyDropdown(false);
          setShowPartyModal(false);
        }}
      />

      <BillingAddressesModal
        open={showBillingAddressesModal}
        onClose={() => setShowBillingAddressesModal(false)}
        addresses={partyAddresses.billing}
        selectedIndex={selectedBillingAddressIndex}
        title="Select Billing Address"
        onSelect={(index) => {
          console.log("Selected Billing Address Index:", index);
          setSelectedBillingAddressIndex(index);

          // Update selectedPartyDetails with the selected billing address
          const selectedAddress = partyAddresses.billing[index];
          console.log("Selected Billing Address Object:", selectedAddress);
          if (selectedAddress) {
            setSelectedPartyDetails((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                billing_address: selectedAddress.line1,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                country: selectedAddress.country || "India",
              };
              console.log("Updated selectedPartyDetails (Billing):", updated);
              return updated;
            });
          }

          setShowBillingAddressesModal(false);
        }}
        onEdit={(index) => {
          setEditingBillingIndex(index);
          setShowBillingAddressModal(true);
          setShowBillingAddressesModal(false);
        }}
        onAdd={() => {
          setEditingBillingIndex(null);
          setShowBillingAddressModal(true);
          setShowBillingAddressesModal(false);
        }}
      />

      <BillingAddressModal
        open={showBillingAddressModal}
        onClose={() => setShowBillingAddressModal(false)}
        billingAddress={
          editingBillingIndex !== null
            ? partyAddresses.billing[editingBillingIndex]
            : { line1: "", city: "", state: "", pincode: "" }
        }
        onSave={async (data) => {
          try {
            if (!selectedParty || !selectedParty.id) {
              showErrorToast("Please select a party first");
              return;
            }

            const businessId = localStorage.getItem("selectedBusinessId");
            const addressData = {
              line1: data.line1,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              country: data.country || "India",
              address_type: "billing",
            };

            let response;
            if (editingBillingIndex !== null) {
              const addressId = partyAddresses.billing[editingBillingIndex].id;
              response = await partyAPI.updateAddress(
                selectedParty.id,
                addressId,
                addressData,
                businessId,
              );
            } else {
              response = await partyAPI.addAddress(
                selectedParty.id,
                addressData,
                businessId,
              );
            }

            if (response.success) {
              // Update local state immediately for better UX
              if (editingBillingIndex !== null) {
                if (selectedBillingAddressIndex === editingBillingIndex) {
                  setSelectedPartyDetails((prev) => ({
                    ...prev,
                    billing_address: data.line1,
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    country: data.country || "India",
                  }));
                }
              }

              // Refresh all addresses from server
              const addressResponse = await partyAPI.getAddresses(
                selectedParty.id,
                businessId,
              );
              if (addressResponse.success && addressResponse.data) {
                const billingAddrs = addressResponse.data.filter(
                  (addr) => addr.address_type === "billing",
                );
                const shippingAddrs = addressResponse.data.filter(
                  (addr) => addr.address_type === "shipping",
                );

                setPartyAddresses({
                  billing: billingAddrs,
                  shipping: shippingAddrs,
                });

                if (editingBillingIndex === null) {
                  // Select the newly added address
                  setSelectedBillingAddressIndex(billingAddrs.length - 1);
                  const newAddr = billingAddrs[billingAddrs.length - 1];
                  setSelectedPartyDetails((prev) => ({
                    ...prev,
                    billing_address: newAddr.line1,
                    city: newAddr.city,
                    state: newAddr.state,
                    pincode: newAddr.pincode,
                    country: newAddr.country || "India",
                  }));
                }
              }

              showSuccessToast(
                editingBillingIndex !== null
                  ? "Address updated successfully"
                  : "Address added successfully",
              );
              setShowBillingAddressModal(false);
              setEditingBillingIndex(null);
            }
          } catch (error) {
            console.error("Error saving billing address:", error);
            showErrorToast(error.message || "Failed to save billing address");
          }
        }}
      />

      <BillingAddressesModal
        open={showShippingAddressesModal}
        onClose={() => setShowShippingAddressesModal(false)}
        addresses={partyAddresses.shipping}
        selectedIndex={selectedShippingAddressIndex}
        title="Select Shipping Address"
        onSelect={(index) => {
          console.log("Selected Shipping Address Index:", index);
          setSelectedShippingAddressIndex(index);

          // Update selectedPartyDetails with the selected shipping address
          const selectedAddress = partyAddresses.shipping[index];
          console.log("Selected Shipping Address Object:", selectedAddress);
          if (selectedAddress) {
            setSelectedPartyDetails((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                shipping_address: selectedAddress.line1,
                ship_city: selectedAddress.city,
                ship_state: selectedAddress.state,
                ship_pincode: selectedAddress.pincode,
                ship_country: selectedAddress.country || "India",
              };
              console.log("Updated selectedPartyDetails (Shipping):", updated);
              return updated;
            });
          }

          setShowShippingAddressesModal(false);
        }}
        onEdit={(index) => {
          setEditingShippingIndex(index);
          setShowShippingAddressModal(true);
          setShowShippingAddressesModal(false);
        }}
        onAdd={() => {
          setEditingShippingIndex(null);
          setShowShippingAddressModal(true);
          setShowShippingAddressesModal(false);
        }}
      />

      <ShippingAddressModal
        open={showShippingAddressModal}
        onClose={() => setShowShippingAddressModal(false)}
        address={
          editingShippingIndex !== null
            ? partyAddresses.shipping[editingShippingIndex]
            : { line1: "", city: "", state: "", pincode: "" }
        }
        onSave={async (data) => {
          try {
            if (!selectedParty || !selectedParty.id) {
              showErrorToast("Please select a party first");
              return;
            }

            const businessId = localStorage.getItem("selectedBusinessId");
            const addressData = {
              line1: data.line1,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              country: data.country || "India",
              address_type: "shipping",
            };

            let response;
            if (editingShippingIndex !== null) {
              const addressId =
                partyAddresses.shipping[editingShippingIndex].id;
              response = await partyAPI.updateAddress(
                selectedParty.id,
                addressId,
                addressData,
                businessId,
              );
            } else {
              response = await partyAPI.addAddress(
                selectedParty.id,
                addressData,
                businessId,
              );
            }

            if (response.success) {
              // Update local state immediately for better UX
              if (editingShippingIndex !== null) {
                if (selectedShippingAddressIndex === editingShippingIndex) {
                  setSelectedPartyDetails((prev) => ({
                    ...prev,
                    shipping_address: data.line1,
                    ship_city: data.city,
                    ship_state: data.state,
                    ship_pincode: data.pincode,
                    ship_country: data.country || "India",
                  }));
                }
              }

              // Refresh all addresses from server
              const addressResponse = await partyAPI.getAddresses(
                selectedParty.id,
                businessId,
              );
              if (addressResponse.success && addressResponse.data) {
                const billingAddrs = addressResponse.data.filter(
                  (addr) => addr.address_type === "billing",
                );
                const shippingAddrs = addressResponse.data.filter(
                  (addr) => addr.address_type === "shipping",
                );

                setPartyAddresses({
                  billing: billingAddrs,
                  shipping: shippingAddrs,
                });

                if (editingShippingIndex === null) {
                  // Select the newly added address
                  setSelectedShippingAddressIndex(shippingAddrs.length - 1);
                  const newAddr = shippingAddrs[shippingAddrs.length - 1];
                  setSelectedPartyDetails((prev) => ({
                    ...prev,
                    shipping_address: newAddr.line1,
                    ship_city: newAddr.city,
                    ship_state: newAddr.state,
                    ship_pincode: newAddr.pincode,
                    ship_country: newAddr.country || "India",
                  }));
                }
              }

              showSuccessToast(
                editingShippingIndex !== null
                  ? "Address updated successfully"
                  : "Address added successfully",
              );
              setShowShippingAddressModal(false);
              setEditingShippingIndex(null);
            }
          } catch (error) {
            console.error("Error saving shipping address:", error);
            showErrorToast(error.message || "Failed to save shipping address");
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
            ? sections.find((s) => s.id === editingSectionId)?.content || ""
            : ""
        }
        initialHeading={
          editingSectionId
            ? sections.find((s) => s.id === editingSectionId)?.heading || ""
            : ""
        }
        onSave={(htmlContent, heading) => {
          setSections((prev) =>
            prev.map((s) =>
              s.id === editingSectionId
                ? { ...s, content: htmlContent, heading }
                : s,
            ),
          );
          setShowTextEditor(false);
          setEditingSectionId(null);
          window.currentEditingSectionId = null;
        }}
      />
    </div>
  );
}
