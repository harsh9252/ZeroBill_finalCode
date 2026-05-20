import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  User, 
  ChevronDown, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2,
  Check,
  Loader2,
  Users
} from 'lucide-react';
import { documentAPI } from '../../../utils/api';
import { showSuccessToast, showErrorToast } from '../../../Components/ActionMessageModel.jsx';

const ShareModal = ({ isOpen, onClose, businessId, item, onUpdate }) => {
  const [users, setUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchData();
    }
  }, [isOpen, item]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, permsRes] = await Promise.all([
        documentAPI.getPermissibleUsers(businessId),
        documentAPI.getItemPermissions(businessId, item.parentId === 'root' ? '' : item.parentId, item.realName)
      ]);

      if (usersRes.success) setUsers(usersRes.data);
      if (permsRes.success) {
        setSharedUsers(permsRes.sharedWith || []);
        setOwner(permsRes.owner);
      }
    } catch (error) {
      console.error('Fetch share data error:', error);
      showErrorToast('Failed to load sharing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId, perms) => {
    try {
      setSavingId(userId);
      const res = await documentAPI.updatePermissions(
        businessId,
        item.parentId === 'root' ? '' : item.parentId,
        item.realName,
        userId,
        perms
      );

      if (res.success) {
        showSuccessToast('Permissions updated');
        fetchData();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Update permission error:', error);
      showErrorToast('Failed to update permissions');
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name.toLowerCase().includes(search.toLowerCase()) || 
     u.email.toLowerCase().includes(search.toLowerCase())) &&
    !sharedUsers.find(su => su.id === u.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] overflow-hidden scale-in-center border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#129046]/10 rounded-xl text-[#129046]">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Access "{item.name}"</h2>
              <p className="text-gray-500 text-sm">Manage who can access this {item.itemType}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Add People */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Add people</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#129046] transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#129046] focus:ring-4 focus:ring-[#129046]/5 transition-all"
              />
              
              {search && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        handleUpdatePermission(u.id, { can_view: 1, can_edit: 0, can_delete: 0 });
                        setSearch('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#129046]/5 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#129046] to-[#9ccc53] flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* People with access */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">People with access</label>
            
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-[#129046] animate-spin" size={24} />
                </div>
              ) : (
                <>
                  {/* Owner */}
                  {owner && (
                    <div className="flex items-center justify-between group px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shadow-sm">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{owner.name} (You)</div>
                          <div className="text-xs text-gray-500">{owner.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5 py-1 bg-gray-100 rounded-full border border-gray-200">Owner</span>
                    </div>
                  )}

                  {/* Shared Users */}
                  {sharedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between group px-1">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#129046]/10 to-[#9ccc53]/10 flex items-center justify-center text-[#129046] border border-[#129046]/20 uppercase font-bold text-sm shadow-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {savingId === u.id ? (
                          <Loader2 size={16} className="text-[#129046] animate-spin" />
                        ) : (
                          <div className="flex bg-gray-50 rounded-lg border border-gray-200 p-1">
                            <button
                              onClick={() => handleUpdatePermission(u.id, { can_view: 1, can_edit: 0, can_delete: 0 })}
                              className={`p-1.5 rounded-md transition-all ${u.can_view && !u.can_edit && !u.can_delete ? 'bg-[#129046] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                              title="Viewer"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdatePermission(u.id, { can_view: 1, can_edit: 1, can_delete: 0 })}
                              className={`p-1.5 rounded-md transition-all ${u.can_view && u.can_edit && !u.can_delete ? 'bg-[#129046] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                              title="Editor"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdatePermission(u.id, { can_view: 1, can_edit: 0, can_delete: 1 })}
                              className={`p-1.5 rounded-md transition-all ${u.can_view && !u.can_edit && u.can_delete ? 'bg-[#129046] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                              title="Delete Only"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdatePermission(u.id, { can_view: 1, can_edit: 1, can_delete: 1 })}
                              className={`p-1.5 rounded-md transition-all ${u.can_view && u.can_edit && u.can_delete ? 'bg-[#129046] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                              title="Moderator"
                            >
                              <Shield size={16} />
                            </button>
                            <div className="w-[1px] h-4 bg-gray-200 mx-1 self-center" />
                            <button
                              onClick={() => handleUpdatePermission(u.id, null)}
                              className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Remove access"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {sharedUsers.length === 0 && !loading && (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4 text-gray-200 shadow-sm border border-gray-50">
                        <Users size={28} />
                      </div>
                      <h3 className="text-gray-800 font-semibold mb-1">Not shared yet</h3>
                      <p className="text-gray-400 text-sm">Add people to give access to this document</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:shadow-lg hover:shadow-[#129046]/20 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md uppercase tracking-wider text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
