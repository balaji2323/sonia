/**
 * Enhanced UI Components for Modern Chat Application
 * Import these components to replace or enhance your existing UI elements
 * Usage: import { EnhancedButton, LoadingSpinner, AnimatedMessage } from './enhanced-components';
 */

import React, { useState, useEffect, useRef } from 'react';

// ===== ENHANCED BUTTON COMPONENT =====
export const EnhancedButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  icon = null,
  onClick,
  className = '',
  ...props 
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e) => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    
    if (onClick && !disabled && !loading) {
      onClick(e);
    }
  };

  const baseClasses = `
    relative overflow-hidden font-medium transition-all duration-300 
    transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 
    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed 
    disabled:transform-none flex items-center justify-center gap-2
  `;

  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500',
    secondary: 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 shadow-md hover:shadow-lg focus:ring-gray-500',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
    xl: 'px-8 py-4 text-lg rounded-2xl'
  };

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
    isClicked ? 'animate-pulse' : ''
  }`;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : icon ? (
        <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      ) : null}
      
      {!loading && children}
      
      {/* Ripple effect overlay */}
      <div className="absolute inset-0 overflow-hidden rounded-inherit">
        <div className={`ripple-effect ${isClicked ? 'animate-ripple' : ''}`}></div>
      </div>
    </button>
  );
};

// ===== LOADING SPINNER COMPONENT =====
export const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colors = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  return (
    <div className={`${sizes[size]} animate-spin`}>
      <div className={`
        w-full h-full border-2 border-transparent border-t-current 
        rounded-full ${colors[color]}
      `}></div>
    </div>
  );
};

// ===== ANIMATED MESSAGE COMPONENT =====
export const AnimatedMessage = ({ 
  message, 
  type = 'user', 
  timestamp, 
  avatar, 
  onEdit, 
  onDelete,
  onReply 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messageRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const messageClasses = `
    flex items-end gap-3 mb-4 max-w-full transition-all duration-500 transform
    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
    ${type === 'user' ? 'flex-row-reverse' : 'flex-row'}
  `;

  const bubbleClasses = `
    max-w-[70%] px-4 py-3 rounded-2xl shadow-md hover:shadow-lg 
    transition-all duration-300 transform hover:scale-[1.02]
    ${type === 'user' 
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
    }
  `;

  return (
    <div 
      ref={messageRef}
      className={messageClasses}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8">
        {avatar ? (
          <img 
            src={avatar} 
            alt={`${type} avatar`}
            className="w-full h-full rounded-full object-cover shadow-md"
          />
        ) : (
          <div className={`
            w-full h-full rounded-full flex items-center justify-center 
            text-white text-sm font-semibold shadow-md
            ${type === 'user' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
            }
          `}>
            {type === 'user' ? 'U' : 'AI'}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${type === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={bubbleClasses}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Timestamp and Actions */}
        <div className={`
          mt-1 flex items-center gap-2 text-xs text-gray-500 
          transition-opacity duration-300
          ${showActions ? 'opacity-100' : 'opacity-0'}
        `}>
          {timestamp && (
            <span>{new Date(timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-1">
            {onReply && (
              <button 
                onClick={() => onReply(message)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Reply"
              >
                ↩️
              </button>
            )}
            
            {type === 'user' && onEdit && (
              <button 
                onClick={() => onEdit(message)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Edit"
              >
                ✏️
              </button>
            )}
            
            {onDelete && (
              <button 
                onClick={() => onDelete(message)}
                className="p-1 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== TYPING INDICATOR COMPONENT =====
export const TypingIndicator = ({ users = ['AI'] }) => {
  return (
    <div className="flex items-end gap-3 mb-4 animate-fadeIn">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8">
        <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
          AI
        </div>
      </div>

      {/* Typing Bubble */}
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-md animate-float">
        <div className="flex items-center space-x-1">
          <div className="text-xs text-gray-500 mr-2">
            {users.join(', ')} {users.length === 1 ? 'is' : 'are'} typing
          </div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== ENHANCED INPUT COMPONENT =====
export const EnhancedInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Type your message...", 
  disabled = false,
  loading = false,
  maxLength = 1000,
  multiline = true 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    setCharCount(value?.length || 0);
  }, [value]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && !loading) {
      e.preventDefault();
      if (onSubmit && value?.trim()) {
        onSubmit(value);
      }
    }
  };

  const handleSubmit = () => {
    if (onSubmit && value?.trim() && !disabled && !loading) {
      onSubmit(value);
    }
  };

  const containerClasses = `
    relative bg-white border-2 rounded-2xl transition-all duration-300 overflow-hidden
    ${isFocused 
      ? 'border-blue-500 shadow-lg ring-4 ring-blue-100' 
      : 'border-gray-200 shadow-md hover:border-gray-300'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  return (
    <div className={containerClasses}>
      <div className="flex items-end p-4 gap-3">
        {/* Text Input */}
        <div className="flex-1 relative">
          {multiline ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              rows={1}
              className="w-full resize-none border-none outline-none bg-transparent text-gray-800 placeholder-gray-500 min-h-[24px] max-h-32"
              style={{ 
                height: 'auto',
                minHeight: '24px'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className="w-full border-none outline-none bg-transparent text-gray-800 placeholder-gray-500 py-2"
            />
          )}
        </div>

        {/* Send Button */}
        <EnhancedButton
          size="sm"
          disabled={disabled || loading || !value?.trim()}
          loading={loading}
          onClick={handleSubmit}
          className="flex-shrink-0 w-10 h-10 rounded-full p-0"
          icon={!loading && '➤'}
        />
      </div>

      {/* Footer with character count */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 text-xs text-gray-500">
        <div>
          {isFocused && (
            <span className="animate-fadeIn">
              Press Ctrl+Enter to send • Shift+Enter for new line
            </span>
          )}
        </div>
        <div className={`transition-colors ${
          charCount > maxLength * 0.9 ? 'text-red-500' : ''
        }`}>
          {charCount}/{maxLength}
        </div>
      </div>
    </div>
  );
};

// ===== CONNECTION STATUS COMPONENT =====
export const ConnectionStatus = ({ 
  status = 'connected', 
  onRetry, 
  lastUpdated 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const statusConfig = {
    connected: {
      color: 'green',
      icon: '🟢',
      text: 'Connected',
      bgClass: 'bg-green-50 border-green-200 text-green-700'
    },
    connecting: {
      color: 'yellow',
      icon: '🟡',
      text: 'Connecting...',
      bgClass: 'bg-yellow-50 border-yellow-200 text-yellow-700'
    },
    disconnected: {
      color: 'red',
      icon: '🔴',
      text: 'Disconnected',
      bgClass: 'bg-red-50 border-red-200 text-red-700'
    },
    error: {
      color: 'red',
      icon: '❌',
      text: 'Connection Error',
      bgClass: 'bg-red-50 border-red-200 text-red-700'
    }
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 
        rounded-lg border text-sm font-medium transition-all duration-300
        cursor-pointer hover:scale-105 ${config.bgClass}
      `}
      onClick={() => setShowDetails(!showDetails)}
    >
      <span className={status === 'connecting' ? 'animate-pulse' : ''}>
        {config.icon}
      </span>
      <span>{config.text}</span>
      
      {status === 'disconnected' && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="ml-2 px-2 py-1 bg-white rounded text-xs hover:bg-gray-100 transition-colors"
        >
          Retry
        </button>
      )}

      {/* Dropdown Details */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-white rounded-lg shadow-lg border text-xs text-gray-600 min-w-48 animate-fadeIn">
          <div>Status: {config.text}</div>
          {lastUpdated && (
            <div>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</div>
          )}
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
            Click to hide details
          </div>
        </div>
      )}
    </div>
  );
};

// ===== ENHANCED MODAL COMPONENT =====
export const EnhancedModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} 
        max-h-[90vh] overflow-hidden animate-modalSlideIn
      `}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

// ===== NOTIFICATION TOAST COMPONENT =====
export const NotificationToast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      icon: '✅',
      bgClass: 'bg-green-500 border-green-600',
      textClass: 'text-white'
    },
    error: {
      icon: '❌',
      bgClass: 'bg-red-500 border-red-600',
      textClass: 'text-white'
    },
    warning: {
      icon: '⚠️',
      bgClass: 'bg-yellow-500 border-yellow-600',
      textClass: 'text-white'
    },
    info: {
      icon: 'ℹ️',
      bgClass: 'bg-blue-500 border-blue-600',
      textClass: 'text-white'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className={`
      fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 
      rounded-lg shadow-lg border-l-4 min-w-80 transition-all duration-300
      ${config.bgClass} ${config.textClass}
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className="p-1 hover:bg-white/20 rounded transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

// ===== ADDITIONAL UTILITY STYLES =====
export const utilityStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideInUp {
    from { 
      opacity: 0; 
      transform: translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes modalSlideIn {
    from { 
      opacity: 0; 
      transform: translateY(-50px) scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  
  .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  .animate-fadeOut { animation: fadeOut 0.3s ease-in; }
  .animate-slideInUp { animation: slideInUp 0.6s ease-out; }
  .animate-modalSlideIn { animation: modalSlideIn 0.3s ease-out; }
  .animate-float { animation: float 2s ease-in-out infinite; }
  
  .ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    pointer-events: none;
    width: 20px;
    height: 20px;
    left: 50%;
    top: 50%;
    margin-left: -10px;
    margin-top: -10px;
  }
  
  .animate-ripple {
    animation: ripple 0.6s linear;
  }
`;

export default {
  EnhancedButton,
  LoadingSpinner,
  AnimatedMessage,
  TypingIndicator,
  EnhancedInput,
  ConnectionStatus,
  EnhancedModal,
  NotificationToast,
  utilityStyles
};