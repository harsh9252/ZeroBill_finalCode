/**
 * Super Admin Login Page
 * 
 * Features:
 * - Same design as regular login page
 * - Super Admin specific authentication
 * - Email/Password login
 * - Remember me functionality
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react';
import { backendUrl } from '../../../config/appConfig';

export default function SuperAdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
    
      
      // Call backend API
      const response = await fetch(`${backendUrl}/api/superadmin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

  
      const data = await response.json();
  

      if (data.success) {
        // Verify it's a Super Admin
        if (data.data.user.role !== 'superadmin') {
          setError('Access denied. Super Admin only.');
          setLoading(false);
          return;
        }

        // Store auth data
        localStorage.setItem('superAdminAuth', 'true');
        localStorage.setItem('superAdminUser', JSON.stringify(data.data.user));
        localStorage.setItem('superAdminToken', data.data.token);
        localStorage.setItem('superAdminRefreshToken', data.data.refreshToken);

        if (rememberMe) {
          localStorage.setItem('superAdminEmail', email);
        }

        // Call success callback
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/superadmin/dashboard', { replace: true });
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-png.png" alt="Logo" className="h-16 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Super Admin</h1>
          <p className="text-gray-600 text-center mb-8">Login to your super admin account</p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              <span>{loading ? 'Logging in...' : 'Login'}</span>
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Not a super admin?{' '}
            <a href="/login" className="text-yellow-600 hover:text-yellow-700 font-medium">
              Go to regular login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
