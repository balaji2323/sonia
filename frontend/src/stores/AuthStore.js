import { makeAutoObservable } from 'mobx';
import { apiService } from '../services/apiService';

class AuthStore {
  // Observable state
  user = null;
  token = null;
  isAuthenticated = false;
  isLoading = false;
  error = null;
  isInitialized = false;

  constructor() {
    makeAutoObservable(this);
    this.initializeAuth();
  }

  // Initialize auth from localStorage
  initializeAuth = async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        this.setToken(storedToken);
        this.setUser(JSON.parse(storedUser));
        this.setAuthenticated(true);

        // Validate token by fetching fresh profile
        await this.getProfile();

        // Schedule automatic token refresh
        this.scheduleTokenRefresh();
      } catch (error) {
        console.error('Token validation failed:', error);
        this.logout();
      }
    }
    this.isInitialized = true;
  };

  setUser = (user) => {
    this.user = user;
  };

  setToken = (token) => {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
      apiService.setAuthToken(token); // Ensure API client sends token on requests
      this.scheduleTokenRefresh();
    } else {
      localStorage.removeItem('token');
      apiService.clearAuthToken();
    }
  };

  setAuthenticated = (isAuthenticated) => {
    this.isAuthenticated = isAuthenticated;
  };

  setLoading = (isLoading) => {
    this.isLoading = isLoading;
  };

  setError = (error) => {
    this.error = error;
  };

  clearError = () => {
    this.error = null;
  };

  login = async (credentials) => {
    try {
      this.setLoading(true);
      this.clearError();

      const response = await apiService.post('/auth/login', credentials);
      const { user, token } = response.data;

      this.setUser(user);
      this.setToken(token);
      this.setAuthenticated(true);

      localStorage.setItem('user', JSON.stringify(user));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  };

  register = async (userData) => {
    try {
      this.setLoading(true);
      this.clearError();

      const response = await apiService.post('/auth/register', userData);
      const { user, token } = response.data;

      this.setUser(user);
      this.setToken(token);
      this.setAuthenticated(true);

      localStorage.setItem('user', JSON.stringify(user));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  };

  logout = () => {
    try {
      apiService.post('/auth/logout').catch(() => {
        // Ignore logout API errors
      });
    } catch (error) {
      // Ignore errors
    }

    this.setUser(null);
    this.setToken(null);
    this.setAuthenticated(false);
    this.clearError();

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  getProfile = async () => {
    try {
      const response = await apiService.get('/auth/profile');
      this.setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (error) {
      throw error;
    }
  };

  updateProfile = async (profileData) => {
    try {
      this.setLoading(true);
      this.clearError();

      const response = await apiService.put('/auth/profile', profileData);
      const updatedUser = response.data.user;

      this.setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  };

  changePassword = async (passwordData) => {
    try {
      this.setLoading(true);
      this.clearError();

      await apiService.put('/auth/change-password', passwordData);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  };

  refreshToken = async () => {
    try {
      const response = await apiService.post('/auth/refresh-token');
      const newToken = response.data.token;

      this.setToken(newToken);

      return { success: true };
    } catch (error) {
      this.logout();
      return { success: false };
    }
  };

  get isLoggedIn() {
    return this.isAuthenticated && this.token && this.user;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }

  get userInitials() {
    if (!this.user) return '';
    return this.user.username.charAt(0).toUpperCase();
  }

  get userName() {
    return this.user?.username || '';
  }

  get userEmail() {
    return this.user?.email || '';
  }

  hasPermission = (permission) => {
    if (!this.user) return false;
    if (this.user.role === 'admin') return true;
    return false;
  };

  getAuthHeaders = () => {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  };

  handleTokenExpiration = () => {
    this.setError('Your session has expired. Please login again.');
    this.logout();
  };

  scheduleTokenRefresh = () => {
    if (!this.token) return;

    try {
      const base64Payload = this.token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      // Refresh 5 minutes before expiration or after 1 minute min delay
      const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 60 * 1000);

      setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    } catch (error) {
      console.error('Failed to schedule token refresh:', error);
    }
  };
}


// Create instance and export as default
const authStore = new AuthStore();
export default authStore;


