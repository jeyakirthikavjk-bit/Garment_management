import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import { buildPaymentReceiptWhatsAppMessage, sendWhatsAppMessage } from '../../services/whatsappService';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import WhatsAppReminderModal from '../../components/WhatsAppReminderModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function AreaVisit() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const { storeSettings, t } = useSettings();
  const {
    areas,
    customers,
    selectedDay,
    setSelectedDay,
    recordCollection,
    recordFieldSale,
    updateCustomerVisitStatus,
    deleteCustomer
  } = useArea();

  const activeArea = areaId
    ? areas.find((a) => a.id === areaId) || areas[0]
    : areas.find((a) => a.assignedDay === selectedDay) || areas[0];

  const areaCustomers = customers.filter((c) => c.areaId === activeArea.id);
  const [whatsappCustomer, setWhatsappCustomer] = useState(null);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedAreaCustomers,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(areaCustomers, 10);

  // Modals state
  const [activePaymentCustomer, setActivePaymentCustomer] = useState(null);
  const [activeSaleCustomer, setActiveSaleCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [editingStatusCustomer, setEditingStatusCustomer] = useState(null);
  const [statusForm, setStatusForm] = useState('Pending');

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'Cash',
    notes: ''
  });

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    items: '',
    totalAmount: '',
    paymentType: 'Credit'
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleOpenPaymentModal = (cust) => {
    if (!cust || (cust.balance || 0) <= 0) {
      showToast(`✓ ${cust?.name || 'Customer'} has no pending balance (₹0 due). No payment needed.`, 'success');
      return;
    }
    setActivePaymentCustomer(cust);
    setPaymentForm({
      amount: String(cust.balance),
      paymentMode: 'Cash',
      notes: ''
    });
  };

  const handleOpenSaleModal = (cust) => {
    setActiveSaleCustomer(cust);
    setSaleForm({
      items: 'Garment Stock Order',
      totalAmount: '3500',
      paymentType: 'Credit'
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!activePaymentCustomer || !paymentForm.amount) return;

    const pendingBal = activePaymentCustomer.balance || 0;
    if (pendingBal <= 0) {
      showToast(`⚠️ ${activePaymentCustomer.name} has no pending balance. Payment cannot be collected.`, 'error');
      return;
    }

    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      showToast('⚠️ Please enter a valid payment amount.', 'error');
      return;
    }

    if (amt > pendingBal) {
      showToast(`⚠️ Collected amount (₹${amt.toLocaleString('en-IN')}) cannot exceed pending balance of ₹${pendingBal.toLocaleString('en-IN')}.`, 'error');
      return;
    }

    recordCollection({
      customerId: activePaymentCustomer.id,
      amount: amt,
      paymentMode: paymentForm.paymentMode,
      notes: paymentForm.notes
    });

    showToast(`✓ ₹${amt.toLocaleString('en-IN')} collected from ${activePaymentCustomer.name}! Balance updated.`);
    setActivePaymentCustomer(null);
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (!activeSaleCustomer || !saleForm.totalAmount) return;

    recordFieldSale({
      customerId: activeSaleCustomer.id,
      customerName: activeSaleCustomer.name,
      areaId: activeArea.id,
      items: saleForm.items,
      totalAmount: saleForm.totalAmount,
      paymentType: saleForm.paymentType
    });

    showToast(`✓ New ${saleForm.paymentType} sale of ₹${Number(saleForm.totalAmount).toLocaleString('en-IN')} recorded for ${activeSaleCustomer.name}!`);
    setActiveSaleCustomer(null);
  };

  const handleOpenStatusEdit = (cust) => {
    setEditingStatusCustomer(cust);
    setStatusForm(cust.visitStatus || 'Pending');
  };

  const handleStatusSave = (e) => {
    e.preventDefault();
    if (!editingStatusCustomer) return;
    updateCustomerVisitStatus(editingStatusCustomer.id, statusForm);
    setEditingStatusCustomer(null);
    showToast(`✓ Visit status for ${editingStatusCustomer.name} updated to "${statusForm}".`);
  };

  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    showToast(`✓ Customer "${deletingCustomer.name}" removed from territory.`, 'error');
    setDeletingCustomer(null);
  };

  const visitedCount = areaCustomers.filter((c) =>
    ['Payment Collected', 'Sale Made', 'Visited'].includes(c.visitStatus)
  ).length;

  const totalOutstandingInArea = areaCustomers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingCustomer}
        title={t('removeCustomerTitle', 'Remove Customer from Route')}
        message={`${t('confirmDeleteMsg', 'Are you sure you want to remove')} ${deletingCustomer?.name} ${t('from', 'from')} ${activeArea.name}?`}
        confirmText={t('removeCustomer', 'Remove Customer')}
        cancelText={t('cancel', 'Cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCustomer(null)}
      />

      {/* Header with Day Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)' }}>
            {t('fieldSalesTitle', 'Field Sales & Installment Visit Workspace')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
            {t('fieldSalesDesc', 'Record on-the-spot collections and garment orders during field visits')}
          </div>
        </div>

        {/* Day Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
            <button
              key={d}
              onClick={() => {
                setSelectedDay(d);
                const targetArea = areas.find((a) => a.assignedDay === d);
                if (targetArea) navigate(`/area-visit/${targetArea.id}`);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeArea.assignedDay === d ? 700 : 500,
                background: activeArea.assignedDay === d ? 'var(--terracotta)' : 'transparent',
                color: activeArea.assignedDay === d ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t(d.toLowerCase(), d).slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Active Route Summary Card */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF6F1 100%)',
          borderLeft: '5px solid var(--terracotta)'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--terracotta)', letterSpacing: '0.5px' }}>
              {t('currentFieldArea', 'CURRENT FIELD AREA')} ({t((activeArea.assignedDay || '').toLowerCase(), activeArea.assignedDay).toUpperCase()})
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '2px' }}>
              📍 {activeArea.name} <span style={{ fontSize: '14px', color: 'var(--text-gray)', fontWeight: 500 }}>({activeArea.code})</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('routeProgress', 'Route Progress')}</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>
              {visitedCount} / {areaCustomers.length} {t('customersVisited', 'Customers Visited')}
            </div>
            <div style={{ height: '6px', width: '100%', background: '#E5E7EB', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${areaCustomers.length > 0 ? Math.round((visitedCount / areaCustomers.length) * 100) : 0}%`,
                  background: 'var(--icon-blue)'
                }}
              ></div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('targetVsCollected', 'Target vs Collected')}</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--icon-green)', marginTop: '2px' }}>
              ₹ {activeArea.collectedSoFar.toLocaleString('en-IN')}{' '}
              <span style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500 }}>
                / ₹ {activeArea.targetCollection.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ height: '6px', width: '100%', background: '#E5E7EB', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((activeArea.collectedSoFar / (activeArea.targetCollection || 1)) * 100))}%`,
                  background: 'var(--icon-green)'
                }}
              ></div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('areaTotalBalance', 'Area Total Balance')}</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: totalOutstandingInArea > 0 ? 'var(--icon-red)' : 'var(--status-paid)', marginTop: '2px' }}>
              ₹ {totalOutstandingInArea.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>
              {areaCustomers.filter(c => c.balance > 0).length} {t('activeDues', 'Customers with active dues')}
            </div>
          </div>
        </div>

      </div>

      {/* Customer Visits List */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            {t('customers', 'Customers')} • {activeArea.name} ({areaCustomers.length} {t('total', 'Total')})
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-generate"
              onClick={() => navigate('/customers/add')}
              style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
            >
              + {t('addCustomer', 'Add Customer to Area')}
            </button>
          </div>
        </div>

        {areaCustomers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-gray)' }}>
            {t('noDataFound', 'No customers mapped to this area yet.')}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('customer', 'Customer Details')}</th>
                <th>{t('address', 'Address')} & {t('navigation', 'Navigation')}</th>
                <th>{t('myPurchases', 'Purchases')}</th>
                <th>{t('balance', 'Pending Balance')}</th>
                <th>{t('status', 'Visit Status')}</th>
                <th>{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAreaCustomers.map((cust, idx) => (
                <tr key={cust.id}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '28px',
                        height: '28px',
                        lineHeight: '28px',
                        borderRadius: '50%',
                        background: 'var(--terracotta-light)',
                        color: 'var(--terracotta)',
                        fontWeight: 700,
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    >
                      {(startIndex || 1) + idx}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {cust.avatar ? (
                        <img src={cust.avatar} className="avatar" style={{ width: '36px', height: '36px' }} alt="Avatar" />
                      ) : (
                        <div
                          className="avatar"
                          style={{
                            width: '36px',
                            height: '36px',
                            background: 'var(--icon-purple-bg)',
                            color: 'var(--icon-purple)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          {cust.avatarInitials || cust.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{cust.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{cust.email || cust.phone}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-dark)', fontWeight: 500 }}>{cust.phone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', maxWidth: '200px', marginBottom: '4px' }}>{cust.address}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {cust.phone && (
                        <button
                          onClick={() => setWhatsappCustomer(cust)}
                          style={{
                            fontSize: '10px',
                            color: '#25D366',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background: '#DCF8C6',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          💬 WhatsApp
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={{ fontWeight: 500 }}>₹ {cust.purchases.toLocaleString('en-IN')}</td>

                  <td>
                    <div style={{ fontWeight: 700, color: cust.balance > 0 ? 'var(--icon-red)' : 'var(--status-paid)', fontSize: '14px' }}>
                      ₹ {cust.balance.toLocaleString('en-IN')}
                    </div>
                    {cust.lastCollectedAmount && (
                      <div style={{ fontSize: '11px', color: 'var(--icon-green)', fontWeight: 500 }}>
                        Recd: ₹{cust.lastCollectedAmount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </td>

                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background:
                          cust.visitStatus === 'Payment Collected'
                            ? 'var(--icon-green-bg)'
                            : cust.visitStatus === 'Sale Made'
                              ? 'var(--icon-purple-bg)'
                              : cust.visitStatus === 'Visited'
                                ? 'var(--icon-blue-bg)'
                                : 'var(--border-light)',
                        color:
                          cust.visitStatus === 'Payment Collected'
                            ? 'var(--icon-green)'
                            : cust.visitStatus === 'Sale Made'
                              ? 'var(--icon-purple)'
                              : cust.visitStatus === 'Visited'
                                ? 'var(--icon-blue)'
                                : 'var(--text-gray)'
                      }}
                    >
                      {cust.visitStatus || 'Scheduled'}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(cust.balance || 0) > 0 ? (
                        <button
                          onClick={() => handleOpenPaymentModal(cust)}
                          style={{
                            background: 'var(--icon-green-bg)',
                            color: 'var(--icon-green)',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          💰 {t('pay', 'Pay')}
                        </button>
                      ) : (
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#065F46',
                            border: '1px solid #10B981',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '10px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          ✓ {t('cleared', 'Cleared')}
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenSaleModal(cust)}
                        style={{
                          background: 'var(--terracotta-light)',
                          color: 'var(--terracotta)',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        🛒 {t('sale', 'Sale')}
                      </button>

                      <button
                        onClick={() => handleOpenStatusEdit(cust)}
                        title="Edit Status"
                        style={{
                          background: 'var(--icon-blue-bg)',
                          color: 'var(--icon-blue)',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => setDeletingCustomer(cust)}
                        title="Delete Customer"
                        style={{
                          background: 'var(--icon-red-bg)',
                          color: 'var(--icon-red)',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {areaCustomers.length > 0 && (
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
        )}
      </div>

      {/* Edit Status Modal */}
      {editingStatusCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{t('updateVisitStatus', 'Update Visit Status')}</div>
              <button onClick={() => setEditingStatusCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleStatusSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', display: 'block', marginBottom: '6px' }}>{t('selectStatusLabel', 'Select Status')}</label>
                <select
                  value={statusForm}
                  onChange={(e) => setStatusForm(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                >
                  <option value="Pending">{t('pendingVisit', 'Pending Visit')}</option>
                  <option value="Visited">{t('visitedNoPayment', 'Visited (No Payment)')}</option>
                  <option value="Payment Collected">{t('paymentCollectedStatus', 'Payment Collected')}</option>
                  <option value="Sale Made">{t('newSaleOrderMade', 'New Sale Order Made')}</option>
                  <option value="Customer Unavailable">{t('custUnavailable', 'Customer Unavailable')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>{t('saveStatus', 'Save Status')}</button>
                <button type="button" onClick={() => setEditingStatusCustomer(null)} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {activePaymentCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              margin: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  {t('recordInstallmentPayment', 'Record Installment Payment')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                  {activePaymentCustomer.name} ({activePaymentCustomer.email || activePaymentCustomer.phone})
                </div>
              </div>
              <button
                onClick={() => setActivePaymentCustomer(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{t('currentPendingBalanceCol', 'Current Pending Balance:')}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--icon-red)' }}>
                ₹ {activePaymentCustomer.balance.toLocaleString('en-IN')}
              </span>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('amtCollectedLabel', 'Amount Collected (₹) *')}
                </label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('paymentMethodLabel', 'Payment Method')}
                </label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                >
                  <option value="Cash">{t('cash', 'Cash')}</option>
                  <option value="UPI">{t('upi', 'UPI / GooglePay / PhonePe')}</option>
                  <option value="Cheque">{t('cheque', 'Bank Cheque')}</option>
                  <option value="Bank Transfer">{t('bankTransfer', 'NEFT / Bank Transfer')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('collectionNotesLabel', 'Collection Notes / Reference')}
                </label>
                <input
                  type="text"
                  placeholder={t('weeklyInstallmentPlaceholder', 'e.g. Weekly installment 2 of 4')}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', background: 'var(--accent-forest)' }}>
                  ✓ {t('confirmPayment', 'Confirm Payment')}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaymentCustomer(null)}
                  style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record New Field Sale Modal */}
      {activeSaleCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  {t('recordFieldSaleOrder', 'Record Field Sale / Garment Order')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                  {activeSaleCustomer.name} - {activeArea.name} {t('area', 'Area')}
                </div>
              </div>
              <button
                onClick={() => setActiveSaleCustomer(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('itemsGarmentDesc', 'Items / Garment Description')}
                </label>
                <textarea
                  rows="2"
                  value={saleForm.items}
                  onChange={(e) => setSaleForm({ ...saleForm, items: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                    {t('saleAmountLabel', 'Sale Amount (₹) *')}
                  </label>
                  <input
                    type="number"
                    required
                    value={saleForm.totalAmount}
                    onChange={(e) => setSaleForm({ ...saleForm, totalAmount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                    {t('paymentTermsLabel', 'Payment Terms')}
                  </label>
                  <select
                    value={saleForm.paymentType}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentType: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                  >
                    <option value="Credit">{t('addToKhataCredit', 'Add to Khata Credit')}</option>
                    <option value="Cash">{t('spotCashPaid', 'Spot Cash Paid')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                  ✓ {t('generateFieldSale', 'Generate Field Sale')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSaleCustomer(null)}
                  style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}
                >
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Message & Balance Reminder Modal */}
      {whatsappCustomer && (
        <WhatsAppReminderModal
          customer={whatsappCustomer}
          onClose={() => setWhatsappCustomer(null)}
          onSent={(c) => showToast(`✓ WhatsApp notice opened for ${c.name}!`)}
        />
      )}
    </div>
  );
}
