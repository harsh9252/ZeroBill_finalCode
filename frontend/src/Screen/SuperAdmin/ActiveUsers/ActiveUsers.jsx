/**
 * Active Users Page
 * 
 * Features:
 * - List of all active users from database
 * - Search and filter functionality
 * - Edit and Delete user actions
 * - Pagination
 * - Real-time data fetching
 */

import { useState, useEffect } from 'react';
import { Search, Loader, Phone, AlertCircle, Calendar, Clock } from 'lucide-react';
import ActionButtons from '../../../Components/ActionButtons';
import { backendUrl } from '../../../config/appConfig';
import { 
  showPremiumInputDialog, 
  showSuccessToast, 
  showErrorToast, 
  showLoadingModal,
  closeModal 
} from '../../../Components/ActionMessageModel';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal';

export default function ActiveUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });

  // Fetch active users from API
  const fetchActiveUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });

      const response = await fetch(
        `${backendUrl}/api/superadmin/users/active?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users || []);
        setPagination(data.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format phone number to (+91) 9876543210 or (+91) 987654323456
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    let str = phone.toString().trim();
    
    // Case 1: Starts with +91
    if (str.startsWith('+91')) {
      return `(+91) ${str.slice(3).trim()}`;
    }
    
    // Case 2: Starts with 91 (and long enough to be 91 + number)
    if (str.startsWith('91') && str.length > 10) {
      return `(+91) ${str.slice(2).trim()}`;
    }
    
    // Case 3: Just the number (e.g. 10 digits or more)
    const cleaned = str.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      // If it accidentally included 91 in cleaned but wasn't caught above
      if (cleaned.startsWith('91') && cleaned.length > 10) {
          return `(+91) ${cleaned.slice(2)}`;
      }
      return `(+91) ${cleaned}`;
    }
    
    return phone;
  };

  // Get Subscription Status Logic
  const getSubscriptionInfo = (user) => {
    const { subscription, subscriptionExpiryDate } = user;
    
    if (!subscriptionExpiryDate || subscription === 'N/A') {
      return { label: subscription || 'N/A', class: 'bg-gray-100 text-gray-800' };
    }

    const expiryDate = new Date(subscriptionExpiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        label: 'Expired', 
        class: 'bg-red-100 text-red-600 border border-red-200',
        icon: true 
      };
    } else if (diffDays <= 10) {
      return { 
        label: `Ends in ${diffDays} days`, 
        class: 'bg-orange-100 text-orange-700 border border-orange-200',
        icon: true 
      };
    }

    // Default premium/standard styles
    const styles = {
      'Premium': 'bg-purple-100 text-purple-800',
      'Standard': 'bg-blue-100 text-blue-800',
      'Platinum': 'bg-yellow-100 text-yellow-800'
    };

    return { 
      label: subscription, 
      class: styles[subscription] || 'bg-gray-100 text-gray-800' 
    };
  };

  // Deactivate user (Move to Deactivate Users list)
  const handleDeactivateUser = (user) => {
    setUserToDeactivate(user);
    setIsDeactivateModalOpen(true);
  };

  const confirmDeactivateUser = async () => {
    if (!userToDeactivate) return;

    try {
      setActionLoading({ id: userToDeactivate.id, type: 'toggle' });
      showLoadingModal('Deactivating user account...');
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(
        `${backendUrl}/api/superadmin/users/${userToDeactivate.id}/deactivate`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: 'Deactivated by Super Admin' })
        }
      );

      const data = await response.json();
      closeModal();

      if (data.success) {
        showSuccessToast('User deactivated successfully');
        setIsDeactivateModalOpen(false);
        setUserToDeactivate(null);
        fetchActiveUsers(currentPage, searchTerm);
      } else {
        showErrorToast(data.message || 'Failed to deactivate user');
      }
    } catch (err) {
      console.error('Error deactivating user:', err);
      showErrorToast('Failed to deactivate user. Please try again.');
    } finally {
      setActionLoading({ id: null, type: null });
      closeModal();
    }
  };

  // Fetch users on component mount and when page/search changes
  useEffect(() => {
    fetchActiveUsers(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Active Users</h1>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="max-w-md w-full relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-yellow-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Contact Number</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Join Date</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Subscription</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={`${user.id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2 text-sm text-gray-800 font-medium">{user.name}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {formatPhoneNumber(user.phone)}
                      </div>
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {new Date(user.joinDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-2 text-sm">
                      {(() => {
                        const info = getSubscriptionInfo(user);
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1.5 ${info.class}`}>
                            {info.icon && <Clock className="w-3 h-3" />}
                            {info.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-2 text-sm">
                      <ActionButtons
                        actions={['toggle']}
                        size="md"
                        onToggle={() => handleDeactivateUser(user)}
                        isActive={true}
                        loadingAction={actionLoading.id === user.id ? actionLoading.type : null}
                        currentId={user.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-yellow-500 text-white'
                      : 'border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setUserToDeactivate(null);
        }}
        onConfirm={confirmDeactivateUser}
        itemName={userToDeactivate?.name || ""}
        itemType="user"
        actionText="Deactivate"
        description="This user will be moved to the Deactivated Users list and will no longer have access to the system. You can restore them later."
        variant="red"
      />
    </div>
  );
}
