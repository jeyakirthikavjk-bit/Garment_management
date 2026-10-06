/**
 * ThreadLine Garment ERP - Smart Product Recommendation Service
 * Analyzes customer store profiles, past order patterns, category affinities, 
 * product profitability, and current warehouse stock to recommend top products.
 */

/**
 * Detect customer category affinity based on shop name, customer notes, and past sales
 * @param {Object} customer
 * @param {Array} customerSales
 * @param {Array} customerRequirements
 * @returns {Object} Affinity scores and detected niche
 */
export function getCustomerAffinity(customer = {}, customerSales = [], customerRequirements = []) {
  const safeCustomer = customer || {};
  const safeSales = Array.isArray(customerSales) ? customerSales : [];
  const safeReqs = Array.isArray(customerRequirements) ? customerRequirements : [];

  const textCorpus = [
    safeCustomer.name || '',
    safeCustomer.shopName || '',
    safeCustomer.notes || '',
    safeCustomer.areaName || '',
    ...safeSales.map(s => (s && s.items) || ''),
    ...safeReqs.map(r => `${(r && r.garment) || ''} ${(r && r.notes) || ''}`)
  ].join(' ').toLowerCase();

  const affinities = {
    Sarees: 0,
    Kurtis: 0,
    Menswear: 0,
    'Ethnic Wear': 0,
    Fabrics: 0,
    Womenswear: 0
  };

  // Keyword mappings
  if (textCorpus.includes('saree') || textCorpus.includes('silk') || textCorpus.includes('banarasi') || textCorpus.includes('kanjeevaram') || textCorpus.includes('organza')) {
    affinities.Sarees += 45;
  }
  if (textCorpus.includes('kurti') || textCorpus.includes('anarkali') || textCorpus.includes('chikankari') || textCorpus.includes('palazzo') || textCorpus.includes('boutique')) {
    affinities.Kurtis += 45;
    affinities.Womenswear += 25;
  }
  if (textCorpus.includes('menswear') || textCorpus.includes('men') || textCorpus.includes('shirt') || textCorpus.includes('denim') || textCorpus.includes('jeans') || textCorpus.includes('suit') || textCorpus.includes('linen')) {
    affinities.Menswear += 45;
  }
  if (textCorpus.includes('bridal') || textCorpus.includes('wedding') || textCorpus.includes('lehenga') || textCorpus.includes('ethnic')) {
    affinities['Ethnic Wear'] += 45;
    affinities.Sarees += 20;
  }
  if (textCorpus.includes('fabric') || textCorpus.includes('handloom') || textCorpus.includes('loom') || textCorpus.includes('cotton swatches') || textCorpus.includes('roll')) {
    affinities.Fabrics += 45;
  }

  // Count past purchase items
  safeSales.forEach(s => {
    if (!s) return;
    const items = (s.items || '').toLowerCase();
    if (items.includes('saree')) affinities.Sarees += 15;
    if (items.includes('kurti')) affinities.Kurtis += 15;
    if (items.includes('shirt') || items.includes('denim') || items.includes('jeans') || items.includes('suit')) affinities.Menswear += 15;
    if (items.includes('lehenga')) affinities['Ethnic Wear'] += 15;
    if (items.includes('fabric') || items.includes('swatches')) affinities.Fabrics += 15;
  });

  // Determine primary and secondary niches
  const sortedAffinities = Object.entries(affinities).sort((a, b) => b[1] - a[1]);
  const primaryNiche = sortedAffinities[0][1] > 0 ? sortedAffinities[0][0] : 'All-Round Retailer';
  const secondaryNiche = sortedAffinities[1][1] > 0 ? sortedAffinities[1][0] : null;

  return { affinities, primaryNiche, secondaryNiche };
}

/**
 * Compute personalized product recommendations for a specific customer
 * @param {Object} options
 * @param {Object} options.customer
 * @param {Array} options.products
 * @param {Array} options.customerSales
 * @param {Array} options.customerRequirements
 * @param {number} [options.limit=8]
 * @returns {Array} List of scored and explained product recommendations
 */
