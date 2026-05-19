const fs = require('fs');
const path = require('path');

/**
 * Creates a root folder for a user based on their email
 * @param {string} email 
 * @returns {string} The path to the created folder
 */
const createUserFolder = (email) => {
    if (!email) return null;
    const userFolder = path.join(__dirname, '../uploads', email);
    if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
    
    }
    return userFolder;
};

/**
 * Sanitizes a string for use as a folder name
 * @param {string} name 
 * @returns {string} The sanitized name
 */
const sanitizeFolderName = (name, forceLower = true) => {
    if (!name) return 'default';
    // If name is an array (multiple fields in FormData), take the first one
    const nameStr = Array.isArray(name) ? name[0] : name;
    if (typeof nameStr !== 'string') return 'default';
    let sanitized = nameStr.replace(/[^a-zA-Z0-9]/gi, '_');
    return forceLower ? sanitized.toLowerCase() : sanitized;
};

/**
 * Creates a subfolder for a business under a user's email folder
 * @param {string} email 
 * @param {string} businessName 
 * @returns {string} The path to the created business folder
 */
const createBusinessFolder = (email, businessName) => {
    if (!email || !businessName) return null;
    const userFolder = createUserFolder(email);
    const sanitizedBusinessName = sanitizeFolderName(businessName);
    const businessFolder = path.join(userFolder, sanitizedBusinessName);
    
    if (!fs.existsSync(businessFolder)) {
        fs.mkdirSync(businessFolder, { recursive: true });
      
    }
    return businessFolder;
};

module.exports = {
    createUserFolder,
    sanitizeFolderName,
    createBusinessFolder
};
