import axios from 'axios'

// In production the frontend is served from the same origin as the API.
// In dev, Vite proxies /api → http://localhost:8000 via vite.config.js.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminflow_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (email, password)        => api.post('/api/auth/login',    { email, password }),
  register: (name, email, password)  => api.post('/api/auth/register', { name, email, password }),
  me:       ()                       => api.get('/api/auth/me'),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsAPI = {
  list:   ()         => api.get('/api/clients'),
  create: (data)     => api.post('/api/clients', data),
  update: (id, data) => api.put(`/api/clients/${id}`, data),
  delete: (id)       => api.delete(`/api/clients/${id}`),
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesAPI = {
  list:       ()         => api.get('/api/invoices'),
  create:     (data)     => api.post('/api/invoices', data),
  update:     (id, data) => api.put(`/api/invoices/${id}`, data),
  delete:     (id)       => api.delete(`/api/invoices/${id}`),
  getPayLink: (id)       => api.post(`/api/invoices/${id}/pay-link`),
  remind:     (id)       => api.post(`/api/invoices/${id}/remind`),
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export const scheduleAPI = {
  list:   ()     => api.get('/api/schedule'),
  create: (data) => api.post('/api/schedule', data),
  delete: (id)   => api.delete(`/api/schedule/${id}`),
}

// ── Google Calendar ───────────────────────────────────────────────────────────
export const gcalAPI = {
  status:     ()    => api.get('/api/google-calendar/status'),
  disconnect: ()    => api.delete('/api/google-calendar/disconnect'),
  sync:       (id)  => api.post(`/api/google-calendar/sync/${id}`),
  events:     ()    => api.get('/api/google-calendar/events'),
}

// ── Beta signup (landing page) ────────────────────────────────────────────────
export const betaApi = {
  signup: (data) => api.post('/api/beta-signup', data),
}

// Legacy named exports kept for backwards compat with existing pages
export const clientsApi = clientsAPI
export const scheduleApi = scheduleAPI
export const invoicesApi = invoicesAPI

export default api
