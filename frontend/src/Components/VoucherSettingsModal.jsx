import React, { useState, useEffect } from 'react';
import { X, Settings2, Info, Save, RotateCcw } from 'lucide-react';
import { businessAPI } from '../utils/api';
import Swal from 'sweetalert2';

export default function VoucherSettingsModal({ isOpen, onClose, businessId }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && businessId) {
      fetchSettings();
    }
  }, [isOpen, businessId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await businessAPI.getVoucherSettings(businessId);
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching voucher settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load voucher settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyGlobalStartingNumber = (value) => {
    const num = parseInt(value) || 0;
    setSettings(prev => prev.map(s => ({ ...s, current_number: num })));
    Swal.fire({
      icon: 'info',
      title: 'Applied',
      text: `Starting number ${num} applied to all sections. Don't forget to save!`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  const applyGlobalPrefix = (value) => {
    if (!value) return;
    setSettings(prev => prev.map(s => ({ ...s, prefix: value })));
    Swal.fire({
      icon: 'info',
      title: 'Applied',
      text: `Prefix "${value}" applied to all sections. Don't forget to save!`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleInputChange = (type, field, value) => {
    setSettings(prev => prev.map(s =>
      s.invoice_type === type ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await businessAPI.updateVoucherSettings(businessId, settings);
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Voucher settings updated successfully',
          timer: 2000,
          showConfirmButton: false
        });
        onClose();
      }
    } catch (error) {
      console.error('Error updating voucher settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will reset all your custom prefixes and numbering to system defaults.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, reset it!'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await businessAPI.resetVoucherSettings(businessId);
        if (response.success) {
          Swal.fire({
            icon: 'success',
            title: 'Reset Successful',
            text: 'Voucher settings have been restored to defaults.',
            timer: 2000,
            showConfirmButton: false
          });
          fetchSettings();
        }
      } catch (error) {
        console.error('Error resetting voucher settings:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to reset settings'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const displayMap = {
    'quotation': 'Quotation/Estimate',
    'proforma': 'Proforma Invoice',
    'sales_invoice': 'Tax Invoice',
    'sales_return': 'Sales Return',
    'credit_note': 'Credit Note',
    'delivery_challan': 'Delivery Challan',
    'purchase_return': 'Purchase Return',
    'debit_note': 'Debit Note',
    'purchase_order': 'Purchase Order',
    'book_purchase_order': 'Book Purchase Order',
    'book_invoice': 'Book Invoice',
    'contract': 'Agreement',
    'z_khata_party': 'Z-Khata Party',
    'payment_in': 'Payment In',
    'payment_out': 'Payment Out',
    'project_expense': 'Project Expense',
    'custom_quotation': 'Custom Quotation',
    'grn': 'GRN',
    'mrn': 'MRN',
    'purchase_requisition': 'Purchase Requisition',
    'sales_lead': 'Sales Lead'
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-yellow-100">

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-yellow-600" />
            </div>
            <div>

              <h2 className="text-xl font-bold text-gray-800"><span>Customize your document numbering and prefixes</span></h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-yellow-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* BULK APPLY SECTION */}
          <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Save className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800"><span>Bulk Apply Settings</span></p>
                <p className="text-[10px] text-gray-500"><span>Set the same prefix or starting number for all modules at once</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PREFIX BULK */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Prefix"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
                  id="global-prefix"
                />
                <button
                  onClick={() => applyGlobalPrefix(document.getElementById('global-prefix').value)}
                  className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all shadow-sm whitespace-nowrap"
                >
                  <span>Apply Prefix to All</span>
                </button>
              </div>

              {/* NUMBER BULK */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Enter Number"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
                  id="global-start-no"
                  min="0"
                />
                <button
                  onClick={() => applyGlobalStartingNumber(document.getElementById('global-start-no').value)}
                  className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all shadow-sm whitespace-nowrap"
                >
                  <span>Apply No. to All</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 animate-pulse"><span>Fetching your settings...</span></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {settings.filter(s => displayMap[s.invoice_type]).map((item) => (
                <div key={item.invoice_type} className="space-y-2 p-4 rounded-xl border border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20 transition-all">
                  <label className="block text-sm font-semibold text-gray-700 notranslate" translate="no"><span>{displayMap[item.invoice_type]}</span></label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider"><span>Prefix</span></span>
                      <input
                        type="text"
                        value={item.prefix}
                        onChange={(e) => handleInputChange(item.invoice_type, 'prefix', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 text-sm font-medium"
                        placeholder="e.g. ZB/INV/"
                      />
                    </div>
                    <div className="w-32">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider"><span>Starting No.</span></span>
                      <input
                        type="number"
                        value={item.current_number}
                        onChange={(e) => handleInputChange(item.invoice_type, 'current_number', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 text-sm font-medium"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-yellow-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
            >
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-yellow-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
