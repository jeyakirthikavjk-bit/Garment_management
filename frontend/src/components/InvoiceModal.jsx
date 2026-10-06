import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { useArea } from '../context/AreaContext';
import { buildInvoiceWhatsAppMessage, sendWhatsAppMessage } from '../services/whatsappService';

export default function InvoiceModal({ invoice, onClose }) {
  const { storeSettings, t } = useSettings();
  const { customers } = useArea ? useArea() : { customers: [] };
  if (!invoice) return null;

  const storeName = storeSettings?.storeName || 'ThreadLine Garments';
  const storeAddress = storeSettings?.storeAddress || 'C.G. Road, Navrangpura, Ahmedabad, Gujarat 380009';
  const contactPhone = storeSettings?.contactPhone || '+91 98765 12345';
  const contactEmail = storeSettings?.contactEmail || 'support@threadline.com';
  const gstin = storeSettings?.gstin || '24AAAAA0000A1Z5';
  const enableGst = storeSettings?.enableGst !== false;
  const gstRate = Number(storeSettings?.gstRate) || 5;

  const targetCust = (customers || []).find(c =>
    c.id === invoice.customerId ||
    c.name === invoice.customer ||
    c.name === invoice.customerName
  );
  const customerPhone = invoice.customerPhone || invoice.phone || targetCust?.phone || '';

  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoice.id || invoice.invoiceNo || 'Tax_Invoice'} - ${storeName}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #121620;
              background: #ffffff;
              padding: 24px 32px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  const handleWhatsAppShare = () => {
    const formattedMsg = buildInvoiceWhatsAppMessage({
      invoice,
      storeSettings
    });
    sendWhatsAppMessage({
      phone: customerPhone,
      message: formattedMsg
    });
  };

  const hasExplicitGst = invoice.gstAmount !== undefined;
  const subtotal = invoice.subtotal !== undefined
    ? Number(invoice.subtotal)
    : (hasExplicitGst ? Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.gstAmount)) : Number(invoice.totalAmount || invoice.amount || 0));
  const gstAmount = hasExplicitGst
    ? Number(invoice.gstAmount)
    : (enableGst ? Math.round((subtotal * gstRate) / 100) : 0);
  const grandTotal = invoice.subtotal !== undefined || hasExplicitGst
    ? Number(invoice.totalAmount || (subtotal + gstAmount))
    : (subtotal + gstAmount);

  return (
    <div className="invoice-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
      <div className="invoice-modal-card card" style={{ width: '100%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', color: '#121620', padding: '28px', borderRadius: '18px', border: '1px solid var(--border-light)', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>

        {/* Top Header Actions (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🧾</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-dark)' }}>{t('customerTaxInvoiceBill', 'Customer Tax Invoice Bill')}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{t('generatedFor', 'Generated for')} {invoice.customer || invoice.customerName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--text-gray)' }}>✕</button>
        </div>

        {/* Printable Invoice Body */}
        <div id="printable-invoice" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#121620' }}>

          {/* Store Branding & Invoice Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #C5A059' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 800, color: '#121620', letterSpacing: '-0.5px' }}>
                {storeName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Wholesale & Retail Garment Platform
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.5' }}>
                {storeAddress}<br />
                Phone: {contactPhone} | Email: {contactEmail}<br />
                {enableGst && <strong>GSTIN: {gstin}</strong>}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C5A059 100%)', color: '#0A0D14', padding: '5px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', display: 'inline-block', marginBottom: '8px', letterSpacing: '0.5px' }}>
                {t('taxInvoiceBillBadge', 'TAX INVOICE BILL')}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#121620' }}>
                {invoice.id || invoice.invoiceNo || 'INV-001'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                {t('invoiceDateLabel', 'Invoice Date')}: <strong>{invoice.date || new Date().toISOString().split('T')[0]}</strong>
              </div>
            </div>
          </div>

          {/* Billed To Customer Details */}
          <div style={{ background: '#FAF8F5', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                {t('billedToCustomer', 'BILLED TO (CUSTOMER)')}
              </span>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#121620' }}>
                {invoice.customer || invoice.customerName || 'Customer Account'}
              </div>
              {invoice.areaName && (
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  {t('assignedRouteLabel', 'Assigned Route')}: <strong>{invoice.areaName}</strong>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                {t('paymentStatusLabel', 'PAYMENT STATUS')}
              </span>
              <div style={{ fontSize: '13px', fontWeight: 800, color: invoice.paymentType === 'Cash' || invoice.paymentMode === 'Cash' ? '#047857' : '#B8860B' }}>
                {t('modeLabel', 'Mode')}: {invoice.paymentType || invoice.paymentMode || 'Credit / Khata'}
              </div>
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', fontWeight: 700 }}>
                {t('statusLoggedVerified', 'Status: Logged & Verified ✓')}
              </div>
            </div>
          </div>

          {/* Items Particulars Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ padding: '10px 12px', fontSize: '11px', textAlign: 'left', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', textAlign: 'left', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{t('particularsDescription', 'GARMENT PARTICULARS / DESCRIPTION')}</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', textAlign: 'center', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{t('qtyCol', 'QTY')}</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', textAlign: 'right', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{t('amountCol', 'AMOUNT (₹)')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>1</td>
                <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 700, color: '#121620' }}>
                  {invoice.items || 'Garment Products Purchase'}
                </td>
                <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>1 PKT</td>
                <td style={{ padding: '14px 12px', fontSize: '14px', textAlign: 'right', fontWeight: 800, color: '#121620' }}>
                  ₹{subtotal.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Amount Calculation Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingTop: '12px', borderTop: '2px dashed #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '300px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              <strong>{t('notesTerms', 'Notes / Terms:')}</strong><br />
              {storeSettings?.footerMessage || 'Thank you for shopping at ThreadLine!\nExchange within 7 days with original tag.'}
            </div>

            <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                <span>{t('subtotalLabel', 'Subtotal:')}</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {enableGst && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                  <span>{t('gstRateLabel', 'GST Rate')} ({gstRate}%):</span>
                  <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#121620', paddingTop: '8px', borderTop: '2px solid #121620' }}>
                <span>{t('grandTotalLabel', 'Grand Total:')}</span>
                <span style={{ color: '#C5A059' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #E2E8F0', marginTop: '16px' }}>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#4A3E39' }}>
              <div style={{ marginBottom: '30px' }}></div>
              <div>______________________</div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>{t('customerSignature', 'Customer Signature')}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#4A3E39' }}>
              <div style={{ fontWeight: 700, color: '#121620', marginBottom: '2px' }}>{storeName}</div>
              <div style={{ fontSize: '11px', color: '#5A4B42', marginBottom: '14px', fontWeight: 500 }}>{t('authorizedSignatureSeal', 'Authorized Signature & Seal')}</div>
              <div>______________________</div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>{t('managerStoreAdmin', 'Manager / Store Admin')}</div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Action Bar (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>🖨️</span> {t('printInvoicePdf', 'Print Invoice / Download PDF')}
          </button>
          <button
            onClick={handleWhatsAppShare}
            style={{ padding: '10px 18px', background: '#25D366', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>💬</span> {t('shareWhatsAppBill', 'Share WhatsApp Bill')}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '10px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            {t('closeBtn', 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
}
