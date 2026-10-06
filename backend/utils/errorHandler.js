// backend/utils/errorHandler.js
// Centralized Error Handling Middleware and Async Controller Wrapper

import { logger } from './logger.js';
import { errorResponse } from './apiResponse.js';

/**
 * Express Global Error Handling Middleware
 */
export function globalErrorHandler(err, req, res, next) {
  logger.error(`Unhandled Exception at ${req.method} ${req.originalUrl}: ${err.message}`, err.stack);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.isOperational ? err.message : 'Internal Server Error';

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}

/**
 * Async handler wrapper to eliminate try-catch boilerplate in controllers (DRY principle)
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
