// Authentication Facade (Re-exports from middleware, controllers, routes for MVC modularity)
export { JWT_SECRET, JWT_EXPIRES_IN, authenticateJwt, optionalJwt } from './middleware/authMiddleware.js';
export { authAuditLog, logAuthEvent, authController } from './controllers/authController.js';
export { authRouter } from './routes/authRoutes.js';
