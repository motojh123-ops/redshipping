import axios from 'axios';

/**
 * API base URL:
 *  - Default "/api/v1"  → same-origin; on Vercel the vercel.json rewrite proxies
 *                          /api/* to the Render backend (no CORS involved).
 *  - VITE_API_URL       → direct mode: point the web app straight at the API host
 *                          (requires ALLOWED_ORIGINS on the API to include this domain).
 */
const API_BASE_URL: string =
  ((import.meta as any).env?.VITE_API_URL as string) || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('banna_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle token expiration
api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('banna_access_token');
      localStorage.removeItem('banna_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data?.error || error);
  },
);
