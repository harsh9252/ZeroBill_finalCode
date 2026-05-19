import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminUser, hasPermission, handleUnauthorizedAccess } from '../utils/roleUtils';

/**
 * Higher-order component for role-based access control
 @param {React.Component} WrappedComponent - Component to wrap
 @param {string|array} requiredPermissions - Required permission(s) to access the component
 @param {string} redirectTo - Where to redirect if access is denied (default: '/dashboard')
 */
export const withRoleBasedAccess = (WrappedComponent, requiredPermissions, redirectTo = '/dashboard') => {
  return function RoleProtectedComponent(props) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Check if user has any of the required permissions
    const hasAccess = permissions.some(permission => hasPermission(permission));
    
    if (!hasAccess) {
      console.warn(`Access denied: User lacks required permissions: ${permissions.join(', ')}`);
      return <Navigate to={redirectTo} replace />;
    }
    
    return <WrappedComponent {...props} />;
  };
};

/**
 * Component that conditionally renders children based on user role
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to render if access is granted
 * @param {string|array} props.requiredPermissions - Required permission(s)
 * @param {React.ReactNode} props.fallback - Content to render if access is denied
 * @param {boolean} props.adminOnly - If true, only admin users can see content
 * @param {boolean} props.subUserOnly - If true, only sub-users can see content
 */
export const RoleBasedAccess = ({ 
  children, 
  requiredPermissions, 
  fallback = null, 
  adminOnly = false, 
  subUserOnly = false 
}) => {
  let hasAccess = true;
  
  // Check admin-only access
  if (adminOnly && !isAdminUser()) {
    hasAccess = false;
  }
  
  // Check sub-user-only access
  if (subUserOnly && isAdminUser()) {
    hasAccess = false;
  }
  
  // Check specific permissions
  if (requiredPermissions && hasAccess) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    hasAccess = permissions.some(permission => hasPermission(permission));
  }
  
  return hasAccess ? children : fallback;
};

/**
 * Hook for role-based access control
 * @param {string|array} requiredPermissions - Required permission(s)
 * @returns {object} Object with access information
 */
export const useRoleBasedAccess = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const hasAccess = permissions.some(permission => hasPermission(permission));
  const userRole = isAdminUser() ? 'admin' : 'subUser';
  
  return {
    hasAccess,
    userRole,
    isAdmin: isAdminUser(),
    isSubUser: !isAdminUser(),
    deniedPermissions: permissions.filter(permission => !hasPermission(permission))
  };
};