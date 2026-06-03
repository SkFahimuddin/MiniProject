import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { SensorProvider } from './context/SensorContext.jsx'
import LoginPage    from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import BedDetailPage from './pages/BedDetailPage.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/bed/:bedId" element={
        <ProtectedRoute>
          <BedDetailPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SensorProvider>
        <AppRoutes />
      </SensorProvider>
    </AuthProvider>
  )
}
