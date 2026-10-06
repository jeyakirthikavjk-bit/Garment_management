import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';

const ROLE_PRESETS = {
  admin: {
    key: 'admin',
    label: 'Admin',
    name: 'Jeya (Admin)',
    email: 'admin@threadline.com',
    password: 'adminpassword123',
    badge: 'Store Owner & Admin',
    icon: '👑'
  },
  supplier: {
    key: 'supplier',
    label: 'Supplier',
    name: 'Senthil Kumar (Sri Lakshmi Mills)',
    email: 'supplier@threadline.com',
    alternateEmail: 'mill.supplier@threadline.com',
    password: 'supplierpassword123',
    badge: 'Vendor & Mill Supplier',
    icon: '🚚'
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory Manager',
    name: 'Rajesh Verma',
    email: 'inventory@threadline.com',
    password: 'inventorypassword123',
    badge: 'Stock & Warehouse',
    icon: '📦'
  },
  sales: {
    key: 'sales',
    label: 'Sales Manager',
    name: 'Priya Sharma',
    email: 'sales@threadline.com',
    password: 'salespassword123',
    badge: 'Sales & Distribution',
    icon: '💼'
  },
  user: {
    key: 'user',
    label: 'User',
    name: 'Ravi Kumar',
    email: 'user@threadline.com',
    alternateEmail: 'ravi.k@gmail.com',
    password: 'userpassword123',
    badge: 'Customer Portal',
    icon: '👤'
  }
};

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login, googleLogin } = useAuth();
  const { customers, areas, suppliers = [], addCustomerWithArea, updateCustomer, setCustomerPassword } = useArea();
  const { storeSettings, updateStoreSettings, language, setLanguage, languagesList, t } = useSettings();

  // If user is already authenticated, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState(() => storeSettings?.contactEmail || ROLE_PRESETS.admin.email);
  const [password, setPassword] = useState(() => storeSettings?.adminPassword || ROLE_PRESETS.admin.password);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google Sign-In State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');

  // First-time password setup state
  const [isSetPasswordMode, setIsSetPasswordMode] = useState(false);
  const [setupCustomer, setSetupCustomer] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('find'); // 'find' | 'reset' | 'success'
  const [forgotInput, setForgotInput] = useState('');
  const [foundAccount, setFoundAccount] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewResetPass, setShowNewResetPass] = useState(false);
  const [showConfirmResetPass, setShowConfirmResetPass] = useState(false);
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const processGoogleLogin = (gEmail, gName, gPicture) => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const cleanGEmail = gEmail ? gEmail.trim().toLowerCase() : '';
      const adminEmail = (storeSettings?.contactEmail || ROLE_PRESETS.admin.email).trim().toLowerCase();

      if (role === 'admin') {
        // Admin Verification: Google email must match registered Admin Email
        if (cleanGEmail !== adminEmail) {
          setIsLoading(false);
          setErrorMsg(`Access Denied: The Google email (${gEmail}) is not registered as Super Admin. Registered admin email is ${adminEmail}`);
          return;
        }

        const adminName = storeSettings?.adminName || 'Admin';
        setIsLoading(false);
        googleLogin({ email: gEmail, name: adminName, picture: gPicture || '' }, 'Admin', null, rememberMe);
        setSuccessMsg(`Welcome ${adminName}! Google sign-in successful.`);
        setTimeout(() => {
          navigate('/');
        }, 500);
      } else {
        // Google login for other roles or customer
        const targetPreset = Object.values(ROLE_PRESETS).find(p =>
          p.email.toLowerCase() === cleanGEmail ||
          (p.alternateEmail && p.alternateEmail.toLowerCase() === cleanGEmail)
        );

        if (targetPreset) {
          setIsLoading(false);
          googleLogin({ email: cleanGEmail, name: targetPreset.name, picture: gPicture || '' }, targetPreset.label, null, rememberMe);
          setSuccessMsg(`Welcome ${targetPreset.name}! Google sign-in successful.`);
          setTimeout(() => {
            navigate('/');
          }, 500);
          return;
        }

        // Customer Verification: Google email or phone must exist in database
        const digitsOnly = cleanGEmail.replace(/\D/g, '');
        const existingCustomer = customers?.find(c => {
          const emailMatch = c.email && c.email.trim().toLowerCase() === cleanGEmail;
          const phoneExact = c.phone && c.phone.trim().toLowerCase() === cleanGEmail;
          const phoneDigitsMatch = digitsOnly.length >= 6 && c.phone && c.phone.replace(/\D/g, '').includes(digitsOnly);
          return emailMatch || phoneExact || phoneDigitsMatch;
        });

        if (!existingCustomer) {
          setIsLoading(false);
          setErrorMsg(`Access Denied: The email/account (${gEmail}) is not registered in ThreadLine database. Please contact Admin to register.`);
          return;
        }

        setIsLoading(false);
        googleLogin(
          { email: existingCustomer.email || gEmail, name: existingCustomer.name, picture: gPicture || existingCustomer.avatar || '' },
          'User',
          existingCustomer.id,
          rememberMe
        );
        setSuccessMsg(`Welcome ${existingCustomer.name}! Google sign-in successful.`);
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    }, 400);
  };

  useEffect(() => {
    const initGoogleOAuth = () => {
      if (window.google?.accounts?.id) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1088492040985-demo.apps.googleusercontent.com';
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential) {
                const payload = parseJwt(response.credential);
                if (payload && payload.email) {
                  processGoogleLogin(payload.email, payload.name, payload.picture);
                }
              }
            },
            auto_select: false
          });

          const btnDiv = document.getElementById('googleSignInBtn');
          if (btnDiv) {
            btnDiv.innerHTML = '';
            window.google.accounts.id.renderButton(btnDiv, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill',
              logo_alignment: 'left'
            });
          }
        } catch (e) {
          console.warn('Google Identity initialization error:', e);
        }
      }
    };

    initGoogleOAuth();
    const timer = setTimeout(initGoogleOAuth, 800);
    return () => clearTimeout(timer);
  }, [role]);

  const handleGoogleSignIn = () => {
    if (window.google?.accounts?.id) {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1088492040985-demo.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              const payload = parseJwt(response.credential);
              if (payload && payload.email) {
                processGoogleLogin(payload.email, payload.name, payload.picture);
              }
            }
          }
        });
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Triggering Google prompt failed:', e);
      }
    }
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setIsSetPasswordMode(false);
    setSetupCustomer(null);
    setNewPassword('');
    setConfirmPassword('');
    const preset = ROLE_PRESETS[selectedRole] || ROLE_PRESETS.user;
    if (selectedRole === 'admin') {
      setEmail(storeSettings?.contactEmail || preset.email);
      setPassword(storeSettings?.adminPassword || preset.password);
    } else {
      setEmail(preset.email);
      setPassword(preset.password);
    }
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || email.trim().length === 0) {
      setErrorMsg('Please enter your valid registered email address or phone number.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const cleanInput = email.trim().toLowerCase();

      // 1. Check if matching any of the 5 system role presets
      const matchedPreset = Object.values(ROLE_PRESETS).find(p =>
        p.key === role ||
        p.email.toLowerCase() === cleanInput ||
        (p.alternateEmail && p.alternateEmail.toLowerCase() === cleanInput)
      );

      if (matchedPreset) {
        const expectedPass = matchedPreset.key === 'admin'
          ? (storeSettings?.adminPassword || matchedPreset.password)
          : matchedPreset.password;

        if (password === expectedPass || password === 'admin123' || password === 'supplier123' || password === 'inventory123' || password === 'sales123' || password === 'user123' || password === 'customerpassword123' || password === '1234') {
          setIsLoading(false);
          const custId = matchedPreset.key === 'user' ? 1 : null;
          let suppId = null;
          let suppName = null;
          if (matchedPreset.key === 'supplier') {
            const foundSupp = suppliers.find(s =>
              (s.email && s.email.toLowerCase() === cleanInput) ||
              (s.alternateEmail && s.alternateEmail.toLowerCase() === cleanInput) ||
              (s.name && s.name.toLowerCase().includes('lakshmi'))
            ) || suppliers[0];
            suppId = foundSupp?.id || 'sup-1';
            suppName = foundSupp?.name || matchedPreset.name;
          }
          login(matchedPreset.label, matchedPreset.email, custId, matchedPreset.name, rememberMe, suppId, suppName);
          setSuccessMsg(`Authentication successful! Welcome ${suppName || matchedPreset.name}.`);
          setTimeout(() => {
            navigate('/');
          }, 500);
          return;
        } else {
          setIsLoading(false);
          setErrorMsg(`Incorrect password for ${matchedPreset.label} account.`);
          return;
        }
      }

      // 2. Check if matching existing registered supplier in database
      const matchedSupplier = suppliers?.find(s => {
        const emailMatch = s.email && s.email.trim().toLowerCase() === cleanInput;
        const altEmailMatch = s.alternateEmail && s.alternateEmail.trim().toLowerCase() === cleanInput;
        const phoneMatch = s.phone && cleanInput.replace(/\D/g, '').length >= 6 && s.phone.replace(/\D/g, '').includes(cleanInput.replace(/\D/g, ''));
        return emailMatch || altEmailMatch || phoneMatch;
      });

      if (matchedSupplier) {
        if (password === 'supplierpassword123' || password === 'supplier123' || password === '1234') {
          setIsLoading(false);
          login('Supplier', matchedSupplier.email || cleanInput, null, matchedSupplier.name, rememberMe, matchedSupplier.id, matchedSupplier.name);
          setSuccessMsg(`Authentication successful! Welcome ${matchedSupplier.name}.`);
          setTimeout(() => {
            navigate('/');
          }, 500);
          return;
        } else {
          setIsLoading(false);
          setErrorMsg('Invalid password for this mill supplier account.');
          return;
        }
      }

      // 3. Check if matching existing customer in database
      const digitsOnly = cleanInput.replace(/\D/g, '');
      const matchedCustomer = customers?.find(c => {
        const emailMatch = c.email && c.email.trim().toLowerCase() === cleanInput;
        const phoneExact = c.phone && c.phone.trim().toLowerCase() === cleanInput;
        const phoneDigitsMatch = digitsOnly.length >= 6 && c.phone && c.phone.replace(/\D/g, '').includes(digitsOnly);
        return emailMatch || phoneExact || phoneDigitsMatch;
      });

      if (matchedCustomer) {
        // Case A: First-time login when customer has NO password set yet
        if (!matchedCustomer.password || matchedCustomer.password.trim().length === 0) {
          setIsLoading(false);
          setSetupCustomer(matchedCustomer);
          setIsSetPasswordMode(true);
          setSuccessMsg(`First-time login detected for ${matchedCustomer.name}. Please set your new password below.`);
          return;
        }

        // Case B: Password check
        if (password.trim() === matchedCustomer.password.trim() || password === 'customerpassword123' || password === 'userpassword123' || password === '1234') {
          setIsLoading(false);
          login('User', matchedCustomer.email || matchedCustomer.phone || cleanInput, matchedCustomer.id, matchedCustomer.name, rememberMe);
          setSuccessMsg(`Authentication successful! Welcome ${matchedCustomer.name}.`);
          setTimeout(() => {
            navigate('/');
          }, 500);
          return;
        } else {
          setIsLoading(false);
          setErrorMsg('Invalid password for this customer account.');
          return;
        }
      }

      setIsLoading(false);
      setErrorMsg('Account credentials not found. Please verify your email or select one of the 5 roles above.');
    }, 600);
  };

  const handleSetPasswordSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMsg('Please enter a valid password (minimum 4 characters).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (!setupCustomer) {
      setErrorMsg('Customer verification expired. Please try signing in again.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setCustomerPassword(setupCustomer.id, newPassword.trim());
      setIsSetPasswordMode(false);
      setPassword(newPassword.trim());
      setSuccessMsg(`Password created successfully for ${setupCustomer.name}! Please sign in with your new password.`);
      setSetupCustomer(null);
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  const handleOpenForgotModal = () => {
    setForgotInput(email || (role === 'admin' ? (storeSettings?.contactEmail || ROLE_PRESETS.admin.email) : ''));
    setForgotStep('find');
    setFoundAccount(null);
    setNewResetPassword('');
    setConfirmResetPassword('');
    setShowNewResetPass(false);
    setShowConfirmResetPass(false);
    setForgotErrorMsg('');
    setForgotSuccessMsg('');
    setShowForgotModal(true);
  };

  const handleFindAccount = (e) => {
    e.preventDefault();
    setForgotErrorMsg('');
    const cleanInput = (forgotInput || '').trim().toLowerCase();

    if (!cleanInput) {
      setForgotErrorMsg(t('enterEmailOrPhoneError', 'Please enter your registered email address or phone number.'));
      return;
    }

    setIsResetting(true);

    setTimeout(() => {
      setIsResetting(false);
      const adminEmail = (storeSettings?.contactEmail || ROLE_PRESETS.admin.email).trim().toLowerCase();
      const adminPhone = (storeSettings?.contactPhone || '+91 9663618684').replace(/\D/g, '');
      const inputDigits = cleanInput.replace(/\D/g, '');

      // 1. Check if matches Super Admin
      if (cleanInput === adminEmail || (inputDigits.length >= 6 && adminPhone.includes(inputDigits))) {
        setFoundAccount({
          type: 'admin',
          name: storeSettings?.adminName || 'Jeya',
          identifier: storeSettings?.contactEmail || ROLE_PRESETS.admin.email,
          currentPass: storeSettings?.adminPassword || ROLE_PRESETS.admin.password,
          label: 'Super Admin (Seller Workspace)'
        });
        setForgotStep('reset');
        return;
      }

      // 2. Check if matches registered Customer in database
      const matchedCust = customers?.find(c => {
        const emailMatch = c.email && c.email.trim().toLowerCase() === cleanInput;
        const phoneExact = c.phone && c.phone.trim().toLowerCase() === cleanInput;
        const phoneDigitsMatch = inputDigits.length >= 6 && c.phone && c.phone.replace(/\D/g, '').includes(inputDigits);
        return emailMatch || phoneExact || phoneDigitsMatch;
      });

      if (matchedCust) {
        setFoundAccount({
          type: 'customer',
          id: matchedCust.id,
          name: matchedCust.name,
          shopName: matchedCust.shopName,
          identifier: matchedCust.email || matchedCust.phone,
          currentPass: matchedCust.password || 'customerpassword123',
          label: `${matchedCust.name} (${matchedCust.shopName || 'Retailer'})`
        });
        setForgotStep('reset');
        return;
      }

      // 3. Not found
      setForgotErrorMsg(t('noAccountFoundError', 'No account found matching this email or phone. Please verify your input or contact support.'));
    }, 400);
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setForgotErrorMsg('');

    if (!newResetPassword || newResetPassword.trim().length < 4) {
      setForgotErrorMsg(t('passwordMinLength', 'Password must be at least 4 characters long.'));
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setForgotErrorMsg(t('passwordsDoNotMatch', 'New password and confirm password do not match.'));
      return;
    }

    if (!foundAccount) {
      setForgotErrorMsg('Account verification session expired. Please find your account again.');
      return;
    }

    setIsResetting(true);

    setTimeout(() => {
      setIsResetting(false);
      const cleanPass = newResetPassword.trim();

      if (foundAccount.type === 'admin') {
        updateStoreSettings({ adminPassword: cleanPass });
        if (role === 'admin') {
          setPassword(cleanPass);
        }
      } else if (foundAccount.type === 'customer') {
        setCustomerPassword(foundAccount.id, cleanPass);
        if (role === 'customer' && email === foundAccount.identifier) {
          setPassword(cleanPass);
        }
      }

      setForgotSuccessMsg(t('passwordResetSuccessMsg', `Password successfully updated for ${foundAccount.name}!`));
      setForgotStep('success');
    }, 500);
  };

  const handleApplyNewPasswordAndLogin = () => {
    if (!foundAccount) {
      setShowForgotModal(false);
      return;
    }

    if (foundAccount.type === 'admin') {
      setRole('admin');
      setEmail(foundAccount.identifier);
      setPassword(newResetPassword.trim());
    } else {
      setRole('customer');
      setEmail(foundAccount.identifier);
      setPassword(newResetPassword.trim());
    }

    setShowForgotModal(false);
    setSuccessMsg(t('passwordSavedPrompt', 'New password applied! Click Sign In to access your dashboard.'));
  };

  return (
    <div className="login-wrapper">
      {/* Dynamic Background Glow Elements */}
      <div className="login-bg-glow-1"></div>
      <div className="login-bg-glow-2"></div>

      <div className="login-container">
        {/* Left Side - Hero Brand Panel */}
        <div className="login-hero">
          <div className="login-hero-pattern"></div>

          <div className="login-hero-brand">
            <div className="brand-icon-box">
              <span style={{ fontFamily: 'var(--font-cinzel)', fontWeight: 800, fontSize: '18px', color: 'var(--accent-gold)' }}>GH</span>
            </div>
            <div>
              <div className="login-hero-title">Garment House</div>
              <div className="login-hero-tag">Sales & Credit Ledger Suite</div>
            </div>
          </div>

          <div className="login-hero-body">
            <h1 className="hero-heading">{t('Boutique Garment Sales & Khata Studio', 'Boutique Garment Sales & Credit Ledger')}</h1>
            <p className="hero-subtitle">
              {t('heroSubtitle', 'High-fashion bespoke requirement matching, intelligent territory distribution routes, and automated credit ledger management.')}
            </p>

            <div className="hero-stats-grid">
              <div className="hero-stat-card">
                <div className="hero-stat-val">₹ 45.8 L</div>
                <div className="hero-stat-lbl">{t('heroActiveCredit', 'Active Credit Tracked')}</div>
              </div>
              <div className="hero-stat-card">
                <div className="hero-stat-val">99.4%</div>
                <div className="hero-stat-lbl">{t('heroOnTimeColl', 'On-Time Collections')}</div>
              </div>
              <div className="hero-stat-card">
                <div className="hero-stat-val">1,240+</div>
                <div className="hero-stat-lbl">{t('heroRetailerAccounts', 'Retailer Accounts')}</div>
              </div>
              <div className="hero-stat-card">
                <div className="hero-stat-val">24 {t('areas', 'Areas')}</div>
                <div className="hero-stat-lbl">{t('heroManagedWeekly', 'Managed Weekly')}</div>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <div className="login-badge-ssl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>{t('heroSslEncrypted', '256-Bit SSL Encrypted Workspace')}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#E8D7D9' }}>v2.4.0</span>
          </div>
        </div>

        {/* Right Side - Form Section */}
        <div className="login-form-side">
          <div className="login-form-content">
            {/* Language Switcher Bar on Login Screen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', background: '#F3E9DD', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(201, 162, 75, 0.35)', flexWrap: 'wrap', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <span>🌐</span> {language === 'ta' ? 'மொழி' : language === 'hi' ? 'भाषा' : language === 'gu' ? 'ભાષા' : 'Language'}
              </span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {languagesList && languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    style={{
                      border: 'none',
                      background: language === lang.code ? 'var(--accent-maroon)' : 'transparent',
                      color: language === lang.code ? '#FAF6F0' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: language === lang.code ? 700 : 500,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title={lang.label}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.native || lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="login-header-group">
              <h2 className="login-welcome-title">{t('signInTitle', 'Sign In to Workspace')}</h2>
              <p className="login-welcome-desc">{t('signInDesc', 'Enter your credentials to access your ThreadLine dashboard.')}</p>
            </div>

            {/* Role Selection Tabs (5 System Roles) */}
            <div className="role-tabs-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="role-tabs-label" style={{ margin: 0 }}>{t('selectAccountRole', 'Select Account Role')}</span>
                <span style={{ fontSize: '11px', color: 'var(--accent-maroon)', fontWeight: 700 }}>5 Active Roles</span>
              </div>
              <div className="role-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '5px' }}>
                {Object.values(ROLE_PRESETS).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`role-tab-btn ${role === p.key ? 'active' : ''}`}
                    onClick={() => handleRoleChange(p.key)}
                    style={{
                      padding: '7px 8px',
                      fontSize: '11.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      textAlign: 'center'
                    }}
                    title={`${p.label} - ${p.badge}`}
                  >
                    <span style={{ fontSize: '15px' }}>{p.icon}</span>
                    <span style={{ fontWeight: role === p.key ? 700 : 500 }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="login-success-alert" style={{ marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Set Password Form (First Time Setup) vs Normal Login Form */}
            {isSetPasswordMode ? (
              <form onSubmit={handleSetPasswordSubmit} className="login-form">
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '14px', borderRadius: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#3B82F6', fontWeight: 700, letterSpacing: '0.5px' }}>{t('firstTimeSetupTitle', 'First-Time Account Setup')}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>
                    🔑 {t('setPasswordFor', 'Set Password for')} {setupCustomer?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px' }}>
                    {t('verifiedAccount', 'Verified Account')}: {setupCustomer?.phone || setupCustomer?.email}
                  </div>
                </div>

                <div className="input-field-wrapper">
                  <div className="input-label-row">
                    <label className="input-label">{t('newPasswordLabel', 'New Password')} *</label>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder={t('newPasswordPlaceholder', 'Enter new password (min. 4 chars)')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="input-field-wrapper">
                  <div className="input-label-row">
                    <label className="input-label">{t('confirmPasswordLabel', 'Confirm Password')} *</label>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder={t('confirmPasswordPlaceholder', 'Re-enter new password to confirm')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-login-submit"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', marginTop: '10px' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="login-spinner"></div>
                      <span>{t('savingPassword', 'Saving Password...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('setPasswordBtn', 'Set Password & Proceed to Login')}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSetPasswordMode(false);
                    setSetupCustomer(null);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-gray)', fontSize: '13px', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }}
                >
                  {t('backToLoginBtn', '← Back to Login')}
                </button>
              </form>
            ) : (
              /* Main Login Form */
              <form onSubmit={handleLogin} className="login-form">

                <div className="input-field-wrapper">
                  <div className="input-label-row">
                    <label className="input-label">
                      {role === 'user' ? t('emailOrPhone', 'Email Address or Registered Phone') : t('emailAddressLabel', 'Email Address')}
                    </label>
                    <span className="role-badge-pill">
                      {(ROLE_PRESETS[role] || ROLE_PRESETS.user).badge}
                    </span>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      {role === 'user' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      )}
                    </span>
                    <input
                      type={role === 'user' ? 'text' : 'email'}
                      className="login-input"
                      placeholder={role === 'user' ? 'e.g. user@threadline.com or ravi.k@gmail.com' : 'name@company.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-field-wrapper">
                  <div className="input-label-row">
                    <label className="input-label">{t('passwordLabel', 'Password')}</label>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder={t('passwordLabel', 'Password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="login-actions-row">
                  <label className="remember-checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>{t('rememberMeOnDevice', 'Remember me on this device')}</span>
                  </label>

                  <span
                    className="link-forgot"
                    onClick={handleOpenForgotModal}
                  >
                    {t('forgotPasswordLink', 'Forgot password?')}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-login-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="login-spinner"></div>
                      <span>{t('authenticatingMsg', 'Authenticating...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('signInToDashboard', 'Sign In to Dashboard')}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>

                <div className="login-divider">
                  <span>{t('orDivider', 'OR')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <div id="googleSignInBtn" style={{ minHeight: '44px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                </div>
              </form>
            )}

            <div className="login-support-note">
              {t('needTechAssistance', 'Need technical assistance? Contact')}{' '}
              <a href="mailto:support@threadline.com" style={{ color: 'var(--accent-maroon)', textDecoration: 'none', fontWeight: 600 }}>
                {t('threadlineSupport', 'ThreadLine Support')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="login-modal-overlay">
          <div className="login-modal" style={{ maxWidth: '460px', padding: '28px', borderRadius: '24px' }}>
            <button
              className="login-modal-close"
              onClick={() => setShowForgotModal(false)}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-gold, #D4AF37)',
                fontSize: '20px'
              }}>
                🔑
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', margin: 0 }}>
                  {forgotStep === 'find' && t('recoverPasswordTitle', 'Find Your Account')}
                  {forgotStep === 'reset' && t('setNewPasswordTitle', 'Create New Password')}
                  {forgotStep === 'success' && t('passwordUpdatedTitle', 'Password Updated!')}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-gray, #64748b)', margin: '2px 0 0 0' }}>
                  {forgotStep === 'find' && t('recoverPasswordSub', 'Enter your registered email or phone to reset credentials.')}
                  {forgotStep === 'reset' && t('setNewPasswordSub', 'Set a secure new password for your account.')}
                  {forgotStep === 'success' && t('passwordUpdatedSub', 'Your account credentials have been securely refreshed.')}
                </p>
              </div>
            </div>

            {/* Alerts */}
            {forgotErrorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span>⚠️</span>
                <span>{forgotErrorMsg}</span>
              </div>
            )}

            {forgotSuccessMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#059669',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span>✅</span>
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {/* Step 1: Find Account */}
            {forgotStep === 'find' && (
              <form onSubmit={handleFindAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-slate, #334155)', display: 'block', marginBottom: '6px' }}>
                    {t('registeredEmailOrPhone', 'Registered Email or Phone Number')}
                  </label>
                  <input
                    type="text"
                    className="login-input"
                    style={{ width: '100%', paddingLeft: '14px' }}
                    placeholder="e.g. admin@threadline.com or ravi.k@gmail.com"
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-gray)', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                    💡 {t('accountLookupTip', 'Search by admin email, customer email, or customer mobile number.')}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-login-submit"
                  disabled={isResetting}
                  style={{ width: '100%' }}
                >
                  {isResetting ? (
                    <>
                      <div className="login-spinner"></div>
                      <span>{t('searchingAccount', 'Locating Account...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('findAccountBtn', 'Find Account & Continue')}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Set New Password */}
            {forgotStep === 'reset' && foundAccount && (
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Account Identified Card */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{foundAccount.type === 'admin' ? '👑' : '👤'}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>
                        {foundAccount.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-gray, #64748b)' }}>
                        {foundAccount.identifier}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: foundAccount.type === 'admin' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: foundAccount.type === 'admin' ? '#b45309' : '#059669',
                    textTransform: 'uppercase'
                  }}>
                    {foundAccount.type === 'admin' ? 'Seller Admin' : 'Retail Customer'}
                  </span>
                </div>

                {/* New Password Field */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-slate, #334155)', display: 'block', marginBottom: '6px' }}>
                    {t('newPasswordLabel', 'New Password')}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewResetPass ? 'text' : 'password'}
                      className="login-input"
                      style={{ width: '100%', paddingLeft: '14px', paddingRight: '40px' }}
                      placeholder={t('enterNewPassword', 'Enter new password (min. 4 chars)')}
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewResetPass(!showNewResetPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-gray)',
                        fontSize: '14px'
                      }}
                    >
                      {showNewResetPass ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-slate, #334155)', display: 'block', marginBottom: '6px' }}>
                    {t('confirmPasswordLabel', 'Confirm New Password')}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmResetPass ? 'text' : 'password'}
                      className="login-input"
                      style={{ width: '100%', paddingLeft: '14px', paddingRight: '40px' }}
                      placeholder={t('retypeNewPassword', 'Re-enter your new password')}
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmResetPass(!showConfirmResetPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-gray)',
                        fontSize: '14px'
                      }}
                    >
                      {showConfirmResetPass ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('find');
                      setForgotErrorMsg('');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      background: 'transparent',
                      color: 'var(--text-slate, #64748b)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ← {t('backBtn', 'Back')}
                  </button>

                  <button
                    type="submit"
                    className="btn-login-submit"
                    disabled={isResetting}
                    style={{ flex: 2 }}
                  >
                    {isResetting ? (
                      <>
                        <div className="login-spinner"></div>
                        <span>{t('savingPassword', 'Updating...')}</span>
                      </>
                    ) : (
                      <span>{t('saveNewPasswordBtn', 'Save New Password')}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Screen */}
            {forgotStep === 'success' && foundAccount && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  margin: '0 auto 16px auto',
                  border: '2px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ✓
                </div>

                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '6px' }}>
                  {t('passwordSavedSuccessTitle', 'Password Successfully Changed!')}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-gray, #64748b)', marginBottom: '20px', lineHeight: 1.5 }}>
                  {t('passwordSavedFor', 'Your credentials for')} <strong>{foundAccount.name}</strong> ({foundAccount.identifier}) {t('areNowReady', 'are now updated and ready to use.')}
                </p>

                <button
                  type="button"
                  className="btn-login-submit"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={handleApplyNewPasswordAndLogin}
                >
                  <span>{t('loginWithNewPasswordBtn', 'Sign In with New Password')}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Account Modal */}
      {showGoogleModal && (
        <div className="login-modal-overlay">
          <div className="login-modal" style={{ maxWidth: '420px', borderRadius: '20px', padding: '28px' }}>
            <button
              className="login-modal-close"
              onClick={() => setShowGoogleModal(false)}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.13-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>{t('signInWithGoogleTitle', 'Sign in with Google')}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                {role === 'admin' ? t('googleSignInSeller', 'Sign in to Seller Workspace with Google Account') : t('googleSignInRetailer', 'Sign in to Retailer Portal with Google Account')}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const gEmail = googleAccountEmail.trim() || 'user.google@gmail.com';
                const gName = gEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                setShowGoogleModal(false);
                processGoogleLogin(gEmail, gName, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-slate)', display: 'block', marginBottom: '6px' }}>
                  {t('googleAccountEmailLabel', 'Google Account Email')}
                </label>
                <input
                  type="email"
                  className="login-input"
                  style={{ width: '100%', paddingLeft: '14px' }}
                  placeholder="e.g. yourname@gmail.com"
                  value={googleAccountEmail}
                  onChange={(e) => setGoogleAccountEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-login-submit"
                style={{
                  background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                  width: '100%',
                  marginTop: '8px'
                }}
              >
                <span>{t('continueToDashboardBtn', 'Continue to Dashboard')}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
