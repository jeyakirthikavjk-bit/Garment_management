// backend/server.js
// Main Server Entry Point: Initializes DB, schedulers, loads config, and listens for client requests

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import app from './app.js';
import { initializeDatabase } from './config/db.js';
import { initReminderScheduler } from './services/reminderService.js';
import { logger } from './utils/logger.js';

// Resolve directory and config environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configEnvPath = path.join(__dirname, 'config.env');
const defaultEnvPath = path.join(__dirname, '.env');

// Prioritize config.env if present, otherwise fallback to .env
if (fs.existsSync(configEnvPath)) {
  dotenv.config({ path: configEnvPath });
  logger.info(`Loaded configuration from config.env`);
} else {
  dotenv.config({ path: defaultEnvPath });
  logger.info(`Loaded configuration from .env`);
}

const PORT = process.env.PORT || 5000;

// Initialize Database connection and background schedulers
initializeDatabase().catch(err => {
  logger.warn('Initial database connection notice:', err.message);
});
initReminderScheduler();

// Start HTTP listening server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Garment ERP & POS Backend Server listening on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'} | Port: ${PORT}`);
});

// Graceful Process Termination
const handleShutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
