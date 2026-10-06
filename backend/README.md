# ThreadLine Garment ERP & POS — Backend Server (MVC Architecture)

An enterprise-grade Node.js and Express REST API backend built using the **Model-View-Controller (MVC)** architectural design pattern, connected with MySQL connection pooling and automated background jobs.

---

## 🏛️ Architectural Pattern: Model-View-Controller (MVC)

```
backend/
├── config/                  # Configuration Layer
│   └── db.js                # MySQL pool initialization & fallback store
├── models/                  # Model Layer (Data & Schema abstraction)
│   ├── customerModel.js     # Customer records & mathematical credit risk scoring
│   ├── productModel.js      # Garment inventory catalog & stock deductions
│   └── salesModel.js        # Sales billing, invoices & ledger records
├── controllers/             # Controller Layer (Request orchestration & business logic)
│   ├── authController.js    # JWT authentication, Google OAuth & security audit logs
│   ├── customerController.js# Customer queries, Khata ledger & risk filters
│   ├── productController.js # Product catalog filtering & low-stock alerts
│   ├── salesController.js   # Invoice generation & automatic inventory deduction
│   ├── reminderController.js# Automated WhatsApp/SMS payment reminders
│   └── analyticsController.js# KPI computation, store telemetry & API key index
├── routes/                  # Routing Layer (Mapping HTTP endpoints to controllers)
│   ├── authRoutes.js        # Mounts /api/auth
│   ├── apiV1Routes.js       # Mounts /api/v1 (REST endpoints)
│   ├── reminderRoutes.js    # Mounts /api/reminders
│   └── chatbotRoutes.js     # Mounts /api/chatbot
├── middleware/              # Interceptors & Security Layer
│   └── authMiddleware.js    # Bearer JWT token verification & claims decoding
├── services/                # Background Jobs & Computational Services
│   ├── reminderService.js   # Automated cron scheduler for overdue notices
│   └── analyticsService.js  # Revenue indices & statistical algorithms
├── data/
│   └── store.json           # High-speed resilient JSON store
├── schema.sql               # MySQL relational database DDL schema
└── index.js                 # Express server bootstrap & router mounting
```

---

## 🔌 Primary REST API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` — Standard credentials login (Admin / Retailer)
- `POST /api/auth/oauth` — Google OAuth 2.0 token exchange
- `GET  /api/auth/verify` — Validate Bearer JWT token claims
- `GET  /api/auth/profile` — Logged-in profile
- `GET  /api/auth/audit-log` — Security audit logs

### 2. Enterprise REST API v1 (`/api/v1`)
- `GET  /api/v1/products` — Query products with search, category, lowStock filter
- `GET  /api/v1/products/:id` — Single product details
- `GET  /api/v1/customers` — List customers enriched with risk score
- `GET  /api/v1/customers/:id` — Customer profile with ledger transaction history
- `GET  /api/v1/sales` — Retrieve sales invoice history
- `POST /api/v1/sales` — Issue new sales bill with auto stock deduction
- `GET  /api/v1/analytics` — KPI telemetry & store summary
- `GET  /api/v1/keys` — REST API architecture documentation

### 3. Automated Overdue Reminders (`/api/reminders`)
- `GET  /api/reminders` — History of dispatched reminders
- `GET  /api/reminders/overdue-customers` — List customers with overdue balances
- `GET  /api/reminders/config` — Get automation schedule
- `POST /api/reminders/config` — Update reminder time, channel, toggle status
- `POST /api/reminders/check-now` — Execute automated scan & dispatch immediately
- `POST /api/reminders/send-single` — Dispatch reminder to specific customer

---

## 🚀 Running the Server

```bash
# Development (with auto-reload watcher)
npm run dev

# Production
npm start
```
Default URL: `http://localhost:5000`
