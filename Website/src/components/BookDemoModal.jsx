import { useState, useEffect, useRef } from 'react'
import { X, User, Mail, Phone, CheckCircle2, MessageSquare } from 'lucide-react'
import { countryCodes } from '../utils/countryCodes'
import './BookDemoModal.css'

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
  remark: '',
}

export default function BookDemoModal({ isOpen, onClose, onSuccess, backendUrl }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState('')
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  
  const phoneDropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Filter country codes based on search term
  const filteredCountryCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.dial_code.includes(phoneCodeSearchTerm)
  )

  // Click away listener for phone code dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(e.target)) {
        setShowPhoneCodeDropdown(false)
        setPhoneCodeSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectPhoneCode = (dialCode) => {
    set('countryCode', dialCode)
    setShowPhoneCodeDropdown(false)
    setPhoneCodeSearchTerm('')
  }

  const handlePhoneCodeKeyDown = (e) => {
    if (!showPhoneCodeDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < filteredCountryCodes.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCountryCodes[highlightedIndex]) {
        selectPhoneCode(filteredCountryCodes[highlightedIndex].dial_code)
      }
    } else if (e.key === 'Escape') {
      setShowPhoneCodeDropdown(false)
      setPhoneCodeSearchTerm('')
    }
  }

  if (!isOpen) return null

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }))
  const onChange = e => set(e.target.name, e.target.value)

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`${backendUrl}/api/calendar/book-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        setTimeout(() => {
          setDone(false)
          setForm(INITIAL_FORM)
          onClose()
          if (onSuccess) onSuccess('Demo request sent! Our team will contact you soon.')
        }, 3000)
      } else {
        alert(data.message || 'Failed to send request. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bdm-overlay" onClick={onClose}>
      <div className="bdm-modal-v2" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bdmv2-header">
          <div className="bdmv2-title-group">
            <div className="bdmv2-icon-box bdmv2-emerald-icon">
              <Phone size={20} />
            </div>
            <h2 className="bdmv2-title">Schedule a Live Demo</h2>
          </div>
          <button className="bdmv2-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="bdmv2-divider" />

        {/* Content */}
        <div className="bdmv2-content">
          {done ? (
            <div className="bdmv2-success">
              <CheckCircle2 size={48} className="bdmv2-success-icon" />
              <h3>Request Sent!</h3>
              <p>Our team will contact you soon on your provided number.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bdmv2-form">
              {/* Row 1: Name & Phone */}
              <div className="bdmv2-row bdmv2-row-name-phone">
                <div className="bdmv2-field-group">
                  <label className="bdmv2-label">
                    <User size={16} className="bdmv2-field-icon" />
                    Full Name <span>*</span>
                  </label>
                  <div className="bdmv2-input-wrapper">
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      placeholder="Enter Your Name"
                      required
                    />
                  </div>
                </div>

                <div className="bdmv2-field-group">
                  <label className="bdmv2-label">
                    <Phone size={16} className="bdmv2-field-icon" />
                    Phone Number <span>*</span>
                  </label>
                  
                  {/* EXACT DROPDOWN STRUCTURE FROM USER SNIPPET */}
                  <div className="flex items-start gap-2 w-full">
                    <div className="relative w-20 custom-dropdown" ref={phoneDropdownRef} data-dropdown="newBusinessPhoneCode">
                      <input
                        ref={searchInputRef}
                        type="text" 
                        autoComplete="off"
                        value={showPhoneCodeDropdown ? phoneCodeSearchTerm : (form.countryCode || "")}
                        onChange={(e) => {
                          setPhoneCodeSearchTerm(e.target.value);
                          if (!showPhoneCodeDropdown) {
                            setShowPhoneCodeDropdown(true);
                          }
                          setHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          setShowPhoneCodeDropdown(true);
                        }}
                        onKeyDown={handlePhoneCodeKeyDown}
                        placeholder="+91"
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      />
                      {showPhoneCodeDropdown && (
                        <div className="absolute z-50 w-64 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto left-0">
                          {filteredCountryCodes.length > 0 ? (
                            filteredCountryCodes.map((c, index) => (
                              <button
                                key={`${c.code}-${index}`}
                                type="button"
                                onClick={() => selectPhoneCode(c.dial_code)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${highlightedIndex === index
                                  ? "bg-[#129046] text-white"
                                  : form.countryCode === c.dial_code
                                    ? "bg-[#129046]/20 text-gray-800"
                                    : "hover:bg-gray-50"
                                  }`}
                              >
                                <span className="font-bold">{c.dial_code}</span> ({c.name})
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">No results</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative flex-1">
                      <input
                        type="tel" 
                        autoComplete="off"
                        name="phone"
                        value={form.phone}
                        onChange={onChange}
                        placeholder="Enter Your Phone Number"
                        required
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Work Email & Business Requirements */}
              <div className="bdmv2-row">
                <div className="bdmv2-field-group">
                  <label className="bdmv2-label">
                    <Mail size={16} className="bdmv2-field-icon" />
                    Work Email <span>*</span>
                  </label>
                  <div className="bdmv2-input-wrapper">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      placeholder="Enter Your Work Email"
                      required
                    />
                  </div>
                </div>

                <div className="bdmv2-field-group">
                  <label className="bdmv2-label">
                    <MessageSquare size={16} className="bdmv2-field-icon" />
                    Business Requirements
                  </label>
                  <div className="bdmv2-input-wrapper">
                    <input
                      type="text"
                      name="remark"
                      value={form.remark}
                      onChange={onChange}
                      placeholder="Requirements"
                    />
                  </div>
                </div>
              </div>

              <div className="bdmv2-footer-section">
                <button type="submit" className="bdmv2-submit-btn" disabled={submitting}>
                  {submitting ? 'Sending Request...' : 'Schedule Live Demo'}
                </button>
                <p className="bdmv2-footer-text">
                  Our team will contact you soon
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
