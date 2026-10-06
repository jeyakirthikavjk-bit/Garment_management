import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { isConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'data', 'store.json');

/**
 * Read central JSON store
 */
function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { payment_reminders: [], reminder_settings: defaultSettings() };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.payment_reminders) data.payment_reminders = [];
    if (!data.reminder_settings) data.reminder_settings = defaultSettings();
    return data;
  } catch (err) {
    console.error('Error reading store.json in reminderService:', err.message);
    return { payment_reminders: [], reminder_settings: defaultSettings() };
  }
}

/**
 * Write central JSON store
 */
function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing store.json in reminderService:', err.message);
    return false;
  }
}

function defaultSettings() {
  return {
    reminderTime: '09:00',
    isEnabled: true,
    channel: 'WhatsApp & SMS',
    lastRunDate: '',
    lastRunTimestamp: '',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Parse any date string into standard Date object
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Try parsing formats like "09 Jun 2024" or "DD/MM/YYYY"
  const parts = dateStr.toString().split(/[-/.\s]+/);
  if (parts.length >= 3) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mIdx = months.indexOf(parts[1].toLowerCase());
    if (mIdx !== -1) {
      return new Date(Number(parts[2]), mIdx, Number(parts[0]));
    }
  }
  return null;
}

/**
 * Compute due date for a customer:
 * - Uses customer.dueDate if present
 * - Or derives from sales/purchases or lastVisit + 30 days
 */
