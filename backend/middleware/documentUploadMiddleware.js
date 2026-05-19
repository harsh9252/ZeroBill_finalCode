const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

const { sanitizeFolderName } = require('../utils/fileUtils');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ownerEmail = req.user.ownerEmail || req.user.email;
        const businessId = req.body.businessId || req.query.businessId;
        const parentPath = req.body.parentPath || req.query.parentPath || '';

        // If businessId is provided, fetch business name from DB for reliability
        if (businessId) {
            pool.query('SELECT business_name FROM businesses WHERE id = ?', [businessId])
                .then(([rows]) => {
                    let businessName = 'default_business';
                    if (rows.length > 0) {
                        businessName = rows[0].business_name;
                    }
                    
                    const sanitizedBusinessName = sanitizeFolderName(businessName, true);
                    let uploadPath = path.join(__dirname, '../uploads', ownerEmail, sanitizedBusinessName);
                    
                    if (parentPath) {
                        const pathSegments = parentPath.split('/').filter(Boolean);
                        // Preserve case for parent path segments
                        const sanitizedSegments = pathSegments.map(s => sanitizeFolderName(s, false));
                        uploadPath = path.join(uploadPath, ...sanitizedSegments);
                    }

                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }
                    cb(null, uploadPath);
                })
                .catch(err => {
                    console.error('Multer destination DB error:', err);
                    cb(err);
                });
        } else {
            // Fallback to businessName from body or query if businessId is missing
            const businessName = req.body.businessName || req.query.businessName || 'default_business';
            const sanitizedBusinessName = sanitizeFolderName(businessName, true);
            let uploadPath = path.join(__dirname, '../uploads', ownerEmail, sanitizedBusinessName);

            if (parentPath) {
                const pathSegments = parentPath.split('/').filter(Boolean);
                const sanitizedSegments = pathSegments.map(s => sanitizeFolderName(s, false));
                uploadPath = path.join(uploadPath, ...sanitizedSegments);
            }

            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        }
    },
    filename: (req, file, cb) => {
        // Keep original filename but prefix with timestamp for uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const documentUpload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1024MB (1GB) limit
    }
});

module.exports = documentUpload;
