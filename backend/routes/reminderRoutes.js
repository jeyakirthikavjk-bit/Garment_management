import express from 'express';
import { reminderController } from '../controllers/reminderController.js';

export const apiRemindersRouter = express.Router();

// 1. GET /api/reminders - List sent payment reminders
apiRemindersRouter.get('/', reminderController.getReminders);

// 2. GET /api/reminders/overdue-customers - List customers with overdue balances
apiRemindersRouter.get('/overdue-customers', reminderController.getOverdueCustomers);

// 3. GET /api/reminders/config - Get automated scheduler configuration
apiRemindersRouter.get('/config', reminderController.getConfig);

// 4. POST /api/reminders/config - Update scheduler settings
apiRemindersRouter.post('/config', reminderController.saveConfig);

// 5. POST /api/reminders/check-now - Manually execute overdue check
apiRemindersRouter.post('/check-now', reminderController.triggerCheck);

// 6. POST /api/reminders/send-single - Send reminder to single customer
apiRemindersRouter.post('/send-single', reminderController.sendSingle);

// 7. POST /api/reminders/clear-all - Clear reminder log history
apiRemindersRouter.post('/clear-all', reminderController.clearAll);