export function getCustomerDueDate(customer, sales = []) {
  if (customer.dueDate) {
    return customer.dueDate;
  }

  // Check latest credit sale for customer
  const customerSales = (sales || []).filter(
    s => s.customer_id === customer.id || (s.customer && s.customer.toLowerCase() === (customer.name || '').toLowerCase())
  );
  if (customerSales.length > 0) {
    const latestSale = customerSales[customerSales.length - 1];
    if (latestSale.date) {
      const d = parseDate(latestSale.date);
      if (d) {
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  }

  // Fallback based on lastVisit
  if (customer.lastVisit) {
    const d = parseDate(customer.lastVisit);
    if (d) {
      d.setDate(d.getDate() + 15);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  // Default past overdue date for active pending khata balance
  return '09 Jun 2024';
}

/**
 * Format exact message required by specification:
 * "Dear [Customer Name], your payment of ₹[Amount] is overdue since [Due Date]. Please make the payment at your earliest convenience. Thank you."
 */
export function buildOverdueMessage(customerName, pendingAmount, dueDateStr) {
  const formattedAmount = Number(pendingAmount || 0).toLocaleString('en-IN');
  return `Dear ${customerName || 'Customer'}, your payment of ₹${formattedAmount} is overdue since ${dueDateStr}. Please make the payment at your earliest convenience. Thank you.`;
}

/**
 * Get overdue customers list with exact days overdue and reminder status
 */
export function getOverdueCustomersList() {
  const store = readStore();
  const customers = store.customers || [];
  const sales = store.sales || [];
  const reminders = store.payment_reminders || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = new Date().toISOString().slice(0, 10);

  const overdueList = [];

  for (const c of customers) {
    const pendingAmount = Number(c.balance || 0);
    // Rule: Do not send reminder if customer has already fully paid
    if (pendingAmount <= 0) continue;

    const dueDateStr = getCustomerDueDate(c, sales);
    const dueDateObj = parseDate(dueDateStr);

    let isOverdue = false;
    let daysOverdue = 1;

    if (dueDateObj) {
      const diffTime = today.getTime() - dueDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        isOverdue = true;
        daysOverdue = diffDays;
      }
    } else {
      isOverdue = true;
      daysOverdue = 15;
    }

    if (isOverdue) {
      // Find latest reminder sent to this customer
      const custReminders = reminders
        .filter(r => Number(r.customer_id) === Number(c.id))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const lastReminder = custReminders[0] || null;
      const sentToday = lastReminder && lastReminder.sent_date === todayStr;

      let reminderStatus = 'Pending';
      if (sentToday) {
        reminderStatus = lastReminder.status || 'Sent';
      } else if (lastReminder) {
        reminderStatus = 'Pending'; // Pending for today's check
      }

      overdueList.push({
        id: c.id,
        name: c.name,
        shopName: c.shopName || `${c.name}'s Shop`,
        phone: c.phone || '+91 98765 00000',
        email: c.email || '',
        areaName: c.areaName || 'Main Market',
        pendingAmount,
        dueDate: dueDateStr,
        daysOverdue,
        reminderStatus,
        lastReminder,
        sentToday: Boolean(sentToday)
      });
    }
  }

  return overdueList;
}

/**
 * Execute overdue check and generate reminders
 */
export async function checkAndSendOverdueReminders({ force = false, trigger = 'auto-scheduler' } = {}) {
  const store = readStore();
  const settings = store.reminder_settings || defaultSettings();

  if (!force && !settings.isEnabled) {
    return { success: false, skipped: true, reason: 'Reminders disabled in settings' };
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const nowTimeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const overdueList = getOverdueCustomersList();
  const existingReminders = store.payment_reminders || [];
  const newlyCreated = [];

  for (const cust of overdueList) {
    // Avoid sending duplicate reminders multiple times on the same day
    const alreadySentToday = existingReminders.some(
      r => Number(r.customer_id) === Number(cust.id) && r.sent_date === todayStr
    );
    if (alreadySentToday) continue;

    const reminderId = `REM-${Date.now()}-${cust.id}`;
    const message = buildOverdueMessage(cust.name, cust.pendingAmount, cust.dueDate);

    const reminderRecord = {
      reminder_id: reminderId,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone,
      pending_amount: cust.pendingAmount,
      due_date: cust.dueDate,
      days_overdue: cust.daysOverdue,
      message,
      sent_date: todayStr,
      sent_time: nowTimeStr,
      status: 'Sent',
      channel: settings.channel || 'WhatsApp & SMS',
      created_at: new Date().toISOString()
    };

    existingReminders.unshift(reminderRecord);
    newlyCreated.push(reminderRecord);

    // Save to MySQL if connected
    if (isConnected()) {
      try {
        await query(
          `INSERT INTO payment_reminders (reminder_id, customer_id, customer_name, customer_phone, pending_amount, due_date, days_overdue, message, sent_date, sent_time, status, channel, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), sent_time = VALUES(sent_time)`,
          [
            reminderRecord.reminder_id,
            reminderRecord.customer_id,
            reminderRecord.customer_name,
            reminderRecord.customer_phone,
            reminderRecord.pending_amount,
            reminderRecord.due_date,
            reminderRecord.days_overdue,
            reminderRecord.message,
            reminderRecord.sent_date,
            reminderRecord.sent_time,
            reminderRecord.status,
            reminderRecord.channel,
            reminderRecord.created_at
          ]
        );
      } catch (dbErr) {
        console.warn('Could not sync reminder to MySQL:', dbErr.message);
      }
    }
  }

  // Update last run timestamps
  settings.lastRunDate = todayStr;
  settings.lastRunTimestamp = new Date().toISOString();
  settings.updatedAt = new Date().toISOString();
  store.reminder_settings = settings;
  store.payment_reminders = existingReminders;
  writeStore(store);

  console.log(`[Automated Overdue Check] Trigger: ${trigger}, Checked: ${overdueList.length}, Sent: ${newlyCreated.length}`);

  return {
    success: true,
    trigger,
    checkedCount: overdueList.length,
    sentCount: newlyCreated.length,
    remindersCreated: newlyCreated
  };
}

/**
 * Send immediate single reminder for one customer
 */
export async function sendSingleCustomerReminder(customerId, channel = 'WhatsApp & SMS') {
  const store = readStore();
  const customers = store.customers || [];
  const sales = store.sales || [];
  const cust = customers.find(c => Number(c.id) === Number(customerId));

  if (!cust) throw new Error(`Customer with ID ${customerId} not found`);
  const pendingAmount = Number(cust.balance || 0);
  if (pendingAmount <= 0) throw new Error(`Customer ${cust.name} has no pending balance (already fully paid).`);

  const dueDate = getCustomerDueDate(cust, sales);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const nowTimeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const dueDateObj = parseDate(dueDate);
  let daysOverdue = 1;
  if (dueDateObj) {
    const diffTime = today.getTime() - dueDateObj.getTime();
    daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const reminderId = `REM-${Date.now()}-${cust.id}`;
  const message = buildOverdueMessage(cust.name, pendingAmount, dueDate);

  const reminderRecord = {
    reminder_id: reminderId,
    customer_id: cust.id,
    customer_name: cust.name,
    customer_phone: cust.phone || '+91 98765 00000',
    pending_amount: pendingAmount,
    due_date: dueDate,
    days_overdue: daysOverdue,
    message,
    sent_date: todayStr,
    sent_time: nowTimeStr,
    status: 'Sent',
    channel,
    created_at: new Date().toISOString()
  };

  store.payment_reminders = store.payment_reminders || [];
  store.payment_reminders.unshift(reminderRecord);
  writeStore(store);

  if (isConnected()) {
    try {
      await query(
        `INSERT INTO payment_reminders (reminder_id, customer_id, customer_name, customer_phone, pending_amount, due_date, days_overdue, message, sent_date, sent_time, status, channel, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reminderRecord.reminder_id,
          reminderRecord.customer_id,
          reminderRecord.customer_name,
          reminderRecord.customer_phone,
          reminderRecord.pending_amount,
          reminderRecord.due_date,
          reminderRecord.days_overdue,
          reminderRecord.message,
          reminderRecord.sent_date,
          reminderRecord.sent_time,
          reminderRecord.status,
          reminderRecord.channel,
          reminderRecord.created_at
        ]
      );
    } catch (dbErr) {
      console.warn('MySQL insert reminder error:', dbErr.message);
    }
  }

  return reminderRecord;
}

/**
 * Get all payment reminders
 */
export function getPaymentReminders() {
  const store = readStore();
  return store.payment_reminders || [];
}

/**
 * Delete a single reminder by ID
 */
export function deleteReminder(reminderId) {
  const store = readStore();
  store.payment_reminders = (store.payment_reminders || []).filter(r => r.reminder_id !== reminderId);
  writeStore(store);

  if (isConnected()) {
    query(`DELETE FROM payment_reminders WHERE reminder_id = ?`, [reminderId]).catch(err => {
      console.warn('MySQL delete reminder error:', err.message);
    });
  }
  return true;
}

/**
 * Clear all payment reminders history
 */
export function clearAllReminders() {
  const store = readStore();
  store.payment_reminders = [];
  writeStore(store);

  if (isConnected()) {
    query(`TRUNCATE TABLE payment_reminders`).catch(err => {
      console.warn('MySQL truncate payment_reminders error:', err.message);
    });
  }
  return true;
}

/**
 * Get reminder configuration
 */
export function getReminderConfig() {
  const store = readStore();
  return store.reminder_settings || defaultSettings();
}

/**
 * Save reminder configuration
 */
export function saveReminderConfig(newSettings) {
  const store = readStore();
  const current = store.reminder_settings || defaultSettings();
  const merged = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };
  store.reminder_settings = merged;
  writeStore(store);

  if (isConnected()) {
    query(
      `INSERT INTO reminder_settings (id, reminder_time, is_enabled, channel, last_run_date, last_run_timestamp, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reminder_time = VALUES(reminder_time), is_enabled = VALUES(is_enabled), channel = VALUES(channel), updated_at = VALUES(updated_at)`,
      [
        merged.reminderTime,
        merged.isEnabled ? 1 : 0,
        merged.channel,
        merged.lastRunDate || '',
        merged.lastRunTimestamp || '',
        merged.updatedAt
      ]
    ).catch(err => console.warn('MySQL save reminder_settings error:', err.message));
  }
  return merged;
}

/**
 * Background Cron Job: checks every minute if current time matches reminderTime
 */
export function initReminderScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const config = getReminderConfig();
      if (!config.isEnabled) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;
      const todayStr = now.toISOString().slice(0, 10);

      // Match configured reminder time e.g. "09:00" and check if not already run today
      if (config.reminderTime === currentTimeStr && config.lastRunDate !== todayStr) {
        console.log(`⏰ [Cron Trigger] Automated Overdue Check starting at ${currentTimeStr}...`);
        await checkAndSendOverdueReminders({ force: false, trigger: 'automated-daily-cron' });
      }
    } catch (e) {
      console.error('Error during scheduled overdue reminder check:', e.message);
    }
  });

  console.log('📅 Automated Payment Reminder cron scheduler initialized (runs daily at configured time).');
}
