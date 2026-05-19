import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, TrendingDown, TrendingUp, Camera, Calendar as CalendarIcon, FileText, ArrowLeft, Upload } from 'lucide-react';
import { getCurrencySymbol, getCurrencyRate } from '../../../utils/currency';

export default function AddTransactionModel({ isOpen, onClose, onSave, editData = null, currency }) {
    const [step, setStep] = useState(1); // 1: Selection, 2: Form
    const [formData, setFormData] = useState({
        type: 'payment_in', // 'payment_in' or 'payment_out'
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        screenshot: null,
        screenshotPreview: '',
        imageUrl: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editData) {
                setStep(2);
                const inTargetCurrency = currency === 'INR' ? (editData.amount ?? '') : (editData.amount * getCurrencyRate(currency)).toFixed(2);
                setFormData({
                    type: editData.type || 'payment_in',
                    amount: inTargetCurrency,
                    date: editData.date ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    description: editData.description || '',
                    screenshot: null,
                    screenshotPreview: editData.image_url || '',
                    imageUrl: editData.image_url || ''
                });
            } else {
                setStep(1);
                setFormData({
                    type: 'payment_in',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    screenshot: null,
                    screenshotPreview: '',
                    imageUrl: ''
                });
            }
        }
    }, [isOpen, editData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelection = (type) => {
        setFormData(prev => ({ ...prev, type }));
        setStep(2);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                screenshot: file,
                screenshotPreview: file.name
            }));
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        const rate = getCurrencyRate(currency);
        const amountInINR = currency === 'INR' ? parseFloat(formData.amount) : parseFloat(formData.amount) / rate;
        onSave({ ...formData, amount: amountInINR });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className={`relative bg-white w-full ${step === 1 ? 'max-w-2xl' : 'max-w-xl'} rounded-xl shadow-2xl overflow-hidden border-2 border-yellow-400 z-50`}>
                {/* Theme Top Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#129046] via-[#9ccc53] to-[#129046]" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-1.5 hover:bg-green-50 rounded-xl text-gray-400 hover:text-[#129046] transition-all"
                            >
                                <ArrowLeft className="rotate-0" size={18} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 tracking-tight leading-none">
                                {editData ? 'Edit Entry' : (step === 1 ? 'Add New Entry' : `Record ${formData.type === 'payment_in' ? 'Money In' : 'Money Out'}`)}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.1em] mt-1 flex items-center gap-1.5">
                                <ShieldCheck size={10} className="text-[#129046]" />
                                {editData ? 'Modify Transaction' : 'Secure Transaction'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Absolute Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-1.5 hover:bg-red-50 text-[#129046] hover:text-red-500 rounded-full transition-all z-10"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {step === 1 ? (
                    /* Step 1: Selection */
                    <div className="px-6 py-6">
                        <div className="flex flex-row gap-3">
                            <button
                                onClick={() => handleSelection('payment_out')}
                                className="flex-1 group relative flex flex-row items-center gap-3 px-4 py-3 bg-white border-2 border-yellow-400 rounded-[12px] hover:border-red-500 hover:bg-red-50/30 transition-all duration-300"
                            >
                                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm flex-shrink-0">
                                    <TrendingDown size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-base font-bold text-gray-800 group-hover:text-red-600 leading-tight"><span>Money Out</span></span>
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5"><span>Payment Given</span></span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelection('payment_in')}
                                className="flex-1 group relative flex flex-row items-center gap-3 px-4 py-3 bg-white border-2 border-yellow-400 rounded-[12px] hover:border-[#129046] hover:bg-green-50/30 transition-all duration-300"
                            >
                                <div className="w-10 h-10 bg-green-100 text-[#129046] rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:bg-[#129046] group-hover:text-white transition-all shadow-sm flex-shrink-0">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-base font-bold text-gray-800 group-hover:text-[#129046] leading-tight"><span>Money In</span></span>
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5"><span>Payment Received</span></span>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Step 2: Form */
                    <form onSubmit={handleSave} className="bg-white">
                        <div className="px-6 py-4 space-y-4">
                            {/* Amount Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <TrendingUp size={10} className={formData.type === 'payment_in' ? "text-[#129046]" : "text-red-600"} /> Amount <span className="text-red-500">*</span>
                                </label>
                                <div className="relative h-12 w-full bg-gray-50/50 border-2 border-gray-300 rounded-xl focus-within:border-[#129046] focus-within:bg-white transition-all">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">{getCurrencySymbol(currency)}</span>
                                    <input
                                        required
                                        type="number"
                                        name="amount"
                                        placeholder="0.00"
                                        min="1"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        onWheel={(e) => e.target.blur()}
                                        className="w-full h-full pl-8 pr-4 border-none focus:ring-0 focus:outline-none font-bold text-lg text-gray-700 bg-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Screenshot Upload Box */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Camera size={10} className="text-[#129046]" /> Screenshot <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*, .pdf, .doc, .docx, .xls, .xlsx, .csv, .txt"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="screenshot-upload"
                                        />
                                        <label
                                            htmlFor="screenshot-upload"
                                            className="flex flex-col items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#129046] hover:bg-green-50/30 transition-all cursor-pointer group overflow-hidden px-2"
                                        >
                                            {formData.screenshotPreview ? (
                                                <div className="flex items-center justify-center gap-2 w-full max-w-full min-w-0 overflow-hidden">
                                                    <Camera size={14} className="text-[#129046] flex-shrink-0" />
                                                    <p className="text-[11px] font-bold text-gray-800 truncate max-w-full">
                                                        {formData.screenshot ? formData.screenshot.name : formData.screenshotPreview.split('/').pop()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 w-full max-w-full min-w-0 overflow-hidden">
                                                    <Upload size={14} className="text-gray-400 group-hover:text-[#129046] flex-shrink-0" />
                                                    <p className="text-[11px] font-bold text-gray-500 group-hover:text-[#129046] truncate max-w-full"><span>Upload Attachment</span></p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Date Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <CalendarIcon size={10} className="text-[#129046]" /> Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full h-12 px-3 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-sm text-gray-700"
                                    />
                                </div>
                            </div>

                            {/* Description Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FileText size={10} className="text-[#129046]" /> Description / Remarks <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Add any specific details..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full h-12 px-4 py-2 bg-gray-50/50 border-2 border-gray-300 rounded-xl focus:border-[#129046] focus:bg-white focus:outline-none transition-all font-semibold text-sm text-gray-700 resize-none leading-tight"
                                ></textarea>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="px-6 py-2 bg-gray-50/50 border-t border-gray-100 flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 h-9 text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.95]"
                            >
                                <span>Cancel</span>
                            </button>
                            <button
                                type="submit"
                                className="px-6 h-9 text-[10px] font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:shadow-md hover:shadow-green-100 rounded-xl transition-all active:scale-[0.95]"
                            >
                                <span>{editData ? 'Update Entry' : 'Save Entry'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
