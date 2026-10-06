# Garment House — Frontend Application

Modern React + Vite frontend for the Garment House / ThreadLine ERP, POS, and Khata Management System.

## Features
- **POS & Billing**: Seamless sales order generation with custom invoicing and GST calculations.
- **Khata Ledger**: Customer balances, credit limits, WhatsApp payment reminders.
- **Analytics & Reporting**: Interactive charts powered by Chart.js.
- **Design Studio**: Pinterest inspiration and custom tailoring requirement tracker.

## Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env
```
Ensure `VITE_GOOGLE_CLIENT_ID` is set if using Google OAuth.

### 3. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
Build output is saved to `dist/`.
