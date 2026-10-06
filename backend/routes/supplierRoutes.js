// backend/routes/supplierRoutes.js
// Logically Segregated REST API Routing for Supplier Portal Operations

import express from 'express';
import { supplierController } from '../controllers/supplierController.js';
import { optionalJwt } from '../middleware/authMiddleware.js';

export const supplierRouter = express.Router();

// Allow either JWT or x-supplier-id header identification
supplierRouter.use(optionalJwt);

// 1. Get Received Purchase Orders for authenticated supplier
supplierRouter.get('/purchase-orders', supplierController.getPurchaseOrders);

// 2. Get Single PO details (with cross-supplier access guard)
supplierRouter.get('/purchase-orders/:id', supplierController.getPurchaseOrderById);

// 3. Accept Purchase Order (with ownership validation and duplicate prevention)
supplierRouter.post('/purchase-orders/:id/accept', supplierController.acceptPurchaseOrder);
