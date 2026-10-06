// frontend/src/routes.jsx
// Client-Side Navigation Routing Module: Defines application flow, public and protected routes

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { MainLayout } from './layouts';

// Common / Auth Pages
import Login from './pages/common/Login';
import Settings from './pages/common/Settings';
import NotFound from './pages/common/NotFound';

// Admin / Seller Pages
import Dashboard from './pages/admin/Dashboard';
import Customers from './pages/admin/Customers';
import AddCustomer from './pages/admin/AddCustomer';
import CustomerDetails from './pages/admin/CustomerDetails';
import Inventory from './pages/admin/Inventory';
import AddInventory from './pages/admin/AddInventory';
import AddSale from './pages/admin/AddSale';
import Payments from './pages/admin/Payments';
import Collections from './pages/admin/Collections';
import AIPrediction from './pages/admin/AIPrediction';
import Purchases from './pages/admin/Purchases';
import Returns from './pages/admin/Returns';
import Expenses from './pages/admin/Expenses';
import Reports from './pages/admin/Reports';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import AreaManagement from './pages/admin/AreaManagement';
import WeeklySchedule from './pages/admin/WeeklySchedule';
import AreaVisit from './pages/admin/AreaVisit';
import FestivalDemandCalendar from './pages/admin/FestivalDemandCalendar';
import Suppliers from './pages/admin/Suppliers';

// Customer Pages
import Products from './pages/customer/Products';
import Sales from './pages/customer/Sales';
import Credit from './pages/customer/Credit';
import Requirements from './pages/customer/Requirements';
import Feedback from './pages/customer/Feedback';
import Notifications from './pages/customer/Notifications';

import { getRoleKeyByTitle } from './config/roles';

// Protected Route Guard: requires authentication
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Role-Based Route Guard: enforces permissions for the 5 system roles
// 1. Admin: full access to every route
// 2. Supplier: suppliers, purchases, products, notifications, settings
// 3. Inventory Manager: inventory, products, suppliers, purchases, returns, notifications, settings
// 4. Sales Manager: customers, sales, products, credit, payments, collections, requirements, areas, festival-calendar, reports, feedback, notifications, settings
// 5. User: products, sales (my purchases), credit, requirements, feedback, notifications, settings
export function RoleRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, roleKey, userRole } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const currentKey = roleKey || getRoleKeyByTitle(userRole);
  // Admin has master access to all routes
  if (currentKey === 'admin') {
    return children;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Seller-Only Route Guard (backwards compatibility for any management components)
export function SellerOnlyRoute({ children }) {
  return <RoleRoute allowedRoles={['admin', 'supplier', 'inventory', 'sales']}>{children}</RoleRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Main Protected Application Flow */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Core Routes Accessible by Authenticated Roles */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />

        {/* User, Sales Manager & Admin Routes */}
        <Route path="sales" element={<RoleRoute allowedRoles={['admin', 'sales', 'user']}><Sales /></RoleRoute>} />
        <Route path="credit" element={<RoleRoute allowedRoles={['admin', 'sales', 'user']}><Credit /></RoleRoute>} />
        <Route path="requirements" element={<RoleRoute allowedRoles={['admin', 'sales', 'user']}><Requirements /></RoleRoute>} />
        <Route path="feedback" element={<RoleRoute allowedRoles={['admin', 'sales', 'user']}><Feedback /></RoleRoute>} />

        {/* Sales Manager & Admin Routes */}
        <Route path="sales/add" element={<RoleRoute allowedRoles={['admin', 'sales']}><AddSale /></RoleRoute>} />
        <Route path="customers" element={<RoleRoute allowedRoles={['admin', 'sales']}><Customers /></RoleRoute>} />
        <Route path="customers/add" element={<RoleRoute allowedRoles={['admin', 'sales']}><AddCustomer /></RoleRoute>} />
        <Route path="customers/:id" element={<RoleRoute allowedRoles={['admin', 'sales']}><CustomerDetails /></RoleRoute>} />
        <Route path="payments" element={<RoleRoute allowedRoles={['admin', 'sales', 'supplier']}><Payments /></RoleRoute>} />
        <Route path="collections" element={<RoleRoute allowedRoles={['admin', 'sales']}><Collections /></RoleRoute>} />
        <Route path="areas" element={<RoleRoute allowedRoles={['admin', 'sales']}><AreaManagement /></RoleRoute>} />
        <Route path="area-schedule" element={<RoleRoute allowedRoles={['admin', 'sales']}><WeeklySchedule /></RoleRoute>} />
        <Route path="area-visit" element={<RoleRoute allowedRoles={['admin', 'sales']}><AreaVisit /></RoleRoute>} />
        <Route path="area-visit/:areaId" element={<RoleRoute allowedRoles={['admin', 'sales']}><AreaVisit /></RoleRoute>} />
        <Route path="festival-calendar" element={<RoleRoute allowedRoles={['admin', 'sales']}><FestivalDemandCalendar /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute allowedRoles={['admin', 'sales']}><Reports /></RoleRoute>} />

        {/* Inventory Manager & Admin Routes */}
        <Route path="inventory" element={<RoleRoute allowedRoles={['admin', 'inventory']}><Inventory /></RoleRoute>} />
        <Route path="inventory/add" element={<RoleRoute allowedRoles={['admin', 'inventory']}><AddInventory /></RoleRoute>} />
        <Route path="returns" element={<RoleRoute allowedRoles={['admin', 'inventory']}><Returns /></RoleRoute>} />

        {/* Supplier, Inventory Manager & Admin Routes */}
        <Route path="suppliers" element={<RoleRoute allowedRoles={['admin', 'inventory', 'supplier']}><Suppliers /></RoleRoute>} />
        <Route path="suppliers/:id" element={<RoleRoute allowedRoles={['admin', 'inventory', 'supplier']}><Suppliers /></RoleRoute>} />
        <Route path="purchases" element={<RoleRoute allowedRoles={['admin', 'inventory', 'supplier']}><Purchases /></RoleRoute>} />

        {/* Admin Master Exclusive Routes */}
        <Route path="expenses" element={<RoleRoute allowedRoles={['admin']}><Expenses /></RoleRoute>} />
        <Route path="ai-prediction" element={<RoleRoute allowedRoles={['admin']}><AIPrediction /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute allowedRoles={['admin']}><AnalyticsDashboard /></RoleRoute>} />

        {/* 404 Wildcard Fallback */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
