/**
 * API client — Axios instance with auth interceptor.
 * Automatically attaches JWT token to all requests.
 */
import axios from 'axios';

const API_BASE = 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ft_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ft_token');
      localStorage.removeItem('ft_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/verify-otp') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ────────────────────────────────────────────
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const verifyOTP = (email, otp) => api.post('/api/auth/verify-otp', { email, otp });
export const resendOTP = (email) => api.post('/api/auth/resend-otp', { email });

// ── Transaction API ─────────────────────────────────────
export const fetchTxns = (params = {}) => api.get('/api/transactions', { params });
export const addTxn = (data) => api.post('/api/transactions', data);
export const updateTxn = (id, data) => api.put(`/api/transactions/${id}`, data);
export const deleteTxn = (id) => api.delete(`/api/transactions/${id}`);
export const fetchSummary = () => api.get('/api/transactions/summary');
export const fetchCategories = () => api.get('/api/transactions/categories');
export const exportCSV = () => api.get('/api/transactions/export', { responseType: 'blob' });

// ── Budget API ──────────────────────────────────────────
export const fetchBudgets = () => api.get('/api/budgets');
export const addBudget = (data) => api.post('/api/budgets', data);
export const updateBudget = (id, data) => api.put(`/api/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/api/budgets/${id}`);

// ── Stock API ───────────────────────────────────────────
export const fetchStocks = () => api.get('/api/stocks');
export const addStock = (data) => api.post('/api/stocks', data);
export const updateStock = (id, data) => api.put(`/api/stocks/${id}`, data);
export const deleteStock = (id) => api.delete(`/api/stocks/${id}`);
export const getStockPrices = (symbols) => api.post('/api/stocks/prices', { symbols });
export const searchStocks = (query) => api.get('/api/stocks/search', { params: { q: query } });
export const getStockQuote = (symbol) => api.get(`/api/stocks/quote/${symbol}`);

export default api;
