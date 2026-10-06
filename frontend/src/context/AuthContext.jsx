import React, { createContext, useContext, useState } from 'react';
import { API_BASE_URL } from '../config/api.js';
import { SYSTEM_ROLES, getRoleKeyByTitle, hasRolePermission, isRouteAllowedForRole, getCustomPermissionsForRole } from '../config/roles.js';

const AuthContext = createContext();

function createClientFallbackJwt(payload) {
  try {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 86400,
      iss: 'ThreadLine Auth Engine'
    }));
    const sig = btoa('verified_threadline_sig_' + Date.now());
    return `${header}.${body}.${sig}`;
  } catch (e) {
    return 'fallback_jwt_token_header.payload.signature';
  }
}

export function AuthProvider({ children }) {
  const getStoredItem = (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  };

  const [jwtToken, setJwtToken] = useState(() => {
    return getStoredItem('threadline_jwt_token') || '';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return getStoredItem('threadline_logged_in') === 'true';
  });

  const [userRole, setUserRole] = useState(() => {
    return getStoredItem('threadline_user_role') || (getStoredItem('threadline_logged_in') === 'true' ? 'Admin' : '');
  });

  const [userEmail, setUserEmail] = useState(() => {
    return getStoredItem('threadline_user_email') || (getStoredItem('threadline_logged_in') === 'true' ? 'admin@threadline.com' : '');
  });

  const [userName, setUserName] = useState(() => {
    const stored = getStoredItem('threadline_user_name');
    if (stored === 'Super Admin' || !stored) {
      if (getStoredItem('threadline_logged_in') === 'true') {
        const storedRole = getStoredItem('threadline_user_role');
        const key = getRoleKeyByTitle(storedRole);
        return SYSTEM_ROLES[key]?.name || 'Jeya';
      }
    }
    return stored || (getStoredItem('threadline_logged_in') === 'true' ? 'Jeya' : '');
  });

  const [userAvatar, setUserAvatar] = useState(() => {
    return getStoredItem('threadline_user_avatar') || '';
  });

  const [customerId, setCustomerId] = useState(() => {
    const val = getStoredItem('threadline_customer_id');
    return val ? Number(val) : null;
  });

  const [customerName, setCustomerName] = useState(() => {
    return getStoredItem('threadline_customer_name') || '';
  });

  const [supplierId, setSupplierId] = useState(() => {
    return getStoredItem('threadline_supplier_id') || '';
  });

  const [supplierName, setSupplierName] = useState(() => {
    return getStoredItem('threadline_supplier_name') || '';
  });

  // Calculate active 5-role configuration
  const roleKey = getRoleKeyByTitle(userRole);
  const activeRoleConfig = SYSTEM_ROLES[roleKey] || SYSTEM_ROLES.user;

  const isAdmin = roleKey === 'admin';
  const isSupplier = roleKey === 'supplier';
  const isInventory = roleKey === 'inventory';
  const isSales = roleKey === 'sales';
  const isUser = roleKey === 'user';
  // Retain isCustomerRole for complete backwards compatibility with existing customer views
  const isCustomerRole = isUser;

  const permissions = getCustomPermissionsForRole(roleKey);
  const roleBadge = activeRoleConfig.badge || userRole;
  const roleIcon = activeRoleConfig.icon || '👤';

  const hasPermission = (permission) => hasRolePermission(userRole, permission);
  const isRouteAllowed = (pathname) => isRouteAllowedForRole(userRole, pathname);

  const login = (role, email, custId = null, custName = null, rememberMe = true, suppId = null, suppName = null) => {
    const targetKey = getRoleKeyByTitle(role || email);

    // Safeguard: Check if account has been suspended by Administrator
    try {
      const usersRaw = localStorage.getItem('threadline_auth_users');
      if (usersRaw) {
        const usersMap = JSON.parse(usersRaw);
        const targetAcc = usersMap[targetKey];
        if (targetAcc && targetAcc.status === 'Suspended') {
          alert(`🚫 Access Blocked: The account for ${role || targetKey} (${email}) has been SUSPENDED by the Administrator.`);
          return false;
        }
      }
    } catch (e) {}

    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    const keys = [
      'threadline_logged_in',
      'threadline_user_role',
      'threadline_user_role_key',
      'threadline_user_email',
      'threadline_user_name',
      'threadline_user_avatar',
      'threadline_customer_id',
      'threadline_customer_name',
      'threadline_supplier_id',
      'threadline_supplier_name',
      'threadline_jwt_token'
    ];
    keys.forEach(k => otherStorage.removeItem(k));

    const targetPreset = SYSTEM_ROLES[targetKey] || SYSTEM_ROLES.user;

    const resolvedRole = targetPreset.role;
    const resolvedName = custName || suppName || targetPreset.name || 'User';
    const effectiveCustId = custId || (targetKey === 'user' ? (targetPreset.customerId || 1) : null);
    const effectiveSuppId = suppId || (targetKey === 'supplier' ? 'sup-1' : null);

    storage.setItem('threadline_logged_in', 'true');
    storage.setItem('threadline_user_role', resolvedRole);
    storage.setItem('threadline_user_role_key', targetKey);
    storage.setItem('threadline_user_email', email);
    storage.setItem('threadline_user_name', resolvedName);
    storage.removeItem('threadline_user_avatar');

    // Issue initial client token while asynchronously fetching backend-signed JWT
    const initialToken = createClientFallbackJwt({
      email,
      role: resolvedRole,
      roleKey: targetKey,
      name: resolvedName,
      id: effectiveCustId || effectiveSuppId || targetPreset.id || 'ADMIN-001',
      permissions: targetPreset.permissions
    });
    storage.setItem('threadline_jwt_token', initialToken);
    setJwtToken(initialToken);

    // Call backend API /api/auth/login for genuine signed JWT token
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: resolvedRole, customerId: effectiveCustId, supplierId: effectiveSuppId, name: resolvedName })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.token) {
          storage.setItem('threadline_jwt_token', data.token);
          setJwtToken(data.token);
        }
      })
      .catch(e => {
        console.warn('Backend login JWT exchange fallback active:', e.message);
      });

    if (targetKey === 'user' && effectiveCustId) {
      storage.setItem('threadline_customer_id', effectiveCustId.toString());
      storage.setItem('threadline_customer_name', resolvedName);
      setCustomerId(Number(effectiveCustId));
      setCustomerName(resolvedName);
    } else {
      storage.removeItem('threadline_customer_id');
      storage.removeItem('threadline_customer_name');
      setCustomerId(null);
      setCustomerName('');
    }

    if (targetKey === 'supplier' && effectiveSuppId) {
      storage.setItem('threadline_supplier_id', effectiveSuppId.toString());
      storage.setItem('threadline_supplier_name', resolvedName);
      setSupplierId(effectiveSuppId.toString());
      setSupplierName(resolvedName);
    } else {
      storage.removeItem('threadline_supplier_id');
      storage.removeItem('threadline_supplier_name');
      setSupplierId('');
      setSupplierName('');
    }

    setIsAuthenticated(true);
    setUserRole(resolvedRole);
    setUserEmail(email);
    setUserName(resolvedName);
    setUserAvatar('');
  };

  const googleLogin = (googleUser, role = 'User', custId = null, rememberMe = true) => {
    const email = googleUser.email;
    const name = googleUser.name || 'Google User';
    const picture = googleUser.picture || '';

    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    const keys = [
      'threadline_logged_in',
      'threadline_user_role',
      'threadline_user_role_key',
      'threadline_user_email',
      'threadline_user_name',
      'threadline_user_avatar',
      'threadline_customer_id',
      'threadline_customer_name',
      'threadline_jwt_token'
    ];
    keys.forEach(k => otherStorage.removeItem(k));

    const targetKey = getRoleKeyByTitle(role || email);
    const targetPreset = SYSTEM_ROLES[targetKey] || SYSTEM_ROLES.user;
    const resolvedRole = targetPreset.role;

    storage.setItem('threadline_logged_in', 'true');
    storage.setItem('threadline_user_role', resolvedRole);
    storage.setItem('threadline_user_role_key', targetKey);
    storage.setItem('threadline_user_email', email);
    storage.setItem('threadline_user_name', name);
    if (picture) storage.setItem('threadline_user_avatar', picture);

    const initialToken = createClientFallbackJwt({
      email,
      role: resolvedRole,
      roleKey: targetKey,
      name,
      picture,
      oauth: 'Google',
      permissions: targetPreset.permissions
    });
    storage.setItem('threadline_jwt_token', initialToken);
    setJwtToken(initialToken);

    // Call backend API /api/auth/oauth for genuine JWT token
    fetch(`${API_BASE_URL}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, picture, role: resolvedRole, credential: googleUser.credential || null })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.token) {
          storage.setItem('threadline_jwt_token', data.token);
          setJwtToken(data.token);
        }
      })
      .catch(e => {
        console.warn('Backend OAuth JWT exchange fallback active:', e.message);
      });

    if (targetKey === 'user') {
      const targetId = custId || 1;
      storage.setItem('threadline_customer_id', targetId.toString());
      storage.setItem('threadline_customer_name', name);
      setCustomerId(Number(targetId));
      setCustomerName(name);
    } else {
      storage.removeItem('threadline_customer_id');
      storage.removeItem('threadline_customer_name');
      setCustomerId(null);
      setCustomerName('');
    }

    setIsAuthenticated(true);
    setUserRole(resolvedRole);
    setUserEmail(email);
    setUserName(name);
    setUserAvatar(picture);
  };

  const logout = () => {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, role: userRole })
    }).catch(() => { });

    const keys = [
      'threadline_logged_in',
      'threadline_user_role',
      'threadline_user_role_key',
      'threadline_user_email',
      'threadline_user_name',
      'threadline_user_avatar',
      'threadline_customer_id',
      'threadline_customer_name',
      'threadline_supplier_id',
      'threadline_supplier_name',
      'threadline_jwt_token'
    ];
    keys.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setJwtToken('');
    setIsAuthenticated(false);
    setUserRole('');
    setUserEmail('');
    setUserName('');
    setUserAvatar('');
    setCustomerId(null);
    setCustomerName('');
    setSupplierId('');
    setSupplierName('');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userRole,
      roleKey,
      activeRoleConfig,
      isAdmin,
      isSupplier,
      isInventory,
      isSales,
      isUser,
      isCustomerRole,
      permissions,
      roleBadge,
      roleIcon,
      hasPermission,
      isRouteAllowed,
      userEmail,
      userName,
      userAvatar,
      customerId,
      customerName,
      supplierId,
      supplierName,
      jwtToken,
      login,
      googleLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
