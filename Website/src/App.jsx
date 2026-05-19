import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'
import Home from './pages/Home'
import Pricing from './components/Pricing'
import Checkout from './pages/CheckoutNew'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsConditions from './pages/TermsConditions'
import RefundPolicy from './pages/RefundPolicy'
import BookDemoModal from './components/BookDemoModal'
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa'
import { CheckCircle2, XCircle } from 'lucide-react'
import { config } from './config/env'
//comment
function ScrollToHashElement() {
  const location = useLocation()

  useEffect(() => {
    // Only scroll to hash if we're on the home page
    if (location.pathname === '/') {
      const hash = location.hash
      if (hash) {
        setTimeout(() => {
          const element = document.querySelector(hash)
          if (element) {
            const navbarHeight = 80
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
          }
        }, 100)
      } else {
        window.scrollTo(0, 0)
      }
    } else {
      // For other pages, just scroll to top
      window.scrollTo(0, 0)
    }
  }, [location])

  return null
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const isLegalPage = ['/privacy-policy', '/terms-conditions', '/refund-policy'].includes(location.pathname)

  useEffect(() => {
    if (mobileMenu || showDemoModal) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [mobileMenu, showDemoModal])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000)
  }

  const handleNavClick = (sectionId) => {
    if (location.pathname !== '/') {
      setMobileMenu(false)
      navigate(`/#${sectionId}`)
    } else {
      const element = document.querySelector(`#${sectionId}`)
      if (element) {
        const navbarHeight = 80
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
        setTimeout(() => setMobileMenu(false), 100)
      }
    }
  }

  const handleCheckout = async () => {
    setMobileMenu(false)
    try {
      const response = await fetch(`${config.backendUrl}/api/pricing`)
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        const starterPlan = data.data.find(plan =>
          plan.name.toLowerCase().includes('starter') ||
          parseFloat(plan.offer_price || plan.price || 0) === 0
        )
        navigate(starterPlan ? `/checkout?planId=${starterPlan.id}&type=trial` : '/checkout?type=trial')
      } else {
        navigate('/checkout?type=trial')
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
      navigate('/checkout?type=trial')
    }
  }

  const handlePricing = () => {
    setMobileMenu(false)
    navigate('/pricing')
  }

  return (
    <>
      <ScrollToHashElement />
      <div className="app">

        {/* ── Navigation ── */}
        <nav className="navbar">
          <div className="container">
            <div className="nav-content">
              <Link to="/" className="logo">
                <img src="/logo-png.png" alt="Invoice Bill Book Logo" />
              </Link>
              <div className={`nav-links ${mobileMenu ? 'active' : ''}`}>
                <Link to="/" onClick={() => setMobileMenu(false)}>Home</Link>
                <a href="#features" onClick={(e) => { e.preventDefault(); handleNavClick('features') }}>Features</a>
                <button onClick={handlePricing} className="nav-link-btn">Pricing</button>
                <a href="#about" onClick={(e) => { e.preventDefault(); handleNavClick('about') }}>About</a>
                <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavClick('contact') }}>Contact</a>
                <div className="nav-buttons-mobile">
                  <button className="btn-login" onClick={() => { window.location.href = config.loginUrl; setMobileMenu(false) }}>Login</button>
                  <button className="btn-trial" onClick={() => { setShowDemoModal(true); setMobileMenu(false) }}>Book Free Demo</button>
                  <button className="btn-start" onClick={handleCheckout}>Start Free</button>
                </div>
              </div>
              <div className="nav-buttons">
                <button className="btn-login" onClick={() => window.location.href = config.loginUrl}>Login</button>
                <button className="btn-trial" onClick={() => setShowDemoModal(true)}>Book Free Demo</button>
                <button className="btn-start" onClick={handleCheckout}>Start Free</button>
              </div>
              <button className={`mobile-toggle ${mobileMenu ? 'active' : ''}`} onClick={() => setMobileMenu(!mobileMenu)}>
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </nav>

        {/* ── Routes ── */}
        <Routes>
          <Route path="/" element={<Home showDemoModal={showDemoModal} setShowDemoModal={setShowDemoModal} />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
        </Routes>

        {/* ── Book Demo Modal ── */}
        <BookDemoModal
          isOpen={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          onSuccess={(msg) => showToast(msg || 'Demo booked! Check your email.', 'success')}
          backendUrl={config.backendUrl}
        />

        {/* ── Toast Notification ── */}
        {toast.show && (
          <div className={`toast-notification toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success'
                ? <CheckCircle2 size={24} strokeWidth={2} />
                : <XCircle size={24} strokeWidth={2} />}
            </span>
            <p>{toast.message}</p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-section footer-brand">
                <div className="footer-logo">
                  <img src="/logo-png.png" alt="Invoice Bill Book Logo" />
                </div>
                <p>Professional billing and business management software for modern businesses. Simplify invoicing, manage inventory, and grow faster.</p>
                <div className="social-icons">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaFacebookF /></a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaTwitter /></a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaInstagram /></a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaLinkedinIn /></a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaYoutube /></a>
                </div>
              </div>
              <div className="footer-section">
                <h2>Product</h2>
                <Link to="/">Home</Link>
                <a href="#features" onClick={(e) => { e.preventDefault(); handleNavClick('features') }}>Features</a>
                <button onClick={handlePricing} className="footer-link-btn">Pricing</button>
              </div>
              <div className="footer-section">
                <h2>Company</h2>
                <a href="#about" onClick={(e) => { e.preventDefault(); handleNavClick('about') }}>About</a>
                <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavClick('contact') }}>Contact</a>
              </div>
              <div className="footer-section">
                <h2>Legal</h2>
                <Link to="/privacy-policy">Privacy Policy</Link>
                <Link to="/terms-conditions">Terms & Conditions</Link>
                <Link to="/refund-policy">Refund Policy</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} Invoice Bill Book. All rights reserved.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}

function App() {
  return (
    <AppContent />
  )
}

export default App
