import React, { createContext, useContext, useState } from 'react';
import { dbService, initialDbSeed } from '../services/dbService';
import { API_BASE_URL } from '../config/api.js';

const AreaContext = createContext();

export const initialAreas = initialDbSeed.areas;
export const initialCustomers = initialDbSeed.customers;
export const initialProducts = initialDbSeed.products;
export const initialRequirements = initialDbSeed.requirements;
export const initialNotifications = initialDbSeed.notifications;
export const initialSales = initialDbSeed.sales;
export const initialCollections = initialDbSeed.collections;
export const initialPurchases = initialDbSeed.purchases;
export const initialReturns = initialDbSeed.returns;
export const initialFeedbacks = initialDbSeed.feedbacks;
export const initialSuppliers = initialDbSeed.suppliers;

export function AreaProvider({ children }) {
  const [areas, setAreas] = useState(() => dbService.getCollection('areas'));
  const [customers, setCustomers] = useState(() => dbService.getCollection('customers'));
  const [products, setProducts] = useState(() => dbService.getCollection('products'));
  const [requirements, setRequirements] = useState(() => dbService.getCollection('requirements'));
  const [notifications, setNotifications] = useState(() => dbService.getCollection('notifications'));
  const [sales, setSales] = useState(() => dbService.getCollection('sales'));
  const [collections, setCollections] = useState(() => dbService.getCollection('collections'));
  const [purchases, setPurchases] = useState(() => dbService.getCollection('purchases'));
  const [returns, setReturns] = useState(() => dbService.getCollection('returns'));
  const [feedbacks, setFeedbacks] = useState(() => dbService.getCollection('feedbacks'));
  const [suppliers, setSuppliers] = useState(() => dbService.getCollection('suppliers'));
  const [supplierPurchases, setSupplierPurchases] = useState(() => dbService.getCollection('supplierPurchases'));
  const [supplierProducts, setSupplierProducts] = useState(() => dbService.getCollection('supplierProducts'));
  const [supplierPayments, setSupplierPayments] = useState(() => dbService.getCollection('supplierPayments'));
  const [paymentReminders, setPaymentReminders] = useState(() => dbService.getCollection('payment_reminders'));
  const [reminderSettings, setReminderSettings] = useState(() => {
    const db = dbService.getDatabase();
    return db.reminder_settings || {
      reminderTime: '09:00',
      isEnabled: true,
      channel: 'WhatsApp & SMS',
      lastRunDate: '2026-10-03',
      lastRunTimestamp: '',
      updatedAt: ''
    };
  });

  // Real-time actual calendar day of the week
  const [selectedDay, setSelectedDay] = useState(() => {
    const liveDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return liveDay || 'Monday';
  });

  // Auto-sync states to central localStorage Database with source identifier
  React.useEffect(() => { dbService.saveCollection('areas', areas, { source: 'areaContext' }); }, [areas]);
  React.useEffect(() => { dbService.saveCollection('customers', customers, { source: 'areaContext' }); }, [customers]);
  React.useEffect(() => { dbService.saveCollection('products', products, { source: 'areaContext' }); }, [products]);
  React.useEffect(() => { dbService.saveCollection('requirements', requirements, { source: 'areaContext' }); }, [requirements]);
  React.useEffect(() => { dbService.saveCollection('notifications', notifications, { source: 'areaContext' }); }, [notifications]);
  React.useEffect(() => { dbService.saveCollection('sales', sales, { source: 'areaContext' }); }, [sales]);
  React.useEffect(() => { dbService.saveCollection('collections', collections, { source: 'areaContext' }); }, [collections]);
  React.useEffect(() => { dbService.saveCollection('purchases', purchases, { source: 'areaContext' }); }, [purchases]);
  React.useEffect(() => { dbService.saveCollection('returns', returns, { source: 'areaContext' }); }, [returns]);
  React.useEffect(() => { dbService.saveCollection('feedbacks', feedbacks, { source: 'areaContext' }); }, [feedbacks]);
  React.useEffect(() => { dbService.saveCollection('suppliers', suppliers, { source: 'areaContext' }); }, [suppliers]);
  React.useEffect(() => { dbService.saveCollection('supplierPurchases', supplierPurchases, { source: 'areaContext' }); }, [supplierPurchases]);
  React.useEffect(() => { dbService.saveCollection('supplierProducts', supplierProducts, { source: 'areaContext' }); }, [supplierProducts]);
  React.useEffect(() => { dbService.saveCollection('supplierPayments', supplierPayments, { source: 'areaContext' }); }, [supplierPayments]);
  React.useEffect(() => { dbService.saveCollection('payment_reminders', paymentReminders, { source: 'areaContext' }); }, [paymentReminders]);
  React.useEffect(() => {
    const db = dbService.getDatabase();
    db.reminder_settings = reminderSettings;
    dbService.saveDatabase(db, { source: 'areaContext' });
  }, [reminderSettings]);

  // Real-time synchronization across browser tabs (Admin <-> Customer)
  React.useEffect(() => {
    const syncFromDb = (db) => {
      if (!db) return;
      if (Array.isArray(db.areas)) setAreas(db.areas);
      if (Array.isArray(db.customers)) setCustomers(db.customers);
      if (Array.isArray(db.products)) setProducts(db.products);
      if (Array.isArray(db.requirements)) setRequirements(db.requirements);
      if (Array.isArray(db.notifications)) setNotifications(db.notifications);
      if (Array.isArray(db.sales)) setSales(db.sales);
      if (Array.isArray(db.collections)) setCollections(db.collections);
      if (Array.isArray(db.purchases)) setPurchases(db.purchases);
      if (Array.isArray(db.returns)) setReturns(db.returns);
      if (Array.isArray(db.feedbacks)) setFeedbacks(db.feedbacks);
      if (Array.isArray(db.suppliers)) setSuppliers(db.suppliers);
      if (Array.isArray(db.supplierPurchases || db.supplier_purchases)) setSupplierPurchases(db.supplierPurchases || db.supplier_purchases);
      if (Array.isArray(db.supplierProducts || db.supplier_products)) setSupplierProducts(db.supplierProducts || db.supplier_products);
      if (Array.isArray(db.supplierPayments || db.supplier_payments)) setSupplierPayments(db.supplierPayments || db.supplier_payments);
      if (Array.isArray(db.payment_reminders)) setPaymentReminders(db.payment_reminders);
      if (db.reminder_settings) setReminderSettings(db.reminder_settings);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'threadline_database_v4' || e.key === 'threadline_database_v3' || e.key === 'threadline_database_v2' || e.key === 'threadline_database_v1' || e.key === 'threadline_db_v3') {
        const db = dbService.getDatabase();
        syncFromDb(db);
      }
    };

    const handleCustomDbSync = (e) => {
      // Prevent infinite loop by ignoring self-dispatched events from this context
      if (e.detail?.source === 'areaContext') return;
      const targetDb = e.detail?.db || e.detail || dbService.getDatabase();
      syncFromDb(targetDb);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('threadline_db_updated', handleCustomDbSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('threadline_db_updated', handleCustomDbSync);
    };
  }, []);

  // Helper to determine target roles based on notification type if not explicitly supplied
  const resolveTargetRolesForType = (type, explicitRoles) => {
    if (Array.isArray(explicitRoles) && explicitRoles.length > 0) return explicitRoles;
    const t = String(type || '').toUpperCase();
    if (t === 'OUT_OF_STOCK' || t === 'BACK_IN_STOCK' || t === 'LOW_STOCK' || t.includes('INVENTORY') || t.includes('RETURN') || t.includes('DEFECT')) {
      return ['admin', 'inventory', 'user'];
    }
    if (t === 'PAYMENT_REMINDER' || t === 'DUE_DATE' || t === 'PAYMENT_CONFIRMATION' || t.includes('COLLECTION') || t.includes('SALE') || t.includes('PAYMENT_QUERY')) {
      return ['admin', 'sales', 'user'];
    }
    if (t.includes('PURCHASE') || t.includes('SUPPLIER') || t.includes('MILL')) {
      return ['admin', 'supplier', 'inventory'];
    }
    if (t.includes('INQUIRY') || t.includes('REQUIREMENT') || t.includes('CUSTOM_REQ')) {
      return ['admin', 'sales', 'inventory', 'user'];
    }
    return ['admin', 'sales', 'inventory', 'supplier', 'user'];
  };

  // Generic Notification Sender with Role-Based Targeting
  const sendNotification = ({
    recipientName,
    recipientPhone,
    senderName,
    title,
    message,
    type = 'GENERAL',
    channel = 'SMS & WhatsApp',
    relatedProduct = 'Garment Item',
    status = 'Delivered',
    targetRoles = null,
    targetRole = null,
    customerId = null
  }) => {
    const finalTargetRoles = resolveTargetRolesForType(type, targetRoles || (targetRole ? [targetRole] : null));

    const newNotif = {
      id: `NOTIF-${100 + notifications.length + 1}`,
      type,
      title,
      message,
      recipientName: recipientName || 'Customer',
      recipientPhone: recipientPhone || '+91 98000 00000',
      senderName: senderName || 'Store Admin',
      channel,
      status,
      timestamp: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      relatedProduct,
      unread: true,
      targetRoles: finalTargetRoles,
      customerId: customerId || null
    };

    setNotifications(prev => [newNotif, ...prev]);
    return newNotif;
  };

  // Trigger 1: Out of Stock Requirement Notification (Admin, Inventory, Customer)
  const notifyOutOfStockRequirement = ({ customerName, phone, garment, size, color, customerId = null }) => {
    const title = 'Product Unavailable Alert';
    const message = `Dear ${customerName}, your requested item "${garment} (Size: ${size}, Color: ${color})" is currently out of stock. We have saved your requirement and will notify you as soon as it arrives!`;

    sendNotification({
      recipientName: customerName,
      recipientPhone: phone,
      title,
      message,
      type: 'OUT_OF_STOCK',
      channel: 'SMS & WhatsApp',
      relatedProduct: garment,
      customerId,
      targetRoles: ['admin', 'inventory', 'user']
    });
  };

  // Trigger 2: Back in Stock / Fulfilled Notification (Admin, Inventory, Customer)
  const notifyBackInStock = ({ customerName, phone, garment, size, color, customerId = null }) => {
    const title = 'Good News! Product Now Available';
    const message = `Dear ${customerName}, great news! Your requested item "${garment} (Size: ${size}, Color: ${color})" is now BACK IN STOCK in our warehouse. Contact us to complete your purchase!`;

    sendNotification({
      recipientName: customerName,
      recipientPhone: phone,
      title,
      message,
      type: 'BACK_IN_STOCK',
      channel: 'WhatsApp & SMS',
      relatedProduct: garment,
      customerId,
      targetRoles: ['admin', 'inventory', 'user']
    });
  };

  // Trigger 3: Khata Payment Due Reminder (Admin, Sales, Customer)
  const notifyPaymentReminder = ({ customerName, phone, amount, oldestDue, customerId = null }) => {
    const title = 'Khata Payment Due Reminder';
    const message = `Dear ${customerName}, reminder: Outstanding credit balance of ₹${amount.toLocaleString ? amount.toLocaleString('en-IN') : amount} is due (${oldestDue || 'Overdue'}). Please clear payment via UPI or Cash.`;

    sendNotification({
      recipientName: customerName,
      recipientPhone: phone,
      title,
      message,
      type: 'PAYMENT_REMINDER',
      channel: 'SMS & WhatsApp',
      relatedProduct: 'Khata Balance',
      customerId,
      targetRoles: ['admin', 'sales', 'user']
    });
  };

  // Trigger 4: Payment Confirmation Notification (Admin, Sales, Customer)
  const notifyPaymentConfirmation = ({ customerName, phone, amount, receiptId, customerId = null }) => {
    const title = 'Payment Confirmation Receipt';
    const message = `Thank you ${customerName}! Payment of ₹${amount.toLocaleString ? amount.toLocaleString('en-IN') : amount} received successfully (${receiptId || 'Payment Logged'}). Receipt generated.`;

    sendNotification({
      recipientName: customerName,
      recipientPhone: phone,
      title,
      message,
      type: 'PAYMENT_CONFIRMATION',
      channel: 'WhatsApp',
      relatedProduct: receiptId || 'Receipt',
      customerId,
      targetRoles: ['admin', 'sales', 'user']
    });
  };

  // Trigger 5: Installment Due Date Alert (Admin, Sales, Customer)
  const notifyInstallmentDueDate = ({ customerName, phone, amount, dueDate, areaName, customerId = null }) => {
    const title = 'Upcoming Installment Due Date';
    const message = `Hello ${customerName}, your upcoming field route collection for ${areaName || 'your territory'} is scheduled for ${dueDate || 'this week'}. Scheduled amount: ₹${amount.toLocaleString ? amount.toLocaleString('en-IN') : amount}.`;

    sendNotification({
      recipientName: customerName,
      recipientPhone: phone,
      title,
      message,
      type: 'DUE_DATE',
      channel: 'SMS',
      relatedProduct: 'Weekly Schedule',
      customerId,
      targetRoles: ['admin', 'sales', 'user']
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const clearNotificationHistory = () => {
    setNotifications([]);
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const resendNotification = (id) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === id) {
          return {
            ...n,
            status: 'Delivered',
            timestamp: new Date().toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        }
        return n;
      })
    );
  };

  // Helper: compute customer due date & overdue status
  const getCustomerDueDateInfo = (cust) => {
    if (!cust) return { dueDate: '09 Jun 2024', daysOverdue: 0, isOverdue: false };
    const pendingAmount = Number(cust.balance || 0);
    if (pendingAmount <= 0) {
      return { dueDate: cust.dueDate || 'Paid', daysOverdue: 0, isOverdue: false };
    }

    let dueDateStr = cust.dueDate;
    if (!dueDateStr) {
      const custSales = sales.filter(s => s.customer_id === cust.id || (s.customer && s.customer.toLowerCase() === (cust.name || '').toLowerCase()));
      if (custSales.length > 0 && custSales[custSales.length - 1].date) {
        const d = new Date(custSales[custSales.length - 1].date);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 30);
          dueDateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }
    if (!dueDateStr && cust.lastVisit) {
      const d = new Date(cust.lastVisit);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 15);
        dueDateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    if (!dueDateStr) {
      dueDateStr = '09 Jun 2024';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dObj = new Date(dueDateStr);
    let daysOverdue = 15;
    let isOverdue = true;

    if (!isNaN(dObj.getTime())) {
      const diffDays = Math.floor((today.getTime() - dObj.getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = diffDays > 0;
      daysOverdue = Math.max(1, diffDays);
    }

    return { dueDate: dueDateStr, daysOverdue, isOverdue };
  };

  // Trigger automated overdue check immediately
  const triggerAutomatedOverdueCheck = async () => {
    try {
      const result = await dbService.triggerOverdueCheck();
      if (result && result.success) {
        const updated = await dbService.fetchReminders();
        if (Array.isArray(updated)) {
          setPaymentReminders(updated);
        }
        return result;
      }
    } catch (e) {
      console.warn('Backend trigger check failed, running local check:', e.message);
    }

    // Local fallback check
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newlyCreated = [];

    setPaymentReminders(prev => {
      const updated = [...prev];
      for (const cust of customers) {
        const pendingAmount = Number(cust.balance || 0);
        if (pendingAmount <= 0) continue; // Rule: Do not send if already fully paid

        const { dueDate, daysOverdue, isOverdue } = getCustomerDueDateInfo(cust);
        if (!isOverdue) continue;

        // Duplicate prevention for the same day
        const alreadySentToday = updated.some(
          r => Number(r.customer_id) === Number(cust.id) && r.sent_date === todayStr
        );
        if (alreadySentToday) continue;

        const reminder = {
          reminder_id: `REM-${Date.now()}-${cust.id}`,
          customer_id: cust.id,
          customer_name: cust.name,
          customer_phone: cust.phone || '+91 98765 00000',
          pending_amount: pendingAmount,
          due_date: dueDate,
          days_overdue: daysOverdue,
          message: `Dear ${cust.name}, your payment of ₹${pendingAmount.toLocaleString('en-IN')} is overdue since ${dueDate}. Please make the payment at your earliest convenience. Thank you.`,
          sent_date: todayStr,
          sent_time: timeStr,
          status: 'Sent',
          channel: reminderSettings?.channel || 'WhatsApp & SMS',
          created_at: new Date().toISOString()
        };
        updated.unshift(reminder);
        newlyCreated.push(reminder);
      }
      return updated;
    });

    setReminderSettings(prev => ({
      ...prev,
      lastRunDate: todayStr,
      lastRunTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    return { success: true, sentCount: newlyCreated.length, newlyCreated };
  };

  // Save reminder schedule settings
  const saveReminderSettings = async (newConfig) => {
    const updated = {
      ...reminderSettings,
      ...newConfig,
      updatedAt: new Date().toISOString()
    };
    setReminderSettings(updated);
    await dbService.saveReminderSettings(updated);
    return updated;
  };

  // Send single manual reminder
  const sendSingleReminder = async (customerId, channel = 'WhatsApp & SMS') => {
    const cust = customers.find(c => Number(c.id) === Number(customerId));
    if (!cust) return null;
    const pendingAmount = Number(cust.balance || 0);
    if (pendingAmount <= 0) return null;

    const { dueDate, daysOverdue } = getCustomerDueDateInfo(cust);
    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const reminder = {
      reminder_id: `REM-${Date.now()}-${cust.id}`,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone || '+91 98765 00000',
      pending_amount: pendingAmount,
      due_date: dueDate,
      days_overdue: daysOverdue,
      message: `Dear ${cust.name}, your payment of ₹${pendingAmount.toLocaleString('en-IN')} is overdue since ${dueDate}. Please make the payment at your earliest convenience. Thank you.`,
      sent_date: todayStr,
      sent_time: timeStr,
      status: 'Sent',
      channel,
      created_at: new Date().toISOString()
    };

    setPaymentReminders(prev => [reminder, ...prev]);

    // Also sync to backend if online
    dbService.sendSingleReminder(customerId, channel).catch(() => {});
    return reminder;
  };

  // Delete single reminder
  const deletePaymentReminder = (reminderId) => {
    setPaymentReminders(prev => prev.filter(r => r.reminder_id !== reminderId));
    fetch(`${API_BASE_URL}/reminders/${reminderId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Clear all reminders
  const clearAllPaymentReminders = () => {
    setPaymentReminders([]);
    dbService.clearAllReminders().catch(() => {});
  };

  // Check stock availability by Product Name/ID, Size, Color, and Qty
  const checkStockAvailability = ({ productName, productId, size, color, quantity = 1 }) => {
    const qty = Number(quantity) || 1;
    const targetProduct = products.find(p => p.id === productId || p.name.toLowerCase() === (productName || '').toLowerCase());

    if (!targetProduct) {
      return { status: 'NOT_FOUND', availableQty: 0, product: null };
    }

    if (targetProduct.stock === 0) {
      return { status: 'OUT_OF_STOCK', availableQty: 0, product: targetProduct };
    }

    if (targetProduct.stock < qty) {
      return { status: 'INSUFFICIENT', availableQty: targetProduct.stock, product: targetProduct };
    }

    return { status: 'AVAILABLE', availableQty: targetProduct.stock, product: targetProduct };
  };

  // Reduce product stock quantity upon confirming sale
  const reduceProductStock = (productId, qtyToReduce) => {
    const numQty = Number(qtyToReduce) || 1;
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId || p.name.toLowerCase() === (productId || '').toLowerCase()) {
          const newStock = Math.max(0, p.stock - numQty);
          const newG1 = Math.max(0, p.godown1 - numQty);
          const newStatus = newStock === 0 ? 'Out of Stock' : newStock < 10 ? 'Low Stock' : 'In Stock';
          const newStatusType = newStock === 0 ? 'out-of-stock' : newStock < 10 ? 'low-stock' : 'in-stock';
          return {
            ...p,
            stock: newStock,
            godown1: newG1,
            status: newStatus,
            statusType: newStatusType
          };
        }
        return p;
      })
    );
  };

  // Create Product Sale & Auto-Reduce Stock
  const createProductSaleAndReduceStock = ({
    customerId,
    customerName,
    areaId,
    productId,
    productName,
    items,
    size,
    color,
    quantity = 1,
    totalAmount,
    paymentType = 'Credit'
  }) => {
    const numQty = Number(quantity) || 1;
    const targetProd = products.find(p => p.id === productId || p.name.toLowerCase() === (productName || '').toLowerCase());
    const prodIdToReduce = targetProd ? targetProd.id : productId;
    const finalAmount = totalAmount || (targetProd ? targetProd.price * numQty : 1500);
    const targetCust = customers.find(c => c.id === Number(customerId)) || { name: customerName, phone: '+91 98765 43210' };

    // 1. Reduce stock
    if (prodIdToReduce) {
      reduceProductStock(prodIdToReduce, numQty);
    }

    // 2. Create invoice
    const finalItemDesc = items || `${productName || targetProd?.name || 'Garment Item'} (${size || 'Std'}, ${color || 'Default'}) x ${numQty}`;

    recordFieldSale({
      customerId,
      customerName: targetCust.name || customerName,
      areaId,
      items: finalItemDesc,
      totalAmount: finalAmount,
      paymentType
    });

    // 3. Send Payment Confirmation Notification
    notifyPaymentConfirmation({
      customerName: targetCust.name || customerName || 'Customer',
      phone: targetCust.phone || '+91 98765 43210',
      amount: finalAmount,
      receiptId: `SALE-${Date.now().toString().slice(-4)}`
    });
  };

  // Automatic Requirement Matching when seller adds new stock
  const matchPendingRequirementsWithProduct = (product) => {
    let matchCount = 0;
    setRequirements(prevReqs =>
      prevReqs.map(req => {
        const isPending = req.status === 'Pending' || req.status.includes('Out of Stock') || req.status.includes('Awaiting');
        if (!isPending) return req;

        const reqGarmentLower = (req.garment || '').toLowerCase();
        const prodNameLower = (product.name || '').toLowerCase();
        const prodCatLower = (product.category || '').toLowerCase();

        const garmentMatched = prodNameLower.includes(reqGarmentLower) || reqGarmentLower.includes(prodNameLower) || reqGarmentLower.includes(prodCatLower);
        const sizeMatched = !req.size || req.size === 'Standard' || (product.availableSizes && product.availableSizes.includes(req.size));
        const colorMatched = !req.color || req.color === 'Default' || req.color === 'Custom' || (product.availableColors && product.availableColors.includes(req.color));
        const budgetMatched = !req.budget || Number(req.budget) >= product.price;

        if (garmentMatched && (sizeMatched || colorMatched) && product.stock > 0 && budgetMatched) {
          matchCount++;
          const targetCust = customers.find(c => c.id === req.customerId || c.name === req.customer);
          notifyBackInStock({
            customerName: req.customer,
            phone: targetCust ? targetCust.phone : '+91 98765 43210',
            garment: req.garment,
            size: req.size || 'Standard',
            color: req.color || 'Standard'
          });

          return {
            ...req,
            status: 'Available',
            statusBg: 'var(--icon-green-bg)',
            statusColor: 'var(--icon-green)',
            matchedProduct: product.name,
            matchedProductId: product.id
          };
        }
        return req;
      })
    );
    return matchCount;
  };

  // Add new stock / product and automatically trigger matching with pending customer requirements
  const addProduct = (newProdData) => {
    const createdProduct = {
      id: `prod-${Date.now()}`,
      name: newProdData.name,
      details: newProdData.details || `Size: ${newProdData.size || 'S, M, L, XL'} | Color: ${newProdData.color || 'Pink, Blue'}`,
      category: newProdData.category || 'Menswear',
      sku: newProdData.sku || `SKU-${Date.now().toString().slice(-4)}`,
      stock: Number(newProdData.stock) || 10,
      price: Number(newProdData.price) || 1200,
      availableSizes: newProdData.availableSizes || (newProdData.size ? [newProdData.size] : ['S', 'M', 'L', 'XL']),
      availableColors: newProdData.availableColors || (newProdData.color ? [newProdData.color] : ['Pink', 'Blue', 'White']),
      godown1: Number(newProdData.stock) || 10,
      godown2: 0,
      status: Number(newProdData.stock) > 0 ? 'In Stock' : 'Out of Stock',
      statusType: Number(newProdData.stock) > 0 ? 'in-stock' : 'out-of-stock',
      img: newProdData.img || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'
    };

    setProducts(prev => [createdProduct, ...prev]);
    const matchesFound = matchPendingRequirementsWithProduct(createdProduct);
    return { createdProduct, matchesFound };
  };

  // Save Customer Requirement and auto-check inventory availability
  const saveCustomerRequirement = ({
    customerId,
    customerName,
    customer,
    shopName = '',
    phone = '',
    email = '',
    area,
    areaName = '',
    garment,
    category = 'General Garments',
    size = 'Standard',
    color = 'Default',
    quantity = 1,
    budget,
    requirementDate,
    targetDate,
    deliveryDate,
    measurements = '',
    fabric = '',
    urgency = 'Normal',
    sellerNotes = '',
    notes = '',
    photo = null,
    isCreatedByCustomer = false
  }) => {
    const resolvedCustName = customerName || customer || '';
    const resolvedArea = areaName || area || '';
    const resolvedDate = requirementDate || targetDate || deliveryDate || '';
    const targetCust = customers.find(c => c.id === Number(customerId) || (c.name && resolvedCustName && c.name.toLowerCase() === resolvedCustName.toLowerCase())) || {
      name: resolvedCustName || 'Walk-in Customer',
      shopName: shopName || 'Retail Customer',
      phone: phone || '+91 98765 43210',
      email: email || '',
      areaName: resolvedArea || 'General Area'
    };

    const finalCustName = targetCust.name || resolvedCustName || 'Customer';
    const finalCustPhone = targetCust.phone || phone || '+91 98765 43210';
    const finalShopName = targetCust.shopName || shopName || `${finalCustName}'s Boutique`;
    const finalAreaName = targetCust.areaName || resolvedArea || 'Navrangpura';

    // Auto Check Inventory Stock for Matching Garment
    const reqGarmentLower = (garment || '').toLowerCase();
    const matchingProduct = products.find(p => {
      const pNameLower = p.name.toLowerCase();
      const pCatLower = (p.category || '').toLowerCase();
      const nameMatch = pNameLower.includes(reqGarmentLower) || reqGarmentLower.includes(pNameLower) || reqGarmentLower.includes(pCatLower);
      const sizeMatch = !size || size === 'Standard' || (p.availableSizes && p.availableSizes.includes(size));
      const colorMatch = !color || color === 'Default' || color === 'Custom' || (p.availableColors && p.availableColors.includes(color));
      const budgetMatch = !budget || Number(budget) >= p.price;
      return nameMatch && (sizeMatch || colorMatch) && p.stock >= Number(quantity) && budgetMatch;
    });

    const isAvailableInStock = !!matchingProduct;
    const reqId = `REQ-${Date.now().toString().slice(-5)}`;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let initialStatus = isAvailableInStock ? 'Available' : 'Pending Review';
    let initialStatusBg = isAvailableInStock ? 'var(--icon-green-bg)' : 'var(--icon-purple-bg)';
    let initialStatusColor = isAvailableInStock ? 'var(--icon-green)' : 'var(--icon-purple)';

    const newReq = {
      id: reqId,
      customerId: targetCust.id || (customerId ? Number(customerId) : Date.now()),
      customer: finalCustName,
      shopName: finalShopName,
      phone: finalCustPhone,
      email: targetCust.email || email || '',
      areaName: finalAreaName,
      area: finalAreaName,
      garment: garment || 'Garment Request',
      category: category || (matchingProduct?.category || 'Garments'),
      size: size || 'Standard',
      color: color || 'Default',
      budget: Number(budget) || (matchingProduct ? matchingProduct.price : 2500),
      quantity: Number(quantity) || 1,
      requirementDate: resolvedDate || new Date().toISOString().split('T')[0],
      createdAt: todayStr,
      measurements: measurements || (size ? `Size: ${size}, Color: ${color}` : 'Standard Specifications'),
      fabric: fabric || (matchingProduct?.category || 'Cotton / Silk'),
      urgency: urgency || 'Normal',
      deliveryDate: resolvedDate || 'Within 7 Days',
      status: initialStatus,
      statusBg: initialStatusBg,
      statusColor: initialStatusColor,
      matchedProduct: matchingProduct ? matchingProduct.name : null,
      sellerNotes: sellerNotes || (isAvailableInStock ? `Matched in stock product: ${matchingProduct?.name}` : 'Requirement registered. Seller review pending.'),
      notes: notes || `Customer requested ${quantity}x ${garment} (${size}, ${color})`
    };

    setRequirements(prev => [newReq, ...prev]);

    // Send Realtime In-App Notification to Seller (Admin, Sales & Inventory)
    const adminAlert = {
      id: `NOTIF-${Date.now()}`,
      type: isAvailableInStock ? 'MATCH_FOUND' : 'NEW_REQUIREMENT',
      title: isAvailableInStock ? '✨ Requirement Matched With Inventory!' : '✂️ New Customer Requirement Logged',
      message: `Customer ${finalCustName} (${finalShopName}, ${finalAreaName}) has submitted a requirement for ${quantity}x "${garment}" (${size}, ${color}). Budget: ₹${Number(budget || 2500).toLocaleString('en-IN')}.${isAvailableInStock ? ` Matched with inventory product "${matchingProduct.name}".` : ''}`,
      recipientName: 'Super Admin',
      recipientPhone: '+91 98765 00000',
      senderName: finalCustName,
      senderPhone: finalCustPhone,
      channel: 'In-App & SMS',
      status: 'Delivered',
      timestamp: `${todayStr}, Just now`,
      relatedProduct: garment,
      unread: true,
      targetRoles: ['admin', 'sales', 'inventory']
    };
    setNotifications(prev => [adminAlert, ...prev]);

    // Notification to customer if in stock or out of stock
    if (isAvailableInStock) {
      notifyBackInStock({
        customerName: finalCustName,
        phone: finalCustPhone,
        garment: garment || 'Garment Item',
        size: size || 'Standard',
        color: color || 'Default',
        customerId: finalCustId
      });
    } else {
      notifyOutOfStockRequirement({
        customerName: finalCustName,
        phone: finalCustPhone,
        garment: garment || 'Garment Item',
        size: size || 'Standard',
        color: color || 'Default',
        customerId: finalCustId
      });
    }

    return newReq;
  };

  // Update Requirement Status by Seller
  const updateRequirementStatus = (reqId, newStatus, sellerNotes = '', estimatedDelivery = '') => {
    let targetReq = null;
    let statusBg = 'var(--icon-purple-bg)';
    let statusColor = 'var(--icon-purple)';

    if (newStatus === 'Fabric Sourced') {
      statusBg = 'var(--icon-orange-bg)';
      statusColor = 'var(--icon-orange)';
    } else if (newStatus === 'In Stitching' || newStatus === 'In Transit') {
      statusBg = 'var(--icon-blue-bg)';
      statusColor = 'var(--icon-blue)';
    } else if (newStatus === 'Available' || newStatus === 'Ready for Delivery') {
      statusBg = 'var(--icon-green-bg)';
      statusColor = 'var(--icon-green)';
    } else if (newStatus.includes('Fulfilled')) {
      statusBg = 'var(--icon-teal-bg)';
      statusColor = 'var(--icon-teal)';
    } else if (newStatus === 'Cancelled') {
      statusBg = 'var(--icon-red-bg)';
      statusColor = 'var(--icon-red)';
    }

    setRequirements(prev =>
      prev.map(r => {
        if (r.id === reqId) {
          targetReq = {
            ...r,
            status: newStatus,
            statusBg,
            statusColor,
            sellerNotes: sellerNotes || r.sellerNotes,
            deliveryDate: estimatedDelivery || r.deliveryDate
          };
          return targetReq;
        }
        return r;
      })
    );

    // Notify Customer about status update
    if (targetReq) {
      const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const custAlert = {
        id: `NOTIF-${Date.now()}`,
        type: 'REQUIREMENT_UPDATE',
        title: `Requirement Status: ${newStatus}`,
        message: `Dear ${targetReq.customer}, your garment requirement for "${targetReq.garment}" has been updated to "${newStatus}" by ThreadLine Studio.${sellerNotes ? ` Note: ${sellerNotes}` : ''}`,
        recipientName: targetReq.customer,
        recipientPhone: targetReq.phone || '+91 98765 43210',
        senderName: 'ThreadLine Studio',
        channel: 'In-App & WhatsApp',
        status: 'Delivered',
        timestamp: `${todayStr}, Just now`,
        relatedProduct: targetReq.garment,
        unread: true,
        customerId: targetReq.customerId || null,
        targetRoles: ['admin', 'sales', 'user']
      };
      setNotifications(prev => [custAlert, ...prev]);
    }
  };

  // Update Requirement data (edit modal)
  const updateRequirement = (reqId, updatedData) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === reqId) {
          return { ...r, ...updatedData };
        }
        return r;
      })
    );
  };

  // Delete / Cancel Requirement
  const deleteRequirement = (reqId) => {
    setRequirements(prev => prev.filter(r => r.id !== reqId));
  };

  // Fulfill requirement -> Sends Back in Stock notification
  const fulfillRequirement = (reqId) => {
    let targetReq = null;
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === reqId) {
          targetReq = r;
          return {
            ...r,
            status: 'Fulfilled & Delivered',
            statusBg: 'var(--icon-teal-bg)',
            statusColor: 'var(--icon-teal)'
          };
        }
        return r;
      })
    );

    if (targetReq) {
      const targetCust = customers.find(c => c.name === targetReq.customer || c.id === targetReq.customerId);
      notifyBackInStock({
        customerName: targetReq.customer,
        phone: targetCust ? targetCust.phone : (targetReq.phone || '+91 98765 43210'),
        garment: targetReq.garment,
        size: targetReq.size || 'L',
        color: targetReq.color || 'Pink'
      });
    }
  };

  // Record an installment payment collection for a customer
  const recordCollection = ({ customerId, amount, paymentMode = 'Cash', notes = '' }) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const existingCust = customers.find(c => c.id === Number(customerId));
    // If customer has no pending balance (balance <= 0), prevent payment
    if (!existingCust || (existingCust.balance || 0) <= 0) {
      return;
    }

    // Do not allow payment to exceed the actual pending balance
    const actualCollection = Math.min(numAmount, existingCust.balance);

    let targetCustomer = null;
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === Number(customerId)) {
          const newBal = Math.max(0, c.balance - actualCollection);
          const newStatusType = newBal === 0 ? 'clear' : newBal < 5000 ? 'due' : c.statusType;
          const newStatus = newBal === 0 ? 'Clear' : newBal < 5000 ? 'Due' : c.status;
          targetCustomer = { ...c, balance: newBal, statusType: newStatusType, status: newStatus };
          return {
            ...targetCustomer,
            visitStatus: 'Payment Collected',
            lastCollectedAmount: actualCollection
          };
        }
        return c;
      })
    );

    const activeCustomer = targetCustomer || existingCust;
    const areaId = activeCustomer ? activeCustomer.areaId : 'area-1';
    const areaName = activeCustomer ? activeCustomer.areaName : 'Navrangpura';
    const customerName = activeCustomer ? activeCustomer.name : 'Customer';

    // Update Area collected total
    setAreas(prev =>
      prev.map(a => {
        if (a.id === areaId) {
          return {
            ...a,
            collectedSoFar: a.collectedSoFar + actualCollection,
            outstandingBalance: Math.max(0, a.outstandingBalance - actualCollection)
          };
        }
        return a;
      })
    );

    const receiptId = `COL-${Date.now().toString().slice(-4)}`;

    // Append collection log
    const newColLog = {
      id: receiptId,
      customerId: Number(customerId),
      customerName,
      areaName,
      areaId,
      amount: actualCollection,
      paymentMode,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      notes
    };

    setCollections(prev => [newColLog, ...prev]);

    // Send Payment Receipt Confirmation Notification
    notifyPaymentConfirmation({
      customerName,
      phone: activeCustomer ? activeCustomer.phone : '+91 98765 43210',
      amount: actualCollection,
      receiptId
    });
  };

  const updateCollection = (id, updatedData) => {
    setCollections(prev =>
      prev.map(col => (col.id === id ? { ...col, ...updatedData, amount: Number(updatedData.amount) || col.amount } : col))
    );
  };

  const deleteCollection = (id) => {
    setCollections(prev => prev.filter(col => col.id !== id));
  };

  // Record a field sale / invoice
  const recordFieldSale = ({ customerId, customerName, areaId, items, totalAmount, paymentType = 'Credit', invoiceNo }) => {
    const numAmount = Number(totalAmount);
    const targetArea = areas.find(a => a.id === areaId) || areas[0];
    const targetCust = customers.find(c => c.id === Number(customerId));

    const finalInvoiceNo = invoiceNo || `INV-00${sales.length + 68}`;
    const finalCustName = customerName || (targetCust ? targetCust.name : 'Walk-in Customer');

    const newSale = {
      id: finalInvoiceNo,
      customer: finalCustName,
      customerId: customerId ? Number(customerId) : null,
      areaName: targetArea ? targetArea.name : 'Navrangpura',
      areaId: areaId || 'area-1',
      date: new Date().toISOString().split('T')[0],
      items: items || 'Garment Items',
      totalAmount: numAmount,
      paymentType,
      status: paymentType === 'Cash' ? 'Paid' : 'Pending'
    };

    setSales(prev => [newSale, ...prev]);

    // Update customer purchases and (if credit) balance
    if (customerId) {
      setCustomers(prev =>
        prev.map(c => {
          if (c.id === Number(customerId)) {
            const newBal = paymentType === 'Credit' ? c.balance + numAmount : c.balance;
            const newStatusType = newBal === 0 ? 'clear' : newBal < 5000 ? 'due' : 'overdue';
            const newStatus = newBal === 0 ? 'Clear' : newBal < 5000 ? 'Due' : 'Overdue';
            return {
              ...c,
              balance: newBal,
              purchases: (c.purchases || 0) + numAmount,
              status: newStatus,
              statusType: newStatusType,
              visitStatus: 'Sale Made'
            };
          }
          return c;
        })
      );

      if (paymentType === 'Credit') {
        setAreas(prev =>
          prev.map(a => {
            if (a.id === (areaId || 'area-1')) {
              return { ...a, outstandingBalance: a.outstandingBalance + numAmount };
            }
            return a;
          })
        );
      }
    }
  };

  const updateSale = (id, updatedData) => {
    setSales(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updatedData, totalAmount: Number(updatedData.totalAmount) || s.totalAmount } : s))
    );
  };

  const deleteSale = (id) => {
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const updateCustomerVisitStatus = (customerId, status) => {
    setCustomers(prev =>
      prev.map(c => (c.id === Number(customerId) ? { ...c, visitStatus: status } : c))
    );
  };

  const addArea = (newArea) => {
    const createdArea = {
      id: `area-${Date.now()}`,
      code: newArea.code || `AREA-${areas.length + 1}`,
      name: newArea.name,
      assignedDay: newArea.assignedDay || 'Monday',
      totalCustomers: 0,
      outstandingBalance: 0,
      targetCollection: Number(newArea.targetCollection) || 30000,
      collectedSoFar: 0,
      status: 'Scheduled',
      color: '#14B8A6'
    };
    setAreas(prev => [...prev, createdArea]);
  };

  const updateArea = (id, updatedData) => {
    const existingArea = areas.find(a => a.id === id);
    const oldName = existingArea?.name;
    const newName = updatedData.name ? updatedData.name.trim() : oldName;

    setAreas(prev =>
      prev.map(a => {
        if (a.id === id) {
          return {
            ...a,
            ...updatedData,
            name: newName || a.name,
            targetCollection: Number(updatedData.targetCollection) >= 0 ? Number(updatedData.targetCollection) : a.targetCollection
          };
        }
        return a;
      })
    );

    // Automatically cascade territory name change everywhere in the system
    if (newName && oldName && newName !== oldName) {
      setCustomers(prev =>
        prev.map(c => {
          if (c.areaId === id || c.areaName === oldName) {
            return {
              ...c,
              areaId: id,
              areaName: newName
            };
          }
          return c;
        })
      );

      setSales(prev =>
        prev.map(s => {
          if (s.areaId === id || s.areaName === oldName) {
            return {
              ...s,
              areaId: id,
              areaName: newName
            };
          }
          return s;
        })
      );

      setCollections(prev =>
        prev.map(col => {
          if (col.areaId === id || col.areaName === oldName) {
            return {
              ...col,
              areaId: id,
              areaName: newName
            };
          }
          return col;
        })
      );

      setRequirements(prev =>
        prev.map(r => {
          if (r.areaId === id || r.areaName === oldName) {
            return {
              ...r,
              areaId: id,
              areaName: newName
            };
          }
          return r;
        })
      );
    }
  };

  const deleteArea = (id) => {
    setAreas(prev => prev.filter(a => a.id !== id));
  };

  const addCustomerWithArea = (custData) => {
    const targetArea = areas.find(a => a.id === custData.areaId) || areas[0];
    const newCustId = custData.id ? Number(custData.id) : Date.now();
    const newCust = {
      id: newCustId,
      name: custData.name,
      shopName: custData.shopName || `${custData.name} Store`,
      phone: custData.phone || '+91 98765 00000',
      email: custData.email || '',
      areaId: targetArea ? targetArea.id : 'area-1',
      areaName: targetArea ? targetArea.name : 'Navrangpura',
      purchases: Number(custData.initialPurchase) || 0,
      lastVisit: 'Today',
      balance: Number(custData.openingBalance) || 0,
      creditLimit: Number(custData.creditLimit) || 25000,
      status: Number(custData.openingBalance) > 0 ? 'Due' : 'Clear',
      statusType: Number(custData.openingBalance) > 0 ? 'due' : 'clear',
      avatarInitials: custData.name ? custData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CU',
      visitStatus: 'Scheduled',
      address: custData.address || `${targetArea ? targetArea.name : 'Navrangpura'}, Ahmedabad`
    };

    setCustomers(prev => {
      const exists = prev.some(c => c.id === newCust.id || (c.email && newCust.email && c.email.toLowerCase() === newCust.email.toLowerCase()));
      if (exists) {
        return prev.map(c => {
          if (c.id === newCust.id || (c.email && newCust.email && c.email.toLowerCase() === newCust.email.toLowerCase())) {
            return { ...c, email: newCust.email || c.email };
          }
          return c;
        });
      }
      return [newCust, ...prev];
    });

    if (targetArea) {
      setAreas(prev =>
        prev.map(a => (a.id === targetArea.id ? { ...a, totalCustomers: a.totalCustomers + 1, outstandingBalance: a.outstandingBalance + (Number(custData.openingBalance) || 0) } : a))
      );
    }
    return newCust;
  };

  const setCustomerPassword = (id, newPassword) => {
    setCustomers(prev =>
      prev.map(c => (c.id === Number(id) ? { ...c, password: newPassword } : c))
    );
  };

  const updateCustomer = (id, updatedData) => {
    const targetArea = areas.find(a => a.id === updatedData.areaId);
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === Number(id)) {
          return {
            ...c,
            ...updatedData,
            areaName: targetArea ? targetArea.name : c.areaName,
            balance: Number(updatedData.balance) !== undefined ? Number(updatedData.balance) : c.balance,
            creditLimit: Number(updatedData.creditLimit) !== undefined ? Number(updatedData.creditLimit) : c.creditLimit
          };
        }
        return c;
      })
    );
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== Number(id)));
  };

  const updateScheduleDay = (areaId, newDay, agentName, newTarget) => {
    setAreas(prev =>
      prev.map(a => {
        if (a.assignedDay === newDay && a.id !== areaId) {
          return { ...a, assignedDay: 'Unassigned' };
        }
        if (a.id === areaId) {
          return {
            ...a,
            assignedDay: newDay || a.assignedDay,
            agentName: agentName !== undefined ? agentName : a.agentName,
            targetCollection: Number(newTarget) >= 0 ? Number(newTarget) : a.targetCollection
          };
        }
        return a;
      })
    );
  };

  const clearScheduleDay = (areaId) => {
    setAreas(prev =>
      prev.map(a => (a.id === areaId ? { ...a, assignedDay: 'Unassigned' } : a))
    );
  };

  // Purchase Order DB Actions
  const addPurchase = (newPo) => {
    setPurchases(prev => [newPo, ...prev]);
  };

  const updatePurchase = (id, updatedPo) => {
    setPurchases(prev => prev.map(p => (p.id === id ? { ...p, ...updatedPo } : p)));
  };

  const deletePurchase = (id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  // Return Log DB Actions
  const addReturn = (newReturn) => {
    setReturns(prev => [newReturn, ...prev]);
  };

  const updateReturn = (id, updatedReturn) => {
    setReturns(prev => prev.map(r => (r.id === id ? { ...r, ...updatedReturn } : r)));
  };

  const deleteReturn = (id) => {
    setReturns(prev => prev.filter(r => r.id !== id));
  };

  // Feedback DB Actions
  const addFeedback = (newFeedback) => {
    setFeedbacks(prev => [newFeedback, ...prev]);
  };

  // Supplier Management & Inventory Actions
  const addSupplier = (newSupData) => {
    const createdSupplier = {
      id: newSupData.id || `SUP-${Date.now().toString().slice(-4)}`,
      name: newSupData.name || '',
      shopName: newSupData.shopName || '',
      phone: newSupData.phone || '',
      email: newSupData.email || '',
      address: newSupData.address || '',
      city: newSupData.city || '',
      gstNumber: newSupData.gstNumber || '',
      categories: Array.isArray(newSupData.categories) ? newSupData.categories : (newSupData.categories ? newSupData.categories.split(',').map(s => s.trim()) : ['Sarees']),
      productTypes: newSupData.productTypes || 'Textile & Garments',
      priceRange: newSupData.priceRange || '₹400 - ₹2,000',
      paymentTerms: newSupData.paymentTerms || 'Credit (30 Days)',
      deliveryTime: newSupData.deliveryTime || '3-4 Days',
      rating: Number(newSupData.rating) || 4.5,
      notes: newSupData.notes || '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    setSuppliers(prev => [createdSupplier, ...prev]);
    return createdSupplier;
  };

  const updateSupplier = (id, updatedFields) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...updatedFields } : s)));
  };

  const deleteSupplier = (id) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  // Record Purchase from Supplier + Auto-Increase Warehouse Inventory + Match Customer Requirements
  const recordPurchaseFromSupplierAndIncreaseInventory = (purchaseData) => {
    const qty = Math.max(1, Number(purchaseData.quantity) || 1);
    const unitCost = Math.max(0, Number(purchaseData.costPerItem) || 0);
    const delivery = Math.max(0, Number(purchaseData.deliveryCharge) || 0);
    const disc = Math.max(0, Number(purchaseData.discount) || 0);
    const totalPurchaseCost = qty * unitCost;
    const finalCost = Math.max(0, totalPurchaseCost + delivery - disc);
    const effectiveUnitCost = qty > 0 ? (finalCost / qty) : unitCost;

    const newPO = {
      id: purchaseData.id || `PO-${Date.now().toString().slice(-5)}`,
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
      productName: purchaseData.productName,
      category: purchaseData.category || 'General Garments',
      size: purchaseData.size || 'M',
      color: purchaseData.color || 'Standard',
      quantity: qty,
      costPerItem: unitCost,
      totalPurchaseCost,
      deliveryCharge: delivery,
      discount: disc,
      finalCost,
      effectiveUnitCost: Math.round(effectiveUnitCost * 100) / 100,
      paymentStatus: purchaseData.paymentStatus || 'Pending',
      paidAmount: purchaseData.paymentStatus === 'Paid' ? finalCost : (Number(purchaseData.paidAmount) || 0),
      expectedDeliveryDate: purchaseData.expectedDeliveryDate || '',
      actualDeliveryDate: purchaseData.actualDeliveryDate || (purchaseData.deliveryStatus === 'Delivered' ? (purchaseData.purchaseDate || new Date().toISOString().split('T')[0]) : null),
      deliveryStatus: purchaseData.deliveryStatus || 'Pending',
      status: purchaseData.status || 'Pending',
      acceptanceStatus: purchaseData.acceptanceStatus || 'Pending',
      acceptedAt: purchaseData.acceptedAt || null,
      acceptedDateFormatted: purchaseData.acceptedDateFormatted || null,
      acceptedBy: purchaseData.acceptedBy || null,
      notes: purchaseData.notes || '',
      createdAt: new Date().toISOString()
    };

    // 1. Add purchase order to supplierPurchases
    setSupplierPurchases(prev => [newPO, ...prev]);

    // 2. Automatically increase Inventory Stock and trigger requirement auto-matching
    let affectedProduct = null;
    let requirementsMatched = 0;

    setProducts(prevProducts => {
      const pIdx = prevProducts.findIndex(p =>
        (purchaseData.productId && p.id === purchaseData.productId) ||
        (p.name && purchaseData.productName && p.name.trim().toLowerCase() === purchaseData.productName.trim().toLowerCase())
      );

      if (pIdx !== -1) {
        const existing = prevProducts[pIdx];
        const newStock = (existing.stock || 0) + qty;
        const newGodown1 = (existing.godown1 || 0) + qty;
        const updated = {
          ...existing,
          stock: newStock,
          godown1: newGodown1,
          status: newStock > 0 ? 'In Stock' : 'Out of Stock',
          statusType: newStock > 0 ? 'in-stock' : 'out-of-stock',
          lastSupplier: purchaseData.supplierName,
          lastPurchasePrice: unitCost,
          effectiveCost: Math.round(effectiveUnitCost * 100) / 100
        };
        affectedProduct = updated;
        const updatedList = [...prevProducts];
        updatedList[pIdx] = updated;
        return updatedList;
      } else {
        // Create new inventory product
        const newProd = {
          id: `prod-${Date.now()}`,
          name: purchaseData.productName,
          details: `Size: ${purchaseData.size || 'M, L, XL'} | Color: ${purchaseData.color || 'Assorted'} | Supplied by ${purchaseData.supplierName}`,
          category: purchaseData.category || 'General Garments',
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          stock: qty,
          price: Math.round(unitCost * 1.35) || 1200,
          godown1: qty,
          godown2: 0,
          status: 'In Stock',
          statusType: 'in-stock',
          availableSizes: purchaseData.size ? [purchaseData.size] : ['S', 'M', 'L', 'XL'],
          availableColors: purchaseData.color ? [purchaseData.color] : ['Default', 'Blue', 'Pink'],
          lastSupplier: purchaseData.supplierName,
          lastPurchasePrice: unitCost,
          effectiveCost: Math.round(effectiveUnitCost * 100) / 100,
          img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'
        };
        affectedProduct = newProd;
        return [newProd, ...prevProducts];
      }
    });

    if (affectedProduct) {
      requirementsMatched = matchPendingRequirementsWithProduct(affectedProduct);
    }

    // 3. Maintain Supplier-Product Relationship catalog
    setSupplierProducts(prevCatalog => {
      const existIdx = prevCatalog.findIndex(sp =>
        sp.supplierId === purchaseData.supplierId &&
        sp.productName.trim().toLowerCase() === purchaseData.productName.trim().toLowerCase()
      );
      if (existIdx !== -1) {
        const copy = [...prevCatalog];
        copy[existIdx] = {
          ...copy[existIdx],
          unitPrice: unitCost,
          deliveryCharge: delivery,
          discount: disc,
          effectiveCost: Math.round(effectiveUnitCost * 100) / 100,
          lastPurchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0]
        };
        return copy;
      } else {
        return [
          {
            id: `sp-${Date.now()}`,
            supplierId: purchaseData.supplierId,
            supplierName: purchaseData.supplierName,
            productName: purchaseData.productName,
            category: purchaseData.category || 'General Garments',
            unitPrice: unitCost,
            deliveryCharge: delivery,
            discount: disc,
            effectiveCost: Math.round(effectiveUnitCost * 100) / 100,
            deliveryDays: 3,
            qualityRating: 4.6,
            lastPurchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0]
          },
          ...prevCatalog
        ];
      }
    });

    // 4. Record payment if marked as Paid or partial payment provided
    if (newPO.paidAmount > 0) {
      const payRecord = {
        id: `SPAY-${Date.now().toString().slice(-4)}`,
        purchaseId: newPO.id,
        supplierId: purchaseData.supplierId,
        supplierName: purchaseData.supplierName,
        amount: newPO.paidAmount,
        paymentDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
        paymentMode: purchaseData.paymentMode || 'Bank Transfer',
        referenceNumber: `TXN-${Date.now().toString().slice(-6)}`,
        notes: `Payment for ${purchaseData.productName} (PO #${newPO.id})`
      };
      setSupplierPayments(prev => [payRecord, ...prev]);
    }

    return { purchase: newPO, affectedProduct, requirementsMatched };
  };

  const updateSupplierPurchase = (id, updatedFields) => {
    setSupplierPurchases(prev => prev.map(po => (po.id === id ? { ...po, ...updatedFields } : po)));
  };

  // Supplier Purchase Order Acceptance Workflow
  const acceptSupplierPurchaseOrder = async (id, currentSupplierId, currentSupplierName) => {
    const targetPO = supplierPurchases.find(p => String(p.id) === String(id) || String(p.purchaseOrderNo) === String(id));
    if (!targetPO) {
      throw new Error('Purchase Order not found.');
    }

    // 1. Enforce Supplier Ownership (Supplier A cannot accept Supplier B's PO)
    const isOwner = targetPO.supplierId === currentSupplierId ||
      (currentSupplierId === 'sup-1' && (targetPO.supplierId === 'SUP-001' || targetPO.supplierId === 'sup-1')) ||
      (targetPO.supplierName && currentSupplierName && targetPO.supplierName.toLowerCase().includes(currentSupplierName.toLowerCase()));

    if (!isOwner) {
      throw new Error("Unauthorized: You cannot accept another supplier's Purchase Order.");
    }

    // 2. Prevent Duplicate Acceptance
    if (targetPO.acceptanceStatus === 'Accepted' || targetPO.status === 'Accepted') {
      throw new Error(`Purchase Order has already been accepted on ${targetPO.acceptedDateFormatted || targetPO.acceptedAt}. Duplicate acceptance is not permitted.`);
    }

    // 3. Perform Acceptance
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const updatedPO = {
      ...targetPO,
      status: 'Accepted',
      acceptanceStatus: 'Accepted',
      acceptedAt: now.toISOString(),
      acceptedDateFormatted: formattedDate,
      acceptedBy: currentSupplierName || targetPO.supplierName || 'Supplier',
      deliveryStatus: (targetPO.deliveryStatus === 'Pending' || !targetPO.deliveryStatus) ? 'Accepted' : targetPO.deliveryStatus
    };

    setSupplierPurchases(prev => prev.map(po => ((String(po.id) === String(targetPO.id)) ? updatedPO : po)));

    // 4. Create Notification for Admin / Inventory Manager
    const adminNotification = {
      id: `notif-${Date.now()}`,
      title: `✓ PO Accepted: ${targetPO.purchaseOrderNo || targetPO.id}`,
      message: `Supplier "${targetPO.supplierName || currentSupplierName}" has accepted Purchase Order ${targetPO.purchaseOrderNo || targetPO.id} (₹${Number(targetPO.finalCost || 0).toLocaleString('en-IN')}) on ${formattedDate}. Ready for processing.`,
      date: formattedDate,
      type: 'order',
      role: 'admin',
      isRead: false,
      createdAt: now.toISOString()
    };
    setNotifications(prev => [adminNotification, ...prev]);

    // 5. Sync to backend API
    try {
      const res = await fetch(`${API_BASE_URL}/supplier/purchase-orders/${targetPO.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supplier-id': currentSupplierId
        },
        body: JSON.stringify({
          supplierId: currentSupplierId,
          supplierName: currentSupplierName
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error) {
          throw new Error(errJson.error);
        }
      }
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) {
        throw e;
      }
      // Handled via local resilient store if backend offline
    }

    return updatedPO;
  };

  const deleteSupplierPurchase = (id) => {
    setSupplierPurchases(prev => prev.filter(po => po.id !== id));
  };

  const addSupplierProduct = (prodData) => {
    const newProd = {
      id: prodData.id || `sp-${Date.now()}`,
      supplierId: prodData.supplierId,
      supplierName: prodData.supplierName || '',
      productName: prodData.productName || 'Garment Item',
      category: prodData.category || 'General',
      basePrice: Number(prodData.basePrice || prodData.unitPrice) || 100,
      unitPrice: Number(prodData.basePrice || prodData.unitPrice) || 100,
      minOrderQty: Number(prodData.minOrderQty) || 10,
      leadTimeDays: Number(prodData.leadTimeDays) || 2,
      availability: prodData.availability || 'In Stock',
      details: prodData.details || '',
      image: prodData.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&h=300&fit=crop'
    };
    setSupplierProducts(prev => [newProd, ...prev]);
    return newProd;
  };

  const updateSupplierProduct = (id, updatedFields) => {
    setSupplierProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updatedFields } : p)));
  };

  const deleteSupplierProduct = (id) => {
    setSupplierProducts(prev => prev.filter(p => p.id !== id));
  };

  const recordSupplierPayment = (paymentData) => {
    const newPay = {
      id: `SPAY-${Date.now().toString().slice(-4)}`,
      purchaseId: paymentData.purchaseId || '',
      supplierId: paymentData.supplierId,
      supplierName: paymentData.supplierName,
      amount: Number(paymentData.amount) || 0,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'Bank Transfer',
      referenceNumber: paymentData.referenceNumber || `TXN-${Date.now().toString().slice(-6)}`,
      notes: paymentData.notes || ''
    };

    setSupplierPayments(prev => [newPay, ...prev]);

    if (paymentData.purchaseId) {
      setSupplierPurchases(prev =>
        prev.map(po => {
          if (po.id === paymentData.purchaseId) {
            const newPaid = (Number(po.paidAmount) || 0) + Number(paymentData.amount);
            const isFull = newPaid >= po.finalCost;
            return {
              ...po,
              paidAmount: newPaid,
              paymentStatus: isFull ? 'Paid' : 'Pending'
            };
          }
          return po;
        })
      );
    }
    return newPay;
  };

  // Database Backup / Reset Controls
  const resetDatabase = () => {
    const seed = dbService.resetDatabase();
    setAreas(seed.areas);
    setCustomers(seed.customers);
    setProducts(seed.products);
    setRequirements(seed.requirements);
    setNotifications(seed.notifications);
    setSales(seed.sales);
    setCollections(seed.collections);
    setPurchases(seed.purchases);
    setReturns(seed.returns);
    setFeedbacks(seed.feedbacks);
    setSuppliers(seed.suppliers || []);
    setSupplierPurchases(seed.supplierPurchases || []);
    setSupplierProducts(seed.supplierProducts || []);
    setSupplierPayments(seed.supplierPayments || []);
  };

  const exportDatabase = () => {
    dbService.exportJSON();
  };

  const importDatabase = (jsonStr) => {
    const success = dbService.importJSON(jsonStr);
    if (success) {
      const db = dbService.getDatabase();
      setAreas(db.areas || []);
      setCustomers(db.customers || []);
      setProducts(db.products || []);
      setRequirements(db.requirements || []);
      setNotifications(db.notifications || []);
      setSales(db.sales || []);
      setCollections(db.collections || []);
      setPurchases(db.purchases || []);
      setReturns(db.returns || []);
      setFeedbacks(db.feedbacks || []);
      setSuppliers(db.suppliers || []);
      setSupplierPurchases(db.supplierPurchases || []);
      setSupplierProducts(db.supplierProducts || []);
      setSupplierPayments(db.supplierPayments || []);
    }
    return success;
  };

  const unreadNotificationCount = notifications.filter(n => n.unread).length;

  return (
    <AreaContext.Provider
      value={{
        areas,
        customers,
        products,
        setProducts,
        requirements,
        notifications,
        unreadNotificationCount,
        sendNotification,
        notifyOutOfStockRequirement,
        notifyBackInStock,
        notifyPaymentReminder,
        notifyPaymentConfirmation,
        notifyInstallmentDueDate,
        markAllNotificationsAsRead,
        clearNotificationHistory,
        deleteNotification,
        resendNotification,
        sales,
        collections,
        purchases,
        addPurchase,
        updatePurchase,
        deletePurchase,
        returns,
        addReturn,
        updateReturn,
        deleteReturn,
        feedbacks,
        addFeedback,
        suppliers,
        setSuppliers,
        supplierPurchases,
        setSupplierPurchases,
        supplierProducts,
        setSupplierProducts,
        supplierPayments,
        setSupplierPayments,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierProduct,
        updateSupplierProduct,
        deleteSupplierProduct,
        recordPurchaseFromSupplierAndIncreaseInventory,
        updateSupplierPurchase,
        acceptSupplierPurchaseOrder,
        deleteSupplierPurchase,
        recordSupplierPayment,
        resetDatabase,
        exportDatabase,
        importDatabase,
        dbService,
        selectedDay,
        setSelectedDay,
        checkStockAvailability,
        reduceProductStock,
        createProductSaleAndReduceStock,
        saveCustomerRequirement,
        updateRequirementStatus,
        updateRequirement,
        deleteRequirement,
        fulfillRequirement,
        addProduct,
        matchPendingRequirementsWithProduct,
        recordCollection,
        recordPayment: recordCollection,
        updateCollection,
        deleteCollection,
        recordFieldSale,
        updateSale,
        deleteSale,
        updateCustomerVisitStatus,
        addArea,
        updateArea,
        deleteArea,
        addCustomerWithArea,
        updateCustomer,
        setCustomerPassword,
        deleteCustomer,
        updateScheduleDay,
        clearScheduleDay,
        paymentReminders,
        reminderSettings,
        getCustomerDueDateInfo,
        triggerAutomatedOverdueCheck,
        saveReminderSettings,
        sendSingleReminder,
        deletePaymentReminder,
        clearAllPaymentReminders
      }}
    >
      {children}
    </AreaContext.Provider>
  );
}

export function useArea() {
  const context = useContext(AreaContext);
  if (!context) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
}
