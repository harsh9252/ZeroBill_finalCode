import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, FileText, ChevronDown, IndianRupee, ShieldCheck } from 'lucide-react';
import { formatCurrency, getCurrencySymbol, convertFromINR } from '../../../utils/currency';

export default function AddLedgerEntryModel({ isOpen, onClose, onSave, parties = [], selectedParty = null, editData = null, currency }) {
    const [formData, setFormData] = useState({
        party_id: '',
        date: new Date().toISOString().split('T')[0],
        voucher_type: '',
        voucher_number: '',
        reference_no: '',
        notes: '',
        base_amount: '',
        gst_percent: '0',
        custom_voucher_type: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editData) {
                const predefinedTypes = ["Tax Invoice", "Book Invoice", "Dr Note", "Cr Note", "Payment In", "Payment Out", "Sales Return"];
                const isCustomType = editData.type && !predefinedTypes.includes(editData.type);

                setFormData({
                    party_id: editData.party_id || selectedParty?.id || '',
                    date: editData.date ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    voucher_type: isCustomType ? 'Add Other' : (editData.type || ''),
                    custom_voucher_type: isCustomType ? editData.type : '',
                    voucher_number: editData.number || '',
                    reference_no: editData.reference_no || '',
                    notes: editData.notes || '',
                    base_amount: convertFromINR(editData.base_amount || editData.debit || editData.credit || 0, currency).toFixed(2),
                    gst_percent: editData.gst_percent || '0'
                });
            } else {
                setFormData({
                    party_id: selectedParty?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    voucher_type: '',
                    voucher_number: '',
                    reference_no: '',
                    notes: '',
                    base_amount: '',
                    gst_percent: '0',
                    custom_voucher_type: ''
                });
            }
        }
    }, [isOpen, selectedParty, editData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Calculate total amount based on GST
        const base = parseFloat(formData.base_amount || 0);
        const gst = parseFloat(formData.gst_percent || 0);
        const total = base + (base * gst / 100);

        const finalVoucherType = formData.voucher_type === 'Add Other'
            ? formData.custom_voucher_type
            : formData.voucher_type;

        onSave({
            ...formData,
            voucher_type: finalVoucherType,
            amount: total
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">New Transaction Entry</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all border border-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    {/* Party Name */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            Party Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                required
                                name="party_id"
                                value={formData.party_id}
                                onChange={handleChange}
                                className="w-full h-10 pl-4 pr-10 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="" disabled>— Select Party —</option>
                                {parties.map(p => (
                                    <option key={p.id} value={p.id}>{p.party_name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                Date <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full h-10 px-4 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Voucher Type */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                Voucher Type <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    name="voucher_type"
                                    value={formData.voucher_type}
                                    onChange={handleChange}
                                    className="w-full h-10 pl-4 pr-10 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>— Select —</option>
                                    <option value="Tax Invoice">Tax Invoice</option>
                                    <option value="Book Invoice">Book Invoice</option>
                                    <option value="Dr Note">Dr Note</option>
                                    <option value="Cr Note">Cr Note</option>
                                    <option value="Payment In">Payment In</option>
                                    <option value="Payment Out">Payment Out</option>
                                    <option value="Sales Return">Sales Return</option>
                                    <option value="Add Other">Add Other</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>

                    {formData.voucher_type === 'Add Other' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                                Custom Voucher Type <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                name="custom_voucher_type"
                                placeholder="Enter custom voucher type..."
                                value={formData.custom_voucher_type}
                                onChange={handleChange}
                                className="w-full h-10 px-4 bg-emerald-50/30 border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700 shadow-sm shadow-emerald-100/50"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {/* Voucher Number */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Voucher Number
                            </label>
                            <input
                                type="text"
                                name="voucher_number"
                                placeholder="e.g. INV-002"
                                value={formData.voucher_number}
                                onChange={handleChange}
                                className="w-full h-10 px-4 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                            />
                        </div>

                        {/* Reference No */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Reference No.
                            </label>
                            <input
                                type="text"
                                name="reference_no"
                                placeholder="Optional"
                                value={formData.reference_no}
                                onChange={handleChange}
                                className="w-full h-10 px-4 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Notes / Particulars
                        </label>
                        <textarea
                            name="notes"
                            placeholder="e.g. Goods delivered, 10 boxes of fabric..."
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700 resize-none leading-tight"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Base Amount */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Base Amount ({getCurrencySymbol(currency)}) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{getCurrencySymbol(currency)}</span>
                                <input
                                    required
                                    type="number"
                                    name="base_amount"
                                    placeholder="0"
                                    value={formData.base_amount}
                                    onChange={handleChange}
                                    className="w-full h-10 pl-8 pr-4 bg-slate-50/50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-700 text-lg"
                                />
                            </div>
                        </div>

                        {/* GST % */}

                    </div>

                    {/* Footer */}
                    <div className="pt-1 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 h-10 text-[13px] font-bold text-slate-600 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{ backgroundColor: '#279948' }}
                            className="px-8 h-10 text-[13px] font-bold text-white hover:brightness-110 rounded-xl transition-all shadow-lg shadow-[#279948]/20 active:scale-95 flex items-center gap-2"
                        >
                            Save Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
