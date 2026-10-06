// backend/app.js
// Express Application Configuration & Middleware Setup

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Modular REST Routers
import { authRouter } from './routes/authRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { customerRouter } from './routes/customerRoutes.js';
import { apiV1Router } from './routes/apiV1Routes.js';
import { chatbotRouter } from './routes/chatbotRoutes.js';
import { apiRemindersRouter } from './routes/reminderRoutes.js';
import { supplierRouter } from './routes/supplierRoutes.js';

// Utilities & Services
import { logger } from './utils/logger.js';
import { globalErrorHandler } from './utils/errorHandler.js';
import { computeServerAnalytics } from './services/analyticsService.js';
import {
  isConnected,
  getAllCollectionsFromDb,
  syncDbCollections,
  getSingleCollectionFromDb,
  saveSingleCollectionToDb,
  query,
  initializeDatabase
} from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, '../frontend/dist');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    logger.http(req);
  }
  next();
});

// Mount Sub-Module REST API Routers
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/customer', customerRouter);
app.use('/api/v1', apiV1Router);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/reminders', apiRemindersRouter);
app.use('/api/supplier', supplierRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const dbConn = await initializeDatabase();
  const dbName = process.env.DB_NAME || 'threadline_db';
  const dbHost = process.env.DB_HOST || 'localhost';

  if (!dbConn) {
    return res.status(503).json({
      status: 'offline',
      engine: 'MySQL',
      message: 'MySQL server unreachable or connection failed. Using local resilient data store.'
    });
  }

  return res.json({
    status: 'online',
    engine: 'MySQL',
    database: dbName,
    host: dbHost,
    connected: true,
    timestamp: new Date().toISOString()
  });
});

// Full DB State Endpoint
app.get('/api/db', async (req, res) => {
  try {
    const fullDb = await getAllCollectionsFromDb();
    return res.json({ success: true, data: fullDb });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Full DB State Sync Endpoint
app.post('/api/db/sync', async (req, res) => {
  const dbData = req.body;
  if (!dbData || typeof dbData !== 'object') {
    return res.status(400).json({ error: 'Invalid database payload' });
  }

  try {
    await syncDbCollections(dbData);
    return res.json({ success: true, message: 'Database synchronized successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Single Table / Collection Endpoint
app.get('/api/collection/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    const data = await getSingleCollectionFromDb(tableName);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/collection/:tableName', async (req, res) => {
  const { tableName } = req.params;
  try {
    await saveSingleCollectionToDb(tableName, req.body);
    return res.json({ success: true, message: `Table ${tableName} updated in database` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Analytics Dashboard Endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const fullDb = await getAllCollectionsFromDb();
    const analytics = computeServerAnalytics(fullDb, req.query);
    return res.json({ success: true, data: analytics });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Direct Query Execution Endpoint
app.post('/api/query', async (req, res) => {
  const { sql, params } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query parameter is required' });
  }
  try {
    const rows = await query(sql, params || []);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Pinterest Fashion Inspiration Image Fetch Endpoint
app.get('/api/pinterest/fetch', async (req, res) => {
  const pinUrl = req.query.url;
  if (!pinUrl) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  try {
    const trimmed = String(pinUrl).trim();
    if (trimmed.includes('i.pinimg.com')) {
      const ultraHdUrl = trimmed.replace(/\/(236x|474x|564x)\//g, '/originals/');
      return res.json({
        success: true,
        imageUrl: ultraHdUrl,
        title: 'Pinterest High-Resolution Pin Image',
        resolution: 'Ultra HD'
      });
    }

    const response = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Pinterest fetch returned HTTP ${response.status}`);
    }

    const html = await response.text();
    let imageUrl = '';
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      imageUrl = ogImageMatch[1];
    }

    if (!imageUrl) {
      const pinImgMatch = html.match(/https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x)\/[a-zA-Z0-9_/.\-]+\.(?:jpg|jpeg|png|webp)/i);
      if (pinImgMatch && pinImgMatch[0]) {
        imageUrl = pinImgMatch[0];
      }
    }

    if (!imageUrl) {
      return res.status(404).json({ error: 'Could not extract image from Pinterest URL' });
    }

    const ultraHdUrl = imageUrl.replace(/\/(236x|474x|564x)\//g, '/originals/');
    return res.json({
      success: true,
      imageUrl: ultraHdUrl,
      title: 'Pinterest Fashion Garment',
      resolution: 'Ultra HD (Originals)'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// HTML API Status Landing View
app.get(['/api/status', ...(fs.existsSync(frontendDist) ? [] : ['/'])], (req, res) => {
  const connected = isConnected();
  const port = process.env.PORT || 5000;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Garment ERP & POS API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1120; color: #f8fafc; padding: 40px; margin: 0; display: flex; justify-content: center; }
          .card { width: 100%; max-width: 640px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; box-shadow: 0 20px 35px rgba(0,0,0,0.5); }
          .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
          .online { background: #064e3b; color: #34d399; border: 1px solid #059669; }
          h1 { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #fff; }
          p { color: #94a3b8; font-size: 15px; margin: 8px 0; }
          code { background: #0f172a; padding: 3px 8px; border-radius: 6px; color: #38bdf8; font-family: ui-monospace, monospace; font-size: 14px; }
          hr { border: none; border-top: 1px solid #334155; margin: 24px 0; }
          ul { line-height: 2; padding-left: 20px; margin: 0; color: #94a3b8; }
          a { color: #38bdf8; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge online"><span>●</span> ${connected ? 'MySQL Engine Ready' : 'Local Persistent Engine Active'}</span>
          <h1>Garment ERP & POS API Server</h1>
          <p>Running on <code>http://localhost:${port}</code></p>
          <hr />
          <h3>Segregated REST Modules:</h3>
          <ul>
            <li><code>/api/auth</code> - Authentication & Auditing</li>
            <li><code>/api/admin</code> - Admin Operations & Management</li>
            <li><code>/api/customer</code> - Customer Portal & Self-Service</li>
            <li><code>/api/v1</code> - Universal Resource Endpoints</li>
            <li><code>/api/reminders</code> - Automated WhatsApp Reminders</li>
            <li><code>/api/chatbot</code> - AI Assistant</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Serve frontend dist if available
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Centralized Error Handler
app.use(globalErrorHandler);

export default app;
