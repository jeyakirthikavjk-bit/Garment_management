import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useSettings();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧵 404</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--text-dark)', marginBottom: '10px' }}>
        {t('pageNotFound', 'Page Not Found')}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', maxWidth: '440px', lineHeight: 1.6 }}>
        {t('pageNotFoundDesc', 'The route you are looking for does not exist or has been moved within ThreadLine Garment System.')}
      </p>
      <button 
        onClick={() => navigate('/')} 
        className="btn-primary" 
        style={{ width: 'auto', padding: '12px 28px', fontSize: '14px' }}
      >
        {t('backToDashboard', 'Back to Dashboard')}
      </button>
    </div>
  );
}
