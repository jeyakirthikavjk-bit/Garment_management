import {
  getPaymentReminders,
  getOverdueCustomersList,
  getReminderConfig,
  saveReminderConfig,
  checkAndSendOverdueReminders,
  sendSingleCustomerReminder,
  deleteReminder,
  clearAllReminders
} from '../services/reminderService.js';

export const reminderController = {
  // GET /api/reminders
  async getReminders(req, res) {
    try {
      const reminders = getPaymentReminders();
      return res.json({
        success: true,
        count: reminders.length,
        data: reminders
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/reminders/overdue-customers
  async getOverdueCustomers(req, res) {
    try {
      const overdueList = getOverdueCustomersList();
      return res.json({
        success: true,
        count: overdueList.length,
        data: overdueList
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/reminders/config
  async getConfig(req, res) {
    try {
      const config = getReminderConfig();
      return res.json({
        success: true,
        data: config
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/reminders/config
  async saveConfig(req, res) {
    try {
      const { reminderTime, isEnabled, channel } = req.body;
      const update = {};
      if (reminderTime !== undefined) update.reminderTime = reminderTime;
      if (isEnabled !== undefined) update.isEnabled = Boolean(isEnabled);
      if (channel !== undefined) update.channel = channel;

      const saved = saveReminderConfig(update);
      return res.json({
        success: true,
        message: 'Reminder configuration updated successfully',
        data: saved
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/reminders/check-now
  async triggerCheck(req, res) {
    try {
      const result = await checkAndSendOverdueReminders({ force: true, trigger: 'manual-seller-trigger' });
      return res.json({
        success: true,
        message: `Overdue check complete. ${result.sentCount} reminder(s) generated.`,
        result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/reminders/send-single
  async sendSingle(req, res) {
    try {
      const { customerId, channel } = req.body;
      if (!customerId) {
        return res.status(400).json({ success: false, error: 'customerId is required' });
      }

      const result = await sendSingleCustomerReminder(customerId, { channel });
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json({
        success: true,
        message: `Reminder sent to ${result.reminder.customer_name}`,
        data: result.reminder
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/reminders/clear-all
  async clearAll(req, res) {
    try {
      const count = clearAllReminders();
      return res.json({
        success: true,
        message: `Cleared ${count} reminder log records`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
