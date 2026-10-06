import { getAllCollectionsFromDb, saveSingleCollectionToDb } from '../config/db.js';

export const customerModel = {
  // Retrieve all customers from DB
  async findAll() {
    const db = await getAllCollectionsFromDb();
    return Array.isArray(db.customers) ? db.customers : [];
  },

  // Find single customer by ID
  async findById(id) {
    const customers = await this.findAll();
    return customers.find(c => String(c.id) === String(id)) || null;
  },

  // Calculate Mathematical Payment Default Risk Score (0 - 100%)
  enrichWithRisk(customer) {
    const balance = Number(customer.balance) || 0;
    const limit = Number(customer.creditLimit) || 8000;
    const ratio = balance / limit;
    let calculatedRisk = 'LOW RISK';
    let riskScore = Math.min(30, Math.round(ratio * 25 + 10));

    if (customer.statusType === 'overdue' || customer.status === 'Overdue' || ratio >= 0.85) {
      calculatedRisk = 'HIGH RISK';
      riskScore = Math.min(98, Math.round(80 + (ratio > 1 ? 15 : ratio * 15)));
    } else if (ratio >= 0.35 || balance > 2000) {
      calculatedRisk = 'MEDIUM RISK';
      riskScore = Math.min(75, Math.round(45 + ratio * 30));
    }

    return {
      ...customer,
      riskScore,
      calculatedRisk
    };
  },

  // Find customer by email or phone
  async findByCredentials(identifier) {
    const customers = await this.findAll();
    const cleanId = String(identifier).trim().toLowerCase();
    return customers.find(c =>
      (c.email && c.email.toLowerCase() === cleanId) ||
      (c.phone && c.phone.replace(/\D/g, '').includes(cleanId.replace(/\D/g, '')))
    ) || null;
  },

  // Update customer balance / details
  async update(id, updatedFields) {
    const customers = await this.findAll();
    const index = customers.findIndex(c => String(c.id) === String(id));
    if (index === -1) return null;

    customers[index] = { ...customers[index], ...updatedFields };
    await saveSingleCollectionToDb('customers', customers);
    return customers[index];
  }
};
