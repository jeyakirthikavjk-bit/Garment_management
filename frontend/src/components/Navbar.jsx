import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useArea } from '../context/AreaContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { isNotificationRelevantToRole } from '../config/roles';

export default function Navbar({ isCollapsed, onToggleSidebar }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const notifMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const langMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotificationCount, notifications, deleteNotification } = useArea();
  const { userRole, roleKey, isAdmin, isSales, isSupplier, isInventory, isUser, userEmail, customerName, userName, roleBadge, isCustomerRole, customerId, logout } = useAuth();
  const { language, setLanguage, languagesList, t } = useSettings();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifMenu(false);
        setShowProfileMenu(false);
        setShowLangMenu(false);
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter notifications strictly relevant to the active user's role
  const myNotifications = React.useMemo(() => {
    return (notifications || []).filter(n =>
      isNotificationRelevantToRole(n, roleKey, {
        customerId,
        customerName,
        userEmail,
        userName
      })
    );
  }, [notifications, roleKey, customerId, customerName, userEmail, userName]);

  const myUnreadCount = myNotifications.filter(n => n.unread).length;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      if (query.includes('customer') || query.includes('ravi') || query.includes('patel')) {
        navigate('/customers');
      } else if (query.includes('product') || query.includes('shirt') || query.includes('saree')) {
        navigate('/products');
      } else if (query.includes('sale') || query.includes('invoice')) {
        navigate('/sales');
      } else if (query.includes('credit') || query.includes('ledger') || query.includes('due')) {
        navigate('/credit');
      } else if (query.includes('supplier') || query.includes('vendor') || query.includes('mill') || query.includes('inward')) {
        navigate('/suppliers');
      } else {
        navigate('/customers');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return isCustomerRole ? t('pageCustomerPortalTitle', 'Client Account Overview') : t('salesAndCreditLedger', 'Sales & Credit Ledger');
    if (path.includes('/customers/add')) return t('addNewCustomer', 'Register Patron');
    if (path.includes('/customers/')) return t('creditPayments', 'Patron Credit Ledger');
    if (path.includes('/customers')) return t('customerDirectory', 'Patron Directory');
    if (path.includes('/area-schedule')) return t('weeklySchedule', 'Weekly Territory Ledger');
    if (path.includes('/area-visit')) return t('fieldRoute', 'Territory Route Collection');
    if (path.includes('/areas')) return t('areasVisits', 'Territories & Areas');
    if (path.includes('/products')) return isSupplier ? 'My Supplied Products' : t('products', 'Garment Collection');
    if (path.includes('/purchases')) return isSupplier ? 'Received Purchase Orders' : 'Purchases & Inward Goods';
    if (path.includes('/payments')) return isSupplier ? 'Payments & Settlement' : t('recordPayment', 'Record Payment Receipt');
    if (path.includes('/inventory/add')) return t('addStock', 'Register Stock Inward');
    if (path.includes('/inventory')) return t('inventory', 'Inventory & Vault');
    if (path.includes('/suppliers')) return isSupplier ? 'Mill Profile & Settings' : t('suppliers', 'Supplier Directory & Analysis');
    if (path.includes('/sales/add')) return t('recordNewSale', 'Issue Sales Invoice');
    if (path.includes('/sales')) return t('sales', 'Sales & Invoices');
    if (path.includes('/credit')) return t('credit', 'Customer Credit Ledger');
    if (path.includes('/requirements')) return t('requirements', 'Stock Demands & Procurement');
    if (path.includes('/festival-calendar')) return t('festivalDemand', 'Festive Demand Advisory');
    if (path.includes('/ai-prediction')) return t('riskAnalysis', 'Credit Risk Advisory');
    if (path.includes('/reports')) return t('reports', 'Financial Statements');
    if (path.includes('/notifications')) return t('notifications', 'Ledger Notices');
    if (path.includes('/settings')) return isSupplier ? 'Mill & Business Settings' : t('settings', 'Store & Trade Settings');
    if (path.includes('/feedback')) return t('feedback', 'Patron Reviews');
    return t('salesAndCreditLedger', 'Sales & Credit Ledger');
  };

  const displayName = userName || (isCustomerRole
    ? (customerName || (userEmail ? userEmail.split('@')[0] : 'Patron'))
    : (userEmail ? (userEmail.toLowerCase().includes('rahul') ? 'Rahul' : userEmail.split('@')[0]) : 'User'));

  const displayRole = roleBadge || userRole || (isCustomerRole ? t('customer', 'Patron') : 'User');

  return (
    <header className="top-header">
      {/* Header Left: Toggle & Title */}
      <div className="header-left">
        <button
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn"
          style={{ background: 'var(--bg-subtle, #FAF6F0)', color: 'var(--accent-primary, #6B1E2B)', borderColor: 'rgba(201, 162, 75, 0.4)' }}
          title={isCollapsed ? t('expandSidebar', 'Expand Sidebar') : t('collapseSidebar', 'Collapse Sidebar')}
        >
          {isCollapsed ? '≡' : '‹'}
        </button>
        <div className="header-title-block">
          <div className="breadcrumb-trail">
            <span>Garment House</span>
            <span style={{ color: 'var(--accent-gold)' }}>/</span>
            <span className="active">{getPageTitle()}</span>
          </div>
          <h1>{getPageTitle()}</h1>
        </div>
      </div>

      {/* Header Center: Global Search (bulletproof flex layout - zero overlap, no Ctrl+K) */}
      <div className="header-center">
        <div
          className="global-search-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: isSearchFocused ? '#FFFFFF' : '#FAF6F0',
            border: isSearchFocused
              ? '1.5px solid var(--accent-primary, #6B1E2B)'
              : '1.5px solid rgba(201, 162, 75, 0.4)',
            borderRadius: '24px',
            padding: '0 14px',
            height: '40px',
            width: '100%',
            boxSizing: 'border-box',
            boxShadow: isSearchFocused
              ? '0 0 0 3px rgba(107, 30, 43, 0.12), 0 2px 8px rgba(43, 33, 29, 0.06)'
              : '0 1px 3px rgba(43, 33, 29, 0.03)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Vector Search Icon - in normal flex flow, before the input */}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              width: '17px',
              height: '17px',
              color: isSearchFocused ? 'var(--accent-primary, #6B1E2B)' : 'var(--accent-gold, #C9A24B)',
              flexShrink: 0,
              marginRight: '10px',
              display: 'block',
              transition: 'color 0.2s ease, transform 0.2s ease',
              transform: isSearchFocused ? 'scale(1.08)' : 'scale(1)'
            }}
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <line x1="12.5" y1="12.5" x2="17" y2="17" />
          </svg>

          {/* Search Input - flex child starting after the icon, zero overlap */}
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('searchPlaceholder', 'Search customers, products, folios...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              padding: '0',
              margin: '0',
              fontSize: '13px',
              color: 'var(--text-dark, #2C2420)',
              width: '100%',
              minWidth: 0,
              fontFamily: 'inherit'
            }}
          />

          {/* Quick Clear Button only when search text exists */}
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              title={t('clear', 'Clear')}
              aria-label="Clear search"
              style={{
                background: 'rgba(107, 30, 43, 0.1)',
                color: 'var(--accent-primary, #6B1E2B)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                marginLeft: '8px',
                flexShrink: 0,
                padding: 0,
                transition: 'background 0.15s ease'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Header Right: Add Sale, Record Payment, Language, Notification Bell, User Avatar */}
      <div className="header-right">
        {(isAdmin || isSales) && (
          <>
            {/* Add Sale Button (maroon fill, gold text) */}
            <button
              className="header-btn-sale"
              onClick={() => navigate('/sales/add')}
              title={t('addSale', 'Add Sale')}
            >
              <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>+</span>
              <span>{t('addSale', 'Add Sale')}</span>
            </button>

            {/* Record Payment Button (outlined maroon) */}
            <button
              className="header-btn-pay"
              onClick={() => navigate('/payments')}
              title={t('recordPayment', 'Record Payment')}
            >
              <span style={{ color: 'var(--accent-gold)' }}>💰</span>
              <span>{t('recordPayment', 'Record Payment')}</span>
            </button>
          </>
        )}

        {/* Language Selector */}
        <div ref={langMenuRef} className="icon-btn-wrapper">
          <div
            className="icon-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            title={t('switchLanguage', 'Switch Language')}
            style={{ width: 'auto', minWidth: '40px', padding: '0 8px', gap: '4px', fontSize: '11.5px', fontWeight: 700 }}
          >
            <span>🌐</span>
            <span style={{ textTransform: 'uppercase', color: 'var(--accent-primary)' }}>{language}</span>
          </div>

          {showLangMenu && (
            <div className="dropdown-popover" style={{ width: '180px', right: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid rgba(201, 162, 75, 0.25)', marginBottom: '6px' }}>
                <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-cinzel)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  {t('switchLanguage', 'Select Language')}
                </span>
                <button
                  onClick={() => setShowLangMenu(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-gray)' }}
                >
                  ✕
                </button>
              </div>
              {(languagesList || []).map((lang) => (
                <div
                  key={lang.code}
                  className="dropdown-item"
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 8px',
                    fontWeight: language === lang.code ? 700 : 500,
                    color: language === lang.code ? 'var(--accent-primary)' : 'var(--text-dark)',
                    background: language === lang.code ? 'var(--bg-subtle, #F3E9DD)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <span>{lang.flag} {lang.native || lang.label}</span>
                  {language === lang.code && <span style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell (gold outline icon) */}
        <div ref={notifMenuRef} className="icon-btn-wrapper">
          <div className="icon-btn" onClick={() => setShowNotifMenu(!showNotifMenu)} title={t('notifications', 'Notifications')}>
            <span style={{ fontSize: '15px', color: 'var(--accent-gold)' }}>🔔</span>
            {myUnreadCount > 0 && <span className="badge-dot">{myUnreadCount}</span>}
          </div>

          {showNotifMenu && (
            <div className="dropdown-popover" style={{ width: '310px', zIndex: 3000 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(201, 162, 75, 0.25)' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '14px', color: 'var(--accent-primary)' }}>
                  {t('ledgerNotices', 'Ledger Notices')} ({myNotifications.length})
                </span>
                <button
                  onClick={() => setShowNotifMenu(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-gray)' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                {myNotifications.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-gray)', fontSize: '12px' }}>
                    {t('noPendingNotices', 'No pending notices')}
                  </div>
                ) : (
                  myNotifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      onClick={() => { navigate('/notifications'); setShowNotifMenu(false); }}
                      style={{ padding: '8px 10px', borderRadius: '8px', background: '#FAF6F0', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(201, 162, 75, 0.2)' }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-gray)', cursor: 'pointer', fontSize: '11px' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '2px' }}>{n.message.substring(0, 70)}...</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar (circular, thin gold ring) */}
        <div ref={profileMenuRef} className="icon-btn-wrapper">
          <div className="header-profile-pill" onClick={() => setShowProfileMenu(!showProfileMenu)} title="Account Settings">
            <div
              className="user-avatar-circle"
              style={{
                width: '28px',
                height: '28px',
                fontSize: '11.5px',
                border: '2px solid var(--accent-gold, #C9A24B)',
                background: 'var(--accent-primary, #6B1E2B)',
                color: '#FAF6F0'
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: '4px' }}>
              <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>{displayName}</span>
              <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-cinzel)', color: 'var(--accent-primary, #6B1E2B)', fontWeight: 700, lineHeight: 1 }}>{displayRole}</span>
            </div>
            <span style={{ fontSize: '9px', color: 'var(--accent-gold)' }}>▼</span>
          </div>

          {showProfileMenu && (
            <div className="dropdown-popover" style={{ width: '200px', right: 0 }}>
              <div style={{ padding: '6px 8px 8px 8px', borderBottom: '1px solid rgba(201, 162, 75, 0.25)', marginBottom: '6px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '13px', color: 'var(--accent-primary, #6B1E2B)' }}>{displayName}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-gray)' }}>{displayRole}</div>
              </div>
              <div className="dropdown-item" onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}>
                <i>⚙️</i> {t('settings', 'Store Settings')}
              </div>
              <div className="dropdown-item" onClick={() => { handleLogout(); setShowProfileMenu(false); }} style={{ color: 'var(--accent-danger)' }}>
                <i>🚪</i> {t('signOut', 'Sign Out')}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
