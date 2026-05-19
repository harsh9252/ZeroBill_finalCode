import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, Mail, HelpCircle, FileText, Users, Zap, Shield, Clock, Star, Send, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { supportAPI, getUserData } from '../../../utils/api';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import { useNavigate } from 'react-router-dom';

export default function Support({ checkBusiness }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('help');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null
  const [submitMessage, setSubmitMessage] = useState('');

  // Pre-fill form with user data
  useEffect(() => {
    const userData = getUserData();
    if (userData) {
      setContactForm(prev => ({
        ...prev,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || ''
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof checkBusiness === 'function') {
      checkBusiness();
    }
  }, [checkBusiness]);

  const handleInputChange = (field, value) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear any previous messages when user starts typing
    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitStatus(null);
      setSubmitMessage('');

      const response = await supportAPI.sendMessage(contactForm);

      if (response.success) {
        setSubmitStatus('success');
        setSubmitMessage('Thank you for contacting us! We will get back to you soon.');
        // Clear form
        setContactForm({
          name: contactForm.name, // Keep name and email
          email: contactForm.email,
          subject: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
        setSubmitMessage(response.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Support submission error:', error);
      setSubmitStatus('error');
      setSubmitMessage('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportOptions = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Phone Support",
      description: "+91 9266242121",
      color: "from-blue-400 to-blue-600",
      available: true
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Support",
      description: "support@invoicebillbook.com",
      color: "from-purple-400 to-purple-600",
      available: true
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: "Help Center",
      description: "Browse our knowledge base",
      color: "from-orange-400 to-orange-600",
      available: true
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      description: "Mon-Fri: 9AM-6PM IST",
      color: "from-green-400 to-green-600",
      available: true
    }
  ];

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Documentation",
      description: "Comprehensive guides and tutorials"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community",
      description: "Connect with other users and experts"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Quick Setup",
      description: "Get started in minutes with our guides"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security",
      description: "Your data is safe and secure"
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto bg-transparent min-h-screen">
      {/* Header container for standard back button */}
      <div className="flex flex-row items-center justify-between mb-3 mt-2 gap-2">
        <DashboardBackButton />
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Support & Help Center</h1>
        </div>
        <div className="w-40 invisible"></div> {/* Spacer to center title */}
      </div>



      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">24/7</p>
              <p className="text-sm text-green-600">Support Available</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">4.8</p>
              <p className="text-sm text-blue-600">Average Rating</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-800">50K+</p>
              <p className="text-sm text-purple-600">Happy Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-800"> 30min </p>
              <p className="text-sm text-orange-600">Response Time </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {supportOptions.map((option, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-300/60 transition-all cursor-pointer group"
          >
            <div className={`w-12 h-12 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <div className="text-white">
                {option.icon}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
            <p className="text-gray-600 text-sm">{option.description}</p>
            {option.available && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Available Now
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('help')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'help'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            Get Help
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'contact'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            Contact Us
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'features'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            Features
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'help' && (
            <div className="space-y-6">
              <div className="text-center">
                <HelpCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help you?</h2>
                <p className="text-gray-600">Browse our help resources or get in touch with our support team</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Popular Topics</h3>
                  <div className="space-y-3">
                    {[
                      "Getting started with InvoiceBillBook",
                      "Setting up your business profile",
                      "Creating invoices and quotations",
                      "Managing inventory and stock",
                      "Payment tracking and reconciliation",
                      "Generating reports and analytics"
                    ].map((topic, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-gray-700">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <a href="tel:+919266242121" className="flex items-center gap-3 p-4 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-all">
                      <Phone className="w-5 h-5" />
                      <span>Call Support (+91 9266242121)</span>
                    </a>
                    <a href="mailto:support@invoicebillbook.com" className="flex items-center gap-3 p-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all">
                      <Mail className="w-5 h-5" />
                      <span>Send Email (support@invoicebillbook.com)</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="max-w-2xl mx-auto pb-8">
              <div className="text-center mb-8">
                <Mail className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Our Support Team</h2>
                <p className="text-gray-600">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
              </div>

              {/* Status Messages */}
              {submitStatus && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${submitStatus === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                  {submitStatus === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{submitMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-200 focus:ring-offset-2 focus:outline-none transition-colors"
                      placeholder="Your full name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-200 focus:ring-offset-2 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-200 focus:ring-offset-2 focus:outline-none transition-colors"
                    placeholder="How can we help you?"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-200 focus:ring-offset-2 focus:outline-none transition-colors resize-none"
                    placeholder="Describe your issue or question in detail..."
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isSubmitting
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:from-[#129046]/90 hover:to-[#9ccc53]/90'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <div className="text-center mb-8">
                <Zap className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Choose Invoice Bill Book Support?</h2>
                <p className="text-gray-600">Experience the best support service designed for your business success</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-xl flex items-center justify-center text-white">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-[#129046] to-[#9ccc53] p-8 rounded-xl text-white">
                  <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
                  <p >Join thousands of businesses already using InvoiceBillBook</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
