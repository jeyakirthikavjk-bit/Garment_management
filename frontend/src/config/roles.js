// frontend/src/config/roles.js
// Centralized Role-Based Access Control (RBAC) & System User Directory for the 5 Roles:
// 1. Admin
// 2. Supplier
// 3. Inventory Manager
// 4. Sales Manager
// 5. User

export const SYSTEM_ROLES = {
  admin: {
    key: 'admin',
    role: 'Admin',
    name: 'Jeya (Admin)',
    email: 'admin@threadline.com',
    password: 'adminpassword123',
    passwords: ['adminpassword123', 'admin123'],
    badge: 'Store Owner & Admin',
    badgeColor: '#C9A24B',
    icon: '👑',
    category: 'Full Access',
    description: 'Unrestricted master access to all existing pages, features, CRUD operations, financials, settings and reports.',
    permissions: ['*'],
    allowedRoutes: [
      '/',
      '/dashboard',
      '/customers',
      '/customers/add',
      '/customers/:id',
      '/areas',
      '/area-schedule',
      '/area-visit',
      '/products',
      '/inventory',
      '/inventory/add',
      '/suppliers',
      '/suppliers/:id',
      '/sales',
      '/sales/add',
      '/credit',
      '/payments',
      '/collections',
      '/expenses',
      '/purchases',
      '/returns',
      '/requirements',
      '/festival-calendar',
      '/ai-prediction',
      '/analytics',
      '/reports',
      '/feedback',
      '/notifications',
      '/settings'
    ]
  },

  supplier: {
    key: 'supplier',
    role: 'Supplier',
    name: 'Senthil Kumar (Sri Lakshmi Mills)',
    email: 'supplier@threadline.com',
    alternateEmails: ['mill.supplier@threadline.com'],
    password: 'supplierpassword123',
    passwords: ['supplierpassword123', 'supplier123'],
    badge: 'Vendor & Mill Supplier',
    badgeColor: '#F59E0B',
    icon: '🚚',
    category: 'Supplier Partner',
    description: 'Supplier portal to view purchase orders, supplied products, order fulfillment status, and company profile.',
    permissions: [
      'dashboard:view',
      'suppliers:read',
      'suppliers:profile',
      'purchases:read',
      'purchases:orders',
      'products:read',
      'notifications:view',
      'settings:view'
    ],
    allowedRoutes: [
      '/',
      '/dashboard',
      '/suppliers',
      '/suppliers/:id',
      '/purchases',
      '/products',
      '/notifications',
      '/settings'
    ]
  },

  inventory: {
    key: 'inventory',
    role: 'Inventory Manager',
    name: 'Rajesh Verma',
    email: 'inventory@threadline.com',
    password: 'inventorypassword123',
    passwords: ['inventorypassword123', 'inventory123'],
    badge: 'Stock & Warehouse',
    badgeColor: '#10B981',
    icon: '📦',
    category: 'Logistics',
    description: 'Oversees product catalog, stock inventory, inward receiving, low stock alerts, supplier orders, and returns.',
    permissions: [
      'dashboard:view',
      'inventory:manage',
      'inventory:read',
      'products:manage',
      'products:read',
      'suppliers:manage',
      'suppliers:read',
      'purchases:manage',
      'returns:manage',
      'stock:inward',
      'notifications:view',
      'settings:view'
    ],
    allowedRoutes: [
      '/',
      '/dashboard',
      '/products',
      '/inventory',
      '/inventory/add',
      '/suppliers',
      '/suppliers/:id',
      '/purchases',
      '/returns',
      '/notifications',
      '/settings'
    ]
  },

  sales: {
    key: 'sales',
    role: 'Sales Manager',
    name: 'Priya Sharma',
    email: 'sales@threadline.com',
    password: 'salespassword123',
    passwords: ['salespassword123', 'sales123'],
    badge: 'Sales & Distribution',
    badgeColor: '#3B82F6',
    icon: '💼',
    category: 'Commercial',
    description: 'Manages sales orders, customer directory, invoices, credit ledger, territory routes, bespoke requirements, and sales reports.',
    permissions: [
      'dashboard:view',
      'sales:manage',
      'sales:read',
      'customers:manage',
      'customers:read',
      'products:read',
      'credit:manage',
      'payments:manage',
      'collections:manage',
      'requirements:manage',
      'areas:read',
      'areas:visit',
      'festival:manage',
      'feedback:read',
      'reports:sales',
      'notifications:view',
      'settings:view'
    ],
    allowedRoutes: [
      '/',
      '/dashboard',
      '/customers',
      '/customers/add',
      '/customers/:id',
      '/sales',
      '/sales/add',
      '/products',
      '/credit',
      '/payments',
      '/collections',
      '/requirements',
      '/areas',
      '/area-schedule',
      '/area-visit',
      '/festival-calendar',
      '/reports',
      '/feedback',
      '/notifications',
      '/settings'
    ]
  },

  user: {
    key: 'user',
    role: 'User',
    name: 'Ravi Kumar',
    email: 'user@threadline.com',
    alternateEmails: ['ravi.k@gmail.com', 'customer@threadline.com', 'ravi.textiles@gmail.com'],
    password: 'userpassword123',
    passwords: ['userpassword123', 'user123', 'customerpassword123', 'customer123', '1234'],
    badge: 'Customer Portal',
    badgeColor: '#EC4899',
    icon: '🛍️',
    category: 'Client',
    customerId: 1,
    description: 'Client user portal for viewing products, checking purchase orders, inspecting credit balance, submitting requirements and reviews.',
    permissions: [
      'dashboard:view',
      'products:browse',
      'customer:orders',
      'customer:credit',
      'requirements:submit',
      'feedback:submit',
      'notifications:view',
      'settings:view'
    ],
    allowedRoutes: [
      '/',
      '/dashboard',
      '/products',
      '/sales',
      '/credit',
      '/requirements',
      '/feedback',
      '/notifications',
      '/settings'
    ]
  }
};

