import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function AreaManagement() {
  const navigate = useNavigate();
  const { areas, customers, addArea, updateArea, deleteArea } = useArea();
  const { t } = useSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState('All Days');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Edit Area state
  const [editingArea, setEditingArea] = useState(null);
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    assignedDay: 'Monday',
    targetCollection: 35000
  });

  // Delete Area state
  const [deletingArea, setDeletingArea] = useState(null);

  const [newAreaForm, setNewAreaForm] = useState({
    code: '',
    name: '',
    assignedDay: 'Monday',
    targetCollection: 35000
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAreaForm.name) return;
    addArea(newAreaForm);
    setShowAddModal(false);
    showToast(`✓ Territory Area "${newAreaForm.name}" created successfully!`);
    setNewAreaForm({
      code: '',
      name: '',
      assignedDay: 'Monday',
      targetCollection: 35000
    });
  };

  const handleOpenEdit = (area) => {
    setEditingArea(area);
    setEditForm({
      code: area.code,
      name: area.name,
      assignedDay: area.assignedDay,
      targetCollection: area.targetCollection
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingArea) return;
    updateArea(editingArea.id, editForm);
    setEditingArea(null);
    showToast(`✓ Territory Area "${editForm.name}" updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingArea) return;
    deleteArea(deletingArea.id);
    showToast(`✓ Territory Area "${deletingArea.name}" deleted.`, 'error');
    setDeletingArea(null);
  };

  const filteredAreas = areas.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = dayFilter === 'All Days' || a.assignedDay === dayFilter;
    return matchesSearch && matchesDay;
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedAreas,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredAreas, 8);

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalCustomers = customers.length;
  const monThuAreas = areas.filter(a => ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(a.assignedDay));

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!deletingArea}
        title={t('Delete Area', 'Delete Territory Area')}
        message={`Are you sure you want to delete ${deletingArea?.name} (${deletingArea?.code})? Customers in this area will need to be re-assigned.`}
        confirmText={t('delete', 'Delete Area')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingArea(null)}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)' }}>
            {t('areaManagementTitle', 'Area & Route Management')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
            {t('areaManagementSub', 'Manage weekly field territories, customer routes, and daily targets')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/area-schedule')}
            style={{
              padding: '10px 18px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📅 {t('viewWeeklyPlanner', 'View Weekly Planner')}
          </button>
          <button
            className="btn-generate"
            onClick={() => setShowAddModal(true)}
            style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}
          >
            <i>+</i> {t('addNewArea', 'Add New Area')}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>📍</div>
            <div className="kpi-info">
              <h4>{t('totalSalesAreas', 'Total Sales Areas')}</h4>
              <div className="value" style={{ fontSize: '28px' }}>{areas.length}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>📅</div>
            <div className="kpi-info">
              <h4>{t('monThuRoutes', 'Mon-Thu Core Routes')}</h4>
              <div className="value" style={{ fontSize: '28px' }}>{monThuAreas.length}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>👥</div>
            <div className="kpi-info">
              <h4>{t('mappedCustomers', 'Mapped Customers')}</h4>
              <div className="value" style={{ fontSize: '28px' }}>{totalCustomers}</div>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '24px' }}>
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>💸</div>
            <div className="kpi-info">
              <h4>{t('totalAreaBalance', 'Total Area Balance')}</h4>
              <div className="value" style={{ fontSize: '28px' }}>₹ {totalOutstanding.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Areas Table Card */}
      <div className="card">
        <div className="card-title">
          {t('allFieldTerritories', 'All Field Sales Territories')}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder={t('searchAreaCode', 'Search area, code...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: '1px solid var(--border-gold-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                outline: 'none',
                fontSize: '12px',
                background: 'var(--bg-main)',
                color: 'var(--text-dark)'
              }}
            />
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              style={{
                border: '1px solid var(--border-gold-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                outline: 'none',
                fontSize: '12px',
                color: 'var(--text-dark)',
                background: 'var(--bg-main)'
              }}
            >
              <option value="All Days">{t('allDays', 'All Days')}</option>
              <option value="Monday">{t('monday', 'Monday')}</option>
              <option value="Tuesday">{t('tuesday', 'Tuesday')}</option>
              <option value="Wednesday">{t('wednesday', 'Wednesday')}</option>
              <option value="Thursday">{t('thursday', 'Thursday')}</option>
              <option value="Friday">{t('friday', 'Friday')}</option>
              <option value="Saturday">{t('saturday', 'Saturday')}</option>
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('areaCode', 'Area Code')}</th>
              <th>{t('areaName', 'Area Name')}</th>
              <th>{t('scheduledDay', 'Scheduled Day')}</th>
              <th>{t('mappedCustomers', 'Mapped Customers')}</th>
              <th>{t('outstandingCredit', 'Outstanding Balance')}</th>
              <th>{t('dailyTarget', 'Daily Target')}</th>
              <th>{t('progress', 'Progress')}</th>
              <th>{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAreas.map((area) => {
              const areaCusts = customers.filter(c => c.areaId === area.id || c.areaName === area.name);
              const mappedCount = areaCusts.length;
              const actualBalance = areaCusts.reduce((sum, c) => sum + (c.balance || 0), 0);
              const progressPct = area.targetCollection > 0
                ? Math.min(100, Math.round((area.collectedSoFar / area.targetCollection) * 100))
                : 0;

              return (
                <tr key={area.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--terracotta)', fontSize: '13px' }}>
                      {area.code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{area.name}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(area.assignedDay)
                          ? 'var(--icon-blue-bg)'
                          : 'var(--border-light)',
                        color: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(area.assignedDay)
                          ? 'var(--icon-blue)'
                          : 'var(--text-gray)'
                      }}
                    >
                      {t(area.assignedDay.toLowerCase(), area.assignedDay)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{mappedCount} {t('customers', 'Customers')}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: actualBalance > 50000 ? 'var(--icon-red)' : 'var(--text-dark)' }}>
                    ₹ {actualBalance.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    ₹ {area.targetCollection.toLocaleString('en-IN')}
                  </td>
                  <td style={{ width: '140px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>₹{area.collectedSoFar.toLocaleString('en-IN')}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--icon-green)', borderRadius: '3px' }}></div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => navigate(`/area-visit/${area.id}`)}
                        style={{
                          background: 'var(--terracotta-light)',
                          color: 'var(--terracotta)',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {t('visitAction', 'Visit →')}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(area)}
                        style={{
                          background: 'var(--icon-blue-bg)',
                          color: 'var(--icon-blue)',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ {t('edit', 'Edit')}
                      </button>
                      <button
                        onClick={() => setDeletingArea(area)}
                        style={{
                          background: 'var(--icon-red-bg)',
                          color: 'var(--icon-red)',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ {t('delete', 'Delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
          pageSizeOptions={[4, 8, 16, 32]}
        />
      </div>

      {/* Add New Area Modal */}
      {showAddModal && (
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: '20px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-dark)' }}>{t('addNewTerritoryArea', 'Add New Territory Area')}</div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('areaCodeLabel', 'Area Code')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. NAV-01"
                  value={newAreaForm.code}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, code: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('areaRouteNameLabel', 'Area / Route Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paldi & Bhatta"
                  value={newAreaForm.name}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('assignedDayLabel', 'Assigned Day')}
                </label>
                <select
                  value={newAreaForm.assignedDay}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, assignedDay: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                >
                  <option value="Monday">{t('monday', 'Monday')}</option>
                  <option value="Tuesday">{t('tuesday', 'Tuesday')}</option>
                  <option value="Wednesday">{t('wednesday', 'Wednesday')}</option>
                  <option value="Thursday">{t('thursday', 'Thursday')}</option>
                  <option value="Friday">{t('friday', 'Friday')}</option>
                  <option value="Saturday">{t('saturday', 'Saturday')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('targetDailyCollection', 'Target Daily Collection (₹)')}
                </label>
                <input
                  type="number"
                  value={newAreaForm.targetCollection}
                  onChange={(e) => setNewAreaForm({ ...newAreaForm, targetCollection: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {t('createArea', 'Create Area')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-gold-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-dark)',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Area Modal */}
      {editingArea && (
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: '20px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-dark)' }}>{t('editTerritoryArea', 'Edit Territory Area')}</div>
              <button
                onClick={() => setEditingArea(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('areaCodeLabel', 'Area Code')}
                </label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('areaRouteNameLabel', 'Area / Route Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('assignedDayLabel', 'Assigned Day')}
                </label>
                <select
                  value={editForm.assignedDay}
                  onChange={(e) => setEditForm({ ...editForm, assignedDay: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                >
                  <option value="Monday">{t('monday', 'Monday')}</option>
                  <option value="Tuesday">{t('tuesday', 'Tuesday')}</option>
                  <option value="Wednesday">{t('wednesday', 'Wednesday')}</option>
                  <option value="Thursday">{t('thursday', 'Thursday')}</option>
                  <option value="Friday">{t('friday', 'Friday')}</option>
                  <option value="Saturday">{t('saturday', 'Saturday')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {t('targetDailyCollection', 'Target Daily Collection (₹)')}
                </label>
                <input
                  type="number"
                  value={editForm.targetCollection}
                  onChange={(e) => setEditForm({ ...editForm, targetCollection: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {t('saveChanges', 'Save Changes')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingArea(null)}
                  style={{
                    padding: '12px 20px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-gold-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-dark)',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
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
