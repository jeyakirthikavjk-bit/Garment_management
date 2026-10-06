// backend/controllers/customerController.js
// Business Logic Controller for Customers and Patron Self-Service Portal

import { customerModel } from '../models/customerModel.js';
import { salesModel } from '../models/salesModel.js';
import { getAllCollectionsFromDb, saveSingleCollectionToDb } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const customerController = {
  // GET /api/v1/customers - List customers with credit risk score
  async getCustomers(req, res) {
    try {
      let customers = await customerModel.findAll();
      const { search, areaId, riskLevel } = req.query;

      if (search) {
        const q = String(search).toLowerCase();
        customers = customers.filter(c =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.shopName && c.shopName.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
        );
      }

      if (areaId) {
        customers = customers.filter(c => String(c.areaId) === String(areaId));
      }

      // Enrich with risk scores
      const enriched = customers.map(c => customerModel.enrichWithRisk(c));

      if (riskLevel) {
        const target = String(riskLevel).toUpperCase();
        const filtered = enriched.filter(c => c.calculatedRisk === target);
        return successResponse(res, filtered, 'Filtered customers retrieved');
      }

      return successResponse(res, enriched, 'Customers retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch customers', 500, err);
    }
  },

  // GET /api/v1/customers/:id - Single customer with sales and payment history
  async getCustomerById(req, res) {
    try {
      const customer = await customerModel.findById(req.params.id);
      if (!customer) {
        return errorResponse(res, 'Customer record not found', 404);
      }

      const db = await getAllCollectionsFromDb();
      const sales = await salesModel.findByCustomerId(req.params.id);
      const collections = Array.isArray(db.collections)
        ? db.collections.filter(cl => String(cl.customerId) === String(req.params.id))
        : [];

      return successResponse(res, {
        ...customerModel.enrichWithRisk(customer),
        salesHistory: sales,
        paymentsHistory: collections
      }, 'Customer details retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch customer profile', 500, err);
    }
  },

  // GET /api/customer/profile - Current authenticated customer profile
  async getMyProfile(req, res) {
    try {
      const cId = req.user?.customerId || 1;
      const customer = await customerModel.findById(cId);
      if (!customer) {
        return errorResponse(res, 'Customer account not found', 404);
      }
      return successResponse(res, customerModel.enrichWithRisk(customer), 'My profile retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch profile', 500, err);
    }
  },

  // GET /api/customer/purchases - Invoices & Purchase ledger
  async getMyPurchases(req, res) {
    try {
      const cId = req.user?.customerId || 1;
      const sales = await salesModel.findByCustomerId(cId);
      return successResponse(res, sales, 'Customer purchases retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch customer purchases', 500, err);
    }
  },

  // GET /api/customer/ledger - Detailed debit/credit ledger
  async getMyLedger(req, res) {
    try {
      const cId = req.user?.customerId || 1;
      const customer = await customerModel.findById(cId);
      const db = await getAllCollectionsFromDb();
      const sales = await salesModel.findByCustomerId(cId);
      const collections = (db.collections || []).filter(cl => String(cl.customerId) === String(cId));

      return successResponse(res, {
        customer: customer ? customerModel.enrichWithRisk(customer) : null,
        outstandingBalance: customer ? customer.balance : 0,
        creditLimit: customer ? customer.creditLimit : 0,
        invoices: sales,
        payments: collections
      }, 'Customer ledger retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch customer ledger', 500, err);
    }
  },

  // GET /api/customer/requirements - Stock requests
  async getMyRequirements(req, res) {
    try {
      const cId = req.user?.customerId || 1;
      const db = await getAllCollectionsFromDb();
      const reqs = (db.requirements || []).filter(r => String(r.customerId) === String(cId));
      return successResponse(res, reqs, 'Customer stock requirements retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to fetch requirements', 500, err);
    }
  },

  // POST /api/customer/requirements - Submit new stock request
  async submitRequirement(req, res) {
    try {
      const cId = req.user?.customerId || 1;
      const db = await getAllCollectionsFromDb();
      const newReq = {
        id: `REQ-${Date.now()}`,
        customerId: cId,
        customerName: req.user?.customerName || req.user?.name || 'Customer',
        itemName: req.body.itemName || 'Custom Garment',
        category: req.body.category || 'Menswear',
        quantity: Number(req.body.quantity) || 10,
        targetPrice: Number(req.body.targetPrice) || 0,
        status: 'Pending',
        urgency: req.body.urgency || 'Normal',
        notes: req.body.notes || '',
        createdAt: new Date().toISOString()
      };

      const requirements = db.requirements || [];
      requirements.unshift(newReq);
      await saveSingleCollectionToDb('requirements', requirements);

      return successResponse(res, newReq, 'Stock requirement submitted successfully', 201);
    } catch (err) {
      return errorResponse(res, 'Failed to submit requirement', 500, err);
    }
  }
};
