import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import WhatsAppReminderModal from '../../components/WhatsAppReminderModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Credit() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const { areas, customers, collections, recordPayment } = useArea();
  const { isCustomerRole, customerId, customerName, userEmail } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [reminderTarget, setReminderTarget] = useState(null);
  const [showBulkReminderModal, setShowBulkReminderModal] = useState(false);

  const myCustomer = customers.find(c => 
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

  // Quick Collect Payment Modal State
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectForm, setCollectForm] = useState({
    customerId: customers[0]?.id || 1,
    amount: 2500,
    paymentMode: 'UPI',
    notes: 'Installment payment received'
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const selectedCollectCustomer = customers.find(c => String(c.id) === String(collectForm.customerId)) || customers[0];
  const isCustZeroBalance = !selectedCollectCustomer || (selectedCollectCustomer.balance || 0) <= 0;

  const handleCollectSubmit = (e) => {
    e.preventDefault();
    if (!selectedCollectCustomer || (selectedCollectCustomer.balance || 0) <= 0) {
      showToast(`⚠️ ${selectedCollectCustomer?.name || 'Selected Customer'} has no pending credit balance (₹0 due). Payment cannot be recorded.`, 'error');
      return;
    }
    const amt = Number(collectForm.amount);
    if (!amt || amt <= 0) {
      showToast('⚠️ Please enter a valid payment amount.', 'error');
      return;
    }
    if (amt > selectedCollectCustomer.balance) {
      showToast(`⚠️ Payment amount (₹${amt.toLocaleString('en-IN')}) cannot exceed pending balance of ₹${selectedCollectCustomer.balance.toLocaleString('en-IN')}.`, 'error');
      return;
    }

    if (recordPayment && selectedCollectCustomer) {
      recordPayment({
        customerId: selectedCollectCustomer.id,
        amount: amt,
        paymentMode: collectForm.paymentMode,
        notes: collectForm.notes
      });
    }

    setShowCollectModal(false);
    showToast(`✓ Payment receipt of ₹${amt.toLocaleString('en-IN')} recorded for ${selectedCollectCustomer?.name || 'Customer'}!`);
    setCollectForm({ customerId: customers[0]?.id || 1, amount: 2500, paymentMode: 'UPI', notes: 'Installment payment received' });
  };

  const rawCustomers = isCustomerRole ? [myCustomer] : customers;
  const customersWithDues = rawCustomers.filter(c => (c.balance || 0) > 0);

  // Financial Metrics
  const totalCreditIssued = rawCustomers.reduce((acc, c) => acc + (c.purchases ?? 0), 0);
  const totalPendingBalance = rawCustomers.reduce((acc, c) => acc + (c.balance ?? 0), 0);
  const totalCollected = Math.max(0, totalCreditIssued - totalPendingBalance);
  const overdueAmount = rawCustomers.filter(c => c.statusType === 'overdue').reduce((acc, c) => acc + (c.balance ?? 0), 0);

  const filteredCustomers = rawCustomers.filter(c => {
    const query = searchTerm.toLowerCase();
    const areaName = areas.find(a => a.id === c.areaId)?.name || c.areaName || '';
    return (c.name || '').toLowerCase().includes(query) || (c.shopName || '').toLowerCase().includes(query) || areaName.toLowerCase().includes(query);
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedCustomers,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredCustomers, 10);

  return (
    <div>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span>{t('financialLedgerTitle', 'Financial Ledger & Khata Credit Control')}</span>
        {!isCustomerRole && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowBulkReminderModal(true)}
              style={{
                padding: '10px 18px',
                background: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
              }}
            >
              <span>📢</span> {t('whatsAppReminders', 'WhatsApp Reminders')} ({customersWithDues.length})
            </button>

            <button className="btn-primary" onClick={() => {
              const firstWithBal = customers.find(c => (c.balance || 0) > 0) || customers[0];
              setCollectForm({
                customerId: firstWithBal?.id || 1,
                amount: Math.min(2500, Math.max(0, firstWithBal?.balance || 0)),
                paymentMode: 'UPI',
                notes: 'Installment payment received'
              });
              setShowCollectModal(true);
            }}>
              <i>💰</i> {t('recordQuickPayment', 'Record Quick Payment')}
            </button>
          </div>
        )}
      </div>

      {/* Top Financial KPI Metrics */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>💳</div>
            <div className="kpi-info">
              <h4>{t('totalCredit', 'Total Credit Issued')}</h4>
              <div className="value">₹{totalCreditIssued.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="kpi-subtext"><span>{t('lifetimeGarmentSales', 'Lifetime Garment Sales')}</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>💰</div>
            <div className="kpi-info">
              <h4>{t('totalCollections')}</h4>
              <div className="value">₹{totalCollected.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
              {totalCreditIssued > 0 ? Math.round((totalCollected / totalCreditIssued) * 100) : 100}% {t('recoveryRate', 'Recovery Rate')}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>⏳</div>
            <div className="kpi-info">
              <h4>{t('outstandingCredit')}</h4>
              <div className="value">₹{totalPendingBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="kpi-subtext"><span>{t('activeMarketDebt', 'Active Market Debt')}</span></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>⚠️</div>
            <div className="kpi-info">
              <h4>{t('overdueKhata')}</h4>
              <div className="value">₹{overdueAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="kpi-subtext"><span style={{ color: 'var(--accent-terracotta)', fontWeight: 600 }}>{t('highFollowupPriority', 'High Follow-up Priority')}</span></div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{isCustomerRole ? t('creditPayments') : t('khataLedger')}</div>
          <input
            type="text"
            placeholder={t('searchCustomers')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '240px' }}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('customerName')}</th>
              <th>{t('area')}</th>
              <th>{t('myPurchases')}</th>
              <th>{t('creditLimit')}</th>
              <th>{t('balance')}</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map(c => {
              const totalPurchases = c.purchases ?? 0;
              const pendingBal = c.balance ?? 0;
              const paid = Math.max(0, totalPurchases - pendingBal);
              const paidPct = totalPurchases > 0 ? Math.min(100, Math.max(0, Math.round((paid / totalPurchases) * 100))) : 100;

              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{c.email || c.phone}</div>
                  </td>
                  <td><span style={{ fontWeight: 600 }}>{areas.find(a => a.id === c.areaId)?.name || c.areaName}</span></td>
                  <td style={{ fontWeight: 600 }}>₹{totalPurchases.toLocaleString('en-IN')}</td>
                  <td>₹{(c.creditLimit || 25000).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '15px', fontWeight: 800, color: pendingBal > 0 ? 'var(--accent-terracotta)' : 'var(--accent-emerald)' }}>
                    ₹{pendingBal.toLocaleString('en-IN')}
                  </td>
                  <td style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Paid: ₹{paid.toLocaleString('en-IN')} ({paidPct}%)</span>
                      <span style={{ color: pendingBal > 0 ? 'var(--accent-terracotta)' : 'var(--accent-emerald)', fontWeight: 700 }}>Pending: ₹{pendingBal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${paidPct}%`, background: 'var(--accent-emerald)' }} />
                    </div>
                  </td>
                  {!isCustomerRole && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {pendingBal > 0 ? (
                          <>
                            <button
                              onClick={() => {
                                setCollectForm({ customerId: c.id, amount: Math.min(pendingBal, 5000), paymentMode: 'UPI', notes: 'Collection payment' });
                                setShowCollectModal(true);
                              }}
                              style={{ padding: '6px 12px', background: 'var(--accent-terracotta)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                            >
                              {t('collect', 'Collect')}
                            </button>

                            <button
                              onClick={() => setReminderTarget(c)}
                              title="Send WhatsApp Balance Reminder"
                              style={{
                                padding: '6px 10px',
                                background: '#25D366',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>💬</span> {t('remind', 'Remind')}
                            </button>
                          </>
                        ) : (
                          <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.12)', color: '#065F46', border: '1px solid #10B981', borderRadius: '8px', fontWeight: 700, fontSize: '11px' }}>
                            ✓ {t('cleared', 'Cleared')}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
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

      {/* Collect Payment Modal */}
      {showCollectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div className="card-title">
              <span>{t('recordCustomerPaymentReceipt', 'Record Customer Payment Receipt')}</span>
              <button onClick={() => setShowCollectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleCollectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                {isCustZeroBalance ? (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#065F46', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    ✓ <strong>{selectedCollectCustomer?.name}</strong> has ₹0 pending balance. No payment due.
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(217, 90, 78, 0.08)', border: '1px solid var(--terracotta)', color: 'var(--text-dark)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span>{t('pendingCreditDue', 'Pending Credit Due:')}</span>
                    <strong style={{ fontSize: '14px', color: 'var(--terracotta)' }}>₹{(selectedCollectCustomer?.balance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('customerNameLabel', 'Customer Name')}</label>
                <select
                  value={collectForm.customerId}
                  onChange={e => {
                    const cId = e.target.value;
                    const cObj = customers.find(c => String(c.id) === String(cId));
                    const newAmt = cObj ? Math.min(2500, Math.max(0, cObj.balance || 0)) : 0;
                    setCollectForm({ ...collectForm, customerId: cId, amount: newAmt });
                  }}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.balance > 0 ? `Pending: ₹${c.balance.toLocaleString('en-IN')}` : '✓ ₹0 (Cleared)'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('amtCollectedLabel', 'Amount Collected (₹)')} {selectedCollectCustomer?.balance > 0 && `(Max: ₹${selectedCollectCustomer.balance.toLocaleString('en-IN')})`}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedCollectCustomer?.balance || 0}
                    disabled={isCustZeroBalance}
                    value={collectForm.amount}
                    onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })}
                    placeholder={isCustZeroBalance ? '₹0 Due' : 'Enter amount'}
                    style={{ opacity: isCustZeroBalance ? 0.6 : 1 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('paymentMethodLabel', 'Payment Mode')}</label>
                  <select disabled={isCustZeroBalance} value={collectForm.paymentMode} onChange={e => setCollectForm({ ...collectForm, paymentMode: e.target.value })}>
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Bank Transfer">Bank NEFT/RTGS</option>
                    <option value="Cheque">Cheque Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('collectionNotesLabel', 'Notes / Receipt Reference')}</label>
                <input disabled={isCustZeroBalance} type="text" value={collectForm.notes} onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isCustZeroBalance}
                  style={{ flex: 1, opacity: isCustZeroBalance ? 0.5 : 1, cursor: isCustZeroBalance ? 'not-allowed' : 'pointer' }}
                >
                  {isCustZeroBalance ? t('noPendingBalanceToCollect', 'No Pending Balance to Collect') : t('saveReceiptAndUpdate', 'Save Receipt & Update Balance')}
                </button>
                <button type="button" onClick={() => setShowCollectModal(false)} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Customer WhatsApp Reminder Modal */}
      {reminderTarget && (
        <WhatsAppReminderModal
          customer={reminderTarget}
          onClose={() => setReminderTarget(null)}
          onSent={(c) => showToast(`✓ WhatsApp reminder opened for ${c.name}!`)}
        />
      )}

      {/* Bulk WhatsApp Reminders Modal */}
      {showBulkReminderModal && (
        <WhatsAppReminderModal
          customer={customersWithDues[0] || customers[0]}
          customers={customersWithDues.length > 0 ? customersWithDues : customers}
          onClose={() => setShowBulkReminderModal(false)}
          onSent={(c) => showToast(`✓ WhatsApp reminder opened for ${c.name}!`)}
        />
      )}
    </div>
  );
}
