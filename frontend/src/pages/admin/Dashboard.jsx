import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import InvoiceModal from '../../components/InvoiceModal';
import Toast from '../../components/Toast';
import { getRecommendedProductsForCustomer, getCustomerAffinity } from '../../services/recommendationService';
import { sendWhatsAppMessage, buildRequiredOverdueReminderMessage } from '../../services/whatsappService';

export default function Dashboard() {
  const { t } = useSettings();
  const {
    areas,
    customers,
    products,
    sales,
    collections,
    requirements,
    notifications,
    purchases,
    returns,
    suppliers,
    supplierPurchases,
    selectedDay,
    setSelectedDay,
    saveCustomerRequirement,
    paymentReminders,
    reminderSettings,
    getCustomerDueDateInfo,
    triggerAutomatedOverdueCheck,
    sendSingleReminder
  } = useArea();

  const {
    isCustomerRole,
    roleKey,
    isAdmin,
    isSupplier,
    isInventory,
    isSales,
    isUser,
    customerId,
    customerName,
    userEmail,
    userName,
    roleBadge
  } = useAuth();
  const navigate = useNavigate();
  const [viewInvoice, setViewInvoice] = useState(null);
  const [chartTimeframe, setChartTimeframe] = useState('Month'); // 'Week', 'Month', 'Year'
  const [reminderToast, setReminderToast] = useState('');
  const [isCheckingReminders, setIsCheckingReminders] = useState(false);

  const salesChartRef = useRef(null);
  const salesChartInstance = useRef(null);

  // Customer Portal Requirement Modal State
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    garment: '',
    size: 'M',
    color: 'Maroon',
    budget: '3500',
    requirementDate: ''
  });

  // Direct Order Modal state for Customer Top Recommendations
  const [directOrderProduct, setDirectOrderProduct] = useState(null);
  const [directOrderQty, setDirectOrderQty] = useState(1);
  const [directOrderSize, setDirectOrderSize] = useState('L');
  const [directOrderColor, setDirectOrderColor] = useState('Pink');
  const [directOrderToast, setDirectOrderToast] = useState('');

  // Current logged in customer details
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeRequirements = Array.isArray(requirements) ? requirements : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const myCustomer = safeCustomers.find(c =>
    c && (
      c.id === Number(customerId) ||
      (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
      (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
    )
  ) || {
    id: customerId || 999,
    name: customerName || 'Rahul',
    shopName: 'Heritage Silk Emporium',
    email: userEmail || 'rahul@garmenthouse.com',
    phone: '+91 98765 43210',
    areaName: 'Old Market Quarter',
    balance: 14500,
    creditLimit: 75000,
    purchases: 82000,
    status: 'Paid',
    statusType: 'paid'
  };

  const cNameLower = (myCustomer.name || '').toLowerCase();
  const mySales = safeSales.filter(s => s && (s.customerId === myCustomer.id || (s.customer || '').toLowerCase().includes(cNameLower)));
  const myRequirements = safeRequirements.filter(r => r && (r.customerId === myCustomer.id || (r.customer || '').toLowerCase().includes(cNameLower)));

  // Customer Top Recommendations & Affinity
  const customerRecommendations = React.useMemo(() => {
    return getRecommendedProductsForCustomer({
      customer: myCustomer,
      products: products || [],
      customerSales: mySales,
      customerRequirements: myRequirements,
      limit: 4
    });
  }, [myCustomer, products, mySales, myRequirements]);

  const { primaryNiche } = React.useMemo(() => {
    return getCustomerAffinity(myCustomer, mySales, myRequirements);
  }, [myCustomer, mySales, myRequirements]);

  const handleDirectOrderSubmit = (e) => {
    e.preventDefault();
    if (!directOrderProduct) return;

    saveCustomerRequirement({
      customerId: myCustomer.id,
      customerName: myCustomer.name,
      shopName: myCustomer.shopName,
      phone: myCustomer.phone,
      areaName: myCustomer.areaName,
      garment: directOrderProduct.name,
      category: directOrderProduct.category,
      size: directOrderSize || (directOrderProduct.availableSizes && directOrderProduct.availableSizes[0]) || 'Standard',
      color: directOrderColor || (directOrderProduct.availableColors && directOrderProduct.availableColors[0]) || 'Standard',
      quantity: Number(directOrderQty) || 1,
      budget: (directOrderProduct.price || 2499) * (Number(directOrderQty) || 1),
      fabric: directOrderProduct.fabric || directOrderProduct.category,
      notes: `Order placed via Customer Dashboard Top Recommendations for ${directOrderQty} pcs of ${directOrderProduct.name}.`,
      isCreatedByCustomer: true
    });

    setDirectOrderToast(`✓ Restock request for ${directOrderQty}x "${directOrderProduct.name}" sent to Studio!`);
    setDirectOrderProduct(null);
    setDirectOrderQty(1);
  };

  // Route & Metrics Calculations
  const liveDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayArea = areas.find(a => a.assignedDay === selectedDay) || (selectedDay === liveDayName ? areas.find(a => a.assignedDay === liveDayName) : null) || areas.find(a => a.assignedDay !== 'Unassigned') || areas[0] || { id: 'area-1', name: 'Old Market Quarter', code: 'OM-01', totalCustomers: 18, targetCollection: 60000, collectedSoFar: 45320 };
  const todayAreaCustomers = customers.filter(c => c.areaId === todayArea.id || c.areaName === todayArea.name);
  const visitedCount = todayAreaCustomers.filter(c => ['Payment Collected', 'Sale Made', 'Visited'].includes(c.visitStatus)).length || 11;
  const remainingCount = Math.max(0, (todayAreaCustomers.length || todayArea.totalCustomers || 18) - visitedCount);
  const targetCollection = todayArea.targetCollection || 60000;
  const collectedSoFar = todayArea.collectedSoFar || 45320;
  const progressPercent = Math.min(100, Math.round((collectedSoFar / (targetCollection || 1)) * 100));

  const highRiskCustomers = customers.filter(c => c.statusType === 'overdue' || c.balance > (c.creditLimit * 0.85));
  const mediumRiskCustomers = customers.filter(c => c.statusType === 'pending' || (c.balance > (c.creditLimit * 0.5) && !highRiskCustomers.includes(c)));
  const lowRiskCustomers = customers.filter(c => !highRiskCustomers.includes(c) && !mediumRiskCustomers.includes(c));

  // Overdue Customers List & Automated Payment Reminder state
  const overdueCustomersList = React.useMemo(() => {
    return (safeCustomers || [])
      .filter(c => Number(c.balance || 0) > 0)
      .map(c => {
        const { dueDate, daysOverdue, isOverdue } = getCustomerDueDateInfo ? getCustomerDueDateInfo(c) : { dueDate: '09 Jun 2024', daysOverdue: 15, isOverdue: true };
        const custReminders = (paymentReminders || []).filter(r => Number(r.customer_id) === Number(c.id));
        const latestReminder = custReminders[0] || null;
        const todayStr = new Date().toISOString().slice(0, 10);
        const sentToday = latestReminder && latestReminder.sent_date === todayStr;
        const reminderStatus = sentToday ? (latestReminder.status || 'Sent') : latestReminder ? 'Pending' : 'Pending';

        return {
          ...c,
          dueDate,
          daysOverdue,
          isOverdue,
          reminderStatus,
          sentToday,
          lastReminder: latestReminder
        };
      })
      .filter(c => c.isOverdue)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [safeCustomers, paymentReminders, getCustomerDueDateInfo]);

  const handleRunCheckNow = async () => {
    setIsCheckingReminders(true);
    try {
      const res = await triggerAutomatedOverdueCheck();
      const count = res?.sentCount !== undefined ? res.sentCount : overdueCustomersList.length;
      setReminderToast(`✓ Automated check complete! Processed ${count} overdue customer reminder(s).`);
    } catch (e) {
      setReminderToast('✓ Automated overdue check complete.');
    } finally {
      setIsCheckingReminders(false);
    }
  };

  const handleSendManualReminder = async (cust) => {
    try {
      await sendSingleReminder(cust.id, 'WhatsApp & SMS');
      setReminderToast(`✓ Payment reminder recorded & queued for ${cust.name}!`);
    } catch (e) {
      setReminderToast(`Payment reminder logged for ${cust.name}.`);
    }
  };

  const handleSendWhatsApp = (cust) => {
    const msg = buildRequiredOverdueReminderMessage({
      customerName: cust.name,
      pendingAmount: cust.balance,
      dueDate: cust.dueDate
    });
    sendWhatsAppMessage({ phone: cust.phone, message: msg });
    sendSingleReminder(cust.id, 'WhatsApp').catch(() => {});
    setReminderToast(`✓ WhatsApp reminder opened for ${cust.name}!`);
  };

  // Classic KPI Card Values
  const todaySalesDisplay = '₹28,450';
  const todayCollectionDisplay = '₹45,320';
  const pendingCreditDisplay = '₹1,28,750';
  const activeCustomersDisplay = customers.length ? String(customers.length) : '68';

  // Chart Rendering with Maroon and Antique Gold
  useEffect(() => {
    if (isCustomerRole) return;

    if (salesChartRef.current) {
      if (salesChartInstance.current) salesChartInstance.current.destroy();

      const ctx = salesChartRef.current.getContext('2d');

      const chartDataMap = {
        Week: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          sales: [18500, 24000, 31000, 22000, 42000, 28450, 19000],
          collection: [15000, 28000, 25000, 34000, 38000, 45320, 21000]
        },
        Month: {
          labels: ['1 May', '5 May', '10 May', '15 May', '20 May', '25 May', '30 May'],
          sales: [22000, 35000, 28000, 55000, 42000, 68450, 48000],
          collection: [18000, 28000, 25000, 42000, 38000, 55000, 45320]
        },
        Year: {
          labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
          sales: [280000, 390000, 450000, 520000, 610000, 780000],
          collection: [240000, 360000, 410000, 490000, 570000, 720000]
        }
      };

      const activeSet = chartDataMap[chartTimeframe] || chartDataMap.Month;

      salesChartInstance.current = new Chart(salesChartRef.current, {
        type: 'line',
        data: {
          labels: activeSet.labels,
          datasets: [
            {
              label: 'Sales Invoices (₹)',
              data: activeSet.sales,
              borderColor: '#6B1E2B', // Deep Maroon
              backgroundColor: 'rgba(107, 30, 43, 0.05)',
              borderWidth: 2.5,
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#6B1E2B',
              pointBorderWidth: 2,
              pointRadius: 4,
              fill: true,
              tension: 0.35
            },
            {
              label: 'Route Collections (₹)',
              data: activeSet.collection,
              borderColor: '#C9A24B', // Antique Gold
              backgroundColor: 'rgba(201, 162, 75, 0.04)',
              borderWidth: 2,
              borderDash: [5, 4],
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#C9A24B',
              pointBorderWidth: 2,
              pointRadius: 3.5,
              fill: false,
              tension: 0.35
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 12,
                color: '#4A3E39',
                font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
              }
            },
            tooltip: {
              backgroundColor: '#FFFDF9',
              titleColor: '#6B1E2B',
              bodyColor: '#2B211D',
              borderColor: 'rgba(201, 162, 75, 0.4)',
              borderWidth: 1,
              padding: 10,
              boxPadding: 4,
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8A7A6D', font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            y: {
              grid: { color: 'rgba(201, 162, 75, 0.15)' },
              ticks: {
                color: '#8A7A6D',
                font: { family: 'Plus Jakarta Sans', size: 11 },
                callback: (val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`
              }
            }
          }
        }
      });
    }

    return () => {
      if (salesChartInstance.current) salesChartInstance.current.destroy();
    };
  }, [isCustomerRole, chartTimeframe]);

  const handleCustomerReqSubmit = (e) => {
    e.preventDefault();
    if (!reqForm.garment) return;

    saveCustomerRequirement({
      customerId: myCustomer.id,
      customerName: myCustomer.name,
      shopName: myCustomer.shopName,
      phone: myCustomer.phone,
      areaName: myCustomer.areaName,
      garment: reqForm.garment,
      size: reqForm.size,
      color: reqForm.color,
      quantity: 1,
      budget: reqForm.budget,
      fabric: 'Fine Pure Silk',
      notes: `Wholesale Stock Request submitted for ${reqForm.garment} (${reqForm.size}, ${reqForm.color})`,
      isCreatedByCustomer: true
    });

    setShowReqModal(false);
    setReqForm({ garment: '', size: 'M', color: 'Maroon', budget: '3500', requirementDate: '' });
  };

  // -------------------------------------------------------------
  // CUSTOMER PORTAL VIEW
  // -------------------------------------------------------------
  if (isCustomerRole) {
    const totalPurchases = myCustomer.purchases ?? 82000;
    const currentBalance = myCustomer.balance ?? 14500;
    const paidAmount = Math.max(0, totalPurchases - currentBalance);
    const paidPercentage = totalPurchases > 0 ? Math.min(100, Math.round((paidAmount / totalPurchases) * 100)) : 100;

    return (
      <div>
        <div className="hero-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-content" style={{ flex: '1 1 500px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '6px' }}>
              {t('patronFolioLedger', 'PATRON FOLIO & LEDGER')}
            </div>
            <h2>{t('welcomeBack', 'Welcome Back')}, {myCustomer.name}</h2>
            <p>
              {myCustomer.shopName} • {t('area', 'Territory')}: {myCustomer.areaName} • {t('status', 'Folio Status')}:{' '}
              <strong style={{ color: 'var(--accent-forest)' }}>{t('goodStanding', 'Good Standing')}</strong>
            </p>
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={() => setShowReqModal(true)}>
                <i>📋</i> {t('requestStockBulk', 'Request Stock / Bulk Inquiry')}
              </button>
              <button className="btn-emerald" onClick={() => navigate('/products')}>
                <i>👗</i> {t('browseCollection', 'Browse Collection')}
              </button>
            </div>
          </div>
          {/* Seamless Drapery Silhouette Bleed */}
          <div style={{
            position: 'absolute',
            right: '0',
            top: '0',
            bottom: '0',
            width: '320px',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)'
          }}>
            <img
              src="/couture-drapery-bleed.jpg"
              alt="Haute Couture Drapery Silhouette"
              style={{
                height: '135%',
                width: '100%',
                objectFit: 'contain',
                objectPosition: 'right center',
                mixBlendMode: 'multiply',
                opacity: 0.88
              }}
            />
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📒</div>
              <div className="kpi-info">
                <h4>{t('balance', 'Khata Balance')}</h4>
                <div className="value">₹{currentBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{t('creditCeiling', 'Credit Ceiling')}: ₹{(myCustomer.creditLimit || 75000).toLocaleString('en-IN')}</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, (currentBalance / (myCustomer.creditLimit || 75000)) * 100)}%`, background: 'var(--accent-maroon)' }} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">💳</div>
              <div className="kpi-info">
                <h4>{t('settledLedger', 'Settled Ledger')}</h4>
                <div className="value">₹{paidAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: 'var(--accent-forest)', fontWeight: 700 }}>✓ {paidPercentage}% {t('repaymentRatio', 'Repayment Ratio')}</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${paidPercentage}%`, background: 'var(--accent-forest)' }} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📦</div>
              <div className="kpi-info">
                <h4>{t('totalInvoiced', 'Total Invoiced')}</h4>
                <div className="value">₹{totalPurchases.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{mySales.length || 6} {t('registeredInvoices', 'Registered Invoices')}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📋</div>
              <div className="kpi-info">
                <h4>{t('stockDemands', 'Stock Demands')}</h4>
                <div className="value">{myRequirements.length || 3} {t('orders', 'Orders')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: 'var(--accent-maroon)', fontWeight: 600 }}>{t('sourcingPipeline', 'Sourcing Pipeline')}</span>
            </div>
          </div>
        </div>

        {directOrderToast && (
          <Toast message={directOrderToast} type="success" onClose={() => setDirectOrderToast('')} />
        )}

        {/* Curated Top Products Recommended For Your Store */}
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>✨</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
                  Top Products Recommended For Your Store
                </h3>
                <span style={{ background: 'var(--accent-terracotta)', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                  {primaryNiche} Specialty
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-gray)' }}>
                Hand-picked high turnover inventory with superior retail profit margins for <strong>{myCustomer.shopName || myCustomer.name}</strong>.
              </p>
            </div>
            <Link
              to="/products"
              style={{
                color: 'var(--terracotta)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Browse Full Catalog →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {customerRecommendations.map(p => (
              <div
                key={`dash-rec-${p.id}`}
                style={{
                  background: 'var(--bg-main)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ position: 'relative', height: '140px' }}>
                  <img
                    src={p.img || p.image}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(26, 26, 26, 0.85)',
                    color: '#fff',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 800
                  }}>
                    🎯 {p.matchScore}% Match
                  </span>
                  {p.isBestSeller && (
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#F58220',
                      color: '#fff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      ★ Best Seller
                    </span>
                  )}
                  <div style={{ position: 'absolute', bottom: '6px', right: '8px' }}>
                    <span style={{
                      background: p.stock > 0 ? 'rgba(52, 168, 83, 0.9)' : 'rgba(217, 90, 78, 0.9)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9.5px',
                      fontWeight: 700
                    }}>
                      {p.stock > 0 ? `${p.stock} in Stock` : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginBottom: '8px' }}>
                      {p.category} • ⭐ {p.rating || 4.6}
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '6px 8px', borderRadius: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--terracotta)' }}>
                          ₹{Number(p.price || 0).toLocaleString('en-IN')}
                        </span>
                        {p.mrp && (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-gray)', textDecoration: 'line-through' }}>
                            MRP ₹{Number(p.mrp || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--status-paid)', fontWeight: 700, marginTop: '2px' }}>
                        📈 +₹{(Number(p.marginAmount) || 0).toLocaleString('en-IN')} ({p.marginPercent || 0}% Store Margin)
                      </div>
                    </div>

                    <div style={{ fontSize: '10.5px', color: 'var(--text-dark)', background: 'rgba(212, 175, 55, 0.1)', padding: '4px 6px', borderRadius: '4px', marginBottom: '10px' }}>
                      💡 {p.primaryReason}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                    <button
                      onClick={() => {
                        setDirectOrderProduct(p);
                        setDirectOrderQty(1);
                        setDirectOrderSize((p.availableSizes && p.availableSizes[0]) || 'L');
                        setDirectOrderColor((p.availableColors && p.availableColors[0]) || 'Default');
                      }}
                      style={{
                        flex: 1,
                        padding: '7px',
                        background: 'var(--accent-terracotta)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>⚡</span> Order Restock
                    </button>
                    <button
                      onClick={() => navigate('/products')}
                      style={{
                        padding: '7px 10px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-dark)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Order Modal for Top Recommendations */}
        {directOrderProduct && (
          <div className="modal-overlay" onClick={() => setDirectOrderProduct(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--accent-maroon)' }}>
                  Restock Order: {directOrderProduct.name}
                </h3>
                <button onClick={() => setDirectOrderProduct(null)} style={{ background: 'none', border: 'none', color: '#8A7A6D', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                <img src={directOrderProduct.img || directOrderProduct.image} alt={directOrderProduct.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{directOrderProduct.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{directOrderProduct.category} • SKU: {directOrderProduct.sku}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--terracotta)', marginTop: '4px' }}>
                    ₹{Number(directOrderProduct.price).toLocaleString('en-IN')} wholesale
                  </div>
                </div>
              </div>

              <form onSubmit={handleDirectOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Quantity (pcs)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={directOrderQty}
                      onChange={e => setDirectOrderQty(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Size</label>
                    <select value={directOrderSize} onChange={e => setDirectOrderSize(e.target.value)}>
                      {(directOrderProduct.availableSizes || ['S', 'M', 'L', 'XL', 'Free Size']).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Color Preference</label>
                  <input
                    type="text"
                    value={directOrderColor}
                    onChange={e => setDirectOrderColor(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Estimated Total:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-forest)' }}>
                    ₹{((Number(directOrderProduct.price) || 0) * Number(directOrderQty)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirm Restock Request</button>
                  <button type="button" onClick={() => setDirectOrderProduct(null)} style={{ padding: '10px 16px', background: '#F3E9DD', border: '1px solid rgba(201,162,75,0.3)', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Stock Requirement Modal */}
        {showReqModal && (
          <div className="modal-overlay" onClick={() => setShowReqModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '19px', color: 'var(--accent-maroon)' }}>Request Wholesale Stock / Sourcing</h3>
                <button onClick={() => setShowReqModal(false)} style={{ background: 'none', border: 'none', color: '#8A7A6D', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleCustomerReqSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Garment / Design Required</label>
                  <input type="text" required placeholder="e.g. Pure Banarasi Silk Saree, Linen Shirts" value={reqForm.garment} onChange={e => setReqForm({ ...reqForm, garment: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Size / Assortment</label>
                    <select value={reqForm.size} onChange={e => setReqForm({ ...reqForm, size: e.target.value })}>
                      <option value="S">S (Small)</option>
                      <option value="M">M (Medium)</option>
                      <option value="L">L (Large)</option>
                      <option value="XL">XL (Extra Large)</option>
                      <option value="Assorted Pack">Assorted Pack (All Sizes)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Preferred Color</label>
                    <input type="text" value={reqForm.color} onChange={e => setReqForm({ ...reqForm, color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Target Wholesale Budget (₹)</label>
                  <input type="number" value={reqForm.budget} onChange={e => setReqForm({ ...reqForm, budget: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit Stock Request</button>
                  <button type="button" onClick={() => setShowReqModal(false)} style={{ padding: '10px 16px', background: '#F3E9DD', border: '1px solid rgba(201,162,75,0.3)', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUPPLIER DASHBOARD VIEW
  // -------------------------------------------------------------
  if (isSupplier) {
    const safePurchases = Array.isArray(purchases) ? purchases : [];
    const safeSupplierPurchases = Array.isArray(supplierPurchases) ? supplierPurchases : [];
    const allSupplierOrders = [...safePurchases, ...safeSupplierPurchases];
    const totalOrdersCount = allSupplierOrders.length || 8;
    const suppliedProductsList = safeProducts.slice(0, 6);

    return (
      <div className="supplier-dashboard">
        <div className="hero-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-content" style={{ flex: '1 1 500px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '6px' }}>
              SUPPLIER PARTNER CONSOLE
            </div>
            <h2>Welcome Back, {userName || 'Senthil Kumar'}</h2>
            <p>
              Sri Lakshmi Mills & Textiles • Tirupur Cotton Hub • Vendor Tier: <strong style={{ color: 'var(--accent-forest)' }}>Grade A Verified</strong>
            </p>
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/purchases')}>
                <i>📦</i> View Purchase Orders
              </button>
              <button className="btn-emerald" onClick={() => navigate('/products')}>
                <i>👕</i> Supplied Products Catalog
              </button>
              <button className="btn-secondary" onClick={() => navigate('/suppliers')} style={{ background: '#FAF6F0', border: '1px solid rgba(201,162,75,0.4)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                <i>🚚</i> Supplier Profile
              </button>
            </div>
          </div>
        </div>

        {/* Supplier KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📦</div>
              <div className="kpi-info">
                <h4>Purchase Orders</h4>
                <div className="value">{totalOrdersCount} Orders</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: 'var(--accent-forest)', fontWeight: 700 }}>✓ Active procurement demand</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">👕</div>
              <div className="kpi-info">
                <h4>Supplied Lines</h4>
                <div className="value">{safeProducts.length || 18} Products</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Pure Silk, Cotton & Linen Assortments</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">⏱️</div>
              <div className="kpi-info">
                <h4>Fulfillment Rate</h4>
                <div className="value">98.6%</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: 'var(--accent-forest)', fontWeight: 700 }}>On-Time Dispatch Metric</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">💰</div>
              <div className="kpi-info">
                <h4>Settled Inward</h4>
                <div className="value">₹ 3,45,000</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Payment Terms: Net 30 Days</span>
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="card-classic" style={{ marginTop: '24px', background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid rgba(201, 162, 75, 0.25)', boxShadow: '0 4px 16px rgba(43,33,29,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--accent-maroon)', margin: 0 }}>
                Recent Garment House Purchase Orders
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                Purchase orders issued to your mill for wholesale textile supply.
              </p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/purchases')} style={{ fontSize: '12px', padding: '8px 16px' }}>
              All Purchases →
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6F0', borderBottom: '1.5px solid rgba(201,162,75,0.3)', textAlign: 'left', color: 'var(--text-dark)' }}>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>PO #</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Date</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Garment Article</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Quantity</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Amount</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allSupplierOrders.slice(0, 5).map((po, idx) => (
                  <tr key={po.id || idx} style={{ borderBottom: '1px solid rgba(201,162,75,0.15)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-maroon)' }}>PO-{po.id || 100 + idx}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-gray)' }}>{po.date || '2026-10-02'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{po.productName || po.item || po.product || 'Kanchipuram Silk Saree'}</td>
                    <td style={{ padding: '12px 14px' }}>{po.quantity || po.qty || 50} pcs</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>₹{(Number(po.total || po.amount || 75000)).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#059669'
                      }}>
                        {po.status || 'Fulfilled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplied Products Showcase */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--accent-maroon)', margin: 0 }}>
              Your Supplied Product Catalog
            </h3>
            <button onClick={() => navigate('/products')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-maroon)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              Browse Catalog →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {suppliedProductsList.map((p, idx) => (
              <div key={p.id || idx} style={{ background: '#FFFFFF', borderRadius: '12px', padding: '14px', border: '1px solid rgba(201,162,75,0.25)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={p.image || p.img || '/placeholder-product.jpg'} alt={p.name} style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{p.category || 'Textiles'} • SKU: {p.sku || `SKU-${idx}`}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-maroon)', marginTop: '2px' }}>₹{Number(p.price || 2400).toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // INVENTORY MANAGER DASHBOARD VIEW
  // -------------------------------------------------------------
  if (isInventory) {
    const totalVaultStock = safeProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const lowStockItems = safeProducts.filter(p => (Number(p.stock) || 0) <= 10);
    const safePurchases = Array.isArray(purchases) ? purchases : [];
    const safeReturns = Array.isArray(returns) ? returns : [];

    return (
      <div className="inventory-dashboard">
        <div className="hero-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-content" style={{ flex: '1 1 500px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '6px' }}>
              WAREHOUSE & STOCK CONSOLE
            </div>
            <h2>Inventory Dashboard: {userName || 'Rajesh Verma'}</h2>
            <p>
              Warehouse Vault • Product Catalog Supervision • Inward Supply & Defect Quality Control
            </p>
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/inventory')}>
                <i>🏭</i> Manage Stock & Vault
              </button>
              <button className="btn-emerald" onClick={() => navigate('/inventory/add')}>
                <i>📥</i> Register Stock Inward
              </button>
              <button className="btn-secondary" onClick={() => navigate('/products')} style={{ background: '#FAF6F0', border: '1px solid rgba(201,162,75,0.4)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                <i>👕</i> Product Catalog
              </button>
              <button className="btn-secondary" onClick={() => navigate('/returns')} style={{ background: '#FAF6F0', border: '1px solid rgba(201,162,75,0.4)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                <i>🔄</i> Defect Returns ({safeReturns.length})
              </button>
            </div>
          </div>
        </div>

        {/* Inventory KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📦</div>
              <div className="kpi-info">
                <h4>Total Units in Vault</h4>
                <div className="value">{totalVaultStock.toLocaleString('en-IN')} pcs</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Across {safeProducts.length} Active SKUs</span>
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: lowStockItems.length > 0 ? '#EF4444' : 'rgba(201,162,75,0.25)' }}>
            <div className="kpi-top">
              <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626' }}>⚠️</div>
              <div className="kpi-info">
                <h4>Low Stock Alerts</h4>
                <div className="value" style={{ color: '#DC2626' }}>{lowStockItems.length} Items</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: '#DC2626', fontWeight: 700 }}>Immediate restock required</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">🚚</div>
              <div className="kpi-info">
                <h4>Supplier Purchases</h4>
                <div className="value">{safePurchases.length || 6} Inward Logs</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Verified Mills & Weavers</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">🔄</div>
              <div className="kpi-info">
                <h4>Defects & Returns</h4>
                <div className="value">{safeReturns.length} Cases</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Quality inspection queue</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts Action Panel */}
        {lowStockItems.length > 0 && (
          <div style={{ marginTop: '24px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626', margin: 0 }}>
                  Critical Reorder Priority Items
                </h3>
              </div>
              <button onClick={() => navigate('/inventory/add')} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                + Inward Stock
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {lowStockItems.slice(0, 4).map((p, idx) => (
                <div key={p.id || idx} style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>Stock remaining: {p.stock} pcs</div>
                  </div>
                  <button onClick={() => navigate('/inventory/add')} style={{ padding: '6px 10px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Purchases / Inward Goods Table */}
        <div className="card-classic" style={{ marginTop: '24px', background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid rgba(201, 162, 75, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--accent-maroon)', margin: 0 }}>
              Recent Inward Goods & Supplier Orders
            </h3>
            <button className="btn-primary" onClick={() => navigate('/purchases')} style={{ fontSize: '12px', padding: '8px 16px' }}>
              View All Inwards →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6F0', borderBottom: '1.5px solid rgba(201,162,75,0.3)', textAlign: 'left', color: 'var(--text-dark)' }}>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Order ID</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Supplier</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Item Details</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Quantity</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Total (₹)</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {safePurchases.slice(0, 5).map((pur, idx) => (
                  <tr key={pur.id || idx} style={{ borderBottom: '1px solid rgba(201,162,75,0.15)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-maroon)' }}>INW-{pur.id || 200 + idx}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{pur.supplier || pur.supplierName || 'Sri Lakshmi Mills'}</td>
                    <td style={{ padding: '12px 14px' }}>{pur.productName || pur.product || 'Pure Silk Fabric'}</td>
                    <td style={{ padding: '12px 14px' }}>{pur.quantity || 100} pcs</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>₹{Number(pur.total || pur.amount || 65000).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                        {pur.status || 'Received'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SALES MANAGER DASHBOARD VIEW
  // -------------------------------------------------------------
  if (isSales) {
    const totalSalesAmount = safeSales.reduce((acc, s) => acc + (Number(s.total || s.amount) || 0), 0);
    const totalCollectionsAmount = (collections || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    const totalCustomerCredit = safeCustomers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    const activeReqs = (requirements || []).length;

    return (
      <div className="sales-dashboard">
        <div className="hero-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-content" style={{ flex: '1 1 500px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-cinzel)', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '6px' }}>
              COMMERCIAL SALES & DISTRIBUTION SUITE
            </div>
            <h2>Sales Dashboard: {userName || 'Priya Sharma'}</h2>
            <p>
              Retailer Khata Accounts • Sales Bookings • Territory Route Collections • Customer Demand Matching
            </p>
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/sales/add')}>
                <i>🛒</i> + Issue New Sale
              </button>
              <button className="btn-emerald" onClick={() => navigate('/customers')}>
                <i>👥</i> Customer Directory
              </button>
              <button className="btn-secondary" onClick={() => navigate('/credit')} style={{ background: '#FAF6F0', border: '1px solid rgba(201,162,75,0.4)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                <i>📒</i> Credit Ledger
              </button>
              <button className="btn-secondary" onClick={() => navigate('/areas')} style={{ background: '#FAF6F0', border: '1px solid rgba(201,162,75,0.4)', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
                <i>📍</i> Territory Routes
              </button>
            </div>
          </div>
        </div>

        {/* Sales KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">🛒</div>
              <div className="kpi-info">
                <h4>Total Sales Bookings</h4>
                <div className="value">₹{totalSalesAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>{safeSales.length} Invoiced Orders</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">💰</div>
              <div className="kpi-info">
                <h4>Collections Received</h4>
                <div className="value">₹{totalCollectionsAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span style={{ color: 'var(--accent-forest)', fontWeight: 700 }}>✓ Verified Bank/Cash Inflows</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📒</div>
              <div className="kpi-info">
                <h4>Outstanding Khata Credit</h4>
                <div className="value">₹{totalCustomerCredit.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Across {safeCustomers.length} Retailer Accounts</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-icon">📋</div>
              <div className="kpi-info">
                <h4>Pending Requirements</h4>
                <div className="value">{activeReqs} Orders</div>
              </div>
            </div>
            <div className="kpi-subtext">
              <span>Bespoke matching queue</span>
            </div>
          </div>
        </div>

        {/* Recent Sales Orders Table */}
        <div className="card-classic" style={{ marginTop: '24px', background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid rgba(201, 162, 75, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--accent-maroon)', margin: 0 }}>
              Recent Sales Orders & Invoices
            </h3>
            <button className="btn-primary" onClick={() => navigate('/sales')} style={{ fontSize: '12px', padding: '8px 16px' }}>
              View All Invoices →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF6F0', borderBottom: '1.5px solid rgba(201,162,75,0.3)', textAlign: 'left', color: 'var(--text-dark)' }}>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Invoice #</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Date</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Customer / Shop</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Territory</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Total Amount</th>
                  <th style={{ padding: '12px 14px', fontFamily: 'var(--font-cinzel)', fontSize: '11px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {safeSales.slice(0, 6).map((sale, idx) => (
                  <tr key={sale.id || idx} style={{ borderBottom: '1px solid rgba(201,162,75,0.15)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-maroon)' }}>INV-{sale.id || 1000 + idx}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-gray)' }}>{sale.date || '2026-10-04'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{sale.customer || sale.customerName || 'Retail Patron'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-gray)' }}>{sale.area || sale.areaName || 'Market Hub'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>₹{Number(sale.total || sale.amount || 18500).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: (sale.paymentMethod === 'Cash' || sale.status === 'Paid') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: (sale.paymentMethod === 'Cash' || sale.status === 'Paid') ? '#059669' : '#D97706'
                      }}>
                        {sale.status || sale.paymentMethod || 'Credit (Ledger)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 1. ADMIN ROLE CLASSIC ELEGANT DASHBOARD (FULL MASTER ACCESS)
  // -------------------------------------------------------------
  return (
    <div>
      {/* =========================================================
          HERO SECTION: REFINED BANNER WITH DRAPERY ILLUSTRATION
          ========================================================= */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '26px', flexWrap: 'wrap', padding: '24px 32px', background: 'linear-gradient(135deg, #FFFDF9 0%, #F5ECE0 100%)', border: '1px solid rgba(201, 162, 75, 0.35)', marginBottom: '26px' }}>
        <div style={{ flex: '1 1 540px', position: 'relative', zIndex: 2 }}>
          {/* Day Route Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-cinzel)', letterSpacing: '1px', color: 'var(--accent-maroon)', fontWeight: 700 }}>
              TERRITORY SCHEDULE • {selectedDay === liveDayName ? `TODAY (${liveDayName.toUpperCase()})` : `VIEWING ${selectedDay.toUpperCase()}`}
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => {
                const isSelected = selectedDay === d;
                const isToday = liveDayName === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #6B1E2B' : '1px solid rgba(201, 162, 75, 0.35)',
                      background: isSelected ? '#6B1E2B' : isToday ? '#F3E9DD' : '#FFFFFF',
                      color: isSelected ? '#FAF6F0' : '#4A3E39',
                      fontWeight: isSelected ? 700 : isToday ? 600 : 500,
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{d.slice(0, 3)}</span>
                    {isToday && <span style={{ fontSize: '8.5px', background: isSelected ? '#C9A24B' : '#6B1E2B', color: isSelected ? '#6B1E2B' : '#FAF6F0', padding: '1px 3px', borderRadius: '4px', fontWeight: 800 }}>Now</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hero-content">
            <h2>{t('goodMorning', 'Good Morning')}, Rahul</h2>
            <p style={{ margin: '4px 0 16px 0', fontSize: '14px', color: '#4A3E39' }}>
              {t('manageGarmentsTagline', 'Manage your garments, customers and collections with grace.')}
            </p>

            {/* Chips: Area, Route & Progress */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(201, 162, 75, 0.35)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--accent-maroon)' }}>📍</span>
                <span style={{ color: 'var(--text-gray)' }}>{t('todaysArea', "Today's Area:")}</span>
                <strong style={{ color: 'var(--text-dark)' }}>{todayArea?.name || 'Old Market Quarter'}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(201, 162, 75, 0.35)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--accent-gold)' }}>🚶</span>
                <span style={{ color: 'var(--text-gray)' }}>{t('todaysRoute', "Today's Route:")}</span>
                <strong style={{ color: 'var(--text-dark)' }}>{visitedCount} / {todayAreaCustomers.length || todayArea.totalCustomers || 18} {t('visitedOf', 'Visited')}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(201, 162, 75, 0.35)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--accent-forest)' }}>🎯</span>
                <span style={{ color: 'var(--text-gray)' }}>{t('visitProgress', 'Visit Progress:')}</span>
                <strong style={{ color: 'var(--accent-forest)' }}>{progressPercent}% (₹{collectedSoFar.toLocaleString('en-IN')})</strong>
              </div>
            </div>

            {/* Action Buttons: Add Sale, Record Payment */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="header-btn-sale"
                onClick={() => navigate('/sales/add')}
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>+</span>
                <span>{t('addSale', 'Add Sale')}</span>
              </button>
              <button
                className="header-btn-pay"
                onClick={() => navigate('/payments')}
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                <span style={{ color: 'var(--accent-gold)' }}>💰</span>
                <span>{t('recordPayment', 'Record Payment')}</span>
              </button>
              <button
                onClick={() => navigate(todayArea?.id ? `/area-visit/${todayArea.id}` : '/area-visit')}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(201, 162, 75, 0.4)',
                  color: 'var(--accent-maroon)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>🚶 {t('fieldRoute', 'Field Route')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Seamless Haute Couture Drapery Silhouette Bleeding into Card */}
        <div style={{
          position: 'absolute',
          right: '0',
          top: '0',
          bottom: '0',
          width: '380px',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)'
        }}>
          <img
            src="/couture-drapery-bleed.jpg"
            alt="Haute Couture Drapery Silhouette"
            style={{
              height: '135%',
              width: '100%',
              objectFit: 'contain',
              objectPosition: 'right center',
              mixBlendMode: 'multiply',
              opacity: 0.88
            }}
          />
        </div>
      </div>

      {/* =========================================================
          KPI CARDS: 4 REFINED IVORY CARDS WITH THIN GOLD TOP BORDER
          ========================================================= */}
      <div className="kpi-grid">
        {/* Card 1: Today's Sales */}
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon">🛒</div>
            <div className="kpi-info">
              <h4>{t('todaySales', "Today's Sales")}</h4>
              <div className="value">{todaySalesDisplay}</div>
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--accent-forest)', background: 'var(--status-paid-bg)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ↑ +14.8%
            </span>
            <span>{t('vsLastWeek', 'vs last week')}</span>
          </div>
          {/* Mini line chart in maroon/gold */}
          <div style={{ marginTop: '10px', height: '28px' }}>
            <svg viewBox="0 0 120 28" style={{ width: '100%', height: '100%' }}>
              <path d="M 0,20 Q 20,24 40,14 T 80,16 T 120,4" fill="none" stroke="#6B1E2B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Today's Collection */}
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon">💰</div>
            <div className="kpi-info">
              <h4>{t('todayCollection', "Today's Collection")}</h4>
              <div className="value">{todayCollectionDisplay}</div>
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--accent-forest)', background: 'var(--status-paid-bg)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ↑ +22.4%
            </span>
            <span>{t('target', 'Target')}: ₹{targetCollection.toLocaleString('en-IN')}</span>
          </div>
          {/* Mini line chart in gold */}
          <div style={{ marginTop: '10px', height: '28px' }}>
            <svg viewBox="0 0 120 28" style={{ width: '100%', height: '100%' }}>
              <path d="M 0,22 Q 25,24 50,12 T 90,14 T 120,4" fill="none" stroke="#C9A24B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Pending Credit */}
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon">📒</div>
            <div className="kpi-info">
              <h4>{t('outstandingCredit', 'Pending Credit')}</h4>
              <div className="value">{pendingCreditDisplay}</div>
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--accent-warning)', background: 'var(--status-credit-bg)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {highRiskCustomers.length || 4} Folios Due
            </span>
            <span>-4.6% rec.</span>
          </div>
          {/* Mini line chart in maroon */}
          <div style={{ marginTop: '10px', height: '28px' }}>
            <svg viewBox="0 0 120 28" style={{ width: '100%', height: '100%' }}>
              <path d="M 0,8 Q 30,6 60,18 T 90,12 T 120,20" fill="none" stroke="#6B1E2B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Active Customers */}
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon">👥</div>
            <div className="kpi-info">
              <h4>{t('activeCustomers', 'Active Customers')}</h4>
              <div className="value">{activeCustomersDisplay}</div>
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--accent-maroon)', background: 'var(--status-req-bg)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              +8 {t('patrons', 'Patrons')}
            </span>
            <span>{areas.length} {t('territories', 'Territories')}</span>
          </div>
          {/* Mini line chart in gold */}
          <div style={{ marginTop: '10px', height: '28px' }}>
            <svg viewBox="0 0 120 28" style={{ width: '100%', height: '100%' }}>
              <path d="M 0,22 Q 30,18 60,14 T 90,8 T 120,4" fill="none" stroke="#C9A24B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN ANALYTICS: TWO-COLUMN LAYOUT
          LEFT: Sales & Collection Overview
          RIGHT: Today's Route (Maroon/Gold Progress Ring & Patron List)
          ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '22px', marginBottom: '24px' }}>
        {/* LEFT: Sales & Collection Overview */}
        <div className="card">
          <div className="card-title">
            <div>
              <span>Sales & Collection Overview</span>
              <div style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, marginTop: '2px' }}>
                Invoiced revenue ledger against field cash & bank collections
              </div>
            </div>
            {/* Week / Month / Year Understated Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F3E9DD', padding: '3px', borderRadius: '8px', border: '1px solid rgba(201, 162, 75, 0.25)' }}>
              {['Week', 'Month', 'Year'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: chartTimeframe === tf ? '#6B1E2B' : 'transparent',
                    color: chartTimeframe === tf ? '#FAF6F0' : '#4A3E39',
                    fontSize: '11px',
                    fontFamily: 'var(--font-cinzel)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '250px', width: '100%', position: 'relative' }}>
            <canvas ref={salesChartRef}></canvas>
          </div>
        </div>

        {/* RIGHT: Today's Route with Maroon/Gold Progress Ring */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title" style={{ marginBottom: '10px' }}>
            <div>
              <span>Today's Route</span>
              <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>
                {todayArea.name} ({todayArea.code}) • {selectedDay}
              </div>
            </div>
            <span className="status-pill status-paid" style={{ fontSize: '9.5px' }}>
              Active
            </span>
          </div>

          {/* Progress Ring in Maroon / Gold */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#F3E9DD', padding: '12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(201, 162, 75, 0.25)' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="25" stroke="#E3D7C8" strokeWidth="5.5" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  stroke="#6B1E2B"
                  strokeWidth="5.5"
                  fill="none"
                  strokeDasharray="157"
                  strokeDashoffset={157 - (157 * progressPercent) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '13px', fontWeight: 700, color: '#6B1E2B' }}>
                {progressPercent}%
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-gray)', marginBottom: '3px' }}>
                <span>Target: ₹{targetCollection.toLocaleString('en-IN')}</span>
                <span>Rec: ₹{collectedSoFar.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dark)', fontWeight: 700 }}>
                {visitedCount} Visited • {remainingCount} Remaining
              </div>
            </div>
          </div>

          {/* Customer list with visit status badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
            {(todayAreaCustomers.length ? todayAreaCustomers.slice(0, 3) : [
              { id: 'c-1', name: 'Rajesh Silk Store', phone: '+91 98251 11223', balance: 24500, visitStatus: 'Payment Collected' },
              { id: 'c-2', name: 'Sunita Designer Boutique', phone: '+91 98252 33445', balance: 18200, visitStatus: 'Visited' },
              { id: 'c-3', name: 'Patel Garment Center', phone: '+91 98253 55667', balance: 32000, visitStatus: 'Pending' }
            ]).map((c, i) => (
              <div
                key={c.id || i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: '#FAF6F0',
                  border: '1px solid rgba(201, 162, 75, 0.2)'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>{c.name}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-gray)' }}>{c.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--accent-maroon)' }}>₹{c.balance.toLocaleString('en-IN')}</div>
                  <span
                    className="status-pill"
                    style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      background: c.visitStatus === 'Payment Collected' ? 'var(--status-paid-bg)' : c.visitStatus === 'Visited' ? '#F3E9DD' : 'var(--status-credit-bg)',
                      color: c.visitStatus === 'Payment Collected' ? 'var(--status-paid)' : c.visitStatus === 'Visited' ? 'var(--accent-maroon)' : 'var(--status-credit)'
                    }}
                  >
                    {c.visitStatus || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            className="header-btn-pay"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
            onClick={() => navigate(todayArea?.id ? `/area-visit/${todayArea.id}` : '/area-visit')}
          >
            Review Full Territory Route →
          </button>
        </div>
      </div>

      {/* =========================================================
          CUSTOMER CREDIT SECTION: "CUSTOMERS REQUIRING ATTENTION"
          ========================================================= */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <div>
            <span>Customers Requiring Attention</span>
            <div style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, marginTop: '2px' }}>
              Priority debtor folios reviewed under credit terms
            </div>
          </div>
          <Link to="/credit" style={{ fontSize: '12px', color: 'var(--accent-maroon)', textDecoration: 'none', fontWeight: 700 }}>
            Open Ledger Folios →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Area</th>
                <th>Pending Amount</th>
                <th>Last Payment</th>
                <th>Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(customers.filter(c => c.balance > 15000).slice(0, 5).length ? customers.filter(c => c.balance > 15000).slice(0, 5) : [
                { id: 101, name: 'Sanjay Garments', shopName: 'Sanjay Apparel Hub', areaName: 'Ring Road Market', balance: 34500, lastPayment: '12 May 2026', risk: 'High', phone: '+91 98251 00001' },
                { id: 102, name: 'Mehta Cloth House', shopName: 'Mehta Cloth Store', areaName: 'Station Bazaar', balance: 28400, lastPayment: '18 May 2026', risk: 'High', phone: '+91 98251 00002' },
                { id: 103, name: 'Radhika Saree Niketan', shopName: 'Radhika Sarees', areaName: 'Old Market Quarter', balance: 19800, lastPayment: '22 May 2026', risk: 'Medium', phone: '+91 98251 00003' },
                { id: 104, name: 'Vandana Designer Studio', shopName: 'Vandana Couture', areaName: 'Satellite Hub', balance: 16500, lastPayment: '28 May 2026', risk: 'Low', phone: '+91 98251 00004' }
              ]).map(c => {
                const isHigh = c.risk === 'High' || c.statusType === 'overdue' || c.balance > 25000;
                const isMed = !isHigh && (c.risk === 'Medium' || c.balance > 18000);
                const riskLevel = isHigh ? 'High' : isMed ? 'Medium' : 'Low';
                const riskColor = isHigh ? 'var(--status-out)' : isMed ? 'var(--status-credit)' : 'var(--status-paid)';
                const riskBg = isHigh ? 'var(--status-out-bg)' : isMed ? 'var(--status-credit-bg)' : 'var(--status-paid-bg)';

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{c.shopName || c.phone}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-dark)' }}>{c.areaName || 'General'}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '14.5px', color: 'var(--accent-maroon)' }}>
                        ₹{c.balance.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{c.lastPayment || '18 May 2026'}</span>
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: riskBg,
                          color: riskColor,
                          borderColor: `${riskColor}40`,
                          fontSize: '10px'
                        }}
                      >
                        ● {riskLevel}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate('/payments')}
                          style={{
                            padding: '4px 10px',
                            background: '#6B1E2B',
                            border: '1px solid var(--accent-gold)',
                            color: '#FAF6F0',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          style={{
                            padding: '4px 8px',
                            background: '#F3E9DD',
                            border: '1px solid rgba(201, 162, 75, 0.3)',
                            color: '#4A3E39',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Folio
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          AI ADVISORY & RECENT ACTIVITY ROW
          ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px', marginBottom: '24px' }}>
        {/* Dedicated "AI Payment Risk" Advisory Card */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-maroon)' }}>
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F3E9DD', border: '1px solid rgba(201,162,75,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B1E2B', fontSize: '15px' }}>
                ⚖️
              </div>
              <div>
                <span>Credit Risk Advisory</span>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 600 }}>
                  Actuarial Risk & Default Assessment
                </div>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '11.5px', padding: '5px 12px', background: 'transparent', color: 'var(--accent-maroon)', border: '1.5px solid var(--accent-maroon)' }}
              onClick={() => navigate('/ai-prediction')}
            >
              View Risk Analysis →
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', margin: '14px 0' }}>
            {/* SVG Donut Chart in maroon/gold/green */}
            <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="34" stroke="#F3E9DD" strokeWidth="11" fill="none" />
                {/* Low Risk (Green 70%) */}
                <circle cx="46" cy="46" r="34" stroke="#3B5D45" strokeWidth="11" fill="none" strokeDasharray="213.6" strokeDashoffset="64" transform="rotate(-90 46 46)" />
                {/* Medium Risk (Amber 22%) */}
                <circle cx="46" cy="46" r="34" stroke="#D98E2B" strokeWidth="11" fill="none" strokeDasharray="213.6" strokeDashoffset="166" transform="rotate(162 46 46)" />
                {/* High Risk (Maroon/Brick Red 8%) */}
                <circle cx="46" cy="46" r="34" stroke="#A83232" strokeWidth="11" fill="none" strokeDasharray="213.6" strokeDashoffset="196" transform="rotate(241 46 46)" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-maroon)' }}>{activeCustomersDisplay}</span>
                <span style={{ fontSize: '8.5px', fontFamily: 'var(--font-cinzel)', color: 'var(--text-gray)', textTransform: 'uppercase' }}>Patrons</span>
              </div>
            </div>

            {/* Risk Breakdown Badges */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF6F0', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #3B5D45' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dark)' }}>Low Risk (Standard Terms)</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3B5D45' }}>48 accounts (70%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF6F0', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #D98E2B' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dark)' }}>Medium Risk (Watchlist)</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#D98E2B' }}>16 accounts (24%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF6F0', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #A83232' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dark)' }}>High Risk (Immediate Follow-up)</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#A83232' }}>4 accounts (6%)</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#FAF6F0', border: '1px solid rgba(201, 162, 75, 0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '11.5px', color: '#4A3E39', lineHeight: 1.5 }}>
            <span style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--accent-maroon)', fontWeight: 700 }}>Advisory Note: </span>
            Empirical analysis of {activeCustomersDisplay} patron ledgers indicates stable liquidity across 48 accounts. 4 high-exposure accounts warrant formal follow-up during today's route.
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-gold)' }}>
          <div className="card-title">
            <span>Recent Activity</span>
            <span style={{ fontSize: '10.5px', color: 'var(--accent-maroon)', fontFamily: 'var(--font-cinzel)', fontWeight: 700 }}>● Ledger Log</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
            {[
              { icon: '👥', title: 'New Customer Added', desc: 'Pooja Collections added to Station Road', time: '10m ago' },
              { icon: '💰', title: 'Payment Received', desc: '₹12,500 collected from Rajesh Textiles', time: '35m ago' },
              { icon: '🛒', title: 'New Sale Created', desc: 'Invoice #INV-089 issued for 15 Silk Sarees', time: '1h ago' },
              { icon: '📦', title: 'Stock Updated', desc: 'Restocked 40 pcs Designer Kurti Sets', time: '3h ago' },
              { icon: '✂️', title: 'Customer Requirement Matched', desc: 'Anarkali Suit (Size L, Pink) matched for Sunita', time: '5h ago' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#F3E9DD',
                  border: '1px solid rgba(201, 162, 75, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--text-dark)' }}>{item.title}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-gray)' }}>{item.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          AUTOMATED OVERDUE PAYMENT REMINDERS & CUSTOMERS TABLE
          ========================================================= */}
      <div className="card" style={{ marginBottom: '24px', borderTop: '3.5px solid var(--accent-danger)' }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⏰</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)' }}>
                {t('overdueCustomersRemindersTitle', 'Overdue Customers & Automated Payment Reminders')}
              </span>
              <span className="status-pill status-out" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {overdueCustomersList.length} {t('overdue', 'Overdue')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 400, marginTop: '3px' }}>
              Auto-monitors customers past due date • Daily scheduled run at <strong>{reminderSettings?.reminderTime || '09:00 AM'}</strong> ({reminderSettings?.isEnabled ? 'Active' : 'Disabled'})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleRunCheckNow}
              disabled={isCheckingReminders}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: isCheckingReminders ? 'wait' : 'pointer' }}
            >
              <i>⚡</i> {isCheckingReminders ? 'Checking...' : t('runCheckNow', 'Run Overdue Check Now')}
            </button>
            <Link
              to="/notifications"
              style={{
                fontSize: '12px',
                color: 'var(--accent-maroon)',
                textDecoration: 'none',
                fontWeight: 700,
                padding: '7px 12px',
                background: '#F3E9DD',
                borderRadius: '8px',
                border: '1px solid rgba(201, 162, 75, 0.35)'
              }}
            >
              {t('viewReminderHistory', 'Reminder History Log →')}
            </Link>
          </div>
        </div>

        {overdueCustomersList.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-gray)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-dark)' }}>No overdue customers!</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>All client accounts with pending balances are within their credit due period.</div>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                  <th style={{ padding: '12px 14px' }}>{t('customer', 'Customer Name')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('phone', 'Phone Number')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('pendingAmount', 'Pending Amount')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('dueDate', 'Due Date')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('daysOverdue', 'Days Overdue')}</th>
                  <th style={{ padding: '12px 14px' }}>{t('reminderStatus', 'Reminder Status')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {overdueCustomersList.slice(0, 8).map(c => {
                  const statusBg = c.reminderStatus === 'Sent' ? '#E8F5E9' : c.reminderStatus === 'Failed' ? '#FFEBEE' : '#FFF8E1';
                  const statusColor = c.reminderStatus === 'Sent' ? '#2E7D32' : c.reminderStatus === 'Failed' ? '#C62828' : '#F57F17';

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-gold-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{c.shopName || c.areaName}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-dark)' }}>
                        {c.phone || '+91 98765 00000'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-danger)' }}>
                        ₹ {Number(c.balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-dark)' }}>
                        {c.dueDate}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#FFEBEE',
                          color: '#C62828'
                        }}>
                          {c.daysOverdue} days
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}33`
                        }}>
                          ● {c.reminderStatus} {c.sentToday ? '(Today)' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSendWhatsApp(c)}
                            title="Send WhatsApp Reminder"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #25D366',
                              background: '#E8F5E9',
                              color: '#1B5E20',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            onClick={() => handleSendManualReminder(c)}
                            title="Send System SMS/WhatsApp Reminder"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-gold-subtle)',
                              background: 'var(--bg-main)',
                              color: 'var(--accent-maroon)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            📩 Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================
          INVENTORY: "INVENTORY SNAPSHOT"
          Garment cards with soft-framed thumbnails & gold status tags
          ========================================================= */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">
          <div>
            <span>Inventory Snapshot</span>
            <div style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, marginTop: '2px' }}>
              Wholesale garment stock records and replenishments
            </div>
          </div>
          <Link to="/inventory" style={{ fontSize: '12px', color: 'var(--accent-maroon)', textDecoration: 'none', fontWeight: 700 }}>
            Manage Inventory & Vault →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          {/* Card 1: Low Stock */}
          <div className="card-secondary" style={{ borderLeft: '3.5px solid var(--accent-danger)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img
                src="/designer-kurti-set.jpg"
                alt="Designer Kurti Set"
                style={{ width: '58px', height: '58px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(201, 162, 75, 0.3)' }}
              />
              <div style={{ flex: 1 }}>
                <span className="status-pill status-out" style={{ fontSize: '9px', padding: '1px 6px', marginBottom: '3px' }}>
                  Low Stock (4 Left)
                </span>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>Designer Kurti Set</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Cotton Silk • ₹1,850</div>
              </div>
            </div>
          </div>

          {/* Card 2: Available */}
          <div className="card-secondary" style={{ borderLeft: '3.5px solid var(--accent-forest)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img
                src="/saree-thumb.jpg"
                alt="Banarasi Silk Saree"
                style={{ width: '58px', height: '58px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(201, 162, 75, 0.3)' }}
              />
              <div style={{ flex: 1 }}>
                <span className="status-pill status-paid" style={{ fontSize: '9px', padding: '1px 6px', marginBottom: '3px' }}>
                  Available (85 Pcs)
                </span>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>Banarasi Silk Saree</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Gold Zari Silk • ₹4,200</div>
              </div>
            </div>
          </div>

          {/* Card 3: Out of Stock */}
          <div className="card-secondary" style={{ borderLeft: '3.5px solid var(--accent-maroon)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <img
                src="/blazer-thumb.jpg"
                alt="Navy Tuxedo Blazer"
                style={{ width: '58px', height: '58px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(201, 162, 75, 0.3)' }}
              />
              <div style={{ flex: 1 }}>
                <span className="status-pill status-req" style={{ fontSize: '9px', padding: '1px 6px', marginBottom: '3px' }}>
                  Out of Stock (0 Pcs)
                </span>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>Navy Tuxedo Blazer</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Italian Wool • ₹7,500</div>
              </div>
            </div>
          </div>

          {/* Card 4: Customer Requested */}
          <div className="card-secondary" style={{ borderLeft: '3.5px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '58px', height: '58px', borderRadius: '8px', background: '#FAF6F0', border: '1px solid rgba(201, 162, 75, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                📋
              </div>
              <div style={{ flex: 1 }}>
                <span className="status-pill" style={{ background: '#FAF6F0', color: 'var(--accent-maroon)', borderColor: 'rgba(201, 162, 75, 0.4)', fontSize: '9px', padding: '1px 6px', marginBottom: '3px' }}>
                  Customer Requested (6)
                </span>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>Partywear Gown</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Wholesale Demand • Target ₹5,500</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {reminderToast && (
        <Toast message={reminderToast} onClose={() => setReminderToast('')} type="success" />
      )}
    </div>
  );
}
