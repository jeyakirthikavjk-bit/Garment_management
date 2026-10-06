// backend/seedData.js
// Database Seeding Module - Populates persistent data store with initial essential garment retail records

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase, syncDbCollections, getAllCollectionsFromDb, isConnected } from './config/db.js';
import { logger } from './utils/logger.js';

// Load environment configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = fs.existsSync(path.join(__dirname, 'config.env')) ? path.join(__dirname, 'config.env') : path.join(__dirname, '.env');
dotenv.config({ path: envPath });

export async function seedDatabase() {
  logger.info('Initializing persistent data store for seeding...');
  
  // Connect to DB (MySQL or fallback JSON engine)
  await initializeDatabase();
  const dbConnected = isConnected();
  logger.info(`Storage Engine Status: ${dbConnected ? 'MySQL Connected' : 'Local JSON Data Store Active'}`);

  const storePath = path.join(__dirname, 'data', 'store.json');
  if (!fs.existsSync(storePath)) {
    logger.error(`Seed source data missing at ${storePath}`);
    return false;
  }

  const raw = fs.readFileSync(storePath, 'utf8');
  const seedPayload = JSON.parse(raw);

  logger.info('Synchronizing collections into database...');
  await syncDbCollections(seedPayload);

  const verification = await getAllCollectionsFromDb();
  const counts = Object.keys(verification).map(key => `${key}: ${Array.isArray(verification[key]) ? verification[key].length : 1}`);
  
  logger.info(`✅ Seeding Complete! Seeded entities -> ${counts.join(', ')}`);
  return true;
}

// Allow direct execution: `node seedData.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Failed to seed database:', err);
      process.exit(1);
    });
}
