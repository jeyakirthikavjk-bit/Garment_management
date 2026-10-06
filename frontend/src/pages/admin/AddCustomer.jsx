import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function AddCustomer() {
  const navigate = useNavigate();
  const { t } = useSettings();
  const { areas, addCustomerWithArea } = useArea();
  const { isCustomerRole, userEmail, customerName } = useAuth();

  const [formData, setFormData] = useState({
    name: isCustomerRole ? (customerName || '') : '',
    shopName: '',
    phone: '',
    email: userEmail || '',
    address: '',
    areaId: areas[0]?.id || 'area-1',
    creditLimit: '25000',
    openingBalance: '0',
    notes: ''
  });

  useEffect(() => {
    if (userEmail) {
      setFormData(prev => ({
        ...prev,
        email: userEmail,
        name: isCustomerRole && customerName ? customerName : prev.name
      }));
    }
  }, [userEmail, isCustomerRole, customerName]);

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    // Email is added ONLY if customer is logged in
    const finalData = {
      ...formData
    };

    addCustomerWithArea(finalData);
    setSubmitted(true);

    setTimeout(() => {
      navigate('/customers');
    }, 1200);
  };

  return (
    <div style={{ paddingTop: '10px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)' }}>{t('addNewCustomerKhata', 'Add New Customer (Khata & Territory)')}</div>
        <button
          onClick={() => navigate('/customers')}
          style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-light)', color: 'var(--text-dark)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          {t('backToCustomers', '← Back to Customers')}
        </button>
      </div>

      {submitted && (
        <div style={{ background: 'var(--status-paid-bg)', color: 'var(--status-paid)', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, textAlign: 'center' }}>
          ✓ {t('saveSuccess', 'Customer added successfully and mapped to territory!')}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('customerName', 'Customer Full Name')} *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.name}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('shopBusinessName', 'Shop / Business Name')}</label>
              <input
                type="text"
                name="shopName"
                placeholder="e.g. C.G. Road, Ahmedabad"
                value={formData.shopName}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('phone', 'Phone Number')} *</label>
              <input
                type="text"
                name="phone"
                required
                placeholder="+91 98765 00000"
                value={formData.phone}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('assignedTerritoryArea', 'Assigned Sales Territory / Area')} *</label>
              <select name="areaId" value={formData.areaId} onChange={handleChange} style={{ width: '100%' }}>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    📍 {a.name} ({a.assignedDay})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                {t('email', 'Email Address')}
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter customer email address"
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', background: 'white' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('approvedCreditLimit', 'Approved Credit Limit (₹)')}</label>
              <input
                type="number"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('address', 'Full Customer Address')}</label>
            <textarea
              name="address"
              rows="3"
              placeholder="House / Flat number, street, landmark..."
              value={formData.address}
              onChange={handleChange}
              style={{ width: '100%', resize: 'none' }}
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('openingDueBalance', 'Opening Credit Balance (₹)')}</label>
              <input
                type="number"
                name="openingBalance"
                value={formData.openingBalance}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('territoryNotes', 'Notes / Credit Terms')}</label>
              <input
                type="text"
                name="notes"
                placeholder="e.g. Prefers Cotton fabrics, 30 days credit terms"
                value={formData.notes}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>{t('saveCustomerAccount', 'Save Customer & Map Territory')}</button>
            <button type="button" onClick={() => navigate('/customers')} style={{ padding: '14px 24px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dark)' }}>{t('cancel', 'Cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
