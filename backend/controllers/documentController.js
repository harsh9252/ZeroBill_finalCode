const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { sanitizeFolderName } = require('../utils/fileUtils');

// Helper to sanitize names for NEW folder/file creation
const sanitize = (name, forceLower = false) => {
    if (!name) return '';
    // Allow alphanumeric, dots, hyphens, and spaces for user-created items
    // but replace other potentially dangerous characters
    let sanitized = name.replace(/[^a-zA-Z0-9.\- ]/g, '_'); 
    return forceLower ? sanitized.toLowerCase() : sanitized;
};

// ─── Helper: Record a document item in DB ───────────────────────────────────
const recordDocumentItem = async (businessId, parentPath, itemName, itemType, subUserId = null) => {
    try {
        await pool.query(
            `INSERT INTO document_items (business_id, parent_path, item_name, item_type, created_by_sub_user_id)
             VALUES (?, ?, ?, ?, ?)`,
            [businessId, parentPath || '', itemName, itemType, subUserId || null]
        );
    } catch (err) {
        console.error('recordDocumentItem error:', err.message);
    }
};

// ─── Helper: Delete a document item record from DB ──────────────────────────
const removeDocumentItem = async (businessId, parentPath, itemName) => {
    try {
        await pool.query(
            `DELETE FROM document_items WHERE business_id = ? AND parent_path = ? AND item_name = ?`,
            [businessId, parentPath || '', itemName]
        );
    } catch (err) {
        console.error('removeDocumentItem error:', err.message);
    }
};

// ─── Helper: Remove all DB records under a folder path (recursive delete) ───
const removeDocumentItemsUnder = async (businessId, folderPath) => {
    try {
        // Delete the folder itself and any items whose parent_path starts with this folder
        await pool.query(
            `DELETE FROM document_items 
             WHERE business_id = ? AND (
               (parent_path = ? AND item_name = ?) OR
               parent_path = ? OR
               parent_path LIKE ?
             )`,
            [businessId, folderPath.split('/').slice(0, -1).join('/'), folderPath.split('/').pop(), folderPath, `${folderPath}/%`]
        );
    } catch (err) {
        console.error('removeDocumentItemsUnder error:', err.message);
    }
};

// ─── Helper: get allowed item names for a sub-user at given path ────────────
const getSubUserAllowedItems = async (businessId, parentPath, subUserId) => {
    // 1. Items owned by user 
    let query = `
        SELECT item_name FROM document_items 
        WHERE business_id = ? AND parent_path = ? AND created_by_sub_user_id = ?
    `;
    let params = [businessId, parentPath || '', subUserId];
    
    // 2. Items specifically shared with user (can_view = 1)
    query += `
        UNION
        SELECT di.item_name FROM document_items di
        INNER JOIN document_permissions dp ON di.id = dp.document_item_id
        WHERE di.business_id = ? AND di.parent_path = ? AND dp.sub_user_id = ? AND dp.can_view = 1
    `;
    params.push(businessId, parentPath || '', subUserId);

    // 3. Inheritance: Find if ANY parent folder is shared
    if (parentPath && parentPath !== '') {
        const segments = parentPath.split('/');
        let pathCheckQuery = `
            SELECT di.id FROM document_items di
            INNER JOIN document_permissions dp ON di.id = dp.document_item_id
            WHERE di.business_id = ? AND dp.sub_user_id = ? AND dp.can_view = 1 AND di.item_type = 'folder'
            AND (
        `;
        let pathCheckParams = [businessId, subUserId];
        let pathParts = [];
        segments.forEach((seg, idx) => {
            const p_path = segments.slice(0, idx).join('/');
            pathParts.push(`(di.parent_path = ? AND di.item_name = ?)`);
            pathCheckParams.push(p_path, seg);
        });
        pathCheckQuery += pathParts.join(' OR ') + `)`;
        
        const [inherited] = await pool.query(pathCheckQuery, pathCheckParams);
        if (inherited.length > 0) {
            // If inherited view access, we see EVERYTHING at this path
            const [allItems] = await pool.query(
                `SELECT item_name FROM document_items WHERE business_id = ? AND parent_path = ?`,
                [businessId, parentPath]
            );
            return new Set(allItems.map(r => r.item_name));
        }
    }

    const [rows] = await pool.query(query, params);
    return new Set(rows.map(r => r.item_name));
};

