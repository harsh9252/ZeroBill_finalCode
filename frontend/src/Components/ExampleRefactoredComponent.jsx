/**
 * ExampleRefactoredComponent.jsx
 * 
 * This is a TEMPLATE showing how to properly use the ActionMessage system
 * Copy this pattern for your own components
 */

import React, { useState, useEffect } from 'react';
import { useActionMessage } from '../contexts/ActionMessageContext';
import { 
  SuccessMessages, 
  ErrorMessages, 
  LoadingMessages,
  ConfirmMessages,
  handleApiError 
} from '../utils/messageHelpers';

function ExampleRefactoredComponent() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // ============================================================================
  // ACTION MESSAGE HOOK
  // ============================================================================
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showConfirm,
    showDelete,
    closeMessage
  } = useActionMessage();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchItems = async () => {
    showLoading(LoadingMessages.loading('items'));
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data = await response.json();
      setItems(data);
      closeMessage();
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
    }
  };

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  const validateForm = async () => {
    if (!formData.name.trim()) {
      await showWarning('Name is required');
      return false;
    }

    if (!formData.email.trim()) {
      await showWarning('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      await showWarning('Please enter a valid email address');
      return false;
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      await showWarning('Phone number must be 10 digits');
      return false;
    }

    return true;
  };

  // ============================================================================
  // CREATE OPERATION
  // ============================================================================
  const handleCreate = async () => {
    // Validate first
    if (!await validateForm()) return;

    showLoading(LoadingMessages.creating('item'));
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create item');
      }

      const newItem = await response.json();
      
      closeMessage();
      await showSuccess(SuccessMessages.created('Item'));
      
      // Update local state
      setItems([...items, newItem]);
      
      // Reset form
      setFormData({ name: '', email: '', phone: '' });
      
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
    }
  };

  // ============================================================================
  // UPDATE OPERATION
  // ============================================================================
  const handleUpdate = async () => {
    if (!selectedItem) return;

    // Validate first
    if (!await validateForm()) return;

    showLoading(LoadingMessages.updating('item'));
    try {
      const response = await fetch(`/api/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update item');
      }

      const updatedItem = await response.json();
      
      closeMessage();
      await showSuccess(SuccessMessages.updated('Item'));
      
      // Update local state
      setItems(items.map(item => 
        item.id === selectedItem.id ? updatedItem : item
      ));
      
      // Reset form
      setIsEditing(false);
      setSelectedItem(null);
      setFormData({ name: '', email: '', phone: '' });
      
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
    }
  };

  // ============================================================================
  // DELETE OPERATION
  // ============================================================================
  const handleDelete = async (item) => {
    await showDelete({
      itemName: item.name,
      itemType: 'item',
      onConfirm: async () => {
        // API call
        const response = await fetch(`/api/items/${item.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete item');
        }

        // Update local state
        setItems(items.filter(i => i.id !== item.id));
        
        // If we were editing this item, clear the form
        if (selectedItem?.id === item.id) {
          setIsEditing(false);
          setSelectedItem(null);
          setFormData({ name: '', email: '', phone: '' });
        }
      }
    });
  };

  // ============================================================================
  // BULK DELETE OPERATION
  // ============================================================================
  const handleBulkDelete = async (selectedIds) => {
    if (selectedIds.length === 0) {
      await showWarning('Please select items to delete');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Multiple Items?',
      message: `Are you sure you want to delete ${selectedIds.length} items? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    showLoading(`Deleting ${selectedIds.length} items...`);
    try {
      // Delete all items
      await Promise.all(
        selectedIds.map(id => 
          fetch(`/api/items/${id}`, { method: 'DELETE' })
        )
      );

      closeMessage();
      await showSuccess(`${selectedIds.length} items deleted successfully!`);
      
      // Update local state
      setItems(items.filter(item => !selectedIds.includes(item.id)));
      
    } catch (error) {
      closeMessage();
      await showError('Failed to delete some items', error.message);
    }
  };

  // ============================================================================
  // EDIT HANDLER
  // ============================================================================
  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      email: item.email,
      phone: item.phone
    });
    setIsEditing(true);
  };

  // ============================================================================
  // CANCEL HANDLER
  // ============================================================================
  const handleCancel = async () => {
    // Check if form has changes
    const hasChanges = 
      formData.name !== (selectedItem?.name || '') ||
      formData.email !== (selectedItem?.email || '') ||
      formData.phone !== (selectedItem?.phone || '');

    if (hasChanges) {
      const confirmed = await showConfirm(ConfirmMessages.discard());
      if (!confirmed) return;
    }

    // Reset form
    setIsEditing(false);
    setSelectedItem(null);
    setFormData({ name: '', email: '', phone: '' });
  };

  // ============================================================================
  // EXPORT OPERATION
  // ============================================================================
  const handleExport = async () => {
    showLoading('Exporting data...');
    try {
      const response = await fetch('/api/items/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'items-export.csv';
      a.click();
      
      closeMessage();
      await showSuccess('Data exported successfully!');
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
    }
  };

  // ============================================================================
  // IMPORT OPERATION
  // ============================================================================
  const handleImport = async (file) => {
    if (!file) {
      await showWarning('Please select a file to import');
      return;
    }

    showLoading('Importing data...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/items/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Import failed');
      
      const result = await response.json();
      
      closeMessage();
      await showSuccess(`Imported ${result.count} items successfully!`);
      
      // Refresh list
      fetchItems();
    } catch (error) {
      closeMessage();
      handleApiError(error, showError);
    }
  };

  // ============================================================================
  // FEATURE NOT AVAILABLE
  // ============================================================================
  const handleFeatureNotAvailable = () => {
    showInfo('Coming Soon', 'This feature is under development and will be available soon!');
  };
  useEffect(() => {
    fetchItems();
  }, []);
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Items Management</h1>
          <p className="text-gray-600 mt-2">Manage your items with centralized messaging</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export
          </button>
          <button
            onClick={() => document.getElementById('import-file').click()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Import
          </button>
          <input
            id="import-file"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleImport(e.target.files[0])}
          />
          <button
            onClick={handleFeatureNotAvailable}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Advanced Features
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {isEditing ? 'Edit Item' : 'Create New Item'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter phone"
              />
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.phone || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No items found. Create your first item above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExampleRefactoredComponent;
