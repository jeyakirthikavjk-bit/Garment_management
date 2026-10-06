import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import { computeAnalyticsData, parseDate } from '../../services/analyticsService';
import Toast from '../../components/Toast';

// Disable default bounce/grow animations to keep charts completely stable and eliminate unwanted movement
Chart.defaults.animation = false;
Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', sans-serif";

// 1. Crisp Center Text Plugin for Doughnut Charts (Displays bold key metrics right in the center hole)
const doughnutCenterPlugin = {
  id: 'doughnutCenterPlugin',
  beforeDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, width, height } = chart;
    const centerConfig = chart.config.options?.plugins?.centerText;
    if (!centerConfig) return;

    ctx.save();
    const meta = chart.getDatasetMeta(0);
    const centerX = meta?.data?.[0]?.x || width / 2;
    const centerY = meta?.data?.[0]?.y || height / 2;

    // Subtitle / Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px Plus Jakarta Sans, Inter, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(centerConfig.text || '', centerX, centerY - 11);

    // Main Value
    ctx.font = '800 16px Plus Jakarta Sans, Inter, sans-serif';
    ctx.fillStyle = centerConfig.color || '#0F172A';
    ctx.fillText(centerConfig.value || '', centerX, centerY + 11);

    ctx.restore();
  }
};

// 2. High-Contrast Crisp Value Label Plugin (Renders clear pill tags for numbers on bars & lines)
const crispValueLabelPlugin = {
  id: 'crispValueLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    if (chart.config.type === 'doughnut' || chart.config.type === 'pie') return;

    const isStacked = chart.options?.scales?.x?.stacked && chart.options?.scales?.y?.stacked;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      const isLine = dataset.type === 'line' || (!dataset.type && chart.config.type === 'line');

      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        if (val === undefined || val === null || val <= 0) return;

        let displayStr = '';
        if (dataset.isCurrency || dataset.label?.includes('₹') || dataset.yAxisID === 'y') {
          if (val >= 100000) {
            displayStr = `₹${(val / 100000).toFixed(1)}L`;
          } else if (val >= 1000) {
            displayStr = `₹${(val / 1000).toFixed(1)}k`;
          } else {
            displayStr = `₹${val}`;
          }
        } else if (dataset.isPieces || dataset.label?.includes('Pcs') || dataset.label?.includes('Pieces')) {
          displayStr = `${val} pcs`;
        } else if (dataset.label?.includes('Invoices') || dataset.label?.includes('Orders') || dataset.yAxisID === 'y1') {
          displayStr = `${val} ord`;
        } else {
          displayStr = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
        }

        ctx.save();
        ctx.font = 'bold 11px Plus Jakarta Sans, Inter, sans-serif';
        const textMetrics = ctx.measureText(displayStr);
        const textWidth = textMetrics.width;
        const textHeight = 12;

        if (chart.options.indexAxis === 'y') {
          // Horizontal Bar (e.g. Area Performance)
          const x = element.x + 8;
          const y = element.y;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(x - 3, y - textHeight / 2 - 2, textWidth + 6, textHeight + 4, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#0F172A';
          ctx.fillText(displayStr, x, y);
        } else if (isLine) {
          // Line point badge
          const x = element.x;
          const y = element.y - 12;

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(x - textWidth / 2 - 4, y - textHeight / 2 - 2, textWidth + 8, textHeight + 4, 4);
          ctx.fill();
          ctx.strokeStyle = dataset.borderColor || '#800020';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#0F172A';
          ctx.fillText(displayStr, x, y);
        } else if (isStacked) {
          // Stacked vertical bar: render inside if sufficient height
          const barHeight = Math.abs(element.base - element.y);
          if (barHeight > 18) {
            const y = (element.base + element.y) / 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(displayStr, element.x, y);
          }
        } else {
          // Normal vertical bar: render crisp badge on top
          const x = element.x;
          const y = Math.max(12, element.y - 10);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(x - textWidth / 2 - 3, y - textHeight / 2 - 2, textWidth + 6, textHeight + 4, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#0F172A';
          ctx.fillText(displayStr, x, y);
        }

        ctx.restore();
      });
    });
  }
};

