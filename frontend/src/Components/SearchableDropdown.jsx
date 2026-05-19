import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function SearchableDropdown({ options, value, onChange, placeholder, labelBy = "label", valueBy = "value", allowCustom = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef();

  const filtered = options.filter(o => {
    const label = typeof o === "string" ? o : o[labelBy];
    return label.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedOption = options.find(o => (typeof o === "string" ? o : o[valueBy]) === value);
  const displayLabel = selectedOption ? (typeof selectedOption === "string" ? selectedOption : selectedOption[labelBy]) : (allowCustom ? (value || placeholder) : placeholder);

  return (
    <div className="relative h-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full h-full border-2 border-gray-200 rounded-lg px-3 flex items-center justify-between bg-white text-sm focus:border-[#64b34e] outline-none transition-all font-[DM_Sans] text-gray-700 hover:border-gray-300 ${disabled ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <span className={value ? "text-gray-800 font-bold capitalize" : "text-gray-400 font-medium"}><span>{displayLabel}</span></span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[240px] overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-gray-200">
            {options.map((o, idx) => {
              const val = typeof o === "string" ? o : o[valueBy];
              const label = typeof o === "string" ? o : o[labelBy];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { onChange(val); setOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-all ${value === val ? "bg-[#64b34e] text-white font-semibold" : "text-gray-700 hover:bg-[#64b34e]/10 hover:text-[#64b34e]"}`}
                >
                  <span className={`capitalize ${value === val ? "text-white font-bold" : "text-gray-900 font-medium"}`}><span>{label}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
