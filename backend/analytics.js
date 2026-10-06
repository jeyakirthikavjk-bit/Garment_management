// Backend Analytics Calculation Engine for MySQL / Express Server

export function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const str = String(dateStr).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const day = parseInt(dmyMatch[1], 10);
    const month = months[dmyMatch[2].substring(0, 3).toLowerCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (month !== undefined) return new Date(year, month, day);
  }
  return null;
}

export function parseSaleItems(itemsStr, productsCatalog = []) {
  if (!itemsStr) return [];
  const parts = String(itemsStr).split(',');
  const results = [];

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const xMatch = trimmed.match(/^(.*?)\s*x\s*(\d+)$/i);
    const pcsMatch = trimmed.match(/^(.*?)\s*\((\d+)\s*pcs\)$/i);

    let name = trimmed;
    let qty = 1;

    if (xMatch) {
      name = xMatch[1].trim();
      qty = parseInt(xMatch[2], 10) || 1;
    } else if (pcsMatch) {
      name = pcsMatch[1].trim();
      qty = parseInt(pcsMatch[2], 10) || 1;
    }

    const matchedProduct = productsCatalog.find(p => {
      const pNameLower = (p.name || '').toLowerCase();
      const nLower = name.toLowerCase();
      return pNameLower.includes(nLower) || nLower.includes(pNameLower);
    });

    const category = matchedProduct?.category || 'General Apparel';
    const sellingPrice = Number(matchedProduct?.price) || 1200;
    const costPrice = Number(matchedProduct?.costPrice) || Math.round(sellingPrice * 0.6);
    const sku = matchedProduct?.sku || 'SKU-GEN';
    const sizes = matchedProduct?.availableSizes || ['M', 'L'];
    const colors = matchedProduct?.availableColors || ['Standard'];

    results.push({
      name,
      qty,
      category,
      sellingPrice,
      costPrice,
      sku,
      sizes,
      colors,
      lineRevenue: sellingPrice * qty,
      lineCogs: costPrice * qty,
      lineProfit: (sellingPrice - costPrice) * qty
    });
  });

  return results;
}

