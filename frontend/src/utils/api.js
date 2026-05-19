// Dynamic API Configuration based on environment
export const getApiConfig = () => {
  return {
    baseURL: import.meta.env.VITE_API_URL,
    backendURL: import.meta.env.VITE_BACKEND_URL
  };
};

const { baseURL } = getApiConfig();

// Export API_BASE_URL for use in other services
export const API_BASE_URL = baseURL;

// Self-healing for corrupted localStorage
if (typeof localStorage !== 'undefined') {
  const sid = localStorage.getItem('selectedBusinessId');
  if (sid === '[object Object]') {
    localStorage.removeItem('selectedBusinessId');
    console.warn('Cleared corrupted selectedBusinessId from localStorage');
  }
}

// Helper function to get auth token
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to get user data
export const getUserData = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Helper function to clear auth data
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('zbe-authenticated');
  localStorage.removeItem('userType');
  // Dispatch a storage event so the current tab's listeners (in App.jsx) update their state
  window.dispatchEvent(new Event('storage'));
};

// API request helper with authentication
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${baseURL}${endpoint}`, config);

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized - but NOT for login endpoint (let login component handle it)
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/verify-otp')) {
        // IMPORTANT: Prevent redirecting to regular login if we are currently in the Super Admin panel
        const isSuperAdminRoute = window.location.pathname.includes('/superadmin') || window.location.hash.includes('/superadmin');

        if (!isSuperAdminRoute) {
          console.warn('Unauthorized access detected. Clearing auth data and redirecting.');
          clearAuthData();
          // Use a full reload to clear all React state and avoid "black screen" crashes
          if (typeof window !== 'undefined') {
            window.location.href = '/#/login';
            window.location.reload();
          }
        } else {
          console.warn('Regular user 401 caught while on Super Admin route. Ignoring redirect.');
        }
      }

      // Create error object with response data for better error handling
      const error = new Error(data.message || `HTTP ${response.status}: API request failed`);
      error.response = { data, status: response.status };
      error.code = data.code; // Propagate code directly
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  // Login
  login: async (identifier, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  // Send OTP
  sendOTP: async (emailOrData) => {
    const data = typeof emailOrData === 'string' ? { email: emailOrData } : emailOrData;
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify OTP
  verifyOTP: async (email, otp, purpose = 'login') => {
    let data;
    if (typeof email === 'object' && email !== null) {
      data = email;
    } else {
      data = { email, otp, purpose };
    }

    return apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Signup
  signup: async (userData) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Get current user profile
  getProfile: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },

  // Update profile
  updateProfile: async (userData) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Forgot password
  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (email, otp, newPassword) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },
};

// Business API functions
export const businessAPI = {
  // Create business
  create: async (businessData) => {
    return apiRequest('/business', {
      method: 'POST',
      body: JSON.stringify(businessData),
    });
  },

  // Get all businesses
  getAll: async () => {
    return apiRequest('/business', {
      method: 'GET',
    });
  },

  // Get single business
  getById: async (id) => {
    return apiRequest(`/business/${id}`, {
      method: 'GET',
    });
  },

  // Update business
  update: async (id, businessData) => {
    return apiRequest(`/business/${id}`, {
      method: 'PUT',
      body: JSON.stringify(businessData),
    });
  },

  // Update business with file upload
  updateWithFile: async (businessId, formData) => {
    const token = getAuthToken();

    const config = {
      method: 'PUT',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    };

    try {
      const response = await fetch(`${baseURL}/business/${businessId}/upload`, config);
      const data = await response.json();

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        const isSuperAdminRoute = window.location.pathname.includes('/superadmin') || window.location.hash.includes('/superadmin');
        if (!isSuperAdminRoute) {
          console.warn('Token expired or invalid. Clearing auth data and redirecting to login.');
          clearAuthData();
          if (typeof window !== 'undefined') {
            window.location.href = '/#/login';
            window.location.reload();
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Delete business
  delete: async (id) => {
    return apiRequest(`/business/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle business status
  toggleStatus: async (id) => {
    return apiRequest(`/business/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  // Get city by pincode/zipcode
  getCityByPincode: async (pincode, country = 'India') => {
    return apiRequest(`/business/pincode/${pincode}?country=${encodeURIComponent(country)}`, {
      method: 'GET',
    });
  },

  // Get cities by state
  getCitiesByState: async (state) => {
    return apiRequest(`/business/cities/${encodeURIComponent(state)}`, {
      method: 'GET',
    });
  },
  // Generic file upload
  uploadFile: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    const config = {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    };
    try {
      const response = await fetch(`${baseURL}/upload-file`, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  },

  // Voucher Settings
  getVoucherSettings: async (businessId) => {
    return apiRequest(`/business/voucher-settings/${businessId}`, {
      method: 'GET',
    });
  },

  updateVoucherSettings: async (businessId, settings) => {
    return apiRequest(`/business/voucher-settings/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  },

  resetVoucherSettings: async (businessId) => {
    return apiRequest(`/business/voucher-settings/${businessId}`, {
      method: 'DELETE',
    });
  },
};

