import React, { useState, useEffect } from 'react';
import { X, Building, User, Mail, Phone, Calendar, Banknote, FileText, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getCurrencySymbol, getCurrencyRate } from '../../../utils/currency';

function NewProjectExpenseModal({ isOpen, onClose, onSubmit, expense = null, currency, existingCategories = [], businessId }) {
  const [formData, setFormData] = useState({
    projectName: '',
    location: '',
    startDate: new Date().toLocaleDateString('en-CA'),
    endDate: new Date().toLocaleDateString('en-CA'),
    amount: '',
    remarks: '',
    projectType: 'payable',
    value_breakdown: [],
    categories: [],
    expenseNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const isEditMode = !!expense;

  const [wasOpen, setWasOpen] = useState(false);

  useEffect(() => {
    if (isOpen && !wasOpen) {
      if (expense) {
        const inTargetCurrency = currency === 'INR' ? (expense.amount || '') : (expense.amount * getCurrencyRate(currency)).toFixed(2);
        const breakdown = expense.value_breakdown ? (typeof expense.value_breakdown === 'string' ? JSON.parse(expense.value_breakdown) : expense.value_breakdown) : [];
        setFormData({
          projectName: expense.account_name || '',
          location: expense.location || '',
          startDate: expense.start_date ? expense.start_date.split('T')[0] : '',
          endDate: expense.end_date ? expense.end_date.split('T')[0] : '',
          amount: inTargetCurrency,
          remarks: expense.remarks || '',
          projectType: expense.project_type || 'payable',
          value_breakdown: breakdown,
          categories: expense.category ? expense.category.split(',').map(c => c.trim()).filter(c => c) : [],
          expenseNumber: expense.expense_number || ''
        });
        if (breakdown.length > 0) {
          setShowBreakdown(true);
        } else {
          setShowBreakdown(false);
        }
      } else {
        setFormData({
          projectName: '',
          location: '',
          startDate: new Date().toLocaleDateString('en-CA'),
          endDate: new Date().toLocaleDateString('en-CA'),
          amount: '',
          remarks: '',
          projectType: 'payable',
          value_breakdown: [],
          categories: [],
          expenseNumber: ''
        });
        setShowBreakdown(false);

        if (businessId) {
          const fetchNextNumber = async () => {
            try {
              const token = localStorage.getItem('token');
              const { getApiURL } = await import('../../../utils/config');
              const apiURL = getApiURL();
              const response = await axios.get(`${apiURL}/project-expense/next-number?business_id=${businessId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (response.data && response.data.success) {
                setFormData(prev => ({
                  ...prev,
                  expenseNumber: response.data.data.expense_number
                }));
              }
            } catch (err) {
              console.error('Error fetching next project expense number:', err);
            }
          };
          fetchNextNumber();
        }
      }
      setErrors({});
    }
    setWasOpen(isOpen);
  }, [expense, isOpen, wasOpen, businessId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const addBreakdownItem = () => {
    setFormData(prev => {
      const newItems = [...prev.value_breakdown, { name: '', amount: '' }];
      const total = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      return {
        ...prev,
        value_breakdown: newItems,
        amount: total > 0 ? total.toFixed(2) : prev.amount
      };
    });
  };

  const removeBreakdownItem = (index) => {
    setFormData(prev => {
      const newItems = prev.value_breakdown.filter((_, i) => i !== index);
      const total = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      return {
        ...prev,
        value_breakdown: newItems,
        amount: total > 0 ? total.toFixed(2) : (newItems.length > 0 ? '' : prev.amount)
      };
    });
  };

  const handleBreakdownChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.value_breakdown];
      newItems[index] = { ...newItems[index], [field]: value };
      const total = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      return {
        ...prev,
        value_breakdown: newItems,
        amount: total > 0 ? total.toFixed(2) : (field === 'amount' ? '' : prev.amount)
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.projectName.trim()) newErrors.projectName = 'Project Name is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End Date must be after Start Date';
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
        const categoryString = formData.categories.join(', ');
        await onSubmit({ ...formData, amount: amountInINR, category: categoryString });
        setFormData({
          projectName: '',
          location: '',
          startDate: new Date().toLocaleDateString('en-CA'),
          endDate: new Date().toLocaleDateString('en-CA'),
          amount: '',
          remarks: '',
          projectType: 'payable',
          value_breakdown: [],
          categories: []
        });
        setShowBreakdown(false);
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
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform scale-100">
        {/* Header */}
        <div className="bg-[#129046] px-5 py-3 flex items-center justify-between relative">
          <h2 className="text-xl font-bold text-white tracking-wide">
            Create Your Project
          </h2>
          <button
            onClick={onClose}
            className="absolute top-2.5 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-all text-white shadow-lg border-2 border-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-white overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Project Expense Number */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Project Expense Number
              </label>
              <input
                type="text"
                value={formData.expenseNumber}
                onChange={(e) => handleInputChange('expenseNumber', e.target.value)}
                placeholder="Auto-generated (e.g., PE-2026-27-0001)"
                className="w-full px-4 py-2 bg-gray-50 border-1 border-gray-200 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none"
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Building className="w-3.5 h-3.5" />
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                placeholder="Enter project name..."
                className={`w-full px-4 py-2 bg-gray-50 border-1 rounded-md text-sm transition-all focus:outline-none focus:ring-4 ${errors.projectName ? 'border-red-500 focus:ring-red-50/50' : 'border-gray-200 hover:border-[#129046]/30 focus:border-[#129046] focus:ring-[#129046]/10'}`}
              />
              {errors.projectName && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.projectName}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Categories
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  list="project-categories-list"
                  placeholder="Type and press Enter to add..."
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    // If the value is in the existingCategories, it means it was likely selected from the datalist
                    if (existingCategories.includes(value)) {
                      const newCats = value.split(',').map(c => c.trim()).filter(c => c && !formData.categories.includes(c));
                      if (newCats.length > 0) {
                        handleInputChange('categories', [...formData.categories, ...newCats]);
                      }
                      e.target.value = '';
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = e.target.value.trim();
                      if (value) {
                        const newCats = value.split(',').map(c => c.trim()).filter(c => c && !formData.categories.includes(c));
                        if (newCats.length > 0) {
                          handleInputChange('categories', [...formData.categories, ...newCats]);
                        }
                        e.target.value = '';
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-50 border-1 border-gray-200 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none"
                />
                <datalist id="project-categories-list">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {/* Selected Categories Tags */}
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map((cat, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-2 py-1 bg-[#129046]/10 text-[#129046] border border-[#129046]/20 rounded-md text-[11px] font-bold"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newCats = formData.categories.filter((_, i) => i !== index);
                          handleInputChange('categories', newCats);
                        }}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location..."
                className="w-full px-4 py-2 bg-gray-50 border-1 border-gray-200 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none"
              />
            </div>

            {/* Comment / Remark */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Comment / Remark
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Enter details about this expense..."
                rows={2}
                className="w-full px-4 py-2 bg-gray-50 border-1 border-gray-200 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none resize-none"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full px-4 py-2 bg-gray-50 border-1 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none ${errors.startDate ? 'border-red-500' : 'border-gray-200'}`}
              />
              {errors.startDate && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5" />
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                min={formData.startDate}
                className={`w-full px-4 py-2 bg-gray-50 border-1 rounded-md text-sm transition-all hover:border-[#129046]/30 focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/10 focus:outline-none ${errors.endDate ? 'border-red-500' : 'border-gray-200'}`}
              />
              {errors.endDate && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.endDate}</p>}
            </div>

            {/* Amount */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Banknote className="w-3.5 h-3.5" />
                  Project Value <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextShow = !showBreakdown;
                    setShowBreakdown(nextShow);

                    // If opening calculator and no items exist, but a manual amount does
                    if (nextShow && formData.value_breakdown.length === 0) {
                      if (formData.amount && parseFloat(formData.amount) > 0) {
                        const initialItems = [
                          { name: 'Initial Project Value', amount: formData.amount },
                          { name: '', amount: '' }
                        ];
                        setFormData(prev => ({ ...prev, value_breakdown: initialItems }));
                      } else {
                        setFormData(prev => ({ ...prev, value_breakdown: [{ name: '', amount: '' }] }));
                      }
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${showBreakdown ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#129046]/10 text-[#129046] hover:bg-[#129046]/20'}`}
                >
                  {showBreakdown ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {showBreakdown ? 'Close ' : 'Add Project  '}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  readOnly={showBreakdown}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                    }
                  }}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border-1 rounded-md text-lg font-bold transition-all focus:outline-none focus:ring-4 ${showBreakdown ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''} ${errors.amount ? 'border-red-500 focus:ring-red-50/50 text-red-500' : 'border-gray-200 hover:border-[#129046]/30 focus:border-[#129046] focus:ring-[#129046]/10 text-gray-900'}`}
                />
              </div>

              {/* Breakdown Section */}
              {showBreakdown && (
                <div className="mt-3 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2">Project Value Breakdown</p>
                  {formData.value_breakdown.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Project Name"
                        value={item.name}
                        onChange={(e) => handleBreakdownChange(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:border-[#129046] outline-none transition-all shadow-sm"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => handleBreakdownChange(index, 'amount', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold focus:border-[#129046] outline-none transition-all shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBreakdownItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addBreakdownItem}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-[#129046] hover:border-[#129046]/40 hover:bg-[#129046]/5 transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Project
                  </button>
                </div>
              )}
              {errors.amount && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.amount}</p>}
            </div>

            {/* Project Nature (Type) */}
            {/* <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Banknote className="w-3.5 h-3.5" />
                Select Project Nature
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleInputChange('projectType', 'receivable')}
                  className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${formData.projectType === 'receivable' ? 'bg-white text-[#129046] shadow-sm border border-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                >
                  <span className="text-sm font-black">Project In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('projectType', 'payable')}
                  className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${formData.projectType === 'payable' ? 'bg-white text-red-600 shadow-sm border border-red-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                >
                  <span className="text-sm font-black">Project Out</span>
                </button>
              </div>
            </div> */}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5"
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
                <span>{isEditMode ? 'Update Project' : 'Save Project'}</span>
                <span className="font-bold text-base leading-none">&rarr;</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewProjectExpenseModal;
