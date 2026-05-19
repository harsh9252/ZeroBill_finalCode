/**
 * Message Helpers
 * Common message patterns and utilities for the ActionMessage system
 */

/**
 * Standard success messages for CRUD operations
 */
export const SuccessMessages = {
  // Create
  created: (itemType) => `${itemType} created successfully!`,
  partyCreated: () => 'Party created successfully!',
  invoiceCreated: () => 'Invoice created successfully!',
  itemCreated: () => 'Item created successfully!',
  userCreated: () => 'User created successfully!',
  
  // Update
  updated: (itemType) => `${itemType} updated successfully!`,
  partyUpdated: () => 'Party updated successfully!',
  invoiceUpdated: () => 'Invoice updated successfully!',
  profileUpdated: () => 'Profile updated successfully!',
  settingsSaved: () => 'Settings saved successfully!',
  
  // Delete
  deleted: (itemType) => `${itemType} deleted successfully!`,
  partyDeleted: () => 'Party deleted successfully!',
  invoiceDeleted: () => 'Invoice deleted successfully!',
  
  // Other
  saved: () => 'Changes saved successfully!',
  uploaded: () => 'File uploaded successfully!',
  imported: () => 'Data imported successfully!',
  exported: () => 'Data exported successfully!',
  sent: () => 'Sent successfully!',
  emailSent: () => 'Email sent successfully!',
  copied: () => 'Copied to clipboard!',
};

/**
 * Standard error messages
 */
export const ErrorMessages = {
  // Create
  createFailed: (itemType) => `Failed to create ${itemType}`,
  
  // Update
  updateFailed: (itemType) => `Failed to update ${itemType}`,
  
  // Delete
  deleteFailed: (itemType) => `Failed to delete ${itemType}`,
  
  // Load
  loadFailed: (itemType) => `Failed to load ${itemType}`,
  
  // Network
  networkError: () => 'Network error. Please check your connection.',
  serverError: () => 'Server error. Please try again later.',
  
  // Validation
  validationFailed: () => 'Please check your input and try again.',
  requiredFields: () => 'Please fill in all required fields.',
  
  // Auth
  unauthorized: () => 'You are not authorized to perform this action.',
  sessionExpired: () => 'Your session has expired. Please login again.',
  
  // Generic
  somethingWrong: () => 'Something went wrong. Please try again.',
};

/**
 * Standard warning messages
 */
export const WarningMessages = {
  unsavedChanges: () => 'You have unsaved changes. Are you sure you want to leave?',
  requiredField: (fieldName) => `${fieldName} is required`,
  invalidFormat: (fieldName) => `Invalid ${fieldName} format`,
  duplicateEntry: (itemType) => `This ${itemType} already exists`,
  limitReached: (limit) => `You have reached the limit of ${limit} items`,
};

/**
 * Standard info messages
 */
export const InfoMessages = {
  comingSoon: () => 'This feature is coming soon!',
  underDevelopment: () => 'This feature is under development',
  noData: () => 'No data available',
  processing: () => 'Processing your request...',
  pleaseWait: () => 'Please wait...',
};

/**
 * Loading messages for different operations
 */
export const LoadingMessages = {
  creating: (itemType) => `Creating ${itemType}...`,
  updating: (itemType) => `Updating ${itemType}...`,
  deleting: (itemType) => `Deleting ${itemType}...`,
  loading: (itemType) => `Loading ${itemType}...`,
  saving: () => 'Saving changes...',
  uploading: () => 'Uploading file...',
  processing: () => 'Processing...',
  sending: () => 'Sending...',
  generating: () => 'Generating...',
};

/**
 * Confirmation messages
 */
export const ConfirmMessages = {
  delete: (itemName, itemType) => ({
    title: `Delete ${itemType}?`,
    message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel'
  }),
  
  cancel: (itemType) => ({
    title: `Cancel ${itemType}?`,
    message: 'Are you sure you want to cancel? All unsaved changes will be lost.',
    confirmText: 'Yes, Cancel',
    cancelText: 'No, Continue'
  }),
  
  discard: () => ({
    title: 'Discard Changes?',
    message: 'You have unsaved changes. Are you sure you want to discard them?',
    confirmText: 'Discard',
    cancelText: 'Keep Editing'
  }),
  
  logout: () => ({
    title: 'Logout?',
    message: 'Are you sure you want to logout?',
    confirmText: 'Logout',
    cancelText: 'Cancel'
  }),
  
  reset: () => ({
    title: 'Reset Form?',
    message: 'Are you sure you want to reset the form? All entered data will be lost.',
    confirmText: 'Reset',
    cancelText: 'Cancel'
  }),
};

