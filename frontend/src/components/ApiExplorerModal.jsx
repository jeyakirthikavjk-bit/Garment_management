import React, { useState } from 'react';

const ENDPOINTS = [
  {
    id: 'prod-list',
    name: 'List Garment Inventory Catalog',
    method: 'GET',
    path: '/api/v1/products',
    auth: 'Optional',
    desc: 'Retrieve full inventory list with categories, stock levels, and prices.'
  },
  {
    id: 'cust-list',
    name: 'List Patrons & Default Risk Scores',
    method: 'GET',
    path: '/api/v1/customers',
    auth: 'Bearer JWT',
    desc: 'Retrieve customer records enriched with mathematical credit default risk heuristics.'
  },
  {
    id: 'sales-list',
    name: 'List Sales Invoices',
    method: 'GET',
    path: '/api/v1/sales',
    auth: 'Bearer JWT',
    desc: 'Fetch historical sales invoices with customer references and itemized details.'
  },
  {
    id: 'analytics-kpi',
    name: 'Store Operational Telemetry',
    method: 'GET',
    path: '/api/v1/analytics',
    auth: 'Bearer JWT',
    desc: 'Fetch real-time enterprise metrics including sales, receivables, and deficit indices.'
  },
  {
    id: 'auth-audit',
    name: 'Security & Login Audit Logs',
    method: 'GET',
    path: '/api/auth/audit-log',
    auth: 'Public/Admin',
    desc: 'Retrieve cryptographic session events, Google OAuth logins, and system events.'
  },
  {
    id: 'api-keys',
    name: 'API Architecture & Keys',
    method: 'GET',
    path: '/api/v1/keys',
    auth: 'Public',
    desc: 'Fetch machine-readable API manifest for B2B and mobile app integration.'
  }
];

export default function ApiExplorerModal({ isOpen, onClose }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  if (!isOpen) return null;

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseData(null);
    setResponseStatus(null);
    const startTime = performance.now();
    const token = localStorage.getItem('threadline_jwt_token') || sessionStorage.getItem('threadline_jwt_token') || '';

    try {
      const res = await fetch(`http://localhost:5000${selectedEndpoint.path}`, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setResponseData(data);
    } catch (e) {
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus('500 Error');
      setResponseData({ error: e.message, hint: 'Ensure the backend server is running on http://localhost:5000' });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurlCommand = () => {
    const token = localStorage.getItem('threadline_jwt_token') || 'YOUR_JWT_BEARER_TOKEN';
    return `curl -X ${selectedEndpoint.method} "http://localhost:5000${selectedEndpoint.path}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
          maxWidth: '850px',
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
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-cinzel, serif)', color: '#38BDF8' }}>
                ThreadLine REST API Explorer (v1.0)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                Live API documentation, authenticated sandbox testing, and cURL generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body: Sidebar + Test Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, minHeight: '440px', overflow: 'hidden' }}>
          {/* Endpoint Selector Sidebar */}
          <div
            style={{
              borderRight: '1px solid rgba(0,0,0,0.08)',
              background: 'var(--bg-subtle, #FAF6F0)',
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary, #6B1E2B)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Available Endpoints
            </div>
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setResponseData(null);
                  setResponseStatus(null);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: selectedEndpoint.id === ep.id ? '1px solid var(--accent-gold, #C9A24B)' : '1px solid transparent',
                  background: selectedEndpoint.id === ep.id ? '#FFFFFF' : 'transparent',
                  boxShadow: selectedEndpoint.id === ep.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: ep.method === 'GET' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: ep.method === 'GET' ? '#059669' : '#2563EB'
                    }}
                  >
                    {ep.method}
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-dark, #1E293B)' }}>
                    {ep.name}
                  </span>
                </div>
                <code style={{ fontSize: '10px', color: '#64748B' }}>{ep.path}</code>
              </button>
            ))}
          </div>

          {/* Test & Response Area */}
          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active Endpoint Overview */}
            <div style={{ padding: '14px', background: 'var(--bg-subtle, #FAF6F0)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '11px' }}>
                    {selectedEndpoint.method}
                  </span>
                  <code style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-dark, #1E293B)' }}>
                    http://localhost:5000{selectedEndpoint.path}
                  </code>
                </div>
                <span style={{ fontSize: '11px', background: 'rgba(201, 162, 75, 0.2)', color: 'var(--accent-primary, #6B1E2B)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🔒 {selectedEndpoint.auth}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-gray, #64748B)' }}>
                {selectedEndpoint.desc}
              </p>
            </div>

            {/* Execution Controls */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSendRequest}
                disabled={isLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'var(--accent-primary, #6B1E2B)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{isLoading ? '⏳ Executing...' : '▶ Send API Request'}</span>
              </button>

              <button
                onClick={copyCurl}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: 'var(--text-dark, #334155)',
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                {curlCopied ? '✓ cURL Copied' : '📋 Copy cURL'}
              </button>
            </div>

            {/* Response Viewer */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark, #1E293B)', textTransform: 'uppercase' }}>
                  Response Body
                </span>
                {responseStatus && (
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px', fontWeight: 700 }}>
                    <span style={{ color: responseStatus.includes('200') || responseStatus.includes('201') ? '#059669' : '#DC2626' }}>
                      Status: {responseStatus}
                    </span>
                    <span style={{ color: '#64748B' }}>Time: {responseTime}ms</span>
                  </div>
                )}
              </div>

              <pre
                style={{
                  margin: 0,
                  flex: 1,
                  minHeight: '200px',
                  maxHeight: '260px',
                  padding: '14px',
                  background: '#0F172A',
                  color: '#F8FAFC',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontFamily: 'ui-monospace, monospace',
                  overflowY: 'auto'
                }}
              >
                {responseData
                  ? JSON.stringify(responseData, null, 2)
                  : 'Click "Send API Request" to test endpoint live against local server...'}
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
            Header: <code>Authorization: Bearer &lt;Active_JWT_Token&gt;</code>
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
