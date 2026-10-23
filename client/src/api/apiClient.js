import axios from 'axios';

/**
 * Centralized API Client Configuration for Production & Development
 * - Automatically resolves backend API URL based on environment (VITE_API_URL)
 * - Automatically attaches Authorization Bearer token from localStorage
 * - Seamlessly handles token expiration (401)
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : (import.meta.env.DEV ? 'http://localhost:5000' : '');

export const API_URL = `${API_BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s timeout to accommodate deep RAG synthesis
});

// Automatically inject JWT authentication token to outbound requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || '';
      if (/invalid or expired token/i.test(msg)) {
        console.warn('[Auth] Session expired or invalid token. Clearing credentials.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
