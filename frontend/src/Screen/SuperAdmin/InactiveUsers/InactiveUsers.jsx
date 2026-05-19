/**
 * Inactive/Deleted Users Page
 * 
 * Features:
 * - List of inactive and deleted users from database
 * - Reason for deactivation
 * - Restore functionality
 * - Permanent delete option
 * - Real-time data fetching
 */

import { useState, useEffect } from 'react';
import { Search, Loader, Phone, Clock, RotateCcw, Trash2 } from 'lucide-react';
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

export default function InactiveUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToRestore, setUserToRestore] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });

  // Fetch deleted/inactive users from API
  const fetchInactiveUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search
      });

      const response = await fetch(
        `${backendUrl}/api/superadmin/users/inactive?${params}`,
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
      console.error('Error fetching inactive users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchInactiveUsers(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format phone number correctly
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    let str = phone.toString().trim();
    
    // If it already has a plus, keep it as is
    if (str.startsWith('+')) {
      return str;
    }
    
    // Default Indian formatting for 10 digit numbers
    const cleaned = str.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(+91) ${cleaned}`;
    }
    
    return phone;
  };

  // Get Subscription Status Logic (Same as Active Users for consistency)
  const getSubscriptionInfo = (user) => {
    const subscription = user?.subscription;
    const subscriptionExpiryDate = user?.subscriptionExpiryDate;
    
    if (!subscription || subscription === 'N/A') {
      return { 
        label: 'N/A', 
        class: 'bg-gray-100 text-gray-800' 
      };
    }
    
    const expiryDate = new Date(subscriptionExpiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', class: 'bg-red-100 text-red-600 border border-red-200', icon: true };
    } else if (diffDays <= 10) {
      return { label: `Ends in ${diffDays} days`, class: 'bg-orange-100 text-orange-700 border border-orange-200', icon: true };
    }
    
    const styles = {
      'Premium': 'bg-purple-100 text-purple-800',
      'Standard': 'bg-blue-100 text-blue-800',
      'Platinum': 'bg-yellow-100 text-yellow-800',
      'Diamond': 'bg-cyan-100 text-cyan-800'
    };
    
    return { 
      label: subscription, 
      class: styles[subscription] || 'bg-gray-100 text-gray-800' 
    };
  };

  // Restore User
  const handleRestoreUser = (user) => {
    setUserToRestore(user);
    setIsRestoreModalOpen(true);
  };

  const confirmRestoreUser = async () => {
    if (!userToRestore) return;

    try {
      setActionLoading({ id: userToRestore.id, type: 'toggle' });
      showLoadingModal('Restoring user access...');
      const token = localStorage.getItem('superAdminToken');
      
      const response = await fetch(`${backendUrl}/api/superadmin/users/${userToRestore.id}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('User restored successfully');
        setIsRestoreModalOpen(false);
        setUserToRestore(null);
        fetchInactiveUsers(currentPage, searchTerm);
      } else {
        showErrorToast(data.message || 'Failed to restore user');
      }
    } catch (err) {
      console.error('Error restoring user:', err);
      showErrorToast('Failed to restore user account.');
    } finally {
      setActionLoading({ id: null, type: null });
      closeModal();
    }
  };

  // Permanently delete user
  const handlePermanentDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading({ id: userToDelete.id, type: 'delete' });
      showLoadingModal('Purging all user data...');
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(
        `${backendUrl}/api/superadmin/users/${userToDelete.id}/permanent`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      closeModal();

      if (data.success) {
        showSuccessToast('User and all data deleted permanently');
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        fetchInactiveUsers(currentPage, searchTerm);
      } else {
        showErrorToast(data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      showErrorToast('Failed to delete user. Please try again.');
    } finally {
      setActionLoading({ id: null, type: null });
      closeModal();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Deactivated Users</h1>
      </div>
      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or business..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Total Deactivated Users</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '-' : pagination.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Last Deactivation</p>
          <p className="text-sm text-gray-600 mt-2">{users.length > 0 ? new Date(users[0]?.deactivatedDate).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

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
              <p className="text-gray-600">No deactivated users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Contact Number</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Business</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Deactivated Date</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Subscription</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={`${user.id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2 text-sm font-medium text-gray-800">{user.name}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {formatPhoneNumber(user.phone)}
                      </div>
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-600 font-medium">{user.business || 'N/A'}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {user.deactivatedDate ? new Date(user.deactivatedDate).toLocaleDateString() : 'N/A'}
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
                        actions={['toggle', 'delete']}
                        size="md"
                        onToggle={() => handleRestoreUser(user)}
                        onDelete={() => handlePermanentDelete(user)}
                        isActive={false}
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
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmPermanentDelete}
        itemName={userToDelete?.name || ""}
        itemType="user"
        actionText="Delete"
        description="This action cannot be undone. This will permanently delete this user and ALL their associated data (Businesses, Invoices, etc.) from the database forever."
        variant="red"
      />

      <DeleteConfirmationModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setUserToRestore(null);
        }}
        onConfirm={confirmRestoreUser}
        itemName={userToRestore?.name || ""}
        itemType="user"
        actionText="Restore"
        description="This user will be moved back to the Active Users list and will be able to log in to the system again."
        variant="orange"
      />
    </div>
  );
}
