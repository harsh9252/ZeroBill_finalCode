import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';


// Modern theme configuration
const theme = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    confirm: '#4F46E5', // Indigo-600
    cancel: '#6B7280',  // Gray-500
    background: '#FFFFFF',
    text: '#1F2937'
};

/* -------------------------------------------------------------------------- */
/*                          1. NOTIFICATION TOASTS                           */
/* -------------------------------------------------------------------------- */

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
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
        // Ensure toast appears above modals (which may have z-index up to 2000)
        const container = Swal.getContainer();
        if (container) {
            container.style.zIndex = '9999';
        }
    }
});

export const showSuccessToast = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return baseToast.fire({
        icon: 'success',
        iconColor: theme.success,
        timer: 2000,
        ...settings
    });
};

export const showErrorToast = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return baseToast.fire({
        icon: 'error',
        iconColor: theme.error,
        timer: 4000,
        ...settings
    });
};

export const showWarningToast = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return baseToast.fire({
        icon: 'warning',
        iconColor: theme.warning,
        timer: 3000,
        ...settings
    });
};

export const showInfoToast = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return baseToast.fire({
        icon: 'info',
        iconColor: theme.info,
        timer: 2500,
        ...settings
    });
};

/* -------------------------------------------------------------------------- */
/*                          2. MODAL DIALOGS                                 */
/* -------------------------------------------------------------------------- */

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

export const showSuccessModal = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return baseModal.fire({
        icon: 'success',
        iconColor: theme.success,
        ...settings
    });
};

export const showErrorModal = (options) => {
    const settings = typeof options === 'string' ? { title: 'Error', text: options } : options;
    return baseModal.fire({
        icon: 'error',
        iconColor: theme.error,
        confirmButtonColor: theme.error,
        ...settings
    });
};

export const showLoadingModal = (options) => {
    const settings = typeof options === 'string' ? { title: options } : options;
    return Swal.fire({
        title: settings.title || 'Please wait...',
        text: settings.text || 'Processing your request',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        background: theme.background,
        scrollbarPadding: false,
        heightAuto: false,
        didOpen: () => {
            Swal.showLoading();
        },
        ...settings
    });
};

export const closeModal = () => {
    Swal.close();
};

/* -------------------------------------------------------------------------- */
/*                          3. CONFIRMATION DIALOGS                          */
/* -------------------------------------------------------------------------- */

export const showConfirmationDialog = async ({
    title = 'Are you sure?',
    text = 'This action cannot be undone.',
    confirmText = 'Yes, continue',
    cancelText = 'Cancel',
    icon = 'warning',
    confirmButtonColor = theme.error,
    itemName = '',
    itemType = 'item',
    ...rest
}) => {
    const result = await baseModal.fire({
        title: '',
        html: `
            <div class="flex flex-col items-center text-center py-3 px-3">
              <div class="relative mb-3">
                <div class="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center shadow-md border-2 border-red-200 animate-pulse">
                  <svg class="w-9 h-9 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </div>
                <div class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full opacity-20 animate-ping"></div>
              </div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">${title}</h2>
              <p class="text-gray-600 text-sm mb-3 leading-snug">
                ${itemName ? `<span class="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">${itemName}</span>` : text}
              </p>
              <div class="w-full bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2.5 border-l-4 border-amber-400 shadow-sm">
                <div class="flex items-center gap-2">
                  <div class="flex-shrink-0">
                    <svg class="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <p class="text-xs font-semibold text-amber-900">${text}</p>
                </div>
              </div>
            </div>
          `,
        showCancelButton: true,
        confirmButtonColor: confirmButtonColor,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        width: '400px',
        customClass: {
            container: 'premium-delete-modal-container',
            popup: 'rounded-xl shadow-2xl border-0 overflow-hidden',
            htmlContainer: 'p-0 m-0',
            actions: '!flex !flex-row !gap-4 !px-6 !pb-6 !pt-2 !w-full !justify-center !items-stretch',
            confirmButton: '!flex-1 !w-auto !whitespace-nowrap !px-4 !py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-transparent focus:ring-2 focus:ring-red-300 focus:outline-none !m-0',
            cancelButton: '!flex-1 !w-auto !whitespace-nowrap !px-4 !py-3.5 rounded-xl font-bold text-sm text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:ring-2 focus:ring-gray-300 focus:outline-none !m-0'
        },
        buttonsStyling: false,
        ...rest
    });
    return result.isConfirmed;
};

