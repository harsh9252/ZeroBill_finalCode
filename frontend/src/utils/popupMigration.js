// Popup Migration Utility
// This file contains functions to help migrate from old SweetAlert2 patterns to new components

import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog } from '../Components/ActionMessageModel.jsx';

/**
 * Replace old delete confirmation pattern with new component
 * @param {Function} deleteAction - The delete action to perform
 * @param {string} itemId - ID of the item being deleted
 * @param {string} itemType - Type of item (invoice, payment, etc.)
 * @returns {Function} - Delete handler function
 */
export const createDeleteHandler = (deleteAction, itemId, itemType = 'item') => {
  return async () => {
    try {
      const confirmed = await showConfirmationDialog({
        title: `Delete ${itemId}?`,
        text: 'This action cannot be undone.',
        icon: 'warning',
        confirmText: 'Yes, delete it',
        confirmButtonColor: '#DC2626'
      });

      if (!confirmed) return;

      showLoadingModal(`Deleting ${itemType}...`);

      await deleteAction();

      closeModal();
      showSuccessToast(`${itemId} deleted successfully`);

    } catch (error) {
      closeModal();
      showErrorToast(error?.message || `Could not delete ${itemType}.`);
    }
  };
};

/**
 * Replace old success toast patterns
 * @param {string} message - Success message
 */
export const showSuccess = (message) => {
  showSuccessToast(message);
};

/**
 * Replace old error patterns
 * @param {string} message - Error message
 */
export const showError = (message) => {
  showErrorToast(message);
};

/**
 * Common delete patterns for different item types
 */
export const DeletePatterns = {
  invoice: (deleteAction, invoiceId) => createDeleteHandler(deleteAction, invoiceId, 'invoice'),
  payment: (deleteAction, paymentId) => createDeleteHandler(deleteAction, paymentId, 'payment'),
  quotation: (deleteAction, quotationId) => createDeleteHandler(deleteAction, quotationId, 'quotation'),
  party: (deleteAction, partyName) => createDeleteHandler(deleteAction, partyName, 'party'),
  item: (deleteAction, itemName) => createDeleteHandler(deleteAction, itemName, 'item'),
  business: (deleteAction, businessName) => createDeleteHandler(deleteAction, businessName, 'business')
};

export default {
  createDeleteHandler,
  showSuccess,
  showError,
  DeletePatterns
};