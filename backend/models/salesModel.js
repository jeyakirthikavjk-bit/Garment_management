import { getAllCollectionsFromDb, saveSingleCollectionToDb } from '../config/db.js';

export const salesModel = {
  // Retrieve sales history
  async findAll() {
    const db = await getAllCollectionsFromDb();
    return Array.isArray(db.sales) ? db.sales : [];
  },

  // Retrieve sales history for a specific customer
  async findByCustomerId(customerId) {
    const sales = await this.findAll();
    return sales.filter(s => String(s.customerId) === String(customerId));
  },

  // Issue new sales invoice
  async create(salePayload) {
    const db = await getAllCollectionsFromDb();
    const currentSales = Array.isArray(db.sales) ? db.sales : [];

    const newSale = {
      id: salePayload.id || `INV-${Date.now().toString().slice(-6)}`,
      customerId: salePayload.customerId || null,
      customer: salePayload.customerName || salePayload.customer || 'Retail Customer',
      areaId: salePayload.areaId || 'area-1',
      areaName: salePayload.areaName || 'Direct Counter',
      date: salePayload.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: typeof salePayload.items === 'string'
        ? salePayload.items
        : (Array.isArray(salePayload.items)
            ? salePayload.items.map(i => `${i.name || 'Garment'} (${i.quantity || 1})`).join(', ')
            : 'Garment Sale'),
      totalAmount: Number(salePayload.totalAmount) || 0,
      paymentType: salePayload.paymentType || 'CASH',
      status: salePayload.paymentType === 'CREDIT' ? 'Pending' : 'Completed'
    };

    const updated = [newSale, ...currentSales];
    await saveSingleCollectionToDb('sales', updated);
    return newSale;
  }
};
