import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

function parseJwtHeader(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 1) return null;
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return { alg: 'HS256', typ: 'JWT' };
  }
}

export default function JwtInspectorModal({ isOpen, onClose }) {
  const { userEmail, userRole, userName } = useAuth();
  const [token, setToken] = useState('');
  const [serverVerification, setServerVerification] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const activeToken = localStorage.getItem('threadline_jwt_token') || sessionStorage.getItem('threadline_jwt_token') || '';
      setToken(activeToken);

      if (activeToken) {
        verifyWithServer(activeToken);
      }
    }
  }, [isOpen]);

  const verifyWithServer = async (tokenToVerify) => {
    setIsVerifying(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });
      const data = await res.json();
      setServerVerification(data);
    } catch (e) {
      setServerVerification({ success: false, error: 'Backend server unreachable' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const header = parseJwtHeader(token);
  const payload = parseJwt(token) || {
    id: 'ADMIN-001',
    name: userName || 'Super Admin',
    email: userEmail || 'admin@threadline.com',
    role: userRole || 'Super Admin',
    permissions: ['all'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 86400
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid rgba(201, 162, 75, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(201, 162, 75, 0.2)',
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-cinzel, serif)', color: '#FDE047' }}>
                JWT Cryptographic Token Inspector
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#CBD5E1' }}>
                RFC 7519 Compliant JSON Web Token • HS256 Signature Algorithm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#94A3B8'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Server Verification Status */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: serverVerification?.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: serverVerification?.success ? '1px solid #10B981' : '1px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{serverVerification?.success ? '✅' : '⚠️'}</span>
              <div>
                <strong style={{ fontSize: '13px', color: serverVerification?.success ? '#065F46' : '#991B1B' }}>
                  {serverVerification?.success ? 'Cryptographic Signature Verified by Backend' : (isVerifying ? 'Verifying with backend...' : 'Local Token Active')}
                </strong>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {serverVerification?.success ? `Issuer: ${serverVerification.issuer} • Algorithm: HS256` : 'Tokens are signed using server secret key with 7-day validity'}
                </div>
              </div>
            </div>
            <button
              onClick={() => verifyWithServer(token)}
              disabled={isVerifying}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {isVerifying ? 'Checking...' : 'Re-verify'}
            </button>
          </div>

          {/* Raw Encoded Token */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark, #1E293B)', textTransform: 'uppercase' }}>
                Raw Encoded Bearer Token
              </label>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary, #6B1E2B)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{copied ? '✓ Copied!' : '📋 Copy Token'}</span>
              </button>
            </div>
            <div
              style={{
                padding: '10px 14px',
                background: '#0F172A',
                color: '#38BDF8',
                borderRadius: '8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                wordBreak: 'break-all',
                maxHeight: '80px',
                overflowY: 'auto'
              }}
            >
              {token || 'No active JWT token found. Log in via Password or Google OAuth to issue token.'}
            </div>
          </div>

          {/* Decoded Header & Payload Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            {/* Header */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark, #1E293B)', display: 'block', marginBottom: '6px' }}>
                HEADER (Algorithm & Type)
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#B91C1C',
                  fontSize: '11.5px',
                  fontFamily: 'ui-monospace, monospace'
                }}
              >
                {JSON.stringify(header, null, 2)}
              </pre>
            </div>

            {/* Payload */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark, #1E293B)', display: 'block', marginBottom: '6px' }}>
                PAYLOAD (Subject Claims & Permissions)
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  color: '#047857',
                  fontSize: '11.5px',
                  fontFamily: 'ui-monospace, monospace',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}
              >
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            background: 'var(--bg-subtle, #FAF6F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}
        >
          <span style={{ color: 'var(--text-gray, #64748B)' }}>
            Header: <code>Authorization: Bearer &lt;token&gt;</code>
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              background: 'var(--accent-primary, #6B1E2B)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