// ─── Helper: get allowed item names for admin at given path (all items) ─────
const getAdminAllowedItems = async (businessId, parentPath) => {
    const [rows] = await pool.query(
        `SELECT item_name, created_by_sub_user_id FROM document_items 
         WHERE business_id = ? AND parent_path = ?`,
        [businessId, parentPath || '']
    );
    // Return a map: itemName -> subUserId (null = admin created)
    const map = {};
    rows.forEach(r => { map[r.item_name] = r.created_by_sub_user_id; });
    return map;
};

// ─── Helper: check access to an item ────────────────────────────────────────
const checkAccess = async (businessId, parentPath, itemName, subUserId, reqType = 'view') => {
    // 1. Get the item details
    const [rows] = await pool.query(
        `SELECT id, created_by_sub_user_id, item_type FROM document_items 
         WHERE business_id = ? AND parent_path = ? AND item_name = ?`,
        [businessId, parentPath || '', itemName]
    );
    
    if (rows.length === 0) return { exists: false, hasAccess: false };
    
    const item = rows[0];
    const ownerId = item.created_by_sub_user_id;

    // 2. Owner always has full access
    if (ownerId === subUserId) {
        return { exists: true, hasAccess: true, isOwner: true, ownerId, itemId: item.id };
    }

    // 3. Admin always has full access (if subUserId is null, it means requester is admin)
    if (subUserId === null) {
        return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id };
    }

    // 4. Check specific permissions for this user
    const [permRows] = await pool.query(
        `SELECT can_view, can_edit, can_delete FROM document_permissions 
         WHERE document_item_id = ? AND sub_user_id = ?`,
        [item.id, subUserId]
    );

    if (permRows.length > 0) {
        const perms = permRows[0];
        if (reqType === 'view' && perms.can_view) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, permissions: perms };
        if (reqType === 'edit' && perms.can_edit) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, permissions: perms };
        if (reqType === 'delete' && perms.can_delete) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, permissions: perms };
    }

    // 5. Inheritance: Check if any part of the hierarchy above this item is shared with recursive edit/delete
    // If parent folder is shared with 'edit', all contents are editable.
    if (parentPath && parentPath !== '') {
        const segments = parentPath.split('/');
        let pathCheckQuery = `
            SELECT dp.can_view, dp.can_edit, dp.can_delete FROM document_items di
            INNER JOIN document_permissions dp ON di.id = dp.document_item_id
            WHERE di.business_id = ? AND dp.sub_user_id = ? AND di.item_type = 'folder'
            AND (
        `;
        let pathCheckParams = [businessId, subUserId];
        let pathParts = [];
        segments.forEach((seg, idx) => {
            const p_path = segments.slice(0, idx).join('/');
            pathParts.push(`(di.parent_path = ? AND di.item_name = ?)`);
            pathCheckParams.push(p_path, seg);
        });
        pathCheckQuery += pathParts.join(' OR ') + `)`;
        
        const [inheritedRows] = await pool.query(pathCheckQuery, pathCheckParams);
        for (const hp of inheritedRows) {
            if (reqType === 'view' && hp.can_view) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, inherited: true };
            if (reqType === 'edit' && hp.can_edit) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, inherited: true };
            if (reqType === 'delete' && hp.can_delete) return { exists: true, hasAccess: true, isOwner: false, ownerId, itemId: item.id, inherited: true };
        }
    }

    return { exists: true, hasAccess: false, isOwner: false, ownerId, itemId: item.id };
};

// ─── Helper: check access to a path (convenience) ───────────────────────────
const checkPathAccess = async (businessId, itemPath, subUserId, reqType = 'view') => {
    if (!itemPath || itemPath === '' || itemPath === '/') {
        return { exists: true, hasAccess: true, isOwner: false, itemId: null }; // Root is open
    }
    const parts = itemPath.split('/').filter(Boolean);
    const itemName = parts.pop();
    const parentPath = parts.join('/');
    return await checkAccess(businessId, parentPath, itemName, subUserId, reqType);
};

