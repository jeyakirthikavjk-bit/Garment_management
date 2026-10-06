import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import WhatsAppReminderModal from '../../components/WhatsAppReminderModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import usePagination from '../../hooks/usePagination';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { areas, customers, sales, collections, requirements } = useArea();
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('purchases');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const customer = customers.find(c => c.id === Number(id)) || customers[0];
  const areaName = areas.find(a => a.id === customer.areaId)?.name || customer.areaName || 'General Territory';

  const customerSales = sales.filter(s => s.customerId === customer.id || s.customer === customer.name);
  const customerCollections = collections.filter(col => col.customerId === customer.id || col.customerName === customer.name);
  const customerRequirements = requirements.filter(req => req.customerId === customer.id || req.customer === customer.name);

  const salesPagination = usePagination(customerSales, 10);
  const collectionsPagination = usePagination(customerCollections, 10);
  const requirementsPagination = usePagination(customerRequirements, 6);

  const isOverCreditLimit = customer.balance > customer.creditLimit;

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {customer.avatar ? (
            <img src={customer.avatar} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--terracotta)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px' }}>
              {customer.avatarInitials || customer.name[0]}
            </div>
          )}
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)' }}>{customer.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
              {customer.phone} | {customer.email || t('customer', 'Customer')} | 📍 {t('area', 'Territory')}: {areaName}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowWhatsAppModal(true)}
            style={{
              padding: '10px 18px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
            }}
          >
            <span>💬</span> {t('whatsAppNotice', 'WhatsApp Notice / Bill')}
          </button>
          <button onClick={() => navigate('/sales')} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>+ {t('newSaleButton', 'New Sale')}</button>
          <button onClick={() => navigate('/payments')} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px', background: 'var(--accent-forest)', color: '#FAF6F0' }}>+ {t('recordPayment', 'Record Payment')}</button>
          <button onClick={() => navigate('/customers')} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dark)' }}>{t('back', 'Back')}</button>
        </div>
      </div>

      {/* Credit Limit Warning Header Banner */}
      {isOverCreditLimit && (
        <div style={{ background: 'var(--icon-red-bg)', border: '1px solid var(--icon-red)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--icon-red)', fontSize: '14px' }}>
              {t('creditLimitExceeded', 'Warning: Customer Credit Limit Exceeded!')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
              {t('currentPendingBalance', 'Current Pending Balance')}: <strong>₹{customer.balance.toLocaleString('en-IN')}</strong> | {t('approvedCreditLimit', 'Approved Credit Limit')}: <strong>₹{customer.creditLimit.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Customer Quick Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-info">
            <h4>{t('myPurchases', 'Total Purchases')}</h4>
            <div className="value" style={{ fontSize: '24px' }}>₹ {customer.purchases.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-info">
            <h4>{t('outstandingCredit', 'Outstanding Credit')}</h4>
            <div className="value" style={{ fontSize: '24px', color: customer.balance > 0 ? 'var(--icon-red)' : 'var(--status-paid)' }}>
              ₹ {customer.balance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-info">
            <h4>{t('creditLimit', 'Approved Credit Limit')}</h4>
            <div className="value" style={{ fontSize: '24px' }}>₹ {customer.creditLimit.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-info">
            <h4>{t('status', 'Credit Status')}</h4>
            <div className="value" style={{ fontSize: '18px', color: customer.balance > 0 ? 'var(--icon-red)' : 'var(--status-paid)', marginTop: '5px' }}>
              {customer.balance > 0 ? t('overdueKhata', 'Overdue Balance') : t('statusPaid', 'Clear (Zero Balance)')}
            </div>
          </div>
        </div>
      </div>

      {/* Details Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', marginBottom: '20px' }}>
          <span
            onClick={() => setActiveTab('purchases')}
            style={{ fontWeight: activeTab === 'purchases' ? 700 : 500, color: activeTab === 'purchases' ? 'var(--terracotta)' : 'var(--text-gray)', cursor: 'pointer', borderBottom: activeTab === 'purchases' ? '2px solid var(--terracotta)' : 'none', paddingBottom: '5px' }}
          >
            {t('purchasesHistory', 'Purchase History')} ({customerSales.length})
          </span>
          <span
            onClick={() => setActiveTab('payments')}
            style={{ fontWeight: activeTab === 'payments' ? 700 : 500, color: activeTab === 'payments' ? 'var(--terracotta)' : 'var(--text-gray)', cursor: 'pointer', borderBottom: activeTab === 'payments' ? '2px solid var(--terracotta)' : 'none', paddingBottom: '5px' }}
          >
            {t('paymentReceipts', 'Payment Receipts')} ({customerCollections.length})
          </span>
          <span
            onClick={() => setActiveTab('requirements')}
            style={{ fontWeight: activeTab === 'requirements' ? 700 : 500, color: activeTab === 'requirements' ? 'var(--terracotta)' : 'var(--text-gray)', cursor: 'pointer', borderBottom: activeTab === 'requirements' ? '2px solid var(--terracotta)' : 'none', paddingBottom: '5px' }}
          >
            {t('bespokeRequirements', 'Stock Requirements')} ({customerRequirements.length})
          </span>
        </div>

        {activeTab === 'purchases' && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{t('invoiceNumber', 'Invoice #')}</th>
                  <th>{t('itemsPurchased', 'Items Purchased')}</th>
                  <th>{t('totalAmount', 'Total Amount')}</th>
                  <th>{t('paymentMode', 'Payment Mode')}</th>
                  <th>{t('date', 'Date')}</th>
                  <th>{t('status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {customerSales.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-gray)' }}>{t('noSalesLogged', 'No sales logged yet for this customer.')}</td></tr>
                ) : (
                  salesPagination.paginatedItems.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{s.id}</td>
                      <td style={{ fontWeight: 500 }}>{s.items}</td>
                      <td style={{ fontWeight: 700 }}>₹ {s.totalAmount.toLocaleString('en-IN')}</td>
                      <td>{s.paymentType}</td>
                      <td style={{ color: 'var(--text-gray)' }}>{s.date}</td>
                      <td>
                        <span className={`status-pill ${s.status === 'Paid' ? 'pill-paid' : 'pill-credit'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={salesPagination.currentPage}
              totalPages={salesPagination.totalPages}
              pageSize={salesPagination.pageSize}
              totalItems={salesPagination.totalItems}
              startIndex={salesPagination.startIndex}
              endIndex={salesPagination.endIndex}
              onPageChange={salesPagination.setPage}
              onPageSizeChange={salesPagination.setPageSize}
            />
          </>
        )}

        {activeTab === 'payments' && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{t('receiptNumber', 'Receipt #')}</th>
                  <th>{t('amountPaid', 'Amount Paid')}</th>
                  <th>{t('paymentMode', 'Payment Mode')}</th>
                  <th>{t('date', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {customerCollections.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-gray)' }}>{t('noReceiptsLogged', 'No payment receipts recorded yet for this customer.')}</td></tr>
                ) : (
                  collectionsPagination.paginatedItems.map(col => (
                    <tr key={col.id}>
                      <td style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{col.id}</td>
                      <td style={{ fontWeight: 700, color: 'var(--status-paid)' }}>₹ {col.amount.toLocaleString('en-IN')}</td>
                      <td><span className="status-pill" style={{ background: 'var(--icon-teal-bg)', color: 'var(--icon-teal)' }}>{col.paymentMode}</span></td>
                      <td style={{ color: 'var(--text-gray)' }}>{col.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={collectionsPagination.currentPage}
              totalPages={collectionsPagination.totalPages}
              pageSize={collectionsPagination.pageSize}
              totalItems={collectionsPagination.totalItems}
              startIndex={collectionsPagination.startIndex}
              endIndex={collectionsPagination.endIndex}
              onPageChange={collectionsPagination.setPage}
              onPageSizeChange={collectionsPagination.setPageSize}
            />
          </>
        )}

        {activeTab === 'requirements' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-dark)' }}>{t('customerGarmentRequests', 'Customer Garment Requests')} ({customerRequirements.length})</h4>
              <button
                onClick={() => navigate('/requirements')}
                style={{ padding: '8px 14px', background: 'var(--accent-terracotta)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {t('manageInStudio', '+ Manage in Studio')}
              </button>
            </div>

            {customerRequirements.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '30px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                {t('noBespokeLogged', 'No stock or garment restock requirements logged for this customer.')}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {requirementsPagination.paginatedItems.map(req => (
                    <div key={req.id} style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-terracotta)' }}>{req.id}</span>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-dark)' }}>{req.garment}</div>
                        </div>
                        <span
                          className="status-pill"
                          style={{
                            background: req.statusBg || (req.status === 'Available' ? 'var(--status-paid-bg)' : 'var(--icon-purple-bg)'),
                            color: req.statusColor || (req.status === 'Available' ? 'var(--status-paid)' : 'var(--icon-purple)'),
                            fontSize: '11px'
                          }}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '10px' }}>
                        {t('size', 'Size')}: <strong>{req.size}</strong> • {t('color', 'Color')}: <strong>{req.color}</strong> • {t('qty', 'Qty')}: <strong>{req.quantity || 1} pcs</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--status-paid)' }}>Target: ₹{(Number(req.budget) || 2500).toLocaleString('en-IN')}</span>
                        <span style={{ color: 'var(--text-gray)' }}>{t('deliveryDate', 'Need by')}: {req.deliveryDate || 'Flexible'}</span>
                      </div>

                      {(req.measurements || req.notes) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontStyle: 'italic', marginBottom: '10px', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px' }}>
                          💬 {req.measurements || req.notes}
                        </div>
                      )}

                      {req.sellerNotes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dark)', background: 'rgba(212, 175, 55, 0.12)', padding: '6px 10px', borderRadius: '6px' }}>
                          <strong>Studio Update:</strong> {req.sellerNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={requirementsPagination.currentPage}
                  totalPages={requirementsPagination.totalPages}
                  pageSize={requirementsPagination.pageSize}
                  totalItems={requirementsPagination.totalItems}
                  startIndex={requirementsPagination.startIndex}
                  endIndex={requirementsPagination.endIndex}
                  onPageChange={requirementsPagination.setPage}
                  onPageSizeChange={requirementsPagination.setPageSize}
                />
              </>
            )}
          </div>
        )}
      </div>

      {showWhatsAppModal && (
        <WhatsAppReminderModal
          customer={customer}
          onClose={() => setShowWhatsAppModal(false)}
          onSent={(c) => setToastMsg(`✓ WhatsApp reminder opened for ${c.name}!`)}
        />
      )}
    </div>
  );
}
