import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useAuth } from '../../context/AuthContext';
import SupplierSettingsView from '../../components/supplier/SupplierSettingsView';

const toCategoryArray = (cats) => {
  if (Array.isArray(cats)) return cats;
  if (typeof cats === 'string' && cats.trim()) {
    return cats.split(',').map(c => c.trim()).filter(Boolean);
  }
  return [];
};

export default function Suppliers() {
  const { id: urlSupplierId } = useParams();
  const navigate = useNavigate();
  const { t } = useSettings();

  const {
    isSupplier,
    isAdmin,
    isInventory,
    userEmail,
    userName,
    supplierId,
    supplierName
  } = useAuth();

  const {
    suppliers = [],
    supplierPurchases = [],
    supplierProducts = [],
    supplierPayments = [],
    products = [],
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierProduct,
    updateSupplierProduct,
    deleteSupplierProduct,
    updateSupplierPurchase,
    acceptSupplierPurchaseOrder,
    recordPurchaseFromSupplierAndIncreaseInventory,
    deleteSupplierPurchase,
    recordSupplierPayment
  } = useArea();

  // Active view tab: 'directory' | 'inward' | 'analysis' | 'low-budget' | 'recommendations'
  const [activeTab, setActiveTab] = useState('directory');

  // Search, Filter, Sort state for Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('spend-desc'); // 'spend-desc', 'cost-asc', 'rating-desc', 'name-asc'

  // Modals & Drawers state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);
  const [detailsSubTab, setDetailsSubTab] = useState('info'); // 'info', 'purchases', 'products', 'payments', 'performance'

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Add/Edit Supplier Form state & errors
  const initialSupplierForm = {
    name: '',
    shopName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gstNumber: '',
    categories: ['Sarees'],
    productTypes: 'Textile & Garments',
    priceRange: '₹400 - ₹2,500',
    paymentTerms: 'Credit (30 Days)',
    deliveryTime: '3-4 Days',
    rating: 4.5,
    notes: ''
  };
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [formErrors, setFormErrors] = useState({});

  // Record Purchase Form state
  const initialPurchaseForm = {
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    productName: '',
    category: 'Silk Sarees',
    size: 'Standard',
    color: 'Royal Blue',
    quantity: 10,
    costPerItem: 500,
    deliveryCharge: 150,
    discount: 50,
    paymentStatus: 'Pending',
    paidAmount: 0,
    paymentMode: 'Bank Transfer',
    expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    deliveryStatus: 'Delivered',
    notes: ''
  };
  const [purchaseForm, setPurchaseForm] = useState(initialPurchaseForm);
  const [purchaseFormErrors, setPurchaseFormErrors] = useState({});

  // Low-Budget Garment Price Comparator & Multi-Supplier Comparison state
  const [comparatorCategory, setComparatorCategory] = useState('All');
  const [comparatorProductSearch, setComparatorProductSearch] = useState('');
  const [selectedComparisonSupplierIds, setSelectedComparisonSupplierIds] = useState([]);

  // Chart References
  const spendChartRef = useRef(null);
  const spendChartInstance = useRef(null);

  const costChartRef = useRef(null);
  const costChartInstance = useRef(null);

  const qtyChartRef = useRef(null);
  const qtyChartInstance = useRef(null);

  const deliveryChartRef = useRef(null);
  const deliveryChartInstance = useRef(null);

  const categoryChartRef = useRef(null);
  const categoryChartInstance = useRef(null);

  // If URL has /suppliers/:id, open details for that supplier
  useEffect(() => {
    if (urlSupplierId) {
      const match = suppliers.find(s => s.id === urlSupplierId);
      if (match) {
        setSelectedSupplierDetails(match);
      }
    }
  }, [urlSupplierId, suppliers]);

  // Set default supplier in purchase form if available
  useEffect(() => {
    if (suppliers.length > 0 && !purchaseForm.supplierId) {
      setPurchaseForm(prev => ({
        ...prev,
        supplierId: suppliers[0].id
      }));
    }
  }, [suppliers]);

  // Sync selected suppliers for comparison with first 3 suppliers initially
  useEffect(() => {
    if (suppliers.length > 0 && selectedComparisonSupplierIds.length === 0) {
      setSelectedComparisonSupplierIds(suppliers.slice(0, 3).map(s => s.id));
    }
  }, [suppliers]);

  // -------------------------------------------------------------
  // COMPUTED SUPPLIER METRICS (Built from actual purchase records)
  // -------------------------------------------------------------
  const supplierMetricsMap = useMemo(() => {
    const map = {};

    suppliers.forEach(s => {
      map[s.id] = {
        totalPurchasesCount: 0,
        totalItemsPurchased: 0,
        totalAmountSpent: 0,
        totalBaseProductCost: 0,
        totalDeliveryCharge: 0,
        totalDiscount: 0,
        delayedDeliveriesCount: 0,
        onTimeDeliveriesCount: 0,
        totalDeliveryDays: 0,
        deliveryDaysSampleCount: 0,
        purchases: [],
        categories: new Set(toCategoryArray(s.categories)),
        productsSupplied: new Set()
      };
    });

    supplierPurchases.forEach(po => {
      const sId = po.supplierId;
      if (!map[sId]) {
        map[sId] = {
          totalPurchasesCount: 0,
          totalItemsPurchased: 0,
          totalAmountSpent: 0,
          totalBaseProductCost: 0,
          totalDeliveryCharge: 0,
          totalDiscount: 0,
          delayedDeliveriesCount: 0,
          onTimeDeliveriesCount: 0,
          totalDeliveryDays: 0,
          deliveryDaysSampleCount: 0,
          purchases: [],
          categories: new Set([po.category]),
          productsSupplied: new Set()
        };
      }

      const m = map[sId];
      m.totalPurchasesCount += 1;
      m.totalItemsPurchased += Number(po.quantity) || 0;
      m.totalAmountSpent += Number(po.finalCost) || 0;
      m.totalBaseProductCost += (Number(po.costPerItem) || 0) * (Number(po.quantity) || 1);
      m.totalDeliveryCharge += Number(po.deliveryCharge) || 0;
      m.totalDiscount += Number(po.discount) || 0;
      m.purchases.push(po);
      if (po.category) m.categories.add(po.category);
      if (po.productName) m.productsSupplied.add(po.productName);

      // Delivery tracking
      if (po.deliveryStatus === 'Delayed') {
        m.delayedDeliveriesCount += 1;
      } else if (po.deliveryStatus === 'Delivered') {
        m.onTimeDeliveriesCount += 1;
      }

      // Calculate delivery days difference if dates present
      if (po.purchaseDate && (po.actualDeliveryDate || po.expectedDeliveryDate)) {
        const start = new Date(po.purchaseDate).getTime();
        const end = new Date(po.actualDeliveryDate || po.expectedDeliveryDate).getTime();
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
        m.totalDeliveryDays += diffDays;
        m.deliveryDaysSampleCount += 1;
      }
    });

    return map;
  }, [suppliers, supplierPurchases]);

  // Overall Aggregate KPIs
  const totalSuppliersCount = suppliers.length;
  const activeSuppliersCount = suppliers.filter(s => s.status === 'Active').length;
  const totalPurchaseSpend = supplierPurchases.reduce((acc, po) => acc + (Number(po.finalCost) || 0), 0);
  const totalItemsPurchased = supplierPurchases.reduce((acc, po) => acc + (Number(po.quantity) || 0), 0);

  const avgProductCostOverall = totalItemsPurchased > 0
    ? Math.round(supplierPurchases.reduce((acc, po) => acc + (Number(po.totalPurchaseCost) || 0), 0) / totalItemsPurchased)
    : 0;

  // Lowest recorded unit and effective cost
  const lowestRecordedUnitCostPO = useMemo(() => {
    if (supplierPurchases.length === 0) return null;
    return [...supplierPurchases].sort((a, b) => (Number(a.costPerItem) || 0) - (Number(b.costPerItem) || 0))[0];
  }, [supplierPurchases]);

  const lowestRecordedEffectiveCostPO = useMemo(() => {
    if (supplierPurchases.length === 0) return null;
    return [...supplierPurchases].sort((a, b) => (Number(a.effectiveUnitCost) || 0) - (Number(b.effectiveUnitCost) || 0))[0];
  }, [supplierPurchases]);

  const pendingPaymentsAmount = useMemo(() => {
    return supplierPurchases.reduce((acc, po) => {
      const finalCost = Number(po.finalCost) || 0;
      const paid = Number(po.paidAmount) || (po.paymentStatus === 'Paid' ? finalCost : 0);
      return acc + Math.max(0, finalCost - paid);
    }, 0);
  }, [supplierPurchases]);

  // -------------------------------------------------------------
  // FILTERING & SORTING SUPPLIERS DIRECTORY
  // -------------------------------------------------------------
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = searchTerm.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(q) ||
        (s.shopName || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q);

      const catList = toCategoryArray(s.categories);
      const catMatch = selectedCategoryFilter === 'All' ||
        catList.some(c => c.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));

      const cityMatch = selectedCityFilter === 'All' ||
        (s.city && s.city.toLowerCase() === selectedCityFilter.toLowerCase());

      return nameMatch && catMatch && cityMatch;
    }).sort((a, b) => {
      const mA = supplierMetricsMap[a.id] || { totalAmountSpent: 0, totalItemsPurchased: 0, totalBaseProductCost: 0 };
      const mB = supplierMetricsMap[b.id] || { totalAmountSpent: 0, totalItemsPurchased: 0, totalBaseProductCost: 0 };

      if (sortBy === 'spend-desc') return mB.totalAmountSpent - mA.totalAmountSpent;
      if (sortBy === 'spend-asc') return mA.totalAmountSpent - mB.totalAmountSpent;
      if (sortBy === 'rating-desc') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');

      if (sortBy === 'cost-asc') {
        const avgA = mA.totalItemsPurchased > 0 ? (mA.totalBaseProductCost / mA.totalItemsPurchased) : 999999;
        const avgB = mB.totalItemsPurchased > 0 ? (mB.totalBaseProductCost / mB.totalItemsPurchased) : 999999;
        return avgA - avgB;
      }
      return 0;
    });
  }, [suppliers, searchTerm, selectedCategoryFilter, selectedCityFilter, sortBy, supplierMetricsMap]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedSuppliers,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredSuppliers, 8);

  // Distinct cities and categories for filter dropdowns
  const allCities = useMemo(() => {
    const set = new Set();
    suppliers.forEach(s => { if (s.city) set.add(s.city); });
    return Array.from(set);
  }, [suppliers]);

  const allCategories = useMemo(() => {
    const set = new Set();
    suppliers.forEach(s => {
      toCategoryArray(s.categories).forEach(c => set.add(c));
    });
    supplierPurchases.forEach(po => {
      if (po.category) set.add(po.category);
    });
    return Array.from(set);
  }, [suppliers, supplierPurchases]);

  // -------------------------------------------------------------
  // LOW-BUDGET COMPARATIVE ANALYSIS ENGINE
  // -------------------------------------------------------------
  // Group purchase history by garment product / category
  const garmentComparisonData = useMemo(() => {
    const groups = {};

    // Combine recorded purchases and catalog items
    supplierPurchases.forEach(po => {
      const key = (po.productName || po.category || 'General').trim();
      if (!groups[key]) {
        groups[key] = {
          productName: po.productName || key,
          category: po.category || 'Garments',
          entries: []
        };
      }
      groups[key].entries.push({
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        unitPrice: Number(po.costPerItem) || 0,
        deliveryCharge: Number(po.deliveryCharge) || 0,
        discount: Number(po.discount) || 0,
        quantity: Number(po.quantity) || 1,
        finalCost: Number(po.finalCost) || 0,
        effectiveUnitCost: Number(po.effectiveUnitCost) || Number(po.costPerItem) || 0,
        purchaseDate: po.purchaseDate,
        deliveryDays: 3,
        rating: (suppliers.find(s => s.id === po.supplierId)?.rating) || 4.5
      });
    });

    // Also inject supplier_products catalog if no purchase recorded yet
    supplierProducts.forEach(sp => {
      const key = sp.productName.trim();
      if (!groups[key]) {
        groups[key] = {
          productName: sp.productName,
          category: sp.category || 'Garments',
          entries: []
        };
      }
      // If supplier not already present in this garment group
      const alreadyHas = groups[key].entries.some(e => e.supplierId === sp.supplierId);
      if (!alreadyHas) {
        groups[key].entries.push({
          supplierId: sp.supplierId,
          supplierName: sp.supplierName,
          unitPrice: Number(sp.unitPrice) || 0,
          deliveryCharge: Number(sp.deliveryCharge) || 0,
          discount: Number(sp.discount) || 0,
          quantity: 1,
          finalCost: (Number(sp.unitPrice) || 0) + (Number(sp.deliveryCharge) || 0) - (Number(sp.discount) || 0),
          effectiveUnitCost: Number(sp.effectiveCost) || (Number(sp.unitPrice) || 0),
          purchaseDate: sp.lastPurchaseDate || 'Catalog Reference',
          deliveryDays: sp.deliveryDays || 3,
          rating: sp.qualityRating || 4.5
        });
      }
    });

    // Compute metrics for each garment
    const result = [];
    Object.keys(groups).forEach(k => {
      const group = groups[k];
      if (group.entries.length === 0) return;

      const totalEffective = group.entries.reduce((acc, e) => acc + e.effectiveUnitCost, 0);
      const avgEffectiveCost = Math.round(totalEffective / group.entries.length);

      // Find lowest effective cost entry (CRITICAL REQUIREMENT: Not just unit price, but effective cost!)
      const sortedByEffectiveCost = [...group.entries].sort((a, b) => a.effectiveUnitCost - b.effectiveUnitCost);
      const lowestSupplierEntry = sortedByEffectiveCost[0];

      // Find lowest unit price entry to detect differences where delivery charges flip the winner!
      const sortedByUnitPrice = [...group.entries].sort((a, b) => a.unitPrice - b.unitPrice);
      const lowestUnitPriceEntry = sortedByUnitPrice[0];

      const deliveryChargeFlip = lowestUnitPriceEntry.supplierId !== lowestSupplierEntry.supplierId;

      result.push({
        productName: group.productName,
        category: group.category,
        entriesCount: group.entries.length,
        avgEffectiveCost,
        lowestSupplierEntry,
        lowestUnitPriceEntry,
        deliveryChargeFlip,
        allEntries: group.entries
      });
    });

    return result.filter(item => {
      const catMatch = comparatorCategory === 'All' || item.category.toLowerCase().includes(comparatorCategory.toLowerCase());
      const searchMatch = !comparatorProductSearch ||
        item.productName.toLowerCase().includes(comparatorProductSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(comparatorProductSearch.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [supplierPurchases, supplierProducts, suppliers, comparatorCategory, comparatorProductSearch]);

  // -------------------------------------------------------------
  // MULTI-SUPPLIER SIDE-BY-SIDE COMPARISON SELECTION
  // -------------------------------------------------------------
  const comparisonSelectedSuppliers = useMemo(() => {
    return suppliers.filter(s => selectedComparisonSupplierIds.includes(s.id));
  }, [suppliers, selectedComparisonSupplierIds]);

  const toggleSupplierComparison = (sId) => {
    setSelectedComparisonSupplierIds(prev => {
      if (prev.includes(sId)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter(id => id !== sId);
      } else {
        return [...prev, sId];
      }
    });
  };

  // -------------------------------------------------------------
  // RECOMMENDATIONS ALGORITHMIC ENGINE
  // -------------------------------------------------------------
  const recommendationsData = useMemo(() => {
    if (suppliers.length === 0) return [];

    const recs = [];

    // 1. Lowest Effective Cost Champion
    const suppliersWithPurchases = suppliers.filter(s => {
      const m = supplierMetricsMap[s.id];
      return m && m.totalItemsPurchased > 0;
    });

    if (suppliersWithPurchases.length > 0) {
      const bestCostSupplier = [...suppliersWithPurchases].sort((a, b) => {
        const mA = supplierMetricsMap[a.id];
        const mB = supplierMetricsMap[b.id];
        const avgA = mA.totalAmountSpent / mA.totalItemsPurchased;
        const avgB = mB.totalAmountSpent / mB.totalItemsPurchased;
        return avgA - avgB;
      })[0];

      const mA = supplierMetricsMap[bestCostSupplier.id];
      const avgCost = Math.round(mA.totalAmountSpent / mA.totalItemsPurchased);

      recs.push({
        type: 'BEST_PRICE',
        title: 'Lowest Recorded Effective Cost Champion',
        supplier: bestCostSupplier,
        badge: 'Maximum Cost Savings',
        badgeBg: 'var(--icon-green-bg)',
        badgeColor: 'var(--icon-green)',
        statLabel: 'Avg Effective Cost / Unit',
        statValue: `₹${avgCost.toLocaleString('en-IN')}`,
        explanation: `${bestCostSupplier.name} (${bestCostSupplier.shopName}) maintains the lowest recorded average effective cost at ₹${avgCost} per unit across ${mA.totalItemsPurchased} units ordered. Ideal for high-margin volume purchases.`
      });
    }

    // 2. Highest Delivery Reliability & Speed
    const suppliersWithDeliveryStats = suppliers.filter(s => {
      const m = supplierMetricsMap[s.id];
      return m && m.totalPurchasesCount > 0;
    });

    if (suppliersWithDeliveryStats.length > 0) {
      const mostReliable = [...suppliersWithDeliveryStats].sort((a, b) => {
        const mA = supplierMetricsMap[a.id];
        const mB = supplierMetricsMap[b.id];
        const onTimeRatioA = mA.totalPurchasesCount > 0 ? (mA.onTimeDeliveriesCount / mA.totalPurchasesCount) : 0;
        const onTimeRatioB = mB.totalPurchasesCount > 0 ? (mB.onTimeDeliveriesCount / mB.totalPurchasesCount) : 0;
        return onTimeRatioB - onTimeRatioA;
      })[0];

      const mR = supplierMetricsMap[mostReliable.id];
      const onTimePct = mR.totalPurchasesCount > 0 ? Math.round((mR.onTimeDeliveriesCount / mR.totalPurchasesCount) * 100) : 100;
      const avgLead = mR.deliveryDaysSampleCount > 0 ? Math.round(mR.totalDeliveryDays / mR.deliveryDaysSampleCount) : 3;

      recs.push({
        type: 'RELIABILITY',
        title: 'Fastest & Most Reliable Delivery Leader',
        supplier: mostReliable,
        badge: 'Zero Fulfillment Delays',
        badgeBg: 'var(--icon-blue-bg)',
        badgeColor: 'var(--icon-blue)',
        statLabel: 'On-Time Fulfillment Rate',
        statValue: `${onTimePct}% (${avgLead} Days Lead)`,
        explanation: `${mostReliable.name} consistently fulfills textile shipments within ${avgLead} business days with a ${onTimePct}% on-time completion record. Strongly advised for upcoming festive restocking.`
      });
    }

    // 3. Highest Quality Rating
    const topRated = [...suppliers].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    if (topRated) {
      recs.push({
        type: 'QUALITY',
        title: 'Top Craftsmanship & Quality Leader',
        supplier: topRated,
        badge: 'Elite Textile Rating',
        badgeBg: 'var(--badge-gold-bg, rgba(201, 162, 75, 0.15))',
        badgeColor: 'var(--accent-gold-dark)',
        statLabel: 'Supplier Quality Rating',
        statValue: `★ ${topRated.rating.toFixed(1)} / 5.0`,
        explanation: `${topRated.name} (${topRated.shopName}) holds the highest verified seller score of ${topRated.rating}★ for dress consistency, fabric hand-feel, and minimal return rates.`
      });
    }

    // 4. Product-specific cost nuance advice
    const flippedGarment = garmentComparisonData.find(g => g.deliveryChargeFlip);
    if (flippedGarment) {
      recs.push({
        type: 'COST_NUANCE',
        title: `Effective Cost Alert: ${flippedGarment.productName}`,
        supplier: suppliers.find(s => s.id === flippedGarment.lowestSupplierEntry.supplierId) || { name: flippedGarment.lowestSupplierEntry.supplierName, shopName: '' },
        badge: 'Freight Impact Insight',
        badgeBg: 'rgba(217, 90, 78, 0.12)',
        badgeColor: 'var(--accent-danger)',
        statLabel: 'Effective Unit Cost',
        statValue: `₹${flippedGarment.lowestSupplierEntry.effectiveUnitCost}`,
        explanation: `For "${flippedGarment.productName}", ${flippedGarment.lowestUnitPriceEntry.supplierName} advertises a lower unit price (₹${flippedGarment.lowestUnitPriceEntry.unitPrice}), but higher delivery charges make ${flippedGarment.lowestSupplierEntry.supplierName} cheaper overall at ₹${flippedGarment.lowestSupplierEntry.effectiveUnitCost} effective cost.`
      });
    }

    return recs;
  }, [suppliers, supplierMetricsMap, garmentComparisonData]);

  // -------------------------------------------------------------
  // CHART RENDERING (Chart.js with Maroon/Gold Theme)
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'analysis') return;

    // Palette constants
    const maroonColor = '#6B1E2B';
    const goldColor = '#C9A24B';
    const slateColor = '#3B2F2A';
    const greenColor = '#1E5128';
    const dustyRose = '#D98A8A';

    // 1. Supplier-Wise Total Purchase Spend Chart
    if (spendChartRef.current) {
      if (spendChartInstance.current) spendChartInstance.current.destroy();

      const topSuppliersForChart = suppliers.slice(0, 6);
      const labels = topSuppliersForChart.map(s => s.name.split(' ')[0] || s.name);
      const spends = topSuppliersForChart.map(s => (supplierMetricsMap[s.id]?.totalAmountSpent) || 0);

      spendChartInstance.current = new Chart(spendChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Total Spend (₹)',
            data: spends,
            backgroundColor: [maroonColor, goldColor, '#8A6116', '#A33E4D', '#5A4B42', '#B8860B'],
            borderRadius: 6,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Spent: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (val) => `₹${val >= 1000 ? `${val / 1000}k` : val}` },
              grid: { color: 'rgba(43, 33, 29, 0.06)' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Average Product Cost vs Effective Cost Chart
    if (costChartRef.current) {
      if (costChartInstance.current) costChartInstance.current.destroy();

      const topSuppliers = suppliers.slice(0, 6);
      const labels = topSuppliers.map(s => s.name.split(' ')[0]);
      const baseCosts = topSuppliers.map(s => {
        const m = supplierMetricsMap[s.id];
        return m && m.totalItemsPurchased > 0 ? Math.round(m.totalBaseProductCost / m.totalItemsPurchased) : 500;
      });
      const effectiveCosts = topSuppliers.map(s => {
        const m = supplierMetricsMap[s.id];
        return m && m.totalItemsPurchased > 0 ? Math.round(m.totalAmountSpent / m.totalItemsPurchased) : 550;
      });

      costChartInstance.current = new Chart(costChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Base Item Cost (₹)',
              data: baseCosts,
              backgroundColor: goldColor,
              borderRadius: 4
            },
            {
              label: 'Effective Final Cost (₹)',
              data: effectiveCosts,
              backgroundColor: maroonColor,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (v) => `₹${v}` },
              grid: { color: 'rgba(43, 33, 29, 0.06)' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Supplier-Wise Purchase Quantity Chart
    if (qtyChartRef.current) {
      if (qtyChartInstance.current) qtyChartInstance.current.destroy();

      const topSuppliers = suppliers.slice(0, 5);
      const labels = topSuppliers.map(s => s.name.split(' ')[0]);
      const quantities = topSuppliers.map(s => (supplierMetricsMap[s.id]?.totalItemsPurchased) || 5);

      qtyChartInstance.current = new Chart(qtyChartRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: quantities,
            backgroundColor: [maroonColor, goldColor, '#2E6B4F', '#D98A8A', '#5A4B42'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
          }
        }
      });
    }

    // 4. Delivery Performance (On-Time vs Delayed) Chart
    if (deliveryChartRef.current) {
      if (deliveryChartInstance.current) deliveryChartInstance.current.destroy();

      const topSuppliers = suppliers.slice(0, 5);
      const labels = topSuppliers.map(s => s.name.split(' ')[0]);
      const onTime = topSuppliers.map(s => (supplierMetricsMap[s.id]?.onTimeDeliveriesCount) || 1);
      const delayed = topSuppliers.map(s => (supplierMetricsMap[s.id]?.delayedDeliveriesCount) || 0);

      deliveryChartInstance.current = new Chart(deliveryChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'On-Time Deliveries',
              data: onTime,
              backgroundColor: greenColor,
              borderRadius: 4
            },
            {
              label: 'Delayed Deliveries',
              data: delayed,
              backgroundColor: '#991B1B',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(43, 33, 29, 0.06)' } }
          },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }
          }
        }
      });
    }

    // 5. Category-Wise Supplier Cost Comparison Chart
    if (categoryChartRef.current) {
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();

      const sampleCategories = ['Silk Sarees', 'Cotton & Bandhani', 'Suits & Kurtis', 'Denim'];
      const sup1 = suppliers[0]?.name.split(' ')[0] || 'Surat Silk';
      const sup2 = suppliers[1]?.name.split(' ')[0] || 'Vardhman';
      const sup3 = suppliers[2]?.name.split(' ')[0] || 'Arvind';

      categoryChartInstance.current = new Chart(categoryChartRef.current, {
        type: 'bar',
        data: {
          labels: sampleCategories,
          datasets: [
            {
              label: sup1,
              data: [1450, 480, 720, 850],
              backgroundColor: maroonColor,
              borderRadius: 4
            },
            {
              label: sup2,
              data: [1380, 455, 690, 820],
              backgroundColor: goldColor,
              borderRadius: 4
            },
            {
              label: sup3,
              data: [1520, 495, 750, 780],
              backgroundColor: dustyRose,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (v) => `₹${v}` },
              grid: { color: 'rgba(43, 33, 29, 0.06)' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    return () => {
      if (spendChartInstance.current) spendChartInstance.current.destroy();
      if (costChartInstance.current) costChartInstance.current.destroy();
      if (qtyChartInstance.current) qtyChartInstance.current.destroy();
      if (deliveryChartInstance.current) deliveryChartInstance.current.destroy();
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();
    };
  }, [activeTab, suppliers, supplierMetricsMap]);

  // -------------------------------------------------------------
  // VALIDATION & SUBMIT HANDLERS
  // -------------------------------------------------------------
  const validateSupplierForm = () => {
    const errors = {};
    if (!supplierForm.name.trim()) errors.name = 'Supplier Contact Person name is required.';
    if (!supplierForm.shopName.trim()) errors.shopName = 'Shop or Company name is required.';

    // Phone validation
    const cleanPhone = supplierForm.phone.replace(/[^0-9]/g, '');
    if (!supplierForm.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (cleanPhone.length < 10) {
      errors.phone = 'Please provide a valid 10-digit phone number.';
    }

    // Email validation
    if (supplierForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email)) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!supplierForm.city.trim()) errors.city = 'City or Hub Area is required.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!validateSupplierForm()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
      showToast(`✓ Supplier "${supplierForm.name}" updated successfully.`);
    } else {
      const created = addSupplier(supplierForm);
      showToast(`✓ New Supplier "${created.name} (${created.shopName})" registered successfully.`);
    }

    setShowAddSupplierModal(false);
    setEditingSupplier(null);
    setSupplierForm(initialSupplierForm);
  };

  const handleOpenEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      shopName: supplier.shopName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      gstNumber: supplier.gstNumber || '',
      categories: supplier.categories || ['Sarees'],
      productTypes: supplier.productTypes || 'Textile & Garments',
      priceRange: supplier.priceRange || '₹400 - ₹2,500',
      paymentTerms: supplier.paymentTerms || 'Credit (30 Days)',
      deliveryTime: supplier.deliveryTime || '3-4 Days',
      rating: supplier.rating || 4.5,
      notes: supplier.notes || ''
    });
    setFormErrors({});
    setShowAddSupplierModal(true);
  };

  const handleConfirmDeleteSupplier = () => {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    showToast(`✓ Supplier "${deletingSupplier.name}" removed from directory.`);
    setDeletingSupplier(null);
    if (selectedSupplierDetails?.id === deletingSupplier.id) {
      setSelectedSupplierDetails(null);
    }
  };

  // Live Purchase Calculations
  const purchaseQty = Math.max(1, Number(purchaseForm.quantity) || 1);
  const purchaseCostPerItem = Math.max(0, Number(purchaseForm.costPerItem) || 0);
  const purchaseDelivery = Math.max(0, Number(purchaseForm.deliveryCharge) || 0);
  const purchaseDiscount = Math.max(0, Number(purchaseForm.discount) || 0);

  const liveTotalPurchaseCost = purchaseQty * purchaseCostPerItem;
  const liveFinalCost = Math.max(0, liveTotalPurchaseCost + purchaseDelivery - purchaseDiscount);
  const liveEffectiveUnitCost = purchaseQty > 0 ? (liveFinalCost / purchaseQty) : purchaseCostPerItem;

  const validatePurchaseForm = () => {
    const errors = {};
    if (!purchaseForm.supplierId) errors.supplierId = 'Please select a supplier.';
    if (!purchaseForm.productName.trim()) errors.productName = 'Product / Garment name is required.';
    if (purchaseQty <= 0) errors.quantity = 'Quantity must be a positive number greater than 0.';
    if (purchaseCostPerItem <= 0) errors.costPerItem = 'Cost per item must be greater than 0.';
    if (!purchaseForm.purchaseDate) errors.purchaseDate = 'Valid purchase date is required.';
    if (!purchaseForm.expectedDeliveryDate) errors.expectedDeliveryDate = 'Expected delivery date is required.';

    setPurchaseFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRecordPurchase = (e) => {
    e.preventDefault();
    if (!validatePurchaseForm()) return;

    const targetSupplier = suppliers.find(s => s.id === purchaseForm.supplierId) || { name: 'Verified Supplier' };

    const payload = {
      ...purchaseForm,
      supplierName: targetSupplier.name,
      quantity: purchaseQty,
      costPerItem: purchaseCostPerItem,
      deliveryCharge: purchaseDelivery,
      discount: purchaseDiscount,
      totalPurchaseCost: liveTotalPurchaseCost,
      finalCost: liveFinalCost,
      effectiveUnitCost: Math.round(liveEffectiveUnitCost * 100) / 100
    };

    const result = recordPurchaseFromSupplierAndIncreaseInventory(payload);

    let msg = `✓ Stock Inward Recorded: Added ${purchaseQty} pcs of "${payload.productName}" from ${targetSupplier.name} into Warehouse!`;
    if (result.requirementsMatched > 0) {
      msg += ` ✨ Auto-matched & notified ${result.requirementsMatched} waiting customer(s)!`;
    }
    showToast(msg);

    // Reset purchase form
    setPurchaseForm(prev => ({
      ...initialPurchaseForm,
      supplierId: prev.supplierId
    }));
    setPurchaseFormErrors({});
  };

  // -------------------------------------------------------------
  // DEDICATED SUPPLIER PORTAL STATE & HANDLERS (When Supplier Logs in)
  // -------------------------------------------------------------
  const [supplierPortalTab, setSupplierPortalTab] = useState('products'); // 'products' | 'profile' | 'orders' | 'payments'
  const [suppProdSearch, setSuppProdSearch] = useState('');
  const [suppProdCategory, setSuppProdCategory] = useState('All');
  const [showAddSuppProdModal, setShowAddSuppProdModal] = useState(false);
  const [editingSuppProd, setEditingSuppProd] = useState(null);
  const [deletingSuppProd, setDeletingSuppProd] = useState(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [dispatchingPO, setDispatchingPO] = useState(null);
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');
  const [selectedPODetails, setSelectedPODetails] = useState(null);
  const [poFilterStatus, setPoFilterStatus] = useState('all'); // 'all' | 'pending' | 'accepted'
  const [isAcceptingPO, setIsAcceptingPO] = useState(false);

  const initialSuppProdForm = {
    productName: '',
    category: 'Cotton Shirting',
    basePrice: 150,
    unit: 'meters',
    minOrderQty: 20,
    leadTimeDays: 2,
    availability: 'In Stock',
    material: '',
    description: '',
    colorsAvailable: ''
  };
  const [suppProdForm, setSuppProdForm] = useState(initialSuppProdForm);
  const [suppProdErrors, setSuppProdErrors] = useState({});

  const [supplierProfileForm, setSupplierProfileForm] = useState({
    name: '',
    shopName: '',
    contactPerson: '',
    phone: '',
    email: '',
    alternateEmail: '',
    gstNumber: '',
    address: '',
    city: '',
    paymentTerms: '',
    deliveryTime: '',
    productTypes: '',
    notes: ''
  });

  // Match logged-in supplier object
  const loggedInSupplier = useMemo(() => {
    if (!isSupplier) return null;
    let found = null;
    if (supplierId) {
      found = suppliers.find(s => s.id === supplierId || String(s.id).toLowerCase() === String(supplierId).toLowerCase());
    }
    if (!found && userEmail) {
      const emailLower = userEmail.toLowerCase().trim();
      found = suppliers.find(s => 
        (s.email && s.email.toLowerCase().trim() === emailLower) || 
        (s.alternateEmail && s.alternateEmail.toLowerCase().trim() === emailLower)
      );
    }
    if (!found && (supplierName || userName)) {
      const targetName = (supplierName || userName).toLowerCase().trim();
      found = suppliers.find(s => 
        (s.name && s.name.toLowerCase().includes(targetName)) || 
        (s.shopName && s.shopName.toLowerCase().includes(targetName))
      );
    }
    if (!found && suppliers.length > 0) {
      found = suppliers[0];
    }
    return found;
  }, [isSupplier, supplierId, userEmail, supplierName, userName, suppliers]);

  // Sync profile form when logged-in supplier loads
  useEffect(() => {
    if (loggedInSupplier) {
      setSupplierProfileForm({
        name: loggedInSupplier.name || '',
        shopName: loggedInSupplier.shopName || '',
        contactPerson: loggedInSupplier.contactPerson || '',
        phone: loggedInSupplier.phone || '',
        email: loggedInSupplier.email || '',
        alternateEmail: loggedInSupplier.alternateEmail || '',
        gstNumber: loggedInSupplier.gstNumber || '',
        address: loggedInSupplier.address || '',
        city: loggedInSupplier.city || '',
        paymentTerms: loggedInSupplier.paymentTerms || '',
        deliveryTime: loggedInSupplier.deliveryTime || '',
        productTypes: loggedInSupplier.productTypes || '',
        notes: loggedInSupplier.notes || ''
      });
    }
  }, [loggedInSupplier]);

  // Products belonging ONLY to this logged-in supplier
  const mySupplierProducts = useMemo(() => {
    if (!loggedInSupplier) return [];
    const suppId = loggedInSupplier.id;
    const suppName = (loggedInSupplier.name || '').toLowerCase().trim();
    const suppShop = (loggedInSupplier.shopName || '').toLowerCase().trim();

    return supplierProducts.filter(p => {
      if (p.supplierId === suppId) return true;
      if (suppId === 'sup-1' && (p.supplierId === 'SUP-001' || p.supplierId === 'sup-1')) return true;
      if (p.supplierName) {
        const pName = p.supplierName.toLowerCase().trim();
        if (pName.includes(suppName) || suppName.includes(pName) || (suppShop && pName.includes(suppShop))) return true;
      }
      return false;
    });
  }, [loggedInSupplier, supplierProducts]);

  // ThreadLine purchase orders placed ONLY with this supplier
  const mySupplierPurchases = useMemo(() => {
    if (!loggedInSupplier) return [];
    const suppId = loggedInSupplier.id;
    const suppName = (loggedInSupplier.name || '').toLowerCase().trim();
    return supplierPurchases.filter(po => {
      if (po.supplierId === suppId) return true;
      if (suppId === 'sup-1' && (po.supplierId === 'SUP-001' || po.supplierId === 'sup-1')) return true;
      if (po.supplierName && (
        po.supplierName.toLowerCase().trim().includes(suppName) ||
        suppName.includes(po.supplierName.toLowerCase().trim())
      )) return true;
      return false;
    });
  }, [loggedInSupplier, supplierPurchases]);

  // Payments received by this supplier
  const mySupplierPayments = useMemo(() => {
    if (!loggedInSupplier) return [];
    const suppId = loggedInSupplier.id;
    return supplierPayments.filter(pay => {
      if (pay.supplierId === suppId) return true;
      if (suppId === 'sup-1' && (pay.supplierId === 'SUP-001' || pay.supplierId === 'sup-1')) return true;
      return false;
    });
  }, [loggedInSupplier, supplierPayments]);

  // Financial aggregates for logged-in supplier
  const supplierTotalBilled = useMemo(() => {
    return mySupplierPurchases.reduce((acc, po) => acc + (Number(po.finalCost) || 0), 0);
  }, [mySupplierPurchases]);

  const supplierTotalSettled = useMemo(() => {
    return mySupplierPayments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
  }, [mySupplierPayments]);

  const supplierBalanceDue = Math.max(0, supplierTotalBilled - supplierTotalSettled);

  // Available categories for this supplier's product filter
  const myProductCategories = useMemo(() => {
    const cats = new Set(['All']);
    if (loggedInSupplier?.categories) {
      toCategoryArray(loggedInSupplier.categories).forEach(c => cats.add(c));
    }
    mySupplierProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [loggedInSupplier, mySupplierProducts]);

  // Filtered products list for table/grid
  const displayedSupplierProducts = useMemo(() => {
    return mySupplierProducts.filter(p => {
      const matchCat = suppProdCategory === 'All' || p.category === suppProdCategory;
      const matchSearch = !suppProdSearch ||
        (p.productName && p.productName.toLowerCase().includes(suppProdSearch.toLowerCase())) ||
        (p.material && p.material.toLowerCase().includes(suppProdSearch.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(suppProdSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [mySupplierProducts, suppProdCategory, suppProdSearch]);

  // Handler: Open Add Product modal
  const handleOpenAddSuppProduct = () => {
    setEditingSuppProd(null);
    setSuppProdForm({
      productName: '',
      category: myProductCategories[1] || 'Cotton Shirting',
      basePrice: 150,
      unit: 'meters',
      minOrderQty: 20,
      leadTimeDays: 2,
      availability: 'In Stock',
      material: '',
      description: '',
      colorsAvailable: ''
    });
    setSuppProdErrors({});
    setShowAddSuppProdModal(true);
  };

  // Handler: Open Edit Product modal
  const handleOpenEditSuppProduct = (prod) => {
    setEditingSuppProd(prod);
    setSuppProdForm({
      productName: prod.productName || '',
      category: prod.category || 'Cotton Shirting',
      basePrice: prod.basePrice || 150,
      unit: prod.unit || 'meters',
      minOrderQty: prod.minOrderQty || 20,
      leadTimeDays: prod.leadTimeDays || 2,
      availability: prod.availability || 'In Stock',
      material: prod.material || '',
      description: prod.description || '',
      colorsAvailable: Array.isArray(prod.colorsAvailable) ? prod.colorsAvailable.join(', ') : (prod.colorsAvailable || '')
    });
    setSuppProdErrors({});
    setShowAddSuppProdModal(true);
  };

  // Handler: Save Supplier Product (Add or Edit)
  const handleSaveSuppProduct = (e) => {
    e.preventDefault();
    const errors = {};
    if (!suppProdForm.productName.trim()) errors.productName = 'Product name is required';
    if (!suppProdForm.basePrice || Number(suppProdForm.basePrice) <= 0) errors.basePrice = 'Valid base price is required';
    if (Object.keys(errors).length > 0) {
      setSuppProdErrors(errors);
      return;
    }

    const payload = {
      productName: suppProdForm.productName.trim(),
      category: suppProdForm.category,
      basePrice: Number(suppProdForm.basePrice),
      unit: suppProdForm.unit,
      minOrderQty: Number(suppProdForm.minOrderQty) || 1,
      leadTimeDays: Number(suppProdForm.leadTimeDays) || 2,
      availability: suppProdForm.availability,
      material: suppProdForm.material.trim(),
      description: suppProdForm.description.trim(),
      colorsAvailable: suppProdForm.colorsAvailable ? suppProdForm.colorsAvailable.split(',').map(c => c.trim()).filter(Boolean) : [],
      supplierId: loggedInSupplier.id,
      supplierName: loggedInSupplier.name
    };

    if (editingSuppProd) {
      updateSupplierProduct(editingSuppProd.id, payload);
      showToast('Product updated successfully!');
    } else {
      addSupplierProduct(payload);
      showToast('New product added to your mill catalog!');
    }
    setShowAddSuppProdModal(false);
    setEditingSuppProd(null);
  };

  // Handler: Quick Stock Toggle
  const handleToggleStockStatus = (prod) => {
    const nextStatus = prod.availability === 'In Stock' ? 'Low Stock' : prod.availability === 'Low Stock' ? 'Out of Stock' : 'In Stock';
    updateSupplierProduct(prod.id, { availability: nextStatus });
    showToast(`Stock status set to ${nextStatus}`);
  };

  // Handler: Delete Supplier Product
  const handleConfirmDeleteSuppProduct = () => {
    if (deletingSuppProd) {
      deleteSupplierProduct(deletingSuppProd.id);
      showToast('Product removed from catalog');
      setDeletingSuppProd(null);
    }
  };

  // Handler: Save Mill Profile
  const handleSaveSupplierProfile = (e) => {
    e.preventDefault();
    if (loggedInSupplier) {
      updateSupplier(loggedInSupplier.id, supplierProfileForm);
      showToast('Mill Profile details updated successfully!');
      setShowEditProfileModal(false);
    }
  };

  // Handler: Confirm Order Dispatch
  const handleConfirmDispatchOrder = (e) => {
    e.preventDefault();
    if (dispatchingPO) {
      const trackingNote = dispatchTrackingNumber ? `Dispatched via LR #${dispatchTrackingNumber}` : 'Dispatched from Mill';
      updateSupplierPurchase(dispatchingPO.id, {
        deliveryStatus: 'In Transit',
        notes: dispatchingPO.notes ? `${dispatchingPO.notes} | ${trackingNote}` : trackingNote
      });
      showToast(`Order #${dispatchingPO.purchaseOrderNo || dispatchingPO.id} marked as In Transit!`);
      setDispatchingPO(null);
      setDispatchTrackingNumber('');
    }
  };

  // Handler: Supplier Accepts Received Purchase Order
  const handleAcceptPO = async (po) => {
    if (!po || !loggedInSupplier) return;

    // 1. Enforce supplier ownership (no cross-supplier acceptance)
    const isOwner = po.supplierId === loggedInSupplier.id ||
      (loggedInSupplier.id === 'sup-1' && (po.supplierId === 'SUP-001' || po.supplierId === 'sup-1')) ||
      (po.supplierName && loggedInSupplier.name && po.supplierName.toLowerCase().includes(loggedInSupplier.name.toLowerCase()));

    if (!isOwner) {
      showToast("Unauthorized: You cannot accept another supplier's Purchase Order.", 'error');
      return;
    }

    // 2. Prevent duplicate acceptance
    if (po.status === 'Accepted' || po.acceptanceStatus === 'Accepted') {
      showToast(`This Purchase Order was already accepted on ${po.acceptedDateFormatted || po.acceptedAt || 'record'}.`, 'info');
      return;
    }

    try {
      setIsAcceptingPO(true);
      const updated = await acceptSupplierPurchaseOrder(po.id, loggedInSupplier.id, loggedInSupplier.name);
      setSelectedPODetails(updated);
      showToast(`✓ Purchase Order #${po.purchaseOrderNo || po.id} Accepted! Admin & Inventory Manager notified.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to accept Purchase Order', 'error');
    } finally {
      setIsAcceptingPO(false);
    }
  };


  // -------------------------------------------------------------
  // DEDICATED SUPPLIER SETTINGS RENDER (When Logged-In as Supplier)
  // -------------------------------------------------------------
  if (isSupplier) {
    return <SupplierSettingsView />;
  }

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '40px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deletingSupplier}
        title={t('Delete Supplier', 'Delete Supplier Record')}
        message={`Are you sure you want to remove "${deletingSupplier?.name} (${deletingSupplier?.shopName})"? All recorded purchase history will remain intact.`}
        confirmText={t('Delete', 'Delete Supplier')}
        onConfirm={handleConfirmDeleteSupplier}
        onCancel={() => setDeletingSupplier(null)}
      />

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>🚚</span>
            <h1 style={{ margin: 0, fontSize: '26px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
              {t('supplierManagementTitle', 'Supplier Management & Purchasing Ledger')}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
            Compare textile suppliers by <strong>true effective cost</strong>, track garment inward into warehouse inventory, and discover low-budget fabric mills.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm(initialSupplierForm);
              setFormErrors({});
              setShowAddSupplierModal(true);
            }}
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(107, 30, 43, 0.2)'
            }}
          >
            <span>+</span> {t('addSupplier', 'Register Supplier')}
          </button>
          <button
            onClick={() => setActiveTab('inward')}
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--accent-gold)',
              color: '#201713',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📦</span> Record Stock Inward
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-light)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { key: 'directory', label: 'Supplier Directory & Profiles', icon: '📋', count: suppliers.length },
          { key: 'inward', label: 'Purchase Inward & Stock Entry', icon: '📥', count: supplierPurchases.length },
          { key: 'analysis', label: 'Executive Supplier Analytics', icon: '📊' },
          { key: 'low-budget', label: 'Low-Budget Price Finder & Comparison', icon: '🏷️' },
          { key: 'recommendations', label: 'Data-Driven Recommendations', icon: '💡', count: recommendationsData.length }
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-gray)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                  color: isActive ? '#FFFFFF' : 'var(--text-gray)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUPPLIER DIRECTORY & PROFILES */}
      {activeTab === 'directory' && (
        <div>
          {/* SEARCH & FILTERS BAR */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by supplier name, shop, phone, city..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
              </div>

              {/* Filter Category */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-gray)', fontWeight: 600 }}>Category:</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="All">All Categories</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Filter City */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-gray)', fontWeight: 600 }}>City/Area:</label>
                <select
                  value={selectedCityFilter}
                  onChange={(e) => { setSelectedCityFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="All">All Cities</option>
                  {allCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              {/* Sort By */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-gray)', fontWeight: 600 }}>Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="spend-desc">Highest Purchase Spend</option>
                  <option value="spend-asc">Lowest Purchase Spend</option>
                  <option value="cost-asc">Lowest Average Item Cost</option>
                  <option value="rating-desc">Highest Rating</option>
                  <option value="name-asc">Supplier Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SUPPLIERS TABLE */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Supplier & ID</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Shop / Mill</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Contact & City</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Categories</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Rating</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Total Spent</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>Orders</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-gray)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
                        <p style={{ margin: 0, fontWeight: 600 }}>No suppliers found matching your query.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map(sup => {
                      const metrics = supplierMetricsMap[sup.id] || { totalPurchasesCount: 0, totalAmountSpent: 0 };
                      return (
                        <tr
                          key={sup.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '14px' }}>{sup.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--accent-gold-dark)', fontWeight: 600 }}>{sup.id}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{sup.shopName}</div>
                            {sup.gstNumber && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GST: {sup.gstNumber}</div>}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-dark)' }}>{sup.phone}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📍 {sup.city}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '220px' }}>
                              {toCategoryArray(sup.categories).map(cat => (
                                <span
                                  key={cat}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--bg-subtle)',
                                    color: 'var(--text-slate)',
                                    fontWeight: 600
                                  }}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#D97706', fontSize: '14px' }}>★</span>
                              <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '13px' }}>{sup.rating?.toFixed(1) || '4.5'}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sup.deliveryTime || '3-4 Days'}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '14px' }}>
                              ₹{metrics.totalAmountSpent.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 9px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: metrics.totalPurchasesCount > 0 ? 'var(--icon-blue-bg)' : 'var(--bg-subtle)',
                              color: metrics.totalPurchasesCount > 0 ? 'var(--icon-blue)' : 'var(--text-muted)'
                            }}>
                              {metrics.totalPurchasesCount} orders
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setSelectedSupplierDetails(sup)}
                                title="View Complete Supplier Profile & Analytics"
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: 'var(--bg-main)',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--text-dark)',
                                  cursor: 'pointer'
                                }}
                              >
                                Details 👁️
                              </button>
                              <button
                                onClick={() => {
                                  setPurchaseForm(prev => ({ ...prev, supplierId: sup.id }));
                                  setActiveTab('inward');
                                }}
                                title="Record Inward Stock from this Supplier"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(201, 162, 75, 0.15)',
                                  border: '1px solid var(--accent-gold)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--accent-gold-dark)',
                                  cursor: 'pointer'
                                }}
                              >
                                Inward 📦
                              </button>
                              <button
                                onClick={() => handleOpenEditSupplier(sup)}
                                title="Edit Supplier"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: 'var(--text-gray)',
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setDeletingSupplier(sup)}
                                title="Delete Supplier"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: 'var(--accent-danger)',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE INWARD & RECORD PURCHASE */}
      {activeTab === 'inward' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
          {/* PURCHASE ORDER ENTRY FORM */}
          <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
                Record Purchase From Supplier
              </h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
              Entering this purchase will <strong>automatically increase warehouse inventory stock</strong> and notify customers awaiting this garment.
            </p>

            <form onSubmit={handleRecordPurchase}>
              {/* Supplier Dropdown */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                  Select Supplier *
                </label>
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: purchaseFormErrors.supplierId ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shopName} - {s.city})
                    </option>
                  ))}
                </select>
                {purchaseFormErrors.supplierId && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{purchaseFormErrors.supplierId}</div>}
              </div>

              {/* Purchase Date & Expected Delivery */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Expected Delivery *
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.expectedDeliveryDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, expectedDeliveryDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
              </div>

              {/* Product / Dress Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                  Dress / Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cotton Saree, Pure Silk Brocade, Linen Suit..."
                  value={purchaseForm.productName}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, productName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: purchaseFormErrors.productName ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                />
                {purchaseFormErrors.productName && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{purchaseFormErrors.productName}</div>}
              </div>

              {/* Category, Size, Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Category</label>
                  <select
                    value={purchaseForm.category}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  >
                    <option value="Silk Sarees">Silk Sarees</option>
                    <option value="Cotton Sarees">Cotton Sarees</option>
                    <option value="Kurtis & Suits">Kurtis & Suits</option>
                    <option value="Menswear">Menswear</option>
                    <option value="Denim & Jeans">Denim & Jeans</option>
                    <option value="Fabrics & Textiles">Fabrics & Textiles</option>
                    <option value="Dupattas">Dupattas</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Size</label>
                  <input
                    type="text"
                    value={purchaseForm.size}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, size: e.target.value })}
                    placeholder="M, L, Standard"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Color</label>
                  <input
                    type="text"
                    value={purchaseForm.color}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, color: e.target.value })}
                    placeholder="e.g. Maroon"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
              </div>

              {/* Quantity & Cost per Item */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Quantity (Pcs) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Cost Per Item (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.costPerItem}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, costPerItem: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
              </div>

              {/* Delivery Charge & Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Delivery Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.deliveryCharge}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, deliveryCharge: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.discount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, discount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
              </div>

              {/* LIVE AUTO-CALCULATION DISPLAY BOX */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-gray)', marginBottom: '4px' }}>
                  <span>Total Purchase Cost ({purchaseQty} × ₹{purchaseCostPerItem}):</span>
                  <span>₹{liveTotalPurchaseCost.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-gray)', marginBottom: '4px' }}>
                  <span>+ Delivery Charge:</span>
                  <span>+₹{purchaseDelivery}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-gray)', marginBottom: '8px' }}>
                  <span>- Discount Applied:</span>
                  <span>-₹{purchaseDiscount}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '13px' }}>Final Cost:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '16px' }}>₹{liveFinalCost.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>Effective Cost / Piece:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold-dark)' }}>₹{liveEffectiveUnitCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment & Delivery Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Payment Status</label>
                  <select
                    value={purchaseForm.paymentStatus}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Pending">Pending / Khata</option>
                    <option value="Partial">Partial Payment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Delivery Status</label>
                  <select
                    value={purchaseForm.deliveryStatus}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, deliveryStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  >
                    <option value="Delivered">Delivered (In Stock)</option>
                    <option value="In Transit">In Transit / Dispatched</option>
                    <option value="Pending">Ordered / Awaiting</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(107, 30, 43, 0.2)'
                }}
              >
                ✓ Confirm Purchase & Increase Stock
              </button>
            </form>
          </div>

          {/* RECORDED PURCHASES LOG TABLE */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                  Recent Inward Purchases Log ({supplierPurchases.length})
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                  All orders automatically increment warehouse vault quantities.
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>PO ID & Date</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Supplier</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Product / Garment</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Qty</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Unit Cost</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Final Cost</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Effective / Pc</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)' }}>Supplier Acceptance</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-gray)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPurchases.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '13px' }}>{po.id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{po.purchaseDate}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '13px' }}>{po.supplierName}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '13px' }}>{po.productName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{po.category} • {po.size}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {po.quantity} pcs
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-dark)' }}>
                        ₹{po.costPerItem}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '13px' }}>
                        ₹{po.finalCost?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-gold-dark)', fontSize: '13px' }}>
                        ₹{po.effectiveUnitCost || Math.round(po.finalCost / (po.quantity || 1))}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {po.status === 'Accepted' || po.acceptanceStatus === 'Accepted' ? (
                          <div>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(5, 150, 105, 0.12)',
                              color: 'var(--accent-emerald)',
                              border: '1px solid rgba(5, 150, 105, 0.25)'
                            }}>
                              ✓ Accepted
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {po.acceptedDateFormatted ? `Accepted: ${po.acceptedDateFormatted}` : (po.acceptedAt ? `Accepted: ${new Date(po.acceptedAt).toLocaleDateString('en-GB')}` : 'Accepted by Supplier')}
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(217, 119, 6, 0.15)',
                            color: '#D97706',
                            border: '1px solid rgba(217, 119, 6, 0.3)'
                          }}>
                            ⏳ Waiting Acceptance
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            deleteSupplierPurchase(po.id);
                            showToast(`✓ Removed Purchase Order ${po.id}`);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          title="Delete PO"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTIVE SUPPLIER ANALYTICS */}
      {activeTab === 'analysis' && (
        <div>
          {/* 6 EXECUTIVE DASHBOARD CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Suppliers</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>{totalSuppliersCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', marginTop: '4px', fontWeight: 600 }}>Active in System</div>
            </div>

            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Mills / Hubs</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-serif)' }}>{activeSuppliersCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>100% Operational</div>
            </div>

            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Purchase Spend</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-serif)' }}>
                ₹{totalPurchaseSpend.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Across {supplierPurchases.length} PO Orders</div>
            </div>

            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Avg Product Cost</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
                ₹{avgProductCostOverall.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Per Garment Unit</div>
            </div>

            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Lowest Recorded Cost</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold-dark)', fontFamily: 'var(--font-serif)' }}>
                ₹{lowestRecordedEffectiveCostPO?.effectiveUnitCost || 455}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lowestRecordedEffectiveCostPO?.productName || 'Cotton Saree'}
              </div>
            </div>

            <div className="card" style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '6px' }}>Pending Supplier Dues</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: pendingPaymentsAmount > 0 ? 'var(--accent-danger)' : 'var(--accent-emerald)', fontFamily: 'var(--font-serif)' }}>
                ₹{pendingPaymentsAmount.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Payable to Suppliers</div>
            </div>
          </div>

          {/* 5 CHARTS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Chart 1: Supplier Spend */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-dark)', fontWeight: 700 }}>
                1. Supplier-Wise Total Purchase Spend (₹)
              </h4>
              <div style={{ height: '230px', position: 'relative' }}>
                <canvas ref={spendChartRef}></canvas>
              </div>
            </div>

            {/* Chart 2: Base Cost vs Effective Cost */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-dark)', fontWeight: 700 }}>
                2. Base Price vs Effective Cost Comparison (₹)
              </h4>
              <div style={{ height: '230px', position: 'relative' }}>
                <canvas ref={costChartRef}></canvas>
              </div>
            </div>

            {/* Chart 3: Purchase Quantity Share */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-dark)', fontWeight: 700 }}>
                3. Purchase Quantity Distribution (Units)
              </h4>
              <div style={{ height: '230px', position: 'relative' }}>
                <canvas ref={qtyChartRef}></canvas>
              </div>
            </div>

            {/* Chart 4: Delivery Performance */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-dark)', fontWeight: 700 }}>
                4. Delivery Performance (On-Time vs Delayed)
              </h4>
              <div style={{ height: '230px', position: 'relative' }}>
                <canvas ref={deliveryChartRef}></canvas>
              </div>
            </div>

            {/* Chart 5: Category-Wise Supplier Cost */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', gridColumn: 'span 2' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-dark)', fontWeight: 700 }}>
                5. Category-Wise Supplier Price Benchmarking (₹)
              </h4>
              <div style={{ height: '240px', position: 'relative' }}>
                <canvas ref={categoryChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOW-BUDGET PRICE FINDER & MULTI-SUPPLIER COMPARISON */}
      {activeTab === 'low-budget' && (
        <div>
          {/* SECTION A: LOW-BUDGET GARMENT PRICE FINDER */}
          <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                  🏷️ Low-Budget Supplier Price Finder (Same Garment Comparison)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-gray)' }}>
                  Evaluates <strong>Base Price + Delivery Charge - Discount = Final Effective Cost</strong> to identify true lowest purchase expenditure.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Filter garments (e.g. Saree, Cotton)..."
                  value={comparatorProductSearch}
                  onChange={(e) => setComparatorProductSearch(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                />
                <select
                  value={comparatorCategory}
                  onChange={(e) => setComparatorCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="All">All Categories</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* GARMENT PRICE CARDS COMPARATOR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {garmentComparisonData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    backgroundColor: 'var(--bg-main)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>{item.productName}</span>
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: '10px' }}>
                        {item.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                        Internal Avg Cost: <strong>₹{item.avgEffectiveCost}</strong>
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: 'var(--icon-green-bg)',
                        color: 'var(--icon-green)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🏆 Best Price: {item.lowestSupplierEntry.supplierName} (₹{item.lowestSupplierEntry.effectiveUnitCost}/pc)
                      </span>
                    </div>
                  </div>

                  {/* Delivery charge warning if applicable */}
                  {item.deliveryChargeFlip && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(217, 90, 78, 0.1)',
                      borderLeft: '4px solid var(--accent-danger)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--accent-danger)',
                      marginBottom: '12px',
                      fontWeight: 600
                    }}>
                      ⚠️ Notice: {item.lowestUnitPriceEntry.supplierName} has a lower base item price (₹{item.lowestUnitPriceEntry.unitPrice}), but higher freight charges make {item.lowestSupplierEntry.supplierName} cheaper overall at ₹{item.lowestSupplierEntry.effectiveUnitCost} effective cost!
                    </div>
                  )}

                  {/* COMPARISON ROWS FOR THIS GARMENT */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-gray)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Supplier</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Base Unit Price</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Delivery Fee</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Discount</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Effective Cost / Pc</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Difference vs Avg</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.allEntries.map((entry, eIdx) => {
                          const isWinner = entry.supplierId === item.lowestSupplierEntry.supplierId;
                          const diff = entry.effectiveUnitCost - item.avgEffectiveCost;
                          return (
                            <tr
                              key={eIdx}
                              style={{
                                backgroundColor: isWinner ? 'rgba(30, 81, 40, 0.05)' : 'transparent',
                                borderBottom: '1px solid rgba(43, 33, 29, 0.05)'
                              }}
                            >
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-dark)' }}>
                                {entry.supplierName}
                                {isWinner && <span style={{ marginLeft: '6px', color: 'var(--accent-emerald)', fontWeight: 800 }}>★ CHEAPEST</span>}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{entry.unitPrice}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>+₹{entry.deliveryCharge}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--accent-emerald)' }}>-₹{entry.discount}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: isWinner ? 'var(--accent-emerald)' : 'var(--text-dark)' }}>
                                ₹{entry.effectiveUnitCost}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: diff <= 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)' }}>
                                {diff <= 0 ? `-₹${Math.abs(diff)} (Cheaper)` : `+₹${diff} (Higher)`}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {isWinner ? (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', backgroundColor: 'var(--icon-green-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                                    Lowest Effective Cost
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Standard</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: MULTI-SUPPLIER SIDE-BY-SIDE COMPARISON TABLE */}
          <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                  ⚖️ Multi-Supplier Side-by-Side Comparison
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-gray)' }}>
                  Select 2 or more suppliers to cross-compare pricing, lead times, reliability, and payment credit terms.
                </p>
              </div>

              {/* SUPPLIER SELECTOR CHECKBOXES */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {suppliers.map(s => {
                  const isChecked = selectedComparisonSupplierIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSupplierComparison(s.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isChecked ? 'var(--accent-primary)' : 'var(--bg-main)',
                        color: isChecked ? '#FFFFFF' : 'var(--text-dark)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isChecked ? '✓ ' : '+ '} {s.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SIDE-BY-SIDE COMPARISON TABLE */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)' }}>Metric / Feature</th>
                    {comparisonSelectedSuppliers.map(s => (
                      <th key={s.id} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        <div>{s.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{s.shopName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>City & Hub</td>
                    {comparisonSelectedSuppliers.map(s => (
                      <td key={s.id} style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>📍 {s.city}</td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Dress Categories</td>
                    {comparisonSelectedSuppliers.map(s => (
                      <td key={s.id} style={{ padding: '12px 16px' }}>
                        {toCategoryArray(s.categories).join(', ')}
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Avg Recorded Effective Cost</td>
                    {comparisonSelectedSuppliers.map(s => {
                      const m = supplierMetricsMap[s.id];
                      const avg = m && m.totalItemsPurchased > 0 ? Math.round(m.totalAmountSpent / m.totalItemsPurchased) : 550;
                      return (
                        <td key={s.id} style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '14px' }}>
                          ₹{avg.toLocaleString('en-IN')} / unit
                        </td>
                      );
                    })}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Avg Delivery Fee</td>
                    {comparisonSelectedSuppliers.map(s => {
                      const m = supplierMetricsMap[s.id];
                      const avgFee = m && m.totalPurchasesCount > 0 ? Math.round(m.totalDeliveryCharge / m.totalPurchasesCount) : 100;
                      return (
                        <td key={s.id} style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>
                          ₹{avgFee} per shipment
                        </td>
                      );
                    })}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Delivery Turnaround</td>
                    {comparisonSelectedSuppliers.map(s => (
                      <td key={s.id} style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>
                        ⏱️ {s.deliveryTime || '3-4 Days'}
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Delivery Reliability</td>
                    {comparisonSelectedSuppliers.map(s => {
                      const m = supplierMetricsMap[s.id];
                      const onTimePct = m && m.totalPurchasesCount > 0 ? Math.round((m.onTimeDeliveriesCount / m.totalPurchasesCount) * 100) : 100;
                      return (
                        <td key={s.id} style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: onTimePct >= 90 ? 'var(--icon-green-bg)' : 'var(--icon-red-bg)',
                            color: onTimePct >= 90 ? 'var(--icon-green)' : 'var(--accent-danger)'
                          }}>
                            {onTimePct}% On-Time
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Supplier Rating</td>
                    {comparisonSelectedSuppliers.map(s => (
                      <td key={s.id} style={{ padding: '12px 16px', fontWeight: 700, color: '#D97706' }}>
                        ★ {s.rating?.toFixed(1) || '4.5'} / 5.0
                      </td>
                    ))}
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-slate)' }}>Payment Terms</td>
                    {comparisonSelectedSuppliers.map(s => (
                      <td key={s.id} style={{ padding: '12px 16px', color: 'var(--text-dark)', fontSize: '13px' }}>
                        💳 {s.paymentTerms || 'Credit (30 Days)'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATA-DRIVEN RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div>
          <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>💡</span>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                Data-Driven Supplier Recommendation Engine
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
              These recommendations are <strong>strictly computed from your actual recorded purchase data</strong>, factoring in true effective cost, delivery transit times, fulfillment reliability, and product quality scores.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {recommendationsData.map((rec, rIdx) => (
              <div
                key={rIdx}
                className="card"
                style={{
                  padding: '22px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: rec.badgeBg,
                      color: rec.badgeColor
                    }}>
                      {rec.badge}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified Ledger Data</span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-dark)', fontWeight: 700 }}>
                    {rec.title}
                  </h4>

                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '12px' }}>
                    {rec.supplier.name} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-gray)' }}>({rec.supplier.shopName})</span>
                  </div>

                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>{rec.statLabel}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-gold-dark)', marginTop: '2px' }}>{rec.statValue}</div>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-dark)', fontStyle: 'italic' }}>
                    "{rec.explanation}"
                  </p>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setSelectedSupplierDetails(rec.supplier);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    View Supplier Profile →
                  </button>
                  <button
                    onClick={() => {
                      setPurchaseForm(prev => ({ ...prev, supplierId: rec.supplier.id }));
                      setActiveTab('inward');
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Place Order 📦
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddSupplierModal(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
                {editingSupplier ? 'Edit Supplier Details' : 'Register New Textile Supplier'}
              </h3>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: formErrors.name ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                  {formErrors.name && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{formErrors.name}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Shop / Company Name *
                  </label>
                  <input
                    type="text"
                    value={supplierForm.shopName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, shopName: e.target.value })}
                    placeholder="e.g. Surat Silk Mills"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: formErrors.shopName ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                  {formErrors.shopName && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{formErrors.shopName}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="+91 98250 12345"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: formErrors.phone ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                  {formErrors.phone && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{formErrors.phone}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="sales@suratsilk.com"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: formErrors.email ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                  {formErrors.email && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{formErrors.email}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    City / Hub Area *
                  </label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    placeholder="e.g. Surat, Ludhiana, Mumbai"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: formErrors.city ? '1px solid var(--accent-danger)' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                  {formErrors.city && <div style={{ color: 'var(--accent-danger)', fontSize: '11px', marginTop: '2px' }}>{formErrors.city}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={supplierForm.gstNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AAACS1234A1Z5"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-dark)'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                  Mill / Shop Address
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Plot No, Textile Market, Ring Road..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>
                  Dress Categories Supplied (Comma separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(supplierForm.categories) ? supplierForm.categories.join(', ') : supplierForm.categories}
                  onChange={(e) => setSupplierForm({ ...supplierForm, categories: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="Silk Sarees, Kurtis & Suits, Cotton"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-dark)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Delivery Time</label>
                  <input
                    type="text"
                    value={supplierForm.deliveryTime}
                    onChange={(e) => setSupplierForm({ ...supplierForm, deliveryTime: e.target.value })}
                    placeholder="2-3 Days"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '12px', backgroundColor: 'var(--bg-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Payment Terms</label>
                  <input
                    type="text"
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    placeholder="Credit (30 Days)"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '12px', backgroundColor: 'var(--bg-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Rating (1 - 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={supplierForm.rating}
                    onChange={(e) => setSupplierForm({ ...supplierForm, rating: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '12px', backgroundColor: 'var(--bg-main)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-slate)', marginBottom: '4px' }}>Notes</label>
                <textarea
                  rows="2"
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="Reliability notes, direct broker contacts, etc."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '13px', backgroundColor: 'var(--bg-main)' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  style={{ padding: '10px 18px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE SUPPLIER DETAILS & AUDIT DRAWER */}
      {selectedSupplierDetails && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSupplierDetails(null); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* DRAWER HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-dark)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                    {selectedSupplierDetails.name}
                  </h2>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-gold-dark)' }}>
                    {selectedSupplierDetails.id}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-gray)', marginTop: '4px' }}>
                  {selectedSupplierDetails.shopName} • 📍 {selectedSupplierDetails.city} • 📞 {selectedSupplierDetails.phone}
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplierDetails(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            {/* SUB-TABS */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
              {[
                { key: 'info', label: 'Supplier Info' },
                { key: 'purchases', label: `Purchase History (${(supplierMetricsMap[selectedSupplierDetails.id]?.purchases.length) || 0})` },
                { key: 'products', label: 'Products Supplied' },
                { key: 'payments', label: 'Payment Ledger' },
                { key: 'performance', label: 'Performance & Cost Audit' }
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => setDetailsSubTab(st.key)}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    background: 'none',
                    borderBottom: detailsSubTab === st.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: detailsSubTab === st.key ? 'var(--accent-primary)' : 'var(--text-gray)',
                    fontWeight: detailsSubTab === st.key ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* SUB-TAB 1: INFO */}
            {detailsSubTab === 'info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Shop / Mill Name</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>{selectedSupplierDetails.shopName}</div>
                </div>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>GST Registration</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>{selectedSupplierDetails.gstNumber || 'Not Registered'}</div>
                </div>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Address</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dark)', marginTop: '2px' }}>{selectedSupplierDetails.address || selectedSupplierDetails.city}</div>
                </div>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Email</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dark)', marginTop: '2px' }}>{selectedSupplierDetails.email || 'N/A'}</div>
                </div>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Terms</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginTop: '2px' }}>{selectedSupplierDetails.paymentTerms || 'Credit (30 Days)'}</div>
                </div>
                <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Delivery Speed</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginTop: '2px' }}>⏱️ {selectedSupplierDetails.deliveryTime || '3-4 Days'}</div>
                </div>
                <div style={{ gridColumn: 'span 2', padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Notes & Quality Appraisal</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dark)', marginTop: '4px', fontStyle: 'italic' }}>
                    {selectedSupplierDetails.notes || 'Reliable vendor with verified credit history.'}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: PURCHASES */}
            {detailsSubTab === 'purchases' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>PO ID & Date</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Garment Item</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Final Cost</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(supplierMetricsMap[selectedSupplierDetails.id]?.purchases || []).map(po => (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontWeight: 700 }}>{po.id}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{po.purchaseDate}</div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>{po.productName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{po.category} • {po.size}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{po.quantity} pcs</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>₹{po.costPerItem}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>₹{po.finalCost?.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: po.deliveryStatus === 'Delivered' ? 'var(--icon-green-bg)' : 'var(--icon-red-bg)', color: po.deliveryStatus === 'Delivered' ? 'var(--icon-green)' : 'var(--accent-danger)' }}>
                            {po.deliveryStatus || 'Delivered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 3: PRODUCTS */}
            {detailsSubTab === 'products' && (
              <div>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
                  Catalog of garments and fabrics currently supplied by {selectedSupplierDetails.name}:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {supplierProducts.filter(sp => sp.supplierId === selectedSupplierDetails.id).map(sp => (
                    <div key={sp.id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-main)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '14px' }}>{sp.productName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{sp.category}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Base Price:</span>
                        <strong style={{ color: 'var(--text-dark)' }}>₹{sp.unitPrice}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '2px' }}>
                        <span>Delivery Fee:</span>
                        <span style={{ color: 'var(--text-muted)' }}>+₹{sp.deliveryCharge}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent-gold-dark)' }}>Effective Cost:</span>
                        <strong style={{ color: 'var(--accent-gold-dark)' }}>₹{sp.effectiveCost}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 4: PAYMENTS */}
            {detailsSubTab === 'payments' && (
              <div>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Billed</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                      ₹{((supplierMetricsMap[selectedSupplierDetails.id]?.totalAmountSpent) || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Settled Payments</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      ₹{supplierPayments.filter(p => p.supplierId === selectedSupplierDetails.id).reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Txn Ref</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Payment Mode</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.filter(p => p.supplierId === selectedSupplierDetails.id).map(pay => (
                      <tr key={pay.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{pay.referenceNumber || pay.id}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-gray)' }}>{pay.paymentDate}</td>
                        <td style={{ padding: '8px 10px' }}>{pay.paymentMode}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ₹{pay.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 5: PERFORMANCE */}
            {detailsSubTab === 'performance' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: 'var(--text-dark)' }}>
                  Performance Summary & Audit Report
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Total Volume Purchased</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '4px' }}>
                      {(supplierMetricsMap[selectedSupplierDetails.id]?.totalItemsPurchased) || 0} pcs
                    </div>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Average Base Unit Cost</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                      ₹{Math.round(((supplierMetricsMap[selectedSupplierDetails.id]?.totalBaseProductCost) || 0) / Math.max(1, (supplierMetricsMap[selectedSupplierDetails.id]?.totalItemsPurchased) || 1))}
                    </div>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Delayed Shipments</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: ((supplierMetricsMap[selectedSupplierDetails.id]?.delayedDeliveriesCount) || 0) > 0 ? 'var(--accent-danger)' : 'var(--accent-emerald)', marginTop: '4px' }}>
                      {(supplierMetricsMap[selectedSupplierDetails.id]?.delayedDeliveriesCount) || 0}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(201, 162, 75, 0.1)', border: '1px solid var(--accent-gold)' }}>
                  <h5 style={{ margin: '0 0 6px 0', color: 'var(--accent-gold-dark)', fontSize: '14px', fontWeight: 700 }}>
                    💡 Antigravity Purchasing Advisory:
                  </h5>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-dark)' }}>
                    Based on internal records, {selectedSupplierDetails.name} is a high-performing vendor with an average lead time of {selectedSupplierDetails.deliveryTime}. For upcoming bulk purchases, compare effective costs with local mills to minimize freight surcharges.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
