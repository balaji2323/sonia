import React from 'react';
import { observer } from 'mobx-react-lite';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import chatStore from '../stores/ChatStore';
import apiService from '../services/apiService';

const ConnectionStatus = observer(() => {
  const { connectionStatus, connectionStatusText, error } = chatStore;

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'reconnecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const handleReconnect = () => {
    if (connectionStatus !== 'connected') {
      chatStore.reconnect();
    }
  };

  const testApiConnection = async () => {
    const result = await apiService.testConnection();
    if (result.success) {
      alert('✅ API Connection: ' + result.message);
    } else {
      alert('❌ API Connection Failed: ' + result.message);
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="font-medium">
        {connectionStatusText}
      </span>
      
      {connectionStatus !== 'connected' && (
        <div className="flex gap-2 ml-auto">
          <button 
            onClick={handleReconnect}
            className="text-xs underline hover:no-underline"
          >
            Retry
          </button>
          <button 
            onClick={testApiConnection}
            className="text-xs underline hover:no-underline"
          >
            Test API
          </button>
        </div>
      )}
      
      {error && (
        <div className="ml-2 text-xs opacity-75" title={error}>
          ⚠️
        </div>
      )}
    </div>
  );
});

export default ConnectionStatus;
