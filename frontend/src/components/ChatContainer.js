import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Send, Plus, LogOut, Settings, MessageSquare, Download,
  Trash2, Upload, Bot
} from 'lucide-react';
// FIXED: Use default imports
import authStore from '../stores/AuthStore';
import chatStore from '../stores/ChatStore';
import MessageBubble from './MessageBubble';
import UploadForm from './UploadForm';
import toast from 'react-hot-toast';
// FIXED: Correct import paths
import ConnectionStatus from './ConnectionStatus';
import DebugPanel from './DebugPanel';

const ChatContainer = observer(() => {
  const [message, setMessage] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when messages change (length only)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStore.messages.length]);

  useEffect(() => {
    messageInputRef.current?.focus();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || chatStore.isLoading) return;

    const text = message.trim();
    setMessage('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const result = await chatStore.sendMessage(text, chatStore.currentConversation?.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        /* typing stopped */
      }, 3000);
    }
  };

  const handleNewConversation = async () => {
    try {
      const result = await chatStore.createConversation();
      if (result.success) {
        toast.success('New conversation started');
      } else {
        toast.error(result.error || 'Failed to create new conversation');
      }
    } catch (error) {
      console.error('Create conversation error:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const result = await chatStore.deleteConversation(conversationId);
      if (result.success) {
        toast.success('Conversation deleted');
      } else {
        toast.error(result.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Delete conversation error:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleExportConversation = async (conversationId) => {
    toast.info('Export feature coming soon');
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    authStore.logout();
    chatStore.cleanup();
    toast.success('Logged out successfully');
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">
              {authStore.user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="username">{authStore.user?.username || 'User'}</span>
              <span className="user-email">{authStore.user?.email || ''}</span>
            </div>
          </div>
          {/* IMPROVED: Use enhanced connection status */}
          <div className="connection-status">
            <ConnectionStatus />
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            className="new-chat-button"
            onClick={handleNewConversation}
            disabled={chatStore.isLoading}
          >
            <Plus size={20}/> <span>New Chat</span>
          </button>
          {authStore.user?.role === 'admin' && (
            <button className="upload-button" onClick={() => setShowUploadForm(true)}>
              <Upload size={20}/> <span>Upload FAQ</span>
            </button>
          )}
        </div>

        <div className="conversations-list">
          <h3>Recent Conversations</h3>
          {chatStore.isLoading && chatStore.conversations.length === 0 ? (
            <div className="loading-conversations">
              <div className="spinner"></div><span>Loading...</span>
            </div>
          ) : chatStore.conversations.length === 0 ? (
            <div className="no-conversations">
              <MessageSquare size={48}/>
              <p>No conversations yet</p>
              <p>Start a new chat to begin</p>
            </div>
          ) : (
            <div className="conversations-scroll">
              {chatStore.conversations.map(conv => (
                <div
                  key={conv.id || conv._id}
                  className={`conversation-item ${
                    (chatStore.currentConversation?.id === conv.id) ||
                    (chatStore.currentConversation?._id === conv._id)
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => chatStore.loadConversation(conv.id || conv._id)}
                >
                  <div className="conversation-content">
                    <h4>{conv.title}</h4>
                    <p>{conv.messageCount || conv.messages?.length || 0} messages</p>
                    <span className="conversation-date">
                      {new Date(conv.lastActivity || conv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="conversation-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportConversation(conv.id || conv._id); }}
                      title="Export"
                    >
                      <Download size={16}/>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id || conv._id); }}
                      title="Delete"
                      className="delete-button"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="settings-button" onClick={() => setShowSettings(true)}>
            <Settings size={20}/> <span>Settings</span>
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={20}/> <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {chatStore.currentConversation ? (
          <>
            <div className="chat-header">
              <h2>{chatStore.currentConversation.title}</h2>
              <div className="chat-info">
                <span>{chatStore.messages.length} messages</span>
                {chatStore.isTyping && (
                  <span className="typing-indicator">AI is typing...</span>
                )}
              </div>
            </div>

            <div className="messages-container">
              {chatStore.messages.length === 0 ? (
                <div className="empty-chat">
                  <Bot size={64}/> 
                  <h3>How can I help you today?</h3>
                  <p>Start by typing a message below</p>
                </div>
              ) : (
                <div className="messages-list">
                  {chatStore.messages.map((msg, i) => (
                    <MessageBubble
                      key={msg._id || msg.id || i}
                      message={msg}
                      isUser={msg.sender === 'user'}
                    />
                  ))}
                  {chatStore.isTyping && (
                    <div className="typing-bubble">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef}/>
            </div>

            <div className="message-input-container">
              <form onSubmit={handleSendMessage} className="message-form">
                <div className="input-wrapper">
                  <textarea
                    ref={messageInputRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    maxLength={4000}
                    disabled={chatStore.isLoading}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={!message.trim() || chatStore.isLoading}
                  >
                    <Send size={20}/>
                  </button>
                </div>
                <div className="input-footer">
                  <span className="character-count">{message.length}/4000</span>
                  <span className="connection-indicator">
                    {chatStore.connectionStatus === 'connected' ? (
                      <span className="text-green-600">🟢 Connected</span>
                    ) : chatStore.connectionStatus === 'reconnecting' ? (
                      <span className="text-yellow-600">🟡 Reconnecting...</span>
                    ) : (
                      <span className="text-red-600">🔴 Disconnected</span>
                    )}
                  </span>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <MessageSquare size={96}/>
            <h2>Welcome to AI Customer Support</h2>
            <p>Select a conversation or start a new chat</p>
            <button className="start-chat-button" onClick={handleNewConversation}>
              <Plus size={20}/> Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* ADDED: Debug Panel */}
      <DebugPanel />

      {/* Upload Form Modal */}
      {showUploadForm && <UploadForm onClose={() => setShowUploadForm(false)}/>}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h4>Profile</h4>
                <p><strong>Username:</strong> {authStore.user?.username}</p>
                <p><strong>Email:</strong> {authStore.user?.email}</p>
                <p><strong>Role:</strong> {authStore.user?.role}</p>
              </div>
              <div className="settings-section">
                <h4>Connection</h4>
                <p><strong>Status:</strong> {chatStore.connectionStatus}</p>
                <p><strong>Server:</strong> {process.env.REACT_APP_API_BASE_URL}</p>
                <p><strong>WebSocket:</strong> {process.env.REACT_APP_WEBSOCKET_URL}</p>
              </div>
              <div className="settings-section">
                <h4>Actions</h4>
                <button 
                  className="btn-secondary"
                  onClick={() => chatStore.reconnect()}
                >
                  Reconnect WebSocket
                </button>
                <button 
                  className="btn-secondary ml-2"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(chatStore.error || authStore.error) && (
        <div className="error-banner">
          <span>{chatStore.error || authStore.error}</span>
          <button onClick={() => { chatStore.clearError(); authStore.clearError(); }}>×</button>
        </div>
      )}
    </div>
  );
});

export default ChatContainer;
