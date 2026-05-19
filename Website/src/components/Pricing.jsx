import '../assets/css/Pricing.css'
import { config } from '../config/env'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { GiCheckMark } from 'react-icons/gi'
import { getUserCurrency } from '../utils/geolocation'
import { convertFromINR, getCurrencySymbol, refreshRates } from '../utils/currency'

function Pricing() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currency, setCurrency] = useState('INR')
  const [currencySymbol, setCurrencySymbol] = useState('₹')

  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        setLoading(true)
        
        // Fetch currency based on user's IP
        const userCurrency = await getUserCurrency()
        setCurrency(userCurrency)
        setCurrencySymbol(getCurrencySymbol(userCurrency))
        
        // Refresh exchange rates
        await refreshRates()
        
        // Fetch pricing plans
        const response = await fetch(`${config.backendUrl}/api/pricing`)
        const data = await response.json()
        
        if (data.success) {
          setPlans(data.data || [])
        } else {
          setError('Failed to load pricing plans')
        }
      } catch (err) {
        console.error('Error fetching pricing plans:', err)
        setError('Failed to load pricing plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPricingPlans()
  }, [])

  if (loading) {
    return (
      <div className="pricing-page">
        <section className="pricing-hero">
          <div className="container">
            <div className="section-header">
              <h1>Simple, Transparent <span className="gradient-text">Pricing</span></h1>
              <p>Choose the plan that fits your business needs</p>
            </div>
          </div>
        </section>
        <section id="pricing" className="pricing">
          <div className="container">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading pricing plans...</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (error || plans.length === 0) {
    return (
      <div className="pricing-page">
        <section className="pricing-hero">
          <div className="container">
            <div className="section-header">
              <h1>Simple, Transparent <span className="gradient-text">Pricing</span></h1>
              <p>Choose the plan that fits your business needs</p>
            </div>
          </div>
        </section>
        <section id="pricing" className="pricing">
          <div className="container">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>{error || 'No pricing plans available'}</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="pricing-page">
      <section className="pricing-hero">
        <div className="container">
          <div className="section-header">
            <h1>Simple, Transparent <span className="gradient-text">Pricing</span></h1>
            <p>Choose the plan that fits your business needs</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing">
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan, index) => (
              <div 
                key={plan.id} 
                className={`pricing-card ${index === 1 ? 'featured' : ''}`}
              >
                {plan.show_featured_label === 1 && plan.featured_label && plan.featured_label.trim() !== '' && (
                  <div className="popular-badge">{plan.featured_label}</div>
                )}
                
                <div className={`top ${index === 1 ? '' : 'gray'}`}>
                  {plan.name && <h3>{plan.name}</h3>}
                  {plan.description && plan.description !== '0' && plan.description.trim() !== '' && (
                    <p className="plan-description">{plan.description}</p>
                  )}
                  
                  <div className="price">
                    {plan.original_price && (
                      <span className="original-price">{currencySymbol}{convertFromINR(plan.original_price, currency).toFixed(0)}</span>
                    )}
                    <div className="price-row">
                      <span className="currency">{currencySymbol}</span>
                      <span className="amount">{convertFromINR(plan.offer_price || plan.price, currency).toFixed(0)}</span>
                    </div>
                    <span className="period">/per {plan.period}</span>
                  </div>
                </div>
                
                <ul className="features-list">
                  {typeof plan.features === 'string' 
                    ? JSON.parse(plan.features).map((feature, idx) => (
                        <li key={idx}>
                          <GiCheckMark className="feature-icon" />
                          <span>{feature}</span>
                        </li>
                      ))
                    : plan.features?.map((feature, idx) => (
                        <li key={idx}>
                          <GiCheckMark className="feature-icon" />
                          <span>{feature}</span>
                        </li>
                      ))
                  }
                </ul>
                
                <button 
                  className="pricing-card-button"
                  onClick={() => navigate(`/checkout?planId=${plan.id}&type=paid`)}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Pricing
