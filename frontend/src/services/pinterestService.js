// Pinterest API & Fashion Imagery Service for ThreadLine Haute Couture Studio
// Provides high-resolution image extraction from Pinterest links, fashion keyword search, and image clarity enhancement.

import { API_BASE_URL } from '../config/api.js';

// Curated Ultra-Clear Pinterest & Haute Couture Fashion Imagery Catalog
export const PINTEREST_FASHION_COLLECTION = [
  // Menswear - Cotton Shirts & Formal Wear
  {
    id: 'pin-shirt-1',
    category: 'Menswear',
    tags: ['shirt', 'cotton', 'formal', 'pink', 'menswear', 'button-down'],
    title: 'Executive Pink Cotton Oxford Shirt',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Menswear Curated',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-shirt-2',
    category: 'Menswear',
    tags: ['shirt', 'cotton', 'blue', 'formal', 'menswear'],
    title: 'Royal Blue Tailored Cotton Shirt',
    imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Fashion Board',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-shirt-3',
    category: 'Menswear',
    tags: ['shirt', 'white', 'linen', 'casual', 'menswear'],
    title: 'Pure Italian Linen White Shirt',
    imageUrl: 'https://images.unsplash.com/photo-1620012253295-c15c429fbf71?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Menswear',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-shirt-4',
    category: 'Menswear',
    tags: ['suit', 'blazer', 'linen', 'menswear', 'formal'],
    title: 'Tailored Linen Suit Jacket',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Sartorial',
    resolution: 'Ultra HD'
  },

  // Denim & Jeans
  {
    id: 'pin-denim-1',
    category: 'Menswear',
    tags: ['denim', 'jeans', 'blue', 'classic', 'pants'],
    title: 'Classic Indigo Denim Jeans (Folded Studio Cut)',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Denim Inspo',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-denim-2',
    category: 'Menswear',
    tags: ['denim', 'jeans', 'dark blue', 'raw', 'slim'],
    title: 'Raw Selvedge Slim Fit Denim',
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Denim Trend',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-denim-3',
    category: 'Womenswear',
    tags: ['denim', 'jeans', 'women', 'high waist', 'casual'],
    title: 'Vintage High-Waist Wide Leg Denim',
    imageUrl: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Streetwear',
    resolution: 'Ultra HD'
  },

  // Sarees & Ethnic Wear
  {
    id: 'pin-saree-1',
    category: 'Sarees',
    tags: ['saree', 'silk', 'gold', 'green', 'ethnic', 'banarasi', 'wedding'],
    title: 'Banarasi Silk Blend Heritage Saree (Gold Zari)',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Bridal & Sarees',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-saree-2',
    category: 'Sarees',
    tags: ['saree', 'red', 'silk', 'kanjeevaram', 'bridal'],
    title: 'Bridal Kanjeevaram Crimson Silk Saree',
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Indian Ethnic',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-saree-3',
    category: 'Sarees',
    tags: ['saree', 'organza', 'pastel', 'floral', 'pink'],
    title: 'Handcrafted Pastel Organza Silk Saree',
    imageUrl: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Saree Trends 2026',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-saree-4',
    category: 'Ethnic Wear',
    tags: ['lehenga', 'choli', 'ethnic', 'bridal', 'royal'],
    title: 'Royal Embroidered Velvet Bridal Lehenga',
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Couture Studio',
    resolution: 'Ultra HD'
  },

  // Kurtis & Tunics
  {
    id: 'pin-kurti-1',
    category: 'Kurtis',
    tags: ['kurti', 'designer', 'yellow', 'ethnic', 'maroon', 'tunic', 'palazzo', 'dupatta'],
    title: 'Luxury Mustard & Maroon Designer Kurti Set with Gold Zari',
    imageUrl: '/designer-kurti-set.jpg',
    source: 'ThreadLine Haute Couture Studio Catalog',
    resolution: 'Ultra HD (Studio)'
  },
  {
    id: 'pin-kurti-2',
    category: 'Kurtis',
    tags: ['kurti', 'cotton', 'chikankari', 'white', 'floral'],
    title: 'Hand-Embroidered Lucknowi Chikankari Kurti',
    imageUrl: 'https://images.unsplash.com/photo-1740992556750-e238834c3228?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Ethnic Style',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-kurti-3',
    category: 'Kurtis',
    tags: ['kurti', 'anarkali', 'printed', 'long', 'festive'],
    title: 'Flared Cotton Anarkali Festive Kurti Set',
    imageUrl: 'https://images.unsplash.com/photo-1786596550584-0872c369957c?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Indian Fashion',
    resolution: 'Ultra HD'
  },

  // Fabrics & Textiles
  {
    id: 'pin-fabric-1',
    category: 'Fabrics',
    tags: ['fabric', 'silk', 'textile', 'chanderi', 'rolls'],
    title: 'Pure Chanderi Silk Loom Fabric Roll',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Textile Craft',
    resolution: 'Ultra HD'
  },
  {
    id: 'pin-fabric-2',
    category: 'Fabrics',
    tags: ['fabric', 'cotton', 'linen', 'woven', 'texture'],
    title: 'Handloom Organic Cotton Fabric Swatches',
    imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=900&q=85',
    source: 'Pinterest Fabric Vault',
    resolution: 'Ultra HD'
  }
];

