import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Settings, X } from 'lucide-react';
import chatStore from '../stores/ChatStore';
import apiService from '../services/apiService';

const DebugPanel = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Test API connection
      apiService.testConnection().then(setApiStatus);
      
      // Get user info
      const user = apiService.getCurrentUser();
      setUserInfo(user);
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 z-50"
        title="Debug Panel"
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Connection Status */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">WebSocket Connection</h4>
          <div className="bg-gray-50 p-2 rounded">
            <div>Status: <span className="font-mono">{chatStore.connectionStatus}</span></div>
            <div>Retries: <span className="font-mono">{chatStore.connectionRetries}/{chatStore.maxRetries}</span></div>
            <div>Socket URL: <span className="font-mono">{process.env.REACT_APP_WEBSOCKET_URL}</span></div>
          </div>
        </div>

        {/* API Status */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">API Connection</h4>
          <div className="bg-gray-50 p-2 rounded">
            {apiStatus ? (
              <>
                <div>Status: <span className={`font-mono ${apiStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {apiStatus.success ? '✅ Connected' : '❌ Failed'}
                </span></div>
                <div>Base URL: <span className="font-mono">{apiStatus.baseURL}</span></div>
                <div>Message: <span className="text-xs">{apiStatus.message}</span></div>
              </>
            ) : (
              <div>Testing...</div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">User Profile</h4>
          <div className="bg-gray-50 p-2 rounded">
            {userInfo ? (
              <>
                <div>Username: <span className="font-mono">{userInfo.username || 'N/A'}</span></div>
                <div>Email: <span className="font-mono">{userInfo.email || 'N/A'}</span></div>
                <div>Role: <span className="font-mono">{userInfo.role || 'user'}</span></div>
                <div>ID: <span className="font-mono text-xs">{userInfo.id || userInfo._id || 'N/A'}</span></div>
              </>
            ) : (
              <div>Not authenticated</div>
            )}
          </div>
        </div>

        {/* Environment */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Environment</h4>
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div>NODE_ENV: <span className="font-mono">{process.env.NODE_ENV}</span></div>
            <div>API URL: <span className="font-mono">{process.env.REACT_APP_API_BASE_URL}</span></div>
            <div>WS URL: <span className="font-mono">{process.env.REACT_APP_WEBSOCKET_URL}</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() => chatStore.reconnect()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Reconnect WS
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
});

export default DebugPanel;
