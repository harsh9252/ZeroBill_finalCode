import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, User, ArrowRight, Wallet, Phone, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { getCurrencySymbol, getCurrencyRate } from '../../../utils/currency';
import { taxAPI } from '../../../utils/api';
import { showSuccessToast, showErrorToast } from '../../../Components/ActionMessageModel.jsx';
import { countryCodes } from '../../../utils/countryCodes';

export default function AddCustomerModel({ isOpen, onClose, onSave, editData = null, currency }) {
    const [step, setStep] = useState(2); // Directly show the form
    const [formData, setFormData] = useState({
        partyName: '',
        phoneNumber: '',
        countryCode: '+91', // Default to India
        openingBalance: '',
        balanceType: 'Money Out', // 'Money Out' or 'Money In'
        partyType: 'customer', // 'customer' or 'supplier'
        gstin: '',
        address: '',
    });

    const [gstinLoading, setGstinLoading] = useState(false);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    // Country Code Dropdown State (100% Copy from BusinessManagement)
    const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState("");
    const [phoneCodeHighlightedIndex, setPhoneCodeHighlightedIndex] = useState(0);
    const phoneCodeInputRef = useRef(null);
    const phoneCodeOptionsListRef = useRef(null);

    const filteredCountryCodes = countryCodes.filter((c) =>
        c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
        c.dial_code.includes(phoneCodeSearchTerm)
    );

    const selectPhoneCodeOption = (dialCode) => {
        setFormData(prev => ({ ...prev, countryCode: dialCode }));
        setPhoneCodeSearchTerm("");
        setShowCountryDropdown(false);
    };

    const handlePhoneCodeKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setPhoneCodeHighlightedIndex((prev) =>
                prev < filteredCountryCodes.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setPhoneCodeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && filteredCountryCodes.length > 0) {
            e.preventDefault();
            selectPhoneCodeOption(filteredCountryCodes[phoneCodeHighlightedIndex].dial_code);
        } else if (e.key === "Escape") {
            setShowCountryDropdown(false);
        }
    };

    // Click outside handler for phone code dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            const phoneDropdown = event.target.closest(
                '[data-dropdown="phoneCode"]'
            );
            if (!phoneDropdown && showCountryDropdown) {
                setShowCountryDropdown(false);
                setPhoneCodeSearchTerm("");
                setPhoneCodeHighlightedIndex(0);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showCountryDropdown]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (showCountryDropdown && phoneCodeOptionsListRef.current) {
            const highlightedElement = phoneCodeOptionsListRef.current.children[phoneCodeHighlightedIndex];
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [phoneCodeHighlightedIndex, showCountryDropdown]);

    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (editData) {
                setStep(2);
                const rawBalance = editData.openingBalance || editData.opening_balance || 0;
                const inTargetCurrency = currency === 'INR' ? rawBalance : (rawBalance * getCurrencyRate(currency)).toFixed(2);
                const fullPhone = editData.phoneNumber || editData.phone_number || '';
                let cCode = '+91';
                let pNum = fullPhone;

                if (fullPhone.includes(' ')) {
                    const parts = fullPhone.split(' ');
                    cCode = parts[0];
                    pNum = parts.slice(1).join(' ');
                }

                setFormData({
                    partyName: editData.partyName || editData.party_name || '',
                    phoneNumber: pNum,
                    countryCode: cCode,
                    openingBalance: inTargetCurrency,
                    balanceType: editData.balanceType || editData.balance_type || 'Money Out',
                    partyType: editData.partyType || editData.party_type || 'customer',
                    gstin: editData.gstin || '',
                    address: editData.address || '',
                    customFields: editData.customFields || []
                });
            } else {
                setFormData({
                    partyName: '',
                    phoneNumber: '',
                    countryCode: '+91',
                    openingBalance: '',
                    balanceType: 'Money Out',
                    partyType: 'customer',
                    gstin: '',
                    address: '',
                    customFields: []
                });
            }
        }
    }, [isOpen, editData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phoneNumber') {
            // Only allow digits (0-9)
            const numericValue = value.replace(/\D/g, '');
            // Limit to 15 characters (Standard for phone numbers)
            const limitedValue = numericValue.slice(0, 15);
            setFormData(prev => ({ ...prev, [name]: limitedValue }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        try {
            const rate = getCurrencyRate(currency);
            const combinedPhoneNumber = `${formData.countryCode} ${formData.phoneNumber}`;
            const amountInINR = currency === 'INR' ? parseFloat(formData.openingBalance || 0) : parseFloat(formData.openingBalance || 0) / rate;

            // Build explicit payload for backend compatibility
            const payload = {
                party_name: formData.partyName,
                party_type: formData.partyType,
                phone_number: combinedPhoneNumber,
                balance_type: formData.balanceType,
                opening_balance: amountInINR,
                gstin: formData.gstin,
                address: formData.address,
                // Include camelCase as fallback
                partyName: formData.partyName,
                partyType: formData.partyType,
                phoneNumber: combinedPhoneNumber,
                balanceType: formData.balanceType,
                openingBalance: amountInINR
            };

            // await onSave to ensure it finishes before closing
            await onSave(payload);

            // Success! Close modal
            onClose();
        } catch (error) {
            console.error('Error in handleSave:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const addCustomField = () => {
        setFormData(prev => ({
            ...prev,
            customFields: [...prev.customFields, { label: '', value: '' }]
        }));
    };

    const removeCustomField = (index) => {
        setFormData(prev => ({
            ...prev,
            customFields: prev.customFields.filter((_, i) => i !== index)
        }));
    };

    const updateCustomField = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            customFields: prev.customFields.map((cf, i) =>
                i === index ? { ...cf, [field]: value } : cf
            )
        }));
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className={`relative bg-white w-full ${step === 1 ? 'max-w-[1000px]' : 'max-w-3xl'} mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-yellow-400 z-50`}>
                {/* Theme Top Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#129046] via-[#9ccc53] to-[#129046]" />

                {/* Header - Reduced Height */}
                <div className="flex items-center justify-between px-8 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        {editData && (
                            <button
                                onClick={() => setStep(1)}
                                className="hidden"
                            >
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight leading-none">
                                {editData ? 'Edit Party' : 'New Party'}
                            </h2>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-[0.1em] mt-1.5 flex items-center gap-1.5">
                                <ShieldCheck size={10} className="text-[#129046]" />
                                Secure Ledger Entry
                            </p>
                        </div>
                    </div>

                </div>

                {/* Absolute Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-2.5 right-2.5 p-2 hover:bg-red-50 text-[#129046] hover:text-red-500 rounded-full transition-all z-10"
                    aria-label="Close"
                >
                    <X size={22} />
                </button>

                {/* Step 2: Compact Themed Form */}
                <form onSubmit={handleSave} className="bg-white">

                    <div className="px-8 py-5 space-y-5">
                        <div className="grid grid-cols-12 gap-x-6 gap-y-4">
                            {/* Row 1 Left: Party Name */}
                            <div className="col-span-12 md:col-span-7 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <User size={12} className="text-[#129046]" /> Party Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="partyName"
                                    placeholder="Enter Your Party Name"
                                    value={formData.partyName}
                                    onChange={handleChange}
                                    className="w-full h-12 px-5 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-gray-700"
                                />
                            </div>

                            {/* Row 1 Right: Opening Balance */}
                            <div className="col-span-12 md:col-span-5 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Wallet size={12} className="text-[#129046]" /> Opening Balance <span className="text-red-500">*</span>
                                </label>
                                <div className="relative h-12 w-full bg-gray-50/50 border-2 border-gray-300 rounded-xl focus-within:border-[#129046] focus-within:bg-white transition-all">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
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
                                        className="w-full h-full pl-8 pr-5 border-none focus:ring-0 focus:outline-none font-semibold text-gray-700 bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Row 2 Left: Mobile Number with Country Code */}
                            <div className="col-span-12 md:col-span-7 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Phone size={12} className="text-[#129046]" /> Mobile Number <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                                </label>
                                <div className="flex gap-2.5">
                                    {/* Country Code Dropdown (100% Copy from BusinessManagement UI) */}
                                    <div className="relative w-24 flex-shrink-0" data-dropdown="phoneCode">
                                        <input
                                            ref={phoneCodeInputRef}
                                            type="text"
                                            autoComplete="off"
                                            value={showCountryDropdown ? phoneCodeSearchTerm : (formData.countryCode || "")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPhoneCodeSearchTerm(val);
                                                setFormData(prev => ({ ...prev, countryCode: val }));
                                                if (!showCountryDropdown) {
                                                    setShowCountryDropdown(true);
                                                }
                                                setPhoneCodeHighlightedIndex(0);
                                            }}
                                            onFocus={() => {
                                                setShowCountryDropdown(true);
                                                setPhoneCodeSearchTerm(formData.countryCode || "");
                                            }}
                                            onKeyDown={handlePhoneCodeKeyDown}
                                            placeholder="+91"
                                            className="w-full h-12 px-3 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-gray-700 text-sm"
                                        />
                                        {showCountryDropdown && (
                                            <div ref={phoneCodeOptionsListRef} className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto w-64">
                                                {filteredCountryCodes.length > 0 ? (
                                                    filteredCountryCodes.map((country, index) => (
                                                        <button
                                                            key={country.code}
                                                            type="button"
                                                            onClick={() => selectPhoneCodeOption(country.dial_code)}
                                                            onMouseEnter={() => setPhoneCodeHighlightedIndex(index)}
                                                            className={`w-full px-3 py-2 text-left text-xs transition-all border-b border-gray-100 last:border-b-0 font-semibold ${phoneCodeHighlightedIndex === index
                                                                ? "bg-[#129046] text-white"
                                                                : formData.countryCode === country.dial_code
                                                                    ? "bg-[#129046]/10 text-gray-800"
                                                                    : "text-gray-700 hover:bg-green-50"
                                                                }`}
                                                        >
                                                            <span className="font-bold">{country.dial_code}</span> ({country.name})
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-xs text-gray-500">No results found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Phone Number Input */}
                                    <input
                                        type="text"
                                        name="phoneNumber"
                                        placeholder="Enter Mobile Number"
                                        maxLength={40}
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="flex-1 h-12 px-5 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-gray-700"
                                    />
                                </div>
                            </div>

                            {/* Row 2 Right: Balance Selection */}
                            <div className="col-span-12 md:col-span-5 space-y-1.5 flex flex-col justify-end">
                                <div className="flex gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, balanceType: 'Money Out' }))}
                                        className={`min-w-[100px] flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 flex items-center justify-center ${formData.balanceType === 'Money Out'
                                            ? 'bg-red-50 border-red-500 text-red-600 shadow-sm'
                                            : 'bg-white border-gray-300 text-gray-400 hover:border-red-200 hover:text-red-400'
                                            }`}
                                    >
                                        <span>Money Out</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, balanceType: 'Money In' }))}
                                        className={`min-w-[100px] flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 flex items-center justify-center ${formData.balanceType === 'Money In'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm'
                                            : 'bg-white border-gray-300 text-gray-400 hover:border-emerald-200 hover:text-emerald-400'
                                            }`}
                                    >
                                        <span>Money In</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons - Right Aligned & Normalized Width */}
                    <div className="px-8 py-2 bg-gray-50/50 border-t border-gray-100 flex justify-end items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 h-10 text-xs font-bold text-red-600 uppercase tracking-wider bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.95]"
                        >
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 h-10 text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:shadow-md hover:shadow-green-100 rounded-xl transition-all active:scale-[0.95] flex items-center gap-2 disabled:opacity-70"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{editData ? 'Updating...' : 'Adding...'}</span>
                                </>
                            ) : (
                                <>
                                    <span>{editData ? 'Update' : 'Add'} Party</span>
                                </>
                            )}
                        </button>
                    </div>
                    {/* Form ends here */}
                </form>
            </div>
        </div>
    );
}
