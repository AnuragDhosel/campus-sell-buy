import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const baseURL = rawBaseURL.replace(/\/+$/, '');

// Create an Axios instance with base URL for our backend
const api = axios.create({
  baseURL,
});

// Request interceptor: Attach JWT token to headers if it exists
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

// Response interceptor: Handle common errors (like unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Handle token expiration globally, e.g., clear localStorage and redirect
      // For now, let the component handle it or AuthContext
    }
    return Promise.reject(error);
  }
);

export default api;
