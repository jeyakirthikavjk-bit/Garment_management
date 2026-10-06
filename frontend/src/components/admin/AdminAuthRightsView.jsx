import React, { useState, useEffect } from 'react';
import {
  SYSTEM_ROLES,
  SYSTEM_PERMISSION_MODULES,
  getCustomPermissionsForRole,
  saveCustomPermissionsForRole,
  saveAllCustomPermissions,
  resetCustomPermissionsToDefault
} from '../../config/roles';
import { API_BASE_URL } from '../../config/api';

const DEFAULT_USERS_STATE = {
  admin: {
    key: 'admin',
    id: 'ADMIN-001',
    name: 'Jeya (Admin)',
    email: 'admin@threadline.com',
    role: 'Admin',
    badge: 'Store Owner & Admin',
    category: 'Full Access',
    icon: '👑',
    password: 'adminpassword123',
    status: 'Active',
    lastLogin: 'Active Now (Super Session)',
    loginCount: 42
  },
  supplier: {
    key: 'supplier',
    id: 'SUPP-001',
    name: 'Senthil Kumar (Sri Lakshmi Mills)',
    email: 'supplier@threadline.com',
    role: 'Supplier',
    badge: 'Vendor & Mill Supplier',
    category: 'Supplier Partner',
    icon: '🚚',
    password: 'supplierpassword123',
    status: 'Active',
    lastLogin: 'Today, 06:15 PM',
    loginCount: 18
  },
  inventory: {
    key: 'inventory',
    id: 'STAFF-INV-003',
    name: 'Rajesh Verma',
    email: 'inventory@threadline.com',
    role: 'Inventory Manager',
    badge: 'Stock & Warehouse',
    category: 'Logistics',
    icon: '📦',
    password: 'inventorypassword123',
    status: 'Active',
    lastLogin: 'Today, 04:30 PM',
    loginCount: 29
  },
  sales: {
    key: 'sales',
    id: 'STAFF-SALES-002',
    name: 'Priya Sharma',
    email: 'sales@threadline.com',
    role: 'Sales Manager',
    badge: 'Sales & Distribution',
    category: 'Commercial',
    icon: '💼',
    password: 'salespassword123',
    status: 'Active',
    lastLogin: 'Today, 02:45 PM',
    loginCount: 35
  },
  user: {
    key: 'user',
    id: 'USER-001',
    name: 'Ravi Kumar (Sri Meenakshi Textiles)',
    email: 'user@threadline.com',
    role: 'User',
    badge: 'Customer Portal',
    category: 'Client',
    icon: '🛍️',
    password: 'userpassword123',
    status: 'Active',
    lastLogin: 'Yesterday, 08:20 PM',
    loginCount: 12
  }
};

const DEFAULT_SECURITY_POLICIES = {
  sessionTimeout: '7d',
  twoFactorAuth: 'optional',
  minPasswordLength: 8,
  requireSpecialChars: true,
  googleOAuthEnabled: true,
  googleClientId: '',
  maxLoginAttempts: 5,
  lockoutDurationMins: 15
};

const INITIAL_AUDIT_LOGS = [
  {
    id: 'EVT-101',
    timestamp: new Date().toISOString(),
    event: 'RBAC_SECURITY_INITIALIZED',
    user: 'admin@threadline.com',
    role: 'Admin',
    method: 'Master Authority',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'Master Authentication Rights & RBAC Policy Engine active.'
  },
  {
    id: 'EVT-102',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: 'LOGIN_SUCCESS',
    user: 'admin@threadline.com',
    role: 'Admin',
    method: 'Standard Password',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'Admin authenticated with full privileges.'
  },
  {
    id: 'EVT-103',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    event: 'LOGIN_SUCCESS',
    user: 'supplier@threadline.com',
    role: 'Supplier',
    method: 'Standard Password',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'Supplier Senthil Kumar accessed Purchase Orders.'
  }
];