export function getRecommendedProductsForCustomer({
  customer = {},
  products = [],
  customerSales = [],
  customerRequirements = [],
  limit = 8
}) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const safeCustomer = customer || {};
  const safeSales = Array.isArray(customerSales) ? customerSales : [];
  const safeReqs = Array.isArray(customerRequirements) ? customerRequirements : [];

  const { affinities, primaryNiche } = getCustomerAffinity(safeCustomer, safeSales, safeReqs);

  const scoredProducts = products.filter(Boolean).map(product => {
    let score = 50; // base score
    const reasons = [];

    const category = product.category || 'Menswear';
    const catAffinity = affinities[category] || 0;

    // 1. Category Affinity Match
    if (catAffinity > 0) {
      const affinityBoost = Math.min(35, catAffinity);
      score += affinityBoost;
      reasons.push(`Matches store niche (${category})`);
    }

    // 2. Best-seller and popularity
    if (product.isBestSeller) {
      score += 15;
      reasons.push(product.bestSellerCategory ? `Best Seller ${product.bestSellerCategory}` : 'High Wholesale Demand');
    }
    if (product.isAmazonsChoice) {
      score += 10;
      reasons.push('High Market Demand & Ratings');
    }

    // 3. Customer Rating
    if (product.rating && Number(product.rating) >= 4.5) {
      score += 8;
    }

    // 4. Stock Availability
    const stockNum = Number(product.stock) || 0;
    if (stockNum > 10) {
      score += 10;
      reasons.push(`Ready in Stock (${stockNum} pcs available)`);
    } else if (stockNum > 0) {
      score += 5;
      reasons.push(`Low Stock Alert: Only ${stockNum} pcs left`);
    } else {
      score -= 15; // Out of stock penalty
      reasons.push('Currently Out of Stock (Pre-order / Backorder)');
    }

    // 5. Margin Opportunity (Retailer Profit Potential)
    const priceNum = Number(product.price) || 0;
    const mrpNum = Number(product.mrp) || priceNum;
    const marginAmount = Math.max(0, mrpNum - priceNum);
    const marginPercent = mrpNum > 0 ? Math.round((marginAmount / mrpNum) * 100) : 0;
    if (marginPercent >= 35) {
      score += 8;
      reasons.push(`${marginPercent}% Retail Margin Opportunity`);
    }

    // 6. Direct Match with Customer Stock Demands
    const matchesReq = safeReqs.some(req => {
      if (!req) return false;
      const garment = (req.garment || '').toLowerCase().trim();
      const pName = (product.name || '').toLowerCase();
      return (garment && category.toLowerCase().includes(garment)) || (garment && pName.includes(garment));
    });
    if (matchesReq) {
      score += 25;
      reasons.unshift('Direct match with customer stock inquiry');
    }

    // Clamp match percentage between 60% and 99%
    const matchScore = Math.min(99, Math.max(62, Math.round(score)));

    return {
      ...product,
      matchScore,
      marginAmount,
      marginPercent,
      primaryReason: reasons[0] || 'Popular commercial favorite',
      allReasons: reasons
    };
  });

  // Sort by match score descending, then by stock
  scoredProducts.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.stock || 0) - (a.stock || 0);
  });

  return scoredProducts.slice(0, limit);
}

/**
 * Builds a ready-to-share promotional WhatsApp pitch for a recommended product
 */
export function buildProductRecommendationPitch({ customer, product, storeSettings = {} }) {
  const storeName = storeSettings.storeName || 'ThreadLine Garments';
  const customerName = customer?.name || 'Valued Partner';
  const shopName = customer?.shopName ? ` (${customer.shopName})` : '';
  const price = Number(product.price || 0).toLocaleString('en-IN');
  const mrp = Number(product.mrp || product.price || 0).toLocaleString('en-IN');
  const marginPercent = product.mrp ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  return `✨ *Exclusive Catalog Recommendation for ${customerName}${shopName}*
From: *${storeName}*

Hello ${customerName}, we have hand-picked our top-performing item specially for your store:

📌 *${product.name}*
🏷️ *Category:* ${product.category || 'Garments'}
⭐ *Rating:* ${product.rating || '4.8'} (${product.reviewsCount || 500}+ verified reviews)
📦 *Available Stock:* ${product.stock > 0 ? `${product.stock} units ready for immediate dispatch` : 'Pre-order Booking Open'}

💰 *Special Wholesale Price:* ₹${price} (MRP: ₹${mrp})
📈 *Estimated Profit Margin:* ~${marginPercent}% for your store!
🧵 *Fabric / Specs:* ${product.fabric || product.details || 'Premium Export Quality'}

Would you like us to include this in your upcoming order or delivery run?
Reply to confirm the quantity!`;
}
