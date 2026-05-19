/**
 * Super Admin Dashboard
 * 
 * Features:
 * - Real-time overview statistics from database
 * - Quick access to main features
 * - Recent activities (signups and transactions)
 * - Dynamic data fetching
 */

import { useState, useEffect } from 'react';
import { Users, CreditCard, TrendingUp, AlertCircle, Loader } from 'lucide-react';
import { FaUserPlus, FaCreditCard, FaHistory, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { backendUrl } from '../../../config/appConfig';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    pendingIssues: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    newUsersThisMonth: 0,
    transactionsThisMonth: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${backendUrl}/api/superadmin/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to fetch dashboard statistics');
    }
  };

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${backendUrl}/api/superadmin/dashboard/recent-activity?limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setActivities(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching recent activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivities();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      icon: CreditCard,
      color: 'bg-yellow-100',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingIssues.toLocaleString(),
      icon: AlertCircle,
      color: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_signup':
        return <FaUserPlus className="w-5 h-5 text-blue-600" />;
      case 'transaction':
        return <FaCreditCard className="w-5 h-5 text-emerald-600" />;
      case 'user_deactivated':
        return <FaHistory className="w-5 h-5 text-red-600" />;
      case 'user_restored':
        return <FaCheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <FaHistory className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'user_signup':
        return 'bg-blue-100/50 text-blue-800 border-blue-200';
      case 'transaction':
        return 'bg-emerald-100/50 text-emerald-800 border-emerald-200';
      case 'user_deactivated':
        return 'bg-red-100/50 text-red-800 border-red-200';
      case 'user_restored':
        return 'bg-green-100/50 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="px-2 sm:px-3 py-2 sm:py-3 space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow p-6 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '-' : stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{loading ? '-' : (stats.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Monthly Revenue</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{loading ? '-' : (stats.monthlyRevenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">New Users This Month</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '-' : stats.newUsersThisMonth}</p>
          <p className="text-xs text-gray-500 mt-2">{loading ? '-' : stats.transactionsThisMonth} transactions</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md transform transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-white" />
              <p className="font-bold text-white text-lg">Active Users</p>
            </div>
            <p className="text-white/90 text-sm">Real-time active user tracking and management.</p>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md transform transition-all">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-6 h-6 text-white" />
              <p className="font-bold text-white text-lg">Transactions</p>
            </div>
            <p className="text-white/90 text-sm">Monitoring global business transaction flows.</p>
          </div>

          <div className="p-5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-md transform transition-all">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-white" />
              <p className="font-bold text-white text-lg">Inactive Users</p>
            </div>
            <p className="text-white/90 text-sm">Analysis of inactive and deleted user accounts.</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-yellow-500 animate-spin" />
            <span className="ml-2 text-gray-600">Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-600">No recent activities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl border ${getActivityColor(activity.type).split(' ')[0]} ${getActivityColor(activity.type).split(' ')[2]}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 leading-tight">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getActivityColor(activity.type)}`}>
                    {activity.type === 'user_signup' ? 'New User' : 'Transaction'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