export const ROLE_KEYS = Object.keys(SYSTEM_ROLES);
export const ROLE_LIST = Object.values(SYSTEM_ROLES);

// Helper: match user role string to key
export function getRoleKeyByTitle(roleTitle = '') {
  const normalized = String(roleTitle).trim().toLowerCase();
  for (const roleObj of ROLE_LIST) {
    if (
      roleObj.role.toLowerCase() === normalized ||
      roleObj.key.toLowerCase() === normalized ||
      roleObj.name.toLowerCase().includes(normalized)
    ) {
      return roleObj.key;
    }
  }
  if (normalized.includes('admin') || normalized.includes('super')) return 'admin';
  if (normalized.includes('supplier') || normalized.includes('vendor') || normalized.includes('mill')) return 'supplier';
  if (normalized.includes('inventory') || normalized.includes('warehouse') || normalized.includes('stock')) return 'inventory';
  if (normalized.includes('sales')) return 'sales';
  if (normalized.includes('user') || normalized.includes('customer') || normalized.includes('client') || normalized.includes('patron')) return 'user';
  return 'user';
}

// Standard System Permission Modules Catalog
export const SYSTEM_PERMISSION_MODULES = [
  // --- INVENTORY & WAREHOUSE ---
  {
    id: 'inventory_read',
    category: 'Inventory & Godowns',
    label: 'View Stock & Inventory',
    icon: '📦',
    permission: 'inventory:read',
    description: 'Inspect product stock quantities, warehouse godowns, and low stock indicators.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'inventory_manage',
    category: 'Inventory & Godowns',
    label: 'Stock Adjustments & Godowns',
    icon: '🏷️',
    permission: 'inventory:manage',
    description: 'Add new inventory batches, change godown locations, and adjust stock counts.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'stock_inward',
    category: 'Inventory & Godowns',
    label: 'Receive Stock Inward',
    icon: '📥',
    permission: 'stock:inward',
    description: 'Confirm mill delivery shipments, perform quality checks, and increment stock.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'returns_manage',
    category: 'Inventory & Godowns',
    label: 'Vendor Returns & Defects',
    icon: '↩️',
    permission: 'returns:manage',
    description: 'Record defective merchandise, initiate returns to suppliers, and process write-offs.',
    roles: ['admin', 'inventory']
  },

  // --- PRODUCTS CATALOG ---
  {
    id: 'products_read',
    category: 'Product Catalog',
    label: 'Browse Product Catalog',
    icon: '👕',
    permission: 'products:read',
    description: 'View full product catalog, styles, fabric composition, and pricing.',
    roles: ['admin', 'supplier', 'inventory', 'sales']
  },
  {
    id: 'products_manage',
    category: 'Product Catalog',
    label: 'Create & Modify Products',
    icon: '✂️',
    permission: 'products:manage',
    description: 'Add new styles, modify wholesale/retail prices, generate barcodes, and set GST rates.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'products_browse',
    category: 'Product Catalog',
    label: 'Customer Catalog View',
    icon: '🛍️',
    permission: 'products:browse',
    description: 'Retail & wholesale customer viewing of available apparel catalog.',
    roles: ['admin', 'user']
  },

  // --- SALES & BILLING ---
  {
    id: 'sales_read',
    category: 'Sales & Invoicing',
    label: 'View Sales Bills & Receipts',
    icon: '🧾',
    permission: 'sales:read',
    description: 'Inspect past sales invoices, tax breakdown, and payment status.',
    roles: ['admin', 'sales']
  },
  {
    id: 'sales_manage',
    category: 'Sales & Invoicing',
    label: 'Create Sales & POS Billing',
    icon: '💰',
    permission: 'sales:manage',
    description: 'Issue new sales invoices, apply discounts, select credit/cash mode, print receipts.',
    roles: ['admin', 'sales']
  },

  // --- KHATA CREDIT & COLLECTIONS ---
  {
    id: 'credit_manage',
    category: 'Credit & Khata Ledger',
    label: 'Khata Credit Limit & Approval',
    icon: '📒',
    permission: 'credit:manage',
    description: 'Manage customer credit lines, approve khata terms, and set payment due dates.',
    roles: ['admin', 'sales']
  },
  {
    id: 'payments_manage',
    category: 'Credit & Khata Ledger',
    label: 'Record Payments & Settlements',
    icon: '💳',
    permission: 'payments:manage',
    description: 'Log cash, UPI, NEFT, and cheque settlements against outstanding balances.',
    roles: ['admin', 'sales']
  },
  {
    id: 'collections_manage',
    category: 'Credit & Khata Ledger',
    label: 'Field Collections & Routes',
    icon: '🚶',
    permission: 'collections:manage',
    description: 'Daily collection target management, cash reconciliation, and collection agent tracking.',
    roles: ['admin', 'sales']
  },
  {
    id: 'customer_orders',
    category: 'Credit & Khata Ledger',
    label: 'Customer Order History',
    icon: '📄',
    permission: 'customer:orders',
    description: 'Allow clients to view their personal sales history, invoices, and dispatch status.',
    roles: ['admin', 'user']
  },
  {
    id: 'customer_credit',
    category: 'Credit & Khata Ledger',
    label: 'Customer Khata Statement',
    icon: '💳',
    permission: 'customer:credit',
    description: 'Allow clients to review personal ledger balance, paid amounts, and due dates.',
    roles: ['admin', 'user']
  },

  // --- PROCUREMENT & SUPPLIERS ---
  {
    id: 'purchases_manage',
    category: 'Procurement & Suppliers',
    label: 'Create & Send Purchase Orders',
    icon: '📝',
    permission: 'purchases:manage',
    description: 'Create purchase orders, select suppliers, configure unit prices, and send POs.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'purchases_read',
    category: 'Procurement & Suppliers',
    label: 'Inspect Purchase Orders',
    icon: '📋',
    permission: 'purchases:read',
    description: 'View list of purchase orders, status timeline, and payment obligations.',
    roles: ['admin', 'supplier', 'inventory']
  },
  {
    id: 'purchases_orders',
    category: 'Procurement & Suppliers',
    label: 'Accept / Reject Purchase Orders',
    icon: '🤝',
    permission: 'purchases:orders',
    description: 'Supplier authorization to accept POs, provide delivery dates, and confirm fulfillment.',
    roles: ['admin', 'supplier']
  },
  {
    id: 'suppliers_read',
    category: 'Procurement & Suppliers',
    label: 'View Suppliers & Mills',
    icon: '🏢',
    permission: 'suppliers:read',
    description: 'Access supplier directory, textile mills, contact persons, and supply history.',
    roles: ['admin', 'supplier', 'inventory']
  },
  {
    id: 'suppliers_manage',
    category: 'Procurement & Suppliers',
    label: 'Manage Supplier Records',
    icon: '🏭',
    permission: 'suppliers:manage',
    description: 'Register new fabric mills, configure bank settlement details, and manage contracts.',
    roles: ['admin', 'inventory']
  },
  {
    id: 'suppliers_profile',
    category: 'Procurement & Suppliers',
    label: 'Supplier Self-Service Profile',
    icon: '⚙️',
    permission: 'suppliers:profile',
    description: 'Mill supplier editing of contact phone, address, and production capacities.',
    roles: ['admin', 'supplier']
  },

  // --- SALES TERRITORIES & AREAS ---
  {
    id: 'areas_read',
    category: 'Territory & Areas',
    label: 'View Area Route Schedules',
    icon: '🗺️',
    permission: 'areas:read',
    description: 'Inspect sales territory divisions, assigned market days, and customer clusters.',
    roles: ['admin', 'sales']
  },
  {
    id: 'areas_visit',
    category: 'Territory & Areas',
    label: 'Log Territory Visits',
    icon: '📍',
    permission: 'areas:visit',
    description: 'Record field agent visits to retail shops and customer meetings.',
    roles: ['admin', 'sales']
  },

  // --- REPORTS & INTELLIGENCE ---
  {
    id: 'reports_sales',
    category: 'Reports & Intelligence',
    label: 'Sales & Financial Reports',
    icon: '📊',
    permission: 'reports:sales',
    description: 'Access daily turnover, margin analysis, GST tax filing reports, and khata aging.',
    roles: ['admin', 'sales']
  },
  {
    id: 'analytics_view',
    category: 'Reports & Intelligence',
    label: 'AI Demand Predictions',
    icon: '🔮',
    permission: 'analytics:view',
    description: 'Predictive seasonal festival demand analysis, sales trends, and AI reorder recommendations.',
    roles: ['admin']
  },
  {
    id: 'festival_manage',
    category: 'Reports & Intelligence',
    label: 'Festival Calendar & Campaigns',
    icon: '🎉',
    permission: 'festival:manage',
    description: 'Set up seasonal festival campaigns (Diwali, Pongal, Eid) and festive stock plans.',
    roles: ['admin', 'sales']
  },

  // --- SYSTEM & AUDIT ---
  {
    id: 'notifications_view',
    category: 'System & Alerts',
    label: 'System Notifications & Alerts',
    icon: '🔔',
    permission: 'notifications:view',
    description: 'Receive real-time alerts for stock levels, payment dues, and purchase orders.',
    roles: ['admin', 'supplier', 'inventory', 'sales', 'user']
  },
  {
    id: 'settings_view',
    category: 'System & Alerts',
    label: 'View Basic Preferences',
    icon: '🎨',
    permission: 'settings:view',
    description: 'Personal theme, display font, and preferred language configuration.',
    roles: ['admin', 'supplier', 'inventory', 'sales', 'user']
  },
  {
    id: 'settings_manage',
    category: 'System & Alerts',
    label: 'Admin System Configuration',
    icon: '🛡️',
    permission: 'settings:manage',
    description: 'Store profiles, GST rules, invoice print design, RBAC rights, and auth policies.',
    roles: ['admin']
  }
];

