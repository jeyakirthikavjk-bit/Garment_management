/**
 * WhatsApp Integration & Message Formatting Service
 * Handles instant billing share, payment receipts, and automated credit reminders.
 */

/**
 * Normalizes phone numbers to WhatsApp international format (e.g. 919876512345)
 * @param {string} phone
 * @returns {string}
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  // Remove all non-digits
  let digits = String(phone).replace(/\D/g, '');
  // If 10 digits (Indian mobile), prefix with country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Opens WhatsApp Web or App with prefilled message
 * @param {Object} options
 * @param {string} options.phone - Customer phone number
 * @param {string} options.message - Formatted message text
 */
export function sendWhatsAppMessage({ phone, message }) {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedMsg = encodeURIComponent(message || '');
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Generates an instant Tax Invoice message for WhatsApp
 */
export function buildInvoiceWhatsAppMessage({
  invoice,
  storeSettings = {}
}) {
  const storeName = storeSettings.storeName || 'ThreadLine Garments';
  const storePhone = storeSettings.contactPhone || '+91 98765 12345';
  const storeAddress = storeSettings.storeAddress || 'C.G. Road, Ahmedabad';
  const upiId = storeSettings.upiId || 'threadline@upi';

  const invNo = invoice.id || invoice.invoiceNo || 'INV-001';
  const custName = invoice.customer || invoice.customerName || 'Valued Customer';
  const date = invoice.date || new Date().toISOString().split('T')[0];
  const items = invoice.items || 'Garment Purchase';
  const totalAmt = Number(invoice.totalAmount || invoice.amount || 0).toLocaleString('en-IN');
  const payMode = invoice.paymentType || invoice.paymentMode || 'Credit / Khata';

  return `🧾 *${storeName.toUpperCase()} - TAX INVOICE*
━━━━━━━━━━━━━━━━━━━━━
*Invoice No:* ${invNo}
*Date:* ${date}
*Billed To:* ${custName}

🛍️ *Purchased Items:*
${items}

💰 *Total Amount:* ₹${totalAmt}
💳 *Payment Mode:* ${payMode}
${payMode.toLowerCase().includes('credit') ? `\n⏳ *Payment Status:* Added to Khata Account` : `\n✅ *Payment Status:* Paid & Verified`}

${storeSettings.enableGst && storeSettings.gstin ? `🏛️ *GSTIN:* ${storeSettings.gstin}\n` : ''}📍 *Store Address:* ${storeAddress}
📞 *Contact:* ${storePhone}
${payMode.toLowerCase().includes('credit') && upiId ? `\n📲 *Pay via UPI:* ${upiId}` : ''}
━━━━━━━━━━━━━━━━━━━━━
_Thank you for choosing ${storeName}! Please retain this digital bill for your records._`.trim();
}

/**
 * Generates an instant Payment Receipt message for WhatsApp
 */
export function buildPaymentReceiptWhatsAppMessage({
  receiptId,
  customerName,
  amount,
  paymentMode,
  remainingBalance,
  date,
  notes,
  storeSettings = {}
}) {
  const storeName = storeSettings.storeName || 'ThreadLine Garments';
  const storePhone = storeSettings.contactPhone || '+91 98765 12345';
  const formattedDate = date || new Date().toISOString().split('T')[0];
  const amtStr = Number(amount || 0).toLocaleString('en-IN');
  const balStr = Number(remainingBalance || 0).toLocaleString('en-IN');

  return `💰 *${storeName.toUpperCase()} - PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━
*Receipt ID:* ${receiptId || 'REC-' + Math.floor(1000 + Math.random() * 9000)}
*Date:* ${formattedDate}
*Customer:* ${customerName || 'Customer'}

✅ *Amount Received:* ₹${amtStr}
💳 *Payment Mode:* ${paymentMode || 'UPI / Cash'}
${notes ? `📝 *Notes:* ${notes}\n` : ''}
📊 *Updated Khata Balance:* ₹${balStr}
${Number(remainingBalance) <= 0 ? '🎉 *Account Status:* All dues fully cleared! Thank you!' : '⏳ *Remaining Due:* ₹' + balStr}

━━━━━━━━━━━━━━━━━━━━━
📞 *Helpline:* ${storePhone}
_Thank you for your prompt payment!_`.trim();
}

/**
 * Generates an Automated Outstanding Credit Reminder message
 * Supports English, Tamil, and Hindi templates with different tones (Gentle, Standard, Urgent)
 */
export function buildCreditReminderWhatsAppMessage({
  customer,
  storeSettings = {},
  language = 'en',
  tone = 'gentle'
}) {
  const storeName = storeSettings.storeName || 'ThreadLine Garments';
  const storePhone = storeSettings.contactPhone || '+91 98765 12345';
  const upiId = storeSettings.upiId || 'threadline@upi';
  const custName = customer.name || 'Valued Customer';
  const pendingBal = Number(customer.balance || 0).toLocaleString('en-IN');
  const areaName = customer.areaName || 'Your Territory';

  // UPI Deep Link for direct pay
  const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${customer.balance}&cu=INR&tn=${encodeURIComponent('Khata Balance Payment')}`;

  if (language === 'ta') {
    // Tamil Template
    if (tone === 'urgent') {
      return `⚠️ *${storeName} - அவசர கட்டண நினைவூட்டல்*
━━━━━━━━━━━━━━━━━━━━━
வணக்கம் திரு/திருமதி *${custName}*,

உங்கள் கணக்கில் உள்ள நிலுவைத் தொகை நீண்ட நாட்களாக பாக்கியுள்ளது:

📌 *நிலுவை பாக்கி தொகை:* ₹${pendingBal}
📍 *பகுதி:* ${areaName}

தயவுசெய்து உங்கள் நிலுவைத் தொகையை விரைவில் செலுத்தி, தடையற்ற ஆடை கொள்முதல் சேவையைப் பெறவும்.

📲 *UPI மூலம் செலுத்த:* ${upiId}
🔗 *UPI Payment Link:* ${upiPayLink}

📞 *தொடர்புக்கு:* ${storePhone}
நன்றி, *${storeName}*`.trim();
    }

    return `🙏 *${storeName} - கட்டண நினைவூட்டல் (Khata Reminder)*
━━━━━━━━━━━━━━━━━━━━━
வணக்கம் திரு/திருமதி *${custName}*,

${storeName}-ல் தொடர்ந்து வர்த்தகம் செய்வதற்கு மிக்க நன்றி!

📊 *உங்கள் தற்போதைய நிலுவை பாக்கி:* ₹${pendingBal}
📍 *ஏரியா வழித்தடம்:* ${areaName}

எங்கள் விற்பனை பிரதிநிதி இந்த வாரம் உங்கள் பகுதிக்கு வரும்போது அல்லது கீழே உள்ள UPI ஐடி மூலம் பணத்தைச் செலுத்தலாம்:

📲 *UPI ID:* ${upiId}
🔗 *Click to Pay UPI:* ${upiPayLink}

📞 *தொடர்புக்கு:* ${storePhone}
நன்றி, *${storeName}*`.trim();
  }

  if (language === 'hi') {
    // Hindi Template
    return `🙏 *${storeName} - बकाया भुगतान अनुस्मारक*
━━━━━━━━━━━━━━━━━━━━━
नमस्ते *${custName}* जी,

${storeName} के साथ व्यापार करने के लिए धन्यवाद!

📊 *आपकी कुल बकाया राशि:* ₹${pendingBal}
📍 *क्षेत्र:* ${areaName}

कृपया अपनी सुविधा अनुसार बकाया राशि का भुगतान नीचे दिए गए UPI या हमारे प्रतिनिधि के माध्यम से करें:

📲 *UPI ID:* ${upiId}
🔗 *सीधे भुगतान लिंक:* ${upiPayLink}

📞 *हेल्पलाइन:* ${storePhone}
धन्यवाद, *${storeName}*`.trim();
  }

  // English Default Templates
  if (tone === 'urgent') {
    return `⚠️ *URGENT PAYMENT REMINDER - ${storeName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━
Dear *${custName}*,

This is an urgent reminder regarding your overdue account balance:

💰 *Pending Overdue Amount:* ₹${pendingBal}
📍 *Territory Route:* ${areaName}

To ensure uninterrupted credit limit and timely garment supply, please clear this outstanding balance today.

📲 *Pay via UPI ID:* ${upiId}
🔗 *Direct UPI Pay Link:* ${upiPayLink}

📞 *Contact Accounts:* ${storePhone}
Thank you, *${storeName}*`.trim();
  }

// Standard / Gentle English
  return `🙏 *PAYMENT REMINDER - ${storeName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━
Dear *${custName}*,

Greetings from *${storeName}*! We hope your garment business is doing great.

Here is a friendly summary of your current Khata account:
📊 *Total Outstanding Balance:* ₹${pendingBal}
📍 *Assigned Area:* ${areaName}

You can conveniently pay during our representative's weekly visit or instantly via UPI:

📲 *Merchant UPI ID:* ${upiId}
🔗 *Instant UPI Pay Link:* ${upiPayLink}

📞 *Helpline & Support:* ${storePhone}
━━━━━━━━━━━━━━━━━━━━━
_Thank you for your valued partnership!_`.trim();
}

/**
 * Standard Overdue Payment Reminder specification template:
 * "Dear [Customer Name], your payment of ₹[Amount] is overdue since [Due Date]. Please make the payment at your earliest convenience. Thank you."
 */
export function buildRequiredOverdueReminderMessage({ customerName, pendingAmount, dueDate }) {
  const formattedAmount = Number(pendingAmount || 0).toLocaleString('en-IN');
  return `Dear ${customerName || 'Customer'}, your payment of ₹${formattedAmount} is overdue since ${dueDate || 'due date'}. Please make the payment at your earliest convenience. Thank you.`;
}
