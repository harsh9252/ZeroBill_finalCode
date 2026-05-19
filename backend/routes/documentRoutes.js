const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect, checkPlanExpiry } = require('../middleware/authMiddleware');
const documentUpload = require('../middleware/documentUploadMiddleware');

// All routes are protected
router.use(protect);

router.get('/download', documentController.downloadItem);
router.get('/permissible-users/:businessId', documentController.getPermissibleSubUsers);
router.get('/permissions', documentController.getItemPermissions);
router.post('/permissions', checkPlanExpiry, documentController.updateItemPermissions);
router.get('/:businessId', documentController.getDocuments);
router.post('/folder', checkPlanExpiry, documentController.createFolder);
router.post('/upload', checkPlanExpiry, documentUpload.single('file'), documentController.uploadFile);
router.put('/rename', checkPlanExpiry, documentController.renameItem);
router.delete('/delete', checkPlanExpiry, documentController.deleteItem);

module.exports = router;
