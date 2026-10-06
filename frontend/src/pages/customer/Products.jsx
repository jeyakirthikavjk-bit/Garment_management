import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { pinterestService } from '../../services/pinterestService';
import { getRecommendedProductsForCustomer, getCustomerAffinity } from '../../services/recommendationService';
import SupplierProductsView from '../../components/supplier/SupplierProductsView';

export default function Products() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const { products, setProducts, feedbacks, addFeedback, saveCustomerRequirement, customers = [], sales = [], requirements = [] } = useArea();
  const { isCustomerRole, isSupplier, customerId, customerName, userName } = useAuth();

  if (isSupplier) {
    return <SupplierProductsView />;
  }

  // Active customer resolution for personalized recommendations
  const activeCustomer = (customers || []).find(c =>
    c.id === Number(customerId) ||
    (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
  ) || (customers && customers[0]) || { id: 1, name: customerName || userName || 'Customer', shopName: 'Retail Store' };

  const customerSales = (sales || []).filter(s => s.customerId === activeCustomer.id || s.customer === activeCustomer.name);
  const customerRequirements = (requirements || []).filter(r => r.customerId === activeCustomer.id || r.customer === activeCustomer.name);

  const customerRecommendations = React.useMemo(() => {
    return getRecommendedProductsForCustomer({
      customer: activeCustomer,
      products: products || [],
      customerSales,
      customerRequirements,
      limit: 8
    });
  }, [activeCustomer, products, customerSales, customerRequirements]);

  const { primaryNiche } = React.useMemo(() => {
    return getCustomerAffinity(activeCustomer, customerSales, customerRequirements);
  }, [activeCustomer, customerSales, customerRequirements]);

  const [activeCatalogTab, setActiveCatalogTab] = useState('catalog'); // 'catalog' | 'feedbacks'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sizeFilter, setSizeFilter] = useState('All Sizes');
  const [colorFilter, setColorFilter] = useState('All Colors');
  const [stockStatusFilter, setStockStatusFilter] = useState('All Stock');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [stockHistoryProduct, setStockHistoryProduct] = useState(null);
  const [quickAddStockProduct, setQuickAddStockProduct] = useState(null);
  const [addQty, setAddQty] = useState(10);

  // Customer Feedback & Order Modal states
  const [feedbackModalProduct, setFeedbackModalProduct] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [orderModalProduct, setOrderModalProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderSize, setOrderSize] = useState('L');
  const [orderColor, setOrderColor] = useState('Pink');
  const [orderUrgency, setOrderUrgency] = useState('Normal');
  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [orderNotes, setOrderNotes] = useState('');

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Womenswear',
    sku: '',
    stock: 15,
    price: 2499,
    size: 'L',
    color: 'Pink',
    details: '',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProductForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!productForm.name) return;

    const defaultImg = pinterestService.getCategoryFallback(productForm.category);
    const finalImg = productForm.image || defaultImg;
    const priceNum = Number(productForm.price);

    const newProd = {
      id: `prod-${Date.now()}`,
      name: productForm.name,
      category: productForm.category,
      sku: productForm.sku || `SKU-${Date.now().toString().slice(-4)}`,
      stock: Number(productForm.stock),
      price: priceNum,
      rating: 4.6,
      reviewsCount: 32,
      size: productForm.size || 'L',
      color: productForm.color || 'Pink',
      details: productForm.details || 'Garment Item',
      availableSizes: ['S', 'M', 'L', 'XL'],
      availableColors: ['Pink', 'Blue', 'White', 'Black'],
      godown1: Number(productForm.stock),
      godown2: 0,
      status: Number(productForm.stock) === 0 ? 'Out of Stock' : Number(productForm.stock) < 10 ? 'Low Stock' : 'In Stock',
      statusType: Number(productForm.stock) === 0 ? 'out-of-stock' : Number(productForm.stock) < 10 ? 'low-stock' : 'in-stock',
      image: finalImg,
      img: finalImg
    };

    setProducts([newProd, ...products]);
    setShowAddModal(false);
    showToast(`✓ Product "${newProd.name}" added successfully!`);
    setProductForm({ name: '', category: 'Womenswear', sku: '', stock: 15, price: 2499, size: 'L', color: 'Pink', details: '', image: defaultImg });
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    const clearImg = pinterestService.upgradeToClearImage(p.image || p.img, p.category);
    setProductForm({
      name: p.name,
      category: p.category,
      sku: p.sku,
      stock: p.stock,
      price: p.price,
      size: p.size || 'L',
      color: p.color || 'Pink',
      details: p.details || '',
      image: clearImg
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updatedStock = Number(productForm.stock);
    const updatedPrice = Number(productForm.price);
    const updatedStatus = updatedStock === 0 ? 'Out of Stock' : updatedStock < 10 ? 'Low Stock' : 'In Stock';
    const updatedStatusType = updatedStock === 0 ? 'out-of-stock' : updatedStock < 10 ? 'low-stock' : 'in-stock';
    const finalImg = productForm.image || editingProduct.image || editingProduct.img;

    setProducts(prev =>
      prev.map(p =>
        p.id === editingProduct.id
          ? {
            ...p,
            name: productForm.name,
            category: productForm.category,
            sku: productForm.sku,
            stock: updatedStock,
            price: updatedPrice,
            size: productForm.size,
            color: productForm.color,
            details: productForm.details,
            image: finalImg,
            img: finalImg,
            status: updatedStatus,
            statusType: updatedStatusType
          }
          : p
      )
    );

    setEditingProduct(null);
    showToast(`✓ Product "${productForm.name}" updated successfully!`);
  };

  const handleQuickAddStockSubmit = (e) => {
    e.preventDefault();
    if (!quickAddStockProduct) return;

    const newStock = quickAddStockProduct.stock + Number(addQty);
    const updatedStatus = newStock === 0 ? 'Out of Stock' : newStock < 10 ? 'Low Stock' : 'In Stock';

    setProducts(prev =>
      prev.map(p =>
        p.id === quickAddStockProduct.id
          ? { ...p, stock: newStock, status: updatedStatus }
          : p
      )
    );

    showToast(`✓ Added ${addQty} pcs to "${quickAddStockProduct.name}". New Stock: ${newStock} pcs.`);
    setQuickAddStockProduct(null);
    setAddQty(10);
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
    showToast(`✓ Product "${deletingProduct.name}" deleted.`, 'error');
    setDeletingProduct(null);
  };

  // Product Star Rating Calculator with Amazon social proof & reviews count
  const getProductRatingInfo = (prod) => {
    const prodFeedbacks = (feedbacks || []).filter(f =>
      f.productName && f.productName.toLowerCase() === (prod.name || '').toLowerCase()
    );
    if (prodFeedbacks.length > 0) {
      const total = prodFeedbacks.reduce((sum, f) => {
        const match = (f.rating || '').match(/★/g);
        const starVal = match ? match.length : (f.ratingNum || 5);
        return sum + starVal;
      }, 0);
      const avgVal = (total / prodFeedbacks.length).toFixed(1);
      const rounded = Math.min(5, Math.max(1, Math.round(Number(avgVal))));
      const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
      const count = (prod.reviewsCount || 400) + prodFeedbacks.length;
      return { avg: avgVal, count, stars, rounded, isDefault: false };
    }
    const avgVal = (prod.rating || 4.6).toFixed(1);
    const rounded = Math.min(5, Math.max(1, Math.round(Number(avgVal))));
    const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
    const count = prod.reviewsCount || 420;
    return { avg: avgVal, count, stars, rounded, isDefault: true };
  };

  const handleOpenFeedbackModal = (prod) => {
    setFeedbackModalProduct(prod);
    setFeedbackRating(5);
    setFeedbackComment('');
  };

  const handleSubmitProductFeedback = (e) => {
    e.preventDefault();
    if (!feedbackComment.trim() || !feedbackModalProduct) return;

    const starsStr = '★'.repeat(feedbackRating) + '☆'.repeat(5 - feedbackRating);
    const resolvedCustomer = customerName || (isCustomerRole ? (userName || 'Valued Customer') : 'Studio Client');
    const newFeedback = {
      id: Date.now(),
      customer: resolvedCustomer,
      customerId: customerId || null,
      productName: feedbackModalProduct.name,
      category: feedbackModalProduct.category,
      rating: starsStr,
      ratingNum: feedbackRating,
      comments: `"${feedbackComment.trim()}"`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    addFeedback(newFeedback);
    showToast(`✓ Review for "${feedbackModalProduct.name}" submitted successfully!`);
    setFeedbackModalProduct(null);
    setFeedbackComment('');
    setFeedbackRating(5);
  };

  const handleOpenOrderModal = (prod) => {
    setOrderModalProduct(prod);
    setOrderQty(1);
    setOrderSize(prod.size || (prod.availableSizes && prod.availableSizes[0]) || 'L');
    setOrderColor(prod.color || (prod.availableColors && prod.availableColors[0]) || 'Pink');
    setOrderUrgency('Normal');
    setOrderNotes('');
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setOrderDate(d.toISOString().split('T')[0]);
  };

  const handleCustomerOrderSubmit = (e) => {
    e.preventDefault();
    if (!orderModalProduct) return;

    const resolvedCustomer = customerName || (isCustomerRole ? (userName || 'Valued Customer') : 'Studio Client');
    saveCustomerRequirement({
      customerId: customerId || Date.now(),
      customerName: resolvedCustomer,
      garment: orderModalProduct.name,
      category: orderModalProduct.category,
      size: orderSize || orderModalProduct.size || 'Standard',
      color: orderColor || orderModalProduct.color || 'Default',
      quantity: Number(orderQty) || 1,
      budget: (orderModalProduct.price || 2499) * (Number(orderQty) || 1),
      requirementDate: orderDate,
      urgency: orderUrgency,
      notes: orderNotes.trim() || `Customer placed direct order request for ${orderQty} pcs of ${orderModalProduct.name}.`,
      fabric: orderModalProduct.category
    });

    showToast(`✓ Order request for ${orderQty}x "${orderModalProduct.name}" sent to Studio! Requirement logged.`);
    setOrderModalProduct(null);
    setOrderQty(1);
    setOrderNotes('');
  };

  // Helper status color calculator
  const getStockStatusStyle = (p) => {
    if (p.stock === 0 || p.status === 'Out of Stock') return { label: t('statusOutOfStock', 'OUT OF STOCK'), bg: 'var(--status-out-bg)', color: 'var(--status-out)' };
    if (p.stock < 10 || p.status === 'Low Stock') return { label: t('statusLowStock', 'LOW STOCK'), bg: 'var(--status-credit-bg)', color: 'var(--status-credit)' };
    return { label: t('statusInStock', 'IN STOCK'), bg: 'var(--status-paid-bg)', color: 'var(--status-paid)' };
  };

  const dynamicCategories = [
    'All Categories',
    '✨ Recommended For You',
    ...new Set([
      'Womenswear',
      'Menswear',
      'Ethnic Wear',
      'Sarees',
      'Kurtis',
      'Fabrics',
      ...products.map(p => p.category).filter(Boolean)
    ])
  ];

  const baseProductList = categoryFilter === '✨ Recommended For You'
    ? customerRecommendations
    : products;

  const filteredProducts = baseProductList.filter(p => {
    const query = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const color = (p.color || (Array.isArray(p.availableColors) ? p.availableColors.join(' ') : '')).toLowerCase();
      const size = (p.size || (Array.isArray(p.availableSizes) ? p.availableSizes.join(' ') : '')).toLowerCase();
      const details = (p.details || '').toLowerCase();
      const priceStr = String(p.price || '');
      const stockStr = String(p.stock || '');

      // Multi-word matching: all typed words must match anywhere across garment attributes
      const words = query.split(/\s+/).filter(Boolean);
      matchesSearch = words.every(word =>
        name.includes(word) ||
        sku.includes(word) ||
        category.includes(word) ||
        color.includes(word) ||
        size.includes(word) ||
        details.includes(word) ||
        priceStr.includes(word) ||
        stockStr.includes(word)
      );
    }

    const matchesCategory = categoryFilter === 'All Categories' || categoryFilter === '✨ Recommended For You' || p.category === categoryFilter;
    const matchesSize = sizeFilter === 'All Sizes' || (p.availableSizes || [p.size]).includes(sizeFilter);
    const matchesColor = colorFilter === 'All Colors' || (p.availableColors || [p.color]).includes(colorFilter);

    let matchesStock = true;
    if (stockStatusFilter === 'IN STOCK') matchesStock = p.stock >= 10;
    if (stockStatusFilter === 'LOW STOCK') matchesStock = p.stock > 0 && p.stock < 10;
    if (stockStatusFilter === 'OUT OF STOCK') matchesStock = p.stock === 0;

    return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesStock;
  });

  // Sorting logic: A-Z, Z-A, Price, Stock, Rating, SKU, Date
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
      case 'price-asc':
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case 'price-desc':
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case 'stock-desc':
        return (Number(b.stock) || 0) - (Number(a.stock) || 0);
      case 'stock-asc':
        return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      case 'rating-desc': {
        const rB = b.rating || 4.5;
        const rA = a.rating || 4.5;
        return rB - rA;
      }
      case 'sku-asc':
        return (a.sku || '').localeCompare(b.sku || '', undefined, { sensitivity: 'base' });
      case 'sku-desc':
        return (b.sku || '').localeCompare(a.sku || '', undefined, { sensitivity: 'base' });
      case 'newest':
        return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
      case 'oldest':
        return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      default:
        return 0;
    }
  });

  const isFiltered = searchTerm.trim() !== '' ||
    categoryFilter !== 'All Categories' ||
    sizeFilter !== 'All Sizes' ||
    colorFilter !== 'All Colors' ||
    stockStatusFilter !== 'All Stock' ||
    sortBy !== 'name-asc';

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All Categories');
    setSizeFilter('All Sizes');
    setColorFilter('All Colors');
    setStockStatusFilter('All Stock');
    setSortBy('name-asc');
  };

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedProducts,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(sortedProducts, 8);

  return (
    <div>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* Header Title, Tabs & Actions */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-dark)' }}>
                {isCustomerRole ? '👗 Haute Couture Lookbook & Catalog' : t('productCatalog')}
              </h1>
              {isCustomerRole ? (
                <span style={{ fontSize: '11px', background: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, letterSpacing: '0.4px' }}>
                  VIP Customer View
                </span>
              ) : (
                <span style={{ fontSize: '11px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', padding: '3px 10px', borderRadius: '14px', fontWeight: 800, letterSpacing: '0.4px' }}>
                  Admin Master Catalog
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-gray)', margin: '6px 0 0 0' }}>
              {isCustomerRole
                ? 'Live synchronized collection: Explore premium bridal sarees, designer lehengas, kurtis & couture fabrics. Place orders or share feedback.'
                : 'Real-time studio inventory & designer catalog management with synchronized customer lookbook & ratings.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {activeCatalogTab === 'catalog' && (
              <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '2px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: viewMode === 'grid' ? 'var(--accent-terracotta)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-dark)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  田 {t('grid', 'Product Cards')}
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: viewMode === 'table' ? 'var(--accent-terracotta)' : 'transparent', color: viewMode === 'table' ? 'white' : 'var(--text-dark)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  ☰ {t('table', 'Stock Table')}
                </button>
              </div>
            )}
            {!isCustomerRole && (
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <i>+</i> {t('addNewProduct', 'Add Product')}
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: [ Browse Catalog ] vs [ Customer Reviews & Feedbacks ] */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveCatalogTab('catalog')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: activeCatalogTab === 'catalog' ? '1px solid var(--accent-terracotta)' : '1px solid var(--border-light)',
              background: activeCatalogTab === 'catalog' ? 'var(--accent-terracotta)' : 'var(--bg-main)',
              color: activeCatalogTab === 'catalog' ? '#ffffff' : 'var(--text-dark)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>👗 {isCustomerRole ? 'Browse Couture Lookbook' : 'Garment Catalog & Stock'}</span>
            <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', background: activeCatalogTab === 'catalog' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)' }}>
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCatalogTab('feedbacks')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: activeCatalogTab === 'feedbacks' ? '1px solid var(--accent-terracotta)' : '1px solid var(--border-light)',
              background: activeCatalogTab === 'feedbacks' ? 'var(--accent-terracotta)' : 'var(--bg-main)',
              color: activeCatalogTab === 'feedbacks' ? '#ffffff' : 'var(--text-dark)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⭐ {t('customerFeedbackReviews', 'Customer Feedback & Reviews')}</span>
            <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', background: activeCatalogTab === 'feedbacks' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)' }}>
              {(feedbacks || []).length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content: Feedbacks Ledger vs Catalog */}
      {activeCatalogTab === 'feedbacks' ? (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-dark)' }}>
                ⭐ Customer Reviews & Garment Feedback ({feedbacks.length})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: '4px 0 0 0' }}>
                Real feedback, fabric reviews and rating notes from verified buyers.
              </p>
            </div>
            {/* ONLY CUSTOMER CAN WRITE A REVIEW - HIDDEN FOR SELLER */}
            {isCustomerRole && (
              <button
                onClick={() => {
                  setFeedbackModalProduct(products[0] || { name: 'General Studio Collection', category: 'Womenswear' });
                  setFeedbackRating(5);
                  setFeedbackComment('');
                }}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                <i>+</i> {t('submitNewFeedback', '+ Write Garment Review')}
              </button>
            )}
          </div>

          {(!feedbacks || feedbacks.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-gray)' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💬</div>
              <p style={{ fontWeight: 600 }}>No feedback recorded yet.</p>
              <p style={{ fontSize: '12px' }}>Be the first customer to share your thoughts on our Haute Couture designs!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-terracotta)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                        {(fb.customer || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{fb.customer}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-gray)' }}>{fb.date}</div>
                      </div>
                    </div>
                    <div style={{ color: '#F59E0B', fontSize: '14px', letterSpacing: '1px' }}>
                      {fb.rating}
                    </div>
                  </div>

                  {fb.productName && fb.productName !== 'General / Store Service' && (
                    <div style={{ fontSize: '11px', background: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, width: 'fit-content' }}>
                      👗 {fb.productName}
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: 'var(--text-dark)', fontStyle: 'italic', lineHeight: '1.5' }}>
                    {fb.comments}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Customer Top Recommendations Spotlight Shelf */}
          {customerRecommendations.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(217, 90, 78, 0.08) 0%, rgba(245, 130, 32, 0.06) 100%)',
              border: '1px solid var(--border-gold-subtle)',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>✨</span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                      Top Products Recommended For You
                    </h3>
                    <span style={{ background: 'var(--accent-terracotta)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                      {primaryNiche} Specialty
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-gray)' }}>
                    Hand-picked wholesale inventory with high retail profit margins curated for <strong>{activeCustomer.shopName || activeCustomer.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('✨ Recommended For You')}
                  style={{
                    padding: '6px 12px',
                    background: categoryFilter === '✨ Recommended For You' ? 'var(--accent-terracotta)' : 'var(--bg-main)',
                    color: categoryFilter === '✨ Recommended For You' ? '#fff' : 'var(--terracotta)',
                    border: '1px solid var(--accent-terracotta)',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View All ({customerRecommendations.length}) Recommended →
                </button>
              </div>

              {/* Grid of Top 4 Recommendations */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {customerRecommendations.slice(0, 4).map(p => (
                  <div
                    key={`spotlight-${p.id}`}
                    style={{
                      background: 'var(--bg-main)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ position: 'relative', height: '110px' }}>
                      <img src={p.img || p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: 'rgba(26,26,26,0.85)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9.5px',
                        fontWeight: 800
                      }}>
                        🎯 {p.matchScore}% Match
                      </span>
                      {p.isBestSeller && (
                        <span style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: '#F58220',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 800
                        }}>
                          ★ Best Seller
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '4px' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--terracotta)' }}>
                            ₹{Number(p.price || 0).toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--status-paid)', fontWeight: 700 }}>
                            +{p.marginPercent || 0}% Margin
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenOrderModal(p)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'var(--accent-terracotta)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search, Sort & Multi-Filter Bar */}
          <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
            {/* Tier 1: Interactive Category Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.6px', marginRight: '4px', whiteSpace: 'nowrap' }}>
                {t('category', 'Category')}:
              </span>
              {dynamicCategories.map(cat => {
                const isSelected = categoryFilter === cat;
                const count = cat === 'All Categories'
                  ? products.length
                  : cat === '✨ Recommended For You'
                    ? customerRecommendations.length
                    : products.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: isSelected ? '1px solid var(--accent-terracotta)' : '1px solid var(--border-light)',
                      background: isSelected ? 'var(--accent-terracotta)' : 'var(--bg-main)',
                      color: isSelected ? '#ffffff' : 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(212, 175, 55, 0.28)' : 'none'
                    }}
                  >
                    <span>{cat === 'All Categories' ? t('allCategories', 'All') : cat}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-gray)',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tier 2: Unified Search, Filters & Sort Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div style={{ flex: '2 1 240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '14px', color: 'var(--text-gray)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  placeholder={t('searchGarmentsPlaceholder', 'Search by name, SKU, price, color, fabric...')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    paddingRight: searchTerm ? '36px' : '14px',
                    height: '40px',
                    fontSize: '13px',
                    borderRadius: '10px'
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-gray)',
                      fontSize: '15px',
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Size Filter */}
              <div style={{ flex: '1 1 110px' }}>
                <select
                  value={sizeFilter}
                  onChange={e => setSizeFilter(e.target.value)}
                  style={{ height: '40px', fontSize: '12px', borderRadius: '10px', width: '100%' }}
                >
                  <option value="All Sizes">📏 Size: All</option>
                  <option value="Free Size">Free Size</option>
                  <option value="S">S (Small)</option>
                  <option value="M">M (Medium)</option>
                  <option value="L">L (Large)</option>
                  <option value="XL">XL (Extra Large)</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>

              {/* Color Filter */}
              <div style={{ flex: '1 1 110px' }}>
                <select
                  value={colorFilter}
                  onChange={e => setColorFilter(e.target.value)}
                  style={{ height: '40px', fontSize: '12px', borderRadius: '10px', width: '100%' }}
                >
                  <option value="All Colors">🎨 Color: All</option>
                  <option value="Pink">Pink</option>
                  <option value="Blue">Blue</option>
                  <option value="White">White</option>
                  <option value="Green">Green</option>
                  <option value="Red">Red</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Maroon">Maroon</option>
                </select>
              </div>

              {/* Stock Filter */}
              <div style={{ flex: '1 1 125px' }}>
                <select
                  value={stockStatusFilter}
                  onChange={e => setStockStatusFilter(e.target.value)}
                  style={{ height: '40px', fontSize: '12px', borderRadius: '10px', width: '100%' }}
                >
                  <option value="All Stock">📦 Stock: All</option>
                  <option value="IN STOCK">✓ In Stock (≥10)</option>
                  <option value="LOW STOCK">⚠ Low Stock (&lt;10)</option>
                  <option value="OUT OF STOCK">✕ Out of Stock (0)</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div style={{ flex: '1.2 1 180px' }}>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    height: '40px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    borderColor: 'var(--accent-terracotta)',
                    width: '100%'
                  }}
                >
                  <option value="name-asc">⇅ Sort: A → Z (Name)</option>
                  <option value="name-desc">⇅ Sort: Z → A (Name)</option>
                  <option value="price-asc">⇅ Sort: Price (Low → High)</option>
                  <option value="price-desc">⇅ Sort: Price (High → Low)</option>
                  <option value="stock-desc">⇅ Sort: Stock (High → Low)</option>
                  <option value="stock-asc">⇅ Sort: Stock (Low → High)</option>
                  <option value="rating-desc">★ Highest Rated</option>
                  <option value="newest">⇅ Sort: Newest First</option>
                  <option value="oldest">⇅ Sort: Oldest First</option>
                  <option value="sku-asc">⇅ Sort: SKU (A → Z)</option>
                  <option value="sku-desc">⇅ Sort: SKU (Z → A)</option>
                </select>
              </div>

              {/* Reset Action */}
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  style={{
                    padding: '0 14px',
                    height: '40px',
                    background: 'var(--bg-main)',
                    border: '1px dashed var(--accent-terracotta)',
                    color: 'var(--accent-terracotta)',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✕ Reset
                </button>
              )}
            </div>

            {/* Results & Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-gray)' }}>
              <div>
                Showing <strong style={{ color: 'var(--text-dark)' }}>{sortedProducts.length}</strong> of <strong style={{ color: 'var(--text-dark)' }}>{products.length}</strong> garments
                {searchTerm && <span> matching "<strong style={{ color: 'var(--accent-terracotta)' }}>{searchTerm}</strong>"</span>}
                {categoryFilter !== 'All Categories' && <span> in <strong style={{ color: 'var(--accent-terracotta)' }}>{categoryFilter}</strong></span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Active Sort:</span>
                <span style={{ background: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  {sortBy === 'rating-desc' && '★ Highest Rated'}
                  {sortBy === 'name-asc' && '🔤 A → Z'}
                  {sortBy === 'name-desc' && '🔤 Z → A'}
                  {sortBy === 'price-asc' && '₹ Low → High'}
                  {sortBy === 'price-desc' && '₹ High → Low'}
                  {sortBy === 'stock-desc' && '📦 Stock High'}
                  {sortBy === 'stock-asc' && '⚠️ Stock Low'}
                  {sortBy === 'sku-asc' && '🏷️ SKU A-Z'}
                  {sortBy === 'sku-desc' && '🏷️ SKU Z-A'}
                  {sortBy === 'newest' && '🆕 Newest'}
                  {sortBy === 'oldest' && '📅 Oldest'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Cards Grid or Table */}
          {sortedProducts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', margin: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-dark)' }}>
                No Garments Found
              </h3>
              <p style={{ color: 'var(--text-gray)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px' }}>
                {searchTerm
                  ? `We couldn't find any garments matching "${searchTerm}". Try checking your spelling or clearing filters.`
                  : 'No garments match the selected filters. Try broadening your criteria.'}
              </p>
              <button
                onClick={handleResetFilters}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '12px' }}
              >
                Clear Search & Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="product-grid">
              {paginatedProducts.map(p => {
                const st = getStockStatusStyle(p);
                const ratingInfo = getProductRatingInfo(p);

                return (
                  <div key={p.id} className="product-card" style={{ position: 'relative' }}>
                    <div className="product-img-wrapper" style={{ position: 'relative' }}>
                      <img
                        src={pinterestService.upgradeToClearImage(p.image || p.img, p.category)}
                        alt={p.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = pinterestService.getCategoryFallback(p.category);
                        }}
                        loading="lazy"
                      />

                      {/* Top Right Stock Pill */}
                      <div className="product-badge-top" style={{ zIndex: 2 }}>
                        <span className="status-pill" style={{ background: st.bg, color: st.color, fontSize: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                          {st.label}
                        </span>
                      </div>
                    </div>

                    <div className="product-info-body">
                      {/* Category & SKU row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div className="product-category" style={{ margin: 0 }}>{p.category} • {p.sku}</div>
                      </div>

                      {/* Product Title */}
                      <div className="product-title" style={{ fontSize: '15px', fontWeight: 700, lineHeight: '1.35', color: 'var(--text-dark)', margin: '4px 0 6px 0', minHeight: '38px' }}>
                        {p.name}
                      </div>

                      {/* Customer Rating & Review Count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <div
                          onClick={() => isCustomerRole ? handleOpenFeedbackModal(p) : setActiveCatalogTab('feedbacks')}
                          title={isCustomerRole ? "Click to rate and review this garment" : `Rating: ${ratingInfo.avg}/5 (${ratingInfo.count} reviews)`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', color: '#FFA41C', fontSize: '13px' }}>
                            {'★'.repeat(ratingInfo.rounded) + '☆'.repeat(5 - ratingInfo.rounded)}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                            {ratingInfo.avg}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                            ({ratingInfo.count || 320})
                          </span>
                        </div>
                      </div>

                      {/* Clean Price & Inventory Summary */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '8px 0 10px 0', padding: '8px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('price', 'Price')}</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)' }}>
                            ₹{(p.price || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('stock', 'Inventory')}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: p.stock === 0 ? 'var(--status-out, #DC2626)' : p.stock < 10 ? 'var(--status-due, #D97706)' : 'var(--accent-emerald, #059669)' }}>
                            {p.stock === 0 ? 'Out of Stock' : `${p.stock} pcs`}
                          </div>
                        </div>
                      </div>

                      {/* Size & Color Specification */}
                      <div style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '10px' }}>
                        {t('size', 'Size')}: <strong style={{ color: 'var(--text-dark)' }}>{p.size || 'L'}</strong> • {t('color', 'Color')}: <strong style={{ color: 'var(--text-dark)' }}>{p.color || 'Pink'}</strong>
                      </div>

                      {/* Actions: Customer vs Admin */}
                      {isCustomerRole ? (
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => handleOpenOrderModal(p)}
                            className="btn-primary"
                            style={{ flex: 1.2, padding: '7px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          >
                            <span>🛍️</span>
                            <span>Request Order</span>
                          </button>
                          <button
                            onClick={() => handleOpenFeedbackModal(p)}
                            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <span>⭐</span>
                            <span>Rate & Review</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => setQuickAddStockProduct(p)}
                            style={{ flex: 1, padding: '6px 10px', background: 'var(--accent-terracotta-light)', border: 'none', color: 'var(--accent-terracotta)', borderRadius: '8px', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                          >
                            {t('addStockBtn', '+ Add Stock')}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            style={{ padding: '6px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                          >
                            {t('editBtn', 'Edit')}
                          </button>
                          <button
                            onClick={() => setStockHistoryProduct(p)}
                            style={{ padding: '6px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                          >
                            {t('historyBtn', 'History')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th
                      onClick={() => setSortBy(prev => prev === 'name-asc' ? 'name-desc' : 'name-asc')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort A-Z / Z-A"
                    >
                      {t('items')} {sortBy === 'name-asc' ? '▲' : sortBy === 'name-desc' ? '▼' : '↕'}
                    </th>
                    <th>{t('category')}</th>
                    <th
                      onClick={() => setSortBy(prev => prev === 'sku-asc' ? 'sku-desc' : 'sku-asc')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort SKU"
                    >
                      SKU {sortBy === 'sku-asc' ? '▲' : sortBy === 'sku-desc' ? '▼' : '↕'}
                    </th>
                    <th>{t('size')}</th>
                    <th
                      onClick={() => setSortBy(prev => prev === 'price-asc' ? 'price-desc' : 'price-asc')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort Price"
                    >
                      {t('sellingPrice', 'Price')} {sortBy === 'price-asc' ? '▲' : sortBy === 'price-desc' ? '▼' : '↕'}
                    </th>
                    <th
                      onClick={() => setSortBy(prev => prev === 'stock-desc' ? 'stock-asc' : 'stock-desc')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort Stock"
                    >
                      {isCustomerRole ? 'Availability' : `${t('quantity')} ${sortBy === 'stock-desc' ? '▼' : sortBy === 'stock-asc' ? '▲' : '↕'}`}
                    </th>
                    <th
                      onClick={() => setSortBy(prev => prev === 'rating-desc' ? 'name-asc' : 'rating-desc')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort Rating"
                    >
                      Rating {sortBy === 'rating-desc' ? '▼' : '↕'}
                    </th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map(p => {
                    const st = getStockStatusStyle(p);
                    const ratingInfo = getProductRatingInfo(p);

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={pinterestService.upgradeToClearImage(p.image || p.img, p.category)}
                              alt={p.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = pinterestService.getCategoryFallback(p.category);
                              }}
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{p.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '12px' }}>{p.category}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{p.sku}</td>
                        <td style={{ fontSize: '12px' }}>{p.size || 'L'} / {p.color || 'Pink'}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>
                            ₹{(p.price || 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td>
                          {isCustomerRole ? (
                            <span className="status-pill" style={{ background: st.bg, color: st.color }}>
                              {p.stock > 0 ? (p.stock < 10 ? `Low Stock (${p.stock})` : `In Stock (${p.stock})`) : 'Out of Stock'}
                            </span>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 700, color: p.stock === 0 ? 'var(--status-out)' : p.stock < 10 ? 'var(--status-due)' : 'inherit' }}>
                                {p.stock} {t('stockPcs', 'pcs')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div
                            onClick={() => isCustomerRole ? handleOpenFeedbackModal(p) : setActiveCatalogTab('feedbacks')}
                            title={isCustomerRole ? "Click to rate this garment" : `Rating: ${ratingInfo.avg}/5 (${ratingInfo.count} reviews)`}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                          >
                            <span style={{ color: '#FFA41C', fontSize: '12px', letterSpacing: '-0.5px' }}>
                              {'★'.repeat(ratingInfo.rounded) + '☆'.repeat(5 - ratingInfo.rounded)}
                            </span>
                            <span style={{ fontSize: '11px', color: '#007185', fontWeight: 600 }}>
                              {ratingInfo.avg} ({(ratingInfo.count || 320).toLocaleString('en-IN')})
                            </span>
                          </div>
                        </td>
                        <td>
                          {isCustomerRole ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenOrderModal(p)}
                                style={{ color: 'var(--accent-terracotta)', background: 'var(--accent-terracotta-light)', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}
                              >
                                🛍️ Order
                              </button>
                              <button
                                onClick={() => handleOpenFeedbackModal(p)}
                                style={{ color: 'var(--text-dark)', background: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}
                              >
                                ⭐ Rate
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => setQuickAddStockProduct(p)} style={{ color: 'var(--accent-emerald)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>{t('addStockBtn', '+ Stock')}</button>
                              <button onClick={() => handleOpenEdit(p)} style={{ color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>{t('editBtn', 'Edit')}</button>
                              <button onClick={() => setStockHistoryProduct(p)} style={{ color: 'var(--text-gray)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>{t('historyBtn', 'History')}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
        </>
      )}

      {/* Add New Product Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div className="card-title">
              <span>{t('addNewGarmentProduct', 'Add New Garment Product')}</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('productTitle', 'Product Title')}</label>
                <input type="text" required placeholder="e.g. Designer Silk Anarkali Suit" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              </div>

              {/* Photo Upload Section */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  {t('productPhotoGarmentImage', 'Product Photo / Garment Image')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <img
                    src={productForm.image || pinterestService.getCategoryFallback(productForm.category)}
                    alt="Garment Preview"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = pinterestService.getCategoryFallback(productForm.category);
                    }}
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
                      <span>{t('choosePhotoFile', '📷 Choose Photo File')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '10px', color: 'var(--text-gray)' }}>{t('uploadPhotoHint', 'Upload photo from camera, gallery, or PC')}</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={t('pasteImageWebUrl', 'Or paste image web URL (https://...)')}
                  value={productForm.image || ''}
                  onChange={e => setProductForm({ ...productForm, image: e.target.value })}
                  style={{ fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('category', 'Category')}</label>
                  <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                    <option value="Womenswear">Womenswear</option>
                    <option value="Menswear">Menswear</option>
                    <option value="Ethnic Wear">Ethnic Wear</option>
                    <option value="Sarees">Sarees</option>
                    <option value="Kurtis">Kurtis</option>
                    <option value="Fabrics">Fabrics</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('skuCode', 'SKU Code')}</label>
                  <input type="text" placeholder="SKU-8821" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('sellingPrice', 'Price')} (₹)</label>
                  <input type="number" required value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('initialStockQty', 'Initial Stock Qty')}</label>
                  <input type="number" required value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{t('saveProduct', 'Save Product')}</button>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>{t('cancelBtn', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div className="card-title">
              <span>{t('editGarmentDetails', 'Edit Garment Product Details')}</span>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('productTitle', 'Product Title')}</label>
                <input type="text" required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              </div>

              {/* Photo Upload Section */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  {t('productPhotoGarmentImage', 'Product Photo / Garment Image')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <img
                    src={productForm.image || pinterestService.getCategoryFallback(productForm.category)}
                    alt="Garment Preview"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = pinterestService.getCategoryFallback(productForm.category);
                    }}
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
                      <span>{t('changeUploadPhoto', '📷 Change / Upload Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '10px', color: 'var(--text-gray)' }}>{t('selectPhotoDevice', 'Select JPG, PNG, WEBP photo from your device')}</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={t('pasteImageWebUrl', 'Or paste image web URL (https://...)')}
                  value={productForm.image || ''}
                  onChange={e => setProductForm({ ...productForm, image: e.target.value })}
                  style={{ fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('category', 'Category')}</label>
                  <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                    <option value="Womenswear">Womenswear</option>
                    <option value="Menswear">Menswear</option>
                    <option value="Ethnic Wear">Ethnic Wear</option>
                    <option value="Sarees">Sarees</option>
                    <option value="Kurtis">Kurtis</option>
                    <option value="Fabrics">Fabrics</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('skuCode', 'SKU Code')}</label>
                  <input type="text" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('sellingPrice', 'Price')} (₹)</label>
                  <input type="number" required value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('stockQuantityPcs', 'Stock Qty')}</label>
                  <input type="number" required value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('defaultSize', 'Default Size')}</label>
                  <input type="text" value={productForm.size} onChange={e => setProductForm({ ...productForm, size: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('defaultColor', 'Default Color')}</label>
                  <input type="text" value={productForm.color} onChange={e => setProductForm({ ...productForm, color: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('productDetailsDesc', 'Product Details / Description')}</label>
                <textarea value={productForm.details} onChange={e => setProductForm({ ...productForm, details: e.target.value })} style={{ width: '100%', height: '60px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{t('saveProductChanges', 'Save Product Changes')}</button>
                <button type="button" onClick={() => setEditingProduct(null)} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>{t('cancelBtn', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Audit Modal */}
      {stockHistoryProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '24px' }}>
            <div className="card-title">
              <span>{t('stockAuditHistory', 'Stock Audit & Inventory History')}</span>
              <button onClick={() => setStockHistoryProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <img
                src={pinterestService.upgradeToClearImage(stockHistoryProduct.image || stockHistoryProduct.img, stockHistoryProduct.category)}
                alt={stockHistoryProduct.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = pinterestService.getCategoryFallback(stockHistoryProduct.category);
                }}
                style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>{stockHistoryProduct.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>SKU: {stockHistoryProduct.sku} • {t('currentStock', 'Current Stock')}: <strong>{stockHistoryProduct.stock} {t('stockPcs', 'pcs')}</strong></div>
              </div>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('dateCol', 'Date')}</th>
                    <th>{t('typeCol', 'Type')}</th>
                    <th>{t('qtyChangeCol', 'Qty Change')}</th>
                    <th>{t('warehouseDetailsCol', 'Warehouse / Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>05 Sep 2026</td>
                    <td><span className="status-pill status-paid">Restock</span></td>
                    <td style={{ color: 'var(--status-paid)', fontWeight: 700 }}>+15 {t('stockPcs', 'pcs')}</td>
                    <td>Godown 1 Main Warehouse</td>
                  </tr>
                  <tr>
                    <td>02 Sep 2026</td>
                    <td><span className="status-pill status-credit">Sale Invoice</span></td>
                    <td style={{ color: 'var(--status-out)', fontWeight: 700 }}>-2 {t('stockPcs', 'pcs')}</td>
                    <td>Invoice INV-0067 (Ravi Kumar)</td>
                  </tr>
                  <tr>
                    <td>28 Aug 2026</td>
                    <td><span className="status-pill status-paid">Initial Entry</span></td>
                    <td style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{stockHistoryProduct.stock} {t('stockPcs', 'pcs')}</td>
                    <td>Vendor Shipment Log</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setStockHistoryProduct(null)} style={{ padding: '8px 20px' }}>
                {t('closeHistory', 'Close History')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Stock Modal */}
      {quickAddStockProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div className="card-title">
              <span>{t('quickAddWarehouseStock', 'Quick Add Warehouse Stock')}</span>
              <button onClick={() => setQuickAddStockProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '14px' }}>
              {t('itemWord', 'Item')}: <strong>{quickAddStockProduct.name}</strong> • {t('currentStock', 'Current Stock')}: <strong>{quickAddStockProduct.stock} {t('stockPcs', 'pcs')}</strong>
            </p>
            <form onSubmit={handleQuickAddStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>{t('quantityToAdd', 'Quantity to Add (pcs)')}</label>
                <input type="number" required min="1" value={addQty} onChange={e => setAddQty(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{t('updateStock', 'Update Stock')}</button>
                <button type="button" onClick={() => setQuickAddStockProduct(null)} style={{ padding: '10px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>{t('cancelBtn', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate & Review Garment Modal */}
      {feedbackModalProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', borderRadius: '16px' }}>
            <div className="card-title">
              <span>⭐ Rate & Review Garment</span>
              <button onClick={() => setFeedbackModalProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '10px', background: 'var(--bg-main)', borderRadius: '10px' }}>
              <img
                src={pinterestService.upgradeToClearImage(feedbackModalProduct.image || feedbackModalProduct.img, feedbackModalProduct.category)}
                alt={feedbackModalProduct.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = pinterestService.getCategoryFallback(feedbackModalProduct.category);
                }}
                style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{feedbackModalProduct.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{feedbackModalProduct.category} • SKU: {feedbackModalProduct.sku}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitProductFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                  Rating (Select Stars)
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '26px',
                        color: star <= feedbackRating ? '#F59E0B' : 'var(--border-light)',
                        padding: '0 2px',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', marginLeft: '6px' }}>
                    {feedbackRating === 5 && 'Outstanding ★★★★★'}
                    {feedbackRating === 4 && 'Very Good ★★★★☆'}
                    {feedbackRating === 3 && 'Good ★★★☆☆'}
                    {feedbackRating === 2 && 'Fair ★★☆☆☆'}
                    {feedbackRating === 1 && 'Needs Improvement ★☆☆☆☆'}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                  Review / Feedback Comments
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share your experience regarding fabric quality, fit, embroidery or design..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackModalProduct(null)}
                  style={{ padding: '8px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Customer Order / Tailoring Request Modal */}
      {orderModalProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px', borderRadius: '16px' }}>
            <div className="card-title">
              <span>🛍️ Order / Custom Tailoring Request</span>
              <button onClick={() => setOrderModalProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
              <img
                src={pinterestService.upgradeToClearImage(orderModalProduct.image || orderModalProduct.img, orderModalProduct.category)}
                alt={orderModalProduct.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = pinterestService.getCategoryFallback(orderModalProduct.category);
                }}
                style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-dark)' }}>{orderModalProduct.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Category: {orderModalProduct.category} • SKU: {orderModalProduct.sku}</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-terracotta)', fontSize: '13px', marginTop: '2px' }}>
                  ₹{(orderModalProduct.price || 0).toLocaleString('en-IN')} per unit
                </div>
              </div>
            </div>

            <form onSubmit={handleCustomerOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                    Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                    Required Size
                  </label>
                  <select value={orderSize} onChange={(e) => setOrderSize(e.target.value)}>
                    <option value="S">S (Small)</option>
                    <option value="M">M (Medium)</option>
                    <option value="L">L (Large)</option>
                    <option value="XL">XL (Extra Large)</option>
                    <option value="XXL">XXL</option>
                    <option value="Free Size">Free Size</option>
                    <option value="Assorted Bundle">Assorted Wholesale Bundle</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                    Color Preference
                  </label>
                  <input
                    type="text"
                    value={orderColor}
                    onChange={(e) => setOrderColor(e.target.value)}
                    placeholder="e.g. Pink, Royal Blue, Maroon"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                    Needed By Date
                  </label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                  Order Notes & Customization (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Require 20 pieces in assorted colors for upcoming retail festive sale."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', borderRadius: '8px', fontSize: '12px' }}
                />
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--accent-terracotta-light)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-terracotta)' }}>Total Estimated Order Value:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-terracotta)' }}>
                  ₹{((orderModalProduct.price || 0) * (Number(orderQty) || 1)).toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Confirm Order Request
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModalProduct(null)}
                  style={{ padding: '8px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
