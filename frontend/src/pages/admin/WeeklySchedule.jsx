import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';

export default function WeeklySchedule() {
  const navigate = useNavigate();
  const { areas, customers, updateScheduleDay, clearScheduleDay } = useArea();
  const { t } = useSettings();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [editingDay, setEditingDay] = useState(null);
  const [clearingArea, setClearingArea] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const [editForm, setEditForm] = useState({
    areaId: '',
    targetCollection: 40000
  });

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const openEditModal = (day, currentArea) => {
    setEditingDay(day);
    const initialArea = currentArea || areas[0];
    setEditForm({
      areaId: initialArea ? initialArea.id : '',
      targetCollection: initialArea ? initialArea.targetCollection || 40000 : 40000
    });
  };

  const handleAreaChange = (selectedAreaId) => {
    const selected = areas.find(a => a.id === selectedAreaId);
    setEditForm(prev => ({
      ...prev,
      areaId: selectedAreaId,
      targetCollection: selected ? (selected.targetCollection || prev.targetCollection) : prev.targetCollection
    }));
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!editForm.areaId) {
      showToast('⚠️ Please select a territory area.');
      return;
    }
    updateScheduleDay(editForm.areaId, editingDay, '', Number(editForm.targetCollection));
    setEditingDay(null);
    showToast(`✓ Route schedule for ${editingDay} updated successfully!`);
  };

  const handleUnassignDay = () => {
    const currentArea = areas.find(a => a.assignedDay === editingDay);
    if (currentArea) {
      clearScheduleDay(currentArea.id);
      showToast(`✓ Route schedule for ${editingDay} unassigned.`);
    }
    setEditingDay(null);
  };

  const handleConfirmClear = () => {
    if (!clearingArea) return;
    clearScheduleDay(clearingArea.id);
    showToast(`✓ Route schedule for ${clearingArea.assignedDay} unassigned.`);
    setClearingArea(null);
  };

  const totalWeeklyTarget = areas.reduce((sum, a) => sum + (Number(a.targetCollection) || 0), 0);
  const totalWeeklyCollected = areas.reduce((sum, a) => sum + (Number(a.collectedSoFar) || 0), 0);
  const weeklyProgress = totalWeeklyTarget > 0 ? Math.round((totalWeeklyCollected / totalWeeklyTarget) * 100) : 0;

  const activeEditingArea = areas.find(a => a.id === editForm.areaId);
  const activeEditingCustomers = activeEditingArea ? customers.filter(c => c.areaId === activeEditingArea.id || c.areaName === activeEditingArea.name) : [];
  const activeEditingBalance = activeEditingCustomers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

  return (
    <div>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <ConfirmModal
        isOpen={!!clearingArea}
        title={t('unassign', 'Unassign Day Route')}
        message={`Are you sure you want to clear the scheduled route for ${clearingArea?.assignedDay} (${clearingArea?.name})?`}
        confirmText={t('confirm', 'Unassign Route')}
        onConfirm={handleConfirmClear}
        onCancel={() => setClearingArea(null)}
      />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <span>{t('visualWeeklyPlannerTitle', 'Visual Weekly Visit Planner & Field Route Schedule')}</span>
        <button className="btn-primary" onClick={() => navigate('/area-visit')}>
          <i>🚶</i> {t('startTodayVisit', "Start Today's Field Visit")}
        </button>
      </div>

      {/* Weekly Progress Banner */}
      <div className="hero-banner" style={{ padding: '24px 32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '22px', fontWeight: 700 }}>{t('weeklyTargetProgress', 'Weekly Target Progress')}</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '13.5px', marginTop: '4px' }}>
              {t('target', 'Target')}: <strong>₹{totalWeeklyTarget.toLocaleString('en-IN')}</strong> • {t('collected', 'Collected')}: <strong style={{ color: 'var(--accent-emerald)' }}>₹{totalWeeklyCollected.toLocaleString('en-IN')}</strong>
            </p>
          </div>
          <div style={{ minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              <span>{t('progress', 'Completion')}</span>
              <span>{weeklyProgress}%</span>
            </div>
            <div className="progress-bar-container" style={{ height: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${weeklyProgress}%`, background: 'var(--accent-emerald)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Day Columns Planner Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {daysOfWeek.map(day => {
          const areaForDay = areas.find(a => a.assignedDay === day);
          const dayCustomers = areaForDay ? customers.filter(c => c.areaId === areaForDay.id || c.areaName === areaForDay.name) : [];
          const pct = areaForDay && areaForDay.targetCollection > 0 ? Math.round((areaForDay.collectedSoFar / areaForDay.targetCollection) * 100) : 0;

          return (
            <div key={day} className="card" style={{ borderTop: `4px solid ${areaForDay?.color || 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-terracotta)' }}>{t(day.toLowerCase(), day)}</span>
                  {areaForDay ? (
                    <button
                      type="button"
                      onClick={() => openEditModal(day, areaForDay)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-indigo)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      ✏️ {t('edit', 'Edit Route')}
                    </button>
                  ) : null}
                </div>

                {areaForDay ? (
                  <>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      {areaForDay.name} {areaForDay.code ? `(${areaForDay.code})` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '14px' }}>
                      <strong>{dayCustomers.length} {t('customers', 'Customers')}</strong>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                        <span>{t('targetCollection', 'Collection Target')}</span>
                        <span>₹{Number(areaForDay.targetCollection || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent-emerald)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-gray)', textTransform: 'uppercase' }}>{t('assignedCustomers', 'Assigned Customers')}</span>
                      {dayCustomers.slice(0, 3).map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px dashed var(--border-light)' }}>
                          <span>{c.name}</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-terracotta)' }}>₹{Number(c.balance || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {dayCustomers.length > 3 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-gray)', fontStyle: 'italic', marginTop: '2px' }}>
                          + {dayCustomers.length - 3} {t('moreCustomers', 'more customers')}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-gray)' }}>
                    {t('noRouteAssignedFor', 'No route assigned for')} {t(day.toLowerCase(), day)}.<br />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: '12px', padding: '8px 16px', fontSize: '12px' }}
                      onClick={() => openEditModal(day, null)}
                    >
                      {t('assignAreaRoute', '+ Assign Area Route')}
                    </button>
                  </div>
                )}
              </div>

              {areaForDay && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '16px', padding: '8px', fontSize: '12px' }}
                  onClick={() => navigate(`/area-visit/${areaForDay.id}`)}
                >
                  {t('inspectAreaFieldVisits', 'Inspect Area Field Visits →')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Route Modal */}
      {editingDay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDay(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: '20px',
              padding: '30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              borderRadius: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  🗓️ {t('editRouteSchedule', 'Edit Route Schedule')} — {t(editingDay.toLowerCase(), editingDay)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>
                  {t('assignUpdateTerritory', 'Assign or update the territory route for')} {t(editingDay.toLowerCase(), editingDay)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                style={{
                  background: 'var(--bg-main)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: 'var(--text-gray)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dark)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('targetTerritoryArea', 'Select Territory Area / Route *')}
                </label>
                <select
                  required
                  value={editForm.areaId}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-gold-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-dark)'
                  }}
                >
                  <option value="">{t('chooseTerritoryArea', '-- Choose Territory Area --')}</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code || a.id}) — {t('day', 'Day')}: {a.assignedDay ? t(a.assignedDay.toLowerCase(), a.assignedDay) : t('unassigned', 'Unassigned')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area Preview info box */}
              {activeEditingArea && (
                <div style={{ background: 'var(--bg-main)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-gold-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-gray)', display: 'block' }}>{t('mappedCustomers', 'Mapped Customers')}</span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-dark)' }}>
                      {activeEditingCustomers.length} {activeEditingCustomers.length === 1 ? t('customer', 'Customer') : t('customers', 'Customers')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-gray)', display: 'block' }}>{t('outstandingBalance', 'Outstanding Balance')}</span>
                    <strong style={{ fontSize: '15px', color: 'var(--accent-maroon)' }}>₹{activeEditingBalance.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dark)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('dailyCollectionTarget', 'Daily Collection Target (₹)')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="e.g. 45000"
                  value={editForm.targetCollection}
                  onChange={(e) => setEditForm({ ...editForm, targetCollection: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-gold-subtle)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-dark)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', fontSize: '13px' }}
                >
                  {t('saveSchedule', '💾 Save Schedule')}
                </button>

                {areas.some(a => a.assignedDay === editingDay) && (
                  <button
                    type="button"
                    onClick={handleUnassignDay}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(168, 50, 50, 0.1)',
                      color: 'var(--accent-danger)',
                      border: '1px solid rgba(168, 50, 50, 0.3)',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('unassign', 'Unassign')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  style={{
                    padding: '12px 18px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-gold-subtle)',
                    borderRadius: '10px',
                    fontWeight: 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: 'var(--text-dark)'
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
