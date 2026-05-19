/**
 * Utility functions for role-based access control
 */

/**
 * Check if the current user is an admin (main user from users table)
 * @returns {boolean} True if user is admin, false if sub-user
 */
export const isAdminUser = () => {
  const userType = localStorage.getItem('userType');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // User is admin if:
  // 1. userType is not 'subUser' AND
  // 2. user.isSubUser is not true
  return userType !== 'subUser' && !user.isSubUser;
};

/**
 * Check if the current user is a sub-user
 * @returns {boolean} True if user is sub-user, false if admin
 */
export const isSubUser = () => {
  return !isAdminUser();
};

/**
 * Get the current user's role as a string
 * @returns {string} 'admin' or 'subUser'
 */
export const getUserRole = () => {
  return isAdminUser() ? 'admin' : 'subUser';
};

/**
 * Check if the current user has permission to access a feature
 * @param {string} feature - The feature to check ('manageUsers', 'createBusiness', etc.)
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (feature) => {
  const role = getUserRole();
  
  const permissions = {
    admin: [
      'manageUsers',
      'createBusiness',
      'editBusiness',
      'deleteBusiness',
      'viewAllBusinesses',
      'manageSubUsers',
      'accessSettings'
    ],
    subUser: [
      'viewAssignedBusinesses',
      'editAssignedBusinesses', // Limited to assigned businesses only
      'createInvoices',
      'viewReports'
    ]
  };
  
  return permissions[role]?.includes(feature) || false;
};

/**
 * Get user information with role details
 * @returns {object} User information including role
 */
export const getCurrentUser = () => {
  const userType = localStorage.getItem('userType');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  return {
    ...user,
    role: getUserRole(),
    isAdmin: isAdminUser(),
    isSubUser: isSubUser(),
    userType
  };
};

/**
 * Redirect user based on their role and permissions
 * @param {string} attemptedFeature - The feature they tried to access
 * @param {function} navigate - React Router navigate function
 */
export const handleUnauthorizedAccess = (attemptedFeature, navigate) => {
  const role = getUserRole();
  
  console.warn(`Unauthorized access attempt: ${role} tried to access ${attemptedFeature}`);
  
  if (role === 'subUser') {
    // Redirect sub-users to dashboard
    navigate('/dashboard');
  } else {
    // For admin users, this shouldn't happen, but redirect to dashboard as fallback
    navigate('/dashboard');
  }
};