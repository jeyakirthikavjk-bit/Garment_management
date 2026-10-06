// backend/controllers/adminController.js
// Business Logic Controller for Admin & Store Operations

import { getAllCollectionsFromDb } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const adminController = {
  /**
   * GET /api/admin/dashboard
   * Aggregates store operational KPIs and telemetry
   */
  async getDashboard(req, res) {
    try {
      const db = await getAllCollectionsFromDb();
      const customers = db.customers || [];
      const sales = db.sales || [];
      const collections = db.collections || [];
      const products = db.products || [];
      const areas = db.areas || [];

      const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.netAmount || s.totalAmount) || 0), 0);
      const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
      const totalCollected = collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 10)).length;

      return successResponse(res, {
        kpis: {
          totalCustomers: customers.length,
          totalProducts: products.length,
          totalRevenue,
          totalOutstanding,
          totalCollected,
          lowStockCount,
          totalAreas: areas.length
        },
        areas: areas.slice(0, 5),
        recentSales: sales.slice(-5).reverse(),
        topOverdueCustomers: customers
          .filter(c => (Number(c.balance) || 0) > 0)
          .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
          .slice(0, 5)
      }, 'Admin dashboard metrics retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch admin dashboard summary', 500, err);
    }
  },

  /**
   * GET /api/admin/areas
   * Returns territory schedules and collection targets
   */
  async getAreas(req, res) {
    try {
      const db = await getAllCollectionsFromDb();
      return successResponse(res, db.areas || [], 'Area territory schedules retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch areas', 500, err);
    }
  },

  /**
   * GET /api/admin/reports
   * Generates summary reports for auditing and ledger reconciliation
   */
  async getReports(req, res) {
    try {
      const db = await getAllCollectionsFromDb();
      const sales = db.sales || [];
      const collections = db.collections || [];
      const customers = db.customers || [];

      return successResponse(res, {
        salesReport: {
          count: sales.length,
          totalAmount: sales.reduce((sum, s) => sum + (Number(s.netAmount || s.totalAmount) || 0), 0)
        },
        collectionsReport: {
          count: collections.length,
          totalCollected: collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
        },
        creditRiskReport: {
          highRiskCount: customers.filter(c => (Number(c.balance) || 0) > (Number(c.creditLimit) || 10000) * 0.8).length,
          moderateRiskCount: customers.filter(c => (Number(c.balance) || 0) > 0 && (Number(c.balance) || 0) <= (Number(c.creditLimit) || 10000) * 0.8).length,
          zeroBalanceCount: customers.filter(c => (Number(c.balance) || 0) === 0).length
        }
      }, 'Admin reports generated');
    } catch (err) {
      return errorResponse(res, 'Failed to generate reports', 500, err);
    }
  },

  /**
   * GET /api/admin/suppliers
   * Returns suppliers and trade procurement data
   */
  async getSuppliers(req, res) {
    try {
      const db = await getAllCollectionsFromDb();
      return successResponse(res, db.suppliers || [], 'Supplier records retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch suppliers', 500, err);
    }
  }
};
