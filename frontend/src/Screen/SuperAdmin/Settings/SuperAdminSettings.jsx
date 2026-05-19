/**
 * Super Admin Settings Page
 * 
 * Features:
 * - Profile settings
 * - System configuration
 * - Security settings
 * - Notification preferences
 */

import { useState } from 'react';
import { Save, Lock, Bell, Shield, User } from 'lucide-react';

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: 'Super Admin',
    email: 'admin@example.com',
    phone: '+91 9876543210',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    newUserSignups: true,
    transactionAlerts: true,
    systemAlerts: true,
    weeklyReports: true,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    // TODO: Call API to save settings
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User className="w-5 h-5" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lock className="w-5 h-5" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Bell className="w-5 h-5" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'system'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Shield className="w-5 h-5" />
            System
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Change your password regularly to keep your account secure.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Update Password
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">
                        {key === 'emailNotifications' && 'Email Notifications'}
                        {key === 'newUserSignups' && 'New User Signups'}
                        {key === 'transactionAlerts' && 'Transaction Alerts'}
                        {key === 'systemAlerts' && 'System Alerts'}
                        {key === 'weeklyReports' && 'Weekly Reports'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {key === 'emailNotifications' && 'Receive email notifications for important events'}
                        {key === 'newUserSignups' && 'Get notified when new users sign up'}
                        {key === 'transactionAlerts' && 'Receive alerts for transaction activities'}
                        {key === 'systemAlerts' && 'Get notified about system issues'}
                        {key === 'weeklyReports' && 'Receive weekly system reports'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => handleNotificationChange(key)}
                      className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">System Version</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">v2.0.1</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">2024-06-15</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Database Status</p>
                  <p className="text-lg font-bold text-green-600 mt-2">Connected</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">API Status</p>
                  <p className="text-lg font-bold text-green-600 mt-2">Operational</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  System maintenance is scheduled for the next Sunday at 2:00 AM IST.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
