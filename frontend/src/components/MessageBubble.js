import React from 'react';
import { User, Bot, Clock, Star } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const MessageBubble = ({ message, isUser }) => {
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  const renderMessageContent = (content) => {
    // If it's a user message, just return the text
    if (isUser) {
      return <p>{content}</p>;
    }

    // For bot messages, render as markdown to support formatting
    return (
      <ReactMarkdown
        components={{
          // Customize markdown rendering
          p: ({ children }) => <p className="message-paragraph">{children}</p>,
          ul: ({ children }) => <ul className="message-list">{children}</ul>,
          ol: ({ children }) => <ol className="message-ordered-list">{children}</ol>,
          li: ({ children }) => <li className="message-list-item">{children}</li>,
          strong: ({ children }) => <strong className="message-bold">{children}</strong>,
          em: ({ children }) => <em className="message-italic">{children}</em>,
          code: ({ children }) => <code className="message-code">{children}</code>,
          pre: ({ children }) => <pre className="message-pre">{children}</pre>,
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="message-link"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const getConfidenceLevel = (confidence) => {
    if (!confidence) return null;
    
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
      default: return '#999';
    }
  };

  return (
    <div className={`message-bubble ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="message-avatar">
        {isUser ? (
          <User size={20} />
        ) : (
          <Bot size={20} />
        )}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="message-time">
            <Clock size={12} />
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className="message-body">
          {renderMessageContent(message.content)}
        </div>

        {/* Bot message metadata */}
        {!isUser && message.metadata && (
          <div className="message-metadata">
            {message.metadata.confidence && (
              <div className="confidence-indicator">
                <Star 
                  size={12} 
                  style={{ 
                    color: getConfidenceColor(getConfidenceLevel(message.metadata.confidence))
                  }}
                />
                <span className="confidence-text">
                  {Math.round(message.metadata.confidence * 100)}% confidence
                </span>
              </div>
            )}

            {message.metadata.contextUsed && (
              <div className="context-indicator">
                <span className="context-badge">
                  Used Knowledge Base
                </span>
              </div>
            )}

            {message.metadata.model && (
              <div className="model-indicator">
                <span className="model-text">
                  {message.metadata.model}
                </span>
              </div>
            )}

            {message.metadata.tokens && (
              <div className="tokens-indicator">
                <span className="tokens-text">
                  {message.metadata.tokens} tokens
                </span>
              </div>
            )}
          </div>
        )}

        {/* File attachments (if any) */}
        {message.fileUrl && (
          <div className="message-attachment">
            <div className="attachment-info">
              <span className="attachment-name">
                {message.fileName || 'Attachment'}
              </span>
              <a 
                href={message.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="attachment-link"
              >
                View
              </a>
            </div>
          </div>
        )}

        {/* Message actions */}
        <div className="message-actions">
          {!isUser && (
            <>
              <button
                className="message-action-button"
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  // Could add a toast notification here
                }}
                title="Copy message"
              >
                Copy
              </button>
              
              <button
                className="message-action-button"
                onClick={() => {
                  // Implement feedback functionality
                  console.log('Feedback for message:', message);
                }}
                title="Provide feedback"
              >
                Feedback
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;