import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useArea } from '../context/AreaContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Sidebar({ isCollapsed, onToggle }) {
  const { unreadNotificationCount, notifications } = useArea();
  const {
    userRole,
    roleKey,
    isAdmin,
    isSupplier,
    isInventory,
    isSales,
    isUser,
    userName,
    userEmail,
    customerName,
    roleBadge,
    roleIcon,
    logout
  } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const myNotifications = isUser
    ? notifications.filter(n => {
      const cNameLower = (customerName || '').toLowerCase();
      return (n.recipientName || '').toLowerCase().includes(cNameLower) || (n.senderName || '').toLowerCase().includes(cNameLower);
    })
    : notifications;
  const myUnreadCount = myNotifications.filter(n => n.unread).length;

  const getBrandSubtitle = () => {
    if (isAdmin) return t('salesAndCreditLedger', 'Sales & Credit Ledger');
    if (isSupplier) return 'Supplier Portal';
    if (isInventory) return 'Inventory Console';
    if (isSales) return 'Sales & Distribution';
    return t('customerLedgerPortal', 'Customer Ledger Portal');
  };

  const getSectionTitle = () => {
    if (isAdmin) return t('ledgerNavigation', 'Ledger Navigation');
    if (isSupplier) return 'Supplier Console';
    if (isInventory) return 'Inventory Console';
    if (isSales) return 'Sales Console';
    return t('clientLedger', 'Client Ledger');
  };

  const currentDisplayName = userName || (isUser ? customerName : (userEmail ? userEmail.split('@')[0] : 'User'));

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Top: Garment House Logo (Gold Monogram Style) & Sales & Credit Ledger */}
        <div className="sidebar-header">
          <Link to="/" className="brand-logo" title="Garment House">
            <div className="brand-icon">
              <span>GH</span>
            </div>
            {!isCollapsed && (
              <div>
                <div className="brand-title">Garment House</div>
                <div className="brand-subtitle">{getBrandSubtitle()}</div>
              </div>
            )}
          </Link>
          <button
            onClick={onToggle}
            className="sidebar-toggle-btn"
            title={isCollapsed ? t('expandSidebar', 'Expand Sidebar') : t('collapseSidebar', 'Collapse Sidebar')}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>

        {!isCollapsed && <div className="nav-section-title">{getSectionTitle()}</div>}

        {/* Navigation Items tailored to the 5 System Roles */}
        <div className="nav-links">
          {/* Common Dashboard NavLink for all 5 roles */}
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('dashboard', 'Dashboard')}>
            <i>🏠</i> {!isCollapsed && <span>{t('dashboard', 'Dashboard')}</span>}
          </NavLink>

          {/* 1. ADMIN ROLE: Master full access to all sections */}
          {isAdmin && (
            <>
              <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('customers', 'Customers')}>
                <i>👥</i> {!isCollapsed && <span>{t('customers', 'Customers')}</span>}
              </NavLink>
              <NavLink to="/areas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('areasVisits', 'Areas & Visits')}>
                <i>📍</i> {!isCollapsed && <span>{t('areasVisits', 'Areas & Visits')}</span>}
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('products', 'Products')}>
                <i>👕</i> {!isCollapsed && <span>{t('products', 'Products')}</span>}
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('inventory', 'Inventory')}>
                <i>🏭</i> {!isCollapsed && <span>{t('inventory', 'Inventory')}</span>}
              </NavLink>
              <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('suppliers', 'Suppliers')}>
                <i>🚚</i> {!isCollapsed && <span>{t('suppliers', 'Suppliers')}</span>}
              </NavLink>
              <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Purchase Orders">
                <i>📦</i> {!isCollapsed && <span>Purchases</span>}
              </NavLink>
              <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Returns & Defective">
                <i>🔄</i> {!isCollapsed && <span>Returns</span>}
              </NavLink>
              <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('sales', 'Sales')}>
                <i>🛒</i> {!isCollapsed && <span>{t('sales', 'Sales')}</span>}
              </NavLink>
              <NavLink to="/credit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('credit', 'Credit')}>
                <i>📒</i> {!isCollapsed && <span>{t('credit', 'Credit')}</span>}
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('payments', 'Payments')}>
                <i>💰</i> {!isCollapsed && <span>{t('payments', 'Payments')}</span>}
              </NavLink>
              <NavLink to="/collections" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Daily Collections">
                <i>💳</i> {!isCollapsed && <span>Collections</span>}
              </NavLink>
              <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Operating Expenses">
                <i>📉</i> {!isCollapsed && <span>Expenses</span>}
              </NavLink>
              <NavLink to="/requirements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('requirements', 'Requirements')}>
                <i>📋</i> {!isCollapsed && <span>{t('requirements', 'Requirements')}</span>}
              </NavLink>
              <NavLink to="/festival-calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('festivalDemand', 'Festival Demand')}>
                <i>🪔</i> {!isCollapsed && <span>{t('festivalDemand', 'Festival Demand')}</span>}
              </NavLink>
              <NavLink to="/ai-prediction" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('riskAnalysis', 'AI Risk Analysis')}>
                <i>⚖️</i> {!isCollapsed && <span>{t('riskAnalysis', 'AI Risk Analysis')}</span>}
              </NavLink>
              <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('analytics', 'Analytics')}>
                <i>📊</i> {!isCollapsed && <span>{t('analytics', 'Analytics')}</span>}
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('reports', 'Reports')}>
                <i>📈</i> {!isCollapsed && <span>{t('reports', 'Reports')}</span>}
              </NavLink>
              <NavLink to="/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('feedback', 'Feedback')}>
                <i>⭐</i> {!isCollapsed && <span>{t('feedback', 'Feedback')}</span>}
              </NavLink>
            </>
          )}

          {/* 2. SUPPLIER ROLE: Supplied products, Received POs, Payments & Settlement */}
          {isSupplier && (
            <>
              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="My Supplied Products">
                <i>👕</i> {!isCollapsed && <span>My Supplied Products</span>}
              </NavLink>
              <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Received Purchase Orders">
                <i>📥</i> {!isCollapsed && <span>Received Purchase Orders</span>}
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Payments & Settlement">
                <i>💳</i> {!isCollapsed && <span>Payments & Settlement</span>}
              </NavLink>
            </>
          )}

          {/* 3. INVENTORY MANAGER ROLE: Inventory, Products, Stock Inward, Suppliers, Purchases, Returns */}
          {isInventory && (
            <>
              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('products', 'Products')}>
                <i>👕</i> {!isCollapsed && <span>Products</span>}
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('inventory', 'Inventory')}>
                <i>🏭</i> {!isCollapsed && <span>Inventory & Stock</span>}
              </NavLink>
              <NavLink to="/inventory/add" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Stock Inward">
                <i>📥</i> {!isCollapsed && <span>Stock Inward</span>}
              </NavLink>
              <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('suppliers', 'Suppliers')}>
                <i>🚚</i> {!isCollapsed && <span>Suppliers</span>}
              </NavLink>
              <NavLink to="/purchases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Purchases & Inward Goods">
                <i>📦</i> {!isCollapsed && <span>Purchases</span>}
              </NavLink>
              <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Defective & Returns">
                <i>🔄</i> {!isCollapsed && <span>Returns</span>}
              </NavLink>
            </>
          )}

          {/* 4. SALES MANAGER ROLE: Customers, Sales Orders, Credit, Invoices, Areas, Requirements, Reports */}
          {isSales && (
            <>
              <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('customers', 'Customers')}>
                <i>👥</i> {!isCollapsed && <span>Customers</span>}
              </NavLink>
              <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('sales', 'Sales')}>
                <i>🛒</i> {!isCollapsed && <span>Sales & Orders</span>}
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('products', 'Products')}>
                <i>👕</i> {!isCollapsed && <span>Product Catalog</span>}
              </NavLink>
              <NavLink to="/credit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('credit', 'Credit')}>
                <i>📒</i> {!isCollapsed && <span>Credit Ledger</span>}
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('payments', 'Payments')}>
                <i>💰</i> {!isCollapsed && <span>Payments</span>}
              </NavLink>
              <NavLink to="/collections" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Collections">
                <i>💳</i> {!isCollapsed && <span>Collections</span>}
              </NavLink>
              <NavLink to="/requirements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('requirements', 'Requirements')}>
                <i>📋</i> {!isCollapsed && <span>Requirements</span>}
              </NavLink>
              <NavLink to="/areas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('areasVisits', 'Areas & Visits')}>
                <i>📍</i> {!isCollapsed && <span>Territory Routes</span>}
              </NavLink>
              <NavLink to="/festival-calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('festivalDemand', 'Festival Demand')}>
                <i>🪔</i> {!isCollapsed && <span>Festival Demand</span>}
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('reports', 'Reports')}>
                <i>📈</i> {!isCollapsed && <span>Sales Reports</span>}
              </NavLink>
              <NavLink to="/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('feedback', 'Feedback')}>
                <i>⭐</i> {!isCollapsed && <span>Feedback</span>}
              </NavLink>
            </>
          )}

          {/* 5. USER ROLE: Customer Portal (Products, Purchases/Orders, Credit Ledger, Requirements, Feedback) */}
          {isUser && (
            <>
              <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('products', 'Products')}>
                <i>👗</i> {!isCollapsed && <span>{t('products', 'Products')}</span>}
              </NavLink>
              <NavLink to="/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('myPurchases', 'Purchases')}>
                <i>🛒</i> {!isCollapsed && <span>{t('sales', 'Sales')}</span>}
              </NavLink>
              <NavLink to="/credit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('creditPayments', 'Credit & Ledger')}>
                <i>📒</i> {!isCollapsed && <span>{t('credit', 'Credit')}</span>}
              </NavLink>
              <NavLink to="/requirements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('requirements', 'Requirements')}>
                <i>📋</i> {!isCollapsed && <span>{t('requirements', 'Requirements')}</span>}
              </NavLink>
              <NavLink to="/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('feedback', 'Feedback')}>
                <i>⭐</i> {!isCollapsed && <span>{t('feedback', 'Feedback')}</span>}
              </NavLink>
            </>
          )}

          {/* Common Notifications & Settings NavLinks for all roles */}
          <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('notifications', 'Notifications')}>
            <i>🔔</i> {!isCollapsed && <span>{t('notifications', 'Notifications')}</span>}
            {unreadNotificationCount > 0 && <span className="nav-badge">{unreadNotificationCount}</span>}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={t('settings', 'Settings')}>
            <i>⚙️</i> {!isCollapsed && <span>{t('settings', 'Settings')}</span>}
          </NavLink>

          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ cursor: 'pointer', marginTop: '8px', color: '#D98A8A' }}
            title={t('signOut', 'Sign Out')}
          >
            <i>🚪</i> {!isCollapsed && <span>{t('signOut', 'Sign Out')}</span>}
          </div>
        </div>
      </div>

      {/* BOTTOM: User Profile Footer */}
      <div className="sidebar-footer">
        <div className="user-profile-widget" onClick={handleLogout} title={t('signOut')} style={{ cursor: 'pointer' }}>
          <div className="user-avatar-circle">
            {roleIcon || (currentDisplayName ? currentDisplayName.charAt(0).toUpperCase() : 'U')}
          </div>
          {!isCollapsed && (
            <div className="user-profile-info">
              <h4>{currentDisplayName}</h4>
              <p>{roleBadge || userRole || 'User'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
