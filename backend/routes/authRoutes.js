import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

export const authRouter = express.Router();

// 1. Password / Standard Login Endpoint
authRouter.post('/login', authController.login);

// 2. OAuth Authentication Endpoint (Google Identity / OAuth 2.0)
authRouter.post('/oauth', authController.oauth);

// 3. Verify Token Validity
authRouter.get('/verify', authenticateJwt, authController.verify);

// 4. Current Logged In User Profile
authRouter.get('/profile', authenticateJwt, authController.profile);

// 5. Audit Log Telemetry (Admin Security Screen)
authRouter.get('/audit-log', authController.getAuditLog);

// 6. Clear Audit Log
authRouter.post('/audit-log/clear', authController.clearAuditLog);

// 7. Admin User Accounts & Credentials Management
authRouter.get('/users', authController.getUsers);
authRouter.put('/users/:key', authController.updateUser);

// 8. Admin Permissions Matrix Management
authRouter.get('/permissions', authController.getPermissions);
authRouter.put('/permissions', authController.updatePermissions);

// 9. Admin Security & Session Policies Management
authRouter.get('/security-policies', authController.getSecurityPolicies);
authRouter.put('/security-policies', authController.updateSecurityPolicies);
