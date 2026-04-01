import axios from 'axios'

// In production the frontend is served from the same origin as the API.
// In dev, Vite proxies /api → http://localhost:8000 via vite.config.js.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const clientsApi = {
  list: () => api.get('/api/clients'),
  create: (data) => api.post('/api/clients', data),
}

export const scheduleApi = {
  create: (data) => api.post('/api/schedule', data),
}

export const invoicesApi = {
  create: (data) => api.post('/api/invoices', data),
}

export const betaApi = {
  signup: (data) => api.post('/api/beta-signup', data),
}

export default api