/* -------------------------------------------------------------------------- */
/*                          5. ACTION COMPONENTS                             */
/* -------------------------------------------------------------------------- */

export const ConfirmActionButton = ({
    onConfirm,
    itemLabel = "",
    children = "Confirm",
    className = "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-sm",
    confirmOptions = {},
    successOptions = { title: "Success!", timer: 2000 },
    errorOptions = { title: "Error", text: "Something went wrong." },
}) => {
    const handleClick = async (e) => {
        e.stopPropagation();
        const confirmed = await showConfirmationDialog({
            title: itemLabel ? `Proceed for ${itemLabel}?` : "Are you sure?",
            ...confirmOptions
        });
        if (!confirmed) return;

        showLoadingModal(confirmOptions.loadingTitle || "Working on it...");
        try {
            await onConfirm();
            Swal.close();
            await showSuccessToast(successOptions);
        } catch (err) {
            Swal.close();
            await showErrorToast(err.message || errorOptions.text);
        }
    };

    return (
        <button type="button" onClick={handleClick} className={className}>
            <span>{children}</span>
        </button>
    );
};

/* -------------------------------------------------------------------------- */
/*                          6. ADVANCED DIALOGS                              */
/* -------------------------------------------------------------------------- */

export const showInputDialog = async ({
    title = 'Enter value',
    text = '',
    inputPlaceholder = '',
    inputValue = '',
    inputType = 'text',
    inputValidator,
    confirmText = 'Submit',
    cancelText = 'Cancel',
    ...options
}) => {
    const result = await baseModal.fire({
        title,
        text,
        input: inputType,
        inputPlaceholder,
        inputValue,
        inputValidator,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: theme.confirm,
        allowOutsideClick: false,
        ...options
    });
    return result.isConfirmed ? result.value : null;
};

/**
 * showPremiumInputDialog
 * A highly styled alternative to standard showInputDialog
 * Supports: 'green', 'red', 'blue', 'indigo' variants
 */
export const showPremiumInputDialog = async ({
    title = 'Input Required',
    text = '',
    inputPlaceholder = 'Enter details here...',
    inputValue = '',
    inputType = 'text',
    inputValidator,
    confirmText = 'Save Changes',
    cancelText = 'Cancel',
    variant = 'indigo', // 'green', 'red', 'blue', 'indigo'
    icon: CustomIcon = null,
    ...options
}) => {
    const variants = {
        green: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            icon: 'text-green-600',
            btn: 'from-[#129046] to-[#9ccc53]',
            btnHover: 'hover:from-[#0e7a3a] hover:to-[#8dbf41]',
            ring: 'focus:ring-green-400'
        },
        red: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            btn: 'from-red-600 to-red-700',
            btnHover: 'hover:from-red-700 hover:to-red-800',
            ring: 'focus:ring-red-300'
        },
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-600',
            btn: 'from-blue-600 to-blue-700',
            btnHover: 'hover:from-blue-700 hover:to-blue-800',
            ring: 'focus:ring-blue-300'
        },
        indigo: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            icon: 'text-indigo-600',
            btn: 'from-indigo-600 to-indigo-700',
            btnHover: 'hover:from-indigo-700 hover:to-indigo-800',
            ring: 'focus:ring-indigo-300'
        }
    };

    const v = variants[variant] || variants.indigo;

    const result = await Swal.fire({
        title: '',
        html: `
            <div class="flex flex-col items-center text-center px-4 pt-4">
                <div class="w-16 h-16 ${v.bg} rounded-xl flex items-center justify-center shadow-md border-2 ${v.border} mb-4">
                    ${CustomIcon || `
                    <svg class="w-8 h-8 ${v.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    `}
                </div>
                <h2 class="text-xl font-bold text-gray-800 mb-1">${title}</h2>
                <p class="text-gray-500 text-sm mb-4">${text}</p>
            </div>
        `,
        input: inputType,
        inputPlaceholder,
        inputValue,
        inputValidator,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        width: '400px',
        allowOutsideClick: false,
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
            popup: 'rounded-xl shadow-2xl border-0 overflow-hidden',
            input: `mx-6 mt-0 mb-6 px-4 py-3 border border-[#129046]/30 focus:border-[#129046] rounded-md text-sm transition-all outline-none shadow-sm`,
            actions: '!flex !flex-row !gap-4 !px-6 !pb-6 !pt-2 !w-full !justify-center !items-stretch',
            confirmButton: `!flex-1 !w-auto !px-6 !py-3 rounded-md font-bold text-sm text-white bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 shadow-sm focus:outline-none !m-0`,
            cancelButton: '!flex-1 !w-auto !px-6 !py-3 rounded-md font-bold text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-200 focus:outline-none !m-0'
        },
        buttonsStyling: false,
        ...options
    });
    return result.isConfirmed ? result.value : null;
};

