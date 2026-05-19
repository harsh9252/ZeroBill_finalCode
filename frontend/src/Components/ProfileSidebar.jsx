import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building, Clock, AlertTriangle, XCircle, MessageSquare, LogOut, Settings, Settings2 } from 'lucide-react';
import VoucherSettingsModal from './VoucherSettingsModal';
import { authAPI, businessAPI, partyAPI } from '../utils/api';
import { websiteUrl } from '../config/appConfig';
import { getApiURL, getImageURL } from '../utils/config';
import { isSubUser as checkIsSubUser } from '../utils/roleUtils';

const ProfileSidebar = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [maxBusinesses, setMaxBusinesses] = useState(1);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [businessLogos, setBusinessLogos] = useState({});
  const [currentBusinessLogo, setCurrentBusinessLogo] = useState(null);
  const [businessPartiesCount, setBusinessPartiesCount] = useState({});
  const [loadingPartiesCount, setLoadingPartiesCount] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const navigate = useNavigate();
  const businessDropdownRef = useRef(null);

  // Calculate remaining days based on billingPeriodEnd
  const calculateRemainingDays = (expiryDate) => {
    if (!expiryDate) return 0;

    const endDate = new Date(expiryDate);
    const currentDate = new Date();

    // Calculate difference in milliseconds
    const timeDifference = endDate.getTime() - currentDate.getTime();

    // Convert to days
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    // Return 0 if expired, otherwise return remaining days
    return Math.max(0, daysRemaining);
  };

  // Format remaining time display
  const formatRemainingTime = (days) => {
    if (days <= 0) return "Trial Expired";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  };

  // Default user data structure
  const defaultUserData = {
    name: "User",
    userId: "",
    email: "",
    phone: "",
    trialDays: 15,
    plan: "Enterprise Edition",
    isSubUser: false
  };

  // Fetch parties count for all businesses
  const fetchPartiesCount = async () => {
    if (businesses.length === 0) return;

    try {
      setLoadingPartiesCount(true);
      const partiesCountMap = {};

      // Fetch parties count for each business
      await Promise.all(
        businesses.map(async (business) => {
          try {
            const response = await partyAPI.getStats(business.id);
            if (response.success && response.data) {
              partiesCountMap[business.id] = response.data.total_parties || 0;
            } else {
              partiesCountMap[business.id] = 0;
            }
          } catch (error) {
            console.error(`Error fetching parties count for business ${business.id}: `, error);
            partiesCountMap[business.id] = 0;
          }
        })
      );

      setBusinessPartiesCount(partiesCountMap);
    } catch (error) {
      console.error('Error fetching parties count:', error);
    } finally {
      setLoadingPartiesCount(false);
    }
  };

  // Fetch business stats when businesses are loaded or dropdown is opened
  useEffect(() => {
    if (businesses.length > 0 && showBusinessDropdown) {
      fetchPartiesCount();
    }
  }, [businesses, showBusinessDropdown]);

  // Listen for party changes to refresh parties count
  useEffect(() => {
    const handlePartyChange = () => {
      if (businesses.length > 0) {
        fetchPartiesCount();
      }
    };

    window.addEventListener('partyChanged', handlePartyChange);
    window.addEventListener('partyCreated', handlePartyChange);
    window.addEventListener('partyUpdated', handlePartyChange);
    window.addEventListener('partyDeleted', handlePartyChange);

    return () => {
      window.removeEventListener('partyChanged', handlePartyChange);
      window.removeEventListener('partyCreated', handlePartyChange);
      window.removeEventListener('partyUpdated', handlePartyChange);
      window.removeEventListener('partyDeleted', handlePartyChange);
    };
  }, [businesses]);

  // Fetch businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoadingBusinesses(true);

        // Always fetch from API to ensure data consistency, especially after refresh
        const response = await businessAPI.getAll();

        let businessesData = [];
        if (response.success) {
          if (response.maxBusinesses !== undefined) {
            setMaxBusinesses(response.maxBusinesses);
          }

          if (response.data.length > 0) {
            businessesData = response.data;
          }
        } else {
          // Fallback to localStorage ONLY if API fails or returns empty (e.g. offline)
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              businessesData = user.accessibleBusinesses || [];
            } catch (e) {
              console.warn('Failed to parse user from storage:', e);
            }
          }
        }

        if (businessesData.length > 0) {
          // Map businesses and add color/initial
          const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
          const logos = {};

          const mappedBusinesses = businessesData.map((business, index) => {
            // Store logo URL if exists
            const logoUrl = business.logo_url || business.logoUrl;
            if (logoUrl) {
              logos[business.id] = getImageURL(logoUrl);
            }

            return {
              id: business.id,
              name: business.business_name,
              initial: business.business_name.substring(0, 2).toUpperCase(),
              color: colors[index % colors.length],
              logoUrl: logos[business.id] || null
            };
          });

          setBusinesses(mappedBusinesses);
          setBusinessLogos(logos);

          // Set selected business from localStorage or first business
          const savedBusinessId = localStorage.getItem('selectedBusinessId');
          let businessToSelect = null;

          if (savedBusinessId) {
            businessToSelect = mappedBusinesses.find(b => b.id.toString() === savedBusinessId.toString());
          }

          if (!businessToSelect && mappedBusinesses.length > 0) {
            businessToSelect = mappedBusinesses[0];
          }

          if (businessToSelect) {
            const id = businessToSelect.id;
            const logo = logos[id] || null;
            const name = businessToSelect.name;

            setSelectedBusinessId(id);
            setCurrentBusinessLogo(logo);
            localStorage.setItem('selectedBusinessId', id.toString());
            localStorage.setItem('currentBusinessLogo', logo || '');
            localStorage.setItem('currentBusinessName', name || '');

            // Dispatch event to update Sidebar.jsx - use setTimeout to ensure siblings are mounted
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
                detail: {
                  logoUrl: logo,
                  businessId: id,
                  businessName: name
                }
              }));
            }, 100);
          }
        } else {
          // No businesses found, clear state
          setBusinesses([]);
          setBusinessLogos({});
          setSelectedBusinessId(null);
          setCurrentBusinessLogo(null);
          localStorage.removeItem('selectedBusinessId');
          localStorage.removeItem('currentBusinessLogo');
          localStorage.removeItem('currentBusinessName');
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);

        // Fallback for sub-users:try to get accessible businesses from localStorage
        const userType = localStorage.getItem('userType');
        const storedUser = localStorage.getItem('user');

        if (userType === 'subUser' && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            const accessibleBusinesses = user.accessibleBusinesses || [];

            if (accessibleBusinesses.length > 0) {
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];

              const mappedBusinesses = accessibleBusinesses.map((business, index) => ({
                id: business.id,
                name: business.business_name,
                initial: business.business_name.substring(0, 2).toUpperCase(),
                color: colors[index % colors.length],
                logoUrl: null
              }));

              setBusinesses(mappedBusinesses);
              setSelectedBusinessId(mappedBusinesses[0].id);
              localStorage.setItem('selectedBusinessId', mappedBusinesses[0].id.toString());
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
          }
        }
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchBusinesses();

    // Listen for business created event to reload businesses
    const handleBusinessCreated = () => {
      fetchBusinesses();
    };

    // Listen for business deleted event to reload businesses
    const handleBusinessDeleted = (event) => {
      const { deletedBusinessId } = event.detail;

      // Remove the deleted business from state immediately
      setBusinesses(prev => prev.filter(b => b.id !== deletedBusinessId));
      setBusinessLogos(prev => {
        const updated = { ...prev };
        delete updated[deletedBusinessId];
        return updated;
      });

      // If the deleted business was selected, clear selection
      if (selectedBusinessId === deletedBusinessId) {
        setSelectedBusinessId(null);
        setCurrentBusinessLogo(null);
        localStorage.removeItem('selectedBusinessId');
        localStorage.removeItem('currentBusinessLogo');
        localStorage.removeItem('currentBusinessName');
      }

      // Reload businesses to get fresh data
      fetchBusinesses();
    };

    window.addEventListener('businessCreated', handleBusinessCreated);
    window.addEventListener('businessDeleted', handleBusinessDeleted);

    return () => {
      window.removeEventListener('businessCreated', handleBusinessCreated);
      window.removeEventListener('businessDeleted', handleBusinessDeleted);
    };
  }, [selectedBusinessId]);

  // Handle click outside business dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (businessDropdownRef.current && !businessDropdownRef.current.contains(event.target)) {
        setShowBusinessDropdown(false);
      }
    };

    if (showBusinessDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBusinessDropdown]);

  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // First check if user data exists in localStorage
        const storedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType');

        if (storedUser) {
          const user = JSON.parse(storedUser);

          if (userType === 'subUser') {
            // Sub-user data structure
            setUserData({
              name: user.name || 'Sub User',
              userId: user.id?.toString() || '',
              email: user.email || '',
              phone: '',
              trialDays: 0,
              plan: "Sub User Account",
              isSubUser: true,
              parentUserId: user.parentUserId,
              accessibleBusinesses: user.accessibleBusinesses || [],
              permissions: user.permissions || []
            });
          } else {
            // Main user data structure
            const remainingDays = calculateRemainingDays(user.billingPeriodEnd);
            setUserData({
              name: (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) || 'User',
              userId: user.id?.toString() || '',
              email: user.email || '',
              phone: user.phone || '',
              trialDays: remainingDays,
              isPlanExpired: user.isPlanExpired,
              billingPeriodEnd: user.billingPeriodEnd,
              plan: user.plan || "Trial Account",
              createdAt: user.createdAt,
              isSubUser: false
            });
          }
        }

        // Then fetch fresh data from API
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authAPI.getProfile();
          if (response.success) {
            const user = response.data;

            if (userType === 'subUser' || user.isSubUser) {
              const remainingDays = calculateRemainingDays(user.billingPeriodEnd);
              const updatedUserData = {
                name: user.name || 'Sub User',
                userId: user.id?.toString() || '',
                email: user.email || '',
                phone: '',
                trialDays: remainingDays,
                isPlanExpired: user.isPlanExpired,
                billingPeriodEnd: user.billingPeriodEnd,
                plan: user.plan || "Sub User Account",
                isSubUser: true,
                parentUserId: user.parentUserId,
                accessibleBusinesses: user.accessibleBusinesses || [],
                permissions: user.permissions || []
              };
              setUserData(updatedUserData);
            } else {
              const remainingDays = calculateRemainingDays(user.billingPeriodEnd);
              const updatedUserData = {
                name: (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) || 'User',
                userId: user.id?.toString() || '',
                email: user.email || '',
                phone: user.phone || '',
                trialDays: remainingDays,
                isPlanExpired: user.isPlanExpired,
                billingPeriodEnd: user.billingPeriodEnd,
                plan: user.plan || "Trial Account",
                createdAt: user.createdAt,
                isSubUser: false
              };
              setUserData(updatedUserData);
            }

            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // If API fails, use localStorage data or default
        const storedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType');

        if (storedUser) {
          const user = JSON.parse(storedUser);

          if (userType === 'subUser') {
            setUserData({
              name: user.name || 'Sub User',
              userId: user.id?.toString() || '',
              email: user.email || '',
              phone: '',
              trialDays: 0,
              plan: "Sub User Account",
              isSubUser: true,
              parentUserId: user.parentUserId,
              accessibleBusinesses: user.accessibleBusinesses || [],
              permissions: user.permissions || []
            });
          } else {
            const remainingDays = calculateRemainingDays(user.billingPeriodEnd);
            setUserData({
              name: (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) || 'User',
              userId: user.id?.toString() || '',
              email: user.email || '',
              phone: user.phone || '',
              trialDays: remainingDays,
              isPlanExpired: user.isPlanExpired,
              billingPeriodEnd: user.billingPeriodEnd,
              plan: "Trial Account",
              createdAt: user.createdAt,
              isSubUser: false
            });
          }
        } else {
          setUserData(defaultUserData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Listen for business logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { logoUrl, businessId } = event.detail;

      // Update current logo if it's for the selected business
      if (businessId === selectedBusinessId || !businessId) {
        setCurrentBusinessLogo(logoUrl);
      }

      // Update logos map
      if (businessId) {
        setBusinessLogos(prev => ({
          ...prev,
          [businessId]: logoUrl
        }));
      }
    };

    window.addEventListener('businessLogoUpdated', handleLogoUpdate);
    return () => {
      window.removeEventListener('businessLogoUpdated', handleLogoUpdate);
    };
  }, [selectedBusinessId]);

  // Listen for business changes from BusinessManagement
  useEffect(() => {
    const handleBusinessChangedFromManagement = (event) => {
      const { businessId } = event.detail;
      if (businessId && businessId !== selectedBusinessId) {
        setSelectedBusinessId(businessId);
        const logoUrl = businessLogos[businessId] || null;
        setCurrentBusinessLogo(logoUrl);
        if (typeof businessId !== 'object') {
          localStorage.setItem('selectedBusinessId', businessId.toString());
        }
      }
    };

    window.addEventListener('businessChanged', handleBusinessChangedFromManagement);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChangedFromManagement);
    };
  }, [selectedBusinessId, businessLogos]);

  // Load saved business from localStorage on mount
  useEffect(() => {
    const savedBusinessId = localStorage.getItem('selectedBusinessId');
    if (savedBusinessId && businesses.length > 0) {
      const businessExists = businesses.find(b => b.id === parseInt(savedBusinessId));
      if (businessExists) {
        setSelectedBusinessId(parseInt(savedBusinessId));
        setCurrentBusinessLogo(businessLogos[parseInt(savedBusinessId)] || null);
      }
    }
  }, [businesses, businessLogos]);

  // Get selected business name
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId)?.name || (loadingBusinesses ? "Loading..." : "No Business");

  // Handle business selection
  const handleBusinessSelect = (businessId) => {
    setSelectedBusinessId(businessId);
    const logoUrl = businessLogos[businessId] || null;
    setCurrentBusinessLogo(logoUrl);
    localStorage.setItem('selectedBusinessId', businessId.toString());

    // Update localStorage with the logo URL for immediate effect
    if (logoUrl) {
      localStorage.setItem('currentBusinessLogo', logoUrl);
    } else {
      localStorage.removeItem('currentBusinessLogo');
    }

    // Get business name and type
    const selectedBusiness = businesses.find(b => b.id === businessId);
    const businessName = selectedBusiness?.name || '';
    if (businessName) {
      localStorage.setItem('currentBusinessName', businessName);
    }

    // Fetch and store business type
    const fetchBusinessType = async () => {
      try {
        const response = await businessAPI.getById(businessId);
        if (response.success && response.data) {
          const businessType = response.data.business_type || response.data.businessType;
          if (businessType) {
            localStorage.setItem('currentBusinessType', businessType);
          }
        }
      } catch (error) {
        console.error('Error fetching business type:', error);
      }
    };
    fetchBusinessType();

    setShowBusinessDropdown(false);
    setIsOpen(false); // Close sidebar after selection
    document.body.style.overflow = 'auto';

    // Dispatch custom event for live sync with BusinessManagement
    window.dispatchEvent(new CustomEvent('businessChanged', {
      detail: { businessId }
    }));

    // Dispatch logo update event for Sidebar and other components
    window.dispatchEvent(new CustomEvent('businessLogoUpdated', {
      detail: {
        businessId: businessId,
        logoUrl: logoUrl,
        businessName: businessName
      }
    }));
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      // Close business dropdown when sidebar closes
      setShowBusinessDropdown(false);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme:dark)');
    setIsNightMode(mediaQuery.matches);
    const handleChange = (e) => setIsNightMode(e.matches);
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      document.body.style.overflow = 'auto';

      // Call the parent's logout handler if provided
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      } else {
        // Fallback:Clear all stored data and navigate
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('zbe-authenticated');
        sessionStorage.clear();
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userData || !userData.name) return 'U';
    return userData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Toggle Button with Tooltip */}
      <div className="relative">
        <button
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#129046] to-[#9ccc53] flex items-center justify-center transition-all shadow-sm hover:shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            toggleSidebar();
          }}
          onMouseEnter={() => setShowProfileTooltip(true)}
          onMouseLeave={() => setShowProfileTooltip(false)}
          aria-label="Profile"
        >
          <User className="w-5 h-5 text-white" />
        </button>

        {/* Custom Tooltip Below Left */}
        {showProfileTooltip && (
          <div className="absolute top-full -left-3 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] whitespace-nowrap font-medium">
            Profile
          </div>
        )}
      </div>

      {/* Close Button-Outside Sidebar */}
      <button
        className={`fixed top-4 right-4 md:top-6 md:right-[360px] z-[10000] w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'} `}
        onClick={toggleSidebar}
      >
        <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      {/* Sliding Sidebar */}
      <div className={`fixed top-0 right-0 h-screen w-[300px] md:w-[340px] max-w-[90vw] md:max-w-[95vw] bg-white shadow-2xl z-[9999] transition-all duration-400 ease-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'} `}>

        {/* Profile Header with Theme Background */}
        <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-3 pt-4 pb-16 relative">
          <div className="flex items-start gap-2.5">
            {/* User Avatar-Keep as initials only */}
            <div className="w-12 h-12 rounded-xl flex-shrink-0 border-2 border-white/30 shadow-lg bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {loading ? '...' : getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white leading-tight mb-0.5 truncate">
                {loading ? 'Loading...' : (userData?.name || 'User')}
              </h3>
              <p className="text-xs font-medium text-white/80 mb-1.5 leading-tight">
                {loading ? '' : (userData?.email || '')}
              </p>


              {/* Business Dropdown */}
              <div className="relative" ref={businessDropdownRef}>
                <button
                  onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                  className="flex items-center gap-2 text-xs font-medium text-white/90 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-lg"
                >
                  <span className="truncate max-w-[140px]">{selectedBusiness}</span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${showBusinessDropdown ? 'rotate-180' : ''} `} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showBusinessDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-56 md:w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col max-h-96">
                    {/* Add New Business Button-Fixed at Top */}
                    {userData &&
                      userData.isSubUser !== true &&
                      !checkIsSubUser() &&
                      localStorage.getItem('userType')?.toLowerCase() !== 'subuser' &&
                      !JSON.parse(localStorage.getItem('user') || '{}').isSubUser && (
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-2 md:px-4 py-1.5 z-10">
                          <button
                            disabled={businesses.length >= maxBusinesses}
                            onClick={() => {
                              navigate('/business?create=true');
                              setIsOpen(false);
                              setShowBusinessDropdown(false);
                              document.body.style.overflow = 'auto';
                            }}
                            className={`w-full flex items-center justify-start gap-3 py-1.5 px-2 text-sm font-medium rounded-lg transition-colors ${businesses.length >= maxBusinesses
                              ? 'text-gray-400 cursor-not-allowed grayscale'
                              : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                            title={businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses} businesses max)` : ''}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${businesses.length >= maxBusinesses ? 'bg-gray-100' : 'bg-blue-100'
                              }`}>
                              <svg className={`w-4 h-4 ${businesses.length >= maxBusinesses ? 'text-gray-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <span className="text-left">
                              {businesses.length >= maxBusinesses ? `Create New Business (${maxBusinesses})` : 'Add New Business'}
                            </span>
                          </button>
                        </div>
                      )}


                    {/* Business List-Scrollable */}
                    <div className="overflow-y-auto flex-1 py-2">
                      {businesses.map((business) => (
                        <button
                          key={business.id}
                          onClick={() => handleBusinessSelect(business.id)}
                          className={`w-full flex items-center gap-3 px-2 md:px-4 py-2 text-left hover:bg-gray-50 transition-colors ${selectedBusinessId === business.id ? 'bg-green-50' : ''} `}
                        >
                          {/* Business Logo or Initial */}
                          <div className={`w-7 h-7 md:w-9 md:h-9 ${business.color} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden`}>
                            {business.logoUrl ? (
                              <img
                                src={business.logoUrl}
                                alt={business.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <span className={business.logoUrl ? 'hidden' : ''}>
                              {business.initial}
                            </span>
                          </div>

                          {/* Business Name */}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm block truncate ${selectedBusinessId === business.id ? 'text-green-600 font-semibold' : 'text-gray-700'} `}>
                              {business.name}
                            </span>
                          </div>

                          {selectedBusinessId === business.id && (
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trial Badge for Main Users / Sub-User Info for Sub-Users */}
          {!loading && userData && (
            <div className="absolute left-4 right-4 -bottom-8 bg-white border border-yellow-200 rounded-xl p-3 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${userData.isSubUser
                  ? 'bg-gradient-to-r from-blue-100 to-indigo-100'
                  : 'bg-gradient-to-r from-yellow-100 to-amber-100'
                  } `}>
                  <span className={`flex items-center justify-center ${userData.isPlanExpired ? 'text-red-600' : (userData.trialDays <= 7 ? 'text-yellow-600' : (userData.isSubUser ? 'text-blue-600' : 'text-yellow-600'))} `}>
                    {userData.isPlanExpired ? (
                      <XCircle className="w-5 h-5" />
                    ) : (userData.trialDays <= 7 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    ))}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                    {userData.isPlanExpired ? 'Plan Expired' : userData.trialDays <= 10 ? 'Plan Expires Soon' : 'Active Plan'}
                  </p>
                  <p className={`text-xs ${(userData.trialDays <= 10) ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {formatRemainingTime(userData.trialDays)}
                  </p>

                </div>
              </div>
              {!userData.isSubUser && (
                <button
                  onClick={() => {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const token = localStorage.getItem('token');

                    // Support HashRouter by using /#/checkout
                    const checkoutUrl = `${websiteUrl}/#/checkout?type=upgrade&token=${token || ''}&firstName=${encodeURIComponent(user.firstName || user.first_name || '')}&lastName=${encodeURIComponent(user.lastName || user.last_name || '')}&email=${encodeURIComponent(user.email || '')}&phone=${encodeURIComponent(user.phone || '')}`;

                    window.location.href = checkoutUrl;
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 
                    hover:shadow-lg hover:scale-105 active:scale-95
                    ${userData.isPlanExpired
                      ? 'bg-gradient-to-br from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700'
                      : (Number(userData.trialDays) <= 10 && Number(userData.trialDays) > 0)
                        ? 'animate-pulse-bounce bg-red-600 text-white shadow-red-200/50'
                        : 'bg-gradient-to-br from-[#3b0764] to-[#1e0b36] text-white hover:from-[#4a148c] hover:to-[#2e1065] shadow-lg shadow-purple-950/40 border border-white/5'
                    }`}>
                  Upgrade
                </button>
              )}
              {
                userData.isSubUser && (
                  <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    Sub User
                  </div>
                )
              }
            </div>
          )}
        </div>

        {/* Content Section-Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 pt-14 pb-4">
          {/* App Menu Options-Grid Layout */}
          <div className="grid grid-cols-2 gap-3">
            {/* Profile */}
            <div
              onClick={() => { navigate('/account'); setIsOpen(false); document.body.style.overflow = 'auto'; }}
              className="flex flex-col items-center p-4 bg-gradient-to-b from-purple-50 to-white border border-purple-100 rounded-2xl hover:shadow-md hover:border-purple-300 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <User className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center">Profile</span>
            </div>

            {/* Business Profile */}
            <div
              onClick={() => { navigate('/business'); setIsOpen(false); document.body.style.overflow = 'auto'; }}
              className="flex flex-col items-center p-4 bg-gradient-to-b from-green-50 to-white border border-green-100 rounded-2xl hover:shadow-md hover:border-green-300 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                <Building className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center">Business Profile</span>
            </div>


            {/* Support */}
            <div
              onClick={() => { navigate('/support'); setIsOpen(false); document.body.style.overflow = 'auto'; }}
              className="flex flex-col items-center p-4 bg-gradient-to-b from-pink-50 to-white border border-pink-100 rounded-2xl hover:shadow-md hover:border-pink-300 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center">Support</span>
            </div>

            <div
              onClick={() => { navigate('/business'); setIsOpen(false); document.body.style.overflow = 'auto'; }}
              className="flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-2xl hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center">Settings</span>
            </div>

          </div>
        </div>

        {/* Fixed Bottom Actions-Outside scrollable area */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                navigate('/account');
                setIsOpen(false);
                document.body.style.overflow = 'auto';
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-yellow-300/50 hover:scale-[1.02] hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 active:scale-[0.98]"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">My Account</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-red-200 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {
        isOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9997]"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
          />
        )
      }

    </>
  );
};

export default ProfileSidebar;
