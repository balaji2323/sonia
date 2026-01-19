import axios from 'axios';
import toast from 'react-hot-toast';

class ApiService {
  constructor() {
    // FIXED: Better base URL handling and timeout configuration
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false,
    });

    // Track connection status
    this.isOnline = true;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.rateLimitedUntil = null; // Track rate limit expiry

    this.setupInterceptors();
    this.setupNetworkMonitoring();
    
    console.log('🔧 API Service initialized with base URL:', this.baseURL);
  }

  setupInterceptors() {
    // FIXED: Enhanced request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Check if we're still rate limited
        if (this.rateLimitedUntil && Date.now() < this.rateLimitedUntil) {
          const remainingTime = Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
          throw new Error(`Rate limited. Please wait ${remainingTime} more seconds.`);
        }

        // Add timestamp to prevent caching
        config.params = {
          ...config.params,
          _t: Date.now()
        };

        // Attach token if available
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📤 API Request:', {
            method: config.method.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            hasAuth: !!config.headers.Authorization
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // FIXED: Enhanced response interceptor with better error handling
    this.api.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ API Response:', {
            method: response.config.method.toUpperCase(),
            url: response.config.url,
            status: response.status,
            success: response.data?.success
          });
        }

        // Reset connection retry count on successful response
        this.connectionRetries = 0;
        this.isOnline = true;
        this.rateLimitedUntil = null; // Clear rate limit on success

        return response;
      },
      async (error) => {
        const { response, request, message, code } = error;
        
        // Log error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ API Error:', {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            status: response?.status,
            message: response?.data?.error || message,
            code: response?.data?.code || code,
            fullResponse: response?.data // Add full response for debugging
          });
        }

        // Handle different error scenarios
        if (response) {
          // Server responded with error status
          await this.handleHttpError(error);
        } else if (request) {
          // Network error or no response
          await this.handleNetworkError(error);
        } else {
          // Request setup error
          console.error('❌ Request setup error:', message);
          toast.error('Request configuration error');
        }

        return Promise.reject(error);
      }
    );
  }

  // ADDED: Network monitoring
  setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🟢 Network connection restored');
        this.isOnline = true;
        this.connectionRetries = 0;
        this.rateLimitedUntil = null;
        toast.success('Connection restored', { duration: 2000 });
      });

      window.addEventListener('offline', () => {
        console.log('🔴 Network connection lost');
        this.isOnline = false;
        toast.error('Network connection lost', { duration: 3000 });
      });
    }
  }

  // FIXED: Better HTTP error handling with proper validation error parsing
  async handleHttpError(error) {
    const { response } = error;
    const status = response.status;
    const data = response.data;
    const errorMessage = data?.error || data?.message || 'An error occurred';
    const errorCode = data?.code;

    switch (status) {
      case 400:
        if (errorCode === 'VALIDATION_ERROR') {
          // FIXED: Properly extract validation error messages
          let details = 'Validation failed';
          if (data.details && Array.isArray(data.details)) {
            // Handle array of error objects from express-validator or mongoose
            details = data.details.map(detail => {
              if (typeof detail === 'string') {
                return detail;
              } else if (detail.msg || detail.message) {
                return detail.msg || detail.message;
              } else if (detail.field && detail.message) {
                return `${detail.field}: ${detail.message}`;
              } else if (detail.path && detail.message) {
                return `${detail.path}: ${detail.message}`;
              } else {
                // Handle any other object format
                return JSON.stringify(detail);
              }
            }).join(', ');
          } else if (typeof data.details === 'string') {
            details = data.details;
          } else if (data.details) {
            // Handle single object
            if (data.details.msg || data.details.message) {
              details = data.details.msg || data.details.message;
            } else {
              details = JSON.stringify(data.details);
            }
          }
          
          console.error('🔍 Validation Error Details:', { data, details });
          toast.error(`Validation Error: ${details}`, { duration: 6000 });
        } else {
          toast.error(`Bad Request: ${errorMessage}`);
        }
        break;

      case 401:
        await this.handleAuthenticationError(errorCode, errorMessage);
        break;

      case 403:
        toast.error('Access denied. You don\'t have permission.');
        break;

      case 404:
        // Don't show toast for health check 404s
        if (!error.config?.url?.includes('/health')) {
          toast.error('Resource not found');
        }
        break;

      case 409:
        toast.error(`Conflict: ${errorMessage}`);
        break;

      case 413:
        toast.error('File too large');
        break;

      case 422:
        toast.error(`Invalid data: ${errorMessage}`);
        break;

      case 429:
        await this.handleRateLimitError(data);
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        await this.handleServerError(status, errorMessage);
        break;

      default:
        toast.error(`HTTP Error ${status}: ${errorMessage}`);
    }
  }

  // ADDED: Handle rate limit errors specifically
  async handleRateLimitError(data) {
    const retryAfter = data.retryAfter || 60;
    const retryAfterMs = retryAfter * 1000;
    
    // Set rate limit expiry time
    this.rateLimitedUntil = Date.now() + retryAfterMs;
    
    console.error('❌ Rate limit exceeded:', {
      retryAfter,
      retryAfterMs,
      rateLimitedUntil: new Date(this.rateLimitedUntil).toLocaleTimeString()
    });

    // Show user-friendly message
    if (retryAfter > 300) { // More than 5 minutes
      const minutes = Math.ceil(retryAfter / 60);
      toast.error(`Too many requests. Please try again in ${minutes} minutes.`, {
        duration: 10000
      });
    } else if (retryAfter > 60) { // More than 1 minute
      const minutes = Math.ceil(retryAfter / 60);
      toast.error(`Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`, {
        duration: 8000
      });
    } else {
      toast.error(`Too many requests. Please wait ${retryAfter} seconds.`, {
        duration: 5000
      });
    }

    // Optional: Show countdown
    this.showRateLimitCountdown(retryAfter);
  }

  // ADDED: Show countdown for rate limit
  showRateLimitCountdown(initialSeconds) {
    if (initialSeconds <= 30) { // Only show for short waits
      let remainingSeconds = initialSeconds;
      
      const countdown = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
          clearInterval(countdown);
          toast.success('Rate limit lifted. You can try again now.', { duration: 3000 });
        } else if (remainingSeconds <= 10) {
          // Show final countdown
          console.log(`Rate limit countdown: ${remainingSeconds}s`);
        }
      }, 1000);
    }
  }

  // FIXED: Better authentication error handling
  async handleAuthenticationError(errorCode, errorMessage) {
    let message = 'Authentication failed. Please login again.';
    
    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        message = 'Your session has expired. Please login again.';
        break;
      case 'TOKEN_MISSING':
        message = 'Access token required. Please login.';
        break;
      case 'TOKEN_INVALID':
        message = 'Invalid token. Please login again.';
        break;
      case 'USER_NOT_FOUND':
        message = 'User account not found. Please register.';
        break;
      case 'INVALID_CREDENTIALS':
        message = 'Invalid email or password. Please check your credentials.';
        break;
      default:
        message = errorMessage || message;
    }

    this.handleTokenExpiration(message);
  }

  // FIXED: Better server error handling with retry logic
  async handleServerError(status, errorMessage) {
    const serverErrorMessages = {
      500: 'Internal server error',
      502: 'Bad gateway - server unavailable',
      503: 'Service temporarily unavailable',
      504: 'Gateway timeout'
    };

    const message = serverErrorMessages[status] || 'Server error';
    
    console.error(`❌ Server error ${status}:`, errorMessage);

    // Implement retry logic for certain endpoints
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      console.log(`🔄 Server error, retry ${this.connectionRetries}/${this.maxRetries}`);
      
      toast.error(`${message}. Retrying... (${this.connectionRetries}/${this.maxRetries})`, {
        duration: 3000
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionRetries));
    } else {
      toast.error(`${message}. Please try again later.`, { duration: 5000 });
    }
  }

  // FIXED: Better network error handling
  async handleNetworkError(error) {
    const { code, message } = error;
    
    this.isOnline = false;

    if (code === 'ECONNABORTED' || message.includes('timeout')) {
      toast.error('Request timeout. Please check your connection and try again.');
    } else if (code === 'NETWORK_ERROR' || code === 'ERR_NETWORK') {
      toast.error('Network error. Please check your internet connection.');
    } else if (code === 'ECONNREFUSED' || message.includes('refused')) {
      toast.error('Cannot connect to server. Please try again later.');
    } else {
      toast.error('Connection failed. Please check your network.');
    }

    console.error('❌ Network error:', { code, message });
  }

  // FIXED: Better token expiration handling
  handleTokenExpiration(message = 'Session expired. Please login again.') {
    console.log('🔑 Token expired, clearing auth data');
    
    // Clear all auth data
    this.clearAuthToken();
    
    // Show error message
    toast.error(message, { duration: 5000 });
    
    // Redirect to login page if not already there
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/register') {
      console.log('🔀 Redirecting to login page');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }

  // FIXED: Better token management
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      console.log('🔑 Auth token set successfully');
    } else {
      console.error('❌ Attempted to set empty token');
    }
  }

  clearAuthToken() {
    delete this.api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.rateLimitedUntil = null; // Clear rate limit on logout
    console.log('🧹 Auth token cleared');
  }

  // FIXED: Enhanced HTTP methods with retry logic and better error handling
  async get(url, config = {}) {
    return await this.executeWithRetry('GET', url, null, config);
  }

  async post(url, data = {}, config = {}) {
    return await this.executeWithRetry('POST', url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return await this.executeWithRetry('PUT', url, data, config);
  }

  async delete(url, config = {}) {
    return await this.executeWithRetry('DELETE', url, null, config);
  }

  // ENHANCED: Execute with retry logic and rate limit awareness
  async executeWithRetry(method, url, data = null, config = {}, retryCount = 0) {
    try {
      // Check rate limit before making request
      if (this.rateLimitedUntil && Date.now() < this.rateLimitedUntil) {
        const remainingTime = Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
        throw new Error(`Rate limited. Please wait ${remainingTime} more seconds.`);
      }

      const axiosConfig = { ...config };
      
      // Set longer timeout for file uploads
      if (config.headers && config.headers['Content-Type'] === 'multipart/form-data') {
        axiosConfig.timeout = 120000; // 2 minutes for uploads
      }

      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await this.api.get(url, axiosConfig);
          break;
        case 'post':
          response = await this.api.post(url, data, axiosConfig);
          break;
        case 'put':
          response = await this.api.put(url, data, axiosConfig);
          break;
        case 'delete':
          response = await this.api.delete(url, axiosConfig);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response;
    } catch (error) {
      // Don't retry rate limit errors
      if (error.response?.status === 429) {
        throw error;
      }

      // Retry logic for specific errors
      const shouldRetry = this.shouldRetryRequest(error, retryCount);
      
      if (shouldRetry) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 second delay
        console.log(`🔄 Retrying ${method} ${url} in ${delay}ms (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.executeWithRetry(method, url, data, config, retryCount + 1);
      }

      throw error;
    }
  }

  // ENHANCED: Determine if request should be retried (exclude rate limits)
  shouldRetryRequest(error, retryCount) {
    if (retryCount >= this.maxRetries) return false;

    const { response, code } = error;

    // Don't retry client errors (4xx) including rate limits
    if (response && response.status >= 400 && response.status < 500) {
      return false;
    }

    // Retry for network errors or server errors (5xx)
    return (
      !response || // Network error
      response.status >= 500 || // Server error
      code === 'ECONNABORTED' || // Timeout
      code === 'NETWORK_ERROR' || // Network error
      code === 'ERR_NETWORK' // Network error
    );
  }

  // ENHANCED: Better login with test credentials hint and error handling
  async login(credentials) {
    try {
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      console.log('🔑 Attempting login...');
      const response = await this.post('/auth/login', credentials);
      
      if (response.data.success && response.data.token) {
        this.setAuthToken(response.data.token);
        
        if (response.data.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          console.log('✅ Login successful for user:', response.data.data.user.username);
        }

        toast.success('Login successful!', { duration: 3000 });
      } else {
        throw new Error('Invalid response format');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Show helpful message for development
      if (process.env.NODE_ENV === 'development' && error.response?.status === 401) {
        console.log('💡 Available test accounts:');
        console.log('   👑 Admin: admin@example.com / admin123');
        console.log('   👤 User: test@example.com / test123');
        console.log('   👤 User: john@example.com / john123');
        console.log('   👤 User: jane@example.com / jane123');
        console.log('   👤 User: demo@example.com / demo123');
        
        // Don't show toast here as it's handled by the error interceptor
      }
      
      throw error;
    }
  }

  // ENHANCED: Better registration
  async register(userData) {
    try {
      if (!userData.email || !userData.password || !userData.username) {
        throw new Error('Email, username, and password are required');
      }

      console.log('📝 Attempting registration...');
      const response = await this.post('/auth/register', userData);
      
      if (response.data.success && response.data.token) {
        this.setAuthToken(response.data.token);
        
        if (response.data.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          console.log('✅ Registration successful for user:', response.data.data.user.username);
        }

        toast.success('Registration successful!', { duration: 3000 });
      } else {
        throw new Error('Invalid response format');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      console.log('👤 Fetching user profile...');
      const response = await this.get('/auth/profile');
      
      // Update local user data if successful
      if (response.data.success && response.data.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error;
    }
  }

  // FIXED: Enhanced chat methods
  async getConversations(params = {}) {
    try {
      console.log('💬 Fetching conversations...');
      return await this.get('/chat/conversations', { params });
    } catch (error) {
      console.error('❌ Get conversations error:', error);
      throw error;
    }
  }

  async createConversation(data) {
    try {
      console.log('➕ Creating conversation...');
      return await this.post('/chat/conversations', data);
    } catch (error) {
      console.error('❌ Create conversation error:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      console.log('💬 Fetching conversation:', conversationId);
      return await this.get(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error('❌ Get conversation error:', error);
      throw error;
    }
  }

  async sendMessage(messageData) {
    try {
      if (!messageData.message?.trim()) {
        throw new Error('Message content is required');
      }

      console.log('📨 Sending message...');
      return await this.post('/chat/messages', messageData);
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  }

  async updateConversation(conversationId, updates) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      console.log('✏️ Updating conversation:', conversationId);
      return await this.put(`/chat/conversations/${conversationId}`, updates);
    } catch (error) {
      console.error('❌ Update conversation error:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      console.log('🗑️ Deleting conversation:', conversationId);
      return await this.delete(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error('❌ Delete conversation error:', error);
      throw error;
    }
  }

  // FIXED: Enhanced file upload with progress tracking
  async uploadFiles(endpoint, files, data = {}, onProgress = null) {
    try {
      if (!files || (Array.isArray(files) && files.length === 0)) {
        throw new Error('No files provided for upload');
      }

      console.log('📤 Uploading files to:', endpoint);

      const formData = new FormData();
      
      // Append files
      if (Array.isArray(files)) {
        files.forEach((file, index) => {
          if (file instanceof File) {
            formData.append('files', file);
            console.log(`📎 Added file ${index + 1}:`, file.name);
          }
        });
      } else if (files instanceof File) {
        formData.append('files', files);
        console.log('📎 Added file:', files.name);
      }
      
      // Append other data
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for file uploads
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`📤 Upload progress: ${percentCompleted}%`);
          onProgress(percentCompleted);
        };
      }

      const response = await this.post(endpoint, formData, config);
      console.log('✅ File upload successful');
      return response;
    } catch (error) {
      console.error('❌ File upload error:', error);
      throw error;
    }
  }

  // ENHANCED: Better health check
  async testConnection() {
    try {
      console.log('🧪 Testing API connection...');
      
      // Extract base URL without /api suffix for health endpoint
      const baseUrl = this.baseURL.replace('/api', '');
      
      // Multiple endpoints to try in order of preference
      const healthEndpoints = [
        { url: '/health', base: baseUrl },
        { url: '/api/health', base: this.baseURL.replace('/api', '') },
        { url: '/health', base: this.baseURL },
        { url: '', base: baseUrl } // Root endpoint as last resort
      ];

      let lastError = null;
      
      for (const endpoint of healthEndpoints) {
        try {
          console.log(`🔍 Trying health endpoint: ${endpoint.base}${endpoint.url}`);
          
          // Create a temporary axios instance with different base URL
          const tempApi = axios.create({
            baseURL: endpoint.base,
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            }
          });

          // Add auth token if available
          const token = this.getToken();
          if (token) {
            tempApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }

          const response = await tempApi.get(endpoint.url);
          
          console.log('✅ API connection test successful via:', endpoint.url);
          
          const data = response.data;

          return {
            success: true,
            message: data.message || 'API connection successful',
            data: data,
            baseURL: this.baseURL,
            endpoint: endpoint.url,
            serverInfo: {
              environment: data.environment,
              uptime: data.server?.uptime,
              database: data.database?.status,
              services: data.services,
              testCredentials: data.testCredentials
            }
          };
        } catch (error) {
          lastError = error;
          console.log(`❌ Endpoint ${endpoint.url} failed:`, error.message);
          continue;
        }
      }
      
      // If all endpoints failed, throw the last error
      throw lastError;
      
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      
      let message = 'API connection failed';
      let details = {};

      if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
        message = 'Cannot reach the server. Please check if the backend is running.';
        details.suggestion = 'Make sure your backend server is started on the correct port';
      } else if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused. Backend server is not running.';
        details.suggestion = 'Start your backend server with: npm run dev';
      } else if (error.response?.status === 404) {
        message = 'Health endpoint not found. Please check the API configuration.';
        details.suggestion = 'Add a health check endpoint to your backend server';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        message = 'Connection timeout. The server might be slow or unreachable.';
        details.suggestion = 'Check your network connection and server status';
      } else if (error.response?.status === 401) {
        message = 'Authentication required for health check.';
        details.authRequired = true;
      } else if (error.response?.status >= 500) {
        message = 'Server error during health check.';
        details.serverError = true;
      }

      return {
        success: false,
        message,
        error: error.message || 'Unknown error',
        baseURL: this.baseURL,
        details: {
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          ...details
        }
      };
    }
  }

  // ADDED: Check if currently rate limited
  isRateLimited() {
    return this.rateLimitedUntil && Date.now() < this.rateLimitedUntil;
  }

  // ADDED: Get remaining rate limit time
  getRateLimitRemaining() {
    if (!this.rateLimitedUntil) return 0;
    const remaining = Math.max(0, this.rateLimitedUntil - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }

  // ENHANCED: Get connection status including rate limit
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      baseURL: this.baseURL,
      isAuthenticated: this.isAuthenticated(),
      retries: this.connectionRetries,
      maxRetries: this.maxRetries,
      isRateLimited: this.isRateLimited(),
      rateLimitRemaining: this.getRateLimitRemaining()
    };
  }

  // ADDED: Clear rate limit manually (for development)
  clearRateLimit() {
    this.rateLimitedUntil = null;
    console.log('🔓 Rate limit cleared manually');
    toast.success('Rate limit cleared');
  }

  // FIXED: Enhanced utility methods
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) {
      return false;
    }

    // Check if token is expired (if it contains expiration info)
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
        console.log('🔑 Token expired, clearing auth data');
        this.clearAuthToken();
        return false;
      }
    } catch (e) {
      // Token format error, assume valid for now
      console.warn('⚠️ Unable to parse token expiration');
    }

    return true;
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return user && typeof user === 'object' ? user : null;
    } catch (error) {
      console.error('❌ Error parsing user from localStorage:', error);
      localStorage.removeItem('user'); // Clear corrupted data
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  // FIXED: Enhanced logout method
  logout() {
    console.log('👋 Logging out user');
    
    this.clearAuthToken();
    this.connectionRetries = 0;
    
    toast.success('Logged out successfully');
    
    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }

  // ADDED: Manual retry method
  resetRetries() {
    this.connectionRetries = 0;
    console.log('🔄 Connection retry count reset');
  }

  // ADDED: Get detailed connection info
  async getConnectionInfo() {
    const connectionTest = await this.testConnection();
    
    return {
      api: connectionTest,
      config: {
        baseURL: this.baseURL,
        timeout: this.api.defaults.timeout,
        authenticated: this.isAuthenticated()
      },
      status: this.getConnectionStatus(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
        websocketUrl: process.env.REACT_APP_WEBSOCKET_URL
      }
    };
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

// Enhanced connection test on initialization in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    console.log('🚀 Running initial API connection test...');
    
    const result = await apiService.testConnection();
    
    if (result.success) {
      console.log('✅ API Service ready:', result.message);
      console.log('🔐 Test credentials:');
      console.log('   👑 Admin: admin@example.com / admin123');
      console.log('   👤 User: test@example.com / test123');
      console.log('   👤 User: john@example.com / john123');
      console.log('   👤 User: jane@example.com / jane123');
      console.log('   👤 User: demo@example.com / demo123');
      
      if (result.serverInfo) {
        console.log('📊 Server info:', result.serverInfo);
      }
    } else {
      console.error('❌ API Service connection failed:', result.message);
      if (result.details?.suggestion) {
        console.log('💡 Suggestion:', result.details.suggestion);
      }
    }
  }, 1000);
}

export { apiService };
export default apiService;
