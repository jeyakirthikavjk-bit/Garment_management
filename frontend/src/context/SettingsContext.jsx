import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const FONTS_LIST = [
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    category: 'Modern Sans (Default)',
    family: "'Plus Jakarta Sans', sans-serif",
    preview: 'Luxury Fashion Studio 2026'
  },
  {
    id: 'Inter',
    name: 'Inter',
    category: 'Clean & Neutral',
    family: "'Inter', sans-serif",
    preview: 'High Legibility & Modern UI'
  },
  {
    id: 'Outfit',
    name: 'Outfit',
    category: 'Contemporary Fashion',
    family: "'Outfit', sans-serif",
    preview: 'Premium Haute Couture Style'
  },
  {
    id: 'Poppins',
    name: 'Poppins',
    category: 'Geometric Rounded',
    family: "'Poppins', sans-serif",
    preview: 'Smooth & Friendly Apparel Interface'
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    category: 'Editorial Serif',
    family: "'Playfair Display', serif",
    preview: 'Classic Royal Elegance'
  },
  {
    id: 'Cormorant Garamond',
    name: 'Cormorant Garamond',
    category: 'Haute Couture Serif',
    family: "'Cormorant Garamond', serif",
    preview: 'Timeless Luxury Tailoring'
  },
  {
    id: 'Cinzel',
    name: 'Cinzel',
    category: 'Imperial Ledger Serif',
    family: "'Cinzel', serif",
    preview: 'CLASSIC HERITAGE MONOGRAM'
  }
];

export const FONT_SIZES_LIST = [
  { id: 'small', label: 'Compact', scale: '90%', size: '13px', desc: 'Dense data display' },
  { id: 'normal', label: 'Default', scale: '100%', size: '14px', desc: 'Standard optimal scale' },
  { id: 'medium', label: 'Comfortable', scale: '110%', size: '15.5px', desc: 'Easy on the eyes' },
  { id: 'large', label: 'Large', scale: '120%', size: '17px', desc: 'High visibility & readability' }
];

import { TRANSLATIONS, LANGUAGES_LIST } from './translations';
export { TRANSLATIONS, LANGUAGES_LIST };

