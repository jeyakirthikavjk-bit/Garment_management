import { getAllCollectionsFromDb } from '../config/db.js';
import { computeServerAnalytics } from '../services/analyticsService.js';

export const analyticsController = {
  // GET /api/v1/analytics
  async getStoreKPIs(req, res) {
    try {
      const db = await getAllCollectionsFromDb();
      const sales = Array.isArray(db.sales) ? db.sales : [];
      const customers = Array.isArray(db.customers) ? db.customers : [];
      const products = Array.isArray(db.products) ? db.products : [];

      const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
      const totalKhataBalance = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
      const totalInventoryCount = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
      const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= 10).length;
      const highRiskCustomers = customers.filter(c => {
        const ratio = (Number(c.balance) || 0) / (Number(c.creditLimit) || 8000);
        return c.statusType === 'overdue' || ratio >= 0.85;
      }).length;

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        kpis: {
          totalRevenue,
          totalSalesInvoices: sales.length,
          totalKhataBalance,
          activeCustomersCount: customers.length,
          totalInventoryCount,
          lowStockItemsCount: lowStockCount,
          highRiskCreditAccounts: highRiskCustomers
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/analytics
  async getDashboardAnalytics(req, res) {
    try {
      const fullDb = await getAllCollectionsFromDb();
      const analytics = computeServerAnalytics(fullDb, req.query);
      return res.json({ success: true, data: analytics });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /api/v1/keys
  getApiKeys(req, res) {
    return res.json({
      success: true,
      platform: 'ThreadLine Garment ERP & POS MVC REST Engine v1.0',
      architecture: 'Model-View-Controller (MVC)',
      authScheme: 'Bearer JWT (RFC 7519)',
      endpoints: [
        { path: '/api/v1/products', method: 'GET', auth: 'Optional', description: 'Query inventory catalog with filters' },
        { path: '/api/v1/products/:id', method: 'GET', auth: 'Optional', description: 'Retrieve single product stock metrics' },
        { path: '/api/v1/customers', method: 'GET', auth: 'JWT Required', description: 'List patron records with mathematical credit default risk' },
        { path: '/api/v1/customers/:id', method: 'GET', auth: 'JWT Required', description: 'Single customer profile & complete Khata transactions' },
        { path: '/api/v1/sales', method: 'GET', auth: 'JWT Required', description: 'Retrieve sales invoice history' },
        { path: '/api/v1/sales', method: 'POST', auth: 'JWT Required', description: 'Issue new sales bill with auto stock deduction' },
        { path: '/api/v1/analytics', method: 'GET', auth: 'JWT Required', description: 'Real-time telemetry and revenue risk indices' }
      ]
    });
  }
};
