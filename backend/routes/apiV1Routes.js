import express from 'express';
import { productController } from '../controllers/productController.js';
import { customerController } from '../controllers/customerController.js';
import { salesController } from '../controllers/salesController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticateJwt, optionalJwt } from '../middleware/authMiddleware.js';

export const apiV1Router = express.Router();

// Products
apiV1Router.get('/products', optionalJwt, productController.getProducts);
apiV1Router.get('/products/:id', optionalJwt, productController.getProductById);

// Customers
apiV1Router.get('/customers', authenticateJwt, customerController.getCustomers);
apiV1Router.get('/customers/:id', authenticateJwt, customerController.getCustomerById);

// Sales
apiV1Router.get('/sales', authenticateJwt, salesController.getSales);
apiV1Router.post('/sales', authenticateJwt, salesController.createSale);

// Analytics & Keys
apiV1Router.get('/analytics', authenticateJwt, analyticsController.getStoreKPIs);
apiV1Router.get('/keys', analyticsController.getApiKeys);
