import { makeAutoObservable, runInAction } from 'mobx';
import { io } from 'socket.io-client';
import apiService from '../services/apiService';
import toast from 'react-hot-toast';

class ChatStore {
  // State
  conversations = [];
  currentConversation = null;
  messages = [];
  isLoading = false;
  isConnected = false;
  isTyping = false;
  error = null;
  socket = null;
  connectionRetries = 0;
  maxRetries = 5; // INCREASED for better reliability
  reconnectTimeout = null;
  heartbeatInterval = null;

  constructor() {
    makeAutoObservable(this);
    
    // Auto-cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  // Setters
  setLoading(val) {
    this.isLoading = val;
  }

  setError(err) {
    this.error = err;
  }

  clearError() {
    this.error = null;
  }

  setConnected(val) {
    this.isConnected = val;
    if (val) {
      this.connectionRetries = 0;
    }
  }

  setTyping(val) {
    this.isTyping = val;
  }

  setConversations(list) {
    this.conversations = Array.isArray(list) ? list : [];
  }

  setCurrentConversation(conv) {
    this.currentConversation = conv;
    if (conv && conv.messages) {
      this.messages = Array.isArray(conv.messages) ? conv.messages : [];
    } else {
      this.messages = [];
    }
  }

  addConversation(conv) {
    if (conv) {
      this.conversations.unshift(conv);
    }
  }

  addMessage(msg) {
    if (msg && this.currentConversation) {
      this.messages.push(msg);
      const now = new Date().toISOString();
      this.currentConversation.lastActivity = now;
    }
  }

  updateConversationTitle(title) {
    if (this.currentConversation && title) {
      this.currentConversation.title = title.substring(0, 100);
    }
  }

  // Load all conversations
  async loadConversations(page = 1, limit = 20) {
    this.setLoading(true);
    this.clearError();

    try {
      const res = await apiService.getConversations({ page, limit });

      runInAction(() => {
        if (res.data.success && res.data.data && res.data.data.conversations) {
          this.setConversations(res.data.data.conversations);
        } else {
          this.setConversations([]);
        }
      });

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to load conversations';
      this.setError(errorMessage);
      
      if (!err.response || err.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      }
      
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // FIXED: Create a new conversation
  async createConversation(title) {
    this.clearError();

    try {
      const res = await apiService.createConversation({ title });

      if (res.data.success && res.data.data && res.data.data.conversation) {
        const newConversation = res.data.data.conversation; // FIXED: Declare outside runInAction

        runInAction(() => {
          this.addConversation(newConversation);
          this.setCurrentConversation(newConversation);
        });

        // Join the conversation room via socket if connected
        if (this.socket?.connected && newConversation.id) {
          this.socket.emit('joinConversation', newConversation.id);
        }

        return { success: true, conversation: newConversation }; // FIXED: Use properly scoped variable
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create conversation';
      this.setError(errorMessage);
      
      if (!err.response || err.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Load a specific conversation
  async loadConversation(conversationId) {
    if (!conversationId) {
      this.setError('Invalid conversation ID');
      return { success: false, error: 'Invalid conversation ID' };
    }

    this.setLoading(true);
    this.clearError();

    try {
      const res = await apiService.getConversation(conversationId);

      if (res.data.success && res.data.data && res.data.data.conversation) {
        const conversation = res.data.data.conversation;

        runInAction(() => {
          this.setCurrentConversation(conversation);
        });

        // Join the conversation room via socket if connected
        if (this.socket?.connected) {
          this.socket.emit('joinConversation', conversationId);
        }

        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to load conversation';
      this.setError(errorMessage);
      
      if (err.response?.status === 404) {
        toast.error('Conversation not found');
      } else if (!err.response || err.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Send a message via API (primary method)
  async sendMessage(message, conversationId = null) {
    if (!message?.trim()) {
      toast.error('Please enter a message');
      return { success: false, error: 'Empty message' };
    }

    this.clearError();

    try {
      // Add user message optimistically
      const tempUserMessage = {
        sender: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        messageType: 'text',
        _temp: true,
        _id: Date.now().toString()
      };

      runInAction(() => {
        this.addMessage(tempUserMessage);
      });

      // Send via API
      const res = await apiService.sendMessage({
        message: message.trim(),
        conversationId: conversationId || this.currentConversation?.id
      });

      if (res.data.success && res.data.data) {
        const { conversation, userMessage } = res.data.data;

        runInAction(() => {
          // Remove temp message
          this.messages = this.messages.filter(msg => !msg._temp);
          
          // Update or set current conversation
          if (!this.currentConversation || this.currentConversation.id !== conversation.id) {
            this.setCurrentConversation(conversation);
            
            // Add to conversations list if not exists
            const existingIndex = this.conversations.findIndex(c => c.id === conversation.id);
            if (existingIndex === -1) {
              this.addConversation(conversation);
            }
          } else {
            // Update existing conversation
            this.currentConversation.messages = conversation.messages;
            this.currentConversation.lastActivity = conversation.lastActivity;
            this.messages = conversation.messages || [];
          }

          // Update conversation title if it was auto-generated
          if (userMessage && !conversationId && conversation.title) {
            this.updateConversationTitle(conversation.title);
          }
        });

        return { success: true, data: res.data.data };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Send message error:', err);
      
      // Remove temp message on error
      runInAction(() => {
        this.messages = this.messages.filter(msg => !msg._temp);
      });

      const errorMessage = err.response?.data?.error || 'Failed to send message';
      this.setError(errorMessage);
      
      if (err.response?.status === 401) {
        // This will be handled by the API service interceptor
      } else if (!err.response || err.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // FIXED: WebSocket connection management
  connectSocket() {
    // Check authentication first
    if (!apiService.isAuthenticated()) {
      this.setError('Login required for real-time chat');
      return;
    }

    // Don't reconnect if already connected
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Clean up existing socket if any
    if (this.socket) {
      console.log('Cleaning up existing socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    try {
      const socketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5000';
      const token = apiService.getToken();
      
      if (!token) {
        this.setError('No authentication token available');
        return;
      }

      console.log('Connecting to WebSocket:', socketUrl);

      // FIXED: Match your backend Socket.IO configuration exactly
      this.socket = io(socketUrl, {
        path: '/socket.io/',             // FIXED: Added trailing slash to match backend
        auth: { token },                 // JWT token for authentication
        transports: ['websocket', 'polling'], // FIXED: Allow both transports for reliability
        reconnection: true,
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,      // Max delay between attempts
        timeout: 20000,                  // Increased timeout
        forceNew: false,                 // FIXED: Allow reuse of connection
        autoConnect: true,
        pingTimeout: 60000,              // Match backend settings
        pingInterval: 25000,             // Match backend settings
        upgradeTimeout: 30000            // Match backend settings
      });

      this.setupSocketEventHandlers();
      
      console.log('Socket initialized with ID:', this.socket.id);
      
    } catch (error) {
      console.error('Socket connection setup error:', error);
      this.setError('Failed to setup chat connection: ' + error.message);
    }
  }

  // FIXED: Better socket event handling
  setupSocketEventHandlers() {
    if (!this.socket) return;

    console.log('Setting up socket event handlers...');

    // FIXED: Connection events with better handling
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      
      runInAction(() => {
        this.setConnected(true);
        this.clearError();
        this.connectionRetries = 0;
      });

      // Join current conversation room if exists
      if (this.currentConversation?.id) {
        this.socket.emit('joinConversation', this.currentConversation.id);
      }

      // Setup heartbeat
      this.setupHeartbeat();

      toast.success('Connected to chat server', { duration: 2000 });
    });

    // FIXED: Better disconnect handling
    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      
      runInAction(() => {
        this.setConnected(false);
        this.setTyping(false);
      });

      this.clearHeartbeat();

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        console.log('Server disconnected, attempting reconnection...');
        this.scheduleReconnection();
      } else if (reason === 'io client disconnect') {
        // Client initiated disconnect, don't reconnect
        console.log('Client disconnected, not reconnecting');
      } else {
        // Other reasons (network issues, etc.)
        console.log('Connection lost, attempting reconnection...');
        this.scheduleReconnection();
      }
    });

    // FIXED: Enhanced error handling
    this.socket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err);
      
      runInAction(() => {
        this.setConnected(false);
        
        // Provide specific error messages
        if (err.message.includes('Authentication')) {
          this.setError('Authentication failed. Please login again.');
          toast.error('Authentication failed. Please login again.');
        } else if (err.message.includes('timeout')) {
          this.setError('Connection timeout. Check your network.');
          toast.error('Connection timeout. Check your network.');
        } else {
          this.setError(`Connection failed: ${err.message}`);
        }
      });

      // Retry connection with exponential backoff
      if (this.connectionRetries < this.maxRetries) {
        this.scheduleReconnection();
      } else {
        console.log('Max connection attempts reached, giving up');
        toast.error('Unable to connect to chat server. Using fallback mode.', { duration: 5000 });
      }
    });

    // FIXED: Better server confirmation handling
    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
      runInAction(() => {
        this.setConnected(true);
        this.clearError();
      });
    });

    // Message events
    this.socket.on('messageSent', (data) => {
      console.log('📨 Message sent confirmation:', data);
      if (data?.message) {
        runInAction(() => {
          // Remove any temp messages and add the confirmed message
          this.messages = this.messages.filter(msg => !msg._temp);
          this.addMessage(data.message);
        });
      }
    });

    this.socket.on('botMessage', (data) => {
      console.log('🤖 Bot message received:', data);
      runInAction(() => {
        this.setTyping(false);
        if (data?.message) {
          this.addMessage(data.message);
        }
      });
    });

    this.socket.on('botTyping', () => {
      console.log('🤖 Bot is typing...');
      runInAction(() => {
        this.setTyping(true);
      });
    });

    this.socket.on('botStoppedTyping', () => {
      console.log('🤖 Bot stopped typing');
      runInAction(() => {
        this.setTyping(false);
      });
    });

    // FIXED: Better error handling
    this.socket.on('error', (err) => {
      console.error('❌ Socket error:', err);
      runInAction(() => {
        this.setError(err.message || 'Socket error occurred');
        this.setTyping(false);
      });
      toast.error(err.message || 'Chat error occurred');
    });

    // Conversation events
    this.socket.on('joinedConversation', (data) => {
      console.log('✅ Joined conversation:', data.conversationId);
    });

    this.socket.on('leftConversation', (data) => {
      console.log('👋 Left conversation:', data.conversationId);
    });

    // FIXED: Handle server errors gracefully
    this.socket.on('serverError', (data) => {
      console.error('❌ Server error:', data);
      toast.error('Server error: ' + (data.message || 'Unknown error'));
    });

    // Handle heartbeat responses
    this.socket.on('heartbeat', (data) => {
      console.log('💓 Heartbeat received:', data.timestamp);
    });
  }

  // FIXED: Better reconnection logic with exponential backoff
  scheduleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.connectionRetries >= this.maxRetries) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.connectionRetries++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.connectionRetries - 1), 16000);
    
    console.log(`📡 Scheduling reconnection ${this.connectionRetries}/${this.maxRetries} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      if (apiService.isAuthenticated() && !this.socket?.connected) {
        console.log(`🔄 Attempting reconnection ${this.connectionRetries}/${this.maxRetries}`);
        this.socket?.connect();
      }
    }, delay);
  }

  // ADDED: Heartbeat functionality
  setupHeartbeat() {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Every 30 seconds
  }

  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // FIXED: Enhanced socket message sending
  async sendMessageViaSocket(message, conversationId = null) {
    if (!message?.trim()) {
      toast.error('Please enter a message');
      return { success: false, error: 'Empty message' };
    }

    // If socket is not connected, use API method
    if (!this.socket?.connected) {
      console.log('📡 Socket not connected, using API method');
      return this.sendMessage(message, conversationId);
    }

    try {
      console.log('📨 Sending message via socket...');

      // Add user message optimistically
      const tempUserMessage = {
        sender: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        messageType: 'text',
        _temp: true,
        _id: Date.now().toString()
      };

      runInAction(() => {
        this.addMessage(tempUserMessage);
      });

      // Emit via socket
      const user = apiService.getCurrentUser();
      this.socket.emit('newMessage', {
        message: message.trim(),
        conversationId: conversationId || this.currentConversation?.id,
        userId: user?.id
      });

      // Set timeout for socket response
      const socketTimeout = setTimeout(() => {
        console.log('⚠️ Socket timeout, falling back to API');
        // Remove temp message and use API
        runInAction(() => {
          this.messages = this.messages.filter(msg => !msg._temp);
        });
        this.sendMessage(message, conversationId);
      }, 10000); // 10 second timeout

      // Clear timeout when message is confirmed
      this.socket.once('messageSent', () => {
        clearTimeout(socketTimeout);
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Socket send error:', error);
      
      // Remove temp message and fallback to API
      runInAction(() => {
        this.messages = this.messages.filter(msg => !msg._temp);
      });
      
      return this.sendMessage(message, conversationId);
    }
  }

  // FIXED: Better disconnect handling
  disconnectSocket() {
    console.log('🔌 Disconnecting socket...');
    
    this.clearHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      
      runInAction(() => {
        this.setConnected(false);
        this.setTyping(false);
        this.connectionRetries = 0;
      });
    }
  }

  // Update conversation
  async updateConversation(conversationId, updates) {
    if (!conversationId || !updates) {
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      const res = await apiService.updateConversation(conversationId, updates);
      
      if (res.data.success) {
        runInAction(() => {
          // Update in conversations list
          const index = this.conversations.findIndex(c => c.id === conversationId);
          if (index !== -1) {
            this.conversations[index] = { ...this.conversations[index], ...updates };
          }
          
          // Update current conversation
          if (this.currentConversation?.id === conversationId) {
            this.currentConversation = { ...this.currentConversation, ...updates };
          }
        });

        return { success: true };
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update conversation';
      this.setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Delete conversation
  async deleteConversation(conversationId) {
    if (!conversationId) {
      return { success: false, error: 'Invalid conversation ID' };
    }

    try {
      await apiService.deleteConversation(conversationId);
      
      runInAction(() => {
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        
        if (this.currentConversation?.id === conversationId) {
          this.setCurrentConversation(null);
        }
      });

      toast.success('Conversation deleted');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete conversation';
      this.setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // FIXED: Better cleanup
  cleanup() {
    console.log('🧹 Cleaning up chat store...');
    
    this.disconnectSocket();
    
    runInAction(() => {
      this.conversations = [];
      this.currentConversation = null;
      this.messages = [];
      this.clearError();
      this.setLoading(false);
      this.setTyping(false);
    });
  }

  // FIXED: Better initialization
  async initialize() {
    console.log('🚀 Initializing chat store...');
    
    if (apiService.isAuthenticated()) {
      try {
        // Load conversations first
        const result = await this.loadConversations();
        
        if (result.success) {
          console.log('✅ Conversations loaded successfully');
        }
        
        // Then connect to WebSocket for real-time features
        setTimeout(() => {
          this.connectSocket();
        }, 500); // Small delay to ensure API is ready
        
      } catch (error) {
        console.error('❌ Failed to initialize chat store:', error);
        this.setError('Failed to initialize chat');
      }
    } else {
      console.log('⚠️ User not authenticated, skipping chat initialization');
    }
  }

  // ADDED: Manual reconnection method
  reconnect() {
    console.log('🔄 Manual reconnection triggered');
    this.connectionRetries = 0;
    this.clearError();
    this.connectSocket();
  }

  // Getters
  get hasActiveConnection() {
    return this.isConnected && this.socket?.connected;
  }

  get connectionStatus() {
    if (this.isConnected && this.socket?.connected) return 'connected';
    if (this.connectionRetries > 0 && this.connectionRetries < this.maxRetries) return 'reconnecting';
    if (this.connectionRetries >= this.maxRetries) return 'failed';
    return 'disconnected';
  }

  get connectionStatusText() {
    switch (this.connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return `Reconnecting... (${this.connectionRetries}/${this.maxRetries})`;
      case 'failed':
        return 'Connection failed';
      default:
        return 'Disconnected';
    }
  }

  get isInitialized() {
    return this.conversations.length > 0 || !apiService.isAuthenticated();
  }
}

// Create and export singleton instance

// Create instance and export as default  
const chatStore = new ChatStore();
export default chatStore;

