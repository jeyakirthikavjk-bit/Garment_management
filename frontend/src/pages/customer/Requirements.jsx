import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

const GARMENT_CATEGORIES = [
  'Silk & Sarees',
  'Suits & Salwar Sets',
  'Designer Kurtis',
  'Lehenga & Bridal',
  'Menswear & Kurta',
  'Tailored Blazers',
  'Fabrics & Yardage',
  'Kids Ethnic',
  'Western & Fusion',
  'Other / Bespoke'
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size', 'Custom Tailored'];

const POPULAR_COLORS = [
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Maroon / Crimson', hex: '#881337' },
  { name: 'Emerald Green', hex: '#065F46' },
  { name: 'Mustard Gold', hex: '#D97706' },
  { name: 'Royal Purple', hex: '#6B21A8' },
  { name: 'Dusty Rose / Pink', hex: '#DB2777' },
  { name: 'Classic Black', hex: '#18181B' },
  { name: 'Ivory / Off-White', hex: '#E2E8F0' }
];

export default function Requirements() {
  const navigate = useNavigate();
  const {
    customers,
    products,
    requirements,
    saveCustomerRequirement,
    updateRequirementStatus,
    updateRequirement,
    deleteRequirement,
    fulfillRequirement
  } = useArea();

  const { isCustomerRole, customerId, customerName, userEmail } = useAuth();
  const { t } = useSettings();

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReqForStatus, setSelectedReqForStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reqToDelete, setReqToDelete] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  // Status update form state
  const [statusForm, setStatusForm] = useState({
    status: 'Pending Review',
    sellerNotes: '',
    estimatedDelivery: ''
  });

  // Current customer profile resolution for Customer Role
  const myCustomer = (customers || []).find(c =>
    c && (
      c.id === Number(customerId) ||
      (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
      (c.phone && userEmail && userEmail.replace(/\D/g, '').length >= 6 && c.phone.replace(/\D/g, '').includes(userEmail.replace(/\D/g, ''))) ||
      (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
    )
  ) || {
    id: customerId || 1,
    name: customerName || (userEmail ? userEmail.split('@')[0] : 'Ravi Kumar'),
    shopName: customerName ? `${customerName}'s Boutique` : 'Ravi Textiles & Sarees',
    email: userEmail || 'ravi.k@gmail.com',
    phone: '+91 98765 43210',
    areaName: 'Navrangpura',
    balance: 0,
    creditLimit: 50000,
    purchases: 45000,
    status: 'Clear',
    statusType: 'clear'
  };

  // Requirement form state
  const initialFormState = {
    customerId: isCustomerRole ? myCustomer.id : (customers?.[0]?.id || 1),
    customerName: isCustomerRole ? myCustomer.name : (customers?.[0]?.name || ''),
    shopName: isCustomerRole ? myCustomer.shopName : (customers?.[0]?.shopName || ''),
    phone: isCustomerRole ? myCustomer.phone : (customers?.[0]?.phone || ''),
    area: isCustomerRole ? myCustomer.areaName : (customers?.[0]?.areaName || 'Navrangpura'),
    garment: '',
    category: 'Silk & Sarees',
    fabric: '',
    size: 'M',
    color: 'Navy Blue',
    budget: '',
    quantity: 1,
    urgency: 'Normal',
    requirementDate: '',
    deliveryDate: '',
    measurements: '',
    notes: '',
    samplePhoto: null
  };

  const [form, setForm] = useState(initialFormState);
  const formData = form;
  const setFormData = setForm;

  const handleCustomerSelectChange = (targetId) => {
    const cust = (customers || []).find(c => c && c.id === Number(targetId));
    if (cust) {
      setForm(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        shopName: cust.shopName || '',
        phone: cust.phone || '',
        area: cust.areaName || ''
      }));
    }
  };
  const handleCustomerSelectInForm = handleCustomerSelectChange;

  const allAreas = useMemo(() => {
    const list = [...new Set((customers || []).map(c => c?.areaName).filter(Boolean))];
    return list.sort();
  }, [customers]);

  // Handle image upload & preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('⚠️ Image file must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, samplePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return (requirements || []).filter(req => {
      if (!req) return false;
      if (isCustomerRole) {
        const isMyReq = req.customerId === Number(customerId) ||
          (req.customer && customerName && req.customer.toLowerCase() === customerName.toLowerCase()) ||
          (userEmail && req.email && req.email.toLowerCase() === userEmail.toLowerCase());
        if (!isMyReq) return false;
      }

      const reqStatus = String(req.status || '').toLowerCase();
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Pending' && !reqStatus.includes('pending')) return false;
        if (statusFilter === 'Sourced' && !reqStatus.includes('sourced')) return false;
        if (statusFilter === 'Stitching' && !reqStatus.includes('stitching')) return false;
        if (statusFilter === 'Available' && !reqStatus.includes('available') && !reqStatus.includes('ready')) return false;
        if (statusFilter === 'Fulfilled' && !reqStatus.includes('fulfilled')) return false;
      }

      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) {
        return false;
      }

      const reqArea = req.area || req.areaName || '';
      if (areaFilter !== 'ALL' && reqArea !== areaFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCustomer = req.customer?.toLowerCase().includes(term);
        const matchGarment = req.garment?.toLowerCase().includes(term);
        const matchArea = reqArea.toLowerCase().includes(term);
        const matchPhone = req.phone?.includes(term);
        const matchNotes = req.notes?.toLowerCase().includes(term);
        if (!matchCustomer && !matchGarment && !matchArea && !matchPhone && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [requirements, isCustomerRole, customerId, customerName, userEmail, statusFilter, urgencyFilter, areaFilter, searchTerm]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedRequirements,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredRequirements, 9);

  // Aggregate Metrics
  const totalCount = filteredRequirements.length;
  const pendingCount = filteredRequirements.filter(r => String(r?.status || '').includes('Pending')).length;
  const inProgressCount = filteredRequirements.filter(r => String(r?.status || '').includes('Sourced') || String(r?.status || '').includes('Stitching')).length;
  const availableCount = filteredRequirements.filter(r => String(r?.status || '').includes('Available') || String(r?.status || '').includes('Ready')).length;
  const fulfilledCount = filteredRequirements.filter(r => String(r?.status || '').includes('Fulfilled')).length;
  const totalPipelineValue = filteredRequirements.reduce((sum, r) => sum + (Number(r?.budget || 0) * Number(r?.quantity || 1)), 0);

  const handleOpenAddModal = () => {
    setForm({
      ...initialFormState,
      customerId: isCustomerRole ? myCustomer.id : (customers?.[0]?.id || 1),
      customerName: isCustomerRole ? myCustomer.name : (customers?.[0]?.name || ''),
      shopName: isCustomerRole ? myCustomer.shopName : (customers?.[0]?.shopName || ''),
      phone: isCustomerRole ? myCustomer.phone : (customers?.[0]?.phone || ''),
      area: isCustomerRole ? myCustomer.areaName : (customers?.[0]?.areaName || 'Navrangpura')
    });
    setShowAddModal(true);
  };

  const handleSubmitRequirement = (e) => {
    e.preventDefault();
    if (!form.garment || !form.garment.trim()) {
      showToast('⚠️ Please specify garment description', 'error');
      return;
    }

    const created = saveCustomerRequirement({
      customerId: form.customerId,
      customer: form.customerName,
      customerName: form.customerName,
      shopName: form.shopName,
      phone: form.phone,
      area: form.area,
      areaName: form.area,
      garment: form.garment.trim(),
      category: form.category || 'Silk & Sarees',
      fabric: form.fabric || '',
      size: form.size || 'M',
      color: form.color || 'Navy Blue',
      budget: Number(form.budget) || 2500,
      quantity: Number(form.quantity) || 1,
      urgency: form.urgency || 'Normal',
      requirementDate: form.requirementDate || form.deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      deliveryDate: form.deliveryDate || form.requirementDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      measurements: form.measurements || '',
      notes: form.notes || '',
      photo: form.samplePhoto || null,
      status: 'Pending Review'
    });

    setShowAddModal(false);
    setForm({
      ...initialFormState,
      customerId: isCustomerRole ? myCustomer.id : (customers?.[0]?.id || 1),
      customerName: isCustomerRole ? myCustomer.name : (customers?.[0]?.name || ''),
      shopName: isCustomerRole ? myCustomer.shopName : (customers?.[0]?.shopName || ''),
      phone: isCustomerRole ? myCustomer.phone : (customers?.[0]?.phone || ''),
      area: isCustomerRole ? myCustomer.areaName : (customers?.[0]?.areaName || 'Navrangpura')
    });

    const garmentName = created?.garment || form.garment;
    const custName = created?.customer || form.customerName;
    if (isCustomerRole) {
      showToast(`✓ Requirement for "${garmentName}" submitted to ThreadLine seller!`);
    } else {
      showToast(`✓ Requirement for ${custName} (${garmentName}) saved!`);
    }
  };

  const handleOpenStatusModal = (req) => {
    setSelectedReqForStatus(req);
    setStatusForm({
      status: req?.status || 'Pending Review',
      sellerNotes: req?.sellerNotes || '',
      estimatedDelivery: req?.deliveryDate || ''
    });
    setShowStatusModal(true);
  };

  const handleSaveStatusUpdate = (e) => {
    e.preventDefault();
    if (!selectedReqForStatus) return;

    updateRequirementStatus(
      selectedReqForStatus.id,
      statusForm.status,
      statusForm.sellerNotes,
      statusForm.estimatedDelivery
    );

    setShowStatusModal(false);
    showToast(`✓ Updated requirement status for "${selectedReqForStatus.customer}" to ${statusForm.status}`);
  };

  const handleQuickFulfill = (req) => {
    if (!req) return;
    fulfillRequirement(req.id);
    showToast(`✓ Requirement "${req.garment}" fulfilled & customer notified!`);
  };

  const handleConfirmDelete = () => {
    if (!reqToDelete) return;
    deleteRequirement(reqToDelete.id);
    setShowDeleteModal(false);
    showToast(`✓ Requirement "${reqToDelete.garment}" removed.`);
    setReqToDelete(null);
  };

  const handleCreateSaleFromReq = (req) => {
    if (!req) return;
    navigate('/sales', {
      state: {
        prefillCustomer: req.customer,
        prefillCustomerId: req.customerId,
        prefillItem: `${req.garment} (${req.size}, ${req.color})`,
        prefillAmount: Number(req.budget || 2500) * Number(req.quantity || 1)
      }
    });
  };

  const getStatusBadge = (status) => {
    const s = String(status || '');
    if (s === 'Available' || s === 'Ready for Delivery' || s.includes('Ready')) {
      return { label: `✨ ${t('readyInInventory', 'Stock Match Found')}`, bg: 'var(--status-paid-bg)', color: 'var(--status-paid)', border: 'var(--status-paid)' };
    }
    if (s === 'Fabric Sourced' || s.includes('Sourced')) {
      return { label: `🧶 ${t('inProductionSourced', 'Fabric Sourced')}`, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange)', border: 'var(--icon-orange)' };
    }
    if (s === 'In Stitching' || s.includes('Stitching') || s.includes('Transit') || s.includes('Procurement')) {
      return { label: `🚚 ${t('underFabricStitching', 'In Transit / Sourcing')}`, bg: 'var(--icon-blue-bg)', color: 'var(--icon-blue)', border: 'var(--icon-blue)' };
    }
    if (s.includes('Fulfilled')) {
      return { label: `✓ ${t('alreadyFulfilled', 'Fulfilled & Ready')}`, bg: 'var(--icon-teal-bg)', color: 'var(--icon-teal)', border: 'var(--icon-teal)' };
    }
    if (s === 'Cancelled') {
      return { label: `✕ ${t('cancel', 'Cancelled')}`, bg: 'var(--icon-red-bg)', color: 'var(--icon-red)', border: 'var(--icon-red)' };
    }
    return { label: `⏳ ${t('pendingReview', 'Pending Review')}`, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple)', border: 'var(--icon-purple)' };
  };

  const getUrgencyBadge = (urgency) => {
    if (urgency === 'Urgent') {
      return { label: `🔥 ${t('statusOverdue', 'Urgent')}`, bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' };
    }
    if (urgency === 'High') {
      return { label: `⚡ ${t('highRiskDebtors', 'High')}`, bg: 'rgba(245, 158, 11, 0.15)', color: '#D97706' };
    }
    return { label: `🟢 ${t('statusActive', 'Normal')}`, bg: 'rgba(16, 185, 129, 0.15)', color: '#059669' };
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📋</span>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                {isCustomerRole ? t('myGarmentRequirements', 'My Garment Requirements & Restock Orders') : t('pageRequirementsTitle', 'Customer Requirements & Restock Center')}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                {isCustomerRole
                  ? t('customerReqInStockMsg', 'Request out-of-stock garments, bulk lot restocks, or catalog items. Procured directly from wholesale mills.')
                  : t('pageRequirementsSub', 'Real-time pipeline of wholesale customer requests, supplier sourcing, godown shipments, and warehouse restock matches.')}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', fontSize: '14px', fontWeight: 600 }}
          >
            <span>+</span> {isCustomerRole ? t('submitNewRequirement', 'Submit Stock Requirement') : t('logCustomerRequirementBtn', 'Log Customer Requirement')}
          </button>
        </div>
      </div>

      {/* KPI Metric Overview */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>📋</div>
          <div className="kpi-info">
            <h4>{isCustomerRole ? t('totalRequests', 'Total Requests') : t('totalCustomerDemands', 'Total Customer Demands')}</h4>
            <div className="value">{totalCount}</div>
            <div className="sub">{inProgressCount} {t('inProductionCount', 'in procurement')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>⏳</div>
          <div className="kpi-info">
            <h4>{t('pendingReview', 'Pending Review')}</h4>
            <div className="value" style={{ color: pendingCount > 0 ? 'var(--icon-orange)' : 'inherit' }}>{pendingCount}</div>
            <div className="sub">{t('awaitingConfirmation', 'Awaiting confirmation')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🚚</div>
          <div className="kpi-info">
            <h4>{t('inProductionSourced', 'In Procurement / Sourced')}</h4>
            <div className="value" style={{ color: 'var(--icon-blue)' }}>{inProgressCount}</div>
            <div className="sub">{t('underFabricStitching', 'Procuring from wholesale mills')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>✨</div>
          <div className="kpi-info">
            <h4>{t('warehouseMatches', 'Warehouse Matches')}</h4>
            <div className="value" style={{ color: 'var(--status-paid)' }}>{availableCount}</div>
            <div className="sub">{t('readyInInventory', 'Ready in inventory')}</div>
          </div>
        </div>

        {!isCustomerRole && (
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--icon-teal-bg)', color: 'var(--icon-teal)' }}>💰</div>
            <div className="kpi-info">
              <h4>{t('demandPipeline', 'Demand Pipeline')}</h4>
              <div className="value" style={{ fontSize: '20px' }}>₹{totalPipelineValue.toLocaleString('en-IN')}</div>
              <div className="sub">{fulfilledCount} {t('alreadyFulfilled', 'already fulfilled')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Warehouse Stock Match Banner for Seller */}
      {!isCustomerRole && availableCount > 0 && (
        <div
          className="hero-banner"
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #0D9488 100%)',
            padding: '20px 28px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(6, 95, 70, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 800, opacity: 0.9 }}>
                {t('autoInventoryMatchDetected', '⚡ Automatic Inventory Match Detected')}
              </div>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: '20px', fontWeight: 700, margin: '4px 0', color: '#FFFFFF' }}>
                ✨ {availableCount} {t('customerReqInStockMsg', 'Customer Requirement(s) Now In Stock in Warehouse!')}
              </h3>
              <p style={{ fontSize: '13px', margin: 0, opacity: 0.95, color: '#F0FDF4' }}>
                {t('matchFoundHelp', 'Warehouse stock matches registered customer requests. You can fulfill, dispatch orders, or issue instant sales invoices.')}
              </p>
            </div>
            <button
              onClick={() => setStatusFilter('Available')}
              style={{
                background: '#FFFFFF',
                color: '#065F46',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {t('warehouseMatches', 'Filter Matched Requests')} ({availableCount})
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              placeholder={t('searchGarmentsPlaceholder', 'Search requirements, customer, garment, area, phone...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-main)',
                fontSize: '13px',
                color: 'var(--text-dark)'
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-gray)' }}>🔍</span>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['ALL', 'Pending', 'Sourced', 'In Transit', 'Available', 'Fulfilled'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '7px 13px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: statusFilter === tab ? 700 : 500,
                  background: statusFilter === tab ? 'var(--accent-terracotta)' : 'transparent',
                  color: statusFilter === tab ? '#FFFFFF' : 'var(--text-gray)',
                  border: statusFilter === tab ? 'none' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab === 'ALL' ? t('all', 'All Requests') : t(tab, tab)}
              </button>
            ))}
          </div>

          {/* Urgency & Area Selectors */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
            >
              <option value="ALL">{t('all', 'All Urgency')}</option>
              <option value="Urgent">🔥 {t('statusOverdue', 'Urgent Only')}</option>
              <option value="High">⚡ {t('highRiskDebtors', 'High')}</option>
              <option value="Normal">🟢 {t('statusActive', 'Normal')}</option>
            </select>

            {!isCustomerRole && allAreas.length > 0 && (
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
              >
                <option value="ALL">{t('allAreas', 'All Territories')}</option>
                {allAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            )}

            {/* Layout Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <button
                onClick={() => setViewLayout('grid')}
                title={t('grid', 'Grid Cards')}
                style={{
                  padding: '5px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: viewLayout === 'grid' ? 'var(--bg-card-solid)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                🪟
              </button>
              <button
                onClick={() => setViewLayout('table')}
                title={t('table', 'Table View')}
                style={{
                  padding: '5px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: viewLayout === 'table' ? 'var(--bg-card-solid)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRequirements.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '20px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>
            {t('noDataFound', 'No Garment Requirements Found')}
          </h3>
          <p style={{ color: 'var(--text-gray)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px auto' }}>
            {isCustomerRole
              ? "You haven't logged any custom requirements yet. Submit a requirement for any dress, suit, or out-of-stock item you need!"
              : 'No customer requirements match the selected search and filter criteria.'}
          </p>
          <button className="btn-primary" onClick={handleOpenAddModal} style={{ padding: '10px 20px' }}>
            + {isCustomerRole ? t('submitNewRequirement', 'Submit First Requirement') : t('logCustomerRequirementBtn', 'Log New Customer Requirement')}
          </button>
        </div>
      ) : viewLayout === 'grid' ? (
        /* Grid Layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {paginatedRequirements.map(req => {
            const statusBadge = getStatusBadge(req.status);
            const urgencyBadge = getUrgencyBadge(req.urgency);

            return (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  borderTop: `4px solid ${statusBadge.color || 'var(--accent-terracotta)'}`
                }}
              >
                <div>
                  {/* Top Bar: ID, Urgency, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-terracotta)', letterSpacing: '0.5px' }}>
                        {req.id}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: urgencyBadge.bg, color: urgencyBadge.color, fontWeight: 700 }}>
                        {urgencyBadge.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        background: statusBadge.bg,
                        color: statusBadge.color
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Garment Title & Category */}
                  <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 6px 0' }}>
                    {req.garment}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '14px' }}>
                    🏷️ {req.category || 'Garments'} • 🧵 {req.fabric || 'Custom Fabric'}
                  </div>

                  {/* Customer Info (Prominent for Seller) */}
                  {!isCustomerRole && (
                    <div
                      style={{
                        background: 'var(--bg-main)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--terracotta)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px'
                        }}
                      >
                        {req.customer ? req.customer.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.customer}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                          {req.shopName ? `${req.shopName} • ` : ''}📍 {req.areaName || 'General Territory'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Garment Specs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-gray)', textTransform: 'uppercase' }}>{t('size', 'Size')}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{req.size || 'L'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-gray)', textTransform: 'uppercase' }}>{t('color', 'Color')}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.color || 'Standard'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-gray)', textTransform: 'uppercase' }}>{t('quantity', 'Quantity')}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{req.quantity || 1} {t('stockPcs', 'pcs')}</div>
                    </div>
                  </div>

                  {/* Budget & Target Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>{t('targetBudget', 'Target Budget')}: </span>
                      <strong style={{ fontSize: '14px', color: 'var(--status-paid)' }}>₹{Number(req.budget || 2500).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>{t('dueDate', 'Need by')}: </span>
                      <strong style={{ color: 'var(--text-dark)' }}>{req.deliveryDate || 'Flexible'}</strong>
                    </div>
                  </div>

                  {/* Measurements or Notes */}
                  {(req.measurements || req.notes) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)', background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontStyle: 'italic' }}>
                      💬 {req.measurements || req.notes}
                    </div>
                  )}

                  {/* Seller Progress Note */}
                  {req.sellerNotes && (
                    <div style={{ background: 'rgba(212, 175, 55, 0.12)', borderLeft: '3px solid var(--accent-terracotta)', padding: '8px 12px', borderRadius: '0 8px 8px 0', marginBottom: '14px', fontSize: '12px' }}>
                      <strong style={{ color: 'var(--text-dark)' }}>{t('studio', 'Studio Update')}: </strong>
                      <span style={{ color: 'var(--text-dark)' }}>{req.sellerNotes}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!isCustomerRole ? (
                    <>
                      <button
                        onClick={() => handleOpenStatusModal(req)}
                        style={{
                          flex: '1 1 auto',
                          padding: '8px 14px',
                          background: 'var(--accent-terracotta)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ⚙️ {t('updateStatus', 'Update Status & Note')}
                      </button>

                      {req.status === 'Available' && (
                        <button
                          onClick={() => handleCreateSaleFromReq(req)}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--accent-emerald)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Generate Invoice for Customer"
                        >
                          🛒 {t('issueNewSale', 'Create Invoice')}
                        </button>
                      )}

                      <a
                        href={`https://wa.me/${(req.phone || '919876543210').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${req.customer}, regarding your requirement for "${req.garment}" (${req.size}, ${req.color}) at ThreadLine Garments...`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '8px 12px',
                          background: '#25D366',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Chat on WhatsApp"
                      >
                        💬
                      </a>

                      <button
                        onClick={() => {
                          setReqToDelete(req);
                          setShowDeleteModal(true);
                        }}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--bg-main)',
                          color: 'var(--icon-red)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        title="Delete Requirement"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setDetailReq(req);
                          setShowDetailModal(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-dark)',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ {t('viewDetails', 'View Progress & Details')}
                      </button>

                      <a
                        href={`https://wa.me/919876500000?text=${encodeURIComponent(`Hello ThreadLine Studio, checking update on my requirement ID ${req.id} for "${req.garment}".`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '8px 14px',
                          background: '#25D366',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        💬 {t('contactSellerStore', 'WhatsApp Studio')}
                      </a>

                      {req.status === 'Pending Review' && (
                        <button
                          onClick={() => {
                            setReqToDelete(req);
                            setShowDeleteModal(true);
                          }}
                          style={{
                            padding: '8px 10px',
                            background: 'transparent',
                            color: 'var(--icon-red)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title={t('cancelBtn', 'Cancel Request')}
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('invoiceNo', 'REQ ID')}</th>
                {!isCustomerRole && <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('customerName', 'Customer')}</th>}
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('items', 'Garment & Fabric')}</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('description', 'Specs')}</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('amount', 'Budget')}</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('status', 'Urgency')}</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>{t('status', 'Status')}</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: 'var(--text-gray)' }}>{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequirements.map(req => {
                const statusBadge = getStatusBadge(req.status);
                const urgencyBadge = getUrgencyBadge(req.urgency);

                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-terracotta)', fontSize: '12px' }}>
                      {req.id}
                    </td>
                    {!isCustomerRole && (
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{req.customer}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{req.shopName || req.phone}</div>
                      </td>
                    )}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-dark)' }}>{req.garment}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{req.category} • {req.fabric}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                      {req.size} / {req.color} ({req.quantity} {t('stockPcs', 'pcs')})
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--status-paid)', fontSize: '13px' }}>
                      ₹{Number(req.budget || 2500).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: urgencyBadge.bg, color: urgencyBadge.color, fontWeight: 700 }}>
                        {urgencyBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, background: statusBadge.bg, color: statusBadge.color }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {!isCustomerRole ? (
                          <>
                            <button
                              onClick={() => handleOpenStatusModal(req)}
                              style={{ padding: '6px 10px', background: 'var(--accent-terracotta)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {t('editBtn', 'Manage')}
                            </button>
                            {req.status === 'Available' && (
                              <button
                                onClick={() => handleQuickFulfill(req)}
                                style={{ padding: '6px 10px', background: 'var(--accent-emerald)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                {t('statusCompleted', 'Fulfill')}
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setDetailReq(req);
                              setShowDetailModal(true);
                            }}
                            style={{ padding: '6px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            {t('viewDetails', 'Details')}
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

      {/* Pagination */}
      {filteredRequirements.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[6, 9, 18, 36]}
        />
      )}

      {/* MODAL 1: Log New Requirement (For Customer & Seller) */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                  {isCustomerRole ? `✨ ${t('requestCustomGarmentReq', 'Submit Garment Requirement')}` : `✂️ ${t('logCustomerRequirementBtn', 'Log Customer Requirement')}`}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                  {isCustomerRole
                    ? t('customerReqInStockMsg', 'Tell us what dress, suit, fabric, or restock item you need')
                    : t('pageRequirementsSub', 'Record custom customer orders or out-of-stock garment demand')}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Selector (Seller Mode Only) */}
              {!isCustomerRole ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('customerName', 'Select Customer')}
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleCustomerSelectChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} • {c.shopName || c.phone} ({c.areaName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)', textTransform: 'uppercase' }}>{t('activeCustomerAccount', 'Submitting As')}</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>{myCustomer.name} ({myCustomer.shopName || 'Retail Customer'})</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>📍 {myCustomer.areaName || 'Navrangpura'}</div>
                </div>
              )}

              {/* Garment Title & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('garmentDressType', 'Garment / Dress Item Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Georgette Designer Suit, Linen Blazer, Silk Saree"
                    value={formData.garment}
                    onChange={(e) => setFormData({ ...formData, garment: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('category', 'Category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  >
                    {GARMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fabric Preference & Urgency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('particularsDescription', 'Fabric / Material Preference')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pure Chanderi Silk, 100% Linen, Georgette, Rayon"
                    value={formData.fabric}
                    onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('status', 'Urgency Level')}
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  >
                    <option value="Normal">🟢 {t('statusActive', 'Normal (Within 7-10 Days)')}</option>
                    <option value="High">⚡ {t('highRiskDebtors', 'High (Within 4-5 Days)')}</option>
                    <option value="Urgent">🔥 {t('statusOverdue', 'Urgent / Festive (Within 48-72 Hours)')}</option>
                  </select>
                </div>
              </div>

              {/* Size, Color Swatches, Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('size', 'Size')}
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  >
                    {STANDARD_SIZES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('color', 'Color')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Navy Blue, Maroon, Pastel Pink"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('quantity', 'Quantity (pcs)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>
              </div>

              {/* Budget & Target Need Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('targetBudget', 'Target Budget (₹)')}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 3500"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                    {t('dueDate', 'Expected Delivery Date')}
                  </label>
                  <input
                    type="date"
                    value={formData.requirementDate}
                    onChange={(e) => setFormData({ ...formData, requirementDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>
              </div>

              {/* Measurements or Special Fitting Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  {t('notes', 'Custom Body Measurements (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder='e.g. Bust: 38", Waist: 32", Length: 44", Shoulder: 16"'
                  value={formData.measurements}
                  onChange={(e) => setFormData({ ...formData, measurements: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  {t('description', 'Special Instructions / Embroidery / Styling Details')}
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Zari border on dupatta, double pocket inner lining, slim fit tailoring..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', fontFamily: 'inherit' }}
                />
              </div>

              {/* Sample Photo Attachment */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  📸 {t('samplePhotoOptional', 'Reference Photo / Garment Sketch (Optional, Max 2MB)')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ fontSize: '12px', color: 'var(--text-gray)' }}
                  />
                  {formData.samplePhoto && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={formData.samplePhoto}
                        alt="Sample Preview"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, samplePhoto: null }))}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 700 }}
                >
                  ✓ {isCustomerRole ? t('submitRequirementRequest', 'Submit Garment Request') : t('save', 'Save Requirement')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '12px 20px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Seller Update Status & Notes Modal */}
      {showStatusModal && selectedReqForStatus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                  {t('manageAreas', 'Manage Requirement')}: {selectedReqForStatus.id}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                  {t('customer', 'Customer')}: <strong>{selectedReqForStatus.customer}</strong> • {selectedReqForStatus.garment}
                </p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  {t('status', 'Production / Fulfillment Stage')}
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                >
                  <option value="Pending Review">⏳ {t('pendingReview', 'Pending Review')}</option>
                  <option value="Fabric Sourced">🧶 {t('inProductionSourced', 'Fabric Sourced from Mill')}</option>
                  <option value="In Transit">🚚 {t('underFabricStitching', 'Procured / In Transit from Mill')}</option>
                  <option value="Available">✨ {t('readyInInventory', 'Stock Match / Ready for Delivery')}</option>
                  <option value="Fulfilled & Delivered">✓ {t('alreadyFulfilled', 'Fulfilled & Dispatched')}</option>
                  <option value="Cancelled">✕ {t('cancel', 'Cancelled / Rejected')}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  {t('notes', 'Studio Progress Note for Customer (Sent as Notification)')}
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Fabric sourced from Surat mill. Trial scheduled for Thursday."
                  value={statusForm.sellerNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, sellerNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '6px' }}>
                  {t('dueDate', 'Estimated Ready / Delivery Date')}
                </label>
                <input
                  type="date"
                  value={statusForm.estimatedDelivery}
                  onChange={(e) => setStatusForm({ ...statusForm, estimatedDelivery: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 700 }}>
                  {t('saveChanges', 'Save & Notify Customer')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  style={{ padding: '12px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Customer Detail View Modal */}
      {showDetailModal && detailReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-terracotta)' }}>{detailReq.id}</span>
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-dark)' }}>
                  {detailReq.garment}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}
              >
                ✕
              </button>
            </div>

            {/* Stage Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                {t('routeProgress', 'Production Timeline Status')}:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '20px 0' }}>
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '3px', background: 'var(--border-light)', zIndex: 1, transform: 'translateY(-50%)' }} />
                {[
                  { label: t('submit', 'Submitted'), done: true },
                  { label: t('inProductionSourced', 'Sourced'), done: detailReq?.status !== 'Pending Review' && detailReq?.status !== 'Cancelled' },
                  { label: t('underFabricStitching', 'In Transit'), done: detailReq?.status === 'In Transit' || detailReq?.status === 'In Stitching' || detailReq?.status === 'Available' || String(detailReq?.status || '').includes('Fulfilled') },
                  { label: t('readyInInventory', 'Ready'), done: detailReq?.status === 'Available' || String(detailReq?.status || '').includes('Fulfilled') }
                ].map((step, idx) => (
                  <div key={idx} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: step.done ? 'var(--accent-emerald)' : 'var(--bg-main)',
                        color: step.done ? '#FFFFFF' : 'var(--text-gray)',
                        border: `2px solid ${step.done ? 'var(--accent-emerald)' : 'var(--border-light)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      {step.done ? '✓' : idx + 1}
                    </div>
                    <span style={{ fontSize: '11px', marginTop: '6px', fontWeight: step.done ? 700 : 500, color: step.done ? 'var(--text-dark)' : 'var(--text-gray)' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spec Details */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>{t('category', 'Fabric')}:</span>
                <strong>{detailReq.fabric || 'Cotton / Silk'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>{t('size', 'Size')} & {t('color', 'Color')}:</span>
                <strong>{detailReq.size} • {detailReq.color}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>{t('quantity', 'Quantity')}:</span>
                <strong>{detailReq.quantity} {t('stockPcs', 'pcs')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>{t('targetBudget', 'Target Budget')}:</span>
                <strong style={{ color: 'var(--status-paid)' }}>₹{Number(detailReq.budget || 2500).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>{t('dueDate', 'Delivery Need')}:</span>
                <strong>{detailReq.deliveryDate || 'Flexible'}</strong>
              </div>
              {detailReq.measurements && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--text-gray)', display: 'block', fontSize: '11px' }}>{t('notes', 'Measurements')}:</span>
                  <span style={{ fontWeight: 600 }}>{detailReq.measurements}</span>
                </div>
              )}
            </div>

            {detailReq.sellerNotes && (
              <div style={{ background: 'rgba(212, 175, 55, 0.12)', borderLeft: '3px solid var(--accent-terracotta)', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '18px', fontSize: '13px' }}>
                <strong>{t('studio', 'Studio Response')}: </strong>
                <span>{detailReq.sellerNotes}</span>
              </div>
            )}

            <button
              onClick={() => setShowDetailModal(false)}
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {t('closeBtn', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete / Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t('confirmDeletion', 'Remove Requirement?')}
        message={`Are you sure you want to remove the garment requirement "${reqToDelete?.garment}"? This action cannot be undone.`}
        confirmText={t('delete', 'Yes, Remove')}
        cancelText={t('cancelBtn', 'Keep Requirement')}
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setReqToDelete(null);
        }}
      />
    </div>
  );
}
