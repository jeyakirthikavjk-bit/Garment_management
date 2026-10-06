import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Expenses() {
  const { sales } = useArea();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const [expensesList, setExpensesList] = useState([
    { id: 1, date: '15 May 2024', category: 'Utilities', description: 'Electricity Bill (April)', amount: '₹ 12,450', numAmount: 12450, method: 'Bank Transfer', categoryBg: 'var(--icon-blue-bg)', categoryColor: 'var(--icon-blue)' },
    { id: 2, date: '14 May 2024', category: 'Pantry', description: 'Tea & Snacks for staff', amount: '₹ 450', numAmount: 450, method: 'Petty Cash', categoryBg: 'var(--icon-orange-bg)', categoryColor: 'var(--icon-orange)' },
    { id: 3, date: '01 May 2024', category: 'Salary', description: 'Staff Salary (April)', amount: '₹ 45,000', numAmount: 45000, method: 'Bank Transfer', categoryBg: 'var(--icon-purple-bg)', categoryColor: 'var(--icon-purple)' }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedExpenses,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(expensesList, 10);

  const [expenseForm, setExpenseForm] = useState({
    category: 'Utilities',
    description: '',
    amount: '1200',
    method: 'Petty Cash'
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Calculations for Profit & Expense Tracking
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (typeof s.totalAmount === 'number' ? s.totalAmount : 0), 245600);
  const totalShopExpenses = expensesList.reduce((acc, e) => acc + (e.numAmount || 0), 0);
  const estimatedCostOfGoods = Math.round(totalSalesRevenue * 0.60); // 60% Garment COGS
  const estimatedNetProfit = totalSalesRevenue - estimatedCostOfGoods - totalShopExpenses;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.description) return;

    const newExp = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      category: expenseForm.category,
      description: expenseForm.description,
      numAmount: Number(expenseForm.amount),
      amount: `₹ ${Number(expenseForm.amount).toLocaleString('en-IN')}`,
      method: expenseForm.method,
      categoryBg: expenseForm.category === 'Salary' ? 'var(--icon-purple-bg)' : expenseForm.category === 'Utilities' ? 'var(--icon-blue-bg)' : 'var(--icon-orange-bg)',
      categoryColor: expenseForm.category === 'Salary' ? 'var(--icon-purple)' : expenseForm.category === 'Utilities' ? 'var(--icon-blue)' : 'var(--icon-orange)'
    };

    setExpensesList([newExp, ...expensesList]);
    setShowAddModal(false);
    showToast(`✓ Expense of ₹${Number(expenseForm.amount).toLocaleString('en-IN')} logged!`);
    setExpenseForm({ category: 'Utilities', description: '', amount: '1200', method: 'Petty Cash' });
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      category: exp.category,
      description: exp.description,
      amount: exp.numAmount || 1200,
      method: exp.method
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    setExpensesList(prev =>
      prev.map(exp =>
        exp.id === editingExpense.id
          ? {
              ...exp,
              category: expenseForm.category,
              description: expenseForm.description,
              numAmount: Number(expenseForm.amount),
              amount: `₹ ${Number(expenseForm.amount).toLocaleString('en-IN')}`,
              method: expenseForm.method,
              categoryBg: expenseForm.category === 'Salary' ? 'var(--icon-purple-bg)' : expenseForm.category === 'Utilities' ? 'var(--icon-blue-bg)' : 'var(--icon-orange-bg)',
              categoryColor: expenseForm.category === 'Salary' ? 'var(--icon-purple)' : expenseForm.category === 'Utilities' ? 'var(--icon-blue)' : 'var(--icon-orange)'
            }
          : exp
      )
    );

    setEditingExpense(null);
    showToast(`✓ Expense record updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    setExpensesList(prev => prev.filter(e => e.id !== deletingExpense.id));
    showToast(`✓ Expense "${deletingExpense.description}" deleted.`, 'error');
    setDeletingExpense(null);
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingExpense}
        title={t('deleteExpenseRecord', 'Delete Expense Record')}
        message={`Are you sure you want to delete expense record for "${deletingExpense?.description}" (${deletingExpense?.amount})?`}
        confirmText={t('delete', 'Delete Expense')}
        cancelText={t('cancel', 'Cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('shopExpensesProfitTracking', 'Shop Expenses & Profit Tracking')}</span>
        <button onClick={() => setShowAddModal(true)} className="btn-generate" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
          <i>+</i> {t('recordExpense', 'Record Expense')}
        </button>
      </div>

      {/* Financial Overview & Profit Calculator Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>🛍️</div>
            <div className="kpi-info">
              <h4>{t('totalSalesRevenue', 'Total Sales Revenue')}</h4>
              <div className="value" style={{ fontSize: '22px' }}>₹ {totalSalesRevenue.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>📦</div>
            <div className="kpi-info">
              <h4>{t('fabricCogsCost', 'Fabric COGS Cost')}</h4>
              <div className="value" style={{ fontSize: '22px' }}>₹ {estimatedCostOfGoods.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>💸</div>
            <div className="kpi-info">
              <h4>{t('totalShopExpenses', 'Total Shop Expenses')}</h4>
              <div className="value" style={{ fontSize: '22px', color: 'var(--icon-red)' }}>₹ {totalShopExpenses.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '20px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-teal-bg)', color: 'var(--icon-teal)' }}>📈</div>
            <div className="kpi-info">
              <h4>{t('estimatedNetProfit', 'Estimated Net Profit')}</h4>
              <div className="value" style={{ fontSize: '22px', color: 'var(--status-paid)' }}>₹ {estimatedNetProfit.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{t('expenseLog', 'Expense Log')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('date', 'Date')}</th>
              <th>{t('category', 'Category')}</th>
              <th>{t('description', 'Description')}</th>
              <th>{t('amount', 'Amount')}</th>
              <th>{t('paymentMethodLabel', 'Payment Method')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExpenses.map(exp => (
              <tr key={exp.id}>
                <td style={{ color: 'var(--text-gray)' }}>{exp.date}</td>
                <td>
                  <span className="status-pill" style={{ background: exp.categoryBg, color: exp.categoryColor }}>
                    {t(exp.category.toLowerCase(), exp.category)}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{exp.description}</td>
                <td style={{ fontWeight: 600, color: 'var(--icon-red)' }}>{exp.amount}</td>
                <td style={{ color: 'var(--text-gray)' }}>{exp.method}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(exp)}
                      style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      ✏️ {t('edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => setDeletingExpense(exp)}
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

      {/* Add / Edit Expense Modal */}
      {(showAddModal || editingExpense) && (
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
                {editingExpense ? t('editExpenseRecord', 'Edit Expense Record') : t('recordNewExpense', 'Record New Expense')}
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingExpense(null); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={editingExpense ? handleSaveEdit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('expenseCategory', 'Category')}
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    <option value="Utilities">{t('utilities', 'Utilities')}</option>
                    <option value="Pantry">{t('pantry', 'Pantry')}</option>
                    <option value="Salary">{t('salary', 'Salary')}</option>
                    <option value="Rent">{t('rent', 'Rent')}</option>
                    <option value="Maintenance">{t('maintenance', 'Maintenance')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {t('amount', 'Amount (₹)')}
                  </label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('description', 'Description *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric bill or Staff tea"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                  {t('paymentMethodLabel', 'Payment Method')}
                </label>
                <select
                  value={expenseForm.method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, method: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                >
                  <option value="Petty Cash">Petty Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                  {t('saveExpenseRecord', 'Save Expense Record')}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingExpense(null); }} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>
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
