import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// ─── Demo users — replace with real API call later ───
const DEMO_USERS = [
  { id: 'U001', email: 'nurse@hospital.com',   password: '1234', name: 'Nurse Priya',    role: 'Nurse',   ward: 'General Ward · Floor 2' },
  { id: 'U002', email: 'doctor@hospital.com',  password: '1234', name: 'Dr. Anita Sharma', role: 'Doctor', ward: 'General Ward · Floor 2' },
  { id: 'U003', email: 'admin@hospital.com',   password: '1234', name: 'Admin Rahul',    role: 'Admin',   ward: 'All Wards' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Persist login across page refresh
    const saved = sessionStorage.getItem('sw_user')
    return saved ? JSON.parse(saved) : null
  })

  function login(email, password) {
    const found = DEMO_USERS.find(
      u => u.email === email && u.password === password
    )
    if (found) {
      const { password: _, ...safe } = found
      setUser(safe)
      sessionStorage.setItem('sw_user', JSON.stringify(safe))
      return { ok: true }
    }
    return { ok: false, error: 'Invalid credentials.' }
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('sw_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
