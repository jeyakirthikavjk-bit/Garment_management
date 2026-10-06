import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Returns() {
  const { returns: returnsList, addReturn, updateReturn, deleteReturn } = useArea();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [deletingReturn, setDeletingReturn] = useState(null);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedReturns,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(returnsList, 10);

  const [returnForm, setReturnForm] = useState({
    party: '',
    partyType: 'Customer',
    item: '',
    reason: '',
    refund: '1500',
    status: 'Refunded'
  });

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!returnForm.party || !returnForm.item) return;

    const newRtn = {
      id: `RTN-00${13 + returnsList.length}`,
      party: returnForm.party,
      partyType: returnForm.partyType,
      item: returnForm.item,
      reason: returnForm.reason || 'General Return',
      numRefund: Number(returnForm.refund),
      refund: `₹ ${Number(returnForm.refund).toLocaleString('en-IN')}`,
      status: returnForm.status,
      statusType: returnForm.status === 'Refunded' ? 'refunded' : 'pending'
    };

    addReturn(newRtn);
    setShowAddModal(false);
    showToast(`✓ Return Log "${newRtn.id}" processed successfully!`);
    setReturnForm({ party: '', partyType: 'Customer', item: '', reason: '', refund: '1500', status: 'Refunded' });
  };

  const handleOpenEdit = (rtn) => {
    setEditingReturn(rtn);
    setReturnForm({
      party: rtn.party,
      partyType: rtn.partyType,
      item: rtn.item,
      reason: rtn.reason,
      refund: rtn.numRefund || 1500,
      status: rtn.status
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingReturn) return;

    updateReturn(editingReturn.id, {
      party: returnForm.party,
      partyType: returnForm.partyType,
      item: returnForm.item,
      reason: returnForm.reason,
      numRefund: Number(returnForm.refund),
      refund: `₹ ${Number(returnForm.refund).toLocaleString('en-IN')}`,
      status: returnForm.status,
      statusType: returnForm.status === 'Refunded' ? 'refunded' : 'pending'
    });

    setEditingReturn(null);
    showToast(`✓ Return Log "${editingReturn.id}" updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingReturn) return;
    deleteReturn(deletingReturn.id);
    showToast(`✓ Return Log "${deletingReturn.id}" deleted.`);
    setDeletingReturn(null);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingReturn}
        title={t('deleteReturnLog', 'Delete Return Log')}
        message={`Are you sure you want to delete ${deletingReturn?.id} for ${deletingReturn?.party}?`}
        confirmText={t('delete', 'Delete Return')}
        cancelText={t('cancel', 'Cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingReturn(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('salesPurchaseReturns', 'Sales & Purchase Returns')}</span>
        <button onClick={() => setShowAddModal(true)} className="btn-generate" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
          <i>+</i> {t('processReturn', 'Process Return')}
        </button>
      </div>

      <div className="card">
        <div className="card-title">{t('recentReturnsLog', 'Recent Returns Log')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('returnId', 'Return ID')}</th>
              <th>{t('customerSupplier', 'Customer/Supplier')}</th>
              <th>{t('item', 'Item')}</th>
              <th>{t('reason', 'Reason')}</th>
              <th>{t('refundAmountCol', 'Refund Amount')}</th>
              <th>{t('status', 'Status')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReturns.map(rtn => (
              <tr key={rtn.id}>
                <td style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{rtn.id}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{rtn.party}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                    {rtn.partyType === 'Customer' ? t('customer', 'Customer') : t('supplier', 'Supplier')}
                  </div>
                </td>
                <td>{rtn.item}</td>
                <td style={{ color: 'var(--text-gray)', fontSize: '12px' }}>{rtn.reason}</td>
                <td style={{ fontWeight: 700 }}>{rtn.refund}</td>
                <td>
                  <span
                    className="status-pill"
                    style={{
                      background: rtn.statusType === 'refunded' ? 'var(--status-paid-bg)' : 'var(--icon-orange-bg)',
                      color: rtn.statusType === 'refunded' ? 'var(--status-paid)' : 'var(--icon-orange)'
                    }}
                  >
                    {rtn.status === 'Refunded' ? t('refunded', 'Refunded') : t('pendingCreditNote', 'Pending Credit Note')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(rtn)}
                      style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      ✏️ {t('edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => setDeletingReturn(rtn)}
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

      {/* Add / Edit Return Modal */}
      {(showAddModal || editingReturn) && (
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
                {editingReturn ? `${t('editReturnOrder', 'Edit Return Order')} ${editingReturn.id}` : t('processReturnOrder', 'Process Return Order')}
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingReturn(null); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={editingReturn ? handleSaveEdit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('customerSupplier', 'Customer / Supplier *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={returnForm.party}
                    onChange={(e) => setReturnForm({ ...returnForm, party: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('partyType', 'Party Type')}
                  </label>
                  <select
                    value={returnForm.partyType}
                    onChange={(e) => setReturnForm({ ...returnForm, partyType: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    <option value="Customer">{t('customer', 'Customer')}</option>
                    <option value="Supplier">{t('supplier', 'Supplier')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('itemDescription', 'Item Description *')}
                </label>
                <input
                  type="text"
                  required
                  value={returnForm.item}
                  onChange={(e) => setReturnForm({ ...returnForm, item: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('refundAmountCol', 'Refund Amount (₹)')}
                  </label>
                  <input
                    type="number"
                    value={returnForm.refund}
                    onChange={(e) => setReturnForm({ ...returnForm, refund: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('status', 'Return Status')}
                  </label>
                  <select
                    value={returnForm.status}
                    onChange={(e) => setReturnForm({ ...returnForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    <option value="Refunded">{t('refunded', 'Refunded')}</option>
                    <option value="Pending Credit Note">{t('pendingCreditNote', 'Pending Credit Note')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('reasonLabel', 'Reason for Return')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Defect or size discrepancy"
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                  {t('save', 'Save Return Record')}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingReturn(null); }} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>
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
