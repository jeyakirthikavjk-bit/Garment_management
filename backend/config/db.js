import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, '..', 'data', 'store.json');

// Helper to read fallback JSON store
export function readStoreFile() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read fallback store.json:', e.message);
  }
  return {};
}

// Helper to write fallback JSON store
export function writeStoreFile(data) {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('Could not write fallback store.json:', e.message);
    return false;
  }
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'threadline_db';

let pool = null;
let isDbConnected = false;
let initPromise = null;

// Initialize MySQL connection and ensure database & tables exist
export async function initializeDatabase() {
  if (isDbConnected && pool) {
    return pool;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // 1. Initial connection to create database if it doesn't exist
      const bootstrapConn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        connectTimeout: 5000
      });

      await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await bootstrapConn.end();

      // 2. Create optimized connection pool for the target database
      pool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      // 3. Test pool connectivity
      const testConn = await pool.getConnection();
      testConn.release();

      // 4. Create App Collections table for dynamic JSON sync
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_collections (
          collection_name VARCHAR(100) PRIMARY KEY,
          collection_data LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      isDbConnected = true;
      console.log(`✅ MySQL Database "${DB_NAME}" connected & initialized successfully!`);
      return pool;
    } catch (error) {
      console.warn(`ℹ️ MySQL connection notice (${error.message}). Operating with local high-speed persistent store.`);
      isDbConnected = false;
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

export function isConnected() {
  return isDbConnected && pool !== null;
}

export function getPool() {
  return pool;
}

// Execute custom SQL query
export async function query(sql, params = []) {
  const p = await initializeDatabase();
  if (!p) throw new Error('MySQL connection is not active');
  const [rows] = await p.execute(sql, params);
  return rows;
}

// Fetch all collections formatted as a single DB object
export async function getAllCollectionsFromDb() {
  try {
    const p = await initializeDatabase();
    if (p) {
      const [rows] = await p.query('SELECT collection_name, collection_data FROM app_collections');
      if (rows && rows.length > 0) {
        const result = {};
        for (const row of rows) {
          try {
            result[row.collection_name] = JSON.parse(row.collection_data);
          } catch (e) {
            result[row.collection_name] = row.collection_data;
          }
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('MySQL read fallback to local store:', err.message);
  }
  return readStoreFile();
}

// Bulk sync full database JSON payload
export async function syncDbCollections(dbPayload) {
  let mysqlSynced = false;
  try {
    const p = await initializeDatabase();
    if (p && dbPayload && typeof dbPayload === 'object') {
      for (const [key, value] of Object.entries(dbPayload)) {
        const jsonStr = JSON.stringify(value);
        await p.query(
          `INSERT INTO app_collections (collection_name, collection_data)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE collection_data = VALUES(collection_data)`,
          [key, jsonStr]
        );
      }
      mysqlSynced = true;
    }
  } catch (err) {
    console.warn('MySQL bulk sync fallback to local store:', err.message);
  }

  // Always sync to local store.json for offline fallback resilience
  writeStoreFile(dbPayload);
  return { success: true, mysqlSynced };
}

// Fetch a single table/collection
export async function getSingleCollectionFromDb(tableName) {
  try {
    const p = await initializeDatabase();
    if (p) {
      const [rows] = await p.query(
        'SELECT collection_data FROM app_collections WHERE collection_name = ?',
        [tableName]
      );
      if (rows && rows.length > 0) {
        return JSON.parse(rows[0].collection_data);
      }
    }
  } catch (err) {
    console.warn(`MySQL fetch table "${tableName}" fallback:`, err.message);
  }
  const store = readStoreFile();
  return store[tableName] || [];
}

// Save a single table/collection
export async function saveSingleCollectionToDb(tableName, data) {
  let mysqlSaved = false;
  try {
    const p = await initializeDatabase();
    if (p) {
      const jsonStr = JSON.stringify(data);
      await p.query(
        `INSERT INTO app_collections (collection_name, collection_data)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE collection_data = VALUES(collection_data)`,
        [tableName, jsonStr]
      );
      mysqlSaved = true;
    }
  } catch (err) {
    console.warn(`MySQL save table "${tableName}" fallback:`, err.message);
  }

  const store = readStoreFile();
  store[tableName] = data;
  writeStoreFile(store);
  return { success: true, mysqlSaved };
}
