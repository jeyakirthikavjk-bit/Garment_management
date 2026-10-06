// frontend/src/services/productService.js
// Centralized Product & Inventory API Service

import api from './api';

export const productService = {
  /**
   * Fetch product inventory catalog
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/v1/products${query ? `?${query}` : ''}`);
  },

  /**
   * Fetch single product by ID
   */
  async getProductById(id) {
    return api.get(`/v1/products/${id}`);
  }
};

export default productService;
