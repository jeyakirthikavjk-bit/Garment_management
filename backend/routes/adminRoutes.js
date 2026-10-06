// backend/routes/adminRoutes.js
// Logically Segregated REST API Routing for Admin & Store Management

import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { customerController } from '../controllers/customerController.js';
import { productController } from '../controllers/productController.js';
import { salesController } from '../controllers/salesController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

export const adminRouter = express.Router();

// Enforce authentication on all admin endpoints
adminRouter.use(authenticateJwt);

// Admin Dashboard Summary
adminRouter.get('/dashboard', adminController.getDashboard);

// Territory Management & Schedules
adminRouter.get('/areas', adminController.getAreas);

// Auditing & Reconciliation Reports
adminRouter.get('/reports', adminController.getReports);

// Supplier Directory & Procurement
adminRouter.get('/suppliers', adminController.getSuppliers);

// Customer Management & Risk Scoring
adminRouter.get('/customers', customerController.getCustomers);
adminRouter.get('/customers/:id', customerController.getCustomerById);

// Product Catalog & Stock Inventory
adminRouter.get('/products', productController.getProducts);
adminRouter.get('/products/:id', productController.getProductById);

// Sales Ledger Transactions
adminRouter.get('/sales', salesController.getSales);
adminRouter.post('/sales', salesController.createSale);

// Analytics & Store KPIs
adminRouter.get('/analytics', analyticsController.getStoreKPIs);
