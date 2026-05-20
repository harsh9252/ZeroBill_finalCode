import React, { useMemo, useState, useEffect } from 'react';
import { convertFileToImage } from '../../../utils/fileConverter';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { ChevronDown, FileText, Plus, Edit2, Trash2, ArrowLeft, Download, Search, ClipboardList, X, Check } from 'lucide-react';
import TemplateSidebar from "../../../Components/TemplateSidebar.jsx";
import { FaFileInvoice } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate } from '../../../utils/dateFormat.js';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import QuotationForm from '../Quotation/QuotationForm.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import MainLoader from '../../../Components/MainLoader.jsx';
import { formatCurrency, getCurrencySymbol, convertFromINR, convertToINR } from '../../../utils/currency';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showConfirmationDialog, showInfoToast } from '../../../Components/ActionMessageModel.jsx';
import api from '../../../utils/api';
import PDFFormatWrapper from '../../../Components/PDFFormat/PDFFormatWrapper.jsx';
import { DOCUMENT_TYPES } from '../../../Components/PDFFormat/documentTypeConfig.js';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF.js';
import CustomPreviewDropdown from '../../../Components/CustomPreviewDropdown.jsx';
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";
import { mapToPurchaseOrderData } from "../../../utils/documentMapper";

const { purchaseOrderAPI, businessAPI, termsConditionsAPI, getApiConfig, partyAPI, getUserData } = api;







