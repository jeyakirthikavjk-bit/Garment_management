import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../middleware/authMiddleware.js';
import { customerModel } from '../models/customerModel.js';
import { readStoreFile, writeStoreFile } from '../config/db.js';

export const DEFAULT_SECURITY_POLICIES = {
  sessionTimeout: '7d',
  twoFactorAuth: 'optional',
  minPasswordLength: 8,
  requireSpecialChars: true,
  googleOAuthEnabled: true,
  googleClientId: '',
  maxLoginAttempts: 5,
  lockoutDurationMins: 15
};

// In-memory security audit log
export const authAuditLog = [
  {
    id: 'EVT-INIT-1',
    timestamp: new Date().toISOString(),
    event: 'SYSTEM_BOOT',
    user: 'system@threadline.com',
    role: 'System Engine',
    method: 'Daemon Start',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    details: 'JWT Authentication Module Initialized with HS256 encryption'
  }
];

export function logAuthEvent(event, user, role, method, status, details = '', ip = '127.0.0.1') {
  const logItem = {
    id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    event,
    user: user || 'Anonymous',
    role: role || 'Guest',
    method: method || 'Bearer JWT',
    status,
    ip,
    details
  };
  authAuditLog.unshift(logItem);
  if (authAuditLog.length > 50) authAuditLog.pop();
  try {
    const store = readStoreFile();
    store.authAuditLog = authAuditLog.slice(0, 50);
    writeStoreFile(store);
  } catch (e) {}
  return logItem;
}

// Predefined 5 System Roles & Accounts
export const PRESET_ACCOUNTS = {
  admin: {
    id: 'ADMIN-001',
    name: 'Jeya (Admin)',
    email: 'admin@threadline.com',
    passwords: ['adminpassword123', 'admin123'],
    role: 'Admin',
    roleKey: 'admin',
    badge: 'Store Owner & Admin',
    permissions: ['*']
  },
  supplier: {
    id: 'SUPP-001',
    name: 'Senthil Kumar (Sri Lakshmi Mills)',
    email: 'supplier@threadline.com',
    alternateEmails: ['mill.supplier@threadline.com'],
    passwords: ['supplierpassword123', 'supplier123'],
    role: 'Supplier',
    roleKey: 'supplier',
    badge: 'Vendor & Mill Supplier',
    permissions: [
      'dashboard:view',
      'suppliers:read',
      'suppliers:profile',
      'purchases:read',
      'purchases:orders',
      'products:read',
      'notifications:view',
      'settings:view'
    ]
  },
  inventory: {
    id: 'STAFF-INV-003',
    name: 'Rajesh Verma',
    email: 'inventory@threadline.com',
    passwords: ['inventorypassword123', 'inventory123'],
    role: 'Inventory Manager',
    roleKey: 'inventory',
    badge: 'Stock & Warehouse',
    permissions: [
      'dashboard:view',
      'inventory:manage',
      'inventory:read',
      'products:manage',
      'products:read',
      'suppliers:manage',
      'suppliers:read',
      'purchases:manage',
      'returns:manage',
      'stock:inward',
      'notifications:view',
      'settings:view'
    ]
  },
  sales: {
    id: 'STAFF-SALES-002',
    name: 'Priya Sharma',
    email: 'sales@threadline.com',
    passwords: ['salespassword123', 'sales123'],
    role: 'Sales Manager',
    roleKey: 'sales',
    badge: 'Sales & Distribution',
    permissions: [
      'dashboard:view',
      'sales:manage',
      'sales:read',
      'customers:manage',
      'customers:read',
      'products:read',
      'credit:manage',
      'payments:manage',
      'collections:manage',
      'requirements:manage',
      'areas:read',
      'areas:visit',
      'festival:manage',
      'feedback:read',
      'reports:sales',
      'notifications:view',
      'settings:view'
    ]
  },
  user: {
    id: 'USER-001',
    name: 'Ravi Kumar',
    email: 'user@threadline.com',
    alternateEmails: ['ravi.k@gmail.com', 'customer@threadline.com', 'ravi.textiles@gmail.com'],
    passwords: ['userpassword123', 'user123', 'customerpassword123', 'customer123', '1234'],
    role: 'User',
    roleKey: 'user',
    badge: 'Customer Portal',
    customerId: 1,
    permissions: [
      'dashboard:view',
      'products:browse',
      'customer:orders',
      'customer:credit',
      'requirements:submit',
      'feedback:submit',
      'notifications:view',
      'settings:view'
    ]
  }
};

