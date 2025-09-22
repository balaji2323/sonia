import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Toaster } from 'react-hot-toast';

// Stores
import authStore from './stores/AuthStore';
import chatStore from './stores/ChatStore';

// Components
import LoginForm from './components/LoginForm';
import ChatContainer from './components/ChatContainer';
import LoadingSpinner from './components/LoadingSpinner';

// Styles
import './styles/modern-chat-theme.css';

const App = observer(() => {
  const [appReady, setAppReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [uiEnhanced, setUiEnhanced] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // Initialize UI enhancements
  useEffect(() => {
    const initializeUIEnhancements = () => {
      try {
        // Add theme detection
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          document.body.classList.add('dark-theme');
        }

        // Initialize basic UI enhancements
        const style = document.createElement('style');
        style.id = 'app-enhancements';
        style.textContent = `
          /* Enhanced animations */
          .message-bubble {
            animation: slideInUp 0.3s ease-out;
            opacity: 0;
            animation-fill-mode: forwards;
          }
          
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Loading dots animation */
          .loading-dots span {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            margin: 0 2px;
            animation: loading-bounce 1.4s ease-in-out infinite both;
          }
          .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
          .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
          .loading-dots span:nth-child(3) { animation-delay: 0s; }

          @keyframes loading-bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }

          /* Connection status styles */
          .connection-status-widget {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            min-width: 120px;
          }

          .connection-status-widget.connected {
            background: linear-gradient(135deg, #e8f5e8, #f0fff0);
            color: #2e7d2e;
            border: 1px solid #90ee90;
          }

          .connection-status-widget.mock {
            background: linear-gradient(135deg, #e3f2fd, #f0f8ff);
            color: #1976d2;
            border: 1px solid #81d4fa;
          }

          .connection-status-widget.connecting {
            background: linear-gradient(135deg, #fff3e0, #fef7e0);
            color: #cc5500;
            border: 1px solid #ffcc80;
          }

          .connection-status-widget.disconnected {
            background: linear-gradient(135deg, #f5f5f5, #fafafa);
            color: #666;
            border: 1px solid #ddd;
          }

          .connection-status-widget.error {
            background: linear-gradient(135deg, #ffebee, #fff5f5);
            color: #c62828;
            border: 1px solid #ffcdd2;
          }

          .connection-status-widget:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .status-dot.connected {
            background: #4CAF50;
            animation: pulse-green 2s infinite;
          }

          .status-dot.mock {
            background: #2196F3;
            animation: pulse-blue 1.5s infinite;
          }

          .status-dot.connecting {
            background: #FF9800;
            animation: pulse-orange 1s infinite;
          }

          .status-dot.disconnected {
            background: #757575;
          }

          .status-dot.error {
            background: #F44336;
            animation: pulse-red 1s infinite;
          }

          @keyframes pulse-green {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes pulse-blue {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes pulse-orange {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes pulse-red {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          /* Connection details tooltip */
          .connection-details {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            font-size: 11px;
            min-width: 220px;
            z-index: 1001;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: none;
          }

          .connection-details.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
          }

          .theme-toggle-btn {
            position: fixed;
            top: 20px;
            right: 160px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 18px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }

          .theme-toggle-btn:hover {
            transform: scale(1.1);
          }
        `;
        
        // Remove existing style if it exists
        const existingStyle = document.getElementById('app-enhancements');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        document.head.appendChild(style);
        setUiEnhanced(true);
        console.log('✨ UI enhancements loaded');
      } catch (error) {
        console.warn('⚠️ UI enhancements failed to load:', error);
        setUiEnhanced(false);
      }
    };

    initializeUIEnhancements();
  }, []);

  // App initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');

        if (authStore.isInitialized && authStore.isAuthenticated) {
          console.log('👤 User authenticated, testing connection...');
          
          try {
            // Test API connection
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/chat/health`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              
              // Check if using mock AI responses
              if (data.aiService?.isMockMode) {
                setConnectionStatus('mock');
                console.log('🤖 Connected - Using mock AI responses');
              } else {
                setConnectionStatus('connected');
                console.log('✅ Connected - Full AI service available');
              }
              
              // Load conversations
              await chatStore.loadConversations();
              console.log('💬 Conversations loaded');
            } else {
              setConnectionStatus('error');
              console.warn('⚠️ API health check failed');
            }
          } catch (apiError) {
            console.warn('⚠️ API connection failed:', apiError.message);
            setConnectionStatus('disconnected');
          }
        } else if (authStore.isInitialized && !authStore.isAuthenticated) {
          setConnectionStatus('disconnected');
          console.log('❌ User not authenticated');
        }

        setAppReady(true);
        console.log('✅ App initialization complete');

      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setConnectionStatus('error');
        setAppReady(true);
      }
    };

    if (authStore.isInitialized) {
      const timer = setTimeout(initializeApp, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStore.isInitialized]);

  // Monitor auth changes
  useEffect(() => {
    const handleAuthChange = async () => {
      if (authStore.isAuthenticated && appReady) {
        try {
          setConnectionStatus('connecting');
          
          const token = localStorage.getItem('token');
          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/chat/health`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.aiService?.isMockMode) {
              setConnectionStatus('mock');
            } else {
              setConnectionStatus('connected');
            }

            await chatStore.loadConversations();
          } else {
            setConnectionStatus('error');
          }
        } catch (error) {
          console.error('❌ Connection test failed:', error);
          setConnectionStatus('disconnected');
        }
      } else if (!authStore.isAuthenticated && appReady) {
        chatStore.cleanup?.();
        setConnectionStatus('disconnected');
      }
    };

    handleAuthChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStore.isAuthenticated, appReady]);

  // Show loading screen while initializing
  if (!authStore.isInitialized || !appReady) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <LoadingSpinner size="large" />
          <h2>AI Customer Support Chat</h2>
          <p>Loading your chat experience...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  // Get connection info for display
  const getConnectionInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { 
          text: 'Connected', 
          icon: '✅',
          description: 'Full AI service available',
          details: 'OpenAI API is working normally'
        };
      case 'mock':
        return { 
          text: 'Limited Mode', 
          icon: '🤖',
          description: 'Using smart responses',
          details: 'OpenAI quota exceeded - using intelligent pre-programmed responses'
        };
      case 'connecting':
        return { 
          text: 'Connecting...', 
          icon: '🔄',
          description: 'Testing connection',
          details: 'Checking server and AI service status'
        };
      case 'disconnected':
        return { 
          text: 'Offline', 
          icon: '📱',
          description: 'No server connection',
          details: 'Cannot reach the backend server'
        };
      case 'error':
        return { 
          text: 'Error', 
          icon: '⚠️',
          description: 'Connection error',
          details: 'Server error or authentication failed'
        };
      default:
        return { 
          text: 'Unknown', 
          icon: '❓',
          description: 'Status unknown',
          details: 'Connection status could not be determined'
        };
    }
  };

  const connectionInfo = getConnectionInfo();

  return (
    <div className="app">
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              authStore.isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <LoginForm />
              )
            }
          />
          
          <Route
            path="/"
            element={
              authStore.isAuthenticated ? (
                <ChatContainer />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          <Route
            path="/chat/:conversationId?"
            element={
              authStore.isAuthenticated ? (
                <ChatContainer />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      {/* Connection Status Widget */}
      {authStore.isAuthenticated && (
        <div 
          className={`connection-status-widget ${connectionStatus}`}
          onMouseEnter={() => setShowConnectionDetails(true)}
          onMouseLeave={() => setShowConnectionDetails(false)}
        >
          <span className={`status-dot ${connectionStatus}`}></span>
          <span>{connectionInfo.icon} {connectionInfo.text}</span>
          
          {/* Connection Details Tooltip */}
          <div className={`connection-details ${showConnectionDetails ? 'show' : ''}`}>
            <div><strong>Status:</strong> {connectionInfo.text}</div>
            <div><strong>Description:</strong> {connectionInfo.description}</div>
            <div><strong>Details:</strong> {connectionInfo.details}</div>
            <div><strong>Server:</strong> {process.env.REACT_APP_API_BASE_URL?.replace('/api', '') || 'localhost:5000'}</div>
            {connectionStatus === 'mock' && (
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                💡 The AI is giving smart pre-programmed responses because OpenAI quota has been exceeded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{ 
          top: 60,
          right: 20,
          zIndex: 9999
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            padding: '16px 20px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            maxWidth: '400px',
          },
          success: { 
            style: { background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' }
          },
          error: { 
            duration: 6000,
            style: { background: 'linear-gradient(135deg, #F44336 0%, #e53935 100%)' }
          }
        }}
      />

      {/* Theme Toggle Button */}
      {appReady && uiEnhanced && (
        <button 
          className="theme-toggle-btn"
          onClick={() => {
            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          }}
          title="Toggle theme"
        >
          {document.body.classList.contains('dark-theme') ? '☀️' : '🌙'}
        </button>
      )}

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 1000,
            maxWidth: '300px',
          }}
        >
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              🔧 Debug Info
            </summary>
            <div>
              <div><strong>Auth:</strong> {authStore.isAuthenticated ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Connection:</strong> {connectionStatus}</div>
              <div><strong>Description:</strong> {connectionInfo.description}</div>
              <div><strong>UI Enhanced:</strong> {uiEnhanced ? '✅ Yes' : '❌ No'}</div>
              <div><strong>App Ready:</strong> {appReady ? '✅ Yes' : '❌ No'}</div>
              <div><strong>User:</strong> {authStore.currentUser?.username || 'None'}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

export default App;
