// frontend/src/services/customerService.js
// Centralized Customer & Khata Ledger API Service

import api from './api';

export const customerService = {
  /**
   * Fetch customer list with risk telemetry
   */
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/v1/customers${query ? `?${query}` : ''}`);
  },

  /**
   * Fetch single customer by ID
   */
  async getCustomerById(id) {
    return api.get(`/v1/customers/${id}`);
  },

  /**
   * Fetch customer personal ledger & invoices (Customer Portal)
   */
  async getMyLedger() {
    return api.get('/customer/ledger');
  },

  /**
   * Fetch customer purchases
   */
  async getMyPurchases() {
    return api.get('/customer/purchases');
  },

  /**
   * Submit garment restocking requirement
   */
  async submitRequirement(data) {
    return api.post('/customer/requirements', data);
  }
};

export default customerService;