export const showMultiStepDialog = async (steps, options = {}) => {
    const formData = {};
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isLastStep = i === steps.length - 1;
        const result = await baseModal.fire({
            title: step.title,
            text: step.text,
            input: step.inputType || 'text',
            inputPlaceholder: step.inputPlaceholder,
            inputValue: formData[step.key] || step.inputValue || '',
            inputValidator: step.inputValidator,
            showCancelButton: true,
            confirmButtonText: isLastStep ? 'Submit' : 'Next',
            cancelButtonText: i === 0 ? 'Cancel' : 'Back',
            allowOutsideClick: false,
            ...step.customOptions
        });

        if (result.isConfirmed) {
            formData[step.key] = result.value;
        } else if (result.isDismissed) {
            if (i === 0) return null;
            i -= 2; // Go back
        }
    }
    return formData;
};

export const showProgressDialog = async (operation, {
    title = 'Processing...',
    text = 'Please wait...',
    allowCancel = false,
    ...options
} = {}) => {
    try {
        Swal.fire({
            title,
            text,
            allowOutsideClick: false,
            allowEscapeKey: allowCancel,
            showCancelButton: allowCancel,
            showConfirmButton: false,
            background: theme.background,
            scrollbarPadding: false,
            heightAuto: false,
            didOpen: () => Swal.showLoading(),
            ...options
        });

        const result = await operation((progress) => {
            Swal.update({ text: `${text} (${Math.round(progress)}%)` });
        });
        Swal.close();
        return result;
    } catch (error) {
        Swal.close();
        throw error;
    }
};

export const showCustomDialog = async (htmlContent, options = {}) => {
    return baseModal.fire({
        html: htmlContent,
        showConfirmButton: true,
        showCancelButton: false,
        confirmButtonText: 'OK',
        ...options
    });
};

/* -------------------------------------------------------------------------- */
/*                          7. PREDEFINED MESSAGES                           */
/* -------------------------------------------------------------------------- */

export const SuccessMessages = {
    created: (type) => showSuccessToast(`${type} created successfully!`),
    updated: (type) => showSuccessToast(`${type} updated successfully!`),
    deleted: (type) => showSuccessToast(`${type} deleted successfully!`),
    saved: (type) => showSuccessToast(`${type} saved successfully!`),
    partyCreated: () => showSuccessToast('Party created successfully!'),
    invoiceCreated: () => showSuccessToast('Invoice created successfully!'),
    changesSaved: () => showSuccessToast('Changes saved successfully!'),
};

export const ErrorMessages = {
    createFailed: (type) => showErrorToast(`Failed to create ${type}`),
    updateFailed: (type) => showErrorToast(`Failed to update ${type}`),
    deleteFailed: (type) => showErrorToast(`Failed to delete ${type}`),
    loadFailed: (type) => showErrorToast(`Failed to load ${type}`),
    networkError: () => showErrorToast('Network error. Please try again.'),
};

export default {
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    showSuccessModal,
    showErrorModal,
    showLoadingModal,
    closeModal,
    showConfirmationDialog,
    ConfirmActionButton,
    showInputDialog,
    showPremiumInputDialog,
    showMultiStepDialog,
    showProgressDialog,
    showCustomDialog,
    SuccessMessages,
    ErrorMessages
};
