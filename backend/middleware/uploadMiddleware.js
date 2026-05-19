const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const { createBusinessFolder, createUserFolder } = require('../utils/fileUtils');
const Business = require('../models/businessModel');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// For backward compatibility and specialized cases if any
const directStorage = storage;

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/jfif',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/avif'
  ];

  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for documents and images (restricted for security)
const anyFileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.xls', '.xlsx', '.csv', 
    '.txt', '.rtf', '.ppt', '.pptx', '.odt', '.zip', '.rar', '.7z'
  ];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// Upload middleware for single file
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload middleware for multiple files
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  }
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'stamp', maxCount: 1 }
]);

// Helper for direct root upload (now alias of upload)
const uploadDirect = upload;

// Upload middleware for any file type
const uploadAny = multer({
  storage: storage,
  fileFilter: anyFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

module.exports = upload;
module.exports.uploadMultiple = uploadMultiple;
module.exports.uploadDirect = uploadDirect;
module.exports.uploadAny = uploadAny;
