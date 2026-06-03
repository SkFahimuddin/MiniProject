import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('sw_user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(email, password) {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password })
      sessionStorage.setItem('sw_user', JSON.stringify(data.user))
      sessionStorage.setItem('sw_token', data.token)
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Login failed.' }
    }
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('sw_user')
    sessionStorage.removeItem('sw_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
export function getToken() { return sessionStorage.getItem('sw_token') }
