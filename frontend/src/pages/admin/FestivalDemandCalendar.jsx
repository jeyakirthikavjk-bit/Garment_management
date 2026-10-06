import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import { dbService } from '../../services/dbService';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import usePagination from '../../hooks/usePagination';

const DEFAULT_FESTIVALS = [
  {
    id: 'deepavali-2026',
    name: 'Deepavali / Diwali',
    nameTamil: 'தீபாவளி திருநாள்',
    date: '2026-10-20',
    icon: '🪔',
    bannerGradient: 'linear-gradient(135deg, #78350F 0%, #D97706 50%, #B45309 100%)',
    accentColor: '#F59E0B',
    tagline: 'Grand Festival of Lights - Peak Festive Garment Boom',
    taglineTamil: 'தீபத் திருநாள் - ஆண்டின் உச்சக்கட்ட ஆடை விற்பனை திருவிழா',
    advisory: 'Deepavali accounts for 35-40% of annual textile retail revenue. Order Silk Sarees, Designer Kurtis, and Menswear Kurtas from Surat and Kanchipuram weavers immediately.',
    advisoryTamil: 'தீபாவளிக்கு இன்னும் குறைவான நாட்களே உள்ளன: 150 பட்டுப்புடவைகள், 80 குர்தி செட்கள் மற்றும் 50 வேஷ்டி/குர்தாக்கள் முன்கூட்டியே ஆர்டர் செய்யவும்.',
    highDemandCategories: [
      { category: 'Silk & Sarees', item: 'Kanchipuram & Banarasi Silk Sarees', targetQty: 150, currentStock: 35, deficit: 115, unitCost: 2800, leadTime: '15-20 Days', millOrigin: 'Kanchipuram & Surat' },
      { category: 'Designer Kurtis', item: 'Chanderi & Georgette Festive Kurtis', targetQty: 120, currentStock: 40, deficit: 80, unitCost: 1450, leadTime: '10-12 Days', millOrigin: 'Ahmedabad & Jaipur' },
      { category: 'Menswear & Kurta', item: 'Linen & Silk Kurta Pyjama Sets', targetQty: 90, currentStock: 38, deficit: 52, unitCost: 1650, leadTime: '8-10 Days', millOrigin: 'Surat & Tiruppur' },
      { category: 'Kids Ethnic', item: 'Pattu Pavadai & Boys Dhoti Sherwani', targetQty: 80, currentStock: 25, deficit: 55, unitCost: 950, leadTime: '7-10 Days', millOrigin: 'Erode & Salem' }
    ],
    whatsappTeaser: '✨ ThreadLine Grand Deepavali Collection Arrived! Exclusive Kanchipuram Silk Sarees, Designer Kurtis & Menswear now available at wholesale prices. Contact us to book advance orders before stocks run out!'
  },
  {
    id: 'pongal-2027',
    name: 'Thai Pongal & Sankranti',
    nameTamil: 'தைப்பொங்கல் திருவிழா',
    date: '2027-01-14',
    icon: '🌾',
    bannerGradient: 'linear-gradient(135deg, #064E3B 0%, #059669 50%, #047857 100%)',
    accentColor: '#10B981',
    tagline: 'Harvest Festival of Prosperity & Traditional Handloom',
    taglineTamil: 'உழவர் திருநாள் - பாரம்பரிய பட்டு வேஷ்டி மற்றும் காட்டன் ஆடைகள்',
    advisory: 'Peak demand for pure Cotton Sarees, Silk Dhotis with Gold Zari borders, and traditional Pattu Pavadai for children.',
    advisoryTamil: 'பொங்கல் பண்டிகைக்கு பட்டு வேஷ்டி, காட்டன் புடவைகள் மற்றும் பட்டு பாவாடை தேவைகள் அதிகரிக்கும். ஈரோடு/சேலம் நெசவாளர்களிடம் ஆர்டர் செய்யவும்.',
    highDemandCategories: [
      { category: 'Dhoti & Pattu Sets', item: 'Pure Silk Gold Zari Dhoti & Angavastram', targetQty: 100, currentStock: 28, deficit: 72, unitCost: 1850, leadTime: '12-14 Days', millOrigin: 'Salem & Kanchipuram' },
      { category: 'Cotton Sarees', item: 'Coimbatore & Madurai Sungudi Sarees', targetQty: 130, currentStock: 45, deficit: 85, unitCost: 1100, leadTime: '10 Days', millOrigin: 'Coimbatore & Madurai' },
      { category: 'Kids Ethnic', item: 'Traditional Pattu Pavadai Sets', targetQty: 75, currentStock: 20, deficit: 55, unitCost: 850, leadTime: '7 Days', millOrigin: 'Tiruppur' }
    ],
    whatsappTeaser: '🌾 ThreadLine Pongal Traditional Handloom Collection is live! Authentic Pattu Dhotis, Sungudi Sarees & Kids Pattu Pavadai ready for dispatch.'
  },
  {
    id: 'ramzan-2027',
    name: 'Ramzan & Eid-ul-Fitr',
    nameTamil: 'ரம்ஜான் & ஈத் திருநாள்',
    date: '2027-03-29',
    icon: '🌙',
    bannerGradient: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #312E81 100%)',
    accentColor: '#818CF8',
    tagline: 'Sacred Celebration of Grace & Grand Pathani Ensembles',
    taglineTamil: 'புனித ஈத் திருநாள் - பிரம்மாண்ட பாத்தானி & லக்னோவி ஆடைகள்',
    advisory: 'Heavy surge in Lucknowi Chikankari Kurtas, Pathani Suits with mirror work, Anarkali Suits, and Georgette Abayas.',
    advisoryTamil: 'ஈத் பண்டிகைக்கு லக்னோவி குர்தாக்கள், பாத்தானி சூட்கள் மற்றும் அனார்கலி ஆடைகள் அதிகளவில் தேவைப்படும்.',
    highDemandCategories: [
      { category: 'Pathani & Kurta', item: 'Mens Designer Pathani Suit Sets', targetQty: 110, currentStock: 30, deficit: 80, unitCost: 1950, leadTime: '14 Days', millOrigin: 'Lucknow & Surat' },
      { category: 'Anarkali & Gowns', item: 'Heavy Embroidered Festive Anarkalis', targetQty: 85, currentStock: 22, deficit: 63, unitCost: 3200, leadTime: '18 Days', millOrigin: 'Delhi & Mumbai' },
      { category: 'Designer Kurtis', item: 'Chikankari Pastel Kurti Sets', targetQty: 95, currentStock: 35, deficit: 60, unitCost: 1600, leadTime: '10 Days', millOrigin: 'Lucknow' }
    ],
    whatsappTeaser: '🌙 ThreadLine Eid Mubarak Collection! Premium Pathani Suits, Chikankari Kurtas & Designer Festive Gowns now in stock.'
  },
  {
    id: 'muhurtham-2026',
    name: 'Muhurtham & Wedding Season',
    nameTamil: 'சுப முகூர்த்த & திருமண சீசன்',
    date: '2026-11-15',
    icon: '👑',
    bannerGradient: 'linear-gradient(135deg, #831843 0%, #BE123C 50%, #9F1239 100%)',
    accentColor: '#FB7185',
    tagline: 'Royal Bridal Silks, Groom Sherwanis & Grand Trousseau',
    taglineTamil: 'மணப்பெண் பட்டுப்புடவைகள் & மணமகன் ஆடைகளுக்கான பிரத்யேக சீசன்',
    advisory: 'Wedding season drives high basket size orders. Ensure high stocks of Pure Silk Wedding Sarees, Groom Sherwanis, and Tailored Italian Linen Suits.',
    advisoryTamil: 'முகூர்த்த சீசனுக்கு திருமண பட்டுப்புடவைகள், மணமகன் ஷெர்வானி மற்றும் லினன் சூட்கள் முன்கூட்டியே சேமித்து வைக்கவும்.',
    highDemandCategories: [
      { category: 'Bridal Silk', item: 'Pure Kanchipuram Bridal Silk Saree', targetQty: 80, currentStock: 18, deficit: 62, unitCost: 8500, leadTime: '25 Days', millOrigin: 'Kanchipuram' },
      { category: 'Sherwani & Suits', item: 'Custom Tailored Linen & Velvet Suits', targetQty: 65, currentStock: 15, deficit: 50, unitCost: 4500, leadTime: '15 Days', millOrigin: 'Ahmedabad Master Tailor' },
      { category: 'Lehenga Sets', item: 'Bridal Zari & Sequin Lehengas', targetQty: 45, currentStock: 10, deficit: 35, unitCost: 6500, leadTime: '20 Days', millOrigin: 'Surat & Jaipur' }
    ],
    whatsappTeaser: '👑 ThreadLine Royal Wedding & Muhurtham Studio is open! High-end Bridal Silks, Groom Sherwanis & Linen Suits available for bulk booking.'
  },
  {
    id: 'navratri-2026',
    name: 'Navratri & Dussehra',
    nameTamil: 'நவராத்திரி & தசரா திருவிழா',
    date: '2026-10-02',
    icon: '💃',
    bannerGradient: 'linear-gradient(135deg, #831843 0%, #C026D3 50%, #7E22CE 100%)',
    accentColor: '#E879F9',
    tagline: '9 Nights of Dance, Colors & Mirror-Work Chaniya Choli',
    taglineTamil: 'ஒன்பது நாள் திருவிழா - வண்ணமயமான கண்ணாடி வேலைப்பாடு ஆடைகள்',
    advisory: 'Intense short-duration demand for traditional Garba Chaniya Choli with kutchi mirror work, vibrant bandhani dupattas, and kedia sets.',
    advisoryTamil: 'நவராத்திரி டான்ஸ் ஆடைகள், மிரர் ஒர்க் குர்திகள் மற்றும் பந்தனி துப்பட்டாக்கள் உடனடியாக தேவை.',
    highDemandCategories: [
      { category: 'Chaniya Choli', item: 'Mirror Work Flare Chaniya Choli', targetQty: 90, currentStock: 25, deficit: 65, unitCost: 2200, leadTime: '10 Days', millOrigin: 'Bhuj & Ahmedabad' },
      { category: 'Bandhani Sarees', item: 'Pure Silk Bandhani & Leheriya Sarees', targetQty: 70, currentStock: 20, deficit: 50, unitCost: 1800, leadTime: '8 Days', millOrigin: 'Jaipur & Rajkot' }
    ],
    whatsappTeaser: '💃 Get Ready for Navratri with ThreadLine! Authentic Mirror Work Chaniya Choli & Bandhani Dupattas ready in warehouse.'
  }
];

