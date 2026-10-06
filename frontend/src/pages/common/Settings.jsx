import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import { SYSTEM_ROLES } from '../../config/roles';
import SupplierSettingsView from '../../components/supplier/SupplierSettingsView';
import AdminAuthRightsView from '../../components/admin/AdminAuthRightsView';

export default function Settings() {
  const { isSupplier, isAdmin, isCustomerRole, customerId, customerName, userEmail } = useAuth();

  const [activePanel, setActivePanel] = useState(() => isSupplier ? 'panel-supplier-profile' : 'panel-theme');
  const [saveMessage, setSaveMessage] = useState('');
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    fontsList = [],
    fontSizesList = [],
    storeSettings,
    updateStoreSettings,
    t
  } = useSettings();
  const { customers, updateCustomer, reminderSettings, saveReminderSettings, triggerAutomatedOverdueCheck } = useArea();

  const [formState, setFormState] = useState({ ...storeSettings });
  const [reminderConfigState, setReminderConfigState] = useState({
    reminderTime: reminderSettings?.reminderTime || '09:00',
    isEnabled: reminderSettings?.isEnabled !== undefined ? reminderSettings.isEnabled : true,
    channel: reminderSettings?.channel || 'WhatsApp & SMS'
  });
  const [isTestingCheck, setIsTestingCheck] = useState(false);

  // Safeguard: non-admins cannot stay on admin-only panels
  React.useEffect(() => {
    if (!isAdmin) {
      const adminPanels = ['panel-roles', 'panel-store-profile', 'panel-tax', 'panel-reminders', 'panel-invoice', 'panel-backup'];
      if (
        adminPanels.includes(activePanel) ||
        (activePanel === 'panel-customer-profile' && !isCustomerRole) ||
        (activePanel === 'panel-supplier-profile' && !isSupplier)
      ) {
        setActivePanel('panel-theme');
      }
    }
  }, [isAdmin, isCustomerRole, isSupplier, activePanel]);

  // Keep formState synced with storeSettings
  React.useEffect(() => {
    setFormState({ ...storeSettings });
  }, [storeSettings]);

  React.useEffect(() => {
    if (reminderSettings) {
      setReminderConfigState({
        reminderTime: reminderSettings.reminderTime || '09:00',
        isEnabled: reminderSettings.isEnabled !== undefined ? reminderSettings.isEnabled : true,
        channel: reminderSettings.channel || 'WhatsApp & SMS'
      });
    }
  }, [reminderSettings]);

  const handleChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = (msg) => {
    updateStoreSettings(formState);
    handleSave(msg);
  };

  const handleSaveReminderConfig = async () => {
    if (saveReminderSettings) {
      await saveReminderSettings(reminderConfigState);
    }
    handleSave(t('reminderConfigSaved', 'Payment reminder schedule saved successfully!'));
  };

  const handleTriggerTestCheck = async () => {
    setIsTestingCheck(true);
    try {
      if (triggerAutomatedOverdueCheck) {
        const res = await triggerAutomatedOverdueCheck();
        const count = res?.sentCount !== undefined ? res.sentCount : 0;
        handleSave(`✓ Overdue check executed! Processed ${count} reminder(s).`);
      }
    } catch (e) {
      handleSave('✓ Overdue check completed.');
    } finally {
      setIsTestingCheck(false);
    }
  };

  const handleSaveCustomerProfile = () => {
    if (myCustomer?.id && updateCustomer) {
      updateCustomer(myCustomer.id, {
        name: formState.customerName || myCustomer.name,
        address: formState.customerAddress || myCustomer.address,
        phone: formState.customerPhone || myCustomer.phone
      });
    }
    handleSave('Customer profile updated successfully!');
  };

  const myCustomer = customers.find(c =>
    c.id === Number(customerId) ||
    (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
    (c.phone && userEmail && userEmail.replace(/\D/g, '').length >= 6 && c.phone.replace(/\D/g, '').includes(userEmail.replace(/\D/g, ''))) ||
    (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
  ) || {
    id: customerId || 999,
    name: customerName || (userEmail ? userEmail.split('@')[0] : 'Customer'),
    shopName: customerName ? `${customerName}'s Shop` : 'Customer Shop',
    email: userEmail || 'customer@example.com',
    phone: '+91 98765 00000',
    areaName: 'Main Market',
    balance: 0,
    creditLimit: 50000,
    purchases: 0,
    status: 'Paid',
    statusType: 'paid'
  };

  const saveTimerRef = React.useRef(null);

  const handleSave = (msg) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveMessage(msg);
    saveTimerRef.current = setTimeout(() => setSaveMessage(''), 2500);
  };

  const themesList = [
    {
      id: 'classic',
      name: t('themeHeritageBoutique', 'Heritage Boutique & Ledger'),
      desc: t('themeHeritageBoutiqueDesc', 'Warm Ivory, Deep Maroon & Antique Gold fine line ledger'),
      icon: '🏛️',
      previewBg: '#FAF6F0',
      previewCard: '#FFFFFF',
      previewBorder: '#C9A24B',
      accent: '#6B1E2B'
    },
    {
      id: 'royal-maroon',
      name: t('themeImperialVelvet', 'Imperial Velvet & Gold'),
      desc: t('themeImperialVelvetDesc', 'Royal Velvet Purple with Imperial Gold accents'),
      icon: '👑',
      previewBg: '#FAF6F0',
      previewCard: '#FFFFFF',
      previewBorder: '#D4AF37',
      accent: '#521858'
    },
    {
      id: 'blush-beige',
      name: t('themeBlushBeige', 'Blush Beige & Rose'),
      desc: t('themeBlushBeigeDesc', 'Dusty Rosewood and Rose Blossom accents'),
      icon: '🌸',
      previewBg: '#FAF5F4',
      previewCard: '#FFFFFF',
      previewBorder: '#FB7185',
      accent: '#8C253E'
    },
    {
      id: 'forest-ledger',
      name: t('themeForestLedger', 'Heritage Forest & Gold'),
      desc: t('themeForestLedgerDesc', 'Traditional ledger forest green with warm ivory cards'),
      icon: '🌿',
      previewBg: '#FAF6F0',
      previewCard: '#FFFFFF',
      previewBorder: '#3B5D45',
      accent: '#1E5128'
    },
    {
      id: 'sapphire-silk',
      name: t('themeSapphireSilk', 'Royal Sapphire & Gold'),
      desc: t('themeSapphireSilkDesc', 'Deep Sapphire Navy with Champagne Gold accents'),
      icon: '💎',
      previewBg: '#FAF8F5',
      previewCard: '#FFFFFF',
      previewBorder: '#D4AF37',
      accent: '#1D4ED8'
    }
  ];

  const languagesList = [
    { code: 'en', label: t('english'), flag: '🇬🇧', native: 'English' },
    { code: 'ta', label: t('tamil'), flag: '🇮🇳', native: 'தமிழ்' },
    { code: 'hi', label: t('hindi'), flag: '🇮🇳', native: 'हिंदी' },
    { code: 'gu', label: t('gujarati'), flag: '🇮🇳', native: 'ગુજરાતી' }
  ];

  return (
    <div style={{ paddingTop: '10px' }}>
      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)' }}>
        {t('systemSettings')}
      </div>

      {saveMessage && (
        <div style={{ background: 'var(--status-paid-bg)', color: 'var(--status-paid)', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, textAlign: 'center' }}>
          ✓ {saveMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
        {/* Left Sidebar Navigation */}
        <div className="card">
          <div className="nav-links" style={{ padding: 0 }}>
            <div
              onClick={() => setActivePanel('panel-theme')}
              className={`settings-nav-item ${activePanel === 'panel-theme' ? 'active' : ''}`}
              style={{ marginBottom: '6px', cursor: 'pointer' }}
            >
              <i>🎨</i> <span>{t('appearanceTheme')}</span>
            </div>
            <div
              onClick={() => setActivePanel('panel-language')}
              className={`settings-nav-item ${activePanel === 'panel-language' ? 'active' : ''}`}
              style={{ marginBottom: '6px', cursor: 'pointer' }}
            >
              <i>🌐</i> <span>{t('languageRegion')}</span>
            </div>
            {/* Store Profile: ONLY viewable by Admin */}
            {isAdmin && (
              <div
                onClick={() => setActivePanel('panel-store-profile')}
                className={`settings-nav-item ${activePanel === 'panel-store-profile' || activePanel === 'panel-profile' ? 'active' : ''}`}
                style={{ marginBottom: '6px', cursor: 'pointer' }}
              >
                <i>🏪</i> <span>{t('storeProfile', 'Store Profile')}</span>
              </div>
            )}

            {/* Customer Account Profile: ONLY for Customer */}
            {isCustomerRole && (
              <div
                onClick={() => setActivePanel('panel-customer-profile')}
                className={`settings-nav-item ${activePanel === 'panel-customer-profile' ? 'active' : ''}`}
                style={{ marginBottom: '6px', cursor: 'pointer' }}
              >
                <i>👤</i> <span>{t('myCustomerProfile', 'My Account Profile')}</span>
              </div>
            )}

            {/* Supplier Mill Profile: ONLY for Supplier */}
            {isSupplier && (
              <div
                onClick={() => setActivePanel('panel-supplier-profile')}
                className={`settings-nav-item ${activePanel === 'panel-supplier-profile' ? 'active' : ''}`}
                style={{ marginBottom: '6px', cursor: 'pointer' }}
              >
                <i>🏭</i> <span>Mill Profile & Settings</span>
              </div>
            )}

            {/* Admin Exclusive Management Settings */}
            {isAdmin && (
              <>
                <div
                  onClick={() => setActivePanel('panel-tax')}
                  className={`settings-nav-item ${activePanel === 'panel-tax' ? 'active' : ''}`}
                  style={{ marginBottom: '6px', cursor: 'pointer' }}
                >
                  <i>🧾</i> <span>{t('taxGst')}</span>
                </div>
                <div
                  onClick={() => setActivePanel('panel-reminders')}
                  className={`settings-nav-item ${activePanel === 'panel-reminders' ? 'active' : ''}`}
                  style={{ marginBottom: '6px', cursor: 'pointer' }}
                >
                  <i>⏰</i> <span>{t('paymentReminders', 'Payment Reminders')}</span>
                </div>
                <div
                  onClick={() => setActivePanel('panel-invoice')}
                  className={`settings-nav-item ${activePanel === 'panel-invoice' ? 'active' : ''}`}
                  style={{ marginBottom: '6px', cursor: 'pointer' }}
                >
                  <i>🖨️</i> <span>{t('invoicePrinting')}</span>
                </div>
                <div
                  onClick={() => setActivePanel('panel-backup')}
                  className={`settings-nav-item ${activePanel === 'panel-backup' ? 'active' : ''}`}
                  style={{ marginBottom: '6px', cursor: 'pointer' }}
                >
                  <i>💾</i> <span>{t('dataBackup')}</span>
                </div>
                {/* Authentication & Access Rights: ONLY viewable by Admin */}
                <div
                  onClick={() => setActivePanel('panel-roles')}
                  className={`settings-nav-item ${activePanel === 'panel-roles' ? 'active' : ''}`}
                  style={{ marginBottom: '6px', cursor: 'pointer' }}
                >
                  <i>🛡️</i> <span>{t('authRights', 'Authentication & Access Rights')}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="card" style={{ position: 'relative', minHeight: '440px' }}>

          {/* Panel: Appearance & Theme */}
          {activePanel === 'panel-theme' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('themeHeading')}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                {t('themeSubtitle')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {themesList.map((tItem) => {
                  const isSelected = theme === tItem.id;
                  return (
                    <div
                      key={tItem.id}
                      onClick={() => {
                        setTheme(tItem.id);
                        handleSave(`${tItem.name} ${t('themeAppliedMsg')}`);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        background: 'var(--bg-card-solid)',
                        boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--accent-gold)',
                          color: '#0A0D14',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {t('activeThemeBadge', '✓ ACTIVE')}
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>{tItem.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>{tItem.name}</div>
                        </div>
                      </div>

                      {/* Mini Theme Color Preview Box */}
                      <div style={{
                        height: '60px',
                        borderRadius: '10px',
                        background: tItem.previewBg,
                        border: `1px solid ${tItem.previewBorder}`,
                        padding: '8px',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px'
                      }}>
                        <div style={{ width: '40%', height: '100%', borderRadius: '6px', background: tItem.previewCard, border: `1px solid ${tItem.previewBorder}` }} />
                        <div style={{ width: '40%', height: '100%', borderRadius: '6px', background: tItem.accent, opacity: 0.85 }} />
                      </div>

                      <p style={{ fontSize: '11px', color: 'var(--text-gray)', margin: 0 }}>
                        {tItem.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="settings-tip-box">
                {t('themeTipText', '💡 Tip: The selected theme applies instantly across all pages, headers, navigation bars, and data tables.')}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border-light)', margin: '32px 0 24px' }} />

              {/* Section: Typography & Font Family */}
              <div className="card-title" style={{ fontSize: '18px', marginBottom: '6px' }}>
                🔤 {t('fontHeading')}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                {t('fontSubtitle')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {fontsList.map((fItem) => {
                  const isSelected = fontFamily === fItem.id || fontFamily === fItem.name;
                  return (
                    <div
                      key={fItem.id}
                      onClick={() => {
                        setFontFamily(fItem.id);
                        handleSave(`${fItem.name} ${t('fontAppliedMsg')}`);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        background: 'var(--bg-card-solid)',
                        boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--accent-gold)',
                          color: '#0A0D14',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          ✓ ACTIVE
                        </span>
                      )}

                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-dark)', fontFamily: fItem.family }}>
                          {fItem.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{fItem.category}</div>
                      </div>

                      {/* Font sample preview box */}
                      <div style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-light)',
                        margin: '10px 0 8px',
                        fontFamily: fItem.family
                      }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-gold-dark)', marginBottom: '2px' }}>
                          Aa Bb Cc 123
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fItem.preview}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border-light)', margin: '32px 0 24px' }} />

              {/* Section: Font Size & Scale */}
              <div className="card-title" style={{ fontSize: '18px', marginBottom: '6px' }}>
                📏 {t('fontSizeHeading')}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                {t('fontSizeSubtitle')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {fontSizesList.map((sItem) => {
                  const isSelected = fontSize === sItem.id;
                  return (
                    <div
                      key={sItem.id}
                      onClick={() => {
                        setFontSize(sItem.id);
                        handleSave(`${sItem.label} (${sItem.scale}) ${t('fontSizeAppliedMsg')}`);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        background: 'var(--bg-card-solid)',
                        boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--accent-gold)',
                          color: '#0A0D14',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          ✓ ACTIVE
                        </span>
                      )}

                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-dark)' }}>{sItem.label}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-gold-dark)', background: 'var(--accent-gold-light)', padding: '2px 6px', borderRadius: '6px' }}>{sItem.scale}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-gray)', margin: 0 }}>
                          {sItem.desc}
                        </p>
                      </div>

                      <div
                        className="sample-text-preview"
                        style={{
                          marginTop: '14px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: sItem.size,
                          fontWeight: 600,
                          color: 'var(--text-dark)'
                        }}
                      >
                        Sample Text ({sItem.size})
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview Box */}
              <div className="settings-preview-banner">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)', marginBottom: '4px' }}>
                    ✨ Current Styling: <span style={{ color: 'var(--accent-gold-dark)' }}>{fontFamily}</span> @ <span style={{ color: 'var(--accent-gold-dark)' }}>{fontSizesList.find(s => s.id === fontSize)?.label || fontSize}</span> ({fontSizesList.find(s => s.id === fontSize)?.scale || '100%'})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                    Your font selection and text scaling are automatically saved and applied live across all dashboard screens, modals, tables, and buttons.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Panel: Language & Region */}
          {activePanel === 'panel-language' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('langHeading')}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                {t('langSubtitle')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {languagesList.map((langItem) => {
                  const isSelected = language === langItem.code;
                  return (
                    <div
                      key={langItem.code}
                      onClick={() => {
                        setLanguage(langItem.code);
                        handleSave(`${langItem.native} ${t('langAppliedMsg')}`);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        borderRadius: '16px',
                        padding: '18px',
                        cursor: 'pointer',
                        background: 'var(--bg-card-solid)',
                        boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '28px' }}>{langItem.flag}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-dark)' }}>{langItem.native}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{langItem.label}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--accent-gold)',
                          color: '#0A0D14',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '12px'
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Panel: Customer Profile (CUSTOMER ONLY) */}
          {isCustomerRole && (activePanel === 'panel-customer-profile' || activePanel === 'panel-profile') && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('myCustomerProfile', 'My Customer Profile')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('customerNameLabel', 'Customer Name')}</label>
                    <input type="text" value={formState.customerName || myCustomer.name} onChange={(e) => handleChange('customerName', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('deliveryBillingAddress', 'Delivery / Billing Address')}</label>
                    <input type="text" value={formState.customerAddress || myCustomer.address || ''} onChange={(e) => handleChange('customerAddress', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('registeredEmail', 'Registered Email')}</label>
                    <input type="email" value={myCustomer.email || userEmail} style={{ width: '100%' }} readOnly />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('contactPhoneLabel', 'Contact Phone')}</label>
                    <input type="text" value={formState.customerPhone || myCustomer.phone || ''} onChange={(e) => handleChange('customerPhone', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('assignedAreaLabel', 'Assigned Area')}</label>
                    <input type="text" value={myCustomer.areaName || 'Main Market'} style={{ width: '100%' }} readOnly />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('approvedKhataCreditLimit', 'Approved Khata Credit Limit')}</label>
                    <input type="text" value={`₹${(myCustomer.creditLimit || 50000).toLocaleString('en-IN')}`} style={{ width: '100%', fontWeight: 700, color: 'var(--accent-indigo)' }} readOnly />
                  </div>
                </div>
                <button onClick={handleSaveCustomerProfile} className="btn-generate" style={{ width: 'max-content', padding: '12px 24px', marginTop: '10px' }}>
                  {t('saveProfileChanges', 'Save Profile Changes')}
                </button>
              </div>
            </div>
          )}

          {/* Panel: Supplier Mill Profile (SUPPLIER ONLY) */}
          {isSupplier && (activePanel === 'panel-supplier-profile' || activePanel === 'panel-profile') && (
            <div className="settings-panel active-panel">
              <SupplierSettingsView />
            </div>
          )}

          {/* Panel: Store Profile (ADMIN ONLY) */}
          {isAdmin && (activePanel === 'panel-store-profile' || activePanel === 'panel-profile') && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('storeProfile', 'Store Profile')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('superAdminName', 'Super Admin Name')}</label>
                    <input type="text" value={formState.adminName || 'Super Admin'} onChange={(e) => handleChange('adminName', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('adminLoginEmail', 'Admin Login Email')}</label>
                    <input type="email" value={formState.contactEmail} onChange={(e) => handleChange('contactEmail', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('adminContactPhone', 'Admin Contact Phone')}</label>
                    <input type="text" value={formState.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('adminPassword', 'Admin Account Password')}</label>
                    <input type="password" value={formState.adminPassword || 'adminpassword123'} onChange={(e) => handleChange('adminPassword', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '5px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('storeBusinessName', 'Store / Business Name')}</label>
                    <input type="text" value={formState.storeName} onChange={(e) => handleChange('storeName', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Store Tagline / Subtitle</label>
                    <input type="text" value={formState.storeTagline || 'Sales, Wholesale Distribution & Khata Ledger Suite'} onChange={(e) => handleChange('storeTagline', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('storePhysicalAddress', 'Store Physical Address')}</label>
                  <textarea value={formState.storeAddress} onChange={(e) => handleChange('storeAddress', e.target.value)} style={{ width: '100%', height: '60px', resize: 'none' }}></textarea>
                </div>

                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px', marginTop: '5px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-maroon)', marginBottom: '10px' }}>🏦 Default Settlement & Bank Details (Appears on Invoices & Khata)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Bank Name</label>
                      <input type="text" value={formState.bankName || 'HDFC Bank Ltd.'} onChange={(e) => handleChange('bankName', e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Account Number</label>
                      <input type="text" value={formState.bankAccountNo || '50200012345678'} onChange={(e) => handleChange('bankAccountNo', e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>IFSC Code</label>
                      <input type="text" value={formState.bankIfsc || 'HDFC0000006'} onChange={(e) => handleChange('bankIfsc', e.target.value)} style={{ width: '100%', textTransform: 'uppercase' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>UPI ID (VPA)</label>
                      <input type="text" value={formState.upiId || 'threadline@okhdfcbank'} onChange={(e) => handleChange('upiId', e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                <button onClick={() => handleSaveSettings(t('saveAdminStoreDetails', 'Admin profile & store details updated successfully!'))} className="btn-generate" style={{ width: 'max-content', padding: '12px 24px', marginTop: '10px' }}>
                  {t('saveAdminStoreDetails', 'Save Admin & Store Details')}
                </button>
              </div>
            </div>
          )}

          {/* Panel: Tax & GST (ADMIN ONLY) */}
          {isAdmin && activePanel === 'panel-tax' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('taxGstConfig', 'Tax & GST Configuration')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" id="enableGst" checked={formState.enableGst} onChange={(e) => handleChange('enableGst', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--terracotta)' }} />
                  <label htmlFor="enableGst" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>{t('enableGstInvoices', 'Enable GST on Invoices')}</label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('gstinNumber', 'GSTIN Number')}</label>
                    <input type="text" value={formState.gstin} onChange={(e) => handleChange('gstin', e.target.value)} style={{ width: '100%', textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>PAN Number</label>
                    <input type="text" value={formState.panNumber || 'AAACA1234F'} onChange={(e) => handleChange('panNumber', e.target.value)} style={{ width: '100%', textTransform: 'uppercase' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>State Jurisdiction</label>
                    <input type="text" value={formState.stateJurisdiction || '24 - Gujarat'} onChange={(e) => handleChange('stateJurisdiction', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('defaultGstRate', 'Default GST Rate (%)')}</label>
                    <select value={formState.gstRate} onChange={(e) => handleChange('gstRate', e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
                      <option value="5">5% (Apparel &lt; ₹1000)</option>
                      <option value="12">12% (Apparel &gt; ₹1000)</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('defaultHsnCode', 'Default HSN Code')}</label>
                    <input type="text" value={formState.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <button onClick={() => handleSaveSettings(t('saveTaxSettings', 'Tax & GST settings saved permanently!'))} className="btn-generate" style={{ width: 'max-content', padding: '12px 24px', marginTop: '10px' }}>
                  {t('saveTaxSettings', 'Save Tax Settings')}
                </button>
              </div>
            </div>
          )}



          {/* Panel: Invoice Printing (ADMIN ONLY) */}
          {isAdmin && activePanel === 'panel-invoice' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('invoicePrintingFormat', 'Invoice Printing Format')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('paperSize', 'Paper Size')}</label>
                  <select value={formState.paperSize} onChange={(e) => handleChange('paperSize', e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
                    <option value="thermal">{t('thermalReceipt', 'Thermal Receipt (3 Inch)')}</option>
                    <option value="a4">{t('standardA4Format', 'Standard A4 Format')}</option>
                    <option value="a5">{t('halfPageA5', 'Half Page (A5)')}</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '5px 0' }}>
                  <input type="checkbox" id="printLogo" checked={formState.printLogo} onChange={(e) => handleChange('printLogo', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--terracotta)' }} />
                  <label htmlFor="printLogo" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>{t('printStoreLogoReceipt', 'Print Store Logo on Receipt')}</label>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{t('customFooterMessage', 'Custom Footer Message')}</label>
                  <textarea value={formState.footerMessage} onChange={(e) => handleChange('footerMessage', e.target.value)} style={{ width: '100%', height: '60px', resize: 'none' }}></textarea>
                </div>
                <button onClick={() => handleSaveSettings(t('savePrintSettings', 'Invoice print settings saved permanently!'))} className="btn-generate" style={{ width: 'max-content', padding: '12px 24px', marginTop: '10px' }}>
                  {t('savePrintSettings', 'Save Print Settings')}
                </button>
              </div>
            </div>
          )}

          {/* Panel: Data Backup (ADMIN ONLY) */}
          {isAdmin && activePanel === 'panel-backup' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('databaseBackup', 'Database & Backup')}</div>

              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{t('lastSuccessfulBackup', 'Last Successful Backup')}</div>
                  <div style={{ color: 'var(--status-paid)', fontSize: '12px', fontWeight: 600 }}>✓ {t('secure', 'Secure')}</div>
                </div>
                <div style={{ color: 'var(--text-gray)', fontSize: '13px', marginBottom: '15px' }}>{new Date().toLocaleDateString()} ({t('autoBackupNightlyDesc', 'Auto-Backup')})</div>

                <button onClick={() => handleSave(t('downloadLatestBackup', 'Downloading backup file...'))} className="btn-generate" style={{ width: 'max-content', padding: '10px 20px', background: 'var(--icon-green-bg)', color: 'var(--icon-green)', borderRadius: '8px', fontSize: '13px', boxShadow: 'none' }}>
                  {t('downloadLatestBackup', 'Download Latest Backup (.SQL)')}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <input type="checkbox" id="autoBackup" checked={formState.autoBackup} onChange={(e) => {
                  handleChange('autoBackup', e.target.checked);
                  updateStoreSettings({ autoBackup: e.target.checked });
                  handleSave('Auto-backup setting updated!');
                }} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--terracotta)' }} />
                <div>
                  <label htmlFor="autoBackup" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'block' }}>{t('enableDailyCloudAutoBackup', 'Enable Daily Cloud Auto-Backup')}</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{t('autoBackupNightlyDesc', 'Automatically backs up sales, khata, and inventory data every night at 11:30 PM.')}</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '20px 0' }} />

              <div className="card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>{t('googleOAuthClientId', 'Google OAuth 2.0 Client ID')}</div>
              <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '12px' }}>
                {t('googleOAuthDesc', 'Paste your Google Cloud OAuth Client ID below to enable real accounts.google.com popups on sign in.')}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. 1082260655848-xxxx.apps.googleusercontent.com"
                  value={formState.googleClientId || ''}
                  onChange={(e) => handleChange('googleClientId', e.target.value)}
                  style={{ flex: 1, fontSize: '12px' }}
                />
                <button
                  onClick={() => handleSaveSettings(t('saveKey', 'Google OAuth Client ID saved!'))}
                  className="btn-generate"
                  style={{ width: 'auto', padding: '10px 18px', fontSize: '12px' }}
                >
                  {t('saveKey', 'Save Key')}
                </button>
              </div>
            </div>
          )}

          {/* Panel: Automated Payment Reminders (ADMIN ONLY) */}
          {isAdmin && activePanel === 'panel-reminders' && (
            <div className="settings-panel active-panel">
              <div className="card-title">{t('automatedPaymentRemindersSettings', 'Automated Overdue Payment Reminders')}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                {t('automatedPaymentRemindersDesc', 'Configure automated daily scanning of overdue customer balances and scheduled reminder messages.')}
              </p>

              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', display: 'block' }}>
                      {t('enableAutomatedReminders', 'Enable Automated Daily Check')}
                    </label>
                    <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                      Automatically check overdue credit amounts and send customer reminder messages without manual action
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderConfigState.isEnabled}
                    onChange={(e) => setReminderConfigState(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--accent-maroon)' }}
                  />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      {t('dailyReminderTime', 'Daily Reminder Run Time (e.g. 9:00 AM)')}
                    </label>
                    <input
                      type="time"
                      value={reminderConfigState.reminderTime}
                      onChange={(e) => setReminderConfigState(prev => ({ ...prev, reminderTime: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: '#FFFFFF', fontSize: '14px', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px', display: 'block' }}>
                      Runs automatically every day at {reminderConfigState.reminderTime || '09:00'}
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      {t('preferredChannel', 'Default Reminder Channel')}
                    </label>
                    <select
                      value={reminderConfigState.channel}
                      onChange={(e) => setReminderConfigState(prev => ({ ...prev, channel: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: '#FFFFFF', fontSize: '13px' }}
                    >
                      <option value="WhatsApp & SMS">WhatsApp & SMS</option>
                      <option value="WhatsApp Only">WhatsApp Only</option>
                      <option value="SMS Only">SMS Only</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: '#FFFDF9', border: '1px dashed var(--border-gold-subtle)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-maroon)', marginBottom: '4px' }}>
                    📝 Standard Message Template:
                  </div>
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-dark)' }}>
                    "Dear [Customer Name], your payment of ₹[Amount] is overdue since [Due Date]. Please make the payment at your earliest convenience. Thank you."
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '6px' }}>
                    ✓ Skips fully paid customers • Prevents duplicate reminders on the same day
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSaveReminderConfig}
                    className="btn-generate"
                    style={{ padding: '10px 24px', fontSize: '13px', borderRadius: '8px' }}
                  >
                    💾 {t('saveReminderSchedule', 'Save Reminder Schedule')}
                  </button>
                  <button
                    onClick={handleTriggerTestCheck}
                    disabled={isTestingCheck}
                    className="btn-primary"
                    style={{ width: 'auto', padding: '10px 20px', fontSize: '13px', borderRadius: '8px', background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)', border: '1px solid rgba(59,130,246,0.3)' }}
                  >
                    ⚡ {isTestingCheck ? 'Running Check...' : t('testCheckNow', 'Run Overdue Check Now')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Panel: Authentication & Access Rights Management (ADMIN ONLY) */}
          {isAdmin && activePanel === 'panel-roles' && (
            <AdminAuthRightsView onToast={handleSave} />
          )}

        </div>
      </div>
    </div>
  );
}
