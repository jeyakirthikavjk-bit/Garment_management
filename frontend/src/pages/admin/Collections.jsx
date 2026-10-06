import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import { buildPaymentReceiptWhatsAppMessage, sendWhatsAppMessage } from '../../services/whatsappService';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Collections() {
  const navigate = useNavigate();
  const { areas, customers, collections, selectedDay, setSelectedDay, updateCollection, deleteCollection } = useArea();
  const { storeSettings, t } = useSettings();
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('All Areas');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const liveDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const [editingCollection, setEditingCollection] = useState(null);
  const [deletingCollection, setDeletingCollection] = useState(null);
  const [editForm, setEditForm] = useState({ customerName: '', amount: '', paymentMode: 'Cash', notes: '' });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleSendWhatsAppReceipt = (col) => {
    const targetCust = (customers || []).find(c => c.id === col.customerId || c.name === col.customerName);
    const msg = buildPaymentReceiptWhatsAppMessage({
      receiptId: col.id,
      customerName: col.customerName,
      amount: col.amount,
      paymentMode: col.paymentMode,
      remainingBalance: targetCust ? targetCust.balance : 0,
      date: col.date,
      notes: col.notes,
      storeSettings
    });

    sendWhatsAppMessage({
      phone: col.phone || targetCust?.phone || '',
      message: msg
    });
    showToast(`✓ WhatsApp payment receipt opened for ${col.customerName}!`);
  };

  const todayArea = areas.find(a => a.assignedDay === selectedDay) || areas[0];
  const totalTargetToday = todayArea ? todayArea.targetCollection : 45000;
  const totalCollectedToday = todayArea ? todayArea.collectedSoFar : 18750;

  const filteredCollections = collections.filter(col => {
    return selectedAreaFilter === 'All Areas' || col.areaId === selectedAreaFilter || col.areaName === selectedAreaFilter;
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

  const handleOpenEdit = (col) => {
    setEditingCollection(col);
    setEditForm({
      customerName: col.customerName,
      amount: col.amount,
      paymentMode: col.paymentMode,
      notes: col.notes || ''
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingCollection) return;

    updateCollection(editingCollection.id, editForm);
    setEditingCollection(null);
    showToast(`✓ Collection Log "${editingCollection.id}" updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingCollection) return;
    deleteCollection(deletingCollection.id);
    showToast(`✓ Collection Log "${deletingCollection.id}" deleted.`, 'error');
    setDeletingCollection(null);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingCollection}
        title="Delete Collection Log"
        message={`Are you sure you want to delete ${deletingCollection?.id} (₹${deletingCollection?.amount} from ${deletingCollection?.customerName})?`}
        confirmText="Delete Log"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCollection(null)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
            {t('fieldPaymentCollectionsTitle', 'Field Payment Collections & Route Ledger')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-gray)', marginTop: '2px' }}>
            {t('fieldCollectionsSub', 'Daily field collections and payment receipts')} • {t('scheduledDay', 'Selected Day')}: <strong style={{ color: 'var(--accent-maroon)' }}>{t(selectedDay.toLowerCase(), selectedDay)}</strong> {selectedDay === liveDayName && `(${t('today', 'Today')})`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Day selection pill tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--card-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-gold-subtle)' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: selectedDay === d ? 700 : 500,
                  background: selectedDay === d ? 'var(--accent-maroon)' : 'transparent',
                  color: selectedDay === d ? '#FAF6F0' : 'var(--text-dark)',
                  cursor: 'pointer'
                }}
              >
                {t(d.toLowerCase(), d).slice(0, 3)}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/area-schedule')}
            style={{ padding: '8px 14px', background: 'var(--card-secondary)', border: '1px solid var(--border-gold-subtle)', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-dark)' }}
          >
            📅 {t('pageScheduleTitle', 'Area Schedule')}
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate(todayArea?.id ? `/area-visit/${todayArea.id}` : '/area-visit')}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
          >
            <i>🚶</i> {t('startTodayVisit', 'Start Field Collection')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>📍</div>
            <div className="kpi-info">
              <h4>{t('dailyTarget', "Today's Target")} ({t(selectedDay.toLowerCase(), selectedDay)})</h4>
              <div className="value" style={{ fontSize: '26px' }}>₹ {totalTargetToday.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>💰</div>
            <div className="kpi-info">
              <h4>{t('collectedToday', 'Collected So Far')}</h4>
              <div className="value" style={{ fontSize: '26px' }}>₹ {totalCollectedToday.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>🚚</div>
            <div className="kpi-info">
              <h4>{t('activeTerritoryRoutes', 'Active Territory Routes')}</h4>
              <div className="value" style={{ fontSize: '26px' }}>{areas.length} {t('activeRoutes', 'Active Routes')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>📈</div>
            <div className="kpi-info">
              <h4>{t('collectionRate', 'Collection Rate')}</h4>
              <div className="value" style={{ fontSize: '26px' }}>
                {totalTargetToday > 0 ? Math.round((totalCollectedToday / totalTargetToday) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Area Routes Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">{t('weeklyScheduledRoutes', 'Weekly Scheduled Routes & Collection Status')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('dayCol', 'Day')}</th>
              <th>{t('areaRouteCol', 'Area / Route')}</th>
              <th>{t('mappedCustCol', 'Mapped Customers')}</th>
              <th>{t('targetAmtCol', 'Target Amount')}</th>
              <th>{t('collectedCol', 'Collected')}</th>
              <th>{t('status', 'Status')}</th>
              <th>{t('action', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => {
              const isToday = area.assignedDay === selectedDay;
              const progressPct = area.targetCollection > 0 ? Math.round((area.collectedSoFar / area.targetCollection) * 100) : 0;
              return (
                <tr key={area.id} style={{ background: isToday ? 'var(--terracotta-light)' : 'transparent' }}>
                  <td>
                    <span style={{ fontWeight: 700, color: isToday ? 'var(--terracotta)' : 'var(--text-dark)', fontSize: '13px' }}>
                      {t(area.assignedDay.toLowerCase(), area.assignedDay)} {isToday && `(${t('today', 'Today')})`}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{area.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{area.code}</div>
                  </td>
                  <td>{area.totalCustomers} {t('customers', 'Customers')}</td>
                  <td style={{ fontWeight: 600 }}>₹ {area.targetCollection.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--icon-green)', fontWeight: 600 }}>
                    ₹ {area.collectedSoFar.toLocaleString('en-IN')} ({progressPct}%)
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: area.collectedSoFar > 0 ? 'var(--icon-green-bg)' : 'var(--icon-blue-bg)',
                        color: area.collectedSoFar > 0 ? 'var(--icon-green)' : 'var(--icon-blue)'
                      }}
                    >
                      {area.collectedSoFar > 0 ? t('collectionActive', 'Collection Active') : t('scheduledStatus', 'Scheduled')}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/area-visit/${area.id}`)}
                      style={{ color: 'var(--terracotta)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      {t('openVisitAction', 'Open Visit →')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recent Field Payment Transactions Ledger */}
      <div className="card">
        <div className="card-title">
          {t('recentPaymentLogs', 'Recent Installment Payment Logs')}
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            style={{ border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', padding: '6px 12px', outline: 'none', fontSize: '12px', color: 'var(--text-dark)', background: 'var(--bg-main)' }}
          >
            <option value="All Areas">{t('allAreas', 'All Areas')}</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('receiptIdCol', 'Receipt ID')}</th>
              <th>{t('customerNameCol', 'Customer Name')}</th>
              <th>{t('areaCol', 'Area')}</th>
              <th>{t('dateTimeCol', 'Date & Time')}</th>
              <th>{t('methodCol', 'Method')}</th>
              <th>{t('amtCollectedCol', 'Amount Collected')}</th>
              <th>{t('notesCol', 'Notes')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCollections.map(col => (
              <tr key={col.id}>
                <td style={{ fontWeight: 600, color: 'var(--terracotta)' }}>{col.id}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{col.customerName}</td>
                <td>
                  <span style={{ fontSize: '11px', background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    📍 {areas.find(a => a.id === col.areaId)?.name || col.areaName || 'General Territory'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-gray)', fontSize: '12px' }}>{col.date}</td>
                <td>
                  <span style={{ fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
                    {col.paymentMode}
                  </span>
                </td>
                <td style={{ color: 'var(--icon-green)', fontWeight: 700, fontSize: '14px' }}>
                  + ₹ {col.amount.toLocaleString('en-IN')}
                </td>
                <td style={{ color: 'var(--text-gray)', fontSize: '12px' }}>{col.notes || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleSendWhatsAppReceipt(col)}
                      title="Send WhatsApp Receipt"
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
                      onClick={() => handleOpenEdit(col)}
                      style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      ✏️ {t('edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => setDeletingCollection(col)}
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

      {/* Edit Collection Modal */}
      {editingCollection && (
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
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{t('editCollectionReceipt', 'Edit Collection Receipt')} {editingCollection.id}</div>
              <button onClick={() => setEditingCollection(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('customerNameLabel', 'Customer Name')}</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('amtCollectedLabel', 'Collected Amount (₹)')}</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('paymentMethodLabel', 'Payment Method')}</label>
                  <select
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    <option value="Cash">{t('cash', 'Cash')}</option>
                    <option value="UPI">{t('upi', 'UPI')}</option>
                    <option value="Cheque">{t('cheque', 'Cheque')}</option>
                    <option value="Bank Transfer">{t('bankTransfer', 'Bank Transfer')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('notesCol', 'Notes')}</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>{t('saveProfileChanges', 'Save Changes')}</button>
                <button type="button" onClick={() => setEditingCollection(null)} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
