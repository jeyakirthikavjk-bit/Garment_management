// Centralized API configuration for Development & Production Deployments

// In production, if VITE_API_URL is specified (e.g., https://my-backend.onrender.com), use it.
// If not specified in production, default to relative '/api' for single-host full-stack deployments.
// In development, default to 'http://localhost:5000/api'.

const rawEnvUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim() : '';

export const API_BASE_URL = rawEnvUrl
  ? (rawEnvUrl.endsWith('/api') ? rawEnvUrl : `${rawEnvUrl.replace(/\/+$/, '')}/api`)
  : (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const BACKEND_ROOT_URL = rawEnvUrl
  ? rawEnvUrl.replace(/\/api\/?$/, '')
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default API_BASE_URL;