// Helper: load customized permissions for a role
export function getCustomPermissionsForRole(roleKey) {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('threadline_custom_permissions') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[roleKey] && Array.isArray(parsed[roleKey])) {
        return parsed[roleKey];
      }
    }
  } catch (e) {
    // fallback
  }
  return SYSTEM_ROLES[roleKey]?.permissions || [];
}

// Helper: save custom permissions for a specific role
export function saveCustomPermissionsForRole(roleKey, newPermissions) {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem('threadline_custom_permissions');
    const existing = raw ? JSON.parse(raw) : {};
    existing[roleKey] = newPermissions;
    localStorage.setItem('threadline_custom_permissions', JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error('Error saving custom permissions for role:', e);
    return false;
  }
}

// Helper: save all role permissions
export function saveAllCustomPermissions(allPermissions) {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem('threadline_custom_permissions', JSON.stringify(allPermissions));
    return true;
  } catch (e) {
    console.error('Error saving all custom permissions:', e);
    return false;
  }
}

// Helper: reset all permissions to system defaults
export function resetCustomPermissionsToDefault() {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.removeItem('threadline_custom_permissions');
    return true;
  } catch (e) {
    return false;
  }
}

// Helper: check if role has permission (dynamically honoring Admin custom overrides)
export function hasRolePermission(userRole = '', permission = '') {
  const roleKey = getRoleKeyByTitle(userRole);
  if (roleKey === 'admin') return true;

  const roleConfig = SYSTEM_ROLES[roleKey];
  if (!roleConfig) return false;
  if (roleConfig.permissions.includes('*') || roleConfig.permissions.includes('system:admin')) {
    return true;
  }

  const activePermissions = getCustomPermissionsForRole(roleKey);
  if (activePermissions.includes('*')) return true;
  return activePermissions.includes(permission);
}

