import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { buildCreditReminderWhatsAppMessage, sendWhatsAppMessage } from '../services/whatsappService';

export default function WhatsAppReminderModal({ customer, customers = [], onClose, onSent }) {
  const { storeSettings, t } = useSettings();
  const [selectedCust, setSelectedCust] = useState(customer || customers[0] || {});
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState((selectedCust?.statusType === 'overdue' || (selectedCust?.balance || 0) > 20000) ? 'urgent' : 'gentle');
  const [customPhone, setCustomPhone] = useState(selectedCust?.phone || '+91 98765 00000');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // Re-generate message when customer, language, or tone changes
  useEffect(() => {
    if (selectedCust) {
      const msg = buildCreditReminderWhatsAppMessage({
        customer: selectedCust,
        storeSettings,
        language,
        tone
      });
      setMessageText(msg);
      setCustomPhone(selectedCust.phone || '+91 98765 00000');
    }
  }, [selectedCust, language, tone, storeSettings]);

  if (!selectedCust) return null;

  const handleSend = () => {
    sendWhatsAppMessage({
      phone: customPhone,
      message: messageText
    });
    if (onSent) onSent(selectedCust);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100,
        padding: '16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-card-solid, #FFFFFF)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
              💬
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-dark)' }}>
                {t('sendWhatsAppPaymentReminder', 'Send WhatsApp Payment Reminder')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                {t('oneClickBalanceNotice', '1-Click balance notice with direct UPI payment link')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
          >
            ✕
          </button>
        </div>

        {/* Customer Selector if passed customer list */}
        {customers.length > 1 && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              {t('recipientCustomer', 'RECIPIENT CUSTOMER')}
            </label>
            <select
              value={selectedCust.id}
              onChange={(e) => {
                const found = customers.find(c => String(c.id) === String(e.target.value));
                if (found) setSelectedCust(found);
              }}
              style={{ width: '100%', fontWeight: 600, fontSize: '13px' }}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} • {t('due', 'Due')}: ₹{(c.balance || 0).toLocaleString('en-IN')} • {c.areaName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Customer Quick Summary Badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.08) 100%)',
            border: '1px solid rgba(37, 211, 102, 0.25)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-dark)' }}>
              {selectedCust.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '2px' }}>
              📍 {selectedCust.areaName || 'General Route'} • Phone: <strong>{customPhone}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 700, textTransform: 'uppercase' }}>
              {t('outstandingDue', 'Outstanding Due')}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: (selectedCust.balance || 0) > 0 ? 'var(--accent-terracotta)' : 'var(--accent-emerald)' }}>
              ₹{(selectedCust.balance || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Tone & Language Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              {t('messageLanguage', 'MESSAGE LANGUAGE')}
            </label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', fontSize: '12px' }}>
              <option value="en">🇬🇧 English</option>
              <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
              <option value="hi">🇮🇳 हिंदी (Hindi)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              {t('reminderTone', 'REMINDER TONE')}
            </label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: '100%', fontSize: '12px' }}>
              <option value="gentle">{t('politeFriendly', '🤝 Polite & Friendly')}</option>
              <option value="urgent">{t('overdueUrgent', '⚠️ Overdue Urgent Notice')}</option>
            </select>
          </div>
        </div>

        {/* Mobile Number Override */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
            {t('whatsappMobileNumber', 'WHATSAPP MOBILE NUMBER')}
          </label>
          <input
            type="text"
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            placeholder="+91 98765 43210"
            style={{ width: '100%', fontSize: '13px', fontWeight: 600 }}
          />
        </div>

        {/* WhatsApp Message Preview Bubble */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>
              {t('messagePreviewEditable', 'MESSAGE PREVIEW (EDITABLE)')}
            </label>
            <span style={{ fontSize: '10px', color: 'var(--text-gray)' }}>
              {messageText.length} characters
            </span>
          </div>

          <div
            style={{
              background: '#EFEAE2',
              backgroundImage: 'radial-gradient(#D1D7DB 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #D1D7DB'
            }}
          >
            <textarea
              rows="9"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                width: '100%',
                background: '#FFFFFF',
                color: '#111B21',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '12.5px',
                lineHeight: '1.45',
                resize: 'none',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSend}
            style={{
              flex: 1,
              padding: '12px 18px',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
            }}
          >
            <span>💬</span> {t('openSendWhatsApp', 'Open & Send on WhatsApp')}
          </button>

          <button
            onClick={handleCopy}
            style={{
              padding: '12px 16px',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--text-dark)'
            }}
          >
            {copied ? `✓ ${t('copiedText', 'Copied')}` : `📋 ${t('copyText', 'Copy Text')}`}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--text-gray)'
            }}
          >
            {t('cancelBtn', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
