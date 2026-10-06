import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'threadline_super_secure_jwt_secret_token_key_2026';
export const JWT_EXPIRES_IN = '7d';

// Middleware: Authenticate incoming Bearer JWT Token
export function authenticateJwt(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (authHeader) {
    token = authHeader;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access Denied: Missing Bearer Authorization Token',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid or expired JWT Token',
      details: err.message,
      code: 'AUTH_TOKEN_INVALID'
    });
  }
}

// Optional Authentication Middleware (extracts user if valid, doesn't block if missing)
export function optionalJwt(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  return next();
}

// Middleware: Enforce Role-Based Access Control on backend API endpoints
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied: Authentication required for this operation',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoleKey = (req.user.roleKey || req.user.role || '').toLowerCase();
    // Admin has full unrestricted master access
    if (userRoleKey === 'admin' || userRoleKey.includes('admin') || req.user.role === 'Admin') {
      return next();
    }

    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    const isAllowed = normalizedAllowed.some(r =>
      userRoleKey === r ||
      userRoleKey.includes(r) ||
      (req.user.role && req.user.role.toLowerCase() === r)
    );

    if (isAllowed) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role || 'Guest'}`,
      code: 'INSUFFICIENT_ROLE'
    });
  };
}

// Middleware: Enforce specific permission claim on backend API endpoints
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied: Authentication required for this operation',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoleKey = (req.user.roleKey || req.user.role || '').toLowerCase();
    if (userRoleKey === 'admin' || req.user.role === 'Admin' || (req.user.permissions && req.user.permissions.includes('*'))) {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Missing required permission [${permission}]`,
      code: 'INSUFFICIENT_PERMISSION'
    });
  };
}
