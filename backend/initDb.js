// backend/initDb.js
// Database Schema Migration & Seeder for Local & Railway Cloud Deployments

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { getDbConfig } from './config/db.js';
import { seedDatabase } from './seedData.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prioritize config.env if present, otherwise fallback to .env
const envPath = fs.existsSync(path.join(__dirname, 'config.env'))
  ? path.join(__dirname, 'config.env')
  : path.join(__dirname, '.env');
dotenv.config({ path: envPath });

export async function initDb() {
  const config = getDbConfig();
  const targetHost = config.host || 'Railway Cloud';
  const targetDb = config.database || 'railway';

  logger.info(`=======================================================`);
  logger.info(`🚀 Starting MySQL Database Initialization`);
  logger.info(`   Host:     ${targetHost}`);
  logger.info(`   Database: ${targetDb}`);
  logger.info(`   Port:     ${config.port || 3306}`);
  logger.info(`=======================================================`);

  // 1. Read schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.sql not found at ${schemaPath}`);
  }

  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Remove SQL comments (-- comment)
  schemaSql = schemaSql.replace(/--.*$/gm, '');

  // Strip CREATE DATABASE and USE statements so tables are created directly in the active DB (e.g. railway or threadline_db)
  schemaSql = schemaSql
    .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+[^;]+;/gi, '')
    .replace(/USE\s+[^;]+;/gi, '');

  // Extract individual SQL statements
  const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  logger.info(`Executing ${statements.length} table schema statements...`);

  // Connect to target database
  let connection;
  try {
    if (config.uri && !config.host) {
      connection = await mysql.createConnection(config.uri);
    } else {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });
    }
  } catch (connErr) {
    logger.error(`❌ Connection failed to MySQL at ${targetHost}:${config.port || 3306}: ${connErr.message}`);
    logger.error(`Please verify your Railway connection parameters or environment variables.`);
    throw connErr;
  }

  try {
    let executedCount = 0;
    for (const sql of statements) {
      if (sql.toUpperCase().startsWith('SELECT')) continue;
      await connection.query(sql);
      executedCount++;
    }
    logger.info(`✅ Successfully verified & created all ${executedCount} relational tables!`);
  } finally {
    await connection.end();
  }

  // 2. Populate application initial store & collections
  logger.info('Populating seed data collections into MySQL...');
  await seedDatabase();

  logger.info(`=======================================================`);
  logger.info(`🎉 Database setup complete on Railway/MySQL!`);
  logger.info(`=======================================================`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDb()
    .then(() => process.exit(0))
    .catch(err => {
      logger.error('Fatal initialization error:', err.message);
      process.exit(1);
    });
}
