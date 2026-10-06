// frontend/src/components/supplier/SupplierPaymentsView.jsx
// Dedicated "Payments & Settlement" View for Logged-In Suppliers

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';

export default function SupplierPaymentsView() {
  const { userEmail, userName, supplierId, supplierName } = useAuth();
  const {
    suppliers = [],
    supplierPurchases = [],
    supplierPayments = []
  } = useArea();

  // Resolve current supplier identity
  const loggedInSupplier = React.useMemo(() => {
    let s = null;
    if (supplierId) {
      s = suppliers.find(item => item.id === supplierId || (supplierId === 'sup-1' && item.id === 'SUP-001'));
    }
    if (!s && userEmail) {
      s = suppliers.find(item => item.email && item.email.toLowerCase() === userEmail.toLowerCase());
    }
    if (!s && (supplierName || userName)) {
      const targetName = (supplierName || userName).toLowerCase();
      s = suppliers.find(item => item.name && item.name.toLowerCase().includes(targetName));
    }
    return s || {
      id: supplierId || 'sup-1',
      name: supplierName || userName || 'Sri Lakshmi Mills & Spinning',
      shopName: 'Textile Mill & Fabric Works',
      category: 'Fabrics & Yarns',
      phone: '+91 98422 12345',
      email: userEmail || 'supplier@threadline.com',
      city: 'Tirupur'
    };
  }, [supplierId, userEmail, supplierName, userName, suppliers]);

  // Strict Supplier Isolation: Only POs sent to this supplier
  const mySupplierPurchases = React.useMemo(() => {
    return (supplierPurchases || []).filter(po => {
      if (po.supplierId === loggedInSupplier.id) return true;
      if (loggedInSupplier.id === 'sup-1' && (po.supplierId === 'SUP-001' || po.supplierId === 'sup-1')) return true;
      if (po.supplierName && loggedInSupplier.name && po.supplierName.toLowerCase().includes(loggedInSupplier.name.toLowerCase())) return true;
      return false;
    });
  }, [supplierPurchases, loggedInSupplier]);

  // Strict Supplier Isolation: Only payments for this supplier
  const mySupplierPayments = React.useMemo(() => {
    return (supplierPayments || []).filter(p => {
      if (p.supplierId === loggedInSupplier.id) return true;
      if (loggedInSupplier.id === 'sup-1' && (p.supplierId === 'SUP-001' || p.supplierId === 'sup-1')) return true;
      if (p.supplierName && loggedInSupplier.name && p.supplierName.toLowerCase().includes(loggedInSupplier.name.toLowerCase())) return true;
      return false;
    });
  }, [supplierPayments, loggedInSupplier]);

  const [activeSubTab, setActiveSubTab] = useState('transactions'); // 'transactions' | 'invoices'

  // Financial calculations
  const totalBilled = mySupplierPurchases.reduce((sum, p) => sum + (Number(p.finalCost) || 0), 0);
  const totalSettled = mySupplierPayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
  const pendingDue = Math.max(0, totalBilled - totalSettled);

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '26px' }}>💳</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
              Payments & Settlement
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
            Track direct bank settlements, remittance UTR numbers, invoice clearances, and Khata ledger for <strong>{loggedInSupplier?.name}</strong>.
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Invoiced
            </span>
            <span style={{ fontSize: '20px' }}>💰</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-dark)' }}>
            ₹{totalBilled.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Gross Supply Purchases
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Settled to Bank
            </span>
            <span style={{ fontSize: '20px' }}>💳</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            ₹{totalSettled.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Direct RTGS / NEFT / Cheque
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Balance Due
            </span>
            <span style={{ fontSize: '20px' }}>⏳</span>
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 800,
            color: pendingDue > 0 ? '#D97706' : 'var(--accent-emerald)'
          }}>
            ₹{pendingDue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {pendingDue > 0 ? 'Within Credit Terms' : 'Zero Outstanding Balance'}
          </div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-light)',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('transactions')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'transactions' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeSubTab === 'transactions' ? 'var(--accent-primary)' : 'var(--text-gray)',
            fontWeight: activeSubTab === 'transactions' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          💳 Bank Settlement Ledger ({mySupplierPayments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('invoices')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'invoices' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeSubTab === 'invoices' ? 'var(--accent-primary)' : 'var(--text-gray)',
            fontWeight: activeSubTab === 'invoices' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          📄 Supply Invoices & PO Status ({mySupplierPurchases.length})
        </button>
      </div>

      {/* SUB-TAB 1: BANK SETTLEMENTS */}
      {activeSubTab === 'transactions' && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Bank Settlement Ledger & Remittances
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Direct bank transfer transactions settled by ThreadLine Accounts
              </div>
            </div>
          </div>

          {mySupplierPayments.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💳</div>
              <h4 style={{ margin: 0, color: 'var(--text-dark)' }}>No settlement transactions recorded yet</h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Settlement remittances processed via NEFT / RTGS will be logged here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Txn / UTR Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Payment Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Mode</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Related PO</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Notes / Bank Narration</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Amount Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {mySupplierPayments.map(pay => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'monospace' }}>
                        {pay.referenceNumber || pay.id}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-gray)' }}>
                        {pay.paymentDate}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)'
                        }}>
                          {pay.paymentMode || 'NEFT'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {pay.purchaseId || 'PO General'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {pay.notes || 'Payment cleared'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '15px' }}>
                        ₹{Number(pay.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: INVOICES & PO KHATA */}
      {activeSubTab === 'invoices' && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Supply Invoices & Khata Status
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Breakdown of billed purchase orders, paid amounts, and due balances
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>PO Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Supplied Item</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Total Value</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Paid Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Balance Due</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {mySupplierPurchases.map(po => {
                  const finalCost = Number(po.finalCost || 0);
                  const paid = Number(po.paidAmount || (po.paymentStatus === 'Paid' ? finalCost : 0));
                  const due = Math.max(0, finalCost - paid);
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {po.purchaseOrderNo || po.id}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-gray)' }}>
                        {po.purchaseDate}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-dark)' }}>
                        {po.productName}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        ₹{finalCost.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        ₹{paid.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: due > 0 ? '#D97706' : 'var(--text-muted)', fontWeight: 700 }}>
                        ₹{due.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: po.paymentStatus === 'Paid'
                            ? 'rgba(5, 150, 105, 0.12)'
                            : po.paymentStatus === 'Partial'
                            ? 'rgba(217, 119, 6, 0.15)'
                            : 'rgba(225, 29, 72, 0.12)',
                          color: po.paymentStatus === 'Paid'
                            ? 'var(--accent-emerald)'
                            : po.paymentStatus === 'Partial'
                            ? '#D97706'
                            : 'var(--accent-danger)'
                        }}>
                          {po.paymentStatus || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