// Helper: check if route is allowed for role
export function isRouteAllowedForRole(userRole = '', pathname = '') {
  const roleKey = getRoleKeyByTitle(userRole);
  const roleConfig = SYSTEM_ROLES[roleKey];
  if (!roleConfig) return false;
  if (roleKey === 'admin') return true;

  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return roleConfig.allowedRoutes.some(allowed => {
    if (allowed === cleanPath) return true;
    if (allowed.includes(':id')) {
      const prefix = allowed.split('/:id')[0];
      return cleanPath.startsWith(prefix);
    }
    return false;
  });
}

// Helper: check if notification matches a specific customer
export function isCustomerNotificationMatch(notif, userContext = {}) {
  if (!notif) return false;
  const cName = String(userContext.customerName || userContext.userName || '').toLowerCase().trim();
  const cEmail = String(userContext.userEmail || '').toLowerCase().trim();
  const cPhone = String(userContext.customerPhone || '').replace(/\D/g, '');
  const cId = userContext.customerId;

  const recipient = String(notif.recipientName || '').toLowerCase();
  const sender = String(notif.senderName || '').toLowerCase();
  const msg = String(notif.message || '').toLowerCase();
  const recPhone = String(notif.recipientPhone || '').replace(/\D/g, '');

  // 1. Direct customer ID match
  if (cId && notif.customerId && Number(notif.customerId) === Number(cId)) return true;

  // 2. Customer Name match in recipient, sender, or message body
  if (cName && cName.length >= 3) {
    if (recipient.includes(cName) || sender.includes(cName) || msg.includes(cName)) {
      return true;
    }
  }

  // 3. Email prefix match (e.g., 'ravi.k', 'customer')
  if (cEmail && cEmail.includes('@')) {
    const userPrefix = cEmail.split('@')[0].toLowerCase();
    if (userPrefix.length >= 3) {
      if (recipient.includes(userPrefix) || sender.includes(userPrefix) || msg.includes(userPrefix)) {
        return true;
      }
    }
  }

  // 4. Phone number match (last 6 digits)
  if (cPhone && cPhone.length >= 6 && recPhone && recPhone.length >= 6) {
    if (recPhone.includes(cPhone.slice(-6)) || cPhone.includes(recPhone.slice(-6))) {
      return true;
    }
  }

  return false;
}

