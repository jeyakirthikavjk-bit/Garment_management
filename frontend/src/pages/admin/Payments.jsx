import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { buildPaymentReceiptWhatsAppMessage, sendWhatsAppMessage } from '../../services/whatsappService';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import SupplierPaymentsView from '../../components/supplier/SupplierPaymentsView';

export default function Payments() {
  const navigate = useNavigate();
  const { areas, customers, collections, recordCollection, updateCollection, deleteCollection } = useArea();
  const { isCustomerRole, isSupplier, customerId, customerName, userEmail } = useAuth();
  const { storeSettings, t } = useSettings();

  if (isSupplier) {
    return <SupplierPaymentsView />;
  }

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

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
    phone: '+91 98765 43210',
    areaName: 'Main Market',
    balance: 0,
    creditLimit: 50000
  };

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || 1,
    amount: '2500',
    paymentMode: 'UPI',
    notes: 'Installment payment received'
  });

  const [editingPayment, setEditingPayment] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', paymentMode: 'UPI', notes: '' });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const selectedCust = customers.find(c => String(c.id) === String(formData.customerId)) || customers[0];
  const isCustZeroBalance = !selectedCust || (selectedCust.balance || 0) <= 0;

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const targetCust = customers.find(c => String(c.id) === String(formData.customerId)) || customers[0];
    if (!targetCust || (targetCust.balance || 0) <= 0) {
      showToast(`⚠️ Customer ${targetCust?.name || 'Selected'} has no pending balance (₹0 due). Payment cannot be recorded.`, 'error');
      return;
    }
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      showToast('⚠️ Please enter a valid payment amount.', 'error');
      return;
    }
    if (amt > targetCust.balance) {
      showToast(`⚠️ Payment amount (₹${amt.toLocaleString('en-IN')}) cannot exceed pending balance of ₹${targetCust.balance.toLocaleString('en-IN')}.`, 'error');
      return;
    }

    recordCollection({
      customerId: targetCust.id,
      amount: amt,
      paymentMode: formData.paymentMode,
      notes: formData.notes
    });

    setShowModal(false);
    showToast(`✓ Payment of ₹${amt.toLocaleString('en-IN')} logged for ${targetCust.name}!`);
    setFormData({ customerId: customers[0]?.id || 1, amount: '2500', paymentMode: 'UPI', notes: 'Installment payment received' });
  };

  const handleSendWhatsAppReceipt = (item) => {
    const targetCust = customers.find(c => c.id === item.customerId || c.name === item.customerName);
    const msg = buildPaymentReceiptWhatsAppMessage({
      receiptId: item.id,
      customerName: item.customerName,
      amount: item.amount,
      paymentMode: item.paymentMode,
      remainingBalance: targetCust ? targetCust.balance : 0,
      date: item.date,
      notes: item.notes,
      storeSettings
    });

    sendWhatsAppMessage({
      phone: item.phone || targetCust?.phone || '',
      message: msg
    });
    showToast(`✓ WhatsApp payment receipt opened for ${item.customerName}!`);
  };

  const handleOpenEdit = (p) => {
    setEditingPayment(p);
    setEditForm({
      amount: p.amount || 2500,
      paymentMode: p.paymentMode || 'UPI',
      notes: p.notes || ''
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingPayment) return;

    if (updateCollection) {
      updateCollection(editingPayment.id, editForm);
    }
    setEditingPayment(null);
    showToast(`✓ Receipt ${editingPayment.id} updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingPayment) return;
    if (deleteCollection) {
      deleteCollection(deletingPayment.id);
    }
    showToast(`✓ Receipt ${deletingPayment.id} deleted.`, 'error');
    setDeletingPayment(null);
  };

  // Filter raw collection logs
  const cNameLower = (myCustomer.name || '').toLowerCase();
  const rawCollections = isCustomerRole
    ? collections.filter(c => c.customerId === myCustomer.id || (c.customerName || '').toLowerCase().includes(cNameLower))
    : collections;

  const filteredCollections = rawCollections.filter(item => {
    const query = searchTerm.toLowerCase();
    const resolvedAreaName = areas.find(a => a.id === item.areaId)?.name || item.areaName || '';
    const matchesSearch =
      (item.customerName || '').toLowerCase().includes(query) ||
      (item.id || '').toLowerCase().includes(query) ||
      resolvedAreaName.toLowerCase().includes(query) ||
      (item.notes || '').toLowerCase().includes(query);

    const matchesMode = selectedMode === 'ALL' || (item.paymentMode || '').toUpperCase().includes(selectedMode.toUpperCase());

    return matchesSearch && matchesMode;
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedCollections,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredCollections, 10);

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingPayment}
        title={t('deletePaymentReceipt', 'Delete Payment Receipt')}
        message={`Are you sure you want to delete payment receipt #${deletingPayment?.id} for ₹${(deletingPayment?.amount || 0).toLocaleString('en-IN')} (${deletingPayment?.customerName})? This cannot be undone.`}
        confirmText={t('deleteReceiptBtn', 'Delete Receipt')}
        confirmType="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPayment(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)' }}>
        <span>{isCustomerRole ? t('paymentReceipts') : t('pagePaymentsTitle')}</span>
        {!isCustomerRole && (
          <button onClick={() => {
            const firstWithBalance = customers.find(c => (c.balance || 0) > 0) || customers[0];
            setFormData({
              customerId: firstWithBalance?.id || 1,
              amount: String(Math.min(2500, Math.max(0, firstWithBalance?.balance || 0))),
              paymentMode: 'UPI',
              notes: 'Installment payment received'
            });
            setShowModal(true);
          }} className="btn-generate" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
            <i>💰</i> {t('recordPayment')}
          </button>
        )}
      </div>

      {/* Top Summary Bar */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>💳</div>
            <div className="kpi-info">
              <h4>{isCustomerRole ? t('paid', 'Total Amount Paid') : t('totalCollections')}</h4>
              <div className="value">₹{rawCollections.reduce((acc, c) => acc + (Number(c.amount) || 0), 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🧾</div>
            <div className="kpi-info">
              <h4>{t('paymentReceipts')}</h4>
              <div className="value">{rawCollections.length} {t('statusCompleted')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>⚡</div>
            <div className="kpi-info">
              <h4>{t('digitalRatio', 'Digital Payment Ratio')}</h4>
              <div className="value">
                {rawCollections.length > 0
                  ? `${Math.round((rawCollections.filter(c => (c.paymentMode || '').toUpperCase().includes('UPI') || (c.paymentMode || '').toUpperCase().includes('BANK')).length / rawCollections.length) * 100)}%`
                  : '100%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Form Modal / Card */}
      {showModal && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--terracotta)' }}>
          <div className="card-title">{t('recordCustomerPaymentReceipt', 'Record Customer Payment Receipt')}</div>
          <form onSubmit={handleRecordPayment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              {isCustZeroBalance ? (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#065F46', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span>
                  <span><strong>{selectedCust?.name}</strong> {t('noPendingBalanceToCollect', 'has no pending balance (₹0 Due). No payment is required.')}</span>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(217, 90, 78, 0.08)', border: '1px solid var(--terracotta)', color: 'var(--text-dark)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('currentPendingBalanceCol', 'Current Outstanding Khata Due:')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--terracotta)' }}>₹{(selectedCust?.balance || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>{t('customerName', 'Select Customer')}</label>
              <select
                value={formData.customerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  const target = customers.find(c => String(c.id) === String(newId));
                  const newAmt = target ? String(Math.min(2500, Math.max(0, target.balance || 0))) : '0';
                  setFormData({ ...formData, customerId: newId, amount: newAmt });
                }}
                style={{ width: '100%' }}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} • {c.balance > 0 ? `${t('statusPending', 'Pending')}: ₹${c.balance.toLocaleString('en-IN')}` : `✓ ₹0 (${t('cleared', 'Cleared')})`}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                {t('amountPaidLabel', 'Amount Paid (₹)')} {selectedCust?.balance > 0 && `(Max: ₹${selectedCust.balance.toLocaleString('en-IN')})`}
              </label>
              <input 
                type="number" 
                required 
                min="1"
                max={selectedCust?.balance || 0}
                disabled={isCustZeroBalance}
                value={formData.amount} 
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                placeholder={isCustZeroBalance ? '₹0 Due' : t('enterAmount', 'Enter amount')}
                style={{ width: '100%', opacity: isCustZeroBalance ? 0.6 : 1 }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>{t('paymentMode', 'Payment Mode')}</label>
              <select disabled={isCustZeroBalance} value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} style={{ width: '100%' }}>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cash">{t('cash', 'Cash Handover')}</option>
                <option value="Bank Transfer">{t('bankTransfer', 'Bank Transfer / NEFT')}</option>
                <option value="Cheque">{t('cheque', 'Cheque Deposit')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>{t('receiptNotes', 'Receipt Notes')}</label>
              <input disabled={isCustZeroBalance} type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn-primary" disabled={isCustZeroBalance} style={{ flex: 1, padding: '12px', opacity: isCustZeroBalance ? 0.5 : 1, cursor: isCustZeroBalance ? 'not-allowed' : 'pointer' }}>
                {isCustZeroBalance ? t('noPendingBalanceToCollect', 'No Pending Balance to Pay') : t('saveReceiptAndUpdate', 'Save Receipt & Update Balance')}
              </button>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dark)' }}>{t('cancelBtn', 'Cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t('paymentTransactionLog', 'Payment Transaction Log')} ({filteredCollections.length})</div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="ALL">{t('allPaymentModes', 'All Payment Modes')}</option>
              <option value="UPI">UPI / Digital</option>
              <option value="CASH">{t('cash', 'Cash')}</option>
              <option value="BANK">{t('bankTransfer', 'Bank Transfer')}</option>
              <option value="CHEQUE">{t('cheque', 'Cheque')}</option>
            </select>

            <input
              type="text"
              placeholder={t('searchReceiptsPlaceholder', 'Search receipt ID, customer, notes...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '220px', padding: '6px 12px', fontSize: '12px' }}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('invoiceNo')}</th>
              <th>{t('customerName')}</th>
              <th>{t('amount')}</th>
              <th>{t('paymentMode')}</th>
              <th>{t('date')} & {t('time')}</th>
              <th>{t('notes')}</th>
              {!isCustomerRole && <th>{t('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCollections.length === 0 ? (
              <tr>
                <td colSpan={isCustomerRole ? 6 : 7} style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '30px' }}>
                  {t('noDataFound', 'No payment receipts recorded matching your search.')}
                </td>
              </tr>
            ) : (
              paginatedCollections.map(item => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--accent-terracotta)', fontWeight: 700 }}>{item.id}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{item.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{t('area', 'Area')}: {areas.find(a => a.id === item.areaId)?.name || item.areaName || 'General Territory'}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '15px' }}>
                    ₹ {(Number(item.amount) || 0).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="status-pill" style={{ background: 'var(--icon-teal-bg)', color: 'var(--icon-teal)' }}>
                      {item.paymentMode || t('cash', 'Cash')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-gray)', fontSize: '12px' }}>{item.date || t('today', 'Today')}</td>
                  <td style={{ color: 'var(--text-gray)', fontSize: '11px', maxWidth: '200px' }}>{item.notes || '-'}</td>
                  {!isCustomerRole && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleSendWhatsAppReceipt(item)}
                          title={t('whatsAppSlip', 'Share WhatsApp Payment Confirmation Slip')}
                          style={{
                            padding: '4px 8px',
                            background: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>💬</span> {t('whatsAppSlip', 'WhatsApp Slip')}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          style={{ color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          ✏️ {t('edit', 'Edit')}
                        </button>
                        <button
                          onClick={() => setDeletingPayment(item)}
                          style={{ color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          🗑️ {t('delete', 'Delete')}
                        </button>
                      </div>
                    </td>
                  )}
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

      {/* Edit Payment Modal */}
      {editingPayment && (
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
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{t('editReceiptTitle', 'Edit Receipt')} {editingPayment.id}</div>
              <button onClick={() => setEditingPayment(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('amountPaidLabel', 'Amount Paid (₹)')}</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('paymentMode', 'Payment Mode')}</label>
                  <select
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="Cash">{t('cash', 'Cash Handover')}</option>
                    <option value="Bank Transfer">{t('bankTransfer', 'Bank Transfer')}</option>
                    <option value="Cheque">{t('cheque', 'Cheque')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('receiptNotes', 'Notes / Reference')}</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-generate" style={{ flex: 1 }}>{t('saveReceiptDetails', 'Save Receipt Details')}</button>
                <button type="button" onClick={() => setEditingPayment(null)} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>{t('cancelBtn', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
