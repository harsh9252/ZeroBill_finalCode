import React, { createContext, useContext, useCallback } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

/**
 * ActionMessageContext
 * Global centralized message system for the entire application
 * Handles: success, error, warning, info, confirm, loading, delete confirmations
 */

const ActionMessageContext = createContext(null);

// Modern theme configuration
const theme = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  confirm: '#4F46E5',
  cancel: '#6B7280',
  background: '#FFFFFF',
  text: '#1F2937'
};

export const ActionMessageProvider = ({ children }) => {
  // Base toast configuration
  const baseToast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: theme.background,
    color: theme.text,
    padding: '0.5rem',
    scrollbarPadding: false,
    heightAuto: false,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  // Base modal configuration
  const baseModal = Swal.mixin({
    background: theme.background,
    color: theme.text,
    confirmButtonColor: theme.confirm,
    cancelButtonColor: theme.cancel,
    scrollbarPadding: false,
    heightAuto: false,
    buttonsStyling: true,
    customClass: {
      confirmButton: 'px-6 py-2 rounded-lg font-medium transition-all',
      cancelButton: 'px-6 py-2 rounded-lg font-medium transition-all'
    }
  });

  /**
   * Main showMessage function - handles all message types
   */
  const showMessage = useCallback(async ({
    type = 'info',
    title = '',
    message = '',
    text = '',
    timer,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    itemName = '',
    itemType = 'item',
    allowOutsideClick = true,
    ...customOptions
  }) => {
    const messageText = text || message;

    switch (type) {
      case 'success':
        return baseToast.fire({
          icon: 'success',
          iconColor: theme.success,
          title: title || 'Success!',
          text: messageText,
          timer: timer || 2000,
          ...customOptions
        });

      case 'error':
        return baseToast.fire({
          icon: 'error',
          iconColor: theme.error,
          title: title || 'Error',
          text: messageText,
          timer: timer || 4000,
          ...customOptions
        });

      case 'warning':
        return baseToast.fire({
          icon: 'warning',
          iconColor: theme.warning,
          title: title || 'Warning',
          text: messageText,
          timer: timer || 3000,
          ...customOptions
        });

      case 'info':
        return baseToast.fire({
          icon: 'info',
          iconColor: theme.info,
          title: title || 'Info',
          text: messageText,
          timer: timer || 2500,
          ...customOptions
        });

      case 'loading':
        return Swal.fire({
          title: title || 'Please wait...',
          text: messageText || 'Processing your request',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          background: theme.background,
          scrollbarPadding: false,
          heightAuto: false,
          didOpen: () => Swal.showLoading(),
          ...customOptions
        });

      case 'confirm':
      case 'delete':
        const deleteResult = await baseModal.fire({
          title: '',
          html: customOptions.html || `
            <div class="flex flex-col items-center text-center py-3 px-3">
              <div class="relative mb-3">
                <div class="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center shadow-md border-2 border-red-200 animate-pulse">
                  <svg class="w-9 h-9 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </div>
                <div class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full opacity-20 animate-ping"></div>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}?</h2>
              <p class="text-gray-600 text-sm mb-3 leading-snug">
                Delete <span class="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">${itemName || 'this ' + itemType}</span>?
              </p>
              <div class="w-full bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2.5 border-l-4 border-amber-400 shadow-sm">
                <div class="flex items-center gap-2">
                  <div class="flex-shrink-0">
                    <svg class="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <p class="text-xs font-semibold text-amber-900">This action is permanent and cannot be reversed</p>
                </div>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: theme.error,
          confirmButtonText: confirmText || 'Delete',
          cancelButtonText: cancelText || 'Cancel',
          reverseButtons: true,
          width: '400px',
          customClass: {
            container: 'premium-delete-modal-container',
            popup: 'rounded-xl shadow-2xl border-0 overflow-hidden',
            htmlContainer: 'p-0 m-0',
            actions: '!flex !flex-row !gap-4 !px-6 !pb-6 !pt-2 !w-full !justify-center !items-stretch',
            confirmButton: '!flex-1 !w-auto !whitespace-nowrap !px-5 !py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-red-300 focus:outline-none !m-0',
            cancelButton: '!flex-1 !w-auto !whitespace-nowrap !px-5 !py-3.5 rounded-xl font-bold text-sm text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:ring-2 focus:ring-gray-300 focus:outline-none !m-0'
          },
          buttonsStyling: false,
          allowOutsideClick,
          ...customOptions
        });

        if (deleteResult.isConfirmed) {
          if (onConfirm) {
            // Show loading
            Swal.fire({
              title: `Deleting ${itemType}...`,
              text: 'This will take a moment',
              allowOutsideClick: false,
              allowEscapeKey: false,
              showConfirmButton: false,
              didOpen: () => Swal.showLoading()
            });

            try {
              await onConfirm();
              Swal.close();
              
              // Show success
              await baseToast.fire({
                icon: 'success',
                iconColor: theme.success,
                title: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully`,
                timer: 2000
              });
            } catch (error) {
              Swal.close();
              await baseToast.fire({
                icon: 'error',
                iconColor: theme.error,
                title: `Failed to delete ${itemType}`,
                text: error?.message || 'An error occurred',
                timer: 4000
              });
              throw error;
            }
          }
        } else if (deleteResult.isDismissed && onCancel) {
          await onCancel();
        }

        return deleteResult.isConfirmed;

      default:
        return baseToast.fire({
          icon: 'info',
          title: title || 'Notification',
          text: messageText,
          timer: timer || 2500,
          ...customOptions
        });
    }
  }, [baseToast, baseModal]);

  /**
   * Close any open message
   */
  const closeMessage = useCallback(() => {
    Swal.close();
  }, []);

  /**
   * Convenience methods for common operations
   */
  const showSuccess = useCallback((titleOrOptions, text) => {
    if (typeof titleOrOptions === 'string') {
      return showMessage({ type: 'success', title: titleOrOptions, text });
    }
    return showMessage({ type: 'success', ...titleOrOptions });
  }, [showMessage]);

  const showError = useCallback((titleOrOptions, text) => {
    if (typeof titleOrOptions === 'string') {
      return showMessage({ type: 'error', title: titleOrOptions, text });
    }
    return showMessage({ type: 'error', ...titleOrOptions });
  }, [showMessage]);

  const showWarning = useCallback((titleOrOptions, text) => {
    if (typeof titleOrOptions === 'string') {
      return showMessage({ type: 'warning', title: titleOrOptions, text });
    }
    return showMessage({ type: 'warning', ...titleOrOptions });
  }, [showMessage]);

  const showInfo = useCallback((titleOrOptions, text) => {
    if (typeof titleOrOptions === 'string') {
      return showMessage({ type: 'info', title: titleOrOptions, text });
    }
    return showMessage({ type: 'info', ...titleOrOptions });
  }, [showMessage]);

  const showLoading = useCallback((titleOrOptions, text) => {
    if (typeof titleOrOptions === 'string') {
      return showMessage({ type: 'loading', title: titleOrOptions, text });
    }
    return showMessage({ type: 'loading', ...titleOrOptions });
  }, [showMessage]);

  const showConfirm = useCallback((options) => {
    return showMessage({ type: 'confirm', ...options });
  }, [showMessage]);

  const showDelete = useCallback((options) => {
    return showMessage({ type: 'delete', ...options });
  }, [showMessage]);

  const showCustomModal = useCallback((options) => {
    return showMessage({ type: 'confirm', ...options });
  }, [showMessage]);

  /**
   * API Response Handler - automatically shows appropriate message based on response
   */
  const handleApiResponse = useCallback(async (response, {
    successTitle = 'Success',
    successMessage = 'Operation completed successfully',
    errorTitle = 'Error',
    errorMessage = 'Operation failed',
    showSuccessMessage = true
  } = {}) => {
    if (response.ok || response.success) {
      if (showSuccessMessage) {
        await showSuccess(successTitle, successMessage);
      }
      return true;
    } else {
      const errorMsg = response.message || response.error || errorMessage;
      await showError(errorTitle, errorMsg);
      return false;
    }
  }, [showSuccess, showError]);

  const value = {
    showMessage,
    closeMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showConfirm,
    showDelete,
    showCustomModal,
    handleApiResponse
  };

  return (
    <ActionMessageContext.Provider value={value}>
      {children}
    </ActionMessageContext.Provider>
  );
};

/**
 * Hook to use the action message system
 */
export const useActionMessage = () => {
  const context = useContext(ActionMessageContext);
  if (!context) {
    throw new Error('useActionMessage must be used within ActionMessageProvider');
  }
  return context;
};

export default ActionMessageContext;
