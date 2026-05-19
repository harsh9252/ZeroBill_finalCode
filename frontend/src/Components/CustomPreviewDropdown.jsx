import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

/**
 * CustomPreviewDropdown
 * A shared dropdown component used primarily in preview headers for format selection and status filtering.
 */
function CustomPreviewDropdown({ options, value, onChange, placeholder, className = "", defaultOptionId, onSetDefault }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => 
        opt.id === value || opt.label === value || opt.value === value
    );

    return (
        <div className={`relative z-50 ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-8 px-3 py-1 border-1 border-gray-200 rounded-[7px] text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors bg-white text-left flex items-center justify-between shadow-sm"
            >
                <span className={`truncate ${selectedOption ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white border-1 border-gray-200 rounded-[7px] shadow-lg max-h-48 overflow-y-auto">
                    {options.map((option) => {
                        const isSelected = selectedOption && (
                            selectedOption.id === option.id || 
                            selectedOption.label === option.label || 
                            selectedOption.value === option.value
                        );
                        return (
                            <button
                                key={option.id || option.value || option.label}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left transition-colors first:rounded-t-[7px] last:rounded-b-[7px] ${
                                    isSelected
                                        ? "bg-[#129046] text-white hover:bg-[#129046]/90"
                                        : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                                }`}
                            >
                                <div className="flex items-center justify-between w-full group/item">
                                    <div className="flex flex-col">
                                        <div className="font-medium text-sm">
                                            {option.label}
                                        </div>
                                        {option.trade_name && (
                                            <div className={`text-xs ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                                                {option.trade_name}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {onSetDefault && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSetDefault(option);
                                            }}
                                            className={`p-1 rounded-full transition-all hover:bg-white/20 ${
                                                (String(option.id) === String(defaultOptionId) || String(option.value) === String(defaultOptionId))
                                                    ? "text-yellow-400 opacity-100"
                                                    : isSelected ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-yellow-400"
                                            }`}
                                            title="Set as Default"
                                        >
                                            <Star 
                                                size={14} 
                                                fill={(String(option.id) === String(defaultOptionId) || String(option.value) === String(defaultOptionId)) ? "currentColor" : "none"} 
                                                strokeWidth={2.5}
                                            />
                                        </button>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CustomPreviewDropdown;
