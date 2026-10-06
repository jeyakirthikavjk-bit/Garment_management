import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Inventory() {
  const navigate = useNavigate();
  const { products, setProducts } = useArea();
  const { t } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [editForm, setEditForm] = useState({ g1: '', g2: '', price: '' });

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({ g1: item.godown1 || 0, g2: item.godown2 || 0, price: item.price });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const g1Num = parseInt(editForm.g1) || 0;
    const g2Num = parseInt(editForm.g2) || 0;
    const totalNum = g1Num + g2Num;
    const updatedStatus = totalNum === 0 ? 'Out of Stock' : totalNum < 10 ? 'Low Stock' : 'In Stock';
    const updatedStatusType = totalNum === 0 ? 'out-of-stock' : totalNum < 10 ? 'low-stock' : 'in-stock';

    setProducts(prev =>
      prev.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              godown1: g1Num,
              godown2: g2Num,
              stock: totalNum,
              price: Number(editForm.price) || item.price,
              status: updatedStatus,
              statusType: updatedStatusType
            }
          : item
      )
    );

    setEditingItem(null);
    showToast(`✓ Warehouse stock levels for "${editingItem.name}" updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    setProducts(prev => prev.filter(i => i.id !== deletingItem.id));
    showToast(`✓ Inventory item "${deletingItem.name}" deleted.`);
    setDeletingItem(null);
  };

  const filtered = products.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedInventory,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filtered, 10);

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingItem}
        title={t('Delete Stock Item', 'Delete Stock Item')}
        message={`Are you sure you want to remove ${deletingItem?.name} (${deletingItem?.sku}) from warehouse inventory?`}
        confirmText={t('Delete Stock Item', 'Delete Stock Item')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)' }}>
        <span>{t('warehouseInventoryTitle', 'Warehouse Inventory Overview & Stock Control')}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/requirements')} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
            🔍 {t('stockRequirementMatcher', 'Stock & Requirement Matcher')}
          </button>
          <button onClick={() => navigate('/inventory/add')} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
            <i>+</i> {t('addStock', 'Add Stock')}
          </button>
        </div>
      </div>

      {/* Top Warehouse KPI Metrics */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🏭</div>
            <div className="kpi-info">
              <h4>{t('totalStockValuation', 'Total Stock Valuation')}</h4>
              <div className="value">₹{products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>📦</div>
            <div className="kpi-info">
              <h4>{t('totalWarehousedPcs', 'Total Warehoused Pcs')}</h4>
              <div className="value">{products.reduce((sum, p) => sum + (p.stock || 0), 0).toLocaleString('en-IN')} Pcs</div>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>👕</div>
            <div className="kpi-info">
              <h4>{t('garmentMasterItems', 'Garment Master Items')}</h4>
              <div className="value">{products.length} SKUs</div>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>⚠️</div>
            <div className="kpi-info">
              <h4>{t('lowStockAlerts', 'Low Stock Alerts')}</h4>
              <div className="value">{products.filter(p => p.stock <= 8).length} Items</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          {t('godownStockLedger', 'Godown Stock Ledger')}
          <input 
            type="text" 
            placeholder={t('searchSkuOrItem', 'Search SKU or item...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', padding: '8px 12px', outline: 'none', fontSize: '12px', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('name', 'Item Name')}</th>
              <th>SKU / Barcode</th>
              <th>{t('godown1Main', 'Godown 1 (Main)')}</th>
              <th>{t('godown2Annex', 'Godown 2 (Annex)')}</th>
              <th>{t('totalLiveStock', 'Total Live Stock')}</th>
              <th>{t('stockValue', 'Stock Value')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInventory.map((item) => (
              <tr key={item.id}>
                <td><div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</div></td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-gray)' }}>{item.sku}</td>
                <td>{item.godown1 || 0} pcs</td>
                <td>{item.godown2 || 0} pcs</td>
                <td>
                  <span style={{ fontWeight: 700, color: item.stock === 0 ? 'var(--icon-red)' : item.stock < 10 ? 'var(--icon-orange)' : 'var(--status-paid)' }}>
                    {item.stock} pcs
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>₹ {(item.price * item.stock).toLocaleString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                      ✏️ {t('editStock', 'Edit Stock')}
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
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

      {/* Edit Stock Modal */}
      {editingItem && (
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
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{t('adjustWarehouseStock', 'Adjust Warehouse Stock')}</div>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--terracotta)' }}>{editingItem.name} ({editingItem.sku})</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('godown1Stock', 'Godown 1 Stock (pcs)')}</label>
                  <input
                    type="number"
                    value={editForm.g1}
                    onChange={(e) => setEditForm({ ...editForm, g1: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('godown2Stock', 'Godown 2 Stock (pcs)')}</label>
                  <input
                    type="number"
                    value={editForm.g2}
                    onChange={(e) => setEditForm({ ...editForm, g2: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('unitSellingPrice', 'Unit Selling Price (₹)')}</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>{t('saveStockLevel', 'Save Stock Level')}</button>
                <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>{t('cancel', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
