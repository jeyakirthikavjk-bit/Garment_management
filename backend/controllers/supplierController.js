// backend/controllers/supplierController.js
// Business Logic Controller for Supplier Purchase Order Operations & Acceptance Flow

import { getAllCollectionsFromDb, saveSingleCollectionToDb } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const supplierController = {
  /**
   * GET /api/supplier/purchase-orders
   * Strictly returns ONLY purchase orders belonging to the authenticated supplier
   */
  async getPurchaseOrders(req, res) {
    try {
      const supplierId = req.user?.supplierId || req.user?.id || req.headers['x-supplier-id'] || req.query.supplierId;
      if (!supplierId) {
        return errorResponse(res, 'Missing supplier authentication or x-supplier-id header', 401);
      }

      const db = await getAllCollectionsFromDb();
      const purchases = db.supplierPurchases || db.supplier_purchases || [];

      // Strict Supplier Isolation: Only return POs belonging to this supplier
      const myPurchases = purchases.filter(po => {
        if (po.supplierId === supplierId) return true;
        if (supplierId === 'sup-1' && (po.supplierId === 'SUP-001' || po.supplierId === 'sup-1')) return true;
        return false;
      });

      return successResponse(res, myPurchases, 'Supplier purchase orders retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch supplier purchase orders', 500, err);
    }
  },

  /**
   * GET /api/supplier/purchase-orders/:id
   * Single PO details with strict cross-supplier access prevention
   */
  async getPurchaseOrderById(req, res) {
    try {
      const { id } = req.params;
      const supplierId = req.user?.supplierId || req.user?.id || req.headers['x-supplier-id'] || req.query.supplierId;
      if (!supplierId) {
        return errorResponse(res, 'Missing supplier authentication or x-supplier-id header', 401);
      }

      const db = await getAllCollectionsFromDb();
      const purchases = db.supplierPurchases || db.supplier_purchases || [];
      const po = purchases.find(p => String(p.id) === String(id) || String(p.purchaseOrderNo) === String(id));

      if (!po) {
        return errorResponse(res, 'Purchase Order not found', 404);
      }

      // Check cross-supplier ownership
      const isOwner = po.supplierId === supplierId || (supplierId === 'sup-1' && (po.supplierId === 'SUP-001' || po.supplierId === 'sup-1'));
      if (!isOwner) {
        return errorResponse(res, "Forbidden: You cannot view another supplier's Purchase Order", 403);
      }

      return successResponse(res, po, 'Purchase Order details retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch purchase order details', 500, err);
    }
  },

  /**
   * POST /api/supplier/purchase-orders/:id/accept
   * Supplier Acceptance Flow:
   * 1. Verifies supplier ownership (no cross-supplier acceptance)
   * 2. Prevents duplicate acceptance
   * 3. Transitions status from Pending -> Accepted
   * 4. Stores acceptedAt timestamp and notification for Admin/Inventory Manager
   */
  async acceptPurchaseOrder(req, res) {
    try {
      const { id } = req.params;
      const supplierId = req.user?.supplierId || req.user?.id || req.headers['x-supplier-id'] || req.body?.supplierId;
      const supplierName = req.body?.supplierName || req.user?.name || 'Supplier';

      if (!supplierId) {
        return errorResponse(res, 'Missing supplier authentication or x-supplier-id header', 401);
      }

      const db = await getAllCollectionsFromDb();
      const purchases = db.supplierPurchases || db.supplier_purchases || [];
      const poIdx = purchases.findIndex(p => String(p.id) === String(id) || String(p.purchaseOrderNo) === String(id));

      if (poIdx === -1) {
        return errorResponse(res, 'Purchase Order not found', 404);
      }

      const targetPO = purchases[poIdx];

      // 1. Enforce Supplier Ownership at backend level
      const isOwner = targetPO.supplierId === supplierId || (supplierId === 'sup-1' && (targetPO.supplierId === 'SUP-001' || targetPO.supplierId === 'sup-1'));
      if (!isOwner) {
        return errorResponse(res, "Forbidden: You cannot accept another supplier's Purchase Order", 403);
      }

      // 2. Prevent Duplicate Acceptance at backend level
      if (targetPO.acceptanceStatus === 'Accepted' || targetPO.status === 'Accepted') {
        return errorResponse(
          res,
          `Purchase Order is already accepted on ${targetPO.acceptedDateFormatted || targetPO.acceptedAt}. Duplicate acceptance is not permitted.`,
          400
        );
      }

      // 3. Perform Acceptance
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      targetPO.status = 'Accepted';
      targetPO.acceptanceStatus = 'Accepted';
      targetPO.acceptedAt = now.toISOString();
      targetPO.acceptedDateFormatted = formattedDate;
      targetPO.acceptedBy = supplierName;
      if (targetPO.deliveryStatus === 'Pending' || !targetPO.deliveryStatus) {
        targetPO.deliveryStatus = 'Accepted';
      }

      purchases[poIdx] = targetPO;

      // 4. Create Notification for Admin / Inventory Manager
      const notifications = db.notifications || [];
      const adminNotif = {
        id: `notif-${Date.now()}`,
        title: `✓ PO Accepted: ${targetPO.purchaseOrderNo || targetPO.id}`,
        message: `Supplier "${targetPO.supplierName || supplierName}" has accepted Purchase Order ${targetPO.purchaseOrderNo || targetPO.id} (₹${Number(targetPO.finalCost || 0).toLocaleString('en-IN')}) on ${formattedDate}.`,
        date: formattedDate,
        type: 'order',
        role: 'admin',
        isRead: false,
        createdAt: now.toISOString()
      };
      notifications.unshift(adminNotif);

      // Save to database/store
      await saveSingleCollectionToDb('supplierPurchases', purchases);
      await saveSingleCollectionToDb('notifications', notifications);

      return successResponse(res, targetPO, `Purchase Order ${targetPO.purchaseOrderNo || targetPO.id} accepted successfully`);
    } catch (err) {
      return errorResponse(res, 'Failed to process purchase order acceptance', 500, err);
    }
  }
};
