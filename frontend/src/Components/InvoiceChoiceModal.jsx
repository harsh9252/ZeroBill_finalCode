import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Plus, FileText, ArrowLeft, ShoppingCart,
  ArrowRight, Search, Package
} from 'lucide-react';
import { FaFileInvoice } from 'react-icons/fa';
import api from '../utils/api';
import { formatDate } from '../utils/dateFormat';
import { formatCurrency } from '../utils/currency';
import { showErrorToast } from './ActionMessageModel';

const InvoiceChoiceModal = ({ isOpen, onClose, onContinue, currency, isBook = false }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState('choice'); // 'choice' | 'po_select' | 'po_details'
  const [selectedType, setSelectedType] = useState('normal'); // 'normal' | 'po'
  const [poList, setPoList] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [items, setItems] = useState([]);
  const selectedBusinessId = localStorage.getItem('selectedBusinessId');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('choice');
      setSelectedType('normal');
      setSelectedPO(null);
      setItems([]);
    }
  }, [isOpen]);

  // Fetch POs when entering po_select step
  useEffect(() => {
    if (step === 'po_select' && poList.length === 0) {
      const fetchPOs = async () => {
        setLoadingPOs(true);
        try {
          const { bookPurchaseOrderAPI, purchaseOrderAPI } = api;
          const response = isBook
            ? await bookPurchaseOrderAPI.getAll(selectedBusinessId)
            : await purchaseOrderAPI.getAll(selectedBusinessId);
          if (response.success) {
            setPoList(response.data.filter(po => po.status !== 'closed'));
          }
        } catch (err) {
          console.error('Error fetching POs:', err);
          showErrorToast('Failed to fetch Purchase Orders');
        } finally {
          setLoadingPOs(false);
        }
      };
      fetchPOs();
    }
  }, [step, poList.length, selectedBusinessId, isBook]);

  const handlePOSelect = (po) => {
    let lines = [];
    try {
      const meta = (po.purchase_order_data && typeof po.purchase_order_data === 'object')
        ? po.purchase_order_data
        : (po.book_purchase_order_data && typeof po.book_purchase_order_data === 'object')
          ? po.book_purchase_order_data
          : typeof po.purchase_invoice_data === 'string'
            ? JSON.parse(po.purchase_invoice_data)
            : (po.purchase_invoice_data || po.invoice_data || po.purchase_order_data || po.order_data || po.book_purchase_order_data || {});

      lines = meta.lines || [];
    } catch (e) {
      console.error('Failed to parse PO lines', e);
    }

    const initialItems = lines.map((line) => {
      const total = line.qty || line.quantity || 0;
      const booked = line.bookedQty || 0;
      const remaining = Math.max(0, total - booked);
      return {
        ...line,
        remainingQty: remaining,
        orderQty: remaining > 0 ? remaining : 0,
        error: ''
      };
    });

    setSelectedPO(po);
    setItems(initialItems);
    setStep('po_details');
  };

  const handleQtyChange = (index, val) => {
    setItems(prev => {
      const newItems = [...prev];
      const newQty = parseFloat(val);
      newItems[index].orderQty = val;
      if (isNaN(newQty) || newQty < 0) {
        newItems[index].error = 'Invalid';
      } else if (newQty > newItems[index].remainingQty) {
        newItems[index].error = `Max ${newItems[index].remainingQty}`;
      } else {
        newItems[index].error = '';
      }
      return newItems;
    });
  };

  const handleConfirmPOItems = () => {
    // Allow generating invoice even if quantities are 0.
    // We pass all items to the invoice form.
    const selectedItems = items;

    if (items.some(i => i.error)) {
      showErrorToast('Please fix quantity errors');
      return;
    }

    onContinue({
      type: 'po',
      poData: selectedPO,
      selectedItems: selectedItems
    });
  };

  if (!isOpen) return null;

  const modalWidth = step === 'po_details' ? 'max-w-5xl' : step === 'po_select' ? 'max-w-5xl' : 'max-w-2xl';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${modalWidth} overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 transition-all duration-300`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#129046] to-[#1aad56] px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="text-lg font-bold text-white truncate">
                <span>{step === 'po_details'
                  ? (isBook ? "Book Purchase Invoice" : "Book Sales Invoice")
                  : (isBook ? "Create New Purchase Invoice" : "Create New Tax Invoice")}</span>
              </h2>
              {step === 'po_details' && selectedPO && (
                <div className="flex flex-col">
                  <p className="text-[10px] text-white/90 font-bold tracking-tight uppercase truncate">
                    PO: {selectedPO.purchase_order_number || selectedPO.book_purchase_order_number || selectedPO.id} | {isBook ? "Supplier" : "Party"}: {selectedPO.party_name || selectedPO.partyName}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3.5 flex-shrink-0">
            {isBook && step === 'choice' && (
              <button
                onClick={() => {
                  onClose();
                  navigate('/bookInvoice');
                }}
                className="px-3 py-1 bg-white text-[#129046] hover:bg-white/95 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-transparent hover:scale-[1.02]"
              >
                <FaFileInvoice className="text-xs" />
                <span>View Book Invoice</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {step === 'choice' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Select Invoice Type</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSelectedType('normal')}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all text-left ${selectedType === 'normal' ? "border-[#129046] bg-green-50/50" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${selectedType === 'normal' ? "border-[#129046]" : "border-gray-300"}`}>
                    {selectedType === 'normal' && <div className="w-3 h-3 bg-[#129046] rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FaFileInvoice className={`text-xl ${selectedType === 'normal' ? "text-[#129046]" : "text-gray-400"}`} />
                      <h3 className="font-bold text-gray-900"><span>{isBook ? "Purchase Invoice" : "Tax Invoice"}</span></h3>
                    </div>
                    <p className="text-sm text-gray-500 ml-7"><span>Create a standard invoice from scratch</span></p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedType('po')}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all text-left ${selectedType === 'po' ? "border-[#129046] bg-green-50/50" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${selectedType === 'po' ? "border-[#129046]" : "border-gray-300"}`}>
                    {selectedType === 'po' && <div className="w-3 h-3 bg-[#129046] rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className={`w-5 h-5 ${selectedType === 'po' ? "text-blue-600" : "text-gray-400"}`} />
                      <h3 className="font-bold text-gray-900"><span>Against PO Order</span></h3>
                    </div>
                    <p className="text-sm text-gray-500 ml-7"><span>Create invoice using an existing PO</span></p>
                  </div>
                </button>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => {
                    if (selectedType === 'normal') {
                      onContinue({ type: 'normal' });
                    } else {
                      setStep('po_select');
                    }
                  }}
                  className="w-full bg-[#129046] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#129046]/90 transition-all shadow-lg shadow-green-100"
                >
                  <span>Continue</span> <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 'po_select' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep('choice')} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest italic flex items-center gap-2">
                    <ShoppingCart size={16} className="text-blue-600" />
                    Step 2: Select {isBook ? "Book Purchase Order" : "Purchase Order"}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {poList.length} Orders Available
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden italic">
                <div className="flex items-center text-white font-bold uppercase tracking-wider text-[10px]" style={{ backgroundColor: '#129046' }}>
                  <div className="px-4 py-2" style={{ width: '25%' }}>PO NO</div>
                  <div className="px-4 py-2" style={{ width: '40%' }}>PARTY NAME</div>
                  <div className="px-4 py-2 text-center" style={{ width: '15%' }}>DATE</div>
                  <div className="px-4 py-2 text-right" style={{ width: '20%' }}>TOTAL AMOUNT</div>
                </div>

                <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white">
                  {loadingPOs ? (
                    <div className="py-20 text-center text-gray-400 font-medium">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        Loading Purchase Orders...
                      </div>
                    </div>
                  ) : poList.length > 0 ? poList.map(po => (
                    <div
                      key={po.id}
                      onClick={() => handlePOSelect(po)}
                      className="flex items-center divide-x divide-gray-100 border-b border-gray-100 group hover:bg-green-50/50 cursor-pointer transition-all duration-200 text-sm"
                    >
                      <div className="px-4 py-2 flex items-center gap-2" style={{ width: '25%' }}>
                        <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                          <FileText size={12} className="text-blue-600" />
                        </div>
                        <span className="font-bold text-gray-900 group-hover:text-[#129046] transition-colors uppercase tracking-tight truncate text-xs">
                          {po.purchase_order_number || po.book_purchase_order_number || po.purchase_invoice_number || po.invoice_number || po.id}
                        </span>
                      </div>
                      <div className="px-4 py-2" style={{ width: '40%' }}>
                        <div className="font-bold text-gray-700 leading-tight uppercase group-hover:text-gray-900 truncate text-xs">{po.party_name || po.partyName}</div>
                      </div>
                      <div className="px-4 py-2 text-center font-medium text-gray-400 text-[10px]" style={{ width: '15%' }}>
                        {formatDate(po.order_date || po.invoice_date || po.date)}
                      </div>
                      <div className="px-4 py-2 text-right" style={{ width: '20%' }}>
                        <div translate="no" className="text-[12px] font-bold text-gray-900 group-hover:text-[#129046] transition-colors">
                          <span>{formatCurrency(po.grand_total, currency)}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart size={40} className="text-gray-200" />
                        <p className="text-gray-400 font-medium italic">No open Purchase Orders found.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'po_details' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep('po_select')} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">STEP 3: SPECIFY QUANTITIES</span>
                </div>
                <div className="text-[10px] font-bold text-[#129046] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                  Ref: {selectedPO?.purchase_order_number || selectedPO?.book_purchase_order_number || selectedPO?.id}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: '#1e293b', color: 'white' }} className="sticky top-0 z-10">
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white' }}>Product</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white' }}>Rate</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white' }}>Total Qty</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white' }}>Raised </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white' }}>Remaining</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'semibold', fontSize: '10px', textTransform: 'uppercase', color: 'white', backgroundColor: '#065f46' }}>Raised Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => {
                        const totalQty = (item.remainingQty || 0) + (item.bookedQty || 0);
                        return (
                          <tr key={idx} className={`group hover:bg-gray-50/50 transition-colors ${item.remainingQty === 0 ? "bg-gray-50 opacity-60" : ""}`}>
                            <td className="px-4 py-2.5 min-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 text-blue-600 flex-shrink-0">
                                  <Package size={16} />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 group-hover:text-[#129046] transition-colors leading-tight"><span>{item.description || item.name}</span></div>
                                  <div className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">
                                    <span translate="no"><span>{item.product_code || item.code || 'PRO-DEFAULT'}</span></span>
                                    {/*  | <span className="text-blue-500">HSN: <span translate="no"><span>{item.hsn_code || 'N/A'}</span></span></span> */}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                              <span translate="no"><span>{formatCurrency(item.price, currency)}</span></span>
                              <span className="text-[9px] text-gray-400 block font-normal">/<span>{item.unit || 'PCS'}</span></span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-100">
                                <span>{totalQty}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                <span>{item.bookedQty || 0}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                <span>{item.remainingQty}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 bg-green-50/20 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  value={item.orderQty}
                                  onChange={(e) => handleQtyChange(idx, e.target.value)}
                                  onWheel={(e) => e.target.blur()}
                                  disabled={item.remainingQty === 0}
                                  className={`w-20 h-8 px-2 text-center border-2 rounded-lg font-bold outline-none transition-all shadow-sm ${item.error ? "border-rose-500 bg-rose-50 text-rose-600 focus:ring-rose-200" : "border-gray-200 focus:border-[#129046] focus:ring-4 focus:ring-green-100 text-gray-900 bg-white"}`}
                                />
                                {item.error && <span className="text-[8px] font-bold text-rose-500 uppercase animate-pulse"><span>{item.error}</span></span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-blue-100 text-blue-600 flex-shrink-0 shadow-sm">
                  <Search size={16} />
                </div>
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  A new <span className="font-bold">{isBook ? "Purchase Invoice" : "Sales Invoice"}</span> will be created with the selected quantities. PO reference will be auto-linked.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs font-semibold text-gray-500">
                  <span className="text-[#129046]"><span>{items.length}</span></span> item(s) will be added to the invoice
                </div>
                <div className="flex gap-2.5">
                  <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200">
                    Cancel
                  </button>
                  <button onClick={handleConfirmPOItems} className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#129046] to-[#1aad56] rounded-xl shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5">
                    <FaFileInvoice size={14} /> <span>Generate Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceChoiceModal;
