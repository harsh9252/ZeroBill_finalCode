import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal } from "../../../Components/ActionMessageModel.jsx";
import { salesLeadAPI, businessAPI, getApiConfig } from "../../../utils/api.js";
import { subUserService } from "../../../services/subUserService.js";
import { toISODate } from "../../../utils/dateFormat.js";
import { convertToINR, convertFromINR, getCurrencySymbol } from "../../../utils/currency.js";
import { countryCodes } from "../../../utils/countryCodes.js";

import {
  ArrowLeft, Plus, X, Edit2, XCircle, FileText, Upload, ChevronDown, TrendingUp
} from "lucide-react";
import SearchableDropdown from "../../../Components/SearchableDropdown.jsx";

const UOM_OPTIONS = ["Nos", "Kg", "MT", "Litre", "Box", "Set", "Pair", "Sq.ft", "Sq.m", "Mtr", "RMt"];
const SOURCE_OPTIONS = ["Website", "Referral", "Cold Call", "Exhibition", "LinkedIn", "Email Campaign", "Walk-in", "Partner"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

// ─── Helpers ───────────────────────────────────────────────────────────────
function PriorityBadge({ value }) {
  const cls = value === "High"
    ? "bg-red-100 text-red-700"
    : value === "Medium"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <span>{value || "–"}</span>
    </span>
  );
}

function StatusBadge({ value }) {
  if (value === "converted")
    return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"><span>✓</span> <span>Converted</span></span>;
  if (value === "closed")
    return <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full"><span>●</span> <span>Closed</span></span>;
  return <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full"><span>◉</span> <span>Open</span></span>;
}

function ProbBar({ value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span translate="no" className="text-xs font-semibold text-green-700 w-8">{value}%</span>
      <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: "linear-gradient(to right,#64b34e,#9ccc53)" }}
        />
      </div>
    </div>
  );
}

