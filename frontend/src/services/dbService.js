// Central Database Service for ThreadLine ERP/POS Platform
// Provides persistent storage, auto-sync, export/import, and DB seeding across all pages.
import { pinterestService } from './pinterestService';
import { API_BASE_URL } from '../config/api.js';

const DB_STORAGE_KEY = 'threadline_database_v4';

export const initialDbSeed = {
  areas: [
    {
      id: 'area-1',
      code: 'TNK-01',
      name: 'Tenkasi Main Bazaar',
      assignedDay: 'Monday',
      agentName: 'Ramesh Kumar',
      totalCustomers: 2,
      outstandingBalance: 3600,
      targetCollection: 8000,
      collectedSoFar: 3200,
      status: 'In Progress',
      color: '#3B82F6'
    },
    {
      id: 'area-2',
      code: 'TPR-02',
      name: 'Tirupur Textile Hub',
      assignedDay: 'Tuesday',
      agentName: 'Senthil Nathan',
      totalCustomers: 1,
      outstandingBalance: 1650,
      targetCollection: 6000,
      collectedSoFar: 2500,
      status: 'Scheduled',
      color: '#10B981'
    },
    {
      id: 'area-3',
      code: 'ERD-03',
      name: 'Erode Textile Market',
      assignedDay: 'Wednesday',
      agentName: 'Karthik Raja',
      totalCustomers: 1,
      outstandingBalance: 0,
      targetCollection: 5000,
      collectedSoFar: 3000,
      status: 'Scheduled',
      color: '#F58220'
    },
    {
      id: 'area-4',
      code: 'MDU-04',
      name: 'Madurai Wholesale Hub',
      assignedDay: 'Thursday',
      agentName: 'Sundaram Pillai',
      totalCustomers: 1,
      outstandingBalance: 3150,
      targetCollection: 9000,
      collectedSoFar: 4000,
      status: 'Scheduled',
      color: '#8B5CF6'
    }
  ],
  customers: [
    {
      id: 1,
      name: 'Ravi Kumar',
      shopName: 'Sri Meenakshi Textiles',
      phone: '+91 98765 43210',
      email: 'ravi.textiles@gmail.com',
      areaId: 'area-1',
      areaName: 'Tenkasi Main Bazaar',
      purchases: 24500,
      lastVisit: '18 Sep 2026',
      balance: 2400,
      creditLimit: 8000,
      creditDays: 30,
      gstin: '33AABCR1234F1Z1',
      status: 'Overdue',
      statusType: 'overdue',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      avatarInitials: 'RK',
      visitStatus: 'Pending',
      address: '52, North Car Street, Tenkasi, Tamil Nadu 627811',
      notes: 'Leading traditional silk saree and dhoti retail store. 30-day payment cycle.',
      password: '1234'
    },
    {
      id: 2,
      name: 'Murugan Swamy',
      shopName: 'Murugan Readymade & Garments',
      phone: '+91 98421 56789',
      email: 'murugan.garments@gmail.com',
      areaId: 'area-1',
      areaName: 'Tenkasi Main Bazaar',
      purchases: 16800,
      lastVisit: '24 Sep 2026',
      balance: 1200,
      creditLimit: 6000,
      creditDays: 30,
      gstin: '33AABCM5678G2Z3',
      status: 'Due',
      statusType: 'due',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      avatarInitials: 'MS',
      visitStatus: 'Scheduled',
      address: '18, Bus Stand Commercial Complex, Tenkasi, Tamil Nadu 627811',
      notes: 'Retail store for menswear formal shirts and casual trousers. Regular payer.',
      password: '1234'
    },
    {
      id: 3,
      name: 'Anitha Balaji',
      shopName: 'Balaji Fashion & Kurtis',
      phone: '+91 94432 78901',
      email: 'anitha.balaji@gmail.com',
      areaId: 'area-2',
      areaName: 'Tirupur Textile Hub',
      purchases: 28000,
      lastVisit: '28 Sep 2026',
      balance: 1650,
      creditLimit: 10000,
      creditDays: 45,
      gstin: '33AABCA9012H1Z5',
      status: 'Due',
      statusType: 'due',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      avatarInitials: 'AB',
      visitStatus: 'Scheduled',
      address: 'Shop 4, Kumaran Road Market, Tirupur, Tamil Nadu 641601',
      notes: 'High demand for cotton kurtis, leggings, and knitwear. Prompt via UPI.',
      password: '1234'
    },
    {
      id: 4,
      name: 'Karthik Raja',
      shopName: 'Kongu Mens Garments',
      phone: '+91 97890 23456',
      email: 'karthik.kongu@gmail.com',
      areaId: 'area-3',
      areaName: 'Erode Textile Market',
      purchases: 19500,
      lastVisit: '01 Oct 2026',
      balance: 0,
      creditLimit: 7000,
      creditDays: 30,
      gstin: '33AABCK3456J1Z7',
      status: 'Paid',
      statusType: 'paid',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
      avatarInitials: 'KR',
      visitStatus: 'Completed',
      address: '112, Brough Road, Near Clock Tower, Erode, Tamil Nadu 638001',
      notes: 'Zero balance account. Excellent credit standing and bulk buyer.',
      password: '1234'
    },
    {
      id: 5,
      name: 'Sundaram Pillai',
      shopName: 'Sundaram Silks & Handlooms',
      phone: '+91 98940 12345',
      email: 'sundaram.silks@gmail.com',
      areaId: 'area-4',
      areaName: 'Madurai Wholesale Hub',
      purchases: 32000,
      lastVisit: '15 Sep 2026',
      balance: 3150,
      creditLimit: 12000,
      creditDays: 45,
      gstin: '33AABCS7890K1Z9',
      status: 'Overdue',
      statusType: 'overdue',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      avatarInitials: 'SP',
      visitStatus: 'Pending',
      address: '45, South Masi Street, Madurai, Tamil Nadu 625001',
      notes: 'Large bridal wear retailer. Bill of ₹3,150 overdue since 30 days.',
      password: '1234'
    }
  ],
  products: [
    {
      id: 'prod-1',
      name: '100% Combed Cotton Formal Shirt',
      details: 'Size: 38, 40, 42, 44 | Colors: White, Sky Blue, Navy',
      category: 'Menswear',
      sku: 'SHT-M-01',
      stock: 24,
      price: 499,
      mrp: 799,
      rating: 4.7,
      reviewsCount: 1420,
      isBestSeller: true,
      bestSellerCategory: 'in Formal Shirts',
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Tomorrow, 9 PM',
      boughtPastMonth: '1K+ bought in past month',
      costPrice: 260,
      fabric: '100% Combed Cotton (60s Compact)',
      hsnCode: '6205',
      gstRate: '5',
      availableSizes: ['38', '40', '42', '44'],
      availableColors: ['White', 'Sky Blue', 'Navy'],
      godown1: 16,
      godown2: 8,
      status: 'In Stock',
      statusType: 'in-stock',
      img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'
    },
    {
      id: 'prod-2',
      name: 'Tirupur Bio-Washed Cotton T-Shirt',
      details: 'Size: M, L, XL, XXL | Colors: Black, Olive, Maroon',
      category: 'Menswear',
      sku: 'TEE-M-02',
      stock: 45,
      price: 249,
      mrp: 399,
      rating: 4.6,
      reviewsCount: 980,
      isBestSeller: false,
      isAmazonsChoice: true,
      choiceKeyword: 'cotton t-shirts for men',
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Tomorrow, 9 PM',
      boughtPastMonth: '800+ bought in past month',
      costPrice: 110,
      fabric: '180 GSM Bio-Washed Single Jersey Cotton',
      hsnCode: '6109',
      gstRate: '5',
      availableSizes: ['M', 'L', 'XL', 'XXL'],
      availableColors: ['Black', 'Olive', 'Maroon'],
      godown1: 30,
      godown2: 15,
      status: 'In Stock',
      statusType: 'in-stock',
      img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=85'
    },
    {
      id: 'prod-3',
      name: 'Kanchipuram Art Silk Traditional Saree',
      details: 'Length: 6.3m (with blouse) | Colors: Peacock Blue, Maroon Gold',
      category: 'Sarees',
      sku: 'SAR-W-03',
      stock: 12,
      price: 950,
      mrp: 1500,
      rating: 4.8,
      reviewsCount: 2150,
      isBestSeller: true,
      bestSellerCategory: 'in Traditional Sarees',
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Monday',
      boughtPastMonth: '600+ bought in past month',
      costPrice: 520,
      fabric: 'Art Silk with Zari Woven Pallu & Contrast Blouse',
      hsnCode: '5007',
      gstRate: '5',
      availableSizes: ['Free Size'],
      availableColors: ['Peacock Blue', 'Maroon Gold'],
      godown1: 8,
      godown2: 4,
      status: 'In Stock',
      statusType: 'in-stock',
      img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85'
    },
    {
      id: 'prod-4',
      name: 'Chanderi Rayon Kurti & Palazzo Set',
      details: 'Size: M, L, XL | Colors: Mustard, Coral Green',
      category: 'Kurtis',
      sku: 'KRT-W-04',
      stock: 18,
      price: 599,
      mrp: 899,
      rating: 4.5,
      reviewsCount: 740,
      isBestSeller: false,
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Tomorrow, 9 PM',
      boughtPastMonth: '450+ bought in past month',
      costPrice: 310,
      fabric: 'Rayon Blend Kurti with Gold Foil Print',
      hsnCode: '6204',
      gstRate: '5',
      availableSizes: ['M', 'L', 'XL'],
      availableColors: ['Mustard', 'Coral Green'],
      godown1: 12,
      godown2: 6,
      status: 'In Stock',
      statusType: 'in-stock',
      img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85'
    },
    {
      id: 'prod-5',
      name: 'Slim Fit Stretch Denim Jeans',
      details: 'Waist: 30, 32, 34, 36 | Colors: Dark Indigo, Washed Grey',
      category: 'Menswear',
      sku: 'JNS-M-05',
      stock: 6,
      price: 699,
      mrp: 1099,
      rating: 4.4,
      reviewsCount: 890,
      isBestSeller: false,
      isAmazonsChoice: true,
      choiceKeyword: 'denim jeans for men',
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Tomorrow, 9 PM',
      boughtPastMonth: '700+ bought in past month',
      costPrice: 380,
      fabric: '98% Cotton, 2% Lycra Stretch Denim',
      hsnCode: '6203',
      gstRate: '12',
      availableSizes: ['30', '32', '34', '36'],
      availableColors: ['Dark Indigo', 'Washed Grey'],
      godown1: 6,
      godown2: 0,
      status: 'Low Stock',
      statusType: 'low-stock',
      img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85'
    },
    {
      id: 'prod-6',
      name: 'Pure Cotton Gold Border Dhoti & Angavastram',
      details: 'Length: 4 Mtr Dhoti + 2 Mtr Angavastram | Color: Pure White / Kasavu Border',
      category: 'Ethnic',
      sku: 'DHT-M-06',
      stock: 30,
      price: 299,
      mrp: 450,
      rating: 4.9,
      reviewsCount: 3100,
      isBestSeller: true,
      bestSellerCategory: 'in Traditional Ethnic Wear',
      isPrime: true,
      deliveryPromise: 'FREE Delivery by Tomorrow, 9 PM',
      boughtPastMonth: '1.2K+ bought in past month',
      costPrice: 160,
      fabric: '100% Fine Combed Cotton with Zari Border',
      hsnCode: '5208',
      gstRate: '5',
      availableSizes: ['Free Size'],
      availableColors: ['Pure White'],
      godown1: 20,
      godown2: 10,
      status: 'In Stock',
      statusType: 'in-stock',
      img: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=85',
      image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=85'
    }
  ],
  sales: [
    {
      id: 'INV-2026-001',
      customerId: 1,
      customer: 'Ravi Kumar',
      areaId: 'area-1',
      areaName: 'Tenkasi Main Bazaar',
      date: '18 Sep 2026',
      items: 'Art Silk Saree (2), Cotton Dhoti (1)',
      totalAmount: 2400,
      paymentType: 'CREDIT',
      status: 'Pending'
    },
    {
      id: 'INV-2026-002',
      customerId: 2,
      customer: 'Murugan Swamy',
      areaId: 'area-1',
      areaName: 'Tenkasi Main Bazaar',
      date: '24 Sep 2026',
      items: 'Cotton Formal Shirt (2), Slim Denim Jeans (1)',
      totalAmount: 1747,
      paymentType: 'CREDIT',
      status: 'Pending'
    },
    {
      id: 'INV-2026-003',
      customerId: 3,
      customer: 'Anitha Balaji',
      areaId: 'area-2',
      areaName: 'Tirupur Textile Hub',
      date: '28 Sep 2026',
      items: 'Rayon Kurti Set (2), Cotton T-Shirt (3)',
      totalAmount: 2146,
      paymentType: 'CREDIT',
      status: 'Pending'
    },
    {
      id: 'INV-2026-004',
      customerId: 4,
      customer: 'Karthik Raja',
      areaId: 'area-3',
      areaName: 'Erode Textile Market',
      date: '01 Oct 2026',
      items: 'Cotton Formal Shirt (3), Cotton Dhoti (1)',
      totalAmount: 1796,
      paymentType: 'CASH',
      status: 'Completed'
    },
    {
      id: 'INV-2026-005',
      customerId: 5,
      customer: 'Sundaram Pillai',
      areaId: 'area-4',
      areaName: 'Madurai Wholesale Hub',
      date: '15 Sep 2026',
      items: 'Art Silk Traditional Saree (3)',
      totalAmount: 3150,
      paymentType: 'CREDIT',
      status: 'Pending'
    },
    {
      id: 'INV-2026-006',
      customerId: null,
      customer: 'Walk-in Retail Buyer',
      areaId: 'area-1',
      areaName: 'Tenkasi Main Bazaar',
      date: '03 Oct 2026',
      items: 'Cotton Shirt (1), Cotton T-Shirt (1)',
      totalAmount: 748,
      paymentType: 'CASH',
      status: 'Completed'
    }
  ],
  collections: [
    {
      id: 'COL-101',
      customerId: 1,
      customerName: 'Ravi Kumar',
      areaId: 'area-1',
      amount: 800,
      paymentMode: 'UPI',
      date: '22 Sep 2026',
      receiptNo: 'REC-901',
      status: 'Verified'
    },
    {
      id: 'COL-102',
      customerId: 2,
      customerName: 'Murugan Swamy',
      areaId: 'area-1',
      amount: 600,
      paymentMode: 'CASH',
      date: '25 Sep 2026',
      receiptNo: 'REC-902',
      status: 'Verified'
    },
    {
      id: 'COL-103',
      customerId: 3,
      customerName: 'Anitha Balaji',
      areaId: 'area-2',
      amount: 1200,
      paymentMode: 'Bank Transfer',
      date: '29 Sep 2026',
      receiptNo: 'REC-903',
      status: 'Verified'
    },
    {
      id: 'COL-104',
      customerId: 4,
      customerName: 'Karthik Raja',
      areaId: 'area-3',
      amount: 1796,
      paymentMode: 'UPI',
      date: '01 Oct 2026',
      receiptNo: 'REC-904',
      status: 'Verified'
    },
    {
      id: 'COL-105',
      customerId: 5,
      customerName: 'Sundaram Pillai',
      areaId: 'area-4',
      amount: 1500,
      paymentMode: 'Cheque',
      date: '20 Sep 2026',
      receiptNo: 'REC-905',
      status: 'Verified'
    }
  ],
  suppliers: [
    {
      id: 'sup-1',
      name: 'Sri Lakshmi Mills & Spinning',
      shopName: 'Sri Lakshmi Mills & Spinning (Tirupur)',
      contactPerson: 'Senthil Kumar',
      phone: '+91 98422 12345',
      email: 'supplier@threadline.com',
      alternateEmail: 'orders@tirupurknitwear.com',
      address: '142, Palladam Road, Tirupur, Tamil Nadu 641604',
      city: 'Tirupur',
      area: 'Palladam Road',
      gstNumber: '33AABCS9988P1Z4',
      categories: ['Cotton Shirting', 'T-Shirts', 'Knitted Fabrics', 'Yarn'],
      productTypes: '180 GSM Bio-Washed Cotton T-Shirts, Combed Cotton Shirting, Knitted Fabrics',
      priceRange: '₹90 - ₹280',
      paymentTerms: '15 Days Credit',
      deliveryTime: '2 Days',
      deliveryTimeDays: 2,
      rating: 4.8,
      notes: 'Direct manufacturing mill partner for premium cotton fabric, shirting and hosiery.',
      status: 'Active'
    },
    {
      id: 'sup-2',
      name: 'Surat Silk & Brocade Weavers',
      shopName: 'Surat Silk & Brocade Weavers',
      phone: '+91 98251 33445',
      email: 'sales@suratsilkweavers.com',
      address: 'Ring Road Textile Market, Surat, Gujarat 395002',
      city: 'Surat',
      area: 'Ring Road',
      gstNumber: '24AABCS5544K1Z2',
      categories: ['Art Silk Sarees', 'Banarasi Silk', 'Jacquard Blouses'],
      productTypes: 'Bridal Sarees, Festive Silk Sarees',
      priceRange: '₹450 - ₹1500',
      paymentTerms: '30 Days Credit',
      deliveryTime: '4 Days',
      deliveryTimeDays: 4,
      rating: 4.7,
      notes: 'High quality jacquard weaving and wedding sarees.',
      status: 'Active'
    },
    {
      id: 'sup-3',
      name: 'Erode Powerloom Cotton Mills',
      shopName: 'Erode Powerloom Cotton Mills',
      phone: '+91 94433 55667',
      email: 'contact@erodecottonmills.com',
      address: '35, Texvalley Market, NH-544, Erode, Tamil Nadu 638052',
      city: 'Erode',
      area: 'Texvalley',
      gstNumber: '33AABCE1122D1Z0',
      categories: ['Formal Shirting', 'Cotton Dhotis', 'Grey Cloth'],
      productTypes: '60s Combed Cotton Fabric, Pure Cotton Dhotis',
      priceRange: '₹120 - ₹450',
      paymentTerms: '21 Days Credit',
      deliveryTime: '2 Days',
      deliveryTimeDays: 2,
      rating: 4.6,
      notes: 'Reliable bulk producer of formal shirting and traditional dhotis.',
      status: 'Active'
    }
  ],
  supplier_purchases: [
    {
      id: 'SP-2026-104',
      purchaseOrderNo: 'PO-TL-9205',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      purchaseDate: '05 Oct 2026',
      productName: '180 GSM Bio-Washed Combed Cotton T-Shirt',
      category: 'T-Shirts',
      size: 'L, XL',
      color: 'Navy Blue, Olive Green',
      quantity: 100,
      costPerItem: 115,
      totalPurchaseCost: 11500,
      deliveryCharge: 350,
      discount: 500,
      finalCost: 11350,
      effectiveCostPerItem: 113.5,
      paymentStatus: 'Pending',
      paidAmount: 0,
      pendingAmount: 11350,
      expectedDeliveryDate: '15 Oct 2026',
      actualDeliveryDate: null,
      deliveryStatus: 'Pending',
      status: 'Pending',
      acceptanceStatus: 'Pending',
      acceptedAt: null,
      acceptedDateFormatted: null,
      acceptedBy: null,
      notes: 'New purchase order from Admin awaiting supplier acceptance.'
    },
    {
      id: 'PO-2026-001',
      purchaseOrderNo: 'PO-TL-8821',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      purchaseDate: '18 Sep 2026',
      productName: '180 GSM Bio-Washed Combed Cotton T-Shirt',
      category: 'T-Shirts',
      size: 'M, L, XL',
      color: 'Black, Olive, Navy',
      quantity: 120,
      costPerItem: 115,
      totalPurchaseCost: 13800,
      deliveryCharge: 350,
      discount: 500,
      finalCost: 13650,
      effectiveCostPerItem: 113.75,
      paymentStatus: 'Paid',
      paidAmount: 13650,
      pendingAmount: 0,
      expectedDeliveryDate: '21 Sep 2026',
      actualDeliveryDate: '20 Sep 2026',
      deliveryStatus: 'Delivered',
      status: 'Accepted',
      acceptanceStatus: 'Accepted',
      acceptedAt: '2026-09-18T10:30:00.000Z',
      acceptedDateFormatted: '18/09/2026 10:30 AM',
      acceptedBy: 'Sri Lakshmi Mills & Spinning',
      deliveryDays: 2,
      notes: 'Delivered in full to ThreadLine Godown 1. QA approved.'
    },
    {
      id: 'PO-2026-002',
      purchaseOrderNo: 'PO-2026-002',
      supplierId: 'sup-2',
      supplierName: 'Surat Silk & Brocade Weavers',
      purchaseDate: '14 Sep 2026',
      productName: 'Kanchipuram Art Silk Traditional Saree',
      category: 'Sarees',
      size: 'Free Size',
      color: 'Peacock Blue, Maroon Gold',
      quantity: 10,
      costPerItem: 520,
      totalPurchaseCost: 5200,
      deliveryCharge: 150,
      discount: 150,
      finalCost: 5200,
      effectiveCostPerItem: 520,
      paymentStatus: 'Partial',
      paidAmount: 3000,
      pendingAmount: 2200,
      expectedDeliveryDate: '18 Sep 2026',
      actualDeliveryDate: '18 Sep 2026',
      deliveryStatus: 'Delivered',
      deliveryDays: 4,
      notes: 'Balance ₹2,200 due on 15 Oct 2026.'
    },
    {
      id: 'PO-2026-003',
      purchaseOrderNo: 'PO-2026-003',
      supplierId: 'sup-3',
      supplierName: 'Erode Powerloom Cotton Mills',
      purchaseDate: '20 Sep 2026',
      productName: '100% Combed Cotton Formal Shirt',
      category: 'Menswear',
      size: '38, 40, 42, 44',
      color: 'White, Sky Blue, Navy',
      quantity: 15,
      costPerItem: 260,
      totalPurchaseCost: 3900,
      deliveryCharge: 100,
      discount: 100,
      finalCost: 3900,
      effectiveCostPerItem: 260,
      paymentStatus: 'Paid',
      paidAmount: 3900,
      pendingAmount: 0,
      expectedDeliveryDate: '23 Sep 2026',
      actualDeliveryDate: '22 Sep 2026',
      deliveryStatus: 'Delivered',
      deliveryDays: 2,
      notes: 'Premium quality finish shirting.'
    }
  ],
  supplier_products: [
    {
      id: 'sp-lakshmi-01',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: '180 GSM Bio-Washed Combed Cotton T-Shirt',
      category: 'T-Shirts',
      basePrice: 115,
      deliveryEstimateCharge: 8,
      avgDiscountPct: 5.0,
      minOrderQty: 50,
      leadTimeDays: 2,
      availability: 'In Stock',
      unit: 'pcs',
      material: '100% Combed Cotton',
      colorsAvailable: ['Black', 'Navy', 'Olive Green', 'White', 'Maroon'],
      description: 'Export quality 180 GSM super-combed bio-washed single jersey knit fabric.'
    },
    {
      id: 'sp-lakshmi-02',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: '60s Combed Cotton Fabric Roll (White & Dyed)',
      category: 'Cotton Shirting',
      basePrice: 145,
      deliveryEstimateCharge: 12,
      avgDiscountPct: 4.0,
      minOrderQty: 100,
      leadTimeDays: 3,
      availability: 'In Stock',
      unit: 'meters',
      material: '60s Compact Yarn Cotton',
      colorsAvailable: ['Pure White', 'Sky Blue', 'Cream', 'Charcoal'],
      description: 'High-density luxury cotton shirting fabric roll for premium formal shirts.'
    },
    {
      id: 'sp-lakshmi-03',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: 'Pure Ring-Spun Cotton Hosiery Yarn 40s',
      category: 'Yarn',
      basePrice: 220,
      deliveryEstimateCharge: 15,
      avgDiscountPct: 3.5,
      minOrderQty: 25,
      leadTimeDays: 2,
      availability: 'In Stock',
      unit: 'kg',
      material: 'Pure Ring-Spun Combed Cotton',
      colorsAvailable: ['Natural Raw White'],
      description: 'Super-strength ring spun 40s hosiery yarn cone for high-speed circular knitting machines.'
    },
    {
      id: 'sp-lakshmi-04',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: 'Single Jersey Knitted Fabric 220 GSM',
      category: 'Knitted Fabrics',
      basePrice: 190,
      deliveryEstimateCharge: 10,
      avgDiscountPct: 5.0,
      minOrderQty: 40,
      leadTimeDays: 2,
      availability: 'In Stock',
      unit: 'meters',
      material: 'Cotton Lycra Blend 95:5',
      colorsAvailable: ['Anthracite Grey', 'Royal Blue', 'Deep Maroon', 'Black'],
      description: 'Heavyweight loopknit & single jersey fabric with 5% elastane for premium streetwear.'
    },
    {
      id: 'sp-lakshmi-05',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: 'Premium Mercerized Cotton Polo Shirt Fabric',
      category: 'T-Shirts',
      basePrice: 240,
      deliveryEstimateCharge: 10,
      avgDiscountPct: 6.0,
      minOrderQty: 30,
      leadTimeDays: 3,
      availability: 'In Stock',
      unit: 'meters',
      material: 'Double Pique Mercerized Cotton',
      colorsAvailable: ['Burgundy', 'Emerald Green', 'Navy Blue', 'Silver Heather'],
      description: 'Silky smooth double-mercerized pique knit fabric with anti-pilling treatment.'
    },
    {
      id: 'sp-lakshmi-06',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      productName: '2/80s Giza Cotton Shirting Weave',
      category: 'Cotton Shirting',
      basePrice: 275,
      deliveryEstimateCharge: 14,
      avgDiscountPct: 4.5,
      minOrderQty: 50,
      leadTimeDays: 4,
      availability: 'Low Stock',
      unit: 'meters',
      material: 'Long Staple Egyptian Giza Cotton',
      colorsAvailable: ['Egyptian Crisp White', 'Soft Pink', 'French Blue'],
      description: 'Ultra-luxurious silky hand feel shirting fabric made from long-staple cotton.'
    },
    {
      id: 'sp-2',
      supplierId: 'sup-2',
      supplierName: 'Surat Silk & Brocade Weavers',
      productName: 'Kanchipuram Art Silk Traditional Saree',
      category: 'Sarees',
      basePrice: 520,
      deliveryEstimateCharge: 15,
      avgDiscountPct: 3.0,
      minOrderQty: 5,
      leadTimeDays: 4,
      availability: 'In Stock'
    },
    {
      id: 'sp-3',
      supplierId: 'sup-3',
      supplierName: 'Erode Powerloom Cotton Mills',
      productName: '100% Combed Cotton Formal Shirt',
      category: 'Menswear',
      basePrice: 260,
      deliveryEstimateCharge: 10,
      avgDiscountPct: 4.0,
      minOrderQty: 10,
      leadTimeDays: 2,
      availability: 'In Stock'
    }
  ],
  supplier_payments: [
    {
      id: 'SPAY-01',
      purchaseId: 'PO-2026-001',
      supplierId: 'sup-1',
      supplierName: 'Sri Lakshmi Mills & Spinning',
      amount: 13650,
      paymentMode: 'NEFT Bank Transfer',
      paymentDate: '22 Sep 2026',
      referenceNumber: 'NEFT-SBIN2626500182',
      notes: 'Full settlement for PO-TL-8821'
    },
    {
      id: 'SPAY-02',
      purchaseId: 'PO-2026-002',
      supplierId: 'sup-2',
      supplierName: 'Surat Silk & Brocade Weavers',
      amount: 3000,
      paymentMode: 'RTGS',
      paymentDate: '18 Sep 2026',
      notes: 'Advance payment of ₹3,000 for PO-2026-002'
    },
    {
      id: 'SPAY-03',
      purchaseId: 'PO-2026-003',
      supplierId: 'sup-3',
      supplierName: 'Erode Powerloom Cotton Mills',
      amount: 3900,
      paymentMode: 'UPI',
      paymentDate: '22 Sep 2026',
      notes: 'Full payment upon delivery'
    }
  ],
  payment_reminders: [
    {
      reminder_id: 'REM-1001',
      customer_id: 1,
      customer_name: 'Ravi Kumar',
      customer_phone: '+91 98765 43210',
      pending_amount: 2400,
      due_date: '18 Sep 2026',
      days_overdue: 16,
      message: 'Dear Ravi Kumar, your payment of ₹2,400 for Sri Meenakshi Textiles is overdue since 18 Sep 2026. Kindly arrange payment via UPI or visit collection agent. Thank you.',
      sent_date: '2026-10-04',
      sent_time: '09:30 AM',
      status: 'Sent',
      channel: 'WhatsApp & SMS',
      created_at: '2026-10-04T04:00:00.000Z'
    },
    {
      reminder_id: 'REM-1002',
      customer_id: 5,
      customer_name: 'Sundaram Pillai',
      customer_phone: '+91 98940 12345',
      pending_amount: 3150,
      due_date: '15 Sep 2026',
      days_overdue: 19,
      message: 'Dear Sundaram Pillai, your payment of ₹3,150 for Sundaram Silks & Handlooms is overdue since 15 Sep 2026. Please settle the pending Khata balance. Thank you.',
      sent_date: '2026-10-04',
      sent_time: '09:30 AM',
      status: 'Sent',
      channel: 'WhatsApp & SMS',
      created_at: '2026-10-04T04:00:00.000Z'
    }
  ],
  reminder_settings: {
    id: 'default',
    reminderTime: '09:00',
    isEnabled: true,
    channel: 'WhatsApp & SMS',
    lastRunDate: '2026-10-04',
    lastRunTimestamp: '2026-10-04T04:00:00.000Z',
    updatedAt: '2026-10-04T04:00:00.000Z'
  },
  requirements: [
    {
      id: 'REQ-101',
      customerId: 1,
      customerName: 'Ravi Kumar (Sri Meenakshi Textiles)',
      productName: 'Pure Cotton Kasavu Dhotis',
      quantity: 25,
      requiredDate: '15 Oct 2026',
      status: 'Open',
      notes: 'Festival demand for Diwali season.'
    },
    {
      id: 'REQ-102',
      customerId: 3,
      customerName: 'Anitha Balaji (Balaji Fashion)',
      productName: 'Printed Cotton Kurtis with Dupatta',
      quantity: 30,
      requiredDate: '20 Oct 2026',
      status: 'In Sourcing',
      notes: 'Fast-moving sizes L and XL required.'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Payment Reminder Dispatched',
      message: 'Automated WhatsApp & SMS sent to Ravi Kumar for ₹2,400.',
      timestamp: 'Today at 09:30 AM',
      unread: true,
      type: 'PAYMENT_REMINDER',
      recipientName: 'Ravi Kumar',
      recipientPhone: '+91 98765 43210',
      senderName: 'ThreadLine Store (Admin)',
      channel: 'SMS & WhatsApp',
      status: 'Delivered',
      customerId: 1,
      targetRoles: ['admin', 'sales', 'user']
    },
    {
      id: 'notif-2',
      title: 'Low Stock Alert: Denim Jeans',
      message: 'Slim Fit Stretch Denim Jeans is below reorder level (6 remaining).',
      timestamp: 'Today at 08:45 AM',
      unread: true,
      type: 'LOW_STOCK',
      recipientName: 'Rajesh Verma (Inventory)',
      senderName: 'System Monitor',
      channel: 'In-App',
      status: 'Delivered',
      relatedProduct: 'Slim Fit Stretch Denim Jeans',
      targetRoles: ['admin', 'inventory']
    },
    {
      id: 'notif-3',
      title: 'Collection Received',
      message: 'Karthik Raja cleared full balance of ₹1,796 via UPI.',
      timestamp: 'Yesterday at 04:30 PM',
      unread: false,
      type: 'COLLECTION',
      recipientName: 'ThreadLine Accounts',
      senderName: 'Karthik Raja',
      channel: 'UPI & In-App',
      status: 'Delivered',
      targetRoles: ['admin', 'sales']
    },
    {
      id: 'notif-4',
      title: 'New Purchase Order PO-2026-001 Issued',
      message: 'Purchase order for 30x Bio-Washed T-Shirts dispatched to Tirupur Knitwear & Spinning Mills.',
      timestamp: 'Yesterday at 11:15 AM',
      unread: false,
      type: 'PURCHASE_ORDER',
      recipientName: 'Senthil Kumar (Sri Lakshmi Mills)',
      recipientPhone: '+91 98422 12345',
      senderName: 'ThreadLine Store (Admin)',
      channel: 'Email & WhatsApp',
      status: 'Delivered',
      targetRoles: ['admin', 'supplier', 'inventory']
    }
  ],
  feedbacks: [
    {
      id: 'fb-1',
      customerId: 4,
      customerName: 'Karthik Raja',
      rating: 5,
      category: 'Product Quality',
      comments: 'The 60s combed cotton formal shirts have superb finishing and color fastness. Customers love them.',
      date: '02 Oct 2026'
    },
    {
      id: 'fb-2',
      customerId: 3,
      customerName: 'Anitha Balaji',
      rating: 4.5,
      category: 'Delivery & Packing',
      comments: 'Tirupur T-shirts arrived in clean polybag bundles. Fast dispatch.',
      date: '29 Sep 2026'
    }
  ],
  returns: [],
  purchases: []
};

