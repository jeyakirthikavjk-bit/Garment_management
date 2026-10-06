import express from 'express';
import { getAllCollectionsFromDb } from './db.js';
import { optionalJwt } from './auth.js';

export const chatbotRouter = express.Router();

chatbotRouter.post('/message', optionalJwt, async (req, res) => {
  try {
    const { message, role, customerId, customerName, email } = req.body;
    const rawQuery = (message || '').trim();
    const q = rawQuery.toLowerCase();

    if (!q) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    const db = await getAllCollectionsFromDb().catch(() => ({}));
    const products = Array.isArray(db.products) ? db.products : [];
    const customers = Array.isArray(db.customers) ? db.customers : [];
    const requirements = Array.isArray(db.requirements) ? db.requirements : [];
    const sales = Array.isArray(db.sales) ? db.sales : [];

    const isCustomer = (role === 'Customer');
    const myCustomer = customers.find(c =>
      (customerId && String(c.id) === String(customerId)) ||
      (email && c.email && c.email.toLowerCase() === email.toLowerCase())
    ) || {
      name: customerName || 'Valued Retailer',
      balance: 0,
      creditLimit: 25000
    };

    // 1. Stock / Garment Products Query
    if (q.includes('stock') || q.includes('product') || q.includes('saree') || q.includes('suit') || q.includes('kurti') || q.includes('dress') || q.includes('fabric') || q.includes('available') || q.includes('item') || q.includes('price')) {
      const matches = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return (
          q.includes(name) ||
          name.split(' ').some(w => w.length > 3 && q.includes(w)) ||
          cat.split(' ').some(w => w.length > 3 && q.includes(w)) ||
          (q.includes('saree') && (name.includes('saree') || cat.includes('saree'))) ||
          (q.includes('kurti') && (name.includes('kurti') || cat.includes('kurti'))) ||
          (q.includes('suit') && (name.includes('suit') || cat.includes('suit'))) ||
          (q.includes('linen') && (name.includes('linen') || cat.includes('linen'))) ||
          (q.includes('silk') && (name.includes('silk') || cat.includes('silk')))
        );
      });

      if (matches.length > 0) {
        return res.json({
          success: true,
          answer: `I found **${matches.length}** garment product(s) in our live warehouse matching "${rawQuery}":`,
          products: matches.slice(0, 3),
          quickChips: isCustomer
            ? ['👗 Silk Sarees', '📋 Track My Requirements', '💰 Check My Balance']
            : ['📦 View All Inventory', '✂️ View Requirements Studio', '🛒 Create New Sale']
        });
      }

      const available = products.filter(p => (Number(p.stock) || 0) > 0).slice(0, 3);
      return res.json({
        success: true,
        answer: `Here are our top trending garment items currently **In Stock** in our warehouse:`,
        products: available,
        quickChips: isCustomer
          ? ['👗 Silk Sarees', '🧵 Linen Suits', '➕ Request Custom Variation']
          : ['📦 Inventory Control', '📊 Sales Analytics']
      });
    }

    // 2. Track Requirements / Sourced Orders
    if (q.includes('requirement') || q.includes('order') || q.includes('track') || q.includes('stitching') || q.includes('sourced') || q.includes('custom')) {
      const userReqs = isCustomer
        ? requirements.filter(r => String(r.customerId) === String(myCustomer.id) || (r.customer && r.customer.toLowerCase().includes((myCustomer.name || '').toLowerCase())))
        : requirements;

      if (userReqs.length === 0) {
        return res.json({
          success: true,
          answer: isCustomer
            ? `You currently don't have any active custom garment requirements logged. Would you like to request an out-of-stock dress or bulk saree lot?`
            : `There are currently no pending customer requirements registered in the system.`,
          quickChips: isCustomer ? ['➕ Request Stock / Saree', '👗 Browse In-Stock Garments'] : ['➕ Log Customer Requirement', '📦 Check Inventory']
        });
      }

      return res.json({
        success: true,
        answer: isCustomer
          ? `Here is the live progress of your **${userReqs.length}** registered garment requirement(s):`
          : `Showing latest **${Math.min(3, userReqs.length)}** customer requirement(s) in pipeline:`,
        requirements: userReqs.slice(0, 3),
        quickChips: isCustomer ? ['➕ Request Stock / Saree', '💬 WhatsApp Studio', '💰 Check My Balance'] : ['✂️ Open Requirements Studio', '✨ Check Stock Matches', '🛒 Create Invoice']
      });
    }

    // 3. Customer Balance / Khata Credit Query
    if (q.includes('balance') || q.includes('credit') || q.includes('khata') || q.includes('due') || q.includes('pay') || q.includes('bill')) {
      if (isCustomer) {
        const bal = Number(myCustomer.balance) || 0;
        const limit = Number(myCustomer.creditLimit) || 25000;
        const availableCredit = Math.max(0, limit - bal);
        return res.json({
          success: true,
          answer: `💰 **Your Account Khata Ledger Summary:**\n\n• **Outstanding Balance:** ₹${bal.toLocaleString('en-IN')}\n• **Sanctioned Credit Limit:** ₹${limit.toLocaleString('en-IN')}\n• **Available Credit:** ₹${availableCredit.toLocaleString('en-IN')}\n• **Settlement Status:** ${bal === 0 ? '✅ All Clear' : '⚠️ Settle via UPI / NEFT'}\n\nYou can pay your balance directly using our registered UPI handle: \`threadline@okhdfcbank\`.`,
          actionButton: { label: '💳 View Ledger History', path: '/credit' },
          quickChips: ['👗 In-Stock Garments', '📋 My Requirements', '💬 Request Statement on WhatsApp']
        });
      }

      const totalReceivable = customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
      const overdueCount = customers.filter(c => c.statusType === 'overdue' || (Number(c.balance) || 0) > 10000).length;
      return res.json({
        success: true,
        answer: `📊 **Store Khata Ledger Telemetry:**\n\n• **Total Outstanding Receivables:** ₹${totalReceivable.toLocaleString('en-IN')}\n• **Overdue Accounts:** ${overdueCount} Patrons\n• **Active Retailer Folios:** ${customers.length} Accounts`,
        actionButton: { label: '📒 Open Credit Ledger', path: '/credit' },
        quickChips: ['👥 Overdue Khata Customers', '💰 Record Payment', '🤖 Risk Prediction']
      });
    }

    // 4. Low Stock Inventory Alert
    if (q.includes('low stock') || q.includes('inventory') || q.includes('warehouse') || q.includes('godown') || q.includes('shortage')) {
      const lowStock = products.filter(p => (Number(p.stock) || 0) <= 10);
      if (lowStock.length === 0) {
        return res.json({
          success: true,
          answer: `✅ **Inventory Health Excellent!** All garment products currently have healthy stock levels across Godown 1 and Godown 2.`,
          quickChips: ['📊 Store Summary', '✂️ Pending Customer Demands']
        });
      }
      return res.json({
        success: true,
        answer: `⚠️ **Low Stock Alert (${lowStock.length} items need replenishment):**`,
        products: lowStock.slice(0, 3),
        actionButton: { label: '🏭 Open Inventory Manager', path: '/inventory' },
        quickChips: ['➕ Add New Stock', '✂️ View Requirements', '📊 Sales Reports']
      });
    }

    // 5. Overdue Defaulters / Risk Query
    if (q.includes('overdue') || q.includes('defaulter') || q.includes('delay') || q.includes('risk')) {
      const overdueList = customers.filter(c => c.statusType === 'overdue' || (Number(c.balance) || 0) > 10000);
      return res.json({
        success: true,
        answer: `⚠️ Found **${overdueList.length}** customer account(s) with high default risk or overdue balance:\n\n` +
          overdueList.slice(0, 4).map(c => `• **${c.name}** (${c.shopName || c.areaName || 'Local'}): ₹${(Number(c.balance) || 0).toLocaleString('en-IN')} pending`).join('\n'),
        actionButton: { label: '🤖 Open Risk Advisory', path: '/ai-prediction' },
        quickChips: ['📒 Credit Khata Book', '💰 Record Payment', '📍 Area Route Schedule']
      });
    }

    // 6. Festival Demand Advisor
    if (q.includes('festival') || q.includes('diwali') || q.includes('deepavali') || q.includes('pongal') || q.includes('eid') || q.includes('season')) {
      return res.json({
        success: true,
        answer: `🪔 **Festival Demand Advisory & Procurement Model:**\n\n• **Upcoming Festival:** Deepavali / Diwali\n• **Forecast Surge:** +40% across Silk Sarees & Ethnic Kurtis\n• **Predicted Stock Deficit:** +115 Kanchipuram Sarees, +80 Festive Kurtis, +52 Mens Kurta Sets\n• **Weaver Mill Lead Time:** 15-20 Days from Surat & Kanchipuram\n\nIssue inward mill purchase orders now to avoid peak-season supply disruption.`,
        actionButton: { label: '🪔 Open Festival Calendar', path: '/festival-calendar' },
        quickChips: ['🪔 Deepavali Stock Deficit', '🌾 Pongal Collection', '👑 Wedding Season Demand']
      });
    }

    // 7. Fabric Care & Styling Guide
    if (q.includes('fabric') || q.includes('care') || q.includes('wash') || q.includes('silk') || q.includes('linen')) {
      return res.json({
        success: true,
        answer: `🧵 **ThreadLine Fabric Care & Styling Guide:**\n\n• **Chanderi & Banarasi Silk:** Dry clean only for first 3 washes. Store wrapped in pure muslin cloth.\n• **Pure Italian Linen:** Gentle machine wash in cold water; iron damp for crisp structure.\n• **Bridal Zari & Sequin:** Steam iron only. Avoid direct perfume contact with gold/silver threads.\n• **Summer Suggestion:** Muslin cotton and pastel linen kurtas are trending this week!`,
        quickChips: ['👗 Browse Silk Sarees', '➕ Request Custom Fit', '✂️ Track My Requirements']
      });
    }

    // 8. Greetings & Default Fallback
    if (q.includes('hi') || q.includes('hello') || q.includes('namaste') || q.includes('hey')) {
      return res.json({
        success: true,
        answer: isCustomer
          ? `Namaste **${myCustomer.name}**! 🙏 Welcome to ThreadLine Garment Assistant. How can I assist with your garment orders, stock inquiries, or balance check?`
          : `Hello **${role || 'Admin'}**! Ready to assist you with sales billing, inventory tracking, and risk analysis.`,
        quickChips: isCustomer
          ? ['👗 In-Stock Garments', '✂️ Track Requirements', '➕ Request Stock / Saree', '💰 Check My Balance']
          : ['📊 Today\'s Store Summary', '✂️ Pending Demands', '⚠️ Low Stock Alert', '👥 Overdue Khata']
      });
    }

    return res.json({
      success: true,
      answer: `I received your inquiry regarding **"${rawQuery}"**.\n\nHere are some helpful actions I can take for you:`,
      quickChips: isCustomer
        ? ['👗 In-Stock Garments', '✂️ Track Requirements', '💰 Check My Balance', '🧵 Fabric Quality Guide']
        : ['📊 Store Summary', '✂️ Pending Demands', '⚠️ Low Stock Alert', '👥 Overdue Khata', '📦 View Products']
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
