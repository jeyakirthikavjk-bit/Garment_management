import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';

export default function AddInventory() {
  const navigate = useNavigate();
  const { addProduct } = useArea();
  const { t } = useSettings();
  const [submitted, setSubmitted] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Menswear',
    godown: 'Godown 1 (Main)',
    quantity: '10',
    purchasePrice: '500',
    sellingPrice: '1299'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Call addProduct which automatically checks pending customer requirements!
    const { matchesFound } = addProduct({
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      stock: Number(formData.quantity) || 10,
      price: Number(formData.sellingPrice) || 1299
    });

    setMatchCount(matchesFound || 0);
    setSubmitted(true);
    setTimeout(() => {
      navigate('/inventory');
    }, 1600);
  };

  return (
    <div style={{ paddingTop: '10px', maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)' }}>{t('addInventoryStock', 'Add Inventory Stock')}</div>
        <button 
          onClick={() => navigate('/inventory')}
          style={{ background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-dark)' }}
        >
          {t('backToInventory', '← Back to Inventory')}
        </button>
      </div>

      {submitted && (
        <div style={{ background: 'var(--status-paid-bg)', color: 'var(--status-paid)', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, textAlign: 'center' }}>
          ✓ {t('saveSuccess', 'Stock updated successfully!')} {matchCount > 0 ? `🎯 Auto-matched ${matchCount} pending customer requirement(s)!` : ''}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('itemGarmentName', 'Item / Garment Name')} *</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="e.g. Linen Cotton Shirt - White"
              value={formData.name}
              onChange={handleChange}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('skuStyleCode', 'SKU / Style Code')} *</label>
              <input 
                type="text" 
                name="sku" 
                required 
                placeholder="TS-M-102"
                value={formData.sku}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('category', 'Category')}</label>
              <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%' }}>
                <option value="Menswear">Menswear</option>
                <option value="Womenswear">Womenswear</option>
                <option value="Sarees">Sarees</option>
                <option value="Kids">Kids</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('godownLocation', 'Target Warehouse / Godown')}</label>
              <select name="godown" value={formData.godown} onChange={handleChange} style={{ width: '100%' }}>
                <option value="Godown 1 (Main)">Godown 1 (Main)</option>
                <option value="Godown 2 (Annex)">Godown 2 (Annex)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('stockQuantity', 'Quantity to Add (Pcs)')} *</label>
              <input 
                type="number" 
                name="quantity" 
                required 
                value={formData.quantity}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('purchaseCostPrice', 'Purchase Cost Price (₹)')}</label>
              <input 
                type="number" 
                name="purchasePrice" 
                value={formData.purchasePrice}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{t('sellingPriceLabel', 'Selling Price (₹)')}</label>
              <input 
                type="number" 
                name="sellingPrice" 
                value={formData.sellingPrice}
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>{t('addStockToGodown', '✓ Add Stock to Godown')}</button>
            <button type="button" onClick={() => navigate('/inventory')} style={{ padding: '14px 24px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dark)' }}>{t('cancel', 'Cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
