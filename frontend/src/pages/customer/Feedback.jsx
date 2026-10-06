import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Feedback() {
  const { feedbacks, addFeedback, products } = useArea();
  const { isCustomerRole, customerName, userName } = useAuth();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const resolvedCustomerName = customerName || (isCustomerRole ? (userName || 'Valued Customer') : '');
  const [form, setForm] = useState({ customer: resolvedCustomerName, productName: 'General / Store Service', rating: 5, comments: '' });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedFeedbacks,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(feedbacks, 10);

  const handleOpenModal = () => {
    setForm({
      customer: resolvedCustomerName,
      productName: 'General / Store Service',
      rating: 5,
      comments: ''
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const finalCust = form.customer.trim() || resolvedCustomerName || 'Valued Customer';
    if (!finalCust || !form.comments) return;

    const stars = '★'.repeat(form.rating) + '☆'.repeat(5 - form.rating);
    const newFb = {
      id: Date.now(),
      customer: finalCust,
      productName: form.productName,
      rating: stars,
      ratingNum: form.rating,
      comments: `"${form.comments}"`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    addFeedback(newFb);
    setShowAddModal(false);
    setToastMsg(`✓ Feedback recorded successfully for ${finalCust}!`);
    setForm({ customer: resolvedCustomerName, productName: 'General / Store Service', rating: 5, comments: '' });
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="card-title" style={{ fontSize: '24px', margin: 0, color: 'var(--text-dark)' }}>
            {isCustomerRole ? t('customerFeedbackReviews', 'Customer Feedback & Reviews') : t('customerFeedbackLedger', '⭐ Customer Feedback & Ratings Ledger')}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
            {isCustomerRole
              ? 'Share your experience regarding fabric quality, fit and service.'
              : 'Verified customer feedback, ratings and garment reviews (Admin Read-Only Ledger).'}
          </p>
        </div>

        {/* ONLY CUSTOMER CAN SUBMIT FEEDBACK - HIDDEN FOR SELLER/ADMIN */}
        {isCustomerRole && (
          <button
            onClick={handleOpenModal}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
          >
            {t('submitNewFeedback', '+ Submit New Feedback')}
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title">{t('recentFeedbackLedger', 'Recent Feedback Ledger')} ({feedbacks.length})</div>
        <table>
          <thead>
            <tr>
              <th>{t('customer', 'Customer')}</th>
              <th>{t('garmentItem', 'Garment / Product')}</th>
              <th>{t('rating', 'Rating')}</th>
              <th>{t('comments', 'Comments')}</th>
              <th>{t('date', 'Date')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFeedbacks.map((fb) => (
              <tr key={fb.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{fb.customer}</div>
                </td>
                <td>
                  <span style={{ fontSize: '12px', background: fb.productName && fb.productName !== 'General / Store Service' ? 'var(--accent-terracotta-light)' : 'var(--bg-subtle)', color: fb.productName && fb.productName !== 'General / Store Service' ? 'var(--accent-terracotta)' : 'var(--text-gray)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {fb.productName || 'General / Store Service'}
                  </span>
                </td>
                <td style={{ color: '#F59E0B', letterSpacing: '2px', fontSize: '14px' }}>{fb.rating}</td>
                <td style={{ color: 'var(--text-gray)', fontStyle: 'italic' }}>{fb.comments}</td>
                <td style={{ color: 'var(--text-gray)' }}>{fb.date}</td>
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

      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '450px', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>
              {t('recordCustomerFeedback', 'Record Customer Feedback')}
            </h3>
            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="input-label">{t('customerNameLabel', 'Customer Name')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Shah"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="input-label">{t('garmentOrService', 'Garment Product (Optional)')}</label>
                <select
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                >
                  <option value="General / Store Service">General Store / Service Experience</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.category})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="input-label">{t('starRating', 'Star Rating (1 to 5)')}</label>
                <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                  <option value={5}>5 Stars - Outstanding</option>
                  <option value={4}>4 Stars - Very Good</option>
                  <option value={3}>3 Stars - Average</option>
                  <option value={2}>2 Stars - Needs Improvement</option>
                  <option value={1}>1 Star - Unsatisfactory</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label">{t('comments', 'Feedback Comments')}</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed customer feedback..."
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'transparent' }}>
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
                  {t('saveFeedback', 'Save Feedback')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
