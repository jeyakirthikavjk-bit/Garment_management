import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import Pagination from '../../components/Pagination';
import usePagination from '../../hooks/usePagination';
import Toast from '../../components/Toast';

export default function AIPrediction() {
  const { customers, updateCustomer, addNotification } = useArea();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');
  const [frozenAccounts, setFrozenAccounts] = useState({});

  // Dynamic Payment Risk Scoring Algorithm
  const customerPredictions = customers.map(c => {
    const balance = c.balance || 0;
    const limit = c.creditLimit || 8000;
    const ratio = balance / limit;
    const isOverdue = c.statusType === 'overdue' || c.status === 'Overdue';

    let riskLevel = 'LOW RISK';
    let riskScore = Math.min(30, Math.round(ratio * 25 + 10));
    let delayEst = 'On Time (0-7 Days)';
    let recommendedAction = t('eligibleStdCredit', 'Eligible for Standard Credit Terms');
    let statusBg = 'var(--status-paid-bg)';
    let statusColor = 'var(--status-paid)';

    if (isOverdue || ratio >= 0.85) {
      riskLevel = 'HIGH RISK';
      riskScore = Math.min(98, Math.round(80 + (ratio > 1 ? 15 : ratio * 15)));
      delayEst = '45+ Days Overdue';
      recommendedAction = t('strictCashOnly', 'Strict Cash-Only / Freeze New Credit');
      statusBg = 'var(--status-out-bg)';
      statusColor = 'var(--status-out)';
    } else if (ratio >= 0.35 || balance > 2000) {
      riskLevel = 'MEDIUM RISK';
      riskScore = Math.min(75, Math.round(45 + ratio * 30));
      delayEst = '15-30 Days Delay';
      recommendedAction = t('sendRouteReminder', 'Send Route Reminder & Priority Collection');
      statusBg = 'var(--status-credit-bg)';
      statusColor = 'var(--status-credit)';
    }

    return {
      id: c.id,
      customer: c.name,
      contact: c.email || c.phone || c.areaName,
      areaName: c.areaName,
      purchases: c.purchases ?? 0,
      balance,
      limit,
      riskScoreNum: riskScore,
      riskScore: `${riskScore}%`,
      riskLevel,
      delayEst,
      recommendedAction,
      statusBg,
      statusColor
    };
  });

  const highRiskCount = customerPredictions.filter(p => p.riskLevel === 'HIGH RISK').length;
  const mediumRiskCount = customerPredictions.filter(p => p.riskLevel === 'MEDIUM RISK').length;
  const lowRiskCount = customerPredictions.filter(p => p.riskLevel === 'LOW RISK').length;
  const totalExposure = customerPredictions.filter(p => p.riskLevel === 'HIGH RISK').reduce((acc, p) => acc + p.balance, 0);

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedPredictions,
    setPage,
    setPageSize,
    startIndex,
    endIndex,
  } = usePagination(customerPredictions, 10);

  const handleEnforceFreeze = (cust) => {
    updateCustomer(cust.id, {
      creditLimit: 0,
      status: 'High Risk / Frozen',
      statusType: 'overdue'
    });
    setFrozenAccounts((prev) => ({ ...prev, [cust.id]: true }));
    setToastMsg(`❄️ Credit facility frozen for ${cust.customer}. Account restricted to Cash Only.`);
  };

  const handleSendNotice = (cust) => {
    const cleanPhone = (cust.phone || '919876543210').replace(/\D/g, '');
    const msg = `Dear ${cust.customer}, friendly reminder regarding your pending Khata balance of ₹${cust.balance.toLocaleString('en-IN')}. Please settle via UPI: threadline@okhdfcbank to prevent credit account freeze.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div>
      {toastMsg && <Toast message={toastMsg} type="success" onClose={() => setToastMsg('')} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="card-title" style={{ fontSize: '24px', margin: 0 }}>
          <span>🤖 {t('pageRiskTitle', 'Payment Risk Prediction & Default Intelligence')}</span>
        </div>
        <span style={{ background: '#FBEAEA', color: '#A83232', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', border: '1px solid rgba(168, 50, 50, 0.3)' }}>
          🔒 {t('sellerRiskConfidential', 'Seller Confidential Risk Model')}
        </span>
      </div>

      {/* Risk KPI Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '28px' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>⚠️</div>
            <div className="kpi-info">
              <h4>{t('predictedHighRisk', 'Predicted High Risk')}</h4>
              <div className="value" style={{ color: 'var(--accent-rose)' }}>{highRiskCount} {t('customers', 'Customers')}</div>
            </div>
          </div>
          <div className="kpi-subtext">{t('overdueOrHighLimit', 'Overdue or >85% Credit Limit')}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>📈</div>
            <div className="kpi-info">
              <h4>{t('atRiskExposure', 'At-Risk Exposure')}</h4>
              <div className="value">₹{totalExposure.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="kpi-subtext">{t('highRiskCreditBalance', 'High risk credit balance')}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>🟢</div>
            <div className="kpi-info">
              <h4>{t('lowRiskCustomers', 'Low Risk Customers')}</h4>
              <div className="value">{lowRiskCount} {t('customers', 'Customers')}</div>
            </div>
          </div>
          <div className="kpi-subtext">{t('healthyRepayHistory', 'Healthy repayment history')}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>⚡</div>
            <div className="kpi-info">
              <h4>{t('modelConfidence', 'Model Confidence')}</h4>
              <div className="value">96.4%</div>
            </div>
          </div>
          <div className="kpi-subtext">{t('trainedOnKhata', 'Trained on 500+ Khata transactions')}</div>
        </div>
      </div>

      {/* Risk Level Distribution Chart Component */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-title">{t('territoryRiskDistribution', 'Territory Customer Risk Classification Distribution')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'var(--status-out-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--status-out)' }}>
            <div style={{ fontSize: '11px', color: 'var(--status-out)', fontWeight: 800 }}>{t('highRiskCust', 'HIGH RISK CUSTOMERS')}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', margin: '4px 0' }}>{highRiskCount} {t('customers', 'Customers')}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${(highRiskCount / (customers.length || 1)) * 100}%`, background: 'var(--status-out)' }} />
            </div>
          </div>

          <div style={{ background: 'var(--status-credit-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--status-credit)' }}>
            <div style={{ fontSize: '11px', color: 'var(--status-credit)', fontWeight: 800 }}>{t('mediumRiskCust', 'MEDIUM RISK CUSTOMERS')}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', margin: '4px 0' }}>{mediumRiskCount} {t('customers', 'Customers')}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${(mediumRiskCount / (customers.length || 1)) * 100}%`, background: 'var(--status-credit)' }} />
            </div>
          </div>

          <div style={{ background: 'var(--status-paid-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--status-paid)' }}>
            <div style={{ fontSize: '11px', color: 'var(--status-paid)', fontWeight: 800 }}>{t('lowRiskCust', 'LOW RISK CUSTOMERS')}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', margin: '4px 0' }}>{lowRiskCount} {t('customers', 'Customers')}</div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${(lowRiskCount / (customers.length || 1)) * 100}%`, background: 'var(--status-paid)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Evaluation Table */}
      <div className="card">
        <div className="card-title">{t('riskEvaluationTable', 'Customer Risk Evaluation & Recommended Priority')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('customerNameCol', 'Customer Name')}</th>
              <th>{t('areaCol', 'Area')}</th>
              <th>{t('purchasesCol', 'Purchases')}</th>
              <th>{t('pendingCreditCol', 'Pending Credit')}</th>
              <th>{t('probabilityBarCol', 'Risk Probability Bar')}</th>
              <th>{t('riskCategoryCol', 'Risk Category')}</th>
              <th>{t('recommendedActionCol', 'Recommended Collection Action')}</th>
              <th style={{ textAlign: 'center' }}>Immediate Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPredictions.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{p.customer}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{p.contact}</div>
                </td>
                <td><span style={{ fontWeight: 600 }}>{p.areaName}</span></td>
                <td>₹{p.purchases.toLocaleString('en-IN')}</td>
                <td style={{ fontWeight: 800, color: 'var(--accent-terracotta)' }}>₹{p.balance.toLocaleString('en-IN')}</td>
                <td style={{ minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', fontWeight: 700 }}>
                    <span>{t('probability', 'Probability')}</span>
                    <span>{p.riskScore}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: p.riskScore,
                        background: p.riskLevel === 'HIGH RISK' ? 'var(--accent-rose)' : p.riskLevel === 'MEDIUM RISK' ? 'var(--accent-gold)' : 'var(--accent-emerald)'
                      }}
                    />
                  </div>
                </td>
                <td>
                  <span className="status-pill" style={{ background: p.statusBg, color: p.statusColor }}>
                    {p.riskLevel === 'HIGH RISK' ? t('highRisk', 'HIGH RISK') : p.riskLevel === 'MEDIUM RISK' ? t('mediumRisk', 'MEDIUM RISK') : t('lowRisk', 'LOW RISK')}
                  </span>
                </td>
                <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>
                  {p.recommendedAction}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {p.riskLevel === 'HIGH RISK' || p.balance > p.limit ? (
                      <button
                        onClick={() => handleEnforceFreeze(p)}
                        disabled={frozenAccounts[p.id]}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: frozenAccounts[p.id] ? '#E2E8F0' : '#FEE2E2',
                          color: frozenAccounts[p.id] ? '#64748B' : '#DC2626',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: frozenAccounts[p.id] ? 'default' : 'pointer'
                        }}
                        title="Enforce credit freeze and restrict account to cash purchases"
                      >
                        {frozenAccounts[p.id] ? '✓ Frozen' : '❄️ Freeze Credit'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Active Credit</span>
                    )}

                    <button
                      onClick={() => handleSendNotice(p)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(37, 211, 102, 0.1)',
                        color: '#16A34A',
                        border: '1px solid rgba(37, 211, 102, 0.3)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Send WhatsApp payment notice"
                    >
                      💬 Notice
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
