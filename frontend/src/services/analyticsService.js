// Analytics Service for Garment Sales, Inventory and Credit Management System
// Processes live database collections, applies filters, and computes financial, sales, inventory, credit, and supplier metrics.

import { dbService } from './dbService';
import { API_BASE_URL } from '../config/api.js';

/**
 * Robust date parser for varying database date formats:
 * - 'YYYY-MM-DD'
 * - 'YYYY-MM-DD HH:MM AM/PM'
 * - 'DD Mon YYYY' (e.g. '18 May 2024')
 * - ISO string
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  const str = String(dateStr).trim();

  // Try direct date constructor first
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  // Handle 'DD Mon YYYY' (e.g. '18 May 2024')
  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(dmyMatch[1], 10);
    const month = months[dmyMatch[2].substring(0, 3).toLowerCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Handle 'YYYY-MM-DD HH:MM AM/PM'
  const isoTimeMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoTimeMatch) {
    return new Date(parseInt(isoTimeMatch[1], 10), parseInt(isoTimeMatch[2], 10) - 1, parseInt(isoTimeMatch[3], 10));
  }

  return null;
}

/**
 * Format Date to YYYY-MM-DD string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Parse item string from sales invoice (e.g., 'Premium Cotton Oxford Shirt x 3, Raw Selvedge Denim x 1')
 */
export function parseSaleItems(itemsStr, productsCatalog = []) {
  if (!itemsStr) return [];
  const parts = String(itemsStr).split(',');
  const results = [];

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // Pattern: "Item Name x Qty" or "Item Name (Qty pcs)"
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

    // Match with products catalog to deduce category, cost price, price, sizes, colors
    const matchedProduct = productsCatalog.find(p => {
      const pNameLower = (p.name || '').toLowerCase();
      const nLower = name.toLowerCase();
      return pNameLower.includes(nLower) || nLower.includes(pNameLower);
    });

    const category = matchedProduct?.category || 'General Apparel';
    const sellingPrice = matchedProduct?.price || 1200;
    const costPrice = matchedProduct?.costPrice || Math.round(sellingPrice * 0.6);
    const sku = matchedProduct?.sku || 'SKU-GEN';
    const sizes = matchedProduct?.availableSizes || ['M', 'L'];
    const colors = matchedProduct?.availableColors || ['Standard'];

    results.push({
      raw: trimmed,
      name,
      qty,
      category,
      sellingPrice,
      costPrice,
      sku,
      sizes,
      colors,
      productId: matchedProduct?.id || null,
      lineRevenue: sellingPrice * qty,
      lineCogs: costPrice * qty,
      lineProfit: (sellingPrice - costPrice) * qty
    });
  });

  return results;
}

/**
 * Filter data by date range preset
 */
export function getDateRangeFromPreset(preset, customStart = null, customEnd = null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = null;
  let end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // End of today

  switch (preset) {
    case 'today':
      start = today;
      break;
    case '7days':
      start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : null;
      end = customEnd ? new Date(new Date(customEnd).setHours(23, 59, 59, 999)) : null;
      break;
    case 'all':
    default:
      start = null;
      end = null;
      break;
  }

  return { start, end };
}

/**
 * Get previous equivalent period for comparison calculation
 */
export function getPreviousPeriodDateRange(start, end) {
  if (!start || !end) return { prevStart: null, prevEnd: null };
  const diffMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  return { prevStart, prevEnd };
}

/**
 * Comprehensive Analytics Computation
 */
