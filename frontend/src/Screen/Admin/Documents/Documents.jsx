import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import Swal from 'sweetalert2';
import {
    CloudUpload,
    File,
    FileText,
    Image as ImageIcon,
    MoreVertical,
    Search,
    Folder,
    Plus,
    Cloud,
    ChevronDown,
    LayoutGrid,
    List,
    Settings,
    HelpCircle,
    SlidersHorizontal,
    MoreHorizontal,
    Download,
    Pencil,
    Trash2,
    Eye,
    ChevronRight,
    ArrowLeft,
    FileSpreadsheet,
    Monitor,
    Users,
    Trash
} from 'lucide-react';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import { documentAPI, getApiConfig } from '../../../utils/api';
import { 
    showSuccessToast, 
    showErrorToast, 
    showConfirmationDialog, 
    showLoadingModal, 
    closeModal,
    showInputDialog,
    showPremiumInputDialog
} from '../../../Components/ActionMessageModel.jsx';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import ShareModal from './ShareModal.jsx';

export default function Documents({ language = 'en-IN' }) {
    const navigate = useNavigate();
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [query, setQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isViewMore, setIsViewMore] = useState(false);
    const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
    const [isFilesCollapsed, setIsFilesCollapsed] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [itemToShare, setItemToShare] = useState(null);
    const [folderPermissions, setFolderPermissions] = useState({ canEdit: true, canDelete: true, canShare: true });

    // ── Auth context: detect if current user is a sub-user ──────────────
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('subUser') || '{}'); }
        catch { return {}; }
    })();
    const isSubUser = !!(currentUser?.isSubUser || localStorage.getItem('isSubUser') === 'true');

    // Sub-user permission check based on backend flags
    const canDo = (item, action) => {
        if (!isSubUser) return true; // Admin can do everything
        if (!item || !item.permissions) return true;
        
        if (action === 'edit' || action === 'rename') return !!item.permissions.canEdit;
        if (action === 'delete') return !!item.permissions.canDelete;
        if (action === 'share') return !!item.permissions.canShare;
        return true;
    };

    const businessId = localStorage.getItem('selectedBusinessId');
    const fileInputRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (businessId) {
            fetchDocuments();
        }
    }, [businessId, currentPath]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsNewMenuOpen(false);
            }
            if (activeMenuId && !event.target.closest('.action-menu-container')) {
                setActiveMenuId(null);
            }
            if (selectedItemId && !event.target.closest('.grid') && !event.target.closest('header')) {
                setSelectedItemId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId, selectedItemId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2' && selectedItemId) {
                const item = [...folders, ...files].find(i => i.id === selectedItemId);
                if (item) {
                    handleAction('rename', item);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItemId, folders, files]);

    const getImageURL = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const { backendURL } = getApiConfig();
        // Backend now sends relative path email/business/file.ext
        // Prepend uploads/ and ensure forward slashes
        const cleanPath = path.replace(/\\/g, '/');
        const formattedPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
        return `${backendURL}/${formattedPath}`;
    };

    const fetchDocuments = async () => {
        if (!businessId) return;
        setLoading(true);
        try {
            const response = await documentAPI.getDocuments(businessId, currentPath);
            if (response.success) {
                const allItems = response.data;
                const folderList = allItems.filter(item => item.itemType === 'folder');
                const fileList = allItems.filter(item => item.itemType === 'file');

                setFolders(folderList);
                setFiles(fileList);
                if (response.folderPermissions) {
                    setFolderPermissions(response.folderPermissions);
                }
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            showErrorToast('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split('/').filter(Boolean);
        const pathArr = [{ name: 'My Drive', path: '' }];
        let current = '';
        parts.forEach(part => {
            current += (current ? '/' : '') + part;
            pathArr.push({ name: part, path: current });
        });
        return pathArr;
    }, [currentPath]);

    const filteredFolders = useMemo(() => {
        let result = folders;
        if (query) {
            result = result.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
        }
        return result;
    }, [folders, query]);

    const filteredFiles = useMemo(() => {
        let result = files;
        if (query) {
            result = result.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
        }
        return result;
    }, [files, query]);

    const totalSizeUsedMB = useMemo(() => {
        return files.reduce((acc, file) => {
            if (!file.size) return acc;
            const sizeStr = file.size.split(' ')[0];
            const size = parseFloat(sizeStr);
            if (file.size.toLowerCase().includes('kb')) return acc + (size / 1024);
            if (file.size.toLowerCase().includes('gb')) return acc + (size * 1024);
            return acc + size;
        }, 0).toFixed(2);
    }, [files]);

    const getFileIcon = (type, size = "w-4 h-4", isLarge = false) => {
        if (type === 'folder') return <Folder className={`${size} text-[#f4b400]`} fill="currentColor" strokeWidth={1} />;
        const extension = type?.toLowerCase() || '';
        
        // High-Fidelity "Real" Graphic System
        const Graphic = ({ color, text, symbol: Symbol }) => (
            <div className={`relative ${size} flex items-center justify-center rounded-[3px] overflow-hidden shadow-sm group-hover:shadow-md transition-all`}>
                {/* Background Plate */}
                <div className={`absolute inset-0 ${color}`}></div>
                
                {/* Folded Corner Effect */}
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-black/10 rounded-bl-[1px]"></div>
                
                {/* Branding Label */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-0.5">
                    {isLarge ? (
                        <div className="flex flex-col items-center gap-1 w-full h-full">
                            <div className="flex-1 flex items-center justify-center w-full">
                                {Symbol && <Symbol className="w-[60%] h-[60%] text-white/40" strokeWidth={1.5} />}
                            </div>
                            <div className="bg-white/95 w-[90%] py-0.5 rounded-[2px] shadow-sm mb-1">
                                <div className="text-[10px] text-center font-black leading-none uppercase tracking-tight" style={{ color: color.replace('bg-[', '').replace(']', '') }}>
                                    {text}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[6px] text-white font-black leading-none uppercase tracking-tighter">{text}</div>
                    )}
                </div>
            </div>
        );

        if (['pdf'].includes(extension)) return <Graphic color="bg-[#ea4335]" text="PDF" symbol={FileText} />;
        if (['xlsx', 'xls', 'csv', 'excel'].includes(extension)) return <Graphic color="bg-[#0f9d58]" text="XLS" symbol={FileSpreadsheet} />;
        if (['docx', 'doc', 'word'].includes(extension)) return <Graphic color="bg-[#4285f4]" text="DOC" symbol={FileText} />;
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'image'].includes(extension)) {
            return (
                <div className={`${size} bg-blue-50 border border-blue-100 rounded-[3px] flex items-center justify-center shadow-inner`}>
                    <ImageIcon className={`${isLarge ? 'w-10 h-10' : 'w-2.5 h-2.5'} text-blue-500`} strokeWidth={1} />
                </div>
            );
        }
        
        return <File className={`${size} text-gray-400`} strokeWidth={1} />;
    };

    const handleFolderClick = (folder) => {
        setCurrentPath(currentPath ? `${currentPath}/${folder.id}` : folder.id);
    };

    const handleCreateFolder = async () => {
        setIsNewMenuOpen(false);
        const name = await showPremiumInputDialog({
            title: 'New folder',
            text: 'Enter a name for your new folder',
            inputPlaceholder: 'Untitled folder',
            confirmText: 'Create',
            cancelText: 'Cancel',
            variant: 'green',
            icon: `
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                </svg>
            `,
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
                if (value.includes('/') || value.includes('\\')) return 'Invalid characters in name';
            },
            preConfirm: async (name) => {
                try {
                    const response = await documentAPI.createFolder(businessId, name, currentPath);
                    if (response.success) {
                        return name;
                    } else {
                        Swal.showValidationMessage(response.message || 'Folder with this name already exists');
                        return false;
                    }
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || error.message || 'Failed to create folder');
                    return false;
                }
            }
        });
        
        if (name) {
            showSuccessToast('Folder created');
            fetchDocuments();
        }
    };

    const handleFileUpload = async (event) => {
        setIsNewMenuOpen(false);
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        
        // Better to pull from current business context - using correct key 'currentBusinessName'
        const businessName = localStorage.getItem('currentBusinessName') || 'default_business';
        
        // IMPORTANT: Append text fields BEFORE the file field so Multer can access them in the destination function
        formData.append('businessId', businessId);
        formData.append('businessName', businessName);
        formData.append('parentPath', currentPath);
        formData.append('file', file);

        showLoadingModal('Uploading file...');
        try {
            const response = await documentAPI.uploadFile(formData);
            closeModal();
            if (response.success) {
                showSuccessToast('File uploaded successfully');
                fetchDocuments();
            } else {
                showErrorToast(response.message || 'Upload failed');
            }
        } catch (error) {
            closeModal();
            console.error('Error uploading file:', error);
            const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
            showErrorToast(errorMessage);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAction = async (action, item) => {
        const itemPath = currentPath ? `${currentPath}/${item.id}` : item.id;

        switch (action) {
            case 'rename':
                const newName = await showPremiumInputDialog({
                    title: `Rename ${item.itemType === 'folder' ? 'folder' : 'file'}`,
                    text: 'Enter a new name for this item',
                    inputValue: item.name,
                    confirmText: 'Rename',
                    cancelText: 'Cancel',
                    variant: 'green',
                    inputValidator: (value) => {
                        if (!value) return 'Name cannot be empty';
                        if (value === item.name) return 'Please enter a different name';
                    },
                    preConfirm: async (newName) => {
                        try {
                            const res = await documentAPI.rename(businessId, itemPath, newName);
                            if (res.success) {
                                return newName;
                            } else {
                                Swal.showValidationMessage(res.message || 'An item with this name already exists');
                                return false;
                            }
                        } catch (e) {
                            Swal.showValidationMessage(e.response?.data?.message || e.message || 'Rename failed');
                            return false;
                        }
                    }
                });
                
                if (newName) {
                    showSuccessToast('Renamed successfully');
                    fetchDocuments();
                }
                break;
            case 'delete':
                setItemToDelete(item);
                setDeleteModalOpen(true);
                break;

                showLoadingModal('Deleting...');
                try {
                    const res = await documentAPI.delete(businessId, itemPath);
                    closeModal();
                    if (res.success) {
                        showSuccessToast('Deleted successfully');
                        fetchDocuments();
                    } else {
                        showErrorToast(res.message || 'Delete failed');
                    }
                } catch (e) { 
                    closeModal();
                    showErrorToast('An error occurred');
                }
                break;
            case 'download':
                handleDownload(item);
                break;
            case 'share':
                setItemToShare(item);
                setIsShareModalOpen(true);
                break;
            default:
                break;
        }
        setActiveMenuId(null);
    };

    const handleDownload = async (item) => {
        if (item.itemType === 'folder') {
            showInfoToast('Folder download not supported yet');
            return;
        }

        try {
            const { baseURL } = getApiConfig();
            const token = localStorage.getItem('token');
            const itemPath = currentPath ? `${currentPath}/${item.id}` : item.id;
            
            showLoadingModal('Preparing download...');
            
            const url = `${baseURL}/documents/download?businessId=${businessId}&path=${encodeURIComponent(itemPath)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            closeModal();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to download file');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', item.name); // Set the filename
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            
            showSuccessToast('Download complete');
        } catch (error) {
            closeModal();
            console.error('Download error:', error);
            showErrorToast(error.message || 'Download failed');
        }
        setActiveMenuId(null);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete || !businessId) return;

        const itemPath = currentPath ? `${currentPath}/${itemToDelete.id}` : itemToDelete.id;
        showLoadingModal('Deleting...');
        try {
            const res = await documentAPI.delete(businessId, itemPath);
            closeModal();
            if (res.success) {
                showSuccessToast('Deleted successfully');
                fetchDocuments();
                setDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                showErrorToast(res.message || 'Delete failed');
            }
        } catch (e) {
            closeModal();
            showErrorToast('An error occurred');
        }
    };


    return (
        <div className="custombackground min-h-screen font-sans text-[#202124]">
            <main className="w-full bg-white border-1 border-yellow-200 rounded-xl shadow-sm overflow-hidden h-[calc(100vh-2rem)] mt-4 flex flex-col">
                <header className="h-12 flex items-center justify-between px-4 sticky top-0 bg-white z-40 gap-2 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <DashboardBackButton />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search Bar matching Parties.jsx */}
                        <div className="w-80 relative">
                            <div className="flex items-center bg-white border-1 border-gray-200 rounded-lg px-3 h-8 transition-all group focus-within:border-[#129046] focus-within:ring-2 focus-within:ring-[#129046]/10">
                                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none w-full px-2 text-sm text-gray-700 placeholder-gray-400"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* New Button matching Parties.jsx */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => {
                                    if (!folderPermissions.canEdit && isSubUser) {
                                        showErrorToast("You don't have permission to add items here");
                                        return;
                                    }
                                    setIsNewMenuOpen(!isNewMenuOpen);
                                }}
                                className={`h-8 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all shadow-sm active:scale-95 group ${(!folderPermissions.canEdit && isSubUser) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Plus className="w-3.5 h-3.5 text-white transition-transform group-hover:rotate-90" strokeWidth={3} />
                                <span className="text-xs font-bold uppercase tracking-wider">New</span>
                            </button>

                            {isNewMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-[0_1px_2px_0_rgba(60,64,67,0.30),0_2px_6px_2px_rgba(60,64,67,0.15)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button 
                                        onClick={handleCreateFolder}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-3"
                                    >
                                        <Folder className="w-5 h-5 text-[#5f6368]" /> New folder
                                    </button>
                                    <div className="h-px bg-gray-200 my-1"></div>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-3"
                                    >
                                        <CloudUpload className="w-5 h-5 text-[#5f6368]" /> File upload
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 pt-4 pb-10">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-2">
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={idx}>
                                    <span
                                        onClick={() => setCurrentPath(crumb.path)}
                                        className={`text-2xl cursor-pointer hover:bg-[#f1f3f4] px-2 py-1 rounded-lg transition-colors ${idx === breadcrumbs.length - 1 ? 'text-[#1f1f1f]' : 'text-[#5f6368]'}`}
                                    >
                                        {crumb.name}
                                    </span>
                                    {idx < breadcrumbs.length - 1 && <ChevronRight className="w-5 h-5 text-[#5f6368]" />}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="flex flex-col items-end gap-1 min-w-[150px]">
                            <div className="flex items-center gap-2">
                                <div className="shrink-0">
                                    <CloudUpload className="w-8 h-8 text-[#129046] stroke-[1.2]" />
                                </div>
                                <span className="text-[15px] text-[#202124] font-medium tracking-tight">Storage</span>
                            </div>
                            <div className="w-full bg-[#f1f3f4] h-1 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#129046] transition-all duration-700 ease-out"
                                    style={{ width: `${Math.min((parseFloat(totalSizeUsedMB) / 1024) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[12px] text-[#129046] font-medium leading-none">
                                {totalSizeUsedMB} MB of 1 GB used
                            </p>
                        </div>
                    </div>

                    {filteredFolders.length > 0 && (
                        <div className="mt-4">
                            <div 
                                onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
                                className="flex items-center gap-2 text-[#5f6368] mb-4 cursor-pointer hover:bg-[#f1f3f4] w-fit px-2 py-1 rounded-md transition-colors group"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isFoldersCollapsed ? '-rotate-90' : ''} group-hover:text-[#202124]`} />
                                <span className="text-sm font-medium group-hover:text-[#202124]">Suggested folders</span>
                            </div>
                            
                            {!isFoldersCollapsed && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-in fade-in slide-in-from-top-1 duration-300">
                                    {(isViewMore ? filteredFolders : filteredFolders.slice(0, 6)).map(folder => (
                                            <div 
                                                key={folder.id} 
                                                onDoubleClick={() => handleFolderClick(folder)}
                                                onClick={() => setSelectedItemId(folder.id)}
                                                className={`bg-white border ${selectedItemId === folder.id ? 'border-[#129046] bg-[#e6f4ea] shadow-sm' : 'border-gray-200'} rounded-lg px-3 py-2.5 flex items-center justify-between transition-all hover:bg-gray-50 cursor-pointer group`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                    <Folder className={`w-5 h-5 ${selectedItemId === folder.id ? 'text-[#129046]' : 'text-[#5f6368]'}`} fill="currentColor" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[13px] font-medium text-gray-700 truncate">{folder.name}</span>
                                                        {/* Admin: show who created this folder */}
                                                        {!isSubUser && folder.createdBySubUserName && (
                                                            <span className="text-[10px] text-[#129046] font-medium truncate flex items-center gap-0.5">
                                                                <Users className="w-2.5 h-2.5" /> {folder.createdBySubUserName}
                                                            </span>
                                                        )}
                                                        {!isSubUser && !folder.createdBySubUserName && (
                                                            <span className="text-[10px] text-gray-400 truncate">Admin</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="relative action-menu-container">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === folder.id ? null : folder.id); }}
                                                        className="p-1 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                    {activeMenuId === folder.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[60]">
                                                            {canDo(folder, 'rename') && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleAction('rename', folder); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-2"><Pencil className="w-4 h-4 text-gray-400" /> Rename</button>
                                                            )}
                                                            {canDo(folder, 'share') && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleAction('share', folder); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-2">
                                                                    <Users className="w-4 h-4 text-gray-400" /> Access
                                                                </button>
                                                            )}
                                                            {(canDo(folder, 'rename') || canDo(folder, 'share')) && canDo(folder, 'delete') && <div className="h-px bg-gray-100 my-1"></div>}
                                                            {canDo(folder, 'delete') && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleAction('delete', folder); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] text-red-600 flex items-center gap-2"><Trash2 className="w-4 h-4 text-gray-400" /> Delete</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-10">
                        <div className="flex items-center justify-between mb-4">
                            <div 
                                onClick={() => setIsFilesCollapsed(!isFilesCollapsed)}
                                className="flex items-center gap-2 text-[#5f6368] cursor-pointer hover:bg-[#f1f3f4] w-fit px-2 py-1 rounded-md transition-colors group"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isFilesCollapsed ? '-rotate-90' : ''} group-hover:text-[#202124]`} />
                                <span className="text-sm font-medium group-hover:text-[#202124]">Suggested files</span>
                            </div>
                            <div className="flex bg-[#f1f3f4] p-1 rounded-full">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368] hover:bg-gray-200'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368] hover:bg-gray-200'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!isFilesCollapsed && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                {loading ? (
                                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#1a73e8] rounded-full animate-spin"></div></div>
                                ) : (
                                    <>
                                        {filteredFiles.length === 0 ? (
                                            <GeneralEmptyState
                                                title="No files found"
                                                description="Capture and organize your business documents here. Tap 'New' to upload."
                                                icon={CloudUpload}
                                                onIconClick={() => fileInputRef.current?.click()}
                                            />
                                        ) : viewMode === 'grid' ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                                {(isViewMore ? filteredFiles : filteredFiles.slice(0, 10)).map(file => {
                                                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(file.type?.toLowerCase());
                                                    return (
                                                        <div 
                                                            key={file.id} 
                                                            onClick={() => setSelectedItemId(file.id)}
                                                            className={`bg-white border ${selectedItemId === file.id ? 'border-[#129046] ring-1 ring-[#129046]' : 'border-[#dadce0]'} rounded-xl overflow-hidden hover:shadow-[0_4px_12px_rgba(60,64,67,0.15)] transition-all cursor-pointer flex flex-col group h-[220px]`}
                                                        >
                                                            {/* Top Row: Info & Menu */}
                                                            <div className="px-3 py-2 flex items-center justify-between h-[44px]">
                                                                <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
                                                                    <div className="shrink-0">{getFileIcon(file.type, "w-5 h-5")}</div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-[12px] font-medium text-gray-700 truncate">{file.name}</span>
                                                                        {/* Admin: show creator badge */}
                                                                        {!isSubUser && file.createdBySubUserName && (
                                                                            <span className="text-[10px] text-[#129046] font-medium truncate flex items-center gap-0.5">
                                                                                <Users className="w-2.5 h-2.5" /> {file.createdBySubUserName}
                                                                            </span>
                                                                        )}
                                                                        {!isSubUser && !file.createdBySubUserName && (
                                                                            <span className="text-[10px] text-gray-400 truncate">Admin</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="relative action-menu-container">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                                                                        className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4 text-gray-500" />
                                                                    </button>
                                                                    {activeMenuId === file.id && (
                                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[60]">
                                                                            {canDo(file, 'rename') && <button onClick={(e) => { e.stopPropagation(); handleAction('rename', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><Pencil className="w-4 h-4 text-gray-400" /> Rename</button>}
                                                                            {canDo(file, 'share') && <button onClick={(e) => { e.stopPropagation(); handleAction('share', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Access</button>}
                                                                            <button onClick={(e) => { e.stopPropagation(); handleAction('download', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4 text-gray-400" /> Download</button>
                                                                            {canDo(file, 'delete') && <div className="h-px bg-gray-100 my-1"></div>}
                                                                            {canDo(file, 'delete') && <button onClick={(e) => { e.stopPropagation(); handleAction('delete', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Middle: Preview Area */}
                                                            <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden m-1.5 mt-0 rounded-lg border border-gray-100/50">
                                                                {isImage ? (
                                                                    <img 
                                                                        src={getImageURL(file.path)} 
                                                                        alt={file.name}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = 'https://via.placeholder.com/200x150?text=No+Preview';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                                                        <div className="mb-2">
                                                                            {getFileIcon(file.type, "w-16 h-20", true)}
                                                                        </div>
                                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{file.type}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-xl border border-[#dadce0]">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-[#dadce0] text-[#5f6368] text-[12px] font-medium uppercase tracking-wider">
                                                            <th className="px-6 py-3 font-medium">Name</th>
                                                            <th className="px-6 py-3 font-medium">Owner</th>
                                                            <th className="px-6 py-3 font-medium">Last Modified</th>
                                                            <th className="px-6 py-3 font-medium">File Size</th>
                                                            <th className="px-6 py-3 font-medium w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-[13px] text-[#202124]">
                                                        {(isViewMore ? filteredFiles : filteredFiles.slice(0, 10)).map(file => (
                                                            <tr 
                                                                key={file.id} 
                                                                onClick={() => setSelectedItemId(file.id)}
                                                                className="hover:bg-[#f1f3f4] group transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                                                            >
                                                                <td className="px-6 py-3 flex items-center gap-3 overflow-hidden">
                                                                    <div className="shrink-0">{getFileIcon(file.type, "w-5 h-5")}</div>
                                                                    <span className="truncate font-medium">{file.name}</span>
                                                                </td>
                                                                <td className="px-6 py-3 text-[#5f6368]">
                                                                    {isSubUser ? 'Me' : (file.createdBySubUserName ? (
                                                                        <span className="text-[#129046] font-medium flex items-center gap-1">
                                                                            <Users className="w-3 h-3" /> {file.createdBySubUserName}
                                                                        </span>
                                                                    ) : 'Admin')}
                                                                </td>
                                                                <td className="px-6 py-3 text-[#5f6368]">{file.date || 'Today'}</td>
                                                                <td className="px-6 py-3 text-[#5f6368]">{file.size}</td>
                                                                <td className="px-6 py-3 relative text-right action-menu-container">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                                                                        className="p-1.5 hover:bg-gray-200 rounded-full transition-opacity"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4 text-[#5f6368]" />
                                                                    </button>
                                                                    {activeMenuId === file.id && (
                                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[60]">
                                                                            {canDo(file, 'rename') && <button onClick={(e) => { e.stopPropagation(); handleAction('rename', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-2"><Pencil className="w-4 h-4" /> Rename</button>}
                                                                            <button onClick={(e) => { e.stopPropagation(); handleAction('download', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] flex items-center gap-2"><Download className="w-4 h-4" /> Download</button>
                                                                            {canDo(file, 'delete') && <div className="h-px bg-gray-100 my-1"></div>}
                                                                            {canDo(file, 'delete') && <button onClick={(e) => { e.stopPropagation(); handleAction('delete', file); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f1f3f4] text-red-600 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {(filteredFiles.length > 10 || filteredFolders.length > 5) && (
                            <div className="flex justify-start mt-10">
                                <button
                                    onClick={() => setIsViewMore(!isViewMore)}
                                    className="text-[#1a73e8] text-[13px] font-medium hover:bg-[#f1f3f4] px-5 py-2.5 rounded-full transition-all focus:ring-1 focus:ring-offset-2 focus:ring-[#1a73e8]"
                                >
                                    {isViewMore ? 'View less' : 'View more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.name || ""}
                itemType={itemToDelete?.itemType || "item"}
            />

            <ShareModal 
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setItemToShare(null);
                }}
                businessId={businessId}
                item={itemToShare}
                onUpdate={fetchDocuments}
            />
        </div>
    );
}

const UserCircle = ({ className }) => (
    <div className={`${className} bg-green-100 rounded-full flex items-center justify-center font-bold text-[10px]`}>U</div>
);
;
