import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = true
}) {
  const { t } = useSettings();
  if (!isOpen) return null;

  const displayTitle = title || t('confirmDeletion', 'Confirm Deletion');
  const displayMessage = message || t('confirmDeleteMsg', 'Are you sure you want to delete this item? This action cannot be undone.');
  const displayConfirm = confirmText || (isDanger ? t('delete', 'Delete') : t('confirm', 'Confirm'));
  const displayCancel = cancelText || t('cancel', 'Cancel');

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          margin: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          borderTop: isDanger ? '4px solid var(--icon-red)' : '4px solid var(--terracotta)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: isDanger ? 'var(--icon-red-bg)' : 'var(--terracotta-light)',
              color: isDanger ? 'var(--icon-red)' : 'var(--terracotta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            {isDanger ? '⚠️' : '❓'}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>{displayTitle}</h3>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '24px', lineHeight: 1.5 }}>
          {displayMessage}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-gold-subtle)',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-dark)'
            }}
          >
            {displayCancel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: isDanger ? 'var(--accent-danger)' : 'var(--accent-maroon)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {displayConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