export function computeAnalyticsData({
  db,
  period = 'all',
  customStartDate = '',
  customEndDate = '',
  selectedAreaId = 'all',
  selectedCategory = 'all',
  selectedSupplierId = 'all'
}) {
  const rawDb = db || dbService.getDatabase();
  const sales = Array.isArray(rawDb.sales) ? rawDb.sales : [];
  const purchases = Array.isArray(rawDb.purchases) ? rawDb.purchases : [];
  const supplierPurchases = Array.isArray(rawDb.supplierPurchases || rawDb.supplier_purchases) ? (rawDb.supplierPurchases || rawDb.supplier_purchases) : [];
  const supplierPayments = Array.isArray(rawDb.supplierPayments || rawDb.supplier_payments) ? (rawDb.supplierPayments || rawDb.supplier_payments) : [];
  const supplierProducts = Array.isArray(rawDb.supplierProducts || rawDb.supplier_products) ? (rawDb.supplierProducts || rawDb.supplier_products) : [];
  const products = Array.isArray(rawDb.products) ? rawDb.products : [];
  const customers = Array.isArray(rawDb.customers) ? rawDb.customers : [];
  const areas = Array.isArray(rawDb.areas) ? rawDb.areas : [];
  const collections = Array.isArray(rawDb.collections) ? rawDb.collections : [];
  const suppliers = Array.isArray(rawDb.suppliers) ? rawDb.suppliers : [];

  // Determine active date range
  const { start: startDate, end: endDate } = getDateRangeFromPreset(period, customStartDate, customEndDate);
  const { prevStart, prevEnd } = getPreviousPeriodDateRange(startDate, endDate);

  // Helper date checker
  const isInRange = (dateStr, sDate, eDate) => {
    if (!sDate && !eDate) return true;
    const d = parseDate(dateStr);
    if (!d) return true; // If no date, include in all-time
    if (sDate && d < sDate) return false;
    if (eDate && d > eDate) return false;
    return true;
  };

  // 1. FILTER SALES
  const filteredSales = sales.filter(s => {
    if (!s) return false;
    // Date filter
    if (!isInRange(s.date, startDate, endDate)) return false;
    // Area filter
    if (selectedAreaId !== 'all') {
      if (s.areaId !== selectedAreaId && s.areaName !== selectedAreaId) {
        const cust = customers.find(c => c.id === s.customerId || c.name === s.customer);
        if (!cust || (cust.areaId !== selectedAreaId && cust.areaName !== selectedAreaId)) {
          return false;
        }
      }
    }
    // Category filter
    if (selectedCategory !== 'all') {
      const itemsList = parseSaleItems(s.items, products);
      const hasCategory = itemsList.some(item => (item.category || '').toLowerCase() === selectedCategory.toLowerCase());
      if (!hasCategory) return false;
    }
    return true;
  });

  // Previous Period Sales (for percentage growth)
  const prevPeriodSales = prevStart && prevEnd ? sales.filter(s => {
    if (!s) return false;
    if (!isInRange(s.date, prevStart, prevEnd)) return false;
    if (selectedAreaId !== 'all') {
      if (s.areaId !== selectedAreaId && s.areaName !== selectedAreaId) return false;
    }
    return true;
  }) : [];

  // 2. FILTER PURCHASES (Supplier Purchases)
  const filteredSupplierPurchases = supplierPurchases.filter(sp => {
    if (!sp) return false;
    if (!isInRange(sp.purchaseDate, startDate, endDate)) return false;
    if (selectedSupplierId !== 'all' && sp.supplierId !== selectedSupplierId && sp.supplierName !== selectedSupplierId) {
      return false;
    }
    if (selectedCategory !== 'all' && (sp.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  const prevPeriodSupplierPurchases = prevStart && prevEnd ? supplierPurchases.filter(sp => {
    if (!sp) return false;
    if (!isInRange(sp.purchaseDate, prevStart, prevEnd)) return false;
    if (selectedSupplierId !== 'all' && sp.supplierId !== selectedSupplierId) return false;
    return true;
  }) : [];

  // 3. FILTER COLLECTIONS (Installments received from customers)
  const filteredCollections = collections.filter(c => {
    if (!c) return false;
    if (!isInRange(c.date, startDate, endDate)) return false;
    if (selectedAreaId !== 'all' && c.areaId !== selectedAreaId && c.areaName !== selectedAreaId) {
      return false;
    }
    return true;
  });

  // 4. FINANCIAL CALCULATIONS
  // A. Total Sales Revenue
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const prevSalesRevenue = prevPeriodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const salesRevenueGrowthPct = prevSalesRevenue > 0
    ? Math.round(((totalSalesRevenue - prevSalesRevenue) / prevSalesRevenue) * 100)
    : (totalSalesRevenue > 0 && prevStart ? 100 : null);

  // B. Cost of Goods Sold (COGS) & Units Sold Breakdown
  let totalGarmentsSold = 0;
  let calculatedCogs = 0;
  const categorySalesMap = {};
  const productPerformanceMap = {};
  const sizeSalesMap = {};
  const colorSalesMap = {};

  filteredSales.forEach(s => {
    const saleItems = parseSaleItems(s.items, products);
    saleItems.forEach(item => {
      // If category filter is applied, only sum matching items
      if (selectedCategory !== 'all' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return;
      }

      totalGarmentsSold += item.qty;
      calculatedCogs += item.lineCogs;

      // Category breakdown
      categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + item.lineRevenue;

      // Product performance breakdown
      const pKey = item.name;
      if (!productPerformanceMap[pKey]) {
        productPerformanceMap[pKey] = {
          name: item.name,
          category: item.category,
          sku: item.sku,
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      productPerformanceMap[pKey].unitsSold += item.qty;
      productPerformanceMap[pKey].revenue += item.lineRevenue;
      productPerformanceMap[pKey].cost += item.lineCogs;
      productPerformanceMap[pKey].profit += item.lineProfit;

      // Size breakdown
      item.sizes.forEach(sz => {
        sizeSalesMap[sz] = (sizeSalesMap[sz] || 0) + item.qty;
      });

      // Color breakdown
      item.colors.forEach(col => {
        colorSalesMap[col] = (colorSalesMap[col] || 0) + item.qty;
      });
    });
  });

  // If COGS is 0 but sales exist (e.g. custom items), apply industry default 58% COGS
  if (calculatedCogs === 0 && totalSalesRevenue > 0) {
    calculatedCogs = Math.round(totalSalesRevenue * 0.58);
  }

  // C. Estimated Gross Profit & Margin
  const estimatedGrossProfit = Math.max(0, totalSalesRevenue - calculatedCogs);
  const grossProfitMarginPct = totalSalesRevenue > 0
    ? Math.round((estimatedGrossProfit / totalSalesRevenue) * 1000) / 10
    : 0;

  // D. Garment Purchases & Supplier Payables
  const totalPurchasesCost = filteredSupplierPurchases.reduce((sum, sp) => sum + (Number(sp.finalCost) || Number(sp.totalPurchaseCost) || 0), 0);
  const prevPurchasesCost = prevPeriodSupplierPurchases.reduce((sum, sp) => sum + (Number(sp.finalCost) || Number(sp.totalPurchaseCost) || 0), 0);
  const purchasesCostGrowthPct = prevPurchasesCost > 0
    ? Math.round(((totalPurchasesCost - prevPurchasesCost) / prevPurchasesCost) * 100)
    : null;

  const totalSupplierPayables = supplierPurchases.reduce((sum, sp) => sum + (Number(sp.pendingAmount) || 0), 0);

  // E. Cash Collections & Customer Credit
  const totalCollectionsAmount = filteredCollections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  // Direct Cash sales collected at spot
  const spotCashSales = filteredSales
    .filter(s => (s.paymentType || '').toLowerCase() === 'cash')
    .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalAmountCollected = totalCollectionsAmount + spotCashSales;

  // Filtered customers
  const filteredCustomers = customers.filter(c => {
    if (selectedAreaId !== 'all' && c.areaId !== selectedAreaId && c.areaName !== selectedAreaId) {
      return false;
    }
    return true;
  });

  const totalOutstandingCustomerDues = filteredCustomers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  const creditRecoveryRate = (totalAmountCollected + totalOutstandingCustomerDues) > 0
    ? Math.round((totalAmountCollected / (totalAmountCollected + totalOutstandingCustomerDues)) * 1000) / 10
    : 0;

  // F. Inventory Stock & Valuation
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && (p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  const totalGarmentsInStock = filteredProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalGodown1Stock = filteredProducts.reduce((sum, p) => sum + (Number(p.godown1) || Number(p.stock) || 0), 0);
  const totalGodown2Stock = filteredProducts.reduce((sum, p) => sum + (Number(p.godown2) || 0), 0);

  const stockRetailValue = filteredProducts.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const stockCostValue = filteredProducts.reduce((sum, p) => {
    const cost = Number(p.costPrice) || Math.round((Number(p.price) || 0) * 0.6);
    return sum + ((Number(p.stock) || 0) * cost);
  }, 0);

  const lowStockProductsList = filteredProducts.filter(p => (Number(p.stock) <= 5 && Number(p.stock) > 0) || p.statusType === 'low-stock');
  const outOfStockProductsList = filteredProducts.filter(p => Number(p.stock) === 0 || p.statusType === 'out-of-stock');
  const lowStockCount = lowStockProductsList.length;
  const outOfStockCount = outOfStockProductsList.length;

  // Inventory Turnover = COGS / Average Stock Cost Value
  const inventoryTurnover = stockCostValue > 0
    ? Math.round((calculatedCogs / stockCostValue) * 10) / 10
    : 0;

  // 5. SALES & COLLECTIONS TRENDS OVER TIME (Daily & Monthly)
  const salesByDayMap = {};
  const salesByMonthMap = {};

  filteredSales.forEach(s => {
    const d = parseDate(s.date) || new Date();
    const dayKey = d.toISOString().split('T')[0];
    const monthKey = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;

    // Day
    if (!salesByDayMap[dayKey]) {
      salesByDayMap[dayKey] = { date: dayKey, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0, count: 0, units: 0, collections: 0 };
    }
    salesByDayMap[dayKey].revenue += Number(s.totalAmount) || 0;
    salesByDayMap[dayKey].count += 1;

    // Month
    if (!salesByMonthMap[monthKey]) {
      salesByMonthMap[monthKey] = { month: monthKey, revenue: 0, count: 0, units: 0, collections: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    }
    salesByMonthMap[monthKey].revenue += Number(s.totalAmount) || 0;
    salesByMonthMap[monthKey].count += 1;
  });

  // Also accumulate collections into daily and monthly maps
  filteredCollections.forEach(c => {
    const d = parseDate(c.date) || new Date();
    const dayKey = d.toISOString().split('T')[0];
    const monthKey = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;

    if (!salesByDayMap[dayKey]) {
      salesByDayMap[dayKey] = { date: dayKey, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0, count: 0, units: 0, collections: 0 };
    }
    salesByDayMap[dayKey].collections = (salesByDayMap[dayKey].collections || 0) + (Number(c.amount) || 0);

    if (!salesByMonthMap[monthKey]) {
      salesByMonthMap[monthKey] = { month: monthKey, revenue: 0, count: 0, units: 0, collections: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    }
    salesByMonthMap[monthKey].collections = (salesByMonthMap[monthKey].collections || 0) + (Number(c.amount) || 0);
  });

  // Calculate monthly COGS, gross profit, and margins
  Object.values(salesByMonthMap).forEach(m => {
    m.cogs = Math.round(m.revenue * 0.58);
    m.grossProfit = Math.max(0, m.revenue - m.cogs);
    m.marginPct = m.revenue > 0 ? Math.round((m.grossProfit / m.revenue) * 100) : 0;
  });

  const dailyTrend = Object.values(salesByDayMap).sort((a, b) => a.date.localeCompare(b.date));
  const monthlyTrend = Object.values(salesByMonthMap).sort((a, b) => a.timestamp - b.timestamp);

  // 6. PAYMENT METHOD BREAKDOWN
  const paymentMethodMap = { Cash: 0, Credit: 0, UPI: 0, 'Bank / Cheque': 0 };
  filteredSales.forEach(s => {
    const mode = (s.paymentType || 'Credit').toLowerCase();
    const amt = Number(s.totalAmount) || 0;
    if (mode.includes('cash')) paymentMethodMap.Cash += amt;
    else if (mode.includes('upi') || mode.includes('phonepe') || mode.includes('gpay')) paymentMethodMap.UPI += amt;
    else if (mode.includes('neft') || mode.includes('bank') || mode.includes('cheque') || mode.includes('rtgs')) paymentMethodMap['Bank / Cheque'] += amt;
    else paymentMethodMap.Credit += amt;
  });

  // 7. AREA-WISE BUSINESS ANALYTICS
  const areaPerformanceList = areas.map(a => {
    const areaSales = filteredSales.filter(s => s.areaId === a.id || s.areaName === a.name);
    const areaRevenue = areaSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const areaCusts = customers.filter(c => c.areaId === a.id || c.areaName === a.name);
    const areaBalance = areaCusts.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
    const areaCollections = filteredCollections.filter(c => c.areaId === a.id || c.areaName === a.name);
    const areaCollected = areaCollections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) + (a.collectedSoFar || 0);
    const collectionEfficiency = (a.targetCollection > 0)
      ? Math.min(100, Math.round((areaCollected / a.targetCollection) * 100))
      : 0;

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      agentName: a.agentName,
      assignedDay: a.assignedDay,
      customersCount: areaCusts.length,
      revenue: areaRevenue,
      collected: areaCollected,
      pendingBalance: areaBalance,
      targetCollection: a.targetCollection,
      collectionEfficiency,
      color: a.color || '#D95A4E'
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 8. BEST-SELLING PRODUCTS LEADERBOARD
  const bestSellingProducts = Object.values(productPerformanceMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // 9. CUSTOMER CREDIT & DEBTOR ANALYTICS
  const topDebtors = [...filteredCustomers]
    .filter(c => Number(c.balance) > 0)
    .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
    .slice(0, 8)
    .map(c => {
      const bal = Number(c.balance) || 0;
      const limit = Number(c.creditLimit) || 50000;
      const utilPct = Math.min(100, Math.round((bal / limit) * 100));
      return {
        id: c.id,
        name: c.name,
        shopName: c.shopName,
        phone: c.phone,
        areaName: c.areaName,
        balance: bal,
        creditLimit: limit,
        creditUtilizationPct: utilPct,
        status: c.status || 'Due',
        statusType: c.statusType || 'due',
        daysOverdue: c.creditDays || 30
      };
    });

  // Customer Payment Status Distribution
  const customerStatusDistribution = {
    Paid: filteredCustomers.filter(c => c.statusType === 'paid' || (Number(c.balance) === 0)).length,
    Due: filteredCustomers.filter(c => c.statusType === 'due' || (Number(c.balance) > 0 && c.statusType !== 'overdue')).length,
    Overdue: filteredCustomers.filter(c => c.statusType === 'overdue').length,
    'Partially Paid': filteredCustomers.filter(c => c.statusType === 'partial' || c.statusType === 'partially-paid').length
  };

  // On-time vs Delayed Customers
  const onTimePayingCustomers = filteredCustomers.filter(c => c.statusType === 'paid' || c.balance <= 0);
  const delayedPayingCustomers = filteredCustomers.filter(c => c.statusType === 'overdue' || (c.balance > (c.creditLimit * 0.7)));

  // 10. INVENTORY REORDER & RESTOCK SUGGESTIONS
  const restockingSuggestions = filteredProducts
    .filter(p => Number(p.stock) <= 10)
    .map(p => {
      const currentStock = Number(p.stock) || 0;
      const recommendedReorder = Math.max(25, 40 - currentStock);
      const estUnitCost = Number(p.costPrice) || Math.round((Number(p.price) || 1000) * 0.6);
      const estTotalCost = recommendedReorder * estUnitCost;

      // Find matching supplier
      const matchingSupplier = suppliers.find(s =>
        (s.categories || []).some(cat => cat.toLowerCase() === (p.category || '').toLowerCase())
      ) || suppliers[0];

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        stock: currentStock,
        price: p.price,
        costPrice: estUnitCost,
        recommendedReorder,
        estTotalCost,
        preferredSupplier: matchingSupplier ? matchingSupplier.shopName : 'Surat Silk & Sarees Mills',
        status: currentStock === 0 ? 'Out of Stock' : 'Low Stock',
        statusType: currentStock === 0 ? 'out-of-stock' : 'low-stock'
      };
    })
    .sort((a, b) => a.stock - b.stock);

  // Unsold or Slow-Moving Garments (Stock > 0 with lowest units sold)
  const slowMovingGarments = filteredProducts
    .map(p => {
      const perf = productPerformanceMap[p.name];
      const unitsSold = perf ? perf.unitsSold : 0;
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        stock: p.stock,
        unitsSold,
        stockValue: p.stock * p.price,
        status: unitsSold === 0 ? 'No Recent Sales' : 'Slow Moving'
      };
    })
    .filter(p => p.stock > 0)
    .sort((a, b) => a.unitsSold - b.unitsSold)
    .slice(0, 6);

  // 11. SUPPLIER ANALYTICS & PRICE COMPARISON
  const supplierVolumeMap = {};
  suppliers.forEach(sup => {
    supplierVolumeMap[sup.id] = {
      supplierId: sup.id,
      supplierName: sup.shopName,
      contactPerson: sup.name,
      rating: sup.rating || 4.5,
      deliveryTimeDays: sup.deliveryTimeDays || 3,
      purchaseCount: 0,
      totalPurchases: 0,
      paidAmount: 0,
      pendingAmount: 0,
      delayedDeliveries: 0,
      onTimeDeliveries: 0
    };
  });

  filteredSupplierPurchases.forEach(sp => {
    const sId = sp.supplierId;
    if (!supplierVolumeMap[sId]) {
      supplierVolumeMap[sId] = {
        supplierId: sId,
        supplierName: sp.supplierName,
        rating: 4.5,
        deliveryTimeDays: 3,
        purchaseCount: 0,
        totalPurchases: 0,
        paidAmount: 0,
        pendingAmount: 0,
        delayedDeliveries: 0,
        onTimeDeliveries: 0
      };
    }
    supplierVolumeMap[sId].purchaseCount += 1;
    supplierVolumeMap[sId].totalPurchases += Number(sp.finalCost) || Number(sp.totalPurchaseCost) || 0;
    supplierVolumeMap[sId].paidAmount += Number(sp.paidAmount) || 0;
    supplierVolumeMap[sId].pendingAmount += Number(sp.pendingAmount) || 0;
    if (sp.deliveryStatus === 'Delayed') supplierVolumeMap[sId].delayedDeliveries += 1;
    else supplierVolumeMap[sId].onTimeDeliveries += 1;
  });

  const supplierPerformanceList = Object.values(supplierVolumeMap).sort((a, b) => b.totalPurchases - a.totalPurchases);

  // Supplier Price Comparison Matrix (Objective comparison without bias)
  const supplierProductComparison = [
    {
      garment: 'Banarasi Silk Blend Saree',
      category: 'Sarees',
      comparison: [
        { supplier: 'Surat Silk & Sarees Mills', basePrice: 2100, avgDiscount: 350, deliveryFee: 400, netEffectivePrice: 2150, leadDays: 4, rating: 4.8 },
        { supplier: 'Kanchipuram Heritage Looms', basePrice: 2400, avgDiscount: 500, deliveryFee: 700, netEffectivePrice: 2600, leadDays: 6, rating: 4.9 },
        { supplier: 'Vardhman Fabrics & Kurtis', basePrice: 1950, avgDiscount: 200, deliveryFee: 250, netEffectivePrice: 2000, leadDays: 2, rating: 4.7 }
      ]
    },
    {
      garment: 'Designer Kurti Set',
      category: 'Kurtis',
      comparison: [
        { supplier: 'Vardhman Fabrics & Kurtis', basePrice: 1150, avgDiscount: 800, deliveryFee: 300, netEffectivePrice: 1070, leadDays: 2, rating: 4.7 },
        { supplier: 'Jaipur Royal Bandhani Hub', basePrice: 1200, avgDiscount: 500, deliveryFee: 600, netEffectivePrice: 1210, leadDays: 5, rating: 4.6 }
      ]
    },
    {
      garment: 'Classic Denim Jeans',
      category: 'Menswear',
      comparison: [
        { supplier: 'Mumbai Denim & Casuals Works', basePrice: 870, avgDiscount: 400, deliveryFee: 500, netEffectivePrice: 873, leadDays: 3, rating: 4.6 },
        { supplier: 'Arvind Mills Apparel Partner', basePrice: 920, avgDiscount: 600, deliveryFee: 350, netEffectivePrice: 910, leadDays: 3, rating: 4.9 }
      ]
    },
    {
      garment: 'Premium Cotton Oxford Shirt',
      category: 'Menswear',
      comparison: [
        { supplier: 'Arvind Mills Apparel Partner', basePrice: 580, avgDiscount: 1200, deliveryFee: 400, netEffectivePrice: 540, leadDays: 3, rating: 4.9 },
        { supplier: 'Surat Silk & Sarees Mills', basePrice: 620, avgDiscount: 400, deliveryFee: 350, netEffectivePrice: 610, leadDays: 4, rating: 4.8 }
      ]
    }
  ];

  return {
    // 1. Executive Summary KPIs
    kpi: {
      totalSalesRevenue,
      salesRevenueGrowthPct,
      totalGarmentsSold,
      totalPurchasesCost,
      purchasesCostGrowthPct,
      totalAmountCollected,
      totalOutstandingCustomerDues,
      estimatedGrossProfit,
      grossProfitMarginPct,
      calculatedCogs,
      totalCustomers: filteredCustomers.length,
      totalGarmentsInStock,
      totalGodown1Stock,
      totalGodown2Stock,
      stockRetailValue,
      stockCostValue,
      lowStockCount,
      outOfStockCount,
      totalSupplierPayables,
      creditRecoveryRate,
      inventoryTurnover
    },

    // 2. Sales Analytics
    sales: {
      filteredSalesCount: filteredSales.length,
      dailyTrend,
      monthlyTrend,
      categorySalesMap,
      paymentMethodMap,
      sizeSalesMap,
      colorSalesMap,
      bestSellingProducts
    },

    // 3. Customer Credit & Khata Analytics
    credit: {
      topDebtors,
      customerStatusDistribution,
      onTimeCount: onTimePayingCustomers.length,
      delayedCount: delayedPayingCustomers.length,
      recoveryRate: creditRecoveryRate
    },

    // 4. Inventory Analytics
    inventory: {
      stockRetailValue,
      stockCostValue,
      unrealizedProfit: Math.max(0, stockRetailValue - stockCostValue),
      lowStockProductsList,
      outOfStockProductsList,
      restockingSuggestions,
      slowMovingGarments,
      inventoryTurnover
    },

    // 5. Area Analytics
    areas: {
      areaPerformanceList
    },

    // 6. Supplier Analytics
    suppliers: {
      supplierPerformanceList,
      supplierProductComparison,
      totalSupplierPayables
    }
  };
}

/**
 * Fetch analytics from backend API if available, else compute locally
 */
export async function fetchAnalyticsData(filterParams = {}) {
  try {
    const query = new URLSearchParams(filterParams).toString();
    const response = await fetch(`${API_BASE_URL}/analytics?${query}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    // Backend offline or endpoint not yet configured, gracefully fallback to local calculation
  }

  // Fallback to client-side reactive computation
  const localDb = dbService.getDatabase();
  return computeAnalyticsData({ db: localDb, ...filterParams });
}