// Compatibility aliases
initialDbSeed.supplierPurchases = initialDbSeed.supplier_purchases;
initialDbSeed.supplierProducts = initialDbSeed.supplier_products;
initialDbSeed.supplierPayments = initialDbSeed.supplier_payments;
initialDbSeed.paymentReminders = initialDbSeed.payment_reminders;
initialDbSeed.reminderSettings = initialDbSeed.reminder_settings;

let isMySQLOnline = false;

// Database Service Interface
export const dbService = {
  // Load whole DB from localStorage or seed
  getDatabase() {
    try {
      const data = localStorage.getItem(DB_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);

        // Auto-migrate & fix broken or low-res images in stored products
        if (Array.isArray(parsed.products)) {
          let updated = false;
          parsed.products = parsed.products.map(p => {
            const currentImg = p.image || p.img || '';
            const clearImg = pinterestService.upgradeToClearImage(currentImg, p.category);
            if (clearImg !== currentImg) {
              updated = true;
              return { ...p, img: clearImg, image: clearImg };
            }
            return p;
          });
          if (updated) {
            localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed));
          }
        }

        // If Clean Mode is active, respect empty collections without re-injecting demo sample data
        if (parsed.__isCleanMode) {
          return {
            ...parsed,
            areas: Array.isArray(parsed.areas) && parsed.areas.length > 0
              ? parsed.areas
              : [{ id: 'area-1', name: 'Main Store Area', code: 'MSA', assigned_day: 'Everyday', agent_name: 'Store Manager', total_customers: 0, outstanding_balance: 0, target_collection: 0, collected_so_far: 0, status: 'Active', color: '#6B1E2B' }],
            customers: parsed.customers || [],
            products: parsed.products || [],
            requirements: parsed.requirements || [],
            notifications: parsed.notifications || [],
            sales: parsed.sales || [],
            collections: parsed.collections || [],
            purchases: parsed.purchases || [],
            returns: parsed.returns || [],
            feedbacks: parsed.feedbacks || [],
            suppliers: parsed.suppliers || [],
            supplier_purchases: parsed.supplier_purchases || [],
            supplier_products: parsed.supplier_products || [],
            supplier_payments: parsed.supplier_payments || [],
            payment_reminders: parsed.payment_reminders || [],
            reminder_settings: parsed.reminder_settings || initialDbSeed.reminder_settings
          };
        }

        // Intelligently merge seed items
        const mergeCollection = (key, seedList) => {
          const stored = parsed[key];
          if (!Array.isArray(stored) || stored.length === 0) return seedList;
          const seedMap = new Map(seedList.map(item => [String(item.id || item.reminder_id), item]));
          const updatedStored = stored.map(item => {
            const seed = seedMap.get(String(item.id || item.reminder_id));
            if (seed) {
              return { ...seed, ...item };
            }
            return item;
          });
          const existingIds = new Set(stored.map(item => String(item.id || item.reminder_id)));
          const missingSeedItems = seedList.filter(item => !existingIds.has(String(item.id || item.reminder_id)));
          return [...updatedStored, ...missingSeedItems];
        };

        const merged = {
          ...initialDbSeed,
          ...parsed,
          areas: mergeCollection('areas', initialDbSeed.areas),
          customers: mergeCollection('customers', initialDbSeed.customers),
          products: mergeCollection('products', initialDbSeed.products),
          requirements: mergeCollection('requirements', initialDbSeed.requirements),
          notifications: mergeCollection('notifications', initialDbSeed.notifications),
          sales: mergeCollection('sales', initialDbSeed.sales),
          collections: mergeCollection('collections', initialDbSeed.collections),
          purchases: mergeCollection('purchases', initialDbSeed.purchases),
          returns: mergeCollection('returns', initialDbSeed.returns),
          feedbacks: mergeCollection('feedbacks', initialDbSeed.feedbacks),
          suppliers: (Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0) ? parsed.suppliers : initialDbSeed.suppliers,
          supplier_purchases: (Array.isArray(parsed.supplier_purchases) && parsed.supplier_purchases.length > 0) ? parsed.supplier_purchases : initialDbSeed.supplier_purchases,
          supplier_products: (Array.isArray(parsed.supplier_products) && parsed.supplier_products.length > 0) ? parsed.supplier_products : initialDbSeed.supplier_products,
          supplier_payments: (Array.isArray(parsed.supplier_payments) && parsed.supplier_payments.length > 0) ? parsed.supplier_payments : initialDbSeed.supplier_payments,
          payment_reminders: Array.isArray(parsed.payment_reminders) ? parsed.payment_reminders : initialDbSeed.payment_reminders,
          reminder_settings: parsed.reminder_settings || initialDbSeed.reminder_settings
        };

        merged.supplierPurchases = merged.supplier_purchases;
        merged.supplierProducts = merged.supplier_products;
        merged.supplierPayments = merged.supplier_payments;
        merged.paymentReminders = merged.payment_reminders;
        merged.reminderSettings = merged.reminder_settings;

        return merged;
      }
    } catch (e) {
      console.warn('Failed to parse ThreadLine DB from localStorage:', e);
    }
    // Initialize seed
    this.saveDatabase(initialDbSeed);
    return initialDbSeed;
  },

  // Save full DB to LocalStorage and sync with MySQL API if online
  saveDatabase(db, options = {}) {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('threadline_db_updated', {
        detail: { db, source: options.source || 'default' }
      }));

      // Background sync to MySQL Backend
      this.syncToMySQLBackend(db);
    } catch (e) {
      console.error('Error persisting ThreadLine DB to localStorage:', e);
    }
  },

  // Sync to MySQL API in background
  async syncToMySQLBackend(db) {
    try {
      const token = localStorage.getItem('threadline_jwt_token') || sessionStorage.getItem('threadline_jwt_token') || '';
      const res = await fetch(`${API_BASE_URL}/db/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(db)
      });
      if (res.ok) {
        isMySQLOnline = true;
      }
    } catch (e) {
      isMySQLOnline = false;
    }
  },

  // Fetch full DB from MySQL on app start if MySQL backend is online
  async syncFromMySQLBackend() {
    try {
      const res = await fetch(`${API_BASE_URL}/db`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data && Object.keys(result.data).length > 0) {
          isMySQLOnline = true;
          const merged = { ...initialDbSeed, ...result.data };
          localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('threadline_db_updated', { detail: merged }));
          console.log('✅ Successfully synced data from MySQL Database Server!');
          return merged;
        }
      }
    } catch (e) {
      isMySQLOnline = false;
    }
    return this.getDatabase();
  },

  // Get specific table collection
  getCollection(tableName) {
    const db = this.getDatabase();
    if (tableName === 'supplierPurchases') return db.supplierPurchases || db.supplier_purchases || initialDbSeed.supplier_purchases || [];
    if (tableName === 'supplierProducts') return db.supplierProducts || db.supplier_products || initialDbSeed.supplier_products || [];
    if (tableName === 'supplierPayments') return db.supplierPayments || db.supplier_payments || initialDbSeed.supplier_payments || [];
    return db[tableName] || initialDbSeed[tableName] || [];
  },

  // Save table collection
  saveCollection(tableName, collectionData, options = {}) {
    const db = this.getDatabase();
    db[tableName] = collectionData;
    if (tableName === 'supplierPurchases') {
      db.supplierPurchases = collectionData;
      db.supplier_purchases = collectionData;
    }
    if (tableName === 'supplierProducts') {
      db.supplierProducts = collectionData;
      db.supplier_products = collectionData;
    }
    if (tableName === 'supplierPayments') {
      db.supplierPayments = collectionData;
      db.supplier_payments = collectionData;
    }
    this.saveDatabase(db, options);
  },

  // Add a single new item directly to a table in DB
  addItem(tableName, newItem) {
    const collection = this.getCollection(tableName);
    const updatedCollection = [newItem, ...collection];
    this.saveCollection(tableName, updatedCollection);
    return updatedCollection;
  },

  // Update a single item in a table in DB
  updateItem(tableName, id, updatedFields) {
    const collection = this.getCollection(tableName);
    const updatedCollection = collection.map(item =>
      String(item.id) === String(id) ? { ...item, ...updatedFields } : item
    );
    this.saveCollection(tableName, updatedCollection);
    return updatedCollection;
  },

  // Delete a single item from a table in DB
  deleteItem(tableName, id) {
    const collection = this.getCollection(tableName);
    const updatedCollection = collection.filter(item => String(item.id) !== String(id));
    this.saveCollection(tableName, updatedCollection);
    return updatedCollection;
  },

  // Reset DB back to initial seed data
  resetDatabase() {
    this.saveDatabase(initialDbSeed);
    return initialDbSeed;
  },

  // Clear all sample / demo data to start a clean, empty store for real business
  clearAllSampleData() {
    const cleanDb = {
      __isCleanMode: true,
      areas: [
        { id: 'area-1', name: 'Main Store Area', code: 'MSA', assigned_day: 'Everyday', agent_name: 'Store Manager', total_customers: 0, outstanding_balance: 0, target_collection: 0, collected_so_far: 0, status: 'Active', color: '#6B1E2B' }
      ],
      customers: [],
      products: [],
      requirements: [],
      notifications: [],
      sales: [],
      collections: [],
      purchases: [],
      returns: [],
      feedbacks: [],
      suppliers: [],
      supplier_purchases: [],
      supplier_products: [],
      supplier_payments: [],
      payment_reminders: [],
      reminder_settings: {
        id: 'default',
        reminderTime: '09:00',
        isEnabled: true,
        channel: 'WhatsApp & SMS'
      }
    };
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(cleanDb));
    this.saveDatabase(cleanDb);
    window.dispatchEvent(new CustomEvent('threadline_db_updated', { detail: cleanDb }));
    return cleanDb;
  },

  // Restore realistic operational data
  loadDemoSampleData() {
    const demoDb = {
      ...initialDbSeed,
      __isCleanMode: false
    };
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(demoDb));
    this.saveDatabase(demoDb);
    window.dispatchEvent(new CustomEvent('threadline_db_updated', { detail: demoDb }));
    return demoDb;
  },

  // Export database to downloadable JSON file
  exportJSON() {
    const db = this.getDatabase();
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ThreadLine_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import DB from JSON
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        this.saveDatabase({ ...initialDbSeed, ...parsed });
        return true;
      }
    } catch (e) {
      console.error('Invalid DB JSON string:', e);
    }
    return false;
  },

  // Get DB Statistics
  getStats() {
    const db = this.getDatabase();
    let totalRecords = 0;
    Object.keys(db).forEach(key => {
      if (Array.isArray(db[key])) {
        totalRecords += db[key].length;
      }
    });

    return {
      isLive: true,
      isMySQLOnline,
      engine: isMySQLOnline ? 'MySQL Server (Active)' : 'ThreadLine LocalStorage DB (Offline Fallback)',
      tablesCount: Object.keys(db).length,
      totalRecords,
      lastSync: new Date().toLocaleTimeString()
    };
  },

  // Automated Payment Reminders API methods
  async fetchReminders() {
    try {
      const res = await fetch(`${API_BASE_URL}/reminders`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          this.saveCollection('payment_reminders', json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetchReminders failed, using local store:', e.message);
    }
    return this.getCollection('payment_reminders');
  },

  async fetchOverdueCustomers() {
    try {
      const res = await fetch(`${API_BASE_URL}/reminders/overdue-customers`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetchOverdueCustomers failed:', e.message);
    }
    return null;
  },

  async triggerOverdueCheck() {
    try {
      const res = await fetch(`${API_BASE_URL}/reminders/check-now`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (e) {
      console.warn('Backend triggerOverdueCheck failed:', e.message);
    }
    return null;
  },

  async saveReminderSettings(settings) {
    try {
      const res = await fetch(`${API_BASE_URL}/reminders/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {
      console.warn('Backend saveReminderSettings failed:', e.message);
    }
    return settings;
  },

  async sendSingleReminder(customerId, channel = 'WhatsApp & SMS') {
    try {
      const res = await fetch(`${API_BASE_URL}/reminders/send-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, channel })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend sendSingleReminder failed:', e.message);
    }
    return null;
  },

  async clearAllReminders() {
    try {
      await fetch(`${API_BASE_URL}/reminders/clear-all`, { method: 'POST' });
    } catch (e) {
      console.warn('Backend clearAllReminders failed:', e.message);
    }
    this.saveCollection('payment_reminders', []);
  }
};

// Attempt MySQL initial sync on module load
dbService.syncFromMySQLBackend();
