import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserCheck, UserX, ArrowLeft, Eye, EyeOff, X } from 'lucide-react';
import ActionButtons from '../../../Components/ActionButtons';
import { businessAPI } from '../../../utils/api';
import { subUserService } from '../../../services/subUserService';
import { withRoleBasedAccess } from '../../../Components/RoleBasedAccess.jsx';
import { isAdminUser } from '../../../utils/roleUtils.js';
import { showSuccessToast, showErrorToast, showConfirmationDialog, showPremiumInputDialog } from '../../../Components/ActionMessageModel.jsx';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';

const MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'salesLead', label: 'Sales Lead' },
    { key: 'parties', label: 'Parties' },
    { key: 'inventory', label: 'Inventory / Services' },
    { key: 'quotation', label: 'Quotation' },
    { key: 'proformaInvoice', label: 'Proforma Invoice' },
    { key: 'invoice', label: 'Tax Invoice' },
    { key: 'payment', label: 'Payment In' },
    { key: 'salesReturn', label: 'Sales Return' },
    { key: 'creditNote', label: 'Credit Note' },
    { key: 'deliveryChallan', label: 'Delivery Challan' },
    { key: 'purchaseOrder', label: 'Purchase Order' },
    { key: 'bookPurchaseOrder', label: 'Book Purchase order' },
    { key: 'bookInvoice', label: 'Book Invoice' },
    { key: 'paymentOut', label: 'Payment Out' },
    { key: 'debitNote', label: 'Debit Note' },
    { key: 'Agreement', label: 'Agreement' },
    { key: 'report', label: 'Report' },
    { key: 'eInvoice', label: 'E-Invoice & EWB' },
    { key: 'projectExpense', label: 'Project Expense' },
    { key: 'zKhataBook', label: 'Z Khata Book' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'documents', label: 'Documents' },
    { key: 'grn', label: 'Goods Received Note' },
    { key: 'mrn', label: 'Material Receipt Note' },
    { key: 'purchaseRequisition', label: 'Purchase Requisition' },
    { key: 'account', label: 'Account Settings' },
    { key: 'business', label: 'Manage Business' }
];

