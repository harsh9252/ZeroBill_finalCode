/**
 * Account Approvals Page
 * 
 * Features:
 * - List of pending account approval requests
 * - Approve or reject accounts
 * - View approval details
 * - Search and filter functionality
 * - Real-time data fetching
 */

import { useState, useEffect } from 'react';
import { Search, Loader } from 'lucide-react';
import { backendUrl } from '../../../config/appConfig';

export default function AccountApprovals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch pending approvals
  const fetchApprovals = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('superAdminToken');

      // Fetch all pending approvals
      const response = await fetch(
        `${backendUrl}/api/approvals/pending`,
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
        // Map approvals to display format
        const allApprovals = (data.data.approvals || []).map(approval => ({
          ...approval,
          id: approval.id,
          name: `${approval.first_name} ${approval.last_name}`,
          email: approval.email,
          phone: approval.phone,
          business_name: approval.plan_name,
          requestDate: approval.created_at
        }));

        // Apply search filter
        let filtered = allApprovals;
        if (search) {
          filtered = allApprovals.filter(approval =>
            approval.name.toLowerCase().includes(search.toLowerCase()) ||
            approval.email.toLowerCase().includes(search.toLowerCase()) ||
            (approval.business_name && approval.business_name.toLowerCase().includes(search.toLowerCase()))
          );
        }

        // Apply pagination
        const limit = 10;
        const totalPages = Math.ceil(filtered.length / limit);
        const startIndex = (page - 1) * limit;
        const paginatedApprovals = filtered.slice(startIndex, startIndex + limit);

        setApprovals(paginatedApprovals);
        setPagination({
          page,
          limit,
          total: filtered.length,
          pages: totalPages
        });
      } else {
        setError(data.message || 'Failed to fetch approvals');
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError('Failed to fetch approvals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch approvals on component mount and when filters change
  useEffect(() => {
    fetchApprovals(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApprove = async (approvalId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(
        `${backendUrl}/api/approvals/approve/${approvalId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchApprovals(currentPage, searchTerm);
        setShowModal(false);
        setSelectedApproval(null);
      } else {
        alert(data.message || 'Failed to approve request');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(
        `${backendUrl}/api/approvals/reject/${approvalId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rejectionReason: rejectReason })
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchApprovals(currentPage, searchTerm);
        setShowModal(false);
        setSelectedApproval(null);
        setRejectReason('');
      } else {
        alert(data.message || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="p-6 space-y-6">
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

      {/* Approvals Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-yellow-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading approvals...</span>
            </div>
          ) : approvals.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">No pending approvals</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Business</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Request Date</th>
                  <th className="px-6 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((approval) => (
                  <tr 
                    key={approval.id} 
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setShowModal(true);
                    }}
                  >
                    <td className="px-6 py-2 text-sm font-medium text-gray-800">{approval.name}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">{approval.email}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">{approval.business_name || 'N/A'}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {new Date(approval.requestDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          disabled={actionLoading}
                          className="px-4 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowModal(true);
                            setRejectReason('');
                          }}
                          disabled={actionLoading}
                          className="px-4 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && approvals.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} approvals
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

      {/* Modal for Details and Actions */}
      {showModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0', padding: '0' }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6" style={{ zIndex: 10000 }}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Signup Request Details</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Name</p>
                  <p className="text-sm font-medium text-gray-800">{selectedApproval.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Phone</p>
                  <p className="text-sm font-medium text-gray-800">{selectedApproval.phone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Email</p>
                <p className="text-sm font-medium text-gray-800">{selectedApproval.email}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Plan</p>
                  <p className="text-sm font-medium text-gray-800">{selectedApproval.plan_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Plan Price</p>
                  <p className="text-sm font-medium text-gray-800">₹{selectedApproval.plan_price || '0'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Request Date</p>
                <p className="text-sm font-medium text-gray-800">{new Date(selectedApproval.requestDate).toLocaleString()}</p>
              </div>
            </div>

            {/* Rejection Reason Input */}
            {rejectReason !== '' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                  rows="3"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => handleApprove(selectedApproval.id)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  if (rejectReason === '') {
                    setRejectReason('placeholder');
                  } else {
                    handleReject(selectedApproval.id);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                {rejectReason !== '' ? (actionLoading ? 'Processing...' : 'Confirm Reject') : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedApproval(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