// @desc    Get all files and folders for a business
// @route   GET /api/documents/:businessId
// @access  Private
exports.getDocuments = async (req, res) => {
    try {
        const { businessId } = req.params;
        const ownerEmail = req.user.ownerEmail || req.user.email;
        
        // Find business name to locate folder
        const [businessRows] = await pool.query('SELECT business_name, user_id FROM businesses WHERE id = ?', [businessId]);
        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Business access check
        if (req.user.isSubUser) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to access this business' });
            }
        } else {
            if (businessRows[0].user_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized to access this business' });
            }
        }
        
        const businessName = sanitizeFolderName(businessRows[0].business_name, true);
        const businessPath = path.join(__dirname, '../uploads', ownerEmail, businessName);
        
        if (!fs.existsSync(businessPath)) {
            fs.mkdirSync(businessPath, { recursive: true });
        }

        const relativePath = req.query.path || ''; // Subfolder within business folder
        const targetPath = path.join(businessPath, relativePath);

        // Security check: ensure targetPath is within businessPath
        if (!targetPath.startsWith(businessPath)) {
            return res.status(403).json({ success: false, message: 'Invalid path access' });
        }

        if (!fs.existsSync(targetPath)) {
            return res.json({ success: true, data: [] });
        }

        let items = fs.readdirSync(targetPath, { withFileTypes: true });
        
        // Filter out business assets (logo, signature, stamp, qr) from the root folder
        if (relativePath === '' || relativePath === '/') {
            const systemPrefixes = ['logo-', 'signature-', 'stamp-', 'qr-code', 'signature_', 'stamp_', 'signature_seal_stamp'];
            items = items.filter(item => {
                if (item.isDirectory()) return true;
                const lowerName = item.name.toLowerCase().replace(/-/g, '_');
                return !systemPrefixes.some(prefix => lowerName.startsWith(prefix));
            });
        }

        // ── Ownership Filtering ──────────────────────────────────────────────
        // Sub-user: only see their own items
        // Admin: see all items (with "created by" metadata)
        let subUserAllowedSet = null;
        let adminOwnershipMap = null;

        if (req.user.isSubUser) {
            subUserAllowedSet = await getSubUserAllowedItems(parseInt(businessId), relativePath, req.user.id);
        } else {
            // Admin: fetch ownership map to annotate items
            adminOwnershipMap = await getAdminAllowedItems(parseInt(businessId), relativePath);
        }

        // Build sub-user name lookup for admin display
        let subUserNames = {};
        if (adminOwnershipMap) {
            const subUserIds = [...new Set(Object.values(adminOwnershipMap).filter(Boolean))];
            if (subUserIds.length > 0) {
                const placeholders = subUserIds.map(() => '?').join(',');
                const [suRows] = await pool.query(
                    `SELECT id, name FROM sub_users WHERE id IN (${placeholders})`,
                    subUserIds
                );
                suRows.forEach(su => { subUserNames[su.id] = su.name; });
            }
        }

        // ── Permissions for the CURRENT folder ──────────────────────────────
        let folderPermissions = { canEdit: true, canDelete: true, canShare: true };
        if (req.user.isSubUser) {
            const pAccess = await checkPathAccess(parseInt(businessId), relativePath, req.user.id, 'view');
            // If sub-user is the owner of this folder, or it's root, or they have specific edit perms
            const editAccess = await checkPathAccess(parseInt(businessId), relativePath, req.user.id, 'edit');
            const deleteAccess = await checkPathAccess(parseInt(businessId), relativePath, req.user.id, 'delete');
            
            folderPermissions = {
                canEdit: editAccess.hasAccess,
                canDelete: deleteAccess.hasAccess,
                canShare: editAccess.isOwner // Only owner can share
            };
        }

        const result = items
            .filter(item => {
                // Sub-user filter: only items tracked in DB as theirs
                if (subUserAllowedSet !== null) {
                    return subUserAllowedSet.has(item.name);
                }
                return true; // Admin sees everything on disk
            })
            .map(item => {
                const fullPathOnDisk = path.join(targetPath, item.name);
                const stats = fs.statSync(fullPathOnDisk);
                
                let displayName = item.name;
                if (!item.isDirectory()) {
                    const parts = item.name.split('-');
                    if (parts.length >= 3 && /^\d{10,}/.test(parts[0])) {
                        displayName = parts.slice(2).join('-');
                    }
                }

                const itemRelativePath = [ownerEmail, businessName, relativePath, item.name]
                    .filter(Boolean)
                    .join('/');

                // Ownership annotation for admin
                let createdBySubUserId = null;
                let createdBySubUserName = null;
                if (adminOwnershipMap) {
                    createdBySubUserId = adminOwnershipMap[item.name] ?? null;
                    createdBySubUserName = createdBySubUserId ? (subUserNames[createdBySubUserId] || 'Sub-user') : null;
                }
                
                // ── Item-specific permissions ────────────────────────────────
                // By default, if sub-user can see it, they have view.
                // We'll calculate edit/delete based on folder perms or specific item perms.
                let itemPermissions = { canEdit: true, canDelete: true, canShare: true };
                if (req.user.isSubUser) {
                    const isOwner = adminOwnershipMap ? (adminOwnershipMap[item.name] === req.user.id) : false;
                    // If they own it, full access.
                    // If they don't own it, it depends on inherited or specific perms.
                    // For now, we'll use a conservative approach: if they don't own it and 
                    // the folder is not editable, they can't edit it.
                    itemPermissions = {
                        canEdit: isOwner || folderPermissions.canEdit,
                        canDelete: isOwner || folderPermissions.canDelete,
                        canShare: isOwner
                    };
                }

                return {
                    id: item.name,
                    name: displayName,
                    realName: item.name,
                    path: itemRelativePath,
                    type: item.isDirectory() ? 'folder' : item.name.split('.').pop().toLowerCase(),
                    size: item.isDirectory() ? '--' : (stats.size / 1024).toFixed(1) + ' KB',
                    date: stats.mtime.toISOString().split('T')[0],
                    parentId: relativePath || 'root',
                    itemType: item.isDirectory() ? 'folder' : 'file',
                    caption: item.isDirectory() ? '' : `Modified ${stats.mtime.toLocaleDateString()}`,
                    // Ownership info (null if created by admin)
                    createdBySubUserId,
                    createdBySubUserName,
                    permissions: itemPermissions
                };
            });

        res.json({ success: true, data: result, folderPermissions });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve documents' });
    }
};