// UserModal component - moved outside to prevent re-creation
const UserModal = ({
    selectedUser,
    formData,
    setFormData,
    handleFormSubmit,
    setShowAddModal,
    businessOptions,
    handleBusinessSelect,
    formErrors = {},
    activeTaxType = 'No'
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 sm:mx-0 max-h-[90vh] flex flex-col relative">
                <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none z-10"
                    title="Close"
                >
                    <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
                <div className="mb-4 shrink-0">
                    <h3 className="text-lg font-semibold">
                        {selectedUser ? 'Edit User' : 'Add New User'}
                    </h3>
                </div>
                <form className="space-y-4 overflow-y-auto pr-2" autoComplete="off" onSubmit={(e) => {


                    handleFormSubmit(e);
                }}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                            type="text"
                            className={`w-full px-2 py-2 border rounded-lg text-sm focus:outline-none ${formErrors.name ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20'}`}
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter user name"
                            autoComplete="off"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className={`w-full px-2 py-2 border rounded-lg text-sm focus:outline-none ${formErrors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20'}`}
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                            autoComplete="off"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Businesses
                            <span className="text-xs text-gray-500 font-normal ml-1">(Select multiple)</span>
                        </label>
                        <MultiSelectBusiness
                            options={businessOptions}
                            selectedValues={formData.businesses}
                            onChange={handleBusinessSelect}
                            placeholder="Select Businesses"
                            hasError={formErrors.businesses}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Permissions (Module Access)
                            <span className="text-xs text-gray-500 font-normal ml-1">(Select accessible modules)</span>
                        </label>
                        <div className="mb-3 flex items-center justify-between px-3 py-2 bg-gray-100/50 rounded-lg border border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[#1fbe5a] focus:ring-[#1fbe5a] border-gray-300 rounded cursor-pointer"
                                    checked={(() => {
                                        const p = formData.permissions;
                                        const currentArr = Array.isArray(p) ? p : (typeof p === 'string' ? (JSON.parse(p || '[]')) : []);
                                        const taxType = activeTaxType;
                                        const visibleModules = MODULES.filter(m => {
                                            if (m.key === 'eInvoice' && taxType !== 'GST') return false;
                                            return true;
                                        });
                                        return visibleModules.length > 0 && visibleModules.every(m => currentArr.includes(m.key));
                                    })()}
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        const taxType = activeTaxType;
                                        const visibleModules = MODULES.filter(m => {
                                            if (m.key === 'eInvoice' && taxType !== 'GST') return false;
                                            return true;
                                        });
                                        setFormData(prev => ({
                                            ...prev,
                                            permissions: isChecked ? visibleModules.map(m => m.key) : []
                                        }));
                                    }}
                                />
                                <span className="text-xs font-bold text-gray-800">
                                    Select All Modules
                                </span>
                            </label>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {(() => {
                                    const p = formData.permissions;
                                    const currentArr = Array.isArray(p) ? p : [];
                                    const taxType = activeTaxType;
                                    const visibleModules = MODULES.filter(m => {
                                        if (m.key === 'eInvoice' && taxType !== 'GST') return false;
                                        return true;
                                    });
                                    return `${currentArr.length} / ${visibleModules.length} Selected`;
                                })()}
                            </span>
                        </div>
                        <div className={`grid grid-cols-2 gap-2 p-3 border-2 rounded-lg bg-white/50 transition-all ${formErrors.permissions ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-gray-100'}`}>
                            {MODULES.filter(m => {
                                const taxType = activeTaxType;
                                if (m.key === 'eInvoice' && taxType !== 'GST') return false;
                                return true;
                            }).map((module) => (
                                <label key={module.key} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#1fbe5a] focus:ring-[#1fbe5a] border-gray-300 rounded cursor-pointer"
                                        checked={(() => {
                                            const p = formData.permissions;
                                            if (Array.isArray(p)) return p.includes(module.key);
                                            if (typeof p === 'string') {
                                                try {
                                                    const parsed = JSON.parse(p);
                                                    return Array.isArray(parsed) ? parsed.includes(module.key) : p.includes(module.key);
                                                } catch (e) {
                                                    return p.split(',').map(s => s.trim()).includes(module.key);
                                                }
                                            }
                                            return false;
                                        })()}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setFormData(prev => {
                                                let currentPermissions = [];
                                                const p = prev.permissions;

                                                // Deep conversion to array
                                                if (Array.isArray(p)) {
                                                    currentPermissions = [...p];
                                                } else if (typeof p === 'string') {
                                                    try {
                                                        const parsed = JSON.parse(p);
                                                        currentPermissions = Array.isArray(parsed) ? [...parsed] : [p];
                                                    } catch (e) {
                                                        currentPermissions = p.split(',').map(s => s.trim()).filter(s => s);
                                                    }
                                                }

                                                const newPermissions = isChecked
                                                    ? [...new Set([...currentPermissions, module.key])]
                                                    : currentPermissions.filter(k => k !== module.key);

                                                return { ...prev, permissions: newPermissions };
                                            });
                                        }}
                                    />
                                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                                        {module.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Password
                            {selectedUser && (
                                <span className="text-xs text-gray-500 font-normal ml-1">(Current password shown)</span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`w-full px-2 py-2 pr-10 border rounded-lg text-sm focus:outline-none ${formErrors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#1fbe5a] focus:ring-2 focus:ring-[#1fbe5a]/20'}`}
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                placeholder={selectedUser ? "Current password" : "Enter password"}
                                autoComplete="new-password"
                                required={!selectedUser}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#1fbe5a] transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 px-4 py-2 border border-red-500 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center justify-center transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 font-medium flex items-center justify-center transition-colors"
                        >
                            {selectedUser ? 'Update' : 'Add'} User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Multi-select Business Component - moved outside to prevent re-creation
const MultiSelectBusiness = ({ options, selectedValues, onChange, placeholder, hasError }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = (businessId) => {
        // Just notify the parent of the toggle action
        // The parent now handles the logic safely using functional updates
        onChange(businessId);
    };

    const getSelectedLabels = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) {
            const business = options.find(opt => opt.value === selectedValues[0]);
            return business ? business.label : 'Selected';
        }
        return `${selectedValues.length} businesses selected`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-2 py-2 border-2 rounded-lg text-sm focus:outline-none text-left bg-white flex items-center justify-between transition-all ${hasError ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]' : 'border-gray-200 hover:border-[#1fbe5a] focus:border-[#1fbe5a]'
                    }`}
            >
                <span className="truncate text-sm text-left">
                    {getSelectedLabels()}
                </span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                    <div className="py-2">
                        {/* Select All / Clear All buttons */}
                        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allValues = options.filter(opt => !opt.disabled).map(opt => opt.value);
                                        onChange(allValues);
                                        // Keep dropdown open after select all
                                    }}
                                    className="text-xs text-[#1fbe5a] hover:text-[#1fbe5a]/80 font-medium"
                                >
                                    Select All
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange([]);
                                        // Keep dropdown open after clear all
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                >
                                    Clear All
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-white font-semibold px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
                            >
                                Done
                            </button>
                        </div>

                        {options.map((option) => {
                            if (option.disabled) return null;
                            const isSelected = selectedValues.includes(option.value);

                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleToggle(option.value)}
                                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => { }} // Handled by parent div onClick
                                        className="mr-3 h-4 w-4 text-[#1fbe5a] focus:ring-[#1fbe5a] border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-900">{option.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const ManageUser = ({ isPlanExpired, checkPlanExpiry }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        businesses: [], // Changed from 'business' to 'businesses' array
        password: '',
        permissions: ['dashboard', 'inventory', 'parties']
    });
    const [formErrors, setFormErrors] = useState({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Fetch users and businesses from API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch businesses for dropdown
                const businessResponse = await businessAPI.getAll();

                if (businessResponse.success) {

                    setBusinesses(businessResponse.data || []);
                } else {
                    console.error('Failed to fetch businesses:', businessResponse.message);
                    setBusinesses([]);
                }

                // Fetch sub-users
                const subUsersResponse = await subUserService.getSubUsers();

                if (subUsersResponse.success) {

                    setUsers(subUsersResponse.data || []);
                } else {
                    console.error('Failed to fetch sub-users:', subUsersResponse.message);
                    setUsers([]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setUsers([]);
                setBusinesses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);

        // Search in businesses array - handle both businessIds and businessNames
        const businessMatch = (user.businessIds && user.businessIds.some(businessId => {
            const business = businesses.find(b => (b.id || b._id) === businessId);
            if (business) {
                const businessName = business.business_name || business.businessName || business.name || '';
                return businessName.toLowerCase().includes(searchLower);
            }
            return false;
        })) || (user.businessNames && user.businessNames.some(name =>
            name.toLowerCase().includes(searchLower)
        ));

        return nameMatch || emailMatch || businessMatch;
    });

    const handleAddUser = () => {
        if (isPlanExpired) {
            checkPlanExpiry();
            return;
        }
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            businesses: [], // Reset to empty array
            password: '',
            permissions: ['dashboard', 'inventory', 'parties']
        });
        setFormErrors({});
        setShowAddModal(true);
    };

    const handleEditUser = (user) => {
        if (isPlanExpired) {
            checkPlanExpiry();
            return;
        }


        setSelectedUser(user);

        // Ensure businessIds is an array
        const userBusinessIds = Array.isArray(user.businessIds) ? user.businessIds :
            user.businessIds ? [user.businessIds] : [];

        setFormData({
            name: user.name || '',
            email: user.email || '',
            businesses: userBusinessIds, // Use processed businessIds
            password: user.password || '', // Show password from database
            permissions: Array.isArray(user.permissions) ? user.permissions : (user.permissions ? JSON.parse(user.permissions) : [])
        });
        setFormErrors({});


        setShowAddModal(true);
    };

    const handleDeleteUser = (userId) => {
        if (isPlanExpired) {
            checkPlanExpiry();
            return;
        }
        const user = users.find(u => u.id === userId);
        if (user) {
            setUserToDelete(user);
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await subUserService.deleteSubUser(userToDelete.id);
            setUsers(users.filter(user => user.id !== userToDelete.id));

            showSuccessToast('User deleted permanently');

            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting sub-user:', error);
            showErrorToast('Failed to delete user: ' + error.message);
        }
    };

    const handleToggleStatus = async (userId) => {
        if (isPlanExpired) {
            checkPlanExpiry();
            return;
        }
        try {
            const user = users.find(u => u.id === userId);
            const newStatus = !user.is_active;

            const response = await subUserService.toggleSubUserStatus(userId, newStatus);

            if (response.success) {
                setUsers(users.map(u =>
                    u.id === userId
                        ? { ...u, is_active: newStatus }
                        : u
                ));

                showSuccessToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);

            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            showErrorToast('Failed to toggle user status: ' + error.message);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const errors = {};

        // Validate required fields
        if (!formData.name) errors.name = true;
        if (!formData.email) errors.email = true;

        if (!formData.businesses || formData.businesses.length === 0) {
            errors.businesses = true;
        }

        if (!selectedUser && !formData.password) {
            errors.password = true;
        }

        // Validate permissions - at least one must be selected
        if (!formData.permissions ||
            (Array.isArray(formData.permissions) && formData.permissions.length === 0) ||
            (typeof formData.permissions === 'string' && formData.permissions.trim() === '[]') ||
            (typeof formData.permissions === 'string' && formData.permissions.trim() === '')
        ) {
            errors.permissions = true;
        }

        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            showErrorToast('Please fill in all required fields and select at least one permission');
            return;
        }

        try {
            // Prepare data for API - convert 'businesses' to 'businessIds'
            const apiData = {
                name: formData.name,
                email: formData.email,
                businessIds: formData.businesses, // Convert businesses array to businessIds
                password: formData.password,
                permissions: formData.permissions
            };



            if (selectedUser) {


                // Update existing user
                const response = await subUserService.updateSubUser(selectedUser.id, apiData);


                // Update local state
                const updatedUsers = users.map(user =>
                    user.id === selectedUser.id
                        ? { ...user, ...response.data }
                        : user
                );

                setUsers(updatedUsers);
            } else {


                // Create new user
                const response = await subUserService.createSubUser(apiData);


                // Add to local state
                const newUsers = [...users, response.data];

                setUsers(newUsers);
            }



            // Close form modal
            setShowAddModal(false);

            // Reset form
            setFormData({
                name: '',
                email: '',
                businesses: [],
                password: '',
                permissions: ['dashboard', 'inventory', 'parties']
            });

            // Show success message
            showSuccessToast(selectedUser ? 'User updated successfully!' : 'User created successfully!');

        } catch (error) {
            console.error('=== FORM SUBMIT ERROR ===');
            console.error('Error saving sub-user:', error);
            console.error('Error details:', error.response?.data || error.message);

            // More detailed error handling
            let errorMessage = 'Failed to save user';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Check for network errors
            if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please check if the backend server is running.';
            }

            showErrorToast(errorMessage);
        }
    };

    const businessOptions = businesses.length > 0
        ? businesses.map((business, index) => {
            // Handle various possible field names and empty values
            const businessName = business.business_name || business.businessName || business.name || `Business ${index + 1}`;
            const businessId = business.id || business._id || `temp-${index}`;

            return {
                label: businessName,
                value: businessId,
                id: businessId
            };
        })
        : [{ label: 'No businesses available', value: '', id: 'no-business', disabled: true }];

    const handleBusinessSelect = useCallback((businessIdOrArray) => {
        setFormData(prev => {
            const currentBusinesses = Array.isArray(prev.businesses) ? prev.businesses : [];

            // If an array is passed (e.g. from Select All / Clear All), replace the whole thing
            if (Array.isArray(businessIdOrArray)) {
                return { ...prev, businesses: businessIdOrArray };
            }

            // If a single ID is passed, toggle it
            const isSelected = currentBusinesses.includes(businessIdOrArray);
            const newSelection = isSelected
                ? currentBusinesses.filter(id => id !== businessIdOrArray)
                : [...currentBusinesses, businessIdOrArray];

            return { ...prev, businesses: newSelection };
        });
    }, []);

    return (
        <div className="p-6">
            {/* Header Actions */}
            <div className="flex flex-row items-center justify-between mb-3 mt-2 gap-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="group flex items-center gap-2 px-3 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
                    title="Back To Dashboard"
                >
                    <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                    <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back To Dashboard</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-48 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 h-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ lineHeight: '2rem' }}
                        />
                    </div>
                    <button
                        onClick={handleAddUser}
                        className="flex items-center gap-1 px-4 py-2 h-8 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-lg hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-6 mb-4 sm:mb-6">
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-400 shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{users.length}</div>
                    <div className="text-xs sm:text-sm text-gray-500">Total Users</div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-400 shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {users.filter(u => u.is_active).length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">Active Users</div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-400 shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {users.filter(u => !u.is_active).length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">Inactive Users</div>
                </div>
            </div>

            {/* Users Table */}
            {
                loading ? (
                    <div className="bg-white rounded-lg border p-8 text-center">
                        <div className="text-gray-500">Loading users...</div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Businesses
                                        </th>
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        {/* <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Login
                                        </th> */}
                                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.businessNames && user.businessNames.length > 0 ? (
                                                        user.businessNames.map((businessName, index) => (
                                                            <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                {businessName}
                                                            </span>
                                                        ))
                                                    ) : user.businessIds && user.businessIds.length > 0 ? (
                                                        user.businessIds.map((businessId, index) => {
                                                            const business = businesses.find(b => (b.id || b._id) === businessId);
                                                            const businessName = business ? (business.business_name || business.businessName || business.name) : 'Unknown';
                                                            return (
                                                                <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                    {businessName}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            No Businesses
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {/* <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                                            </td> */}
                                            <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <ActionButtons
                                                        onEdit={() => handleEditUser(user)}
                                                        onDelete={() => handleDeleteUser(user.id)}
                                                        onToggle={() => handleToggleStatus(user.id)}
                                                        actions={['edit', 'delete', 'toggle']}
                                                        isActive={user.is_active}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredUsers.length === 0 && !loading && (
                            <div className="text-center py-8 text-gray-500">
                                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                            </div>
                        )}
                    </div>
                )
            }



            {
                showAddModal && (
                    <UserModal
                        selectedUser={selectedUser}
                        formData={formData}
                        setFormData={setFormData}
                        handleFormSubmit={handleFormSubmit}
                        setShowAddModal={setShowAddModal}
                        businessOptions={businessOptions}
                        handleBusinessSelect={handleBusinessSelect}
                        formErrors={formErrors}
                        activeTaxType={(() => {
                            const activeBusinessId = localStorage.getItem('selectedBusinessId');
                            const activeBusiness = businesses.find(b => (b.id || b._id)?.toString() === activeBusinessId?.toString());
                            const rawType = activeBusiness ? (activeBusiness.vat_number ? 'VAT' : (activeBusiness.gstin ? 'GST' : 'No')) : (localStorage.getItem('currentTaxType') || 'No');
                            return (rawType || 'No').toUpperCase().trim();
                        })()}
                    />
                )
            }

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeleteUser}
                itemName={userToDelete?.name || ""}
                itemType="user"
            />
        </div >
    );
};

// Wrap ManageUser component with role-based access control
const ProtectedManageUser = withRoleBasedAccess(ManageUser, 'manageUsers');

export default ProtectedManageUser;
