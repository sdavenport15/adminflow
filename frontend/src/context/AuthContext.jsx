import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'adminflow_token'
const USER_KEY  = 'adminflow_user'

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)
  const [ready, setReady] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser  = localStorage.getItem(USER_KEY)
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setReady(true)
  }, [])

  function persist(tok, usr) {
    localStorage.setItem(TOKEN_KEY, tok)
    localStorage.setItem(USER_KEY, JSON.stringify(usr))
    setToken(tok)
    setUser(usr)
  }

  async function login(email, password) {
    const res = await authAPI.login(email, password)
    const { access_token, user: usr } = res.data
    persist(access_token, usr)
    return usr
  }

  async function register(name, email, password) {
    const res = await authAPI.register(name, email, password)
    const { access_token, user: usr } = res.data
    persist(access_token, usr)
    return usr
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, ready }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