// ─── UOM Tag Input ──────────────────────────────────────────────────────────
function UOMInput({ selected, onChange }) {
  const [sel, setSel] = useState("");
  const [customUOM, setCustomUOM] = useState("");

  const add = () => {
    const valueToAdd = sel === "Other" ? customUOM.trim() : sel;
    if (!valueToAdd || selected.includes(valueToAdd)) return;
    onChange([...selected, valueToAdd]);
    setSel("");
    setCustomUOM("");
  };

  const remove = (u) => onChange(selected.filter((x) => x !== u));

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
          >
            <option value="">Select UOM</option>
            {UOM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            <option value="Other">+ Other</option>
          </select>
          {sel !== "Other" && (
            <button
              type="button"
              onClick={add}
              className="px-3 py-2 rounded-lg text-white text-sm font-bold"
              style={{ background: "linear-gradient(to right,#64b34e,#9ccc53)" }}
            >
              +
            </button>
          )}
        </div>

        {sel === "Other" && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter custom UOM"
              value={customUOM}
              onChange={(e) => setCustomUOM(e.target.value)}
              className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={add}
              className="px-3 py-2 rounded-lg text-white text-sm font-bold"
              style={{ background: "linear-gradient(to right,#64b34e,#9ccc53)" }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((u) => (
            <span key={u} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-800 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span>{u}</span>
              <button type="button" onClick={() => remove(u)} className="text-red-400 hover:text-red-600 leading-none"><span>×</span></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Section ─────────────────────────────────────────────────────────
function FileUploadArea({ files, onChange }) {
  const inputRef = useRef();
  const { backendURL } = getApiConfig();

  const handleFiles = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    showLoadingModal("Uploading file...");
    try {
      const newFiles = [];
      for (const file of selected) {
        const res = await businessAPI.uploadFile(file);
        if (res.success) {
          newFiles.push({ name: res.filename, url: res.file_url });
        }
      }
      onChange([...files, ...newFiles]);
      showSuccessToast("File uploaded successfully");
    } catch (error) {
      showErrorToast("Upload failed");
    } finally {
      closeModal();
      e.target.value = "";
    }
  };

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500 cursor-pointer hover:border-green-600 hover:text-green-700 transition-colors bg-gray-50/50"
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
        <span>Click to upload proposal (PDF, DOCX, XLSX…)</span>
        <input type="file" ref={inputRef} multiple style={{ display: "none" }} onChange={handleFiles} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-4">
          {files.map((f, i) => {
            const isObj = f && typeof f === 'object';
            const name = isObj ? (f.name || 'Untitled File') : f;
            const url = isObj ? f.url : null;
            return (
              <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-800 font-medium">
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  {url ? (
                    <a href={`${backendURL}${url}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-700">
                      {name}
                    </a>
                  ) : (
                    <span> {name}</span>
                  )}
                </div>
                <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-base leading-none"><span>×</span></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef();
  const filtered = countryCodes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial_code.includes(search)
  );
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  return (
    <div className="relative h-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-[90px] h-full border-2 border-gray-200 rounded-lg px-2 flex items-center justify-between bg-white text-sm focus:border-[#64b34e] outline-none transition-all font-[DM_Sans] hover:border-gray-300"
      >
        <span translate="no" className="font-bold text-gray-800">{value}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[320px] overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-gray-200">
            {countryCodes.map(c => (
              <button
                key={c.code + c.dial_code}
                type="button"
                onClick={() => { onChange(c.dial_code); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-all ${value === c.dial_code ? "bg-[#64b34e] text-white font-semibold" : "text-gray-700 hover:bg-[#64b34e]/10 hover:text-[#64b34e]"}`}
              >
                <span translate="no" className={`font-bold min-w-[45px] ${value === c.dial_code ? "text-white" : "text-gray-900"}`}>{c.dial_code}</span>
                <span className={`truncate ${value === c.dial_code ? "text-white/90" : "text-gray-500"}`}><span>({c.name})</span></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form Field ─────────────────────────────────────────────────────────────
function Field({ label, children, hAuto = false }) {
  return (
    <div className="flex flex-col gap-1.5 h-full">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider"><span>{label}</span></label>
      <div className={hAuto ? "h-auto" : "h-9"}>
        {children}
      </div>
    </div>
  );
}
const inputCls = "border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none transition-colors w-full font-[DM_Sans]";



// ─── Lead Form (add / edit) ─────────────────────────────────────────────────
const emptyForm = () => ({
  leadNo: "", title: "", value: "", uoms: [], email: "", phone: "", countryCode: "+91",
  source: "", probability: "", priority: "", status: "open", dateAdded: new Date().toISOString().split("T")[0],
  assignedTo: "", files: [], activityLog: [],
});

function LeadForm({ form, onChange, currency, subUsers = [] }) {
  const set = (k, v) => onChange({ ...form, [k]: v });
  const symbol = getCurrencySymbol(currency);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Field label="Lead Title *">
          <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Enter lead title" />
        </Field>
        <Field label={`Estimated Value *`}>
          <div className="relative">

            <input className={inputCls + " !pl-7"} type="number" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="0.00" />
          </div>
        </Field>
        <Field label="UOM (Multiple)" hAuto>
          <UOMInput selected={form.uoms} onChange={(v) => set("uoms", v)} />
        </Field>
        <Field label="Lead Source">
          <SearchableDropdown
            options={SOURCE_OPTIONS}
            value={form.source}
            onChange={(val) => set("source", val)}
            placeholder="Select Source"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Field label="Customer Email">
          <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter your email" />
        </Field>
        <Field label="Customer Phone">
          <div className="flex gap-1 h-full">
            <CountrySelect
              value={form.countryCode}
              onChange={(val) => set("countryCode", val)}
            />
            <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/[^0-9\s-]/g, ""))} placeholder="Enter mobile number" />
          </div>
        </Field>
        <Field label="Probability (%)">
          <input className={inputCls} type="number" min="0" max="100" value={form.probability} onChange={(e) => set("probability", e.target.value)} placeholder="0–100" />
        </Field>
        <Field label="Priority">
          <SearchableDropdown
            options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(val) => set("priority", val)}
            placeholder="Select Priority"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Field label="Date Added">
          <input className={inputCls} type="date" value={form.dateAdded} onChange={(e) => set("dateAdded", e.target.value)} />
        </Field>
        <Field label="Assigned To">
          <SearchableDropdown
            options={subUsers.map(u => u.name)}
            value={form.assignedTo}
            onChange={(val) => set("assignedTo", val)}
            placeholder="Name or team"
            allowCustom={true}
          />
        </Field>
        <Field label="Sales Lead No">
          <input className={inputCls + " bg-gray-50"} value={form.leadNo} readOnly placeholder="Auto Generated" />
        </Field>
        <Field label="Status">
          <SearchableDropdown
            options={["open", "converted", "closed"]}
            value={form.status}
            onChange={(val) => set("status", val)}
            placeholder="Select Status"
            disabled={form.status === 'converted'}
          />
        </Field>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <Field label="Upload Proposal (if sent)" hAuto>
          <FileUploadArea files={form.files} onChange={(v) => set("files", v)} />
        </Field>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LeadManagement({ onBack, currency, saveLabel = "Save", cancelLabel = "Cancel" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get("id");

  const [form, setForm] = useState(() => emptyForm());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const [subUsers, setSubUsers] = useState([]);

  // ── Load lead data if editing ──
  useEffect(() => {
    if (editId) {
      const loadLead = async () => {
        setInitialLoading(true);
        try {
          const businessId = localStorage.getItem('selectedBusinessId');
          const res = await salesLeadAPI.getAll(businessId);
          if (res.success) {
            const lead = res.data.find(l => String(l.id) === String(editId));
            if (lead) {
              let phonePart = lead.phone || "";
              let codePart = "+91";
              if (phonePart.startsWith("+")) {
                const matched = [...countryCodes].sort((a, b) => b.dial_code.length - a.dial_code.length)
                  .find(c => phonePart.startsWith(c.dial_code));
                if (matched) {
                  codePart = matched.dial_code;
                  phonePart = phonePart.slice(matched.dial_code.length).trim();
                }
              }

              setForm({
                leadNo: lead.lead_no,
                title: lead.title,
                value: convertFromINR(lead.value, currency).toFixed(2),
                uoms: lead.uoms || [],
                email: lead.email,
                phone: phonePart,
                countryCode: codePart,
                source: lead.source,
                probability: lead.probability || "",
                priority: lead.priority || "",
                status: lead.status || "open",
                dateAdded: toISODate(lead.date_added),
                assignedTo: lead.assigned_to,
                files: lead.files || [],
                activityLog: lead.activity_log || [],
              });
            } else {
              showErrorToast("Lead not found");
            }
          }
        } catch (error) {
          showErrorToast("Failed to load lead details");
        } finally {
          setInitialLoading(false);
        }
      };
      loadLead();
    } else {
      // Fetch next lead number for new leads
      const fetchNextLeadNo = async () => {
        try {
          const businessId = localStorage.getItem('selectedBusinessId');
          if (!businessId) return;
          const res = await salesLeadAPI.getNextNumber(businessId);
          if (res.success && res.data) {
            setForm(prev => ({ ...prev, leadNo: res.data.lead_no }));
          }
        } catch (error) {
          console.error("Failed to fetch next lead number:", error);
        }
      };
      fetchNextLeadNo();
    }
  }, [editId, currency]);

  // ── Load sub-users ──
  useEffect(() => {
    const fetchSubUsers = async () => {
      try {
        const res = await subUserService.getSubUsers();
        if (res.success) {
          setSubUsers(res.data.filter(u => u.is_active));
        }
      } catch (error) {
        console.error("Failed to fetch sub-users:", error);
      }
    };
    fetchSubUsers();
  }, []);

  // ── Save or Update lead ──
  const saveLead = async () => {
    if (!form.title.trim()) { showErrorToast("Lead Title is required"); return; }
    if (!form.value) { showErrorToast("Estimated Value is required"); return; }
    if (parseInt(form.probability) < 0 || parseInt(form.probability) > 100) {
      showErrorToast("Probability must be between 0 and 100");
      return;
    }

    // Email validation
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showErrorToast("Please enter a valid email address");
      return;
    }

    // Phone validation (looser check, no strict 10-digit/length requirement)
    if (form.phone && !/^[0-9\s\-]{3,20}$/.test(form.phone.replace(/\s/g, ""))) {
      showErrorToast("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const businessId = localStorage.getItem('selectedBusinessId');
      if (!businessId) {
        showErrorToast("Business ID not found");
        return;
      }

      const fullPhone = form.phone ? `${form.countryCode}${form.phone.trim()}` : "";

      const leadData = {
        business_id: businessId,
        lead_no: form.leadNo,
        title: form.title,
        value: convertToINR(parseFloat(form.value) || 0, currency),
        uoms: form.uoms,
        email: form.email,
        phone: fullPhone,
        source: form.source,
        probability: parseInt(form.probability) || 0,
        priority: form.priority || "Medium",
        status: form.status || "open",
        date_added: form.dateAdded,
        assigned_to: form.assignedTo,
        files: form.files,
        activity_log: form.activityLog
      };

      let res;
      if (editId) {
        // Update existing lead
        const updateData = {
          ...leadData,
          activity_log: [...(form.activityLog || []), { time: new Date().toLocaleString(), note: "Lead details updated via full page edit" }]
        };
        res = await salesLeadAPI.update(editId, updateData);
      } else {
        // Create new lead
        res = await salesLeadAPI.create(leadData);
      }

      if (res.success) {
        showSuccessToast(editId ? "Lead updated successfully!" : "Lead created successfully!");
        navigate("/sales-leads");
      } else {
        showErrorToast(res.message || (editId ? "Failed to update lead" : "Failed to create lead"));
      }
    } catch (error) {
      console.error("Error saving lead:", error);
      showErrorToast(error.message || "Failed to save lead");
    } finally {
      setLoading(false);
    }
  };

  const btnGreen = "bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm";
  const btnRed = "bg-red-600 text-white rounded-[7px] px-4 py-2 text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm";

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500"><span>Loading lead details...</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[#f8f7f4]">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sales-leads')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors group">
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
            </button>
            <div className="flex items-center gap-2">
              {/* <TrendingUp size={20} className="text-green-600" /> */}
              <h1 className="text-xl font-bold text-gray-800"><span>{editId ? "Edit Sales Lead" : "Create New Sales Lead"}</span></h1>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={() => navigate('/sales-leads')} className={btnRed + " flex-1 sm:flex-initial text-center justify-center"}>
              <span>{cancelLabel}</span>
            </button>

            <button onClick={saveLead} className={btnGreen + " flex-1 sm:flex-initial text-center justify-center"} disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editId ? "Update Lead" : saveLabel}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Form Area ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <LeadForm form={form} onChange={setForm} currency={currency} subUsers={subUsers} />
        </div>
      </div>
    </div>
  );
}