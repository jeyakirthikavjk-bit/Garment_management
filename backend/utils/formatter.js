// backend/utils/formatter.js
// Reusable Data Formatting Utility (DRY principle)

/**
 * Format numeric value as Indian Rupees (INR)
 * @param {number} amount
 * @returns {string} e.g. "₹2,450.00"
 */
export function formatCurrencyINR(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(numeric);
}

/**
 * Format a Date object or string into ISO YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Standardize telephone number (e.g. +91 98421 23456 -> 9842123456)
 * @param {string} phone
 * @returns {string}
 */
export function sanitizePhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.substring(2);
  }
  return cleaned;
}
