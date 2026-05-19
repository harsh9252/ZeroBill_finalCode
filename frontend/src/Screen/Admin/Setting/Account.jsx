import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, ArrowLeft, ChevronDown } from 'lucide-react';
import { authAPI, billingAPI } from '../../../utils/api';
import { countryCodes } from '../../../utils/countryCodes';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import { websiteUrl } from '../../../config/appConfig';
import { formatCurrency } from '../../../utils/currency';

export default function Account({ currency, isPlanExpired, checkPlanExpiry }) {
  const navigate = useNavigate();
  const userType = localStorage.getItem('userType');
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCode: '+91',
    email: '',
    isSubUser: false
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCode: '+91'
  });

  const isSubUser = userType === 'subUser' || userInfo.isSubUser;

  // Dropdown states
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState('');
  const [phoneCodeHighlightedIndex, setPhoneCodeHighlightedIndex] = useState(0);

  // Refs for dropdown
  const phoneCodeInputRef = useRef(null);
  const phoneCodeOptionsListRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [billingHistory, setBillingHistory] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  // Load user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Check if user is a sub-user
        const userType = localStorage.getItem('userType');
        const storedUser = localStorage.getItem('user');

        if (userType === 'subUser' && storedUser) {
          // Handle sub-user data from localStorage
          const user = JSON.parse(storedUser);

          let parsedPhone = '';
          let parsedPhoneCode = '+91';
          const storedPhone = ''; // Sub-users don't have phone in the current storedUser object usually

          const userData = {
            firstName: user.name || '',
            lastName: '',
            phone: parsedPhone,
            phoneCode: parsedPhoneCode,
            email: user.email || '',
            isSubUser: true
          };
          setUserInfo(userData);
          setFormData({
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            phoneCode: userData.phoneCode
          });
        } else {
          // Handle main user data from API
          const response = await authAPI.getProfile();
          if (response.success) {
            const rawPhone = response.data.phone || '';
            let parsedPhone = rawPhone;
            let parsedPhoneCode = '+91';

            if (rawPhone.startsWith('+')) {
              // Find the longest matching country code
              const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
              const match = sortedCodes.find(c => rawPhone.startsWith(c.dial_code));
              if (match) {
                parsedPhoneCode = match.dial_code;
                parsedPhone = rawPhone.slice(match.dial_code.length);
              }
            }

            const userData = {
              firstName: response.data.isSubUser ? (response.data.name || '') : (response.data.firstName || ''),
              lastName: response.data.lastName || '',
              phone: parsedPhone,
              phoneCode: parsedPhoneCode,
              email: response.data.email || '',
              isSubUser: response.data.isSubUser || false
            };
            setUserInfo(userData);
            setFormData({
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone,
              phoneCode: userData.phoneCode
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);

        // Fallback to localStorage data if API fails
        const storedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType');

        if (storedUser) {
          const user = JSON.parse(storedUser);
          let userData;

          if (userType === 'subUser') {
            userData = {
              firstName: user.name || '',
              lastName: '',
              phone: '',
              phoneCode: '+91',
              email: user.email || ''
            };
          } else {
            const rawPhone = user.phone || '';
            let parsedPhone = rawPhone;
            let parsedPhoneCode = '+91';

            if (rawPhone.startsWith('+')) {
              const sortedCodes = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length);
              const match = sortedCodes.find(c => rawPhone.startsWith(c.dial_code));
              if (match) {
                parsedPhoneCode = match.dial_code;
                parsedPhone = rawPhone.slice(match.dial_code.length);
              }
            }

            userData = {
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              phone: parsedPhone,
              phoneCode: parsedPhoneCode,
              email: user.email || ''
            };
          }

          setUserInfo(userData);
          setFormData({
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            phoneCode: userData.phoneCode
          });
        } else {
          showErrorToast('Failed to load user information');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Load billing history from API
  useEffect(() => {
    const fetchBillingHistory = async () => {
      // Skip billing history for sub-users
      const userType = localStorage.getItem('userType');
      if (userType === 'subUser') {
        setBillingHistory([]);
        setBillingLoading(false);
        return;
      }

      try {
        setBillingLoading(true);


        // First test if billing routes are accessible
        try {
          const healthCheck = await billingAPI.testConnection();

        } catch (healthError) {
          console.error('Billing health check failed:', healthError);

          setBillingHistory([]);
          return;
        }


        const response = await billingAPI.getHistory();

        if (response.success) {

          setBillingHistory(response.data);
        }
      } catch (error) {
        console.error('Error fetching billing history:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          stack: error.stack
        });
        // Keep empty array if API fails
        setBillingHistory([]);
      } finally {
        setBillingLoading(false);
      }
    };

    fetchBillingHistory();
  }, []);

  // Validate phone number
  const validatePhone = (phone) => {
    if (!phone) {
      return 'Phone number is required';
    }
    // Remove spaces and special characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Check if it contains only digits
    if (!/^\d+$/.test(cleanPhone)) {
      return 'Phone number must contain only digits';
    }

    // Check length (7-15 digits for international numbers)
    if (cleanPhone.length < 7 || cleanPhone.length > 20) {
      return 'Phone number must be between 7 and 20 digits';
    }

    return '';
  };

  // Filter country codes based on search term
  const filteredCountryCodes = countryCodes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
      c.dial_code.includes(phoneCodeSearchTerm);
    const isSelected = phoneCodeSearchTerm === "" && c.dial_code === (isEditMode ? formData.phoneCode : userInfo.phoneCode);
    return matchesSearch || isSelected;
  });

  // Dropdown - Reset highlighted index when filtered items change
  useEffect(() => {
    if (filteredCountryCodes.length > 0 && phoneCodeHighlightedIndex >= filteredCountryCodes.length) {
      setPhoneCodeHighlightedIndex(0);
    }
  }, [filteredCountryCodes.length, phoneCodeHighlightedIndex]);

  // Dropdown - Scroll highlighted item into view
  useEffect(() => {
    if (showPhoneCodeDropdown && phoneCodeOptionsListRef.current) {
      const highlightedElement = phoneCodeOptionsListRef.current.children[phoneCodeHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [phoneCodeHighlightedIndex, showPhoneCodeDropdown]);

  // Dropdown - Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownElement = event.target.closest('[data-dropdown="phoneCode"]');
      if (!dropdownElement && showPhoneCodeDropdown) {
        setShowPhoneCodeDropdown(false);
        setPhoneCodeSearchTerm("");
        setPhoneCodeHighlightedIndex(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPhoneCodeDropdown]);

  const selectPhoneCode = (dialCode) => {
    handleInputChange('phoneCode', dialCode);
    setShowPhoneCodeDropdown(false);
    setPhoneCodeSearchTerm("");
    setPhoneCodeHighlightedIndex(0);
  };

  const handlePhoneCodeKeyDown = (e) => {
    if (!showPhoneCodeDropdown || filteredCountryCodes.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setPhoneCodeHighlightedIndex((prev) =>
          prev < filteredCountryCodes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setPhoneCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountryCodes[phoneCodeHighlightedIndex]) {
          selectPhoneCode(filteredCountryCodes[phoneCodeHighlightedIndex].dial_code);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPhoneCodeDropdown(false);
        setPhoneCodeSearchTerm("");
        setPhoneCodeHighlightedIndex(0);
        break;
      default:
        break;
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle phone input change with validation
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    handleInputChange('phone', value);

    // Validate on change
    const error = validatePhone(value);
    setPhoneError(error);
  };

  const handleEdit = () => {
    if (isPlanExpired) {
      checkPlanExpiry();
      return;
    }

    setIsEditMode(true);
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      phone: userInfo.phone,
      phoneCode: userInfo.phoneCode
    });
    setPhoneError('');
    setIsEditMode(false);
  };

  const handleSaveUserInfo = async () => {
    // Validate before saving (only phone if not subUser)
    if (!isSubUser) {
      const phoneValidationError = validatePhone(formData.phone);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        showWarningToast('Please fix the validation errors before saving');
        return;
      }
    }

    if (!formData.firstName?.trim()) {
      showWarningToast(isSubUser ? 'Name is required' : 'First name is required');
      return;
    }

    try {
      setSaving(true);
      const fullPhone = (formData.phoneCode || '') + (formData.phone || '');
      const response = await authAPI.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: fullPhone
      });

      if (response.success) {
        // Update userInfo with new data
        setUserInfo(prev => ({
          ...prev,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          phoneCode: formData.phoneCode
        }));
        setPhoneError('');
        setIsEditMode(false);
        showSuccessToast('User information updated successfully!');
      }
    } catch (error) {
      console.error('Error updating user info:', error);
      showErrorToast('Failed to update user information');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSuggestion = () => {
    if (!suggestion?.trim()) {
      showWarningToast('Please enter your suggestion');
      return;
    }
    // API call to submit suggestion

    showSuccessToast('Thank you for your suggestion!');
    setSuggestion('');
    setShowSuggestionModal(false);
  };

  const handleDownloadReceipt = async (billingId, referenceNumber) => {
    try {
      setDownloadingReceipt(billingId);

      await billingAPI.downloadReceipt(billingId, currency || 'INR');

      // Show success toast
      showSuccessToast(`Receipt for ${referenceNumber} downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading receipt:', error);

      // Show error toast
      showErrorToast('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto bg-transparent min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-transparent min-h-screen">
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
        <div>
          {/* <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500">Manage Your Account And Subscription</p> */}
        </div>
        <div className="flex items-center gap-3">
          {!isEditMode ? (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 h-8 sm:h-8 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs sm:text-base font-medium whitespace-nowrap"
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-2 sm:px-4 py-2 h-8 sm:h-8 border border-red-500 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs sm:text-base font-medium whitespace-nowrap flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserInfo}
                disabled={saving}
                className="px-2 sm:px-4 py-2 h-8 sm:h-8 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-md hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-xs sm:text-base font-medium whitespace-nowrap flex items-center justify-center disabled:bg-gray-400 disabled:text-gray-200"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-6">
        {/* General Information */}
        <div className="bg-white rounded-lg border border-yellow-200 p-6">
          <h3 className="text-lg font-semibold mb-6">General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSubUser ? 'NAME *' : 'FIRST NAME *'}
              </label>
              <input
                type="text"
                autoComplete="off"
                value={isEditMode ? formData.firstName : userInfo.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={!isEditMode}
                placeholder={isSubUser ? "Enter name" : "Enter first name"}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:outline-none disabled:cursor-not-allowed ${isEditMode
                  ? 'border-yellow-300 focus:ring-yellow-500 bg-white'
                  : 'border-gray-300 bg-gray-100'
                  }`}
              />
            </div>
            {!isSubUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LAST NAME
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={isEditMode ? formData.lastName : userInfo.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={!isEditMode}
                  placeholder="Enter last name"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:outline-none disabled:cursor-not-allowed ${isEditMode
                    ? 'border-yellow-300 focus:ring-yellow-500 bg-white'
                    : 'border-gray-300 bg-gray-100'
                    }`}
                />
              </div>
            )}
            {!isSubUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MOBILE NUMBER *
                </label>
                <div className="flex items-start gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative w-20" data-dropdown="phoneCode">
                    <input
                      ref={phoneCodeInputRef}
                      type="text"
                      autoComplete="off"
                      value={showPhoneCodeDropdown ? phoneCodeSearchTerm : (isEditMode ? formData.phoneCode : userInfo.phoneCode)}
                      onChange={(e) => {
                        setPhoneCodeSearchTerm(e.target.value);
                        if (!showPhoneCodeDropdown) setShowPhoneCodeDropdown(true);
                        setPhoneCodeHighlightedIndex(0);
                      }}
                      onFocus={() => {
                        if (isEditMode) {
                          setShowPhoneCodeDropdown(true);
                          const selectedIdx = filteredCountryCodes.findIndex(c => c.dial_code === (isEditMode ? formData.phoneCode : userInfo.phoneCode));
                          setPhoneCodeHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
                        }
                      }}
                      onKeyDown={handlePhoneCodeKeyDown}
                      placeholder="+91"
                      disabled={!isEditMode}
                      className={`w-full px-2 py-2 border rounded-lg focus:ring-2 focus:outline-none disabled:cursor-not-allowed ${isEditMode
                        ? 'border-yellow-300 focus:ring-yellow-500 bg-white'
                        : 'border-gray-300 bg-gray-100'
                        }`}
                    />
                    {isEditMode && showPhoneCodeDropdown && (
                      <div ref={phoneCodeOptionsListRef} className="absolute z-50 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                        {filteredCountryCodes.length > 0 ? (
                          filteredCountryCodes.map((c, index) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => selectPhoneCode(c.dial_code)}
                              onMouseEnter={() => setPhoneCodeHighlightedIndex(index)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${phoneCodeHighlightedIndex === index || (isEditMode ? formData.phoneCode : userInfo.phoneCode) === c.dial_code
                                ? "bg-[#129046] text-white font-bold"
                                : "hover:bg-gray-50 text-gray-800"
                                }`}
                            >
                              <span className="font-bold">{c.dial_code}</span> ({c.name})
                            </button>
                          ))
                        ) : (
                          null
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone Number Input */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      autoComplete="off"
                      value={isEditMode ? formData.phone : userInfo.phone}
                      onChange={handlePhoneChange}
                      disabled={!isEditMode}
                      placeholder="Enter phone number"
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:outline-none disabled:cursor-not-allowed ${phoneError
                        ? 'border-red-500 focus:ring-red-500'
                        : isEditMode
                          ? 'border-yellow-300 focus:ring-yellow-500 bg-white'
                          : 'border-gray-300 bg-gray-100'
                        }`}
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                )}

              </div>
            )}
            {isSubUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={userInfo.email}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  title="Email cannot be changed"
                />
              </div>
            )}
          </div>
          {!isSubUser && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={userInfo.email}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  title="Email cannot be changed"
                />

              </div>
            </div>
          )}
        </div>
        {/* Billing History - Only show for main users */}
        {!isSubUser && (
          <div className="bg-white rounded-lg border border-yellow-200 p-6">
            <h3 className="text-lg font-semibold mb-6">Billing History</h3>
            {billingLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading billing history...</p>
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No billing history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b border-yellow-300 bg-yellow-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">USER CREATED DATE</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">PLAN</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">PLAN VALIDATIONS</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">REFERENCE #</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">PAYMENT STATUS</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">AMOUNT</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap text-sm uppercase">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item, index) => (
                      <tr key={index} className={`border-b border-green-100 ${index % 2 === 0 ? 'bg-green-50' : 'bg-white'} hover:bg-green-100 transition-colors`}>
                        <td className="py-2 px-2 text-gray-800 whitespace-nowrap text-sm">{item.date}</td>
                        <td className="py-2 px-2 text-gray-800 whitespace-nowrap text-sm">{item.plan}</td>
                        <td className="py-2 px-2 text-gray-700 whitespace-nowrap text-sm">{item.planValidationsFormatted || `${item.planValidations} days`}</td>
                        <td className="py-2 px-2 text-gray-700 whitespace-nowrap text-sm">{item.reference}</td>
                        <td className="py-2 px-2 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status.toLowerCase() === 'success'
                            ? 'bg-green-200 text-green-800'
                            : item.status.toLowerCase() === 'pending'
                              ? 'bg-yellow-200 text-yellow-800'
                              : item.status.toLowerCase() === 'failed'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-gray-200 text-gray-800'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-semibold text-gray-900 whitespace-nowrap text-sm">{formatCurrency(item.amount, currency || 'INR')}</td>
                        <td className="py-2 px-2 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDownloadReceipt(item.id, item.reference)}
                            disabled={downloadingReceipt === item.id}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-full hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-md hover:shadow-lg"
                          >
                            <Download className="w-3.5 h-3.5 flex-shrink-0 font-bold drop-shadow" />
                            <span className="font-bold drop-shadow">{downloadingReceipt === item.id ? 'Downloading...' : 'Download'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Send Suggestion</h3>
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Share your suggestions or feedback..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSuggestion}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
