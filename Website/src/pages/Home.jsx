import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import bharatBg from '../assets/bharat-element-backgroung-img.png'
import { FaChartLine, FaFileInvoiceDollar, FaShoppingCart, FaTrophy, FaBell, FaStore, FaSeedling, FaMobileAlt, FaTshirt, FaUtensils, FaHardHat, FaFileAlt, FaClipboardList, FaTruck, FaDatabase, FaBolt, FaLock, FaPhone, FaMoneyBillWave, FaHandshake, FaBullseye, FaEye, FaLightbulb, FaEnvelope, FaMapMarkerAlt, FaComments, FaMedal, FaBell as FaBellIcon, FaGlobe, FaHeadset, FaCloud, FaMobileAlt as FaMobile, FaCheckCircle, FaPlay, FaSolarPanel } from 'react-icons/fa'
import { MdDashboard, MdPeople, MdDescription, MdAssignment, MdTrendingUp, MdAssessment } from 'react-icons/md'
import { config } from '../config/env'

function Home({ showDemoModal, setShowDemoModal }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [lowestPlanId, setLowestPlanId] = useState(null)

  // Fetch lowest price plan
  useEffect(() => {
    const fetchLowestPlan = async () => {
      try {
        const response = await fetch(`${config.backendUrl}/api/pricing`)
        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          // Find the plan with lowest offer_price or price
          const lowestPlan = data.data.reduce((lowest, plan) => {
            const planPrice = plan.offer_price || plan.price
            const lowestPrice = lowest.offer_price || lowest.price
            return planPrice < lowestPrice ? plan : lowest
          })
          setLowestPlanId(lowestPlan.id)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      }
    }

    fetchLowestPlan()
  }, [])

  const handleGetStarted = () => {
    if (lowestPlanId) {
      navigate(`/checkout?planId=${lowestPlanId}&type=paid`)
    } else {
      navigate('/checkout?type=trial')
    }
  }

  const tabContent = {
    dashboard: {
      title: 'Dashboard',
      description: 'Get a comprehensive overview of your business at a glance. Track sales, monitor inventory, view pending payments, and analyze key metrics all in one centralized dashboard.',
      image: '/image/Dashboard.png'
    },
    parties: {
      title: 'Parties',
      description: 'Manage all your customers and suppliers efficiently. Add, edit, and organize party information with complete contact details, credit limits, and transaction history.',
      image: '/image/Parties.png'
    },
    partiesDetails: {
      title: 'Parties Details',
      description: 'View detailed party information including transaction history, outstanding balances, payment records, and complete ledger statements for better relationship management.',
      image: '/image/PartiesDetails.png'
    },
    inventory: {
      title: 'Inventory',
      description: 'Track stock levels, manage products, monitor inventory movements, and get low stock alerts. Complete inventory management with real-time updates and detailed reports.',
      image: '/image/inventory.png'
    },
    quotation: {
      title: 'Quotation',
      description: 'Create professional quotations instantly with customizable templates. Convert quotes to invoices seamlessly and track quotation status to close deals faster.',
      image: '/image/Quotation.png'
    },
    reports: {
      title: 'Reports',
      description: 'Generate comprehensive business reports including sales tax, GST, profit and loss, and detailed party ledgers to analyze your business performance accurately.',
      image: '/image/Reports.png'
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-badge-wrapper">
                <span className="badge"><FaCheckCircle style={{ display: 'inline', marginRight: '6px' }} /> Trusted by 5000+ Businesses</span>
              </div>
              <h1>Professional Billing & <br /><span className="gradient-text">Business Management</span></h1>
              <p className="hero-description">Complete invoicing solution with 10+ document types, automatic tax calculation, inventory management, and party tracking. Everything you need to run your business efficiently.</p>
              <div className="hero-buttons">
                <button
                  className="hero-btn-primary"
                  onClick={handleGetStarted}
                >
                  Get Started Free
                  <span className="btn-arrow">→</span>
                </button>
                <button
                  className="hero-btn-secondary"
                  onClick={() => setShowDemoModal(true)}
                >
                  <FaPlay style={{ display: 'inline-block', marginRight: '8px', fontSize: '16px' }} />
                  Book Free Demo
                </button>
              </div>
              <div className="hero-image mobile-image">
                <img className='home-image' src='/image/img1.png' />
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <h2>10+</h2>
                  <p>Document Types</p>
                </div>
                <div className="stat-divider"></div>
                <div className="stat">
                  <h2>50+</h2>
                  <p>Countries Supported</p>
                </div>
                <div className="stat-divider"></div>
                <div className="stat">
                  <h2>5K+</h2>
                  <p>Active Users</p>
                </div>
              </div>
            </div>
            <div className="hero-image desktop-image">
              <img className='home-image' src='/image/img1.png' />
            </div>
          </div>
        </div>
      </section>

      {/* Business Management Section */}
      <section className="business-management">
        <div className="container">
          <div className="section-header-tabs">
            <h1>Complete Business Management with <br /><span className="gradient-text">Invoice Bill Book</span></h1>
            <p>From quotations to invoices, inventory to payments - manage everything in one place</p>
          </div>
          <div className="tabs-content">
            <div className="tabs-navigation">
              <div
                className={`tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="tab-icon"><MdDashboard size={24} /></div>
                <span>Dashboard</span>
              </div>
              <div
                className={`tab-item ${activeTab === 'parties' ? 'active' : ''}`}
                onClick={() => setActiveTab('parties')}
              >
                <div className="tab-icon"><MdPeople size={24} /></div>
                <span>Parties</span>
              </div>
              <div
                className={`tab-item ${activeTab === 'partiesDetails' ? 'active' : ''}`}
                onClick={() => setActiveTab('partiesDetails')}
              >
                <div className="tab-icon"><MdDescription size={24} /></div>
                <span>Parties Details</span>
              </div>
              <div
                className={`tab-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <div className="tab-icon"><MdTrendingUp size={24} /></div>
                <span>Inventory</span>
              </div>
              <div
                className={`tab-item ${activeTab === 'quotation' ? 'active' : ''}`}
                onClick={() => setActiveTab('quotation')}
              >
                <div className="tab-icon"><MdAssignment size={24} /></div>
                <span>Quotation</span>
              </div>
              <div
                className={`tab-item ${activeTab === 'reports' ? 'active highlighted' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                <div className="tab-icon"><MdAssessment size={24} /></div>
                <span>Reports</span>
              </div>
            </div>
            <div className="tab-display">
              <div className="tab-image">
                <img src={tabContent[activeTab].image} alt={tabContent[activeTab].title} />
              </div>
              <div className="tab-description">
                <h3>{tabContent[activeTab].title}</h3>
                <p>{tabContent[activeTab].description}</p>
                <button
                  className="btn-primary-action"
                  onClick={handleGetStarted}
                >
                  Get Started Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h1>Everything You Need to <span className="gradient-text">Grow</span></h1>
            <p>Powerful features designed for modern businesses</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaBolt />
              </div>
              <h3>Instant Invoicing</h3>
              <p>Create professional invoices in seconds with customizable templates and automated workflows.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaLock />
              </div>
              <h3>Smart Tax Calculation</h3>
              <p>Automatic tax calculation based on business and party location. System intelligently applies appropriate tax rates for same state or inter-state transactions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaMobile />
              </div>
              <h3>Multi-Platform</h3>
              <p>Access your business data anywhere with our mobile app, web portal, and desktop application.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaMoneyBillWave />
              </div>
              <h3>Payment Tracking</h3>
              <p>Monitor payments, send reminders, and manage cash flow with intelligent tracking tools.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaChartLine />
              </div>
              <h3>Real-time Analytics</h3>
              <p>Get insights into your business performance with detailed reports and visual dashboards.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <FaHandshake />
              </div>
              <h3>Team Collaboration</h3>
              <p>Work together seamlessly with role-based access and multi-user support.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="section-header">
            <h1>About <span className="gradient-text">Invoice Bill Book</span></h1>
            {/* <p>Empowering businesses with smart billing solutions</p> */}
          </div>
          <div className="about-content">
            <div className="about-main">
              <p className="about-intro">Invoice Bill Book is a modern billing and invoicing platform designed to simplify financial management for businesses of all sizes. With powerful features and an intuitive interface, we help you focus on what matters most - growing your business.</p>

              <div className="about-grid">
                <div className="about-card">
                  <div className="about-icon"><FaBullseye size={40} /></div>
                  <h3>Our Mission</h3>
                  <p>To empower Indian businesses with professional-grade billing software that handles everything from quotations to invoices, inventory to payments, and tax management to financial tracking - making business management effortless.</p>
                </div>

                <div className="about-card">
                  <div className="about-icon"><FaEye size={40} /></div>
                  <h3>Our Vision</h3>
                  <p>To become India's most comprehensive business management platform, helping SMBs digitize their operations, maintain accurate records, ensure tax compliance, and make data-driven decisions for sustainable growth.</p>
                </div>

                <div className="about-card">
                  <div className="about-icon"><FaLightbulb size={40} /></div>
                  <h3>Why Choose Us</h3>
                  <p>Built specifically for Indian businesses with 10+ document types, automatic tax calculation, multi-business support, sub-user management, and 50+ country currency support. Complete solution for modern businesses.</p>
                </div>
              </div>

              <div className="about-stats">
                <div className="about-stat-card">
                  <h4>5k+</h4>
                  <p>Active Users</p>
                </div>
                <div className="about-stat-card">
                  <h4>10+</h4>
                  <p>Document Types</p>
                </div>
                <div className="about-stat-card">
                  <h4>5+</h4>
                  <p>PDF Templates</p>
                </div>
                <div className="about-stat-card">
                  <h4>50+</h4>
                  <p>Currency Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <div className="section-header">
            <h1>Get in <span className="gradient-text">Touch</span></h1>
            <p>We'd love to hear from you</p>
          </div>
          <div className="contact-info">
            <div className="contact-card">
              <div className="contact-icon"><FaEnvelope size={32} /></div>
              <h3>Email</h3>
              <p>support@invoicebillbook.com</p>
            </div>
            <div className="contact-card">
              <div className="contact-icon"><FaPhone size={32} /></div>
              <h3>Phone</h3>
              <p>+91 9266242121 </p>
            </div>
          </div>
        </div>
      </section>







      {/* Marketing Features Section */}
      <section className="marketing-features">
        <div className="container">
          <div className="section-header">
            {/* <p className="marketing-subtitle">Your personal marketing & sales assistant, right in your pocket - Billing software with marketing capabilities</p> */}
            <h1>Get More Customers, <br />Get More From Your <span className="gradient-text">Customers</span></h1>
            <p>Transform your business with our built-in marketing tools. Reach more customers through WhatsApp, SMS, and loyalty programs while managing your sales seamlessly from your pocket.</p>
          </div>
          <div className="marketing-content">
            <div className="marketing-features-grid">
              <div className="marketing-feature-card">
                <div className="feature-icon-box"><FaComments size={32} /></div>
                <h3>WhatsApp & SMS Marketing</h3>
                <p>Send promotional messages and updates directly to your customers</p>
              </div>
              <div className="marketing-feature-card">
                <div className="feature-icon-box"><FaMedal size={32} /></div>
                <h3>Loyalty & Rewards Program</h3>
                <p>Build customer loyalty with points and rewards system</p>
              </div>
              <div className="marketing-feature-card">
                <div className="feature-icon-box"><FaShoppingCart size={32} /></div>
                <h3>Online Store & Digital Catalogue</h3>
                <p>Create your online presence and showcase products digitally</p>
              </div>
              <div className="marketing-feature-card">
                <div className="feature-icon-box"><FaBellIcon size={32} /></div>
                <h3>Service Reminders & CRM</h3>
                <p>Automated reminders and customer relationship management</p>
              </div>
            </div>
            <div className="marketing-image">
              <img src="/image/img.png" alt="Marketing Features" />
            </div>
          </div>
        </div>
      </section>

      {/* More Than Billing Section */}
      <section className="more-features">
        <div className="container">
          <div className="section-header">
            <h1>A Lot More Than You Can Imagine <br />From a <span className="gradient-text">Billing Software</span></h1>
            <p>We provide a complete ecosystem for your business. From multi-language support to 24/7 cloud backup, we ensure your business operations never stop and your data stays secure every step of the way.</p>
          </div>
          <div className="more-features-grid">
            <div className="more-feature-card">
              <div className="more-icon"><FaGlobe size={32} /></div>
              <h3>Multi-Language Support</h3>
              <p>Billing App available in English, Hindi, and regional languages</p>
            </div>
            <div className="more-feature-card">
              <div className="more-icon"><FaHeadset size={32} /></div>
              <h3>24/7 Customer Support</h3>
              <p>Customer Support in your preferred language</p>
            </div>
            <div className="more-feature-card">
              <div className="more-icon"><FaPhone size={32} /></div>
              <h3>Multiple Support Channels</h3>
              <p>Call, WhatsApp, Email Support from 9 a.m - 9 p.m Monday to Saturday</p>
            </div>
            <div className="more-feature-card">
              <div className="more-icon"><FaCloud size={32} /></div>
              <h3>Cloud Backup</h3>
              <p>Automatic cloud backup to keep your data safe and secure</p>
            </div>
            <div className="more-feature-card">
              <div className="more-icon"><FaMobile size={32} /></div>
              <h3>Mobile First Design</h3>
              <p>Optimized for mobile devices for on-the-go business management</p>
            </div>
            <div className="more-feature-card">
              <div className="more-icon"><FaBellIcon size={32} /></div>
              <h3>Smart Notifications</h3>
              <p>Get instant alerts for payments, invoices, and important updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="industries">
        <div className="container">
          <div className='heading-supporting'>
            <h1>Supporting Businesses From a <br />Wide Range of <span className="gradient-text">Industries</span></h1>
            <p>We understand your unique billing & accounting needs. A made in India billing software specially designed for Indian SMBs.</p>
          </div>
          <div className="industries-content">
            <div className="industries-image">
              <img src="/image/img.png" alt="Industries" className="industry-img" />
            </div>
            <div className="industries-text">
              <div className="industry-scroll-container">
                <div className="industry-scroll">
                  <div className="industry-item">
                    <span className="industry-icon"><FaStore size={24} /></span>
                    <span>Retail & General Store</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaSeedling size={24} /></span>
                    <span>Agriculture</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaDatabase size={24} /></span>
                    <span>Electronics</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaTshirt size={24} /></span>
                    <span>Fashion & Apparel</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaUtensils size={24} /></span>
                    <span>Food & Beverage</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaHardHat size={24} /></span>
                    <span>Construction</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaSolarPanel size={24} /></span>
                    <span>Solar & Renewable Energy</span>
                  </div>
                  {/* Duplicate for seamless loop */}
                  <div className="industry-item">
                    <span className="industry-icon"><FaStore size={24} /></span>
                    <span>Retail & General Store</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaSeedling size={24} /></span>
                    <span>Agriculture</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaDatabase size={24} /></span>
                    <span>Electronics</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaTshirt size={24} /></span>
                    <span>Fashion & Apparel</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaUtensils size={24} /></span>
                    <span>Food & Beverage</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaHardHat size={24} /></span>
                    <span>Construction</span>
                  </div>
                  <div className="industry-item">
                    <span className="industry-icon"><FaSolarPanel size={24} /></span>
                    <span>Solar & Renewable Energy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="section-header">
            <h1>Trusted by Businesses in <span className="rotating-country">
              <span className="country-word">India</span>
              <span className="country-word">USA</span>
              <span className="country-word">UK</span>
              <span className="country-word">Canada</span>
              <span className="country-word">Australia</span>
              <span className="country-word">UAE</span>
            </span></h1>
          </div>
          <div className="cta-content">
            <div className="cta-text">
              <h2>Ready to Transform Your Business?</h2>
              <p className="cta-description">Join thousands of businesses already using Invoice Bill Book to streamline their operations, manage finances, and grow faster.</p>
              <div className="cta-buttons">
                <button
                  className="btn-cta-primary"
                  onClick={handleGetStarted}
                >
                  Get Started Free →
                </button>
                <button
                  className="btn-cta-secondary"
                  onClick={() => setShowDemoModal(true)}
                >
                  Book a Demo
                </button>
              </div>
              <div className="app-download">
                <p>Download app on</p>
                <div className="store-buttons">
                  <a href="#" className="store-btn" onClick={(e) => e.preventDefault()}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" />
                  </a>
                  <a href="#" className="store-btn" onClick={(e) => e.preventDefault()}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" />
                  </a>
                </div>
              </div>
            </div>
            <div className="cta-image">
              <img src="/image/img1.png" alt="Mobile App" className="cta-phone-image" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