export default function FestivalDemandCalendar() {
  const navigate = useNavigate();
  const { products, customers } = useArea();
  const { language, setLanguage, t } = useSettings();

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const lang = language;
  const [selectedFestId, setSelectedFestId] = useState(DEFAULT_FESTIVALS[0].id);

  // Custom Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem('threadline_custom_festivals');
    return saved ? JSON.parse(saved) : [];
  });

  const [newEventForm, setNewEventForm] = useState({
    name: '',
    nameTamil: '',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    icon: '🎉',
    advisory: '',
    advisoryTamil: ''
  });

  // Supplier Purchase Order (PO) Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedPOCategory, setSelectedPOCategory] = useState(null);
  const [poQuantity, setPoQuantity] = useState(50);
  const [poSupplier, setPoSupplier] = useState('Surat Handloom Mills Ltd');

  const allFestivals = useMemo(() => {
    return [...DEFAULT_FESTIVALS, ...customEvents];
  }, [customEvents]);

  const activeFestival = useMemo(() => {
    return allFestivals.find(f => f.id === selectedFestId) || allFestivals[0];
  }, [allFestivals, selectedFestId]);

  // Real-time Countdown Calculation
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const festDate = new Date(activeFestival.date).getTime();
      const now = new Date().getTime();
      const diff = festDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [activeFestival]);

  // Live Category Stock Computation from real-time products database
  const getLiveCategoryStock = (categoryName, itemName) => {
    const catLower = (categoryName || '').toLowerCase();
    const itemLower = (itemName || '').toLowerCase();

    const matching = products.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      return (
        pName.includes(catLower) ||
        pCat.includes(catLower) ||
        pName.includes(itemLower) ||
        itemLower.includes(pName) ||
        (catLower.includes('silk') && (pName.includes('silk') || pCat.includes('saree') || pCat.includes('silk'))) ||
        (catLower.includes('saree') && (pName.includes('saree') || pCat.includes('saree'))) ||
        (catLower.includes('kurti') && (pName.includes('kurti') || pCat.includes('kurti'))) ||
        (catLower.includes('menswear') && (pName.includes('shirt') || pCat.includes('menswear') || pName.includes('kurta') || pName.includes('suit'))) ||
        (catLower.includes('dhoti') && (pName.includes('dhoti') || pCat.includes('dhoti') || pCat.includes('menswear'))) ||
        (catLower.includes('pathani') && (pName.includes('suit') || pCat.includes('menswear') || pName.includes('shirt'))) ||
        (catLower.includes('kids') && (pName.includes('kids') || pCat.includes('kids') || pName.includes('pattu')))
      );
    });

    if (matching.length > 0) {
      return matching.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    }
    return 0;
  };

  // Enriched dynamic categories with live stock counts and real deficit calculation
  const dynamicCategories = useMemo(() => {
    return (activeFestival.highDemandCategories || []).map(cat => {
      const liveStock = getLiveCategoryStock(cat.category, cat.item);
      const deficit = Math.max(0, cat.targetQty - liveStock);
      return {
        ...cat,
        currentStock: liveStock,
        deficit
      };
    });
  }, [activeFestival, products]);

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedCategories,
    setPage,
    setPageSize,
    startIndex,
    endIndex,
  } = usePagination(dynamicCategories, 5);

  // KPI Metrics for Active Festival
  const totalTargetQty = dynamicCategories.reduce((sum, c) => sum + (c.targetQty || 0), 0);
  const totalCurrentStock = dynamicCategories.reduce((sum, c) => sum + (c.currentStock || 0), 0);
  const totalDeficitQty = Math.max(0, totalTargetQty - totalCurrentStock);
  const totalEstimatedRevenue = dynamicCategories.reduce((sum, c) => sum + ((c.targetQty || 0) * (c.unitCost || 1500) * 1.4), 0);

  // Handlers
  const handleCreateCustomEvent = (e) => {
    e.preventDefault();
    if (!newEventForm.name.trim()) {
      showToast('Please enter event name', 'error');
      return;
    }

    const newFest = {
      id: `custom-fest-${Date.now()}`,
      name: newEventForm.name,
      nameTamil: newEventForm.nameTamil || newEventForm.name,
      date: newEventForm.date,
      icon: newEventForm.icon || '🎉',
      bannerGradient: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)',
      accentColor: '#38BDF8',
      tagline: 'Custom Store Event & Promotional Campaign',
      taglineTamil: 'தனிப்பயன் விற்பனை நிகழ்வு மற்றும் திருவிழா',
      advisory: newEventForm.advisory || `Stock advisory for ${newEventForm.name}. Prepare stock 2 weeks in advance.`,
      advisoryTamil: newEventForm.advisoryTamil || `${newEventForm.nameTamil || newEventForm.name} நிகழ்வுக்கு தேவையான ஆடைகளை முன்கூட்டியே தயார் செய்யவும்.`,
      highDemandCategories: [
        { category: 'Special Collection', item: `${newEventForm.name} Festive Sets`, targetQty: 100, currentStock: 30, deficit: 70, unitCost: 1800, leadTime: '10-14 Days', millOrigin: 'Regional Weavers' }
      ],
      whatsappTeaser: `🎉 Special Announcement: ${newEventForm.name} Special Collection is now open at ThreadLine Garments!`
    };

    const updated = [newFest, ...customEvents];
    setCustomEvents(updated);
    localStorage.setItem('threadline_custom_festivals', JSON.stringify(updated));
    setSelectedFestId(newFest.id);
    setShowAddEventModal(false);
    showToast(`✓ Custom Event "${newFest.name}" added to Festival Calendar!`);
  };

  const handleOpenPOModal = (cat) => {
    setSelectedPOCategory(cat);
    setPoQuantity(cat.deficit || 50);
    setShowPOModal(true);
  };

  const handleGeneratePO = (e) => {
    e.preventDefault();
    setShowPOModal(false);

    const poId = `PO-FEST-${Date.now().toString().slice(-4)}`;
    const cost = Number(poQuantity || 50) * Number(selectedPOCategory?.unitCost || 1800);
    const newPO = {
      id: poId,
      supplier: poSupplier || 'Kanchipuram Heritage Looms',
      supplierId: 'SUP-001',
      amount: `₹ ${cost.toLocaleString('en-IN')}`,
      numAmount: cost,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      delivery: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: `${selectedPOCategory?.item || 'Festive Garments'} (${poQuantity} pcs)`,
      status: 'Placed',
      statusType: 'placed',
      notes: `Auto-generated via Festival Demand Intelligence Model for ${activeFestival.name}`
    };

    try {
      dbService.addItem('supplierPurchases', newPO);
    } catch (err) {
      console.warn('Could not persist PO to dbService:', err);
    }

    showToast(`✓ Purchase Order ${poId} for ${poQuantity} pcs issued & recorded in Suppliers!`);
  };

  const handleBroadcastWhatsApp = () => {
    const text = encodeURIComponent(activeFestival.whatsappTeaser || 'ThreadLine Festival Collection Arrived!');
    window.open(`https://wa.me/?text=${text}`, '_blank');
    showToast('✓ WhatsApp Festive Broadcast template opened!');
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>🪔</span>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                {t('festivalDemandCalendar', 'Festival Demand Calendar')}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                {lang === 'ta'
                  ? 'தீபாவளி, பொங்கல், ரம்ஜான் & முகூர்த்த சீசன் தேவைகளை முன்கூட்டியே கணிக்கும் ஆலோசகர்'
                  : lang === 'hi'
                    ? 'दीवाली, पोंगल, ईद एवं विवाह सीजन के लिए पूर्वानुमानित स्टॉक एवं मांग परामर्श'
                    : lang === 'gu'
                      ? 'દિવાળી, પોંગલ, ઈદ અને લગ્ન સીઝન માટે સ્ટોક અને માંગ સલાહકાર'
                      : 'Predictive Stock Advisory & Procurement Intelligence for Diwali, Pongal, Eid & Wedding Seasons'}
              </p>
            </div>
          </div>
        </div>

        {/* Language Switcher & Action */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: language === 'en' ? 700 : 500,
                fontSize: '12px',
                background: language === 'en' ? 'var(--accent-terracotta)' : 'transparent',
                color: language === 'en' ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              EN 🇬🇧
            </button>
            <button
              onClick={() => setLanguage('ta')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: language === 'ta' ? 700 : 500,
                fontSize: '12px',
                background: language === 'ta' ? 'var(--accent-terracotta)' : 'transparent',
                color: language === 'ta' ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              தமிழ் 🇮🇳
            </button>
            <button
              onClick={() => setLanguage('hi')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: language === 'hi' ? 700 : 500,
                fontSize: '12px',
                background: language === 'hi' ? 'var(--accent-terracotta)' : 'transparent',
                color: language === 'hi' ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              हिंदी 🇮🇳
            </button>
            <button
              onClick={() => setLanguage('gu')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: language === 'gu' ? 700 : 500,
                fontSize: '12px',
                background: language === 'gu' ? 'var(--accent-terracotta)' : 'transparent',
                color: language === 'gu' ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer'
              }}
            >
              ગુજરાતી 🇮🇳
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={() => setShowAddEventModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px' }}
          >
            <span>+</span> {t('addNewFestiveEvent', 'Add Custom Event')}
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            {activeFestival.icon}
          </div>
          <div className="kpi-info">
            <h4>{t('spotlightFestival', 'Spotlight Festival')}</h4>
            <div className="value" style={{ fontSize: '18px' }}>
              {lang === 'ta' ? activeFestival.nameTamil : activeFestival.name}
            </div>
            <div className="sub">{timeLeft.days} {t('daysRemaining', 'Days remaining')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            📦
          </div>
          <div className="kpi-info">
            <h4>{t('estimatedDemand', 'Estimated Demand')}</h4>
            <div className="value">{totalTargetQty} pcs</div>
            <div className="sub">{totalCurrentStock} {t('inWarehouse', 'pcs in warehouse')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            ⚠️
          </div>
          <div className="kpi-info">
            <h4>{t('procurementDeficit', 'Procurement Deficit')}</h4>
            <div className="value" style={{ color: '#EF4444' }}>+{totalDeficitQty} pcs</div>
            <div className="sub">{t('immediateReorder', 'Immediate reorder needed')}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}>
            💰
          </div>
          <div className="kpi-info">
            <h4>{t('festiveRevenueOpportunity', 'Festive Revenue Opportunity')}</h4>
            <div className="value" style={{ color: 'var(--status-paid)', fontSize: '20px' }}>
              ₹{Math.round(totalEstimatedRevenue).toLocaleString('en-IN')}
            </div>
            <div className="sub">{t('projectedBilling', 'Projected billing')}</div>
          </div>
        </div>
      </div>

      {/* Festival Selector Carousel / Tabs */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '24px' }}>
        {allFestivals.map(f => {
          const isSelected = f.id === selectedFestId;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFestId(f.id)}
              style={{
                flex: '0 0 auto',
                padding: '12px 18px',
                borderRadius: '14px',
                border: isSelected ? '2px solid var(--accent-terracotta)' : '1px solid var(--border-light)',
                background: isSelected ? 'var(--bg-card-solid)' : 'var(--bg-main)',
                boxShadow: isSelected ? '0 8px 20px rgba(212, 175, 55, 0.2)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '22px' }}>{f.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--accent-terracotta)' : 'var(--text-dark)' }}>
                  {lang === 'ta' ? f.nameTamil : f.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                  {new Date(f.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Spotlight Festival Hero Banner with Live Countdown Clock */}
      <div
        className="card"
        style={{
          background: activeFestival.bannerGradient,
          color: '#FFFFFF',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '28px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', position: 'relative', zIndex: 2 }}>
          <div style={{ flex: '1 1 380px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              ⚡ {t('stockAdvisoryHero', 'Festive Trend & Stock Advisory')}
            </div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '28px', fontWeight: 700, margin: '4px 0', color: '#FFFFFF' }}>
              {activeFestival.icon} {lang === 'ta' ? activeFestival.nameTamil : activeFestival.name}
            </h2>
            <p style={{ fontSize: '14px', color: '#FDE68A', fontWeight: 600, margin: '0 0 14px 0' }}>
              {lang === 'ta' ? activeFestival.taglineTamil : activeFestival.tagline}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '14px 18px', borderRadius: '12px', borderLeft: '4px solid #F59E0B', marginBottom: '20px', fontSize: '13.5px', lineHeight: 1.6 }}>
              <strong>💡 {t('stockAdvisoryTitle', 'Stock Advisory:')} </strong>
              <span>{lang === 'ta' ? activeFestival.advisoryTamil : activeFestival.advisory}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleBroadcastWhatsApp}
                style={{
                  padding: '10px 18px',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> {t('broadcastWhatsAppOffer', 'Broadcast WhatsApp Festive Offer')}
              </button>

              <button
                onClick={() => navigate('/inventory/add')}
                style={{
                  padding: '10px 18px',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                + {t('addNewInventoryStockBtn', 'Add New Inventory Stock')}
              </button>
            </div>
          </div>

          {/* Live Countdown Timer Clock Box */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: '24px 28px',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center',
              minWidth: '280px'
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#FDE68A', fontWeight: 700, marginBottom: '12px' }}>
              ⏳ {t('timeRemainingToFestival', 'Time Remaining to Festival')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 6px', borderRadius: '10px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Playfair Display' }}>{timeLeft.days}</div>
                <div style={{ fontSize: '10px', color: '#E2E8F0', textTransform: 'uppercase' }}>{t('daysUnit', 'Days')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 6px', borderRadius: '10px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Playfair Display' }}>{timeLeft.hours}</div>
                <div style={{ fontSize: '10px', color: '#E2E8F0', textTransform: 'uppercase' }}>{t('hoursUnit', 'Hours')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 6px', borderRadius: '10px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Playfair Display' }}>{timeLeft.minutes}</div>
                <div style={{ fontSize: '10px', color: '#E2E8F0', textTransform: 'uppercase' }}>{t('minsUnit', 'Mins')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 6px', borderRadius: '10px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Playfair Display' }}>{timeLeft.seconds}</div>
                <div style={{ fontSize: '10px', color: '#E2E8F0', textTransform: 'uppercase' }}>{t('secsUnit', 'Secs')}</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#CBD5E1' }}>
              📅 {t('festivalDateLabel', 'Festival Date:')} <strong>{new Date(activeFestival.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Deficit & High Demand Matrix */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
              🎯 {t('highDemandGarmentsTitle', 'High-Demand Garments & Procurement Gap Matrix')}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
              {t('gapMatrixSub', 'Items predicted to stock out during peak rush and recommended sourcing lead times from textile mills')}
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('garmentCategoryItem', 'Garment Category & Item')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('currentStockCol', 'Current Stock')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('targetStockCol', 'Target Stock')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('stockGapDeficit', 'Stock Gap (Deficit)')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('millOriginLeadTime', 'Mill Origin & Lead Time')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px', color: 'var(--text-gray)' }}>
                  {t('action', 'Action')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.map((cat, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{cat.item}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>🏷️ {cat.category} • Avg Unit Cost: ₹{cat.unitCost}</div>
                  </td>

                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span
                      onClick={() => navigate('/inventory')}
                      title="Click to view in Inventory"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: cat.currentStock > 0 ? 'var(--status-paid-bg)' : 'var(--status-out-bg)',
                        color: cat.currentStock > 0 ? 'var(--status-paid)' : 'var(--status-out)',
                        border: `1px solid ${cat.currentStock > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}
                    >
                      {cat.currentStock > 0 ? `🟢 ${cat.currentStock} pcs` : '🔴 0 pcs'}
                    </span>
                  </td>

                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: 'var(--accent-terracotta)' }}>
                    {cat.targetQty} pcs
                  </td>

                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '12px',
                        background: cat.deficit > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: cat.deficit > 0 ? '#EF4444' : '#10B981'
                      }}
                    >
                      {cat.deficit > 0 ? `+${cat.deficit} pcs` : `✓ ${t('sufficientStock', 'Sufficient Stock')}`}
                    </span>
                  </td>

                  <td style={{ padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>📍 {cat.millOrigin}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>⏳ Lead: {cat.leadTime}</div>
                  </td>

                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenPOModal(cat)}
                      style={{
                        padding: '7px 14px',
                        background: 'var(--accent-terracotta)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📝 {t('draftSupplierPO', 'Draft Supplier PO')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* MODAL 1: Add Custom Event / Festival */}
      {showAddEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                ✨ {t('addCustomFestiveEvent', 'Add Custom Festive Event')}
              </h3>
              <button onClick={() => setShowAddEventModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                  {t('eventNameEn', 'Event Name (English)')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aadi Special Sale, Regional Temple Festival"
                  value={newEventForm.name}
                  onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                  {t('eventNameTa', 'Event Name (Local)')}
                </label>
                <input
                  type="text"
                  placeholder="எ.கா: ஆடி தள்ளுபடி விற்பனை"
                  value={newEventForm.nameTamil}
                  onChange={e => setNewEventForm({ ...newEventForm, nameTamil: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                    {t('festivalDateLabel', 'Festival Date:')}
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.date}
                    onChange={e => setNewEventForm({ ...newEventForm, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                    {t('iconEmojiLabel', 'Icon / Emoji')}
                  </label>
                  <input
                    type="text"
                    value={newEventForm.icon}
                    onChange={e => setNewEventForm({ ...newEventForm, icon: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                  {t('stockAdvisoryNoteLabel', 'Stock Advisory Note')}
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Advance stock needed for cotton sarees and festival kurtis..."
                  value={newEventForm.advisory}
                  onChange={e => setNewEventForm({ ...newEventForm, advisory: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 700 }}>
                  ✓ {t('addToCalendarBtn', 'Add to Calendar')}
                </button>
                <button type="button" onClick={() => setShowAddEventModal(false)} style={{ padding: '12px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Supplier Purchase Order Draft */}
      {showPOModal && selectedPOCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-terracotta)' }}>{t('purchaseOrderDraft', 'PURCHASE ORDER DRAFT')}</span>
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-dark)' }}>
                  {selectedPOCategory.item}
                </h3>
              </div>
              <button onClick={() => setShowPOModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-gray)' }}>✕</button>
            </div>

            <form onSubmit={handleGeneratePO} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                  {t('textileMillSupplier', 'Textile Mill / Wholesale Supplier')}
                </label>
                <select
                  value={poSupplier}
                  onChange={e => setPoSupplier(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                >
                  <option value="Surat Handloom Mills Ltd">Surat Handloom Mills Ltd (Surat)</option>
                  <option value="Sri Kanchi Silk Weavers Society">Sri Kanchi Silk Weavers Society (Kanchipuram)</option>
                  <option value="Tiruppur Cotton Garments Hub">Tiruppur Cotton Garments Hub (Tiruppur)</option>
                  <option value="Ahmedabad Linen & Suiting Mill">Ahmedabad Linen & Suiting Mill (Ahmedabad)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                    {t('orderQtyPcs', 'Order Quantity (pcs)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={poQuantity}
                    onChange={e => setPoQuantity(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                    {t('estimatedUnitCost', 'Estimated Unit Cost (₹)')}
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={selectedPOCategory.unitCost || 1500}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-gray)' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600 }}>{t('totalEstimatedPOValue', 'Total Estimated PO Value:')}</span>
                <strong style={{ fontSize: '16px', color: 'var(--status-paid)' }}>₹{(poQuantity * (selectedPOCategory.unitCost || 1500)).toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 700 }}>
                  ✓ {t('issueSupplierPO', 'Issue Supplier Purchase Order')}
                </button>
                <button type="button" onClick={() => setShowPOModal(false)} style={{ padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer' }}>
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
