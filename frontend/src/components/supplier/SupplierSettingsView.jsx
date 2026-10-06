// frontend/src/components/supplier/SupplierSettingsView.jsx
// Dedicated "Mill Profile & Business Settings" for Logged-In Suppliers
// (Supplied Products and Received Orders removed; Mill Profile & Payment Settlements kept)

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import Toast from '../Toast';
import SupplierPaymentsView from './SupplierPaymentsView';

export default function SupplierSettingsView() {
  const { userEmail, userName, supplierId, supplierName } = useAuth();
  const {
    suppliers = [],
    updateSupplier
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

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'payments'
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const [supplierProfileForm, setSupplierProfileForm] = useState({
    name: '',
    shopName: '',
    contactPerson: '',
    phone: '',
    email: '',
    alternateEmail: '',
    gstNumber: '',
    address: '',
    city: '',
    paymentTerms: '',
    deliveryTime: '',
    productTypes: '',
    bankAccount: '',
    bankIfsc: '',
    upiId: '',
    notes: ''
  });

  const handleOpenEditProfile = () => {
    setSupplierProfileForm({
      name: loggedInSupplier.name || '',
      shopName: loggedInSupplier.shopName || '',
      contactPerson: loggedInSupplier.contactPerson || '',
      phone: loggedInSupplier.phone || '',
      email: loggedInSupplier.email || userEmail || '',
      alternateEmail: loggedInSupplier.alternateEmail || '',
      gstNumber: loggedInSupplier.gstNumber || '33AABCS9988P1Z4',
      address: loggedInSupplier.address || '',
      city: loggedInSupplier.city || 'Tirupur',
      paymentTerms: loggedInSupplier.paymentTerms || '15 Days Credit',
      deliveryTime: loggedInSupplier.deliveryTime || '2 Days',
      productTypes: Array.isArray(loggedInSupplier.productTypes)
        ? loggedInSupplier.productTypes.join(', ')
        : (loggedInSupplier.productTypes || 'Cotton Shirting, T-Shirts, Knitted Fabrics, Yarn'),
      bankAccount: loggedInSupplier.bankAccount || '92402001928371',
      bankIfsc: loggedInSupplier.bankIfsc || 'HDFC0000123',
      upiId: loggedInSupplier.upiId || 'srilakshmimills@okhdfcbank',
      notes: loggedInSupplier.notes || ''
    });
    setShowEditProfileModal(true);
  };

  const handleSaveSupplierProfile = (e) => {
    e.preventDefault();
    if (!supplierProfileForm.name.trim()) {
      showToast('Mill / Company name is required', 'error');
      return;
    }

    const payload = {
      ...supplierProfileForm,
      productTypes: supplierProfileForm.productTypes
        ? supplierProfileForm.productTypes.split(',').map(p => p.trim()).filter(Boolean)
        : []
    };

    if (updateSupplier && loggedInSupplier?.id) {
      updateSupplier(loggedInSupplier.id, payload);
    }

    showToast('Mill Profile and Business Settings updated successfully!', 'success');
    setShowEditProfileModal(false);
  };

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '40px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* EDIT MILL PROFILE MODAL */}
      {showEditProfileModal && (
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
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>⚙️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    Edit Mill Profile & Settings
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Update contact, commercial, and settlement details
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
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

            <form onSubmit={handleSaveSupplierProfile} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Company / Mill Name *
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.name}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, name: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Trade Brand / Shop Name
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.shopName}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, shopName: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Authorized Contact Person
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.contactPerson}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, contactPerson: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.phone}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, phone: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={supplierProfileForm.email}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, email: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Alternate Dispatch Email
                  </label>
                  <input
                    type="email"
                    value={supplierProfileForm.alternateEmail}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, alternateEmail: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    GSTIN / Tax Identification
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.gstNumber}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, gstNumber: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Manufacturing City / Hub
                  </label>
                  <input
                    type="text"
                    value={supplierProfileForm.city}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, city: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Credit / Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 Days Credit, Advance, Net 30"
                    value={supplierProfileForm.paymentTerms}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, paymentTerms: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Standard Dispatch SLA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Days, 48 Hours"
                    value={supplierProfileForm.deliveryTime}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, deliveryTime: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Registered Factory & Mill Address
                  </label>
                  <textarea
                    rows="2"
                    value={supplierProfileForm.address}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, address: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none', resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Bank Account & Settlement Details (A/C No, IFSC, UPI)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={supplierProfileForm.bankAccount}
                      onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, bankAccount: e.target.value })}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                        backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      value={supplierProfileForm.bankIfsc}
                      onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, bankIfsc: e.target.value })}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                        backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="UPI ID"
                      value={supplierProfileForm.upiId}
                      onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, upiId: e.target.value })}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                        backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Internal Business Notes / Certifications
                  </label>
                  <textarea
                    rows="2"
                    value={supplierProfileForm.notes}
                    onChange={(e) => setSupplierProfileForm({ ...supplierProfileForm, notes: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none', resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                    backgroundColor: 'transparent', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    backgroundColor: 'var(--accent-primary)', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(107,30,43,0.25)'
                  }}
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
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
            <span style={{ fontSize: '26px' }}>⚙️</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
              Mill Profile & Settings
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
            Configure your registered mill profile, contact details, dispatch terms, and view settlement statements for <strong>{loggedInSupplier?.name}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenEditProfile}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(107,30,43,0.2)'
          }}
        >
          <span>✏️</span> Edit Profile Details
        </button>
      </div>

      {/* SEGMENTED TABS: PROFILE SETTINGS & PAYMENT SETTLEMENTS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-light)',
        marginBottom: '24px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-gray)',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🏢</span>
          <span>Mill Profile & Contact Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'payments' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'payments' ? 'var(--accent-primary)' : 'var(--text-gray)',
            fontWeight: activeTab === 'payments' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>💳</span>
          <span>Payment Settlements Statement</span>
        </button>
      </div>

      {/* TAB 1: PROFILE DETAILS */}
      {activeTab === 'profile' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1: Mill Identity */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)' }}>
                🏢 Mill Identity & Trade Brand
              </h3>
              <span style={{
                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                backgroundColor: 'rgba(5, 150, 105, 0.12)', color: 'var(--accent-emerald)'
              }}>
                Verified Partner
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Registered Mill Name
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-dark)' }}>
                  {loggedInSupplier?.name}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Trade Brand / Display Name
                </div>
                <div style={{ color: 'var(--text-dark)' }}>
                  {loggedInSupplier?.shopName || 'Sri Lakshmi Spinning & Weaving Works'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Supplier ID
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {loggedInSupplier?.id || 'sup-1'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Manufacturing Hub
                </div>
                <div style={{ color: 'var(--text-dark)' }}>
                  📍 {loggedInSupplier?.city || 'Tirupur, Tamil Nadu'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Details */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)' }}>
                📞 Contact & Address
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Authorized Contact Person
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  {loggedInSupplier?.contactPerson || 'Senthil Kumar (Managing Partner)'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Phone / Mobile
                </div>
                <div style={{ color: 'var(--text-dark)', fontWeight: 600 }}>
                  {loggedInSupplier?.phone || '+91 98422 12345'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Official Email
                </div>
                <div style={{ color: 'var(--text-dark)' }}>
                  {loggedInSupplier?.email || userEmail}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Factory & Dispatch Address
                </div>
                <div style={{ color: 'var(--text-dark)', lineHeight: 1.4 }}>
                  {loggedInSupplier?.address || '142, Palladam Road, Tirupur, Tamil Nadu 641604'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Commercial & Tax */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)' }}>
                🏛️ Commercial & Tax Info
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  GSTIN Number
                </div>
                <div style={{
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  {loggedInSupplier?.gstNumber || '33AABCS9988P1Z4'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Agreed Payment Terms
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  {loggedInSupplier?.paymentTerms || '15 Days Credit'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Dispatch SLA
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  ⏱️ {loggedInSupplier?.deliveryTime || '2 Days'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Bank & Settlement Account
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-dark)' }}>
                  A/C: {loggedInSupplier?.bankAccount || '92402001928371'} • IFSC: {loggedInSupplier?.bankIfsc || 'HDFC0000123'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT SETTLEMENTS */}
      {activeTab === 'payments' && (
        <SupplierPaymentsView />
      )}
    </div>
  );
}