// -------------------------------------------------------------
// Book Invoice Modal Component — Advanced Multi-Invoice Version
// -------------------------------------------------------------
function BookInvoiceModal({ open, poData, onClose, onSuccess, currency }) {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [previewFile, setPreviewFile] = useState(null); // { url, type, name }
  const [editingHistory, setEditingHistory] = useState(null); // { itemIdx, histIdx }
  const [localRefresh, setLocalRefresh] = useState(0);

  const displayTaxType = useMemo(() => {
    let tType = 'VAT';
    if (poData?.tax_type) tType = poData.tax_type;
    else if (poData?.meta?.tax_type) tType = poData.meta.tax_type;
    else if (poData?.order_data?.tax_type) tType = poData.order_data.tax_type;
    else {
      try {
        const parsedMeta = typeof poData?.meta === 'string' ? JSON.parse(poData.meta) : (poData?.meta || poData?.order_data || {});
        if (parsedMeta.tax_type) tType = parsedMeta.tax_type;
        else if (parsedMeta.lines && parsedMeta.lines.length > 0 && parsedMeta.lines[0].taxType) {
          tType = parsedMeta.lines[0].taxType;
        }
      } catch (e) { }
    }
    tType = (tType || 'VAT').toLowerCase();
    if (tType === 'igst') return 'IGST (%)';
    if (tType === 'cgst_sgst' || tType === 'gst') return 'SPLIT_GST';
    return 'VAT (%)';
  }, [poData]);

  useEffect(() => {
    const fetchHistoryAndInit = async () => {
      if (open && poData) {
        setIsHistoryLoading(true);
        let previousInvoices = [];
        
        let parsedMeta = {};
        try {
          parsedMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
        } catch (e) {
          console.error('Failed to parse PO metadata', e);
        }
        
        if (parsedMeta.bookedInvoices) {
          previousInvoices = parsedMeta.bookedInvoices;
          setHistory(previousInvoices);
          setIsHistoryLoading(false);
        } else {
          try {
            const bizId = localStorage.getItem('selectedBusinessId');
            const response = await api.bookInvoiceAPI.getByPoReference(poData.id, bizId);
            if (response?.success) {
              previousInvoices = response.data || [];
              setHistory(previousInvoices);
              
              // Migrate/Save this history to PO's own independent meta
              const updatedMeta = { ...parsedMeta, bookedInvoices: previousInvoices };
              const orderPayload = {
                ...poData,
                order_date: poData.order_date ? new Date(poData.order_date).toISOString().split('T')[0] : poData.order_date,
                updated_date: poData.updated_date ? new Date(poData.updated_date).toISOString().split('T')[0] : poData.updated_date,
                order_data: updatedMeta
              };
              await purchaseOrderAPI.update(poData.dbId, orderPayload, bizId);
            }
          } catch (err) {
            console.error('Error migrating book invoice history:', err);
          } finally {
            setIsHistoryLoading(false);
          }
        }

        let lines = [];
        try {
          const parsedMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
          lines = parsedMeta.lines || [];
        } catch (e) {
          console.error('Failed to parse PO lines for Booking modal', e);
        }

        // Calculate booked quantities from actual history
        const historyBookedLookup = {}; // key: index or code_description
        previousInvoices.forEach(inv => {
          const invLines = inv.book_invoice_data?.lines || [];
          invLines.forEach(l => {
            const key = l.originalIndex !== undefined ? l.originalIndex : `${l.code}_${l.description}`;
            // Sum all received quantities from all supplier invoices for this historical line item
            const historicalLineQty = (l.supplierInvoices || []).reduce((sum, si) => sum + (parseFloat(si.receivedQty) || 0), 0);
            historyBookedLookup[key] = (historyBookedLookup[key] || 0) + historicalLineQty;
          });
        });

        const initialItems = lines.map((line, idx) => {
          const total = line.qty || 0;
          const key = `${line.code}_${line.description}`;
          const booked = historyBookedLookup[idx] !== undefined ? historyBookedLookup[idx] : (historyBookedLookup[key] || 0);
          const remaining = Math.max(0, total - booked);

          // Get specific historical supplier invoices for this item
          const itemHistory = [];
          previousInvoices.forEach(inv => {
            const invLines = inv.book_invoice_data?.lines || [];
            invLines.forEach(l => {
              const lKey = l.originalIndex !== undefined ? l.originalIndex : `${l.code}_${l.description}`;
              const matchKey = (l.originalIndex !== undefined && l.originalIndex === idx) || (l.originalIndex === undefined && lKey === key);
              if (matchKey) {
                (l.supplierInvoices || []).forEach(si => {
                  if (parseFloat(si.receivedQty) > 0 || (si.invoiceNo && si.invoiceNo.trim())) {
                    // Helper to get total tax percentage from any object
                    const calculateTax = (obj) => {
                      if (obj.taxPct !== undefined && obj.taxPct !== null) return parseFloat(obj.taxPct);
                      const tType = (obj.taxType || obj.tax_type || 'none').toLowerCase();
                      if (tType === 'igst') return parseFloat(obj.igstPct || obj.igst_pct || 0);
                      if (tType === 'vat') return parseFloat(obj.vatPct || obj.vat_pct || 0);
                      if (tType === 'gst' || tType === 'cgst_sgst') return parseFloat(obj.cgstPct || obj.cgst_pct || 0) + parseFloat(obj.sgstPct || obj.sgst_pct || 0);
                      return parseFloat(obj.vatPct || obj.vat_pct || obj.igstPct || obj.igst_pct || (parseFloat(obj.cgstPct || 0) + parseFloat(obj.sgstPct || 0)) || 0);
                    };

                    itemHistory.push({
                      unit: si.unit || l.unit || line.unit || 'PCS',
                      unitPrice: si.unitPrice || l.unitPrice || line.price || 0,
                      discountPct: si.discountPct !== undefined ? si.discountPct : (l.discountPct || line.discountPct || 0),
                      taxPct: calculateTax(si) || calculateTax(l) || calculateTax(line) || 0,
                      ...si,
                      originalIndex: idx, // Add line index for identification
                      parentInvoiceNo: inv.book_invoice_number,
                      parentInvoiceId: inv.id, // Database ID for updating
                      date: inv.invoice_date
                    });
                  }
                });
              }
            });
          });

          const finalItem = {
            ...line,
            originalIndex: idx,
            totalQty: total,
            bookedQty: booked,
            remainingQty: remaining,
            historyInvoices: itemHistory,
            error: '',
          };
          finalItem.supplierInvoices = [createBlankInvoice(finalItem)];
          return finalItem;
        });

        setItems(initialItems);
        setExpandedItems(new Set(initialItems.map((_, i) => i)));
      }
    };
    fetchHistoryAndInit();
  }, [poData, localRefresh]);

  function createBlankInvoice(item) {
    const taxType = (item?.taxType || item?.tax_type || 'none').toLowerCase();
    let taxPct = 0;
    if (taxType === 'gst' || taxType === 'cgst_sgst') {
      taxPct = parseFloat(item?.cgstPct || item?.cgst_pct || 0) + parseFloat(item?.sgstPct || item?.sgst_pct || 0);
    } else if (taxType === 'igst') {
      taxPct = parseFloat(item?.igstPct || item?.igst_pct || 0);
    } else if (taxType === 'vat') {
      taxPct = parseFloat(item?.vatPct || item?.vat_pct || 0);
    }

    if (taxPct === 0) {
      taxPct = parseFloat(item?.vatPct || item?.vat_pct || item?.igstPct || item?.igst_pct || (parseFloat(item?.cgstPct || 0) + parseFloat(item?.sgstPct || 0)) || 0);
    }

    const price = parseFloat(item?.price || 0);
    const disc = parseFloat(item?.discountPct || 0);

    return {
      invoiceNo: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      receivedQty: '',
      unit: item?.unit || 'PCS',
      unitPrice: price || '',
      discountPct: disc,
      taxType: taxType,
      taxPct: taxPct,
      amount: '',
      notes: '',
      file: null,
      fileName: '',
      fileType: '',
      cgstPct: parseFloat(item?.cgstPct || 0),
      sgstPct: parseFloat(item?.sgstPct || 0),
      igstPct: parseFloat(item?.igstPct || 0),
      vatPct: parseFloat(item?.vatPct || 0),
    };
  }

  const toggleExpand = (idx) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addInvoiceRow = (itemIdx) => {
    setItems(prev => {
      const next = [...prev];
      next[itemIdx] = { ...next[itemIdx], supplierInvoices: [...next[itemIdx].supplierInvoices, createBlankInvoice(next[itemIdx])] };
      return next;
    });
  };

  const removeInvoiceRow = (itemIdx, invIdx) => {
    setItems(prev => {
      const next = [...prev];
      const invoices = [...next[itemIdx].supplierInvoices];
      invoices.splice(invIdx, 1);
      next[itemIdx] = { ...next[itemIdx], supplierInvoices: invoices.length > 0 ? invoices : [createBlankInvoice(next[itemIdx])] };
      return next;
    });
  };

  const updateInvoiceField = (itemIdx, invIdx, field, value) => {
    setItems(prev => {
      const next = [...prev];
      const invoices = [...next[itemIdx].supplierInvoices];
      invoices[invIdx] = { ...invoices[invIdx], [field]: value };
      const recalcFields = ['receivedQty', 'unitPrice', 'discountPct', 'taxPct'];
      if (recalcFields.includes(field)) {
        const qty = parseFloat(invoices[invIdx].receivedQty) || 0;
        const price = parseFloat(invoices[invIdx].unitPrice) || 0;
        const disc = parseFloat(invoices[invIdx].discountPct) || 0;
        const tax = parseFloat(invoices[invIdx].taxPct) || 0;

        // Sync taxPct to specific tax component if applicable
        if (field === 'taxPct') {
          const tType = (invoices[invIdx].taxType || '').toLowerCase();
          if (tType === 'vat') invoices[invIdx].vatPct = tax;
          else if (tType === 'igst') invoices[invIdx].igstPct = tax;
          // For GST, it's ambiguous how to split, so we just keep taxPct
        }

        const afterDisc = qty * price * (1 - disc / 100);
        const total = afterDisc * (1 + tax / 100);
        invoices[invIdx].amount = total > 0 ? total.toFixed(2) : '';
      }
      next[itemIdx] = { ...next[itemIdx], supplierInvoices: invoices };
      const totalReceived = invoices.reduce((sum, inv) => sum + (parseFloat(inv.receivedQty) || 0), 0);
      const bookedInHistory = next[itemIdx].historyInvoices.reduce((sum, h) => sum + (parseFloat(h.receivedQty) || 0), 0);
      const maxForNew = next[itemIdx].totalQty - bookedInHistory;

      if (totalReceived > maxForNew) {
        next[itemIdx].error = true;
        next[itemIdx].remainingQty = maxForNew;
        next[itemIdx].errorType = 'new';
      } else {
        next[itemIdx].error = false;
        next[itemIdx].errorType = null;
      }
      return next;
    });
  };

  const handleFileUpload = (itemIdx, invIdx, file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showErrorToast('Only PDF, JPEG, PNG, WEBP files are allowed.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setItems(prev => {
        const next = [...prev];
        const invoices = [...next[itemIdx].supplierInvoices];
        invoices[invIdx] = { ...invoices[invIdx], file: e.target.result, fileName: file.name, fileType: file.type };
        next[itemIdx] = { ...next[itemIdx], supplierInvoices: invoices };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (itemIdx, invIdx) => {
    setItems(prev => {
      const next = [...prev];
      const invoices = [...next[itemIdx].supplierInvoices];
      invoices[invIdx] = { ...invoices[invIdx], file: null, fileName: '', fileType: '' };
      next[itemIdx] = { ...next[itemIdx], supplierInvoices: invoices };
      return next;
    });
  };

  const updateHistoryField = (itemIdx, histIdx, field, value) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[itemIdx] };
      const history = [...item.historyInvoices];
      history[histIdx] = { ...history[histIdx], [field]: value };

      if (field === 'receivedQty') {
        const val = parseFloat(value) || 0;
        // Total booked except this specific history row we are editing
        const otherBooked = (item.historyInvoices.filter((_, i) => i !== histIdx).reduce((sum, inv) => sum + parseFloat(inv.receivedQty || 0), 0)) +
          (item.supplierInvoices.reduce((sum, inv) => sum + parseFloat(inv.receivedQty || 0), 0));

        const maxAllowed = item.totalQty - otherBooked;

        if (val > maxAllowed) {
          item.error = true;
          item.remainingQty = maxAllowed;
          item.errorType = `hist-${histIdx}`; // Track which row has error
        } else {
          item.error = false;
          item.errorType = null;
        }
      }

      // Recalculate amount for history if needed
      const qty = parseFloat(history[histIdx].receivedQty) || 0;
      const price = parseFloat(history[histIdx].unitPrice) || 0;
      const disc = parseFloat(history[histIdx].discountPct) || 0;
      const tax = parseFloat(history[histIdx].taxPct) || 0;

      // Sync taxPct to specific tax component if applicable
      if (field === 'taxPct') {
        const tType = (history[histIdx].taxType || '').toLowerCase();
        if (tType === 'vat') history[histIdx].vatPct = tax;
        else if (tType === 'igst') history[histIdx].igstPct = tax;
      }

      const afterDisc = qty * price * (1 - disc / 100);
      history[histIdx].amount = (afterDisc * (1 + tax / 100)).toFixed(2);

      item.historyInvoices = history;
      next[itemIdx] = item;
      return next;
    });
  };

  const handleDeleteHistory = async (itemIdx, histIdx) => {
    const hInv = items[itemIdx].historyInvoices[histIdx];
    const confirmed = await showConfirmationDialog({
      title: 'Delete Booked Invoice?',
      text: `Are you sure you want to delete invoice ${hInv.invoiceNo}? This will restore the remaining quantity.`,
      confirmText: 'Yes, delete it',
      cancelText: 'Cancel',
      confirmButtonColor: '#dc2626'
    });

    if (confirmed) {
      try {
        showLoadingModal('Deleting...');
        const bizId = localStorage.getItem('selectedBusinessId');
        
        let poMeta = {};
        try {
          poMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
        } catch (e) {}
        
        const bookedInvoices = [...(poMeta.bookedInvoices || [])];
        const invIdx = bookedInvoices.findIndex(inv => inv.id === hInv.parentInvoiceId);
        if (invIdx !== -1) {
          const targetInv = { ...bookedInvoices[invIdx] };
          const lines = [...(targetInv.book_invoice_data?.lines || [])];
          
          const lineIdx = lines.findIndex(l => l.originalIndex === hInv.originalIndex);
          if (lineIdx !== -1) {
            const line = { ...lines[lineIdx] };
            const supplierInvoices = (line.supplierInvoices || []).filter(si => si.invoiceNo !== hInv.invoiceNo);
            line.supplierInvoices = supplierInvoices;
            lines[lineIdx] = line;
          }
          
          targetInv.book_invoice_data = {
            ...targetInv.book_invoice_data,
            lines: lines
          };
          
          const hasAnyLeft = lines.some(l => (l.supplierInvoices || []).length > 0);
          if (!hasAnyLeft) {
            bookedInvoices.splice(invIdx, 1);
          } else {
            bookedInvoices[invIdx] = targetInv;
          }
        }
        
        const updatedMeta = { ...poMeta, bookedInvoices };
        const orderPayload = {
          ...poData,
          order_date: poData.order_date ? new Date(poData.order_date).toISOString().split('T')[0] : poData.order_date,
          updated_date: poData.updated_date ? new Date(poData.updated_date).toISOString().split('T')[0] : poData.updated_date,
          order_data: updatedMeta
        };
        await purchaseOrderAPI.update(poData.dbId, orderPayload, bizId);
        
        showSuccessToast('Invoice deleted successfully from Purchase Order history');
        setLocalRefresh(prev => prev + 1); // Refresh local data
      } catch (err) {
        console.error('Error deleting history invoice:', err);
        showErrorToast('Failed to delete invoice');
      } finally {
        closeModal();
      }
    }
  };

  const handleSaveHistory = async (itemIdx, histIdx) => {
    const hInv = items[itemIdx].historyInvoices[histIdx];
    try {
      showLoadingModal('Saving changes...');
      const bizId = localStorage.getItem('selectedBusinessId');
      
      let poMeta = {};
      try {
        poMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
      } catch (e) {}
      
      const bookedInvoices = [...(poMeta.bookedInvoices || [])];
      const invIdx = bookedInvoices.findIndex(inv => inv.id === hInv.parentInvoiceId);
      if (invIdx !== -1) {
        const targetInv = { ...bookedInvoices[invIdx] };
        const lines = [...(targetInv.book_invoice_data?.lines || [])];
        
        const lineIdx = lines.findIndex(l => l.originalIndex === hInv.originalIndex);
        if (lineIdx !== -1) {
          const line = { ...lines[lineIdx] };
          const supplierInvoices = [...(line.supplierInvoices || [])];
          
          const siIdx = supplierInvoices.findIndex(si => si.invoiceNo === hInv.invoiceNo || si.id === hInv.id || si.date === hInv.date);
          if (siIdx !== -1) {
            supplierInvoices[siIdx] = {
              ...supplierInvoices[siIdx],
              invoiceNo: hInv.invoiceNo,
              invoiceDate: hInv.invoiceDate,
              receivedQty: parseFloat(hInv.receivedQty) || 0,
              unitPrice: parseFloat(hInv.unitPrice) || 0,
              discountPct: parseFloat(hInv.discountPct) || 0,
              taxPct: parseFloat(hInv.taxPct) || 0,
              amount: parseFloat(hInv.amount) || 0,
              notes: hInv.notes,
              file: hInv.file || null,
              fileName: hInv.fileName || '',
              fileType: hInv.fileType || ''
            };
          } else if (supplierInvoices.length === 1) {
            supplierInvoices[0] = { ...hInv };
          }
          
          line.supplierInvoices = supplierInvoices;
          
          const totalReceived = supplierInvoices.reduce((s, inv) => s + (parseFloat(inv.receivedQty) || 0), 0);
          const grossAmt = supplierInvoices.reduce((s, inv) => s + ((parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0)), 0);
          const discountValue = supplierInvoices.reduce((s, inv) => {
            const itemGross = (parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0);
            return s + (itemGross * (parseFloat(inv.discountPct) || 0) / 100);
          }, 0);
          const taxable = Math.max(0, grossAmt - discountValue);

          const defaultTaxType = line.taxType || line.tax_type || 'GST';
          const defaultTaxPct = parseFloat(line.taxPct) || parseFloat(line.tax_pct) || parseFloat(line.gstPct) || 0;

          let cgstAmount = 0;
          let sgstAmount = 0;
          let igstAmount = 0;
          let vatAmount = 0;
          let totalTax = 0;

          supplierInvoices.forEach(inv => {
            const itemGross = (parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0);
            const itemDisc = itemGross * ((parseFloat(inv.discountPct) || 0) / 100);
            const itemTaxable = Math.max(0, itemGross - itemDisc);
            const itemTaxPct = inv.taxPct !== undefined ? parseFloat(inv.taxPct) : defaultTaxPct;
            const itemTaxType = (inv.taxType || defaultTaxType).toLowerCase();

            let itemCgst = 0;
            let itemSgst = 0;
            let itemIgst = 0;
            let itemVat = 0;

            if (itemTaxType === 'cgst_sgst' || itemTaxType === 'gst') {
              itemCgst = itemTaxable * ((itemTaxPct / 2) / 100);
              itemSgst = itemTaxable * ((itemTaxPct / 2) / 100);
            } else if (itemTaxType === 'igst') {
              itemIgst = itemTaxable * (itemTaxPct / 100);
            } else if (itemTaxType === 'vat') {
              itemVat = itemTaxable * (itemTaxPct / 100);
            }

            cgstAmount += itemCgst;
            sgstAmount += itemSgst;
            igstAmount += itemIgst;
            vatAmount += itemVat;
            totalTax += (itemCgst + itemSgst + itemIgst + itemVat);
          });

          const lineTotal = taxable + totalTax;
          const firstInv = supplierInvoices[0] || {};
          const linePrice = totalReceived > 0 ? (grossAmt / totalReceived) : (parseFloat(firstInv.unitPrice) || parseFloat(line.price) || parseFloat(line.rate) || 0);
          
          line.qty = totalReceived;
          line.price = linePrice;
          line.rate = linePrice;
          line.taxable = parseFloat(taxable.toFixed(2));
          line.tax = parseFloat(totalTax.toFixed(2));
          line.total = parseFloat(lineTotal.toFixed(2));
          line.cgstAmount = parseFloat(cgstAmount.toFixed(2));
          line.cgst_amount = parseFloat(cgstAmount.toFixed(2));
          line.sgstAmount = parseFloat(sgstAmount.toFixed(2));
          line.sgst_amount = parseFloat(sgstAmount.toFixed(2));
          line.igstAmount = parseFloat(igstAmount.toFixed(2));
          line.igst_amount = parseFloat(igstAmount.toFixed(2));
          line.vatAmount = parseFloat(vatAmount.toFixed(2));
          line.vat_amount = parseFloat(vatAmount.toFixed(2));

          lines[lineIdx] = line;
        }
        
        let newInvGrandTotal = 0;
        lines.forEach(l => {
          const lAmt = (l.supplierInvoices || []).reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
          newInvGrandTotal += lAmt;
        });

        targetInv.total_amount = newInvGrandTotal;
        targetInv.grand_total = newInvGrandTotal;

        targetInv.book_invoice_data = {
          ...targetInv.book_invoice_data,
          lines: lines
        };
        bookedInvoices[invIdx] = targetInv;
      }
      
      const updatedMeta = { ...poMeta, bookedInvoices };
      const orderPayload = {
        ...poData,
        order_date: poData.order_date ? new Date(poData.order_date).toISOString().split('T')[0] : poData.order_date,
        updated_date: poData.updated_date ? new Date(poData.updated_date).toISOString().split('T')[0] : poData.updated_date,
        order_data: updatedMeta
      };
      await purchaseOrderAPI.update(poData.dbId, orderPayload, bizId);
      
      setEditingHistory(null);
      showSuccessToast('Changes saved successfully inside Purchase Order history');
      setLocalRefresh(prev => prev + 1); // Refresh local data
    } catch (err) {
      console.error('Error saving history changes:', err);
      showErrorToast('Failed to save changes');
    } finally {
      closeModal();
    }
  };

  const openPreview = (fileData) => {
    if (!fileData) return;
    setPreviewFile(fileData);
  };

  const closePreview = () => setPreviewFile(null);

  const handleOpenOriginal = () => {
    if (!previewFile?.url) return;

    // If it's a data URL (Base64), browsers often block window.open.
    // Convert to Blob URL first for reliable opening.
    if (previewFile.url.startsWith('data:')) {
      try {
        const parts = previewFile.url.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error('Error opening base64 file:', err);
        // Fallback for simple data URLs
        const newWindow = window.open();
        newWindow.document.write(`<iframe src="${previewFile.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else {
      window.open(previewFile.url, '_blank');
    }
  };

  const hasAnyInvoice = items.some(item =>
    item.supplierInvoices.some(inv => inv.invoiceNo.trim() || parseFloat(inv.receivedQty) > 0)
  );

  const hasAnyError = items.some(item => !!item.error);

  const handleConfirmOrder = async () => {
    // Validation: Check if Invoice No is provided for all rows with received quantity
    const missingInvoiceNo = items.some(item =>
      item.supplierInvoices.some(inv => (parseFloat(inv.receivedQty) > 0) && !inv.invoiceNo.trim())
    );

    if (missingInvoiceNo) {
      showErrorToast('Please enter Invoice Number for all items being received.');
      return;
    }

    if (!hasAnyInvoice) {
      showErrorToast('Please fill at least one supplier invoice detail.');
      return;
    }

    if (hasAnyError) {
      showErrorToast('Please fix quantity errors before proceeding.');
      return;
    }

    setIsSubmitting(true);
    showLoadingModal('Creating Book Invoice...');

    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      const user = getUserData();
      const userId = user?.id || user?.userId || 1;
      const { bookInvoiceAPI } = api;

      // Find the first valid invoice date entered by the user
      let invoiceDateStr = '';
      for (const item of items) {
        const firstValidInv = item.supplierInvoices.find(inv => inv.invoiceDate && (parseFloat(inv.receivedQty) > 0 || inv.invoiceNo.trim()));
        if (firstValidInv && firstValidInv.invoiceDate) {
          invoiceDateStr = firstValidInv.invoiceDate;
          break;
        }
      }

      // Fallback to today if no date was selected/entered
      if (!invoiceDateStr) {
        const today = new Date();
        invoiceDateStr = today.toISOString().split('T')[0];
      }

      // 🔍 Fetch the correct sequential Book Invoice Number (e.g. BI-2026-27-0001)
      let bookInvoiceNumber = `BI-${Date.now()}`; // Fallback timestamp
      try {
        const nextNumResp = await bookInvoiceAPI.getNextNumber(businessId);
        if (nextNumResp?.success && nextNumResp?.data?.book_invoice_number) {
          bookInvoiceNumber = nextNumResp.data.book_invoice_number;
        }
      } catch (err) {
        console.error('Error fetching sequential book invoice number:', err);
      }

      // Extract full PO metadata
      let poMeta = {};
      try {
        poMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
      } catch (e) {
        console.error('Failed to parse PO metadata for mapping', e);
      }

      let grandTotal = 0;

      // Build lines with attached supplier invoices
      const bookInvoiceLines = items
        .filter(item => item.supplierInvoices.some(inv => parseFloat(inv.receivedQty) > 0 || inv.invoiceNo.trim()))
        .map(item => {
          const totalReceived = item.supplierInvoices.reduce((s, inv) => s + (parseFloat(inv.receivedQty) || 0), 0);
          const totalAmt = item.supplierInvoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
          grandTotal += totalAmt;

          const validInvoices = item.supplierInvoices.filter(inv => parseFloat(inv.receivedQty) > 0);
          const firstInv = validInvoices[0] || item.supplierInvoices[0] || {};

          const grossAmt = validInvoices.reduce((s, inv) => s + ((parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0)), 0);
          const discountValue = validInvoices.reduce((s, inv) => {
            const itemGross = (parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0);
            return s + (itemGross * (parseFloat(inv.discountPct) || 0) / 100);
          }, 0);
          const taxable = Math.max(0, grossAmt - discountValue);

          const defaultTaxType = item.taxType || item.tax_type || 'GST';
          const defaultTaxPct = parseFloat(item.taxPct) || parseFloat(item.tax_pct) || parseFloat(item.gstPct) || 0;

          let cgstAmount = 0;
          let sgstAmount = 0;
          let igstAmount = 0;
          let vatAmount = 0;
          let totalTax = 0;

          validInvoices.forEach(inv => {
            const itemGross = (parseFloat(inv.receivedQty) || 0) * (parseFloat(inv.unitPrice) || 0);
            const itemDisc = itemGross * ((parseFloat(inv.discountPct) || 0) / 100);
            const itemTaxable = Math.max(0, itemGross - itemDisc);
            const itemTaxPct = inv.taxPct !== undefined ? parseFloat(inv.taxPct) : defaultTaxPct;
            const itemTaxType = (inv.taxType || defaultTaxType).toLowerCase();

            let itemCgst = 0;
            let itemSgst = 0;
            let itemIgst = 0;
            let itemVat = 0;

            if (itemTaxType === 'cgst_sgst' || itemTaxType === 'gst') {
              itemCgst = itemTaxable * ((itemTaxPct / 2) / 100);
              itemSgst = itemTaxable * ((itemTaxPct / 2) / 100);
            } else if (itemTaxType === 'igst') {
              itemIgst = itemTaxable * (itemTaxPct / 100);
            } else if (itemTaxType === 'vat') {
              itemVat = itemTaxable * (itemTaxPct / 100);
            }

            cgstAmount += itemCgst;
            sgstAmount += itemSgst;
            igstAmount += itemIgst;
            vatAmount += itemVat;
            totalTax += (itemCgst + itemSgst + itemIgst + itemVat);
          });

          const lineTotal = taxable + totalTax;
          const linePrice = totalReceived > 0 ? (grossAmt / totalReceived) : (parseFloat(firstInv.unitPrice) || parseFloat(item.price) || parseFloat(item.rate) || 0);
          const discountPct = firstInv.discountPct !== undefined ? parseFloat(firstInv.discountPct) : (parseFloat(item.discountPct) || parseFloat(item.discount_pct) || 0);
          const taxPct = firstInv.taxPct !== undefined ? parseFloat(firstInv.taxPct) : defaultTaxPct;
          const taxType = firstInv.taxType || defaultTaxType;

          return {
            description: item.description || item.name || '',
            subtitle: item.subtitle || '',
            hsn: item.hsn || '',
            qty: totalReceived,
            unit: item.unit || 'PCS',
            price: linePrice,
            rate: linePrice,
            discountPct: discountPct,
            discount_pct: discountPct,
            taxPct: taxPct,
            tax_pct: taxPct,
            taxType: taxType,
            tax_type: taxType,
            cgstPct: firstInv.cgstPct !== undefined ? parseFloat(firstInv.cgstPct) : (taxType.toLowerCase() === 'cgst_sgst' || taxType.toLowerCase() === 'gst' ? taxPct / 2 : 0),
            sgstPct: firstInv.sgstPct !== undefined ? parseFloat(firstInv.sgstPct) : (taxType.toLowerCase() === 'cgst_sgst' || taxType.toLowerCase() === 'gst' ? taxPct / 2 : 0),
            igstPct: firstInv.igstPct !== undefined ? parseFloat(firstInv.igstPct) : (taxType.toLowerCase() === 'igst' ? taxPct : 0),
            vatPct: firstInv.vatPct !== undefined ? parseFloat(firstInv.vatPct) : (taxType.toLowerCase() === 'vat' ? taxPct : 0),
            taxable: parseFloat(taxable.toFixed(2)),
            tax: parseFloat(totalTax.toFixed(2)),
            total: parseFloat(lineTotal.toFixed(2)),
            cgstAmount: parseFloat(cgstAmount.toFixed(2)),
            cgst_amount: parseFloat(cgstAmount.toFixed(2)),
            sgstAmount: parseFloat(sgstAmount.toFixed(2)),
            sgst_amount: parseFloat(sgstAmount.toFixed(2)),
            igstAmount: parseFloat(igstAmount.toFixed(2)),
            igst_amount: parseFloat(igstAmount.toFixed(2)),
            vatAmount: parseFloat(vatAmount.toFixed(2)),
            vat_amount: parseFloat(vatAmount.toFixed(2)),
            originalIndex: item.originalIndex,
            supplierInvoices: item.supplierInvoices
              .filter(inv => inv.invoiceNo.trim() || parseFloat(inv.receivedQty) > 0)
              .map(inv => ({
                invoiceNo: inv.invoiceNo,
                invoiceDate: inv.invoiceDate,
                receivedQty: parseFloat(inv.receivedQty) || 0,
                unitPrice: parseFloat(inv.unitPrice) || 0,
                discountPct: parseFloat(inv.discountPct) || 0,
                taxPct: parseFloat(inv.taxPct) || 0,
                vatPct: parseFloat(inv.vatPct) || 0,
                cgstPct: parseFloat(inv.cgstPct) || 0,
                sgstPct: parseFloat(inv.sgstPct) || 0,
                igstPct: parseFloat(inv.igstPct) || 0,
                taxType: inv.taxType,
                amount: parseFloat(inv.amount) || 0,
                notes: inv.notes,
                file: inv.file || null,
                fileName: inv.fileName || '',
                fileType: inv.fileType || '',
              })),
          };
        });

      const bookInvoicePayload = {
        business_id: businessId,
        party_id: poData.party_id,
        party_name: poData.partyName || poData.party_name,
        book_invoice_number: bookInvoiceNumber,
        invoice_date: invoiceDateStr,
        status: 'open',
        total_amount: grandTotal,
        discount_amount: 0,
        tax_amount: 0,
        grand_total: grandTotal,
        notes: poData.notes || poMeta.notes || ``,
        is_active: 1,
        po_reference: poData.id,
        created_by: userId,
        bank_id: poData.bank_id || poMeta.bank_id || null,
        remark: poData.remark || poMeta.remark || "",
        terms_sections: poMeta.terms_sections || [],
        terms: poMeta.terms || "",
        book_invoice_data: {
          ...poMeta, // Carry over Additional Charges, Discounts, Bank Info, etc.
          lines: bookInvoiceLines,
          notes: poData.notes || poMeta.notes || ``,
          charges: poMeta.charges || [],
          discountAfterTaxPct: poMeta.discountAfterTaxPct || 0,
          remark: poData.remark || poMeta.remark || "",
          terms_sections: poMeta.terms_sections || [],
          terms: poMeta.terms || ""
        }
      };

      const bookInvoiceResp = await bookInvoiceAPI.create(bookInvoicePayload);

      // Save a completely independent copy inside the Purchase Order's own JSON meta data
      try {
        let currentPoMeta = {};
        try {
          currentPoMeta = typeof poData.meta === 'string' ? JSON.parse(poData.meta) : (poData.meta || poData.order_data || {});
        } catch (e) {}

        const newLocalInvoice = {
          id: 'local-' + Date.now(),
          book_invoice_number: bookInvoiceNumber,
          invoice_date: invoiceDateStr,
          book_invoice_data: {
            lines: bookInvoiceLines
          }
        };

        const currentBooked = currentPoMeta.bookedInvoices || [];
        const updatedMeta = {
          ...currentPoMeta,
          bookedInvoices: [...currentBooked, newLocalInvoice]
        };

        const orderPayload = {
          ...poData,
          order_date: poData.order_date ? new Date(poData.order_date).toISOString().split('T')[0] : poData.order_date,
          updated_date: poData.updated_date ? new Date(poData.updated_date).toISOString().split('T')[0] : poData.updated_date,
          order_data: updatedMeta
        };

        await purchaseOrderAPI.update(poData.dbId, orderPayload, businessId);
      } catch (err) {
        console.error('Error saving local book invoice record to PO:', err);
      }

      closeModal();
      setIsSubmitting(false);
      showSuccessToast('Book Invoice created successfully!');
      onSuccess();

    } catch (error) {
      closeModal();
      setIsSubmitting(false);
      console.error('Error generating book invoice:', error);
      showErrorToast(error?.message || 'Failed to create Book Invoice');
    }
  };

  if (!open) return null;

  const backendURL = getApiConfig().backendURL;

  const inputStyle = {
    padding: '5px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    background: '#fff',
    color: '#1e293b',
    width: '100%',
    minWidth: '0',
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: window.innerWidth < 768 ? '0' : '20px', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}>
      <div style={{
        background: '#fff',
        width: window.innerWidth < 768 ? '100%' : '96%',
        maxWidth: '1300px',
        height: window.innerWidth < 768 ? '100%' : 'auto',
        maxHeight: window.innerWidth < 768 ? '100%' : '92vh',
        borderRadius: window.innerWidth < 768 ? '0' : '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {/* Header */}

        <div style={{ background: 'linear-gradient(135deg, rgb(18, 144, 70), rgb(34, 197, 94))', padding: '16px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #129046, #22c55e)', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(18,144,70,0.3)' }}>
              <FaFileInvoice size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: window.innerWidth < 768 ? '16px' : '18px', fontWeight: 700, letterSpacing: '-0.02em' }}><span>Book Supplier Invoice</span></h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#FFFF', marginTop: '2px' }}><span>PO: </span><span>{poData?.id}</span></p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '10px', transition: '0.2s' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div style={{ flex: 1, overflow: 'auto', padding: window.innerWidth < 768 ? '10px' : '20px', background: '#f1f5f9' }}>
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>#</th>
                    <th style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Product</th>
                    <th style={{ padding: '9px 10px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Rate</th>
                    <th style={{ padding: '9px 10px', fontSize: '11px', fontWeight: 600, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Total Qty</th>
                    <th style={{ padding: '9px 10px', fontSize: '11px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Booked</th>
                    <th style={{ padding: '9px 10px', fontSize: '11px', fontWeight: 600, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>Remaining</th>
                    <th style={{ padding: '9px 10px', fontSize: '11px', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap', borderLeft: '1px solid #334155' }}>Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? items.map((item, idx) => {
                    const imgUrl = item.image_url ? `${backendURL}${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}` : null;
                    const isFullyBooked = item.remainingQty === 0;
                    const isExpanded = expandedItems.has(idx);
                    const totalInvoiceCount = item.supplierInvoices.filter(inv => inv.invoiceNo.trim() || parseFloat(inv.receivedQty) > 0).length;

                    return (
                      <React.Fragment key={idx}>
                        {/* Main line item row */}
                        <tr style={{ borderTop: '1px solid #475569', background: '#334155', cursor: 'pointer', transition: '0.2s' }} onClick={() => toggleExpand(idx)}>
                          <td style={{ padding: '8px 14px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: 38, height: 38, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#334155', border: '1px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {imgUrl ? (
                                  <img src={imgUrl} alt={item.description || 'product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <svg style={{ width: 16, height: 16, color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '13px', whiteSpace: 'nowrap' }}>{item.description || item.name || 'Unnamed Item'}</div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {item.code && <span style={{ fontSize: '10px', background: '#334155', color: '#cbd5e1', padding: '1px 5px', borderRadius: '4px', fontWeight: 500 }}>{item.code}</span>}
                                  {item.hsn && <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '1px 5px', borderRadius: '4px', fontWeight: 500 }}>HSN: {item.hsn}</span>}
                                  {isFullyBooked && <span style={{ fontSize: '10px', background: 'rgba(253, 224, 71, 0.2)', color: '#fde047', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>✓ Fully Booked</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '12px', color: '#e2e8f0', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {formatCurrency(item.price || 0, currency)}
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>/{item.unit || 'unit'}</div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 700, fontSize: '12px', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>{item.totalQty}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700, fontSize: '12px', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{item.bookedQty}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', background: isFullyBooked ? 'rgba(253, 224, 71, 0.15)' : 'rgba(249, 115, 22, 0.15)', color: isFullyBooked ? '#fde047' : '#fb923c', fontWeight: 700, fontSize: '12px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${isFullyBooked ? 'rgba(253, 224, 71, 0.3)' : 'rgba(249, 115, 22, 0.3)'}` }}>{item.remainingQty}</span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', borderLeft: '1px solid #334155', background: 'rgba(15, 23, 42, 0.6)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {totalInvoiceCount > 0 && <span style={{ background: '#129046', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{totalInvoiceCount}</span>}
                              <svg style={{ width: 14, height: 14, color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded: Multiple Supplier Invoices for this line item */}

                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ padding: 0, background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                              <div style={{ padding: '10px 16px 14px' }}>
                                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'block', width: '100%' }}>
                                  <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                      <tr style={{ background: '#e2e8f0' }}>
                                        <th style={{ padding: '6px 4px', color: '#475569', fontWeight: 600, textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>INVOICE NO <span style={{ color: '#ef4444' }}>*</span></th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>DATE</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>RECEIVED QTY</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>UNIT</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>UNIT PRICE ({getCurrencySymbol(currency)})</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>DISC (%)</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{displayTaxType === 'SPLIT_GST' ? 'GST (%)' : displayTaxType}</th>
                                        {displayTaxType === 'SPLIT_GST' && (
                                          <>
                                            <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>CGST (%)</th>
                                            <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>SGST (%)</th>
                                          </>
                                        )}
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>TOTAL AMOUNT ({getCurrencySymbol(currency)})</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>NOTES</th>
                                        <th style={{ padding: '6px 8px', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>ATTACHMENT</th>
                                        <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.historyInvoices && item.historyInvoices.map((hInv, hIdx) => {
                                        const isEditing = editingHistory?.itemIdx === idx && editingHistory?.histIdx === hIdx;
                                        return (
                                          <tr key={`hist-${hIdx}`} style={{ borderTop: '1px solid #e2e8f0', background: isEditing ? '#fffbeb' : '#f8fafc', opacity: isEditing ? 1 : 0.85 }}>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input
                                                readOnly={!isEditing}
                                                value={hInv.invoiceNo || ""}
                                                style={{ ...inputStyle, width: `${Math.max(12, String(hInv.invoiceNo || "").length) * 8 + 20}px`, background: isEditing ? "#fff" : "transparent" }}
                                                onChange={e => updateHistoryField(idx, hIdx, "invoiceNo", e.target.value)}
                                              />
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input
                                                type={isEditing ? "date" : "text"}
                                                readOnly={!isEditing}
                                                style={{ ...inputStyle, minWidth: '120px', background: isEditing ? '#fff' : 'transparent' }}
                                                value={isEditing ? hInv.invoiceDate : formatDate(hInv.invoiceDate || hInv.date)}
                                                onChange={e => updateHistoryField(idx, hIdx, 'invoiceDate', e.target.value)}
                                              />
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <input
                                                  type="number"
                                                  readOnly={!isEditing}
                                                  style={{ ...inputStyle, width: `${Math.max(8, String(hInv.receivedQty || "").length) * 8 + 20}px`, textAlign: "center", background: isEditing ? "#fff" : "transparent", borderColor: (item.error && item.errorType === `hist-${hIdx}`) ? "#ef4444" : "#d1d5db" }} value={hInv.receivedQty}
                                                  onChange={e => updateHistoryField(idx, hIdx, 'receivedQty', e.target.value)}
                                                />
                                                {item.error && item.errorType === `hist-${hIdx}` && (
                                                  <div style={{ color: '#dc2626', fontSize: '10px', fontWeight: 500, marginTop: '3px', whiteSpace: 'nowrap' }}>
                                                    Remaining QTY is {item.remainingQty} only
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}><input readOnly style={{ ...inputStyle, width: `${Math.max(5, String(hInv.unit || "").length) * 8 + 20}px`, textAlign: "center", background: "transparent" }} value={hInv.unit || "—"} /></td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input type="number" readOnly={!isEditing} style={{ ...inputStyle, width: `${Math.max(8, String(hInv.unitPrice ? convertFromINR(hInv.unitPrice, currency).toFixed(2) : "").length) * 8 + 20}px`, textAlign: "center", background: isEditing ? "#fff" : "transparent" }} value={hInv.unitPrice ? convertFromINR(hInv.unitPrice, currency).toFixed(2) : ""}
                                                onChange={e => {
                                                  const val = e.target.value;
                                                  updateHistoryField(idx, hIdx, 'unitPrice', val === '' ? '' : convertToINR(parseFloat(val) || 0, currency));
                                                }}
                                              />
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input type="number" readOnly={!isEditing} style={{ ...inputStyle, width: `${Math.max(5, String(hInv.discountPct || "").length) * 8 + 20}px`, textAlign: "center", background: isEditing ? "#fff" : "transparent" }} value={hInv.discountPct}
                                                onChange={e => updateHistoryField(idx, hIdx, 'discountPct', e.target.value)}
                                              />
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input type="number" readOnly={!isEditing} style={{ ...inputStyle, width: `${Math.max(5, String(hInv.taxPct || "").length) * 8 + 20}px`, textAlign: "center", background: isEditing ? "#fff" : "transparent" }} value={hInv.taxPct}
                                                onChange={e => updateHistoryField(idx, hIdx, 'taxPct', e.target.value)}
                                              />
                                            </td>
                                            {displayTaxType === 'SPLIT_GST' && (
                                              <>
                                                <td style={{ padding: '6px 8px' }}>
                                                  <input type="number" readOnly style={{ ...inputStyle, width: `${Math.max(5, String((hInv.taxPct / 2) || "").length) * 8 + 20}px`, textAlign: "center", background: "transparent" }} value={(hInv.taxPct / 2) || 0} />
                                                </td>
                                                <td style={{ padding: '6px 8px' }}>
                                                  <input type="number" readOnly style={{ ...inputStyle, width: `${Math.max(5, String((hInv.taxPct / 2) || "").length) * 8 + 20}px`, textAlign: "center", background: "transparent" }} value={(hInv.taxPct / 2) || 0} />
                                                </td>
                                              </>
                                            )}
                                            <td style={{ padding: '6px 8px' }}><input readOnly style={{ ...inputStyle, width: `${Math.max(10, String(hInv.amount || "").length) * 8 + 20}px`, textAlign: "center", fontWeight: 600, background: "transparent" }} value={hInv.amount ? formatCurrency(hInv.amount, currency) : ""} /></td>
                                            <td style={{ padding: '6px 8px' }}>
                                              <input
                                                readOnly={!isEditing}
                                                value={hInv.notes || ""}
                                                style={{ ...inputStyle, width: `${Math.max(6, String(hInv.notes || "").length) * 7 + 15}px`, background: isEditing ? "#fff" : "transparent" }}
                                                onChange={e => updateHistoryField(idx, hIdx, "notes", e.target.value)}
                                              />
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                              {!isEditing ? (
                                                hInv.file && (
                                                  <button
                                                    onClick={() => {
                                                      const fileUrl = hInv.file.startsWith('data:') ? hInv.file : `${backendURL}${hInv.file.startsWith('/') ? '' : '/'}${hInv.file}`;
                                                      openPreview({ url: fileUrl, type: hInv.file.toLowerCase().endsWith('.pdf') || hInv.file.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg', name: 'Invoice' });
                                                    }}
                                                    style={{ background: 'rgba(18, 144, 70, 0.1)', color: '#129046', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(18, 144, 70, 0.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    title="View Invoice"
                                                  >
                                                    <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    View
                                                  </button>
                                                )
                                              ) : (
                                                <label style={{ cursor: 'pointer', background: hInv.fileName || hInv.file ? '#129046' : '#334155', color: '#ffffff', border: `1px solid ${hInv.fileName || hInv.file ? '#129046' : '#1e293b'}`, borderRadius: '6px', padding: '0 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', transition: '0.2s' }}>
                                                  {hInv.fileName || hInv.file ? 'Uploaded' : 'Upload'}
                                                  <input type="file" style={{ display: 'none' }} onChange={e => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                                    if (!allowed.includes(file.type)) {
                                                      showErrorToast('Only PDF, JPEG, PNG, WEBP files are allowed.');
                                                      return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                      updateHistoryField(idx, hIdx, 'file', ev.target.result);
                                                      updateHistoryField(idx, hIdx, 'fileName', file.name);
                                                      updateHistoryField(idx, hIdx, 'fileType', file.type);
                                                    };
                                                    reader.readAsDataURL(file);
                                                  }} />
                                                </label>
                                              )}
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                {!isEditing ? (
                                                  <>
                                                    <button onClick={() => setEditingHistory({ itemIdx: idx, histIdx: hIdx })} style={{ border: 'none', background: '#15803d', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 4px rgba(21,128,61,0.2)' }} title="Edit"><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteHistory(idx, hIdx)} style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }} title="Delete"><Trash2 size={12} /></button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <button onClick={() => handleSaveHistory(idx, hIdx)} style={{ border: 'none', background: '#129046', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 5px rgba(18,144,70,0.3)' }} title="Save"><Check size={12} /></button>
                                                    <button onClick={() => setEditingHistory(null)} style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }} title="Cancel"><X size={12} /></button>
                                                  </>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {item.supplierInvoices.map((inv, invIdx) => (
                                        <tr key={invIdx} style={{ borderTop: '1px solid #e9ecef', background: '#fff' }}>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input style={{ ...inputStyle, width: `${Math.max(12, String(inv.invoiceNo || "").length) * 8 + 20}px`, borderColor: (parseFloat(inv.receivedQty) > 0 && !inv.invoiceNo.trim()) ? "#ef4444" : "#d1d5db" }} placeholder="Invoice No" value={inv.invoiceNo} onChange={e => updateInvoiceField(idx, invIdx, 'invoiceNo', e.target.value)} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="date" style={{ ...inputStyle, minWidth: '120px' }} value={inv.invoiceDate} onChange={e => updateInvoiceField(idx, invIdx, 'invoiceDate', e.target.value)} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                              <input type="number" style={{ ...inputStyle, width: `${Math.max(8, String(inv.receivedQty || "").length) * 8 + 20}px`, textAlign: "center", borderColor: (item.error && item.errorType === "new") ? "#ef4444" : "#d1d5db" }} value={inv.receivedQty} onChange={e => updateInvoiceField(idx, invIdx, 'receivedQty', e.target.value)} />
                                              {item.error && item.errorType === 'new' && (
                                                <div style={{ color: '#dc2626', fontSize: '10px', fontWeight: 500, marginTop: '3px', whiteSpace: 'nowrap' }}>
                                                  Remaining QTY is {item.remainingQty} only
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input readOnly style={{ ...inputStyle, width: `${Math.max(5, String(inv.unit || "").length) * 8 + 20}px`, textAlign: "center" }} value={inv.unit} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="number" style={{ ...inputStyle, width: `${Math.max(8, String(inv.unitPrice ? convertFromINR(inv.unitPrice, currency).toFixed(2) : "").length) * 8 + 20}px`, textAlign: "center" }} value={inv.unitPrice ? convertFromINR(inv.unitPrice, currency).toFixed(2) : ""} onChange={e => {
                                              const val = e.target.value;
                                              updateInvoiceField(idx, invIdx, 'unitPrice', val === '' ? '' : convertToINR(parseFloat(val) || 0, currency));
                                            }} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="number" style={{ ...inputStyle, width: `${Math.max(5, String(inv.discountPct || "").length) * 8 + 20}px`, textAlign: "center" }} value={inv.discountPct} onChange={e => updateInvoiceField(idx, invIdx, 'discountPct', e.target.value)} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="number" style={{ ...inputStyle, width: `${Math.max(5, String(inv.taxPct || "").length) * 8 + 20}px`, textAlign: "center" }} value={inv.taxPct} onChange={e => updateInvoiceField(idx, invIdx, 'taxPct', e.target.value)} />
                                          </td>
                                          {displayTaxType === 'SPLIT_GST' && (
                                            <>
                                              <td style={{ padding: '6px 8px' }}>
                                                <input type="number" readOnly style={{ ...inputStyle, width: `${Math.max(5, String((inv.taxPct / 2) || "").length) * 8 + 20}px`, textAlign: "center", background: "#f8fafc" }} value={(inv.taxPct / 2) || 0} />
                                              </td>
                                              <td style={{ padding: '6px 8px' }}>
                                                <input type="number" readOnly style={{ ...inputStyle, width: `${Math.max(5, String((inv.taxPct / 2) || "").length) * 8 + 20}px`, textAlign: "center", background: "#f8fafc" }} value={(inv.taxPct / 2) || 0} />
                                              </td>
                                            </>
                                          )}
                                          <td style={{ padding: '6px 8px' }}>
                                            <input readOnly style={{ ...inputStyle, width: `${Math.max(10, String(inv.amount || "").length) * 8 + 20}px`, textAlign: "center", fontWeight: 600 }} value={inv.amount ? formatCurrency(inv.amount, currency) : ""} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input style={{ ...inputStyle, width: `${Math.max(6, String(inv.notes || "").length) * 7 + 15}px` }} placeholder="Notes" value={inv.notes} onChange={e => updateInvoiceField(idx, invIdx, 'notes', e.target.value)} />
                                          </td>
                                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <label style={{ cursor: 'pointer', background: inv.fileName ? '#129046' : '#334155', color: '#ffffff', border: `1px solid ${inv.fileName ? '#129046' : '#1e293b'}`, borderRadius: '6px', padding: '0 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', transition: '0.2s' }}>
                                              {inv.fileName ? 'Uploaded' : 'Upload'}
                                              <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(idx, invIdx, e.target.files[0])} />
                                            </label>
                                          </td>
                                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                              <button onClick={() => addInvoiceRow(idx)} style={{ width: '24px', height: '24px', background: '#129046', border: 'none', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 4px rgba(18,144,70,0.2)' }}><Plus style={{ width: 14, height: 14 }} /></button>
                                              {item.supplierInvoices.length > 1 && (
                                                <button onClick={() => removeInvoiceRow(idx, invIdx)} style={{ width: '24px', height: '24px', background: '#ef4444', border: 'none', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 4px rgba(239,68,68,0.2)' }}>✕</button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan="19" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                        No items found in this Purchase Order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '11px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 14px 14px', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{items.length}</span> line item(s) · Click row to expand invoices
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '7px 18px', color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }} disabled={isSubmitting}>
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmOrder}
              style={{ padding: '7px 22px', background: (!hasAnyInvoice || hasAnyError || isSubmitting) ? '#94a3b8' : 'linear-gradient(to right, #129046, #22c55e)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: (!hasAnyInvoice || hasAnyError || isSubmitting) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: (!hasAnyInvoice || hasAnyError || isSubmitting) ? 'none' : '0 2px 10px rgba(18,144,70,0.35)' }}
              disabled={isSubmitting || !hasAnyInvoice || hasAnyError}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaFileInvoice />
                  <span>Book Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 📄 File Preview Overlay */}
        {previewFile && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: window.innerWidth < 768 ? '100%' : '850px',
              maxWidth: '100%',
              height: '100%',
              background: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              borderLeft: window.innerWidth < 768 ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRight: window.innerWidth < 768 ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}>
              {/* Preview Header */}
              <div style={{ background: '#1e293b', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{previewFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>{previewFile.name}</h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{previewFile.type}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleOpenOriginal}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ↗ Open Original
                  </button>
                  <button
                    onClick={closePreview}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              {/* Preview Content */}
              <div style={{ flex: 1, padding: previewFile.type === 'application/pdf' ? 0 : '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#334155' }}>
                {previewFile.type === 'application/pdf' ? (
                  <object
                    data={previewFile.url}
                    type="application/pdf"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <iframe
                      src={previewFile.url}
                      style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                      title="PDF Fallback"
                    />
                  </object>
                ) : (
                  <img
                    src={previewFile.url}
                    alt="Attachment Preview"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}


export default function PurchaseOrder({ currency }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [rows, setRows] = useState([]);

  //  Determine viewMode from URL with localStorage fallback
  const [viewMode, setViewMode] = useState(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      localStorage.setItem('purchaseOrderViewMode', mode);
      return mode;
    }
    const savedMode = localStorage.getItem('purchaseOrderViewMode');
    return savedMode || 'list';
  });

  const [loading, setLoading] = useState(viewMode === 'list');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });

  const [editingRow, setEditingRow] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [currentBusinessId, setCurrentBusinessId] = useState(localStorage.getItem("selectedBusinessId"));

  // Preview page states
  const [previewPurchaseOrder, setPreviewPurchaseOrder] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('FormatOne');
  const [uploadedLetterhead, setUploadedLetterhead] = useState(null);
  const [bookingPo, setBookingPo] = useState(null); // PO being booked into an invoice
  const [refreshKey, setRefreshKey] = useState(0); // Increment to trigger a data refresh

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Format currency display function
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  const handleBookInvoice = async (row) => {
    try {
      showLoadingModal('Fetching latest PO status...');
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseOrderAPI.getById(row.dbId || row.id, businessId);

      if (response.success && response.data) {
        // Transform the fetched data to match the expected structure
        const syncedOrder = {
          ...response.data,
          id: response.data.purchase_order_number,
          dbId: response.data.id,
          meta: response.data.purchase_order_data || response.data.order_data || {}
        };
        setBookingPo(syncedOrder);
      } else {
        throw new Error(response.message || 'Failed to fetch latest data');
      }
    } catch (error) {
      console.error('Error fetching PO for booking:', error);
      showErrorToast('Could not fetch latest record status.');
    } finally {
      closeModal();
    }
  };

  const onRangeChange = (opt) => {
    setDateRangeLabel(opt.label);
  };

  const onRangeApply = (range) => {
    setCustomRange(range);
    setDateRangeLabel("Custom Date Range");
  };

  // Available PDF formats
  const pdfFormats = useMemo(() => {
    const formats = {
      FormatOne: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={2} documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
        label: 'Format-1'
      },
      FormatTwo: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={3} documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
        label: 'Format-2'
      },
      FormatThree: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={4} documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
        label: 'Format-3'
      },
      FormatFour: {
        component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
        label: 'Format-4'
      },
      // FormatFive: {
      //   component: (props) => <PDFFormatWrapper {...props} formatNumber={5} documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
      //   label: 'Format-5'
      // },
    };

    if (uploadedLetterhead) {
      formats.Letterhead = {
        component: (props) => <PDFFormatWrapper {...props} formatNumber='letterhead' documentType={DOCUMENT_TYPES.PURCHASE_ORDER} letterheadImage={uploadedLetterhead} />,
        label: 'Letterhead'
      };
    }

    return formats;
  }, [uploadedLetterhead]);

  const formattedRangeLabel = () => {
    const { from, to } = customRange;
    if (from && to) return `${from} — ${to}`;
    if (from) return `${from} —`;
    if (to) return `— ${to}`;
    return 'Custom Date Range';
  };

  // Update viewMode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('purchaseOrderViewMode', mode);

      if (mode === 'create') {
        setLoading(false);
      }

      if (mode === 'edit') {
        const savedEditingRow = localStorage.getItem('editingPurchaseOrderRow');
        if (savedEditingRow) {
          try {
            const parsedRow = JSON.parse(savedEditingRow);
            setEditingRow(parsedRow);
            setLoading(false);
          } catch (error) {
            console.error('Error parsing saved editing row:', error);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    } else {
      setViewMode('list');
      localStorage.removeItem('purchaseOrderViewMode');
    }
  }, [searchParams]);

  // Load business data
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        if (selectedBusinessId) {
          const response = await businessAPI.getById(selectedBusinessId);
          if (response.success) {
            setBusinessData(response.data);
          }
        }
      } catch (error) {
        console.error('Error loading business data:', error);
      }
    };

    loadBusinessData();
  }, []);

  // Apply default format from business settings
  useEffect(() => {
    if (businessData?.default_format && previewPurchaseOrder) {
      setSelectedFormat(businessData.default_format);
    }
  }, [businessData?.default_format, previewPurchaseOrder]);

  // Fetch preview data when previewPurchaseOrder changes
  useEffect(() => {
    const fetchPreviewData = async () => {
      if (previewPurchaseOrder) {
        try {
          const data = await mapToPurchaseOrderDataInternal(previewPurchaseOrder);
          console.log('#### dat===>', data)
          setPreviewData(data);
        } catch (error) {
          console.error('Error fetching preview data:', error);
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };

    fetchPreviewData();
  }, [previewPurchaseOrder]);

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result.trim();
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result.trim();
    };
    if (num === 0) return 'Zero';
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const remainder = num % 100;
    let result = '';
    if (crores > 0) result += convertLessThanThousand(crores) + ' Crore ';
    if (lakhs > 0) result += convertLessThanThousand(lakhs) + ' Lakh ';
    if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
    if (hundreds > 0) result += convertLessThanThousand(hundreds) + ' Hundred ';
    if (remainder > 0) result += convertLessThanThousand(remainder);
    return result.trim() + ' Only';
  };

  const mapToPurchaseOrderDataInternal = async (row) => {
    return await mapToPurchaseOrderData(row, businessData, partyAPI, currency);
  };

  const generatePDF = async (purchaseOrderData) => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      const SelectedFormat = pdfFormats[selectedFormat].component;
      const fileName = `${purchaseOrderData.quotation.number}.pdf`;

      await generateUniversalPDF({
        component: <SelectedFormat data={purchaseOrderData} />,
        filename: fileName,
        onStart: () => showLoadingModal('Generating PDF...'),
        onSuccess: () => {
          closeModal();
          showSuccessToast('PDF downloaded successfully');
          setIsGeneratingPDF(false);
        },
        onError: (err) => {
          console.error('PDF generation failed:', err);
          closeModal();
          showErrorToast('Failed to generate PDF. Please try again.');
          setIsGeneratingPDF(false);
        }
      });
    } catch (error) {
      console.error('PDF startup failed:', error);
      closeModal();
      showErrorToast('Failed to fetch PDF component.');
      setIsGeneratingPDF(false);
    }
  };

  const handleLetterheadUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Block Word files - they cannot be converted to letterhead properly
    if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file (JPEG, PNG, WEBP).');
      event.target.value = '';
      return;
    }

    // Support image file types and PDF
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (!validTypes.includes(file.type)) {
      showErrorToast('Please upload a valid file (PDF, JPEG, PNG, WEBP)');
      event.target.value = '';
      return;
    }

    const isPDF = file.type === 'application/pdf';

    try {
      if (isPDF) {
        showInfoToast("Converting PDF to letterhead... please wait.");
      }

      const imageData = await convertFileToImage(file);
      setUploadedLetterhead(imageData);
      setSelectedFormat('Letterhead'); // Switch to letterhead format
      showSuccessToast(isPDF ? "PDF converted and uploaded successfully" : "Letterhead uploaded successfully");
    } catch (err) {
      console.error("Error processing letterhead:", err);
      if (err.message === 'WORD_NOT_SUPPORTED') {
        showErrorToast('Word file is not supported for letterhead. Please upload a PDF or image file.');
      } else {
        showErrorToast("Failed to process file. Please try a different format or an image.");
      }
    } finally {
      event.target.value = ''; // Reset input
    }
  };

  const handleRemoveLetterhead = () => {
    setUploadedLetterhead(null);
    setSelectedFormat('FormatOne');
    showSuccessToast('Letterhead removed');
  };

  // Listen for business changes and refetch
  useEffect(() => {
    const handleBusinessChange = () => {
      const newBusinessId = localStorage.getItem("selectedBusinessId");
      if (newBusinessId !== currentBusinessId) {
        setCurrentBusinessId(newBusinessId);

        const loadNewBusinessData = async () => {
          try {
            const response = await businessAPI.getById(newBusinessId);
            if (response.success) {
              setBusinessData(response.data);
            }
          } catch (error) {
            console.error('Error loading new business data:', error);
          }
        };
        loadNewBusinessData();

        setViewMode('list');
        navigate('/purchaseOrder');

        const fetchNewOrders = async () => {
          try {
            setLoading(true);
            const response = await purchaseOrderAPI.getAll(newBusinessId);
            if (response.success) {
              const transformedData = response.data.map(order => ({
                id: order.purchase_order_number,
                dbId: order.id,
                date: order.order_date,
                updatedDate: order.updated_date,
                partyName: order.party_name,
                party_id: order.party_id,
                bank_id: order.bank_id,
                business_id: order.business_id,
                amount: parseFloat(order.grand_total || order.total_amount || 0),
                status: order.status,
                totalQty: (order.order_data?.lines || []).reduce((sum, ln) => sum + Number(ln.qty || ln.quantity || 0), 0),
                due_date: order.due_date || order.valid_until || order.expiry_date || order.expected_delivery_date || order.meta?.dueDate || order.order_data?.dueDate || order.order_data?.due_date,
                notes: order.notes || order.order_data?.notes || order.meta?.notes,
                level1_email: order.level1_email || '',
                level2_email: order.level2_email || '',
                level3_email: order.level3_email || '',
                approver_sequence: order.approver_sequence || '',
                approved_by: order.approved_by || '',
                meta: order.order_data || {}
              }));
              setRows(transformedData);
            } else {
              setRows([]);
            }
          } catch (error) {
            setRows([]);
          } finally {
            setLoading(false);
          }
        };
        fetchNewOrders();
      }
    };

    window.addEventListener('storage', handleBusinessChange);
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, [currentBusinessId, viewMode]);

  // Load purchase orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const selectedBusinessId = localStorage.getItem('selectedBusinessId');
        const response = await purchaseOrderAPI.getAll(selectedBusinessId);

        if (response.success) {
          const transformedData = response.data.map(order => ({
            id: order.purchase_order_number,
            dbId: order.id,
            date: order.order_date,
            updatedDate: order.updated_date,
            partyName: order.party_name,
            party_id: order.party_id,
            bank_id: order.bank_id,
            business_id: order.business_id,
            amount: parseFloat(order.grand_total || order.total_amount || 0),
            status: order.status,
            po_agreement_number: order.po_agreement_number || '',
            remark: order.remark || '',
            totalQty: (order.order_data?.lines || []).reduce((sum, ln) => sum + Number(ln.qty || ln.quantity || 0), 0),
            level1_email: order.level1_email || '',
            level2_email: order.level2_email || '',
            level3_email: order.level3_email || '',
            approver_sequence: order.approver_sequence || '',
            approved_by: order.approved_by || '',
            meta: order.order_data || {}
          }));
          setRows(transformedData);
        } else {
          throw new Error(response.message || 'API call failed');
        }
      } catch (error) {
        console.error('Error loading purchase orders:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'list' || viewMode === 'preview') {
      loadOrders();
    }
  }, [viewMode, refreshKey]);




  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);

    let list = rows.filter((r) => {
      let dateOk = true;
      if (bounds && (bounds.start || bounds.end)) {
        // Parse the row date as a local date (YYYY-MM-DD + T00:00:00)
        const d = new Date(String(r.date).split('T')[0] + 'T00:00:00');
        const s = bounds.start ? new Date(bounds.start) : null;
        const e = bounds.end ? new Date(bounds.end) : null;
        if (s) s.setHours(0, 0, 0, 0);
        if (e) e.setHours(23, 59, 59, 999);

        if (s && e) dateOk = d >= s && d <= e;
        else if (s) dateOk = d >= s;
        else if (e) dateOk = d <= e;
      }
      const partyName = r.partyName ? String(r.partyName).toLowerCase() : '';
      const id = r.id ? String(r.id).toLowerCase() : '';
      const matchSearch = !q || partyName.includes(q) || id.includes(q);
      return dateOk && matchSearch;
    });

    list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const A = sort.key === 'date' ? new Date(a[sort.key]) : a[sort.key];
      const B = sort.key === 'date' ? new Date(b[sort.key]) : b[sort.key];

      if (sort.key === 'amount') return (A - B) * dir;
      if (sort.key === 'date') return (A - B) * dir;

      return String(A).localeCompare(String(B)) * dir;
    });

    return list;
  }, [rows, query, status, sort, dateRangeLabel, customRange]);

  // Navigate to create view
  const handleCreateClick = () => {
    setEditingRow(null);
    navigate('/purchaseOrder?mode=create');
  };

  // Handle save for CREATE
  const handleFormSaveForCreate = async (orderData) => {
    try {
      const orderPayload = {
        ...orderData,
        order_data: orderData.purchase_order_data || orderData.order_data || orderData.meta
      };

      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseOrderAPI.create({ ...orderPayload, business_id: businessId });

      if (response.success) {
        showSuccessToast(`Purchase Order ${orderPayload.purchase_order_number} created successfully`);
        localStorage.removeItem('purchaseOrderViewMode');
        navigate('/purchaseOrder');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'purchase_order_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to create purchase order');
      }
    } catch (err) {
      console.error('Error creating purchase order:', err);
      // Re-throw error so form can handle it
      throw err;
    }
  };

  // Navigate to edit view
  const handleEditClick = async (row) => {
    //  Pre-fetch terms & conditions to ensure they load correctly in QuotationForm
    let termsSections = [];
    try {
      const dbId = row.dbId || row.id;
      const termsResponse = await termsConditionsAPI.getByPurchaseOrderId(dbId);
      if (termsResponse.success && termsResponse.data && termsResponse.data.length > 0) {
        termsSections = termsResponse.data.map(t => ({
          id: t.id,
          heading: t.heading,
          content: t.content,
          is_locked: !!t.is_locked,
          section_order: t.section_order
        }));
      }
    } catch (error) {
      console.error('Error pre-fetching terms for edit:', error);
    }

    const rawLines = Array.isArray(row.meta?.lines) ? row.meta.lines : Array.isArray(row.lines) ? row.lines : [];
    const normalizedLines = rawLines.map((ln, i) => ({
      id: ln.id || `ln-${i}-${Date.now()}`,
      description: ln.description || ln.name || '',
      subtitle: ln.subtitle || '',
      qty: ln.qty ?? ln.quantity ?? 0,
      price: ln.price || ln.amount || 0,
      hsn: ln.hsn || ln.hsnCode || ln.hsn_code || '',
      code: ln.code || ln.item_code || '',
      unit: ln.unit || 'PCS',
      taxType: ln.taxType || ln.tax_type || 'none',
      gstRate: ln.gstRate || ln.gst_rate || 0,
      cgstPct: ln.cgstPct || ln.cgst_pct || 0,
      sgstPct: ln.sgstPct || ln.sgst_pct || 0,
      igstPct: ln.igstPct || ln.igst_pct || 0,
      vatPct: ln.vatPct || ln.vat_pct || 0,
      discountPct: ln.discountPct || ln.discount_pct || 0,
      image_url: ln.image_url || ''
    }));

    const initialData = {
      id: row.dbId || row.id, // Add id for edit mode detection
      purchase_order_number: row.id, // Map id to purchase_order_number for form
      order_date: row.date, // Map date to order_date for form
      dbId: row.dbId || row.id,
      date: row.date,
      updatedDate: row.updatedDate,
      partyName: row.partyName,
      party_name: row.partyName, // Include party_name for form
      party_id: row.party_id, // Include party_id
      bank_id: row.bank_id, // Include bank_id
      amount: row.amount,
      grand_total: row.amount, // Include grand_total
      status: row.status,
      po_agreement_number: row.po_agreement_number || '',
      remark: row.remark || '',
      level1_email: row.level1_email || '',
      level2_email: row.level2_email || '',
      level3_email: row.level3_email || '',
      approver_sequence: row.approver_sequence || '',
      approved_by: row.approved_by || '',
      type: 'purchaseOrder',
      meta: {
        invoiceNo: row.id,
        ...(row.meta || {}),
        lines: normalizedLines,
        remark: row.remark || '',
        paymentTerms: row.meta?.paymentTerms ?? 30,
        billing_address: row.meta?.billing_address,
        city: row.meta?.city,
        state: row.meta?.state,
        pincode: row.meta?.pincode,
        country: row.meta?.country,
        shipping_address: row.meta?.shipping_address,
        ship_city: row.meta?.ship_city,
        ship_state: row.meta?.ship_state,
        ship_pincode: row.meta?.ship_pincode,
        ship_country: row.meta?.ship_country,
        selectedBillingIndex: row.meta?.selectedBillingIndex,
        selectedShippingIndex: row.meta?.selectedShippingIndex,
        terms_sections: termsSections,
        terms: termsSections.map(s => s.content.replace(/<[^>]*>?/gm, "")).join("\n")
      },
    };

    setEditingRow({ sourceRow: row, initialData });
    localStorage.setItem('editingPurchaseOrderRow', JSON.stringify({ sourceRow: row, initialData }));
    navigate(`/purchaseOrder?mode=edit&id=${row.id}`);
  };

  // Handle save for EDIT
  const handleFormSaveForEdit = async (orderData) => {
    try {
      if (!editingRow || !editingRow.sourceRow) {
        await handleFormSaveForCreate(orderData);
        return;
      }

      const orderPayload = {
        ...orderData,
        order_data: orderData.purchase_order_data || orderData.order_data || orderData.meta
      };

      const dbId = editingRow.sourceRow.dbId || editingRow.sourceRow.id;
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseOrderAPI.update(dbId, orderPayload, businessId);

      if (response.success) {
        setEditingRow(null);
        localStorage.removeItem('editingPurchaseOrderRow');
        showSuccessToast(`Purchase Order updated successfully`);
        localStorage.removeItem('purchaseOrderViewMode');
        navigate('/purchaseOrder');
      } else {
        // Check if it's a duplicate number error
        if (response.code === 'DUPLICATE_NUMBER') {
          const error = new Error(response.message);
          error.code = 'DUPLICATE_NUMBER';
          error.field = 'purchase_order_number';
          throw error;
        }
        throw new Error(response.message || 'Failed to update purchase order');
      }
    } catch (err) {
      console.error('Error updating purchase order:', err);
      // Re-throw error so form can handle it
      throw err;
    }
  };

  // Delete confirmation
  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const dbId = itemToDelete.dbId || itemToDelete.id;
    const businessId = localStorage.getItem('selectedBusinessId');

    try {
      showLoadingModal('Deleting purchase order...');
      const response = await purchaseOrderAPI.delete(dbId, businessId);

      if (response.success) {
        showSuccessToast(`${itemToDelete.id} deleted successfully`);

        const fetchResponse = await purchaseOrderAPI.getAll(businessId);
        if (fetchResponse.success) {
          const transformedData = fetchResponse.data.map(order => ({
            id: order.purchase_order_number,
            dbId: order.id,
            date: order.order_date,
            updatedDate: order.updated_date,
            partyName: order.party_name,
            party_id: order.party_id,
            bank_id: order.bank_id,
            business_id: order.business_id,
            amount: parseFloat(order.grand_total || order.total_amount || 0),
            status: order.status,
            po_agreement_number: order.po_agreement_number || '',
            remark: order.remark || '',
            totalQty: (order.order_data?.lines || []).reduce((sum, ln) => sum + Number(ln.qty || ln.quantity || 0), 0),
            meta: order.order_data || {}
          }));
          setRows(transformedData);
        }
      } else {
        throw new Error(response.message || 'Failed to delete purchase order');
      }
      closeModal();
      setDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (err) {
      console.error('Error deleting purchase order:', err);
      closeModal();
      showErrorToast(err?.message || 'Could not delete purchase order.');
    }
  };

  const handleBack = () => {
    setEditingRow(null);
    setViewMode('list');
    navigate('/purchaseOrder');
  };



  // Handle setting default format
  const handleSetDefaultFormat = async (option) => {
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      if (!businessId) return;

      const response = await businessAPI.update(businessId, {
        default_format: option.id
      });

      if (response.success) {
        showSuccessToast(`${option.label} set as global default format`);
        // Update local business data state
        setBusinessData(prev => ({
          ...prev,
          default_format: option.id
        }));
      } else {
        showErrorToast('Failed to set default format');
      }
    } catch (error) {
      console.error('Error setting default format:', error);
      showErrorToast('Something went wrong');
    }
  };

  const PurchaseOrderPreviewHeader = () => (
    <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { setViewMode('list'); setPreviewPurchaseOrder(null); }} className="hidden sm:flex group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>
          <button onClick={() => { setViewMode('list'); setPreviewPurchaseOrder(null); }} className="sm:hidden group p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          </button>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
            PO-Preview - {previewPurchaseOrder.id || previewPurchaseOrder.purchase_order_number}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CustomPreviewDropdown
            options={Object.entries(pdfFormats).map(([key, format]) => ({
              id: key,
              label: format.label
            }))}
            value={selectedFormat}
            onChange={(option) => setSelectedFormat(option.id)}
            placeholder="Select Format"
            className="w-28 sm:w-32 h-8"
            valueBy="id"
            defaultOptionId={businessData?.default_format}
            onSetDefault={handleSetDefaultFormat}
          />
          <div className="relative">
            <input type="file" id="letterhead-upload" accept="application/pdf, .pdf, image/*" onChange={handleLetterheadUpload} className="hidden" />
            <label htmlFor="letterhead-upload" className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#f59e0b] to-[#f97316] hover:from-[#f59e0b]/90 hover:to-[#f97316]/90 text-white rounded-[7px] text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap cursor-pointer" title="Upload Letterhead">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden md:inline">Upload Letterhead</span>
              <span className="hidden sm:inline md:hidden">Upload</span>
            </label>
          </div>
          {uploadedLetterhead && (
            <button onClick={handleRemoveLetterhead} className="h-8 w-8 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#ef4444]/90 hover:to-[#dc2626]/90 text-white rounded-[7px] transition-all duration-200 focus:outline-none flex items-center justify-center" title="Remove Letterhead">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

        </div>
      </div>
    </div>
  );

  if (loading && viewMode === 'list') {
    return <MainLoader message="Loading purchase orders..." />;
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <QuotationForm
        onSave={viewMode === 'edit' ? handleFormSaveForEdit : handleFormSaveForCreate}
        onBack={handleBack}
        initialData={editingRow?.initialData || editingRow || {}}
        formTitle={viewMode === 'edit' ? "Update Purchase Order" : "Create Purchase Order"}
        showTopActions={true}
        showBottomActions={true}
        saveLabel={viewMode === 'edit' ? "Update Purchase Order" : "Create Purchase Order"}
        cancelLabel="Cancel"
        billToLabel="Supplier / Service Provider"
        showBankDetails={true}
        currency={currency}
      />
    );
  }

  // Preview page render
  if (viewMode === 'preview' && previewPurchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex flex-col">
        <PurchaseOrderPreviewHeader />
        <div className="flex flex-1 pt-16">
          <TemplateSidebar
            documents={rows}
            selectedDocument={previewPurchaseOrder}
            onSelect={(doc) => {
              setPreviewPurchaseOrder(doc);
            }}
            title="Purchase Order"
            documentType="purchaseOrder"
            currency={currency}
          />
          <div className="flex-1 overflow-y-auto pt-4 p-6 bg-white min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-7xl mx-auto">
              {previewData ? (() => {
                const formatObj = pdfFormats[selectedFormat] || pdfFormats['FormatOne'] || Object.values(pdfFormats)[0];
                const SelectedFormat = formatObj.component;
                return <SelectedFormat data={previewData} />;
              })() : (
                <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border-gray-200 mt-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Preparing document preview...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'id',
      title: 'Order Number',
      sortable: true,
      render: (r) => (
        <span className="text-sm text-gray-700">{r.id}</span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (r) => formatDate(r.date)
    },
    {
      key: 'partyName',
      title: 'Supplier Name',
      sortable: true
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (r) => formatCurrencyDisplay(r.amount),
      tdClass: 'text-right'
    },
  ];

  return (
    <div className="custombackground min-h-screen w-full border-1 border-yellow-200 rounded-xl mt-4">
      <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4 relative z-50">
        <div className="w-full">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between w-full">
              <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
              <button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
                New
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="PO-0000 or Party Name"
              className="w-full h-8 px-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
              aria-label="Search"
            />
            <div className="flex items-center gap-2 w-full justify-end">
              <Date_wise_Filter_Button
                dateRangeLabel={dateRangeLabel}
                onRangeChange={(val) => setDateRangeLabel(val)}
                customRange={customRange}
                onRangeApply={(range) => {
                  setCustomRange(range);
                  setDateRangeLabel("Custom Date Range");
                }}
              />
              <button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                aria-label="Create new"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Layout - Between aligned */}
          <div className="hidden md:flex md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
            <DashboardBackButton />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#129046] transition-colors" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="PO-0000 or Party Name"
                    className="w-48 h-8 pl-9 pr-3 py-1 border border-gray-300 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                    aria-label="Search"
                  />
                </div>

                <button
                  onClick={() => navigate('/purchaseRequisition')}
                  className="flex items-center gap-2 px-4 h-9 text-sm font-bold text-[#005ea2] bg-[#f0f7ff] hover:bg-[#e0efff] rounded-xl border border-[#005ea2]/10 transition-all shadow-sm"
                  title="View Purchase Requisitions"
                >
                  <ClipboardList size={18} className="text-[#005ea2]" />
                  <span>PR List</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Date_wise_Filter_Button
                  dateRangeLabel={dateRangeLabel}
                  onRangeChange={(val) => setDateRangeLabel(val)}
                  customRange={customRange}
                  onRangeApply={(range) => {
                    setCustomRange(range);
                    setDateRangeLabel("Custom Date Range");
                  }}
                />


                <button
                  onClick={handleCreateClick}
                  className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                  aria-label="Create new"
                >
                  <Plus size={18} />
                  New
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!loading && rows.length === 0 && viewMode === "list" && (
        <GeneralEmptyState
          title="No Purchase Orders Found"
          description="You haven't created any purchase orders yet. Start by creating your first purchase order."
          buttonText="Create First Purchase Order"
          onButtonClick={handleCreateClick}
          icon={FileText}
        />
      )}


      {rows.length > 0 && viewMode === "list" && (
        <div className="">
          <ReusableTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id}
            initialPageSize={10}
            onRowClick={(row) => { setPreviewPurchaseOrder(row); setViewMode('preview'); }}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            sortState={sort}
            onSortChange={setSort}
            extraActions={(row) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookInvoice(row);
                }}
                className="action-button invoice"
                title="Book Invoice"
              >
                <FaFileInvoice size={14} />
              </button>
            )}
          />
        </div>
      )}


      <BookInvoiceModal
        open={!!bookingPo}
        poData={bookingPo}
        onClose={() => setBookingPo(null)}
        onSuccess={() => {
          setBookingPo(null);
          setRefreshKey(k => k + 1);
          showSuccessToast('Sales Invoice booked successfully!');
        }}
        currency={currency}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.id || ""}
        itemType="purchase order"
      />
    </div>
  );
}
