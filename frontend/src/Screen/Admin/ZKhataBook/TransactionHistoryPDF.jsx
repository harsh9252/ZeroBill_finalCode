import React, { useMemo } from 'react';
import { formatCurrency } from '../../../utils/currency';

export default function TransactionHistoryPDF({ party, transactions, businessInfo, currency, language = 'en-IN' }) {
    
    // Sort transactions by date and calculate running balance
    const { sortedTransactions, totalIn, totalOut, netBalance } = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));
        
        let running = 0;
        const processed = sorted.map(t => {
            const amt = Number(t.amount || 0);
            if (t.type === 'payment_in') running += amt;
            else running -= amt;
            return { ...t, runningBalance: running };
        });

        const tin = processed.filter(t => t.type === 'payment_in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const tout = processed.filter(t => t.type === 'payment_out').reduce((sum, t) => sum + Number(t.amount || 0), 0);
        
        return { sortedTransactions: processed, totalIn: tin, totalOut: tout, netBalance: tin - tout };
    }, [transactions]);

    const formatDateStr = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatCurrencyDisplay = (v) => formatCurrency(v, currency);

    return (
        <div className="pdf-page bg-white p-6 w-[794px] font-sans text-gray-900 border-t-4 border-[#129046]" style={{ minHeight: '1122px' }}>
            
            {/* Header: Compact Business & Party Info */}
            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                <div className="w-[60%]">
                    <h1 className="text-lg font-black text-[#129046] uppercase leading-tight mb-1">
                        {businessInfo?.business_name || 'MY BUSINESS'}
                    </h1>
                    <div className="text-[9px] text-gray-600 leading-tight">
                        <p className="font-bold inline mr-3">{businessInfo?.email || ''}</p>
                        <p className="inline">Phone: {businessInfo?.phone_number || ''}</p>
                        {businessInfo?.address && <p className="mt-0.5 truncate">{businessInfo.address}</p>}
                    </div>
                </div>
                
                <div className="text-right w-[40%]">
                    <h2 className="text-xl font-thin text-gray-400 uppercase tracking-widest leading-none mb-1">Statement</h2>
                    <div className="text-[9px] text-gray-700 space-y-0.5">
                        <p><span className="font-bold text-gray-400 uppercase">Party:</span> {party?.party_name}</p>
                        <p><span className="font-bold text-gray-400 uppercase">A/C:</span> {party?.entry_number || `#${party?.id}`}</p>
                        <p><span className="font-bold text-gray-400 uppercase">Date:</span> {formatDateStr(new Date())}</p>
                    </div>
                </div>
            </div>

            {/* Compact Summary Strip */}
            <div className="bg-[#f0f9f4] border-x border-[#d1e7dd] px-4 py-2 flex justify-between items-center mb-4 border-t-2 border-b-2 border-b-[#d1e7dd] border-t-[#d1e7dd]">
                <div className="text-center px-4 border-r border-gray-200">
                    <span className="text-[8px] font-bold text-gray-500 uppercase block mb-0.5 leading-none">Total In</span>
                    <span className="text-[12px] font-black text-[#129046] leading-none">{formatCurrencyDisplay(totalIn)}</span>
                </div>
                <div className="text-center px-4 border-r border-gray-200">
                    <span className="text-[8px] font-bold text-gray-500 uppercase block mb-0.5 leading-none">Total Out</span>
                    <span className="text-[12px] font-black text-red-600 leading-none">{formatCurrencyDisplay(totalOut)}</span>
                </div>
                <div className="text-center px-4">
                    <span className="text-[8px] font-bold text-gray-500 uppercase block mb-0.5 leading-none">Net Balance</span>
                    <span className={`text-[12px] font-black leading-none ${netBalance >= 0 ? 'text-[#129046]' : 'text-red-900'}`}>
                        {formatCurrencyDisplay(Math.abs(netBalance))} {netBalance >= 0 ? '(Cr)' : '(Dr)'}
                    </span>
                </div>
            </div>

            {/* Ledger Table: Minimal Heights & Fonts */}
            <div className="overflow-hidden border border-gray-100 rounded">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#129046] text-white">
                        <tr>
                            <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider w-[12%]">Date</th>
                            <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider w-[40%]">Details</th>
                            <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-right w-[16%]">Debit (-)</th>
                            <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-right w-[16%]">Credit (+)</th>
                            <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-right w-[16%] bg-[#0d7d3c]">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-3 py-6 text-center text-gray-400 text-[9px] italic">No transaction data available.</td>
                            </tr>
                        ) : (
                            sortedTransactions.map((t, idx) => (
                                <tr key={t.id || idx} className={`border-b border-gray-50 leading-none ${idx % 2 === 1 ? 'bg-gray-50/20' : ''}`}>
                                    <td className="px-3 py-1.5 text-[8px] text-gray-500 whitespace-nowrap">{formatDateStr(t.date || t.created_at)}</td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-1">
                                            {t.is_opening_balance && <div className="w-0.5 h-2.5 bg-[#129046]"></div>}
                                            <span className={`text-[10px] truncate max-w-[280px] ${t.is_opening_balance ? 'font-black' : 'text-gray-700 font-medium'}`}>
                                                {t.description || (t.is_opening_balance ? 'Opening Balance' : 'Payment')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-[10px] text-right text-red-600 font-bold">
                                        {t.type === 'payment_out' ? formatCurrencyDisplay(Number(t.amount)) : '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-[10px] text-right text-[#129046] font-bold">
                                        {t.type === 'payment_in' ? formatCurrencyDisplay(Number(t.amount)) : '-'}
                                    </td>
                                    <td className={`px-3 py-1.5 text-[10px] text-right font-black ${t.runningBalance >= 0 ? 'text-gray-900 border-l border-gray-50' : 'text-red-900 bg-red-50/10'}`}>
                                        {formatCurrencyDisplay(Math.abs(t.runningBalance))}
                                        <span className="text-[7px] ml-0.5 opacity-50">{t.runningBalance >= 0 ? 'Cr' : 'Dr'}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary Strip */}
            <div className="mt-3 flex justify-end gap-6 px-3 py-1 bg-gray-50 rounded border border-gray-100">
                <div className="text-right">
                    <span className="text-[8px] font-bold text-gray-400 uppercase mr-2 tracking-tighter">Total Credit Pool (In):</span>
                    <span className="text-[10px] font-black text-[#129046]">{formatCurrencyDisplay(totalIn)}</span>
                </div>
                <div className="text-right">
                    <span className="text-[8px] font-bold text-gray-400 uppercase mr-2 tracking-tighter">Total Debit Pool (Out):</span>
                    <span className="text-[10px] font-black text-red-600">{formatCurrencyDisplay(totalOut)}</span>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="mt-auto pt-6 flex justify-between items-center text-[7px] text-gray-400 uppercase tracking-widest px-2">
                <span>Z Khata Statement &bull; Paperless Accounting</span>
                <span>Generated: {new Date().toLocaleString(language)}</span>
            </div>
        </div>
    );
}



