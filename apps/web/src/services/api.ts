import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
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
    const isDemoToken = localStorage.getItem('banna_access_token')?.startsWith('demo-');
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !isDemoToken) {
      localStorage.removeItem('banna_access_token');
      localStorage.removeItem('banna_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data?.error || error);
  },
);