export default function AnalyticsDashboard() {
  const { t } = useSettings();
  const {
    areas = [],
    customers = [],
    products = [],
    sales = [],
    collections = [],
    purchases = [],
    suppliers = [],
    supplierPurchases = [],
    supplierPayments = [],
    supplierProducts = []
  } = useArea();

  // Filter States
  const [period, setPeriod] = useState('all'); // 'today', '7days', '30days', 'thisMonth', 'lastMonth', 'thisYear', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');

  // View & Tab States (Visual Chart vs Numbers Table toggles)
  const [salesTimeframe, setSalesTimeframe] = useState('monthly'); // 'daily', 'monthly'
  const [salesViewMode, setSalesViewMode] = useState('chart'); // 'chart', 'table'
  const [areaViewMode, setAreaViewMode] = useState('chart'); // 'chart', 'table'
  const [creditViewMode, setCreditViewMode] = useState('chart'); // 'chart', 'table'
  const [stockBarMode, setStockBarMode] = useState('stacked'); // 'stacked', 'grouped'
  const [supplierViewMode, setSupplierViewMode] = useState('chart'); // 'chart', 'table'
  const [financialViewMode, setFinancialViewMode] = useState('chart'); // 'chart', 'table'
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryTab, setInventoryTab] = useState('all'); // 'all', 'low-stock', 'reorder', 'slow-moving'
  const [toastMsg, setToastMsg] = useState('');

  // Chart References
  const salesRevenueChartRef = useRef(null);
  const salesRevenueChartInstance = useRef(null);

  const categoryDoughnutRef = useRef(null);
  const categoryDoughnutInstance = useRef(null);

  const paymentMethodChartRef = useRef(null);
  const paymentMethodChartInstance = useRef(null);

  const areaBarChartRef = useRef(null);
  const areaBarChartInstance = useRef(null);

  const creditTrendChartRef = useRef(null);
  const creditTrendChartInstance = useRef(null);

  const customerStatusChartRef = useRef(null);
  const customerStatusChartInstance = useRef(null);

  const stockCategoryChartRef = useRef(null);
  const stockCategoryChartInstance = useRef(null);

  const supplierVolumeChartRef = useRef(null);
  const supplierVolumeChartInstance = useRef(null);

  const financialComparisonChartRef = useRef(null);
  const financialComparisonChartInstance = useRef(null);

  // Compute Analytics Data reactively
  const analytics = useMemo(() => {
    return computeAnalyticsData({
      db: {
        areas,
        customers,
        products,
        sales,
        collections,
        purchases,
        suppliers,
        supplierPurchases,
        supplierPayments,
        supplierProducts
      },
      period,
      customStartDate,
      customEndDate,
      selectedAreaId,
      selectedCategory,
      selectedSupplierId
    });
  }, [
    areas,
    customers,
    products,
    sales,
    collections,
    purchases,
    suppliers,
    supplierPurchases,
    supplierPayments,
    supplierProducts,
    period,
    customStartDate,
    customEndDate,
    selectedAreaId,
    selectedCategory,
    selectedSupplierId
  ]);

  // Extract unique categories from products & supplier purchases
  const availableCategories = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.category) set.add(p.category); });
    supplierPurchases.forEach(sp => { if (sp.category) set.add(sp.category); });
    return Array.from(set).sort();
  }, [products, supplierPurchases]);

  // Category breakdown list with exact amounts and percentages
  const categoryBreakdownList = useMemo(() => {
    const map = analytics.sales.categorySalesMap || {};
    const total = Object.values(map).reduce((sum, v) => sum + v, 0) || 1;
    const colors = ['#800020', '#D4AF37', '#2E7D32', '#1976D2', '#E65100', '#6A1B9A'];
    return Object.entries(map).map(([category, amount], idx) => ({
      category,
      amount,
      pct: Math.round((amount / total) * 1000) / 10,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.amount - a.amount);
  }, [analytics.sales.categorySalesMap]);

  // Payment method breakdown list with exact amounts and percentages
  const paymentMethodList = useMemo(() => {
    const map = analytics.sales.paymentMethodMap || {};
    const total = Object.values(map).reduce((sum, v) => sum + v, 0) || 1;
    const colors = { Cash: '#2E7D32', Credit: '#C2185B', UPI: '#1565C0', 'Bank / Cheque': '#F57C00' };
    return Object.entries(map).map(([mode, amount]) => ({
      mode,
      amount,
      pct: Math.round((amount / total) * 1000) / 10,
      color: colors[mode] || '#5C382A'
    })).sort((a, b) => b.amount - a.amount);
  }, [analytics.sales.paymentMethodMap]);

  // Toast Helper
  const showToast = (msg) => {
    setToastMsg(msg);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setPeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedAreaId('all');
    setSelectedCategory('all');
    setSelectedSupplierId('all');
    showToast('✓ Global analytics filters reset to All Time.');
  };

  // Print / Export PDF
  const handlePrint = () => {
    showToast('✓ Preparing Analytics Dashboard for Print / PDF Export...');
    window.print();
  };

  // -------------------------------------------------------------
  // CHART RENDERING (Crisp, High-Legibility, In-Place Updates)
  // -------------------------------------------------------------
  useEffect(() => {
    // Common high-contrast tooltip settings
    const commonTooltip = {
      backgroundColor: '#0F172A',
      titleColor: '#FFFFFF',
      bodyColor: '#FFFFFF',
      titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' },
      bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
      padding: 12,
      cornerRadius: 8,
      borderColor: '#D4AF37',
      borderWidth: 1.5,
      boxPadding: 6
    };

    // 1. SALES REVENUE & VOLUME TREND CHART
    if (salesRevenueChartRef.current && salesViewMode === 'chart') {
      if (salesRevenueChartInstance.current) salesRevenueChartInstance.current.destroy();

      const isDaily = salesTimeframe === 'daily';
      const trendData = isDaily ? analytics.sales.dailyTrend : analytics.sales.monthlyTrend;
      const labels = trendData.length > 0
        ? trendData.map(d => isDaily ? d.label : d.month)
        : ['No Data'];
      const revenues = trendData.length > 0 ? trendData.map(d => d.revenue) : [0];
      const orders = trendData.length > 0 ? trendData.map(d => d.count) : [0];

      const ctx = salesRevenueChartRef.current.getContext('2d');
      salesRevenueChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'line',
              label: 'Sales Revenue (₹)',
              data: revenues,
              borderColor: '#800020', // Maroon
              backgroundColor: 'rgba(128, 0, 32, 0.12)',
              borderWidth: 3.5,
              fill: true,
              tension: 0.3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#800020',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              isCurrency: true,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: 'Invoices / Orders',
              data: orders,
              backgroundColor: 'rgba(217, 165, 38, 0.75)', // Gold
              borderColor: '#B38B1C',
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 25, right: 15, bottom: 5, left: 10 } },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 14,
                font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
                color: '#1E293B'
              }
            },
            tooltip: {
              ...commonTooltip,
              callbacks: {
                label: (context) => {
                  if (context.dataset.yAxisID === 'y') {
                    return ` Revenue: ₹${Number(context.raw).toLocaleString('en-IN')}`;
                  }
                  return ` Orders: ${context.raw} invoices`;
                }
              }
            }
          },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Sales Revenue (₹)', font: { size: 12, weight: '700' }, color: '#800020' },
              grid: { color: 'rgba(0,0,0,0.06)' },
              ticks: {
                font: { size: 11, weight: '600' },
                color: '#475569',
                callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
              }
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Orders Count', font: { size: 12, weight: '700' }, color: '#B38B1C' },
              grid: { drawOnChartArea: false },
              ticks: { precision: 0, font: { size: 11, weight: '600' }, color: '#475569' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, weight: '700' }, color: '#1E293B' }
            }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    // 2. CATEGORY BREAKDOWN DOUGHNUT
    if (categoryDoughnutRef.current) {
      if (categoryDoughnutInstance.current) categoryDoughnutInstance.current.destroy();

      const catLabels = categoryBreakdownList.map(c => c.category);
      const catValues = categoryBreakdownList.map(c => c.amount);
      const catColors = categoryBreakdownList.map(c => c.color);

      const ctx = categoryDoughnutRef.current.getContext('2d');
      categoryDoughnutInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: catLabels.length > 0 ? catLabels : ['No Sales'],
          datasets: [{
            data: catValues.length > 0 ? catValues : [1],
            backgroundColor: catColors,
            borderWidth: 3,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }, // Rendered as rich side table for maximum clarity
            centerText: {
              text: 'Total Revenue',
              value: analytics.kpi.totalSalesRevenue >= 100000
                ? `₹${(analytics.kpi.totalSalesRevenue / 100000).toFixed(1)}L`
                : `₹${analytics.kpi.totalSalesRevenue.toLocaleString('en-IN')}`,
              color: '#800020'
            },
            tooltip: {
              ...commonTooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          cutout: '68%'
        },
        plugins: [doughnutCenterPlugin]
      });
    }

    // 3. PAYMENT METHOD BREAKDOWN
    if (paymentMethodChartRef.current) {
      if (paymentMethodChartInstance.current) paymentMethodChartInstance.current.destroy();

      const payLabels = paymentMethodList.map(p => p.mode);
      const payValues = paymentMethodList.map(p => p.amount);
      const payColors = paymentMethodList.map(p => p.color);

      const ctx = paymentMethodChartRef.current.getContext('2d');
      paymentMethodChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: payLabels,
          datasets: [{
            data: payValues,
            backgroundColor: payColors,
            borderWidth: 3,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }, // Rendered as rich side table
            centerText: {
              text: 'Total Paid',
              value: analytics.kpi.totalAmountCollected >= 100000
                ? `₹${(analytics.kpi.totalAmountCollected / 100000).toFixed(1)}L`
                : `₹${analytics.kpi.totalAmountCollected.toLocaleString('en-IN')}`,
              color: '#2E7D32'
            },
            tooltip: {
              ...commonTooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          cutout: '66%'
        },
        plugins: [doughnutCenterPlugin]
      });
    }

    // 4. SALES BY AREA HORIZONTAL BAR
    if (areaBarChartRef.current && areaViewMode === 'chart') {
      if (areaBarChartInstance.current) areaBarChartInstance.current.destroy();

      const areaList = analytics.areas.areaPerformanceList;
      const areaLabels = areaList.map(a => a.name);
      const areaRevenues = areaList.map(a => a.revenue);
      const areaCollected = areaList.map(a => a.collected);

      const ctx = areaBarChartRef.current.getContext('2d');
      areaBarChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: areaLabels.length > 0 ? areaLabels : ['No Areas'],
          datasets: [
            {
              label: 'Sales Revenue (₹)',
              data: areaRevenues,
              backgroundColor: '#800020',
              borderRadius: 6,
              barPercentage: 0.7,
              isCurrency: true
            },
            {
              label: 'Amount Collected (₹)',
              data: areaCollected,
              backgroundColor: '#D4AF37',
              borderRadius: 6,
              barPercentage: 0.7,
              isCurrency: true
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 15, right: 65, bottom: 5, left: 10 } },
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, font: { size: 12, weight: '700' }, color: '#1E293B' }
            },
            tooltip: {
              ...commonTooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              ticks: {
                callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`,
                font: { size: 11, weight: '600' }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 12, weight: '700' }, color: '#1E293B' }
            }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    // 5. CREDIT EXTENDED VS COLLECTIONS DUAL-LINE CHART
    if (creditTrendChartRef.current && creditViewMode === 'chart') {
      if (creditTrendChartInstance.current) creditTrendChartInstance.current.destroy();

      const daily = analytics.sales.dailyTrend;
      const labels = daily.map(d => d.label);
      const salesVals = daily.map(d => d.revenue);
      const collectionsVals = daily.map(d => d.collections || 0);

      const ctx = creditTrendChartRef.current.getContext('2d');
      creditTrendChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.length > 0 ? labels : ['No Data'],
          datasets: [
            {
              label: 'Daily Sales Extended (₹)',
              data: salesVals,
              borderColor: '#C2185B',
              backgroundColor: 'rgba(194, 24, 91, 0.1)',
              fill: true,
              borderWidth: 3,
              tension: 0.3,
              pointRadius: 4.5,
              pointBackgroundColor: '#C2185B',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 1.5,
              isCurrency: true
            },
            {
              label: 'Khata Collections Received (₹)',
              data: collectionsVals,
              borderColor: '#16A34A',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              fill: true,
              borderWidth: 3,
              tension: 0.3,
              pointRadius: 4.5,
              pointBackgroundColor: '#16A34A',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 1.5,
              isCurrency: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 25, right: 15, bottom: 5, left: 10 } },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12, weight: '700' } } },
            tooltip: { ...commonTooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}` } }
          },
          scales: {
            y: {
              ticks: {
                callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`,
                font: { size: 11, weight: '600' }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, weight: '600' } }
            }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    // 6. CUSTOMER PAYMENT STATUS DISTRIBUTION
    if (customerStatusChartRef.current) {
      if (customerStatusChartInstance.current) customerStatusChartInstance.current.destroy();

      const dist = analytics.credit.customerStatusDistribution;
      const ctx = customerStatusChartRef.current.getContext('2d');
      customerStatusChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Paid / Zero Due', 'Due Normal', 'Overdue Dues', 'Partially Paid'],
          datasets: [{
            data: [dist.Paid, dist.Due, dist.Overdue, dist['Partially Paid']],
            backgroundColor: ['#16A34A', '#F57C00', '#D32F2F', '#0288D1'],
            borderWidth: 3,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }, // Rendered as clear summary chips
            centerText: {
              text: 'Total Retailers',
              value: `${analytics.kpi.totalCustomers} Cust`,
              color: '#0F172A'
            },
            tooltip: {
              ...commonTooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} customers`
              }
            }
          },
          cutout: '66%'
        },
        plugins: [doughnutCenterPlugin]
      });
    }

    // 7. STOCK DISTRIBUTION BY CATEGORY & GODOWN (Supports Stacked and Grouped Side-by-Side views)
    if (stockCategoryChartRef.current) {
      if (stockCategoryChartInstance.current) stockCategoryChartInstance.current.destroy();

      const catGodownMap = {};
      products.forEach(p => {
        const cat = p.category || 'Other';
        if (!catGodownMap[cat]) catGodownMap[cat] = { g1: 0, g2: 0 };
        catGodownMap[cat].g1 += Number(p.godown1) || Number(p.stock) || 0;
        catGodownMap[cat].g2 += Number(p.godown2) || 0;
      });

      const catLabels = Object.keys(catGodownMap);
      const g1Data = catLabels.map(c => catGodownMap[c].g1);
      const g2Data = catLabels.map(c => catGodownMap[c].g2);
      const isStacked = stockBarMode === 'stacked';

      const ctx = stockCategoryChartRef.current.getContext('2d');
      stockCategoryChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: [
            {
              label: 'Main Godown 1 (Pcs)',
              data: g1Data,
              backgroundColor: '#800020',
              borderRadius: isStacked ? 0 : 5,
              isPieces: true
            },
            {
              label: 'Annex Godown 2 (Pcs)',
              data: g2Data,
              backgroundColor: '#D4AF37',
              borderRadius: 5,
              isPieces: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 25, right: 15, bottom: 5, left: 10 } },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12, weight: '700' } } },
            tooltip: { ...commonTooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} pcs` } }
          },
          scales: {
            x: { stacked: isStacked, grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } },
            y: { stacked: isStacked, grid: { color: 'rgba(0,0,0,0.06)' }, title: { display: true, text: 'Quantity (Pieces)', font: { size: 12, weight: '700' } } }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    // 8. SUPPLIER PURCHASE VOLUME DISTRIBUTION
    if (supplierVolumeChartRef.current && supplierViewMode === 'chart') {
      if (supplierVolumeChartInstance.current) supplierVolumeChartInstance.current.destroy();

      const supList = analytics.suppliers.supplierPerformanceList.slice(0, 6);
      const ctx = supplierVolumeChartRef.current.getContext('2d');
      supplierVolumeChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: supList.map(s => s.supplierName.split(' ')[0] + ' ' + (s.supplierName.split(' ')[1] || '')),
          datasets: [
            {
              label: 'Total Purchases (₹)',
              data: supList.map(s => s.totalPurchases),
              backgroundColor: '#5C382A',
              borderRadius: 6,
              isCurrency: true
            },
            {
              label: 'Pending Payable (₹)',
              data: supList.map(s => s.pendingAmount),
              backgroundColor: '#C2185B',
              borderRadius: 6,
              isCurrency: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 25, right: 15, bottom: 5, left: 10 } },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12, weight: '700' } } },
            tooltip: { ...commonTooltip, callbacks: { label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } }
          },
          scales: {
            y: {
              ticks: {
                callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`,
                font: { size: 11, weight: '600' }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: { grid: { display: false }, ticks: { font: { size: 11, weight: '700' } } }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    // 9. FINANCIAL COMPARISON: REVENUE VS PURCHASES VS GROSS PROFIT
    if (financialComparisonChartRef.current && financialViewMode === 'chart') {
      if (financialComparisonChartInstance.current) financialComparisonChartInstance.current.destroy();

      const monthly = analytics.sales.monthlyTrend;
      const ctx = financialComparisonChartRef.current.getContext('2d');
      financialComparisonChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthly.map(m => m.month),
          datasets: [
            {
              label: 'Sales Revenue (₹)',
              data: monthly.map(m => m.revenue),
              backgroundColor: '#800020',
              borderRadius: 6,
              isCurrency: true
            },
            {
              label: 'Estimated COGS (₹)',
              data: monthly.map(m => m.cogs !== undefined ? m.cogs : Math.round(m.revenue * 0.58)),
              backgroundColor: '#A0522D',
              borderRadius: 6,
              isCurrency: true
            },
            {
              label: 'Gross Profit (₹)',
              data: monthly.map(m => m.grossProfit !== undefined ? m.grossProfit : Math.round(m.revenue * 0.42)),
              backgroundColor: '#16A34A',
              borderRadius: 6,
              isCurrency: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 25, right: 15, bottom: 5, left: 10 } },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 14, font: { size: 12, weight: '700' } } },
            tooltip: { ...commonTooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}` } }
          },
          scales: {
            y: {
              ticks: {
                callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`,
                font: { size: 11, weight: '600' }
              },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: { grid: { display: false }, ticks: { font: { size: 12, weight: '700' } } }
          }
        },
        plugins: [crispValueLabelPlugin]
      });
    }

    return () => {
      if (salesRevenueChartInstance.current) salesRevenueChartInstance.current.destroy();
      if (categoryDoughnutInstance.current) categoryDoughnutInstance.current.destroy();
      if (paymentMethodChartInstance.current) paymentMethodChartInstance.current.destroy();
      if (areaBarChartInstance.current) areaBarChartInstance.current.destroy();
      if (creditTrendChartInstance.current) creditTrendChartInstance.current.destroy();
      if (customerStatusChartInstance.current) customerStatusChartInstance.current.destroy();
      if (stockCategoryChartInstance.current) stockCategoryChartInstance.current.destroy();
      if (supplierVolumeChartInstance.current) supplierVolumeChartInstance.current.destroy();
      if (financialComparisonChartInstance.current) financialComparisonChartInstance.current.destroy();
    };
  }, [analytics, salesTimeframe, salesViewMode, areaViewMode, creditViewMode, stockBarMode, supplierViewMode, financialViewMode, products, categoryBreakdownList, paymentMethodList]);

  // Filtered inventory products list for the table
  const filteredInventoryTable = useMemo(() => {
    return products.filter(p => {
      const q = inventorySearch.toLowerCase();
      const matchSearch = (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (inventoryTab === 'low-stock') return (Number(p.stock) <= 5 && Number(p.stock) > 0) || p.statusType === 'low-stock';
      if (inventoryTab === 'reorder') return Number(p.stock) <= 10;
      if (inventoryTab === 'slow-moving') {
        const perf = analytics.sales.bestSellingProducts.find(b => b.name === p.name);
        return !perf || perf.unitsSold <= 2;
      }
      return true;
    });
  }, [products, inventorySearch, inventoryTab, analytics.sales.bestSellingProducts]);

  const activeTrendData = salesTimeframe === 'daily' ? analytics.sales.dailyTrend : analytics.sales.monthlyTrend;

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '40px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      {/* TOP HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📊</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
              {t('analyticsDashboard', 'Garment Analytics & Business Intelligence')}
            </h1>
            <span style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px' }}>
              ● Live Database Connected
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-gray)' }}>
            Real-time sales velocity, inventory health, Khata credit recovery, and multi-supplier price analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid var(--border-gold-subtle)',
              color: 'var(--text-dark)',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>🖨️</span> {t('printReport', 'Export / Print PDF')}
          </button>
          <button
            onClick={() => showToast('✓ Live data refreshed from database.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-maroon)',
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(128, 0, 32, 0.25)'
            }}
          >
            <span>🔄</span> {t('refresh', 'Refresh Data')}
          </button>
        </div>
      </div>

      {/* GLOBAL INTERACTIVE FILTERS BAR */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', border: '1px solid var(--border-gold-subtle)', background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF8 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
            <span>⚡</span> Global Business Filters
          </div>
          {(period !== 'all' || selectedAreaId !== 'all' || selectedCategory !== 'all' || selectedSupplierId !== 'all') && (
            <button
              onClick={handleResetFilters}
              style={{ background: 'none', border: 'none', color: 'var(--accent-maroon)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Timeframe Presets */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              Time Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="all">All Time Records</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Previous Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {period === 'custom' && (
            <>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px' }}
                />
              </div>
            </>
          )}

          {/* Area Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              Territory Area
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="all">All Ahmedabad Areas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.assignedDay})</option>
              ))}
            </select>
          </div>

          {/* Garment Category Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              Garment Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="all">All Apparel Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
              Supplier / Mill
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="all">All Ready-made Suppliers</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.shopName} ({sup.city || 'Gujarat'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE KPI OVERVIEW CARDS (9 CARDS GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* 1. Total Sales */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #800020' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Total Sales Revenue</span>
            <span style={{ background: 'rgba(128, 0, 32, 0.08)', color: '#800020', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>🛒</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.totalSalesRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            {analytics.kpi.salesRevenueGrowthPct !== null ? (
              <span style={{ color: analytics.kpi.salesRevenueGrowthPct >= 0 ? '#2E7D32' : '#D32F2F', fontWeight: 700 }}>
                {analytics.kpi.salesRevenueGrowthPct >= 0 ? `▲ +${analytics.kpi.salesRevenueGrowthPct}%` : `▼ ${analytics.kpi.salesRevenueGrowthPct}%`}
              </span>
            ) : null}
            <span>{analytics.sales.filteredSalesCount} invoices recorded</span>
          </div>
        </div>

        {/* 2. Total Purchases */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #5C382A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Total Garment Purchases</span>
            <span style={{ background: 'rgba(92, 56, 42, 0.08)', color: '#5C382A', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>📦</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.totalPurchasesCost.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span>Wholesale ready-made garments</span>
          </div>
        </div>

        {/* 3. Total Amount Collected */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #2E7D32' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Total Amount Collected</span>
            <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>💵</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2E7D32', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.totalAmountCollected.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span>Cash spot sales + UPI / Khata collections</span>
          </div>
        </div>

        {/* 4. Total Outstanding Customer Dues */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #C2185B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Customer Credit Receivables</span>
            <span style={{ background: 'rgba(194, 24, 91, 0.08)', color: '#C2185B', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>📒</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#C2185B', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.totalOutstandingCustomerDues.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span style={{ fontWeight: 600, color: '#C2185B' }}>Recovery Rate: {analytics.kpi.creditRecoveryRate}%</span>
          </div>
        </div>

        {/* 5. Estimated Gross Profit */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #D4AF37' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Estimated Gross Profit</span>
            <span style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#B38B1C', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>📈</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.estimatedGrossProfit.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span style={{ background: '#FFF8E1', color: '#B38B1C', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              {analytics.kpi.grossProfitMarginPct}% Margin
            </span>
            <span>(Sales - COGS)</span>
          </div>
        </div>

        {/* 6. Total Customers */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #1976D2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Total Retail Customers</span>
            <span style={{ background: 'rgba(25, 118, 210, 0.08)', color: '#1976D2', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>👥</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            {analytics.kpi.totalCustomers}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span style={{ color: '#2E7D32', fontWeight: 600 }}>{analytics.credit.onTimeCount} on-time</span>
            <span>•</span>
            <span style={{ color: '#D32F2F', fontWeight: 600 }}>{analytics.credit.delayedCount} delayed/due</span>
          </div>
        </div>

        {/* 7. Total Garments in Stock */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #00796B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Garments in Stock</span>
            <span style={{ background: 'rgba(0, 121, 107, 0.08)', color: '#00796B', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>👗</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            {analytics.kpi.totalGarmentsInStock} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-gray)' }}>pcs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span>Retail Value: ₹{analytics.kpi.stockRetailValue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 8. Low-Stock & Out-of-Stock */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #E65100' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Stock Alerts</span>
            <span style={{ background: '#FFF3E0', color: '#E65100', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#E65100', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            {analytics.kpi.lowStockCount} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-gray)' }}>low stock</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#D32F2F', fontWeight: 600 }}>
            <span>{analytics.kpi.outOfStockCount} items completely out of stock</span>
          </div>
        </div>

        {/* 9. Supplier Payables */}
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #455A64' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-gray)' }}>Supplier Payables</span>
            <span style={{ background: 'rgba(69, 90, 100, 0.08)', color: '#455A64', padding: '4px 8px', borderRadius: '6px', fontSize: '16px' }}>🚚</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'var(--font-serif)' }}>
            ₹{analytics.kpi.totalSupplierPayables.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-gray)' }}>
            <span>Pending dues across {suppliers.length} suppliers</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: SALES ANALYTICS & TRENDS WITH CLARITY VIEW TOGGLES */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
              Sales Revenue & Product Demand Trends
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
              Interactive timeline of garment volume, order values, category breakdown, and payment methods.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* View Mode Switcher: Chart vs Numbers Table */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', padding: '2px' }}>
              <button
                onClick={() => setSalesViewMode('chart')}
                style={{
                  background: salesViewMode === 'chart' ? 'var(--accent-maroon)' : 'none',
                  color: salesViewMode === 'chart' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📊 Visual Chart
              </button>
              <button
                onClick={() => setSalesViewMode('table')}
                style={{
                  background: salesViewMode === 'table' ? 'var(--accent-maroon)' : 'none',
                  color: salesViewMode === 'table' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📋 Numbers Table
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', padding: '2px' }}>
              <button
                onClick={() => setSalesTimeframe('daily')}
                style={{
                  background: salesTimeframe === 'daily' ? '#2A2521' : 'none',
                  color: salesTimeframe === 'daily' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Daily
              </button>
              <button
                onClick={() => setSalesTimeframe('monthly')}
                style={{
                  background: salesTimeframe === 'monthly' ? '#2A2521' : 'none',
                  color: salesTimeframe === 'monthly' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '20px', marginBottom: '20px' }}>
          {/* Main Revenue Trend Chart Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Sales Revenue & Invoices Trend ({salesTimeframe.toUpperCase()})
              </h4>
              {/* Summary Stats Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: '#FFF3E0', color: '#E65100', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  Total: ₹{analytics.kpi.totalSalesRevenue.toLocaleString('en-IN')}
                </span>
                <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  {analytics.sales.filteredSalesCount} Invoices
                </span>
              </div>
            </div>

            {salesViewMode === 'chart' ? (
              <div style={{ height: '340px', position: 'relative' }}>
                <canvas ref={salesRevenueChartRef} />
              </div>
            ) : (
              <div style={{ height: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Period</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Invoices</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sales Revenue</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg / Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrendData.map(d => (
                      <tr key={d.date || d.month} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{salesTimeframe === 'daily' ? d.label : d.month}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{d.count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-maroon)' }}>
                          ₹{d.revenue.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-gray)' }}>
                          ₹{Math.round(d.revenue / (d.count || 1)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {activeTrendData.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)' }}>
                          No sales recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Category Share: Side-by-Side Doughnut & Explicit Breakdown Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Sales by Garment Category
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>
                {categoryBreakdownList.length} Categories
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 1fr) 1.2fr', gap: '20px', alignItems: 'center' }}>
              {/* Doughnut Canvas */}
              <div style={{ height: '240px', position: 'relative' }}>
                <canvas ref={categoryDoughnutRef} />
              </div>

              {/* High-Clarity Table Breakdown with Exact Values and % */}
              <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {categoryBreakdownList.map(item => (
                      <tr key={item.category} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '8px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{item.category}</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div style={{ width: '100%', height: '4px', background: '#F0F0F0', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
                          </div>
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent-maroon)' }}>₹{item.amount.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 600 }}>{item.pct}% share</div>
                        </td>
                      </tr>
                    ))}
                    {categoryBreakdownList.length === 0 && (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-gray)' }}>
                          No categories sold.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Area Sales & Payment Method Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Area Sales Bar Card with Toggle */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Sales Revenue vs Collections by Area
              </h4>
              <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setAreaViewMode('chart')}
                  style={{
                    background: areaViewMode === 'chart' ? 'var(--accent-maroon)' : 'none',
                    color: areaViewMode === 'chart' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Chart
                </button>
                <button
                  onClick={() => setAreaViewMode('table')}
                  style={{
                    background: areaViewMode === 'table' ? 'var(--accent-maroon)' : 'none',
                    color: areaViewMode === 'table' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Table
                </button>
              </div>
            </div>

            {areaViewMode === 'chart' ? (
              <div style={{ height: '330px', position: 'relative' }}>
                <canvas ref={areaBarChartRef} />
              </div>
            ) : (
              <div style={{ height: '330px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Area Territory</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sales Revenue</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Collected</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.areas.areaPerformanceList.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{a.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-maroon)' }}>
                          ₹{a.revenue.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#2E7D32' }}>
                          ₹{a.collected.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: a.collectionEfficiency >= 75 ? '#E8F5E9' : '#FFF3E0',
                            color: a.collectionEfficiency >= 75 ? '#2E7D32' : '#E65100'
                          }}>
                            {a.collectionEfficiency}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Method Side-by-Side Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 12px' }}>
              Sales by Payment Method
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1fr) 1.2fr', gap: '18px', alignItems: 'center' }}>
              <div style={{ height: '220px', position: 'relative' }}>
                <canvas ref={paymentMethodChartRef} />
              </div>

              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {paymentMethodList.map(item => (
                      <tr key={item.mode} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '8px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{item.mode}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: '#F0F0F0', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
                          </div>
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800 }}>₹{item.amount.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 600 }}>{item.pct}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Best Selling Products Leaderboard */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
              🏆 Best-Selling Garment Products (Revenue & Volume Leaderboard)
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Top {analytics.sales.bestSellingProducts.length} Items</span>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Rank</th>
                  <th style={{ padding: '10px 14px' }}>Product Name</th>
                  <th style={{ padding: '10px 14px' }}>Category</th>
                  <th style={{ padding: '10px 14px' }}>SKU Code</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Units Sold</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Revenue</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Gross Profit</th>
                </tr>
              </thead>
              <tbody>
                {analytics.sales.bestSellingProducts.map((p, idx) => (
                  <tr key={p.name} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: idx === 0 ? '#D4AF37' : 'var(--text-dark)' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-gray)', fontFamily: 'monospace' }}>{p.sku}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>{p.unitsSold} pcs</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-maroon)' }}>
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#2E7D32' }}>
                      ₹{p.profit.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {analytics.sales.bestSellingProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)' }}>
                      No sales recorded in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: CUSTOMER CREDIT & KHATA PAYMENT RECOVERY ANALYTICS */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Customer Credit & Khata Ledger Recovery Analytics
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
            Installment payment compliance, credit limit exposure, recovery efficiency, and overdue debtor ranking.
          </p>
        </div>

        {/* Credit Recovery Rate Gauge Card */}
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
              Overall Khata Credit Recovery Efficiency
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: analytics.credit.recoveryRate >= 70 ? '#2E7D32' : '#C2185B' }}>
              {analytics.credit.recoveryRate}% Recovered
            </span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#ECEFF1', borderRadius: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, analytics.credit.recoveryRate)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #D4AF37 0%, #2E7D32 100%)',
                borderRadius: '10px',
                transition: 'width 0.8s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-gray)' }}>
            <span>Total Collected: <strong>₹{analytics.kpi.totalAmountCollected.toLocaleString('en-IN')}</strong></span>
            <span>Total Pending Khata Balance: <strong style={{ color: '#C2185B' }}>₹{analytics.kpi.totalOutstandingCustomerDues.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Credit Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                  Daily Sales Extended vs Khata Collections (₹)
                </h4>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#C2185B', fontWeight: 700 }}>● Sales Extended (Credit)</span>
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>● Khata Collections Received</span>
                </div>
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setCreditViewMode('chart')}
                  style={{
                    background: creditViewMode === 'chart' ? 'var(--accent-maroon)' : 'none',
                    color: creditViewMode === 'chart' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Chart
                </button>
                <button
                  onClick={() => setCreditViewMode('table')}
                  style={{
                    background: creditViewMode === 'table' ? 'var(--accent-maroon)' : 'none',
                    color: creditViewMode === 'table' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Table
                </button>
              </div>
            </div>

            {creditViewMode === 'chart' ? (
              <div style={{ height: '300px', position: 'relative' }}>
                <canvas ref={creditTrendChartRef} />
              </div>
            ) : (
              <div style={{ height: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sales Extended</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Khata Collected</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Net Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.sales.dailyTrend.map(d => {
                      const net = d.revenue - (d.collections || 0);
                      return (
                        <tr key={d.date} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{d.label}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#C2185B' }}>
                            ₹{d.revenue.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16A34A' }}>
                            ₹{(d.collections || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: net >= 0 ? '#C2185B' : '#16A34A' }}>
                            {net >= 0 ? `+₹${net.toLocaleString('en-IN')}` : `-₹${Math.abs(net).toLocaleString('en-IN')}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 14px' }}>
              Customer Payment Status
            </h4>
            <div style={{ height: '210px', position: 'relative', marginBottom: '14px' }}>
              <canvas ref={customerStatusChartRef} />
            </div>
            {/* Status Breakdown Badges with Percentages */}
            {(() => {
              const dist = analytics.credit.customerStatusDistribution;
              const totalCust = analytics.kpi.totalCustomers || 1;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ background: '#E8F5E9', padding: '6px 8px', borderRadius: '6px', color: '#16A34A', fontWeight: 700 }}>
                    Paid: {dist.Paid} ({Math.round((dist.Paid / totalCust) * 100)}%)
                  </div>
                  <div style={{ background: '#FFF3E0', padding: '6px 8px', borderRadius: '6px', color: '#F57C00', fontWeight: 700 }}>
                    Due: {dist.Due} ({Math.round((dist.Due / totalCust) * 100)}%)
                  </div>
                  <div style={{ background: '#FFEBEE', padding: '6px 8px', borderRadius: '6px', color: '#D32F2F', fontWeight: 700 }}>
                    Overdue: {dist.Overdue} ({Math.round((dist.Overdue / totalCust) * 100)}%)
                  </div>
                  <div style={{ background: '#E1F5FE', padding: '6px 8px', borderRadius: '6px', color: '#0288D1', fontWeight: 700 }}>
                    Partial: {dist['Partially Paid']} ({Math.round((dist['Partially Paid'] / totalCust) * 100)}%)
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Top Debtors Table */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 14px' }}>
            ⚠️ Customers with Highest Outstanding Dues (Debtors Ledger)
          </h4>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Customer / Shop</th>
                  <th style={{ padding: '10px 14px' }}>Territory Area</th>
                  <th style={{ padding: '10px 14px' }}>Phone Contact</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Pending Balance</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Credit Limit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Utilization</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {analytics.credit.topDebtors.map(debtor => (
                  <tr key={debtor.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{debtor.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{debtor.shopName}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{debtor.areaName}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{debtor.phone}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#C2185B' }}>
                      ₹{debtor.balance.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-gray)' }}>
                      ₹{debtor.creditLimit.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: debtor.creditUtilizationPct > 80 ? '#FFEBEE' : '#FFF3E0',
                        color: debtor.creditUtilizationPct > 80 ? '#C2185B' : '#E65100'
                      }}>
                        {debtor.creditUtilizationPct}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span className={`badge badge-${debtor.statusType}`}>
                        {debtor.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <a
                        href={`https://wa.me/${debtor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Dear ${debtor.name}, polite reminder from Garment House regarding your pending Khata credit balance of ₹${debtor.balance.toLocaleString('en-IN')}. Please settle via UPI or during our route visit.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#25D366',
                          color: '#FFFFFF',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: INVENTORY HEALTH & VALUATION ANALYTICS */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Inventory Health, Valuation & Restocking Analytics
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
            Stock asset investment valuation, turnover ratio, warehouse godown distribution, and replenishment forecasting.
          </p>
        </div>

        {/* Valuation Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>Total Inventory Asset (Retail)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
              ₹{analytics.inventory.stockRetailValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>Selling price valuation</div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>Wholesale Cost Investment</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#5C382A', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
              ₹{analytics.inventory.stockCostValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>Cost of goods in hand</div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>Unrealized Stock Profit</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2E7D32', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
              ₹{analytics.inventory.unrealizedProfit.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>Projected gross profit on liquidation</div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>Inventory Turnover Ratio</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-maroon)', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
              {analytics.inventory.inventoryTurnover}x
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>COGS / Inventory cost value</div>
          </div>
        </div>

        {/* Stock Distribution by Category & Warehouse */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                  Stock by Category & Warehouse Location (Pieces)
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#800020', fontWeight: 700 }}>● Godown 1: {analytics.kpi.totalGodown1Stock} pcs</span>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>● Godown 2: {analytics.kpi.totalGodown2Stock} pcs</span>
                </div>
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setStockBarMode('stacked')}
                  style={{
                    background: stockBarMode === 'stacked' ? 'var(--accent-maroon)' : 'none',
                    color: stockBarMode === 'stacked' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Stacked
                </button>
                <button
                  onClick={() => setStockBarMode('grouped')}
                  style={{
                    background: stockBarMode === 'grouped' ? 'var(--accent-maroon)' : 'none',
                    color: stockBarMode === 'grouped' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Side-by-Side
                </button>
              </div>
            </div>
            <div style={{ height: '300px', position: 'relative' }}>
              <canvas ref={stockCategoryChartRef} />
            </div>
          </div>

          {/* Restocking Recommendations Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                🚨 Critical Restocking Recommendations
              </h4>
              <span className="badge" style={{ background: '#FFEBEE', color: '#C2185B', fontWeight: 700 }}>
                {analytics.inventory.restockingSuggestions.length} Needs Restock
              </span>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                    <th style={{ padding: '8px' }}>Garment</th>
                    <th style={{ padding: '8px' }}>Stock</th>
                    <th style={{ padding: '8px' }}>Suggested PO</th>
                    <th style={{ padding: '8px' }}>Preferred Mill</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.inventory.restockingSuggestions.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{item.name}</td>
                      <td style={{ padding: '8px', color: item.stock === 0 ? '#D32F2F' : '#E65100', fontWeight: 800 }}>
                        {item.stock} pcs
                      </td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>+{item.recommendedReorder} pcs (₹{item.estTotalCost.toLocaleString('en-IN')})</td>
                      <td style={{ padding: '8px', color: 'var(--text-gray)' }}>{item.preferredSupplier}</td>
                    </tr>
                  ))}
                  {analytics.inventory.restockingSuggestions.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#2E7D32' }}>
                        ✓ All stock levels are currently healthy!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detailed Product Stock Table */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
              Garment Products Stock & Valuation Master Table
            </h4>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search products, category, SKU..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '12px', minWidth: '220px' }}
              />
              <select
                value={inventoryTab}
                onChange={(e) => setInventoryTab(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', fontSize: '12px' }}
              >
                <option value="all">All Items ({products.length})</option>
                <option value="low-stock">Low Stock (≤ 5 pcs)</option>
                <option value="reorder">Reorder Priority</option>
                <option value="slow-moving">Slow Moving Items</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Product Name</th>
                  <th style={{ padding: '10px 14px' }}>Category</th>
                  <th style={{ padding: '10px 14px' }}>SKU</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stock Qty</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Selling Price</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Stock Value</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventoryTable.slice(0, 10).map(p => {
                  const val = (Number(p.stock) || 0) * (Number(p.price) || 0);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}>{p.category}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-gray)' }}>{p.sku}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>
                        {p.stock} pcs
                        <div style={{ fontSize: '10px', color: 'var(--text-gray)', fontWeight: 400 }}>G1: {p.godown1 || p.stock} | G2: {p.godown2 || 0}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>₹{Number(p.price).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-maroon)' }}>
                        ₹{val.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`badge badge-${p.statusType || (p.stock <= 5 ? 'low-stock' : 'in-stock')}`}>
                          {p.status || (p.stock <= 5 ? 'Low Stock' : 'In Stock')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5: SUPPLIER ANALYTICS & OBJECTIVE PRICE COMPARISON */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Supplier Performance & Comparative Pricing Analytics
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
            Wholesale garment purchase volumes, pending payables, on-time delivery rates, and supplier pricing comparisons.
          </p>
        </div>

        {/* Supplier Purchases Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                  Supplier Purchase Volumes & Payables (₹)
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#5C382A', fontWeight: 700 }}>● Purchases: ₹{analytics.kpi.totalPurchasesCost.toLocaleString('en-IN')}</span>
                  <span style={{ color: '#C2185B', fontWeight: 700 }}>● Payables: ₹{analytics.kpi.totalSupplierPayables.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setSupplierViewMode('chart')}
                  style={{
                    background: supplierViewMode === 'chart' ? 'var(--accent-maroon)' : 'none',
                    color: supplierViewMode === 'chart' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Chart
                </button>
                <button
                  onClick={() => setSupplierViewMode('table')}
                  style={{
                    background: supplierViewMode === 'table' ? 'var(--accent-maroon)' : 'none',
                    color: supplierViewMode === 'table' ? '#FFFFFF' : 'var(--text-dark)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Table
                </button>
              </div>
            </div>

            {supplierViewMode === 'chart' ? (
              <div style={{ height: '300px', position: 'relative' }}>
                <canvas ref={supplierVolumeChartRef} />
              </div>
            ) : (
              <div style={{ height: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Supplier / Mill</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Purchases</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pending Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.suppliers.supplierPerformanceList.map(sup => (
                      <tr key={sup.supplierId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{sup.supplierName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#5C382A' }}>
                          ₹{sup.totalPurchases.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#C2185B' }}>
                          ₹{sup.pendingAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Delivery & Terms Summary */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 14px' }}>
              Supplier Delivery Performance & Quality Metrics
            </h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                    <th style={{ padding: '8px' }}>Supplier / Mill</th>
                    <th style={{ padding: '8px' }}>Rating</th>
                    <th style={{ padding: '8px' }}>Avg Lead</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total PO Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.suppliers.supplierPerformanceList.map(sup => (
                    <tr key={sup.supplierId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{sup.supplierName}</td>
                      <td style={{ padding: '10px 8px', color: '#D4AF37', fontWeight: 800 }}>★ {sup.rating}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{sup.deliveryTimeDays} days</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--text-dark)' }}>
                        ₹{sup.totalPurchases.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Objective Multi-Supplier Price Comparison Matrix */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px' }}>
            🔍 Supplier Garment Price & Terms Comparison Matrix
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '16px' }}>
            Direct comparison of base prices, delivery charges, discounts, effective net unit costs, and lead times across competing wholesale partners for identical garment lines.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {analytics.suppliers.supplierProductComparison.map(item => (
              <div key={item.garment} style={{ border: '1px solid var(--border-gold-subtle)', borderRadius: '10px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-dark)' }}>{item.garment}</div>
                  <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '11px', fontWeight: 700 }}>{item.category}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.comparison.map(comp => (
                    <div key={comp.supplier} style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{comp.supplier}</span>
                        <span style={{ fontWeight: 800, color: 'var(--accent-maroon)', fontSize: '13px' }}>
                          ₹{comp.netEffectivePrice} <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-gray)' }}>net unit</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-gray)', fontSize: '11px' }}>
                        <span>Base: ₹{comp.basePrice} | Discount: ₹{comp.avgDiscount}</span>
                        <span>Delivery: ₹{comp.deliveryFee} | Lead: {comp.leadDays}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 6: PROFIT & FINANCIAL BREAKDOWN */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Financial Breakdown & Profitability Analysis
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
            Distinguishing Sales Revenue, Cost of Goods Sold (COGS), Gross Profit, Khata Cashflow, and Net Asset Value.
          </p>
        </div>

        {/* Financial Comparison Chart with Clear Badges & View Toggle */}
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Monthly Revenue vs COGS vs Gross Profit Comparison (₹)
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span style={{ background: 'rgba(128, 0, 32, 0.1)', color: '#800020', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  Revenue: ₹{analytics.kpi.totalSalesRevenue.toLocaleString('en-IN')}
                </span>
                <span style={{ background: '#FFF3E0', color: '#A0522D', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  COGS: ₹{analytics.kpi.calculatedCogs.toLocaleString('en-IN')}
                </span>
                <span style={{ background: '#E8F5E9', color: '#16A34A', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  Gross Profit: ₹{analytics.kpi.estimatedGrossProfit.toLocaleString('en-IN')} ({analytics.kpi.grossProfitMarginPct}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setFinancialViewMode('chart')}
                style={{
                  background: financialViewMode === 'chart' ? 'var(--accent-maroon)' : 'none',
                  color: financialViewMode === 'chart' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Chart
              </button>
              <button
                onClick={() => setFinancialViewMode('table')}
                style={{
                  background: financialViewMode === 'table' ? 'var(--accent-maroon)' : 'none',
                  color: financialViewMode === 'table' ? '#FFFFFF' : 'var(--text-dark)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                P&L Table
              </button>
            </div>
          </div>

          {financialViewMode === 'chart' ? (
            <div style={{ height: '340px', position: 'relative' }}>
              <canvas ref={financialComparisonChartRef} />
            </div>
          ) : (
            <div style={{ height: '340px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Month</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sales Revenue</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Estimated COGS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Profit</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.sales.monthlyTrend.map(m => (
                    <tr key={m.month} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{m.month}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#800020' }}>
                        ₹{m.revenue.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#A0522D' }}>
                        ₹{(m.cogs !== undefined ? m.cogs : Math.round(m.revenue * 0.58)).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#16A34A' }}>
                        ₹{(m.grossProfit !== undefined ? m.grossProfit : Math.round(m.revenue * 0.42)).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ background: '#E8F5E9', color: '#16A34A', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>
                          {m.marginPct || 42}% Margin
                        </span>
                      </td>
                    </tr>
                  ))}
                  {analytics.sales.monthlyTrend.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)' }}>
                        No financial records found for the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Territory Area Profitability Matrix */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 14px' }}>
            Territory Area Profitability & Route Collection Efficiency
          </h4>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Area Territory</th>
                  <th style={{ padding: '10px 14px' }}>Route Day</th>
                  <th style={{ padding: '10px 14px' }}>Assigned Agent</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Customers</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Sales Revenue</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount Collected</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Outstanding Dues</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Target Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {analytics.areas.areaPerformanceList.map(area => (
                  <tr key={area.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: area.color, marginRight: '8px' }} />
                      {area.name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{area.assignedDay}</td>
                    <td style={{ padding: '12px 14px' }}>{area.agentName}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>{area.customersCount}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-maroon)' }}>
                      ₹{area.revenue.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#2E7D32' }}>
                      ₹{area.collected.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#C2185B' }}>
                      ₹{area.pendingBalance.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: area.collectionEfficiency >= 75 ? '#E8F5E9' : '#FFF3E0',
                        color: area.collectionEfficiency >= 75 ? '#2E7D32' : '#E65100'
                      }}>
                        {area.collectionEfficiency}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