// @desc    Create a new folder
// @route   POST /api/documents/folder
// @access  Private
exports.createFolder = async (req, res) => {
    try {
        const { businessId, folderName, parentPath = '' } = req.body;
        const ownerEmail = req.user.ownerEmail || req.user.email;

        const [businessRows] = await pool.query('SELECT business_name, user_id FROM businesses WHERE id = ?', [businessId]);
        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Business access check
        if (req.user.isSubUser) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else if (businessRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const businessName = sanitizeFolderName(businessRows[0].business_name, true);

        // Sanitize parent path segments (preserve casing)
        const sanitizedParentPath = parentPath ? parentPath.split('/').filter(Boolean).map(s => sanitizeFolderName(s, false)).join('/') : '';
        const sanitizedFolderName = sanitizeFolderName(folderName, false);

        // ── Sub-user permission check ──────────────────────────────────────
        if (req.user.isSubUser) {
            // Check if sub-user can edit (add items to) the parent folder
            const access = await checkPathAccess(parseInt(businessId), sanitizedParentPath, req.user.id, 'edit');
            if (!access.hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to create folders here' });
            }
        }

        const targetPath = path.join(__dirname, '../uploads', ownerEmail, businessName, sanitizedParentPath, sanitizedFolderName);
        
        if (fs.existsSync(targetPath)) {
            return res.status(400).json({ success: false, message: 'Folder with this name already exists' });
        }

        fs.mkdirSync(targetPath, { recursive: true });

        // ── Track ownership in DB ────────────────────────────────────────────
        const subUserId = req.user.isSubUser ? req.user.id : null;
        await recordDocumentItem(parseInt(businessId), sanitizedParentPath, sanitizedFolderName, 'folder', subUserId);

        res.json({ success: true, message: 'Folder created successfully' });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
};

// @desc    Upload file
// @route   POST /api/documents/upload
// @access  Private
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const relativeDest = path.relative(path.join(__dirname, '../'), req.file.path).replace(/\\/g, '/');

        // ── Track ownership in DB ────────────────────────────────────────────
        const businessId = parseInt(req.body.businessId);
        const parentPath = req.body.parentPath || '';
        const subUserId = req.user.isSubUser ? req.user.id : null;

        // ── Sub-user business access check ──────────────────────────────────
        if (req.user.isSubUser && businessId) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to access this business' });
            }
        }

        // ── Sub-user permission check ──────────────────────────────────────
        if (req.user.isSubUser) {
            const access = await checkPathAccess(businessId, parentPath, req.user.id, 'edit');
            if (!access.hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to upload files here' });
            }
        }

        if (businessId) {
            await recordDocumentItem(businessId, parentPath, req.file.filename, 'file', subUserId);
        }
        
        res.json({ 
            success: true, 
            message: 'File uploaded successfully',
            file: {
                name: req.file.originalname,
                url: `/${relativeDest}`
            }
        });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
};

