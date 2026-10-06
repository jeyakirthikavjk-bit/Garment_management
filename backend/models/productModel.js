import { getAllCollectionsFromDb, saveSingleCollectionToDb } from '../config/db.js';

export const productModel = {
  // Retrieve all products
  async findAll() {
    const db = await getAllCollectionsFromDb();
    return Array.isArray(db.products) ? db.products : [];
  },

  // Find single product by ID
  async findById(id) {
    const products = await this.findAll();
    return products.find(p => String(p.id) === String(id)) || null;
  },

  // Deduct inventory stock for sales
  async deductStock(productId, quantity) {
    const products = await this.findAll();
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return false;

    const qty = Number(quantity) || 1;
    product.stock = Math.max(0, (Number(product.stock) || 0) - qty);
    if (product.godown1 !== undefined) {
      product.godown1 = Math.max(0, (Number(product.godown1) || 0) - qty);
    }
    product.status = product.stock <= 0 ? 'Out of Stock' : (product.stock <= 10 ? 'Low Stock' : 'In Stock');

    await saveSingleCollectionToDb('products', products);
    return true;
  }
};
