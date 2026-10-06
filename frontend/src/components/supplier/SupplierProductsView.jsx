// frontend/src/components/supplier/SupplierProductsView.jsx
// Dedicated "My Supplied Products" Management Catalog for Logged-In Suppliers

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import ConfirmModal from '../ConfirmModal';
import Toast from '../Toast';

export default function SupplierProductsView() {
  const { userEmail, userName, supplierId, supplierName } = useAuth();
  const {
    suppliers = [],
    supplierProducts = [],
    addSupplierProduct,
    updateSupplierProduct,
    deleteSupplierProduct
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

  // Filter supplier products
  const mySupplierProducts = React.useMemo(() => {
    return (supplierProducts || []).filter(sp => {
      if (sp.supplierId === loggedInSupplier.id) return true;
      if (loggedInSupplier.id === 'sup-1' && (sp.supplierId === 'SUP-001' || sp.supplierId === 'sup-1')) return true;
      if (sp.supplierName && loggedInSupplier.name && sp.supplierName.toLowerCase().includes(loggedInSupplier.name.toLowerCase())) return true;
      return false;
    });
  }, [supplierProducts, loggedInSupplier]);

  const [suppProdSearch, setSuppProdSearch] = useState('');
  const [suppProdCategory, setSuppProdCategory] = useState('All');
  const [showAddSuppProdModal, setShowAddSuppProdModal] = useState(false);
  const [editingSuppProd, setEditingSuppProd] = useState(null);
  const [deletingSuppProd, setDeletingSuppProd] = useState(null);

  const initialSuppProdForm = {
    productName: '',
    category: 'Cotton Shirting',
    basePrice: 150,
    unit: 'meters',
    minOrderQty: 20,
    leadTimeDays: 2,
    availability: 'In Stock',
    material: '',
    description: '',
    colorsAvailable: ''
  };
  const [suppProdForm, setSuppProdForm] = useState(initialSuppProdForm);
  const [suppProdErrors, setSuppProdErrors] = useState({});

  const myProductCategories = React.useMemo(() => {
    const cats = new Set(mySupplierProducts.map(p => p.category || 'General Textile'));
    return ['All', ...Array.from(cats)];
  }, [mySupplierProducts]);

  const displayedSupplierProducts = React.useMemo(() => {
    return mySupplierProducts.filter(p => {
      const matchesSearch = !suppProdSearch.trim() ||
        (p.productName && p.productName.toLowerCase().includes(suppProdSearch.toLowerCase())) ||
        (p.material && p.material.toLowerCase().includes(suppProdSearch.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(suppProdSearch.toLowerCase()));
      const matchesCat = suppProdCategory === 'All' || p.category === suppProdCategory;
      return matchesSearch && matchesCat;
    });
  }, [mySupplierProducts, suppProdSearch, suppProdCategory]);

  const handleOpenAddSuppProduct = () => {
    setEditingSuppProd(null);
    setSuppProdForm(initialSuppProdForm);
    setSuppProdErrors({});
    setShowAddSuppProdModal(true);
  };

  const handleOpenEditSuppProduct = (prod) => {
    setEditingSuppProd(prod);
    setSuppProdForm({
      productName: prod.productName || '',
      category: prod.category || 'Cotton Shirting',
      basePrice: prod.basePrice || prod.unitPrice || 150,
      unit: prod.unit || 'meters',
      minOrderQty: prod.minOrderQty || 20,
      leadTimeDays: prod.leadTimeDays || 2,
      availability: prod.availability || 'In Stock',
      material: prod.material || '',
      description: prod.description || '',
      colorsAvailable: Array.isArray(prod.colorsAvailable) ? prod.colorsAvailable.join(', ') : (prod.colorsAvailable || '')
    });
    setSuppProdErrors({});
    setShowAddSuppProdModal(true);
  };

  const handleSaveSuppProduct = (e) => {
    e.preventDefault();
    const errors = {};
    if (!suppProdForm.productName.trim()) errors.productName = 'Product name is required';
    if (!suppProdForm.basePrice || Number(suppProdForm.basePrice) <= 0) errors.basePrice = 'Valid base price is required';

    if (Object.keys(errors).length > 0) {
      setSuppProdErrors(errors);
      return;
    }

    const payload = {
      ...suppProdForm,
      supplierId: loggedInSupplier.id,
      supplierName: loggedInSupplier.name,
      basePrice: Number(suppProdForm.basePrice),
      minOrderQty: Number(suppProdForm.minOrderQty) || 1,
      leadTimeDays: Number(suppProdForm.leadTimeDays) || 2,
      colorsAvailable: suppProdForm.colorsAvailable
        ? suppProdForm.colorsAvailable.split(',').map(c => c.trim()).filter(Boolean)
        : []
    };

    if (editingSuppProd) {
      if (updateSupplierProduct) {
        updateSupplierProduct(editingSuppProd.id, payload);
      }
      showToast(`Updated "${payload.productName}" successfully!`);
    } else {
      if (addSupplierProduct) {
        addSupplierProduct(payload);
      }
      showToast(`Added "${payload.productName}" to your supply catalog!`);
    }

    setShowAddSuppProdModal(false);
  };

  const handleConfirmDeleteSuppProduct = () => {
    if (deletingSuppProd && deleteSupplierProduct) {
      deleteSupplierProduct(deletingSuppProd.id);
      showToast(`Removed "${deletingSuppProd.productName}" from catalog.`);
      setDeletingSuppProd(null);
    }
  };

  const handleToggleStockStatus = (prod) => {
    if (!updateSupplierProduct) return;
    const nextStatus = prod.availability === 'In Stock' ? 'Low Stock' : prod.availability === 'Low Stock' ? 'Out of Stock' : 'In Stock';
    updateSupplierProduct(prod.id, { availability: nextStatus });
    showToast(`"${prod.productName}" marked as ${nextStatus}`);
  };

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '40px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deletingSuppProd}
        title="Remove Product from Catalog"
        message={`Are you sure you want to remove "${deletingSuppProd?.productName}" from your mill catalog?`}
        confirmText="Delete Product"
        onConfirm={handleConfirmDeleteSuppProduct}
        onCancel={() => setDeletingSuppProd(null)}
      />

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddSuppProdModal && (
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
            maxWidth: '600px',
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
                <span style={{ fontSize: '22px' }}>{editingSuppProd ? '✏️' : '📦'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    {editingSuppProd ? 'Edit Supplied Product' : 'Add New Textile / Product'}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {loggedInSupplier?.name} • Supply Catalog
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSuppProdModal(false)}
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

            <form onSubmit={handleSaveSuppProduct} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Product / Fabric Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 180 GSM Bio-Washed Combed Cotton T-Shirt"
                    value={suppProdForm.productName}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, productName: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                  {suppProdErrors.productName && (
                    <div style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '4px' }}>
                      {suppProdErrors.productName}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={suppProdForm.category}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, category: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  >
                    <option value="Cotton Shirting">Cotton Shirting</option>
                    <option value="T-Shirts">T-Shirts</option>
                    <option value="Knitted Fabrics">Knitted Fabrics</option>
                    <option value="Yarn">Yarn</option>
                    <option value="Sarees">Sarees</option>
                    <option value="Linen & Blends">Linen & Blends</option>
                    <option value="General Textile">General Textile</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Supply Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={suppProdForm.basePrice}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, basePrice: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                  {suppProdErrors.basePrice && (
                    <div style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '4px' }}>
                      {suppProdErrors.basePrice}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Unit of Measurement
                  </label>
                  <select
                    value={suppProdForm.unit}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, unit: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  >
                    <option value="meters">Meters (Rolls)</option>
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms (Yarn)</option>
                    <option value="bundles">Bundles</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Min Order Quantity (MOQ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={suppProdForm.minOrderQty}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, minOrderQty: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Lead Time (Days to Dispatch)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={suppProdForm.leadTimeDays}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, leadTimeDays: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Stock Availability
                  </label>
                  <select
                    value={suppProdForm.availability}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, availability: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  >
                    <option value="In Stock">In Stock (Immediate Dispatch)</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock / Made to Order</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Material / Yarn Specifications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Combed Cotton, 60s Compact Yarn"
                    value={suppProdForm.material}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, material: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Available Shades / Colors (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pure White, Sky Blue, Navy Blue, Charcoal"
                    value={suppProdForm.colorsAvailable}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, colorsAvailable: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Detailed Quality Notes / Description
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Provide thread count, weave details, finishing standards, or bulk pricing notes..."
                    value={suppProdForm.description}
                    onChange={(e) => setSuppProdForm({ ...suppProdForm, description: e.target.value })}
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
                  onClick={() => setShowAddSuppProdModal(false)}
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
                  {editingSuppProd ? 'Save Changes' : 'Add to Catalog'}
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
            <span style={{ fontSize: '26px' }}>👕</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-serif)' }}>
              My Supplied Products
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-gray)' }}>
            Manage fabric varieties, garment lines, prices, and specifications supplied by <strong>{loggedInSupplier?.name}</strong> to ThreadLine Garments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddSuppProduct}
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
            boxShadow: '0 4px 12px rgba(107, 30, 43, 0.25)'
          }}
        >
          <span>+</span> Add New Supplied Product
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
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
            Total Catalog Products
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '4px' }}>
            {mySupplierProducts.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', marginTop: '4px', fontWeight: 600 }}>
            Active in Supply Agreement
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
            In Stock Products
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {mySupplierProducts.filter(p => p.availability === 'In Stock').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Immediate Dispatch Available
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
            Product Categories
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
            {Math.max(1, myProductCategories.length - 1)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fabrics, Shirting, Yarns, Knits
          </div>
        </div>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border-light)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search your supplied fabrics, products, or materials..."
              value={suppProdSearch}
              onChange={(e) => setSuppProdSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
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

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {myProductCategories.map(cat => {
            const isSelected = suppProdCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSuppProdCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-main)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-dark)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {displayedSupplierProducts.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-dark)' }}>
            {suppProdSearch || suppProdCategory !== 'All' ? 'No products match your search' : 'No products listed yet'}
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', marginInline: 'auto' }}>
            {suppProdSearch || suppProdCategory !== 'All'
              ? 'Try clearing the search filter or category selection.'
              : 'Click below to add your first textile, yarn, or garment supply product for ThreadLine Garments.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddSuppProduct}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Add Your First Product
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {displayedSupplierProducts.map(prod => (
            <div
              key={prod.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              <div>
                {/* Category tag & Stock Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(107, 30, 43, 0.08)',
                    color: 'var(--accent-primary)'
                  }}>
                    {prod.category || 'General Textile'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleStockStatus(prod)}
                    title="Click to toggle stock status"
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: prod.availability === 'In Stock'
                        ? 'rgba(5, 150, 105, 0.12)'
                        : prod.availability === 'Low Stock'
                        ? 'rgba(217, 119, 6, 0.15)'
                        : 'rgba(225, 29, 72, 0.12)',
                      color: prod.availability === 'In Stock'
                        ? 'var(--accent-emerald)'
                        : prod.availability === 'Low Stock'
                        ? '#D97706'
                        : 'var(--accent-danger)'
                    }}
                  >
                    ● {prod.availability || 'In Stock'} ⟳
                  </button>
                </div>

                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  lineHeight: 1.3
                }}>
                  {prod.productName}
                </h4>

                {prod.material && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    🧵 <strong>Specs:</strong> {prod.material}
                  </div>
                )}

                {prod.description && (
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '12px',
                    color: 'var(--text-gray)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {prod.description}
                  </p>
                )}

                {prod.colorsAvailable && (Array.isArray(prod.colorsAvailable) ? prod.colorsAvailable.length > 0 : !!prod.colorsAvailable) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                    {(Array.isArray(prod.colorsAvailable) ? prod.colorsAvailable : String(prod.colorsAvailable).split(',')).slice(0, 4).map((c, i) => (
                      <span key={i} style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-light)'
                      }}>
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price & Actions Row */}
              <div style={{
                borderTop: '1px solid var(--border-light)',
                paddingTop: '14px',
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Base Price
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    ₹{Number(prod.basePrice || prod.unitPrice || 0).toLocaleString('en-IN')}{' '}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      / {prod.unit || 'meter'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                    MOQ: {prod.minOrderQty || 1} {prod.unit || 'units'} • Lead: {prod.leadTimeDays || 2}d
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditSuppProduct(prod)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingSuppProd(prod)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(225, 29, 72, 0.3)',
                      backgroundColor: 'rgba(225, 29, 72, 0.05)',
                      color: 'var(--accent-danger)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
