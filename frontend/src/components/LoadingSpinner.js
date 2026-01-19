// frontend/src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = '#2196F3' }) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large',
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]}`}>
      <div
        className="spinner"
        style={{ borderTopColor: color }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
