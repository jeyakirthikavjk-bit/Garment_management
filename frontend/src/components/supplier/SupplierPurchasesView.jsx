// frontend/src/components/supplier/SupplierPurchasesView.jsx
// Dedicated "Received Purchase Orders" View for Logged-In Suppliers

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import Toast from '../Toast';

export default function SupplierPurchasesView() {
  const { userEmail, userName, supplierId, supplierName } = useAuth();
  const {
    suppliers = [],
    supplierPurchases = [],
    updateSupplierPurchase,
    acceptSupplierPurchaseOrder
  } = useArea();

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

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

  const [poFilterStatus, setPoFilterStatus] = useState('all'); // 'all' | 'pending' | 'accepted'
  const [poSearch, setPoSearch] = useState('');
  const [selectedPODetails, setSelectedPODetails] = useState(null);
  const [isAcceptingPO, setIsAcceptingPO] = useState(false);
  const [dispatchingPO, setDispatchingPO] = useState(null);
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');

  const pendingOrders = mySupplierPurchases.filter(p => p.status === 'Pending' || p.acceptanceStatus === 'Pending');
  const acceptedOrders = mySupplierPurchases.filter(p => p.status === 'Accepted' || p.acceptanceStatus === 'Accepted');

  const filteredOrders = React.useMemo(() => {
    return mySupplierPurchases.filter(po => {
      if (poFilterStatus === 'pending') {
        const isPend = po.status === 'Pending' || po.acceptanceStatus === 'Pending';
        if (!isPend) return false;
      } else if (poFilterStatus === 'accepted') {
        const isAcc = po.status === 'Accepted' || po.acceptanceStatus === 'Accepted';
        if (!isAcc) return false;
      }

      if (poSearch.trim()) {
        const q = poSearch.toLowerCase();
        const matchNo = (po.purchaseOrderNo && po.purchaseOrderNo.toLowerCase().includes(q)) || (po.id && po.id.toLowerCase().includes(q));
        const matchItem = po.productName && po.productName.toLowerCase().includes(q);
        if (!matchNo && !matchItem) return false;
      }

      return true;
    });
  }, [mySupplierPurchases, poFilterStatus, poSearch]);

  // Accept PO Action
  const handleAcceptPO = async (po) => {
    if (!po || !loggedInSupplier) return;

    if (po.status === 'Accepted' || po.acceptanceStatus === 'Accepted') {
      showToast(`This Purchase Order was already accepted on ${po.acceptedDateFormatted || po.acceptedAt || 'record'}.`, 'info');
      return;
    }

    try {
      setIsAcceptingPO(true);
      const updated = await acceptSupplierPurchaseOrder(po.id, loggedInSupplier.id, loggedInSupplier.name);
      setSelectedPODetails(updated);
      showToast(`✓ Purchase Order #${po.purchaseOrderNo || po.id} Accepted! Admin & Inventory Manager notified.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to accept Purchase Order', 'error');
    } finally {
      setIsAcceptingPO(false);
    }
  };

  // Dispatch Confirmation
  const handleConfirmDispatchOrder = (e) => {
    e.preventDefault();
    if (dispatchingPO) {
      const trackingNote = dispatchTrackingNumber ? `Dispatched via LR #${dispatchTrackingNumber}` : 'Dispatched from Mill';
      if (updateSupplierPurchase) {
        updateSupplierPurchase(dispatchingPO.id, {
          deliveryStatus: 'In Transit',
          notes: dispatchingPO.notes ? `${dispatchingPO.notes} | ${trackingNote}` : trackingNote
        });
      }
      showToast(`Order #${dispatchingPO.purchaseOrderNo || dispatchingPO.id} marked as In Transit!`);
      setDispatchingPO(null);
      setDispatchTrackingNumber('');
    }
  };

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '40px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* DISPATCH ORDER MODAL */}
      {dispatchingPO && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-light)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-dark)' }}>
              🚚 Update Order Dispatch Status
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Marking <strong>{dispatchingPO.purchaseOrderNo || dispatchingPO.id}</strong> ({dispatchingPO.productName}) as <em>In Transit</em>.
            </p>
            <form onSubmit={handleConfirmDispatchOrder}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                Lorry Receipt (LR) / Tracking Number
              </label>
              <input
                type="text"
                placeholder="e.g. VRL-88291 or TIRUPUR-EXP-401"
                value={dispatchTrackingNumber}
                onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-dark)',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '20px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setDispatchingPO(null); setDispatchTrackingNumber(''); }}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                    backgroundColor: 'transparent', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    backgroundColor: 'var(--accent-emerald)', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE ORDER DETAILS & ACCEPTANCE MODAL */}
      {selectedPODetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '18px',
            maxWidth: '720px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 24px 50px rgba(0,0,0,0.35)',
            border: '1px solid var(--border-light)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '22px 26px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(107,30,43,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  📋
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
                    Purchase Order Details
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Issued by ThreadLine Garments to {selectedPODetails.supplierName}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPODetails(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '26px' }}>
              {/* Meta Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '14px',
                padding: '16px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                marginBottom: '22px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    PO Number
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                    {selectedPODetails.purchaseOrderNo || selectedPODetails.id}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Issue Date
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>
                    {selectedPODetails.purchaseDate || '05/10/2026'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Delivery SLA
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>
                    {selectedPODetails.expectedDeliveryDate || 'Within SLA'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Current Status
                  </div>
                  <div style={{ marginTop: '3px' }}>
                    {selectedPODetails.status === 'Accepted' || selectedPODetails.acceptanceStatus === 'Accepted' ? (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(5, 150, 105, 0.15)',
                        color: 'var(--accent-emerald)'
                      }}>
                        ✓ Accepted
                      </span>
                    ) : (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(217, 119, 6, 0.15)',
                        color: '#D97706'
                      }}>
                        ⏳ Pending Acceptance
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Ordered Products & Specifications
              </h4>
              <div style={{
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Item Description</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Quantity</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Unit Rate</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                          {selectedPODetails.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {selectedPODetails.category} {selectedPODetails.color ? `• ${selectedPODetails.color}` : ''} {selectedPODetails.size ? `• Size: ${selectedPODetails.size}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {selectedPODetails.quantity} pcs
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{Number(selectedPODetails.costPerItem).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'monospace' }}>
                        ₹{Number(selectedPODetails.totalPurchaseCost || (selectedPODetails.costPerItem * selectedPODetails.quantity)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pricing Breakdown */}
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Item Subtotal:</span>
                  <span>₹{Number(selectedPODetails.totalPurchaseCost || (selectedPODetails.costPerItem * selectedPODetails.quantity)).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Delivery & Freight Charge:</span>
                  <span>+ ₹{Number(selectedPODetails.deliveryCharge || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  <span>Contract Discount:</span>
                  <span>- ₹{Number(selectedPODetails.discount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  borderTop: '1px solid var(--border-medium)',
                  paddingTop: '10px'
                }}>
                  <span>Total Payable Amount:</span>
                  <span>₹{Number(selectedPODetails.finalCost).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {selectedPODetails.notes && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(201, 162, 75, 0.08)',
                  border: '1px solid rgba(201, 162, 75, 0.25)',
                  fontSize: '12px',
                  color: 'var(--text-dark)',
                  marginBottom: '22px'
                }}>
                  <strong>📝 Notes & Instructions:</strong> {selectedPODetails.notes}
                </div>
              )}

              {/* Action Section */}
              {selectedPODetails.status === 'Accepted' || selectedPODetails.acceptanceStatus === 'Accepted' ? (
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        Order Accepted & Confirmed
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong>Accepted Date:</strong> {selectedPODetails.acceptedDateFormatted || selectedPODetails.acceptedAt || 'Recorded'} • Accepted By: {selectedPODetails.acceptedBy || selectedPODetails.supplierName || 'Supplier'}
                      </div>
                    </div>
                  </div>

                  {selectedPODetails.deliveryStatus !== 'Delivered' && (
                    <button
                      type="button"
                      onClick={() => {
                        const po = selectedPODetails;
                        setSelectedPODetails(null);
                        setDispatchingPO(po);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🚚 Mark Dispatched
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '18px 22px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(217, 119, 6, 0.08)',
                  border: '1.5px dashed rgba(217, 119, 6, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#D97706' }}>
                      Action Required: Supplier Acceptance
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Please review the order quantities and pricing before confirming acceptance.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPODetails(null)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-medium)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-dark)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Review Later
                    </button>

                    <button
                      type="button"
                      disabled={isAcceptingPO}
                      onClick={() => handleAcceptPO(selectedPODetails)}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        backgroundColor: isAcceptingPO ? '#9CA3AF' : 'var(--accent-emerald)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '14px',
                        cursor: isAcceptingPO ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)'
                      }}
                    >
                      <span>✓</span> {isAcceptingPO ? 'Accepting...' : 'Accept Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <span style={{ fontSize: '26px' }}>📥</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
              Received Purchase Orders
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
            Orders created by Admin / Inventory Manager for <strong>{loggedInSupplier?.name}</strong>. Accept pending orders to begin fulfillment.
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Received Orders
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
            {mySupplierPurchases.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            From ThreadLine Management
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Awaiting Acceptance
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
            {pendingOrders.length}
          </div>
          <div style={{ fontSize: '12px', color: '#D97706', marginTop: '4px', fontWeight: 600 }}>
            {pendingOrders.length > 0 ? 'Requires Immediate Action' : 'All Orders Accepted'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Accepted & Confirmed
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {acceptedOrders.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            In Fulfillment / Dispatched
          </div>
        </div>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPoFilterStatus('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: poFilterStatus === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
                backgroundColor: poFilterStatus === 'all' ? 'var(--accent-primary)' : 'var(--bg-main)',
                color: poFilterStatus === 'all' ? '#FFFFFF' : 'var(--text-dark)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All ({mySupplierPurchases.length})
            </button>
            <button
              type="button"
              onClick={() => setPoFilterStatus('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: poFilterStatus === 'pending' ? '1px solid #D97706' : '1px solid var(--border-light)',
                backgroundColor: poFilterStatus === 'pending' ? '#D97706' : 'var(--bg-main)',
                color: poFilterStatus === 'pending' ? '#FFFFFF' : '#D97706',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⏳ Pending Acceptance ({pendingOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setPoFilterStatus('accepted')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: poFilterStatus === 'accepted' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-light)',
                backgroundColor: poFilterStatus === 'accepted' ? 'var(--accent-emerald)' : 'var(--bg-main)',
                color: poFilterStatus === 'accepted' ? '#FFFFFF' : 'var(--accent-emerald)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✓ Accepted ({acceptedOrders.length})
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search PO # or Product..."
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-dark)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* PO Table */}
        {filteredOrders.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
            <h4 style={{ margin: 0, color: 'var(--text-dark)' }}>No purchase orders match this view</h4>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {poFilterStatus === 'pending'
                ? 'All received orders have been accepted.'
                : 'Purchase orders issued by ThreadLine management will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>PO Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Issue Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Supplied Item</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Quantity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Total Value</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Acceptance Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Fulfillment</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(po => {
                  const isAccepted = po.status === 'Accepted' || po.acceptanceStatus === 'Accepted';
                  return (
                    <tr
                      key={po.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isAccepted ? 'transparent' : 'rgba(217, 119, 6, 0.03)'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {po.purchaseOrderNo || po.id}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-gray)' }}>
                        {po.purchaseDate}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                          {po.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {po.category} {po.size ? `• ${po.size}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {po.quantity} pcs
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'monospace' }}>
                        ₹{Number(po.finalCost).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isAccepted ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(5, 150, 105, 0.12)',
                              color: 'var(--accent-emerald)'
                            }}>
                              ✓ Accepted
                            </span>
                            {po.acceptedDateFormatted && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {po.acceptedDateFormatted}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(217, 119, 6, 0.15)',
                            color: '#D97706'
                          }}>
                            ⏳ Pending Acceptance
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: po.deliveryStatus === 'Delivered'
                            ? 'rgba(5, 150, 105, 0.1)'
                            : po.deliveryStatus === 'In Transit'
                            ? 'rgba(59, 130, 246, 0.1)'
                            : 'var(--bg-main)',
                          color: po.deliveryStatus === 'Delivered'
                            ? 'var(--accent-emerald)'
                            : po.deliveryStatus === 'In Transit'
                            ? '#2563EB'
                            : 'var(--text-muted)'
                        }}>
                          {po.deliveryStatus || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedPODetails(po)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-medium)',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-dark)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            View Details
                          </button>

                          {!isAccepted && (
                            <button
                              type="button"
                              onClick={() => handleAcceptPO(po)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'var(--accent-emerald)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                              }}
                            >
                              ✓ Accept
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
