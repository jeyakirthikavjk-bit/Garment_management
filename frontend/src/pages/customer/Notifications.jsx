import React, { useState, useMemo } from 'react';
import { useArea } from '../../context/AreaContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { isNotificationRelevantToRole } from '../../config/roles';
import Toast from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { sendWhatsAppMessage } from '../../services/whatsappService';

export default function Notifications() {
  const {
    notifications,
    customers,
    sendNotification,
    markAllNotificationsAsRead,
    clearNotificationHistory,
    deleteNotification,
    resendNotification,
    paymentReminders,
    reminderSettings,
    triggerAutomatedOverdueCheck,
    deletePaymentReminder,
    clearAllPaymentReminders
  } = useArea();

  const { roleKey, isAdmin, isSales, isSupplier, isInventory, isUser, isCustomerRole, customerId, customerName, userEmail, userName } = useAuth();
  const { storeSettings, t } = useSettings();

  // Suppliers and Inventory Managers do not manage retail customer credit reminders
  const [mainView, setMainView] = useState(() => {
    if (roleKey === 'supplier' || roleKey === 'inventory') return 'ALERTS';
    return 'REMINDERS';
  });

  // Safeguard: non-relevant roles cannot stay on REMINDERS
  React.useEffect(() => {
    if ((isSupplier || isInventory) && mainView === 'REMINDERS') {
      setMainView('ALERTS');
    }
  }, [isSupplier, isInventory, mainView]);

  const [activeTab, setActiveTab] = useState('ALL');
  const [reminderTab, setReminderTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [reminderSearchTerm, setReminderSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [showClearRemindersModal, setShowClearRemindersModal] = useState(false);
  const [isCheckingNow, setIsCheckingNow] = useState(false);

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

  // Notification Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    customerId: customers[0]?.id || 1,
    targetAudience: 'CUSTOMER', // 'CUSTOMER', 'SUPPLIER', 'INVENTORY', 'SALES'
    type: isCustomerRole ? 'STOCK_INQUIRY' : 'OUT_OF_STOCK',
    channel: isCustomerRole ? 'In-App & WhatsApp' : 'SMS & WhatsApp',
    message: ''
  });

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const selectedCustomer = isCustomerRole
    ? myCustomer
    : (customers.find(c => c.id === Number(sendForm.customerId)) || customers[0]);

  // Helper seller templates
  const getSellerTemplateText = (type, custName = 'Customer') => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return `Dear ${custName}, your requested product (Size/Color variant) is currently out of stock. We have saved your requirement and will notify you as soon as it arrives!`;
      case 'BACK_IN_STOCK':
        return `Good news ${custName}! Your requested garment is now BACK IN STOCK in our warehouse. Contact ThreadLine Garments to complete your order.`;
      case 'PAYMENT_REMINDER':
        return `Dear ${custName}, friendly reminder regarding your pending Khata credit balance of ₹${(selectedCustomer?.balance || 5000).toLocaleString('en-IN')}. Please settle via UPI or Cash.`;
      case 'PAYMENT_CONFIRMATION':
        return `Thank you ${custName}! Your payment has been received successfully and logged in our system. Receipt issued.`;
      case 'DUE_DATE':
        return `Hello ${custName}, your weekly installment collection route is scheduled for this week. Scheduled target amount: ₹${(selectedCustomer?.balance || 3000).toLocaleString('en-IN')}.`;
      default:
        return `Hello ${custName}, update regarding your garment order from ThreadLine.`;
    }
  };

  // Helper customer inquiry templates
  const getCustomerTemplateText = (type) => {
    switch (type) {
      case 'STOCK_INQUIRY':
        return `Dear ThreadLine Store, I would like to check the availability and restock timelines for garment items.`;
      case 'PAYMENT_QUERY':
        return `Dear ThreadLine Store, I have a query regarding my current credit balance and recent payment receipts.`;
      case 'ORDER_STATUS':
        return `Dear ThreadLine Store, please update me on the delivery and fulfillment status of my recent garment purchase.`;
      case 'CUSTOM_REQ':
        return `Dear ThreadLine Store, I would like to submit a custom fabric, measurement, or quantity requirement request.`;
      case 'GENERAL_INQUIRY':
        return `Dear ThreadLine Store, I have a query regarding products and services.`;
      default:
        return `Dear ThreadLine Store, inquiry from customer ${customerName || 'Customer'}.`;
    }
  };

  // Helper role-targeted templates for other roles
  const getRoleTargetTemplateText = (audience, type, custName = 'Customer') => {
    if (audience === 'SUPPLIER') {
      switch (type) {
        case 'PURCHASE_ORDER':
          return `Dear Sri Lakshmi Mills, Purchase Order has been initiated for cotton shirting fabric. Please review specifications and confirm delivery timeline.`;
        case 'SUPPLIER_DELIVERY':
          return `Mill Delivery Advisory: Bulk consignment dispatched via transport. Expected arrival at ThreadLine warehouse within 48 hours.`;
        case 'SUPPLIER_PAYMENT':
          return `Payment Settlement Notice: Direct bank NEFT remittance completed against Mill Invoice. Please confirm receipt.`;
        case 'GENERAL_SUPPLIER':
          return `Inquiry regarding yarn grade availability, mill production capacity, and delivery schedules.`;
        default:
          return `Official textile supplier notice from ThreadLine Garments.`;
      }
    }
    if (audience === 'INVENTORY') {
      switch (type) {
        case 'LOW_STOCK':
          return `Stock Threshold Notice: SKU stock levels are below safety buffer. Please verify physical inventory and coordinate restocking.`;
        case 'BACK_IN_STOCK':
          return `Warehouse Restock Update: Inward goods inspected, barcoded, and relocated to active sales racks.`;
        case 'INVENTORY_ALERT':
          return `Audit Notification: Monthly physical inventory audit scheduled for godown section A & B.`;
        case 'RETURNS':
          return `Defect Returns Notice: Defective garment pieces inspected and isolated to quarantine return bin.`;
        default:
          return `Internal warehouse inventory notification.`;
      }
    }
    if (audience === 'SALES') {
      switch (type) {
        case 'PAYMENT_REMINDER':
          return `Sales Overdue Alert: Priority customer overdue accounts detected in your route beat. Please expedite follow-up.`;
        case 'COLLECTION':
          return `Route Collection Reminder: Weekly customer installment collection route active today.`;
        case 'ORDER_STATUS':
          return `Order Dispatch Ready: Verified sales order packaged and cleared for distribution dispatch.`;
        default:
          return `Sales department operational advisory.`;
      }
    }
    // Default Customer
    return getSellerTemplateText(type, custName);
  };

  const handleOpenSendModal = () => {
    if (isCustomerRole) {
      const defaultMsg = getCustomerTemplateText('STOCK_INQUIRY');
      setSendForm({
        customerId: 1,
        targetAudience: 'ADMIN',
        type: 'STOCK_INQUIRY',
        channel: 'In-App & WhatsApp',
        message: defaultMsg
      });
    } else if (isSupplier) {
      const defaultMsg = getRoleTargetTemplateText('SUPPLIER', 'SUPPLIER_DELIVERY');
      setSendForm({
        customerId: null,
        targetAudience: 'STORE',
        type: 'SUPPLIER_DELIVERY',
        channel: 'SMS & WhatsApp',
        message: defaultMsg
      });
    } else if (isInventory) {
      const defaultMsg = getRoleTargetTemplateText('INVENTORY', 'LOW_STOCK');
      setSendForm({
        customerId: customers[0]?.id || 1,
        targetAudience: 'INVENTORY',
        type: 'LOW_STOCK',
        channel: 'SMS & WhatsApp',
        message: defaultMsg
      });
    } else {
      const defaultMsg = getSellerTemplateText('OUT_OF_STOCK', selectedCustomer?.name);
      setSendForm({
        customerId: customers[0]?.id || 1,
        targetAudience: 'CUSTOMER',
        type: 'OUT_OF_STOCK',
        channel: 'SMS & WhatsApp',
        message: defaultMsg
      });
    }
    setShowSendModal(true);
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (!sendForm.message) return;

    if (isCustomerRole) {
      // Customer sending inquiry to Store/Seller Admin & Sales
      const categoryTitles = {
        STOCK_INQUIRY: 'Stock Availability Inquiry',
        PAYMENT_QUERY: 'Payment & Khata Balance Query',
        ORDER_STATUS: 'Order Status Inquiry',
        CUSTOM_REQ: 'Custom Requirement Inquiry',
        GENERAL_INQUIRY: 'General Customer Inquiry'
      };

      sendNotification({
        recipientName: 'ThreadLine Store (Admin & Sales)',
        recipientPhone: '+91 96636 18684',
        senderName: customerName || 'Customer',
        customerId: customerId || 1,
        title: categoryTitles[sendForm.type] || 'Customer Inquiry',
        message: sendForm.message,
        type: sendForm.type,
        channel: sendForm.channel,
        relatedProduct: 'Customer Inquiry',
        targetRoles: sendForm.type === 'STOCK_INQUIRY' || sendForm.type === 'CUSTOM_REQ'
          ? ['admin', 'sales', 'inventory', 'user']
          : ['admin', 'sales', 'user']
      });

      setShowSendModal(false);
      showToast(`✓ Inquiry sent to Store Admin & Sales via ${sendForm.channel}!`);
    } else if (isSupplier) {
      // Mill Supplier sending advisory to Store Admin & Inventory
      sendNotification({
        recipientName: 'ThreadLine Store (Admin & Inventory)',
        recipientPhone: '+91 96636 18684',
        senderName: 'Senthil Kumar (Sri Lakshmi Mills)',
        customerId: null,
        title: sendForm.type === 'SUPPLIER_DELIVERY'
          ? 'Mill Delivery & Dispatch Advisory'
          : sendForm.type === 'PURCHASE_ORDER'
            ? 'Purchase Order Confirmation'
            : sendForm.type === 'SUPPLIER_PAYMENT'
              ? 'Mill Payment & Settlement Query'
              : 'Mill Supplier Advisory',
        message: sendForm.message,
        type: sendForm.type || 'SUPPLIER_DELIVERY',
        channel: sendForm.channel,
        relatedProduct: 'Textile Supply',
        targetRoles: ['admin', 'inventory', 'supplier']
      });

      setShowSendModal(false);
      showToast(`✓ Mill advisory sent to Store Admin & Inventory via ${sendForm.channel}!`);
    } else {
      // Role-targeted notification dispatch by Admin, Sales, or Inventory
      let targetRoles = ['user', 'admin', 'sales'];
      let recipientName = selectedCustomer?.name || 'Customer';
      let recipientPhone = selectedCustomer?.phone || '+91 98765 43210';
      let title = 'Customer Notice';

      if (sendForm.targetAudience === 'SUPPLIER') {
        targetRoles = ['supplier', 'admin', 'inventory'];
        recipientName = 'Senthil Kumar (Sri Lakshmi Mills)';
        recipientPhone = '+91 98422 12345';
        title = sendForm.type === 'PURCHASE_ORDER'
          ? 'Mill Purchase Order Update'
          : sendForm.type === 'SUPPLIER_DELIVERY'
            ? 'Mill Delivery & Dispatch Advisory'
            : sendForm.type === 'SUPPLIER_PAYMENT'
              ? 'Mill Settlement Payment Advice'
              : 'Mill Supplier Notice';
      } else if (sendForm.targetAudience === 'INVENTORY') {
        targetRoles = ['inventory', 'admin'];
        recipientName = 'Rajesh Verma (Inventory Manager)';
        recipientPhone = '+91 98765 11223';
        title = sendForm.type === 'LOW_STOCK'
          ? 'Low Stock Warning'
          : sendForm.type === 'BACK_IN_STOCK'
            ? 'Stock Restocked Notice'
            : sendForm.type === 'INVENTORY_ALERT'
              ? 'Vault Stock Verification Alert'
              : 'Warehouse Inventory Notice';
      } else if (sendForm.targetAudience === 'SALES') {
        targetRoles = ['sales', 'admin'];
        recipientName = 'Priya Sharma (Sales Manager)';
        recipientPhone = '+91 98765 33445';
        title = sendForm.type === 'PAYMENT_REMINDER'
          ? 'Payment Collection Follow-up Notice'
          : sendForm.type === 'COLLECTION'
            ? 'Route Collection Target Notice'
            : sendForm.type === 'ORDER_STATUS'
              ? 'Order Ready for Dispatch'
              : 'Sales Team Advisory';
      } else {
        // Customer
        targetRoles = ['user', 'admin', 'sales'];
        title = sendForm.type === 'OUT_OF_STOCK'
          ? 'Product Unavailable Alert'
          : sendForm.type === 'BACK_IN_STOCK'
            ? 'Product Back In Stock!'
            : sendForm.type === 'PAYMENT_REMINDER'
              ? 'Khata Payment Due Reminder'
              : sendForm.type === 'PAYMENT_CONFIRMATION'
                ? 'Payment Confirmation Receipt'
                : 'Customer Notice';
      }

      sendNotification({
        recipientName,
        recipientPhone,
        senderName: userName || (isAdmin ? 'ThreadLine Store (Admin)' : isSales ? 'Sales Manager' : isInventory ? 'Inventory Manager' : 'Store Staff'),
        customerId: sendForm.targetAudience === 'CUSTOMER' ? selectedCustomer?.id : null,
        title,
        message: sendForm.message,
        type: sendForm.type,
        channel: sendForm.channel,
        relatedProduct: sendForm.type.includes('STOCK') ? 'Garment Order' : 'Store Ledger',
        targetRoles
      });

      setShowSendModal(false);
      showToast(`✓ Notification sent to ${recipientName} (${targetRoles.join(', ')}) via ${sendForm.channel}!`);
    }
  };

  const handleResend = (notif) => {
    resendNotification(notif.id);
    showToast(`✓ Resent notification ${notif.id} to ${notif.recipientName}!`);
  };

  const handleDeleteNotification = (notif) => {
    setNotificationToDelete(notif);
  };

  const confirmDeleteNotification = () => {
    if (notificationToDelete) {
      deleteNotification(notificationToDelete.id);
      showToast(`Notification #${notificationToDelete.id} deleted successfully`);
      setNotificationToDelete(null);
    }
  };

  const confirmClearAll = () => {
    clearNotificationHistory();
    showToast('All notifications cleared successfully');
    setShowClearAllModal(false);
  };

  // --- Reminders Handlers ---
  const handleRunOverdueCheck = async () => {
    setIsCheckingNow(true);
    try {
      const res = await triggerAutomatedOverdueCheck();
      const count = res?.sentCount !== undefined ? res.sentCount : rawReminders.length;
      showToast(`✓ Automated scan completed! Processed ${count} overdue customer reminder(s).`);
    } catch (e) {
      showToast('✓ Automated overdue check complete.');
    } finally {
      setIsCheckingNow(false);
    }
  };

  const handleWhatsAppReminder = (r) => {
    const cust = customers.find(c => Number(c.id) === Number(r.customer_id));
    const phone = cust?.phone || r.phone || '+91 98765 00000';
    sendWhatsAppMessage({ phone, message: r.message });
    showToast(`✓ Opened WhatsApp reminder for ${cust?.name || r.customer_name || 'Customer'}`);
  };

  const confirmDeleteReminder = () => {
    if (reminderToDelete) {
      deletePaymentReminder(reminderToDelete.reminder_id);
      showToast(`Payment reminder #${reminderToDelete.reminder_id} deleted successfully`);
      setReminderToDelete(null);
    }
  };

  const confirmClearReminders = () => {
    clearAllPaymentReminders();
    showToast('✓ All automated payment reminders cleared successfully');
    setShowClearRemindersModal(false);
  };

  // --- Filter Raw Reminders based on role ---
  const rawReminders = React.useMemo(() => {
    if (isSupplier || isInventory) {
      return []; // Suppliers and Inventory staff do not manage retail customer credit reminders
    }
    if (isCustomerRole) {
      return (paymentReminders || []).filter(r =>
        Number(r.customer_id) === Number(customerId) ||
        (r.customer_name && customerName && r.customer_name.toLowerCase() === customerName.toLowerCase())
      );
    }
    return paymentReminders || [];
  }, [paymentReminders, isCustomerRole, isSupplier, isInventory, customerId, customerName]);

  // Filtered Reminders List
  const filteredReminders = React.useMemo(() => {
    const query = reminderSearchTerm.trim().toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);
    return rawReminders.filter(r => {
      const cust = customers.find(c => Number(c.id) === Number(r.customer_id));
      const custName = (cust?.name || r.customer_name || '').toLowerCase();
      const custPhone = (cust?.phone || r.phone || '').toLowerCase();
      const rId = (r.reminder_id || '').toLowerCase();
      const msg = (r.message || '').toLowerCase();

      const matchesSearch = !query || custName.includes(query) || custPhone.includes(query) || rId.includes(query) || msg.includes(query);
      if (!matchesSearch) return false;

      if (reminderTab === 'ALL') return true;
      if (reminderTab === 'TODAY') return r.sent_date === todayStr;
      if (reminderTab === 'SENT') return (r.status || '').toLowerCase() === 'sent';
      if (reminderTab === 'PENDING') return (r.status || '').toLowerCase() === 'pending';
      if (reminderTab === 'FAILED') return (r.status || '').toLowerCase() === 'failed';
      return true;
    });
  }, [rawReminders, reminderSearchTerm, reminderTab, customers]);

  // Reminders Pagination
  const {
    currentPage: reminderPage,
    setCurrentPage: setReminderPage,
    pageSize: reminderPageSize,
    setPageSize: setReminderPageSize,
    totalPages: reminderTotalPages,
    paginatedItems: paginatedReminders,
    totalItems: reminderTotalItems,
    startIndex: reminderStartIndex,
    endIndex: reminderEndIndex
  } = usePagination(filteredReminders, 10);

  // Reminders KPI Metrics
  const totalRemindersCount = rawReminders.length;
  const totalOverdueAmountCovered = rawReminders.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRemindersCount = rawReminders.filter(r => r.sent_date === todayStr).length;

  // Filter raw notifications strictly based on active user's role
  const rawNotifications = React.useMemo(() => {
    return (notifications || []).filter(n =>
      isNotificationRelevantToRole(n, roleKey, {
        customerId,
        customerName,
        userEmail,
        userName: customerName || userName
      })
    );
  }, [notifications, roleKey, customerId, customerName, userEmail, userName]);

  // Alerts KPI Calculations
  const totalCount = rawNotifications.length;
  const outOfStockCount = rawNotifications.filter(n => n.type === 'OUT_OF_STOCK').length;
  const backInStockCount = rawNotifications.filter(n => n.type === 'BACK_IN_STOCK').length;
  const reminderCount = rawNotifications.filter(n => n.type === 'PAYMENT_REMINDER' || n.type === 'DUE_DATE').length;
  const customerInquiriesCount = rawNotifications.filter(n => (n.type || '').includes('INQUIRY') || n.type === 'PAYMENT_QUERY' || n.type === 'ORDER_STATUS' || n.type === 'CUSTOM_REQ').length;

  const customerReceivedCount = isCustomerRole
    ? rawNotifications.filter(n => (n.recipientName || '').toLowerCase().includes((customerName || '').toLowerCase())).length
    : 0;

  const customerSentCount = isCustomerRole
    ? rawNotifications.filter(n => (n.senderName || '').toLowerCase().includes((customerName || '').toLowerCase())).length
    : 0;

  // Filtered Alerts List based on Search & Role-specific Tabs
  const filteredNotifications = React.useMemo(() => {
    return rawNotifications.filter(n => {
      const matchesSearch =
        (n.recipientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.senderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.recipientPhone || '').includes(searchTerm) ||
        (n.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.title || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (isCustomerRole) {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'RECEIVED') return (n.recipientName || '').toLowerCase().includes((customerName || '').toLowerCase());
        if (activeTab === 'SENT') return (n.senderName || '').toLowerCase().includes((customerName || '').toLowerCase());
        if (activeTab === 'REMINDERS') return n.type === 'PAYMENT_REMINDER' || n.type === 'DUE_DATE';
        return true;
      }

      if (isSupplier) {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PURCHASES') return (n.type || '').includes('PURCHASE') || (n.title || '').toLowerCase().includes('purchase');
        if (activeTab === 'DELIVERIES') return (n.type || '').includes('DELIVERY') || (n.message || '').toLowerCase().includes('deliver');
        if (activeTab === 'PAYMENTS') return (n.type || '').includes('PAYMENT') || (n.title || '').toLowerCase().includes('payment');
        return true;
      }

      if (isInventory) {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OUT_OF_STOCK') return n.type === 'OUT_OF_STOCK';
        if (activeTab === 'BACK_IN_STOCK') return n.type === 'BACK_IN_STOCK';
        if (activeTab === 'LOW_STOCK') return n.type === 'LOW_STOCK' || (n.title || '').toLowerCase().includes('low stock');
        if (activeTab === 'INWARD') return (n.type || '').includes('INWARD') || (n.type || '').includes('PURCHASE');
        if (activeTab === 'RETURNS') return (n.type || '').includes('RETURN') || (n.type || '').includes('DEFECT');
        return true;
      }

      if (isSales) {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'INQUIRIES') return (n.type || '').includes('INQUIRY') || n.type === 'PAYMENT_QUERY' || n.type === 'ORDER_STATUS' || n.type === 'CUSTOM_REQ';
        if (activeTab === 'REMINDERS') return n.type === 'PAYMENT_REMINDER' || n.type === 'DUE_DATE';
        if (activeTab === 'CONFIRMATIONS') return n.type === 'PAYMENT_CONFIRMATION' || (n.type || '').includes('COLLECTION');
        if (activeTab === 'ORDERS') return (n.type || '').includes('SALE') || (n.type || '').includes('REQUIREMENT');
        return true;
      }

      // Admin
      if (activeTab === 'ALL') return true;
      if (activeTab === 'OUT_OF_STOCK') return n.type === 'OUT_OF_STOCK';
      if (activeTab === 'BACK_IN_STOCK') return n.type === 'BACK_IN_STOCK';
      if (activeTab === 'REMINDERS') return n.type === 'PAYMENT_REMINDER' || n.type === 'DUE_DATE';
      if (activeTab === 'CONFIRMATIONS') return n.type === 'PAYMENT_CONFIRMATION';
      if (activeTab === 'INQUIRIES') return (n.type || '').includes('INQUIRY') || n.type === 'PAYMENT_QUERY' || n.type === 'ORDER_STATUS' || n.type === 'CUSTOM_REQ';
      if (activeTab === 'SUPPLIERS') return (n.type || '').includes('PURCHASE') || (n.type || '').includes('SUPPLIER');
      return true;
    });
  }, [rawNotifications, searchTerm, activeTab, isCustomerRole, isSupplier, isInventory, isSales, customerName]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedNotifications,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(filteredNotifications, 10);

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      {/* Primary View Switcher Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '22px', borderBottom: '1px solid var(--border-gold-subtle)', paddingBottom: '14px', flexWrap: 'wrap' }}>
        {(isAdmin || isSales || isCustomerRole) && (
          <button
            id="btn-tab-reminders"
            onClick={() => setMainView('REMINDERS')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: mainView === 'REMINDERS' ? '1px solid var(--accent-gold)' : '1px solid var(--border-gold-subtle)',
              background: mainView === 'REMINDERS' ? 'var(--accent-maroon)' : 'var(--bg-main)',
              color: mainView === 'REMINDERS' ? '#FFFFFF' : 'var(--text-dark)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: mainView === 'REMINDERS' ? '0 4px 12px rgba(107,30,43,0.22)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span>⏰</span> {isCustomerRole ? t('myOverdueReminders', 'My Payment Reminders') : t('automatedOverdueReminders', 'Automated Overdue Reminders')} ({rawReminders.length})
          </button>
        )}

        <button
          id="btn-tab-alerts"
          onClick={() => setMainView('ALERTS')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: mainView === 'ALERTS' ? '1px solid var(--accent-gold)' : '1px solid var(--border-gold-subtle)',
            background: mainView === 'ALERTS' ? 'var(--accent-maroon)' : 'var(--bg-main)',
            color: mainView === 'ALERTS' ? '#FFFFFF' : 'var(--text-dark)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: mainView === 'ALERTS' ? '0 4px 12px rgba(107,30,43,0.22)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <span>🔔</span> {isCustomerRole ? 'My Account Alerts & Inquiries' : isSupplier ? 'Mill & Supplier Alerts' : isInventory ? 'Stock & Inventory Alerts' : isSales ? 'Sales & Credit Alerts' : t('generalStoreAlerts', 'General Store Alerts & Inquiries')} ({rawNotifications.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: AUTOMATED OVERDUE PAYMENT REMINDERS                                */}
      {/* ========================================================================= */}
      {mainView === 'REMINDERS' && (
        <div>
          <div className="card-title" style={{ fontSize: '24px', marginBottom: '20px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              {isCustomerRole ? t('myOverdueRemindersTitle', 'My Overdue Payment Reminders') : t('automatedOverdueRemindersTitle', 'Automated Overdue Payment Reminders & Delivery Log')}
              <div style={{ fontSize: '13px', color: 'var(--text-gray)', fontWeight: 400, marginTop: '4px' }}>
                Daily automatic scanning of customer due dates with instant WhatsApp & SMS reminder logging
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isCustomerRole && (
                <>
                  <button
                    id="btn-run-check-now"
                    onClick={handleRunOverdueCheck}
                    disabled={isCheckingNow}
                    style={{
                      padding: '10px 18px',
                      background: 'var(--accent-maroon)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '8px',
                      cursor: isCheckingNow ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(107,30,43,0.2)'
                    }}
                  >
                    <span>⚡</span> {isCheckingNow ? 'Running Scan...' : t('runOverdueCheckNow', 'Run Overdue Check Now')}
                  </button>

                  <button
                    id="btn-clear-all-reminders"
                    onClick={() => setShowClearRemindersModal(true)}
                    disabled={filteredReminders.length === 0}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--icon-red-bg)',
                      border: '1px solid rgba(168, 50, 50, 0.3)',
                      borderRadius: '8px',
                      cursor: filteredReminders.length === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent-danger)',
                      opacity: filteredReminders.length === 0 ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🗑️</span> {t('clearAll', 'Clear All')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Reminders KPI Cards Grid */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
            <div className="kpi-card" style={{ padding: '20px' }}>
              <div className="kpi-top">
                <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>⏰</div>
                <div className="kpi-info">
                  <h4>{t('totalRemindersLogged', 'Total Reminders Logged')}</h4>
                  <div className="value" style={{ fontSize: '24px' }}>{totalRemindersCount} Logs</div>
                </div>
              </div>
            </div>

            <div className="kpi-card" style={{ padding: '20px' }}>
              <div className="kpi-top">
                <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>₹</div>
                <div className="kpi-info">
                  <h4>{t('totalOverdueCovered', 'Overdue Amount Covered')}</h4>
                  <div className="value" style={{ fontSize: '24px', color: 'var(--accent-danger)' }}>
                    ₹{totalOverdueAmountCovered.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="kpi-card" style={{ padding: '20px' }}>
              <div className="kpi-top">
                <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>📅</div>
                <div className="kpi-info">
                  <h4>{t('dailyScanSchedule', 'Daily Scan Schedule')}</h4>
                  <div className="value" style={{ fontSize: '20px', color: 'var(--text-dark)' }}>
                    {reminderSettings?.reminderTime ? `${reminderSettings.reminderTime} Daily` : '09:00 AM Daily'}
                  </div>
                </div>
              </div>
            </div>

            <div className="kpi-card" style={{ padding: '20px' }}>
              <div className="kpi-top">
                <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>⚙️</div>
                <div className="kpi-info">
                  <h4>{t('schedulerStatus', 'Scheduler Status')}</h4>
                  <div className="value" style={{ fontSize: '20px', color: reminderSettings?.isEnabled !== false ? 'var(--status-paid)' : 'var(--text-gray)' }}>
                    {reminderSettings?.isEnabled !== false ? '● Active' : '○ Paused'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reminders Filter Tabs & Search */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {[
                  { id: 'ALL', label: `All Reminders (${rawReminders.length})` },
                  { id: 'TODAY', label: `📅 Sent Today (${todayRemindersCount})` },
                  { id: 'SENT', label: '✓ Delivered / Sent' },
                  { id: 'PENDING', label: '⏳ Pending' },
                  { id: 'FAILED', label: '⚠️ Failed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setReminderTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-light)',
                      background: reminderTab === tab.id ? 'var(--terracotta)' : 'var(--bg-main)',
                      color: reminderTab === tab.id ? 'white' : 'var(--text-dark)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search customer, phone, ID, or text..."
                value={reminderSearchTerm}
                onChange={(e) => setReminderSearchTerm(e.target.value)}
                style={{
                  border: '1px solid var(--border-gold-subtle)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  outline: 'none',
                  fontSize: '12px',
                  minWidth: '260px',
                  background: 'var(--bg-main)',
                  color: 'var(--text-dark)'
                }}
              />
            </div>
          </div>

          {/* Overdue Payment Reminders Table */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isCustomerRole ? 'My Payment Reminder History' : 'Automated Payment Reminders Table'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-gray)', fontWeight: 400 }}>
                Rule: Skips fully paid balances & prevents same-day duplicates
              </span>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                    <th style={{ padding: '12px 14px' }}>Reminder ID</th>
                    <th style={{ padding: '12px 14px' }}>Customer Name</th>
                    <th style={{ padding: '12px 14px' }}>Phone Number</th>
                    <th style={{ padding: '12px 14px' }}>Pending Amount</th>
                    <th style={{ padding: '12px 14px' }}>Due Date</th>
                    <th style={{ padding: '12px 14px' }}>Days Overdue</th>
                    <th style={{ padding: '12px 14px' }}>Generated Reminder Message</th>
                    <th style={{ padding: '12px 14px' }}>Sent Date & Time</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReminders.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-gray)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-dark)' }}>No payment reminders logged</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Reminders are generated automatically when customer credit due dates pass, or click "Run Overdue Check Now" above.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedReminders.map(r => {
                      const cust = customers.find(c => Number(c.id) === Number(r.customer_id));
                      const custName = cust?.name || r.customer_name || 'Customer';
                      const custPhone = cust?.phone || r.phone || '+91 98765 00000';
                      const custShop = cust?.shopName || cust?.areaName || '';

                      const daysOverdue = r.days_overdue !== undefined
                        ? r.days_overdue
                        : (r.due_date ? Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(r.due_date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : 0);

                      const statusBg = r.status === 'Sent' ? '#E8F5E9' : r.status === 'Failed' ? '#FFEBEE' : '#FFF8E1';
                      const statusColor = r.status === 'Sent' ? '#2E7D32' : r.status === 'Failed' ? '#C62828' : '#F57F17';

                      return (
                        <tr key={r.reminder_id || r.id} style={{ borderBottom: '1px solid var(--border-gold-subtle)' }}>
                          <td style={{ padding: '12px 14px', color: 'var(--terracotta)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {r.reminder_id}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{custName}</div>
                            {custShop && <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{custShop}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                            {custPhone}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-danger)', whiteSpace: 'nowrap' }}>
                            ₹{Number(r.pending_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                            {r.due_date}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#FFEBEE',
                              color: '#C62828'
                            }}>
                              {daysOverdue} days
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '11.5px', color: 'var(--text-dark)', maxWidth: '340px' }}>
                            <div style={{ fontStyle: 'italic', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '6px', padding: '6px 10px' }}>
                              "{r.message}"
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '11.5px', color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
                            <div>{r.sent_date}</div>
                            <div style={{ fontSize: '10.5px' }}>{r.sent_time}</div>
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusColor}33`
                            }}>
                              ● {r.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleWhatsAppReminder(r)}
                                title="Send reminder via WhatsApp"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #25D366',
                                  background: '#E8F5E9',
                                  color: '#1B5E20',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                💬 WhatsApp
                              </button>

                              {!isCustomerRole && (
                                <button
                                  onClick={() => setReminderToDelete(r)}
                                  title="Delete reminder record"
                                  style={{
                                    color: 'var(--icon-red)',
                                    background: 'var(--icon-red-bg)',
                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Reminders Pagination */}
            <Pagination
              currentPage={reminderPage}
              totalPages={reminderTotalPages}
              totalItems={reminderTotalItems}
              pageSize={reminderPageSize}
              startIndex={reminderStartIndex}
              endIndex={reminderEndIndex}
              onPageChange={setReminderPage}
              onPageSizeChange={setReminderPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: GENERAL STORE ALERTS & INQUIRIES FEED                             */}
      {/* ========================================================================= */}
      {mainView === 'ALERTS' && (
        <div>
          <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {isCustomerRole
              ? t('myNotificationsTitle', 'My Notifications & Store Communication Log')
              : isSupplier
                ? 'Mill & Supplier Communication Log'
                : isInventory
                  ? 'Stock & Warehouse Communication Log'
                  : isSales
                    ? 'Sales & Credit Communication Log'
                    : t('customerNotificationsTitle', 'Customer Notifications & Communication Log')}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={markAllNotificationsAsRead}
                disabled={notifications.length === 0}
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-gold-subtle)',
                  borderRadius: '8px',
                  cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-dark)',
                  opacity: notifications.length === 0 ? 0.6 : 1
                }}
              >
                ✓ {t('markAllRead', 'Mark All Read')}
              </button>
              <button
                id="btn-clear-all-alerts"
                onClick={() => setShowClearAllModal(true)}
                disabled={filteredNotifications.length === 0}
                style={{
                  padding: '10px 16px',
                  background: 'var(--icon-red-bg)',
                  border: '1px solid rgba(168, 50, 50, 0.3)',
                  borderRadius: '8px',
                  cursor: filteredNotifications.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--accent-danger)',
                  opacity: filteredNotifications.length === 0 ? 0.6 : 1
                }}
              >
                🗑️ {t('clearAll', 'Clear All')}
              </button>
              <button onClick={handleOpenSendModal} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
                <i>{isCustomerRole ? '💬' : isSupplier ? '🚚' : isInventory ? '📦' : isSales ? '💼' : '📲'}</i>{' '}
                {isCustomerRole
                  ? t('sendSellerInquiry', 'Send Inquiry / Notification to Seller')
                  : isSupplier
                    ? 'Send Mill Notice / Advisory'
                    : isInventory
                      ? 'Send Stock / Inventory Alert'
                      : isSales
                        ? 'Send Customer / Credit Alert'
                        : t('sendCustomerAlert', 'Send Role-Targeted Notification')}
              </button>
            </div>
          </div>

          {/* Role-Adaptive KPI Stats Grid */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
            {isCustomerRole ? (
              <>
                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🔔</div>
                    <div className="kpi-info">
                      <h4>{t('totalMessages', 'Total Messages')}</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{totalCount} Msgs</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>📥</div>
                    <div className="kpi-info">
                      <h4>{t('storeAlertsReceived', 'Store Alerts Received')}</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{customerReceivedCount} Alerts</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>💬</div>
                    <div className="kpi-info">
                      <h4>{t('myInquiriesSent', 'My Inquiries Sent')}</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{customerSentCount} Sent</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>📒</div>
                    <div className="kpi-info">
                      <h4>{t('paymentReminders', 'Payment Reminders')}</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{reminderCount} Reminders</div>
                    </div>
                  </div>
                </div>
              </>
            ) : isSupplier ? (
              <>
                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🚚</div>
                    <div className="kpi-info">
                      <h4>Total Supplier Alerts</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{totalCount} Alerts</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>📦</div>
                    <div className="kpi-info">
                      <h4>Purchase Orders</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{rawNotifications.filter(n => (n.type || '').includes('PURCHASE') || (n.title || '').toLowerCase().includes('purchase')).length} Orders</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>✅</div>
                    <div className="kpi-info">
                      <h4>Deliveries & Dispatch</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{rawNotifications.filter(n => (n.type || '').includes('DELIVERY') || (n.message || '').toLowerCase().includes('deliver')).length} Logs</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>💰</div>
                    <div className="kpi-info">
                      <h4>Settlement Notices</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{rawNotifications.filter(n => (n.type || '').includes('PAYMENT') || (n.title || '').toLowerCase().includes('payment')).length} Notices</div>
                    </div>
                  </div>
                </div>
              </>
            ) : isInventory ? (
              <>
                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>📦</div>
                    <div className="kpi-info">
                      <h4>Total Stock Notices</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{totalCount} Notices</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>🛑</div>
                    <div className="kpi-info">
                      <h4>Out of Stock Alerts</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{outOfStockCount} Alerts</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>🟢</div>
                    <div className="kpi-info">
                      <h4>Restocked Vault Items</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{backInStockCount} Restocked</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>📥</div>
                    <div className="kpi-info">
                      <h4>Inwards & Returns</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{rawNotifications.filter(n => (n.type || '').includes('INWARD') || (n.type || '').includes('PURCHASE') || (n.type || '').includes('RETURN')).length} Logs</div>
                    </div>
                  </div>
                </div>
              </>
            ) : isSales ? (
              <>
                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>💼</div>
                    <div className="kpi-info">
                      <h4>Total Sales Notices</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{totalCount} Notices</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>💬</div>
                    <div className="kpi-info">
                      <h4>Customer Inquiries</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{customerInquiriesCount} Inquiries</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--icon-orange)' }}>⏰</div>
                    <div className="kpi-info">
                      <h4>Payment Reminders</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{reminderCount} Reminders</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>💳</div>
                    <div className="kpi-info">
                      <h4>Payment Confirmations</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{rawNotifications.filter(n => n.type === 'PAYMENT_CONFIRMATION' || (n.type || '').includes('COLLECTION')).length} Receipts</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Admin Master KPI
              <>
                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-blue-bg)', color: 'var(--icon-blue)' }}>🔔</div>
                    <div className="kpi-info">
                      <h4>{t('totalMessages', 'Total Sent')}</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{totalCount} Msgs</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-red-bg)', color: 'var(--icon-red)' }}>🛑</div>
                    <div className="kpi-info">
                      <h4>Out of Stock Alerts</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{outOfStockCount} Alerts</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-green-bg)', color: 'var(--icon-green)' }}>📦</div>
                    <div className="kpi-info">
                      <h4>Back in Stock Alerts</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{backInStockCount} Restocked</div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card" style={{ padding: '20px' }}>
                  <div className="kpi-top">
                    <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple)' }}>💬</div>
                    <div className="kpi-info">
                      <h4>Customer Inquiries</h4>
                      <div className="value" style={{ fontSize: '24px' }}>{customerInquiriesCount} Inquiries</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filter Tabs & Search */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {(() => {
                  let roleTabs = [
                    { id: 'ALL', label: 'All Notifications' },
                    { id: 'OUT_OF_STOCK', label: '🛑 Out of Stock' },
                    { id: 'BACK_IN_STOCK', label: '🟢 Back in Stock' },
                    { id: 'REMINDERS', label: '📒 Payment Reminders' },
                    { id: 'CONFIRMATIONS', label: '💳 Payment Receipts' },
                    { id: 'INQUIRIES', label: '📩 Customer Inquiries' },
                    { id: 'SUPPLIERS', label: '🚚 Supplier Orders' }
                  ];

                  if (isCustomerRole) {
                    roleTabs = [
                      { id: 'ALL', label: 'All Messages' },
                      { id: 'RECEIVED', label: '📥 Received Store Alerts' },
                      { id: 'SENT', label: '📩 My Inquiries Sent' },
                      { id: 'REMINDERS', label: '📒 Payment Reminders' }
                    ];
                  } else if (isSupplier) {
                    roleTabs = [
                      { id: 'ALL', label: 'All Mill Alerts' },
                      { id: 'PURCHASES', label: '📦 Purchase Orders' },
                      { id: 'DELIVERIES', label: '🚚 Deliveries & Dispatch' },
                      { id: 'PAYMENTS', label: '💰 Settlements' }
                    ];
                  } else if (isInventory) {
                    roleTabs = [
                      { id: 'ALL', label: 'All Stock Alerts' },
                      { id: 'OUT_OF_STOCK', label: '🛑 Out of Stock' },
                      { id: 'BACK_IN_STOCK', label: '🟢 Back in Stock' },
                      { id: 'LOW_STOCK', label: '⚠️ Low Stock Warnings' },
                      { id: 'INWARD', label: '📥 Goods Inward' },
                      { id: 'RETURNS', label: '↩️ Defect Returns' }
                    ];
                  } else if (isSales) {
                    roleTabs = [
                      { id: 'ALL', label: 'All Sales Notices' },
                      { id: 'INQUIRIES', label: '📩 Customer Inquiries' },
                      { id: 'REMINDERS', label: '📒 Overdue Reminders' },
                      { id: 'CONFIRMATIONS', label: '💳 Payment Receipts' },
                      { id: 'ORDERS', label: '🛍️ Orders & Requirements' }
                    ];
                  }

                  return roleTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-light)',
                        background: activeTab === tab.id ? 'var(--terracotta)' : 'var(--bg-main)',
                        color: activeTab === tab.id ? 'white' : 'var(--text-dark)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label}
                    </button>
                  ));
                })()}
              </div>

              <input
                type="text"
                placeholder="Search message, sender, or text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', padding: '8px 14px', outline: 'none', fontSize: '12px', minWidth: '240px', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>

          {/* Notifications Table Log */}
          <div className="card">
            <div className="card-title">{isCustomerRole ? 'Communication Feed & Message History' : 'Customer Delivery Status & Message Feed'}</div>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                    <th style={{ padding: '12px 14px' }}>ID</th>
                    <th style={{ padding: '12px 14px' }}>From / Sender</th>
                    <th style={{ padding: '12px 14px' }}>To / Recipient</th>
                    <th style={{ padding: '12px 14px' }}>Type</th>
                    <th style={{ padding: '12px 14px' }}>Channel</th>
                    <th style={{ padding: '12px 14px' }}>Message Preview</th>
                    <th style={{ padding: '12px 14px' }}>Timestamp</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-gray)' }}>
                        No notifications found.
                      </td>
                    </tr>
                  ) : (
                    paginatedNotifications.map(notif => {
                      const isSentByMe = isCustomerRole && (notif.senderName || '').toLowerCase().includes((customerName || '').toLowerCase());
                      return (
                        <tr key={notif.id} style={{ background: notif.unread ? 'var(--terracotta-light)' : 'transparent', borderBottom: '1px solid var(--border-gold-subtle)' }}>
                          <td style={{ padding: '12px 14px', color: 'var(--terracotta)', fontWeight: 600 }}>{notif.id}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                              {notif.senderName || (isCustomerRole ? (isSentByMe ? customerName : 'ThreadLine Store (Admin)') : 'Store Admin')}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{notif.recipientName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{notif.recipientPhone}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background:
                                  notif.type === 'OUT_OF_STOCK'
                                    ? 'var(--icon-red-bg)'
                                    : notif.type === 'BACK_IN_STOCK'
                                      ? 'var(--icon-green-bg)'
                                      : notif.type === 'PAYMENT_REMINDER'
                                        ? 'var(--icon-orange-bg)'
                                        : notif.type.includes('INQUIRY') || notif.type === 'STOCK_INQUIRY' || notif.type === 'PAYMENT_QUERY'
                                          ? 'var(--icon-blue-bg)'
                                          : 'var(--icon-purple-bg)',
                                color:
                                  notif.type === 'OUT_OF_STOCK'
                                    ? 'var(--icon-red)'
                                    : notif.type === 'BACK_IN_STOCK'
                                      ? 'var(--icon-green)'
                                      : notif.type === 'PAYMENT_REMINDER'
                                        ? 'var(--icon-orange)'
                                        : notif.type.includes('INQUIRY') || notif.type === 'STOCK_INQUIRY' || notif.type === 'PAYMENT_QUERY'
                                          ? 'var(--icon-blue)'
                                          : 'var(--icon-purple)'
                              }}
                            >
                              {notif.title}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
                              📲 {notif.channel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-dark)', maxWidth: '300px' }}>
                            {notif.message}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-gray)' }}>{notif.timestamp}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              className="status-pill"
                              style={{
                                background: notif.status === 'Delivered' ? 'var(--icon-green-bg)' : 'var(--icon-blue-bg)',
                                color: notif.status === 'Delivered' ? 'var(--icon-green)' : 'var(--icon-blue)'
                              }}
                            >
                              ✓ {notif.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {!isCustomerRole && (
                                <button
                                  onClick={() => handleResend(notif)}
                                  style={{ color: 'var(--icon-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                  title="Resend notification"
                                >
                                  🔄 Resend
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteNotification(notif)}
                                style={{
                                  color: 'var(--icon-red)',
                                  background: 'var(--icon-red-bg)',
                                  border: '1px solid rgba(220, 38, 38, 0.2)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Delete notification"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

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
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* Notification Send Modal */}
      {showSendModal && (
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
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>
                {isCustomerRole
                  ? 'Send Inquiry to Store Admin / Sales'
                  : isSupplier
                    ? 'Send Mill Advisory to Store Admin & Inventory'
                    : isInventory
                      ? 'Broadcast Warehouse & Stock Advisory'
                      : isSales
                        ? 'Send Customer / Route Sales Notice'
                        : 'Send Role-Targeted Notification'}
              </div>
              <button onClick={() => setShowSendModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isCustomerRole ? (
                <>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Store / Admin</label>
                    <input
                      type="text"
                      disabled
                      value={storeSettings?.storeName ? `${storeSettings.storeName} Admin (Jeya)` : 'ThreadLine Store Admin (Jeya)'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Sender Customer</label>
                    <input
                      type="text"
                      disabled
                      value={`${customerName || 'Customer'} (${userEmail || 'Customer Login'})`}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                    />
                  </div>
                </>
              ) : isSupplier ? (
                <>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Store Staff</label>
                    <input
                      type="text"
                      disabled
                      value="ThreadLine Store (Admin & Inventory Managers)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Sender (Mill Supplier)</label>
                    <input
                      type="text"
                      disabled
                      value="Senthil Kumar — Sri Lakshmi Mills (+91 98422 12345)"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Target Audience / Recipient Group</label>
                    <select
                      value={sendForm.targetAudience}
                      onChange={(e) => {
                        const aud = e.target.value;
                        let defaultType = 'OUT_OF_STOCK';
                        if (aud === 'SUPPLIER') defaultType = 'PURCHASE_ORDER';
                        else if (aud === 'INVENTORY') defaultType = 'LOW_STOCK';
                        else if (aud === 'SALES') defaultType = 'PAYMENT_REMINDER';
                        const msg = getRoleTargetTemplateText(aud, defaultType, selectedCustomer?.name);
                        setSendForm({
                          ...sendForm,
                          targetAudience: aud,
                          type: defaultType,
                          message: msg
                        });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="CUSTOMER">Retail Customers (Buyer Directory)</option>
                      <option value="SUPPLIER">Mill Suppliers (Sri Lakshmi Mills)</option>
                      <option value="INVENTORY">Warehouse & Godown Staff (Rajesh Verma)</option>
                      <option value="SALES">Sales & Route Team (Priya Sharma)</option>
                    </select>
                  </div>

                  {sendForm.targetAudience === 'CUSTOMER' && (
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Customer</label>
                      <select
                        value={sendForm.customerId}
                        onChange={(e) => {
                          const cId = e.target.value;
                          const cust = customers.find(c => c.id === Number(cId));
                          const autoText = getSellerTemplateText(sendForm.type, cust?.name);
                          setSendForm({ ...sendForm, customerId: cId, message: autoText });
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                      >
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {sendForm.targetAudience === 'SUPPLIER' && (
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Mill Supplier</label>
                      <input
                        type="text"
                        disabled
                        value="Senthil Kumar — Sri Lakshmi Mills (+91 98422 12345)"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                      />
                    </div>
                  )}

                  {sendForm.targetAudience === 'INVENTORY' && (
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Warehouse Staff</label>
                      <input
                        type="text"
                        disabled
                        value="Rajesh Verma — Inventory Manager (+91 98765 11223)"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                      />
                    </div>
                  )}

                  {sendForm.targetAudience === 'SALES' && (
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Recipient Sales Staff</label>
                      <input
                        type="text"
                        disabled
                        value="Priya Sharma — Sales Manager (+91 98765 33445)"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>
                    {isCustomerRole ? 'Inquiry Subject / Type' : isSupplier ? 'Mill Advisory Type' : 'Notification Category'}
                  </label>
                  {isCustomerRole ? (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getCustomerTemplateText(newType);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="STOCK_INQUIRY">Stock Availability Inquiry</option>
                      <option value="PAYMENT_QUERY">Payment & Khata Query</option>
                      <option value="ORDER_STATUS">Order Status Inquiry</option>
                      <option value="CUSTOM_REQ">Custom Requirement Request</option>
                      <option value="GENERAL_INQUIRY">General Inquiry</option>
                    </select>
                  ) : isSupplier ? (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getRoleTargetTemplateText('SUPPLIER', newType);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="SUPPLIER_DELIVERY">Mill Delivery & Dispatch Advisory</option>
                      <option value="PURCHASE_ORDER">Purchase Order Confirmation</option>
                      <option value="SUPPLIER_PAYMENT">Mill Payment & Settlement Query</option>
                      <option value="GENERAL_SUPPLIER">General Mill Production Inquiry</option>
                    </select>
                  ) : sendForm.targetAudience === 'SUPPLIER' ? (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getRoleTargetTemplateText('SUPPLIER', newType);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="PURCHASE_ORDER">Purchase Order Update</option>
                      <option value="SUPPLIER_DELIVERY">Consignment Delivery Advisory</option>
                      <option value="SUPPLIER_PAYMENT">Mill Settlement Payment Advice</option>
                      <option value="GENERAL_SUPPLIER">Material Inquiry Notice</option>
                    </select>
                  ) : sendForm.targetAudience === 'INVENTORY' ? (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getRoleTargetTemplateText('INVENTORY', newType);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="LOW_STOCK">Low Stock Warning</option>
                      <option value="BACK_IN_STOCK">Stock Restocked Notice</option>
                      <option value="INVENTORY_ALERT">Vault Stock Verification Alert</option>
                      <option value="RETURNS">Defect Returns Notice</option>
                    </select>
                  ) : sendForm.targetAudience === 'SALES' ? (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getRoleTargetTemplateText('SALES', newType);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="PAYMENT_REMINDER">Priority Overdue Follow-up Notice</option>
                      <option value="COLLECTION">Route Collection Target Notice</option>
                      <option value="ORDER_STATUS">Order Ready for Dispatch</option>
                    </select>
                  ) : (
                    <select
                      value={sendForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const autoText = getSellerTemplateText(newType, selectedCustomer?.name);
                        setSendForm({ ...sendForm, type: newType, message: autoText });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                    >
                      <option value="OUT_OF_STOCK">Out of Stock Alert</option>
                      <option value="BACK_IN_STOCK">Back in Stock Alert</option>
                      <option value="PAYMENT_REMINDER">Payment Due Reminder</option>
                      <option value="PAYMENT_CONFIRMATION">Payment Receipt Confirmation</option>
                      <option value="DUE_DATE">Installment Route Alert</option>
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Delivery Channel</label>
                  <select
                    value={sendForm.channel}
                    onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
                  >
                    {isCustomerRole ? (
                      <>
                        <option value="In-App & WhatsApp">In-App & WhatsApp</option>
                        <option value="In-App Message">In-App Message</option>
                        <option value="WhatsApp Only">WhatsApp Only</option>
                      </>
                    ) : (
                      <>
                        <option value="SMS & WhatsApp">SMS & WhatsApp</option>
                        <option value="WhatsApp Only">WhatsApp Only</option>
                        <option value="SMS Only">SMS Only</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-gray)', display: 'block', marginBottom: '4px' }}>Message Body</label>
                <textarea
                  rows="4"
                  required
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                  {isCustomerRole
                    ? 'Send Inquiry to Store'
                    : isSupplier
                      ? 'Send Mill Advisory'
                      : isInventory
                        ? 'Broadcast Stock Alert'
                        : isSales
                          ? 'Dispatch Sales Notice'
                          : 'Send Role-Targeted Notification'}
                </button>
                <button type="button" onClick={() => setShowSendModal(false)} style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-gold-subtle)', borderRadius: '8px', color: 'var(--text-dark)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Reminder Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(reminderToDelete)}
        title="Delete Payment Reminder"
        message={`Are you sure you want to delete payment reminder #${reminderToDelete?.reminder_id}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteReminder}
        onCancel={() => setReminderToDelete(null)}
        isDanger={true}
      />

      {/* Clear All Payment Reminders Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearRemindersModal}
        title="Clear All Payment Reminders"
        message="Are you sure you want to clear all automated overdue payment reminder logs? This action cannot be undone."
        confirmText="Clear All Reminders"
        cancelText="Cancel"
        onConfirm={confirmClearReminders}
        onCancel={() => setShowClearRemindersModal(false)}
        isDanger={true}
      />

      {/* Delete Single Notification Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(notificationToDelete)}
        title="Delete Notification"
        message={`Are you sure you want to delete notification #${notificationToDelete?.id} "${notificationToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteNotification}
        onCancel={() => setNotificationToDelete(null)}
        isDanger={true}
      />

      {/* Clear All Notifications Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="Clear All Notifications"
        message="Are you sure you want to delete all general store alerts and messages? This will clear the entire communication history and cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearAllModal(false)}
        isDanger={true}
      />
    </div>
  );
}