// Support API functions
export const supportAPI = {
  // Send support message
  sendMessage: async (messageData) => {
    return apiRequest('/support/contact', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },
};

// Dashboard API functions
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async (businessId) => {
    const endpoint = businessId ? `/dashboard/stats?business_id=${businessId}` : '/dashboard/stats';
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
};

// Billing API functions
export const billingAPI = {
  // Test billing routes
  testConnection: async () => {
    return apiRequest('/billing/health', {
      method: 'GET',
    });
  },

  // Get billing history
  getHistory: async () => {
    return apiRequest('/billing/history', {
      method: 'GET',
    });
  },

  // Get billing summary
  getSummary: async () => {
    return apiRequest('/billing/summary', {
      method: 'GET',
    });
  },

  // Download receipt for a billing record
  downloadReceipt: async (billingId, currency = 'INR') => {
    const token = getAuthToken();
    const { backendURL } = getApiConfig();

    try {
      const response = await fetch(`${backendURL}/api/billing/receipt/${billingId}?currency=${currency}`, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const isSuperAdminRoute = window.location.pathname.includes('/superadmin') || window.location.hash.includes('/superadmin');
          if (!isSuperAdminRoute) {
            console.warn('Token expired or invalid. Clearing auth data and redirecting to login.');
            clearAuthData();
            if (typeof window !== 'undefined') {
              window.location.href = '/#/login';
              window.location.reload();
            }
          }
          throw new Error('Unauthorized');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download receipt');
      }

      // Get the PDF content as a blob
      const blob = await response.blob();

      // Determine filename from headers or default
      let filename = `receipt-${billingId}.pdf`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameMatch = disposition.match(/filename="?([^"]*)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a temporary link and trigger download
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return { success: true, message: 'Receipt downloaded successfully' };
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  },

  // Upgrade plan
  upgradePlan: async (upgradeData) => {
    return apiRequest('/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify(upgradeData),
    });
  },
};

// Pricing API functions
export const pricingAPI = {
  // Get all active pricing plans
  getAll: async () => {
    return apiRequest('/pricing', {
      method: 'GET',
    });
  },

  // Get pricing plan by ID
  getById: async (id) => {
    return apiRequest(`/pricing/${id}`, {
      method: 'GET',
    });
  },
};

