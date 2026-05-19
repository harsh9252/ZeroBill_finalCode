import { API_BASE_URL } from '../utils/api';

class SubUserService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/sub-users`;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Get auth headers
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Create new sub-user
  async createSubUser(subUserData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(subUserData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create sub-user');
      }

      return data;
    } catch (error) {
      console.error('Create sub-user error:', error);
      throw error;
    }
  }

  // Get all sub-users for the authenticated parent user
  async getSubUsers() {
    try {
      const response = await fetch(this.baseURL, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch sub-users');
      }

      return data;
    } catch (error) {
      console.error('Get sub-users error:', error);
      throw error;
    }
  }

  // Get sub-user by ID
  async getSubUser(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch sub-user');
      }

      return data;
    } catch (error) {
      console.error('Get sub-user error:', error);
      throw error;
    }
  }

  // Update sub-user
  async updateSubUser(id, subUserData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(subUserData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update sub-user');
      }

      return data;
    } catch (error) {
      console.error('Update sub-user error:', error);
      throw error;
    }
  }

  // Delete sub-user
  async deleteSubUser(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete sub-user');
      }

      return data;
    } catch (error) {
      console.error('Delete sub-user error:', error);
      throw error;
    }
  }

  // Change sub-user password
  async changeSubUserPassword(id, newPassword) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Sub-user login
  async subUserLogin(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return data;
    } catch (error) {
      console.error('Sub-user login error:', error);
      throw error;
    }
  }

  // Toggle sub-user status
  async toggleSubUserStatus(id, isActive) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to toggle status');
      }

      return data;
    } catch (error) {
      console.error('Toggle sub-user status error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subUserService = new SubUserService();
export default SubUserService;