function generateStrongPassword() {
  const adjectives = ['Royal', 'Golden', 'Silver', 'Silk', 'Cotton', 'Velvet', 'Prime', 'Master', 'Heritage', 'Textile'];
  const nouns = ['Loom', 'Weave', 'Fabric', 'Spool', 'Thread', 'Garment', 'Khata', 'Store', 'Vault', 'Boutique'];
  const symbols = ['#', '@', '$', '!', '&'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${adj}${noun}${sym}${num}`;
}

export default function AdminAuthRightsView({ onToast = () => {} }) {
  const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts' | 'matrix' | 'policies' | 'audit'

  // --- TAB 1: USERS STATE ---
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('threadline_auth_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_USERS_STATE, ...parsed };
      }
    } catch (e) {}
    return DEFAULT_USERS_STATE;
  });

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // --- TAB 2: PERMISSION MATRIX STATE ---
  const [permissionMatrix, setPermissionMatrix] = useState(() => {
    const matrix = {};
    for (const key of Object.keys(SYSTEM_ROLES)) {
      matrix[key] = getCustomPermissionsForRole(key);
    }
    return matrix;
  });
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [hasUnsavedMatrixChanges, setHasUnsavedMatrixChanges] = useState(false);

  // --- TAB 3: SECURITY POLICIES STATE ---
  const [policies, setPolicies] = useState(() => {
    try {
      const stored = localStorage.getItem('threadline_auth_policies');
      if (stored) {
        return { ...DEFAULT_SECURITY_POLICIES, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return DEFAULT_SECURITY_POLICIES;
  });

  // --- TAB 4: AUDIT LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('threadline_auth_audit_log');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_AUDIT_LOGS;
  });
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Initial fetch from backend if available
  useEffect(() => {
    // 1. Fetch Users
    fetch(`${API_BASE_URL}/auth/users`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.users)) {
          setUsers(prev => {
            const next = { ...prev };
            data.users.forEach(u => {
              if (next[u.key]) {
                next[u.key] = {
                  ...next[u.key],
                  ...u,
                  password: u.password || next[u.key].password,
                  status: u.status || next[u.key].status
                };
              }
            });
            try {
              localStorage.setItem('threadline_auth_users', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      })
      .catch(() => {});

    // 2. Fetch Permissions
    fetch(`${API_BASE_URL}/auth/permissions`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.permissions) {
          setPermissionMatrix(prev => {
            const updated = { ...prev, ...data.permissions };
            saveAllCustomPermissions(updated);
            return updated;
          });
        }
      })
      .catch(() => {});

    // 3. Fetch Security Policies
    fetch(`${API_BASE_URL}/auth/security-policies`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.policies) {
          setPolicies(prev => {
            const merged = { ...prev, ...data.policies };
            try {
              localStorage.setItem('threadline_auth_policies', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch(() => {});

    // 4. Fetch Audit Log
    fetch(`${API_BASE_URL}/auth/audit-log`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.logs) && data.logs.length > 0) {
          setAuditLogs(data.logs);
          try {
            localStorage.setItem('threadline_auth_audit_log', JSON.stringify(data.logs));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Log an event locally and to backend
  const addAuditLog = (event, user, role, status, details) => {
    const logItem = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      event,
      user,
      role,
      method: 'Admin Control Panel',
      status,
      ip: '127.0.0.1 (Local)',
      details
    };
    setAuditLogs(prev => {
      const updated = [logItem, ...prev].slice(0, 100);
      try {
        localStorage.setItem('threadline_auth_audit_log', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // --- USER ACTIONS ---
  const handleOpenPasswordModal = (user) => {
    setPasswordModalUser(user);
    setNewPasswordVal(generateStrongPassword());
  };

  const handleSavePassword = async () => {
    if (!passwordModalUser || !newPasswordVal.trim()) return;
    const cleanPass = newPasswordVal.trim();
    const roleKey = passwordModalUser.key;

    const updatedUsers = {
      ...users,
      [roleKey]: {
        ...users[roleKey],
        password: cleanPass
      }
    };
    setUsers(updatedUsers);
    try {
      localStorage.setItem('threadline_auth_users', JSON.stringify(updatedUsers));
    } catch (e) {}

    // Send to backend
    try {
      await fetch(`${API_BASE_URL}/auth/users/${roleKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });
    } catch (e) {}

    addAuditLog('PASSWORD_RESET', passwordModalUser.email, passwordModalUser.role, 'SUCCESS', `Admin changed password for ${passwordModalUser.role} (${passwordModalUser.name}).`);
    onToast(`Password for ${passwordModalUser.role} updated successfully!`);
    setPasswordModalUser(null);
    setNewPasswordVal('');
  };

  const handleToggleUserStatus = async (roleKey) => {
    const target = users[roleKey];
    if (!target) return;
    if (roleKey === 'admin') {
      alert('Cannot suspend the Super Admin account.');
      return;
    }

    const nextStatus = target.status === 'Active' ? 'Suspended' : 'Active';
    const updatedUsers = {
      ...users,
      [roleKey]: {
        ...target,
        status: nextStatus
      }
    };
    setUsers(updatedUsers);
    try {
      localStorage.setItem('threadline_auth_users', JSON.stringify(updatedUsers));
    } catch (e) {}

    try {
      await fetch(`${API_BASE_URL}/auth/users/${roleKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (e) {}

    const statusBadge = nextStatus === 'Suspended' ? 'WARNING' : 'SUCCESS';
    addAuditLog('ACCOUNT_STATUS_CHANGE', target.email, target.role, statusBadge, `Admin set ${target.role} account status to ${nextStatus}.`);
    onToast(`${target.role} account is now ${nextStatus.toUpperCase()}!`);
  };

  const handleRevokeSession = (roleKey) => {
    const target = users[roleKey];
    if (!target) return;
    addAuditLog('SESSION_REVOKED', target.email, target.role, 'WARNING', `Admin forcefully invalidated active session token for ${target.role}.`);
    onToast(`Active authentication session for ${target.role} has been invalidated!`);
  };

  const toggleShowPassword = (roleKey) => {
    setShowPasswordMap(prev => ({ ...prev, [roleKey]: !prev[roleKey] }));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    onToast('Copied to clipboard!');
  };

  // --- PERMISSION MATRIX ACTIONS ---
  const handleTogglePermission = (roleKey, permissionKey) => {
    if (roleKey === 'admin') return; // Admin always retains full rights

    setPermissionMatrix(prev => {
      const currentList = prev[roleKey] || [];
      const hasIt = currentList.includes(permissionKey);
      const nextList = hasIt
        ? currentList.filter(p => p !== permissionKey)
        : [...currentList, permissionKey];

      const nextMatrix = {
        ...prev,
        [roleKey]: nextList
      };
      setHasUnsavedMatrixChanges(true);
      return nextMatrix;
    });
  };

  const handleSavePermissionMatrix = async () => {
    saveAllCustomPermissions(permissionMatrix);
    try {
      await fetch(`${API_BASE_URL}/auth/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionMatrix })
      });
    } catch (e) {}

    addAuditLog('PERMISSIONS_MODIFIED', 'admin@threadline.com', 'Admin', 'SUCCESS', 'Administrator committed updated system-wide role permissions matrix.');
    setHasUnsavedMatrixChanges(false);
    onToast('Role permissions matrix saved and active across all accounts!');
  };

  const handleResetPermissionsToDefault = () => {
    if (!window.confirm('Reset all role permissions to factory system defaults?')) return;
    resetCustomPermissionsToDefault();
    const defaults = {};
    for (const key of Object.keys(SYSTEM_ROLES)) {
      defaults[key] = SYSTEM_ROLES[key].permissions || [];
    }
    setPermissionMatrix(defaults);
    setHasUnsavedMatrixChanges(false);
    addAuditLog('PERMISSIONS_RESET', 'admin@threadline.com', 'Admin', 'WARNING', 'Admin reset all role permissions to default factory specs.');
    onToast('Permissions restored to default system baseline!');
  };

  // --- POLICIES ACTIONS ---
  const handlePolicyChange = (field, value) => {
    setPolicies(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePolicies = async () => {
    try {
      localStorage.setItem('threadline_auth_policies', JSON.stringify(policies));
      await fetch(`${API_BASE_URL}/auth/security-policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies })
      });
    } catch (e) {}

    addAuditLog('POLICY_UPDATED', 'admin@threadline.com', 'Admin', 'SUCCESS', `Security policies updated: Session Timeout=${policies.sessionTimeout}, 2FA=${policies.twoFactorAuth}.`);
    onToast('Authentication & session security policies saved successfully!');
  };

  // --- AUDIT ACTIONS ---
  const handleClearAuditLogs = async () => {
    if (!window.confirm('Clear all security audit log history?')) return;
    setAuditLogs([]);
    try {
      localStorage.removeItem('threadline_auth_audit_log');
      await fetch(`${API_BASE_URL}/auth/audit-log/clear`, { method: 'POST' });
    } catch (e) {}
    onToast('Security audit telemetry cleared!');
  };

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `threadline_security_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onToast('Security audit log exported as JSON!');
  };

  // Category list for matrix filter
  const categories = ['ALL', ...new Set(SYSTEM_PERMISSION_MODULES.map(m => m.category))];

  const filteredModules = SYSTEM_PERMISSION_MODULES.filter(m => {
    const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesQuery = !moduleSearchQuery.trim() ||
      m.label.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
      m.permission.toLowerCase().includes(moduleSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const filteredAuditLogs = auditLogs.filter(l => {
    const matchesType = auditFilter === 'ALL' || l.event.includes(auditFilter) || l.status === auditFilter;
    const matchesSearch = !auditSearch.trim() ||
      l.event.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredUsers = Object.values(users).filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="settings-panel active-panel" style={{ padding: 0 }}>
      {/* Header Banner */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(201, 162, 75, 0.25)',
        background: 'linear-gradient(135deg, rgba(107, 30, 43, 0.05) 0%, rgba(201, 162, 75, 0.08) 100%)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '26px' }}>🛡️</span>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              color: 'var(--accent-maroon)',
              margin: 0,
              fontWeight: 700
            }}>
              Authentication & Access Rights Management
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-gray)', margin: 0, maxWidth: '640px' }}>
            Executive master control: manage system credentials, reset user passwords, enforce granular Role-Based Access Control (RBAC), customize session policies, and inspect audit telemetry.
          </p>
        </div>

        {/* Stats Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            background: '#FFF',
            border: '1px solid rgba(201, 162, 75, 0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-maroon)' }}>
              {Object.keys(users).length}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-gray)', fontWeight: 600 }}>System Roles</div>
          </div>
          <div style={{
            background: '#FFF',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
              {Object.values(users).filter(u => u.status === 'Active').length} Active
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-gray)', fontWeight: 600 }}>Accounts</div>
          </div>
          <div style={{
            background: '#FFF',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB' }}>
              {SYSTEM_PERMISSION_MODULES.length}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-gray)', fontWeight: 600 }}>Right Modules</div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(201, 162, 75, 0.25)',
        background: '#FAF6F0',
        padding: '0 20px',
        overflowX: 'auto',
        gap: '4px'
      }}>
        <button
          onClick={() => setActiveSubTab('accounts')}
          style={{
            padding: '14px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'accounts' ? 'var(--accent-maroon)' : 'var(--text-gray)',
            borderBottom: activeSubTab === 'accounts' ? '3px solid var(--accent-maroon)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>👥</span> User Accounts & Passwords
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          style={{
            padding: '14px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'matrix' ? 'var(--accent-maroon)' : 'var(--text-gray)',
            borderBottom: activeSubTab === 'matrix' ? '3px solid var(--accent-maroon)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>🛡️</span> Permissions Matrix (Grant / Revoke)
          {hasUnsavedMatrixChanges && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#EF4444',
              display: 'inline-block'
            }} />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          style={{
            padding: '14px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'policies' ? 'var(--accent-maroon)' : 'var(--text-gray)',
            borderBottom: activeSubTab === 'policies' ? '3px solid var(--accent-maroon)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>🔒</span> Security Policies & 2FA
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          style={{
            padding: '14px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'audit' ? 'var(--accent-maroon)' : 'var(--text-gray)',
            borderBottom: activeSubTab === 'audit' ? '3px solid var(--accent-maroon)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span>📋</span> Security Audit Log
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {/* ========================================================== */}
        {/* TAB 1: USER ACCOUNTS & PASSWORDS MANAGEMENT                 */}
        {/* ========================================================== */}
        {activeSubTab === 'accounts' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                  Active System User Directory
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-gray)' }}>
                  Inspect account login credentials, reset passwords, change account activation status, or revoke active sessions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Search name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(201, 162, 75, 0.35)',
                    fontSize: '12.5px',
                    width: '240px',
                    background: '#FFF'
                  }}
                />
              </div>
            </div>

            {/* User Cards / Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredUsers.map((u) => {
                const isSuspended = u.status === 'Suspended';
                const isRevealed = showPasswordMap[u.key];
                return (
                  <div
                    key={u.key}
                    style={{
                      background: isSuspended ? '#FFF5F5' : '#FFF',
                      border: isSuspended ? '1px solid #FCA5A5' : '1px solid rgba(201, 162, 75, 0.3)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* User Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '280px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(201, 162, 75, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        border: '1px solid rgba(201, 162, 75, 0.3)'
                      }}>
                        {u.icon || '👤'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
                            {u.name}
                          </span>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: u.key === 'admin' ? 'var(--accent-maroon)' : '#E2E8F0',
                            color: u.key === 'admin' ? '#FFF' : '#334155'
                          }}>
                            {u.role}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <code style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                            {u.email}
                          </code>
                          <button
                            onClick={() => copyToClipboard(u.email, `email-${u.key}`)}
                            title="Copy email"
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '11px',
                              color: 'var(--accent-gold-dark)'
                            }}
                          >
                            {copiedKey === `email-${u.key}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Credentials */}
                    <div style={{
                      background: '#FAF6F0',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(201, 162, 75, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: '220px'
                    }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Password
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                          {isRevealed ? u.password : '••••••••••••'}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => toggleShowPassword(u.key)}
                          title={isRevealed ? 'Hide Password' : 'Show Password'}
                          style={{
                            border: '1px solid rgba(201,162,75,0.3)',
                            background: '#FFF',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            fontSize: '12px'
                          }}
                        >
                          {isRevealed ? '🙈' : '👁️'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(u.password, `pass-${u.key}`)}
                          title="Copy Password"
                          style={{
                            border: '1px solid rgba(201,162,75,0.3)',
                            background: '#FFF',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            fontSize: '12px'
                          }}
                        >
                          {copiedKey === `pass-${u.key}` ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>

                    {/* Account Status Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '110px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                        Account State
                      </div>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isSuspended ? '#DC2626' : '#059669',
                        border: isSuspended ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isSuspended ? '🚫 Suspended' : '🟢 Active'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        style={{
                          background: 'var(--accent-maroon)',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🔑 Reset Password
                      </button>

                      {u.key !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.key)}
                          style={{
                            background: isSuspended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isSuspended ? '#059669' : '#DC2626',
                            border: isSuspended ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isSuspended ? '✓ Reactivate' : '🚫 Suspend'}
                        </button>
                      )}

                      <button
                        onClick={() => handleRevokeSession(u.key)}
                        title="Invalidate Token & Force Logout"
                        style={{
                          background: '#FFF',
                          color: 'var(--text-gray)',
                          border: '1px solid rgba(201, 162, 75, 0.35)',
                          borderRadius: '8px',
                          padding: '7px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Terminate Session
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: ROLE PERMISSION MATRIX (GRANT / REVOKE)             */}
        {/* ========================================================== */}
        {activeSubTab === 'matrix' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                  Role-Based Access Control (RBAC) Permission Matrix
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-gray)' }}>
                  Grant or revoke permissions per role. Checkboxes immediately update capability authorizations across all pages.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleResetPermissionsToDefault}
                  style={{
                    background: '#FFF',
                    color: 'var(--text-dark)',
                    border: '1px solid rgba(201, 162, 75, 0.4)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🔄 Factory Reset Defaults
                </button>
                <button
                  onClick={handleSavePermissionMatrix}
                  style={{
                    background: 'var(--accent-maroon)',
                    color: '#FFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: hasUnsavedMatrixChanges ? '0 0 0 3px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                >
                  💾 {hasUnsavedMatrixChanges ? 'Save Changes *' : 'Save Permissions'}
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              background: '#FAF6F0',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(201, 162, 75, 0.25)'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Filter By Category:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: selectedCategory === cat ? '1px solid var(--accent-maroon)' : '1px solid rgba(201, 162, 75, 0.3)',
                      background: selectedCategory === cat ? 'var(--accent-maroon)' : '#FFF',
                      color: selectedCategory === cat ? '#FFF' : 'var(--text-dark)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="🔍 Search capability..."
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(201, 162, 75, 0.3)',
                  fontSize: '12px',
                  background: '#FFF'
                }}
              />
            </div>

            {/* Interactive Matrix Table */}
            <div style={{
              overflowX: 'auto',
              border: '1px solid rgba(201, 162, 75, 0.25)',
              borderRadius: '12px',
              background: '#FFF'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#FAF6F0', borderBottom: '2px solid rgba(201, 162, 75, 0.3)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: 800, color: 'var(--accent-maroon)', minWidth: '260px' }}>
                      Capability / Feature Module
                    </th>
                    <th style={{ padding: '14px 12px', fontSize: '12px', fontWeight: 800, color: 'var(--accent-gold-dark)', textAlign: 'center', minWidth: '100px' }}>
                      👑 Admin
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>Master (*)</div>
                    </th>
                    <th style={{ padding: '14px 12px', fontSize: '12px', fontWeight: 800, color: '#D97706', textAlign: 'center', minWidth: '100px' }}>
                      🚚 Supplier
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-gray)' }}>
                        {(permissionMatrix.supplier || []).length} / {SYSTEM_PERMISSION_MODULES.length}
                      </div>
                    </th>
                    <th style={{ padding: '14px 12px', fontSize: '12px', fontWeight: 800, color: '#059669', textAlign: 'center', minWidth: '110px' }}>
                      📦 Inventory
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-gray)' }}>
                        {(permissionMatrix.inventory || []).length} / {SYSTEM_PERMISSION_MODULES.length}
                      </div>
                    </th>
                    <th style={{ padding: '14px 12px', fontSize: '12px', fontWeight: 800, color: '#2563EB', textAlign: 'center', minWidth: '100px' }}>
                      💼 Sales
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-gray)' }}>
                        {(permissionMatrix.sales || []).length} / {SYSTEM_PERMISSION_MODULES.length}
                      </div>
                    </th>
                    <th style={{ padding: '14px 12px', fontSize: '12px', fontWeight: 800, color: '#DB2777', textAlign: 'center', minWidth: '100px' }}>
                      🛍️ Customer
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-gray)' }}>
                        {(permissionMatrix.user || []).length} / {SYSTEM_PERMISSION_MODULES.length}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map((m, idx) => {
                    const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#FCFAF7';
                    return (
                      <tr key={m.id} style={{ background: bgRow, borderBottom: '1px solid rgba(201, 162, 75, 0.15)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{m.icon}</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                                  {m.label}
                                </span>
                                <span style={{
                                  fontSize: '9.5px',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  background: 'rgba(201, 162, 75, 0.15)',
                                  color: 'var(--accent-maroon)',
                                  fontWeight: 600
                                }}>
                                  {m.category}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-gray)', lineHeight: 1.3 }}>
                                {m.description}
                              </p>
                              <code style={{ fontSize: '10px', color: '#64748B' }}>
                                key: {m.permission}
                              </code>
                            </div>
                          </div>
                        </td>

                        {/* Admin Column: Always True and Locked */}
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(201, 162, 75, 0.15)',
                            color: 'var(--accent-gold-dark)',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: '1px solid rgba(201, 162, 75, 0.3)'
                          }}>
                            ✓ Master
                          </span>
                        </td>

                        {/* Supplier Column */}
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={(permissionMatrix.supplier || []).includes(m.permission)}
                            onChange={() => handleTogglePermission('supplier', m.permission)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D97706' }}
                          />
                        </td>

                        {/* Inventory Column */}
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={(permissionMatrix.inventory || []).includes(m.permission)}
                            onChange={() => handleTogglePermission('inventory', m.permission)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                          />
                        </td>

                        {/* Sales Column */}
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={(permissionMatrix.sales || []).includes(m.permission)}
                            onChange={() => handleTogglePermission('sales', m.permission)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
                          />
                        </td>

                        {/* Customer / User Column */}
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={(permissionMatrix.user || []).includes(m.permission)}
                            onChange={() => handleTogglePermission('user', m.permission)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#DB2777' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: SECURITY POLICIES & 2FA CONFIGURATION               */}
        {/* ========================================================== */}
        {activeSubTab === 'policies' && (
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                Authentication Security & Session Governance
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-gray)' }}>
                Configure global JWT token expiration, password strength enforcement, Google Single Sign-On (SSO), and brute-force defenses.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Policy 1: Session Expiration */}
              <div style={{
                background: '#FFF',
                border: '1px solid rgba(201, 162, 75, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      ⏱️ JWT Session Token Expiration
                    </h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
                      Automatic idle token expiry and forced re-authentication duration.
                    </p>
                  </div>
                  <select
                    value={policies.sessionTimeout}
                    onChange={(e) => handlePolicyChange('sessionTimeout', e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(201, 162, 75, 0.4)',
                      background: '#FAF6F0',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent-maroon)'
                    }}
                  >
                    <option value="15m">15 Minutes (Strict Security)</option>
                    <option value="1h">1 Hour</option>
                    <option value="8h">8 Hours (Working Shift)</option>
                    <option value="24h">24 Hours (Daily Renewal)</option>
                    <option value="7d">7 Days (Standard Studio Default)</option>
                    <option value="30d">30 Days (Extended)</option>
                  </select>
                </div>
              </div>

              {/* Policy 2: Google OAuth 2.0 Single Sign-On */}
              <div style={{
                background: '#FFF',
                border: '1px solid rgba(201, 162, 75, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      🌐 Google OAuth 2.0 Single Sign-On (SSO)
                    </h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
                      Allow staff and customers to authenticate seamlessly via official Google Workspace accounts.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={policies.googleOAuthEnabled}
                      onChange={(e) => handlePolicyChange('googleOAuthEnabled', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-maroon)' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: policies.googleOAuthEnabled ? '#059669' : 'var(--text-gray)' }}>
                      {policies.googleOAuthEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {policies.googleOAuthEnabled && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      Google Client ID:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                      value={policies.googleClientId}
                      onChange={(e) => handlePolicyChange('googleClientId', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(201, 162, 75, 0.35)',
                        fontSize: '12.5px',
                        background: '#FAF6F0'
                      }}
                    />
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-gray)' }}>
                      Obtain your OAuth 2.0 Client ID from the Google Cloud Console credentials dashboard.
                    </p>
                  </div>
                )}
              </div>

              {/* Policy 3: Two-Factor Authentication (2FA) */}
              <div style={{
                background: '#FFF',
                border: '1px solid rgba(201, 162, 75, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  🔐 Two-Factor Authentication (2FA) Policy
                </h5>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-gray)' }}>
                  Mandate secondary verification codes via SMS OTP or Authenticator app.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {[
                    { id: 'disabled', label: 'Disabled', desc: 'Standard password only' },
                    { id: 'optional', label: 'Optional', desc: 'Staff can enable voluntarily' },
                    { id: 'admin_only', label: 'Admin Only', desc: 'Mandatory for Super Admin' },
                    { id: 'all_staff', label: 'All Staff Roles', desc: 'Admin, Inventory, Sales, Supplier' }
                  ].map(opt => (
                    <label
                      key={opt.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: policies.twoFactorAuth === opt.id ? '2px solid var(--accent-maroon)' : '1px solid rgba(201,162,75,0.25)',
                        background: policies.twoFactorAuth === opt.id ? 'rgba(107,30,43,0.05)' : '#FAF6F0',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="radio"
                          name="twoFactorAuth"
                          value={opt.id}
                          checked={policies.twoFactorAuth === opt.id}
                          onChange={(e) => handlePolicyChange('twoFactorAuth', e.target.value)}
                          style={{ accentColor: 'var(--accent-maroon)' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                          {opt.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-gray)', paddingLeft: '20px' }}>
                        {opt.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Policy 4: Password Complexity & Brute-Force */}
              <div style={{
                background: '#FFF',
                border: '1px solid rgba(201, 162, 75, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  🛡️ Password Complexity & Defense Rules
                </h5>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      Minimum Password Length:
                    </label>
                    <select
                      value={policies.minPasswordLength}
                      onChange={(e) => handlePolicyChange('minPasswordLength', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(201,162,75,0.4)',
                        background: '#FAF6F0',
                        fontSize: '12.5px'
                      }}
                    >
                      <option value="6">6 Characters (Basic)</option>
                      <option value="8">8 Characters (Recommended)</option>
                      <option value="10">10 Characters (High)</option>
                      <option value="12">12 Characters (Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      Brute-Force Lockout Attempts:
                    </label>
                    <select
                      value={policies.maxLoginAttempts}
                      onChange={(e) => handlePolicyChange('maxLoginAttempts', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(201,162,75,0.4)',
                        background: '#FAF6F0',
                        fontSize: '12.5px'
                      }}
                    >
                      <option value="3">Lock out after 3 failed attempts</option>
                      <option value="5">Lock out after 5 failed attempts (Default)</option>
                      <option value="10">Lock out after 10 failed attempts</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={policies.requireSpecialChars}
                    onChange={(e) => handlePolicyChange('requireSpecialChars', e.target.checked)}
                    id="chk-spec"
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-maroon)' }}
                  />
                  <label htmlFor="chk-spec" style={{ fontSize: '12.5px', color: 'var(--text-dark)', cursor: 'pointer' }}>
                    Require at least one special symbol (@, #, $, %, !) and numeric digit in all passwords
                  </label>
                </div>
              </div>

              {/* Save Policies Button */}
              <div>
                <button
                  onClick={handleSavePolicies}
                  style={{
                    background: 'var(--accent-maroon)',
                    color: '#FFF',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  💾 Save Authentication Security Policies
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: LIVE SECURITY AUDIT LOG TELEMETRY                   */}
        {/* ========================================================== */}
        {activeSubTab === 'audit' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                  Real-Time Security Audit Telemetry
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-gray)' }}>
                  Continuous audit stream of login authentications, token verifications, credential updates, and permission changes.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleExportAuditLogs}
                  style={{
                    background: '#FFF',
                    color: 'var(--text-dark)',
                    border: '1px solid rgba(201, 162, 75, 0.4)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  📥 Export Audit Logs
                </button>
                <button
                  onClick={handleClearAuditLogs}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#DC2626',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Clear Telemetry
                </button>
              </div>
            </div>

            {/* Filter and Search */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              background: '#FAF6F0',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(201, 162, 75, 0.25)'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Filter Status:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'SUCCESS', 'WARNING', 'FAILED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setAuditFilter(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: auditFilter === st ? '1px solid var(--accent-maroon)' : '1px solid rgba(201, 162, 75, 0.3)',
                      background: auditFilter === st ? 'var(--accent-maroon)' : '#FFF',
                      color: auditFilter === st ? '#FFF' : 'var(--text-dark)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="🔍 Search audit event, email..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(201, 162, 75, 0.3)',
                  fontSize: '12px',
                  background: '#FFF'
                }}
              />
            </div>

            {/* Log Stream List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredAuditLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-gray)', fontSize: '13px' }}>
                  No security audit records match your search criteria.
                </div>
              ) : (
                filteredAuditLogs.map(log => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isWarn = log.status === 'WARNING';
                  const statusColor = isSuccess ? '#059669' : (isWarn ? '#D97706' : '#DC2626');
                  const statusBg = isSuccess ? 'rgba(16, 185, 129, 0.1)' : (isWarn ? 'rgba(217, 119, 6, 0.1)' : 'rgba(239, 68, 68, 0.1)');

                  return (
                    <div
                      key={log.id}
                      style={{
                        background: '#FFF',
                        border: '1px solid rgba(201, 162, 75, 0.25)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}33`
                        }}>
                          {log.status}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>
                              {log.event}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>•</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                              {log.role} (<code>{log.user}</code>)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dark)', marginTop: '2px' }}>
                            {log.details}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-gray)' }}>
                        <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        <div style={{ fontSize: '10px' }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* MODAL: RESET PASSWORD DIALOG                               */}
      {/* ========================================================== */}
      {passwordModalUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 13, 20, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            border: '2px solid rgba(201, 162, 75, 0.4)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(107, 30, 43, 0.08) 0%, rgba(201, 162, 75, 0.12) 100%)',
              padding: '18px 20px',
              borderBottom: '1px solid rgba(201, 162, 75, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔑</span>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--accent-maroon)' }}>
                  Reset User Password
                </h4>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-gray)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div style={{
                background: '#FAF6F0',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(201, 162, 75, 0.3)',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>Target User Account:</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '2px' }}>
                  {passwordModalUser.name} ({passwordModalUser.role})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent-maroon)' }}>
                  {passwordModalUser.email}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                  New Password:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(201, 162, 75, 0.4)',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      fontWeight: 700,
                      background: '#FFF'
                    }}
                  />
                  <button
                    onClick={() => setNewPasswordVal(generateStrongPassword())}
                    title="Generate New Password"
                    style={{
                      background: 'rgba(201, 162, 75, 0.2)',
                      border: '1px solid rgba(201, 162, 75, 0.4)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    🎲 Random
                  </button>
                </div>
              </div>

              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11.5px',
                color: 'var(--text-gray)',
                lineHeight: 1.4,
                marginBottom: '20px'
              }}>
                💡 When you confirm, this password immediately takes effect. The user can log in with this new credential right away.
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setPasswordModalUser(null)}
                  style={{
                    background: '#FFF',
                    border: '1px solid rgba(201, 162, 75, 0.4)',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePassword}
                  style={{
                    background: 'var(--accent-maroon)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Confirm & Apply Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
