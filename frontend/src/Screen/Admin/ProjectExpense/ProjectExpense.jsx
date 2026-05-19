import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  UserPlus,
  ArrowLeft,
  Building,
  Users,
  User,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Image,
  Phone
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../../Components/ActionMessageModel';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure, startOfDay } from '../../../Components/Date_wise_Filter_Button';
import ActionButtons from '../../../Components/ActionButtons';
import GeneralEmptyState from '../../../Components/GeneralEmptyState';
import ReusableTable from '../../../Components/ReusableTable';
import MainLoader from '../../../Components/MainLoader';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF';
import NewProjectExpenseModal from './NewProjectExpenseModal';
import NewProjectTransactionModal from './NewProjectTransactionModal';
import AddProjectPartyModal from './AddProjectPartyModal';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal';
import { getApiConfig } from '../../../utils/api';
import { getApiURL } from '../../../utils/config';

const API_URL = getApiURL();

// Remove local DATE_RANGE_OPTS as it's provided by the component

import { formatCurrency } from '../../../utils/currency';

const ProjectExpense = ({ currency, language = 'en-US' }) => {
  const businessId = localStorage.getItem('selectedBusinessId');

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isNewTransactionFormOpen, setIsNewTransactionFormOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [isAddProjectPartyModalOpen, setIsAddProjectPartyModalOpen] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedPartyId, setSelectedPartyId] = useState(null); // specific partyId or null
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [projectParties, setProjectParties] = useState([]);

  // Date range state
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const formatCurrencyDisplay = (v) => {
    return formatCurrency(v, currency);
  };

  const { netAmount, balancePending, isPayable, totalReceived, totalPaid, percentage, uniqueParties, filteredTransactions } = useMemo(() => {
    // 1. Map Project Parties with their balances from transactions
    const parties = projectParties.map(pp => {
      const partyTransactions = transactions.filter(t => String(t.project_party_id) === String(pp.id));
      const balance = partyTransactions.reduce((sum, t) => {
        const amt = Number(t.amount) || 0;
        return t.transaction_type === 'credit' ? sum + amt : sum - amt;
      }, 0);
      return {
        ...pp,
        name: pp.party_name,
        balance: balance
      };
    });

    // 2. Filter Transactions based on selectedPartyId and Date Range
    let filtered = transactions;
    if (selectedPartyId) {
      filtered = transactions.filter(t => String(t.project_party_id) === String(selectedPartyId));
    }

    // Add Date Filter for Transactions
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    if (bounds) {
      const { start, end } = bounds;
      filtered = filtered.filter(t => {
        // Use startOfDay(new Date()) to safely handle both ISO strings and local date strings
        const d = startOfDay(new Date(t.date || t.transaction_date));
        return d >= start && d <= end;
      });
    }

    // 3. Totals for the selected view
    const received = filtered
      .filter(t => t.type === 'payment_in')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paid = filtered
      .filter(t => t.type === 'payment_out')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const projectValue = Number(selectedExpense?.amount) || 0;
    const isPayable = selectedExpense?.project_type === 'payable';

    const netVal = isPayable ? (paid - received) : (received - paid);
    const pending = projectValue - netVal;
    const pct = projectValue > 0 ? (netVal / projectValue) * 100 : 0;

    return {
      netAmount: netVal,
      balancePending: pending,
      totalReceived: received,
      totalPaid: paid,
      isPayable: isPayable,
      percentage: Math.min(100, Math.max(0, pct)).toFixed(1),
      uniqueParties: parties,
      filteredTransactions: filtered
    };
  }, [transactions, projectParties, selectedExpense?.amount, selectedExpense?.project_type, selectedPartyId, dateRangeLabel, customRange]);

  const sidebarParties = useMemo(() => {
    const list = [
      ...uniqueParties
    ];

    if (!sidebarQuery.trim()) return list;
    const q = sidebarQuery.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q));
  }, [uniqueParties, transactions, selectedExpense?.amount, sidebarQuery]);

  // Isolation Fix: Clear transactions when switching project or tab
  useEffect(() => {
    if (selectedExpense?.id && activeTab === 'transactions') {
      setTransactions([]);
      setProjectParties([]);
      fetchTransactions(selectedExpense.id);
      fetchProjectParties(selectedExpense.id);
    }
  }, [selectedExpense?.id, activeTab]);

  useEffect(() => {
    if (businessId) {
      fetchExpenses();
    }
  }, [businessId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/project-expense`, {
        params: { business_id: businessId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showErrorToast({ title: 'Error', text: 'Failed to fetch project expenses' });
    } finally {
      setLoading(false);
    }
  };

  const existingCategories = useMemo(() => {
    const cats = expenses.map(e => e.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [expenses]);

  const fetchTransactions = async (expenseId) => {
    try {
      setTransactionsLoading(true);
      const token = localStorage.getItem('token');

      // Fetch transactions from the new endpoint
      const response = await axios.get(
        `${API_URL}/project-expense-transactions/${businessId}/project-expense/${expenseId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const transactions = response.data.data || [];

      // Transform transactions to match the expected format
      const formattedTransactions = transactions.map(t => ({
        ...t,
        type: t.transaction_type === 'credit' ? 'payment_in' : 'payment_out',
        date: t.transaction_date,
        amount: Number(t.amount) || 0,
        description: t.description || 'Transaction',
        screenshot: t.screenshot || null
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchProjectParties = async (expenseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/project-parties/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const parties = response.data.data || [];
        setProjectParties(parties);
      }
    } catch (error) {
      console.error('Error fetching project parties:', error);
      setProjectParties([]);
    }
  };

  const handleNewTransactionSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        throw new Error('Invalid amount');
      }

      const expenseData = {
        business_id: businessId,
        expense_number: formData.expenseNumber,
        account_name: formData.projectName,
        location: formData.location,
        start_date: formData.startDate,
        end_date: formData.endDate,
        amount: amount,
        remarks: formData.remarks,
        project_type: formData.projectType,
        value_breakdown: formData.value_breakdown,
        category: formData.category
      };

      await axios.post(`${API_URL}/project-expense`, expenseData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchExpenses();
      setIsTransactionModalOpen(false);
      showSuccessToast('Project expense record created successfully');
    } catch (error) {
      console.error('Error creating expense:', error);
      showErrorToast({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to create project expense'
      });
    }
  };

  const handleAddTransactionSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');

      // Create FormData to handle file upload
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        throw new Error('Invalid amount');
      }

      // If a party_name is provided but no project_party_id, create the party first
      let finalPartyId = formData.project_party_id;
      if (!finalPartyId && formData.party_name) {
        try {
          const partyPayload = {
            business_id: businessId,
            project_expense_id: selectedExpense.id,
            party_name: formData.party_name.trim(),
            phone: formData.phoneNumber ? ('+91' + formData.phoneNumber.trim()) : '',
            email: null
          };
          const partyResponse = await axios.post(`${API_URL}/project-parties`, partyPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (partyResponse.data.success) {
            finalPartyId = partyResponse.data.data.id;
            // Also refresh parties list in parent
            fetchProjectParties(selectedExpense.id);
          }
        } catch (err) {
          console.error('Error auto-creating party:', err);
          // Continue anyway, or throw error? Let's try to continue without party ID if it fails
        }
      }

      const submitData = new FormData();
      submitData.append('project_expense_id', selectedExpense.id);
      submitData.append('amount', amount);
      submitData.append('transaction_type', formData.type);
      submitData.append('transaction_date', formData.date);
      submitData.append('description', formData.remarks || '');
      submitData.append('payment_method', formData.payment_method || 'bank');
      if (finalPartyId) {
        submitData.append('project_party_id', finalPartyId);
      }
      submitData.append('party_name', formData.party_name || '');
      submitData.append('party_phone', formData.phoneNumber ? ('+91' + formData.phoneNumber.trim()) : '');
      if (formData.screenshot) {
        submitData.append('screenshot', formData.screenshot);
      }
      if (formData.category) {
        submitData.append('category', formData.category);
      }

      await axios.post(`${API_URL}/project-expense-transactions/${businessId}`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh transactions
      await fetchTransactions(selectedExpense.id);
      setIsNewTransactionFormOpen(false);
      showSuccessToast({ title: 'Success', text: 'Transaction added successfully' });
    } catch (error) {
      console.error('Error adding transaction:', error);
      showErrorToast({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to add transaction'
      });
    }
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsEditTransactionModalOpen(true);
  };

  const handleUpdateTransactionSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');

      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        throw new Error('Invalid amount');
      }

      // If a party_name is provided but no project_party_id, create the party first
      let finalPartyId = formData.project_party_id;
      if (!finalPartyId && formData.party_name) {
        try {
          const partyPayload = {
            business_id: businessId,
            project_expense_id: selectedExpense.id,
            party_name: formData.party_name.trim(),
            phone: formData.phoneNumber ? ('+91' + formData.phoneNumber.trim()) : '',
            email: null
          };
          const partyResponse = await axios.post(`${API_URL}/project-parties`, partyPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (partyResponse.data.success) {
            finalPartyId = partyResponse.data.data.id;
            fetchProjectParties(selectedExpense.id);
          }
        } catch (err) {
          console.error('Error auto-creating party during update:', err);
        }
      }

      // Create FormData to handle file upload
      const submitData = new FormData();
      submitData.append('project_expense_id', selectedExpense.id);
      submitData.append('amount', amount);
      submitData.append('transaction_type', formData.type);
      submitData.append('transaction_date', formData.date);
      submitData.append('description', formData.remarks || '');
      submitData.append('payment_method', formData.payment_method || 'bank');
      if (finalPartyId) {
        submitData.append('project_party_id', finalPartyId);
      }
      submitData.append('party_name', formData.party_name || '');
      submitData.append('party_phone', formData.phoneNumber ? ('+91' + formData.phoneNumber.trim()) : '');

      if (formData.screenshot) {
        submitData.append('screenshot', formData.screenshot);
      }
      if (formData.category) {
        submitData.append('category', formData.category);
      }

      await axios.put(`${API_URL}/project-expense-transactions/${businessId}/${selectedTransaction.id}`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh transactions
      await fetchTransactions(selectedExpense.id);
      setIsEditTransactionModalOpen(false);
      showSuccessToast({ title: 'Success', text: 'Transaction updated successfully' });
    } catch (error) {
      console.error('Error updating transaction:', error);
      showErrorToast({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update transaction'
      });
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setIsEditExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expense) => {
    setItemToDelete(expense);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = localStorage.getItem('token');

      // Check if it's a transaction or an expense
      if (itemToDelete.project_expense_id) {
        // It's a transaction
        await axios.delete(`${API_URL}/project-expense-transactions/${businessId}/${itemToDelete.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchTransactions(selectedExpense.id);
        showSuccessToast({ title: 'Success', text: 'Transaction deleted successfully' });
      } else {
        // It's an expense
        await axios.delete(`${API_URL}/project-expense/${itemToDelete.id}`, {
          data: { business_id: businessId },
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchExpenses();
        setViewMode('list');
        setSelectedExpense(null);
        showSuccessToast({ title: 'Success', text: 'Project expense deleted successfully' });
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      showErrorToast({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to delete'
      });
    }
  };

  const handleUpdateExpenseSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        throw new Error('Invalid amount');
      }

      const updateData = {
        business_id: businessId,
        expense_number: formData.expenseNumber,
        account_name: formData.projectName,
        location: formData.location,
        start_date: formData.startDate,
        end_date: formData.endDate,
        amount: amount,
        remarks: formData.remarks,
        project_type: formData.projectType,
        value_breakdown: formData.value_breakdown,
        category: formData.category
      };

      await axios.put(`${API_URL}/project-expense/${selectedExpense.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchExpenses();
      setIsEditExpenseModalOpen(false);
      showSuccessToast({ title: 'Success', text: 'Project expense updated successfully' });
    } catch (error) {
      console.error('Error updating expense:', error);
      showErrorToast({
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update project expense'
      });
    }
  };



  // Redundant onRangeChange and onRangeApply removed in favor of useDateRange hook

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Date Filter
    const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
    if (bounds) {
      const { start, end } = bounds;
      result = result.filter(exp => {
        // Use startOfDay(new Date()) to safely handle both ISO strings and local date strings
        const d = startOfDay(new Date(exp.start_date || exp.date));
        return d >= start && d <= end;
      });
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.account_name && e.account_name.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.remarks && e.remarks.toLowerCase().includes(q))
      );
    }
    return result;
  }, [expenses, searchQuery, dateRangeLabel, customRange]);

  if (loading) {
    return <MainLoader message="Loading project expenses..." />;
  }

  // Detail View Mode
  // Detail View Mode
  if (viewMode === 'detail' && selectedExpense) {
    return (
      <div id="project-detail-capture" className="flex flex-col min-h-screen pdf-page">
        {/* Desktop Header (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between pt-4 pb-3 px-4 border-b border-yellow-200 bg-white rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedExpense(null);
                setSelectedPartyId(null);
              }}
              className="group p-2 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition"
            >
              <ArrowLeft className="w-5 h-5 text-yellow-900 group-hover:text-green-700" />
            </button>
            <h2 translate="no" className="text-xl font-bold text-yellow-900">
              <span>{selectedExpense.account_name}</span>
            </h2>
            <span translate="no" className="text-sm px-3 py-1 bg-gray-100 text-yellow-900 rounded-full font-medium">
              <span>{formatCurrencyDisplay(selectedExpense.amount || 0)}</span>
            </span>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-yellow-200 px-4 py-3 flex items-center justify-between rounded-b-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedExpense(null);
              }}
              className="group p-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
            </button>
            <div>
              <h1 translate="no" className="text-base font-bold text-yellow-900 break-words max-w-[200px] truncate">
                <span>{selectedExpense.account_name}</span>
              </h1>
              <div translate="no" className="text-xs text-gray-600 mt-0.5">
                <span>{formatCurrencyDisplay(selectedExpense.amount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto md:pb-0 pb-20 bg-gray-50">
          <div className="grid grid-cols-1 gap-0">

            {/* Main Content Area */}
            <main className="bg-white rounded-lg md:rounded-xl border-1 border-yellow-200 flex flex-col mt-2 min-h-[80vh]">
              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-yellow-200 pr-4">
                <div className="flex gap-0">
                  <button
                    onClick={() => {
                      setActiveTab('transactions');
                      if (transactions.length === 0) {
                        fetchTransactions(selectedExpense.id);
                      }
                    }}
                    className={`-mb-[2px] px-6 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'transactions'
                      ? 'text-green-700 bg-yellow-100'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`-mb-[2px] px-6 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'details'
                      ? 'text-green-700 bg-yellow-100'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Project Details
                  </button>
                </div>

                {/* Nature Badge */}
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${selectedExpense.project_type === 'payable'
                  ? 'bg-red-50 text-red-600 border border-red-100'
                  : 'bg-green-50 text-[#129046] border border-green-100'
                  }`}>
                  {selectedExpense.project_type === 'payable' ? <span>Project Out</span> : <span>Project In</span>}
                </span>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {activeTab === 'details' && (
                  <>
                    {/* Professional Details Card */}
                    <div className="bg-white border-1 border-yellow-200 rounded-xl shadow-sm">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-900 px-6 py-3 border-b border-yellow-200 rounded-t-xl">
                        <h3 className="font-bold text-sm tracking-wide">EXPENSE DETAILS</h3>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Row 1: Project Expense Number & Project Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-b border-gray-100">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Project Expense Number</p>
                            <p className="text-sm font-bold text-gray-900">{selectedExpense.expense_number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Project Name</p>
                            <p className="text-sm font-bold text-gray-900">{selectedExpense.account_name}</p>
                          </div>
                        </div>

                        {/* Row 2: Category & Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-b border-gray-100">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Category</p>
                            <p className="text-sm font-bold text-gray-800">{selectedExpense.category || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Location</p>
                            <p className="text-sm font-bold text-gray-800">{selectedExpense.location || '-'}</p>
                          </div>
                        </div>

                        {/* Row 2: Start Date & End Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-b border-gray-100">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Start Date</p>
                            <p className="text-sm font-bold text-gray-800">
                              {new Date(selectedExpense.start_date || selectedExpense.date).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">End Date</p>
                            <p className="text-sm font-bold text-gray-800">
                              {new Date(selectedExpense.end_date || selectedExpense.date).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Row 3: Amount & Comment / Remark */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-b border-gray-100">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Project Value</p>
                            <p className="text-sm font-black text-gray-900">{formatCurrencyDisplay(selectedExpense.amount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Comment / Remark</p>
                            <p className="text-sm font-semibold text-gray-700 leading-relaxed">{selectedExpense.remarks || '-'}</p>
                          </div>
                        </div>

                        {/* Row 4: Value Breakdown (Historical Tracking) */}
                        {selectedExpense.value_breakdown && (typeof selectedExpense.value_breakdown === 'string' ? JSON.parse(selectedExpense.value_breakdown) : selectedExpense.value_breakdown).length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-4 w-1 bg-yellow-500 rounded-full"></div>
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Project Value Breakdown</h4>
                            </div>
                            <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/30">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-gray-100/50">
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase">Item Description</th>
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(typeof selectedExpense.value_breakdown === 'string' ? JSON.parse(selectedExpense.value_breakdown) : selectedExpense.value_breakdown).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white transition-colors">
                                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700">{item.name}</td>
                                      <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">{formatCurrencyDisplay(item.amount)}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-yellow-50/50">
                                    <td className="px-4 py-2.5 text-sm font-black text-yellow-900">Total Calculated Value</td>
                                    <td className="px-4 py-2.5 text-sm font-black text-yellow-900 text-right">{formatCurrencyDisplay(selectedExpense.amount)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Row 5: Parties Involved */}
                        {projectParties.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-4 w-1 bg-[#129046] rounded-full"></div>
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Parties Involved</h4>
                            </div>
                            <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/30">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-gray-100/50">
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase">Party Name</th>
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase">Phone</th>
                                    <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-right">Created At</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {projectParties.map((party) => (
                                    <tr key={party.id} className="hover:bg-white transition-colors">
                                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700">{party.party_name}</td>
                                      <td className="px-4 py-2.5 text-sm text-gray-600">{party.phone || '-'}</td>
                                      <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">
                                        {party.created_at ? new Date(party.created_at).toLocaleString(language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'transactions' && (
                  <div className="space-y-4 p-2">
                    <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
                      {/* Party Filter Dropdown */}
                      <div className="relative h-[32px]">
                        <select
                          value={selectedPartyId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPartyId(val ? Number(val) : null);
                          }}
                          className="h-full pr-8 pl-8 py-1 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-yellow-950 focus:border-green-700 focus:ring-2 focus:ring-green-700/10 outline-none transition-all appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378350f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                            backgroundSize: "14px",
                            paddingRight: "28px"
                          }}
                        >
                          <option value="">All Parties</option>
                          {projectParties.map((party) => (
                            <option key={party.id} value={party.id}>
                              {party.party_name}
                            </option>
                          ))}
                        </select>
                        <Users className="w-3.5 h-3.5 text-yellow-900 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      <Date_wise_Filter_Button
                        dateRangeLabel={dateRangeLabel}
                        onRangeChange={(val) => setDateRangeLabel(val)}
                        customRange={customRange}
                        onRangeApply={(range) => {
                          setCustomRange(range);
                          setDateRangeLabel("Custom Date Range");
                        }}
                      />

                      <button
                        onClick={() => setIsNewTransactionFormOpen(true)}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm h-[32px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Entry
                      </button>
                    </div>

                    {/* Project Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Balance Amount */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1">Balance Pending</p>
                        <p translate="no" className="text-base font-bold text-orange-900">
                          <span>{formatCurrencyDisplay(balancePending)}</span>
                        </p>
                      </div>

                      {/* Total Received (Payment In) */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">Payment In</p>
                        <p className="text-base font-bold text-green-900">
                          {formatCurrencyDisplay(totalReceived)}
                        </p>
                      </div>

                      {/* Total Paid (Payment Out - Net) */}
                      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Payment Out</p>
                        <p translate="no" className="text-base font-bold text-red-900">
                          <span>{formatCurrencyDisplay(totalPaid)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="border border-yellow-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Number</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider text-red-600">Debit (Out)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider text-[#129046]">Credit (In)</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Screenshot</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="px-4 py-12 text-center text-gray-500 text-sm">
                                No Transactions Found
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((t) => (
                              <tr
                                key={t.id}
                                className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {new Date(t.transaction_date || t.date).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-[#129046]">
                                  <div className="flex items-start gap-2">
                                    <Users className="w-3.5 h-3.5 mt-0.5" />
                                    <div className="flex flex-col">
                                      <span>{t.party_name || '-'}</span>
                                      {projectParties.find(p => String(p.id) === String(t.project_party_id))?.created_at && (
                                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-tighter">
                                          Created: {new Date(projectParties.find(p => String(p.id) === String(t.project_party_id)).created_at).toLocaleString(language, { 
                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3" />
                                    <span>{t.party_phone || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  <span translate="no" className="px-2 py-1 bg-gray-100 rounded text-[11px] font-bold text-gray-700 uppercase">
                                    {t.category || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-red-500">
                                  {t.type === 'payment_out' ? formatCurrencyDisplay(t.amount || 0) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-[#129046]">
                                  {t.type === 'payment_in' ? formatCurrencyDisplay(t.amount || 0) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {t.screenshot ? (
                                    <button
                                      onClick={() => {
                                        const fullUrl = t.screenshot.startsWith('http') ? t.screenshot : `${getApiConfig().backendURL}${t.screenshot}`;
                                        setSelectedImage(fullUrl);
                                        setShowImageModal(true);
                                      }}
                                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-tight"
                                    >
                                      <Image className="w-3.5 h-3.5" />
                                      View
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs font-medium">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.screenshot
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                    }`}>
                                    {t.screenshot ? 'Verified' : 'Completed'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <ActionButtons
                                    onEdit={() => handleEditTransaction(t)}
                                    onDelete={() => handleDeleteExpense(t)}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div> {/* Close Tab Content */}
            </main>
          </div>
        </div>

        {/* Modals for Detail View */}
        <NewProjectTransactionModal
          isOpen={isNewTransactionFormOpen}
          onClose={() => setIsNewTransactionFormOpen(false)}
          onSubmit={handleAddTransactionSubmit}
          currency={currency}
          language={language}
          projectExpenseId={selectedExpense?.id}
          selectedPartyId={selectedPartyId}
          parties={projectParties}
          projectCategories={selectedExpense?.category}
        />

        <NewProjectTransactionModal
          isOpen={isEditTransactionModalOpen}
          onClose={() => setIsEditTransactionModalOpen(false)}
          onSubmit={handleUpdateTransactionSubmit}
          transaction={selectedTransaction}
          currency={currency}
          language={language}
          projectExpenseId={selectedExpense?.id}
          selectedPartyId={selectedPartyId}
          parties={projectParties}
          projectCategories={selectedExpense?.category}
        />

        <AddProjectPartyModal
          isOpen={isAddProjectPartyModalOpen}
          onClose={() => setIsAddProjectPartyModalOpen(false)}
          onPartyAdded={(newParty) => {
            if (selectedExpense?.id) {
              setSelectedPartyId(newParty.id);
              fetchProjectParties(selectedExpense.id);
              fetchTransactions(selectedExpense.id);
            }
          }}
          currency={currency}
          projectExpenseId={selectedExpense?.id}
        />

        {/* Image Preview Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
            <div
              className="relative w-full h-screen flex items-center justify-center p-4"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  const imgElement = document.getElementById('modal-image');
                  if (imgElement) {
                    const currentScale = parseFloat(imgElement.dataset.scale || 1);
                    const newScale = e.deltaY > 0 ? Math.max(0.5, currentScale - 0.1) : Math.min(3, currentScale + 0.1);
                    imgElement.dataset.scale = newScale;
                    imgElement.style.transform = `scale(${newScale})`;
                  }
                }
              }}
            >
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
                className="absolute top-8 right-8 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center z-10 transition-all shadow-lg font-bold"
              >
                <span className="text-3xl leading-none font-light">×</span>
              </button>

              {(() => {
                const isPdf = selectedImage.toLowerCase().split('?')[0].endsWith('.pdf');
                const isWord = selectedImage.toLowerCase().split('?')[0].endsWith('.doc') || selectedImage.toLowerCase().split('?')[0].endsWith('.docx');
                const isExcel = selectedImage.toLowerCase().split('?')[0].endsWith('.xls') || selectedImage.toLowerCase().split('?')[0].endsWith('.xlsx');
                
                if (isPdf) {
                  return (
                    <iframe
                      src={selectedImage}
                      title="PDF Viewer"
                      className="w-full max-w-4xl h-[85vh] bg-white rounded-lg shadow-xl"
                    />
                  );
                } else if (isWord || isExcel || !/\.(jpg|jpeg|png|gif|webp|jfif|svg|bmp|tiff|avif)($|\?)/i.test(selectedImage)) {
                  const fileName = selectedImage.split('/').pop() || 'document';
                  return (
                    <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full border border-gray-100">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg max-w-full truncate px-4">{decodeURIComponent(fileName)}</h3>
                      <p className="text-gray-500 text-xs uppercase font-semibold">
                        {isWord ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : 'Attachment File'}
                      </p>
                      <a
                        href={selectedImage}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 px-6 py-2.5 bg-[#129046] hover:bg-[#129046]/90 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
                      >
                        Download Attachment
                      </a>
                    </div>
                  );
                } else {
                  return (
                    <img
                      id="modal-image"
                      src={selectedImage}
                      alt="Transaction Attachment"
                      className="max-h-[90vh] max-w-full object-contain transition-transform duration-150 cursor-grab active:cursor-grabbing rounded-lg shadow-xl"
                      data-scale="1"
                      style={{ transform: 'scale(1)' }}
                    />
                  );
                }
              })()}
            </div>
          </div>
        )}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.account_name || (itemToDelete?.project_expense_id ? "Transaction Entry" : "Project")}
          itemType={itemToDelete?.project_expense_id ? "transaction" : "project expense"}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 min-h-screen w-full flex flex-col relative px-2 sm:px-4">
      <div className="h-auto w-full rounded-xl border-1 border-yellow-200 flex flex-col bg-white shadow-sm overflow-hidden">
        {/* Topbar: Search & New Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 flex-1">
            <DashboardBackButton />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by project, party or description..."
                className="w-full h-8 pl-10 pr-4 bg-gray-50 border border-gray-300 rounded-[7px] text-sm focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Date_wise_Filter_Button
              dateRangeLabel={dateRangeLabel}
              onRangeChange={(val) => setDateRangeLabel(val)}
              customRange={customRange}
              onRangeApply={(range) => {
                setCustomRange(range);
                setDateRangeLabel("Custom Date Range");
              }}
            />

            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="h-8 px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create new project</span>
            </button>
          </div>
        </div>


        {/* List Content */}
        <div className="flex-1 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="py-20">
              <GeneralEmptyState
                title="No Project Expenses Found"
                description="You haven't added any project expenses yet. Start by creating your first record to manage project costs."
                buttonText="Add Your First Expense"
                onButtonClick={() => setIsTransactionModalOpen(true)}
                icon={Building}
              />
            </div>
          ) : (
            <div className="hidden md:block">
              <ReusableTable
                columns={[
                  {
                    key: 'expense_number',
                    title: 'Expense No.',
                    sortable: true,
                    width: '150px',
                    render: (r) => <span className="font-semibold text-gray-855 text-xs bg-yellow-50 px-2 py-1 rounded border border-yellow-100">{r.expense_number || '-'}</span>
                  },
                  {
                    key: 'start_date',
                    title: 'Dates',
                    sortable: true,
                    width: '130px',
                    render: (r) => (
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-medium text-sm">
                          {new Date(r.start_date).toLocaleDateString(language, {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          to {new Date(r.end_date).toLocaleDateString(language, {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    )
                  },
                  {
                    key: 'account_name',
                    title: 'Project Name',
                    sortable: true,
                    width: '30%',
                    render: (r) => (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-100">
                          <Building className="w-4 h-4 text-yellow-600" />
                        </div>
                        <span className="font-bold text-[#5C3B09]">{r.account_name}</span>
                      </div>
                    )
                  },
                  {
                    key: 'category',
                    title: 'Category',
                    sortable: true,
                    width: '120px',
                    render: (r) => <span className="text-gray-600">{r.category || '-'}</span>
                  },
                  {
                    key: 'location',
                    title: 'Location',
                    sortable: true,
                    width: '120px',
                    render: (r) => <span className="text-gray-600">{r.location || '-'}</span>
                  },
                  {
                    key: 'amount',
                    title: 'Project Value',
                    sortable: true,
                    width: '130px',
                    render: (r) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{formatCurrencyDisplay(r.amount || 0)}</span>

                      </div>
                    )
                  },
                  {
                    key: 'project_type',
                    title: 'Project Nature',
                    sortable: true,
                    width: '130px',
                    render: (r) => (
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${r.project_type === 'payable'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-green-50 text-[#129046] border border-green-100'
                        }`}>
                        {r.project_type === 'payable' ? 'Project Out' : 'Project In'}
                      </span>
                    )
                  },
                  {
                    key: 'action',
                    title: 'Action',
                    width: '90px',
                    align: 'center',
                    render: (r) => (
                      <ActionButtons
                        onEdit={(e) => {
                          e.stopPropagation();
                          handleEditExpense(r);
                        }}
                        onDelete={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(r);
                        }}
                      />
                    )
                  }
                ]}
                data={filteredExpenses.map((r, idx) => ({ ...r, sNo: idx + 1 }))}
                rowKey="id"
                onRowClick={(row) => {
                  setSelectedExpense(row);
                  setViewMode('detail');
                }}
                emptyState={
                  <GeneralEmptyState
                    title="No Project Expenses Found"
                    description="No project expenses match your current filters. Try adjusting the date range or search query."
                  />
                }
              />
            </div>
          )}

          {/* Mobile View Placeholder */}
          <div className="md:hidden p-4 text-center text-gray-500 text-sm">
            Please use desktop for better management experience.
          </div>
        </div>
      </div>

      <NewProjectExpenseModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleNewTransactionSubmit}
        currency={currency}
        language={language}
        existingCategories={existingCategories}
        businessId={businessId}
      />

      <NewProjectExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => setIsEditExpenseModalOpen(false)}
        onSubmit={handleUpdateExpenseSubmit}
        expense={selectedExpense}
        currency={currency}
        language={language}
        existingCategories={existingCategories}
        businessId={businessId}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.account_name || (itemToDelete?.project_expense_id ? "Transaction Entry" : "Project")}
        itemType={itemToDelete?.project_expense_id ? "transaction" : "project expense"}
      />
    </div>
  );
};

export default ProjectExpense;
