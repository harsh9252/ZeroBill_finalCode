import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  User,
  Package,
  Hash,
  FileText,
  Paperclip,
  Mail,
  CheckCircle,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  PlusCircle,
  Search,
  Building,
  Edit3,
  ChevronDown,
  Upload,
  SearchIcon
} from 'lucide-react';
import {
  termsConditionsAPI,
  supplierAPI,
  purchaseRequisitionAPI,
  inventoryAPI,
  approvalWorkflowAPI,
} from '../../../utils/api';
import { subUserService } from '../../../services/subUserService';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal, showErrorModal, showPremiumInputDialog } from "../../../Components/ActionMessageModel.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import { getUnitOptions } from "../../../utils/dropdownOptions.js";
import { convertAmount, getCurrencySymbol, convertToINR, convertFromINR } from "../../../utils/currency.js";
import Swal from 'sweetalert2';

const STANDARD_UNITS = [
  'PCS', 'NOS', 'KGS', 'LTR', 'MTR', 'BOX', 'SET', 'PAC', 'GMS', 'ML',
  'PRS', 'ROL', 'BTL', 'CAN', 'FT', 'IN', 'SQF', 'SQM', 'YDS', 'TBS', 'CMS'
];


const MultiEmailChipInput = ({ value, onChange, suggestions = [], placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const emails = useMemo(() => value ? value.split(',').map(e => e.trim()).filter(e => e) : [], [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = (email) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !emails.includes(trimmed) && validateEmail(trimmed)) {
      const newEmails = [...emails, trimmed];
      onChange(newEmails.join(', '));
      setInputValue('');
      setShowSuggestions(false);
    } else if (trimmed && !validateEmail(trimmed)) {
      showErrorToast("Please enter a valid email address");
    }
  };

  const removeEmail = (index) => {
    const newEmails = emails.filter((_, i) => i !== index);
    onChange(newEmails.join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const filteredSuggestions = useMemo(() => {
    const term = inputValue.toLowerCase();
    return suggestions.filter(s =>
      !emails.includes(s.email.toLowerCase()) &&
      (s.email.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [suggestions, emails, inputValue]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className="w-full p-2.5 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent bg-gray-50/30 min-h-[50px] flex flex-wrap gap-2 items-center transition-all cursor-text"
        onClick={() => {
          const el = document.getElementById('email-input');
          if (el) el.focus();
        }}
      >
        <AnimatePresence mode="popLayout">
          {emails.map((email, idx) => (
            <motion.span
              key={email}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm flex items-center gap-2 font-bold border border-green-200 shadow-sm"
            >
              <Mail className="w-3 h-3" />
              {email}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeEmail(idx); }}
                className="hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-green-200"
              >
                <X size={14} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          id="email-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={emails.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent outline-none text-sm min-w-[200px] font-medium py-1"
          autoComplete="off"
        />
      </div>

      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-50 bg-gray-50/50">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</span>
            </div>
            {filteredSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addEmail(s.email)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-green-50 transition-colors border-b last:border-0 border-gray-50 text-left group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700 group-hover:text-green-700">{s.name}</span>
                  <span className="text-xs text-gray-500 group-hover:text-green-600">{s.email}</span>
                </div>
                <PlusCircle className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PurchaseRequisitionForm = ({ prId, onClose, onRefresh, currency }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    pr_number: '',
    pr_date: new Date().toISOString().split('T')[0],
    requester: '',
    item_services: '', // Fallback for single item (first item)
    qty: '',           // Fallback
    uom: '',           // Fallback
    comments: '',
    status: 'pending',
    po_number: '',
    approvers: '',
    level1_email: '',
    level2_email: '',
    level3_email: ''
  });
  const [items, setItems] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [workflowSettings, setWorkflowSettings] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [customUnits, setCustomUnits] = useState(() => {
    const saved = localStorage.getItem('customUnits');
    return saved ? JSON.parse(saved) : [];
  });
  const [subUsers, setSubUsers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const prevCurrencyRef = useRef(currency);

  // Initial load effect — runs when prId changes
  useEffect(() => {
    if (prId) {
      fetchPRDetails();
    } else {
      fetchNextNumber();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const requesterName = user.name || (user.firstName ? (user.firstName + (user.lastName ? ' ' + user.lastName : '')) : '');
      if (requesterName) {
        setFormData(prev => ({ ...prev, requester: requesterName }));
      }
    }
    fetchProducts();
    fetchSubUsers();
    fetchWorkflowSettings();
  }, [prId]);

  // Currency change effect — re-converts all existing item prices
  useEffect(() => {
    const oldCurrency = prevCurrencyRef.current;
    prevCurrencyRef.current = currency;

    if (oldCurrency === currency) return; // no change on first mount

    // For edit mode: re-fetch from backend (prices stored in INR)
    if (prId) {
      fetchPRDetails();
    }

    // Re-convert prices already in items state (create mode or stale edit state)
    setItems(prev =>
      prev.map(item => {
        const priceInINR = convertToINR(parseFloat(item.price) || 0, oldCurrency);
        const newPrice = convertFromINR(priceInINR, currency);
        const qty = parseFloat(item.qty) || 0;
        return {
          ...item,
          price: newPrice.toFixed(2),
          amount: (qty * newPrice).toFixed(2),
        };
      })
    );

    // Re-fetch products catalogue with new currency
    fetchProducts();
  }, [currency]);

  const fetchWorkflowSettings = async () => {
    try {
      const selectedBusinessId = localStorage.getItem('selectedBusinessId');
      if (!selectedBusinessId) return;
      const response = await approvalWorkflowAPI.getWorkflow('purchase_requisition', selectedBusinessId);
      if (response.success && response.data && response.data.length > 0) {
        setWorkflowSettings(response.data);
      } else {
        setWorkflowSettings(null);
      }
    } catch (err) {
      console.error('Error fetching workflow settings:', err);
    }
  };

  const fetchSubUsers = async () => {
    try {
      const res = await subUserService.getSubUsers();
      if (res.success) {
        setSubUsers(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching sub-users:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const selectedBusinessId = localStorage.getItem('selectedBusinessId');
      if (!selectedBusinessId) {
        setLoadingProducts(false);
        return;
      }

      const res = await inventoryAPI.getAll(selectedBusinessId);
      if (res.success && res.data) {
        const mappedProducts = res.data.map((product) => ({
          id: product.id,
          name: product.item_name,
          code: product.item_code || product.hsn_code,
          hsn: product.hsn_code || "",
          salesPrice: convertFromINR(parseFloat(product.sale_price) || 0, currency),
          purchasePrice: convertFromINR(parseFloat(product.purchase_price) || 0, currency),
          qty: "",
          stockQuantity: (product.current_stock ?? product.opening_stock) ?? 0,
          stockUnit: product.unit || "PCS",
          subtitle: product.description || product.category || "",
          image_url: product.image_url,
        }));
        setProducts(mappedProducts);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getFilePreview = (file) => {
    if (typeof file === 'string') {
      // Ensure file path starts with / if it doesn't already
      const filePath = file.startsWith('/') ? file : `/${file}`;
      // Check if backend URL ends with / and fix accordingly
      const baseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '');
      return `${baseUrl}${filePath}`;
    }
    return URL.createObjectURL(file);
  };

  const isImage = (file) => {
    const fileName = typeof file === 'string' ? file : file.name;
    return fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/);
  };

  const isPDF = (file) => {
    const fileName = typeof file === 'string' ? file : file.name;
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const fetchPRDetails = async () => {
    try {
      setLoading(true);
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseRequisitionAPI.getById(prId, businessId);
      if (response.success) {
        setFormData({
          ...response.data,
          pr_date: response.data.pr_date ? new Date(response.data.pr_date).toISOString().split('T')[0] : ''
        });
        if (response.data.items && response.data.items.length > 0) {
          const convertedItems = response.data.items.map(item => ({
            ...item,
            price: convertFromINR(item.price || 0, currency).toFixed(2),
            amount: convertFromINR(item.amount || 0, currency).toFixed(2)
          }));
          setItems(convertedItems);
        } else if (response.data.item_services) {
          setItems([{
            description: response.data.item_services,
            qty: response.data.qty || '',
            uom: response.data.uom || ''
          }]);
        }

        if (response.data.attachment) {
          // Check if it's a JSON array or a single string
          try {
            const parsed = JSON.parse(response.data.attachment);
            setExistingAttachments(Array.isArray(parsed) ? parsed : [response.data.attachment]);
          } catch (e) {
            setExistingAttachments([response.data.attachment]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching PR details:', error);
      Swal.fire('Error', 'Failed to fetch PR details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNumber = async () => {
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      const response = await purchaseRequisitionAPI.getNextNumber(businessId);
      if (response.success) {
        setFormData(prev => ({ ...prev, pr_number: response.data.pr_number }));
      }
    } catch (error) {
      console.error('Error fetching PR number:', error);
    }
  };

  const getActiveSequence = () => {
    if (formData.approver_sequence) {
      return formData.approver_sequence.split(',').map((email, idx) => ({
        level_number: idx + 1,
        approver_email: email.trim()
      }));
    }
    if (workflowSettings && workflowSettings.length > 0) {
      return workflowSettings;
    }
    // Fallback legacy levels
    const levels = [];
    if (formData.level1_email) levels.push({ level_number: 1, approver_email: formData.level1_email });
    if (formData.level2_email) levels.push({ level_number: 2, approver_email: formData.level2_email });
    if (formData.level3_email) levels.push({ level_number: 3, approver_email: formData.level3_email });
    return levels;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleLevelStatusChange = (level, status) => {
    const email = formData[`level${level}_email`]?.toLowerCase().trim();
    if (!email) {
      showErrorToast(`Please enter an email for Level ${level} first`);
      return;
    }

    let currentApproved = formData.approved_by ? formData.approved_by.split(',').map(e => e.trim().toLowerCase()).filter(e => e) : [];

    if (status === 'approved') {
      if (!currentApproved.includes(email)) {
        currentApproved.push(email);
      }
    } else {
      currentApproved = currentApproved.filter(e => e !== email);
    }

    setFormData(prev => {
      const levels = [
        prev.level1_email ? prev.level1_email.toLowerCase().trim() : null,
        prev.level2_email ? prev.level2_email.toLowerCase().trim() : null,
        prev.level3_email ? prev.level3_email.toLowerCase().trim() : null
      ].filter(e => e);

      const isFullyApproved = levels.length > 0 && levels.every(email => currentApproved.includes(email));

      return {
        ...prev,
        approved_by: currentApproved.join(','),
        status: isFullyApproved ? 'completed' : 'pending'
      };
    });
  };

  const addItem = () => {
    setItems([...items, { description: '', qty: '', uom: '', price: '', amount: 0 }]);
  };

  const handleSelectProductsDone = (selectedItems) => {
    const newItems = selectedItems.map(si => {
      const price = si.purchasePrice || si.salesPrice || 0;
      const qty = si.qty || '';
      return {
        description: si.name || si.description || '',
        qty: qty,
        uom: si.unit || '',
        price: price,
        amount: qty * price
      };
    });

    const filteredCurrentItems = items.filter(item => item.description.trim() !== '' || item.qty !== '');
    setItems([...filteredCurrentItems, ...newItems]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    if (field === 'uom' && value === 'CUSTOM_ENTRY') {
      Swal.fire({
        title: 'Add Custom Unit',
        text: 'Enter the unit name (e.g., PACK, BAG)',
        input: 'text',
        inputValue: '',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Add Unit',
        inputValidator: (val) => {
          if (!val) return 'Please enter a unit name';
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const customUnit = result.value.toUpperCase().trim();

          // Add to custom units list if unique
          if (!STANDARD_UNITS.includes(customUnit) && !customUnits.includes(customUnit)) {
            const updatedCustom = [...customUnits, customUnit];
            setCustomUnits(updatedCustom);
            localStorage.setItem('customUnits', JSON.stringify(updatedCustom));
          }

          const newItems = [...items];
          newItems[index][field] = customUnit;
          setItems(newItems);
        } else {
          const newItems = [...items];
          newItems[index][field] = '';
          setItems(newItems);
        }
      });
      return;
    }
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-calculate amount
    if (field === 'qty' || field === 'price') {
      const q = parseFloat(newItems[index].qty) || 0;
      const p = parseFloat(newItems[index].price) || 0;
      newItems[index].amount = q * p;
    }

    setItems(newItems);
  };

  const grandTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const totalCount = existingAttachments.length + attachments.length + files.length;
    if (totalCount > 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Attachment Limit Exceeded',
        text: 'You can upload a maximum of 5 attachments per Purchase Requisition.',
        confirmButtonColor: '#2563EB'
      });
      // Add only files up to the limit of 5
      const allowedCount = 5 - (existingAttachments.length + attachments.length);
      if (allowedCount > 0) {
        setAttachments(prev => [...prev, ...files.slice(0, allowedCount)]);
      }
    } else {
      if (files.length > 0) {
        setAttachments(prev => [...prev, ...files]);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index, isExisting = false) => {
    if (isExisting) {
      setExistingAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.requester || items.length === 0 || items.some(it => !it.description)) {
      Swal.fire('Warning', 'Please fill all required fields and add at least one item', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.level1_email && !emailRegex.test(formData.level1_email)) {
      Swal.fire('Warning', 'Please enter a valid email for Level 1 Approver', 'warning');
      return;
    }
    if (formData.level2_email && !emailRegex.test(formData.level2_email)) {
      Swal.fire('Warning', 'Please enter a valid email for Level 2 Approver', 'warning');
      return;
    }
    if (formData.level3_email && !emailRegex.test(formData.level3_email)) {
      Swal.fire('Warning', 'Please enter a valid email for Level 3 Approver', 'warning');
      return;
    }

    if (formData.status === 'completed' && !formData.po_number) {
      Swal.fire('Warning', 'PO Number is required for completed PR', 'warning');
      return;
    }

    const totalAttachmentsCount = existingAttachments.length + attachments.length;
    if (totalAttachmentsCount > 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Attachment Limit Exceeded',
        text: 'You can upload a maximum of 5 attachments per Purchase Requisition.',
        confirmButtonColor: '#2563EB'
      });
      return;
    }

    try {
      setLoading(true);
      const businessId = localStorage.getItem('selectedBusinessId');
      const submitData = new FormData();

      const finalFormData = {
        ...formData,
        item_services: items[0].description,
        qty: items[0].qty,
        uom: items[0].uom,
        unit_price: convertToINR(items[0].price, currency),
        total_amount: convertToINR(grandTotal, currency),
        currency: currency,
        items: JSON.stringify(items.map(item => ({
          ...item,
          price: convertToINR(item.price, currency),
          amount: convertToINR(item.amount, currency)
        })))
      };

      Object.keys(finalFormData).forEach(key => {
        if (finalFormData[key] !== null && finalFormData[key] !== undefined) {
          submitData.append(key, finalFormData[key]);
        }
      });
      submitData.append('business_id', businessId);

      if (attachments.length > 0) {
        attachments.forEach(file => {
          submitData.append('attachments', file);
        });
      }
      submitData.append('existing_attachments', JSON.stringify(existingAttachments));

      let response;
      if (prId) {
        response = await purchaseRequisitionAPI.update(prId, submitData, businessId);
      } else {
        response = await purchaseRequisitionAPI.create(submitData);
      }

      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: prId ? 'PR updated successfully' : 'PR created successfully',
          timer: 1500,
          showConfirmButton: false
        });
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Error saving PR:', error);
      if (error.code === 'DUPLICATE_PR_NUMBER' || error.message?.toLowerCase().includes('already exists')) {
        setErrors(prev => ({ ...prev, pr_number: error.message || 'PR number already exists' }));
        // Also scroll to top to show the error
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        Swal.fire('Error', error.message || 'Failed to save Purchase Requisition', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50/30 pb-8 mt-6 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800" translate="no"><span translate="no">{prId ? 'Edit' : 'Create'}</span><span translate="no"> Purchase Requisition</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-red-500/20">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white px-7 py-2 rounded-xl flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-green-500/20 group">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              <span translate="no">Save</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-lg font-bold text-yellow-900">Purchase Requisition Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">PR Number *</label>
                <input
                  type="text"
                  name="pr_number"
                  value={formData.pr_number}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.pr_number ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50/30'} focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all`}
                  required
                />
                {errors.pr_number && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.pr_number}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date *</label>
                <input type="date" name="pr_date" value={formData.pr_date} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requester *</label>
                <input type="text" name="requester" value={formData.requester} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30" required />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-yellow-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-yellow-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Items / Services</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowProductModal(true)} className="px-3 py-2 sm:px-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-sm font-bold rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all shadow-md flex items-center gap-2">
                  <Plus size={16} /> <span className="hidden sm:inline">Add Products</span>
                </button>
                <button type="button" onClick={addItem} className="px-3 py-2 sm:px-4 bg-gradient-to-r from-[#f3c117] to-[#e6b800] text-white text-sm font-bold rounded-lg hover:from-[#f3c117]/90 hover:to-[#e6b800]/90 transition-all shadow-md flex items-center gap-2">
                  <Plus size={16} /> <span className="hidden sm:inline">Manual Entry</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-black">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">NO</th>
                    <th className="px-4 py-3 text-left">ITEM / SERVICES DESCRIPTION</th>
                    <th className="px-4 py-3 text-center w-24">QTY</th>
                    <th className="px-4 py-3 text-center w-32">UNIT (UOM)</th>
                    <th className="px-4 py-3 text-center w-32">UNIT PRICE</th>
                    <th className="px-4 py-3 text-center w-32">TOTAL</th>
                    <th className="px-4 py-3 text-center w-20">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400 font-medium bg-gray-50/20">
                        No items added yet — click "Add Products" or "Manual Entry" to add.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-center text-gray-500 font-medium"><span translate="no">{index + 1}</span></td>
                        <td className="px-4 py-4">
                          <textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            rows="1"
                            placeholder="Enter Item / Service description"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-2 focus:ring-[#129046]/10 outline-none resize-none transition-all"
                            required
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-sm focus:border-[#129046] focus:ring-2 focus:ring-[#129046]/10 outline-none transition-all font-bold text-[#129046]"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={item.uom}
                            onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-2 focus:ring-[#129046]/10 outline-none appearance-none bg-white cursor-pointer hover:bg-gray-50 transition-all font-medium"
                            required
                          >
                            <option value="">Select Unit</option>
                            {STANDARD_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            {customUnits.map(unit => (
                              <option key={unit} value={unit} className="text-blue-600 font-medium">{unit}</option>
                            ))}
                            {item.uom && !STANDARD_UNITS.includes(item.uom) && !customUnits.includes(item.uom) && item.uom !== 'CUSTOM_ENTRY' && (
                              <option value={item.uom}>{item.uom}</option>
                            )}
                            <option value="CUSTOM_ENTRY" className="font-bold text-[#129046] bg-green-50">+ Add Custom Unit</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-sm focus:border-[#129046] focus:outline-none font-bold"
                          />
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-gray-700">
                          <span translate="no">{getCurrencySymbol(currency)}{parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="inline-flex items-center justify-center w-9 h-9 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all"
                            title="Remove item"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50/50">
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-right font-bold text-gray-500 uppercase tracking-wider"><span translate="no">Estimated Grand Total</span></td>
                    <td className="px-4 py-4 text-center font-extrabold text-lg text-[#129046]">
                      <span translate="no">{getCurrencySymbol(currency)}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Scroll indicator */}
            <div className="sticky left-0 bottom-0 w-full py-2 bg-[#fdf8e4] border-t border-[#f1e6b9] text-center text-[11px] text-gray-600 font-bold">
              ← Scroll horizontally to see all fields →
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-6">
              <h2 className="text-lg font-bold text-yellow-900 pb-2 border-b border-gray-50">
                Approval Workflow
              </h2>

              {/* Dynamic Stepper Visuals */}
              {getActiveSequence().length > 0 && (formData.approver_sequence || (workflowSettings && workflowSettings.length > 0)) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                  {getActiveSequence().map((level, index) => {
                    const email = level.approver_email.trim().toLowerCase();
                    const approvedList = formData.approved_by ? formData.approved_by.split(',').map(e => e.trim().toLowerCase()).filter(e => e) : [];
                    const isApproved = approvedList.includes(email);
                    const isCurrent = !isApproved && (index === approvedList.length) && formData.status !== 'rejected';
                    const isRejected = formData.status === 'rejected' && !isApproved && (index === approvedList.length);
                    const isUpcoming = !isApproved && !isCurrent && !isRejected;

                    return (
                      <div key={level.level_number} className="flex flex-col items-center relative text-center">
                        {/* Perfect-alignment horizontal connector bridge */}
                        {index < getActiveSequence().length - 1 && (index + 1) % 3 !== 0 && (
                          <div className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-[2px] hidden md:block z-0 ${
                            isApproved ? 'bg-green-200' : 'bg-gray-100'
                          }`} />
                        )}

                        {/* Node circle */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shadow-sm relative z-10 ${
                            isApproved
                              ? 'bg-green-500 text-white ring-4 ring-green-100'
                              : isRejected
                                ? 'bg-red-500 text-white ring-4 ring-red-100'
                                : isCurrent
                                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                                  : 'bg-gray-100 text-gray-400 ring-4 ring-gray-50'
                          }`}
                        >
                          {isApproved ? '✓' : isRejected ? '✕' : level.level_number}
                        </div>

                        {/* Step Card Content */}
                        <div className={`w-full bg-white p-3.5 rounded-xl border transition-all mt-4 relative z-10 ${
                          isCurrent
                            ? 'border-amber-200 shadow-sm shadow-amber-500/5 bg-amber-50/10'
                            : 'border-gray-100/80 shadow-sm shadow-gray-50/5'
                        }`}>
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Level {level.level_number} Approver
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isApproved
                                  ? 'bg-green-50 text-green-600 border border-green-100'
                                  : isRejected
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : isCurrent
                                      ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-500/5'
                                      : 'bg-gray-50 text-gray-500 border border-gray-100'
                              }`}
                            >
                              {isApproved ? 'Approved' : isRejected ? 'Rejected' : isCurrent ? 'Pending Action' : 'Upcoming'}
                            </span>
                            <p className="text-xs font-normal text-gray-500 mt-1 truncate max-w-full" title={level.approver_email}>
                              {level.approver_email}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback legacy manual email inputs */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px]">1</div>
                      Level 1 Approver Email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        list="subuser-list"
                        name="level1_email"
                        value={formData.level1_email}
                        onChange={handleInputChange}
                        placeholder="Enter Level 1 approver email"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px]">2</div>
                      Level 2 Approver Email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        list="subuser-list"
                        name="level2_email"
                        value={formData.level2_email}
                        onChange={handleInputChange}
                        placeholder="Enter Level 2 approver email"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px]">3</div>
                      Level 3 Approver Email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        list="subuser-list"
                        name="level3_email"
                        value={formData.level3_email}
                        onChange={handleInputChange}
                        placeholder="Enter Level 3 approver email"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30"
                      />
                    </div>
                  </div>
                  <datalist id="subuser-list">
                    {subUsers.map(u => (
                      <option key={u.id} value={u.email}>{u.name}</option>
                    ))}
                  </datalist>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all font-bold">
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div> */}
                <AnimatePresence>
                  {formData.status === 'completed' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">PO Number *</label>
                      <input type="text" name="po_number" value={formData.po_number} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-green-300 bg-green-50 text-green-700 font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all" required />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-6">
              <h2 className="text-lg font-bold text-yellow-900 pb-2 border-b border-gray-50">Comments & Attachments</h2>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks / Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleInputChange} rows="2" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 font-medium outline-none transition-all bg-gray-50/30"></textarea>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Paperclip className="w-4 h-4 text-green-600" /> Attachment</label>
                <div className="flex flex-wrap gap-4">
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 hover:bg-green-50 hover:border-green-400 transition-all">
                      <Plus className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-gray-400 font-bold mt-1">Add File</span>
                    </div>
                  </label>

                  {/* Existing Attachments */}
                  {existingAttachments.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative group w-20 h-20">
                      <a
                        href={getFilePreview(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                        title="View Full Attachment"
                      >
                        {isImage(url) ? (
                          <img src={getFilePreview(url)} alt="preview" className="w-full h-full rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center">
                            {isPDF(url) ? <FileText className="w-8 h-8 text-orange-500" /> : <Paperclip className="w-8 h-8 text-blue-500" />}
                            <span className="text-[8px] mt-1 text-blue-600 font-bold uppercase truncate w-14 text-center">
                              {url.split('/').pop()}
                            </span>
                          </div>
                        )}
                      </a>
                      <button type="button" onClick={() => removeAttachment(idx, true)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10">
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* New Attachments */}
                  {attachments.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative group w-20 h-20">
                      <a
                        href={getFilePreview(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                        title="View Full Attachment"
                      >
                        {isImage(file) ? (
                          <img src={getFilePreview(file)} alt="preview" className="w-full h-full rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-green-50 border border-green-200 flex flex-col items-center justify-center">
                            {isPDF(file) ? <FileText className="w-8 h-8 text-orange-500" /> : <Paperclip className="w-8 h-8 text-green-500" />}
                            <span className="text-[8px] mt-1 text-green-600 font-bold uppercase truncate w-14 text-center">
                              {file.name}
                            </span>
                          </div>
                        )}
                      </a>
                      <button type="button" onClick={() => removeAttachment(idx, false)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ProductModal
        open={showProductModal}
        products={products}
        setProducts={setProducts}
        onClose={() => setShowProductModal(false)}
        onDone={handleSelectProductsDone}
        customUnits={customUnits}
        setCustomUnits={(u) => {
          setCustomUnits(u);
          localStorage.setItem('customUnits', JSON.stringify(u));
        }}
        currency={currency}
        loadingProducts={loadingProducts}
      />
    </motion.div>
  );
};

function ProductModal({
  open = false,
  products = [],
  setProducts = () => { },
  pageSize = 8,
  onClose = () => { },
  onDone = () => { },
  customUnits = [],
  setCustomUnits = () => { },
  currency = "INR",
  loadingProducts = false,
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [step, setStep] = useState("browse");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [bufferLines, setBufferLines] = useState([]);

  function updateProduct(id, patch) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  useEffect(() => {
    if (!open) return;
    setStep("browse");
    setBufferLines([]);
    setSelectedKeys(new Set());
    setPage(1);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return [];
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(qq) ||
        ((p.code || "") + "").toLowerCase().includes(qq),
    );
  }, [products, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItemsArr = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const keyFor = (p) => p.id || p.code || p.name;
  const allSelected = pageItemsArr.length > 0 && pageItemsArr.every(p => selectedKeys.has(keyFor(p)));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedKeys(prev => {
        const copy = new Set(prev);
        pageItemsArr.forEach(p => copy.delete(keyFor(p)));
        return copy;
      });
    } else {
      setSelectedKeys(prev => {
        const copy = new Set(prev);
        pageItemsArr.forEach(p => copy.add(keyFor(p)));
        return copy;
      });
    }
  }

  function toggleSelect(product) {
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      const key = keyFor(product);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
  }

  function handleAddSelected() {
    if (selectedKeys.size === 0) {
      showErrorToast("Select at least one product before adding");
      return;
    }
    const selectedProducts = products.filter((p) => selectedKeys.has(keyFor(p)));
    const itemsBatch = selectedProducts.map((p) => ({
      name: p.name,
      description: p.subtitle || p.name,
      qty: p.qty ?? '',
      unit: p.stockUnit || "PCS",
      salesPrice: p.salesPrice,
      purchasePrice: p.purchasePrice
    }));

    onDone(itemsBatch);
    onClose();
  }

  function updateBufferLine(id, patch) {
    setBufferLines((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  }

  function removeFromBuffer(id) {
    setBufferLines((b) => b.filter((x) => x.id !== id));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col scale-in-center">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white" translate="no">
            <span translate="no">{step === "browse" ? "Select Products" : "Review Selected Items"}</span>
          </h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search products by name or code"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-2 focus:ring-[#129046]/10 outline-none transition-all"
              />
            </div>
            {step === "browse" ? (
              <>
                <button
                  onClick={() => {
                    const newLine = {
                      id: `tmp-${Date.now()}-${Math.random()}`,
                      productId: null,
                      description: "",
                      subtitle: "",
                      hsn: "",
                      qty: 1,
                      unit: "PCS",
                      image_url: "",
                      stockQuantity: 0,
                    };
                    setBufferLines(prev => [newLine, ...prev]);
                    setStep("review");
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#f3c117] to-[#e6b800] text-white rounded-lg text-sm font-bold hover:shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Manual Entry
                </button>
                <button
                  onClick={handleAddSelected}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-sm font-bold hover:shadow-md transition-all flex items-center gap-2"
                >
                  <span translate="no">Add Selected ({selectedKeys.size})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep("browse")}
                  className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-bold transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    if (bufferLines.length === 0) { onClose(); return; }
                    onDone(bufferLines);
                    onClose();
                  }}
                  className="px-8 py-2.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  Next
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {step === "browse" ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-5 h-5 accent-[#129046]" />
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">ITEM NAME</th>
                    <th className="px-4 py-3 text-center w-32 font-bold text-gray-700">QTY</th>
                    <th className="px-4 py-3 text-center w-40 font-bold text-gray-700">UNIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-[#129046] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium" translate="no">Loading products...</p>
                        </div>
                      </td>
                    </tr>
                  ) : !q.trim() ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium" translate="no">Search for products to add</p>
                        <p className="text-sm" translate="no">Type a product name or code in the search bar above</p>
                      </td>
                    </tr>
                  ) : pageItemsArr.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-red-400" />
                        <p className="text-lg font-medium text-gray-600" translate="no">No products found matching "{q}"</p>
                        <p className="text-sm" translate="no">Try a different search term or add manually.</p>
                      </td>
                    </tr>
                  ) : (
                    pageItemsArr.map((p) => (
                      <tr key={keyFor(p)} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-4 text-center">
                          <input type="checkbox" checked={selectedKeys.has(keyFor(p))} onChange={() => toggleSelect(p)} className="w-5 h-5 accent-[#129046]" />
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-800">{p.name}</td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number"
                            value={p.qty ?? ""}
                            onChange={(e) => updateProduct(p.id, { qty: e.target.value })}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded text-center focus:border-[#129046] outline-none"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <select
                            value={p.stockUnit || "PCS"}
                            onChange={(e) => updateProduct(p.id, { stockUnit: e.target.value })}
                            className="w-32 px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-[#129046] bg-white cursor-pointer"
                          >
                            {STANDARD_UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <div className="inline-block min-w-full">
                <table className="min-w-[1000px] w-full text-sm">
                  <thead className="bg-[#f8f9fa] border-b border-gray-200">
                    <tr>

                      <th className="px-4 py-3 text-left min-w-[250px] font-bold text-gray-700">PRODUCT NAME</th>


                      <th className="px-4 py-3 text-center w-32 font-bold text-gray-700 text-[#129046]">QTY</th>
                      <th className="px-4 py-3 text-center w-40 font-bold text-gray-700">UNIT</th>
                      <th className="px-4 py-3 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bufferLines.map((bl) => (
                      <tr key={bl.id} className="hover:bg-gray-50/50 transition-colors">

                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={bl.description}
                            onChange={(e) => updateBufferLine(bl.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#129046] outline-none"
                            placeholder="Enter Item Name"
                          />
                        </td>


                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={bl.qty}
                            onChange={(e) => updateBufferLine(bl.id, { qty: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-[#129046] outline-none font-bold text-[#129046]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <select
                            value={bl.unit}
                            onChange={(e) => updateBufferLine(bl.id, { unit: e.target.value })}
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#129046] bg-white cursor-pointer"
                          >
                            {STANDARD_UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => removeFromBuffer(bl.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sticky left-0 bottom-0 w-full py-2 bg-[#fdf8e4] border-t border-[#f1e6b9] text-center text-[11px] text-gray-600 font-bold">
                ← Scroll horizontally to see all fields →
              </div>
            </div>
          )}
        </div>

        {step === "browse" && (
          <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500" translate="no">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} products
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



export default PurchaseRequisitionForm;
