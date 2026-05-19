import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { Edit2, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { getApiConfig, customQuotationAPI } from "../../../utils/api.js";
import { toISODate } from "../../../utils/dateFormat.js";
import { showSuccessToast, showErrorToast, closeModal, showErrorModal } from "../../../Components/ActionMessageModel.jsx";
import TextEditorModal from "../../../Components/TextEditorModal.jsx";
import CustomQuotationPreview from "./CustomQuotationPreview.jsx";
import { Eye, ArrowLeft } from "lucide-react";

/* ---------- CSS ANIMATIONS ---------- */
const bounceAnimationStyle = `
  @keyframes uploadBounce {
    0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
    50% { transform: translateY(25%); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
  }
  .upload-bounce-animation { animation: uploadBounce 0.6s ease-in-out; animation-iteration-count: 2; }
`;

/* ---------- TERMS LIST STYLING ---------- */
const termsListStyles = `
  .terms-content { 
    line-height: 1.8; 
    color: #000; 
    font-family: inherit; 
    word-break: normal; 
    overflow-wrap: anywhere; 
  }
  .terms-content p { margin-bottom: 12px; }
  .terms-content ul, .terms-content ol { padding-left: 25px; margin-bottom: 15px; }
  .terms-content li { margin-bottom: 6px; }
  .terms-content h1, .terms-content h2, .terms-content h3 { 
    margin-top: 20px; 
    margin-bottom: 10px; 
    font-weight: bold; 
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
  }
  .terms-content table, 
  .terms-content table tr, 
  .terms-content table td, 
  .terms-content table th {
    border: 1px solid #000 !important;
  }
  .terms-content table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 20px 0 !important;
    border: 1.5px solid #000 !important;
    background-color: #fff !important;
  }
  .terms-content th, .terms-content td {
    padding: 10px 12px !important;
    vertical-align: top !important;
    text-align: left !important;
    min-width: 50px !important;
    color: #000 !important;
  }
  .terms-content th {
    background-color: #f8f9fa !important;
    font-weight: bold !important;
  }
  .terms-content strong { font-weight: 700; color: #000; }
`;

// Inject the styles
if (typeof document !== "undefined") {
  const styleId = "quotation-form-styles";
  let styleElement = document.getElementById(styleId);
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = bounceAnimationStyle + termsListStyles;
}

export default function CustomQuotationForm({
  initialData = {},
  onSave,
  onBack,
  formTitle = "",
  saveLabel = "Save Changes",
  cancelLabel = "Cancel",
  formType = "quotation"
}) {
  const navigate = useNavigate();
  // Handle cases where initialData might be explicitly passed as null
  const safeData = initialData || {};

  const [sections, setSections] = useState(() => {
    const existing = safeData.sections || [];
    if (existing.length > 0) {
      // If we have existing sections, we MUST ensure the first section (Cover Page)
      // has all the metadata from the parent object (initialData)
      const otherPages = existing.slice(0).map((s, i) => ({
        id: s.id || `page_${Date.now()}_${i}`,
        type: i === 0 && !s.content ? 'structured' : 'text',
        heading: s.heading || '',
        content: s.content,
        is_locked: (s.is_locked === true || s.is_locked === 1 || String(s.is_locked) === 'true')
      }));

      // Merge metadata into first section if it's the structured one
      otherPages[0] = {
        ...otherPages[0],
        type: 'structured',
        headerText: safeData.header_text || safeData.headerText || "PROJECT PROPOSAL",
        date: toISODate(safeData.quotation_date || safeData.date) || new Date().toISOString().split('T')[0],
        companyName: safeData.company_name || safeData.companyName || "",
        address: safeData.company_address || safeData.address || "",
        phone: safeData.company_phone || safeData.phone || "",
        email: safeData.company_email || safeData.email || "",
        logo: safeData.logo || "",
        businessName: safeData.business_name || "",
        remark: safeData.remark || "",
        is_locked: false, // Cover page should ALWAYS be unlocked
        quotation_number: safeData.quotation_number || ""
      };
      return otherPages;
    }

    // Try loading from localStorage for immediate "Last Used" experience
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      if (businessId) {
        const savedTemplate = localStorage.getItem(`ctq_template_${businessId}`);
        if (savedTemplate) {
          const parsed = JSON.parse(savedTemplate);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed[0]) {
              parsed[0].date = new Date().toISOString().split('T')[0];
              parsed[0].is_locked = false;
              // Clear client-specific fields for new quotes
              parsed[0].companyName = "";
              parsed[0].address = "";
              parsed[0].phone = "";
              parsed[0].email = "";
              parsed[0].businessName = "";
              parsed[0].logo = ""; // Clear logo for new proposals
              parsed[0].quotation_number = ""; // Reset number to ensure we fetch fresh one
            }
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load CTQ template from localStorage", e);
    }

    return []; // Start empty if no local template found (useEffect will fetch next)
  });

  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Helper to update fields for Page 1
  const handleFieldChange = (field, value) => {
    setSections(prev => prev.map((s, i) => i === 0 ? { ...s, [field]: value } : s));
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };



  // Fetch custom quotation data (Initial draft OR from existing document)
  useEffect(() => {
    const fetchQuotationData = async () => {
      const documentId = initialData?.dbId || initialData?.id;
      const businessId = localStorage.getItem('selectedBusinessId');

      if (!businessId) return;

      try {
        if (documentId) {
          // Case 1: Editing Existing Document
          const response = await customQuotationAPI.getById(documentId);
          if (response?.success && response?.data) {
            const q = response.data;

            const mainSection = {
              id: `page_1_${Date.now()}`,
              type: 'structured',
              headerText: q.header_text || "",
              date: toISODate(q.quotation_date) || new Date().toISOString().split('T')[0],
              companyName: q.company_name || "",
              address: q.company_address || "",
              phone: q.company_phone || "",
              email: q.company_email || "",
              logo: q.logo || "",
              businessName: q.business_name || "",
              remark: q.remark || "",
              is_locked: false, // Cover page should ALWAYS be unlocked
              quotation_number: q.quotation_number || "" // Load quotation number
            };

            const otherPages = (q.sections || []).map((s, i) => ({
              id: s.id || `temp_${Date.now() + i + 1}`,
              type: 'text',
              heading: s.heading || '',
              content: s.content,
              is_locked: !!s.is_locked
            }));

            setSections([mainSection, ...otherPages]);
          }
        } else {
          // Case 2: New Document - Fetch "Locked" Defaults from ALL Previous Documents (Cumulative)
          const response = await customQuotationAPI.getByBusinessId(businessId);
          if (response?.success && response?.data && Array.isArray(response.data)) {
            // Find the most recent quote with ANY locked metadata to use as the base for the Cover Page
            const latestWithMetaLock = response.data.find(q => (q.is_metadata_locked == 1 || q.is_metadata_locked === true));

            // Build a Cumulative Template from ALL historical quotes
            // We iterate from oldest to newest so that newer versions overwrite older ones in the Map
            const lockedPagesMap = new Map();
            response.data.slice().reverse().forEach(q => {
              if (q.sections && Array.isArray(q.sections)) {
                q.sections.forEach(s => {
                  if (s.is_locked == 1 || s.is_locked === true) {
                    // Use heading as key for uniqueness
                    lockedPagesMap.set(s.heading || "Untitled Page", {
                      type: 'text',
                      heading: s.heading,
                      content: s.content,
                      is_locked: true
                    });
                  }
                });
              }
            });

            if (latestWithMetaLock || lockedPagesMap.size > 0) {
              const q = latestWithMetaLock || response.data[0]; // Fallback to newest for base fields
              const metaLocked = !!(q.is_metadata_locked == 1 || q.is_metadata_locked === true);

              // Pre-fill Page 1 (Keep Title/Logo, Clear Client Data)
              const defaultMain = {
                id: `page_1_${Date.now()}`,
                type: 'structured',
                headerText: q.header_text || "QUOTATION",
                date: new Date().toISOString().split('T')[0],
                companyName: "",
                address: "",
                phone: "",
                email: "",
                logo: "",
                businessName: "",
                remark: "",
                is_locked: false,
                quotation_number: ""
              };

              // Map the cumulative locked sections
              const lockedDefaults = Array.from(lockedPagesMap.values()).map((s, i) => ({
                ...s,
                id: `default_${Date.now() + i}`
              }));

              const finalSections = [defaultMain, ...lockedDefaults];

              // Fetch next CTQ number
              try {
                const nextNumRes = await customQuotationAPI.getNextNumber(businessId);
                if (nextNumRes?.success && nextNumRes?.data?.quotation_number) {
                  finalSections[0].quotation_number = nextNumRes.data.quotation_number;
                }
              } catch (err) { }

              setSections(finalSections);
              localStorage.setItem(`ctq_template_${businessId}`, JSON.stringify(finalSections));
            } else {
              // No previous locks found. At least provide a blank cover page structure
              // unless we already have some sections (e.g. from localStorage)
              setSections(prev => {
                if (prev.length > 0) return prev;

                const blankCover = {
                  id: `blank_cover_${Date.now()}`,
                  type: 'structured',
                  headerText: "PROJECT PROPOSAL",
                  date: new Date().toISOString().split('T')[0],
                  companyName: "",
                  address: "",
                  phone: "",
                  email: "",
                  logo: "",
                  businessName: "",
                  remark: "",
                  is_locked: false,
                  quotation_number: ""
                };

                return [blankCover];
              });
            }
          } else {
            // API failed or no data. Fallback to a plain cover page if empty.
            setSections(prev => prev.length > 0 ? prev : [{
              id: `page_1_${Date.now()}`,
              type: 'structured',
              headerText: "TAX QUOTATION",
              date: new Date().toISOString().split('T', 1)[0],
              is_locked: false,
              quotation_number: ""
            }]);
          }
        }
      } catch (error) {
        console.error("Error fetching custom quotation setup:", error);
      }
    };

    fetchQuotationData();
  }, [initialData?.id, initialData?.dbId]);

  // Dedicated useEffect to ENSURE the next number is fetched for NEW documents
  useEffect(() => {
    const businessId = localStorage.getItem('selectedBusinessId');
    const isNew = !(initialData?.id || initialData?.dbId);

    if (businessId && isNew) {
      customQuotationAPI.getNextNumber(businessId)
        .then(res => {
          if (res?.success && res.data?.quotation_number) {
            setSections(prev => {
              if (prev.length === 0) return prev;
              return prev.map((s, i) => i === 0 ? { ...s, quotation_number: res.data.quotation_number } : s);
            });
          }
        })
        .catch(err => console.error("Error fetching next number:", err));
    }
  }, [initialData?.id, initialData?.dbId]);

  const handleToggleLock = (sectionId) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, is_locked: !s.is_locked } : s));
  };

  const addCoverPage = async () => {
    const businessId = localStorage.getItem('selectedBusinessId');
    let nextNumber = "";
    if (businessId) {
      try {
        const nextNumRes = await customQuotationAPI.getNextNumber(businessId);
        if (nextNumRes?.success && nextNumRes?.data?.quotation_number) {
          nextNumber = nextNumRes.data.quotation_number;
        }
      } catch (err) {
        console.error("Error fetching next number:", err);
      }
    }

    const coverPage = {
      id: `page_1_${Date.now()}`,
      type: 'structured',
      headerText: safeData.headerText || "TAX QUOTATION",
      date: toISODate(safeData.quotation_date || safeData.date) || new Date().toISOString().split('T')[0],
      companyName: safeData.companyName || "",
      address: safeData.address || "",
      phone: safeData.phone || "",
      email: safeData.email || "",
      logo: safeData.logo || "",
      businessName: safeData.businessName || "",
      remark: safeData.remark || "",
      is_locked: false,
      quotation_number: nextNumber
    };
    setSections([coverPage]);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        showErrorToast("Logo size should be less than 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSections = [...sections];
        newSections[0] = { ...newSections[0], logo: reader.result };
        setSections(newSections);
      };
      reader.readAsDataURL(file);
    }
  };

  const addNewSection = () => {
    setEditingSectionId('new');
    setShowTextEditor(true);
  };

  const removeSection = (id) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const mainSection = sections[0];

    // Validation for required fields
    const errors = {};
    if (!mainSection.headerText?.trim()) {
      errors.headerText = "Quotation Title is required";
    }
    if (!mainSection.companyName?.trim()) {
      errors.companyName = "Prepared By is required";
    }
    if (!mainSection.phone?.trim()) {
      errors.phone = "Contact / Email is required";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showErrorToast("Please fill in all required fields");
      return;
    }
    setValidationErrors({});

    const businessId = localStorage.getItem("selectedBusinessId") || "1";
    const data = {
      business_id: businessId,
      quotation_number: mainSection.quotation_number, // Include the CTQ number
      header_text: mainSection.headerText,
      quotation_date: mainSection.date,
      company_name: mainSection.companyName,
      company_address: mainSection.address,
      company_phone: mainSection.phone,
      company_email: mainSection.email,
      logo: mainSection.logo,
      business_name: mainSection.businessName,
      remark: mainSection.remark,
      total_amount: safeData.total_amount || 0,
      is_metadata_locked: mainSection.is_locked, // Save metadata lock status
      sections: sections.slice(1).map((s, index) => ({
        section_order: index + 1,
        heading: s.heading,
        content: s.content,
        is_locked: s.is_locked
      })),
      status: 'Saved'
    };

    const documentId = safeData.dbId || safeData.id;

    try {
      setSubmitting(true);
      let response;
      if (documentId) {
        response = await customQuotationAPI.update(documentId, data);
      } else {
        response = await customQuotationAPI.create(data);
      }

      if (response.success) {
        // Save the currently locked pages as the "Template" for next time in localStorage
        const latestTemplate = [
          { ...sections[0], quotation_number: "", date: "" }, // Page 1 metadata
          ...sections.slice(1).filter(s => s.is_locked) // Only locked pages
        ];
        localStorage.setItem(`ctq_template_${businessId}`, JSON.stringify(latestTemplate));

        showSuccessToast("Custom Quotation saved successfully");
        if (onSave) onSave(response.data || data);
      } else {
        throw new Error(response.message || "Failed to save");
      }
      setSubmitting(false);
    } catch (err) {
      const errorMsg = err?.message || "Could not save";
      if (errorMsg.toLowerCase().includes("already exists") && errorMsg.toLowerCase().includes("quotation number")) {
        setValidationErrors(prev => ({ ...prev, quotation_number: errorMsg }));
        showErrorToast("Duplicate quotation number found");
      } else {
        showErrorModal({ title: "Save failed", text: errorMsg });
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mt-4 px-1 sm:px-2 py-4">
      <div className="w-full max-w-none px-2 sm:px-4">
        {/* Header */}
        <div className="bg-white border border-gray-300 text-yellow-900 rounded-[7px] mb-4 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-yellow-900 hover:text-green-700 transition-all p-1 rounded-full hover:bg-yellow-50"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold">{formTitle}</h3>
          </div>
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={onBack}
              className="bg-red-600 text-white px-5 h-[34px] rounded-[7px] text-xs font-medium hover:bg-red-700 transition-colors"
              disabled={submitting}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              form="termsForm"
              className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white px-6 h-[34px] rounded-[7px] text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Document"}
            </button>
          </div>
        </div>
        {/* Form Content */}
        <form id="termsForm" onSubmit={handleSubmit} className="space-y-6 pb-28">
          <div className="grid grid-cols-1 gap-6">
            {sections.map((section, index) => (
              <div key={section.id} className="bg-white border border-yellow-200 rounded-[7px] overflow-hidden shadow-sm">
                <div className="border-b border-yellow-100 bg-yellow-50/10 px-3 py-1 flex items-center justify-between">
                  {/* Page Title */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-yellow-900">
                      {index === 0 ? "Cover Page" : (section.heading || `Page ${index + 1}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Button for Text Pages */}
                    {section.type !== 'structured' && (
                      <button
                        type="button"
                        onClick={() => { setEditingSectionId(section.id); setShowTextEditor(true); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-all shadow-sm"
                        title="Edit Page Content"
                        disabled={section.is_locked}
                      >
                        <Edit2 size={13} strokeWidth={2.5} />
                      </button>
                    )}

                    {/* Lock Button (Hidden for Cover Page) */}
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleLock(section.id)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm ${section.is_locked
                          ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
                          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                          }`}
                        title={section.is_locked ? "Unlock Page" : "Lock Page"}
                      >
                        {section.is_locked ? <Lock size={13} strokeWidth={2} /> : <Unlock size={13} strokeWidth={2} />}
                      </button>
                    )}

                    {/* Delete Button */}
                    {section.type !== 'structured' && (
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        disabled={section.is_locked}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shadow-sm ${section.is_locked
                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                          : "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                          }`}
                        title={section.is_locked ? "Cannot delete locked page" : "Delete Page"}
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  {section.type === 'structured' ? (
                    /* COVER PAGE UI */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-yellow-50 pb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Business Logo</label>
                          <div className="flex items-center gap-3 h-10">
                            {section.logo ? (
                              <div className="w-10 h-10 rounded-lg border border-emerald-100 overflow-hidden bg-white shadow-sm flex-shrink-0">
                                <img src={section.logo} alt="Logo" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0">
                                <Plus size={16} className="text-gray-300" />
                              </div>
                            )}
                            <label className="flex-grow h-full border-2 border-dashed border-emerald-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-4">
                              {section.logo ? "Change Logo" : "Upload Logo"}
                              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            {section.logo && (
                              <button
                                type="button"
                                onClick={() => handleFieldChange('logo', "")}
                                className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors border border-red-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                            Proposal Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={section.headerText}
                            onChange={(e) => handleFieldChange('headerText', e.target.value)}
                            className={`w-full h-10 px-3 bg-white border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-bold text-yellow-900 ${validationErrors.headerText ? "border-red-500" : "border-gray-200"}`}
                            placeholder="PROJECT PROPOSAL"
                            disabled={section.is_locked}
                          />
                          {validationErrors.headerText && (
                            <p className="text-[10px] text-red-500 mt-0.5 ml-1 font-medium">{validationErrors.headerText}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Quotation No.</label>
                          <input
                            type="text"
                            value={section.quotation_number}
                            onChange={(e) => {
                              handleFieldChange('quotation_number', e.target.value);
                              if (validationErrors.quotation_number) {
                                setValidationErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.quotation_number;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full h-10 px-3 bg-white border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${validationErrors.quotation_number ? "border-red-500" : "border-gray-200"}`}
                            placeholder="CTQ-2024-25-0001"
                            disabled={section.is_locked}
                          />
                          {validationErrors.quotation_number && (
                            <p className="text-[10px] text-red-500 mt-0.5 ml-1 font-medium">{validationErrors.quotation_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Date</label>
                          <input
                            type="date"
                            value={section.date}
                            onChange={(e) => handleFieldChange('date', e.target.value)}
                            className="w-full h-10 px-3 bg-white border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900"
                            disabled={section.is_locked}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Company Name</label>
                          <input
                            type="text"
                            value={section.businessName}
                            onChange={(e) => handleFieldChange('businessName', e.target.value)}
                            className="w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900"
                            placeholder="e.g. Acme Corp"
                            disabled={section.is_locked}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                            Prepared By <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={section.companyName}
                            onChange={(e) => handleFieldChange('companyName', e.target.value)}
                            className={`w-full h-10 px-3 border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${validationErrors.companyName ? "border-red-500" : "border-gray-200"}`}
                            placeholder="e.g. Naomi David"
                            disabled={section.is_locked}
                          />
                          {validationErrors.companyName && (
                            <p className="text-[10px] text-red-500 mt-0.5 ml-1 font-medium">{validationErrors.companyName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Proposal For</label>
                          <input
                            type="text"
                            value={section.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className="w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900"
                            placeholder="Client Name"
                            disabled={section.is_locked}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                            Contact / Email
                          </label>
                          <input
                            type="text"
                            value={section.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            className={`w-full h-10 px-3 border-2 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900 ${validationErrors.phone ? "border-red-500" : "border-gray-200"}`}
                            placeholder="Contact Info"
                            disabled={section.is_locked}
                          />
                          {validationErrors.phone && (
                            <p className="text-[10px] text-red-500 mt-0.5 ml-1 font-medium">{validationErrors.phone}</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Website / Address</label>
                          <input
                            type="text"
                            value={section.address}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            className="w-full h-10 px-3 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900"
                            placeholder="www.website.com"
                            disabled={section.is_locked}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Remark</label>
                          <textarea
                            value={section.remark}
                            onChange={(e) => handleFieldChange('remark', e.target.value)}
                            className="w-full h-20 px-3 py-2 border-2 border-gray-200 rounded-[7px] focus:border-[#129046] outline-none transition-all font-medium text-yellow-900"
                            placeholder="Additional notes..."
                            disabled={section.is_locked}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* TEXT PAGE PREVIEW */
                    <div
                      className={`min-h-[50px] max-h-[100px] overflow-y-auto px-4 py-3 rounded-[7px] border-2 transition-all terms-content ${section.is_locked ? "bg-gray-50 opacity-60 border-gray-200" : "bg-white border-yellow-50 shadow-inner"}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content || `<p class="text-gray-400 italic text-center">No content added yet.</p>`) }}
                    />
                  )}
                </div>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-yellow-200 rounded-[7px] text-yellow-900 shadow-md">
                <button
                  type="button"
                  onClick={addCoverPage}
                  className="group flex flex-col items-center gap-4 transition-all hover:scale-105"
                >
                  <div className="w-14 h-14 bg-yellow-900 text-white rounded-full flex items-center justify-center shadow-lg group-hover:bg-yellow-800 transition-colors">
                    <Plus size={28} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wide">Add Cover Page</h4>
                </button>
              </div>
            )}
          </div>

          {/* Add Page Button */}
          {sections.length > 0 && (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={addNewSection}
                className="group flex items-center gap-2 bg-white text-yellow-900 font-bold px-6 py-2 rounded-xl border-2 border-dashed border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all active:scale-95 shadow-sm"
              >
                <div className="w-6 h-6 bg-yellow-900 text-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-90">
                  <Plus size={16} strokeWidth={3} />
                </div>
                <span className="text-sm">Add New Page</span>
              </button>
            </div>
          )}

          {/* Conditional Save Footer */}
          {sections.length >= 4 && (
            <div className="bg-white border border-yellow-200 p-4 flex justify-end gap-3 mt-12 rounded-[7px] shadow-sm mb-20">
              <button
                type="button"
                onClick={onBack}
                className="bg-red-600 text-white px-6 h-9 rounded-[7px] text-xs font-bold hover:bg-red-700 transition-colors"
                disabled={submitting}
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                form="termsForm"
                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white px-8 h-9 rounded-[7px] text-xs font-bold shadow-md hover:scale-[1.02]"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Document"}
              </button>
            </div>
          )}
        </form>
      </div>

      <TextEditorModal
        open={showTextEditor}
        sectionId={editingSectionId}
        initialContent={editingSectionId ? sections.find(s => s.id === editingSectionId)?.content || "" : ""}
        initialHeading={editingSectionId ? sections.find(s => s.id === editingSectionId)?.heading || "" : ""}
        onClose={() => { setShowTextEditor(false); setEditingSectionId(null); }}
        onSave={(html, heading, newId) => {
          if (editingSectionId === 'new') {
            const newPage = {
              id: newId || `temp_${Date.now()}`,
              type: 'text',
              heading: heading || `Page ${sections.length + 1}`,
              content: html,
              is_locked: false
            };
            setSections(prev => [...prev, newPage]);
          } else {
            setSections(prev => prev.map(s => s.id === editingSectionId ? { ...s, id: newId || s.id, content: html, heading } : s));
          }
          setShowTextEditor(false);
          setEditingSectionId(null);
        }}
      />

      {/* Real-time Preview Overlay */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-white overflow-hidden flex flex-col">
          <CustomQuotationPreview
            onBack={() => setShowPreview(false)}
            quotation={{
              id: "PREVIEW-MODE",
              quotation_number: sections[0]?.quotation_number || "CTQ-XXXX",
              quotation_date: sections[0]?.date || new Date().toISOString(),
              header_text: sections[0]?.headerText || "PROJECT PROPOSAL",
              company_name: sections[0]?.companyName || "Your Name",
              company_email: sections[0]?.email || "Proposal By",
              company_phone: sections[0]?.phone || "Contact Info",
              company_address: sections[0]?.address || "www.yourwebsite.com",
              logo: sections[0]?.logo || "",
              business_name: sections[0]?.businessName || "",
              remark: sections[0]?.remark || "",
              total_amount: 0,
              sections: sections.slice(1).map((s, idx) => ({
                section_order: idx + 1,
                heading: s.heading,
                content: s.content
              }))
            }}
          />
        </div>
      )}
    </div>
  );
}