/**
 * Filter notifications to ONLY those related to the active user's role.
 * Roles:
 * - Admin: Sees all notifications
 * - Supplier: Purchase orders, supplier deliveries, supplier payments, mill procurement
 * - Inventory Manager: Out of stock, back in stock, warehouse godowns, returns, low stock
 * - Sales Manager: Customer orders, sales invoices, credit collections, payment reminders, customer inquiries
 * - User / Customer: ONLY personal notifications addressed to or sent by this customer
 */
export function isNotificationRelevantToRole(notif, userRoleOrKey = 'user', userContext = {}) {
  if (!notif) return false;
  const roleKey = getRoleKeyByTitle(userRoleOrKey);

  // 1. Admin receives all notifications across the entire system
  if (roleKey === 'admin') {
    return true;
  }

  // 2. If explicit targetRoles array is defined on the notification
  if (Array.isArray(notif.targetRoles) && notif.targetRoles.length > 0) {
    const hasRoleMatch = notif.targetRoles.some(r => getRoleKeyByTitle(r) === roleKey);
    // If targeted to 'user', also ensure it matches this specific user/customer identity
    if (roleKey === 'user') {
      if (!hasRoleMatch) return false;
      return isCustomerNotificationMatch(notif, userContext);
    }
    return hasRoleMatch;
  }

  // 3. If explicit targetRole is defined as a string
  if (notif.targetRole) {
    const targetKey = getRoleKeyByTitle(notif.targetRole);
    if (notif.targetRole === 'all' || notif.targetRole === '*') return true;
    if (roleKey === 'user') {
      if (targetKey !== 'user') return false;
      return isCustomerNotificationMatch(notif, userContext);
    }
    return targetKey === roleKey;
  }

  // 4. Content and type analysis for role assignment
  const type = String(notif.type || '').toUpperCase();
  const title = String(notif.title || '').toLowerCase();
  const msg = String(notif.message || '').toLowerCase();
  const recipient = String(notif.recipientName || '').toLowerCase();
  const sender = String(notif.senderName || '').toLowerCase();
  const related = String(notif.relatedProduct || '').toLowerCase();

  // --- SUPPLIER ROLE ---
  if (roleKey === 'supplier') {
    const supplierTypes = ['PURCHASE', 'PURCHASE_ORDER', 'SUPPLIER', 'SUPPLIER_ORDER', 'SUPPLIER_DELIVERY', 'SUPPLIER_PAYMENT', 'MILL', 'FABRIC'];
    if (supplierTypes.some(st => type.includes(st))) return true;

    const supplierKeywords = ['supplier', 'mill', 'lakshmi', 'senthil', 'tirupur knitwear', 'surat silk', 'erode powerloom', 'purchase order', 'po-'];
    if (supplierKeywords.some(kw => recipient.includes(kw) || sender.includes(kw) || title.includes(kw) || msg.includes(kw))) {
      // Exclude customer khata payment overdue reminders
      if (type === 'PAYMENT_REMINDER' || type === 'DUE_DATE' || title.includes('khata') || title.includes('overdue')) {
        return false;
      }
      return true;
    }
    return false;
  }

  // --- INVENTORY MANAGER ROLE ---
  if (roleKey === 'inventory') {
    const inventoryTypes = ['OUT_OF_STOCK', 'BACK_IN_STOCK', 'LOW_STOCK', 'INVENTORY', 'STOCK', 'RETURN', 'DEFECT', 'PURCHASE', 'MATCH_FOUND'];
    if (inventoryTypes.some(it => type.includes(it))) return true;

    const inventoryKeywords = ['stock', 'inventory', 'warehouse', 'godown', 'vault', 'sku', 'inward', 'return', 'defect', 'garment'];
    if (inventoryKeywords.some(kw => title.includes(kw) || msg.includes(kw) || related.includes(kw))) {
      // Exclude retail customer payment due reminders and collections
      if (type === 'PAYMENT_REMINDER' || type === 'DUE_DATE' || type === 'PAYMENT_CONFIRMATION' || type === 'COLLECTION' || title.includes('khata')) {
        return false;
      }
      return true;
    }
    return false;
  }

  // --- SALES MANAGER ROLE ---
  if (roleKey === 'sales') {
    const salesTypes = [
      'SALE', 'NEW_SALE', 'INVOICE', 'COLLECTION', 'PAYMENT_REMINDER', 'DUE_DATE',
      'PAYMENT_CONFIRMATION', 'PAYMENT_QUERY', 'STOCK_INQUIRY', 'ORDER_STATUS',
      'CUSTOM_REQ', 'GENERAL_INQUIRY', 'NEW_REQUIREMENT', 'REQUIREMENT_UPDATE', 'OVERDUE'
    ];
    if (salesTypes.some(st => type.includes(st))) return true;

    const salesKeywords = ['sale', 'payment', 'credit', 'khata', 'collection', 'inquiry', 'customer', 'installment', 'receipt', 'due'];
    if (salesKeywords.some(kw => title.includes(kw) || msg.includes(kw))) {
      // Exclude internal godown alerts that don't involve customer orders
      if (type === 'LOW_STOCK' && !msg.includes('customer') && !msg.includes('requirement')) {
        return false;
      }
      return true;
    }
    return false;
  }

  // --- USER / CUSTOMER ROLE ---
  if (roleKey === 'user') {
    return isCustomerNotificationMatch(notif, userContext);
  }

  return false;
}

