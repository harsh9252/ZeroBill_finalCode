import React, { useState, useEffect } from 'react';
import { X, Settings2, Info, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import { businessAPI } from '../../../utils/api';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

export default function VoucherSetting() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const businessId = localStorage.getItem('selectedBusinessId');

  useEffect(() => {
    if (businessId) {
      fetchSettings();
    }
  }, [businessId]);

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
      const sanitizedSettings = settings.map(s => ({
        ...s,
        current_number: s.current_number === '' ? 0 : parseInt(s.current_number)
      }));
      const response = await businessAPI.updateVoucherSettings(businessId, sanitizedSettings);
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Voucher settings updated successfully',
          timer: 2000,
          showConfirmButton: false
        });
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

  if (!businessId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Please select a business first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-row items-center justify-between mb-6 mt-2 gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 px-3 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
          title="Back To Dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back To Dashboard</span>
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset to Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
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

      <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 overflow-hidden">
        <div className="p-6 border-b border-yellow-100 bg-gradient-to-r from-yellow-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Voucher Settings</h2>
              <p className="text-sm text-gray-500">Customize your document numbering and prefixes</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* BULK APPLY SECTION */}
          <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Save className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Bulk Apply Settings</p>
                <p className="text-[10px] text-gray-500">Set the same prefix or starting number for all modules at once</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Prefix"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
                  id="global-prefix-page"
                />
                <button
                  onClick={() => applyGlobalPrefix(document.getElementById('global-prefix-page').value)}
                  className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all shadow-sm"
                >
                  Apply Prefix
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Enter Number"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
                  id="global-start-no-page"
                  min="0"
                />
                <button
                  onClick={() => applyGlobalStartingNumber(document.getElementById('global-start-no-page').value)}
                  className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all shadow-sm"
                >
                  Apply No.
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 animate-pulse">Fetching your settings...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings.filter(s => displayMap[s.invoice_type]).map((item) => (
                <div key={item.invoice_type} className="space-y-2 p-4 rounded-xl border border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20 transition-all">
                  <label className="block text-sm font-semibold text-gray-700" translate="no">{displayMap[item.invoice_type]}</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Prefix</span>
                      <input
                        type="text"
                        value={item.prefix}
                        onChange={(e) => handleInputChange(item.invoice_type, 'prefix', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 text-sm font-medium"
                        placeholder="e.g. ZB/INV/"
                      />
                    </div>
                    <div className="w-24">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Start No.</span>
                      <input
                        type="number"
                        value={item.current_number}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleInputChange(item.invoice_type, 'current_number', val === '' ? '' : (parseInt(val) || 0));
                        }}
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
      </div>
    </div>
  );
}
