import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronRight, Info, FileText } from 'lucide-react';

const ConvertQuotationModal = ({
  isOpen,
  onClose,
  onConvert,
  quotations = [], // source documents array
  type = 'proforma',
  sourceLabel = 'Quotation' // Default to Quotation for backward compatibility
}) => {
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen && quotations && quotations.length > 0) {
      const allItems = [];
      quotations.forEach(q => {
        if (q.meta && q.meta.lines) {
          q.meta.lines.forEach(line => {
            allItems.push({
              ...line,
              _uniqueKey: `${q.dbId || q.id}-${line.id}`, // Add unique key for flat list management
              parentQuotationId: q.id,
              parentQuotationDbId: q.dbId || q.id,
              convertQty: line.qty || ""
            });
          });
        }
      });
      setItems(allItems);
    }
    return () => setMounted(false);
  }, [isOpen, quotations]);

  // Ensure quotations is always an array for single select compatibility
  const normalizedQuotations = Array.isArray(quotations) ? quotations : (quotations ? [quotations] : []);

  if (!isOpen || !mounted || normalizedQuotations.length === 0) return null;

  const handleQtyChange = (uniqueKey, val) => {
    setItems(prev => prev.map(item => {
      if (item._uniqueKey === uniqueKey) {
        const qty = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
        return { ...item, convertQty: qty };
      }
      return item;
    }));
  };

  const handleConvert = () => {
    // Group selected items back by their parent document
    const conversionData = normalizedQuotations.map(q => {
      const qItems = items
        .filter(item => item.parentQuotationDbId === (q.dbId || q.id) && Number(item.convertQty) > 0)
        .map(item => ({ id: item.id, qty: Number(item.convertQty) }));
      
      return { 
        id: q.dbId || q.id, 
        items: qItems 
      };
    }).filter(batch => batch.items.length > 0);

    if (conversionData.length === 0) {
      alert("Please select at least one item with quantity > 0");
      return;
    }

    onConvert(type, conversionData);
    onClose();
  };

  const typeLabel = type === 'sales' ? 'Sales Invoice' : 'Proforma Invoice';

  // Group items by quotation for display
  const groupedItems = normalizedQuotations.reduce((acc, q) => {
    const qItems = items.filter(i => i.parentQuotationDbId === (q.dbId || q.id));
    if (qItems.length > 0) {
      acc.push({
        quotationId: q.id,
        items: qItems
      });
    }
    return acc;
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 transition-opacity">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden relative text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
               <ChevronRight size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                <span>Convert </span>
                <span>{normalizedQuotations.length > 1 ? `Multiple ${sourceLabel}s` : sourceLabel}</span>
                <span> to </span>
                <span>{typeLabel}</span>
              </h3>
              <p className="text-xs text-gray-500">
                {normalizedQuotations.length > 1 
                  ? <span>{normalizedQuotations.length} {sourceLabel.toLowerCase()}s selected</span> 
                  : <span>{sourceLabel} ID: {normalizedQuotations[0].id}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-4 flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <Info size={18} className="text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700">
              <span>Adjust quantities for each item across all selected {sourceLabel.toLowerCase()}s. Separate {typeLabel.toLowerCase()}s will be generated for each {sourceLabel.toLowerCase()}.</span>
            </p>
          </div>

          <div className="space-y-6">
            {groupedItems.map((group) => (
              <div key={group.quotationId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700"><span>{sourceLabel}</span> <span>{group.quotationId}</span></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3"><span>Item Details</span></th>
                        <th className="px-4 py-3 text-center"><span>Available</span></th>
                        <th className="px-4 py-3 text-center w-32"><span>Convert Qty</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.items.map((item) => (
                        <tr key={item._uniqueKey} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900"><span>{item.description}</span></div>
                            <div className="text-xs text-gray-500"><span>{item.code}</span></div>
                          </td>
                          <td className="px-4 py-4 text-center text-gray-700 font-medium">
                            <span>{item.qty}</span> <span>{item.unit}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.convertQty}
                              onChange={(e) => handleQtyChange(item._uniqueKey, e.target.value)}
                              className="w-full px-3 py-1.5 text-center bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
             <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span>Cancel</span>
            </button>
            <button
              onClick={handleConvert}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
            >
              <span>Confirm All Conversions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ConvertQuotationModal;
