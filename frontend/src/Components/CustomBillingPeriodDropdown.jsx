import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomBillingPeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const options = [
    { id: 'month', label: 'Monthly' },
    { id: 'quarter', label: 'Quarterly' },
    { id: 'year', label: 'Yearly' }
  ];

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative w-full" ref={boxRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 transition-all text-gray-800 bg-white text-left flex items-center justify-between hover:border-gray-300"
      >
        <span className="text-sm">{selectedOption?.label || 'Select Period'}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg z-[1000] overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition-colors text-sm ${
                  value === option.id
                    ? 'bg-[#1fbe5a]/20 text-[#1fbe5a] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${value === option.id ? 'bg-[#1fbe5a]' : 'bg-gray-300'}`} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
