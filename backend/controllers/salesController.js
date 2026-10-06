import { salesModel } from '../models/salesModel.js';
import { productModel } from '../models/productModel.js';

export const salesController = {
  // GET /api/v1/sales
  async getSales(req, res) {
    try {
      const sales = await salesModel.findAll();
      return res.json({
        success: true,
        count: sales.length,
        data: sales
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/v1/sales - Issue new sales invoice with automatic ledger & stock updates
  async createSale(req, res) {
    try {
      const { items, totalAmount } = req.body;
      if (!items || (Array.isArray(items) && items.length === 0)) {
        return res.status(400).json({ success: false, error: 'Sale items are required' });
      }

      const newSale = await salesModel.create(req.body);

      // Deduct stock if structured items passed
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it.id || it.productId) {
            await productModel.deductStock(it.id || it.productId, it.quantity || 1);
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Sales invoice issued successfully',
        data: newSale
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
