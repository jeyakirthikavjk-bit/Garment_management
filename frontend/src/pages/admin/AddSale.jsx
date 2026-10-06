import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import InvoiceModal from '../../components/InvoiceModal';

export default function AddSale() {
  const navigate = useNavigate();
  const { areas, customers, recordFieldSale } = useArea();
  const { t } = useSettings();

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || '1',
    customer: customers[0]?.name || 'Ravi Kumar',
    areaId: areas[0]?.id || 'area-1',
    invoiceNo: `INV-00${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    items: 'Premium Cotton Shirt x 2',
    totalAmount: '2598',
    paymentType: 'Credit'
  });

  const [createdInvoice, setCreatedInvoice] = useState(null);

  const handleCustomerChange = (e) => {
    const custId = Number(e.target.value);
    const selectedCust = customers.find(c => c.id === custId);
    if (selectedCust) {
      setFormData({
        ...formData,
        customerId: custId,
        customer: selectedCust.name,
        areaId: selectedCust.areaId
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.totalAmount) return;

    const newInvObj = {
      id: formData.invoiceNo,
      invoiceNo: formData.invoiceNo,
      customer: formData.customer,
      customerName: formData.customer,
      date: formData.date,
      items: formData.items,
      totalAmount: Number(formData.totalAmount),
      paymentType: formData.paymentType
    };

    recordFieldSale({
      customerId: formData.customerId,
      customerName: formData.customer,
      areaId: formData.areaId,
      items: formData.items,
      totalAmount: formData.totalAmount,
      paymentType: formData.paymentType,
      invoiceNo: formData.invoiceNo
    });

    setCreatedInvoice(newInvObj);
  };

  return (
    <div style={{ paddingTop: '10px', maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
          {t('createFieldSaleInvoice', 'Create Invoice (Field / Manual Sale)')}
        </div>
        <button 
          onClick={() => navigate('/sales')}
          style={{ background: 'var(--card-secondary)', border: '1px solid var(--border-gold-subtle)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-family-base)', fontSize: '13px', color: 'var(--text-dark)' }}
        >
          {t('backToSales', '← Back to POS / Sales')}
        </button>
      </div>

      <div className="card" style={{ border: '1px solid var(--border-gold-subtle)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                {t('invoiceNumber', 'Invoice Number')}
              </label>
              <input type="text" value={formData.invoiceNo} readOnly style={{ width: '100%', background: 'var(--bg-main)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                {t('invoiceDate', 'Invoice Date')}
              </label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                {t('selectCustomer', 'Select Customer')}
              </label>
              <select value={formData.customerId} onChange={handleCustomerChange} style={{ width: '100%' }}>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.areaName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                {t('targetTerritoryArea', 'Target Territory / Area')}
              </label>
              <select value={formData.areaId} onChange={(e) => setFormData({ ...formData, areaId: e.target.value })} style={{ width: '100%' }}>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    📍 {a.name} ({a.assignedDay})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              {t('paymentMode', 'Payment Mode')}
            </label>
            <select value={formData.paymentType} onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })} style={{ width: '100%' }}>
              <option value="Credit">{t('addToKhataCredit', 'Add to Khata Credit')}</option>
              <option value="Cash">{t('spotCashUpi', 'Spot Cash / UPI')}</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              {t('itemsSummary', 'Items Summary')}
            </label>
            <textarea rows="3" value={formData.items} onChange={(e) => setFormData({ ...formData, items: e.target.value })} style={{ width: '100%', resize: 'none' }}></textarea>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              {t('totalInvoiceAmount', 'Total Invoice Amount (₹)')}
            </label>
            <input type="number" value={formData.totalAmount} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} style={{ width: '100%', fontWeight: 700 }} />
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              {t('submitGenerateInvoice', 'Submit & Generate Invoice')}
            </button>
            <button type="button" onClick={() => navigate('/sales')} style={{ padding: '12px 24px', background: 'var(--card-secondary)', border: '1px solid var(--border-gold-subtle)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-dark)', fontFamily: 'var(--font-family-base)' }}>
              {t('cancel', 'Cancel')}
            </button>
          </div>
        </form>
      </div>

      {createdInvoice && (
        <InvoiceModal
          invoice={createdInvoice}
          onClose={() => {
            setCreatedInvoice(null);
            navigate('/sales');
          }}
        />
      )}
    </div>
  );
}
