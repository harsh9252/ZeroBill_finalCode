import { useState, useEffect } from 'react';
import { Plus, Loader, GripVertical, AlertCircle } from 'lucide-react';
import ActionButtons from '../../../Components/ActionButtons';
import ToggleSwitch from '../../../Components/ToggleSwitch';
import CustomBillingPeriodDropdown from '../../../Components/CustomBillingPeriodDropdown';
import { useActionMessage } from '../../../contexts/ActionMessageContext';
import { backendUrl } from '../../../config/appConfig';
import '../../../assets/css/PricingForm.css';

export default function PricingManagement() {
  const { showSuccess, showError, showDelete } = useActionMessage();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draggedPlan, setDraggedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });

  const [formData, setFormData] = useState({
    name: '',
    original_price: '',
    offer_price: '',
    period: 'month',
    description: '',
    features: [],
    display_order: 0,
    max_subusers: 0,
    max_businesses: 1
  });

  const [newFeature, setNewFeature] = useState('');

  // Fetch pricing plans
  const fetchPlans = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${backendUrl}/api/pricing/admin/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPlans(data.data || []);
      } else {
        showError(data.message || 'Failed to fetch pricing plans');
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      showError('Failed to fetch pricing plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingId(plan.id);
      setFormData({
        name: plan.name,
        original_price: plan.original_price || plan.price || '',
        offer_price: plan.offer_price || plan.price || '',
        period: plan.period,
        description: plan.description,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
        display_order: plan.display_order,
        max_subusers: plan.max_subusers || 0,
        max_businesses: plan.max_businesses || 1
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        original_price: '',
        offer_price: '',
        period: 'month',
        description: '',
        features: [],
        display_order: 0,
        max_subusers: 0,
        max_businesses: 1
      });
    }
    setShowModal(true);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const handleSavePlan = async () => {
    try {
      if (!formData.name || formData.offer_price === '') {
        showError('Name and offer price are required');
        return;
      }

      setSaving(true);
      const token = localStorage.getItem('superAdminToken');
      const url = editingId
        ? `${backendUrl}/api/pricing/admin/${editingId}`
        : `${backendUrl}/api/pricing/admin`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        showSuccess(editingId ? 'Plan updated successfully' : 'Plan created successfully');
        fetchPlans();
      } else {
        showError(data.message || 'Failed to save plan');
      }
    } catch (err) {
      console.error('Error saving plan:', err);
      showError('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id) => {
    try {
      setActionLoading({ id, type: 'delete' });
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(`${backendUrl}/api/pricing/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Plan deleted successfully');
        fetchPlans();
      } else {
        showError(data.message || 'Failed to delete plan');
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
      showError('Failed to delete plan');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setActionLoading({ id, type: 'status' });
      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(`${backendUrl}/api/pricing/admin/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(data.message);
        fetchPlans();
      } else {
        showError(data.message || 'Failed to toggle status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showError('Failed to toggle status');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleUpdateFeaturedLabel = async (id, featured_label, show_featured_label) => {
    try {
      // Update local state immediately for instant UI feedback
      const updatedPlans = plans.map(p => 
        p.id === id ? { ...p, featured_label, show_featured_label } : p
      );
      setPlans(updatedPlans);

      const token = localStorage.getItem('superAdminToken');

      const response = await fetch(`${backendUrl}/api/pricing/admin/${id}/featured`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          featured_label,
          show_featured_label
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Featured label updated successfully');
      } else {
        showError(data.message || 'Failed to update featured label');
        // Revert on error
        fetchPlans();
      }
    } catch (err) {
      console.error('Error updating featured label:', err);
      showError('Failed to update featured label');
      // Revert on error
      fetchPlans();
    }
  };

  const handleReorderPlans = async (fromIndex, toIndex) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      
      // Create new array with reordered items
      const newPlans = [...plans];
      const [movedPlan] = newPlans.splice(fromIndex, 1);
      newPlans.splice(toIndex, 0, movedPlan);

      // Update display_order for all plans
      const updatedPlans = newPlans.map((plan, index) => ({
        ...plan,
        display_order: index
      }));

      // Prepare request body
      const requestBody = {
        plans: updatedPlans.map(p => ({ id: p.id, display_order: p.display_order }))
      };

      // Send update to backend
      const response = await fetch(`${backendUrl}/api/pricing/admin/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setPlans(updatedPlans);
        showSuccess('Plans reordered successfully');
      } else {
        showError(data.message || 'Failed to reorder plans');
        fetchPlans();
      }
    } catch (err) {
      console.error('Error reordering plans:', err);
      showError('Failed to reorder plans');
      fetchPlans();
    } finally {
      setDraggedPlan(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Plan
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-yellow-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading plans...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">No pricing plans found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 w-8"></th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Original Price</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Offer Price</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Period</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Max Subusers</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Max Businesses</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Features</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-2 text-left text-sm font-semibold text-gray-700">Featured Label</th>
                  <th className="px-6 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, index) => (
                  <tr 
                    key={plan.id} 
                    draggable
                    onDragStart={() => setDraggedPlan(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedPlan !== null && draggedPlan !== index) {
                        handleReorderPlans(draggedPlan, index);
                      }
                    }}
                    className={`border-b border-gray-200 transition-colors ${
                      draggedPlan === index 
                        ? 'bg-yellow-50 opacity-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2 text-center cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-400 inline" />
                    </td>
                    <td className="px-6 py-2 text-sm font-medium text-gray-800">{plan.name}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {plan.original_price ? (
                        <span className="line-through text-gray-400">₹{plan.original_price}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-2 text-sm font-semibold text-green-600">₹{plan.offer_price || plan.price}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">{plan.period}</td>
                    <td className="px-6 py-2 text-sm text-gray-600 font-bold">{plan.max_subusers}</td>
                    <td className="px-6 py-2 text-sm text-gray-600 font-bold">{plan.max_businesses}</td>
                    <td className="px-6 py-2 text-sm text-gray-600">
                      {typeof plan.features === 'string' ? JSON.parse(plan.features).length : plan.features?.length || 0} features
                    </td>
                    <td className="px-6 py-2 text-sm">
                      <button
                        onClick={() => handleToggleStatus(plan.id, plan.is_active)}
                        disabled={actionLoading.id === plan.id && actionLoading.type === 'status'}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          plan.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {actionLoading.id === plan.id && actionLoading.type === 'status' ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : null}
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-2 text-sm">
                      <div className="flex items-center gap-2 h-10">
                        <input
                          type="text"
                          value={plan.featured_label || ''}
                          onChange={(e) => {
                            const updatedPlans = plans.map(p => 
                              p.id === plan.id ? { ...p, featured_label: e.target.value } : p
                            );
                            setPlans(updatedPlans);
                          }}
                          onBlur={() => {
                            if (plan.featured_label) {
                              handleUpdateFeaturedLabel(plan.id, plan.featured_label, plan.show_featured_label);
                            }
                          }}
                          placeholder="e.g., Most Popular"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        />
                        <ToggleSwitch
                          isOn={plan.show_featured_label}
                          onChange={(value) => handleUpdateFeaturedLabel(plan.id, plan.featured_label, value)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-2 text-sm text-center">
                      <ActionButtons
                        actions={['edit', 'delete']}
                        size="md"
                        onEdit={() => handleOpenModal(plan)}
                        onDelete={() => showDelete({
                          itemName: plan.name,
                          itemType: 'plan',
                          onConfirm: () => handleDeletePlan(plan.id)
                        })}
                        loadingAction={actionLoading.id === plan.id ? actionLoading.type : null}
                        currentId={plan.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0', padding: '0' }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" style={{ margin: '0 auto' }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Row 1: Name, Original Price, Offer Price, Period, Max Subusers */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="e.g., Professional"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Original Price (₹)</label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="1299"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Offer Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Offer Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.offer_price}
                    onChange={(e) => setFormData({ ...formData, offer_price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="999"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Period</label>
                  <CustomBillingPeriodDropdown
                    value={formData.period}
                    onChange={(value) => setFormData({ ...formData, period: value })}
                  />
                </div>

                {/* Max Subusers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Sub-users</label>
                  <input
                    type="number"
                    value={formData.max_subusers}
                    onChange={(e) => setFormData({ ...formData, max_subusers: e.target.value === '' ? '' : parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="e.g., 5"
                    min="0"
                  />
                </div>

                {/* Max Businesses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Businesses</label>
                  <input
                    type="number"
                    value={formData.max_businesses}
                    onChange={(e) => setFormData({ ...formData, max_businesses: e.target.value === '' ? '' : parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="e.g., 5"
                    min="1"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800 resize-none"
                  placeholder="Enter plan description..."
                  rows="2"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Features</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
                    placeholder="Add feature..."
                  />
                  <button
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
                  >
                    Add
                  </button>
                </div>

                {formData.features.length > 0 && (
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFeature(index)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.features.length === 0 && (
                  <div className="text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No features added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Plan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