/**
 * Helper function to handle API errors and show appropriate messages
 */
export const handleApiError = (error, showError) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    switch (status) {
      case 400:
        showError('Invalid Request', message || 'Please check your input and try again.');
        break;
      case 401:
        showError('Unauthorized', 'Please login to continue.');
        break;
      case 403:
        showError('Forbidden', 'You do not have permission to perform this action.');
        break;
      case 404:
        showError('Not Found', message || 'The requested resource was not found.');
        break;
      case 409:
        showError('Conflict', message || 'This item already exists.');
        break;
      case 422:
        showError('Validation Error', message || 'Please check your input.');
        break;
      case 500:
        showError('Server Error', 'An internal server error occurred. Please try again later.');
        break;
      default:
        showError('Error', message || 'An unexpected error occurred.');
    }
  } else if (error.request) {
    // Request made but no response
    showError('Network Error', 'Unable to connect to the server. Please check your internet connection.');
  } else {
    // Something else happened
    showError('Error', error.message || 'An unexpected error occurred.');
  }
};

/**
 * Helper function to wrap async operations with loading and error handling
 */
export const withLoadingAndError = async (
  operation,
  { showLoading, closeMessage, showError },
  loadingMessage = 'Processing...'
) => {
  showLoading(loadingMessage);
  try {
    const result = await operation();
    closeMessage();
    return { success: true, data: result };
  } catch (error) {
    closeMessage();
    handleApiError(error, showError);
    return { success: false, error };
  }
};

/**
 * Helper function for form validation with messages
 */
export const validateField = (value, rules, fieldName, showWarning) => {
  if (rules.required && !value) {
    showWarning(WarningMessages.requiredField(fieldName));
    return false;
  }
  
  if (rules.minLength && value.length < rules.minLength) {
    showWarning(`${fieldName} must be at least ${rules.minLength} characters`);
    return false;
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    showWarning(`${fieldName} must be less than ${rules.maxLength} characters`);
    return false;
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    showWarning(WarningMessages.invalidFormat(fieldName));
    return false;
  }
  
  if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    showWarning('Please enter a valid email address');
    return false;
  }
  
  if (rules.phone && !/^\d{10}$/.test(value)) {
    showWarning('Please enter a valid 10-digit phone number');
    return false;
  }
  
  return true;
};

/**
 * Helper to create a delete handler
 */
export const createDeleteHandler = (showDelete, deleteFunction, itemType) => {
  return async (item) => {
    await showDelete({
      itemName: item.name || item.id,
      itemType,
      onConfirm: async () => {
        await deleteFunction(item.id);
      }
    });
  };
};

/**
 * Helper to create a save handler with validation
 */
export const createSaveHandler = (
  validateFunction,
  saveFunction,
  { showLoading, closeMessage, showSuccess, showError, showWarning }
) => {
  return async (data) => {
    // Validate
    const validationResult = await validateFunction(data);
    if (!validationResult.isValid) {
      await showWarning('Validation Failed', validationResult.message);
      return { success: false };
    }
    
    // Save
    showLoading('Saving...');
    try {
      const result = await saveFunction(data);
      closeMessage();
      await showSuccess('Saved successfully!');
      return { success: true, data: result };
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
      return { success: false, error };
    }
  };
};

/**
 * Batch operation helper
 */
export const batchOperation = async (
  items,
  operation,
  { showLoading, closeMessage, showSuccess, showError },
  operationName = 'Processing'
) => {
  showLoading(`${operationName} ${items.length} items...`);
  
  try {
    const results = await Promise.allSettled(
      items.map(item => operation(item))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    closeMessage();
    
    if (failed === 0) {
      await showSuccess(`${operationName} completed successfully! (${successful} items)`);
    } else if (successful === 0) {
      await showError(`${operationName} failed for all items`);
    } else {
      await showWarning(
        `${operationName} partially completed`,
        `${successful} succeeded, ${failed} failed`
      );
    }
    
    return { successful, failed, results };
  } catch (error) {
    closeMessage();
    await showError(`${operationName} failed`, error.message);
    return { successful: 0, failed: items.length, error };
  }
};

export default {
  SuccessMessages,
  ErrorMessages,
  WarningMessages,
  InfoMessages,
  LoadingMessages,
  ConfirmMessages,
  handleApiError,
  withLoadingAndError,
  validateField,
  createDeleteHandler,
  createSaveHandler,
  batchOperation
};