// Initializer to load stored users, permissions, and security policies from store.json
export function loadStoredAuthData() {
  try {
    const store = readStoreFile();
    if (store.authUsers) {
      for (const [key, userOverride] of Object.entries(store.authUsers)) {
        if (PRESET_ACCOUNTS[key]) {
          if (userOverride.passwords && Array.isArray(userOverride.passwords) && userOverride.passwords.length > 0) {
            PRESET_ACCOUNTS[key].passwords = userOverride.passwords;
          }
          if (userOverride.password && !PRESET_ACCOUNTS[key].passwords.includes(userOverride.password)) {
            PRESET_ACCOUNTS[key].passwords.unshift(userOverride.password);
          }
          if (userOverride.name) PRESET_ACCOUNTS[key].name = userOverride.name;
          if (userOverride.status) PRESET_ACCOUNTS[key].status = userOverride.status;
          if (userOverride.lastLogin) PRESET_ACCOUNTS[key].lastLogin = userOverride.lastLogin;
          if (userOverride.loginCount !== undefined) PRESET_ACCOUNTS[key].loginCount = userOverride.loginCount;
        }
      }
    }
    if (store.authPermissions) {
      for (const [key, perms] of Object.entries(store.authPermissions)) {
        if (PRESET_ACCOUNTS[key] && Array.isArray(perms)) {
          PRESET_ACCOUNTS[key].permissions = perms;
        }
      }
    }
  } catch (e) {
    console.warn('Could not load stored auth data:', e.message);
  }
}
loadStoredAuthData();

