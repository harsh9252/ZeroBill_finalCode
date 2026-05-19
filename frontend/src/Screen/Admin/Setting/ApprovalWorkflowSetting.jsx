import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Mail, 
  ArrowLeft,
  Info,
  Lock,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { approvalWorkflowAPI } from '../../../utils/api';
import { subUserService } from '../../../services/subUserService';

const ApprovalWorkflowSetting = () => {
  const [poLevels, setPoLevels] = useState([{ level_number: 1, approver_email: '' }]);
  const [prLevels, setPrLevels] = useState([{ level_number: 1, approver_email: '' }]);
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncWithPO, setSyncWithPO] = useState(false);
  
  const navigate = useNavigate();
  const businessId = localStorage.getItem('selectedBusinessId');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Helper to validate email format in real-time
  const isEmailFormatInvalid = (email) => {
    const trimmed = email.trim();
    return trimmed !== '' && !emailRegex.test(trimmed);
  };

  // Fetch configured levels and sub-users
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch subusers
      const usersRes = await subUserService.getSubUsers();
      if (usersRes.success) {
        setSubUsers(usersRes.data || []);
      }

      // Fetch workflow settings for PO and PR
      const [poRes, prRes] = await Promise.all([
        approvalWorkflowAPI.getWorkflow('purchase_order', businessId),
        approvalWorkflowAPI.getWorkflow('purchase_requisition', businessId)
      ]);

      let fetchedPo = poRes.success ? (poRes.data || []) : [];
      let fetchedPr = prRes.success ? (prRes.data || []) : [];

      // Default to 1 empty row if no levels exist
      if (fetchedPo.length === 0) {
        fetchedPo = [{ level_number: 1, approver_email: '' }];
      }
      if (fetchedPr.length === 0) {
        fetchedPr = [{ level_number: 1, approver_email: '' }];
      }

      setPoLevels(fetchedPo);
      setPrLevels(fetchedPr);

      // Check if both levels are identical to set initial sync state
      if (fetchedPo.length > 0 && fetchedPo.length === fetchedPr.length) {
        const isIdentical = fetchedPo.every((level, idx) => 
          level.approver_email === fetchedPr[idx].approver_email
        );
        if (isIdentical) {
          setSyncWithPO(true);
        }
      }
    } catch (error) {
      console.error('Error fetching workflow settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load workflow settings'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  // Sync PR levels with PO levels when sync is enabled or PO levels change
  useEffect(() => {
    if (syncWithPO) {
      const copied = poLevels.map(level => ({ ...level }));
      setPrLevels(copied);
    }
  }, [syncWithPO, poLevels]);

  // Add new level for PO
  const addPoLevel = () => {
    const nextLevelNum = poLevels.length + 1;
    setPoLevels([
      ...poLevels,
      { level_number: nextLevelNum, approver_email: '' }
    ]);
  };

  // Add new level for PR
  const addPrLevel = () => {
    setSyncWithPO(false); // Uncheck sync since user is customizing PR
    const nextLevelNum = prLevels.length + 1;
    setPrLevels([
      ...prLevels,
      { level_number: nextLevelNum, approver_email: '' }
    ]);
  };

  // Remove level for PO (if length > 1, else reset email)
  const removePoLevel = (index) => {
    if (poLevels.length === 1) {
      setPoLevels([{ level_number: 1, approver_email: '' }]);
      return;
    }
    const filtered = poLevels.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      level_number: idx + 1
    }));
    setPoLevels(reindexed);
  };

  // Remove level for PR (if length > 1, else reset email)
  const removePrLevel = (index) => {
    setSyncWithPO(false); // Uncheck sync since user is customizing PR
    if (prLevels.length === 1) {
      setPrLevels([{ level_number: 1, approver_email: '' }]);
      return;
    }
    const filtered = prLevels.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((item, idx) => ({
      ...item,
      level_number: idx + 1
    }));
    setPrLevels(reindexed);
  };

  // Move PO level up
  const movePoUp = (index) => {
    if (index === 0) return;
    const newLevels = [...poLevels];
    const temp = newLevels[index];
    newLevels[index] = newLevels[index - 1];
    newLevels[index - 1] = temp;
    setPoLevels(newLevels.map((item, idx) => ({ ...item, level_number: idx + 1 })));
  };

  // Move PR level up
  const movePrUp = (index) => {
    if (index === 0) return;
    setSyncWithPO(false); // Uncheck sync since user is customizing PR
    const newLevels = [...prLevels];
    const temp = newLevels[index];
    newLevels[index] = newLevels[index - 1];
    newLevels[index - 1] = temp;
    setPrLevels(newLevels.map((item, idx) => ({ ...item, level_number: idx + 1 })));
  };

  // Move PO level down
  const movePoDown = (index) => {
    if (index === poLevels.length - 1) return;
    const newLevels = [...poLevels];
    const temp = newLevels[index];
    newLevels[index] = newLevels[index + 1];
    newLevels[index + 1] = temp;
    setPoLevels(newLevels.map((item, idx) => ({ ...item, level_number: idx + 1 })));
  };

  // Move PR level down
  const movePrDown = (index) => {
    if (index === prLevels.length - 1) return;
    setSyncWithPO(false); // Uncheck sync since user is customizing PR
    const newLevels = [...prLevels];
    const temp = newLevels[index];
    newLevels[index] = newLevels[index + 1];
    newLevels[index + 1] = temp;
    setPrLevels(newLevels.map((item, idx) => ({ ...item, level_number: idx + 1 })));
  };

  // Handle PO email input change
  const handlePoEmailChange = (index, value) => {
    const updated = [...poLevels];
    updated[index].approver_email = value;
    setPoLevels(updated);
  };

  // Handle PR email input change
  const handlePrEmailChange = (index, value) => {
    setSyncWithPO(false); // Uncheck sync since user is customizing PR
    const updated = [...prLevels];
    updated[index].approver_email = value;
    setPrLevels(updated);
  };

  // Save configurations in bulk (ignores empty levels)
  const saveWorkflow = async () => {
    // Filter out rows that have empty emails
    const activePo = poLevels.filter(l => l.approver_email.trim() !== '');
    const activePr = prLevels.filter(l => l.approver_email.trim() !== '');

    // Re-index before validating
    const poPayloadLevels = activePo.map((l, idx) => ({
      level_number: idx + 1,
      approver_email: l.approver_email.trim()
    }));

    const prPayloadLevels = activePr.map((l, idx) => ({
      level_number: idx + 1,
      approver_email: l.approver_email.trim()
    }));

    // Validate email format for PO active levels
    for (let i = 0; i < poPayloadLevels.length; i++) {
      if (!emailRegex.test(poPayloadLevels[i].approver_email)) {
        Swal.fire({
          icon: 'warning',
          title: 'PO Invalid Email',
          text: `Please enter a valid email for PO Level ${poPayloadLevels[i].level_number}`
        });
        return;
      }
    }

    // Validate email format for PR active levels
    for (let i = 0; i < prPayloadLevels.length; i++) {
      if (!emailRegex.test(prPayloadLevels[i].approver_email)) {
        Swal.fire({
          icon: 'warning',
          title: 'PR Invalid Email',
          text: `Please enter a valid email for PR Level ${prPayloadLevels[i].level_number}`
        });
        return;
      }
    }

    try {
      setSaving(true);
      
      const poPayload = {
        business_id: businessId,
        document_type: 'purchase_order',
        levels: poPayloadLevels
      };

      const prPayload = {
        business_id: businessId,
        document_type: 'purchase_requisition',
        levels: prPayloadLevels
      };

      const poResponse = await approvalWorkflowAPI.saveWorkflow(poPayload);
      const prResponse = await approvalWorkflowAPI.saveWorkflow(prPayload);

      if (poResponse.success && prResponse.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Approval workflows updated successfully',
          timer: 2000,
          showConfirmButton: false
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error saving workflows:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save workflow settings'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!businessId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Please select a business first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-transparent min-h-screen">
      
      {/* Top Header Bar matching VoucherSettings */}
      <div className="flex flex-row items-center justify-between mb-6 mt-2 gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 px-3 py-1.5 border-[1px] border-yellow-900 rounded hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
          title="Back To Dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
          <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back To Dashboard</span>
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={saveWorkflow}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white text-sm font-semibold rounded shadow hover:shadow-md transition-all"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Card Panel Container */}
      <div className="bg-white rounded shadow-sm border-[1px] border-yellow-200 overflow-hidden mb-6">

        {/* Dynamic Side-by-Side Builder Content Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* -------------------- PURCHASE ORDER (PO) CARD -------------------- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-[1px] border-gray-150">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-yellow-600 animate-pulse" />
                  Purchase Order (PO) Workflow
                </h3>
                
                {/* Compact Sync Checkbox with Hover Tooltip */}
                <div className="flex items-center">
                  <label 
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-yellow-700 cursor-pointer select-none"
                    title="Keep Purchase Requisition (PR) levels exactly synced with PO levels."
                  >
                    <input 
                      type="checkbox"
                      checked={syncWithPO}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSyncWithPO(checked);
                        if (checked) {
                          setPrLevels(poLevels.map(level => ({ ...level })));
                        }
                      }}
                      className="w-3.5 h-3.5 border-gray-300 rounded text-yellow-600 focus:ring-yellow-400"
                    />
                    <span>Copy in PR</span>
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <div className="w-8 h-8 border-2 border-yellow-250 border-t-yellow-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-[11px] animate-pulse">Fetching PO Workflow...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {poLevels.map((level, index) => {
                      const isInvalid = isEmailFormatInvalid(level.approver_email);
                      return (
                        <motion.div
                          key={`po-level-${level.level_number}-${index}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.1 }}
                          className={`flex items-center gap-2 p-1.5 bg-white border-[1px] rounded shadow-xs hover:bg-yellow-50/5 transition-all ${
                            isInvalid ? 'border-red-300 bg-red-50/5' : 'border-gray-200 hover:border-yellow-300'
                          }`}
                        >
                          {/* Level badge with proper label */}
                          <div className={`px-2.5 py-1 rounded border-[1px] text-xs font-bold shrink-0 min-w-[65px] text-center ${
                            isInvalid ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-800'
                          }`}>
                            Level {level.level_number}
                          </div>

                          <div className="flex-1 relative">
                            {isInvalid ? (
                              <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500 animate-bounce" />
                            ) : (
                              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            )}
                            <input
                              type="email"
                              list="approver-subusers-list"
                              value={level.approver_email}
                              onChange={(e) => handlePoEmailChange(index, e.target.value)}
                              placeholder={`Enter Approver email`}
                              className={`w-full pl-8 pr-2 py-1 bg-white border-[1px] rounded focus:outline-none focus:ring-1 text-xs font-semibold ${
                                isInvalid 
                                  ? 'border-red-300 focus:ring-red-400 focus:border-red-400 text-red-700' 
                                  : 'border-gray-200 focus:ring-yellow-450 focus:border-yellow-400 text-gray-700'
                              }`}
                            />
                          </div>

                          <div className="flex items-center border-[1px] border-gray-200 rounded bg-gray-50/50 p-0.5">
                            <button
                              type="button"
                              onClick={() => movePoUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-white hover:text-yellow-600'}`}
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePoDown(index)}
                              disabled={index === poLevels.length - 1}
                              className={`p-1 rounded ${index === poLevels.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-white hover:text-yellow-600'}`}
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>

                          {poLevels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePoLevel(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* In-row Plus (+) Button on the last row */}
                          {index === poLevels.length - 1 && (
                            <button
                              type="button"
                              onClick={addPoLevel}
                              className="p-1 text-green-600 hover:bg-green-50 rounded flex items-center justify-center border-[1px] border-green-200 bg-green-50/20"
                              title="Add Next Level"
                            >
                              <Plus size={13} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* -------------------- PURCHASE REQUISITION (PR) CARD -------------------- */}
            <div className="space-y-4 border-t lg:border-t-0 lg:border-l-[1px] border-gray-150 pt-6 lg:pt-0 lg:pl-8">
              <div className="flex items-center justify-between pb-3 border-b-[1px] border-gray-150">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-yellow-600" />
                  Purchase Requisition (PR) Workflow
                  {syncWithPO && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-600 bg-yellow-50 border-[1px] border-yellow-250 px-1.5 py-0.5 rounded-full">
                      <Lock size={9} /> Copy Mode Active
                    </span>
                  )}
                </h3>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <div className="w-8 h-8 border-2 border-yellow-250 border-t-yellow-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-[11px] animate-pulse">Fetching PR Workflow...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {prLevels.map((level, index) => {
                      const isInvalid = isEmailFormatInvalid(level.approver_email);
                      return (
                        <motion.div
                          key={`pr-level-${level.level_number}-${index}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.1 }}
                          className={`flex items-center gap-2 p-1.5 border rounded shadow-xs transition-all ${
                            isInvalid ? 'border-red-300 bg-red-50/5 bg-white' : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/5 bg-white'
                          }`}
                        >
                          {/* Level badge with proper label */}
                          <div className={`px-2.5 py-1 rounded border-[1px] text-xs font-bold shrink-0 min-w-[65px] text-center ${
                            isInvalid ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-800'
                          }`}>
                            Level {level.level_number}
                          </div>

                          <div className="flex-1 relative">
                            {isInvalid ? (
                              <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500 animate-bounce" />
                            ) : (
                              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            )}
                            <input
                              type="email"
                              list="approver-subusers-list"
                              value={level.approver_email}
                              onChange={(e) => handlePrEmailChange(index, e.target.value)}
                              placeholder={`Enter Approver email`}
                              className={`w-full pl-8 pr-2 py-1 border rounded focus:outline-none focus:ring-1 text-xs font-semibold bg-white ${
                                isInvalid 
                                  ? 'border-red-300 focus:ring-red-400 focus:border-red-400 text-red-700' 
                                  : 'border-gray-200 focus:ring-yellow-450 focus:border-yellow-400 text-gray-700'
                              }`}
                            />
                          </div>

                          <div className="flex items-center border-[1px] border-gray-200 rounded bg-gray-50/50 p-0.5">
                            <button
                              type="button"
                              onClick={() => movePrUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-white hover:text-yellow-600'}`}
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePrDown(index)}
                              disabled={index === prLevels.length - 1}
                              className={`p-1 rounded ${index === prLevels.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-white hover:text-yellow-600'}`}
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>

                          {prLevels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePrLevel(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* In-row Plus (+) Button on the last row */}
                          {index === prLevels.length - 1 && (
                            <button
                              type="button"
                              onClick={addPrLevel}
                              className="p-1 text-green-600 hover:bg-green-50 rounded flex items-center justify-center border-[1px] border-green-200 bg-green-50/20"
                              title="Add Next Level"
                            >
                              <Plus size={13} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Datalist for Subusers recommendations */}
        <datalist id="approver-subusers-list">
          {subUsers.map(u => (
            <option key={u.id} value={u.email}>{u.name}</option>
          ))}
        </datalist>

        {/* Guidelines matching Z-Bills style */}
        <div className="p-6 border-t-[1px] border-gray-150 bg-gray-50/30">
          <div className="bg-yellow-50/50 border-[1px] border-yellow-100 rounded p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-800">Guidelines & Rules of Workflow</p>
                <ul className="text-[11px] text-gray-500 font-medium space-y-1 list-disc pl-4 mt-1 leading-relaxed">
                  <li>Approvals execute in strict **sequential order** (Level 1 must approve before Level 2 is notified).</li>
                  <li>Approvers receive automated emails with direct, secure links to approve or reject immediately.</li>
                  <li>Rejection at any level immediately transitions the document to the **'rejected'** status.</li>
                  <li>Once fully approved, the document updates to **'open'** (PO) or **'completed'** (PR) status.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApprovalWorkflowSetting;
