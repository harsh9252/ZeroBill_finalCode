/**
 * Test file for role-based access control utilities
 * This is a simple test to verify the role utils work correctly
 */

import { isAdminUser, isSubUser, hasPermission, getUserRole } from './roleUtils.js';

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = mockLocalStorage;

describe('Role Utils', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockClear();
  });

  describe('isAdminUser', () => {
    test('should return true for admin user', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'admin';
        if (key === 'user') return JSON.stringify({ isSubUser: false });
        return null;
      });

      expect(isAdminUser()).toBe(true);
    });

    test('should return false for sub user', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'subUser';
        if (key === 'user') return JSON.stringify({ isSubUser: true });
        return null;
      });

      expect(isAdminUser()).toBe(false);
    });
  });

  describe('hasPermission', () => {
    test('should allow admin to manage users', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'admin';
        if (key === 'user') return JSON.stringify({ isSubUser: false });
        return null;
      });

      expect(hasPermission('manageUsers')).toBe(true);
    });

    test('should not allow sub user to manage users', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'subUser';
        if (key === 'user') return JSON.stringify({ isSubUser: true });
        return null;
      });

      expect(hasPermission('manageUsers')).toBe(false);
    });

    test('should allow admin to create business', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'admin';
        if (key === 'user') return JSON.stringify({ isSubUser: false });
        return null;
      });

      expect(hasPermission('createBusiness')).toBe(true);
    });

    test('should not allow sub user to create business', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userType') return 'subUser';
        if (key === 'user') return JSON.stringify({ isSubUser: true });
        return null;
      });

      expect(hasPermission('createBusiness')).toBe(false);
    });
  });
});