export function computeServerAnalytics(db, queryParams = {}) {
  const { period = 'all', startDate, endDate, areaId = 'all', category = 'all', supplierId = 'all' } = queryParams;

  const sales = Array.isArray(db.sales) ? db.sales : [];
  const supplierPurchases = Array.isArray(db.supplierPurchases || db.supplier_purchases) ? (db.supplierPurchases || db.supplier_purchases) : [];
  const products = Array.isArray(db.products) ? db.products : [];
  const customers = Array.isArray(db.customers) ? db.customers : [];
  const areas = Array.isArray(db.areas) ? db.areas : [];
  const collections = Array.isArray(db.collections) ? db.collections : [];
  const suppliers = Array.isArray(db.suppliers) ? db.suppliers : [];

  let sDate = startDate ? new Date(startDate) : null;
  let eDate = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

  if (period && period !== 'all' && period !== 'custom') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    eDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    if (period === 'today') sDate = today;
    else if (period === '7days') sDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    else if (period === '30days') sDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    else if (period === 'thisMonth') sDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'lastMonth') {
      sDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      eDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'thisYear') sDate = new Date(now.getFullYear(), 0, 1);
  }

  const isInRange = (dStr) => {
    if (!sDate && !eDate) return true;
    const d = parseDate(dStr);
    if (!d) return true;
    if (sDate && d < sDate) return false;
    if (eDate && d > eDate) return false;
    return true;
  };

  // Filter Sales
  const filteredSales = sales.filter(s => {
    if (!s) return false;
    if (!isInRange(s.date)) return false;
    if (areaId !== 'all' && s.areaId !== areaId && s.areaName !== areaId) return false;
    if (category !== 'all') {
      const itemsList = parseSaleItems(s.items, products);
      if (!itemsList.some(i => i.category.toLowerCase() === category.toLowerCase())) return false;
    }
    return true;
  });

  // Filter Purchases
  const filteredPurchases = supplierPurchases.filter(p => {
    if (!p) return false;
    if (!isInRange(p.purchaseDate)) return false;
    if (supplierId !== 'all' && p.supplierId !== supplierId && p.supplierName !== supplierId) return false;
    if (category !== 'all' && (p.category || '').toLowerCase() !== category.toLowerCase()) return false;
    return true;
  });

  // Filter Collections
  const filteredCollections = collections.filter(c => {
    if (!c) return false;
    if (!isInRange(c.date)) return false;
    if (areaId !== 'all' && c.areaId !== areaId && c.areaName !== areaId) return false;
    return true;
  });

  // Financial aggregates
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  let totalGarmentsSold = 0;
  let calculatedCogs = 0;
  const categorySalesMap = {};
  const productPerformanceMap = {};

  filteredSales.forEach(s => {
    const items = parseSaleItems(s.items, products);
    items.forEach(item => {
      if (category !== 'all' && item.category.toLowerCase() !== category.toLowerCase()) return;
      totalGarmentsSold += item.qty;
      calculatedCogs += item.lineCogs;
      categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + item.lineRevenue;

      if (!productPerformanceMap[item.name]) {
        productPerformanceMap[item.name] = { name: item.name, category: item.category, sku: item.sku, unitsSold: 0, revenue: 0, profit: 0 };
      }
      productPerformanceMap[item.name].unitsSold += item.qty;
      productPerformanceMap[item.name].revenue += item.lineRevenue;
      productPerformanceMap[item.name].profit += item.lineProfit;
    });
  });

  if (calculatedCogs === 0 && totalSalesRevenue > 0) {
    calculatedCogs = Math.round(totalSalesRevenue * 0.58);
  }

  const estimatedGrossProfit = Math.max(0, totalSalesRevenue - calculatedCogs);
  const grossProfitMarginPct = totalSalesRevenue > 0 ? Math.round((estimatedGrossProfit / totalSalesRevenue) * 1000) / 10 : 0;
  const totalPurchasesCost = filteredPurchases.reduce((sum, p) => sum + (Number(p.finalCost) || Number(p.totalPurchaseCost) || 0), 0);
  const totalSupplierPayables = supplierPurchases.reduce((sum, p) => sum + (Number(p.pendingAmount) || 0), 0);

  const totalCollected = filteredCollections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) +
    filteredSales.filter(s => (s.paymentType || '').toLowerCase() === 'cash').reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const totalOutstandingCustomerDues = customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  const creditRecoveryRate = (totalCollected + totalOutstandingCustomerDues) > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstandingCustomerDues)) * 1000) / 10
    : 0;

  const totalGarmentsInStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const stockRetailValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.price)), 0);
  const stockCostValue = products.reduce((sum, p) => sum + (Number(p.stock) * (Number(p.costPrice) || Math.round(Number(p.price) * 0.6))), 0);
  const lowStockCount = products.filter(p => Number(p.stock) <= 5 && Number(p.stock) > 0).length;
  const outOfStockCount = products.filter(p => Number(p.stock) === 0).length;

  return {
    kpi: {
      totalSalesRevenue,
      totalGarmentsSold,
      totalPurchasesCost,
      totalAmountCollected: totalCollected,
      totalOutstandingCustomerDues,
      estimatedGrossProfit,
      grossProfitMarginPct,
      calculatedCogs,
      totalCustomers: customers.length,
      totalGarmentsInStock,
      stockRetailValue,
      stockCostValue,
      lowStockCount,
      outOfStockCount,
      totalSupplierPayables,
      creditRecoveryRate
    },
    sales: {
      filteredSalesCount: filteredSales.length,
      categorySalesMap,
      bestSellingProducts: Object.values(productPerformanceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    },
    areas: {
      areaPerformanceList: areas.map(a => {
        const aSales = filteredSales.filter(s => s.areaId === a.id || s.areaName === a.name);
        return {
          id: a.id,
          name: a.name,
          revenue: aSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0),
          targetCollection: a.targetCollection,
          collected: a.collectedSoFar
        };
      })
    }
  };
}