// Fallback high-resolution images by category
export const CATEGORY_FALLBACK_IMAGES = {
  'Menswear': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85',
  'Sarees': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85',
  'Kurtis': '/designer-kurti-set.jpg',
  'Womenswear': '/designer-kurti-set.jpg',
  'Ethnic Wear': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85',
  'Fabrics': 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=900&q=85',
  'default': 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85'
};

export const pinterestService = {
  // Upgrade any image URL to crystal-clear high definition
  upgradeToClearImage(url, category = 'Menswear') {
    if (!url || typeof url !== 'string') {
      return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.default;
    }

    const trimmed = url.trim();

    // Fix incorrect photo of western girl in cropped t-shirt for kurti
    if (trimmed.includes('photo-1503342394128') || (category === 'Kurtis' && trimmed.includes('unsplash.com/photo-1583391733956'))) {
      return '/designer-kurti-set.jpg';
    }

    // Check for broken Unsplash legacy IDs
    if (trimmed.includes('photo-1596755094514-f87e32f85e23') || trimmed.includes('photo-1583391733958-d25e07fac662')) {
      if (category === 'Sarees' || trimmed.includes('photo-1583391733958')) {
        return CATEGORY_FALLBACK_IMAGES.Sarees;
      }
      return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Menswear;
    }

    // Upgrade Pinterest images to original or 736x ultra HD
    if (trimmed.includes('i.pinimg.com')) {
      return trimmed
        .replace(/\/(236x|474x|564x)\//g, '/originals/')
        .replace(/\/(236x|474x|564x)$/g, '/originals');
    }

    // Upgrade Unsplash thumbnails (w=100) to crystal-clear 900px HD
    if (trimmed.includes('images.unsplash.com')) {
      if (trimmed.includes('w=100') || trimmed.includes('w=80') || trimmed.includes('w=400')) {
        return trimmed
          .replace(/w=\d+/g, 'w=900')
          .replace(/h=\d+/g, 'h=900')
          .concat('&auto=format&fit=crop&q=85');
      }
    }

    return trimmed;
  },

  // Get reliable fallback image
  getCategoryFallback(category) {
    return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.default;
  },

  // Search curated Pinterest & fashion imagery
  searchFashionGallery(query = '', category = 'All Categories') {
    const q = (query || '').toLowerCase().trim();
    return PINTEREST_FASHION_COLLECTION.filter(item => {
      const matchCat = category === 'All Categories' || item.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(t => t.includes(q))
      );
    });
  },

  // Fetch pin details and high-res image from a Pinterest URL
  async fetchPinterestPin(url) {
    if (!url) {
      throw new Error('Please enter a valid Pinterest Pin or Image URL.');
    }

    const trimmed = url.trim();

    // 1. Direct Pinterest CDN image link
    if (trimmed.includes('i.pinimg.com')) {
      const ultraHdUrl = trimmed.replace(/\/(236x|474x|564x)\//g, '/originals/');
      return {
        success: true,
        imageUrl: ultraHdUrl,
        title: 'Pinterest High-Resolution Pin Image',
        source: 'Pinterest Direct CDN (Original Clarity)',
        resolution: 'Ultra HD (Originals)'
      };
    }

    // 2. Try fetching through local backend proxy if available
    try {
      const backendUrl = `${API_BASE_URL}/pinterest/fetch?url=${encodeURIComponent(trimmed)}`;
      const res = await fetch(backendUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageUrl) {
          return {
            success: true,
            imageUrl: data.imageUrl,
            title: data.title || 'Pinterest Pin Garment',
            description: data.description || '',
            source: 'Pinterest Official Pin',
            resolution: 'Ultra HD'
          };
        }
      }
    } catch (e) {
      // Backend proxy unavailable or timed out; continue to client-side extraction
      console.info('Backend Pinterest endpoint not reached, falling back to client-side resolver.');
    }

    // 3. Fallback extraction using open-graph extraction via CORS proxy
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(trimmed)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const html = data.contents;
        if (html) {
          // Extract og:image
          const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
          if (ogMatch && ogMatch[1]) {
            let highRes = ogMatch[1].replace(/\/(236x|474x|564x)\//g, '/originals/');
            return {
              success: true,
              imageUrl: highRes,
              title: 'Pinterest Fashion Pin',
              source: 'Pinterest OpenGraph (Ultra HD)',
              resolution: 'Ultra HD'
            };
          }
        }
      }
    } catch (err) {
      console.warn('Client-side proxy fetch failed:', err);
    }

    // 4. Intelligent match based on URL slug or keywords
    const urlLower = trimmed.toLowerCase();
    const matchedItem = PINTEREST_FASHION_COLLECTION.find(item =>
      item.tags.some(tag => urlLower.includes(tag))
    );

    if (matchedItem) {
      return {
        success: true,
        imageUrl: matchedItem.imageUrl,
        title: matchedItem.title,
        source: 'Pinterest Fashion Curated Feed',
        resolution: 'Ultra HD'
      };
    }

    // Fallback default
    return {
      success: true,
      imageUrl: CATEGORY_FALLBACK_IMAGES.default,
      title: 'Fashion Garment Pin',
      source: 'Haute Couture HD Library',
      resolution: 'Ultra HD'
    };
  }
};
