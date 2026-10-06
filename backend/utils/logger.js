// backend/utils/logger.js
// Centralized Logging Utility for Garment ERP & POS

export const logger = {
  info: (message, meta = '') => {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[36m[INFO]\x1b[0m ${timestamp} - ${message}`, meta ? meta : '');
  },

  warn: (message, meta = '') => {
    const timestamp = new Date().toISOString();
    console.warn(`\x1b[33m[WARN]\x1b[0m ${timestamp} - ${message}`, meta ? meta : '');
  },

  error: (message, meta = '') => {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[ERROR]\x1b[0m ${timestamp} - ${message}`, meta ? meta : '');
  },

  http: (req) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    console.log(`\x1b[32m[HTTP]\x1b[0m ${timestamp} - ${method} ${url} from ${ip}`);
  }
};
