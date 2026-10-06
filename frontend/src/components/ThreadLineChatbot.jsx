import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../context/AreaContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api.js';

export default function ThreadLineChatbot() {
  const navigate = useNavigate();
  const {
    products,
    customers,
    requirements,
    sales,
    collections,
    areas,
    notifications,
    saveCustomerRequirement
  } = useArea();

  const { isCustomerRole, customerId, customerName, userEmail, userRole } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showGreetingBadge, setShowGreetingBadge] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Resolved Customer for Customer Role
  const myCustomer = customers.find(c =>
    c.id === Number(customerId) ||
    (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
    (c.phone && userEmail && userEmail.replace(/\D/g, '').length >= 6 && c.phone.replace(/\D/g, '').includes(userEmail.replace(/\D/g, ''))) ||
    (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase())
  ) || {
    id: customerId || 1,
    name: customerName || 'Valued Customer',
    shopName: customerName ? `${customerName}'s Boutique` : 'Customer Boutique',
    phone: '+91 98765 43210',
    email: userEmail || 'customer@threadline.com',
    areaName: 'Navrangpura',
    balance: 0,
    creditLimit: 50000,
    purchases: 45000
  };

  // Initial welcome message
  const getInitialMessages = () => [
    {
      id: 1,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: isCustomerRole
        ? `✨ Welcome, **${myCustomer.name}**! I am your **ThreadLine Garment Assistant**.\n\nHow can I help you today? You can search in-stock garments, track your stock requirements, submit a wholesale restock order, or check your account balance.`
        : `✨ Welcome **${userRole || 'Admin'}**! I am your **ThreadLine ERP Co-Pilot**.\n\nI can analyze live business metrics, find pending customer requirements, check warehouse godown stocks, track overdue Khata balances, and assist with store operations.`,
      quickChips: isCustomerRole
        ? ['👗 Browse In-Stock Garments', '📋 Track My Requirements', '➕ Request Stock / Saree', '💰 Check My Balance', '🧵 Fabric Quality Guide']
        : ['📊 Today\'s Store Summary', '📋 Pending Customer Demands', '⚠️ Low Stock Inventory Alert', '👥 Overdue Khata Customers', '🛍️ Best Selling Products']
    }
  ];

  const [messages, setMessages] = useState(getInitialMessages);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setShowGreetingBadge(false);
    }
  }, [isOpen]);

  // Voice recognition setup
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleProcessUserInput(transcript);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Natural Language & ERP Intelligence Processor
  const processQuery = (rawQuery) => {
    const q = rawQuery.toLowerCase().trim();

    // 1. Stock / Products Query
    if (q.includes('stock') || q.includes('product') || q.includes('saree') || q.includes('suit') || q.includes('kurti') || q.includes('dress') || q.includes('fabric') || q.includes('available') || q.includes('item') || q.includes('price')) {
      const matchingProds = products.filter(p => {
        const pName = p.name.toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        return (
          q.includes(pName) ||
          pName.split(' ').some(w => w.length > 3 && q.includes(w)) ||
          pCat.split(' ').some(w => w.length > 3 && q.includes(w)) ||
          (q.includes('saree') && (pName.includes('saree') || pCat.includes('saree'))) ||
          (q.includes('kurti') && (pName.includes('kurti') || pCat.includes('kurti'))) ||
          (q.includes('suit') && (pName.includes('suit') || pCat.includes('suit'))) ||
          (q.includes('linen') && (pName.includes('linen') || pCat.includes('linen'))) ||
          (q.includes('silk') && (pName.includes('silk') || pCat.includes('silk')))
        );
      });

      if (matchingProds.length > 0) {
        return {
          text: `Found **${matchingProds.length}** garment product(s) matching your inquiry:`,
          products: matchingProds.slice(0, 3),
          quickChips: isCustomerRole
            ? ['➕ Request Custom Variation', '✂️ Track My Requirements', '💰 Check My Balance']
            : ['📦 View All Inventory', '✂️ View Requirements Studio', '🛒 Create New Sale']
        };
      }

      // If generic product search or no specific match
      const inStockList = products.filter(p => p.stock > 0).slice(0, 3);
      return {
        text: `Here are our top trending garment items currently **In Stock** in our warehouse:`,
        products: inStockList,
        quickChips: isCustomerRole
          ? ['➕ Request Out-of-Stock Item', '👗 Silk Sarees', '🧵 Linen Suits']
          : ['📦 Inventory Control', '📊 Sales Analytics']
      };
    }

    // 2. Track Requirements / Orders
    if (q.includes('requirement') || q.includes('order') || q.includes('track') || q.includes('stitching') || q.includes('sourced') || q.includes('status') || q.includes('custom')) {
      const userReqs = isCustomerRole
        ? requirements.filter(r =>
          r.customerId === myCustomer.id ||
          (r.customer && r.customer.toLowerCase().includes((myCustomer.name || '').toLowerCase()))
        )
        : requirements;

      if (userReqs.length === 0) {
        return {
          text: isCustomerRole
            ? `You currently don't have any active stock or garment requirements logged. Would you like to submit a request for an out-of-stock garment or wholesale lot?`
            : `There are currently no registered customer requirements in the database.`,
          quickChips: isCustomerRole
            ? ['➕ Submit New Requirement', '👗 Browse In-Stock Garments']
            : ['➕ Log Customer Requirement', '📦 Check Inventory']
        };
      }

      return {
        text: isCustomerRole
          ? `Here is the live progress status of your **${userReqs.length}** registered garment requirement(s):`
          : `Showing latest **${Math.min(3, userReqs.length)}** customer requirement(s) in pipeline:`,
        requirements: userReqs.slice(0, 3),
        quickChips: isCustomerRole
          ? ['➕ Submit Another Requirement', '💬 WhatsApp Studio', '💰 Check My Balance']
          : ['✂️ Open Requirements Studio', '✨ Check Stock Matches', '🛒 Create Invoice']
      };
    }

    // 3. Submit New Requirement / Request Dress directly via chat
    if (q.includes('request') || q.includes('i need') || q.includes('want to buy') || q.includes('custom order') || q.includes('make for me') || q.includes('book') || q.includes('submit')) {
      // Parse garment name or intent
      let garmentName = 'Custom Designer Garment';
      if (q.includes('saree')) garmentName = 'Pure Silk Festive Saree';
      else if (q.includes('kurti')) garmentName = 'Chanderi Designer Kurti Set';
      else if (q.includes('suit')) garmentName = 'Custom Tailored Linen Suit';
      else if (q.includes('lehenga')) garmentName = 'Bridal Embroidered Lehenga';
      else if (q.includes('shirt')) garmentName = 'Tailored Cotton Shirt';

      // Parse size
      let size = 'L';
      if (q.includes('size xs')) size = 'XS';
      else if (q.includes('size s') || q.includes('small')) size = 'S';
      else if (q.includes('size m') || q.includes('medium')) size = 'M';
      else if (q.includes('size xl') || q.includes('extra large')) size = 'XL';
      else if (q.includes('size xxl') || q.includes('2xl')) size = 'XXL';

      // Parse color
      let color = 'Navy Blue';
      if (q.includes('red') || q.includes('maroon')) color = 'Maroon / Crimson';
      else if (q.includes('green') || q.includes('emerald')) color = 'Emerald Green';
      else if (q.includes('yellow') || q.includes('mustard')) color = 'Mustard Gold';
      else if (q.includes('pink') || q.includes('rose')) color = 'Dusty Rose';
      else if (q.includes('black')) color = 'Jet Black';

      // Parse budget
      const budgetMatch = q.match(/(?:budget|rs|₹|price|inr)?\s*(\d{3,6})/i);
      const budget = budgetMatch ? budgetMatch[1] : '3500';

      const newReq = saveCustomerRequirement({
        customerId: myCustomer.id,
        customerName: myCustomer.name,
        shopName: myCustomer.shopName,
        phone: myCustomer.phone,
        areaName: myCustomer.areaName,
        garment: garmentName,
        category: 'Custom Garments',
        fabric: 'Premium Handloom / Silk',
        size,
        color,
        quantity: 1,
        budget: Number(budget),
        urgency: q.includes('urgent') ? 'Urgent' : 'Normal',
        notes: `Submitted via ThreadLine Assistant Chat: "${rawQuery}"`,
        isCreatedByCustomer: isCustomerRole
      });

      return {
        text: `🎉 **Garment Requirement Logged Successfully!**\n\n• **REQ ID:** \`${newReq.id}\`\n• **Item:** ${newReq.garment}\n• **Size & Color:** ${size}, ${color}\n• **Target Budget:** ₹${Number(budget).toLocaleString('en-IN')}\n• **Status:** ⏳ *${newReq.status}*\n\nOur master tailors and store managers have received your notification and will review it immediately.`,
        actionButton: {
          label: '✂️ View in Requirements Studio',
          path: '/requirements'
        },
        quickChips: ['✂️ Track My Requirements', '👗 Browse Other Garments', '💬 Chat on WhatsApp']
      };
    }

    // 4. Khata / Credit / Balance Query
    if (q.includes('balance') || q.includes('credit') || q.includes('khata') || q.includes('payment') || q.includes('due') || q.includes('pay') || q.includes('money') || q.includes('bill')) {
      if (isCustomerRole) {
        const bal = myCustomer.balance ?? 0;
        const limit = myCustomer.creditLimit ?? 50000;
        const purchases = myCustomer.purchases ?? 0;

        return {
          text: `💳 **Your ThreadLine Khata & Credit Overview:**\n\n• **Outstanding Balance:** ₹${bal.toLocaleString('en-IN')}\n• **Approved Credit Limit:** ₹${limit.toLocaleString('en-IN')}\n• **Total Lifetime Purchases:** ₹${purchases.toLocaleString('en-IN')}\n• **Account Status:** ${bal === 0 ? '🟢 All Cleared' : bal < 5000 ? '🟡 Active (Due)' : '🔴 Overdue'}\n\nYou can pay your balance via UPI, NetBanking, or during our weekly route visit.`,
          actionButton: {
            label: '📒 View Khata & Receipts',
            path: '/credit'
          },
          quickChips: ['📦 View Purchase History', '✂️ Track My Requirements', '👗 Browse Garments']
        };
      }

      // Seller Khata Overview
      const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
      const overdueCusts = customers.filter(c => (c.balance || 0) > 0);

      return {
        text: `💰 **Store Credit & Khata Summary:**\n\n• **Total Outstanding Market Balance:** ₹${totalOutstanding.toLocaleString('en-IN')}\n• **Customers with Pending Dues:** ${overdueCusts.length} retailers\n• **Top Pending Customer:** ${overdueCusts[0]?.name || 'None'} (₹${(overdueCusts[0]?.balance || 0).toLocaleString('en-IN')})`,
        actionButton: {
          label: '📒 Open Credit Management',
          path: '/credit'
        },
        quickChips: ['👥 Overdue Khata Customers', '💰 Open Payments Register', '📊 Store Summary']
      };
    }

    // 5. Store / Seller Business Summary
    if (q.includes('summary') || q.includes('sales') || q.includes('today') || q.includes('report') || q.includes('business') || q.includes('performance') || q.includes('profit')) {
      const totalSalesAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalCollected = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
      const lowStockCount = products.filter(p => p.stock <= 5).length;
      const pendingReqsCount = requirements.filter(r => r.status.includes('Pending')).length;

      return {
        text: `📊 **ThreadLine Studio Business Intelligence:**\n\n• **Total Invoiced Sales:** ₹${totalSalesAmount.toLocaleString('en-IN')}\n• **Collections Recorded:** ₹${totalCollected.toLocaleString('en-IN')}\n• **Total Active Retailers:** ${customers.length}\n• **Pending Custom Requirements:** ${pendingReqsCount}\n• **Low Inventory Alerts:** ${lowStockCount} items requiring restock`,
        actionButton: {
          label: '📈 View Detailed Reports',
          path: '/reports'
        },
        quickChips: ['⚠️ Low Stock Inventory Alert', '✂️ Pending Customer Demands', '🛒 Create New Sale']
      };
    }

    // 6. Low Stock / Inventory Alert
    if (q.includes('low stock') || q.includes('inventory') || q.includes('godown') || q.includes('warehouse') || q.includes('reorder')) {
      const lowStockProds = products.filter(p => p.stock <= 5);

      if (lowStockProds.length === 0) {
        return {
          text: `✅ **Inventory Health Excellent!** All garment products currently have healthy stock levels across Godown 1 and Godown 2.`,
          quickChips: ['📊 Store Summary', '✂️ Pending Customer Demands']
        };
      }

      return {
        text: `⚠️ **Low Stock Inventory Warning (${lowStockProds.length} items):**`,
        products: lowStockProds.slice(0, 3),
        actionButton: {
          label: '🏭 Open Inventory Manager',
          path: '/inventory'
        },
        quickChips: ['➕ Add New Stock', '✂️ View Requirements', '📊 Sales Reports']
      };
    }

    // 7. Overdue Customers
    if (q.includes('overdue') || q.includes('defaulter') || q.includes('delay') || q.includes('risk')) {
      const overdueList = customers.filter(c => c.statusType === 'overdue' || c.balance > 10000);

      return {
        text: `⚠️ Found **${overdueList.length}** customer account(s) with overdue Khata balances:\n\n` +
          overdueList.map(c => `• **${c.name}** (${c.shopName || c.areaName}): ₹${(c.balance || 0).toLocaleString('en-IN')} pending`).join('\n'),
        actionButton: {
          label: '🤖 Open Risk Prediction',
          path: '/ai-prediction'
        },
        quickChips: ['📒 Credit Khata Book', '💰 Record Payment', '📍 Area Route Schedule']
      };
    }

    // 8. Festival Demand & Calendar Advisor
    if (q.includes('festival') || q.includes('diwali') || q.includes('deepavali') || q.includes('pongal') || q.includes('eid') || q.includes('ramzan') || q.includes('muhurtham') || q.includes('navratri') || q.includes('season')) {
      return {
        text: `🪔 **Festival Demand Advisor & Forecast:**\n\n• **Next Major Festival:** Deepavali / Diwali (42 Days Remaining)\n• **Advisory:** "Deepavali in 42 Days: Pre-order 150 Silk Sarees, 80 Kurti Sets & 50 Mens Kurta Sets in advance to prevent stockout."\n• **Predicted Sourcing Deficit:** +115 Silk Sarees, +80 Festive Kurtis, +52 Mens Kurta Sets\n• **Projected Revenue Opportunity:** ₹18,50,000\n\nWould you like to review the complete Festival Procurement Matrix or issue a Supplier Purchase Order?`,
        actionButton: {
          label: '🪔 Open Festival Calendar',
          path: '/festival-calendar'
        },
        quickChips: ['🪔 Deepavali Stock Deficit', '🌾 Pongal Collection', '👑 Wedding Season Demand', '💬 Broadcast WhatsApp Offer']
      };
    }

    // 9. Fabric Care & Styling Guide
    if (q.includes('fabric') || q.includes('care') || q.includes('wash') || q.includes('chanderi') || q.includes('silk') || q.includes('cotton') || q.includes('style') || q.includes('wedding')) {
      return {
        text: `🧵 **ThreadLine Garment Care & Fabric Styling Guide:**\n\n• **Chanderi & Banarasi Silk:** Dry clean only for first 3 washes. Store in muslin cloth bags to preserve natural sheen.\n• **Pure Italian Linen:** Gentle machine wash in cold water. Iron while slightly damp for crisp fall.\n• **Georgette & Net Bridal:** Steam iron only. Avoid direct perfume spray on metallic zari embroidery.\n• **Summer Recommendation:** Lightweight Muslin Cotton & Pastel Linen Kurtis are trending this season!`,
        quickChips: ['👗 Browse Silk Sarees', '➕ Request Custom Fit', '✂️ Track My Requirements']
      };
    }

    // 10. Greetings & Polite Fallback
    if (q.includes('hi') || q.includes('hello') || q.includes('vanakkam') || q.includes('namaste') || q.includes('hey') || q.includes('good morning') || q.includes('good evening')) {
      return {
        text: isCustomerRole
          ? `Vanakkam **${myCustomer.name}**! 🙏 How can I assist with your garment shopping, custom sizing, or requirement orders today?`
          : `Hello **${userRole || 'Admin'}**! Ready to assist you with sales billing, inventory tracking, and customer orders.`,
        quickChips: isCustomerRole
          ? ['👗 In-Stock Garments', '✂️ Track Requirements', '➕ Submit Dress Request', '💰 Check Balance']
          : ['📊 Today\'s Store Summary', '✂️ Pending Demands', '⚠️ Low Stock Alert', '👥 Overdue Khata']
      };
    }

    // 10. Default Intelligent Fallback
    return {
      text: `I understand you're asking about **"${rawQuery}"**.\n\nHere are some helpful things I can do for you:`,
      quickChips: isCustomerRole
        ? ['👗 In-Stock Garments', '✂️ Track Requirements', '➕ Submit Garment Request', '💰 Check My Balance', '🧵 Fabric Guide']
        : ['📊 Store Summary', '✂️ Pending Demands', '⚠️ Low Stock Alert', '👥 Overdue Khata', '📦 View Products']
    };
  };

  const handleProcessUserInput = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const token = localStorage.getItem('threadline_jwt_token') || sessionStorage.getItem('threadline_jwt_token') || '';

    try {
      // 1. Call backend REST endpoint with Bearer JWT
      const res = await fetch(`${API_BASE_URL}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: text,
          role: userRole,
          customerId: myCustomer?.id,
          customerName: myCustomer?.name,
          email: userEmail
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.answer) {
          const botMsg = {
            id: Date.now() + 1,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: data.answer,
            products: data.products,
            requirements: data.requirements,
            actionButton: data.actionButton,
            quickChips: data.quickChips
          };
          setMessages(prev => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch (e) {
      // Seamless local fallback if backend offline
    }

    // 2. Client-side NLP fallback if backend is unreachable
    setTimeout(() => {
      const response = processQuery(text);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        products: response.products,
        requirements: response.requirements,
        actionButton: response.actionButton,
        quickChips: response.quickChips
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleQuickChipClick = (chip) => {
    handleProcessUserInput(chip);
  };

  const handleClearChat = () => {
    setMessages(getInitialMessages());
  };

  return (
    <>
      {/* Floating Chat Bubble Launcher */}
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* Welcoming Greeting Tooltip */}
          {showGreetingBadge && (
            <div
              onClick={() => setIsOpen(true)}
              style={{
                background: 'var(--bg-card-solid)',
                color: 'var(--text-dark)',
                padding: '10px 16px',
                borderRadius: '24px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                border: '1px solid var(--border-gold)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'pulse 2s infinite'
              }}
            >
              <span>✨</span>
              <span>Need help? Ask <strong>ThreadLine Assistant</strong></span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGreetingBadge(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-gray)', fontSize: '14px', marginLeft: '4px' }}
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open ThreadLine Chatbot"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--accent-primary, #6B1E2B)',
              border: '2px solid var(--accent-gold)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              color: 'var(--accent-gold)',
              fontSize: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              position: 'relative'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>💬</span>
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'var(--accent-forest)',
                border: '2px solid #FFFFFF'
              }}
            />
          </button>
        </div>
      )}

      {/* Chat Window Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '10px' : '24px',
            right: isExpanded ? '10px' : '24px',
            width: isExpanded ? 'calc(100vw - 20px)' : '400px',
            maxWidth: '100%',
            height: isExpanded ? 'calc(100vh - 20px)' : '620px',
            maxHeight: '90vh',
            background: 'var(--bg-card-solid)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(43, 33, 29, 0.25), 0 0 0 1px var(--border-gold-subtle)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 99999,
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--accent-primary, #6B1E2B)',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-gold-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(201, 162, 75, 0.2)',
                  border: '1px solid var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: 'var(--accent-gold)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-serif)', letterSpacing: '0.3px', color: '#FAF6F0' }}>
                    ThreadLine Assistant
                  </h3>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-forest)' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#E8D7D9', marginTop: '2px' }}>
                  {isCustomerRole ? '🛍️ Retail Customer Assistant' : '⚡ Store ERP Co-Pilot'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleClearChat}
                title="Restart / Clear Conversation"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#CBD5E1', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🔄
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Compact View' : 'Expand View'}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#CBD5E1', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isExpanded ? '↙' : '↗'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#CBD5E1', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'var(--bg-main)'
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.sender === 'user' ? 'var(--accent-maroon)' : 'var(--card-secondary)',
                    color: msg.sender === 'user' ? '#FAF6F0' : 'var(--text-dark)',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.sender === 'user' ? '1px solid var(--accent-gold)' : '1px solid var(--border-gold-subtle)',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {/* Formatted markdown text */}
                  {msg.text.split('\n').map((line, lIdx) => {
                    // Bold highlighting
                    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return (
                      <div key={lIdx} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: lIdx < msg.text.split('\n').length - 1 ? '4px' : 0 }} />
                    );
                  })}

                  {/* Attached Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.products.map(prod => (
                        <div
                          key={prod.id}
                          style={{
                            background: 'var(--bg-main)',
                            borderRadius: '10px',
                            padding: '10px',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                          }}
                        >
                          <img
                            src={prod.img || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&q=80'}
                            alt={prod.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80';
                            }}
                            style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {prod.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                              ₹{prod.price} • {prod.stock > 0 ? `🟢 ${prod.stock} in stock` : '🔴 Out of stock'}
                            </div>
                          </div>
                          {isCustomerRole ? (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate('/requirements');
                              }}
                              style={{ padding: '5px 8px', background: 'var(--accent-terracotta)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Request
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate('/inventory');
                              }}
                              style={{ padding: '5px 8px', background: 'var(--accent-terracotta)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Stock
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Requirement Cards */}
                  {msg.requirements && msg.requirements.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.requirements.map(req => (
                        <div
                          key={req.id}
                          style={{
                            background: 'var(--bg-main)',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-terracotta)' }}>{req.id}</span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                background: req.status === 'Available' ? 'var(--status-paid-bg)' : 'var(--icon-purple-bg)',
                                color: req.status === 'Available' ? 'var(--status-paid)' : 'var(--icon-purple)'
                              }}
                            >
                              {req.status}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark)' }}>{req.garment}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                            Size: {req.size} • Color: {req.color} • Budget: ₹{req.budget}
                          </div>
                          {req.sellerNotes && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '4px', fontStyle: 'italic' }}>
                              💬 Studio Note: {req.sellerNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Action Button */}
                  {msg.actionButton && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate(msg.actionButton.path);
                      }}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '8px 14px',
                        background: 'var(--accent-terracotta)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {msg.actionButton.label}
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '10px', color: 'var(--text-gray)', marginTop: '4px', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>

                {/* Quick Reply Chips */}
                {msg.quickChips && msg.quickChips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '90%' }}>
                    {msg.quickChips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleQuickChipClick(chip)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          border: '1px solid var(--border-gold)',
                          background: 'var(--bg-card-solid)',
                          color: 'var(--text-dark)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent-maroon)';
                          e.currentTarget.style.color = '#FAF6F0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-card-solid)';
                          e.currentTarget.style.color = 'var(--text-dark)';
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'var(--bg-card-solid)', borderRadius: '16px', width: 'fit-content', border: '1px solid var(--border-gold-subtle)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-maroon)', animation: 'pulse 1s infinite' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-maroon)', animation: 'pulse 1s infinite 0.2s' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-maroon)', animation: 'pulse 1s infinite 0.4s' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>ThreadLine Assistant is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-card-solid)',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {/* Voice Input Microphone */}
            <button
              onClick={handleToggleVoice}
              title={isListening ? 'Listening... click to stop' : 'Click to speak'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isListening ? '#EF4444' : 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                color: isListening ? '#FFFFFF' : 'var(--text-dark)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                animation: isListening ? 'pulse 1s infinite' : 'none'
              }}
            >
              🎤
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder={isCustomerRole ? "Ask about garments, check stock, or request order..." : "Ask business summary, pending demands, stock..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcessUserInput();
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-main)',
                fontSize: '13px',
                color: 'var(--text-dark)',
                outline: 'none'
              }}
            />

            {/* Send Button */}
            <button
              onClick={() => handleProcessUserInput()}
              disabled={!inputText.trim()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: inputText.trim() ? 'var(--accent-maroon)' : 'var(--bg-main)',
                border: inputText.trim() ? '1px solid var(--accent-gold)' : '1px solid var(--border-gold-subtle)',
                color: inputText.trim() ? '#FAF6F0' : 'var(--text-muted)',
                cursor: inputText.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: inputText.trim() ? '0 4px 12px rgba(107, 30, 43, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
