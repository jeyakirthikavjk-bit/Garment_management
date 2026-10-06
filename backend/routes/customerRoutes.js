// backend/routes/customerRoutes.js
// Logically Segregated REST API Routing for Customer Portal & Self-Service

import express from 'express';
import { customerController } from '../controllers/customerController.js';
import { productController } from '../controllers/productController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

export const customerRouter = express.Router();

// Enforce authentication on all customer portal endpoints
customerRouter.use(authenticateJwt);

// Customer Account Profile
customerRouter.get('/profile', customerController.getMyProfile);

// Customer Purchase History & Invoices
customerRouter.get('/purchases', customerController.getMyPurchases);

// Customer Credit Khata & Ledger
customerRouter.get('/ledger', customerController.getMyLedger);

// Customer Stock Requirements & Inquiries
customerRouter.get('/requirements', customerController.getMyRequirements);
customerRouter.post('/requirements', customerController.submitRequirement);

// Browse Garment Catalog
customerRouter.get('/products', productController.getProducts);
customerRouter.get('/products/:id', productController.getProductById);
