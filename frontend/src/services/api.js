import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const baseURL = rawBaseURL.replace(/\/+$/, '');

// Create a reusable Axios instance with the backend base URL.
// All API calls in the app should use this instance instead of raw axios.
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────────────────
// Runs BEFORE every outgoing request.
// Checks localStorage for a JWT and attaches it to the Authorization header.
// This means we never have to manually add the token to each API call.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ─────────────────────────────────────────────────────
// If the server returns 401 (token expired or invalid),
// automatically clear localStorage and redirect to landing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on a public page
      if (window.location.pathname !== '/' && 
          window.location.pathname !== '/login' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
