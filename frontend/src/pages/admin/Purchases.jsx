import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import SupplierPurchasesView from '../../components/supplier/SupplierPurchasesView';

export default function Purchases() {
  const { isSupplier } = useAuth();
  if (isSupplier) {
    return <SupplierPurchasesView />;
  }

  const { purchases: purchasesList, addPurchase, updatePurchase, deletePurchase } = useArea();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [deletingPO, setDeletingPO] = useState(null);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedPurchases,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(purchasesList, 10);

  const [poForm, setPoForm] = useState({ supplier: '', amount: '100000', delivery: '', status: 'In Transit' });

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!poForm.supplier) return;

    const newPO = {
      id: `PO-${1043 + purchasesList.length}`,
      supplier: poForm.supplier,
      numAmount: Number(poForm.amount),
      amount: `₹ ${Number(poForm.amount).toLocaleString('en-IN')}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      delivery: poForm.delivery || '25 May 2024',
      status: poForm.status,
      statusType: poForm.status === 'Received' ? 'received' : 'in-transit'
    };

    addPurchase(newPO);
    setShowAddModal(false);
    showToast(`✓ Purchase Order "${newPO.id}" created successfully!`);
    setPoForm({ supplier: '', amount: '100000', delivery: '', status: 'In Transit' });
  };

  const handleOpenEdit = (po) => {
    setEditingPO(po);
    setPoForm({
      supplier: po.supplier,
      amount: po.numAmount || 100000,
      delivery: po.delivery,
      status: po.status
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingPO) return;

    updatePurchase(editingPO.id, {
      supplier: poForm.supplier,
      numAmount: Number(poForm.amount),
      amount: `₹ ${Number(poForm.amount).toLocaleString('en-IN')}`,
      delivery: poForm.delivery,
      status: poForm.status,
      statusType: poForm.status === 'Received' ? 'received' : 'in-transit'
    });

    setEditingPO(null);
    showToast(`✓ Purchase Order "${editingPO.id}" updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingPO) return;
    deletePurchase(deletingPO.id);
    showToast(`✓ Purchase Order "${deletingPO.id}" deleted.`);
    setDeletingPO(null);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingPO}
        title={t('deletePurchaseOrder', 'Delete Purchase Order')}
        message={`Are you sure you want to delete ${deletingPO?.id} (${deletingPO?.supplier})?`}
        confirmText={t('delete', 'Delete PO')}
        cancelText={t('cancel', 'Cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPO(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('purchasesSupplierInvoices', 'Purchases & Supplier Invoices')}</span>
        <button onClick={() => setShowAddModal(true)} className="btn-generate" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
          <i>+</i> {t('createPO', 'Create PO')}
        </button>
      </div>

      <div className="card">
        <div className="card-title">{t('recentPurchaseOrders', 'Recent Purchase Orders')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('poNumber', 'PO Number')}</th>
              <th>{t('supplierMill', 'Supplier / Mill')}</th>
              <th>{t('amount', 'Amount')}</th>
              <th>{t('orderDate', 'Order Date')}</th>
              <th>{t('expectedDelivery', 'Expected Delivery')}</th>
              <th>{t('status', 'Status')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.map(po => (
              <tr key={po.id}>
                <td style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{po.id}</td>
                <td><div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{po.supplier}</div></td>
                <td style={{ fontWeight: 700 }}>{po.amount}</td>
                <td style={{ color: 'var(--text-gray)' }}>{po.date}</td>
                <td style={{ color: 'var(--text-gray)' }}>{po.delivery}</td>
                <td>
                  <span
                    className="status-pill"
                    style={{
                      background: po.statusType === 'received' ? 'var(--status-paid-bg)' : 'var(--icon-orange-bg)',
                      color: po.statusType === 'received' ? 'var(--status-paid)' : 'var(--icon-orange)'
                    }}
                  >
                    {t(po.status === 'Received' ? 'received' : 'inTransit', po.status)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(po)}
                      style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      ✏️ {t('edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => setDeletingPO(po)}
                      style={{ color: 'var(--icon-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      🗑️ {t('delete', 'Delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {/* Add / Edit PO Modal */}
      {(showAddModal || editingPO) && (
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
              <div style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingPO ? `${t('editPurchaseOrder', 'Edit Purchase Order')} ${editingPO.id}` : t('createPurchaseOrder', 'Create Purchase Order')}
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingPO(null); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={editingPO ? handleSaveEdit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('supplierMillName', 'Supplier / Mill Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={poForm.supplier}
                  onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('orderAmount', 'Order Amount (₹)')}
                  </label>
                  <input
                    type="number"
                    value={poForm.amount}
                    onChange={(e) => setPoForm({ ...poForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('orderStatus', 'Order Status')}
                  </label>
                  <select
                    value={poForm.status}
                    onChange={(e) => setPoForm({ ...poForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    <option value="In Transit">{t('inTransit', 'In Transit')}</option>
                    <option value="Received">{t('received', 'Received')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('expectedDelivery', 'Expected Delivery Date')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25 May 2024"
                  value={poForm.delivery}
                  onChange={(e) => setPoForm({ ...poForm, delivery: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                  {t('savePurchaseOrder', 'Save Purchase Order')}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingPO(null); }} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