// @desc    Rename item
// @route   PUT /api/documents/rename
// @access  Private
exports.renameItem = async (req, res) => {
    try {
        const { businessId, oldPath, newName } = req.body;
        const ownerEmail = req.user.ownerEmail || req.user.email;

        const [businessRows] = await pool.query('SELECT business_name, user_id FROM businesses WHERE id = ?', [businessId]);
        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Business access check
        if (req.user.isSubUser) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else if (businessRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const businessName = sanitizeFolderName(businessRows[0].business_name, true);
        const basePath = path.join(__dirname, '../uploads', ownerEmail, businessName);
        
        // IMPORTANT: oldPath comes from getDocuments (real disk names)
        // We should NOT re-sanitize it as that might mangle spaces/dots already on disk
        const oldFullPath = path.join(basePath, oldPath);
        
        const sanitizedNewName = sanitize(newName, false);
        const newFullPath = path.join(path.dirname(oldFullPath), sanitizedNewName);

        if (!fs.existsSync(oldFullPath)) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        if (fs.existsSync(newFullPath)) {
            return res.status(400).json({ success: false, message: 'An item with this name already exists' });
        }

        // ── Sub-user ownership/access check ─────────────────────────────────
        if (req.user.isSubUser) {
            const oldPathParts = oldPath.split('/');
            const oldItemName = oldPathParts[oldPathParts.length - 1];
            const oldParentPath = oldPathParts.slice(0, -1).join('/');

            const access = await checkAccess(parseInt(businessId), oldParentPath, oldItemName, req.user.id, 'edit');
            if (!access.exists) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }
            if (!access.hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to rename this item' });
            }
        }

        fs.renameSync(oldFullPath, newFullPath);

        // ── Update DB record ─────────────────────────────────────────────────
        const pathParts = oldPath.split('/');
        const oldItemName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');

        await pool.query(
            `UPDATE document_items SET item_name = ? 
             WHERE business_id = ? AND parent_path = ? AND item_name = ?`,
            [sanitizedNewName, parseInt(businessId), parentPath, oldItemName]
        );

        res.json({ success: true, message: 'Item renamed successfully' });
    } catch (error) {
        console.error('Rename item error:', error);
        res.status(500).json({ success: false, message: 'Failed to rename item' });
    }
};

// @desc    Delete item
// @route   DELETE /api/documents/delete
// @access  Private
exports.deleteItem = async (req, res) => {
    try {
        const { businessId, itemPath } = req.body;
        const ownerEmail = req.user.ownerEmail || req.user.email;

        const [businessRows] = await pool.query('SELECT business_name, user_id FROM businesses WHERE id = ?', [businessId]);
        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Business access check
        if (req.user.isSubUser) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else if (businessRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // ── Sub-user ownership/access check ─────────────────────────────────
        if (req.user.isSubUser) {
            const pathParts = itemPath.split('/');
            const itemName = pathParts[pathParts.length - 1];
            const parentPath = pathParts.slice(0, -1).join('/');

            const access = await checkAccess(parseInt(businessId), parentPath, itemName, req.user.id, 'delete');
            if (!access.exists) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }
            if (!access.hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this item' });
            }
        }

        const businessName = sanitizeFolderName(businessRows[0].business_name, true);
        const fullPath = path.join(__dirname, '../uploads', ownerEmail, businessName, itemPath);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            // Remove all DB records for this folder and its children
            await removeDocumentItemsUnder(parseInt(businessId), itemPath);
        } else {
            fs.unlinkSync(fullPath);
            // Remove DB record
            const pathParts = itemPath.split('/');
            const itemName = pathParts[pathParts.length - 1];
            const parentPath = pathParts.slice(0, -1).join('/');
            await removeDocumentItem(parseInt(businessId), parentPath, itemName);
        }

        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
};

