import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, Plus, X, Check, ArrowLeft, ChevronDown } from 'lucide-react';
import ActionButtons from '../../../Components/ActionButtons.jsx';
import { businessAPI, authAPI, taxAPI, getApiConfig, getAuthToken } from '../../../utils/api';
import { getImageURL } from '../../../utils/config';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import ImageCropModal from '../../../Components/ImageCropModal.jsx';
import { STATE_OPTIONS } from '../../../utils/dropdownOptions.js';

const businessTypes = [
  { label: 'Retailer', value: 'Retailer' },
  { label: 'Wholesaler', value: 'Wholesaler' },
  { label: 'Distributor', value: 'Distributor' },
  { label: 'Services', value: 'Services' },
  { label: 'Manufacturer', value: 'Manufacturer' },
  { label: 'Trader', value: 'Trader' },
  { label: 'Other', value: 'Other' }
];

const industryTypes = [
  { label: 'Technology', value: 'Technology' },
  { label: 'Healthcare', value: 'Healthcare' },
  { label: 'Education', value: 'Education' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Construction', value: 'Construction' },
  { label: 'Other', value: 'Other' }
];

const registrationTypes = [
  { label: 'Private Limited Company', value: 'Private Limited Company' },
  { label: 'Public Limited Company', value: 'Public Limited Company' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'LLP', value: 'LLP' },
  { label: 'Other', value: 'Other' }
];
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast, showSuccessModal, showErrorModal, SuccessMessages, ErrorMessages, showConfirmationDialog } from '../../../Components/ActionMessageModel.jsx';
import { RoleBasedAccess, useRoleBasedAccess } from '../../../Components/RoleBasedAccess.jsx';
import { isAdminUser, hasPermission } from '../../../utils/roleUtils.js';
import MainLoader from '../../../Components/MainLoader.jsx';
import { countryCodes } from '../../../utils/countryCodes.js';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export default function BusinessManagement({ isPlanExpired, checkPlanExpiry }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [maxBusinesses, setMaxBusinesses] = useState(1);
  const [loading, setLoading] = useState(true);
  const businessJustCreatedRef = useRef(false);
  const pincodeTimeoutRef = useRef(null);
  const newBusinessPincodeTimeoutRef = useRef(null);
  const initialDataLoadedRef = useRef(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const isMounted = useRef(true);

  // Helper to toggle multiple selections in a comma-separated string
  const toggleMultiSelect = (currentValue, itemValue) => {
    if (!currentValue) return itemValue;
    const values = currentValue.split(', ').map(v => v.trim()).filter(Boolean);
    const index = values.indexOf(itemValue);
    if (index > -1) {
      values.splice(index, 1);
    } else {
      values.push(itemValue);
    }
    return values.join(', ');
  };

  // Mounted ref guard
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Ensure sub-users never enter edit mode
  useEffect(() => {
    if (isEditMode && !isAdminUser()) {
      setIsEditMode(false);
      showErrorToast('Only administrators can edit business details');
    }
  }, [isEditMode]);
  const [businessData, setBusinessData] = useState({
    businessName: '',
    comment: '',
    companyPhone: '',
    companyEmail: '',
    billingAddress: '',
    state: '', // Changed from 'Uttar Pradesh' to empty
    country: '', // Changed from 'India' to empty
    pincode: '',
    city: '',
    businessType: '',
    industryType: '',
    businessRegistrationType: '',
    isGSTRegistered: false,
    taxType: 'No', // 'No', 'GST', or 'VAT'
    gstin: '',
    vatNumber: '',
    enableEInvoicing: false,
    panNumber: '',
    enableTDS: false,
    enableTCS: false,
    otherBusinessType: '',
    otherIndustryType: '',
    otherRegistrationType: '',
    websites: [],
    companyPhoneCode: '+91'
  });

  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showLogoCropModal, setShowLogoCropModal] = useState(false);

  // Auto-detect country code on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        if (!isMounted.current) return;
        const response = await fetch('https://country.is/');
        if (!response.ok) return; // Silent fail if API down
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const data = await response.json();
        if (data && data.country) {
          const country = countryCodes.find(c => c.code === data.country);
          if (country) {
            setNewBusinessData(prev => ({ ...prev, companyPhoneCode: country.dial_code }));
            setBusinessData(prev => ({ ...prev, companyPhoneCode: country.dial_code }));
          }
        }
      } catch (error) {
        console.warn('Error detecting country:', error.message);
      }
    };
    detectCountry();
  }, []);
  const [logoCropImage, setLogoCropImage] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [newWebsite, setNewWebsite] = useState('');
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [additionalBusinessData, setAdditionalBusinessData] = useState({
    msmeNumber: '',
    cinNumber: '',
    tanNumber: '',
    udyamNumber: '',
    importExportCode: '',
    fssaiNumber: '',
    drugLicenseNumber: '',
    additionalWebsites: []
  });
  const [newBusinessData, setNewBusinessData] = useState({
    businessName: '',
    comment: '',
    companyPhone: '',
    companyEmail: '',
    billingAddress: '',
    state: '',
    country: '', // Changed from 'India' to empty
    pincode: '',
    city: '',
    businessType: '',
    industryType: '',
    businessRegistrationType: '',
    isGSTRegistered: false,
    taxType: 'No', // 'No', 'GST', or 'VAT'
    gstin: '',
    vatNumber: '',
    enableEInvoicing: false,
    panNumber: '',
    enableTDS: false,
    enableTCS: false,
    newOtherBusinessType: '',
    newOtherIndustryType: '',
    newOtherRegistrationType: '',
    companyPhoneCode: '+91'
  });
  const [newBusinessErrors, setNewBusinessErrors] = useState({});
  const [businessErrors, setBusinessErrors] = useState({});

  const resetNewBusinessForm = () => {
    setNewBusinessData({
      businessName: '',
      comment: '',
      companyPhone: '',
      companyEmail: '',
      billingAddress: '',
      state: '',
      country: '',
      pincode: '',
      city: '',
      businessType: '',
      industryType: '',
      businessRegistrationType: '',
      isGSTRegistered: false,
      taxType: 'No',
      gstin: '',
      vatNumber: '',
      enableEInvoicing: false,
      panNumber: '',
      enableTDS: false,
      enableTCS: false,
      newOtherBusinessType: '',
      newOtherIndustryType: '',
      newOtherRegistrationType: '',
      companyPhoneCode: '+91'
    });
    setNewBusinessErrors({});
  };

  const validateBusinessField = (field, value, currentData, isNew = false) => {
    let error = '';
    const data = { ...currentData, [field]: value };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const pincodeRegex = /^\d{6}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    switch (field) {
      case 'businessName':
        if (!value?.trim()) error = 'Business name is required';
        break;
      case 'companyEmail':
        if (!value?.trim()) {
          error = 'Company email is required';
        } else if (!emailRegex.test(value)) {
          error = 'Invalid email format (e.g., name@company.com)';
        }
        break;
      case 'companyPhone':
        if (!value?.trim()) error = 'Company phone number is required';
        break;
      case 'gstin':
        if (data.taxType === 'GST') {
          if (!value?.trim()) {
            error = 'GSTIN is required when GST is selected';
          } else if (!gstinRegex.test(value)) {
            error = 'Invalid GSTIN format';
          }
        }
        break;
      case 'vatNumber':
        if (data.taxType === 'VAT') {
          if (!value?.trim()) {
            error = 'VAT number is required when VAT is selected';
          }
        }
        break;
      case 'pincode':
        if (!value?.trim()) {
          error = 'Pincode/Zipcode is required';
        } else if (value.trim().length < 3) {
          error = 'Invalid pincode/zipcode';
        }
        break;
      case 'state':
        if (!value) error = 'State is required';
        break;
      case 'city':
        if (!value) error = 'City is required';
        break;
      case 'panNumber':
        if (value?.trim()) {
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!panRegex.test(value)) {
            error = 'Invalid PAN format (e.g., ABCDE1234F)';
          }
        }
        break;
      case 'billingAddress':
        if (!value?.trim()) error = 'Billing address is required';
        break;
      default:
        break;
    }

    const setErrorState = isNew ? setNewBusinessErrors : setBusinessErrors;
    setErrorState(prev => ({
      ...prev,
      [field]: error
    }));

    return error;
  };

  const [gstinLoading, setGstinLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [newBusinessPincodeLoading, setNewBusinessPincodeLoading] = useState(false);

  // Track manually edited address fields to prevent overwrite
  const [manualAddressEdits, setManualAddressEdits] = useState({ city: false, state: false, country: false });
  const [newBusinessManualAddressEdits, setNewBusinessManualAddressEdits] = useState({ city: false, state: false, country: false });

  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [editBusinessStates, setEditBusinessStates] = useState([]);
  const [loadingEditBusinessStates, setLoadingEditBusinessStates] = useState(false);
  const [newBusinessStates, setNewBusinessStates] = useState([]);
  const [loadingNewBusinessStates, setLoadingNewBusinessStates] = useState(false);

  const [cityOptions, setCityOptions] = useState([]); // Used for edit business cities
  const [loadingCities, setLoadingCities] = useState(false); // Used for edit business cities
  const [newBusinessCityOptions, setNewBusinessCityOptions] = useState([]); // Used for new business cities
  const [loadingNewBusinessCities, setLoadingNewBusinessCities] = useState(false); // Used for new business cities
  const [customCities, setCustomCities] = useState({}); // Store custom cities by state

  // Email verification states for Create New Business form
  const [emailVerificationState, setEmailVerificationState] = useState({
    isVerified: false,
    otp: '',
    showOtpInput: false,
    isLoading: false,
    error: ''
  });

  const [editEmailVerificationState, setEditEmailVerificationState] = useState({
    isVerified: false,
    otp: '',
    showOtpInput: false,
    isLoading: false,
    error: '',
    showModal: false
  });

  const [resendTimer, setResendTimer] = useState(0);
  const [editResendTimer, setEditResendTimer] = useState(0);

  // Countdown logic for resend timers
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    let interval = null;
    if (editResendTimer > 0) {
      interval = setInterval(() => setEditResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [editResendTimer]);


  // State variables for custom dropdown in "Create New Business" form
  const [newBusinessDropdowns, setNewBusinessDropdowns] = useState({});
  const [newBusinessStateSearchTerm, setNewBusinessStateSearchTerm] = useState("");
  const [newBusinessHighlightedIndex, setNewBusinessHighlightedIndex] = useState(0);
  const newBusinessStateInputRef = useRef(null);
  const newBusinessOptionsListRef = useRef(null);

  // City dropdown state variables for "Create New Business" form
  const [newBusinessCitySearchTerm, setNewBusinessCitySearchTerm] = useState("");
  const [newBusinessCityHighlightedIndex, setNewBusinessCityHighlightedIndex] = useState(0);
  const newBusinessCityInputRef = useRef(null);
  const newBusinessCityOptionsListRef = useRef(null);

  // State variables for custom dropdown in "Edit Business" form (main form)
  const [editBusinessDropdowns, setEditBusinessDropdowns] = useState({});
  const [editBusinessStateSearchTerm, setEditBusinessStateSearchTerm] = useState("");
  const [editBusinessHighlightedIndex, setEditBusinessHighlightedIndex] = useState(0);
  const editBusinessStateInputRef = useRef(null);
  const editBusinessOptionsListRef = useRef(null);

  // City dropdown state variables for "Edit Business" form (main form)
  const [editBusinessCitySearchTerm, setEditBusinessCitySearchTerm] = useState("");
  const [editBusinessCityHighlightedIndex, setEditBusinessCityHighlightedIndex] = useState(0);
  const editBusinessCityInputRef = useRef(null);
  const editBusinessCityOptionsListRef = useRef(null);

  // Country dropdown state variables for "Create New Business" form
  const [newBusinessCountrySearchTerm, setNewBusinessCountrySearchTerm] = useState("");
  const [newBusinessCountryHighlightedIndex, setNewBusinessCountryHighlightedIndex] = useState(0);
  const newBusinessCountryInputRef = useRef(null);
  const newBusinessCountryOptionsListRef = useRef(null);

  // Phone Country Code dropdown state variables for "Create New Business" form
  const [newBusinessPhoneCodeSearchTerm, setNewBusinessPhoneCodeSearchTerm] = useState("");
  const [newBusinessPhoneCodeHighlightedIndex, setNewBusinessPhoneCodeHighlightedIndex] = useState(0);
  const newBusinessPhoneCodeInputRef = useRef(null);
  const newBusinessPhoneCodeOptionsListRef = useRef(null);

  // Country dropdown state variables for "Edit Business" form
  const [editBusinessCountrySearchTerm, setEditBusinessCountrySearchTerm] = useState("");
  const [editBusinessCountryHighlightedIndex, setEditBusinessCountryHighlightedIndex] = useState(0);
  const editBusinessCountryInputRef = useRef(null);
  const editBusinessCountryOptionsListRef = useRef(null);

  // Phone Country Code dropdown state variables for "Edit Business" form
  const [editBusinessPhoneCodeSearchTerm, setEditBusinessPhoneCodeSearchTerm] = useState("");
  const [editBusinessPhoneCodeHighlightedIndex, setEditBusinessPhoneCodeHighlightedIndex] = useState(0);
  const editBusinessPhoneCodeInputRef = useRef(null);
  const editBusinessPhoneCodeOptionsListRef = useRef(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch all countries
  const fetchAllCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/iso');
      const data = await response.json();
      if (!data.error) {
        const countries = data.data.map(c => ({
          label: c.name,
          value: c.name,
          iso2: c.Iso2,
          iso3: c.Iso3
        }));
        setAllCountries(countries);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch states by country
  const fetchStatesByCountry = async (countryName, isNew = false) => {
    try {
      isNew ? setLoadingNewBusinessStates(true) : setLoadingEditBusinessStates(true);
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
        isNew ? setNewBusinessStates(states) : setEditBusinessStates(states);
      } else {
        isNew ? setNewBusinessStates([]) : setEditBusinessStates([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      isNew ? setNewBusinessStates([]) : setEditBusinessStates([]);
    } finally {
      isNew ? setLoadingNewBusinessStates(false) : setLoadingEditBusinessStates(false);
    }
  };

  // Fetch cities by state and country
  const fetchCitiesByStateAndCountry = async (countryName, stateName, isNew = false) => {
    try {
      if (!getAuthToken() || !isMounted.current) return;
      isNew ? setLoadingNewBusinessCities(true) : setLoadingCities(true);
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
        isNew ? setNewBusinessCityOptions(cities) : setCityOptions(cities);
      } else {
        isNew ? setNewBusinessCityOptions([]) : setCityOptions([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      isNew ? setNewBusinessCityOptions([]) : setCityOptions([]);
    } finally {
      isNew ? setLoadingNewBusinessCities(false) : setLoadingCities(false);
    }
  };

  // Function to load custom cities from localStorage
  const loadCustomCities = () => {
    try {
      const stored = localStorage.getItem('customCities');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomCities(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading custom cities:', error);
    }
    return {};
  };

  // Function to save custom cities to localStorage
  const saveCustomCities = (cities) => {
    try {
      localStorage.setItem('customCities', JSON.stringify(cities));
      setCustomCities(cities);
    } catch (error) {
      console.error('Error saving custom cities:', error);
    }
  };

  // Function to add a custom city
  const addCustomCity = (state, cityName) => {
    const currentCustomCities = { ...customCities };
    if (!currentCustomCities[state]) {
      currentCustomCities[state] = [];
    }

    // Check if city already exists (case-insensitive)
    const cityExists = currentCustomCities[state].some(
      city => city.toLowerCase() === cityName.toLowerCase()
    );

    if (!cityExists) {
      currentCustomCities[state].push(cityName);
      saveCustomCities(currentCustomCities);

      return true;
    }
    return false;
  };

  // Function to merge API cities with custom cities
  const mergeCitiesWithCustom = (apiCities, state) => {
    const customCitiesForState = customCities[state] || [];
    const customCityOptions = customCitiesForState.map(city => ({
      label: city,
      value: city,
      isCustom: true,
      icon: '' // Custom city icon
    }));

    // Combine custom cities at the top, then API cities
    return [...customCityOptions, ...apiCities];
  };

  // Function to fetch cities by state
  const fetchCitiesByState = async (state) => {
    try {
      if (!getAuthToken() || !isMounted.current) return;
      setLoadingCities(true);


      const response = await businessAPI.getCitiesByState(state);


      if (response.success) {

        // Merge API cities with custom cities
        const mergedCities = mergeCitiesWithCustom(response.data.cities, state);
        setCityOptions(mergedCities);

      } else {
        console.error('BusinessManagement - API returned error:', response.message);
        // Even if API fails, show custom cities
        const customOnly = mergeCitiesWithCustom([], state);
        setCityOptions(customOnly);
      }
    } catch (error) {
      console.error('BusinessManagement - Error fetching cities by state:', error);
      console.error('BusinessManagement - Error details:', error.response?.data || error.message);
      // Even if API fails, show custom cities
      const customOnly = mergeCitiesWithCustom([], state);
      setCityOptions(customOnly);
    } finally {
      setLoadingCities(false);
    }
  };

  // Function to fetch cities by state for new business
  const fetchCitiesByStateForNewBusiness = async (state) => {
    try {
      if (!getAuthToken() || !isMounted.current) return;
      setLoadingNewBusinessCities(true);

      const response = await businessAPI.getCitiesByState(state);


      if (response.success) {


        // Ensure all cities have proper structure
        const normalizedCities = response.data.cities.map(city => {
          if (typeof city === 'string') {
            return { label: city, value: city };
          } else if (city && city.label && city.value) {
            return city;
          } else if (city && city.label) {
            return { label: city.label, value: city.label };
          } else if (city && city.value) {
            return { label: city.value, value: city.value };
          }
          return null;
        }).filter(Boolean);

        // Merge API cities with custom cities
        const mergedCities = mergeCitiesWithCustom(normalizedCities, state);
        setNewBusinessCityOptions(mergedCities);

      } else {
        console.error('BusinessManagement - New business API returned error:', response.message);
        // Even if API fails, show custom cities
        const customOnly = mergeCitiesWithCustom([], state);
        setNewBusinessCityOptions(customOnly);
      }
    } catch (error) {
      console.error('BusinessManagement - Error fetching cities by state for new business:', error);
      console.error('BusinessManagement - New business error details:', error.response?.data || error.message);
      // Even if API fails, show custom cities
      const customOnly = mergeCitiesWithCustom([], state);
      setNewBusinessCityOptions(customOnly);
    } finally {
      setLoadingNewBusinessCities(false);
    }
  };

  // Function to fetch all cities (without state filter) for new business
  const fetchAllCitiesForNewBusiness = async () => {
    try {
      if (!getAuthToken() || !isMounted.current) return;
      setLoadingNewBusinessCities(true);


      // Fetch cities from all states and combine them
      const allCitiesSet = new Set();

      for (const state of STATE_OPTIONS) {
        try {
          const response = await businessAPI.getCitiesByState(state.id);
          if (response.success && response.data.cities && Array.isArray(response.data.cities)) {
            response.data.cities.forEach(city => {
              // Ensure we're adding strings to the Set
              if (typeof city === 'string') {
                allCitiesSet.add(city);
              } else if (city && city.label) {
                allCitiesSet.add(city.label);
              } else if (city && city.value) {
                allCitiesSet.add(city.value);
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching cities for state ${state.id}:`, error);
        }
      }

      // Convert Set to sorted array
      const cityArray = Array.from(allCitiesSet).sort();

      // Map to city options with proper structure
      const cityOptions = cityArray.map(city => ({
        label: String(city),
        value: String(city)
      }));


      setNewBusinessCityOptions(cityOptions);
    } catch (error) {
      console.error('BusinessManagement - Error fetching all cities:', error);
      setNewBusinessCityOptions([]);
    } finally {
      setLoadingNewBusinessCities(false);
    }
  };

  // Dropdown states for custom dropdowns
  const [dropdowns, setDropdowns] = useState({
    business: false,
    businessType: false,
    state: false,
    industryType: false,
    registrationType: false
  });

  // Handle dropdown toggle
  const toggleDropdown = (dropdownName) => {
    setDropdowns(prev => {
      // Create a new state object with all dropdowns closed first
      const newState = {
        business: false,
        businessType: false,
        state: false,
        industryType: false,
        registrationType: false
      };

      // If the clicked dropdown is currently closed, open it
      // If it's already open, keep it closed (toggle behavior)
      if (!prev[dropdownName]) {
        newState[dropdownName] = true;
      }

      return newState;
    });
  };

  // Handle dropdown selection
  const selectDropdownOption = (dropdownName, value) => {
    if (dropdownName === 'business') {
      handleBusinessChange(value);
    } else if (dropdownName === 'state') {
      handleNewBusinessChange('state', value);
    } else if (dropdownName === 'registrationType') {
      // Correctly map registrationType to businessRegistrationType state key
      setNewBusinessData(prev => ({
        ...prev,
        businessRegistrationType: value
      }));
    } else if (dropdownName === 'businessType' || dropdownName === 'industryType') {
      setNewBusinessData(prev => {
        const newValue = toggleMultiSelect(prev[dropdownName], value);
        const newData = { ...prev, [dropdownName]: newValue };
        validateBusinessField(dropdownName, newValue, newData, true);
        return newData;
      });
      // Don't close dropdown for multi-select
      return;
    } else {
      setNewBusinessData(prev => ({
        ...prev,
        [dropdownName]: value
      }));
    }
    setDropdowns(prev => ({
      ...prev,
      [dropdownName]: false
    }));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown
      const isClickInsideDropdown = event.target.closest('.custom-dropdown') ||
        event.target.closest('[data-dropdown]') ||
        event.target.closest('.dropdown-container') ||
        event.target.closest('.commonDropdown') ||
        event.target.closest('[role="menu"]') ||
        event.target.closest('[aria-haspopup="menu"]');

      if (!isClickInsideDropdown) {
        // Close custom dropdowns
        setDropdowns({
          business: false,
          businessType: false,
          state: false,
          industryType: false,
          registrationType: false
        });

        // Dispatch event to close CommonDropdown components
        document.dispatchEvent(new CustomEvent('closeAllDropdowns'));
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        // Close custom dropdowns
        setDropdowns({
          business: false,
          businessType: false,
          state: false,
          industryType: false,
          registrationType: false
        });

        // Dispatch event to close CommonDropdown components
        document.dispatchEvent(new CustomEvent('closeAllDropdowns'));
      }
    };

    // Add both mousedown and click events for better coverage
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Load businesses from API
  useEffect(() => {
    loadBusinesses();
    loadCustomCities(); // Load custom cities from localStorage
    fetchAllCountries(); // Fetch all countries on mount
    fetchAllCitiesForNewBusiness(); // Load all cities for new business form
  }, []);

  // Check for create parameter to auto-open modal
  useEffect(() => {
    const createParam = searchParams.get('create');
    // Only open modal if not just created a business AND user is admin
    if (createParam === 'true' && !loading && !businessJustCreatedRef.current && isAdminUser()) {
      setShowCreateBusiness(true);
      // Clean up the URL parameter after opening the modal
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      }, { replace: true });
    }
  }, [searchParams, loading, setSearchParams]);


  // Filter country codes for new business phone code dropdown
  const filteredNewBusinessCountryCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(newBusinessPhoneCodeSearchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(newBusinessPhoneCodeSearchTerm.toLowerCase()) ||
    c.dial_code.includes(newBusinessPhoneCodeSearchTerm)
  );

  // Filter country codes for edit business phone code dropdown
  const filteredEditBusinessCountryCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(editBusinessPhoneCodeSearchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(editBusinessPhoneCodeSearchTerm.toLowerCase()) ||
    c.dial_code.includes(editBusinessPhoneCodeSearchTerm)
  );

  // Handle country selection for new business
  const selectNewBusinessCountryOption = (countryName) => {
    setNewBusinessData(prev => ({
      ...prev,
      country: countryName
    }));
    // Clear any existing address errors when country changes
    setNewBusinessErrors(prev => ({
      ...prev,
      pincode: '',
      state: '',
      city: ''
    }));
    setNewBusinessCountrySearchTerm(countryName);
    setNewBusinessDropdowns(prev => ({ ...prev, newBusinessCountry: false }));
    // States will be fetched by useEffect
  };

  // Handle country selection for edit business
  const selectEditBusinessCountryOption = (countryName) => {
    handleInputChange('country', countryName);
    // Clear any existing address errors when country changes
    setBusinessErrors(prev => ({
      ...prev,
      pincode: '',
      state: '',
      city: ''
    }));
    setEditBusinessCountrySearchTerm(countryName);
    setEditBusinessDropdowns(prev => ({ ...prev, editBusinessCountry: false }));
    // States will be fetched by useEffect
  };

  // Handle country code selection for edit business
  const selectEditBusinessPhoneCodeOption = (dialCode) => {
    setBusinessData(prev => ({ ...prev, companyPhoneCode: dialCode }));
    setEditBusinessPhoneCodeSearchTerm("");
    setEditBusinessDropdowns(prev => ({ ...prev, editBusinessPhoneCode: false }));
  };

  // Handle country code selection for new business
  const selectNewBusinessPhoneCodeOption = (dialCode) => {
    setNewBusinessData(prev => ({ ...prev, companyPhoneCode: dialCode }));
    setNewBusinessPhoneCodeSearchTerm("");
    setNewBusinessDropdowns(prev => ({ ...prev, newBusinessPhoneCode: false }));
  };

  // Keyboard navigation for phone code dropdowns
  const handleNewBusinessPhoneCodeKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNewBusinessPhoneCodeHighlightedIndex((prev) =>
        prev < filteredNewBusinessCountryCodes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNewBusinessPhoneCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredNewBusinessCountryCodes.length > 0) {
      e.preventDefault();
      selectNewBusinessPhoneCodeOption(filteredNewBusinessCountryCodes[newBusinessPhoneCodeHighlightedIndex].dial_code);
    } else if (e.key === "Escape") {
      setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessPhoneCode: false }));
    }
  };

  const handleEditBusinessPhoneCodeKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEditBusinessPhoneCodeHighlightedIndex((prev) =>
        prev < filteredEditBusinessCountryCodes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEditBusinessPhoneCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredEditBusinessCountryCodes.length > 0) {
      e.preventDefault();
      selectEditBusinessPhoneCodeOption(filteredEditBusinessCountryCodes[editBusinessPhoneCodeHighlightedIndex].dial_code);
    } else if (e.key === "Escape") {
      setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessPhoneCode: false }));
    }
  };

  // Keyboard navigation for Country dropdowns
  const handleNewBusinessCountryKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNewBusinessCountryHighlightedIndex((prev) =>
        prev < filteredNewBusinessCountries.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNewBusinessCountryHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredNewBusinessCountries.length > 0) {
      e.preventDefault();
      selectNewBusinessCountryOption(filteredNewBusinessCountries[newBusinessCountryHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCountry: false }));
    }
  };

  const handleEditBusinessCountryKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEditBusinessCountryHighlightedIndex((prev) =>
        prev < filteredEditBusinessCountries.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEditBusinessCountryHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && filteredEditBusinessCountries.length > 0) {
      e.preventDefault();
      selectEditBusinessCountryOption(filteredEditBusinessCountries[editBusinessCountryHighlightedIndex].value);
    } else if (e.key === "Escape") {
      setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCountry: false }));
    }
  };

  const loadBusinesses = async () => {
    try {
      if (!getAuthToken() || !isMounted.current) return;
      setLoading(true);
      const response = await businessAPI.getAll();
      if (response.success) {
        if (response.maxBusinesses !== undefined) {
          setMaxBusinesses(response.maxBusinesses);
        }

        if (response.data.length > 0) {
          setBusinesses(response.data);

          // Check for saved business ID or use first business
          const savedBusinessId = localStorage.getItem('selectedBusinessId');
          const businessToSelect = savedBusinessId
            ? response.data.find(b => b.id === parseInt(savedBusinessId))
            : response.data[0];

          if (businessToSelect) {
            setSelectedBusinessId(businessToSelect.id);
            loadBusinessData(businessToSelect);

            // Dispatch event for sidebar to get initial business logo
            const logoUrl = businessToSelect.logo_url || businessToSelect.logoUrl;
            if (logoUrl && logoUrl.startsWith('/uploads/')) {
              const fullLogoUrl = getImageURL(logoUrl);

              window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
                detail: {
                  logoUrl: fullLogoUrl,
                  businessName: businessToSelect.business_name || businessToSelect.name
                }
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      showErrorToast('Failed to load businesses');
    } finally {
      setLoading(false);
      initialDataLoadedRef.current = true;
    }
  };

  // Load saved selected business from localStorage
  useEffect(() => {
    // Listen for business change from ProfileSidebar
    const handleBusinessChanged = (event) => {
      const { businessId } = event.detail;
      setSelectedBusinessId(businessId);
      const business = businesses.find(b => b.id === businessId);
      if (business) {
        loadBusinessData(business);
      }
    };

    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, [businesses]);

  // Load states/cities when business data state changes
  useEffect(() => {
    if (businessData.country) {
      fetchStatesByCountry(businessData.country, false);
    }
  }, [businessData.country]);

  useEffect(() => {
    if (businessData.country && businessData.state) {
      if (businessData.country === 'India') {
        fetchCitiesByState(businessData.state);
      } else {
        fetchCitiesByStateAndCountry(businessData.country, businessData.state, false);
      }
    } else {
      setCityOptions([]);
    }
  }, [businessData.state, businessData.country]);

  // Auto-fetch city/state when pincode changes (Edit Business form)
  useEffect(() => {
    // Skip on initial load or if NOT in edit mode
    if (!initialDataLoadedRef.current || !isEditMode) return;

    const pincode = businessData.pincode?.trim();
    if (pincode && pincode.length >= 3 && !pincodeLoading) {
      const timer = setTimeout(() => {
        fetchCityByPincode(pincode, (businessData.country || '').trim() || 'India');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [businessData.pincode]);

  // Save selected business to localStorage when it changes
  useEffect(() => {
    if (selectedBusinessId && typeof selectedBusinessId !== 'object') {
      localStorage.setItem('selectedBusinessId', selectedBusinessId.toString());
    }
  }, [selectedBusinessId]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      if (signaturePreview && signaturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(signaturePreview);
      }
      if (stampPreview && stampPreview.startsWith('blob:')) {
        URL.revokeObjectURL(stampPreview);
      }
    };
  }, [logoPreview, signaturePreview, stampPreview]);

  // Load states/cities when new business state changes
  useEffect(() => {
    if (newBusinessData.country) {
      fetchStatesByCountry(newBusinessData.country, true);
    }
  }, [newBusinessData.country]);

  useEffect(() => {
    if (newBusinessData.country && newBusinessData.state) {
      if (newBusinessData.country === 'India') {
        fetchCitiesByStateForNewBusiness(newBusinessData.state);
      } else {
        fetchCitiesByStateAndCountry(newBusinessData.country, newBusinessData.state, true);
      }
    } else {
      // If state is cleared, show all cities again (mainly for India default)
      if (newBusinessData.country === 'India') {
        fetchAllCitiesForNewBusiness();
      } else {
        setNewBusinessCityOptions([]);
      }
    }
  }, [newBusinessData.state, newBusinessData.country]);

  // Auto-fetch city/state when pincode changes (Create New Business form)
  useEffect(() => {
    // Skip on initial load
    if (!initialDataLoadedRef.current) return;

    const pincode = newBusinessData.pincode?.trim();
    if (pincode && pincode.length >= 3 && !newBusinessPincodeLoading) {
      const timer = setTimeout(() => {
        fetchCityByPincodeForNewBusiness(pincode, (newBusinessData.country || '').trim() || 'India');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [newBusinessData.pincode]);

  // Filter countries
  const filteredNewBusinessCountries = allCountries.filter((c) => {
    const matchesSearch = c.label.toLowerCase().includes(newBusinessCountrySearchTerm.toLowerCase());
    const isSelected = newBusinessCountrySearchTerm === "" && (c.id === newBusinessData.country || c.label === newBusinessData.country);
    return matchesSearch || isSelected;
  });

  const filteredEditBusinessCountries = allCountries.filter((c) => {
    const matchesSearch = c.label.toLowerCase().includes(editBusinessCountrySearchTerm.toLowerCase());
    const isSelected = editBusinessCountrySearchTerm === "" && (c.id === businessData.country || c.label === businessData.country);
    return matchesSearch || isSelected;
  });

  // Filter states based on search term for new business (must be defined before useEffect)
  const filteredNewBusinessStates = (newBusinessData.country === 'India' ? STATE_OPTIONS : newBusinessStates).filter((state) => {
    const matchesSearch = state.label.toLowerCase().includes(newBusinessStateSearchTerm.toLowerCase());
    const isSelected = newBusinessStateSearchTerm === "" && (state.id === newBusinessData.state || state.label === newBusinessData.state);
    return matchesSearch || isSelected;
  });

  // Filter cities based on search term for new business (must be defined before useEffect)
  const filteredNewBusinessCities = (newBusinessData.country === 'India' ? newBusinessCityOptions : newBusinessCityOptions).filter((city) => {
    // Safety check: ensure city has label property
    if (!city || typeof city.label !== 'string') {
      return false;
    }
    const matchesSearch = city.label.toLowerCase().includes(newBusinessCitySearchTerm.toLowerCase());
    const isSelected = newBusinessCitySearchTerm === "" && (city.value === newBusinessData.city || city.label === newBusinessData.city);
    return matchesSearch || isSelected;
  });

  // Filter states based on search term for edit business (must be defined before useEffect)
  const filteredEditBusinessStates = (businessData.country === 'India' ? STATE_OPTIONS : editBusinessStates).filter((state) => {
    const matchesSearch = state.label.toLowerCase().includes(editBusinessStateSearchTerm.toLowerCase());
    const isSelected = editBusinessStateSearchTerm === "" && (state.id === businessData.state || state.label === businessData.state);
    return matchesSearch || isSelected;
  });

  // Filter cities based on search term for edit business (must be defined before useEffect)
  const filteredEditBusinessCities = (businessData.country === 'India' ? cityOptions : cityOptions).filter((city) => {
    if (!city || typeof city.label !== 'string') {
      return false;
    }
    const matchesSearch = city.label.toLowerCase().includes(editBusinessCitySearchTerm.toLowerCase());
    const isSelected = editBusinessCitySearchTerm === "" && (city.value === businessData.city || city.label === businessData.city);
    return matchesSearch || isSelected;
  });

  // New business dropdown - Reset highlighted index when filtered states change
  useEffect(() => {
    if (filteredNewBusinessStates.length > 0 && newBusinessHighlightedIndex >= filteredNewBusinessStates.length) {
      setNewBusinessHighlightedIndex(0);
    }
  }, [filteredNewBusinessStates.length, newBusinessHighlightedIndex]);

  // New business dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (newBusinessDropdowns.newBusinessState && newBusinessOptionsListRef.current) {
      const highlightedElement = newBusinessOptionsListRef.current.children[newBusinessHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [newBusinessHighlightedIndex, newBusinessDropdowns.newBusinessState]);

  // New business dropdown - Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const stateDropdown = event.target.closest(
        '[data-dropdown="newBusinessState"]'
      );
      if (!stateDropdown && newBusinessDropdowns.newBusinessState) {
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessState: false }));
        // Removed reset of search term to allow manual entry persistence
        setNewBusinessHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [newBusinessDropdowns.newBusinessState]);

  // City dropdown - Reset highlighted index when filtered cities change
  useEffect(() => {
    if (filteredNewBusinessCities.length > 0 && newBusinessCityHighlightedIndex >= filteredNewBusinessCities.length) {
      setNewBusinessCityHighlightedIndex(0);
    }
  }, [filteredNewBusinessCities.length, newBusinessCityHighlightedIndex]);

  // City dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (newBusinessDropdowns.newBusinessCity && newBusinessCityOptionsListRef.current) {
      const highlightedElement = newBusinessCityOptionsListRef.current.children[newBusinessCityHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [newBusinessCityHighlightedIndex, newBusinessDropdowns.newBusinessCity]);

  // New business state dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (newBusinessDropdowns.newBusinessState && newBusinessOptionsListRef.current) {
      const highlightedElement = newBusinessOptionsListRef.current.children[newBusinessHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [newBusinessHighlightedIndex, newBusinessDropdowns.newBusinessState]);

  // New business country dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (newBusinessDropdowns.newBusinessCountry && newBusinessCountryOptionsListRef.current) {
      const highlightedElement = newBusinessCountryOptionsListRef.current.children[newBusinessCountryHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [newBusinessCountryHighlightedIndex, newBusinessDropdowns.newBusinessCountry]);

  // New business phone code dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (newBusinessDropdowns.newBusinessPhoneCode && newBusinessPhoneCodeOptionsListRef.current) {
      const highlightedElement = newBusinessPhoneCodeOptionsListRef.current.children[newBusinessPhoneCodeHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [newBusinessPhoneCodeHighlightedIndex, newBusinessDropdowns.newBusinessPhoneCode]);

  // City dropdown - Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const cityDropdown = event.target.closest(
        '[data-dropdown="newBusinessCity"]'
      );
      if (!cityDropdown && newBusinessDropdowns.newBusinessCity) {
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCity: false }));
        // Removed reset of search term to allow manual entry persistence
        setNewBusinessCityHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [newBusinessDropdowns.newBusinessCity]);

  // Edit business dropdown - Reset highlighted index when filtered states change
  useEffect(() => {
    if (filteredEditBusinessStates.length > 0 && editBusinessHighlightedIndex >= filteredEditBusinessStates.length) {
      setEditBusinessHighlightedIndex(0);
    }
  }, [filteredEditBusinessStates.length, editBusinessHighlightedIndex]);

  // Edit business dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (editBusinessDropdowns.editBusinessState && editBusinessOptionsListRef.current) {
      const highlightedElement = editBusinessOptionsListRef.current.children[editBusinessHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [editBusinessHighlightedIndex, editBusinessDropdowns.editBusinessState]);

  // Edit business dropdown - Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const stateDropdown = event.target.closest(
        '[data-dropdown="editBusinessState"]'
      );
      if (!stateDropdown && editBusinessDropdowns.editBusinessState) {
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessState: false }));
        // Removed reset of search term to allow manual entry persistence
        setEditBusinessHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editBusinessDropdowns.editBusinessState]);

  // Edit business city dropdown - Reset highlighted index when filtered cities change
  useEffect(() => {
    if (filteredEditBusinessCities.length > 0 && editBusinessCityHighlightedIndex >= filteredEditBusinessCities.length) {
      setEditBusinessCityHighlightedIndex(0);
    }
  }, [filteredEditBusinessCities.length, editBusinessCityHighlightedIndex]);

  // Edit business city dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (editBusinessDropdowns.editBusinessCity && editBusinessCityOptionsListRef.current) {
      const highlightedElement = editBusinessCityOptionsListRef.current.children[editBusinessCityHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [editBusinessCityHighlightedIndex, editBusinessDropdowns.editBusinessCity]);

  // Edit business country dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (editBusinessDropdowns.editBusinessCountry && editBusinessCountryOptionsListRef.current) {
      const highlightedElement = editBusinessCountryOptionsListRef.current.children[editBusinessCountryHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [editBusinessCountryHighlightedIndex, editBusinessDropdowns.editBusinessCountry]);

  // Edit business phone code dropdown - Scroll highlighted option into view
  useEffect(() => {
    if (editBusinessDropdowns.editBusinessPhoneCode && editBusinessPhoneCodeOptionsListRef.current) {
      const highlightedElement = editBusinessPhoneCodeOptionsListRef.current.children[editBusinessPhoneCodeHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [editBusinessPhoneCodeHighlightedIndex, editBusinessDropdowns.editBusinessPhoneCode]);

  // Edit business city dropdown - Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const cityDropdown = event.target.closest(
        '[data-dropdown="editBusinessCity"]'
      );
      if (!cityDropdown && editBusinessDropdowns.editBusinessCity) {
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCity: false }));
        // Removed reset of search term to allow manual entry persistence
        setEditBusinessCityHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editBusinessDropdowns.editBusinessCity]);

  // Click outside handler for new business country dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const countryDropdown = event.target.closest(
        '[data-dropdown="newBusinessCountry"]'
      );
      if (!countryDropdown && newBusinessDropdowns.newBusinessCountry) {
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCountry: false }));
        // Manual entry persistence - removed reset of search term
        setNewBusinessCountryHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [newBusinessDropdowns.newBusinessCountry]);

  // Click outside handler for edit business country dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const countryDropdown = event.target.closest(
        '[data-dropdown="editBusinessCountry"]'
      );
      if (!countryDropdown && editBusinessDropdowns.editBusinessCountry) {
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCountry: false }));
        // Manual entry persistence - removed reset of search term
        setEditBusinessCountryHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editBusinessDropdowns.editBusinessCountry]);

  // Click outside handler for new business phone code dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const phoneDropdown = event.target.closest(
        '[data-dropdown="newBusinessPhoneCode"]'
      );
      if (!phoneDropdown && newBusinessDropdowns.newBusinessPhoneCode) {
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessPhoneCode: false }));
        setNewBusinessPhoneCodeSearchTerm("");
        setNewBusinessPhoneCodeHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [newBusinessDropdowns.newBusinessPhoneCode]);

  // Click outside handler for edit business phone code dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const phoneDropdown = event.target.closest(
        '[data-dropdown="editBusinessPhoneCode"]'
      );
      if (!phoneDropdown && editBusinessDropdowns.editBusinessPhoneCode) {
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessPhoneCode: false }));
        setEditBusinessPhoneCodeSearchTerm("");
        setEditBusinessPhoneCodeHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editBusinessDropdowns.editBusinessPhoneCode]);

  const loadBusinessData = (business) => {
    // Only reset verification state if this is a DIFFERENT business than the one currently selected
    // This prevents the "Verified" status from disappearing after a successful save/refresh
    if (business.id !== selectedBusinessId) {
      setEditEmailVerificationState({
        isVerified: !!business.is_email_verified,
        otp: '',
        showOtpInput: false,
        isLoading: false,
        error: '',
        showModal: false
      });
    }



    // 1) Field fallback + trim
    let logoDb = business.logo_url || business.logoUrl || null;


    if (typeof logoDb === 'string') {
      logoDb = logoDb.trim();

    }

    // 2) Handle logo - only support file upload format
    if (logoDb && logoDb.startsWith('/uploads/')) {
      // New file upload format - construct full URL

      const fullLogoUrl = getImageURL(logoDb);
      setLogoPreview(fullLogoUrl);
    } else {
      // No valid logo or legacy format - clear

      setLogoPreview(null);
    }

    // Handle signature - similar to logo
    if (business.signature_url && business.signature_url.startsWith('/uploads/')) {

      const fullSignatureUrl = getImageURL(business.signature_url);
      setSignaturePreview(fullSignatureUrl);
    } else {

      setSignaturePreview(null);
    }

    // Handle stamp - similar to signature
    if (business.stamp_url && business.stamp_url.startsWith('/uploads/')) {

      const fullStampUrl = getImageURL(business.stamp_url);
      setStampPreview(fullStampUrl);
    } else {

      setStampPreview(null);
    }

    // Clear any existing file references when loading data
    setLogoFile(null);
    setSignatureFile(null);
    setStampFile(null);

    // baaki businessData same...
    const phoneValue = business.phone || '';
    let detectedCode = '+91';
    let detectedPhone = phoneValue;

    if (phoneValue.startsWith('+')) {
      // Find the longest matching country code
      const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
      const match = sortedCodes.find(c => phoneValue.startsWith(c.dial_code));
      if (match) {
        detectedCode = match.dial_code;
        detectedPhone = phoneValue.slice(match.dial_code.length);
      }
    }

    const formattedBusiness = {
      ...business,
      businessName: business.business_name || '',
      comment: business.comment || '',
      companyPhone: detectedPhone,
      companyPhoneCode: detectedCode,
      companyEmail: business.email || '',
      billingAddress: business.address || '',
      state: business.state || '',
      country: business.country || 'India',
      pincode: business.postal_code || business.postalCode || '',
      city: business.city || '',
      businessType: businessTypes.some(bt => bt.value === business.business_type) ? (business.business_type || 'Retailer') : 'Other',
      industryType: industryTypes.some(it => it.value === business.industry_type) ? (business.industry_type || 'Other') : 'Other',
      businessRegistrationType: registrationTypes.some(rt => rt.value === business.business_registration_type) ? (business.business_registration_type || 'Private Limited Company') : 'Other',
      isGSTRegistered: !!business.gstin,
      taxType: business.tax_type || (business.gstin ? 'GST' : (business.vat_number || business.vatNumber ? 'VAT' : 'No')),
      gstin: business.gstin || '',
      vatNumber: business.vat_number || business.vatNumber || '',
      panNumber: business.pan || '',
      otherBusinessType: (business.business_type && !businessTypes.some(bt => bt.value === business.business_type))
        ? business.business_type.replace('Other = ', '')
        : '',
      otherIndustryType: (business.industry_type && !industryTypes.some(it => it.value === business.industry_type))
        ? business.industry_type.replace('Other = ', '')
        : '',
      otherRegistrationType: (business.business_registration_type && !registrationTypes.some(rt => rt.value === business.business_registration_type))
        ? business.business_registration_type.replace('Other = ', '')
        : '',
      websites: business.website ? (Array.isArray(business.website) ? business.website : [business.website]) : []
    };


    setBusinessData(formattedBusiness);

    // Proactively fetch states and cities to resolve labels early
    if (formattedBusiness.country) {

      fetchStatesByCountry(formattedBusiness.country, false);
      if (formattedBusiness.state) {
        if (formattedBusiness.country === 'India') {
          fetchCitiesByState(formattedBusiness.state);
        } else {
          fetchCitiesByStateAndCountry(formattedBusiness.country, formattedBusiness.state, false);
        }
      }
    }

    setAdditionalBusinessData({
      msmeNumber: business.msme_number || business.msmeNumber || '',
      cinNumber: business.cin_number || business.cinNumber || '',
      tanNumber: business.tan_number || business.tanNumber || '',
      udyamNumber: business.udyam_number || business.udyamNumber || '',
      importExportCode: business.import_export_code || business.importExportCode || '',
      fssaiNumber: business.fssai_number || business.fssaiNumber || '',
      drugLicenseNumber: business.drug_license_number || business.drugLicenseNumber || '',
      additionalWebsites: []
    });
  };

  const handleBusinessChange = (businessId) => {
    // Close all dropdowns when changing business
    setDropdowns({
      business: false,
      businessType: false,
      state: false,
      industryType: false,
      registrationType: false
    });

    setSelectedBusinessId(businessId);
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      loadBusinessData(business);

      // Construct full logo URL for sidebar
      let fullLogoUrl = null;
      const logoUrl = business.logo_url || business.logoUrl;
      if (logoUrl && logoUrl.startsWith('/uploads/')) {
        const fullLogoUrl = getImageURL(logoUrl);
      }

      // Update localStorage and dispatch event for sidebar
      if (fullLogoUrl) {
        localStorage.setItem('currentBusinessLogo', fullLogoUrl);
      } else {
        localStorage.removeItem('currentBusinessLogo');
      }

      const businessName = business.business_name || business.name;
      if (businessName) {
        localStorage.setItem('currentBusinessName', businessName);
      }

      // Dispatch event to update sidebar immediately
      window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
        detail: {
          logoUrl: fullLogoUrl,
          businessName: businessName
        }
      }));

      // Dispatch event to notify ProfileSidebar about business change
      window.dispatchEvent(new CustomEvent('businessChanged', {
        detail: { businessId: businessId }
      }));
    }
  };
  const handleGstinFetch = async (isEditModeArg = false) => {
    const currentGstin = isEditModeArg ? businessData.gstin : newBusinessData.gstin;
    if (!currentGstin) return;

    setGstinLoading(true);

    try {
      let country_iso = 'IN';
      if (/^[a-zA-Z]{2}/.test(currentGstin)) {
        country_iso = currentGstin.substring(0, 2).toUpperCase();
      }

      const response = await taxAPI.validate(country_iso, currentGstin);

      if (response.success) {
        let countryName = "India";
        if (country_iso !== 'IN') {
          const matchedCountry = countryCodes.find(c => c.code === country_iso);
          countryName = matchedCountry ? matchedCountry.name : country_iso;
        }

        // Normalize state matching for India
        let matchedState = response.state || '';
        if (matchedState && country_iso === 'IN') {
          // Remove state codes (like "08-") if present
          const cleanState = matchedState.replace(/^\d{2}-/, '').trim().toLowerCase();
          const stateOpt = STATE_OPTIONS.find(s =>
            s.label.toLowerCase() === cleanState ||
            s.id.toLowerCase() === cleanState
          );
          if (stateOpt) matchedState = stateOpt.id;
        }

        const dataToUpdate = {
          businessName: response.companyName || response.businessName || '',
          billingAddress: response.address || response.billingAddress || '',
          city: response.city || '',
          state: matchedState,
          pincode: response.pincode || '',
          country: countryName,
          taxType: country_iso === 'IN' ? 'GST' : 'VAT',
          panNumber: response.panNumber || ''
        };

        if (isEditModeArg) {
          setBusinessData(prev => ({
            ...prev,
            ...dataToUpdate,
            businessName: dataToUpdate.businessName || prev.businessName,
            billingAddress: dataToUpdate.billingAddress || prev.billingAddress,
            city: dataToUpdate.city || prev.city,
            state: dataToUpdate.state || prev.state,
            pincode: dataToUpdate.pincode || prev.pincode,
            country: dataToUpdate.country || prev.country,
            panNumber: dataToUpdate.panNumber || prev.panNumber
          }));

          if (dataToUpdate.state) setEditBusinessStateSearchTerm(dataToUpdate.state);
          if (dataToUpdate.city) setEditBusinessCitySearchTerm(dataToUpdate.city);
          if (dataToUpdate.country) setEditBusinessCountrySearchTerm(dataToUpdate.country);

        } else {
          setNewBusinessData(prev => ({
            ...prev,
            ...dataToUpdate,
            businessName: dataToUpdate.businessName || prev.businessName,
            billingAddress: dataToUpdate.billingAddress || prev.billingAddress,
            panNumber: dataToUpdate.panNumber || prev.panNumber
          }));

          if (dataToUpdate.state) setNewBusinessStateSearchTerm(dataToUpdate.state);
          if (dataToUpdate.city) setNewBusinessCitySearchTerm(dataToUpdate.city);
        }

        showSuccessToast(`Details auto-populated!`);
      } else {
        throw new Error(response.message || 'Failed to fetch details');
      }
    } catch (err) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (currentGstin.length !== 15 || !gstinRegex.test(currentGstin)) {
        showErrorToast("Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).");
      } else {
        showErrorToast(err.message || "Failed to fetch Tax ID details.");
      }
    } finally {
      setGstinLoading(false);
    }
  };
  ;

  if (loading) {
    return <MainLoader message="Loading businesses..." />;
  }

  const handleInputChange = (field, value) => {
    // Basic validation handled within state updates or specific blocks

    if (field === 'pincode') {
      const cleanValue = (value || '').trim().slice(0, 10);

      // Clear any pending timeout when user types
      if (pincodeTimeoutRef.current) clearTimeout(pincodeTimeoutRef.current);

      setBusinessData(prev => {
        const newData = {
          ...prev,
          [field]: cleanValue,
          city: cleanValue.length >= 5 ? prev.city : ''
        };
        validateBusinessField(field, cleanValue, newData);
        return newData;
      });

      // Reset manual edit flags when pincode changes so auto-fill works
      if (cleanValue.length > 0) {
        setManualAddressEdits({ city: false, state: false, country: false });
      }

      if (cleanValue.length === 0) {
        setBusinessData(prev => ({ ...prev, city: '', state: '' }));
        setCityOptions([]);
      }
      // NOTE: API call only happens on Enter key press (handleEditPincodeKeyDown)
    } else if (field === 'companyPhone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 20);
      setBusinessData(prev => ({ ...prev, [field]: numericValue }));
    } else if (field === 'panNumber') {
      const maxLen = businessData.taxType === 'VAT' ? 999 : 10;
      const upperValue = value.toUpperCase().slice(0, maxLen);
      setBusinessData(prev => {
        const newData = { ...prev, [field]: upperValue };
        validateBusinessField(field, upperValue, newData);
        return newData;
      });
    } else if (field === 'state') {
      setManualAddressEdits(prev => ({ ...prev, state: true }));
      setBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData);
        return newData;
      });
    } else if (field === 'city') {
      setManualAddressEdits(prev => ({ ...prev, city: true }));
      setBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData);
        return newData;
      });
    } else if (field === 'country') {
      setManualAddressEdits(prev => ({ ...prev, country: true }));
      setBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData);
        return newData;
      });
    } else if (field === 'taxType') {
      setBusinessData(prev => {
        const newData = {
          ...prev,
          [field]: value,
          // Clear GSTIN if not GST, clear VAT if not VAT
          gstin: value === 'GST' ? prev.gstin : '',
          vatNumber: value === 'VAT' ? prev.vatNumber : ''
        };
        validateBusinessField(field, value, newData);
        return newData;
      });
      // Reset verification if switching TO a tax type that requires it
      if (value === 'GST' || value === 'VAT') {
        setEditEmailVerificationState(prev => ({ ...prev, isVerified: false, showOtpInput: false, error: '' }));
      }
    } else if (field === 'businessType' || field === 'industryType') {
      setBusinessData(prev => {
        const newValue = toggleMultiSelect(prev[field], value);
        const newData = { ...prev, [field]: newValue };
        validateBusinessField(field, newValue, newData);
        return newData;
      });
      // Don't close dropdown for multi-select
      return;
    } else {
      setBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData);
        return newData;
      });
    }
  };

  const fetchCityByPincode = async (pincode, country = 'India') => {
    try {
      setPincodeLoading(true);
      const response = await businessAPI.getCityByPincode(pincode, country);


      if (response.success && response.data) {
        const { city, state, country: fetchedCountry } = response.data;

        // Only auto-fill fields that weren't manually edited
        setBusinessData(prev => {
          const updates = {};
          if (!manualAddressEdits.city && city) updates.city = city;
          if (!manualAddressEdits.state && state) updates.state = state;
          if (!manualAddressEdits.country && fetchedCountry) updates.country = fetchedCountry;

          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });

        // Also update city options if they exist and city wasn't manually edited
        if (!manualAddressEdits.city && typeof setBusinessCityOptions === 'function' && city) {
          setBusinessCityOptions(prev => {
            const exists = prev.some(opt => opt.value === city);
            if (!exists) return [{ label: city, value: city }, ...prev];
            return prev;
          });
        }

        // Clear errors if auto-filled
        setBusinessErrors(prev => ({
          ...prev,
          city: '',
          state: '',
          country: '',
          pincode: ''
        }));
      } else {
        showWarningToast('No address found for this pincode. Please enter manually.');
      }
    } catch (error) {
      console.error('BusinessManagement - Error fetching city by pincode:', error);
    } finally {
      setPincodeLoading(false);
    }
  };


  const states = [
    { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
    { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
    { label: 'Assam', value: 'Assam' },
    { label: 'Bihar', value: 'Bihar' },
    { label: 'Chhattisgarh', value: 'Chhattisgarh' },
    { label: 'Goa', value: 'Goa' },
    { label: 'Gujarat', value: 'Gujarat' },
    { label: 'Haryana', value: 'Haryana' },
    { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
    { label: 'Jharkhand', value: 'Jharkhand' },
    { label: 'Karnataka', value: 'Karnataka' },
    { label: 'Kerala', value: 'Kerala' },
    { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
    { label: 'Maharashtra', value: 'Maharashtra' },
    { label: 'Manipur', value: 'Manipur' },
    { label: 'Meghalaya', value: 'Meghalaya' },
    { label: 'Mizoram', value: 'Mizoram' },
    { label: 'Nagaland', value: 'Nagaland' },
    { label: 'Odisha', value: 'Odisha' },
    { label: 'Punjab', value: 'Punjab' },
    { label: 'Rajasthan', value: 'Rajasthan' },
    { label: 'Sikkim', value: 'Sikkim' },
    { label: 'Tamil Nadu', value: 'Tamil Nadu' },
    { label: 'Telangana', value: 'Telangana' },
    { label: 'Tripura', value: 'Tripura' },
    { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
    { label: 'Uttarakhand', value: 'Uttarakhand' },
    { label: 'West Bengal', value: 'West Bengal' },
    { label: 'Andaman and Nicobar Islands', value: 'Andaman and Nicobar Islands' },
    { label: 'Chandigarh', value: 'Chandigarh' },
    { label: 'Dadra and Nagar Haveli and Daman and Diu', value: 'Dadra and Nagar Haveli and Daman and Diu' },
    { label: 'Delhi', value: 'Delhi' },
    { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir' },
    { label: 'Ladakh', value: 'Ladakh' },
    { label: 'Lakshadweep', value: 'Lakshadweep' },
    { label: 'Puducherry', value: 'Puducherry' }
  ];

  const businessOptions = businesses.map(business => ({
    label: business.business_name || business.name,
    value: business.id
  }));

  const handleLogoUpload = (event) => {
    // Check if edit mode is enabled
    if (!isEditMode) {
      showWarningToast('Please click Edit to enable logo upload');
      return;
    }

    const file = event.target.files[0];


    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {

        showErrorToast('Please upload a valid image file (JPG, PNG, GIF, WEBP)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {

        showErrorToast('Image size should be less than 5MB');
        return;
      }

      // Create preview URL for crop modal
      const previewUrl = URL.createObjectURL(file);
      setLogoCropImage(previewUrl);
      setShowLogoCropModal(true);
    }
  };

  const handleLogoCrop = (croppedImage, croppedFile) => {
    setLogoFile(croppedFile);
    setLogoPreview(croppedImage);
    showSuccessToast('Logo cropped! Click Save to apply changes.');
  };

  const handleSignatureUpload = (event) => {
    // Check if edit mode is enabled
    if (!isEditMode) {
      showWarningToast('Please click Edit to enable signature upload');
      return;
    }

    const file = event.target.files[0];


    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {

        showErrorToast('Please upload a valid image file (JPG, PNG, GIF, WEBP)');
        return;
      }

      // Validate file size (max 2MB for signature)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (file.size > maxSize) {

        showErrorToast('Signature size should be less than 2MB');
        return;
      }

      // Clean up previous preview URL to prevent memory leaks
      if (signaturePreview) {
        URL.revokeObjectURL(signaturePreview);
      }

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);

      // Store the file and preview
      setSignatureFile(file);
      setSignaturePreview(previewUrl);

      showSuccessToast('Signature selected! Click Save to apply changes.');
    }
  };

  const handleStampUpload = (event) => {
    // Check if edit mode is enabled
    if (!isEditMode) {
      showWarningToast('Please click Edit to enable stamp upload');
      return;
    }

    const file = event.target.files[0];


    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {

        showErrorToast('Please upload a valid image file (JPG, PNG, GIF, WEBP)');
        return;
      }

      // Validate file size (max 2MB for stamp)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (file.size > maxSize) {
        showErrorToast('Stamp size should be less than 2MB');
        return;
      }

      // Clean up previous preview URL to prevent memory leaks
      if (stampPreview) {
        URL.revokeObjectURL(stampPreview);
      }

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);

      // Store the file and preview
      setStampFile(file);
      setStampPreview(previewUrl);

      showSuccessToast('Stamp selected! Click Save to apply changes.');
    }
  };

  const addWebsite = () => {
    const trimmedWebsite = (newWebsite || '').trim();
    if (trimmedWebsite && !businessData.websites.includes(trimmedWebsite)) {
      setBusinessData(prev => ({
        ...prev,
        websites: [...prev.websites, trimmedWebsite]
      }));
      setNewWebsite('');
    }
  };

  const removeWebsite = (index) => {
    setBusinessData(prev => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (isVerified = false) => {
    // Check if user is admin before allowing save
    if (!isAdminUser()) {
      showErrorToast('Only administrators can save business changes');
      return;
    }

    if (!selectedBusinessId) {
      showErrorToast('No business selected');
      return;
    }

    // Check if email changed and needs verification OR if tax-registered and not verified
    // We check specifically for boolean true to avoid bypassing when receiving an event object
    // if (isVerified !== true) {
    //   const originalBusiness = businesses.find(b => b.id === selectedBusinessId);
    //   if (originalBusiness) {
    //     const origEmail = originalBusiness.email || originalBusiness.company_email || originalBusiness.companyEmail || "";
    //     const isAlreadyVerified = !!originalBusiness.is_email_verified;

    //     // Force verification if:
    //     // 1. The email has changed AND is not verified in current state
    //     // 2. The email is the same but it was NEVER verified in the database AND is not verified in current state
    //     if (businessData.companyEmail !== origEmail) {
    //       if (!editEmailVerificationState.isVerified) {
    //         showErrorToast('Please verify your new email before saving changes');
    //         return;
    //       }
    //     } else if (!isAlreadyVerified && !editEmailVerificationState.isVerified) {
    //       showErrorToast('Please verify your email before saving changes');
    //       return;
    //     }
    //   }
    // }

    // Validate all fields before saving
    const requiredFields = [
      'businessName',
      'companyEmail',
      'companyPhone',
      'pincode',
      'state',
      'city',
      'billingAddress'
    ];
    // Validate PAN number format (optional field but if provided must be valid)
    // Skip PAN validation when VAT is selected
    if (businessData.panNumber?.trim() && businessData.taxType !== 'VAT') {
      const panError = validateBusinessField('panNumber', businessData.panNumber, businessData);
      if (panError) {
        showErrorToast('Invalid PAN number format. Example: ABCDE1234F');
        return;
      }
    }
    if (businessData.taxType === 'GST') {
      requiredFields.push('gstin');
    } else if (businessData.taxType === 'VAT') {
      requiredFields.push('vatNumber');
    }

    const errors = {};
    requiredFields.forEach(field => {
      const error = validateBusinessField(field, businessData[field], businessData);
      if (error) {
        errors[field] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setBusinessErrors(errors);
      const firstError = Object.values(errors)[0];
      showErrorToast(firstError || 'Please fix the errors in the form');
      return;
    }

    // Close all dropdowns when saving
    setDropdowns({
      business: false,
      businessType: false,
      state: false,
      industryType: false,
      registrationType: false
    });

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Add business data
      formData.append('businessName', businessData.businessName);
      formData.append('comment', businessData.comment || '');

      const formatMultiValue = (val, otherVal) => {
        if (!val) return '';
        return val.split(', ').map(v => v === 'Other' ? (otherVal ? `Other = ${otherVal}` : 'Other') : v).join(', ');
      };

      formData.append('businessType', formatMultiValue(businessData.businessType, businessData.otherBusinessType));
      formData.append('industryType', formatMultiValue(businessData.industryType, businessData.otherIndustryType));
      formData.append('businessRegistrationType', businessData.businessRegistrationType === 'Other' ? (businessData.otherRegistrationType ? `Other = ${businessData.otherRegistrationType}` : 'Other') : businessData.businessRegistrationType);
      formData.append('email', businessData.companyEmail);
      formData.append('phone', (businessData.companyPhoneCode || '') + (businessData.companyPhone || ''));
      formData.append('address', businessData.billingAddress);
      formData.append('city', businessData.city);
      formData.append('state', businessData.state);
      formData.append('country', businessData.country);
      formData.append('postalCode', businessData.pincode);
      formData.append('gstin', (businessData.taxType === 'GST' ? businessData.gstin : ''));
      formData.append('vatNumber', (businessData.taxType === 'VAT' ? businessData.vatNumber : ''));
      formData.append('pan', businessData.panNumber || '');
      formData.append('website', businessData.websites[0] || '');
      formData.append('taxType', businessData.taxType || 'No');


      // Add additional business details (use snake_case to match backend field mappings)

      formData.append('msme_number', additionalBusinessData.msmeNumber || '');
      formData.append('cin_number', additionalBusinessData.cinNumber || '');
      formData.append('tan_number', additionalBusinessData.tanNumber || '');
      formData.append('udyam_number', additionalBusinessData.udyamNumber || '');
      formData.append('import_export_code', additionalBusinessData.importExportCode || '');
      formData.append('fssai_number', additionalBusinessData.fssaiNumber || '');
      formData.append('drug_license_number', additionalBusinessData.drugLicenseNumber || '');
      formData.append('is_email_verified', editEmailVerificationState.isVerified ? 1 : 0);
      // Logo, signature, and stamp files follow...
      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (!logoPreview) {
        // Signal removal if logoFile is null and logoPreview is null
        formData.append('logo_url', '');
      }

      // Add signature file if exists
      if (signatureFile) {
        formData.append('signature', signatureFile);
      } else if (!signaturePreview) {
        // Signal removal if signatureFile is null and signaturePreview is null
        formData.append('signature_url', '');
      }

      // Add stamp file if exists
      if (stampFile) {
        formData.append('stamp', stampFile);
      } else if (!stampPreview) {
        // Signal removal if stampFile is null and stampPreview is null
        formData.append('stamp_url', '');
      }


      const response = await businessAPI.updateWithFile(selectedBusinessId, formData);


      if (response.success) {
        showSuccessToast('Business settings saved successfully!');

        // Clean up the file reference and preview URL after successful save
        if (logoFile) {
          if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
          }
          setLogoFile(null);
        }

        // Construct full logo URL for sidebar - handle both snake_case and camelCase
        let fullLogoUrl = null;
        const logoUrl = response.data.logo_url || response.data.logoUrl;
        if (logoUrl && logoUrl.startsWith('/uploads/')) {
          fullLogoUrl = getImageURL(logoUrl);
        }

        // Dispatch custom event to update logo across the app
        window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
          detail: {
            businessId: selectedBusinessId,
            logoUrl: fullLogoUrl,
            businessName: businessData.businessName
          }
        }));

        // Dispatch event to notify the application about business change
        window.dispatchEvent(new CustomEvent('businessChanged', {
          detail: { businessId: selectedBusinessId }
        }));

        // Update localStorage for immediate effect - save FULL HTTP URL
        if (fullLogoUrl) {
          localStorage.setItem('currentBusinessLogo', fullLogoUrl);
        } else {
          localStorage.removeItem('currentBusinessLogo');
        }
        localStorage.setItem('currentBusinessName', businessData.businessName);

        // Exit edit mode immediately after successful save 
        // This prevents the pincode auto-fill effect from triggering when data reloads
        setIsEditMode(false);

        // Reload businesses to get updated data
        await loadBusinesses();
      }
    } catch (error) {
      console.error('Error saving business:', error);
      showErrorToast(error.message || 'Failed to save business settings. Please try again.');
    }
  };

  const handleCancel = () => {
    // Check if user is admin before allowing cancel (though this should not be accessible to sub-users)
    if (!isAdminUser()) {
      showErrorToast('Only administrators can cancel edit mode');
      return;
    }

    // Close all dropdowns when cancelling edit
    setDropdowns({
      business: false,
      businessType: false,
      state: false,
      industryType: false,
      registrationType: false
    });

    // Reload business data to discard changes
    if (selectedBusinessId) {
      const business = businesses.find(b => b.id === selectedBusinessId);
      if (business) {
        loadBusinessData(business);
      }
    }
    setIsEditMode(false);
    showWarningToast('Changes cancelled');
  };

  const handleEdit = () => {
    if (isPlanExpired) {
      checkPlanExpiry();
      return;
    }
    // Check if user is admin before allowing edit mode
    if (!isAdminUser()) {
      showErrorToast('Only administrators can edit business details');
      return;
    }

    // Close all dropdowns when entering edit mode
    setDropdowns({
      business: false,
      businessType: false,
      state: false,
      industryType: false,
      registrationType: false
    });

    setIsEditMode(true);
  };

  const handleDeleteBusiness = async () => {
    if (isPlanExpired) {
      checkPlanExpiry();
      return;
    }

    if (!selectedBusinessId) {
      showErrorToast("No business selected");
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBusiness = async () => {
    try {
      if (!selectedBusinessId) {
        throw new Error('No business selected');
      }

      // Close modal immediately and show loader
      setIsDeleteModalOpen(false);
      setIsDeleting(true);

      // Artificial delay to ensure loader is visible and provide a premium feel
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await businessAPI.delete(selectedBusinessId);

      if (response.success) {
        // Exit edit mode immediately
        setIsEditMode(false);

        // Update state manually to remove the deleted business from UI
        const updatedBusinesses = businesses.filter(b => b.id !== selectedBusinessId);
        setBusinesses(updatedBusinesses);

        // Clear localStorage and dispatch events
        localStorage.removeItem('selectedBusinessId');
        localStorage.removeItem('currentBusinessLogo');
        localStorage.removeItem('currentBusinessName');

        // Dispatch events to notify the app
        window.dispatchEvent(new CustomEvent('businessDeleted', {
          detail: { deletedBusinessId: selectedBusinessId }
        }));

        window.dispatchEvent(new CustomEvent('businessChanged', {
          detail: { businessId: null }
        }));

        // If there are remaining businesses, select the first one
        if (updatedBusinesses.length > 0) {
          const firstBusiness = updatedBusinesses[0];
          setSelectedBusinessId(firstBusiness.id);
          loadBusinessData(firstBusiness);
          localStorage.setItem('selectedBusinessId', firstBusiness.id.toString());

          // Update header/sidebar with new business logo
          const logoUrl = firstBusiness.logo_url || firstBusiness.logoUrl;
          if (logoUrl && logoUrl.startsWith('/uploads/')) {
            const fullLogoUrl = getImageURL(logoUrl);
            localStorage.setItem('currentBusinessLogo', fullLogoUrl);
            window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
              detail: {
                logoUrl: fullLogoUrl,
                businessName: firstBusiness.business_name || firstBusiness.name
              }
            }));
          }
        } else {
          // If no businesses left, clear data
          setSelectedBusinessId(null);
          setBusinessData({
            businessName: '',
            companyPhone: '',
            companyEmail: '',
            billingAddress: '',
            state: '',
            pincode: '',
            city: '',
            businessType: '',
            industryType: '',
            businessRegistrationType: '',
            isGSTRegistered: false,
            taxType: 'No',
            gstin: '',
            vatNumber: '',
            enableEInvoicing: false,
            panNumber: '',
            enableTDS: false,
            enableTCS: false,
            websites: []
          });
          setLogoPreview(null);
          setSignaturePreview(null);
          setStampPreview(null);
        }

        showSuccessToast('Business deleted successfully!');
      } else {
        showErrorToast(response.message || 'Failed to delete business');
      }
    } catch (error) {
      console.error('Error deleting business:', error);
      showErrorToast('Failed to delete business. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNewBusinessChange = (field, value) => {
    // Basic validation handled within state updates or specific blocks

    if (field === 'pincode') {
      const cleanValue = (value || '').trim().slice(0, 10);

      // Clear any pending timeout when user types
      if (newBusinessPincodeTimeoutRef.current) clearTimeout(newBusinessPincodeTimeoutRef.current);

      setNewBusinessData(prev => {
        const newData = {
          ...prev,
          [field]: cleanValue,
          city: cleanValue.length >= 5 ? prev.city : ''
        };
        validateBusinessField(field, cleanValue, newData, true);
        return newData;
      });

      if (cleanValue.length === 0) {
        setNewBusinessCityOptions([]);
        setNewBusinessData(prev => ({ ...prev, city: '', state: '' }));
      }
      // Reset manual edit flags when pincode changes so auto-fill works
      if (cleanValue.length > 0) {
        setNewBusinessManualAddressEdits({ city: false, state: false, country: false });
      }
      // NOTE: API call only happens on Enter key press (handleNewBusinessPincodeKeyDown)
    } else if (field === 'companyPhone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 20);
      setNewBusinessData(prev => ({ ...prev, [field]: numericValue }));
    } else if (field === 'panNumber') {
      const maxLen = newBusinessData.taxType === 'VAT' ? 999 : 10;
      const upperValue = value.toUpperCase().slice(0, maxLen);
      setNewBusinessData(prev => {
        const newData = { ...prev, [field]: upperValue };
        validateBusinessField(field, upperValue, newData, true);
        return newData;
      });
    } else if (field === 'state') {
      setNewBusinessManualAddressEdits(prev => ({ ...prev, state: true }));
      setNewBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData, true);
        return newData;
      });
    } else if (field === 'city') {
      setNewBusinessManualAddressEdits(prev => ({ ...prev, city: true }));
      setNewBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData, true);
        return newData;
      });
    } else if (field === 'country') {
      setNewBusinessManualAddressEdits(prev => ({ ...prev, country: true }));
      setNewBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData, true);
        return newData;
      });
    } else if (field === 'taxType') {
      setNewBusinessData(prev => {
        const newData = {
          ...prev,
          [field]: value,
          // Clear GSTIN if not GST, clear VAT if not VAT
          gstin: value === 'GST' ? prev.gstin : '',
          vatNumber: value === 'VAT' ? prev.vatNumber : ''
        };
        validateBusinessField(field, value, newData, true);
        return newData;
      });
      // Reset verification if switching TO a tax type that requires it
      if (value === 'GST' || value === 'VAT') {
        setEmailVerificationState(prev => ({ ...prev, isVerified: false, showOtpInput: false, error: '' }));
      }
    } else if (field === 'registrationType') {
      setNewBusinessData(prev => {
        const newData = { ...prev, businessRegistrationType: value };
        return newData;
      });
    } else {
      setNewBusinessData(prev => {
        const newData = { ...prev, [field]: value };
        validateBusinessField(field, value, newData, true);
        return newData;
      });
    }
  };

  const fetchCityByPincodeForNewBusiness = async (pincode, country = 'India') => {
    try {
      setNewBusinessPincodeLoading(true);
      const response = await businessAPI.getCityByPincode(pincode, country);


      if (response.success && response.data) {
        const { city, state, country: fetchedCountry } = response.data;


        // Only auto-fill city options if city wasn't manually edited
        if (!newBusinessManualAddressEdits.city && city) {
          setNewBusinessCityOptions(prev => {
            const exists = prev.some(opt => opt.value === city);
            if (!exists) {
              return [{ label: city, value: city }, ...prev];
            }
            return prev;
          });
        }

        setNewBusinessData(prev => {
          const updates = {};
          if (!newBusinessManualAddressEdits.city && city) updates.city = city;
          if (!newBusinessManualAddressEdits.state && state) updates.state = state;
          if (!newBusinessManualAddressEdits.country && fetchedCountry) updates.country = fetchedCountry;

          const newData = Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;

          // Clear errors for auto-filled fields
          setNewBusinessErrors(prevErrors => ({
            ...prevErrors,
            city: '',
            state: '',
            country: '',
            pincode: ''
          }));
          return newData;
        });
      } else {
        showWarningToast('No address found for this pincode. Please enter manually.');
      }
    } catch (error) {
      console.error('BusinessManagement - Error fetching city by pincode:', error);
    } finally {
      setNewBusinessPincodeLoading(false);
    }
  };

  // ── Enter key handlers for Pincode fields ──────────────────────────────────

  // Edit Business pincode: Enter press → API call
  const handleEditPincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const pincode = businessData.pincode?.trim();
      if (pincode && pincode.length >= 3) {
        fetchCityByPincode(pincode, (businessData.country || '').trim() || 'India');
      }
    }
  };

  // New Business pincode: Enter press → API call
  const handleNewBusinessPincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const pincode = newBusinessData.pincode?.trim();
      if (pincode && pincode.length >= 3) {
        fetchCityByPincodeForNewBusiness(pincode, (newBusinessData.country || '').trim() || 'India');
      }
    }
  };

  // ── End pincode key handlers ───────────────────────────────────────────────

  // Custom dropdown handlers for "Create New Business" form
  const selectNewBusinessDropdownOption = (key, value) => {
    if (key === 'state') {
      handleNewBusinessChange('state', value);
      setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessState: false }));
    } else {
      setNewBusinessData((prev) => ({ ...prev, [key]: value }));
      setNewBusinessDropdowns((prev) => ({ ...prev, [key]: false }));
    }

    // Sync search term with selected label
    const selectedState = (newBusinessData.country === 'India' ? STATE_OPTIONS : newBusinessStates).find(s => s.id === value);
    if (selectedState) {
      setNewBusinessStateSearchTerm(selectedState.label);
    }

    setNewBusinessHighlightedIndex(0);
  };

  // Handle keyboard navigation for new business state dropdown
  const handleNewBusinessKeyDown = (e) => {
    if (!newBusinessDropdowns.newBusinessState || filteredNewBusinessStates.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setNewBusinessHighlightedIndex((prev) =>
          prev < filteredNewBusinessStates.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setNewBusinessHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredNewBusinessStates[newBusinessHighlightedIndex]) {
          selectNewBusinessDropdownOption("state", filteredNewBusinessStates[newBusinessHighlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessState: false }));
        setNewBusinessStateSearchTerm("");
        setNewBusinessHighlightedIndex(0);
        break;
      default:
        break;
    }
  };

  // City dropdown handlers
  const selectNewBusinessCityDropdownOption = (value) => {
    setNewBusinessData((prev) => ({ ...prev, city: value }));
    setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCity: false }));

    // Sync search term with selected value
    setNewBusinessCitySearchTerm(value);

    setNewBusinessCityHighlightedIndex(0);
  };

  // Handle keyboard navigation for new business city dropdown
  const handleNewBusinessCityKeyDown = (e) => {
    if (!newBusinessDropdowns.newBusinessCity || filteredNewBusinessCities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setNewBusinessCityHighlightedIndex((prev) =>
          prev < filteredNewBusinessCities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setNewBusinessCityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredNewBusinessCities[newBusinessCityHighlightedIndex]) {
          selectNewBusinessCityDropdownOption(filteredNewBusinessCities[newBusinessCityHighlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCity: false }));
        // Removed reset of search term
        setNewBusinessCityHighlightedIndex(0);
        break;
      default:
        break;
    }
  };

  // Custom dropdown handlers for "Edit Business" form (main form)
  const selectEditBusinessDropdownOption = (key, value) => {
    handleInputChange(key, value);
    setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessState: false }));

    // Sync search term with selected label
    const selectedState = (businessData.country === 'India' ? STATE_OPTIONS : editBusinessStates).find(s => s.id === value);
    if (selectedState) {
      setEditBusinessStateSearchTerm(selectedState.label);
    }

    setEditBusinessHighlightedIndex(0);
  };

  // Handle keyboard navigation for edit business state dropdown
  const handleEditBusinessKeyDown = (e) => {
    if (!editBusinessDropdowns.editBusinessState || filteredEditBusinessStates.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setEditBusinessHighlightedIndex((prev) =>
          prev < filteredEditBusinessStates.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setEditBusinessHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredEditBusinessStates[editBusinessHighlightedIndex]) {
          selectEditBusinessDropdownOption("state", filteredEditBusinessStates[editBusinessHighlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessState: false }));
        setEditBusinessStateSearchTerm("");
        setEditBusinessHighlightedIndex(0);
        break;
      default:
        break;
    }
  };

  // City dropdown handlers for edit business
  const selectEditBusinessCityDropdownOption = (value) => {
    handleInputChange('city', value);
    setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCity: false }));

    // Sync search term with selected value
    setEditBusinessCitySearchTerm(value);

    setEditBusinessCityHighlightedIndex(0);
  };

  // Handle keyboard navigation for edit business city dropdown
  const handleEditBusinessCityKeyDown = (e) => {
    if (!editBusinessDropdowns.editBusinessCity || filteredEditBusinessCities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setEditBusinessCityHighlightedIndex((prev) =>
          prev < filteredEditBusinessCities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setEditBusinessCityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredEditBusinessCities[editBusinessCityHighlightedIndex]) {
          selectEditBusinessCityDropdownOption(filteredEditBusinessCities[editBusinessCityHighlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCity: false }));
        // Removed reset of search term
        setEditBusinessCityHighlightedIndex(0);
        break;
      default:
        break;
    }
  };

  const handleEditGSTFetch = async () => {
    const taxId = businessData.taxType === 'GST' ? businessData.gstin : businessData.vatNumber;
    const countryName = businessData.country || 'India';

    if (!taxId || taxId.length < 5) {
      showErrorToast(`Please enter a valid ${businessData.taxType === 'GST' ? 'GSTIN' : 'VAT number'}`);
      return;
    }

    try {
      setGstinLoading(true);
      const response = await taxAPI.fetchDetails(taxId, countryName);

      if (response.success && response.data) {
        const { businessName, billingAddress, state, city, pincode } = response.data;

        setBusinessData(prev => ({
          ...prev,
          businessName: businessName || prev.businessName,
          billingAddress: billingAddress || prev.billingAddress,
          state: state || prev.state,
          city: city || prev.city,
          pincode: pincode || prev.pincode
        }));

        showSuccessToast(`Details auto-populated for ${countryName} Tax ID!`);
      } else {
        throw new Error(response.message || 'Failed to fetch Tax ID details');
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to fetch details.");
    } finally {
      setGstinLoading(false);
    }
  };

  // Email verification functions for Create New Business
  const handleSendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      setEmailVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));

      const response = await fetch(`${getApiConfig().backendURL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newBusinessData.companyEmail,
          gstin: newBusinessData.gstin,
          vatNumber: newBusinessData.vatNumber,
          purpose: 'business_verification'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      setEmailVerificationState(prev => ({
        ...prev,
        showOtpInput: true,
        isLoading: false,
        error: ''
      }));
      setResendTimer(60);
      showSuccessToast('OTP sent to your email');
    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.response?.status === 429 || error.message?.includes('wait')) {
        const waitSecs = error.response?.data?.waitSeconds || parseInt(error.message?.match(/\d+/)?.[0]) || 60;
        setResendTimer(waitSecs);
        setEmailVerificationState(prev => ({ ...prev, isLoading: false, error: '' }));
      } else {
        setEmailVerificationState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to send OTP. Please try again.'
        }));
        showErrorToast(error.message || 'Failed to send OTP');
      }
    }
  };

  // const handleVerifyOTP = async () => {
  //   try {
  //     if (!emailVerificationState.otp.trim()) {
  //       setEmailVerificationState(prev => ({ ...prev, error: 'Please enter OTP' }));
  //       return;
  //     }

  //     setEmailVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));

  //     const response = await authAPI.verifyOTP({
  //       email: newBusinessData.companyEmail,
  //       otp: emailVerificationState.otp,
  //       purpose: 'business_verification'
  //     });

  //     if (!response.success) throw new Error(response.message || 'Invalid OTP');

  //     setEmailVerificationState(prev => ({
  //       ...prev,
  //       isVerified: true,
  //       isLoading: false,
  //       error: '',
  //       showOtpInput: false,
  //       otp: ''
  //     }));
  //     showSuccessToast('Email verified successfully');
  //   } catch (error) {
  //     setEmailVerificationState(prev => ({
  //       ...prev,
  //       isLoading: false,
  //       error: error.message || 'Invalid OTP. Please try again.'
  //     }));
  //     showErrorToast(error.message || 'Invalid OTP');
  //   }
  // };

  // Email verification functions for Edit Business
  const handleEditSendOTP = async () => {
    if (editResendTimer > 0) return;
    try {
      setEditEmailVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));

      const response = await authAPI.sendOTP({
        email: businessData.companyEmail,
        gstin: businessData.gstin,
        vatNumber: businessData.vatNumber,
        purpose: 'business_verification'
      });

      if (!response.success) throw new Error(response.message || 'Failed to send OTP');

      setEditEmailVerificationState(prev => ({
        ...prev,
        showOtpInput: true,
        isLoading: false,
        error: ''
      }));
      setEditResendTimer(60);
      showSuccessToast('OTP sent to your email');
    } catch (error) {
      if (error.response?.status === 429) {
        const waitSecs = error.response?.data?.waitSeconds || 60;
        setEditResendTimer(waitSecs);
        setEditEmailVerificationState(prev => ({ ...prev, isLoading: false, error: '' }));
      } else {
        setEditEmailVerificationState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to send OTP. Please try again.'
        }));
        showErrorToast(error.message || 'Failed to send OTP');
      }
    }
  };

  const handleEditVerifyOTP = async () => {
    try {
      if (!editEmailVerificationState.otp?.trim()) {
        setEditEmailVerificationState(prev => ({ ...prev, error: 'Please enter OTP' }));
        return;
      }

      setEditEmailVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));

      const response = await authAPI.verifyOTP({
        email: businessData.companyEmail,
        otp: editEmailVerificationState.otp,
        purpose: 'business_verification'
      });

      if (!response.success) throw new Error(response.message || 'Invalid OTP');

      setEditEmailVerificationState(prev => ({
        ...prev,
        isVerified: true,
        isLoading: false,
        error: '',
        showOtpInput: false,
        showModal: false,
        otp: ''
      }));
      showSuccessToast('Email verified successfully! You can now save changes.');
    } catch (error) {
      setEditEmailVerificationState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Invalid OTP. Please try again.'
      }));
      showErrorToast(error.message || 'Invalid OTP');
    }
  };

  // Render Email Verification Modal
  const renderEmailVerificationModal = () => {
    const isCreateMode = emailVerificationState.showOtpInput;
    const isEditMode = editEmailVerificationState.showOtpInput;

    if (!isCreateMode && !isEditMode) return null;

    const state = isCreateMode ? emailVerificationState : editEmailVerificationState;
    const setState = isCreateMode ? setEmailVerificationState : setEditEmailVerificationState;
    const verifyHandler = isCreateMode ? handleVerifyOTP : handleEditVerifyOTP;
    const resendHandler = isCreateMode ? handleSendOTP : handleEditSendOTP;
    const email = isCreateMode ? newBusinessData.companyEmail : businessData.companyEmail;

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[1100] p-4 transition-all duration-300">
        <div
          className="bg-white rounded-2xl w-full max-w-[480px] shadow-xl animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Compact */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#129046] rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Verify Email</h2>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, showOtpInput: false, otp: '' }))}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center pb-1">
              <p className="text-sm text-gray-500">OTP sent to: <span className="font-bold text-gray-800 underline decoration-[#129046]/30 decoration-2 underline-offset-4">{email}</span></p>
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <input
                  type="text"
                  value={state.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setState(prev => ({ ...prev, otp: value, error: '' }));
                  }}
                  autoFocus
                  placeholder="Enter 6-digit OTP"
                  className="w-full pl-6 pr-32 py-2 bg-gray-50 border-2 border-[#129046]/30 rounded-xl text-xl font-bold tracking-[0.2em] focus:bg-white focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/5 outline-none transition-all duration-300 placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
                />

                <button
                  onClick={verifyHandler}
                  disabled={state.isLoading || state.otp.length !== 6}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {state.isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Verify</span>
                  )}
                </button>
              </div>

              {state.error && (
                <p className="text-[11px] text-red-500 font-bold ml-1 flex items-center gap-1 transition-all">
                  <X size={12} /> {state.error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secure Verify</p>
              <div className="flex items-center gap-2">
                {(isCreateMode ? resendTimer > 0 : editResendTimer > 0) && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#129046]/10 text-[#129046] rounded-lg text-[12px] font-black border border-[#129046]/20 shadow-sm animate-pulse">
                    0:{(isCreateMode ? resendTimer : editResendTimer) < 10 ? `0${isCreateMode ? resendTimer : editResendTimer}` : (isCreateMode ? resendTimer : editResendTimer)}
                  </span>
                )}
                <button
                  onClick={resendHandler}
                  disabled={state.isLoading || (isCreateMode ? resendTimer > 0 : editResendTimer > 0)}
                  className={`text-[11px] font-bold transition-all px-3 py-1.5 rounded-lg ${(isCreateMode ? resendTimer > 0 : editResendTimer > 0)
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100"
                    : "bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white shadow-sm hover:shadow-md active:scale-95"
                    }`}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const handleCreateBusiness = async () => {
    // Close all dropdowns when creating business
    setDropdowns({
      business: false,
      businessType: false,
      state: false,
      industryType: false,
      registrationType: false
    });

    // Validate all fields before submission
    const requiredFields = [
      'businessName',
      'companyEmail',
      'companyPhone',
      'pincode',
      'state',
      'city',
      'billingAddress'
    ];
    if (newBusinessData.taxType === 'GST') {
      requiredFields.push('gstin');
    } else if (newBusinessData.taxType === 'VAT') {
      requiredFields.push('vatNumber');
    }

    // Validate PAN number format (optional field but if provided must be valid)
    if (newBusinessData.panNumber?.trim() && newBusinessData.taxType !== 'VAT') {
      const panError = validateBusinessField('panNumber', newBusinessData.panNumber, newBusinessData, true);
      if (panError) {
        showErrorToast('Invalid PAN number format. Example: ABCDE1234F');
        return;
      }
    }

    const errors = {};
    let firstErrorField = null;

    requiredFields.forEach(field => {
      const error = validateBusinessField(field, newBusinessData[field], newBusinessData, true);
      if (error) {
        errors[field] = error;
        if (!firstErrorField) firstErrorField = field;
      }
    });

    if (Object.keys(errors).length > 0) {
      setNewBusinessErrors(errors);
      const firstError = Object.values(errors)[0];
      showErrorToast(firstError || 'Please fix the error in the form');
      return;
    }

    // Check if email is verified
    // if (!emailVerificationState.isVerified) {
    //   showErrorToast('Please verify your email before creating business');
    //   return;
    // }

    try {
      const formatMultiValue = (val, otherVal) => {
        if (!val) return '';
        return val.split(', ').map(v => v === 'Other' ? (otherVal ? `Other = ${otherVal}` : 'Other') : v).join(', ');
      };

      const createData = {
        businessName: newBusinessData.businessName,
        comment: newBusinessData.comment || null,
        businessType: formatMultiValue(newBusinessData.businessType, newBusinessData.newOtherBusinessType),
        industryType: formatMultiValue(newBusinessData.industryType, newBusinessData.newOtherIndustryType),
        businessRegistrationType: newBusinessData.businessRegistrationType === 'Other' ? (newBusinessData.newOtherRegistrationType ? `Other = ${newBusinessData.newOtherRegistrationType}` : 'Other') : newBusinessData.businessRegistrationType,
        email: newBusinessData.companyEmail,
        phone: (newBusinessData.companyPhoneCode || '') + (newBusinessData.companyPhone || null),
        address: newBusinessData.billingAddress || null,
        city: newBusinessData.city || null,
        state: newBusinessData.state,
        country: newBusinessData.country,
        postalCode: newBusinessData.pincode || null,
        gstin: (newBusinessData.taxType === 'GST' ? newBusinessData.gstin : null),
        vatNumber: (newBusinessData.taxType === 'VAT' ? newBusinessData.vatNumber : null),
        pan: newBusinessData.panNumber || null,
        website: null,
        logoUrl: null,
        is_email_verified: true,
        taxType: newBusinessData.taxType || 'No'
      };

      const response = await businessAPI.create(createData);
      if (response.success) {
        // Set flag to prevent modal from reopening
        businessJustCreatedRef.current = true;

        // Close modal immediately
        setShowCreateBusiness(false);

        showSuccessToast('Business created successfully!');

        // Reset form
        setNewBusinessData({
          businessName: '',
          companyPhone: '',
          companyEmail: '',
          billingAddress: '',
          state: '',
          pincode: '',
          city: '',
          businessType: '',
          industryType: '',
          businessRegistrationType: '',
          isGSTRegistered: false,
          taxType: 'No',
          gstin: '',
          vatNumber: '',
          enableEInvoicing: false,
          panNumber: '',
          enableTDS: false,
          enableTCS: false,
          newOtherBusinessType: '',
          newOtherIndustryType: '',
          newOtherRegistrationType: '',
          companyPhoneCode: '+91'
        });

        // Reload businesses and select the new one
        const newBusiness = response.data;
        setSelectedBusinessId(newBusiness.id);
        localStorage.setItem('selectedBusinessId', newBusiness.id.toString());

        // Load the new business data immediately instead of waiting for list re-fetch
        loadBusinessData(newBusiness);

        await loadBusinesses();

        // Dispatch event to notify ProfileSidebar and Main App about new business
        window.dispatchEvent(new CustomEvent('businessCreated', {
          detail: { businessId: response.data.id }
        }));

        window.dispatchEvent(new CustomEvent('businessChanged', {
          detail: { businessId: response.data.id }
        }));

        // Reset flag after a delay
        setTimeout(() => {
          businessJustCreatedRef.current = false;
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating business:', error);
      showErrorToast(error.message || 'Failed to create business. Please try again.');
    }
  };

  const renderCreateBusinessModal = () => {
    if (!showCreateBusiness) return null;
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[900] p-4"
        onClick={(e) => {
          // Close dropdowns when clicking on modal backdrop
          if (e.target === e.currentTarget) {
            setDropdowns({
              business: false,
              businessType: false,
              state: false,
              industryType: false,
              registrationType: false
            });
          }
        }}
      >
        <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-white">Create New Business</h2>
            <button
              onClick={() => {
                setShowCreateBusiness(false);
                resetNewBusinessForm();
                // Reset email verification state
                setEmailVerificationState({
                  isVerified: false,
                  otp: '',
                  showOtpInput: false,
                  isLoading: false,
                  error: ''
                });
                // Close all dropdowns when modal is closed
                setDropdowns({
                  business: false,
                  businessType: false,
                  state: false,
                  industryType: false,
                  registrationType: false
                });
              }}
              className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-8">
              {/* GST Information Section - Grid Layout */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-full"></div>
                  GST or VAT Information
                </h3>

                {/* Grid Layout: 1 row with 4 and 8 column spans */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Tax Type Selection (4/12 width) */}
                  <div className="lg:col-span-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Tax Type
                    </label>

                    <div className="flex items-center gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="taxType"
                          value="No"
                          checked={newBusinessData.taxType === 'No'}
                          onChange={() => handleNewBusinessChange('taxType', 'No')}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">No</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="taxType"
                          value="GST"
                          checked={newBusinessData.taxType === 'GST'}
                          onChange={() => handleNewBusinessChange('taxType', 'GST')}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">GST</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="taxType"
                          value="VAT"
                          checked={newBusinessData.taxType === 'VAT'}
                          onChange={() => handleNewBusinessChange('taxType', 'VAT')}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">VAT</span>
                      </label>
                    </div>

                    <p className="text-xs text-gray-500">
                      Select your tax registration type
                    </p>
                  </div>

                  {/* Right Column - Conditional Input Fields (8/12 width) */}
                  <div className="lg:col-span-8">
                    {/* When 'No' is selected - Show manual detail input fields */}
                    {newBusinessData.taxType === 'No' && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Manual Entry Mode:</span> Please enter your business details manually below.
                        </p>
                        <p className="text-xs text-gray-500">
                          Your business information can be filled in the Business Information section below.
                        </p>
                      </div>
                    )}

                    {/* When 'GST' is selected - Show GSTIN input field */}
                    {newBusinessData.taxType === 'GST' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Enter GSTIN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text" autoComplete="off"
                            value={newBusinessData.gstin}
                            onChange={(e) => handleNewBusinessChange('gstin', e.target.value)}
                            placeholder="Enter GSTIN (15 characters)"
                            className={`w-full px-2 py-2 pr-28 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.gstin
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                              }`}
                          />
                          <button
                            onClick={() => handleGstinFetch(false)}
                            disabled={!newBusinessData.gstin || gstinLoading}
                            className={`absolute right-0 top-0 h-full bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-r-xl whitespace-nowrap text-sm font-medium px-3 ${gstinLoading
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:from-[#129046]/90 hover:to-[#9ccc53]/90"
                              }`}
                          >
                            {gstinLoading ? (
                              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "Get Details"
                            )}
                          </button>
                        </div>
                        {newBusinessErrors.gstin && (
                          <p className="text-xs text-red-500 mt-1">{newBusinessErrors.gstin}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Auto populate business from GSTIN registry
                        </p>
                      </div>
                    )}

                    {/* When 'VAT' is selected - Show VAT number input field */}
                    {newBusinessData.taxType === 'VAT' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Enter VAT/PAN number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text" autoComplete="off"
                            value={newBusinessData.vatNumber}
                            onChange={(e) => handleNewBusinessChange('vatNumber', e.target.value)}
                            placeholder="Enter VAT/PAN number"
                            className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.vatNumber
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                              }`}
                          />
                        </div>
                        {newBusinessErrors.vatNumber && (
                          <p className="text-xs text-red-500 mt-1">{newBusinessErrors.vatNumber}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Enter your VAT registration number
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-full"></div>
                  Business Information
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-4 gap-y-6">
                  {/* Row 1: Business Name and Comment */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text" autoComplete="off"
                        value={newBusinessData.businessName}
                        onChange={(e) => handleNewBusinessChange('businessName', e.target.value)}
                        placeholder="Enter your business name"
                        className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.businessName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                          }`}
                      />
                      {newBusinessErrors.businessName && (
                        <p className="text-xs text-red-500 mt-1">{newBusinessErrors.businessName}</p>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Additional Information
                    </label>
                    <div className="relative">
                      <textarea
                        value={newBusinessData.comment}
                        onChange={(e) => handleNewBusinessChange('comment', e.target.value)}
                        placeholder="Add any comments or notes about this business"
                        rows="1"
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Row 2: Company Email and Phone */}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Company Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <input
                        type="email" autoComplete="off"
                        value={newBusinessData.companyEmail}
                        onChange={(e) => {
                          handleNewBusinessChange('companyEmail', e.target.value);
                          // Reset verification when email changes
                          setEmailVerificationState(prev => ({
                            ...prev,
                            isVerified: false,
                            showOtpInput: false,
                            otp: '',
                            error: ''
                          }));
                        }}
                        placeholder="e.g., support@yourbusiness.com"
                        className={`w-full px-2 py-2 pr-28 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.companyEmail
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                          }`}
                      />
                      {/* Integrated Verify Button - Required for all business types */}
                      <button
                        type="button"
                      // onClick={emailVerificationState.isVerified ? undefined : handleSendOTP}
                      // disabled={emailVerificationState.isLoading || !newBusinessData.companyEmail || emailVerificationState.isVerified}
                      // className={`absolute right-0 top-0 h-full bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-r-lg whitespace-nowrap text-xs font-bold px-4 transition-all ${emailVerificationState.isVerified
                      //   ? 'bg-green-500 cursor-default'
                      //   : 'hover:from-[#129046]/90 hover:to-[#9ccc53]/90 disabled:opacity-50 disabled:cursor-not-allowed'
                      //   }`}
                      >
                        {/* {emailVerificationState.isLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : emailVerificationState.isVerified ? (
                          '✓ Verified'
                        ) : (
                          'Verify'
                        )} */}
                      </button>
                    </div>
                    {newBusinessErrors.companyEmail ? (
                      <p className="text-xs text-red-500 mt-1">{newBusinessErrors.companyEmail}</p>
                    ) : emailVerificationState.isVerified ? (
                      <p className="text-xs text-green-600 font-bold mt-1 ml-1 flex items-center gap-1">
                        <Check size={14} /> Email successfully verified
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-1">Example: name@company.com</p>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Company Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="relative w-20 custom-dropdown" data-dropdown="newBusinessPhoneCode">
                        <input
                          ref={newBusinessPhoneCodeInputRef}
                          type="text" autoComplete="off"
                          value={newBusinessDropdowns.newBusinessPhoneCode ? newBusinessPhoneCodeSearchTerm : (newBusinessData.companyPhoneCode || "")}
                          onChange={(e) => {
                            setNewBusinessPhoneCodeSearchTerm(e.target.value);
                            if (!newBusinessDropdowns.newBusinessPhoneCode) {
                              setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessPhoneCode: true }));
                            }
                            setNewBusinessPhoneCodeHighlightedIndex(0);
                          }}
                          onFocus={() => {
                            setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessPhoneCode: true }));
                          }}
                          onKeyDown={handleNewBusinessPhoneCodeKeyDown}
                          placeholder="+91"
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                        />
                        {newBusinessDropdowns.newBusinessPhoneCode && (
                          <div ref={newBusinessPhoneCodeOptionsListRef} className="absolute z-50 w-64 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                            {filteredNewBusinessCountryCodes.length > 0 ? (
                              filteredNewBusinessCountryCodes.map((c, index) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => selectNewBusinessPhoneCodeOption(c.dial_code)}
                                  onMouseEnter={() => setNewBusinessPhoneCodeHighlightedIndex(index)}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${newBusinessPhoneCodeHighlightedIndex === index
                                    ? "bg-[#129046] text-white"
                                    : newBusinessData.companyPhoneCode === c.dial_code
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
                        <input
                          type="tel" autoComplete="off"
                          value={newBusinessData.companyPhone}
                          onChange={(e) => handleNewBusinessChange('companyPhone', e.target.value)}
                          placeholder="Enter company phone number"
                          className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.companyPhone
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                            }`}
                        />
                        {newBusinessErrors.companyPhone && (
                          <p className="text-xs text-red-500 mt-1">{newBusinessErrors.companyPhone}</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Business Registration Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-full"></div>
                  Business Registration
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Business Type
                    </label>
                    <div className="space-y-3">
                      <div className="relative custom-dropdown dropdown-container" data-dropdown="businessType">
                        <div className="w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 bg-white flex items-center overflow-hidden">
                          {newBusinessData.businessType?.split(', ').includes('Other') ? (
                            <div className="flex-1 flex flex-col p-1">
                              <button
                                type="button"
                                onClick={() => toggleDropdown('businessType')}
                                className="w-full px-2 py-1 text-left bg-white outline-none rounded hover:bg-gray-50 flex justify-between items-center"
                              >
                                <span className="text-gray-800 text-xs font-semibold truncate bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200">
                                  {newBusinessData.businessType.replace(', Other', '').replace('Other, ', '').replace('Other', '') || 'Other'}
                                </span>
                                <span className="text-[10px] text-gray-400">Click to Change Selection</span>
                              </button>
                              <div className="flex items-center pl-2 pt-1 border-t border-gray-100 mt-1">
                                <span className="text-black text-xs font-bold whitespace-nowrap mr-1">Other : </span>
                                <input
                                  type="text"
                                  value={newBusinessData.newOtherBusinessType}
                                  onChange={(e) => handleNewBusinessChange('newOtherBusinessType', e.target.value)}
                                  className="flex-1 py-1 bg-transparent outline-none text-gray-500 text-xs"
                                  placeholder="Specify business type..."
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleDropdown('businessType')}
                              className="flex-1 px-2 py-2 text-left bg-white outline-none"
                            >
                              <span className={newBusinessData.businessType ? 'text-gray-800' : 'text-gray-400'}>
                                {newBusinessData.businessType || 'Select Business Type'}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown('businessType');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors"
                          >
                            <svg className={`w-5 h-5 transition-transform ${dropdowns.businessType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {dropdowns.businessType && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {businessTypes.map((type) => (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => selectDropdownOption('businessType', type.value)}
                                className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${newBusinessData.businessType?.split(', ').includes(type.value)
                                  ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                  : 'hover:bg-[#129046]/10 text-gray-700'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{type.label}</span>
                                  {newBusinessData.businessType?.split(', ').includes(type.value) && <Check size={14} />}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Industry Type
                    </label>
                    <div className="space-y-3">
                      <div className="relative custom-dropdown dropdown-container" data-dropdown="industryType">
                        <div className="w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 bg-white flex items-center overflow-hidden">
                          {newBusinessData.industryType?.split(', ').includes('Other') ? (
                            <div className="flex-1 flex flex-col p-1">
                              <button
                                type="button"
                                onClick={() => toggleDropdown('industryType')}
                                className="w-full px-2 py-1 text-left bg-white outline-none rounded hover:bg-gray-50 flex justify-between items-center"
                              >
                                <span className="text-gray-800 text-xs font-semibold truncate bg-green-100 px-2 py-0.5 rounded border border-green-200">
                                  {newBusinessData.industryType.replace(', Other', '').replace('Other, ', '').replace('Other', '') || 'Other'}
                                </span>
                                <span className="text-[10px] text-gray-400">Click to Change Selection</span>
                              </button>
                              <div className="flex items-center pl-2 pt-1 border-t border-gray-100 mt-1">
                                <span className="text-black text-xs font-bold whitespace-nowrap mr-1">Other : </span>
                                <input
                                  type="text"
                                  value={newBusinessData.newOtherIndustryType}
                                  onChange={(e) => handleNewBusinessChange('newOtherIndustryType', e.target.value)}
                                  className="flex-1 py-1 bg-transparent outline-none text-gray-500 text-xs"
                                  placeholder="Specify industry type..."
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleDropdown('industryType')}
                              className="flex-1 px-2 py-2 text-left bg-white outline-none"
                            >
                              <span className={newBusinessData.industryType ? 'text-gray-800' : 'text-gray-400'}>
                                {newBusinessData.industryType || 'Select Industry Type'}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown('industryType');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors"
                          >
                            <svg className={`w-5 h-5 transition-transform ${dropdowns.industryType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {dropdowns.industryType && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {industryTypes.map((type) => (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => selectDropdownOption('industryType', type.value)}
                                className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${newBusinessData.industryType?.split(', ').includes(type.value)
                                  ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                  : 'hover:bg-[#129046]/10 text-gray-700'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{type.label}</span>
                                  {newBusinessData.industryType?.split(', ').includes(type.value) && <Check size={14} />}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Registration Type
                    </label>
                    <div className="space-y-3">
                      <div className="relative custom-dropdown dropdown-container" data-dropdown="registrationType">
                        <div className="w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 bg-white flex items-center overflow-hidden">
                          {newBusinessData.businessRegistrationType === 'Other' ? (
                            <div className="flex-1 flex items-center pl-2">
                              <span className="text-black text-sm font-bold whitespace-nowrap mr-1">Other : </span>
                              <input
                                type="text"
                                value={newBusinessData.newOtherRegistrationType}
                                onChange={(e) => handleNewBusinessChange('newOtherRegistrationType', e.target.value)}
                                className="flex-1 py-2 bg-transparent outline-none text-gray-500 text-sm"
                                placeholder="Specify..."
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleDropdown('registrationType')}
                              className="flex-1 px-2 py-2 text-left bg-white outline-none"
                            >
                              <span className={newBusinessData.businessRegistrationType ? 'text-gray-800' : 'text-gray-400'}>
                                {registrationTypes.find(type => type.value === newBusinessData.businessRegistrationType)?.label || 'Select Registration Type'}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown('registrationType');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors"
                          >
                            <svg className={`w-5 h-5 transition-transform ${dropdowns.registrationType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {dropdowns.registrationType && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {registrationTypes.map((type) => (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => {
                                  handleNewBusinessChange('registrationType', type.value);
                                  setDropdowns(prev => ({ ...prev, registrationType: false }));
                                }}
                                className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${newBusinessData.businessRegistrationType === type.value
                                  ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                  : 'hover:bg-[#129046]/10'
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      PAN Number
                    </label>
                    <div className="relative">
                      <input
                        type="text" autoComplete="off"
                        value={newBusinessData.panNumber}
                        onChange={(e) => handleNewBusinessChange('panNumber', e.target.value)}
                        placeholder="Enter PAN number"
                        maxLength={newBusinessData.taxType === 'VAT' ? '999' : '10'}
                        className={`w-full px-2 py-2 border rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none ${newBusinessErrors.panNumber
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200"
                          }`}
                      />
                      {newBusinessErrors.panNumber && (
                        <p className="text-xs text-red-500 mt-1">{newBusinessErrors.panNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-full"></div>
                  Address Information
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Pincode / ZIP */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Pincode / ZIP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text" autoComplete="off"
                        value={newBusinessData.pincode}
                        onChange={(e) => handleNewBusinessChange('pincode', e.target.value)}
                        onKeyDown={handleNewBusinessPincodeKeyDown}
                        placeholder="Enter zip/pincode"
                        maxLength="10"
                        className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none ${newBusinessErrors.pincode
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20"
                          }`}
                      />
                      {newBusinessPincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {newBusinessErrors.pincode && (
                        <p className="text-xs text-red-500 mt-1">{newBusinessErrors.pincode}</p>
                      )}
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div
                      className="relative custom-dropdown"
                      data-dropdown="newBusinessCity"
                    >
                      <input
                        ref={newBusinessCityInputRef}
                        type="text" autoComplete="off"
                        value={newBusinessDropdowns.newBusinessCity ? newBusinessCitySearchTerm : (newBusinessCityOptions.find((city) => city.value === newBusinessData.city)?.label || newBusinessData.city || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBusinessCitySearchTerm(val);
                          handleNewBusinessChange('city', val);
                          if (!newBusinessDropdowns.newBusinessCity) {
                            setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCity: true }));
                          }
                          setNewBusinessCityHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCity: true }));
                          const selectedIdx = filteredNewBusinessCities.findIndex(c => c.value === newBusinessData.city || c.label === newBusinessData.city);
                          setNewBusinessCityHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                        }}
                        onKeyDown={handleNewBusinessCityKeyDown}
                        placeholder={loadingNewBusinessCities ? "Loading cities..." : "Type to search city..."}
                        disabled={loadingNewBusinessCities}
                        className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none bg-white disabled:bg-gray-100 ${newBusinessErrors.city
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-[#129046]"
                          }`}
                      />
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${newBusinessDropdowns.newBusinessCity ? "rotate-180" : ""}`}
                      />
                      {newBusinessErrors.city && (
                        <p className="text-xs text-red-500 mt-1">{newBusinessErrors.city}</p>
                      )}

                      {newBusinessDropdowns.newBusinessCity && filteredNewBusinessCities.length > 0 && (
                        <div ref={newBusinessCityOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredNewBusinessCities.map((city, index) => (
                            <button
                              key={city.value}
                              type="button"
                              onClick={() => selectNewBusinessCityDropdownOption(city.value)}
                              onMouseEnter={() => setNewBusinessCityHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${newBusinessCityHighlightedIndex === index || newBusinessData.city === city.value
                                ? "bg-[#129046] text-white font-bold"
                                : "hover:bg-gray-50 text-gray-800"
                                }`}
                            >
                              {city.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {newBusinessDropdowns.newBusinessCity && filteredNewBusinessCities.length === 0 && loadingNewBusinessCities && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500 text-center">
                          Fetching cities...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      State <span className="text-red-500">*</span>
                    </label>
                    <div
                      className="relative custom-dropdown"
                      data-dropdown="newBusinessState"
                    >
                      <input
                        ref={newBusinessStateInputRef}
                        type="text" autoComplete="off"
                        value={newBusinessDropdowns.newBusinessState ? newBusinessStateSearchTerm : ((newBusinessData.country === 'India' ? STATE_OPTIONS : newBusinessStates).find((state) => state.id === newBusinessData.state)?.label || newBusinessData.state || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBusinessStateSearchTerm(val);
                          handleNewBusinessChange('state', val);
                          if (!newBusinessDropdowns.newBusinessState) {
                            setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessState: true }));
                          }
                          setNewBusinessHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessState: true }));
                          const selectedIdx = filteredNewBusinessStates.findIndex(s => s.id === newBusinessData.state || s.label === newBusinessData.state);
                          setNewBusinessHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                        }}
                        onKeyDown={handleNewBusinessKeyDown}
                        placeholder={loadingNewBusinessStates ? "Loading states..." : "Type to search state..."}
                        disabled={loadingNewBusinessStates}
                        className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none bg-white disabled:bg-gray-100 ${newBusinessErrors.state
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-[#129046]"
                          }`}
                      />
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${newBusinessDropdowns.newBusinessState ? "rotate-180" : ""}`}
                      />

                      {newBusinessDropdowns.newBusinessState && filteredNewBusinessStates.length > 0 && (
                        <div ref={newBusinessOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredNewBusinessStates.map((state, index) => (
                            <button
                              key={state.id}
                              type="button"
                              onClick={() => selectNewBusinessDropdownOption("state", state.id)}
                              onMouseEnter={() => setNewBusinessHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${newBusinessHighlightedIndex === index || newBusinessData.state === state.id
                                ? "bg-[#129046] text-white font-bold"
                                : "hover:bg-gray-50 text-gray-800"
                                }`}
                            >
                              {state.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {newBusinessErrors.state && (
                      <p className="text-xs text-red-500 mt-1">{newBusinessErrors.state}</p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <div
                      className="relative custom-dropdown"
                      data-dropdown="newBusinessCountry"
                    >
                      <input
                        ref={newBusinessCountryInputRef}
                        type="text" autoComplete="off"
                        value={newBusinessDropdowns.newBusinessCountry ? newBusinessCountrySearchTerm : (newBusinessData.country || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBusinessCountrySearchTerm(val);
                          handleNewBusinessChange('country', val);
                          if (!newBusinessDropdowns.newBusinessCountry) {
                            setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCountry: true }));
                          }
                          setNewBusinessCountryHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          setNewBusinessDropdowns((prev) => ({ ...prev, newBusinessCountry: true }));
                          const selectedIdx = filteredNewBusinessCountries.findIndex(c => c.value === newBusinessData.country || c.label === newBusinessData.country);
                          setNewBusinessCountryHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                        }}
                        onKeyDown={handleNewBusinessCountryKeyDown}
                        placeholder={loadingCountries ? "Loading countries..." : "Type to search country..."}
                        disabled={loadingCountries}
                        className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none bg-white disabled:bg-gray-100 ${newBusinessErrors.country
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-[#129046]"
                          }`}
                      />
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${newBusinessDropdowns.newBusinessCountry ? "rotate-180" : ""}`}
                      />
                      {newBusinessErrors.country && (
                        <p className="text-xs text-red-500 mt-1">{newBusinessErrors.country}</p>
                      )}

                      {newBusinessDropdowns.newBusinessCountry && filteredNewBusinessCountries.length > 0 && (
                        <div ref={newBusinessCountryOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredNewBusinessCountries.map((country, index) => (
                            <button
                              key={country.value}
                              type="button"
                              onClick={() => selectNewBusinessCountryOption(country.value)}
                              onMouseEnter={() => setNewBusinessCountryHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${newBusinessCountryHighlightedIndex === index || newBusinessData.country === country.value
                                ? "bg-[#129046] text-white font-bold"
                                : "hover:bg-gray-50 text-gray-800"
                                }`}
                            >
                              {country.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Billing Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newBusinessData.billingAddress}
                    onChange={(e) => handleNewBusinessChange('billingAddress', e.target.value)}
                    placeholder="Enter complete billing address"
                    rows={4}
                    className={`w-full pl-4 pr-4 py-2 border rounded-lg focus:border-transparent focus:ring-2 focus:bg-[#129046]/5 transition-all duration-200 text-gray-800 placeholder-gray-400 resize-none ${newBusinessErrors.billingAddress
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-[#129046]"
                      }`}
                  />
                  {newBusinessErrors.billingAddress && (
                    <p className="text-xs text-red-500 mt-1">{newBusinessErrors.billingAddress}</p>
                  )}
                </div>
              </div>


            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex-shrink-0 bg-gray-50 px-6 py-3 flex justify-end gap-4 border-t">
            <button
              onClick={() => {
                setShowCreateBusiness(false);
                resetNewBusinessForm();
                // Reset email verification state
                setEmailVerificationState({
                  isVerified: false,
                  otp: '',
                  showOtpInput: false,
                  isLoading: false,
                  error: ''
                });
                // Close all dropdowns when modal is cancelled
                setDropdowns({
                  business: false,
                  businessType: false,
                  state: false,
                  industryType: false,
                  registrationType: false
                });
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBusiness}
              className="px-8 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 focus:ring-4 focus:ring-[#9ccc53]/50 focus:ring-offset-2 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Create Business
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show empty state if no businesses exist 
  if (!loading && businesses.length === 0) {
    return (
      <>
        <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <RoleBasedAccess
              adminOnly
              fallback={
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">No Business Access</h2>
                  <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                    Your assigned business access has been removed. Please contact your administrator for access.
                  </p>
                </div>
              }
            >
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">No Business Found</h2>
              <p className="text-gray-600 mb-8">
                You haven't created any business yet. Create your first business to get started with managing your invoices and transactions.
              </p>
              <button
                disabled={businesses.length >= maxBusinesses}
                onClick={() => setShowCreateBusiness(true)}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold ${businesses.length >= maxBusinesses
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                  }`}
                title={businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses} businesses max)` : ''}
              >
                <Plus className="w-5 h-5" />
                {businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses})` : 'Create Your First Business'}
              </button>
            </RoleBasedAccess>

          </div>
        </div>

        {renderCreateBusinessModal()}
        {renderEmailVerificationModal()}
      </>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {/* Only show header and form if businesses exist */}
      {businesses.length > 0 && (
        <>
          {/* Header */}
          <div className="flex flex-row items-center justify-between mb-3 mt-2 gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center gap-2 px-3 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
              title="Back To Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
              <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back To Dashboard</span>
            </button>
            <div className="flex gap-1 sm:gap-2 w-full lg:w-auto lg:justify-end">

              {/* Business Selector - Takes remaining space */}
              <div className="flex items-center gap-2 flex-1 lg:flex-initial">
                {/* <Building className="w-4 h-4 text-gray-600" /> */}
                <div className="relative custom-dropdown dropdown-container flex-1 lg:flex-initial" data-dropdown="business">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('business')}
                    className="w-full min-w-[120px] sm:min-w-[200px] px-3 py-2 h-8 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white flex items-center justify-between"
                  >
                    <span className={businesses.find(b => b.id === selectedBusinessId) ? 'text-gray-800' : 'text-gray-400'}>
                      {businesses.find(b => b.id === selectedBusinessId)?.business_name || businesses.find(b => b.id === selectedBusinessId)?.name || 'Select Business'}
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${dropdowns.business ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdowns.business && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {businessOptions.map((business) => (
                        <button
                          key={business.value}
                          type="button"
                          onClick={() => selectDropdownOption('business', business.value)}
                          className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${selectedBusinessId === business.value
                            ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                            : 'hover:bg-[#129046]/10'
                            }`}
                        >
                          {business.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - All in same row */}
              {!isEditMode ? (
                <>
                  <RoleBasedAccess adminOnly>
                    <button
                      disabled={businesses.length >= maxBusinesses}
                      onClick={() => {
                        if (isPlanExpired) {
                          checkPlanExpiry();
                        } else {
                          setShowCreateBusiness(true);
                        }
                      }}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${businesses.length >= maxBusinesses
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-75'
                        : 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:from-[#129046]/90 hover:to-[#9ccc53]/90'
                        }`}
                      title={businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses} businesses max)` : ''}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses})` : 'Create new business'}</span>
                    </button>
                  </RoleBasedAccess>
                  <RoleBasedAccess adminOnly>
                    <button
                      onClick={handleEdit}
                      className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-2 py-2 h-8 sm:h-8 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </RoleBasedAccess>
                </>
              ) : (
                <>
                  <RoleBasedAccess adminOnly>
                    <button
                      onClick={handleCancel}
                      className="px-4 sm:px-6 py-2 h-8 sm:h-8 border border-red-500 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center justify-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(false)}
                      className="px-4 sm:px-6 py-2 h-8 sm:h-8 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center justify-center"
                    >
                      Save
                    </button>
                  </RoleBasedAccess>
                </>
              )}
            </div>
          </div>



          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="xl:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-4 gap-y-6">
                  {/* Logo Upload and Business Name - Different layouts for mobile and desktop */}
                  <div className="lg:col-span-5">
                    {/* Desktop Layout - Logo left, Business Name right */}
                    <div className="hidden lg:flex lg:items-center gap-6">
                      {/* Logo */}
                      <div className="flex-shrink-0">
                        <label
                          htmlFor={isEditMode ? "logo-upload" : ""}
                          className={`w-24 h-24 flex items-center justify-center bg-gray-50 border-2 border-dashed border-green-600 rounded-lg relative overflow-hidden transition-colors group ${isEditMode
                            ? 'cursor-pointer hover:bg-green-50'
                            : 'cursor-not-allowed opacity-60'
                            }`}
                        >
                          {logoPreview ? (
                            <>
                              <img
                                src={logoPreview}
                                alt="Business Logo"
                                className="w-full h-full object-contain"
                              />
                              {/* Hover overlay for upload option - only show in edit mode */}
                              {isEditMode && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                                  <div className="text-center text-white">
                                    <Upload className="w-6 h-6 mx-auto mb-1" />
                                    <div className="text-xs font-medium">Change Logo</div>
                                  </div>
                                </div>
                              )}
                              {isEditMode && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Clean up blob URL to prevent memory leaks
                                    if (logoPreview) {
                                      URL.revokeObjectURL(logoPreview);
                                    }
                                    setLogoFile(null);
                                    setLogoPreview(null);
                                    showWarningToast('Logo removed. Click Save to apply changes.');
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  title="Remove logo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
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
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                          disabled={!isEditMode}
                        />
                        <label
                          htmlFor={isEditMode ? "logo-upload" : ""}
                          className={`block text-center text-xs mt-2 font-medium ${isEditMode
                            ? 'text-[#129046] hover:text-[#129046]/80 cursor-pointer'
                            : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        <p className="text-center text-xs text-gray-500 mt-1">
                          PNG/JPG, max 5 MB
                        </p>
                      </div>

                      {/* Business Name and Comment */}
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mb-2">
                          <input
                            type="text" autoComplete="off"
                            value={businessData.businessName}
                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                            disabled={!isEditMode}
                            placeholder="Enter your business name"
                            className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.businessName
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                              }`}
                          />
                          {businessErrors.businessName && (
                            <p className="text-xs text-red-500 mt-1">{businessErrors.businessName}</p>
                          )}
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Additional Information
                        </label>
                        <div className="relative">
                          <textarea
                            value={businessData.comment}
                            onChange={(e) => handleInputChange('comment', e.target.value)}
                            disabled={!isEditMode}
                            placeholder="Add any comments or notes about this business"
                            rows="3"
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout - Logo centered, then text, then business name below */}
                    <div className="lg:hidden space-y-4">
                      {/* Logo centered */}
                      <div className="flex justify-center">
                        <label
                          htmlFor={isEditMode ? "logo-upload-mobile" : ""}
                          className={`w-24 h-24 flex items-center justify-center bg-gray-50 border-2 border-dashed border-green-600 rounded-lg relative overflow-hidden transition-colors group ${isEditMode
                            ? 'cursor-pointer hover:bg-green-50'
                            : 'cursor-not-allowed opacity-60'
                            }`}
                        >
                          {logoPreview ? (
                            <>
                              <img
                                src={logoPreview}
                                alt="Business Logo"
                                className="w-full h-full object-contain"
                              />
                              {/* Hover overlay for upload option - only show in edit mode */}
                              {isEditMode && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                                  <div className="text-center text-white">
                                    <Upload className="w-6 h-6 mx-auto mb-1" />
                                    <div className="text-xs font-medium">Change Logo</div>
                                  </div>
                                </div>
                              )}
                              {isEditMode && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Clean up blob URL to prevent memory leaks
                                    if (logoPreview) {
                                      URL.revokeObjectURL(logoPreview);
                                    }
                                    setLogoFile(null);
                                    setLogoPreview(null);
                                    showWarningToast('Logo removed. Click Save to apply changes.');
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  title="Remove logo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
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
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload-mobile"
                          disabled={!isEditMode}
                        />
                      </div>

                      {/* Upload text centered */}
                      <div className="text-center">
                        <label
                          htmlFor={isEditMode ? "logo-upload-mobile" : ""}
                          className={`block text-center text-xs font-medium ${isEditMode
                            ? 'text-[#129046] hover:text-[#129046]/80 cursor-pointer'
                            : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        <p className="text-center text-xs text-gray-500 mt-1">
                          PNG/JPG, max 5 MB
                        </p>
                      </div>

                      {/* Business Name in separate row */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text" autoComplete="off"
                          value={businessData.businessName}
                          onChange={(e) => handleInputChange('businessName', e.target.value)}
                          disabled={!isEditMode}
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.businessName
                            ? "border-red-500 focus:ring-red-500"
                            : "border-yellow-300 focus:ring-yellow-500"
                            }`}
                        />
                        {businessErrors.businessName && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.businessName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Company Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="relative w-16 custom-dropdown" data-dropdown="editBusinessPhoneCode">
                        <input
                          ref={editBusinessPhoneCodeInputRef}
                          type="text" autoComplete="off"
                          value={editBusinessDropdowns.editBusinessPhoneCode ? editBusinessPhoneCodeSearchTerm : (businessData.companyPhoneCode || "")}
                          onChange={(e) => {
                            setEditBusinessPhoneCodeSearchTerm(e.target.value);
                            if (!editBusinessDropdowns.editBusinessPhoneCode) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessPhoneCode: true }));
                            }
                            setEditBusinessPhoneCodeHighlightedIndex(0);
                          }}
                          onFocus={() => {
                            if (isEditMode) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessPhoneCode: true }));
                            }
                          }}
                          onKeyDown={handleEditBusinessPhoneCodeKeyDown}
                          placeholder="+91"
                          disabled={!isEditMode}
                          className={`w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        />
                        {isEditMode && editBusinessDropdowns.editBusinessPhoneCode && (
                          <div ref={editBusinessPhoneCodeOptionsListRef} className="absolute z-50 w-64 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                            {filteredEditBusinessCountryCodes.length > 0 ? (
                              filteredEditBusinessCountryCodes.map((c, index) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => selectEditBusinessPhoneCodeOption(c.dial_code)}
                                  onMouseEnter={() => setEditBusinessPhoneCodeHighlightedIndex(index)}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${editBusinessPhoneCodeHighlightedIndex === index
                                    ? "bg-[#129046] text-white"
                                    : businessData.companyPhoneCode === c.dial_code
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
                        <input
                          type="tel" autoComplete="off"
                          value={businessData.companyPhone}
                          onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                          disabled={!isEditMode}
                          placeholder="Enter company phone number"
                          className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.companyPhone
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                            }`}
                        />
                        {businessErrors.companyPhone && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.companyPhone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Company Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                      <input
                        type="email" autoComplete="off"
                        value={businessData.companyEmail}
                        onChange={(e) => {
                          const newEmail = e.target.value;
                          handleInputChange('companyEmail', newEmail);

                          // Smart Reset: Check if newEmail matches original verified email
                          const originalBusiness = businesses.find(b => b.id === selectedBusinessId);
                          const origEmail = originalBusiness ? (originalBusiness.email || originalBusiness.company_email || originalBusiness.companyEmail || "") : "";
                          const origIsVerified = originalBusiness ? !!originalBusiness.is_email_verified : false;

                          // Reset verification state but stay verified if it matches original verified email
                          setEditEmailVerificationState(prev => ({
                            ...prev,
                            isVerified: newEmail === origEmail && origIsVerified,
                            showOtpInput: false,
                            otp: '',
                            error: ''
                          }));
                        }}
                        disabled={!isEditMode}
                        placeholder="e.g., support@yourbusiness.com"
                        className={`w-full px-2 py-2 pr-24 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.companyEmail
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                          }`}
                      />
                      {/* Integrated Verify Button - Required for all business types */}
                      <button
                        type="button"
                      // onClick={editEmailVerificationState.isVerified || !isEditMode ? undefined : handleEditSendOTP}
                      // disabled={editEmailVerificationState.isLoading || !businessData.companyEmail || editEmailVerificationState.isVerified || !isEditMode}
                      // className={`absolute right-0 top-0 h-full text-white rounded-r-lg whitespace-nowrap text-xs font-bold px-4 transition-all bg-gradient-to-r from-[#129046] to-[#9ccc53] ${!isEditMode
                      //   ? 'opacity-40 cursor-not-allowed grayscale pointer-events-none'
                      //   : editEmailVerificationState.isVerified
                      //     ? 'opacity-100 cursor-default pointer-events-none'
                      //     : 'hover:opacity-90 cursor-pointer'
                      //   }`}
                      >
                        {/* {editEmailVerificationState.isLoading ? (
                          <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                        ) : editEmailVerificationState.isVerified ? (
                          "✓ Verified"
                        ) : (
                          "Verify"
                        )} */}
                      </button>
                    </div>
                    {businessErrors.companyEmail ? (
                      <p className="text-xs text-red-500 mt-1">{businessErrors.companyEmail}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-1">Example: name@company.com</p>
                    )}

                    {/* OTP Popup UI logic handled via renderEmailVerificationModal */}
                  </div>

                  {/* Address */}
                  <div className="lg:col-span-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Billing Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={businessData.billingAddress}
                      onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                      placeholder="Enter complete billing address"
                      rows={4}
                      disabled={!isEditMode}
                      className={`w-full pl-4 pr-4 py-2 border rounded-lg focus:border-transparent focus:ring-2 transition-all duration-200 text-gray-800 placeholder-gray-400 resize-none focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.billingAddress
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:ring-[#129046] focus:bg-[#129046]/5"
                        }`}
                    />
                    {businessErrors.billingAddress && (
                      <p className="text-xs text-red-500 mt-1">{businessErrors.billingAddress}</p>
                    )}
                  </div>

                  {/* Location Details - Rearranged to 2 rows */}
                  <div className="lg:col-span-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Pincode / ZIP */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Pincode / ZIP <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text" autoComplete="off"
                          value={businessData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          onKeyDown={handleEditPincodeKeyDown}
                          placeholder="Enter zip/pincode"
                          maxLength="10"
                          disabled={!isEditMode}
                          className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.pincode
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                            }`}
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {businessErrors.pincode ? (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.pincode}</p>
                        ) : (
                          <p className="text-[10px] text-green-600 mt-1 uppercase tracking-tight">
                            {/* Press Enter after pincode to auto-fill city &amp; state */}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <div
                        className="relative custom-dropdown"
                        data-dropdown="editBusinessCity"
                      >
                        <input
                          ref={editBusinessCityInputRef}
                          type="text" autoComplete="off"
                          value={editBusinessDropdowns.editBusinessCity ? editBusinessCitySearchTerm : (cityOptions.find((city) => city.value === businessData.city)?.label || businessData.city || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditBusinessCitySearchTerm(val);
                            handleInputChange('city', val);
                            if (!editBusinessDropdowns.editBusinessCity) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCity: true }));
                            }
                            setEditBusinessCityHighlightedIndex(0);
                          }}
                          onFocus={() => {
                            if (isEditMode) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCity: true }));
                              const selectedIdx = filteredEditBusinessCities.findIndex(c => c.value === businessData.city || c.label === businessData.city);
                              setEditBusinessCityHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                            }
                          }}
                          onKeyDown={handleEditBusinessCityKeyDown}
                          placeholder={loadingCities ? "Loading cities..." : "Type to search city..."}
                          disabled={!isEditMode || loadingCities}
                          className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none ${!isEditMode || loadingCities ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            } ${businessErrors.city
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200 focus:border-[#129046]"
                            }`}
                        />
                        {businessErrors.city && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.city}</p>
                        )}
                        <ChevronDown
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${editBusinessDropdowns.editBusinessCity ? "rotate-180" : ""}`}
                        />

                        {editBusinessDropdowns.editBusinessCity && filteredEditBusinessCities.length > 0 && isEditMode && (
                          <div ref={editBusinessCityOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredEditBusinessCities.map((city, index) => (
                              <button
                                key={city.value}
                                type="button"
                                onClick={() => selectEditBusinessCityDropdownOption(city.value)}
                                onMouseEnter={() => setEditBusinessCityHighlightedIndex(index)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${editBusinessCityHighlightedIndex === index || businessData.city === city.value
                                  ? "bg-[#129046] text-white font-bold"
                                  : "hover:bg-gray-50 text-gray-800"
                                  }`}
                              >
                                {city.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {editBusinessDropdowns.editBusinessCity && filteredEditBusinessCities.length === 0 && loadingCities && (
                          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500 text-center">
                            Fetching cities...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <div
                        className="relative custom-dropdown"
                        data-dropdown="editBusinessState"
                      >
                        <input
                          ref={editBusinessStateInputRef}
                          type="text" autoComplete="off"
                          value={editBusinessDropdowns.editBusinessState ? editBusinessStateSearchTerm : ((businessData.country === 'India' ? STATE_OPTIONS : editBusinessStates).find((state) => state.id === businessData.state)?.label || businessData.state || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditBusinessStateSearchTerm(val);
                            handleInputChange('state', val);
                            if (!editBusinessDropdowns.editBusinessState) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessState: true }));
                            }
                            setEditBusinessHighlightedIndex(0);
                          }}
                          onFocus={() => {
                            if (isEditMode) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessState: true }));
                              const selectedIdx = filteredEditBusinessStates.findIndex(s => s.id === businessData.state || s.label === businessData.state);
                              setEditBusinessHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                            }
                          }}
                          onKeyDown={handleEditBusinessKeyDown}
                          placeholder={loadingEditBusinessStates ? "Loading states..." : "Type to search state..."}
                          disabled={!isEditMode || loadingEditBusinessStates}
                          className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none ${!isEditMode || loadingEditBusinessStates ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            } ${businessErrors.state
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200 focus:border-[#129046]"
                            }`}
                        />
                        {businessErrors.state && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.state}</p>
                        )}
                        <ChevronDown
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${editBusinessDropdowns.editBusinessState ? "rotate-180" : ""}`}
                        />

                        {editBusinessDropdowns.editBusinessState && filteredEditBusinessStates.length > 0 && isEditMode && (
                          <div ref={editBusinessOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredEditBusinessStates.map((state, index) => (
                              <button
                                key={state.id}
                                type="button"
                                onClick={() => selectEditBusinessDropdownOption("state", state.id)}
                                onMouseEnter={() => setEditBusinessHighlightedIndex(index)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${editBusinessHighlightedIndex === index || businessData.state === state.id
                                  ? "bg-[#129046] text-white font-bold"
                                  : "hover:bg-gray-50 text-gray-800"
                                  }`}
                              >
                                {state.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <div
                        className="relative custom-dropdown"
                        data-dropdown="editBusinessCountry"
                      >
                        <input
                          ref={editBusinessCountryInputRef}
                          type="text" autoComplete="off"
                          value={editBusinessDropdowns.editBusinessCountry ? editBusinessCountrySearchTerm : (businessData.country || "India")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditBusinessCountrySearchTerm(val);
                            handleInputChange('country', val);
                            if (!editBusinessDropdowns.editBusinessCountry) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCountry: true }));
                            }
                            setEditBusinessCountryHighlightedIndex(0);
                          }}
                          onFocus={() => {
                            if (isEditMode) {
                              setEditBusinessDropdowns((prev) => ({ ...prev, editBusinessCountry: true }));
                              const selectedIdx = filteredEditBusinessCountries.findIndex(c => c.value === businessData.country || c.label === businessData.country);
                              setEditBusinessCountryHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                            }
                          }}
                          onKeyDown={handleEditBusinessCountryKeyDown}
                          placeholder={loadingCountries ? "Loading countries..." : "Type to search country..."}
                          disabled={!isEditMode || loadingCountries}
                          className={`w-full px-4 py-2 border-2 rounded-lg text-sm focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none ${!isEditMode || loadingCountries ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            } ${businessErrors.country
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200 focus:border-[#129046]"
                            }`}
                        />
                        {businessErrors.country && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.country}</p>
                        )}
                        <ChevronDown
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform pointer-events-none ${editBusinessDropdowns.editBusinessCountry ? "rotate-180" : ""}`}
                        />

                        {editBusinessDropdowns.editBusinessCountry && filteredEditBusinessCountries.length > 0 && isEditMode && (
                          <div ref={editBusinessCountryOptionsListRef} className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredEditBusinessCountries.map((country, index) => (
                              <button
                                key={country.value}
                                type="button"
                                onClick={() => selectEditBusinessCountryOption(country.value)}
                                onMouseEnter={() => setEditBusinessCountryHighlightedIndex(index)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${editBusinessCountryHighlightedIndex === index || businessData.country === country.value
                                  ? "bg-[#129046] text-white font-bold"
                                  : "hover:bg-gray-50 text-gray-800"
                                  }`}
                              >
                                {country.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}



                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Business Type
                    </label>
                    <div className="relative custom-dropdown dropdown-container" data-dropdown="businessType">
                      <div className={`w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 flex items-center overflow-hidden ${!isEditMode ? 'bg-gray-100' : 'bg-white'}`}>
                        {businessData.businessType?.split(', ').includes('Other') ? (
                          <div className="flex-1 flex flex-col p-1">
                            <button
                              type="button"
                              disabled={!isEditMode}
                              onClick={() => toggleDropdown('businessType')}
                              className="w-full px-2 py-1 text-left bg-transparent outline-none rounded hover:bg-gray-100 flex justify-between items-center disabled:cursor-not-allowed"
                            >
                              <span className="text-gray-800 text-xs font-semibold truncate bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200">
                                {businessData.businessType.replace(', Other', '').replace('Other, ', '').replace('Other', '') || 'Other'}
                              </span>
                              {isEditMode && <span className="text-[10px] text-gray-400">Click to Change</span>}
                            </button>
                            <div className="flex items-center pl-2 pt-1 border-t border-gray-100 mt-1">
                              <span className="text-black text-xs font-bold whitespace-nowrap mr-1">Other : </span>
                              <input
                                type="text"
                                value={businessData.otherBusinessType}
                                onChange={(e) => handleInputChange('otherBusinessType', e.target.value)}
                                disabled={!isEditMode}
                                className="flex-1 min-w-0 py-1 bg-transparent outline-none text-gray-500 text-xs disabled:cursor-not-allowed"
                                placeholder="Specify..."
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => toggleDropdown('businessType')}
                            className="flex-1 px-2 py-2 text-left bg-transparent outline-none disabled:cursor-not-allowed"
                          >
                            <span className={businessData.businessType ? 'text-gray-800' : 'text-gray-400'}>
                              {businessData.businessType || 'Select Business Type'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('businessType');
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdowns.businessType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {dropdowns.businessType && isEditMode && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {businessTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                handleInputChange('businessType', type.value);
                              }}
                              className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${businessData.businessType?.split(', ').includes(type.value)
                                ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                : 'hover:bg-[#129046]/10 text-gray-700'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{type.label}</span>
                                {businessData.businessType?.split(', ').includes(type.value) && <Check size={14} />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Industry Type</label>
                    <div className="relative custom-dropdown dropdown-container" data-dropdown="industryType">
                      <div className={`w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 flex items-center overflow-hidden ${!isEditMode ? 'bg-gray-100' : 'bg-white'}`}>
                        {businessData.industryType?.split(', ').includes('Other') ? (
                          <div className="flex-1 flex flex-col p-1">
                            <button
                              type="button"
                              disabled={!isEditMode}
                              onClick={() => toggleDropdown('industryType')}
                              className="w-full px-2 py-1 text-left bg-transparent outline-none rounded hover:bg-gray-100 flex justify-between items-center disabled:cursor-not-allowed"
                            >
                              <span className="text-gray-800 text-xs font-semibold truncate bg-green-100 px-2 py-0.5 rounded border border-green-200">
                                {businessData.industryType.replace(', Other', '').replace('Other, ', '').replace('Other', '') || 'Other'}
                              </span>
                              {isEditMode && <span className="text-[10px] text-gray-400">Click to Change</span>}
                            </button>
                            <div className="flex items-center pl-2 pt-1 border-t border-gray-100 mt-1">
                              <span className="text-black text-xs font-bold whitespace-nowrap mr-1">Other : </span>
                              <input
                                type="text"
                                value={businessData.otherIndustryType}
                                onChange={(e) => handleInputChange('otherIndustryType', e.target.value)}
                                disabled={!isEditMode}
                                className="flex-1 min-w-0 py-1 bg-transparent outline-none text-gray-500 text-xs disabled:cursor-not-allowed"
                                placeholder="Specify..."
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => toggleDropdown('industryType')}
                            className="flex-1 px-2 py-2 text-left bg-transparent outline-none disabled:cursor-not-allowed"
                          >
                            <span className={businessData.industryType ? 'text-gray-800' : 'text-gray-400'}>
                              {businessData.industryType || 'Select Industry Type'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('industryType');
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdowns.industryType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {dropdowns.industryType && isEditMode && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {industryTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                handleInputChange('industryType', type.value);
                              }}
                              className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${businessData.industryType?.split(', ').includes(type.value)
                                ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                : 'hover:bg-[#129046]/10 text-gray-700'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{type.label}</span>
                                {businessData.industryType?.split(', ').includes(type.value) && <Check size={14} />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Business Registration Type
                    </label>
                    <div className="relative custom-dropdown dropdown-container" data-dropdown="registrationType">
                      <div className={`w-full border border-gray-200 rounded-lg text-sm focus-within:border-[#1fbe5a] focus-within:ring-2 focus-within:ring-[#1fbe5a]/20 flex items-center overflow-hidden ${!isEditMode ? 'bg-gray-100' : 'bg-white'}`}>
                        {businessData.businessRegistrationType === 'Other' ? (
                          <div className="flex-1 flex items-center pl-2">
                            <span className="text-black text-sm font-bold whitespace-nowrap mr-1">Other : </span>
                            <input
                              type="text"
                              value={businessData.otherRegistrationType}
                              onChange={(e) => handleInputChange('otherRegistrationType', e.target.value)}
                              disabled={!isEditMode}
                              className="flex-1 min-w-0 py-2 bg-transparent outline-none text-gray-500 text-sm disabled:cursor-not-allowed"
                              placeholder="Specify..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => toggleDropdown('registrationType')}
                            className="flex-1 px-2 py-2 text-left bg-transparent outline-none disabled:cursor-not-allowed"
                          >
                            <span className={businessData.businessRegistrationType ? 'text-gray-800' : 'text-gray-400'}>
                              {businessData.businessRegistrationType || 'Select Registration Type'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('registrationType');
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdowns.registrationType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {dropdowns.registrationType && isEditMode && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#129046] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {registrationTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                handleInputChange('businessRegistrationType', type.value);
                                setDropdowns(prev => ({ ...prev, registrationType: false }));
                              }}
                              className={`w-full px-2 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${businessData.businessRegistrationType === type.value
                                ? 'bg-[#129046] text-white hover:bg-[#129046]/90'
                                : 'hover:bg-[#129046]/10'
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

                <div className="mt-4 text-sm text-gray-600">
                  <strong>Note:</strong> Details added below will be shown on your invoices
                </div>
              </div>

              {/* GST Information */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-full"></div>
                  GST or VAT Information
                </h3>

                {/* Grid Layout: 1 row with 4 and 8 column spans */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Tax Type Selection (4/12 width) */}
                  <div className="lg:col-span-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Tax Type
                    </label>

                    <div className="flex items-center gap-4 mb-2">
                      <label className={`flex items-center gap-2 ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          name="taxType"
                          value="No"
                          checked={businessData.taxType === 'No'}
                          onChange={() => isEditMode && handleInputChange('taxType', 'No')}
                          disabled={!isEditMode}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">No</span>
                      </label>

                      <label className={`flex items-center gap-2 ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          name="taxType"
                          value="GST"
                          checked={businessData.taxType === 'GST'}
                          onChange={() => isEditMode && handleInputChange('taxType', 'GST')}
                          disabled={!isEditMode}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">GST</span>
                      </label>

                      <label className={`flex items-center gap-2 ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="radio"
                          name="taxType"
                          value="VAT"
                          checked={businessData.taxType === 'VAT'}
                          onChange={() => isEditMode && handleInputChange('taxType', 'VAT')}
                          disabled={!isEditMode}
                          className="w-4 h-4 accent-[#129046] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">VAT</span>
                      </label>
                    </div>

                    <p className="text-xs text-gray-500">
                      Select your tax registration type
                    </p>
                  </div>

                  {/* Right Column - Conditional Input Fields (8/12 width) */}
                  <div className="lg:col-span-8">
                    {/* When 'No' is selected - Show manual detail input fields */}
                    {businessData.taxType === 'No' && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Manual Entry Mode:</span> Please enter your business details manually below.
                        </p>
                        <p className="text-xs text-gray-500">
                          Your business information can be filled in the Business Information section below.
                        </p>
                      </div>
                    )}

                    {/* When 'GST' is selected - Show GSTIN input field */}
                    {businessData.taxType === 'GST' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Enter GSTIN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text" autoComplete="off"
                            value={businessData.gstin}
                            onChange={(e) => handleInputChange('gstin', e.target.value)}
                            placeholder="Enter GSTIN (15 characters)"
                            disabled={!isEditMode}
                            className={`w-full px-2 py-2 pr-28 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.gstin
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                              }`}
                          />
                          <button
                            onClick={() => handleGstinFetch(true)}
                            disabled={!businessData.gstin || gstinLoading || !isEditMode}
                            className={`absolute right-0 top-0 h-full bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-r-xl whitespace-nowrap text-sm font-medium px-3 ${gstinLoading || !isEditMode
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:from-[#129046]/90 hover:to-[#9ccc53]/90"
                              }`}
                          >
                            {gstinLoading ? (
                              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "Get Details"
                            )}
                          </button>
                        </div>
                        {businessErrors.gstin && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.gstin}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Auto populate business from GSTIN registry
                        </p>
                      </div>
                    )}

                    {/* When 'VAT' is selected - Show VAT number input field */}
                    {businessData.taxType === 'VAT' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Enter VAT number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text" autoComplete="off"
                            value={businessData.vatNumber}
                            onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                            placeholder="Enter VAT number"
                            disabled={!isEditMode}
                            className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.vatNumber
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                              }`}
                          />
                        </div>
                        {businessErrors.vatNumber && (
                          <p className="text-xs text-red-500 mt-1">{businessErrors.vatNumber}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Enter your VAT registration number
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAN Number - Below the grid */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    PAN Number
                  </label>
                  <div className="relative">
                    <input
                      type="text" autoComplete="off"
                      value={businessData.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value)}
                      disabled={!isEditMode}
                      placeholder="Enter PAN number"
                      maxLength={businessData.taxType === 'VAT' ? '999' : '10'}
                      className={`w-full px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${businessErrors.panNumber
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"
                        }`}
                    />
                    {businessErrors.panNumber && (
                      <p className="text-xs text-red-500 mt-1">{businessErrors.panNumber}</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column - Additional Details */}
            <div className="space-y-6">
              {/* Websites */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-4">Websites</h3>
                <div className="space-y-3">
                  {businessData.websites.map((website, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-100">
                      <span className="text-sm">{website}</span>
                      {isEditMode && (
                        <ActionButtons
                          onDelete={() => {
                            if (isPlanExpired) {
                              checkPlanExpiry();
                            } else {
                              removeWebsite(index);
                            }
                          }}
                          actions={['delete']}
                        />
                      )}
                    </div>
                  ))}
                  {isEditMode && (
                    <div className="flex gap-2">
                      <input
                        type="text" autoComplete="off"
                        value={newWebsite}
                        onChange={(e) => setNewWebsite(e.target.value)}
                        placeholder="www.website.com"
                        disabled={!isEditMode}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={addWebsite}
                        disabled={!isEditMode}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-4">Signature</h3>

                {/* Fixed Dashed Border Box */}
                <div className="border-2 border-dashed border-green-600 rounded-lg p-4 bg-gray-50 min-h-[120px] flex items-center justify-center relative">
                  {/* Remove Button - Top Right Corner of Dashed Border */}
                  {signaturePreview && isEditMode && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (signaturePreview && signaturePreview.startsWith('blob:')) {
                          URL.revokeObjectURL(signaturePreview);
                        }
                        setSignaturePreview(null);
                        setSignatureFile(null);
                        showInfoToast('Signature removed. Click Save to apply changes.');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                      title="Remove signature"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <label
                    htmlFor="signature-upload"
                    className={`w-full h-full flex items-center justify-center ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {signaturePreview ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          className="max-w-full max-h-[100px] object-contain pointer-events-none"
                          onError={async (e) => {
                            console.error('Signature image failed to load:', signaturePreview);
                            e.target.style.display = 'none';
                            showErrorToast('Signature image is corrupted and has been removed');
                            setSignaturePreview(null);
                            setSignatureFile(null);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center pointer-events-none">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600">Upload Signature</div>
                        <div className="text-xs text-gray-500 mt-1">PNG/JPG, max 2 MB</div>
                      </div>
                    )}
                  </label>
                </div>

                {isEditMode && (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleSignatureUpload}
                      className="hidden"
                      id="signature-upload"
                    />
                    <label
                      htmlFor="signature-upload"
                      className="block text-center text-sm text-[#129046] hover:text-[#129046]/80 cursor-pointer mt-3 font-medium"
                    >
                      {signaturePreview ? 'Change Signature' : 'Upload Signature'}
                    </label>
                  </>
                )}
              </div>

              {/* Stamp */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-4">Stamp</h3>

                {/* Fixed Dashed Border Box */}
                <div className="border-2 border-dashed border-green-600 rounded-lg p-4 bg-gray-50 min-h-[120px] flex items-center justify-center relative">
                  {/* Remove Button - Top Right Corner of Dashed Border */}
                  {stampPreview && isEditMode && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (stampPreview && stampPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(stampPreview);
                        }
                        setStampPreview(null);
                        setStampFile(null);
                        showInfoToast('Stamp removed. Click Save to apply changes.');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                      title="Remove stamp"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <label
                    htmlFor="stamp-upload"
                    className={`w-full h-full flex items-center justify-center ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {stampPreview ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={stampPreview}
                          alt="Stamp"
                          className="max-w-full max-h-[100px] object-contain pointer-events-none"
                          onError={async (e) => {
                            console.error('Stamp image failed to load:', stampPreview);
                            e.target.style.display = 'none';
                            showErrorToast('Stamp image is corrupted and has been removed');
                            setStampPreview(null);
                            setStampFile(null);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center pointer-events-none">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600">Upload Stamp</div>
                        <div className="text-xs text-gray-500 mt-1">PNG/JPG, max 2 MB</div>
                      </div>
                    )}
                  </label>
                </div>

                {isEditMode && (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleStampUpload}
                      className="hidden"
                      id="stamp-upload"
                    />
                    <label
                      htmlFor="stamp-upload"
                      className="block text-center text-sm text-[#129046] hover:text-[#129046]/80 cursor-pointer mt-3 font-medium"
                    >
                      {stampPreview ? 'Change Stamp' : 'Upload Stamp'}
                    </label>
                  </>
                )}
              </div>

              {/* Additional Business Details */}
              <div className={`bg-white rounded-lg border border-yellow-200 p-6 relative ${!isEditMode ? 'bg-gray-50' : ''}`}>
                {!isEditMode && !isAdminUser() && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Read Only
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Business Details</h3>
                  <div className="flex items-center gap-3">
                    {isEditMode && Object.values(additionalBusinessData).some(value => value && value.length > 0) && (
                      <button
                        onClick={() => setShowAdditionalDetails(true)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Show filled additional details or add button */}
                {Object.values(additionalBusinessData).some(value => value && value.length > 0) ? (
                  <div className="space-y-3">
                    {/* Display filled data */}
                    {additionalBusinessData.msmeNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">MSME Registration Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.msmeNumber}</span>
                      </div>
                    )}

                    {additionalBusinessData.cinNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">CIN Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.cinNumber}</span>
                      </div>
                    )}

                    {additionalBusinessData.tanNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">TAN Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.tanNumber}</span>
                      </div>
                    )}

                    {additionalBusinessData.udyamNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">Udyam Registration Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.udyamNumber}</span>
                      </div>
                    )}

                    {additionalBusinessData.importExportCode && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">Import Export Code (IEC):</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.importExportCode}</span>
                      </div>
                    )}

                    {additionalBusinessData.fssaiNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">FSSAI License Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.fssaiNumber}</span>
                      </div>
                    )}

                    {additionalBusinessData.drugLicenseNumber && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-gray-700">Drug License Number:</span>
                        <span className="text-sm text-gray-900">{additionalBusinessData.drugLicenseNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Add additional business information such as MSME number, Website etc.
                    </p>
                    <button
                      onClick={() => {
                        if (!isEditMode) {
                          showWarningToast('Please click Edit to enable adding additional details');
                          return;
                        }
                        setShowAdditionalDetails(true);
                      }}
                      className={`w-full px-2 py-2 border rounded-lg transition-colors ${isEditMode
                        ? 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      disabled={!isEditMode}
                    >
                      Add Details
                    </button>
                  </>
                )}
              </div>

              <RoleBasedAccess adminOnly>
                <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${!isEditMode ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                      <ActionButtons actions={[]} actionsConfig={{}} />
                      {/* Note: ActionButtons is primarily for actions, but we want consistency in look. 
                          Actually, for just an icon in a header, maybe it's fine to keep it or use a Fa icon.
                          I'll use FaTrash from react-icons/fa to match ActionButtons' icon set if possible.
                      */}
                      <ActionButtons actions={['delete']} actionsConfig={{ delete: { label: '', callback: () => { } } }} />
                    </div>
                    <div>
                      <div className="font-medium text-red-900">Delete Business</div>
                      <div className="text-sm text-red-700">
                        {!isEditMode ? 'Enable edit mode to delete business' : 'Business will be permanently deleted'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={isEditMode ? handleDeleteBusiness : () => showWarningToast('Please enable edit mode to delete business')}
                    disabled={!isEditMode}
                    className={`w-full mt-3 px-2 py-2 text-white rounded-lg transition-all ${isEditMode
                      ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                      : 'bg-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Delete Business
                  </button>
                </div>
              </RoleBasedAccess>
            </div>
          </div>
        </>
      )}

      <>
        {/* Create Business Modal - Redesigned */}
        {renderCreateBusinessModal()}
      </>

      {/* Additional Business Details Modal */}
      {showAdditionalDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[900] p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Additional Business Details</h2>
                {!isEditMode && (
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                    View Only
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAdditionalDetails(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* MSME Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      MSME Registration Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.msmeNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        msmeNumber: e.target.value
                      }))}
                      placeholder="Enter MSME number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* CIN Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CIN Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.cinNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        cinNumber: e.target.value
                      }))}
                      placeholder="Enter CIN number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* TAN Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TAN Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.tanNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        tanNumber: e.target.value
                      }))}
                      placeholder="Enter TAN number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Udyam Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Udyam Registration Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.udyamNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        udyamNumber: e.target.value
                      }))}
                      placeholder="Enter Udyam number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Import Export Code */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Import Export Code (IEC)
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.importExportCode}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        importExportCode: e.target.value
                      }))}
                      placeholder="Enter IEC number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* FSSAI Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      FSSAI License Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.fssaiNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        fssaiNumber: e.target.value
                      }))}
                      placeholder="Enter FSSAI number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Drug License Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Drug License Number
                    </label>
                    <input
                      type="text" autoComplete="off"
                      value={additionalBusinessData.drugLicenseNumber}
                      onChange={(e) => setAdditionalBusinessData(prev => ({
                        ...prev,
                        drugLicenseNumber: e.target.value
                      }))}
                      placeholder="Enter Drug License number"
                      disabled={!isEditMode}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className={`border rounded-lg p-4 ${isEditMode
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-yellow-50 border-yellow-200'
                  }`}>
                  <p className={`text-sm ${isEditMode
                    ? 'text-blue-800'
                    : 'text-yellow-800'
                    }`}>
                    <strong>Note:</strong> {
                      isEditMode
                        ? 'These additional details are optional and can be used for compliance and reporting purposes. You can add or update them anytime.'
                        : 'To edit these details, please click the "Edit" button first to enable edit mode.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 bg-gray-50 px-6 py-3 flex justify-end gap-4 border-t">
              <button
                onClick={() => setShowAdditionalDetails(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!isEditMode) {
                    showWarningToast('Please enable edit mode to save changes');
                    return;
                  }
                  // Just close the modal - data will be shown in the main form
                  // Actual database save will happen when user saves the main business form
                  showSuccessToast('Additional details added! Click Save to update business information.');
                  setShowAdditionalDetails(false);
                }}
                disabled={!isEditMode}
                className={`px-8 py-2 rounded-lg focus:ring-4 focus:ring-offset-2 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 ${isEditMode
                  ? 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:from-[#129046]/90 hover:to-[#9ccc53]/90 focus:ring-[#9ccc53]/50'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Add Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showLogoCropModal}
        imageUrl={logoCropImage}
        onCrop={handleLogoCrop}
        onClose={() => {
          setShowLogoCropModal(false);
          if (logoCropImage && logoCropImage.startsWith('blob:')) {
            URL.revokeObjectURL(logoCropImage);
          }
          setLogoCropImage(null);
        }}
      />
      {/* Email Verification Modal for Business Edit */}
      {editEmailVerificationState.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4 font-inter">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 transform transition-all animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Verify Changes</h2>
                  <p className="text-white/80 text-xs font-medium">Security verification required</p>
                </div>
              </div>
              <button
                onClick={() => setEditEmailVerificationState(prev => ({ ...prev, showModal: false }))}
                className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="space-y-6">
                <div className="bg-green-50/50 border border-green-100 rounded-2xl p-5">
                  <p className="text-sm text-gray-700 leading-relaxed text-center">
                    You've requested to change sensitive business information. To confirm this action, please verify the OTP sent to:
                  </p>
                  <p className="text-base font-bold text-[#129046] mt-3 text-center break-all">
                    {businessData.companyEmail}
                  </p>
                </div>

                {!editEmailVerificationState.showOtpInput ? (
                  <button
                    onClick={handleEditSendOTP}
                    disabled={editEmailVerificationState.isLoading}
                    className="w-full py-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                  >
                    {editEmailVerificationState.isLoading ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="relative group">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
                        One-Time Password
                      </label>
                      <input
                        type="text"
                        value={editEmailVerificationState.otp}
                        onChange={(e) => setEditEmailVerificationState(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, ''), error: '' }))}
                        placeholder="0 0 0 0 0 0"
                        maxLength="6"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-2xl font-bold text-center tracking-[0.5em] focus:bg-white focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/5 outline-none transition-all duration-300 placeholder:text-gray-300"
                      />
                    </div>

                    <button
                      onClick={handleEditVerifyOTP}
                      disabled={editEmailVerificationState.isLoading || editEmailVerificationState.otp.length !== 6}
                      className="w-full py-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {editEmailVerificationState.isLoading ? (
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span>Verify & Save Changes</span>
                      )}
                    </button>

                    <button
                      onClick={handleEditSendOTP}
                      disabled={editEmailVerificationState.isLoading}
                      className="w-full text-sm font-bold text-gray-500 hover:text-[#129046] transition-colors py-2"
                    >
                      Resend OTP
                    </button>
                  </div>
                )}

                {editEmailVerificationState.error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 animate-pulse">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {editEmailVerificationState.error}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest text-center">
                Your security is our priority • Zero Billss
              </p>
            </div>
          </div>
        </div>
      )}

      {renderEmailVerificationModal()}

      {isDeleting && <MainLoader message="Deleting business and updating your workspace..." />}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteBusiness}
        itemName={businesses.find(b => b.id === selectedBusinessId)?.business_name || 'this business'}
        itemType="business"
      />
    </div>
  );
}
