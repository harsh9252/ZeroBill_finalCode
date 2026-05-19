// Inventory.withSweetAlert.jsx
// Full updated single-file component (Create/Edit modal, detail view, table, SweetAlert helpers)

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Search, Plus, Upload, X, ChevronDown, ArrowLeft, FileBarChart2, ChevronRight, ChevronLeft } from "lucide-react";
import ActionButtons from "../../../Components/ActionButtons.jsx";
import ReusableTable from "../../../Components/ReusableTable.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import GeneralEmptyState from "../../../Components/GeneralEmptyState.jsx";
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import { ITEM_TYPE_OPTIONS, UNIT_OPTIONS, GST_RATE_OPTIONS, PRICE_TAX_TYPE_OPTIONS, getUnitOptions, DEFAULT_UNIT_OPTIONS } from "../../../utils/dropdownOptions.js";
import { showSuccessToast, showErrorToast, showInfoToast, SuccessMessages, ErrorMessages, showConfirmationDialog, showPremiumInputDialog } from '../../../Components/ActionMessageModel.jsx';
import { getBackendURL, getApiURL, getImageURL } from '../../../utils/config.js';
import { formatCurrency, convertAmount, getCurrencySymbol, convertToINR, convertFromINR } from '../../../utils/currency.js';
import MainLoader from "../../../Components/MainLoader.jsx";
import { categoryAPI } from "../../../utils/api.js";
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";

/* ---------------- Internal helpers to satisfy Fast Refresh ---------------- */
const alertInfo = (text, title = "Info") => {
  return showInfoToast({ title, text });
};

const alertError = (text, title = "Error") => {
  return showErrorToast({ title, text });
};

const toastSuccess = (text) => {
  return showSuccessToast(text);
};

const toastError = (text) => {
  return showErrorToast(text);
};

const confirmAction = async ({
  title = "Are you sure?",
  text = "",
  confirmText = "Yes",
  cancelText = "Cancel",
  icon = "warning",
} = {}) => {
  return await showConfirmationDialog({
    title,
    text,
    icon,
    confirmText,
    cancelText
  });
};

const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
  } catch (e) {
    return "";
  }
};

/* ---------------- Icons (inline) ---------------- */
const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
    />
  </svg>
);