// @desc    Download item
// @route   GET /api/documents/download
// @access  Private
exports.downloadItem = async (req, res) => {
    try {
        const { businessId, path: itemPath } = req.query;
        const ownerEmail = req.user.ownerEmail || req.user.email;

        const [businessRows] = await pool.query('SELECT business_name, user_id FROM businesses WHERE id = ?', [businessId]);
        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Business access check
        if (req.user.isSubUser) {
            if (!req.user.accessibleBusinessIds || !req.user.accessibleBusinessIds.includes(parseInt(businessId))) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // Sub-user can only download if they have view access
            const pathParts = itemPath.split('/');
            const itemName = pathParts[pathParts.length - 1];
            const parentPath = pathParts.slice(0, -1).join('/');

            const access = await checkAccess(parseInt(businessId), parentPath, itemName, req.user.id, 'view');
            if (!access.exists || !access.hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to download this file' });
            }
        } else if (businessRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const businessName = sanitizeFolderName(businessRows[0].business_name, true);
        const fullPath = path.join(__dirname, '../uploads', ownerEmail, businessName, itemPath);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(400).json({ success: false, message: 'Cannot download a directory' });
        }

        res.download(fullPath, path.basename(fullPath), (err) => {
            if (err) {
                console.error('Download file error:', err);
                if (!res.headersSent) {
                    res.status(500).send('Could not download the file.');
                }
            }
        });
    } catch (error) {
        console.error('Download item error:', error);
        res.status(500).json({ success: false, message: 'Failed to download item' });
    }
};
// ─── Permission Management ──────────────────────────────────────────────

// @desc    Get sub-users who can be shared with
// @route   GET /api/documents/permissible-users/:businessId
exports.getPermissibleSubUsers = async (req, res) => {
    try {
        const { businessId } = req.params;
        const subUserId = req.user.isSubUser ? req.user.id : null;

        // Fetch all sub-users with access to this business
        // If requester is sub-user, exclude self
        let query = `
            SELECT su.id, su.name, su.email FROM sub_users su
            INNER JOIN sub_user_business_access suba ON su.id = suba.sub_user_id
            WHERE suba.business_id = ? AND su.is_active = 1
        `;
        let params = [businessId];
        if (subUserId) {
            query += ` AND su.id != ?`;
            params.push(subUserId);
        }

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getPermissibleSubUsers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// @desc    Get permissions for an item
// @route   GET /api/documents/permissions
exports.getItemPermissions = async (req, res) => {
    try {
        const { businessId, parentPath, itemName } = req.query;
        const subUserId = req.user.isSubUser ? req.user.id : null;

        // Check if requester has access to see permissions (usually owner or admin)
        const access = await checkAccess(businessId, parentPath, itemName, subUserId, 'view');
        if (!access.exists) return res.status(404).json({ success: false, message: 'Item not found' });
        
        // Fetch current owner details
        let ownerInfo = { name: 'Admin', email: '', isOwner: true };
        if (access.ownerId) {
            const [ownerRows] = await pool.query(`SELECT name, email FROM sub_users WHERE id = ?`, [access.ownerId]);
            if (ownerRows[0]) {
                ownerInfo.name = ownerRows[0].name;
                ownerInfo.email = ownerRows[0].email;
            }
        }

        // Fetch shared users
        const [sharedRows] = await pool.query(
            `SELECT su.id, su.name, su.email, dp.can_view, dp.can_edit, dp.can_delete 
             FROM document_permissions dp
             INNER JOIN sub_users su ON dp.sub_user_id = su.id
             WHERE dp.document_item_id = ?`,
            [access.itemId]
        );

        res.json({ 
            success: true, 
            owner: ownerInfo,
            sharedWith: sharedRows 
        });
    } catch (error) {
        console.error('getItemPermissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
};

// @desc    Update permissions for an item
// @route   POST /api/documents/permissions
exports.updateItemPermissions = async (req, res) => {
    try {
        const { businessId, parentPath, itemName, userId, perms } = req.body;
        const subUserId = req.user.isSubUser ? req.user.id : null;

        // Only owner or admin can share
        const access = await checkAccess(businessId, parentPath, itemName, subUserId, 'view');
        if (!access.exists) return res.status(404).json({ success: false, message: 'Item not found' });
        if (!access.isOwner && subUserId !== null) {
            return res.status(403).json({ success: false, message: 'Only the owner can manage permissions' });
        }

        if (!perms || Object.keys(perms).length === 0) {
            // Delete permission if empty perms provided
            await pool.query(
                `DELETE FROM document_permissions WHERE document_item_id = ? AND sub_user_id = ?`,
                [access.itemId, userId]
            );
        } else {
            // Upsert permission
            await pool.query(
                `INSERT INTO document_permissions (document_item_id, sub_user_id, business_id, can_view, can_edit, can_delete)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    can_view = VALUES(can_view), 
                    can_edit = VALUES(can_edit), 
                    can_delete = VALUES(can_delete)`,
                [access.itemId, userId, businessId, perms.can_view ? 1:0, perms.can_edit ? 1:0, perms.can_delete ? 1:0]
            );
        }

        res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('updateItemPermissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to update permissions' });
    }
};
