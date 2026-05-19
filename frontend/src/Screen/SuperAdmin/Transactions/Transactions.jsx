import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Download, 
  Filter, 
  Loader, 
  X, 
  CreditCard, 
  User, 
  Calendar, 
  CheckCircle2, 
  Info,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import ActionButtons from '../../../Components/ActionButtons';
import { backendUrl } from '../../../config/appConfig';

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0
  });

  // Fetch transactions from API
  const fetchTransactions = async (page = 1, search = '', status = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: search,
        status: status !== 'all' ? status : ''
      });

      const response = await fetch(
        `${backendUrl}/api/superadmin/transactions?${params}`,
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
        setTransactions(data.data.transactions || []);
        setPagination(data.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
        setSummary(data.data.summary || {
          totalTransactions: 0,
          completedTransactions: 0,
          pendingTransactions: 0,
          failedTransactions: 0,
          totalRevenue: 0
        });
      } else {
        setError(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions on component mount and when filters change
  useEffect(() => {
    fetchTransactions(currentPage, searchTerm, filterStatus);
  }, [currentPage, searchTerm, filterStatus]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'success':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  // Modal Component for Transaction Details
  const TransactionDetailsModal = ({ txn, onClose }) => {
    if (!txn) return null;

    const modalContent = (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal Body */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Transaction Details</h2>
                <p className="text-sm text-gray-500 font-medium">Txn ID: {txn.transactionNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* SECTION: Transaction Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Info className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-gray-800">General Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-hover hover:bg-white hover:shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(txn.status)}`}>
                      {getStatusLabel(txn.status)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-hover hover:bg-white hover:shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Amount</p>
                    <p className="text-lg font-bold text-gray-900">₹{txn.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Payment Method</p>
                    <p className="text-sm font-bold text-gray-800">{txn.paymentMethod || 'Razorpay'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(txn.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: User Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <User className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-gray-800">Customer Details</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Business Name</p>
                    <p className="text-sm font-bold text-gray-900">{txn.userName || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Email Address</p>
                    <p className="text-sm font-bold text-blue-600 underline">{txn.userEmail || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Contact Phone</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                      {txn.userPhone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: Plan & Product */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-800">Plan Information</h3>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black text-emerald-700 uppercase italic tracking-widest">{txn.plan}</h4>
                    <p className="text-xs text-emerald-600 font-medium">Software Activation License</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-emerald-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Gateway Ref</p>
                    <p className="text-xs font-mono font-bold text-gray-700 truncate" title={txn.referenceNumber}>{txn.referenceNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Currency</p>
                    <p className="text-sm font-bold text-gray-800">{txn.currency || 'INR'}</p>
                  </div>
                </div>
              </div>

              {/* SECTION: Security & Audit */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <CheckCircle2 className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-800">Audit & Gateway</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Approval Code</p>
                    <p className="text-sm font-bold text-gray-900">{txn.approvalId ? `#${txn.approvalId}` : 'N/A'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Gateway Txn ID</p>
                    <p className="text-xs font-mono p-2 bg-gray-200/50 rounded text-gray-700 break-all">{txn.gatewayTransactionId || 'N/A'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg hover:shadow-gray-200 active:scale-95"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="flex gap-4 flex-col md:flex-row md:items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or transaction ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">All Status</option>
              <option value="success">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <button className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{summary.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary.completedTransactions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{(summary.totalRevenue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-yellow-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Approval ID</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Plan</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.transactionId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2 text-sm font-medium text-gray-800">{txn.transactionNumber}</td>
                    <td className="px-6 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{txn.userName || 'N/A'}</p>
                        <p className="text-gray-600 text-xs">{txn.userEmail || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {txn.approvalId ? `#${txn.approvalId}` : 'N/A'}
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-600">{txn.plan}</td>
                    <td className="px-6 py-2 text-sm font-medium text-gray-800">₹{txn.amount.toLocaleString()}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-2 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(txn.status)}`}>
                        {getStatusLabel(txn.status)}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-sm">
                      <button
                        onClick={() => setSelectedTransaction(txn)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-bold border border-blue-200 active:scale-95"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} transactions
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

      {/* Transaction Details Modal */}
      <TransactionDetailsModal 
        txn={selectedTransaction} 
        onClose={() => setSelectedTransaction(null)} 
      />
    </div>
  );
}
