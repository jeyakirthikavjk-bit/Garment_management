import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: isSuccess
          ? 'var(--status-paid-bg)'
          : isError
          ? 'var(--icon-red-bg)'
          : 'var(--icon-blue-bg)',
        color: isSuccess
          ? 'var(--status-paid)'
          : isError
          ? 'var(--icon-red)'
          : 'var(--icon-blue)',
        border: `1px solid ${
          isSuccess
            ? 'var(--status-paid)'
            : isError
            ? 'var(--icon-red)'
            : 'var(--icon-blue)'
        }`,
        padding: '12px 20px',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '13px',
        boxShadow: 'var(--shadow-hover)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <span>{isSuccess ? '✓' : isError ? '✕' : 'ℹ'}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          marginLeft: '8px',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        ×
      </button>
    </div>
  );
}