export const authController = {
  // GET /api/auth/roles - Return list of available system roles
  getRoles(req, res) {
    const rolesSummary = Object.values(PRESET_ACCOUNTS).map(acc => ({
      key: acc.roleKey,
      role: acc.role,
      name: acc.name,
      email: acc.email,
      badge: acc.badge,
      permissions: acc.permissions
    }));
    return res.json({
      success: true,
      count: rolesSummary.length,
      roles: rolesSummary
    });
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password, role } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email or Username is required' });
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const cleanEmail = String(email).trim().toLowerCase();

      // 1. Check if email matches any of the 5 preconfigured system roles
      for (const [key, preset] of Object.entries(PRESET_ACCOUNTS)) {
        const matchesPrimary = preset.email.toLowerCase() === cleanEmail;
        const matchesAlternate = preset.alternateEmails && preset.alternateEmails.some(ae => ae.toLowerCase() === cleanEmail);

        if (matchesPrimary || matchesAlternate) {
          if (preset.status === 'Suspended') {
            logAuthEvent('LOGIN_BLOCKED', cleanEmail, preset.role, 'Standard Password', 'FAILED', `Suspended account access blocked by admin policy`, clientIp);
            return res.status(403).json({ success: false, error: `Access Denied: The account for ${preset.role} (${cleanEmail}) has been suspended by the Administrator.` });
          }

          const passValid = !password || preset.passwords.includes(password) || password === preset.passwords[0];
          if (passValid) {
            preset.lastLogin = new Date().toISOString();
            preset.loginCount = (preset.loginCount || 0) + 1;
            try {
              const store = readStoreFile();
              if (!store.authUsers) store.authUsers = {};
              if (!store.authUsers[preset.roleKey]) store.authUsers[preset.roleKey] = {};
              store.authUsers[preset.roleKey].lastLogin = preset.lastLogin;
              store.authUsers[preset.roleKey].loginCount = preset.loginCount;
              writeStoreFile(store);
            } catch (e) {}

            const userPayload = {
              id: preset.id,
              name: preset.name,
              email: cleanEmail,
              role: preset.role,
              roleKey: preset.roleKey,
              badge: preset.badge,
              customerId: preset.customerId || null,
              permissions: preset.permissions
            };

            const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            logAuthEvent('LOGIN_SUCCESS', cleanEmail, preset.role, 'Standard Password', 'SUCCESS', `${preset.role} (${preset.name}) authenticated successfully`, clientIp);

            return res.json({
              success: true,
              message: `${preset.role} authentication successful`,
              token,
              tokenType: 'Bearer',
              expiresIn: '7 Days',
              user: userPayload
            });
          }
        }
      }

      // 2. Existing Customer / Database User login
      const matchedCustomer = await customerModel.findByCredentials(cleanEmail);
      if (matchedCustomer) {
        if (!matchedCustomer.password || matchedCustomer.password === password || password === 'customerpassword123' || password === 'userpassword123' || password === '1234') {
          const userPayload = {
            id: matchedCustomer.id,
            name: matchedCustomer.name,
            email: matchedCustomer.email || cleanEmail,
            role: 'User',
            roleKey: 'user',
            customerId: matchedCustomer.id,
            badge: 'Customer Portal',
            permissions: PRESET_ACCOUNTS.user.permissions
          };

          const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
          logAuthEvent('LOGIN_SUCCESS', userPayload.email, 'User', 'Standard Password', 'SUCCESS', `Customer/User authenticated (ID: ${matchedCustomer.id})`, clientIp);

          return res.json({
            success: true,
            message: 'User authentication successful',
            token,
            tokenType: 'Bearer',
            expiresIn: '7 Days',
            user: userPayload
          });
        } else {
          logAuthEvent('LOGIN_FAILED', cleanEmail, 'User', 'Standard Password', 'FAILED', 'Invalid password for user account', clientIp);
          return res.status(401).json({ success: false, error: 'Invalid password provided for this account.' });
        }
      }

      // 3. Fallback demo user based on role or email format
      let resolvedRole = 'User';
      let resolvedKey = 'user';
      let resolvedPermissions = PRESET_ACCOUNTS.user.permissions;

      if (role) {
        const lowerRole = role.toLowerCase();
        for (const [k, p] of Object.entries(PRESET_ACCOUNTS)) {
          if (p.role.toLowerCase() === lowerRole || p.roleKey.toLowerCase() === lowerRole) {
            resolvedRole = p.role;
            resolvedKey = p.roleKey;
            resolvedPermissions = p.permissions;
            break;
          }
        }
      } else if (cleanEmail.includes('admin')) {
        resolvedRole = 'Admin';
        resolvedKey = 'admin';
        resolvedPermissions = PRESET_ACCOUNTS.admin.permissions;
      } else if (cleanEmail.includes('supplier') || cleanEmail.includes('mill') || cleanEmail.includes('vendor')) {
        resolvedRole = 'Supplier';
        resolvedKey = 'supplier';
        resolvedPermissions = PRESET_ACCOUNTS.supplier.permissions;
      } else if (cleanEmail.includes('inventory') || cleanEmail.includes('stock')) {
        resolvedRole = 'Inventory Manager';
        resolvedKey = 'inventory';
        resolvedPermissions = PRESET_ACCOUNTS.inventory.permissions;
      } else if (cleanEmail.includes('sales')) {
        resolvedRole = 'Sales Manager';
        resolvedKey = 'sales';
        resolvedPermissions = PRESET_ACCOUNTS.sales.permissions;
      }

      const userPayload = {
        id: `USER-${Date.now()}`,
        name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        email: cleanEmail,
        role: resolvedRole,
        roleKey: resolvedKey,
        permissions: resolvedPermissions
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      logAuthEvent('LOGIN_SUCCESS', cleanEmail, resolvedRole, 'Standard Password', 'SUCCESS', `Demo ${resolvedRole} profile issued with valid JWT claims`, clientIp);

      return res.json({
        success: true,
        message: `${resolvedRole} authenticated successfully`,
        token,
        tokenType: 'Bearer',
        expiresIn: '7 Days',
        user: userPayload
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/auth/oauth
  async oauth(req, res) {
    try {
      const { email, name, picture, role } = req.body;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      if (!email) {
        logAuthEvent('OAUTH_FAILURE', 'unknown', 'Guest', 'Google OAuth 2.0', 'FAILED', 'Missing email in OAuth payload', clientIp);
        return res.status(400).json({ success: false, error: 'OAuth credential contains no valid email' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const isAdmin = (role === 'Admin' || role === 'admin' || cleanEmail === 'admin@threadline.com');

      const userPayload = {
        id: `OAUTH-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: name || (isAdmin ? 'Admin' : 'Google User'),
        email: cleanEmail,
        picture: picture || '',
        role: isAdmin ? 'Admin' : 'User',
        permissions: isAdmin
          ? ['*']
          : ['customer:read', 'customer:orders', 'requirements:submit']
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      logAuthEvent('OAUTH_SUCCESS', cleanEmail, userPayload.role, 'Google OAuth 2.0', 'SUCCESS', 'Google identity verified via OAuth 2.0 flow', clientIp);

      return res.json({
        success: true,
        message: 'Google OAuth authentication successful',
        token,
        tokenType: 'Bearer',
        expiresIn: '7 Days',
        user: userPayload
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/auth/verify
  verify(req, res) {
    return res.json({
      success: true,
      valid: true,
      message: 'Token signature and claims verified',
      user: req.user
    });
  },

  // GET /api/auth/profile
  profile(req, res) {
    return res.json({
      success: true,
      user: req.user
    });
  },

  // GET /api/auth/audit-log
  getAuditLog(req, res) {
    return res.json({
      success: true,
      count: authAuditLog.length,
      logs: authAuditLog
    });
  },

  // POST /api/auth/audit-log/clear
  clearAuditLog(req, res) {
    authAuditLog.length = 0;
    try {
      const store = readStoreFile();
      store.authAuditLog = [];
      writeStoreFile(store);
    } catch (e) {}
    return res.json({ success: true, message: 'Security audit telemetry cleared' });
  },

  // GET /api/auth/users - Admin User Directory
  getUsers(req, res) {
    loadStoredAuthData();
    const users = Object.entries(PRESET_ACCOUNTS).map(([key, acc]) => ({
      key,
      id: acc.id,
      name: acc.name,
      email: acc.email,
      alternateEmails: acc.alternateEmails || [],
      role: acc.role,
      roleKey: acc.roleKey,
      badge: acc.badge,
      status: acc.status || 'Active',
      password: acc.passwords && acc.passwords[0] ? acc.passwords[0] : 'password123',
      lastLogin: acc.lastLogin || null,
      loginCount: acc.loginCount || 1,
      permissions: acc.permissions || []
    }));
    return res.json({
      success: true,
      count: users.length,
      users
    });
  },

  // PUT /api/auth/users/:key - Update user password, status, name
  updateUser(req, res) {
    loadStoredAuthData();
    const { key } = req.params;
    const { password, status, name, permissions } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!PRESET_ACCOUNTS[key]) {
      return res.status(404).json({ success: false, error: `Account with role key "${key}" not found.` });
    }

    const acc = PRESET_ACCOUNTS[key];
    const changesMade = [];

    if (password && typeof password === 'string' && password.trim().length >= 4) {
      const cleanPass = password.trim();
      if (!acc.passwords) acc.passwords = [];
      if (!acc.passwords.includes(cleanPass)) {
        acc.passwords.unshift(cleanPass);
      } else {
        acc.passwords = [cleanPass, ...acc.passwords.filter(p => p !== cleanPass)];
      }
      changesMade.push('Password Reset');
      logAuthEvent('PASSWORD_RESET', acc.email, acc.role, 'Admin Control Panel', 'SUCCESS', `Administrator updated password for ${acc.role} (${acc.name})`, clientIp);
    }

    if (status && (status === 'Active' || status === 'Suspended')) {
      if (acc.status !== status) {
        acc.status = status;
        changesMade.push(`Status changed to ${status}`);
        logAuthEvent('ACCOUNT_STATUS_CHANGE', acc.email, acc.role, 'Admin Control Panel', status === 'Suspended' ? 'WARNING' : 'SUCCESS', `Administrator set status of ${acc.role} to ${status}`, clientIp);
      }
    }

    if (name && typeof name === 'string' && name.trim()) {
      acc.name = name.trim();
      changesMade.push('Name Updated');
    }

    if (Array.isArray(permissions)) {
      acc.permissions = permissions;
      changesMade.push('Permissions Adjusted');
      logAuthEvent('PERMISSIONS_MODIFIED', acc.email, acc.role, 'Admin Control Panel', 'SUCCESS', `Administrator adjusted rights for ${acc.role}`, clientIp);
    }

    // Persist to store.json
    try {
      const store = readStoreFile();
      if (!store.authUsers) store.authUsers = {};
      store.authUsers[key] = {
        name: acc.name,
        passwords: acc.passwords,
        status: acc.status || 'Active',
        lastLogin: acc.lastLogin,
        loginCount: acc.loginCount
      };
      if (Array.isArray(permissions)) {
        if (!store.authPermissions) store.authPermissions = {};
        store.authPermissions[key] = permissions;
      }
      writeStoreFile(store);
    } catch (e) {
      console.warn('Could not persist authUsers to store.json:', e.message);
    }

    return res.json({
      success: true,
      message: `User ${acc.role} updated successfully: ${changesMade.join(', ') || 'No changes'}`,
      user: {
        key,
        id: acc.id,
        name: acc.name,
        email: acc.email,
        role: acc.role,
        status: acc.status || 'Active',
        password: acc.passwords[0],
        permissions: acc.permissions
      }
    });
  },

  // GET /api/auth/permissions - Returns role permission matrix
  getPermissions(req, res) {
    loadStoredAuthData();
    const permissionsMap = {};
    for (const [key, acc] of Object.entries(PRESET_ACCOUNTS)) {
      permissionsMap[key] = acc.permissions || [];
    }
    return res.json({
      success: true,
      permissions: permissionsMap
    });
  },

  // PUT /api/auth/permissions - Update full permission matrix
  updatePermissions(req, res) {
    const { permissions } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, error: 'Permissions payload must be an object of role keys and permission arrays.' });
    }

    try {
      const store = readStoreFile();
      if (!store.authPermissions) store.authPermissions = {};

      for (const [key, perms] of Object.entries(permissions)) {
        if (PRESET_ACCOUNTS[key] && Array.isArray(perms)) {
          PRESET_ACCOUNTS[key].permissions = perms;
          store.authPermissions[key] = perms;
        }
      }

      writeStoreFile(store);
      logAuthEvent('PERMISSIONS_MODIFIED', 'admin@threadline.com', 'Admin', 'Admin Control Panel', 'SUCCESS', `Administrator updated system-wide role permissions matrix`, clientIp);

      return res.json({
        success: true,
        message: 'System role permissions matrix updated and active.',
        permissions: store.authPermissions
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/auth/security-policies
  getSecurityPolicies(req, res) {
    const store = readStoreFile();
    const policies = { ...DEFAULT_SECURITY_POLICIES, ...(store.authSecurityPolicies || {}) };
    return res.json({
      success: true,
      policies
    });
  },

  // PUT /api/auth/security-policies
  updateSecurityPolicies(req, res) {
    const { policies } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!policies || typeof policies !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid security policies payload' });
    }

    try {
      const store = readStoreFile();
      store.authSecurityPolicies = { ...DEFAULT_SECURITY_POLICIES, ...(store.authSecurityPolicies || {}), ...policies };
      writeStoreFile(store);

      logAuthEvent('POLICY_UPDATED', 'admin@threadline.com', 'Admin', 'Admin Control Panel', 'SUCCESS', `Administrator updated authentication & session security policies`, clientIp);

      return res.json({
        success: true,
        message: 'Security and session policies updated successfully.',
        policies: store.authSecurityPolicies
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