// Party API functions
export const partyAPI = {
  // Create party with JSON data
  create: async (partyData) => {
    try {

      const response = await apiRequest('/parties', {
        method: 'POST',
        body: JSON.stringify(partyData),
      });


      return response;
    } catch (error) {
      console.error('Party API Error:', error);
      console.error('ERROR RESPONSE:', error?.response?.data);
      console.error('VALIDATION ERRORS:', error?.response?.data?.errors);
      console.error('FIRST ERROR:', error?.response?.data?.errors?.[0]);
      throw error;
    }
  },

  // Create party with FormData (for file uploads) - renamed to createWithFile
  createWithFile: async (formData) => {
    const token = getAuthToken();

    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    };

    try {

      const response = await fetch(`${baseURL}/parties`, config);



      const data = await response.json();


      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        console.warn('Token expired or invalid. Clearing auth data and redirecting to login.');
        clearAuthData();
        if (typeof window !== 'undefined') {
          window.location.href = '/#/login';
        }
      }

      if (!response.ok) {
        // Create error object with response data for better error handling
        const error = new Error(data.message || `HTTP ${response.status}: API request failed`);
        error.response = { data, status: response.status };
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      console.error('API Error details:', {
        endpoint: `${baseURL}/parties`,
        config,
        message: error.message
      });
      throw error;
    }
  },

  // Get all parties
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/parties';
    const params = new URLSearchParams();

    if (businessId) {
      params.append('business_id', businessId);
    }

    // Add filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get single party
  getById: async (id, businessId = null) => {
    let endpoint = `/parties/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Update party
  update: async (id, partyData, businessId = null) => {
    let endpoint = `/parties/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(partyData),
    });
  },

  // Update party with file upload
  updateWithFile: async (id, formData, businessId = null) => {
    const token = getAuthToken();

    let endpoint = `/parties/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }

    const config = {
      method: 'PUT',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    };

    try {
      const response = await fetch(`${baseURL}${endpoint}`, config);
      const data = await response.json();

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        console.warn('Token expired or invalid. Clearing auth data and redirecting to login.');
        clearAuthData();
        if (typeof window !== 'undefined') {
          window.location.href = '/#/login';
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Delete party (soft delete)
  delete: async (id, businessId = null) => {
    let endpoint = `/parties/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Hard delete party
  hardDelete: async (id, businessId = null) => {
    let endpoint = `/parties/${id}/hard`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Get party statistics
  getStats: async (businessId = null) => {
    let endpoint = '/parties/stats';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get all addresses for a party
  getAddresses: async (partyId, businessId = null) => {
    let endpoint = `/parties/${partyId}/addresses`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get all bank accounts for a party
  getBankAccounts: async (partyId, businessId = null) => {
    let endpoint = `/parties/${partyId}/bank-accounts`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Add bank account to party
  addBankAccount: async (partyId, bankData, businessId = null) => {
    let endpoint = `/parties/${partyId}/bank-accounts`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(bankData),
    });
  },

  // Update party bank account
  updateBankAccount: async (partyId, bankId, bankData, businessId = null) => {
    let endpoint = `/parties/${partyId}/bank-accounts/${bankId}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(bankData),
    });
  },

  // Delete party bank account
  deleteBankAccount: async (partyId, bankId, businessId = null) => {
    let endpoint = `/parties/${partyId}/bank-accounts/${bankId}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Add address to party
  addAddress: async (partyId, addressData, businessId = null) => {
    let endpoint = `/parties/${partyId}/addresses`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  },

  // Update party address
  updateAddress: async (partyId, addressId, addressData, businessId = null) => {
    let endpoint = `/parties/${partyId}/addresses/${addressId}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
  },

  // Delete party address
  deleteAddress: async (partyId, addressId, businessId = null) => {
    let endpoint = `/parties/${partyId}/addresses/${addressId}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },
};

// Supplier API functions (vendors - reuses party endpoints with party_type=vendor filter)
export const supplierAPI = {
  getAll: async (businessId = null, filters = {}) => {
    return partyAPI.getAll(businessId, { ...filters });
  },
  getById: async (id, businessId = null) => {
    return partyAPI.getById(id, businessId);
  },
  create: async (supplierData) => {
    return partyAPI.create({ ...supplierData, party_type: 'vendor' });
  },
  update: async (id, supplierData, businessId = null) => {
    return partyAPI.update(id, supplierData, businessId);
  },
  delete: async (id, businessId = null) => {
    return partyAPI.delete(id, businessId);
  },
  getAddresses: async (supplierId, businessId = null) => {
    return partyAPI.getAddresses(supplierId, businessId);
  },
};

// GRN  API functions
export const grnAPI = {
  create: async (data) => {
    return apiRequest('/grn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAll: async (businessId) => {
    return apiRequest(`/grn?business_id=${businessId}`, { method: 'GET' });
  },
  getNextNumber: async (businessId) => {
    return apiRequest(`/grn/next-number?business_id=${businessId}`, { method: 'GET' });
  },
  getById: async (id, businessId) => {
    return apiRequest(`/grn/${id}?business_id=${businessId}`, { method: 'GET' });
  },
  update: async (id, data) => {
    return apiRequest(`/grn/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id, businessId) => {
    return apiRequest(`/grn/${id}?business_id=${businessId}`, { method: 'DELETE' });
  },
};

// MRN API functions
export const mrnAPI = {
  create: async (data) => {
    return apiRequest('/mrn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAll: async (businessId) => {
    return apiRequest(`/mrn?business_id=${businessId}`, { method: 'GET' });
  },
  getNextNumber: async (businessId) => {
    return apiRequest(`/mrn/next-number?business_id=${businessId}`, { method: 'GET' });
  },
  getById: async (id, businessId) => {
    return apiRequest(`/mrn/${id}?business_id=${businessId}`, { method: 'GET' });
  },
  update: async (id, data) => {
    return apiRequest(`/mrn/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id, businessId) => {
    return apiRequest(`/mrn/${id}?business_id=${businessId}`, { method: 'DELETE' });
  },
};

// Sales Lead API functions
export const salesLeadAPI = {
  create: async (data) => {
    return apiRequest('/sales-leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAll: async (businessId, filters = {}) => {
    let endpoint = `/sales-leads?business_id=${businessId}`;
    if (filters.status) endpoint += `&status=${filters.status}`;
    if (filters.search) endpoint += `&search=${filters.search}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
  getNextNumber: async (businessId) => {
    return apiRequest(`/sales-leads/next-number?business_id=${businessId}`, { method: 'GET' });
  },
  getById: async (id, businessId) => {
    return apiRequest(`/sales-leads/${id}?business_id=${businessId}`, { method: 'GET' });
  },
  update: async (id, data) => {
    return apiRequest(`/sales-leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id, businessId) => {
    return apiRequest(`/sales-leads/${id}?business_id=${businessId}`, { method: 'DELETE' });
  },
};

// Category API functions
export const categoryAPI = {
  // Get all categories for a business
  getAll: async (businessId = null) => {
    let endpoint = '/categories';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Create a new category
  create: async (categoryData) => {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  // Delete a category
  delete: async (id, businessId = null) => {
    let endpoint = `/categories/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Get users permissible for sharing
  getPermissibleUsers: async (businessId) => {
    return apiRequest(`/documents/permissible-users/${businessId}`, {
      method: 'GET',
    });
  },

  // Get current permissions for an item
  getItemPermissions: async (businessId, parentPath, itemName) => {
    return apiRequest(`/documents/permissions?businessId=${businessId}&parentPath=${encodeURIComponent(parentPath)}&itemName=${encodeURIComponent(itemName)}`, {
      method: 'GET',
    });
  },

  // Update permissions for a user on an item
  updatePermissions: async (businessId, parentPath, itemName, userId, perms) => {
    return apiRequest('/documents/permissions', {
      method: 'POST',
      body: JSON.stringify({ businessId, parentPath, itemName, userId, perms }),
    });
  },
};

// Z Khata API functions
export const zKhataAPI = {
  // Parties
  createParty: async (partyData) => {
    return apiRequest('/z-khata/parties', {
      method: 'POST',
      body: JSON.stringify(partyData),
    });
  },

  getAllParties: async (businessId, type = 'all') => {
    return apiRequest(`/z-khata/parties?business_id=${businessId}&type=${type}`, {
      method: 'GET',
    });
  },

  getPartyById: async (id, businessId) => {
    return apiRequest(`/z-khata/parties/${id}?business_id=${businessId}`, {
      method: 'GET',
    });
  },

  // Transactions
  addTransaction: async (transactionData) => {
    return apiRequest('/z-khata/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  getTransactionsForParty: async (partyId, businessId) => {
    return apiRequest(`/z-khata/parties/${partyId}/transactions?business_id=${businessId}`, {
      method: 'GET',
    });
  },

  deleteParty: async (id, businessId) => {
    return apiRequest(`/z-khata/parties/${id}?business_id=${businessId}`, {
      method: 'DELETE',
    });
  },

  updateParty: async (id, partyData) => {
    return apiRequest(`/z-khata/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partyData),
    });
  },

  updateTransaction: async (id, transactionData) => {
    return apiRequest(`/z-khata/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
  },

  deleteTransaction: async (id, businessId) => {
    return apiRequest(`/z-khata/transactions/${id}?business_id=${businessId}`, {
      method: 'DELETE',
    });
  },
};

// Tax Validation API (GST/VAT)
export const taxAPI = {
  validate: async (country_iso, tin) => {
    return apiRequest(`/tax/validate?country_iso=${encodeURIComponent(country_iso)}&tin=${encodeURIComponent(tin)}`, {
      method: 'GET',
    });
  },
  // Alias for validate to handle inconsistent calls in settings
  fetchDetails: async (tin, countryName = 'India') => {
    const country_iso = (countryName === 'India' || countryName === 'IN') ? 'IN' : countryName;
    return apiRequest(`/tax/validate?country_iso=${encodeURIComponent(country_iso)}&tin=${encodeURIComponent(tin)}`, {
      method: 'GET',
    });
  }
};

// Inventory API functions
export const inventoryAPI = {
  // Get all inventory items
  getAll: async (businessId = null) => {
    let endpoint = '/inventory';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get single inventory item
  getById: async (id, businessId = null) => {
    let endpoint = `/inventory/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Create inventory item
  create: async (inventoryData) => {
    return apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(inventoryData),
    });
  },

  // Update inventory item
  update: async (id, inventoryData, businessId = null) => {
    let endpoint = `/inventory/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(inventoryData),
    });
  },

  // Delete inventory item
  delete: async (id, businessId = null) => {
    let endpoint = `/inventory/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },
};

// Quotation API functions
export const quotationAPI = {
  // Get all quotations
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/quotations';
    const params = new URLSearchParams();

    if (businessId) {
      params.append('business_id', businessId);

    } else {

    }

    // Add filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);

      }
    });

    if (params.toString()) {
      endpoint += `?${params.toString()}`;

    } else {

    }

    const result = await apiRequest(endpoint, {
      method: 'GET',
    });


    return result;
  },

  // Get single quotation
  getById: async (id, businessId = null) => {
    let endpoint = `/quotations/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Create quotation
  create: async (arg1, arg2) => {
    const quotationData = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  },

  // Update quotation
  update: async (id, arg2, arg3) => {
    const quotationData = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/quotations/${id}`;
    if (businessId && typeof businessId !== 'object') {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(quotationData),
    });
  },

  // Delete quotation (soft delete)
  delete: async (id, businessId = null) => {
    let endpoint = `/quotations/${id}`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Hard delete quotation
  hardDelete: async (id, businessId = null) => {
    let endpoint = `/quotations/${id}/hard`;
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },

  // Get quotation statistics
  getStats: async (businessId = null) => {
    let endpoint = '/quotations/stats';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Generate next quotation number
  generateNumber: async (businessId = null) => {
    let endpoint = '/quotations/generate-number';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get next quotation number (based on last saved, not incrementing sequence)
  getNextNumber: async (businessId = null) => {
    let endpoint = '/quotations/next-number';
    if (businessId) {
      endpoint += `?business_id=${businessId}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  

  // Convert quotation to Sales or Proforma Invoice
  convert: async (id, convertData, businessId = null) => {
    const business_id = businessId || localStorage.getItem('selectedBusinessId');
    // Support both old (type as string) and new (type and items as object) formats
    const body = typeof convertData === 'string' 
      ? { type: convertData, business_id } 
      : { ...convertData, business_id };
      
    return apiRequest(`/quotations/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// Sales Invoice API functions
export const salesInvoiceAPI = {
  // Get all sales invoices
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/sales-invoices';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get single sales invoice
  getById: async (id, businessId = null) => {
    let endpoint = `/sales-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create sales invoice
  create: async (arg1, arg2) => {
    // Robust argument handling for (invoiceData) or (businessId, invoiceData)
    const invoiceData = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/sales-invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  // Update sales invoice
  update: async (id, arg2, arg3) => {
    // Robust argument handling for (id, invoiceData, businessId) or (id, businessId, invoiceData)
    const invoiceData = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/sales-invoices/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  // Delete sales invoice
  delete: async (id, businessId = null) => {
    let endpoint = `/sales-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Hard delete sales invoice
  hardDelete: async (id, businessId = null) => {
    let endpoint = `/sales-invoices/${id}/hard`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Get statistics
  getStats: async (businessId = null) => {
    let endpoint = '/sales-invoices/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Generate next sales invoice number
  generateNumber: async (businessId = null) => {
    let endpoint = '/sales-invoices/generate-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get next sales invoice number (based on last saved)
  getNextNumber: async (businessId = null) => {
    let endpoint = '/sales-invoices/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Proforma Invoice API functions
export const proformaInvoiceAPI = {
  // Get all proforma invoices
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/proforma-invoices';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get single proforma invoice
  getById: async (id, businessId = null) => {
    let endpoint = `/proforma-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create proforma invoice
  create: async (arg1, arg2) => {
    const invoiceData = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/proforma-invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  // Update proforma invoice
  update: async (id, arg2, arg3) => {
    const invoiceData = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/proforma-invoices/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  // Delete proforma invoice
  delete: async (id, businessId = null) => {
    let endpoint = `/proforma-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Get statistics
  getStats: async (businessId = null) => {
    let endpoint = '/proforma-invoices/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Convert proforma invoice to Sales Invoice
  convert: async (id, convertData = {}) => {
    return apiRequest(`/proforma-invoices/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(convertData),
    });
  },

  // Generate next proforma invoice number
  generateNumber: async (businessId = null) => {
    let endpoint = '/proforma-invoices/generate-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get next proforma invoice number (based on last saved)
  getNextNumber: async (businessId = null) => {
    let endpoint = '/proforma-invoices/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Sales Return API functions
export const salesReturnAPI = {
  // Get all sales returns
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/sales-returns';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get single sales return
  getById: async (id, businessId = null) => {
    let endpoint = `/sales-returns/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create sales return
  create: async (arg1, arg2) => {
    const returnData = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/sales-returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  },

  // Update sales return
  update: async (id, arg2, arg3) => {
    const returnData = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/sales-returns/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(returnData),
    });
  },

  // Delete sales return
  delete: async (id, businessId = null) => {
    let endpoint = `/sales-returns/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Get statistics
  getStats: async (businessId = null) => {
    let endpoint = '/sales-returns/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Generate next sales return number
  generateNumber: async (businessId = null) => {
    let endpoint = '/sales-returns/generate-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get next sales return number (based on last saved)
  getNextNumber: async (businessId = null) => {
    let endpoint = '/sales-returns/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Terms & Conditions API functions
export const termsConditionsAPI = {
  // Get all terms & conditions for a quotation
  getByQuotationId: async (quotationId, businessId = null) => {
    let endpoint = `/terms-conditions/quotation/${quotationId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a sales invoice
  getBySalesId: async (salesId, businessId = null) => {
    let endpoint = `/terms-conditions/sales/${salesId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a proforma invoice
  getByProformaId: async (proformaId, businessId = null) => {
    let endpoint = `/terms-conditions/proforma/${proformaId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a credit note
  getByCreditNoteId: async (creditNoteId, businessId = null) => {
    let endpoint = `/terms-conditions/credit-note/${creditNoteId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a debit note
  getByDebitNoteId: async (debitNoteId, businessId = null) => {
    let endpoint = `/terms-conditions/debit-note/${debitNoteId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a sales return
  getBySalesReturnId: async (salesReturnId, businessId = null) => {
    let endpoint = `/terms-conditions/sales-return/${salesReturnId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a purchase return
  getByPurchaseReturnId: async (purchaseReturnId, businessId = null) => {
    let endpoint = `/terms-conditions/purchase-return/${purchaseReturnId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a delivery challan
  getByDeliveryChallanId: async (deliveryChallanId, businessId = null) => {
    let endpoint = `/terms-conditions/delivery-challan/${deliveryChallanId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a purchase invoice
  getByPurchaseInvoiceId: async (purchaseInvoiceId, businessId = null) => {
    let endpoint = `/terms-conditions/purchase-invoice/${purchaseInvoiceId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a book purchase order
  getByBookPurchaseOrderId: async (bookPurchaseOrderId, businessId = null) => {
    let endpoint = `/terms-conditions/book-purchase-order/${bookPurchaseOrderId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a purchase order
  getByPurchaseOrderId: async (purchaseOrderId, businessId = null) => {
    let endpoint = `/terms-conditions/purchase-order/${purchaseOrderId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get all terms & conditions for a book invoice
  getByBookInvoiceId: async (bookInvoiceId, businessId = null) => {
    let endpoint = `/terms-conditions/book-invoice/${bookInvoiceId}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create single terms & conditions section
  create: async (termsData) => {
    return apiRequest('/terms-conditions', {
      method: 'POST',
      body: JSON.stringify(termsData),
    });
  },

  // Bulk create terms & conditions sections
  bulkCreate: async (quotationId, partyId, sections, businessId = null) => {
    const business_id = businessId || localStorage.getItem('selectedBusinessId');
    return apiRequest('/terms-conditions/bulk', {
      method: 'POST',
      body: JSON.stringify({
        quotation_id: quotationId,
        party_id: partyId,
        sections,
        business_id
      }),
    });
  },

  // Update terms & conditions
  update: async (id, termsData) => {
    return apiRequest(`/terms-conditions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(termsData),
    });
  },

  // Delete single terms & conditions section
  delete: async (id) => {
    return apiRequest(`/terms-conditions/${id}`, {
      method: 'DELETE',
    });
  },

  // Delete all terms & conditions for a quotation
  deleteByQuotationId: async (quotationId) => {
    return apiRequest(`/terms-conditions/quotation/${quotationId}`, {
      method: 'DELETE',
    });
  },

  // Delete all terms & conditions for a book invoice
  deleteByBookInvoiceId: async (bookInvoiceId) => {
    return apiRequest(`/terms-conditions/book-invoice/${bookInvoiceId}`, {
      method: 'DELETE',
    });
  },

  // Get globally locked terms
  getLockedTerms: async (businessId = null) => {
    let endpoint = '/terms-conditions/locked/global';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Lock a specific section globally
  lockSection: async (id, businessId = null) => {
    let endpoint = `/terms-conditions/${id}/lock`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'POST' });
  },
};

// Delivery Challan API functions
export const deliveryChallanAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/delivery-challans';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/delivery-challans/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (data) => {
    return apiRequest('/delivery-challans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data, businessId = null) => {
    let endpoint = `/delivery-challans/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/delivery-challans/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getStats: async (businessId = null) => {
    let endpoint = '/delivery-challans/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/delivery-challans/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Book Purchase Order API functions (Using dedicated book_purchase_orders table)
export const bookPurchaseOrderAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/book-purchase-orders';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/book-purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (data) => {
    return apiRequest('/book-purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data, businessId = null) => {
    let endpoint = `/book-purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/book-purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/book-purchase-orders/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};


// Book Invoice API functions
export const bookInvoiceAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/book-invoices';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/book-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getByPoReference: async (poReference, businessId = null) => {
    let endpoint = `/book-invoices/by-po?po_reference=${poReference}`;
    if (businessId) endpoint += `&business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (arg1, arg2) => {
    const data = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/book-invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, arg2, arg3) => {
    const data = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/book-invoices/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/book-invoices/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getStats: async (businessId = null) => {
    let endpoint = '/book-invoices/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/book-invoices/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Purchase Return API functions
export const purchaseReturnAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/purchase-returns';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/purchase-returns/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (arg1, arg2) => {
    const data = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/purchase-returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, arg2, arg3) => {
    const data = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/purchase-returns/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/purchase-returns/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getStats: async (businessId = null) => {
    let endpoint = '/purchase-returns/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/purchase-returns/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Debit Note API functions
export const debitNoteAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/debit-notes';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/debit-notes/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (arg1, arg2) => {
    const data = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/debit-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, arg2, arg3) => {
    const data = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/debit-notes/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/debit-notes/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getStats: async (businessId = null) => {
    let endpoint = '/debit-notes/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/debit-notes/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Purchase Order API functions
export const purchaseOrderAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/purchase-orders';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (data) => {
    return apiRequest('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data, businessId = null) => {
    let endpoint = `/purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/purchase-orders/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getStats: async (businessId = null) => {
    let endpoint = '/purchase-orders/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/purchase-orders/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Credit Note API functions
export const creditNoteAPI = {
  // Get all credit notes
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/credit-notes';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get single credit note
  getById: async (id, businessId = null) => {
    let endpoint = `/credit-notes/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Create credit note
  create: async (arg1, arg2) => {
    const noteData = (typeof arg1 === 'object') ? arg1 : arg2;
    return apiRequest('/credit-notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  },

  // Update credit note
  update: async (id, arg2, arg3) => {
    const noteData = (typeof arg2 === 'object') ? arg2 : arg3;
    const businessId = (typeof arg2 === 'object') ? arg3 : arg2;

    let endpoint = `/credit-notes/${id}`;
    if (businessId && typeof businessId !== 'object') endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  },

  // Delete credit note
  delete: async (id, businessId = null) => {
    let endpoint = `/credit-notes/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Get statistics
  getStats: async (businessId = null) => {
    let endpoint = '/credit-notes/stats';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  // Get next credit note number (based on last saved)
  getNextNumber: async (businessId = null) => {
    let endpoint = '/credit-notes/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};



// Payment In API functions
export const paymentInAPI = {
  // Get all payment ins
  getAll: async (businessId) => {
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    return apiRequest(`/payment-in/${businessId}`, {
      method: 'GET',
    });
  },

  // Get single payment in
  getById: async (id, businessId) => {
    if (!id || !businessId) {
      throw new Error('ID and Business ID are required');
    }
    return apiRequest(`/payment-in/${businessId}/${id}`, {
      method: 'GET',
    });
  },

  // Create payment in
  create: async (businessId, paymentData) => {
    // Robust argument handling
    let finalBusinessId = businessId;
    let finalData = paymentData;

    if (typeof businessId === 'object' && !paymentData) {
      finalData = businessId;
      finalBusinessId = finalData.business_id || localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId || finalBusinessId === '[object Object]') {
      finalBusinessId = localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId) {
      throw new Error('Business ID is required');
    }

    return apiRequest(`/payment-in/${finalBusinessId}`, {
      method: 'POST',
      body: JSON.stringify(finalData),
    });
  },

  // Update payment in
  update: async (id, businessId, paymentData) => {
    let finalId = id;
    let finalBusinessId = businessId;
    let finalData = paymentData;

    // Handle (id, paymentData, businessId) signature used by some modules
    if (typeof businessId === 'object' && paymentData && (typeof paymentData === 'string' || typeof paymentData === 'number')) {
      finalData = businessId;
      finalBusinessId = paymentData;
    } 
    // Handle (id, paymentData) signature
    else if (typeof businessId === 'object' && !paymentData) {
      finalData = businessId;
      finalBusinessId = finalData.business_id || localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId || finalBusinessId === '[object Object]') {
      finalBusinessId = localStorage.getItem('selectedBusinessId');
    }

    if (!finalId || !finalBusinessId) {
      throw new Error('ID and Business ID are required');
    }

    return apiRequest(`/payment-in/${finalBusinessId}/${finalId}`, {
      method: 'PUT',
      body: JSON.stringify(finalData),
    });
  },

  // Delete payment in
  delete: async (id, businessId) => {
    if (!id || !businessId) {
      throw new Error('ID and Business ID are required');
    }
    return apiRequest(`/payment-in/${businessId}/${id}`, {
      method: 'DELETE',
    });
  },

  // Get next payment in number
  getNextNumber: async (businessId) => {
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    return apiRequest(`/payment-in/${businessId}/next-number`, {
      method: 'GET',
    });
  },

  // Get payment ins by party
  getByParty: async (partyId, businessId) => {
    if (!partyId || !businessId) {
      throw new Error('Party ID and Business ID are required');
    }
    return apiRequest(`/payment-in/${businessId}/party/${partyId}`, {
      method: 'GET',
    });
  },

  // Get payment ins by date range
  getByDateRange: async (businessId, startDate, endDate) => {
    if (!businessId || !startDate || !endDate) {
      throw new Error('Business ID, startDate, and endDate are required');
    }
    return apiRequest(`/payment-in/${businessId}/date-range?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
    });
  },

  // Get payment ins by status
  getByStatus: async (businessId, status) => {
    if (!businessId || !status) {
      throw new Error('Business ID and status are required');
    }
    return apiRequest(`/payment-in/${businessId}/status/${status}`, {
      method: 'GET',
    });
  },
};

// Payment Out API functions
export const paymentOutAPI = {
  // Get all payment outs
  getAll: async (businessId) => {
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    return apiRequest(`/payment-out/${businessId}`, {
      method: 'GET',
    });
  },

  // Get single payment out
  getById: async (id, businessId) => {
    if (!id || !businessId) {
      throw new Error('ID and Business ID are required');
    }
    return apiRequest(`/payment-out/${businessId}/${id}`, {
      method: 'GET',
    });
  },

  // Create payment out
  create: async (businessId, paymentData) => {
    // Robust argument handling
    let finalBusinessId = businessId;
    let finalData = paymentData;

    if (typeof businessId === 'object' && !paymentData) {
      finalData = businessId;
      finalBusinessId = finalData.business_id || localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId || finalBusinessId === '[object Object]') {
      finalBusinessId = localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId) {
      throw new Error('Business ID is required');
    }

    return apiRequest(`/payment-out/${finalBusinessId}`, {
      method: 'POST',
      body: JSON.stringify(finalData),
    });
  },

  // Update payment out
  update: async (id, businessId, paymentData) => {
    let finalId = id;
    let finalBusinessId = businessId;
    let finalData = paymentData;

    // Handle (id, paymentData, businessId) signature
    if (typeof businessId === 'object' && paymentData && (typeof paymentData === 'string' || typeof paymentData === 'number')) {
      finalData = businessId;
      finalBusinessId = paymentData;
    } 
    // Handle (id, paymentData) signature
    else if (typeof businessId === 'object' && !paymentData) {
      finalData = businessId;
      finalBusinessId = finalData.business_id || localStorage.getItem('selectedBusinessId');
    }

    if (!finalBusinessId || finalBusinessId === '[object Object]') {
      finalBusinessId = localStorage.getItem('selectedBusinessId');
    }

    if (!finalId || !finalBusinessId) {
      throw new Error('ID and Business ID are required');
    }

    return apiRequest(`/payment-out/${finalBusinessId}/${finalId}`, {
      method: 'PUT',
      body: JSON.stringify(finalData),
    });
  },

  // Delete payment out
  delete: async (id, businessId) => {
    if (!id || !businessId) {
      throw new Error('ID and Business ID are required');
    }
    return apiRequest(`/payment-out/${businessId}/${id}`, {
      method: 'DELETE',
    });
  },

  // Get next payment out number
  getNextNumber: async (businessId) => {
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    return apiRequest(`/payment-out/${businessId}/next-number`, {
      method: 'GET',
    });
  },

  // Get payment outs by party
  getByParty: async (partyId, businessId) => {
    if (!partyId || !businessId) {
      throw new Error('Party ID and Business ID are required');
    }
    return apiRequest(`/payment-out/${businessId}/party/${partyId}`, {
      method: 'GET',
    });
  },
};

// Bank Details API functions
export const bankDetailsAPI = {
  getAll: async (businessId) => {
    return apiRequest(`/bank-details?business_id=${businessId}`, {
      method: 'GET',
    });
  },

  getById: async (id) => {
    return apiRequest(`/bank-details/${id}`, {
      method: 'GET',
    });
  },

  create: async (data) => {
    return apiRequest('/bank-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/bank-details/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id, businessId) => {
    return apiRequest(`/bank-details/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ business_id: businessId }),
    });
  },
};

// Contract API functions
export const contractAPI = {
  getAll: async (businessId = null) => {
    let endpoint = '/contracts';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/contracts/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (contractData, businessId = null) => {
    let endpoint = '/contracts';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
  },

  update: async (id, contractData, businessId = null) => {
    let endpoint = `/contracts/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(contractData),
    });
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/contracts/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getNextNumber: async (businessId = null) => {
    const business_id = businessId || localStorage.getItem('selectedBusinessId');
    let endpoint = '/contracts/next-number';
    if (business_id) endpoint += `?business_id=${business_id}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

// Document API functions
export const documentAPI = {
  // Get all documents for a business
  getDocuments: async (businessId, path = '') => {
    return apiRequest(`/documents/${businessId}?path=${encodeURIComponent(path)}`, {
      method: 'GET',
    });
  },

  // Create subfolder
  createFolder: async (businessId, folderName, parentPath = '') => {
    return apiRequest('/documents/folder', {
      method: 'POST',
      body: JSON.stringify({ businessId, folderName, parentPath }),
    });
  },

  // Upload file
  uploadFile: async (formData) => {
    const token = localStorage.getItem('token');
    const { baseURL } = getApiConfig();
    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    };

    try {
      const businessId = formData.get('businessId');
      const parentPath = formData.get('parentPath') || '';
      const uploadUrl = `${baseURL}/documents/upload?businessId=${businessId}&parentPath=${encodeURIComponent(parentPath)}`;

      const response = await fetch(uploadUrl, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      return data;
    } catch (error) {
      console.error('Upload API Error:', error);
      throw error;
    }
  },

  // Rename item
  rename: async (businessId, oldPath, newName) => {
    return apiRequest('/documents/rename', {
      method: 'PUT',
      body: JSON.stringify({ businessId, oldPath, newName }),
    });
  },

  // Delete item
  delete: async (businessId, itemPath) => {
    return apiRequest('/documents/delete', {
      method: 'DELETE',
      body: JSON.stringify({ businessId, itemPath }),
    });
  },
  // Get users permissible for sharing
  getPermissibleUsers: async (businessId) => {
    return apiRequest(`/documents/permissible-users/${businessId}`, {
      method: 'GET',
    });
  },

  // Get current permissions for an item
  getItemPermissions: async (businessId, parentPath, itemName) => {
    return apiRequest(`/documents/permissions?businessId=${businessId}&parentPath=${encodeURIComponent(parentPath)}&itemName=${encodeURIComponent(itemName)}`, {
      method: 'GET',
    });
  },

  // Update permissions for a user on an item
  updatePermissions: async (businessId, parentPath, itemName, userId, perms) => {
    return apiRequest('/documents/permissions', {
      method: 'POST',
      body: JSON.stringify({ businessId, parentPath, itemName, userId, perms }),
    });
  },
};

// Custom Quotation API functions
export const contractPageAPI = {
  toggleLock: (id, businessId) => apiRequest(`/contracts/page/${id}/lock?business_id=${businessId}`, { method: 'PUT' }),
  getLockedPages: (businessId) => apiRequest(`/contracts/locked-pages?business_id=${businessId}`, { method: 'GET' }),
};

export const customQuotationAPI = {
  create: async (quotationData) => {
    return apiRequest('/custom-quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  },
  getByBusinessId: async (businessId) => {
    return apiRequest(`/custom-quotations/business/${businessId}`, {
      method: 'GET',
    });
  },
  getById: async (id) => {
    return apiRequest(`/custom-quotations/${id}`, {
      method: 'GET',
    });
  },
  update: async (id, quotationData) => {
    return apiRequest(`/custom-quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quotationData),
    });
  },
  delete: async (id) => {
    return apiRequest(`/custom-quotations/${id}`, {
      method: 'DELETE',
    });
  },
  getNextNumber: async (businessId) => {
    return apiRequest(`/custom-quotations/next-number?businessId=${businessId}`, {
      method: 'GET',
    });
  },
};
// Purchase Requisition API functions
export const purchaseRequisitionAPI = {
  getAll: async (businessId = null, filters = {}) => {
    let endpoint = '/purchase-requisitions';
    const params = new URLSearchParams();
    if (businessId) params.append('business_id', businessId);
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  getById: async (id, businessId = null) => {
    let endpoint = `/purchase-requisitions/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  create: async (formData) => {
    const token = getAuthToken();
    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData, // FormData for attachment
    };
    const response = await fetch(`${baseURL}/purchase-requisitions`, config);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.code = data.code;
      throw error;
    }
    return data;
  },

  update: async (id, formData, businessId = null) => {
    const token = getAuthToken();
    let endpoint = `/purchase-requisitions/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    const config = {
      method: 'PUT',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData, // FormData for attachment
    };
    const response = await fetch(`${baseURL}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.code = data.code;
      throw error;
    }
    return data;
  },

  delete: async (id, businessId = null) => {
    let endpoint = `/purchase-requisitions/${id}`;
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  getNextNumber: async (businessId = null) => {
    let endpoint = '/purchase-requisitions/next-number';
    if (businessId) endpoint += `?business_id=${businessId}`;
    return apiRequest(endpoint, { method: 'GET' });
  },
};

export const approvalWorkflowAPI = {
  getWorkflow: async (documentType, businessId = null) => {
    let endpoint = `/approval-workflows?document_type=${documentType}`;
    if (businessId) {
      endpoint += `&business_id=${businessId}`;
    }
    return apiRequest(endpoint, { method: 'GET' });
  },
  saveWorkflow: async (workflowData) => {
    return apiRequest('/approval-workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    });
  }
};

export default {
  apiRequest,
  authAPI,
  businessAPI,
  supportAPI,
  dashboardAPI,
  billingAPI,
  pricingAPI,
  partyAPI,
  supplierAPI,
  grnAPI,
  mrnAPI,
  inventoryAPI,
  quotationAPI,
  salesInvoiceAPI,
  salesReturnAPI,
  proformaInvoiceAPI,
  creditNoteAPI,
  deliveryChallanAPI,
  bookPurchaseOrderAPI,
  purchaseReturnAPI,
  debitNoteAPI,
  purchaseOrderAPI,
  bookInvoiceAPI,
  termsConditionsAPI,
  taxAPI,
  paymentInAPI,
  paymentOutAPI,
  bankDetailsAPI,
  contractAPI,
  contractPageAPI,
  documentAPI,
  customQuotationAPI,
  purchaseRequisitionAPI,
  approvalWorkflowAPI,
  getAuthToken,
  getUserData,
  clearAuthData,
  getApiConfig,
};
