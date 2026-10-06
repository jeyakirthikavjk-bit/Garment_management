// frontend/src/services/salesService.js
// Centralized Sales & Transaction Ledger API Service

import api from './api';

export const salesService = {
  /**
   * Fetch sales transactions
   */
  async getSales(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/v1/sales${query ? `?${query}` : ''}`);
  },

  /**
   * Record new sale transaction
   */
  async createSale(saleData) {
    return api.post('/v1/sales', saleData);
  },

  /**
   * Fetch store KPI analytics
   */
  async getStoreKPIs() {
    return api.get('/v1/analytics');
  }
};

export default salesService;
