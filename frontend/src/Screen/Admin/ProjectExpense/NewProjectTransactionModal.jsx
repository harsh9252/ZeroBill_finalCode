import React, { useState, useEffect } from 'react';
import { X, Plus, Banknote, Calendar, FileText, Image, ArrowUpRight, ArrowDownLeft, User, Phone } from 'lucide-react';
import { partyAPI, getApiConfig } from '../../../utils/api';

import { formatCurrency, getCurrencySymbol, getCurrencyRate } from '../../../utils/currency';

import axios from 'axios';
const API_URL = getApiConfig().backendURL;

function NewProjectTransactionModal({ isOpen, onClose, onSubmit, currency = 'INR', transaction = null, projectExpenseId, selectedPartyId = null, parties = [], projectCategories = '' }) {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'debit', // 'debit' or 'credit'
    date: new Date().toLocaleDateString('en-CA'),
    screenshot: null,
    screenshotPreview: null,
    remarks: '',
    project_party_id: selectedPartyId || '',
    party_name: '',
    phoneNumber: '',
    categories: []
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [partiesList, setPartiesList] = useState([]);
  const businessId = localStorage.getItem('selectedBusinessId');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isEditMode = !!transaction;

  useEffect(() => {
    setPartiesList(parties || []);
  }, [parties]);

  React.useEffect(() => {
    if (transaction && isOpen) {
      const inTargetCurrency = currency === 'INR' ? (transaction.amount ?? '') : (transaction.amount * getCurrencyRate(currency)).toFixed(2);
      setFormData({
        amount: inTargetCurrency,
        type: transaction.transaction_type || (transaction.type === 'payment_in' ? 'credit' : 'debit'),
        date: transaction.date ? transaction.date.split('T')[0] : new Date().toLocaleDateString('en-CA'),
        screenshot: null,
        screenshotPreview: transaction.screenshot ? (transaction.screenshot.startsWith('http') ? transaction.screenshot : `${getApiConfig().backendURL}${transaction.screenshot}`) : null,
        remarks: transaction.remarks || transaction.description || '',
        project_party_id: transaction.project_party_id || selectedPartyId || '',
        party_name: transaction.party_name || (parties.find(p => String(p.id) === String(transaction.project_party_id || selectedPartyId))?.party_name || ''),
        phoneNumber: (transaction.party_phone || parties.find(p => String(p.id) === String(transaction.project_party_id || selectedPartyId))?.phone || '').replace(/^\+91/, ''),
        categories: transaction.category ? transaction.category.split(',').map(c => c.trim()).filter(c => c) : []
      });
      setErrors({});
    } else if (isOpen && !transaction) {
      // Reset form when opening for "Add Entry" - Keep it completely blank
      setFormData({
        amount: '',
        type: 'debit',
        date: new Date().toLocaleDateString('en-CA'),
        screenshot: null,
        screenshotPreview: null,
        remarks: '',
        project_party_id: '',
        party_name: '',
        phoneNumber: '',
        categories: []
      });
      setErrors({});
    } else if (!isOpen) {
      setErrors({});
    }
  }, [transaction, isOpen, selectedPartyId, parties, currency]);

  useEffect(() => {
    // Party ID is now passed via selectedPartyId prop
  }, [isOpen, projectExpenseId]);

  const handleInputChange = (field, value) => {
    if (field === 'party_name') {
      const selectedParty = parties.find(p => p.party_name === value);
      setFormData(prev => ({
        ...prev,
        party_name: value,
        project_party_id: selectedParty ? selectedParty.id : '',
        phoneNumber: selectedParty ? (selectedParty.phone || '').replace(/^\+91/, '') : prev.phoneNumber
      }));
    } else if (field === 'phoneNumber') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, screenshot: 'File size must be less than 10MB' }));
        return;
      }

      // Check if it's an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            screenshot: file,
            screenshotPreview: event.target?.result
          }));
          if (errors.screenshot) setErrors(prev => ({ ...prev, screenshot: '' }));
        };
        reader.readAsDataURL(file);
      } else {
        // For documents and non-image files, store the file object,
        // and set screenshotPreview to the filename for display
        setFormData(prev => ({
          ...prev,
          screenshot: file,
          screenshotPreview: file.name
        }));
        if (errors.screenshot) setErrors(prev => ({ ...prev, screenshot: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.type) {
      newErrors.type = 'Transaction type is required';
    }

    if (!formData.party_name) {
      newErrors.party_name = 'Party name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        const rate = getCurrencyRate(currency);
        const amountInINR = currency === 'INR' ? parseFloat(formData.amount) : parseFloat(formData.amount) / rate;
        
        // Join categories into string for backend
        const submitData = {
          ...formData,
          amount: amountInINR,
          category: formData.categories.join(', ')
        };
        delete submitData.categories; // Remove array from data sent to server

        await onSubmit(submitData);
        setFormData({
          amount: '',
          type: 'debit',
          date: new Date().toLocaleDateString('en-CA'),
          screenshot: null,
          screenshotPreview: null,
          remarks: '',
          party_name: '',
          phoneNumber: '',
          project_party_id: '',
          categories: []
        });
        setErrors({});
      } catch (error) {
        console.error('Error submitting:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform scale-100">
        {/* Header */}
        <div className="bg-[#129046] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white tracking-wide">
            {isEditMode ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-white overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Row 1: Party Name & Mobile Number */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Party Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <User className="w-3.5 h-3.5" />
                  Select Party <span className="text-red-500">*</span>
                </label>
                <input
                  list="project-parties-list"
                  value={formData.party_name}
                  onChange={(e) => handleInputChange('party_name', e.target.value)}
                  placeholder="Select or Type Party Name"
                  className={`w-full px-4 py-2.5 bg-gray-50 border-1 rounded-xl text-sm transition-all focus:outline-none focus:ring-4 ${errors.party_name
                    ? 'border-red-500 focus:ring-red-50/50 text-red-500'
                    : 'border-gray-200 hover:border-[#129046]/30 focus:border-[#129046] focus:ring-[#129046]/10 text-gray-900'
                    }`}
                />
                <datalist id="project-parties-list">
                  {partiesList.map(party => (
                    <option key={party.id} value={party.party_name} />
                  ))}
                </datalist>
                {errors.party_name && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.party_name}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Phone className="w-3.5 h-3.5" />
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter number"
                    className={`flex-1 px-4 py-2.5 bg-gray-50 border-1 rounded-r-xl text-sm transition-all focus:outline-none focus:ring-4 ${errors.phoneNumber
                      ? 'border-red-500 focus:ring-red-50/50 text-red-500'
                      : 'border-gray-200 hover:border-[#129046]/30 focus:border-[#129046] focus:ring-[#129046]/10 text-gray-900'
                      }`}
                  />
                </div>
                {errors.phoneNumber && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.phoneNumber}</p>}
              </div>
            </div>

            {/* Row 2: Amount & Transaction Type */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Banknote className="w-3.5 h-3.5" />
                  Transaction Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-1 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-4 ${errors.amount
                      ? 'border-red-500 focus:ring-red-50/50 text-red-500'
                      : 'border-gray-200 hover:border-[#129046]/30 focus:border-[#129046] focus:ring-[#129046]/10 text-gray-900'
                      }`}
                  />
                </div>
                {errors.amount && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.amount}</p>}
              </div>

              {/* Transaction Type */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Transaction Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 h-[42px]">
                  <button
                    onClick={() => handleInputChange('type', 'debit')}
                    className={`flex-1 px-4 py-0 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-1 ${formData.type === 'debit'
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-200'
                      }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Payment Out
                  </button>
                  <button
                    onClick={() => handleInputChange('type', 'credit')}
                    className={`flex-1 px-4 py-0 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-1 ${formData.type === 'credit'
                      ? 'bg-green-50 border-green-300 text-green-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-200'
                      }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Payment In
                  </button>
                </div>
                {errors.type && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.type}</p>}
              </div>
            </div>

            {/* Row 3: Date & Screenshot */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-4 py-2.5 bg-gray-50 border-1 rounded-xl text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none ${errors.date ? 'border-red-500' : 'border-gray-200'
                    }`}
                />
                {errors.date && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.date}</p>}
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Image className="w-3.5 h-3.5" />
                  Attachment / Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*, .pdf, .doc, .docx, .xls, .xlsx, .csv, .txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className={`w-full px-4 py-2.5 bg-gray-50 border-1 border-dashed rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center hover:bg-gray-100 font-bold min-w-0 overflow-hidden ${errors.screenshot
                    ? 'border-red-500'
                    : 'border-gray-300 hover:border-[#129046]/50'
                    }`}
                >
                  {formData.screenshotPreview ? (
                    <span className="text-green-600 truncate max-w-full px-2">
                      ✓ {typeof formData.screenshotPreview === 'string' && !formData.screenshotPreview.startsWith('data:') && !formData.screenshotPreview.startsWith('http')
                        ? formData.screenshotPreview 
                        : (formData.screenshot?.name || (typeof formData.screenshotPreview === 'string' ? formData.screenshotPreview.split('/').pop() : 'Selected'))}
                    </span>
                  ) : (
                    <span className="text-gray-500">Upload</span>
                  )}
                </label>
                {errors.screenshot && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.screenshot}</p>}
              </div>
            </div>

            {/* Remarks - Half Width */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Add any additional notes or remarks..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 border-1 border-gray-200 rounded-xl text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none resize-none"
              />
            </div>

            {/* Category - Half Width */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Category
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.categories.map((cat, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#129046]/10 text-[#129046] rounded-full text-xs font-bold border border-[#129046]/20">
                    {cat}
                    <button
                      type="button"
                      onClick={() => {
                        const newCats = formData.categories.filter((_, i) => i !== idx);
                        setFormData(prev => ({ ...prev, categories: newCats }));
                      }}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                value={categoryInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const newCats = val.split(',').map(c => c.trim()).filter(c => c && !formData.categories.includes(c));
                    if (newCats.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        categories: [...prev.categories, ...newCats]
                      }));
                    }
                  }
                  setCategoryInput('');
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border-1 border-gray-200 rounded-xl text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none font-bold"
              >
                <option value="">Select Category</option>
                {(projectCategories || '').split(',').map(c => c.trim()).filter(c => c).map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[10px] text-gray-400 font-medium italic">
                You can select multiple categories from the list.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all rounded-lg shadow-sm hover:shadow-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-[#129046] hover:bg-[#129046]/90 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isEditMode ? 'Update Transaction' : 'Add Transaction'}</span>
                <span className="font-bold text-base leading-none">&rarr;</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewProjectTransactionModal;
