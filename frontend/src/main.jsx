import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing  from './pages/Landing'
import Login    from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Clients  from './pages/Clients'
import Schedule from './pages/Schedule'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'
import './index.css'

// Redirect to /login if the user is not authenticated.
// Waits until AuthContext has restored from localStorage (ready flag)
// so there's no flash-redirect on reload.
function ProtectedRoute({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null // brief null render while localStorage is read
  if (!user)  return <Navigate to="/login" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clients"   element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/schedule"  element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="/invoices"  element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
