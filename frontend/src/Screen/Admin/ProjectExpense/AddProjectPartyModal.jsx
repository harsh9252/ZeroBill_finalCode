import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Phone, Plus } from 'lucide-react';
import { countryCodes } from '../../../utils/countryCodes';
import { showSuccessToast, showErrorToast } from '../../../Components/ActionMessageModel';
import { partyAPI } from '../../../utils/api';
import axios from 'axios';
import { getApiURL } from '../../../utils/config';

const API_URL = getApiURL();

export default function AddProjectPartyModal({ isOpen, onClose, onPartyAdded, currency, projectExpenseId }) {
  const [mode, setMode] = useState('select'); // 'select' or 'create'
  const [existingParties, setExistingParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [formData, setFormData] = useState({
    partyName: '',
    phoneNumber: '',
    countryCode: '+91',
    openingBalance: '',
    remark: ''
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [partiesLoading, setPartiesLoading] = useState(false);

  // Fetch existing parties
  useEffect(() => {
    if (isOpen && projectExpenseId) {
      fetchExistingParties();
    }
  }, [isOpen, projectExpenseId]);

  const fetchExistingParties = async () => {
    try {
      setPartiesLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_URL}/project-parties/${projectExpenseId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const parties = response.data.data || [];
   
        setExistingParties(parties);
      }
    } catch (error) {
      console.error('@@@ [ERROR] Error fetching parties:', error);
      showErrorToast('Failed to fetch existing parties');
    } finally {
      setPartiesLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setMode('select');
      setSelectedPartyId(null);
      setFormData({
        partyName: '',
        phoneNumber: '',
        countryCode: '+91',
        openingBalance: '',
        remark: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.partyName.trim()) {
      newErrors.partyName = 'Party name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Mobile number is required';
    } else if (!/^\d+$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid mobile number';
    }

    if (!formData.openingBalance) {
      newErrors.openingBalance = 'Opening balance is required';
    } else if (isNaN(parseFloat(formData.openingBalance))) {
      newErrors.openingBalance = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectParty = async (partyId) => {
    setLoading(true);
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      const token = localStorage.getItem('token');
      const selectedParty = existingParties.find(p => p.id === partyId);

      // Create a transaction linking the selected party to the project expense
      const transactionPayload = {
        project_expense_id: projectExpenseId,
        project_party_id: partyId,
        amount: 0, // No opening balance for existing parties
        transaction_type: 'credit',
        transaction_date: new Date().toISOString().split('T')[0],
        description: `Party Added - ${selectedParty.party_name}`
      };

      const transactionResponse = await axios.post(
        `${API_URL}/project-expense-transactions/${businessId}`,
        transactionPayload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (transactionResponse.data.success) {
        showSuccessToast('Party added to project successfully');
        onPartyAdded(selectedParty);
        onClose();
      } else {
        throw new Error(transactionResponse.data.message || 'Failed to add party');
      }
    } catch (error) {
      console.error('Error selecting party:', error);
      showErrorToast(error.message || 'Failed to add party');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      const token = localStorage.getItem('token');

      // Step 1: Create the project-specific party
      const partyPayload = {
        business_id: businessId,
        project_expense_id: projectExpenseId,
        party_name: formData.partyName.trim(),
        phone: formData.countryCode + formData.phoneNumber.trim(),
        email: null
      };

      const partyResponse = await axios.post(
        `${API_URL}/project-parties`,
        partyPayload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!partyResponse.data.success) {
        throw new Error(partyResponse.data.message || 'Failed to add party');
      }

      const partyId = partyResponse.data.data.id;

      // Step 2: Create a transaction linking the party to the project expense with opening balance
      const transactionPayload = {
        project_expense_id: projectExpenseId,
        project_party_id: partyId,
        amount: parseFloat(formData.openingBalance),
        transaction_type: 'credit',
        transaction_date: new Date().toISOString().split('T')[0],
        description: `Opening Balance - ${formData.partyName.trim()}`
      };

      const transactionResponse = await axios.post(
        `${API_URL}/project-expense-transactions/${businessId}`,
        transactionPayload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (transactionResponse.data.success) {
        showSuccessToast('Party created and added successfully');
        onPartyAdded(partyResponse.data.data);
        onClose();
      } else {
        throw new Error(transactionResponse.data.message || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Error adding party:', error);
      showErrorToast(error.message || 'Failed to add party');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-yellow-400 z-50">
        {/* Theme Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#129046] via-[#9ccc53] to-[#129046]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {mode === 'select' ? 'Select Party' : 'Create New Party'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-6 pt-4">
          <button
            onClick={() => setMode('select')}
            className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${mode === 'select'
              ? 'border-[#129046] text-[#129046]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Select Existing
          </button>
          <button
            onClick={() => setMode('create')}
            className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${mode === 'create'
              ? 'border-[#129046] text-[#129046]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Create New
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {mode === 'select' ? (
            // Select Mode
            <div className="space-y-3">
              {partiesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading parties...</div>
              ) : existingParties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No existing parties found</p>
                  <p className="text-xs text-gray-400 mt-2">Create a new party to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Select Party <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectParty(parseInt(e.target.value));
                        }
                      }}
                      defaultValue=""
                      className="w-full h-10 px-4 bg-gray-50/50 border-2 border-gray-300 rounded-lg focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-sm appearance-none cursor-pointer"
                    >
                      <option value="">-- Select a party --</option>
                      {existingParties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.party_name} {party.phone ? `(${party.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Create Mode
            <>
              {/* Party Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Party Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    name="partyName"
                    placeholder="Enter party name"
                    value={formData.partyName}
                    onChange={handleChange}
                    className={`w-full h-10 px-4 bg-gray-50/50 border-2 rounded-lg focus:outline-none transition-all font-semibold text-sm ${errors.partyName
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#129046] focus:bg-white'
                      }`}
                  />
                  {errors.partyName && <p className="text-xs text-red-500">{errors.partyName}</p>}
                </div>
              </div>

              {/* Mobile Number with Country Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Phone size={12} className="text-[#129046]" /> Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative w-20">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full h-10 px-2 bg-gray-50/50 border-2 border-gray-300 rounded-lg focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-gray-700 text-xs flex items-center justify-between"
                    >
                      <span>{formData.countryCode}</span>
                      <ChevronDown size={12} className={`transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                        {countryCodes.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, countryCode: country.dial_code }));
                              setShowCountryDropdown(false);
                            }}
                            className="w-full px-2 py-1.5 text-left text-xs hover:bg-green-50 transition-all border-b border-gray-100 last:border-b-0 font-semibold text-gray-700"
                          >
                            {country.dial_code} {country.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Enter number"
                    pattern="[0-9]*"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`flex-1 h-10 px-4 bg-gray-50/50 border-2 rounded-lg focus:outline-none transition-all font-semibold text-sm ${errors.phoneNumber
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#129046] focus:bg-white'
                      }`}
                  />
                </div>
                {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber}</p>}
              </div>

              {/* Opening Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Opening Balance <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  name="openingBalance"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  className={`w-full h-10 px-4 bg-gray-50/50 border-2 rounded-lg focus:outline-none transition-all font-semibold text-sm ${errors.openingBalance
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-[#129046] focus:bg-white'
                    }`}
                />
                {errors.openingBalance && <p className="text-xs text-red-500">{errors.openingBalance}</p>}
              </div>

              {/* Remark */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Remark <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  name="remark"
                  placeholder="Enter remark"
                  value={formData.remark}
                  onChange={handleChange}
                  className="w-full h-20 px-4 py-2 bg-gray-50/50 border-2 border-gray-300 rounded-lg focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-sm resize-none"
                />
              </div>
            </>
          )}
        </form>

        {/* Footer Buttons */}
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-xs font-bold text-red-600 uppercase tracking-wider bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.95]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 h-9 text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:shadow-md hover:shadow-green-100 rounded-lg transition-all active:scale-[0.95] flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Adding...' : 'Add Party'}
          </button>
        </div>
      </div>
    </div>
  );
}
