import { productModel } from '../models/productModel.js';

export const productController = {
  // GET /api/v1/products
  async getProducts(req, res) {
    try {
      let products = await productModel.findAll();
      const { search, category, lowStock } = req.query;

      if (search) {
        const q = String(search).toLowerCase();
        products = products.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
        );
      }

      if (category) {
        products = products.filter(p => p.category && p.category.toLowerCase() === String(category).toLowerCase());
      }

      if (lowStock === 'true') {
        products = products.filter(p => (Number(p.stock) || 0) <= 10);
      }

      return res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/v1/products/:id
  async getProductById(req, res) {
    try {
      const product = await productModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      return res.json({ success: true, data: product });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