export const DEFAULT_STORE_SETTINGS = {
  storeName: 'ThreadLine Garments & Haute Couture',
  storeTagline: 'Sales, Wholesale Distribution & Khata Ledger Suite',
  storeAddress: 'C.G. Road, Navrangpura, Ahmedabad, Gujarat 380009',
  contactEmail: 'admin@threadline.com',
  contactPhone: '+91 9663618684',
  adminName: 'Jeya',
  adminPassword: 'adminpassword123',

  // Tax & GST
  enableGst: true,
  gstin: '24AAAAA0000A1Z5',
  panNumber: 'AAACA1234F',
  stateJurisdiction: '24 - Gujarat',
  gstRate: '5',
  hsnCode: '6203',

  // Bank & UPI Settlement Details
  bankName: 'HDFC Bank Ltd.',
  bankAccountNo: '50200012345678',
  bankIfsc: 'HDFC0000006',
  bankBranch: 'Navrangpura Branch, Ahmedabad',
  upiId: 'threadline@okhdfcbank',
  upiName: 'ThreadLine Garments Ahmedabad',

  // Invoice Printing
  paperSize: 'thermal',
  printLogo: true,
  footerMessage: 'Thank you for shopping at ThreadLine!\nExchange within 7 days with original tag.',
  termsConditions: '1. Goods once sold will be exchanged within 7 days in original condition with tags intact.\n2. Overdue interest @ 18% p.a. applies after 30 days credit limit.\n3. Subject to Ahmedabad jurisdiction only.',

  // Backup
  autoBackup: true,

  // Google OAuth
  googleClientId: ''
};

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('threadline_theme') || 'classic';
  });

  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('threadline_language') || 'en';
  });

  const [fontFamily, setFontFamilyState] = useState(() => {
    return localStorage.getItem('threadline_font_family') || 'Plus Jakarta Sans';
  });

  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('threadline_font_size') || 'normal';
  });

  const [storeSettings, setStoreSettingsState] = useState(() => {
    try {
      const saved = localStorage.getItem('threadline_store_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adminName === 'Super Admin' || !parsed.adminName) parsed.adminName = 'Jeya';
        if (parsed.contactPhone === '+91 98765 12345' || parsed.contactPhone === '+91 98765 00000' || !parsed.contactPhone) {
          parsed.contactPhone = '+91 9663618684';
        }
        const merged = { ...DEFAULT_STORE_SETTINGS, ...parsed };
        try {
          localStorage.setItem('threadline_store_settings', JSON.stringify(merged));
        } catch (e) {
          // ignore
        }
        return merged;
      }
    } catch (e) {
      console.warn('Error reading store settings from localStorage:', e);
    }
    return DEFAULT_STORE_SETTINGS;
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('threadline_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('threadline_language', newLang);
    document.documentElement.setAttribute('lang', newLang);
  };

  const setFontFamily = (newFont) => {
    setFontFamilyState(newFont);
    localStorage.setItem('threadline_font_family', newFont);
    const selectedFont = FONTS_LIST.find(f => f.id === newFont || f.name === newFont);
    const familyVal = selectedFont ? selectedFont.family : `'${newFont}', sans-serif`;
    document.documentElement.style.setProperty('--font-family-base', familyVal);
    document.body.style.setProperty('--font-family-base', familyVal);
  };

  const applyFontSize = (newSize) => {
    const sizeObj = FONT_SIZES_LIST.find(s => s.id === newSize) || FONT_SIZES_LIST[1];
    document.documentElement.setAttribute('data-font-size', sizeObj.id);
    document.body.setAttribute('data-font-size', sizeObj.id);

    const scaleMap = {
      small: 0.90,
      normal: 1.0,
      medium: 1.12,
      large: 1.25
    };
    const scaleFactor = scaleMap[sizeObj.id] || 1.0;

    // Set font scale CSS custom properties ONLY (NO ZOOM)
    document.documentElement.style.setProperty('--font-size-scale', sizeObj.size);
    document.documentElement.style.setProperty('--font-scale-factor', `${scaleFactor}`);
    document.documentElement.style.setProperty('--font-scale', `${scaleFactor}`);
    document.documentElement.style.setProperty('--font-size-base', sizeObj.size);
    document.documentElement.style.fontSize = sizeObj.size;

    // Explicitly remove zoom so the page layout/boxes never zoom in or out
    document.documentElement.style.removeProperty('zoom');
    document.body.style.removeProperty('zoom');
  };

  const setFontSize = (newSize) => {
    setFontSizeState(newSize);
    localStorage.setItem('threadline_font_size', newSize);
    applyFontSize(newSize);
  };

  const updateStoreSettings = (newSettings) => {
    const updated = { ...storeSettings, ...newSettings };
    setStoreSettingsState(updated);
    try {
      localStorage.setItem('threadline_store_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving store settings:', e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  useEffect(() => {
    const selectedFont = FONTS_LIST.find(f => f.id === fontFamily || f.name === fontFamily);
    const familyVal = selectedFont ? selectedFont.family : `'${fontFamily}', sans-serif`;
    document.documentElement.style.setProperty('--font-family-base', familyVal);
    document.body.style.setProperty('--font-family-base', familyVal);
  }, [fontFamily]);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const t = (keyOrText, fallback) => {
    if (!keyOrText) return '';
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;

    // 1. Direct dictionary key match (e.g. t('dashboard') or t('systemSettings'))
    if (langDict[keyOrText] !== undefined) {
      return langDict[keyOrText];
    }

    // 2. Reverse match: if an English text/phrase is passed (e.g. t('Dashboard') or t('Cancel'))
    if (language !== 'en' && TRANSLATIONS.en) {
      const trimmed = typeof keyOrText === 'string' ? keyOrText.trim() : keyOrText;
      const matchingKey = Object.keys(TRANSLATIONS.en).find(
        k => TRANSLATIONS.en[k] === trimmed ||
          (typeof TRANSLATIONS.en[k] === 'string' && TRANSLATIONS.en[k].toLowerCase() === trimmed.toLowerCase()) ||
          k.toLowerCase() === trimmed.toLowerCase()
      );
      if (matchingKey && langDict[matchingKey] !== undefined) {
        return langDict[matchingKey];
      }

      // 3. Reverse match fallback phrase (e.g. t('financialLedgerTitle', 'Financial Ledger & Khata Credit Control'))
      if (fallback && typeof fallback === 'string') {
        const trimmedFallback = fallback.trim();
        if (langDict[trimmedFallback] !== undefined) {
          return langDict[trimmedFallback];
        }
        const fallbackMatchKey = Object.keys(TRANSLATIONS.en).find(
          k => TRANSLATIONS.en[k] === trimmedFallback ||
            (typeof TRANSLATIONS.en[k] === 'string' && TRANSLATIONS.en[k].toLowerCase() === trimmedFallback.toLowerCase()) ||
            k.toLowerCase() === trimmedFallback.toLowerCase()
        );
        if (fallbackMatchKey && langDict[fallbackMatchKey] !== undefined) {
          return langDict[fallbackMatchKey];
        }
      }
    }

    if (fallback !== undefined) return fallback;
    return (TRANSLATIONS.en && TRANSLATIONS.en[keyOrText]) || keyOrText;
  };

  return (
    <SettingsContext.Provider value={{
      theme,
      setTheme,
      language,
      setLanguage,
      fontFamily,
      setFontFamily,
      fontSize,
      setFontSize,
      fontsList: FONTS_LIST,
      fontSizesList: FONT_SIZES_LIST,
      languagesList: LANGUAGES_LIST,
      storeSettings,
      updateStoreSettings,
      t,
      translations: TRANSLATIONS[language] || TRANSLATIONS.en
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
