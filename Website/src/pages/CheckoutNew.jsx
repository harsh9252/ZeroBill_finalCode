import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { config } from '../config/env'
import { getUserCurrency } from '../utils/geolocation'
import { convertFromINR, getCurrencySymbol, refreshRates } from '../utils/currency'
import { countryCodes } from '../utils/countryCodes'
import '../assets/css/CheckoutNew.css'

// Cache buster - force reload

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('planId')
  const isUpgrade = searchParams.get('type') === 'upgrade'
  const userToken = searchParams.get('token')

  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [allPlans, setAllPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [currency, setCurrency] = useState('INR')
  const [currencySymbol, setCurrencySymbol] = useState('₹')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCode: '+91',
    password: ''
  })

  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState('')
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false)
  const phoneCodeDropdownRef = useRef(null)

  // Auto-fill form with Google OAuth data or URL params (for cross-origin redirect fallback)
  useEffect(() => {
    try {
      // 1. Try Session Storage (original way for same-origin)
      const googleNewUser = sessionStorage.getItem('googleNewUser')
      const normalNewUser = sessionStorage.getItem('normalNewUser')
      let userData = null

      if (googleNewUser) {
        userData = JSON.parse(googleNewUser)
      } else if (normalNewUser) {
        userData = JSON.parse(normalNewUser)
      } else {
        // 2. Try URL Params (fallback for cross-origin redirect from Software)
        const firstName = searchParams.get('firstName')
        const lastName = searchParams.get('lastName')
        const email = searchParams.get('email')
        const phone = searchParams.get('phone')
        const phoneCode = searchParams.get('phoneCode')
        const password = searchParams.get('password')


        if (firstName || lastName || email || phone || phoneCode || password) {
          userData = {
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            phone: phone || '',
            phoneCode: phoneCode || '+91',
            password: password || ''
          }
        }
      }

      if (userData) {


        // Handle phone number splitting if the full number was provided
        let finalPhone = userData.phone || ''
        let finalPhoneCode = userData.phoneCode || '+91'

        if (finalPhone && finalPhone.startsWith('+')) {
          // Sort country codes by descending dial_code length (+1-268 comes before +1)
          const matchingCode = countryCodes
            .slice()
            .sort((a, b) => b.dial_code.length - a.dial_code.length)
            .find(c => finalPhone.startsWith(c.dial_code));

          if (matchingCode) {
            finalPhoneCode = matchingCode.dial_code;
            finalPhone = finalPhone.substring(matchingCode.dial_code.length).trim();
          }
        }

        setFormData(prev => ({
          ...prev,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: finalPhone || prev.phone,
          phoneCode: finalPhoneCode || prev.phoneCode,
          password: userData.password || prev.password
        }))
      } else {

      }
    } catch (error) {
      console.error('Error reading user data for auto-fill:', error)
    }
  }, [searchParams])

  // Fetch pricing plans and detect currency
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fetch currency based on user's IP
        const userCurrency = await getUserCurrency()
        setCurrency(userCurrency)
        setCurrencySymbol(getCurrencySymbol(userCurrency))

        // Refresh exchange rates
        await refreshRates()

        const response = await fetch(`${config.backendUrl}/api/pricing`)
        const data = await response.json()

        if (data.success && data.data) {
          setAllPlans(data.data)

          let initialPlanId = null
          if (planId) {
            const plan = data.data.find(p => String(p.id) === String(planId))
            if (plan) {
              initialPlanId = String(plan.id)
            }
          }

          // If no planId or plan not found, try to load from session storage
          if (!initialPlanId) {
            const savedPlanId = sessionStorage.getItem('selectedPlanId')
            if (savedPlanId && data.data.some(p => String(p.id) === String(savedPlanId))) {
              initialPlanId = savedPlanId
            }
          }

          // If still no plan, pick the cheapest/starter plan
          if (!initialPlanId) {
            const sortedPlans = [...data.data].sort((a, b) => {
              const priceA = Number(a.offer_price ?? a.price ?? 0)
              const priceB = Number(b.offer_price ?? b.price ?? 0)
              return priceA - priceB
            })
            initialPlanId = sortedPlans[0] ? String(sortedPlans[0].id) : String(data.data[0]?.id)
          }

          setSelectedPlanId(initialPlanId)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [planId])

  const selectedPlan = allPlans.find(p => String(p.id) === String(selectedPlanId))

  // Save selection to session storage whenever it changes
  useEffect(() => {
    if (selectedPlanId) {
      sessionStorage.setItem('selectedPlanId', selectedPlanId)
    }
  }, [selectedPlanId])

  // Close phone code dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target)) {
        setShowPhoneCodeDropdown(false)
        setPhoneCodeSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered country codes based on search term
  const filteredCountryCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.dial_code.includes(phoneCodeSearchTerm)
  )

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name === "phone") {
      const numericValue = value.replace(/\D/g, '')
      setFormData((prev) => ({ ...prev, [name]: numericValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName?.trim()) {
      newErrors.firstName = "First name required"
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = "Letters only"
    }

    // Last name validation removed

    if (!formData.email?.trim()) {
      newErrors.email = "Email required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email"
    }

    // Phone validation removed

    if (!formData.password?.trim()) {
      newErrors.password = "Password required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Min 8 characters"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Need uppercase, lowercase, number"
    }

    setErrors(newErrors)
    // If it's an upgrade, we don't need a password (user already exists)
    if (isUpgrade) {
      delete newErrors.password
    }
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setCheckoutLoading(true)
    setErrors({})

    try {
      const payload = isUpgrade ? {
        planId: selectedPlanId,
        paymentMethod: 'upi',
        transactionId: `WEB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amount: Number(selectedPlan.offer_price || selectedPlan.price || 0),
        currency: 'INR'
      } : {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: (formData.phoneCode || '') + formData.phone,
        password: formData.password,
        planId: selectedPlanId
      }

      const isGoogleFlow = searchParams.get('type') === 'google'
      const isNewGoogleUser = isGoogleFlow && !userToken
      const endpoint = (isUpgrade || (isGoogleFlow && !isNewGoogleUser)) ? '/api/billing/upgrade' : '/api/auth/signup'
      const headers = { 'Content-Type': 'application/json' }
      if ((isUpgrade || isGoogleFlow) && userToken) {
        headers['Authorization'] = `Bearer ${userToken}`
      }

      const response = await fetch(`${config.backendUrl}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || (isUpgrade ? 'Failed to upgrade plan' : 'Failed to create account'))
      }

      setCompleted(true)
    } catch (error) {
      console.error('Error:', error)
      setErrors({ general: error.message || 'Error creating account' })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const calculateYearlyBenefit = () => {
    if (!selectedPlan) return 0
    const price = selectedPlan.offer_price || selectedPlan.price
    const period = (selectedPlan.period || 'month').toLowerCase()

    if (period.includes('year')) {
      return price
    }
    if (period.includes('quarter')) {
      return price * 4
    }

    return price * 12
  }

  const calculateDiscount = () => {
    if (!selectedPlan || !selectedPlan.offer_price || selectedPlan.offer_price >= selectedPlan.price) return 0

    const discount = selectedPlan.price - selectedPlan.offer_price
    const period = (selectedPlan.period || 'month').toLowerCase()

    if (period.includes('year')) {
      return discount
    }
    if (period.includes('quarter')) {
      return discount * 4
    }

    return discount * 12
  }

  if (completed) {
    return (
      <div className="checkout-success">
        <div className="success-icon">
          <Check size={60} />
        </div>
        <h1>{isUpgrade ? 'Plan Upgraded Successfully!' : 'Account Created Successfully!'}</h1>
        <p className="success-subtitle">{isUpgrade ? `Your plan has been upgraded to ${selectedPlan?.name}. Your new plan is now active!` : 'Welcome to Invoice Bill Book! Your account is ready to use.'}</p>

        <div className="success-info-grid">
          <div className="info-item">
            <Check size={18} />
            <span>{isUpgrade ? 'Plan activated' : 'Login credentials sent to email'}</span>
          </div>
          <div className="info-item">
            <Check size={18} />
            <span>Invoice emailed</span>
          </div>
          <div className="info-item">
            <Check size={18} />
            <span>Plan: {selectedPlan?.name}</span>
          </div>
        </div>

        <a href={isUpgrade ? config.dashboardUrl : config.loginUrl} className="btn-success">
          {isUpgrade ? 'Go to Dashboard' : 'Go to Login'}
        </a>
      </div>
    )
  }

  if (loading) {
    return <div className="checkout-loading">Loading plans...</div>
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Desktop Header */}
        <div className="checkout-header desktop-only">
          <div className="checkout-title">
            <h1>{isUpgrade ? 'Upgrade Your Plan' : 'Complete Your Checkout'}</h1>
            <p>{isUpgrade ? 'Upgrade to unlock more features' : 'Join 5K+ businesses using Invoice Bill Book'}</p>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="checkout-header-mobile mobile-only">
          <div className="checkout-title">
            <h1>{isUpgrade ? 'Upgrade Plan' : 'Checkout'}</h1>
            <p>Invoice Bill Book</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="checkout-content">
          {/* Left Side - Plans & Pricing */}
          <div className="checkout-left">
            {/* Plans Section */}
            <section className="plans-section">
              <h2>Select Your Plan</h2>
              <div className="plans-grid">
                {allPlans.map(plan => (
                  <label key={plan.id} className={`plan-card ${String(selectedPlanId) === String(plan.id) ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={String(selectedPlanId) === String(plan.id)}
                      onChange={() => setSelectedPlanId(String(plan.id))}
                    />
                    <div className="plan-card-content">
                      <h3>{plan.name}</h3>
                      <div className="plan-price">{currencySymbol}{convertFromINR(plan.offer_price || plan.price, currency).toFixed(0)}</div>
                      <div className="plan-period">per {plan.period || 'month'}</div>
                      {plan.offer_price && plan.offer_price < plan.price && (
                        <div className="plan-save">Save {currencySymbol}{convertFromINR(plan.price - plan.offer_price, currency).toFixed(0)}/{plan.period || 'month'}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Pricing Details Section */}
            {selectedPlan && (
              <section className="pricing-section">
                <h2>Pricing Details</h2>
                <div className="pricing-details">
                  <div className="detail-row">
                    <span className="detail-label">Price per {selectedPlan.period || 'month'}</span>
                    <span className="detail-value">{currencySymbol}{convertFromINR(selectedPlan.offer_price || selectedPlan.price, currency).toFixed(2)}</span>
                  </div>

                  {selectedPlan.offer_price && selectedPlan.offer_price < selectedPlan.price && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Regular Price</span>
                        <span className="detail-value original">{currencySymbol}{convertFromINR(selectedPlan.price, currency).toFixed(2)}</span>
                      </div>
                      <div className="detail-row highlight">
                        <span className="detail-label">Savings</span>
                        <span className="detail-value save">{currencySymbol}{convertFromINR(selectedPlan.price - selectedPlan.offer_price, currency).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="detail-divider"></div>

                  <div className="detail-row total">
                    <span className="detail-label">Total for 12 Months</span>
                    <span className="detail-value yearly">{currencySymbol}{convertFromINR(calculateYearlyBenefit(), currency).toFixed(2)}</span>
                  </div>

                  {selectedPlan.offer_price && selectedPlan.offer_price < selectedPlan.price && (
                    <div className="detail-row highlight">
                      <span className="detail-label">Annual Savings</span>
                      <span className="detail-value save">{currencySymbol}{convertFromINR(calculateDiscount(), currency).toFixed(2)}</span>
                    </div>
                  )}

                  {(selectedPlan.offer_price === 0 || selectedPlan.price === 0) && (
                    <div className="free-info">
                      <Check size={16} />
                      <span>365 days free access - No credit card required</span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Side - Form */}
          <div className="checkout-right">
            <section className="form-section">
              <h2>Your Information</h2>
              <form onSubmit={handleSubmit} className="checkout-form">
                {errors.general && (
                  <div className="error-banner">{errors.general}</div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter First Name"
                      disabled={isUpgrade}
                      className={`${errors.firstName ? 'error' : ''} ${isUpgrade ? 'disabled-input' : ''}`}
                    />
                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter Last Name"
                      disabled={isUpgrade}
                      className={`${errors.lastName ? 'error' : ''} ${isUpgrade ? 'disabled-input' : ''}`}
                    />
                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@gmail.com"
                    disabled={isUpgrade}
                    className={`${errors.email ? 'error' : ''} ${isUpgrade ? 'disabled-input' : ''}`}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <div className="phone-input-container">
                    {/* Searchable Country Code Dropdown */}
                    <div className="phone-code-wrapper" ref={phoneCodeDropdownRef}>
                      <div className="phone-code-input-box">
                        <input
                          type="text"
                          value={showPhoneCodeDropdown ? phoneCodeSearchTerm : formData.phoneCode}
                          onChange={(e) => {
                            if (isUpgrade) return;
                            setPhoneCodeSearchTerm(e.target.value)
                            if (!showPhoneCodeDropdown) setShowPhoneCodeDropdown(true)
                          }}
                          onFocus={() => {
                            if (!isUpgrade) setShowPhoneCodeDropdown(true)
                          }}
                          disabled={isUpgrade}
                          placeholder="+91"
                          className={`phone-code-search ${isUpgrade ? 'disabled-input' : ''}`}
                        />
                        <div className="phone-code-arrow">
                          <svg className={showPhoneCodeDropdown ? 'rotate' : ''} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {showPhoneCodeDropdown && (
                        <div className="phone-code-dropdown">
                          {filteredCountryCodes.length > 0 ? (
                            filteredCountryCodes.map((item) => (
                              <button
                                key={`${item.code}-${item.dial_code}`}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, phoneCode: item.dial_code }))
                                  setShowPhoneCodeDropdown(false)
                                  setPhoneCodeSearchTerm('')
                                }}
                                className={`phone-code-item ${formData.phoneCode === item.dial_code ? 'selected' : ''}`}
                              >
                                <span className="name">{item.name}</span>
                                <span className="code">{item.dial_code}</span>
                              </button>
                            ))
                          ) : (
                            <div className="no-results">No results</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Phone Number Input */}
                    <div className="phone-number-wrapper">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Add Phone Number"
                        disabled={isUpgrade}
                        className={`${errors.phone ? 'error' : ''} ${isUpgrade ? 'disabled-input' : ''}`}
                      />
                    </div>
                  </div>
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                {!isUpgrade && (
                  <div className="form-group">
                    <label>Password *</label>
                    <div className="password-input">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Min 8 characters"
                        className={errors.password ? 'error' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="toggle-password"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>
                )}

                <div className="checkout-actions">
                  {isUpgrade ? (
                    <a href={config.frontendUrl} className="btn-back-bottom">
                      <ArrowLeft size={18} />
                      Back
                    </a>
                  ) : (
                    <Link to="/" className="btn-back-bottom">
                      <ArrowLeft size={18} />
                      Back
                    </Link>
                  )}
                  <button
                    type="submit"
                    className="btn-submit-bottom"
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? 'Processing...' : (isUpgrade ? 'Upgrade Plan' : 'Checkout')}
                    <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
