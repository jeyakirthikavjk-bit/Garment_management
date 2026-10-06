import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import InvoiceModal from '../../components/InvoiceModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Sales() {
  const { t, storeSettings } = useSettings();
  const navigate = useNavigate();
  const { areas = [], customers = [], products = [], sales = [], recordFieldSale, reduceProductStock, updateSale } = useArea();
  const { isCustomerRole, customerId, customerName, userEmail } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 1);
  const [paymentMode, setPaymentMode] = useState('CREDIT'); // 'CASH' or 'CREDIT'
  const [paidAmountInput, setPaidAmountInput] = useState('0');

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const [viewInvoice, setViewInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editForm, setEditForm] = useState({ items: '', totalAmount: '', status: 'Pending', paymentType: 'Credit' });

  const myCustomer = (customers || []).find(c =>
    c.id === Number(customerId) ||
    (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
    (c.phone && userEmail && userEmail.replace(/\D/g, '').length >= 6 && c.phone.replace(/\D/g, '').includes(userEmail.replace(/\D/g, ''))) ||
    (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
  ) || {
    id: customerId || 999,
    name: customerName || (userEmail ? userEmail.split('@')[0] : 'Customer'),
    shopName: customerName ? `${customerName}'s Shop` : 'Customer Shop',
    email: userEmail || 'customer@example.com',
    phone: '+91 98765 00000',
    areaName: 'Main Market',
    balance: 0,
    creditLimit: 50000,
    purchases: 0,
    status: 'Paid',
    statusType: 'paid'
  };

  const selectedCustomer = isCustomerRole
    ? myCustomer
    : ((customers || []).find(c => c.id === Number(selectedCustomerId)) || customers[0] || {
      id: 1,
      name: 'Walk-in Customer',
      balance: 0,
      creditLimit: 25000,
      areaName: 'Navrangpura'
    });

  const [cart, setCart] = useState([
    { id: 'prod-1', name: 'Premium Cotton Shirt', price: 1299, qty: 2 },
    { id: 'prod-2', name: 'Classic Denim Jeans', price: 1899, qty: 1 }
  ]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast(`⚠️ Cannot add ${product.name} - Item is Out of Stock!`, 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast(`⚠️ Max available stock is ${product.stock} pcs!`, 'error');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
      }
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const subtotal = (cart || []).reduce((acc, item) => acc + (item.price * item.qty), 0);
  const enableGst = storeSettings?.enableGst !== false;
  const gstRate = Number(storeSettings?.gstRate) || 5;
  const gst = enableGst ? Math.round((subtotal * gstRate) / 100) : 0;
  const total = subtotal + gst;
  const actualPaidAmount = paymentMode === 'CASH' ? total : Number(paidAmountInput || 0);
  const remainingCreditBalance = Math.max(0, total - actualPaidAmount);

  // Credit Limit Projection Check
  const newProjectedBalance = (selectedCustomer?.balance || 0) + remainingCreditBalance;
  const isCreditLimitExceeded = selectedCustomer && paymentMode === 'CREDIT' && newProjectedBalance > (selectedCustomer.creditLimit || 25000);

  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    if (isCreditLimitExceeded) {
      showToast(`⚠️ Warning: Credit Limit Exceeded for ${selectedCustomer.name}!`, 'error');
    }

    // 1. Auto-reduce inventory stock
    cart.forEach(item => {
      reduceProductStock(item.id, item.qty);
    });

    const itemSummary = cart.map(i => `${i.name} x ${i.qty}`).join(', ');
    const generatedInvId = `INV-00${sales.length + 68}`;

    const newInv = {
      id: generatedInvId,
      customer: selectedCustomer.name,
      customerName: selectedCustomer.name,
      areaName: selectedCustomer.areaName,
      date: new Date().toISOString().split('T')[0],
      items: itemSummary,
      subtotal: subtotal,
      gstAmount: gst,
      totalAmount: total,
      paymentType: paymentMode === 'CASH' ? 'Cash' : 'Credit'
    };

    // 2. Record sale invoice
    recordFieldSale({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      areaId: selectedCustomer.areaId,
      items: itemSummary,
      totalAmount: total,
      paymentType: paymentMode === 'CASH' ? 'Cash' : 'Credit',
      invoiceNo: generatedInvId
    });

    showToast(`✓ Sale Completed! Invoice ${generatedInvId} generated for ${selectedCustomer.name}.`);
    setCart([]);
    setPaidAmountInput('0');
    setViewInvoice(newInv);
  };

  // Filter raw sales for logged-in customer
  const cNameLower = (myCustomer.name || '').toLowerCase();
  const rawSales = isCustomerRole
    ? sales.filter(s => s.customerId === myCustomer.id || (s.customer || '').toLowerCase().includes(cNameLower))
    : sales;

  const filteredSales = rawSales.filter(s => {
    const query = searchTerm.toLowerCase();
    return (
      (s.customer || '').toLowerCase().includes(query) ||
      (s.items || '').toLowerCase().includes(query) ||
      (s.id || '').toLowerCase().includes(query)
    );
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedSales,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredSales, 10);

  const filteredProducts = products.filter(p => {
    return selectedCategory === 'All Categories' || p.category === selectedCategory;
  });

  return (
    <div>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px' }}>
        <span>{isCustomerRole ? t('myPurchases') : t('salesStudio')}</span>
      </div>

      {/* Two-Section Sales Workspace for Seller */}
      {!isCustomerRole && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {/* LEFT: Customer & Product Selection */}
          <div className="card">
            <div className="card-title">{t('step1', '1. Customer & Product Selection')}</div>

            {/* Customer Dropdown */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>{t('selectCustomer', 'SELECT CUSTOMER ACCOUNT')}</label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                style={{ fontWeight: 600, fontSize: '14px' }}
              >
                {(customers || []).map(c => {
                  const custAreaName = (areas || []).find(a => a.id === c.areaId)?.name || c.areaName;
                  return (
                    <option key={c.id} value={c.id}>{c.name} • {t('area')}: {custAreaName} • {t('balance')}: ₹{(c.balance || 0).toLocaleString('en-IN')}</option>
                  );
                })}
              </select>

              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '8px', color: 'var(--text-gray)' }}>
                <span>{t('area')}: <strong style={{ color: 'var(--text-dark)' }}>{(areas || []).find(a => a.id === selectedCustomer?.areaId)?.name || selectedCustomer?.areaName || 'General'}</strong></span>
                <span>{t('balance')}: <strong style={{ color: 'var(--accent-terracotta)' }}>₹{(selectedCustomer?.balance || 0).toLocaleString('en-IN')}</strong></span>
                <span>{t('creditLimit')}: <strong style={{ color: 'var(--accent-indigo)' }}>₹{(selectedCustomer?.creditLimit || 25000).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Products Selector Grid */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-gray)' }}>{t('selectGarmentItems', 'SELECT GARMENT ITEMS')}</span>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}>
                  <option value="All Categories">{t('all')}</option>
                  <option value="Womenswear">Womenswear</option>
                  <option value="Menswear">Menswear</option>
                  <option value="Ethnic Wear">Ethnic Wear</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {(filteredProducts || []).map(p => (
                  <div key={p.id} style={{ padding: '10px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-dark)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', margin: '4px 0' }}>{p.category} • ₹{p.price}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: p.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{p.stock} {t('items')}</span>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={p.stock <= 0}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: p.stock > 0 ? 'var(--accent-terracotta)' : 'var(--border-light)',
                          color: p.stock > 0 ? 'white' : 'var(--text-gray)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: p.stock > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        + {t('add')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Cart & Billing Form */}
          <div className="card">
            <div className="card-title">{t('step2', '2. Order Bill & Payment')}</div>

            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '16px' }}>
              {(cart || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)', fontSize: '13px' }}>
                  {t('noItemsInCart', 'No items added yet. Click "+ Add" on any product.')}
                </div>
              ) : (
                (cart || []).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>₹{item.price} × {item.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateCartQty(item.id, item.qty - 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', cursor: 'pointer', fontWeight: 700 }}>-</button>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.id, item.qty + 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', cursor: 'pointer', fontWeight: 700 }}>+</button>
                      <span style={{ fontWeight: 700, fontSize: '13px', marginLeft: '6px', minWidth: '55px', textAlign: 'right' }}>₹{item.price * item.qty}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>{t('subtotal')}</span>
                <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>{t('gst')} ({gstRate}%)</span>
                <span style={{ fontWeight: 600 }}>₹{gst.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '6px' }}>
                <span>{t('total')}</span>
                <span style={{ color: 'var(--accent-terracotta)' }}>₹{total.toLocaleString('en-IN')}</span>
              </div>

              {/* Payment Mode Toggle */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>{t('paymentMode').toUpperCase()}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <button
                    onClick={() => setPaymentMode('CREDIT')}
                    style={{
                      padding: '9px',
                      borderRadius: '8px',
                      border: paymentMode === 'CREDIT' ? '1px solid var(--accent-terracotta)' : '1px solid var(--border-light)',
                      background: paymentMode === 'CREDIT' ? 'var(--accent-terracotta)' : 'var(--bg-card-solid)',
                      color: paymentMode === 'CREDIT' ? '#FFFFFF' : 'var(--text-dark)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    📒 {t('creditKhata')}
                  </button>
                  <button
                    onClick={() => setPaymentMode('CASH')}
                    style={{
                      padding: '9px',
                      borderRadius: '8px',
                      border: paymentMode === 'CASH' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-light)',
                      background: paymentMode === 'CASH' ? 'var(--accent-emerald)' : 'var(--bg-card-solid)',
                      color: paymentMode === 'CASH' ? '#FFFFFF' : 'var(--text-dark)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    💳 {t('cash')} / {t('statusPaid')}
                  </button>
                </div>
              </div>

              {paymentMode === 'CREDIT' && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('immediateCashPaid', 'Immediate Cash Paid (₹)')}</label>
                  <input type="number" value={paidAmountInput} onChange={e => setPaidAmountInput(e.target.value)} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px', fontWeight: 700, color: 'var(--accent-terracotta)' }}>
                    <span>{t('remaining')}:</span>
                    <span>₹{remainingCreditBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '14px' }} onClick={handleCompleteSale}>
              ✓ {t('confirm')} & {t('printInvoice')}
            </button>
          </div>
        </div>
      )}

      {/* Invoice Records Log */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t('recentInvoices')}</div>
          <input
            type="text"
            placeholder={t('searchSales')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '240px', padding: '6px 12px' }}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('invoiceNo')}</th>
              <th>{t('customer')}</th>
              <th>{t('date')}</th>
              <th>{t('items')}</th>
              <th>{t('total')}</th>
              <th>{t('paymentMode')}</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(filteredSales || []).length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-gray)' }}>
                  {t('noDataFound')}
                </td>
              </tr>
            ) : (
              (paginatedSales || []).map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-terracotta)' }}>{s.id}</td>
                  <td><strong style={{ color: 'var(--text-dark)' }}>{s.customer}</strong></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{s.date}</td>
                  <td style={{ fontSize: '12px', maxWidth: '280px' }}>{s.items}</td>
                  <td style={{ fontWeight: 800 }}>₹{(s.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span className="status-pill" style={{ background: s.paymentType === 'Cash' ? 'var(--status-paid-bg)' : 'var(--status-credit-bg)', color: s.paymentType === 'Cash' ? 'var(--status-paid)' : 'var(--status-credit)' }}>
                      {s.paymentType}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-paid">✓ {t('statusCompleted')}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => setViewInvoice(s)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--accent-terracotta-light)',
                        border: 'none',
                        color: 'var(--accent-terracotta)',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🧾</span> {t('printInvoice')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  );
}
