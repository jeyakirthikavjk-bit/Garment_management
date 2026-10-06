// frontend/src/services/authService.js
// Centralized Authentication API Service

import api from './api';

export const authService = {
  /**
   * Standard Email & Password Authentication
   */
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res?.token) {
      localStorage.setItem('threadline_jwt_token', res.token);
    }
    return res;
  },

  /**
   * OAuth 2.0 / Google Identity Authentication
   */
  async oauthLogin(credential, profileData) {
    const res = await api.post('/auth/oauth', { credential, profile: profileData });
    if (res?.token) {
      localStorage.setItem('threadline_jwt_token', res.token);
    }
    return res;
  },

  /**
   * Verify Active Session Token
   */
  async verifyToken() {
    return api.get('/auth/verify');
  },

  /**
   * Retrieve Logged-In User Profile
   */
  async getProfile() {
    return api.get('/auth/profile');
  },

  /**
   * Security Audit Log Telemetry
   */
  async getAuditLog() {
    return api.get('/auth/audit-log');
  },

  /**
   * Clear Session
   */
  logout() {
    localStorage.removeItem('threadline_jwt_token');
    sessionStorage.removeItem('threadline_jwt_token');
  }
};

export default authService;