/* ---------------- Category Selector ---------------- */
function CategorySelectInput({ categories = [], onCreate, value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // Find the selected category name for display
  const selectedCategoryName = useMemo(() => {
    if (!value) return "";
    const cat = categories.find(c => String(c.id) === String(value));
    return cat ? cat.name : "";
  }, [value, categories]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filtered = categories.filter(
    (c) =>
      c && c.name && c.name.toLowerCase().includes(q.toLowerCase())
  );

  const handleClear = () => {
    onChange?.(null);
    setQ("");
    setOpen(false);
  };

  const handleCreateNew = async (nameOverride = null) => {
    const nameToUse = nameOverride || q.trim() || newCatName.trim();
    if (onCreate && nameToUse) {
      try {
        const response = await categoryAPI.create({ name: nameToUse });
        if (response.success) {
          onCreate(response.data);
          onChange?.(response.data.id);
          setQ("");
          setNewCatName("");
          setIsModalOpen(false);
          setOpen(false);
          toastSuccess("Category created successfully!");
        }
      } catch (error) {
        console.error("Error creating category:", error);
        toastError("Failed to create category");
      }
    }
  };

  return (
    <>
      <div className="relative w-full" ref={boxRef}>
        <div className="relative">
          <input
            ref={inputRef}
            value={open ? q : selectedCategoryName}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              setOpen(true);
              setQ("");
            }}
            onClick={() => setOpen(true)}
            placeholder="Search Categories"
            className={`w-full py-2 pr-8 rounded-lg focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none text-left bg-white text-sm cursor-pointer transition-all ${className || "h-10 px-4 border-2 border-gray-200"}`}
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-red-700 font-bold" strokeWidth={3} stroke="#b91c1c" />
            </button>
          )}
        </div>

        {open && (
          <div className="w-full absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-2xl overflow-hidden z-[1000] rounded-xl">
            <div className="max-h-48 overflow-y-auto">
              {/* All Categories Option */}
              <button
                onClick={() => {
                  onChange?.("");
                  setQ("");
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition-colors ${!value ? "bg-[#1fbe5a]/10 hover:bg-[#1fbe5a]/20" : "hover:bg-yellow-50"}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${!value ? "bg-[#1fbe5a]" : "bg-gray-400"}`} />
                <span className={`text-xs font-semibold ${!value ? "text-[#1fbe5a]" : "text-gray-900"}`}>
                  All Categories
                </span>
              </button>

              {filtered.length ? (
                filtered.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onChange?.(cat.id);
                      setQ("");
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition-colors ${value === cat.id
                      ? "bg-[#1fbe5a]/20 hover:bg-[#1fbe5a]/30"
                      : "hover:bg-yellow-50"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${value === cat.id ? "bg-[#1fbe5a]" : "bg-blue-500"}`} />
                    <span className="text-xs font-semibold text-gray-900">
                      {cat.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No categories found
                </div>
              )}


              {/* Separate Create Category button at the bottom - always visible if onCreate exists */}
              {onCreate && (
                <div className="border-t border-gray-100 sticky bottom-0 bg-white">
                  <button
                    onClick={() => {
                      if (q.trim()) {
                        handleCreateNew();
                      } else {
                        setNewCatName("");
                        setIsModalOpen(true);
                        setOpen(false);
                      }
                    }}
                    className="w-full text-left px-4 py-2 bg-[#1fbe5a]/10 hover:bg-[#1fbe5a]/20 font-semibold text-[#1fbe5a] flex items-center gap-2.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {q.trim() ? `Create "${q.trim()}"` : "Create New Category"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">New Category</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:rotate-90 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Name
              </label>
              <input
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                placeholder="e.g. Beverages, Stationery..."
                className="w-full h-11 px-4 border-2 border-gray-200 rounded-lg focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none transition-all text-sm"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateNew()}
                  disabled={!newCatName.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white font-bold text-sm shadow-md hover:shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Reusable empty state table ---------------- */
function EmptyTable({ headers }) {
  return (
    <div className="rounded-lg overflow-hidden bg-white">
      <div className="min-w-full">
        <div className="grid grid-cols-6 bg-yellow-200 text-yellow-900 text-sm font-medium">
          {headers.map((h, i) => (
            <div key={i} className="px-4 py-2">
              {h}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-16 text-gray-500 border border-yellow-200">
          <div className="flex flex-col items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="w-10 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
            >
              <path strokeWidth="2" d="M4 7h16M4 12h10M4 17h16" />
            </svg>
            <div>No details found for the selected time period</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Inventory Form Modal (create + edit) ---------------- */
function InventoryFormModal({
  open,
  onClose,
  categories,
  onCreateCategory,
  onCategoryCreated,
  onSubmit,
  initialItem = null,
  currency = "USD",
  formatCurrencyDisplay = (v) => v,
}) {
  const initial = {
    code: "",
    name: "",
    category_id: null,
    qty: "",
    purchasePrice: "",
    salePrice: "",
    lowStock: false,

    type: "product",
    serviceCode: "",
    gstRate: null,
    unit: "PCS",
    openingStock: "",

    // Opening / stock section extra fields
    itemCode: "",
    hsn: "",
    hasAltUnit: false,
    altUnit: "",
    altConvRate: "",
    asOfDate: "",
    lowStockQty: "",
    description: "",

    // Pricing tax types
    purchasePriceTaxType: "with_tax",
    salePriceTaxType: "with_tax",

    // Image fields
    imageFile: null,
    imagePreview: null,
    image_url: null,
  };

  const [form, setForm] = useState(initial);
  const [activeTab, setActiveTab] = useState("basic");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Basic, Step 2: Stock, Step 3: Pricing
  const [customUnits, setCustomUnits] = useState(() => {
    const saved = localStorage.getItem('customUnits');
    return saved ? JSON.parse(saved) : [];
  });

  const handleAddStockClick = async () => {
    if (!initialItem) return;
    const value = await showPremiumInputDialog({
      title: 'Add Stock',
      text: 'Enter the amount of stock to add. You can enter a negative number to reduce stock.',
      inputPlaceholder: 'ex: 10 or -5',
      inputType: 'number',
      confirmText: 'Update Stock',
      variant: 'green'
    });

    if (value) {
      try {
        const amount = parseFloat(value);
        if (isNaN(amount) || amount === 0) return;
        
        await updateStockAPI(initialItem.id, amount, 'Manual Adjustment');
        toastSuccess('Stock updated successfully');
        
        // Update local state so form reflects it
        const newStock = parseFloat(form.openingStock || 0) + amount;
        update('openingStock', newStock.toString());
        
      } catch (err) {
        toastError('Failed to update stock');
      }
    }
  };
  const firstRef = useRef(null);
  const prevCurrencyRef = useRef(currency);

  // Instant currency conversion when currency prop changes
  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
      const oldCurrency = prevCurrencyRef.current;

      setForm(prev => {
        const updatedForm = { ...prev };

        if (prev.salePrice && !isNaN(parseFloat(prev.salePrice))) {
          const inrValue = convertToINR(parseFloat(prev.salePrice), oldCurrency);
          const newValue = convertFromINR(inrValue, currency);
          updatedForm.salePrice = newValue.toFixed(2);
        }

        if (prev.purchasePrice && !isNaN(parseFloat(prev.purchasePrice))) {
          const inrValue = convertToINR(parseFloat(prev.purchasePrice), oldCurrency);
          const newValue = convertFromINR(inrValue, currency);
          updatedForm.purchasePrice = newValue.toFixed(2);
        }

        return updatedForm;
      });

      prevCurrencyRef.current = currency;
    }
  }, [currency]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setTimeout(() => setAnimating(true), 10);
      // Lock body scroll when modal opens
      document.body.style.overflow = 'hidden';
    } else {
      setAnimating(false);
      setTimeout(() => setVisible(false), 300);
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialItem) {
        // Extract numeric code from stored code (remove PRO/SRV prefix)
        let numericCode = initialItem.code || "";
        if (numericCode.startsWith("PRO-")) {
          numericCode = numericCode.substring(4);
        } else if (numericCode.startsWith("PRO")) {
          numericCode = numericCode.substring(3);
        } else if (numericCode.startsWith("SRV-")) {
          numericCode = numericCode.substring(4);
        } else if (numericCode.startsWith("SRV")) {
          numericCode = numericCode.substring(3);
        }

        setForm({
          ...initial,
          ...initialItem,
          type: initialItem.type || "product",
          unit: initialItem.unit || initial.unit,
          gstRate: initialItem.gstRate ?? initial.gstRate,
          // Convert INR prices to displayed currency
          salePrice: convertFromINR(initialItem.salePrice || 0, currency).toFixed(2),
          purchasePrice: convertFromINR(initialItem.purchasePrice || 0, currency).toFixed(2),
          itemCode: numericCode, // Store only numeric part
          serviceCode: numericCode, // Store only numeric part
          code: numericCode, // Store only numeric part
          // Convert openingStock to integer (remove decimals)
          openingStock: initialItem.openingStock ? Math.floor(parseFloat(initialItem.openingStock)) : "",
          asOfDate: formatDateForInput(initialItem.asOfDate),
          lowStock: initialItem.lowStock ?? false,
          lowStockQty: initialItem.lowStockQty ?? "",
        });

        // Set imagePreview from existing image_url
        if (initialItem.image_url && initialItem.image_url.startsWith('/uploads/')) {
          const fullImageUrl = getImageURL(initialItem.image_url);
          setForm(prev => ({
            ...prev,
            code: numericCode, // Store only numeric part
            itemCode: numericCode,
            serviceCode: numericCode,
            name: initialItem.name || "",
            category_id: initialItem.category_id || null,
            imagePreview: fullImageUrl
          }));
        }
      } else {
        setForm(initial);
      }
      setTimeout(() => firstRef.current?.focus(), 50);
      setActiveTab("basic");
      setSidebarOpen(false);
      setCurrentStep(1); // Reset to step 1 when modal opens
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialItem]);

  // Auto-select newly created category
  useEffect(() => {
    if (categories.length > 0 && form.category === "") {
      // Check if there's a new category that wasn't in the previous list
      const lastCategory = categories[categories.length - 1];
      // Auto-select the last (newly created) category if no category is selected
      if (form.category === "") {
        setForm(prev => ({ ...prev, category: lastCategory }));
        onCategoryCreated?.(lastCategory);
      }
    }
  }, [categories, onCategoryCreated]);

  if (!open) return null;

  const validateItemField = (name, value) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value || !value.trim()) {
          error = form.type === "service" ? "Please enter service name" : "Please enter item name";
        }
        break;
      case "category_id":
        if (!value) {
          error = "Select a category";
        }
        break;
      case "salePrice":
        const salePriceValue = parseFloat(String(value).replace(/,/g, ''));
        if (!value || value === '' || isNaN(salePriceValue) || salePriceValue <= 0) {
          error = form.type === "service" ? "Please enter a valid service price" : "Please enter a valid sale price";
        }
        break;
      case "altConvRate":
        if (form.hasAltUnit && (!value || parseFloat(value) <= 0)) {
          error = "Please enter a valid conversion rate";
        }
        break;
      case "gstRate":
        if (value && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
          error = "Tax rate must be between 0 and 100";
        }
        break;
      default:
        break;
    }
    return error;
  };

  const update = (k, v) => {
    let value = v;

    // Real-time numeric filtering for specific fields
    if (['purchasePrice', 'salePrice', 'gstRate', 'openingStock', 'lowStockQty', 'altConvRate'].includes(k)) {
      // Allow numbers and decimal point
      value = String(v).replace(/[^0-9.]/g, '');
      // Prevent multiple decimals
      const parts = value.split('.');
      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    }

    setForm((s) => {
      const updated = { ...s, [k]: value };

      // When type changes, regenerate the code with the new prefix
      if (k === 'type' && s.itemCode) {
        const numericCode = s.itemCode;
        if (value === 'product') {
          updated.code = `PRO-${numericCode}`;
        } else if (value === 'service') {
          updated.code = `SRV-${numericCode}`;
        }
      }

      return updated;
    });

    // Trigger real-time validation
    const error = validateItemField(k, value);
    setValidationErrors(prev => ({
      ...prev,
      [k]: error
    }));
  };

  const submit = async () => {


    const errors = {};
    const fieldsToValidate = ['name', 'category_id', 'salePrice'];
    if (form.type === 'product') {
      if (form.hasAltUnit) fieldsToValidate.push('altConvRate');
    }

    fieldsToValidate.forEach(field => {
      const error = validateItemField(field, form[field]);
      if (error) errors[field] = error;
    });

    // Set validation errors
    setValidationErrors(errors);


    // If there are errors, don't proceed
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      toastError(errors[firstErrorField]);

      return;
    }

    const finalCode = form.type === 'service'
      ? (form.serviceCode || "").toString().trim() || (form.code || "").toString().trim()
      : (form.itemCode || "").toString().trim() || (form.code || "").toString().trim();

    // Extract numeric part from code (remove existing PRO/SRV prefix if present)
    let numericCode = finalCode;
    if (finalCode.startsWith("PRO-")) {
      numericCode = finalCode.substring(4);
    } else if (finalCode.startsWith("PRO")) {
      numericCode = finalCode.substring(3);
    } else if (finalCode.startsWith("SRV-")) {
      numericCode = finalCode.substring(4);
    } else if (finalCode.startsWith("SRV")) {
      numericCode = finalCode.substring(3);
    }

    // Add correct prefix based on item type (only if we have numeric code)
    let codeWithPrefix = numericCode;
    if (numericCode) {
      if (form.type === "product") {
        codeWithPrefix = `PRO-${numericCode}`;
      } else if (form.type === "service") {
        codeWithPrefix = `SRV-${numericCode}`;
      }
    }

    // Clean and parse numeric values to handle formatted numbers
    const cleanNumericValue = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      // Remove commas and parse as float
      const cleaned = String(value).replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const cleanIntegerValue = (value) => {
      if (value === null || value === undefined || value === '') return null;
      // Remove commas and parse as integer (no decimals)
      const cleaned = String(value).replace(/,/g, '');
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    const newItem = {
      ...form,
      code: codeWithPrefix,
      // Clean numeric fields
      purchasePrice: cleanNumericValue(form.purchasePrice),
      salePrice: cleanNumericValue(form.salePrice),
      gstRate: cleanNumericValue(form.gstRate),
      openingStock: cleanIntegerValue(form.openingStock) || 0,
      lowStockQty: form.lowStock ? cleanIntegerValue(form.lowStockQty) : null,
      altConvRate: cleanNumericValue(form.altConvRate),
    };



    const result = await onSubmit(newItem, initialItem?.code);

    if (result && result.success) {
      onClose();
      await toastSuccess(initialItem ? "Item updated successfully" : "Item added successfully");

    } else if (result && result.code === 'DUPLICATE_ITEM_CODE') {
      // Set the error on the specific field
      const errorField = form.type === 'service' ? 'serviceCode' : 'itemCode';
      setValidationErrors(prev => ({
        ...prev,
        [errorField]: result.message || "Same number already exists"
      }));
      // Also show a toast for general awareness
      toastError(result.message || "Same number already exists");

    } else {
      // General error
      toastError(result?.message || "Failed to save item");

    }
  };

  const sidebarTabs = [
    { id: "basic", label: "Basic Details", mobileLabel: "Basic" },
    ...(form.type === "product"
      ? [{ id: "stock", label: "Stock Details", mobileLabel: "Stock" }]
      : []),
    {
      id: "pricing",
      label: form.type === "product" ? "Pricing" : "Service Pricing",
      mobileLabel: "Pricing",
    },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);

    // Update currentStep based on tabId
    if (tabId === "basic") {
      setCurrentStep(1);
    } else if (tabId === "stock") {
      setCurrentStep(2);
    } else if (tabId === "pricing") {
      setCurrentStep(form.type === "product" ? 3 : 2);
    }

    try {
      if (window && window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    } catch (e) { }
  };

  // Determine total steps based on item type
  const getTotalSteps = () => {
    if (form.type === "service") return 2; // Basic + Pricing
    return 3; // Basic + Stock + Pricing
  };

  // Validate current step
  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      // Basic Details validation
      if (!form.name.trim()) {
        errors.name = form.type === "service"
          ? "Please enter service name"
          : "Please enter item name";
      }
      if (!form.category_id) {
        errors.category_id = "Select a category";
      }
      // Validate sale price in step 1 ONLY for products
      // For services, salePrice is entered in the Pricing step (step 2)
      if (form.type === "product") {
        const salePriceValue = parseFloat(String(form.salePrice).replace(/,/g, ''));
        if (!form.salePrice || form.salePrice === '' || isNaN(salePriceValue) || salePriceValue <= 0) {
          errors.salePrice = "Please enter a valid sale price";
        }
      }
    }

    return errors;
  };

  // Handle Next button
  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    // Update activeTab based on step
    if (nextStep === 1) {
      setActiveTab("basic");
    } else if (nextStep === 2) {
      setActiveTab(form.type === "product" ? "stock" : "pricing");
    } else if (nextStep === 3) {
      setActiveTab("pricing");
    }
  };

  // Handle Previous button
  const handlePrevious = () => {
    setValidationErrors({});
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);

    // Update activeTab based on step
    if (prevStep === 1) {
      setActiveTab("basic");
    } else if (prevStep === 2) {
      setActiveTab(form.type === "product" ? "stock" : "pricing");
    } else if (prevStep === 3) {
      setActiveTab("pricing");
    }
  };

  const renderBasicFields = () => (
    <div className="space-y-4">
      {/* MOBILE: Image at top center, then Item Type and Category in next row */}
      {/* DESKTOP: All three elements in one row with 3 columns */}
      <div className="space-y-4 md:space-y-0">
        {/* MOBILE LAYOUT - Keep as is */}
        <div className="md:hidden space-y-4">
          {/* IMAGE UPLOAD - Mobile: center */}
          {form.type !== "service" && (
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <label
                  htmlFor="item-image-upload"
                  className="w-20 h-20 border-2 border-dashed border-[#129046] rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden group cursor-pointer hover:bg-green-50"
                >
                  {form.imagePreview ? (
                    <>
                      <img
                        src={form.imagePreview}
                        alt="Item Image"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      {/* Hover overlay for upload option */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Upload className="w-4 h-4 mx-auto mb-0.5" />
                          <div className="text-xs font-medium">Change</div>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (form.imagePreview && form.imagePreview.startsWith('blob:')) {
                            URL.revokeObjectURL(form.imagePreview);
                          }
                          update("imagePreview", null);
                          update("imageFile", null);
                          update("image_url", null);
                        }}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <Upload className="w-4 h-4 text-gray-400 mx-auto mb-0.5" />
                      <div className="text-xs text-gray-500">Upload</div>
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                      if (!validTypes.includes(file.type)) {
                        setImageErrors({ type: 'Please upload a valid image file (JPG, PNG, GIF, WEBP)' });
                        return;
                      }

                      // Validate file size (max 5MB)
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        setImageErrors({ size: 'Image size should be less than 5MB' });
                        return;
                      }

                      // Clear any previous errors
                      setImageErrors({});

                      // Clean up previous preview URL
                      if (form.imagePreview && form.imagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(form.imagePreview);
                      }

                      // Create preview URL
                      const previewUrl = URL.createObjectURL(file);
                      update("imageFile", file);
                      update("imagePreview", previewUrl);
                    }
                  }}
                  className="hidden"
                  id="item-image-upload"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Product Image
                </p>
                {imageErrors.type && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {imageErrors.type}
                  </p>
                )}
                {imageErrors.size && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {imageErrors.size}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ITEM TYPE AND CATEGORY ROW - Mobile: side by side */}
          <div className="grid grid-cols-2 gap-2">
            {/* ITEM TYPE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Item Type *
              </label>
              <CommonDropdown
                options={ITEM_TYPE_OPTIONS}
                value={form.type}
                valueBy="id"
                onChange={(opt) => update("type", opt?.id || "product")}
                className2="normalFormOption"
                className="w-full sm:w-full"
                id="item-type"
                name="type"
                placeholder="Select Item Type"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <CommonDropdown
                options={categories.map(cat => ({ id: cat, label: cat }))}
                value={form.category}
                valueBy="id"
                onChange={(opt) => update("category", opt?.id || "")}
                className2="normalFormOption"
                className={`w-full sm:w-full ${validationErrors.category ? "border-red-500" : ""}`}
                id="category"
                name="category"
                placeholder="Select Category"
                onCreate={() => onCreateCategory?.()}
                showAddOption={true}
                addOptionLabel="Add New Category"
              />
              {validationErrors.category && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.category}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT - Reduced gap between Upload Product and Item Type */}
        <div className="hidden md:block">
          <div className="flex items-start gap-2">
            {/* IMAGE UPLOAD - Desktop: fixed width with less margin */}
            {form.type !== "service" && (
              <div className="flex flex-col items-center mr-2">
                <label
                  htmlFor="item-image-upload"
                  className="w-24 h-24 border-2 border-dashed border-[#129046] rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden group cursor-pointer hover:bg-green-50"
                >
                  {form.imagePreview ? (
                    <>
                      <img
                        src={form.imagePreview}
                        alt="Item Image"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      {/* Hover overlay for upload option */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Upload className="w-4 h-4 mx-auto mb-0.5" />
                          <div className="text-xs font-medium">Change</div>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (form.imagePreview && form.imagePreview.startsWith('blob:')) {
                            URL.revokeObjectURL(form.imagePreview);
                          }
                          update("imagePreview", null);
                          update("imageFile", null);
                          update("image_url", null);
                        }}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <Upload className="w-4 h-4 text-gray-400 mx-auto mb-0.5" />
                      <div className="text-xs text-gray-500">Upload</div>
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                      if (!validTypes.includes(file.type)) {
                        setImageErrors({ type: 'Please upload a valid image file (JPG, PNG, GIF, WEBP)' });
                        return;
                      }

                      // Validate file size (max 5MB)
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        setImageErrors({ size: 'Image size should be less than 5MB' });
                        return;
                      }

                      // Clear any previous errors
                      setImageErrors({});

                      // Clean up previous preview URL
                      if (form.imagePreview && form.imagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(form.imagePreview);
                      }

                      // Create preview URL
                      const previewUrl = URL.createObjectURL(file);
                      update("imageFile", file);
                      update("imagePreview", previewUrl);
                    }
                  }}
                  className="hidden"
                  id="item-image-upload"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Upload Product
                </p>
                {imageErrors.type && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {imageErrors.type}
                  </p>
                )}
                {imageErrors.size && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {imageErrors.size}
                  </p>
                )}
              </div>
            )}

            {/* ITEM TYPE AND CATEGORY - Desktop: flex with normal gap */}
            <div className="flex gap-4 flex-1">
              {/* ITEM TYPE */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span>Item Type</span> *
                </label>
                <CommonDropdown
                  options={ITEM_TYPE_OPTIONS}
                  value={form.type}
                  valueBy="id"
                  onChange={(opt) => update("type", opt?.id || "product")}
                  className2="normalFormOption"
                  className="w-full"
                  id="item-type"
                  name="type"
                  placeholder="Select Item Type"
                />
              </div>

              {/* CATEGORY */}
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {form.type === "service" ? <span>Service Category</span> : <span>Product Category</span>} <span className="text-red-500">*</span>
                </label>
                <CategorySelectInput
                  categories={categories}
                  value={form.category_id}
                  onChange={(val) => update("category_id", val)}
                  onCreate={(newCat) => {
                    onCategoryCreated?.(newCat);
                  }}
                />
                {validationErrors.category_id && (
                  <p className="text-xs text-red-500 mt-1">
                    {validationErrors.category_id}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAME */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {form.type === "service" ? <span>Service Name</span> : <span>Item Name</span>} <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          ref={firstRef}
          onChange={(e) => update("name", e.target.value)}
          className={`w-full h-10 px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all outline-none ${validationErrors.name
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
          placeholder={
            form.type === "service" ? "ex: Mobile Repair" : "ex: Maggie 20gm"
          }
        />
        {validationErrors.name && (
          <p className="text-xs text-red-500 mt-1">
            {validationErrors.name}
          </p>
        )}
      </div>

      {/* SERVICE CODE */}
      {form.type === "service" && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span>Service Code</span>
          </label>
          <input
            value={form.serviceCode}
            onChange={(e) => update("serviceCode", e.target.value)}
            className={`w-full h-10 px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all outline-none ${validationErrors.serviceCode
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
            placeholder="Enter Service Code"
          />
          {validationErrors.serviceCode && (
            <p className="text-xs text-red-500 mt-1">
              {validationErrors.serviceCode}
            </p>
          )}
        </div>
      )}

      {/* ITEM CODE (for products) */}
      {form.type === "product" && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span>Item Code</span>
          </label>
          <input
            value={form.itemCode}
            onChange={(e) => update("itemCode", e.target.value)}
            className={`w-full h-10 px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all outline-none ${validationErrors.itemCode
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
            placeholder="Enter Item Code (optional)"
          />
          {validationErrors.itemCode && (
            <p className="text-xs text-red-500 mt-1">
              {validationErrors.itemCode}
            </p>
          )}
        </div>
      )}

      {/* HSN / SAC CODE */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {form.type === "service" ? <span>SAC Code</span> : <span>HSN Code</span>}
        </label>
        <div className="relative w-full">
          <input
            value={form.hsn || ""}
            onChange={(e) => update("hsn", e.target.value)}
            className={`w-full h-10 px-4 py-2 border-2 rounded-lg text-sm focus:ring-2 transition-all outline-none ${validationErrors.hsn
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
            placeholder={form.type === "service" ? "ex: 9983" : "ex: 4010"}
          />
        </div>
        {validationErrors.hsn && (
          <p className="text-xs text-red-500 mt-1">
            {validationErrors.hsn}
          </p>
        )}
      </div>

      {/* Grid layout for remaining fields - Desktop only */}
      <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
        {/* SALES PRICE - Only for products */}
        {form.type === "product" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span>Sales Price</span> <span className="text-red-500">*</span>
            </label>
            <div className="relative w-full max-w-md">
              <input
                value={form.salePrice}
                onChange={(e) => update("salePrice", e.target.value)}
                className={`w-full h-10 px-4 py-2 pr-12 border-2 rounded-lg text-sm transition-all focus:ring-2 outline-none ${validationErrors.salePrice
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
                placeholder="ex: 200"
              />
              <span translate="no" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-700 text-base font-medium">
                {getCurrencySymbol(currency)}
              </span>
            </div>
            {validationErrors.salePrice && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.salePrice}</p>
            )}
          </div>
        )}

        {/* GST TAX - Only for products */}
        {form.type === "product" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span>Tax Rate</span> (%)
            </label>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                inputMode="decimal"
                value={form.gstRate || ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                  update("gstRate", value);
                }}
                className="w-full h-10 px-4 py-2 pr-12 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                placeholder="Enter tax rate"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-bold">
                %
              </span>
            </div>
          </div>
        )}

        {/* MEASURING UNIT - Only for products */}
        {form.type === "product" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span>Measuring Unit</span>
            </label>
            <CommonDropdown
              options={getUnitOptions(customUnits)}
              value={form.unit || "PCS"}
              valueBy="id"
              onChange={async (opt) => {
                if (opt?.id === "OTHER") {
                  const newUnit = await showPremiumInputDialog({
                    title: "Add Custom Unit",
                    text: "Enter a custom measurement unit (e.g., BAG, CAN, DRUM)",
                    inputPlaceholder: "Enter unit name",
                    inputValidator: (value) => {
                      if (!value || value.trim() === "") return "Unit name cannot be empty";
                      if (value.length > 10) return "Unit name must be 10 characters or less";
                      const exists = [...DEFAULT_UNIT_OPTIONS.map(o => o.id), ...customUnits].some(u => u.toUpperCase() === value.trim().toUpperCase());
                      if (exists) return "This unit already exists";
                      return null;
                    },
                    variant: "green",
                    confirmText: "Add Unit"
                  });
                  if (newUnit && newUnit.trim()) {
                    const unitUpper = newUnit.trim().toUpperCase();
                    const updatedUnits = [...customUnits, unitUpper];
                    setCustomUnits(updatedUnits);
                    localStorage.setItem('customUnits', JSON.stringify(updatedUnits));
                    update("unit", unitUpper);
                  }
                } else {
                  update("unit", opt?.id || "PCS");
                }
              }}
              className2="normalFormOption"
              className="w-full sm:w-full"
              id="measuring-unit"
              name="unit"
              placeholder="Select Unit"
            />
          </div>
        )}

        {/* PRODUCT ONLY → OPENING STOCK (basic quick) */}
        {form.type === "product" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>Opening Stock</span>
              {initialItem && (
                <button
                  type="button"
                  onClick={handleAddStockClick}
                  className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                  title="Add Stock"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </label>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                inputMode="numeric"
                value={form.openingStock || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  update("openingStock", value);
                }}
                className="w-full h-10 px-4 py-2 pr-16 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                placeholder="ex: 150"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-700 text-sm font-medium">
                {form.unit || "PCS"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col mx-1">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-[#FFF9E6]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {initialItem ? <span>Edit Item</span> : <span>Create New Item</span>}
            </h2>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-full font-medium">
                <span>Step</span> {currentStep} <span>of</span> {getTotalSteps()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xl text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* MOBILE TABS - Hidden (using steps instead) */}
        {/* Tab navigation removed - using step-based navigation instead */}

        {/* BODY */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* SIDEBAR - Desktop only */}
          <div className="hidden md:block md:w-52 md:border-r bg-gray-50">
            {sidebarTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTab(t.id)}
                className={`w-full text-left px-5 py-3 border-b text-sm font-medium ${activeTab === t.id
                  ? "bg-yellow-100 text-yellow-700"
                  : ""
                  }`}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <div className="flex-1 p-6 bg-[#FFFDF5] overflow-y-auto">
            {/* Step 1: Basic Details */}
            {currentStep === 1 && renderBasicFields()}

            {/* Step 2: Stock Details (only for products) */}
            {currentStep === 2 && form.type === "product" && (
              <div className="space-y-5">
                {/* Measuring Unit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Measuring Unit <span className="text-red-500">*</span>
                  </label>
                  <CommonDropdown
                    options={getUnitOptions(customUnits)}
                    value={form.unit || "PCS"}
                    valueBy="id"
                    onChange={async (opt) => {
                      if (opt?.id === "OTHER") {
                        const newUnit = await showPremiumInputDialog({
                          title: "Add Custom Unit",
                          text: "Enter a custom measurement unit (e.g., BAG, CAN, DRUM)",
                          inputPlaceholder: "Enter unit name",
                          inputValidator: (value) => {
                            if (!value || value.trim() === "") return "Unit name cannot be empty";
                            if (value.length > 10) return "Unit name must be 10 characters or less";
                            const exists = [...DEFAULT_UNIT_OPTIONS.map(o => o.id), ...customUnits].some(u => u.toUpperCase() === value.trim().toUpperCase());
                            if (exists) return "This unit already exists";
                            return null;
                          },
                          variant: "green",
                          confirmText: "Add Unit"
                        });
                        if (newUnit && newUnit.trim()) {
                          const unitUpper = newUnit.trim().toUpperCase();
                          const updatedUnits = [...customUnits, unitUpper];
                          setCustomUnits(updatedUnits);
                          localStorage.setItem('customUnits', JSON.stringify(updatedUnits));
                          update("unit", unitUpper);
                        }
                      } else {
                        update("unit", opt?.id || "PCS");
                      }
                    }}
                    className2="normalFormOption"
                    className="w-full sm:w-full"
                    id="measuring-unit-stock"
                    name="unit"
                    placeholder="Select Unit"
                  />
                </div>

                {/* Alternative Unit Section */}

                {/* <div className="border rounded-lg bg-[#f8fbff] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Alternative Unit
                    </span>
                    {!form.hasAltUnit && (
                      <button
                        type="button"
                        onClick={() => update("hasAltUnit", true)}
                        className="px-3 py-1 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg text-xs font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90"
                      >
                        + Add Alternative Unit
                      </button>
                    )}
                  </div>

                  {form.hasAltUnit && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Secondary Unit <span className="text-red-500">*</span>
                          </label>
                          <CommonDropdown
                            options={UNIT_OPTIONS}
                            value={form.altUnit || ""}
                            valueBy="id"
                            onChange={(opt) =>
                              update("altUnit", opt?.id || "")
                            }
                            className2="normalFormOption"
                            className="w-full sm:w-full"
                            id="secondary-unit"
                            name="altUnit"
                            placeholder="Select Secondary Unit"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Conversion Rate <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full max-w-md">
                            <div className="absolute left-0 top-0 h-full px-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-l-xl flex items-center text-sm font-medium">
                              1 {form.unit || "PCS"} =
                            </div>
                            <input
                              type="text"
                              value={form.altConvRate || ""}
                              onChange={(e) =>
                                update("altConvRate", e.target.value)
                              }
                              className={`w-full h-10 pl-32 pr-20 py-2 border-2 rounded-lg text-sm transition-all focus:ring-2 outline-none ${validationErrors.altConvRate
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
                              placeholder="Rate"
                            />
                            <div className="absolute right-0 top-0 h-full px-4 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-r-xl flex items-center text-sm font-medium">
                              {form.altUnit || "Unit"}
                            </div>
                          </div>
                          {validationErrors.altConvRate && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.altConvRate}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          update("hasAltUnit", false);
                          update("altUnit", "");
                          update("altConvRate", "");
                        }}
                        className="mt-2 text-xs text-red-600 hover:underline"
                      >
                        ✕ Remove Alternative Unit
                      </button>
                    </>
                  )}
                </div> */}

                {/* Opening Stock + As of Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                      <span>Opening Stock</span>
                      {initialItem && (
                        <button
                          type="button"
                          onClick={handleAddStockClick}
                          className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                          title="Add Stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </label>
                    <div className="relative w-full max-w-md">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.openingStock || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          update("openingStock", value);
                        }}
                        className="w-full h-10 px-4 py-2 pr-16 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                        placeholder="ex: 150"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-700 text-sm font-medium">
                        {form.unit || "PCS"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      As of Date
                    </label>
                    <input
                      type="date"
                      value={form.asOfDate || ""}
                      onChange={(e) =>
                        update("asOfDate", e.target.value)
                      }
                      className="w-full h-10 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Low stock warning */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <input
                    id="lowStockToggle2"
                    type="checkbox"
                    checked={form.lowStock}
                    onChange={(e) =>
                      update("lowStock", e.target.checked)
                    }
                    className="w-4 h-4 text-green-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="lowStockToggle2"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Enable Low stock quantity warning
                  </label>

                  {form.lowStock && (
                    <input
                      type="text"
                      value={form.lowStockQty || ""}
                      onChange={(e) =>
                        update("lowStockQty", e.target.value)
                      }
                      className="ml-2 w-32 h-10 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      placeholder="Enter Qty"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description || ""}
                    onChange={(e) =>
                      update("description", e.target.value)
                    }
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none resize-none"
                    placeholder="Enter Description"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Pricing */}
            {currentStep === (form.type === "product" ? 3 : 2) && (
              <div className="space-y-6">
                <div className={form.type === "service" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                  {/* PURCHASE PRICE - Only for products */}
                  {form.type === "product" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2"><span>Purchase Price</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.purchasePrice}
                          onChange={(e) =>
                            update("purchasePrice", e.target.value)
                          }
                          className="w-full h-10 pl-10 pr-32 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          placeholder="Enter Purchase Price"
                        />
                        <div translate="no" className="absolute left-0 top-0 h-full px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-l-lg flex items-center text-sm font-medium">
                          {getCurrencySymbol(currency)}
                        </div>
                        <select
                          value={form.purchasePriceTaxType}
                          onChange={(e) => update("purchasePriceTaxType", e.target.value)}
                          className="absolute right-0 top-0 h-full px-3 py-2 border-2 border-l-0 border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none rounded-r-lg cursor-pointer"
                        >
                          <option value="with_tax">With Tax</option>
                          <option value="without_tax">Without Tax</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* SALE/SERVICE PRICE */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {form.type === "service"
                        ? <span>Service Price</span>
                        : <span>Sale Price</span>} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.salePrice}
                        onChange={(e) =>
                          update("salePrice", e.target.value)
                        }
                        className={`w-full h-10 pl-10 pr-32 py-2.5 border-2 rounded-lg text-sm transition-all focus:ring-2 outline-none ${validationErrors.salePrice
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
                        placeholder={
                          form.type === "service" ? "Enter Service Price" : "Enter Sale Price"
                        }
                      />
                      <div translate="no" className="absolute left-0 top-0 h-full px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-l-lg flex items-center text-sm font-medium">
                        {getCurrencySymbol(currency)}
                      </div>
                      <select
                        value={form.salePriceTaxType}
                        onChange={(e) => update("salePriceTaxType", e.target.value)}
                        className="absolute right-0 top-0 h-full px-3 py-2 border-2 border-l-0 border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none rounded-r-lg cursor-pointer"
                      >
                        <option value="with_tax">With Tax</option>
                        <option value="without_tax">Without Tax</option>
                      </select>
                    </div>
                    {validationErrors.salePrice && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.salePrice}</p>
                    )}
                  </div>

                  {/* GST TAX - Only for services - Same row */}
                  {form.type === "service" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <div className="relative w-full max-w-md">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.gstRate || ""}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                            update("gstRate", value);
                          }}
                          className={`w-full h-10 px-4 py-2 pr-12 border-2 rounded-lg text-sm focus:ring-2 transition-all outline-none ${validationErrors.gstRate
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-[#1fbe5a] focus:ring-[#1fbe5a]/20"}`}
                          placeholder="Enter tax rate"
                        />
                        <span className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-bold ${validationErrors.gstRate ? "text-red-500" : "text-green-600"}`}>
                          %
                        </span>
                      </div>
                      {validationErrors.gstRate && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.gstRate}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-2 border-t flex justify-between bg-white gap-3">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-[8px] hover:bg-gray-400 transition-all duration-200 font-medium"
              >
                ← Previous
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < getTotalSteps() && (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[8px] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 font-medium"
              >
                Next →
              </button>
            )}

            {currentStep === getTotalSteps() && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-[8px] hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className="px-4 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[8px] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 font-medium"
                >
                  {initialItem ? "Save Changes" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Item Detail View w/ Sidebar & Tabs ---------------- */
function ItemDetailView({
  item,
  onBack,
  allItems,
  onSelectItem,
  onEdit,
  onDelete,
  currency = "USD",
  formatCurrencyDisplay,
}) {
  const [activeItemId, setActiveItemId] = useState(item?.id ?? null);
  const [activeTab, setActiveTab] = useState("details");
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showSidebarButton, setShowSidebarButton] = useState(true);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [partyPrices, setPartyPrices] = useState([
    { partyName: "Party A", salesPrice: 250 },
    { partyName: "Party B", salesPrice: 240 },
    { partyName: "Party C", salesPrice: 260 },
  ]);

  // whenever parent changes `item` prop (e.g. on initial open), sync active id
  useEffect(() => {
    if (item && item.id) setActiveItemId(item.id);
  }, [item]);

  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeItemId && activeTab === "history") {
      setLoadingHistory(true);
      fetchStockHistoryAPI(activeItemId)
        .then(res => setStockHistory(res.data || []))
        .catch(err => {
          console.error(err);
          setStockHistory([]);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [activeItemId, activeTab]);

  // find currently selected item object (from allItems if provided, else fallback to prop)
  const currentItem = useMemo(() => {
    if (allItems && activeItemId != null) {
      const found = allItems.find(
        (p) => String(p.id) === String(activeItemId)
      );
      if (found) return found;
    }
    return item || {};
  }, [allItems, activeItemId, item]);

  const getTaxTypeLabel = (taxType) => {
    const opt = PRICE_TAX_TYPE_OPTIONS.find(o => o.id === taxType);
    return opt ? opt.label : "With Tax";
  };

  // filtered list for sidebar (from allItems)
  const filteredSidebar = (allItems || []).filter((p) =>
    (p.name || "")
      .toLowerCase()
      .includes(sidebarQuery.toLowerCase())
  );

  const handleSidebarClick = (p) => {
    setActiveItemId(p.id);
    // inform parent so it can update its selectedItem state as well
    onSelectItem?.(p);
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-4 relative overflow-hidden">
      {/* Mobile Sidebar Button - appears in item detail view */}
      <button
        onClick={() => setIsSliderOpen(true)}
        className="md:hidden fixed left-0 top-1/2 transform -translate-y-1/2 z-30 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white w-6 h-16 rounded-r-md shadow-lg transition-all duration-300 flex items-center justify-center px-0"
        aria-label="Open item sidebar"
      >
        <ChevronRight className="w-7 h-7 text-white" strokeWidth={4} />
      </button>

      {/* Mobile-First Layout - Completely Different from Desktop */}

      <div
        className={`fixed left-0 top-[92px] z-50 w-72 h-[82vh] bg-white shadow-2xl transition-transform duration-300 ease-in-out pb-10 ${isSliderOpen ? 'translate-x-0' : '-translate-x-full'
          } md:hidden`}
      >
        {/* Close button for mobile slider */}
        <button
          onClick={() => setIsSliderOpen(false)}
          className="md:hidden fixed right-0 top-[240px] transform -translate-y-1/2 z-30 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white w-6 h-16 rounded-l-md shadow-lg transition-all duration-300 flex items-center justify-center px-0"
          aria-label="Close party sidebar"
        >
          <ChevronLeft className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        <div className="flex flex-col h-full">
          {/* Header - Hidden on Mobile */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-gray-200 bg-[#f3c117]">
            <h3 className="text-lg font-bold text-white">Select Party</h3>
            <button
              onClick={() => setIsSliderOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <input
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search parties..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#f3c117] focus:ring-2 focus:ring-[#f3c117]/20"
              />
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          {/* Party List - Show on Mobile */}
          <div className="flex-1 overflow-y-auto">
            {(filteredSidebar || []).map((p) => {
              const isActive = String(activeItemId) === String(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    handleSidebarClick(p);
                    setIsSliderOpen(false);
                  }}
                  className={`w-full text-left p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-[#f3c117]/10 border-l-4 border-l-[#f3c117]' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {p.name || "-"}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-700">
                          {p.code || "-"}
                        </span>
                        {p.type !== "service" && (
                          <span className="text-xs text-gray-500" translate="no">
                            Stock: <span>{Math.floor(parseFloat(p.qty) || 0)}</span> {p.unit || "PCS"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {!filteredSidebar.length && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No items found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isSliderOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSliderOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-yellow-200 px-4 py-2 flex items-center justify-between rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
            </button>
            <div>
              <h1 className="text-base font-bold text-yellow-900">
                {currentItem.name || "Item Details"}
              </h1>
              {currentItem.type !== "service" && (
                <div className="text-xs text-gray-600 mt-1" translate="no">
                  Stock: <span>{Math.floor(parseFloat(currentItem.qty) || 0)}</span> {currentItem.unit || "PCS"}
                </div>
              )}
            </div>
          </div>

          <ActionButtons
            onEdit={() => setIsSliderOpen(true)}
            actions={['edit']}
          />
        </div>

        {/* Desktop Header (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between pt-2 pb-3 px-3 border-b border-yellow-200 bg-white rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="group p-2 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
            >
              <ArrowLeft className="w-5 h-5 text-yellow-900 group-hover:text-green-700" />
            </button>
            <h2 className="text-xl font-bold text-yellow-900">
              {currentItem.name || "Cash Sale"}
            </h2>
            {currentItem.type !== "service" && (
              <span className="text-sm px-3 py-1 bg-gray-100 text-yellow-900 rounded-full font-medium" translate="no">
                Stock: <span>{Math.floor(parseFloat(currentItem.qty) || 0)}</span> {currentItem.unit || "PCS"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ActionButtons
              onEdit={() => onEdit?.(currentItem)}
              actions={['edit']}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto md:pb-0 pb-20">
          {/* Unified Layout - Same for Mobile and Desktop */}
          <div className="">
            <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-0">
              <aside className="hidden md:block border-l border-t border-b border-yellow-200 rounded-l-lg bg-white md:min-h-screen mt-2">
                <div className="p-3">
                  <div className="relative">
                    <input
                      value={sidebarQuery}
                      onChange={(e) => setSidebarQuery(e.target.value)}
                      placeholder="Search Item"
                      className="w-full pl-9 pr-3 py-2 text-sm border-1 border-yellow-200 rounded-lg"
                    />
                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div
                  className="px-3 pb-3 space-y-2 overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 64px)" }}
                >
                  {(filteredSidebar || []).map((p) => {
                    const isActive = String(activeItemId) === String(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSidebarClick(p)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition border ${isActive
                          ? "bg-green-50 border-green-200"
                          : "bg-white hover:bg-yellow-50 border-yellow-200"
                          }`}
                      >
                        <div className="text-sm font-medium truncate">
                          {p.name || "-"}
                        </div>
                        {p.type !== "service" && (
                          <div className="text-xs text-gray-500" translate="no">
                            Stock: <span>{Math.floor(parseFloat(p.qty) || 0)}</span> {p.unit || "PCS"}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {p.category || "-"}
                        </div>
                      </button>
                    );
                  })}

                  {!filteredSidebar.length && (
                    <div className="text-center text-sm text-gray-500 py-6">
                      No items found
                    </div>
                  )}
                </div>
              </aside>

              <main className="bg-white rounded-xl md:rounded-l-none md:rounded-r-xl border-1 border-yellow-200 flex flex-col mt-2">
                <div className="flex-shrink-0">
                  <div className="border-b border-yellow-200">
                    {/* Mobile: Horizontal scrollable tabs */}
                    <div className="md:hidden overflow-x-auto scrollbar-hide">
                      <div className="flex gap-0 min-w-max">
                        {[
                          { id: "details", label: "Details", mobileLabel: "Details" },
                          { id: "history", label: "History", mobileLabel: "History" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`-mb-[2px] px-3 py-2 flex items-center justify-center text-sm whitespace-nowrap ${activeTab === tab.id
                              ? "text-green-700 font-medium bg-yellow-100 border-b-2 border-green-600"
                              : "text-gray-500 hover:text-gray-700"
                              }`}
                          >
                            {tab.mobileLabel || tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Desktop: Full width tabs */}
                    <div className="hidden md:flex md:gap-0 md:pr-4">
                      {[
                        { id: "details", label: "Item Details" },
                        { id: "history", label: "History" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`-mb-[2px] px-4 py-1.5 flex items-center justify-center ${activeTab === tab.id
                            ? "text-green-700 font-medium bg-yellow-100"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "details" && (
                    <div className="border rounded-xl overflow-hidden bg-white">
                      <div className="bg-yellow-200 text-yellow-900 px-4 py-3">
                        <h3 className="font-semibold text-lg"><span>Item Details</span></h3>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Column 1 - Product Image */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800 text-lg text-center"><span>Product Image</span></h4>

                            <div className="flex justify-center">
                              {currentItem.image_url ? (
                                <img
                                  src={getImageURL(currentItem.image_url)}
                                  alt={currentItem.name}
                                  className="max-w-full max-h-96 object-contain rounded-lg border-1 border-yellow-300 shadow-sm"
                                />
                              ) : (
                                <div className="w-52 h-52 bg-gray-100 border-1 border-yellow-300 rounded-lg flex items-center justify-center">
                                  <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Column 2 - General Information */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800 text-lg"><span>General Information</span></h4>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium"><span>Item Name</span></div>
                                <div className="font-semibold text-gray-800 text-base">
                                  {currentItem.name}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium"><span>Item Code</span></div>
                                <div className="font-mono text-gray-800 text-base">
                                  {currentItem.code}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium"><span>Category</span></div>
                                <div className="font-semibold text-gray-800 text-base">
                                  {currentItem.category || "-"}
                                </div>
                              </div>

                              {currentItem.type !== "service" && (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 font-medium"><span>Current Stock</span></div>
                                  <div className="font-semibold text-gray-800 text-base" translate="no">
                                    {currentItem.qty > 0 ? <span>{Math.floor(parseFloat(currentItem.qty))} {currentItem.unit || "PCS"}</span> : "-"}
                                  </div>
                                </div>
                              )}

                              {currentItem.type !== "service" && (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 font-medium"><span>Low Stock Alert</span></div>
                                  <div className="font-semibold text-gray-800 text-base">
                                    {currentItem.lowStock ? `Enabled (${currentItem.lowStockQty} ${currentItem.unit || "PCS"})` : "Disabled"}
                                  </div>
                                </div>
                              )}

                              {currentItem.type !== "service" && (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 font-medium"><span>Description</span></div>
                                  <div className="font-semibold text-gray-800 text-base">
                                    {currentItem.description || "-"}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Column 3 - Pricing Information */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800 text-lg"><span>Pricing Information</span></h4>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium"><span>Sales Price</span></div>
                                <div className="font-semibold text-gray-800 text-base">
                                  <span translate="no">{formatCurrencyDisplay(currentItem.salePrice ?? 0)}</span>
                                  {currentItem.salePriceTaxType && (
                                    <span className="text-gray-400 font-normal text-sm ml-2">
                                      (<span>{getTaxTypeLabel(currentItem.salePriceTaxType)}</span>)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {currentItem.type !== "service" && (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 font-medium"><span>Purchase Price</span></div>
                                  <div className="font-semibold text-gray-800 text-base">
                                    <span translate="no">{formatCurrencyDisplay(currentItem.purchasePrice ?? 0)}</span>
                                    {currentItem.purchasePriceTaxType && (
                                      <span className="text-gray-400 font-normal text-sm ml-2">
                                        (<span>{getTaxTypeLabel(currentItem.purchasePriceTaxType)}</span>)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium">{currentItem.type === "service" ? <span>SAC Code</span> : <span>HSN Code</span>}</div>
                                <div className="font-semibold text-gray-700 text-base">
                                  {currentItem.hsn || "-"}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm text-gray-600 font-medium"><span>Tax Rate</span></div>
                                <div className="font-semibold text-gray-700 text-base">
                                  {currentItem.gstRate ? `${currentItem.gstRate}%` : "-"}
                                </div>
                              </div>

                              {currentItem.type !== "service" && (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 font-medium"><span>Measuring Unit</span></div>
                                  <div className="font-semibold text-gray-700 text-base">
                                    {currentItem.unit || "PCS"}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="border rounded-xl overflow-hidden bg-white">
                      <div className="bg-yellow-200 text-yellow-900 px-4 py-3 flex justify-between items-center">
                        <h3 className="font-semibold text-lg">Stock History</h3>
                      </div>
                      <div className="p-4">
                        {loadingHistory ? (
                          <div className="text-center py-6 text-gray-500">Loading history...</div>
                        ) : stockHistory.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">No history available for this item.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                                  <th className="px-4 py-3 font-semibold text-gray-600">Type</th>
                                  <th className="px-4 py-3 font-semibold text-gray-600">Amount</th>
                                  <th className="px-4 py-3 font-semibold text-gray-600">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {stockHistory.map((log) => (
                                  <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                      {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        log.action_type === 'ADD' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {log.action_type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {log.action_type === 'ADD' ? '+' : ''}{log.amount} {currentItem.unit || 'PCS'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                      {log.notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "transactions" && (
                    <div className="space-y-4">
                      <div className="border-l border-r border-yellow-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                Transaction Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                Transaction Number
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td colSpan="5" className="px-4 py-16 text-center">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                  <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                    <FileBarChart2 className="w-8 h-8 text-gray-300" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-500">
                                    No transactions for this item
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- API Functions ---------------- */
const fetchCategories = async () => {
  try {
    const response = await categoryAPI.getAll();
    return response.data; // Now returns objects {id, name}
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

const fetchInventoryItems = async (filters = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    // Get business_id from localStorage
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const queryParams = new URLSearchParams();

    if (selectedBusinessId) {
      queryParams.append('business_id', selectedBusinessId);
    }

    // Add filters
    if (filters.item_type) queryParams.append('item_type', filters.item_type);
    if (filters.category_id) {
      queryParams.append('category_id', filters.category_id);
    }
    if (filters.low_stock_only) queryParams.append('low_stock_only', 'true');
    if (filters.search) queryParams.append('search', filters.search);

    const apiUrl = `${getApiURL()}/inventory?${queryParams}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch inventory items: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

const createInventoryItem = async (itemData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    // Get business context from localStorage
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const currentBusinessName = localStorage.getItem('currentBusinessName');

    // Create FormData for file upload
    const formData = new FormData();

    // Add business context first
    if (selectedBusinessId) {
      formData.append('business_id', selectedBusinessId);
    }
    if (currentBusinessName) {
      formData.append('businessName', currentBusinessName);
    }

    // Add all item data to FormData
    Object.keys(itemData).forEach(key => {
      if (key === 'imageFile' && itemData[key]) {
        formData.append('image', itemData[key]);
      } else if (key !== 'imageFile' && key !== 'imagePreview' && itemData[key] !== null && itemData[key] !== undefined) {
        formData.append(key, itemData[key]);
      }
    });

    const response = await fetch(`${getApiURL()}/inventory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create item');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

const updateInventoryItem = async (id, itemData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    // Get business context from localStorage
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const currentBusinessName = localStorage.getItem('currentBusinessName');

    // Create FormData for file upload
    const formData = new FormData();

    // Add business context first
    if (selectedBusinessId) {
      formData.append('business_id', selectedBusinessId);
    }
    if (currentBusinessName) {
      formData.append('businessName', currentBusinessName);
    }

    // Add all item data to FormData
    Object.keys(itemData).forEach(key => {
      if (key === 'imageFile' && itemData[key]) {
        formData.append('image', itemData[key]);
      } else if (key !== 'imageFile' && key !== 'imagePreview' && itemData[key] !== null && itemData[key] !== undefined) {
        formData.append(key, itemData[key]);
      }
    });

    const response = await fetch(`${getApiURL()}/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update item');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

const deleteInventoryItem = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    // Get business_id from localStorage
    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const queryParams = new URLSearchParams();
    if (selectedBusinessId) {
      queryParams.append('business_id', selectedBusinessId);
    }

    const apiUrl = `${getApiURL()}/inventory/${id}?${queryParams}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete item');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

const updateStockAPI = async (id, amount, reason = "Manual Update") => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const apiUrl = `${getApiURL()}/inventory/${id}/stock?business_id=${selectedBusinessId}`;

    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity_change: amount, reason })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update stock');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

const fetchStockHistoryAPI = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const selectedBusinessId = localStorage.getItem('selectedBusinessId');
    const apiUrl = `${getApiURL()}/inventory/${id}/stock/history?business_id=${selectedBusinessId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch stock history');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

// Helper function to convert qty to integer
const convertQtyToInteger = (value) => {
  return Math.floor(parseFloat(value) || 0);
};

// Helper function to map API item to frontend product object with currency conversion
const mapItem = (item, selectedCurrency = "INR") => ({
  ...item,
  id: item.id,
  code: item.item_code,
  name: item.item_name,
  category: item.category_name || item.category,
  category_id: item.category_id,
  type: item.item_type,
  qty: convertQtyToInteger(item.opening_stock),
  purchasePrice: item.purchase_price || 0,
  salePrice: item.sale_price || 0,
  hsn: item.hsn_code,
  gstRate: item.gst_rate,
  unit: item.unit,
  itemCode: item.item_code,
  serviceCode: item.item_code,
  description: item.description,
  openingStock: convertQtyToInteger(item.opening_stock),
  lowStockQty: item.low_stock_qty,
  altUnit: item.alt_unit,
  altConvRate: item.conversion_rate,
  asOfDate: formatDateForInput(item.as_of_date),
  purchasePriceTaxType: item.purchase_price_tax_type,
  salePriceTaxType: item.sale_price_tax_type,
  image_url: item.image_url,
  lowStock: item.low_stock_qty !== null && item.low_stock_qty !== undefined,
  isLowStock: (item.opening_stock || 0) <= (item.low_stock_qty || 0) && item.low_stock_qty !== null && item.low_stock_qty !== undefined
});

/* ---------------- Inventory (parent) — FULL ---------------- */
export default function Inventory({ currency = "USD", checkBusiness }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [totalProductCount, setTotalProductCount] = useState(0); // Total unfiltered count

  // Force Google Translate to re-translate when button text changes
  useEffect(() => {
    const lang = localStorage.getItem("siteLang");
    if (lang && !lang.startsWith("en-") && window.google?.translate) {
      // Get the current language code
      const baseLang = lang.split("-")[0];
      if (baseLang !== "en") {
        // Force re-translate by re-initializing the combo box
        const select = document.querySelector(".goog-te-combo");
        if (select && select.value !== baseLang) {
          select.value = baseLang;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  }, [showLowOnly]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessType, setBusinessType] = useState(null);

  // Format currency display function - accessible throughout component
  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  // Fetch business type
  useEffect(() => {
    const savedBusinessType = localStorage.getItem('currentBusinessType');
    if (savedBusinessType) {
      setBusinessType(savedBusinessType);
    }

    const handleBusinessChange = () => {
      const newBusinessType = localStorage.getItem('currentBusinessType');
      setBusinessType(newBusinessType);
    };

    window.addEventListener('businessChanged', handleBusinessChange);
    return () => {
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, []);
  const loadInventoryData = async (currentFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories and items in parallel
      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchInventoryItems(currentFilters)
      ]);

      setCategories(categoriesData);
      const mapped = itemsData.map(item => mapItem(item, currency));
      setProducts(mapped);
      // Only update total count when no filters are active
      if (!currentFilters.low_stock_only && !currentFilters.search && !currentFilters.category_id) {
        setTotalProductCount(mapped.length);
      }
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadInventoryData({
      category_id: selectedCategory,
      search: searchName,
      low_stock_only: showLowOnly
    });
  }, []);

  // Fetch items when filters change
  useEffect(() => {
    const loadFilteredItems = async () => {
      // Don't fetch if loading is already true from another effect
      // But we need to make sure we don't skip the VERY FIRST filter-triggered load if initial load is still in progress

      try {
        const filters = {};
        if (selectedCategory) filters.category_id = selectedCategory;
        if (searchName.trim()) filters.search = searchName.trim();
        if (showLowOnly) filters.low_stock_only = true;

        const itemsData = await fetchInventoryItems(filters);
        const mapped = itemsData.map(item => mapItem(item, currency));
        setProducts(mapped);
        // Update total count when no filters active
        if (!filters.low_stock_only && !filters.search && !filters.category_id) {
          setTotalProductCount(mapped.length);
        }
      } catch (err) {
        console.error('Error loading filtered items:', err);
        setError(err.message || 'Failed to load filtered items');
      }
    };

    // Skip if it is the very first render (handled by initial load)
    // but subsequent filter changes should trigger this
    loadFilteredItems();
  }, [selectedCategory, searchName, showLowOnly, currency]);

  // Listen for business changes and refetch inventory
  useEffect(() => {
    const handleBusinessChanged = (event) => {

      loadInventoryData({
        category_id: selectedCategory,
        search: searchName,
        low_stock_only: showLowOnly
      });
    };

    window.addEventListener('businessChanged', handleBusinessChanged);

    return () => {
      window.removeEventListener('businessChanged', handleBusinessChanged);
    };
  }, []);

  const filteredProducts = products.filter((p) => {
    // Since we're now fetching filtered data from API, we just return all products
    // The filtering is done on the backend
    return true;
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);


  const handleAddNew = () => {
    setEditingItem(null);
    setShowInventoryModal(true);
  };

  const handleEditClick = (row) => {
    setEditingItem(row);
    setShowInventoryModal(true);
  };

  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteInventoryItem(itemToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== itemToDelete.id));

      // Sync total count after deletion
      setTotalProductCount(prev => Math.max(0, prev - 1));

      if (selectedItem?.id === itemToDelete.id) setSelectedItem(null);
      await toastSuccess("Item deleted successfully");
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      await toastError("Failed to delete item: " + error.message);
    }
  };

  const handleSaveItem = async (item, originalCode = null) => {
    try {
      // Prepare data for API
      const apiData = {
        item_name: item.name,
        item_code: item.code || item.itemCode || item.serviceCode,
        category_id: item.category_id,
        item_type: item.type,
        description: item.description,
        unit: item.unit,
        gst_rate: item.gstRate,
        purchase_price: convertToINR(item.purchasePrice || 0, currency),
        sale_price: convertToINR(item.salePrice || 0, currency),
        purchase_price_tax_type: item.purchasePriceTaxType,
        sale_price_tax_type: item.salePriceTaxType,
        opening_stock: item.openingStock,
        low_stock_qty: item.lowStockQty,
        hsn_code: item.hsn,
        alt_unit: item.altUnit,
        conversion_rate: item.altConvRate,
        as_of_date: item.asOfDate,
        imageFile: item.imageFile,
        image_url: item.image_url
      };

      let result;
      if (item.id) {
        // Update existing item
        result = await updateInventoryItem(item.id, apiData);
        // Refresh the data with current filters
        const currentFilters = {
          category_id: selectedCategory,
          search: searchName,
          low_stock_only: showLowOnly
        };
        const itemsData = await fetchInventoryItems(currentFilters);
        setProducts(itemsData.map(it => mapItem(it, currency)));

        // Sync total count if no filters are active
        if (!selectedCategory && !searchName && !showLowOnly) {
          setTotalProductCount(itemsData.length);
        }

        if (selectedItem?.id === item.id) {
          const updatedItem = itemsData.find(i => i.id === item.id);
          if (updatedItem) {
            setSelectedItem(mapItem(updatedItem, currency));
          }
        }
        return { success: true };
      } else {
        // Create new item
        result = await createInventoryItem(apiData);
        // Refresh the data with current filters
        const currentFilters = {
          category_id: selectedCategory,
          search: searchName,
          low_stock_only: showLowOnly
        };
        const itemsData = await fetchInventoryItems(currentFilters);
        setProducts(itemsData.map(it => mapItem(it, currency)));

        // CRITICAL FIX: Update total count to reflect the new item
        // If filters are active, we increment the previous count
        // If no filters are active, we use the itemsData length
        if (!selectedCategory && !searchName && !showLowOnly) {
          setTotalProductCount(itemsData.length);
        } else {
          setTotalProductCount(prev => prev + 1);
        }

        return { success: true };
      }
    } catch (error) {
      console.error("Error in handleSaveItem:", error);
      return {
        success: false,
        message: error.message,
        code: error.response?.data?.code || (error.message.includes('already exists') ? 'DUPLICATE_ITEM_CODE' : null)
      };
    }
  };

  function generateTempCode() {
    return `TMP${Date.now().toString().slice(-6)}`;
  }

  const handleEditFromDetail = (item) => {
    setEditingItem(item);
    setShowInventoryModal(true);
  };

  if (loading) {
    return <MainLoader message="Loading inventory..." />;
  }

  return (
    <div className="custombackground min-h-screen w-full rounded-xl mt-4">
      <div className="min-h-screen font-sans rounded-xl">
        {/* Topbar & List view - Always show when not in detail view */}
        {!selectedItem && (
          <>
            {/* Search bar and filters - Always visible */}
            <div className="bg-transparent rounded-t-xl backdrop-blur-sm p-4">
              <div className="w-full">
                {/* Mobile Header - Unified with Back Button */}
                <div className="md:hidden flex flex-col space-y-3 mb-4">
                  <div className="flex items-center justify-between w-full">
                    <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
                    <button
                      className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                      onClick={handleAddNew}
                    >
                      <Plus className="w-4 h-4" /> {businessType === 'Services' ? 'New Service' : 'New'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center items-stretch gap-3 justify-between w-full">
                  <div className="hidden md:block">
                    <DashboardBackButton />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 justify-end">
                    <div className="relative group flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#129046] transition-colors" />
                      <input
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Search items..."
                        className="w-full h-8 pl-10 pr-4 bg-white border-1 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-[#129046]/10 outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-full sm:w-auto">
                        <CategorySelectInput
                          categories={categories}
                          value={selectedCategory}
                          onChange={(v) => setSelectedCategory(v)}
                          className="h-8 px-3 border-1 border-gray-300"
                        />
                      </div>

                      <button
                        onClick={() => setShowLowOnly((v) => !v)}
                        className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-sm transition-all ${showLowOnly ? "bg-red-500 text-white shadow-lg" : "bg-yellow-500 text-white"}`}
                      >
                        {showLowOnly ? "Show All" : "Low Stock"}
                      </button>

                      <div className="hidden md:block">
                        <button
                          className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5"
                          onClick={handleAddNew}
                        >
                          <Plus size={18} /> {businessType === 'Services' ? 'New Service' : 'New'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Show content only when products ever existed (even if current filter shows 0) */}
            {(totalProductCount > 0 || showLowOnly || searchName || selectedCategory) && (
              <>
                {/* Mobile Cards View - Only show if there are filtered results */}
                {filteredProducts.length > 0 && (
                  <div className="md:hidden p-4 space-y-3">
                    {filteredProducts.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedItem(item)}
                      >
                        {/* Header Row - Item Name and Type */}
                        <div className="flex items-center gap-3 mb-4">
                          {item.image_url && (
                            <img
                              src={getImageURL(item.image_url)}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-full border-2 border-gray-200 flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          )}
                          <div
                            className="w-10 h-10 bg-[#1fbe5a] rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ display: item.image_url ? 'none' : 'flex' }}
                          >
                            <Search className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-700">
                                {item.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Table-like Details Grid - 3 Row Layout */}
                        <div className="space-y-3 mb-4">
                          {/* Row 1: Category and Stock Quantity */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Category</div>
                              <div className="text-sm font-medium text-gray-900">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f3c117]/10 text-[#f3c117] border border-[#f3c117]/20">
                                  {item.category || "-"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Stock Qty</div>
                              <div className="text-sm font-medium text-gray-900">{Math.floor(parseFloat(item.qty) || 0)} {item.unit || "PCS"}</div>
                            </div>
                          </div>

                          {/* Row 2: Purchase Price and Sale Price */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide"><span>Purchase Price</span></div>
                              <div className="text-sm font-medium text-gray-900"><span translate="no">{formatCurrencyDisplay(item.purchasePrice)}</span></div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide"><span>Sale Price</span></div>
                              <div className="text-sm font-medium text-gray-900"><span translate="no">{formatCurrencyDisplay(item.salePrice)}</span></div>
                            </div>
                          </div>

                          {/* Row 3: Low Stock Status and Action Buttons */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Low Stock Alert</div>
                              <div className="flex items-center justify-start">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${item.isLowStock
                                  ? "text-red-600 bg-red-50 border border-red-200"
                                  : "text-green-600 bg-green-50 border border-green-200"
                                  }`}>
                                  {item.isLowStock ? <span>Low Stock</span> : <span>In Stock</span>}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Actions</div>
                              <ActionButtons
                                onView={(e) => { if (e) e.stopPropagation(); setSelectedItem(item); }}
                                onEdit={(e) => { if (e) e.stopPropagation(); handleEditClick(item); }}
                                onDelete={(e) => { if (e) e.stopPropagation(); handleDeleteClick(item); }}
                                actions={['view', 'edit', 'delete']}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State - When search returns no results on mobile */}
                {filteredProducts.length === 0 && (
                  <div className="md:hidden p-4">
                    <GeneralEmptyState
                      title="No Items Found"
                      description="Try adjusting your search or filters, or add a new item."
                    />
                  </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden mb-6">
                  <ReusableTable
                    columns={[
                      {
                        key: "code",
                        title: "Code",
                        sortable: true,
                        render: (r) => (
                          <div className="flex items-center">
                            <span className="text-sm text-gray-700">
                              {r.code}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "name",
                        title: "Name",
                        sortable: true,
                        render: (r) => (
                          <span className="text-sm text-gray-700">
                            {r.name}
                          </span>
                        ),
                      },
                      // Image column - only for products
                      ...(filteredProducts.some(p => p.type === 'product') ? [{
                        key: "image",
                        title: "Image",
                        sortable: false,
                        render: (r) => {
                          // Only show image for products
                          if (r.type === 'service') {
                            return null;
                          }
                          return (
                            <div className="flex items-center justify-center text-center w-full">
                              {r.image_url && (
                                <img
                                  src={getImageURL(r.image_url)}
                                  alt={r.name}
                                  className="w-8 h-8 object-cover rounded border mx-auto"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              )}
                              <div
                                className="w-8 h-8 bg-gray-100 border rounded flex items-center justify-center mx-auto"
                                style={{ display: r.image_url ? 'none' : 'flex' }}
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          );
                        },
                      }] : []),
                      { key: "category", title: "Category", sortable: true },
                      {
                        key: "hsn",
                        title: "HSN/SAC Code",
                        sortable: true,
                        render: (r) => (
                          <span className="text-sm text-gray-700">
                            {r.hsn || "-"}
                          </span>
                        ),
                      },
                      {
                        key: "qty",
                        title: "Qty",
                        sortable: true,
                        align: "right",
                        render: (r) => <span>{Math.floor(parseFloat(r.qty) || 0)}</span>,
                      },
                      {
                        key: "purchasePrice",
                        title: "Purchase Price",
                        align: "right",
                        render: (r) => (
                          <span translate="no">{formatCurrencyDisplay(r.purchasePrice)}</span>
                        ),
                      },
                      {
                        key: "salePrice",
                        title: "Sale Price",
                        align: "right",
                        render: (r) => (
                          <span translate="no">{formatCurrencyDisplay(r.salePrice)}</span>
                        ),
                      },
                    ]}
                    data={filteredProducts}
                    rowKey="id"
                    defaultPageSize={10}
                    pageSizeOptions={[5, 10, 15, 20]}
                    searchable={false}
                    onRowClick={(row) => setSelectedItem(row)}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    emptyState={
                      <GeneralEmptyState
                        title="No Items Found"
                        description="Try adjusting your search or filters, or add a new item."
                      />
                    }
                  />
                </div>

                {/* Empty State - When search returns no results on desktop */}
                {filteredProducts.length === 0 && (
                  <div className="hidden md:block overflow-hidden mb-6 p-6">
                    <GeneralEmptyState
                      title="No Items Found"
                      description="Try adjusting your search or filters to find what you're looking for."
                    />
                  </div>
                )}


              </>
            )}

            {/* Empty State - When no products exist at all */}
            {!loading && totalProductCount === 0 && !showLowOnly && !searchName && !selectedCategory && (
              <div className="p-6">
                <GeneralEmptyState
                  title={businessType === 'Services' ? "No Services Found" : "No Inventory Found"}
                  description={businessType === 'Services'
                    ? "You haven't added any services yet. Start by creating your first service to manage your offerings."
                    : "You haven't added any items to your inventory yet. Start by creating your first product to manage your stock."}
                  buttonText={businessType === 'Services' ? "Add First Service" : "Add First Item"}
                  onButtonClick={handleAddNew}
                  icon={Search}
                />
              </div>
            )}


          </>
        )}

        {/* Detail view */}
        {selectedItem && (
          <ItemDetailView
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            allItems={products}
            onSelectItem={(it) => setSelectedItem(it)}
            onEdit={handleEditFromDetail}
            onDelete={handleDeleteClick}
            currency={currency}
            formatCurrencyDisplay={formatCurrencyDisplay}
          />
        )}

        <InventoryFormModal
          open={showInventoryModal}
          onClose={() => {
            setShowInventoryModal(false);
            setEditingItem(null);
          }}
          categories={categories}
          onSubmit={handleSaveItem}
          initialItem={editingItem}
          currency={currency}
          formatCurrencyDisplay={formatCurrencyDisplay}
          onCategoryCreated={(newCat) => {
            if (newCat && typeof newCat === 'object') {
              setCategories(prev => [...prev, newCat]);
            }
            fetchCategories();
          }}
        />

        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name || ""}
          itemType={itemToDelete?.type === "service" ? "service" : "item"}
        />
      </div>
    </div>
  );
}